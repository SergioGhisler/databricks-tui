# databricks-tui

A general-purpose terminal UI for exploring Databricks resources:

- workspaces/profiles
- catalogs, schemas, tables
- table metadata
- sample/query results

It can be launched directly in any terminal, and can also be embedded by editors/tools.

## Status

Early scaffold (OpenTUI migration in progress).

## Tech direction

- OpenTUI
- TypeScript
- Bun/Node runtime

## Roadmap

1. Boot OpenTUI app shell
2. Add explorer tree (catalog → schema → table)
3. Add details panel
4. Add sample/query results panel
5. Add key-driven navigation/actions

## Dev

```bash
bun install
bun run dev
```
