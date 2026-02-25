// Tipos base da dnd5eapi (SRD)

export interface ApiRef {
  index: string
  name: string
  url: string
}

export interface ApiListResponse<T extends ApiRef> {
  count: number
  results: T[]
}

// Ability scores
export interface AbilityScore extends ApiRef {
  full_name: string
  description: string[]
  skills: ApiRef[]
}

// Classes
export interface DndClass extends ApiRef {
  hit_die: number
  proficiency_choices: ProficiencyChoice[]
  proficiencies: ApiRef[]
  saving_throws: ApiRef[]
  starting_equipment: unknown[]
  starting_equipment_options: unknown[]
  class_levels: string
  multi_classing: unknown
  subclasses: ApiRef[]
}

export interface ProficiencyChoice {
  desc: string
  choose: number
  type: string
  from: {
    option_set_type: string
    options?: { option_type: string; item?: ApiRef; [k: string]: unknown }[]
    equipment_category?: ApiRef
  }
}

// Class level (one level of a class)
export interface ClassLevel {
  level: number
  ability_score_bonuses: number
  prof_bonus: number
  features: ApiRef[]
  class_specific: Record<string, number>
  index: string
  class: ApiRef
  url: string
  spellcasting?: {
    spell_slots_level_1: number
    spell_slots_level_2: number
    spell_slots_level_3: number
    spell_slots_level_4: number
    spell_slots_level_5: number
    spell_slots_level_6: number
    spell_slots_level_7: number
    spell_slots_level_8: number
    spell_slots_level_9: number
    spells_known?: number
    cantrips_known?: number
  }
}

// Subclass
export interface Subclass extends ApiRef {
  subclass_flavor: string
  description: string[]
  subclass_levels: string
  spells?: { prerequisites: unknown[]; spell: ApiRef }[]
}

export interface SubclassLevel {
  level: number
  features: ApiRef[]
  index: string
  subclass: ApiRef
  url: string
}

// Feature
export interface Feature {
  index: string
  name: string
  url: string
  desc: string[]
  class?: ApiRef
  subclass?: ApiRef
  level?: number
}

// Race
export interface Race extends ApiRef {
  speed: number
  ability_bonuses: { ability_score: ApiRef; bonus: number }[]
  alignment: string
  age: string
  size: string
  size_description: string
  starting_proficiencies: ApiRef[]
  starting_proficiency_options?: ProficiencyChoice
  languages: ApiRef[]
  language_desc: string
  traits: ApiRef[]
  subraces: ApiRef[]
}

// Spell
export interface Spell extends ApiRef {
  level: number
  school: ApiRef
  concentration: boolean
  ritual: boolean
  components: string[]
  material?: string
  casting_time: string
  duration: string
  desc: string[]
  classes: ApiRef[]
  subclasses?: ApiRef[]
}

// Proficiencies (skill, etc.)
export interface Proficiency {
  index: string
  name: string
  url: string
  type: string
  reference?: ApiRef
}
