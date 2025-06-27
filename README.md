# GitHub Auto Push
🌐 Available in other languages: [Bahasa Indonesia](README.id.md)
A tool to automatically push files to GitHub repositories at specified intervals. Supports both single and multiple repository modes.

Created by: [xsrazy](https://github.com/xsrazy)

## Features

- Two operation modes:
  - Single repository: Push to one repository
  - Multiple repositories: Push to multiple repositories simultaneously
- Interactive configuration prompts
- Automatic file creation and updates
- Configurable push delay
- Continuous auto-pushing
- Detailed logging
- Customizable file content
- Commit message templates with timestamps

## Prerequisites

- Node.js v14 or higher
- GitHub account
- GitHub Personal Access Token with 'repo' permissions

## Installation

1. Clone or download this repository
2. Navigate to the directory:
   ```bash
   cd github-auto-push
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Run the script:
```bash
node push.js
```

### Single Repository Mode

1. Select "Single repository" when prompted
2. Enter:
   - GitHub token
   - GitHub username
   - Repository name (e.g., "my-repo")
   - File path (default: auto-push.md)
   - File content
   - Commit message template
   - Delay in seconds

Example output:
```
GitHub Auto Push
---------------
Created by: https://github.com/xsrazy

? Select repository mode: Single repository
? Enter GitHub token: (your_token)
? Enter GitHub username: example
? Enter repository name: my-repo
? Enter file path (default: auto-push.md): auto-push.md
? Enter file content:
# Auto Push File
Content will be pushed to GitHub repository.
Last updated: {timestamp}

? Enter commit message template: 🤖 Auto Push Update {date}
? Enter delay in seconds: 60

Mode: Single Repository
Starting auto push...
File to push: auto-push.md
Repository: example/my-repo
Delay: 60 seconds

Successfully pushed auto-push.md to my-repo
Commit message: 🤖 Auto Push Update 2024-01-10 15:30:45
Waiting 60 seconds before next push...
```

### Multiple Repositories Mode

1. Select "Multiple repositories" when prompted
2. Enter:
   - GitHub token
   - GitHub username
   - Repository names (comma-separated, e.g., "repo1, repo2, repo3")
   - File path (default: auto-push.md)
   - File content
   - Commit message template
   - Delay in seconds

Example output:
```
GitHub Auto Push
---------------
Created by: https://github.com/xsrazy

? Select repository mode: Multiple repositories
? Enter GitHub token: (your_token)
? Enter GitHub username: example
? Enter repository names (comma-separated): repo1, repo2, repo3
? Enter file path (default: auto-push.md): auto-push.md
? Enter file content:
# Auto Push File
Content will be pushed to GitHub repositories.
Last updated: {timestamp}

? Enter commit message template: 🤖 Auto Push Update {date}
? Enter delay in seconds: 60

Mode: Multiple Repositories
Total repositories: 3
Repositories: repo1, repo2, repo3

Starting auto push...
File to push: auto-push.md
Repositories:
- example/repo1
- example/repo2
- example/repo3
Delay: 60 seconds

Successfully pushed auto-push.md to repo1
Successfully pushed auto-push.md to repo2
Successfully pushed auto-push.md to repo3
Waiting 60 seconds before next push...
```

## Template Variables

- `{timestamp}` in file content: Replaced with current date/time
- `{date}` in commit message: Replaced with current date/time

## Notes

- Use Ctrl+C to stop the auto-push loop
- All repositories must exist before running
- Same file content and commit message used for all repos in multi mode
- File is created automatically if it doesn't exist
- GitHub token must have 'repo' access
- Maximum delay is 86400 seconds (24 hours)

## License

MIT
