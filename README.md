# clairo

## Overview

clairo is a terminal-based user interface (TUI) application that consolidates GitHub pull requests, Jira ticket management, and personal daily logging into a single keyboard-driven interface. Built with TypeScript, it auto-detects your current git context and eliminates context-switching between web UIs, preventing tasks from falling through the cracks.

## Problem Statement

Software engineers working with GitHub and Jira face constant context-switching:

- Opening GitHub web UI to create/manage PRs
- Navigating to Jira web UI to update ticket statuses
- Maintaining personal work logs in separate text files
- Forgetting to update systems (e.g., merged PR but ticket still "In Progress")

This fragmented workflow leads to:

- Wasted time switching between tools
- Incomplete/outdated ticket statuses
- Lost context about what was worked on
- Mental overhead tracking multiple systems

## Target User

Software engineers (particularly full-stack developers) who:

- Work with both GitHub and Jira daily
- Prefer terminal/keyboard-driven workflows
- Maintain personal work logs
- Want to reduce context-switching overhead

## User Stories

### Core Workflows

1. **As a developer**, I want clairo to auto-detect my current git branch and repository, so it knows what I'm working on without manual input
2. **As a developer**, I want to see if a PR already exists for my current branch, so I don't accidentally create duplicates
3. **As a developer**, I want to create GitHub PRs linked to Jira tickets from the TUI, so I don't have to open a browser
4. **As a developer**, I want to view and modify existing PRs for my branch, so I can update them without leaving the terminal
5. **As a developer**, I want to browse my Jira tickets using saved views/filters, so I can quickly find relevant work
6. **As a developer**, I want to maintain daily work logs in markdown, so I have a record of what I accomplished
7. **As a developer**, I want optional prompts to log PR/ticket actions, so I can choose when to document my work
8. **As a developer**, I want to view previous logs easily, so I can reference what I did on past days

### Quality of Life

9. **As a developer**, I want all navigation to be keyboard-driven with tabs, so I can stay in flow
10. **As a developer**, I want the tool to handle GitHub 2FA via PAT, so authentication is seamless
11. **As a developer**, I want my credentials stored securely locally, so I don't re-authenticate constantly
12. **As a developer**, I want clairo to handle multiple PRs from the same branch, so I can work with different base branches

## Features

### MVP (v1.0)

#### Core Interface Structure

clairo uses a tab-based navigation system with three main tabs:

**Tab 1: PR View**

- Auto-detects current git branch and repository (via git remote parsing)
- Shows different states:
  - **No git repo**: Display "Not in a git repository" message
  - **No PR exists**: Show "Create PR" interface
  - **Single PR exists**: Display PR details with edit capabilities
  - **Multiple PRs exist**: List all PRs from current branch (different base branches), allow selection
- Create PR flow:
  - Pre-populate branch information
  - Link to Jira ticket (searchable dropdown)
  - Title and description fields
  - Optional: auto-fill title/description from selected Jira ticket
- View/Edit PR:
  - PR title, description, status
  - CI/CD checks status
  - Reviewers
  - Option to update PR details

**Tab 2: Jira View**

- Display saved Jira views/filters (configured in setup)
- Browse tickets in a scrollable list (title, key, status, assignee)
- Select ticket to view details:
  - Full description
  - Current status
  - Comments (read-only for v1)
  - Available transitions
- Update ticket status (transition to different states)
- Search/filter within current view

**Tab 3: Logs View**

- Split-pane layout:
  - **Left pane**: Today's log file (editable markdown)
  - **Right pane**: List of previous log files (by date)
- Navigate to previous days by selecting from right pane
- Auto-create today's log if it doesn't exist
- Optional prompt after PR/ticket actions: "Log this? (y/n)"
  - Auto-append timestamped entries to today's log
  - Format: `## HH:MM - Action description`

#### Git Context Detection

- Parse `git remote get-url origin` to extract owner/repo
- Fallback handling:
  - If `origin` doesn't exist, list all remotes
  - Filter for GitHub URLs
  - Prompt user to select if multiple GitHub remotes exist
- Cache repo context per session to avoid repeated parsing
- Handle non-GitHub repositories gracefully

#### GitHub Integration

- Query PRs by head branch: `GET /repos/{owner}/{repo}/pulls?head={user}:{branch}&state=open`
- Create new PRs: `POST /repos/{owner}/{repo}/pulls`
- Update PR details: `PATCH /repos/{owner}/{repo}/pulls/{number}`
- Fetch PR status, checks, and reviewers
- Handle authentication via Personal Access Token (PAT)

#### Jira Integration

- Authenticate via API token
- Fetch saved views/filters (JQL queries configured in setup)
- Search issues: `GET /rest/api/3/search`
- Get issue details: `GET /rest/api/3/issue/{issueKey}`
- Get available transitions: `GET /rest/api/3/issue/{issueKey}/transitions`
- Transition issue: `POST /rest/api/3/issue/{issueKey}/transitions`
- **Note**: Transition IDs are fetched dynamically (workflow-dependent)

#### Daily Logging

- Markdown files stored at `~/.clairo/logs/YYYY-MM-DD.md`
- Auto-create file for current day if missing
- Simple text editor within TUI (Ink text input component)
- Optional auto-logging after actions:

  - Prompt: "Log this? (y/n)"
  - Auto-generated format:

    ```markdown
    ## 14:23 - Created PR #234

    Fixed auth bug in user service
    Jira: PROJ-123
    ```

- Navigate historical logs via right pane

#### Configuration & Setup

- First-run setup wizard:
  - GitHub PAT creation guide
  - Jira API token creation guide
  - Jira instance URL
  - Configure Jira saved views (JQL queries)
  - Set default auto-log behavior (prompt/always/never)
- Configuration stored at `~/.clairo/config.json`
- Settings accessible via settings menu in TUI

### Future Enhancements (Post-MVP)

- **CLI quick actions**: `clairo pr create`, `clairo ticket update PROJ-123 done`
- Notifications for PR review requests
- PR templates
- Inline PR review workflow
- GitHub Actions status visualization
- Batch ticket operations
- Export logs to different formats
- Customizable keybindings
- Support for GitLab, Bitbucket
- Support for Linear, Asana
- Multi-repo workspace mode
- Offline mode with cache

## Technical Architecture

### Tech Stack

- **Language**: TypeScript
- **TUI Framework**: Ink (React for CLIs)
- **GitHub API**: `@octokit/rest`
- **Jira API**: `axios` or `node-fetch` (direct REST calls)
- **Configuration**: `conf` package or custom JSON file handling
- **File System**: Node.js built-in `fs/promises`

### Data Storage

```
~/.clairo/
├── config.json              # API tokens, settings, preferences
└── logs/
    ├── 2026-02-07.md        # Daily log files
    ├── 2026-02-06.md
    └── ...
```

### API Integration Details

#### Git Context Detection

- Parse git remote URL using `git remote get-url origin`
- Extract owner/repo from URLs:
  - HTTPS: `https://github.com/owner/repo.git`
  - SSH: `git@github.com:owner/repo.git`
- Fallback strategy:
  1. Try `origin` remote first
  2. If not found, run `git remote` to list all remotes
  3. Filter for GitHub URLs
  4. If multiple GitHub remotes, prompt user to select
  5. Cache selection for current session
- Get current branch: `git rev-parse --abbrev-ref HEAD`

#### GitHub

- Authentication: Personal Access Token (PAT)
- Permissions needed: `repo` scope
- Key endpoints:
  - List PRs by branch: `GET /repos/{owner}/{repo}/pulls?head={user}:{branch}&state=open`
  - Create PR: `POST /repos/{owner}/{repo}/pulls`
  - Get PR details: `GET /repos/{owner}/{repo}/pulls/{number}`
  - Update PR: `PATCH /repos/{owner}/{repo}/pulls/{number}`

#### Jira

- Authentication: API Token
- Key endpoints:
  - Search issues (using JQL): `GET /rest/api/3/search?jql={query}`
  - Get issue: `GET /rest/api/3/issue/{issueKey}`
  - Get transitions: `GET /rest/api/3/issue/{issueKey}/transitions`
  - Transition issue: `POST /rest/api/3/issue/{issueKey}/transitions`

**Note**: Jira transition IDs vary by workflow configuration and must be fetched dynamically.

### Security Considerations

- Store credentials in `~/.clairo/config.json` with restrictive file permissions (0600)
- Never log tokens/credentials
- Consider using system keychain in future iterations
- # Validate all user inputs before API calls

### Important (High Priority)

3. **Jira Saved Views Configuration**: How should users configure their saved views during setup? Manual JQL entry, or UI to build queries?
4. **PR Title Auto-fill**: When creating a PR linked to a Jira ticket, should title come from ticket title, ticket key + title, or be fully manual?
5. **Multiple PRs Handling**: When multiple PRs exist for a branch, should there be a "primary" PR concept, or treat all equally?
6. **Log Entry Format**: Finalize fields for auto-generated entries (currently: timestamp, action, PR #, Jira key)

## Out of Scope (v1.0)

- CLI quick actions (saved for v2)
- Real-time notifications
- Inline code review within TUI
- Comment creation on Jira tickets (read-only for v1)
- PR merge functionality (use `gh` CLI or web UI)
