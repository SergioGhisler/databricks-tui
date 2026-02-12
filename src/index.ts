import { createCliRenderer, TextRenderable } from "@opentui/core"
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

function drawPanel(title: string, bodyLines: string[], width = 58): string[] {
  const top = `┌─ ${title} ${"─".repeat(Math.max(1, width - title.length - 4))}┐`
  const bottom = `└${"─".repeat(width)}┘`
  const rows = bodyLines.map((l) => `│ ${l.slice(0, width - 1).padEnd(width - 1, " ")}│`)
  return [top, ...rows, bottom]
}

function combineColumns(left: string[], right: string[], gap = "  "): string[] {
  const max = Math.max(left.length, right.length)
  const lw = Math.max(...left.map((x) => x.length), 0)
  const out: string[] = []
  for (let i = 0; i < max; i++) {
    const l = left[i] ?? ""
    const r = right[i] ?? ""
    out.push(l.padEnd(lw, " ") + gap + r)
  }
  return out
}

async function runTui() {
  const renderer = await createCliRenderer({ exitOnCtrlC: true })
  const state = await loadState()

  let selected = 0
  const active = getActiveProfile(state)
  if (active?.name) {
    const idx = state.profiles.findIndex((w) => w.name === active.name)
    if (idx >= 0) selected = idx
  }

  let catalogs: string[] = []
  let status = "ready"

  const screen = new TextRenderable(renderer, {
    id: "screen",
    content: "loading...",
    left: 1,
    top: 1,
  })
  renderer.root.add(screen)

  function currentWorkspaces() {
    return state.profiles
  }

  async function refreshCatalogs() {
    const ws = currentWorkspaces()[selected]
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
    const header = [
      "databricks-tui  (OpenTUI in progress)",
      "keys: ↑/↓ move  Enter use  x delete  r refresh  q quit",
      "commands: databricks-tui login | use <name> | delete <name>",
      "",
    ]

    const wsLines: string[] = []
    const workspaces = currentWorkspaces()
    if (workspaces.length === 0) {
      wsLines.push("(none)")
    } else {
      workspaces.forEach((w, i) => {
        const cursor = i === selected ? ">" : " "
        const activeMark = w.name === state.active ? "*" : " "
        wsLines.push(`${cursor}${activeMark} ${w.name}`)
        wsLines.push(`   ${w.host}`)
      })
    }

    const catLines = catalogs.length ? catalogs.slice(0, 20).map((c) => `- ${c}`) : ["(none)"]

    const left = drawPanel("Workspaces", wsLines, 54)
    const right = drawPanel("Catalogs", catLines, 54)
    const rows = combineColumns(left, right)

    const statusPanel = drawPanel("Status", [status], 110)

    screen.content = [...header, ...rows, "", ...statusPanel].join("\n")
  }

  await refreshCatalogs()
  redraw()

  renderer.keyInput.on("keypress", async (key) => {
    const workspaces = currentWorkspaces()

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
