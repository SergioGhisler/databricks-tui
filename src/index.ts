import { createCliRenderer, TextRenderable } from "@opentui/core"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { addProfile, getActiveProfile, loadState, removeProfile, setActive, type WorkspaceProfile } from "./profiles"
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
    console.log(`Saved workspace '${name}'`) // clickable not needed in terminal
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
  const renderer = await createCliRenderer({ exitOnCtrlC: true })
  const state = await loadState()
  const active = getActiveProfile(state)

  let selected = 0
  const workspaces = state.profiles
  const activeName = active?.name
  if (activeName) {
    const idx = workspaces.findIndex((w) => w.name === activeName)
    if (idx >= 0) selected = idx
  }

  let catalogs: string[] = []
  let status = ""

  const screen = new TextRenderable(renderer, {
    id: "screen",
    content: "loading...",
    left: 1,
    top: 1,
  })
  renderer.root.add(screen)

  async function refreshCatalogs() {
    const ws = workspaces[selected]
    if (!ws) {
      catalogs = []
      status = "No workspaces. Run: databricks-tui login"
      return
    }
    try {
      status = `Loading catalogs for ${ws.name}...`
      redraw()
      catalogs = await listCatalogs(ws)
      status = `Loaded ${catalogs.length} catalogs for ${ws.name}`
    } catch (err) {
      status = `Error loading catalogs: ${String(err)}`
      catalogs = []
    }
  }

  function redraw() {
    const lines: string[] = []
    lines.push("databricks-tui")
    lines.push("")
    lines.push("Workspace manager: ↑/↓ move   Enter select/use   x delete   r refresh catalogs   q quit")
    lines.push("CLI: databricks-tui login | databricks-tui use <name> | databricks-tui delete <name>")
    lines.push("")
    lines.push("Workspaces")

    if (workspaces.length === 0) {
      lines.push("  (none)")
    } else {
      workspaces.forEach((w, i) => {
        const cursor = i === selected ? ">" : " "
        const activeMark = w.name === state.active ? "*" : " "
        lines.push(`${cursor}${activeMark} ${w.name}  (${w.host})`)
      })
    }

    lines.push("")
    lines.push("Catalogs")
    if (catalogs.length === 0) lines.push("  (none)")
    else catalogs.slice(0, 20).forEach((c) => lines.push(`  - ${c}`))

    lines.push("")
    lines.push(`Status: ${status || "idle"}`)

    screen.content = lines.join("\n")
  }

  await refreshCatalogs()
  redraw()

  renderer.keyInput.on("keypress", async (key) => {
    if (key.name === "q") {
      renderer.stop()
      process.exit(0)
    }

    if (key.name === "down" && workspaces.length > 0) {
      selected = Math.min(workspaces.length - 1, selected + 1)
      redraw()
      return
    }

    if (key.name === "up" && workspaces.length > 0) {
      selected = Math.max(0, selected - 1)
      redraw()
      return
    }

    if (key.name === "return" && workspaces[selected]) {
      await setActive(workspaces[selected].name)
      const latest = await loadState()
      state.active = latest.active
      status = `Active workspace: ${workspaces[selected].name}`
      await refreshCatalogs()
      redraw()
      return
    }

    if (key.name === "x" && workspaces[selected]) {
      const victim = workspaces[selected].name
      await removeProfile(victim)
      const latest = await loadState()
      state.active = latest.active
      state.profiles = latest.profiles
      while (selected >= state.profiles.length && selected > 0) selected -= 1
      status = `Deleted workspace: ${victim}`
      await refreshCatalogs()
      redraw()
      return
    }

    if (key.name === "r") {
      await refreshCatalogs()
      redraw()
      return
    }
  })

  renderer.start()
}

const args = process.argv.slice(2)
if (!(await cliMode(args))) {
  await runTui()
}
