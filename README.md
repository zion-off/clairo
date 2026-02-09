# clairo

dashboard tui for github PRs, jira tickets, and daily logs.

## features

- branch aware github dashboard: see open PR details, create new PRs
- claude code integration (requires claude code to be set up) for generating standup notes
- link jira tickets and change ticket status from the terminal
- auto jira ticket detection based on branch name
- daily logs that update automatically with tui actions that can be used for generateStandupNotes

## requirements

- Node.js 18+
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated

## usage

```bash
npx clairo
```

### options

```
--cwd <path>, -C   Run in a different directory
--version          Show version
--help             Show help
```

### examples

```bash
# Run in current directory
npx clairo

# Run in a different repo
npx clairo --cwd ~/projects/other-repo
```
