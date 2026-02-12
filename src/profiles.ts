import os from "node:os"
import path from "node:path"
import { mkdir, readFile, writeFile } from "node:fs/promises"

export type WorkspaceProfile = {
  name: string
  host: string
  token: string
  warehouseId?: string
}

type ProfileState = {
  active?: string
  profiles: WorkspaceProfile[]
}

function configPath(): string {
  return path.join(os.homedir(), ".config", "databricks-tui", "profiles.json")
}

async function ensureConfigDir() {
  await mkdir(path.dirname(configPath()), { recursive: true })
}

export async function loadState(): Promise<ProfileState> {
  try {
    const raw = await readFile(configPath(), "utf8")
    const parsed = JSON.parse(raw) as ProfileState
    return {
      active: parsed.active,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
    }
  } catch {
    return { profiles: [] }
  }
}

export async function saveState(state: ProfileState): Promise<void> {
  await ensureConfigDir()
  await writeFile(configPath(), JSON.stringify(state, null, 2), "utf8")
}

export async function addProfile(profile: WorkspaceProfile): Promise<void> {
  const state = await loadState()
  const existing = state.profiles.findIndex((p) => p.name === profile.name)
  if (existing >= 0) state.profiles[existing] = profile
  else state.profiles.push(profile)
  if (!state.active) state.active = profile.name
  await saveState(state)
}

export async function removeProfile(name: string): Promise<boolean> {
  const state = await loadState()
  const next = state.profiles.filter((p) => p.name !== name)
  if (next.length === state.profiles.length) return false
  state.profiles = next
  if (state.active === name) state.active = state.profiles[0]?.name
  await saveState(state)
  return true
}

export async function setActive(name: string): Promise<boolean> {
  const state = await loadState()
  const found = state.profiles.some((p) => p.name === name)
  if (!found) return false
  state.active = name
  await saveState(state)
  return true
}

export function getActiveProfile(state: ProfileState): WorkspaceProfile | undefined {
  if (!state.active) return state.profiles[0]
  return state.profiles.find((p) => p.name === state.active) ?? state.profiles[0]
}
