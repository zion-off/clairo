# clairo

Terminal dashboard for GitHub PRs and Jira tickets.

## Requirements

- Node.js 18+
- [GitHub CLI](https://cli.github.com/) (`gh`) installed and authenticated

## Usage

```bash
npx clairo
```

### Options

```
--cwd <path>, -C   Run in a different directory
--version          Show version
--help             Show help
```

### Examples

```bash
# Run in current directory
npx clairo

# Run in a different repo
npx clairo --cwd ~/projects/other-repo
```

## Keyboard

- `1-6` - Switch between boxes
- `j/k` - Navigate lists
- `Enter` - Select
- `o` - Open in browser
- `Ctrl+C` - Quit
