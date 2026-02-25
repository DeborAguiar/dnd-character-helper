// Estado do personagem (ficha)

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface ClassChoice {
  type: 'api' | 'custom'
  index: string // index da API ou id da classe custom
  name: string
}

export interface SubclassChoice {
  index: string
  name: string
}

export interface LevelUpSnapshot {
  level: number
  hpGained: number // valor rolado ou fixo
  abilityScoreImprovements?: { ability: AbilityKey; amount: number }[]
  cantripsKnown?: string[] // indices dos truques
  spellsKnown?: string[] // indices das magias de 1º nível ou superior
  spellsPrepared?: string[]
  featuresGranted: string[] // indices das features
}

export interface Character {
  id: string
  name: string
  playerName: string

  race: { index: string; name: string } | null
  class: ClassChoice | null
  subclass: SubclassChoice | null

  level: number
  abilityScores: AbilityScores
  proficiencyBonus: number

  maxHp: number
  currentHp: number
  hitDice: string // e.g. "5d10" (total disponível)
  hitDiceUsed: number

  skills: string[] // indices de proficiencies (skill-*)
  otherProficiencies: string[] // armas, armaduras, etc.

  spellsKnown: string[] // indices de spells (por nível de personagem)
  spellsPrepared: string[]
  cantripsKnown: string[]

  equipment: string[] // indices de equipment

  levelUpHistory: LevelUpSnapshot[]

  createdAt: string
  updatedAt: string
}

/** Array padrão para atributos na criação: cada valor usado uma vez. */
export const STANDARD_ABILITY_ARRAY = [15, 14, 13, 12, 10, 8] as const

export const DEFAULT_ABILITY_SCORES: AbilityScores = {
  str: 15,
  dex: 14,
  con: 13,
  int: 12,
  wis: 10,
  cha: 8,
}

export function createBlankCharacter(): Character {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: '',
    playerName: '',
    race: null,
    class: null,
    subclass: null,
    level: 1,
    abilityScores: { ...DEFAULT_ABILITY_SCORES },
    proficiencyBonus: 2,
    maxHp: 0,
    currentHp: 0,
    hitDice: '',
    hitDiceUsed: 0,
    skills: [],
    otherProficiencies: [],
    spellsKnown: [],
    spellsPrepared: [],
    cantripsKnown: [],
    equipment: [],
    levelUpHistory: [],
    createdAt: now,
    updatedAt: now,
  }
}

function safeUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // ignore
  }
  return 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11)
}

/** Personagem de teste: Mago nível 5 com magias, para testar subir de nível e ficha. */
export function createDemoCharacter(): Character {
  const now = new Date().toISOString()
  return {
    id: safeUUID(),
    name: 'Merlin (teste)',
    playerName: 'Você',
    race: { index: 'human', name: 'Human' },
    class: { type: 'api', index: 'wizard', name: 'Wizard' },
    subclass: { index: 'evocation', name: 'Evocation' },
    level: 5,
    abilityScores: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    proficiencyBonus: 3,
    maxHp: 27,
    currentHp: 27,
    hitDice: '5d6',
    hitDiceUsed: 0,
    skills: ['skill-arcana', 'skill-history', 'skill-insight', 'skill-investigation', 'skill-medicine', 'skill-religion'],
    otherProficiencies: ['daggers', 'darts', 'slings', 'quarterstaffs', 'light-crossbows'],
    cantripsKnown: ['fire-bolt', 'light', 'mage-hand', 'prestidigitation'],
    spellsKnown: [
      'magic-missile', 'shield', 'mage-armor', 'detect-magic', 'identify', 'sleep',
      'misty-step', 'scorching-ray', 'hold-person',
      'fireball', 'counterspell',
    ],
    spellsPrepared: ['magic-missile', 'shield', 'mage-armor', 'misty-step', 'fireball', 'counterspell'],
    equipment: ['quarterstaff', 'component-pouch', 'spellbook', 'dagger'],
    levelUpHistory: [],
    createdAt: now,
    updatedAt: now,
  }
}
