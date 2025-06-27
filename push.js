#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Initialize environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  dotenv.config();
} catch (error) {
  console.log('No .env file found, will prompt for values');
}

async function createFileIfNotExists(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content);
      console.log(`File created: ${filePath}`);
    }
    return true;
  } catch (error) {
    console.error('Error creating file:', error.message);
    return false;
  }
}

async function updateFileContent(filePath, content) {
  try {
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const updatedContent = content.replace('{timestamp}', timestamp);
    fs.writeFileSync(filePath, updatedContent);
    return true;
  } catch (error) {
    console.error('Error updating file:', error.message);
    return false;
  }
}

async function getFileSha(token, username, repo, filePath) {
  try {
    const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    return response.data.sha;
  } catch (error) {
    // If file not found, return null (this is expected for new files)
    if (error.response && error.response.status === 404) {
      return null;
    }
    if (error.response && error.response.status === 403) {
      console.error('\nAccess denied while trying to get file SHA.');
      console.error('Message from GitHub:', error.response.data.message);
    }
    return null; // Return null for any error to allow creation of new file
  }
}

async function promptForMissingEnv(env) {
  const { default: inquirer } = await import('inquirer');

  const questions = [];

  if (!env.REPO_MODE) {
    questions.push({
      type: 'list',
      name: 'REPO_MODE',
      message: 'Choose repository mode (single: one repo, multi: multiple repos):',
      choices: ['single', 'multi']
    });
  }

  if (!env.GITHUB_TOKEN) {
    questions.push({
      type: 'input',
      name: 'GITHUB_TOKEN',
      message: 'Enter GitHub token:',
      validate: input => input ? true : 'GitHub token is required'
    });
  }

  if (!env.GITHUB_USERNAME) {
    questions.push({
      type: 'input',
      name: 'GITHUB_USERNAME',
      message: 'Enter GitHub username:',
      validate: input => input ? true : 'GitHub username is required'
    });
  }

  if (!env.GITHUB_REPO) {
    questions.push({
      type: 'input',
      name: 'GITHUB_REPO',
      message: 'Enter repository name (example: TikTok-Batch-Downloader):',
      when: answers => (!env.REPO_MODE && answers.REPO_MODE === 'single') || env.REPO_MODE === 'single',
      validate: input => {
        if (!input) return 'Repository name is required';
        if (input.endsWith('.md')) return 'Repository name cannot end with .md';
        if (input.includes('/')) return 'Enter repository name without username';
        return true;
      }
    });
  }

  if (!env.REPO_NAMES) {
    questions.push({
      type: 'input',
      name: 'REPO_NAMES',
      message: 'Enter repository names (comma-separated) to push:',
      when: answers => (!env.REPO_MODE && answers.REPO_MODE === 'multi') || env.REPO_MODE === 'multi',
      validate: input => {
        if (!input) return 'Repository names are required for multi mode';
        const repos = input.split(',').map(repo => repo.trim());
        if (repos.some(repo => repo.endsWith('.md'))) {
          return 'Repository names cannot end with .md';
        }
        if (repos.some(repo => repo.includes('/'))) {
          return 'Enter repository names without username';
        }
        return true;
      }
    });
  }

  if (!env.FILE_PATH) {
    questions.push({
      type: 'input',
      name: 'FILE_PATH',
      message: 'Enter file path to push (default: auto-push.md):',
      default: 'auto-push.md',
      validate: input => input ? true : 'File path is required'
    });
  }

  if (!env.FILE_CONTENT) {
    questions.push({
      type: 'input',
      name: 'FILE_CONTENT',
      message: 'Enter file content to push:',
      default: '# Auto Push File\n\nContent that will be pushed to GitHub repository.\nLast updated: {timestamp}',
      validate: input => input ? true : 'File content is required'
    });
  }

  if (!env.COMMIT_MESSAGE_TEMPLATE) {
    questions.push({
      type: 'input',
      name: 'COMMIT_MESSAGE_TEMPLATE',
      message: 'Enter commit message template (use {date} for timestamp):',
      default: '🤖 Auto Push Update {date}',
      validate: input => input ? true : 'Commit message template is required'
    });
  }

  if (!env.DELAY_SECONDS) {
    questions.push({
      type: 'input',
      name: 'DELAY_SECONDS',
      message: 'Enter delay in seconds between pushes:',
      validate: input => {
        const n = parseInt(input);
        if (isNaN(n)) return 'Delay must be a number';
        if (n <= 0) return 'Delay must be greater than 0';
        if (n > 86400) return 'Maximum delay is 86400 seconds (24 hours)';
        return true;
      }
    });
  }

  if (questions.length > 0) {
    const answers = await inquirer.prompt(questions);
    return { ...env, ...answers };
  }
  return env;
}

async function validateToken(token, username) {
  try {
    console.log('\nValidating GitHub token...');
    
    // First, try to get user information
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    console.log(`Token connected to account: ${userResponse.data.login}`);
    
    // Check token scopes
    const scopes = userResponse.headers['x-oauth-scopes'] || '';
    console.log('Token has access to:', scopes || 'no scopes');

    // Get rate limit info to verify token works
    const rateResponse = await axios.get('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    console.log('Rate limit remaining:', rateResponse.data.rate.remaining);

    // More lenient username check
    if (username && userResponse.data.login.toLowerCase() !== username.toLowerCase()) {
      console.warn('\nWarning: GitHub username does not match token!');
      console.warn(`Token belongs to: ${userResponse.data.login}`);
      console.warn(`Username provided: ${username}`);
      console.warn('Proceeding with username from token...\n');
      return userResponse.data.login; // Return actual username from token
    }

    return username || userResponse.data.login;
  } catch (error) {
    console.error('\nError saat validasi token GitHub:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
      if (error.response.headers) {
        console.error('Headers:', error.response.headers);
      }
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

async function checkRepository(options) {
  try {
    const url = `https://api.github.com/repos/${options.GITHUB_USERNAME}/${options.GITHUB_REPO}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${options.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    
    // Check if user has write access to the repository
    if (!response.data.permissions?.push) {
      console.error(`\nYou don't have write access to repository ${options.GITHUB_USERNAME}/${options.GITHUB_REPO}!`);
      console.error('Please ensure you have proper access to this repository.');
      process.exit(1);
    }
    
    return true;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.error(`\nRepository ${options.GITHUB_USERNAME}/${options.GITHUB_REPO} not found!`);
      console.error('Please ensure the repository exists on GitHub and the name is correct.');
      process.exit(1);
    }
    if (error.response && error.response.status === 401) {
      console.error('\nInvalid GitHub token or insufficient repository access!');
      console.error('Please ensure the token has "repo" scope and is still active.');
      process.exit(1);
    }
    throw error;
  }
}

async function pushFile(options) {
  try {
    const filePath = path.resolve(options.FILE_PATH);
    
    // Update file content with new timestamp
    await updateFileContent(filePath, options.FILE_CONTENT);
    
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    const base64Content = Buffer.from(content).toString('base64');

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const commitMessage = options.COMMIT_MESSAGE_TEMPLATE.replace('{date}', timestamp);

    for (const repo of options.REPO_LIST) {
      // Check repository first
      options.GITHUB_REPO = repo;
      await checkRepository(options);

      const url = `https://api.github.com/repos/${options.GITHUB_USERNAME}/${repo}/contents/${options.FILE_PATH}`;

      const sha = await getFileSha(options.GITHUB_TOKEN, options.GITHUB_USERNAME, repo, options.FILE_PATH);

      const data = {
        message: commitMessage,
        content: base64Content,
        committer: {
          name: options.GITHUB_USERNAME,
          email: `${options.GITHUB_USERNAME}@users.noreply.github.com`
        }
      };

      if (sha) {
        data.sha = sha;
      }

      await axios.put(url, data, {
        headers: {
          Authorization: `Bearer ${options.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      console.log(`\nSuccessfully pushed ${options.FILE_PATH} to ${repo}`);
      console.log(`Commit message: ${commitMessage}`);
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        console.error('\nRepository or file not found!');
        console.error(`URL: ${error.response.config.url}`);
      } else if (error.response.status === 401) {
        console.error('\nInvalid GitHub token or insufficient access!');
        console.error('Please ensure the token is active and has proper access.');
      } else if (error.response.status === 403) {
        console.error('\nAccess denied while trying to push file!');
        console.error('Please ensure:');
        console.error('1. Token has required "repo" scope');
        console.error('2. You have write access to the repository');
        console.error('3. Repository is not archived or locked');
        if (error.response.data && error.response.data.message) {
          console.error('\nMessage from GitHub:', error.response.data.message);
        }
      } else {
        console.error('\nError while pushing file:', error.message);
        console.error('GitHub API response:', error.response.data);
      }
    } else {
      console.error('\nError:', error.message);
    }
  }
}

async function startLoop(options) {
  // Create initial file
  const filePath = path.resolve(options.FILE_PATH);
  await createFileIfNotExists(filePath, options.FILE_CONTENT);

  console.log('\nStarting auto push...');
  console.log(`File to push: ${options.FILE_PATH}`);
  if (options.REPO_MODE === 'single') {
    console.log(`Repository: ${options.GITHUB_USERNAME}/${options.GITHUB_REPO}`);
  } else {
    console.log('Repositories:');
    options.REPO_LIST.forEach(repo => {
      console.log(`- ${options.GITHUB_USERNAME}/${repo}`);
    });
  }
  console.log(`Delay between pushes: ${options.DELAY_SECONDS} seconds\n`);

  while (true) {
    await pushFile(options);
    console.log(`\nWaiting ${options.DELAY_SECONDS} seconds before next push...`);
    await new Promise(resolve => setTimeout(resolve, options.DELAY_SECONDS * 1000));
  }
}

// Main execution
(async () => {
  try {
    console.log('GitHub Auto Push');
    console.log('---------------');
    console.log('Created by: https://github.com/xsrazy\n');
    
    // Initialize with empty values to force prompts
    let env = {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
      GITHUB_USERNAME: process.env.GITHUB_USERNAME || '',
      REPO_MODE: process.env.REPO_MODE || '',
      GITHUB_REPO: process.env.GITHUB_REPO || '',
      REPO_NAMES: process.env.REPO_NAMES || '',
      FILE_PATH: process.env.FILE_PATH || 'auto-push.md',
      FILE_CONTENT: process.env.FILE_CONTENT || '# Auto Push File\n\nContent that will be pushed to GitHub repository.\nLast updated: {timestamp}',
      COMMIT_MESSAGE_TEMPLATE: process.env.COMMIT_MESSAGE_TEMPLATE || '🤖 Auto Push Update {date}',
      DELAY_SECONDS: process.env.DELAY_SECONDS || ''
    };

    // Prompt for any missing values
    env = await promptForMissingEnv(env);
    
    // Ensure DELAY_SECONDS is a number
    env.DELAY_SECONDS = parseInt(env.DELAY_SECONDS);

    // Validate GitHub token and get correct username
    console.log('\nValidating GitHub token...');
    const validatedUsername = await validateToken(env.GITHUB_TOKEN, env.GITHUB_USERNAME);
    env.GITHUB_USERNAME = validatedUsername; // Use the validated username
    console.log(`\nUsing GitHub username: ${env.GITHUB_USERNAME}`);

    // Initialize REPO_LIST based on mode
    if (env.REPO_MODE === 'single') {
      if (!env.GITHUB_REPO) {
        console.error('Error: Repository name not provided for single mode');
        process.exit(1);
      }
      env.REPO_LIST = [env.GITHUB_REPO];
      console.log('\nMode: Single Repository');
      console.log(`Repository: ${env.GITHUB_USERNAME}/${env.GITHUB_REPO}`);
    } else if (env.REPO_MODE === 'multi') {
      if (!env.REPO_NAMES) {
        console.error('Error: Repository names not provided for multi mode');
        process.exit(1);
      }
      env.REPO_LIST = env.REPO_NAMES.split(',').map(repo => repo.trim());
      if (env.REPO_LIST.length === 0) {
        console.error('Error: No valid repository names provided');
        process.exit(1);
      }
      console.log('\nMode: Multiple Repositories');
      console.log(`Total repositories: ${env.REPO_LIST.length}`);
      console.log('Repositories:', env.REPO_LIST.map(repo => `${env.GITHUB_USERNAME}/${repo}`).join(', '));
    } else {
      console.error('Error: Invalid repository mode. Must be either "single" or "multi"');
      process.exit(1);
    }

     await startLoop(env);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
