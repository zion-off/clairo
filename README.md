# clairo

an opinionated dashboard tui for github PRs, jira tickets, and daily logs.

<img width="1728" height="1056" alt="clairo" src="https://private-user-images.githubusercontent.com/89874389/548183415-7bf63805-c7fd-4741-bb44-6f9449ba6de3.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzA4MDkyMDAsIm5iZiI6MTc3MDgwODkwMCwicGF0aCI6Ii84OTg3NDM4OS81NDgxODM0MTUtN2JmNjM4MDUtYzdmZC00NzQxLWJiNDQtNmY5NDQ5YmE2ZGUzLnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjAyMTElMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwMjExVDExMjE0MFomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTk1NjZkMWVjMzliZWEyY2FhYjQ0NTBmMjQ0OTI3OWFmYjIwZjQ0ZmE5YzAzZjc5MDdlMGY1ODRjMWY5MWQ4YzEmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.Ha4J9yh-xRAYGuDCMbqPgwEtjjY3qvni9dHGhUR-JRI" />

## features

- github dashboard
  - configure and switch between remotes
  - view open PRs with status, reviews, and checks
  - see full PR details with description, labels, and assignees
  - create new PRs from the terminal
  - browse all PRs across the repo with state, search, and status filters
  - checkout PRs directly from the detail view
- jira integration
  - auto ticket detection based on branch name
  - link tickets and change status from the terminal
  - save board, filter, or JQL views and browse issues
  - sprint-grouped issue list with search, assignee filters, and pagination
  - inline issue detail view with description and comments
  - change ticket status, assign/unassign directly from the detail view
- claude code integration (requires claude code to be set up)
  - generate standup notes from daily logs
  - generate PR title and description from your diff
- daily logs
  - automatically logged when you create PRs, change ticket status, or update assignees
  - browse and view past logs
  - add manual entries inline
  - open logs in your editor for editing

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
