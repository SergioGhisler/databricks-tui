import { render } from "@opentui/core";

// Minimal boot screen while we build full explorer/results panes.
const app = {
  type: "box",
  props: {
    border: true,
    padding: 1,
    children: "databricks-tui (OpenTUI scaffold)\n\nNext: explorer tree + details + query results.",
  },
};

render(app as never);
