# databricks-tui

A general-purpose terminal UI for exploring Databricks resources.

## Current capabilities

- Workspace login/add (CLI prompt): `databricks-tui login`
- Workspace select/use: `databricks-tui use <name>`
- Workspace delete: `databricks-tui delete <name>`
- Interactive TUI workspace list with keyboard navigation
- Catalog loading for selected workspace

## Run

```bash
bun install
bun run dev
```

## CLI commands

```bash
bun run src/index.ts login
bun run src/index.ts use <workspace-name>
bun run src/index.ts delete <workspace-name>
```

## TUI keys

- `↑/↓` move workspace selection
- `Enter` set active workspace
- `x` delete selected workspace
- `r` refresh catalogs
- `q` quit

## Config storage

Workspace profiles are stored at:

`~/.config/databricks-tui/profiles.json`

## Next roadmap

1. Move login flow fully inside TUI forms
2. Add schema/table expansion tree
3. Add details pane + sample/query results pane
4. Add warehouse-aware sample query execution
