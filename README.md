# databricks-tui

Terminal UI for Databricks exploration (catalogs/schemas/tables/query sample), designed to be launched from `databricks-nvim` via `:DbxTui`.

## Status

Scaffold phase.

## Planned stack

- OpenTUI
- TypeScript
- Node runtime

## Integration target

`databricks-nvim` can launch this app in a floating terminal:

```lua
tui = {
  cmd = { "databricks-tui" },
}
```

## Roadmap

1. Boot OpenTUI app shell
2. Add tree pane (catalog/schema/table)
3. Add details pane
4. Add sample query pane
5. Add keyboard navigation and actions
