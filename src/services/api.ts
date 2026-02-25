// Cliente da dnd5eapi com cache em memória

const BASE = 'https://www.dnd5eapi.co'

const cache = new Map<string, unknown>()

async function fetchApi<T>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const cached = cache.get(url)
  if (cached != null) return cached as T
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  const data = (await res.json()) as T
  cache.set(url, data)
  return data
}

// Listas (index)
export const api = {
  classes: () => fetchApi<{ count: number; results: { index: string; name: string; url: string }[] }>('/api/classes'),
  races: () => fetchApi<{ count: number; results: { index: string; name: string; url: string }[] }>('/api/races'),
  spells: () => fetchApi<{ count: number; results: { index: string; name: string; url: string }[] }>('/api/spells'),
  abilities: () => fetchApi<{ count: number; results: { index: string; name: string; url: string }[] }>('/api/ability-scores'),
  skills: () => fetchApi<{ count: number; results: { index: string; name: string; url: string }[] }>('/api/skills'),
  proficiencies: () => fetchApi<{ count: number; results: { index: string; name: string; url: string }[] }>('/api/proficiencies'),
}

// Detalhes por path (usar url retornada pela API, ex: /api/classes/fighter)
export async function getByPath<T>(path: string): Promise<T> {
  return fetchApi<T>(path)
}

// Atalhos comuns
export async function getClass(index: string) {
  return getByPath<import('../types/api').DndClass>(`/api/classes/${index}`)
}

export async function getClassLevels(index: string) {
  return getByPath<import('../types/api').ClassLevel[]>(`/api/classes/${index}/levels`)
}

export async function getSubclass(_classIndex: string, subclassIndex: string) {
  return getByPath<import('../types/api').Subclass>(`/api/subclasses/${subclassIndex}`)
}

export async function getSubclassLevels(subclassIndex: string) {
  return getByPath<import('../types/api').SubclassLevel[]>(`/api/subclasses/${subclassIndex}/levels`)
}

export async function getFeature(index: string) {
  return getByPath<import('../types/api').Feature>(`/api/features/${index}`)
}

export async function getRace(index: string) {
  return getByPath<import('../types/api').Race>(`/api/races/${index}`)
}

export async function getSpell(index: string) {
  return getByPath<import('../types/api').Spell>(`/api/spells/${index}`)
}

export async function getProficiency(index: string) {
  return getByPath<import('../types/api').Proficiency>(`/api/proficiencies/${index}`)
}

/** Skill index sem o prefixo "skill-" (ex.: acrobatics). Retorna desc e ability_score. */
export async function getSkill(skillIndex: string) {
  return getByPath<{ index: string; name: string; desc: string[]; ability_score: { index: string; name: string } }>(`/api/skills/${skillIndex}`)
}

/** Lista equipamentos de uma categoria (ex.: martial-weapons). */
export async function getEquipmentCategory(categoryIndex: string) {
  return getByPath<{ index: string; name: string; equipment: { index: string; name: string; url: string }[] }>(`/api/equipment-categories/${categoryIndex}`)
}

/** Lista magias disponíveis para uma classe (cantrips = level 0). */
export async function getClassSpells(classIndex: string) {
  return getByPath<{ count: number; results: { index: string; name: string; level: number; url: string }[] }>(`/api/classes/${classIndex}/spells`)
}
