import { listUnitOptions } from '../data/curriculum/unit-options'

const byId = () => new Map(listUnitOptions().map((u) => [u.id, u.label]))

let cache: Map<string, string> | null = null

export function labelForUnitId(unitId: string | null | undefined): string {
  if (!unitId) return '—'
  if (!cache) cache = byId()
  return cache.get(unitId) ?? unitId
}
