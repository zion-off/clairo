# clairo

dashboard tui for github PRs, jira tickets, and daily logs.

## features

- branch aware github dashboard: see open PR details, create new PRs
- claude code integration (requires claude code to be set up) for generating standup notes
- link jira tickets and change ticket status from the terminal
- auto jira ticket detection based on branch name
- daily logs that update automatically with tui actions that can be used to generate standup notes

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

## development

### watch mode

since clairo operates on the git repo in the current directory, you need two terminals:

terminal 1 (in the clairo project) — rebuild on source changes:
```bash
pnpm build:watch
```

terminal 2 (in any project directory) — auto-restart the TUI on rebuild:
```bash
clairo:dev
```

`clairo:dev` is a shell alias (in `~/.zshrc`) that uses [watchexec](https://github.com/watchexec/watchexec) to watch clairo's `dist/` and restart the TUI when it changes. install with `brew install watchexec`.
