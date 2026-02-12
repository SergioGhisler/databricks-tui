import { WorkspaceProfile } from "./profiles"

export async function listCatalogs(profile: WorkspaceProfile): Promise<string[]> {
  const url = `${profile.host.replace(/\/$/, "")}/api/2.1/unity-catalog/catalogs`
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${profile.token}` },
  })
  if (!r.ok) {
    throw new Error(`Catalogs request failed (${r.status})`)
  }
  const data = (await r.json()) as { catalogs?: Array<{ name?: string }> }
  return (data.catalogs ?? []).map((c) => c.name).filter((x): x is string => Boolean(x)).sort()
}
