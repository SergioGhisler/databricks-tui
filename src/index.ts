import {
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  TextRenderable,
  createCliRenderer,
  type SelectOption,
} from "@opentui/core"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { addProfile, getActiveProfile, loadState, removeProfile, setActive } from "./profiles"
import { listCatalogs } from "./dbx"

async function promptLogin() {
  const rl = readline.createInterface({ input, output })
  try {
    const name = (await rl.question("Workspace name: ")).trim()
    const host = (await rl.question("Workspace host URL: ")).trim()
    const token = (await rl.question("PAT token: ")).trim()
    const warehouseId = (await rl.question("SQL warehouse id (optional): ")).trim()

    if (!name || !host || !token) {
      console.error("name, host and token are required")
      process.exit(1)
    }

    await addProfile({ name, host, token, warehouseId: warehouseId || undefined })
    await setActive(name)
    console.log(`Saved workspace '${name}'`)
  } finally {
    rl.close()
  }
}

async function cliMode(args: string[]) {
  const cmd = args[0]

  if (cmd === "login") {
    await promptLogin()
    return true
  }

  if (cmd === "delete") {
    const name = args[1]
    if (!name) {
      console.error("Usage: databricks-tui delete <name>")
      process.exit(1)
    }
    const ok = await removeProfile(name)
    if (!ok) {
      console.error(`workspace not found: ${name}`)
      process.exit(1)
    }
    console.log(`Deleted workspace '${name}'`)
    return true
  }

  if (cmd === "use") {
    const name = args[1]
    if (!name) {
      console.error("Usage: databricks-tui use <name>")
      process.exit(1)
    }
    const ok = await setActive(name)
    if (!ok) {
      console.error(`workspace not found: ${name}`)
      process.exit(1)
    }
    console.log(`Active workspace: ${name}`)
    return true
  }

  return false
}

async function runTui() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    autoFocus: true,
  })

  let state = await loadState()
  let activeName = getActiveProfile(state)?.name

  const header = new TextRenderable(renderer, {
    id: "header",
    content: "databricks-tui   [Tab] switch pane   [Enter] select/use   [r] refresh   [x] delete workspace   [q] quit",
    left: 2,
    top: 1,
    fg: "#93c5fd",
  })

  const wsBox = new BoxRenderable(renderer, {
    id: "ws-box",
    left: 2,
    top: 3,
    width: 58,
    height: 26,
    borderStyle: "rounded",
    title: "Workspaces",
  })

  const catBox = new BoxRenderable(renderer, {
    id: "cat-box",
    left: 62,
    top: 3,
    width: 58,
    height: 26,
    borderStyle: "rounded",
    title: "Catalogs",
  })

  const status = new TextRenderable(renderer, {
    id: "status",
    left: 2,
    top: 30,
    content: "Status: ready",
    fg: "#a3a3a3",
  })

  const workspaceSelect = new SelectRenderable(renderer, {
    id: "workspace-select",
    left: 4,
    top: 5,
    width: 54,
    height: 22,
    options: [],
  })

  const catalogSelect = new SelectRenderable(renderer, {
    id: "catalog-select",
    left: 64,
    top: 5,
    width: 54,
    height: 22,
    options: [],
  })

  renderer.root.add(header)
  renderer.root.add(wsBox)
  renderer.root.add(catBox)
  renderer.root.add(status)
  renderer.root.add(workspaceSelect)
  renderer.root.add(catalogSelect)

  let focusedPane: "workspaces" | "catalogs" = "workspaces"

  function workspaceOptions(): SelectOption[] {
    if (state.profiles.length === 0) {
      return [{ name: "(no workspaces)", description: "Run: databricks-tui login" }]
    }

    return state.profiles.map((p) => ({
      name: p.name,
      description: `${p.host}${p.name === activeName ? "  [active]" : ""}`,
    }))
  }

  async function refreshCatalogsFor(name?: string) {
    const ws = state.profiles.find((p) => p.name === (name || activeName))
    if (!ws) {
      catalogSelect.options = [{ name: "(none)", description: "No active workspace" }]
      status.content = "Status: no active workspace"
      return
    }

    status.content = `Status: loading catalogs for ${ws.name}...`
    try {
      const cats = await listCatalogs(ws)
      catalogSelect.options = (cats.length ? cats : ["(none)"]).map((c) => ({
        name: c,
        description: "catalog",
      }))
      status.content = `Status: loaded ${cats.length} catalogs for ${ws.name}`
    } catch (err) {
      catalogSelect.options = [{ name: "(error)", description: String(err) }]
      status.content = `Status: error loading catalogs (${String(err)})`
    }
  }

  async function refreshAll() {
    state = await loadState()
    activeName = getActiveProfile(state)?.name
    workspaceSelect.options = workspaceOptions()
    await refreshCatalogsFor(activeName)
  }

  workspaceSelect.on(SelectRenderableEvents.ITEM_SELECTED, async (_idx: number, option: SelectOption) => {
    const name = option?.name
    if (!name || name.startsWith("(")) return
    await setActive(name)
    state = await loadState()
    activeName = name
    workspaceSelect.options = workspaceOptions()
    await refreshCatalogsFor(name)
  })

  renderer.keyInput.on("keypress", async (key) => {
    if (key.name === "q") {
      renderer.stop()
      process.exit(0)
    }

    if (key.name === "tab") {
      if (focusedPane === "workspaces") {
        focusedPane = "catalogs"
        catalogSelect.focus()
        status.content = "Status: focus catalogs (mouse click also works)"
      } else {
        focusedPane = "workspaces"
        workspaceSelect.focus()
        status.content = "Status: focus workspaces (mouse click also works)"
      }
      return
    }

    if (key.name === "x" && focusedPane === "workspaces") {
      // best-effort delete currently selected workspace by matching active
      if (!activeName) return
      await removeProfile(activeName)
      await refreshAll()
      status.content = `Status: deleted workspace ${activeName}`
      return
    }

    if (key.name === "r") {
      await refreshAll()
      status.content = "Status: refreshed"
      return
    }
  })

  await refreshAll()
  workspaceSelect.focus()
  renderer.start()
}

const args = process.argv.slice(2)
if (!(await cliMode(args))) {
  await runTui()
}
