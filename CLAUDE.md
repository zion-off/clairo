# clairo

Terminal dashboard for GitHub and Jira integration, built with Ink (React for CLI).

## Quick Reference

- **Build/Run**: `pnpm dev` (dev), `pnpm build` (prod)
- **Config location**: `~/.clairo/config.json`
- **GitHub features require**: `gh` CLI installed and authenticated

## Architecture

- `app.tsx` manages view focus (`github` | `jira`) and modal state
- Views manage box focus within them (e.g., `remotes` | `prs` | `details`)
- Number keys 1-4 switch focus, shown in TitledBox titles as `[1]`, `[2]`, etc.

## Key Conventions

- **Modals**: When open, call `onModalChange?.(true)` to disable parent keyboard handling
- **Keybindings**: Views call `onKeybindingsChange?.([])` when modal open or unfocused
- **Colors**: yellow=focused, blue=links, green=success/open, red=error/delete, magenta=merged

## Common Patterns

```typescript
// Result types - use discriminated unions
type Result<T> = { success: true; data: T } | { success: false; error: string; errorType: string };

// Multiple loading states
const [loading, setLoading] = useState({ a: false, b: false });
setLoading((prev) => ({ ...prev, a: true }));

// Keyboard handling with focus
useInput((input, key) => { ... }, { isActive: isFocused && !showModal });
```

## Adding Features

### New box in a view

1. Create component in `components/github/` or `components/jira/`
2. Add to view's `FocusedBox` type
3. Add number key handling in view's `useInput`
4. Add keybindings for the box
5. Render with `isFocused={focusedBox === 'newbox'}`

### New modal

1. Create modal with `onSubmit`, `onCancel`, `loading`, `error` props
2. Add `showModal` state in parent view
3. Include in `onModalChange` effect
4. Include in `onKeybindingsChange` effect (clear bindings when open)
5. Check for modal in `useInput` active condition
6. Render modal conditionally, return early

### New API integration

1. Types in `lib/newservice/types.ts`
2. API client in `lib/newservice/api.ts`
3. Config helpers in `lib/newservice/config.ts`
4. Barrel export in `lib/newservice/index.ts`

## Gotchas

- `gh pr view` without `--repo` auto-detects the correct upstream (handles forks)
- `gh pr view` with `--repo` requires a PR number/branch argument
- Jira API uses Basic auth: `base64(email:apiToken)`
- When opening external editor, call `process.stdout.emit('resize')` after to refresh TUI
