import { Box, Text, createCliRenderer } from "@opentui/core"

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
})

renderer.keyInput.on("keypress", (key) => {
  if (key.name === "q") {
    renderer.stop()
    process.exit(0)
  }
})

const header = Box(
  {
    borderStyle: "rounded",
    borderColor: "#3b82f6",
    padding: 1,
    width: "100%",
    height: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  Text({ content: "databricks-tui", fg: "#93c5fd" }),
  Text({ content: "q quit", fg: "#a3a3a3" }),
)

const explorerPane = Box(
  {
    borderStyle: "rounded",
    borderColor: "#52525b",
    padding: 1,
    flexGrow: 3,
    minWidth: 30,
    flexDirection: "column",
    gap: 1,
  },
  Text({ content: "Explorer", fg: "#f8fafc" }),
  Text({ content: "▾ main", fg: "#d4d4d8" }),
  Text({ content: "  ▾ default", fg: "#d4d4d8" }),
  Text({ content: "    • orders", fg: "#a1a1aa" }),
  Text({ content: "    • customers", fg: "#a1a1aa" }),
  Text({ content: "  ▸ bronze", fg: "#d4d4d8" }),
)

const detailsPane = Box(
  {
    borderStyle: "rounded",
    borderColor: "#52525b",
    padding: 1,
    flexGrow: 2,
    minWidth: 24,
    flexDirection: "column",
    gap: 1,
  },
  Text({ content: "Details", fg: "#f8fafc" }),
  Text({ content: "Table: main.default.orders", fg: "#a1a1aa" }),
  Text({ content: "Columns", fg: "#d4d4d8" }),
  Text({ content: "- order_id BIGINT", fg: "#a1a1aa" }),
  Text({ content: "- customer_id BIGINT", fg: "#a1a1aa" }),
  Text({ content: "- amount DECIMAL(10,2)", fg: "#a1a1aa" }),
)

const topRow = Box(
  {
    width: "100%",
    flexGrow: 1,
    gap: 1,
    flexDirection: "row",
  },
  explorerPane,
  detailsPane,
)

const resultsPane = Box(
  {
    borderStyle: "rounded",
    borderColor: "#52525b",
    padding: 1,
    width: "100%",
    height: 10,
    flexDirection: "column",
    gap: 1,
  },
  Text({ content: "Results (sample)", fg: "#f8fafc" }),
  Text({ content: "order_id | customer_id | amount", fg: "#d4d4d8" }),
  Text({ content: "--------------------------------", fg: "#52525b" }),
  Text({ content: "1001     | 501         | 42.50", fg: "#a1a1aa" }),
  Text({ content: "1002     | 734         | 18.00", fg: "#a1a1aa" }),
  Text({ content: "1003     | 129         | 67.25", fg: "#a1a1aa" }),
)

const root = Box(
  {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    gap: 1,
    padding: 1,
  },
  header,
  topRow,
  resultsPane,
)

renderer.root.add(root)
renderer.start()
