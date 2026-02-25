// Classe customizada (homebrew) — progressão nível a nível

export interface CustomClassLevel {
  level: number
  abilityScoreBonuses: number
  profBonus: number
  featureIds: string[] // ids locais das features
  featureNames?: string[] // nome para exibição
  spellcasting?: {
    cantripsKnown?: number
    spellsKnown?: number
    spellSlots: number[] // [2,0,0,...] slots por nível de magia
  }
}

export interface CustomClassFeature {
  id: string
  name: string
  description: string
  level: number
}

export interface CustomClass {
  id: string
  name: string
  hitDie: number // 6, 8, 10, 12
  savingThrows: string[] // e.g. ['str', 'dex']
  proficiencyChoices: {
    desc: string
    choose: number
    options: string[] // indices de skills ou "weapons" etc.
  }[]
  proficiencies: string[] // armas, armaduras fixas
  levels: CustomClassLevel[]
  features: CustomClassFeature[]
  subclasses?: {
    id: string
    name: string
    levels: { level: number; featureIds: string[] }[]
    features: CustomClassFeature[]
  }[]
  spellcastingByLevel?: number // nível em que ganha spellcasting (1-20 ou 0 = não conjurador)
  createdAt: string
  updatedAt: string
}

export function createBlankCustomClass(): CustomClass {
  const now = new Date().toISOString()
  const levels: CustomClassLevel[] = []
  for (let i = 1; i <= 20; i++) {
    levels.push({
      level: i,
      abilityScoreBonuses: [4, 6, 8, 10, 12, 14, 16, 19].includes(i) ? 1 : 0,
      profBonus: Math.ceil(i / 4) + 1,
      featureIds: [],
    })
  }
  return {
    id: crypto.randomUUID(),
    name: '',
    hitDie: 8,
    savingThrows: [],
    proficiencyChoices: [],
    proficiencies: [],
    levels,
    features: [],
    createdAt: now,
    updatedAt: now,
  }
}
