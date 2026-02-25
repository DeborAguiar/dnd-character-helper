import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { Character, LevelUpSnapshot } from '../types/character'
import { createBlankCharacter } from '../types/character'
import type { CustomClass } from '../types/customClass'

const STORAGE_KEY = 'dnd-character-helper'
const CUSTOM_CLASSES_KEY = 'dnd-custom-classes'

// Estado global
interface AppState {
  character: Character
  customClasses: CustomClass[]
}

type Action =
  | { type: 'LOAD_CHARACTER'; payload: Character }
  | { type: 'RESET_CHARACTER' }
  | { type: 'UPDATE_CHARACTER'; payload: Partial<Character> }
  | { type: 'APPLY_LEVEL_UP'; payload: LevelUpSnapshot }
  | { type: 'LOAD_CUSTOM_CLASSES'; payload: CustomClass[] }
  | { type: 'SAVE_CUSTOM_CLASS'; payload: CustomClass }
  | { type: 'DELETE_CUSTOM_CLASS'; payload: string }

function characterReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_CHARACTER':
      return { ...state, character: action.payload }
    case 'RESET_CHARACTER':
      return { ...state, character: createBlankCharacter() }
    case 'UPDATE_CHARACTER':
      return {
        ...state,
        character: {
          ...state.character,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        },
      }
    case 'APPLY_LEVEL_UP': {
      const snap = action.payload
      const prev = state.character
      const newScores = { ...prev.abilityScores }
      for (const asi of snap.abilityScoreImprovements ?? []) {
        newScores[asi.ability] = (newScores[asi.ability] ?? 10) + asi.amount
      }
      return {
        ...state,
        character: {
          ...prev,
          level: snap.level,
          maxHp: prev.maxHp + snap.hpGained,
          currentHp: prev.currentHp + snap.hpGained,
          abilityScores: newScores,
          proficiencyBonus: Math.ceil(snap.level / 4) + 1,
          cantripsKnown: [...(prev.cantripsKnown ?? []), ...(snap.cantripsKnown ?? [])],
          spellsKnown: [...(prev.spellsKnown ?? []), ...(snap.spellsKnown ?? [])],
          spellsPrepared: [...(prev.spellsPrepared ?? []), ...(snap.spellsPrepared ?? [])],
          levelUpHistory: [...prev.levelUpHistory, snap],
          updatedAt: new Date().toISOString(),
        },
      }
    }
    case 'LOAD_CUSTOM_CLASSES':
      return { ...state, customClasses: action.payload }
    case 'SAVE_CUSTOM_CLASS': {
      const list = state.customClasses.filter((c) => c.id !== action.payload.id)
      list.push(action.payload)
      return { ...state, customClasses: list }
    }
    case 'DELETE_CUSTOM_CLASS':
      return {
        ...state,
        customClasses: state.customClasses.filter((c) => c.id !== action.payload),
      }
    default:
      return state
  }
}

interface CharacterContextValue extends AppState {
  updateCharacter: (patch: Partial<Character>) => void
  applyLevelUp: (snap: LevelUpSnapshot) => void
  resetCharacter: () => void
  loadCharacter: (c: Character) => void
  saveCustomClass: (c: CustomClass) => void
  deleteCustomClass: (id: string) => void
  getCustomClass: (id: string) => CustomClass | undefined
  exportCharacter: () => void
  importCharacter: (json: string) => Character | null
}

const initialState: AppState = {
  character: createBlankCharacter(),
  customClasses: [],
}

const CharacterContext = createContext<CharacterContextValue | null>(null)

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(characterReducer, initialState)

  const loadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const c = JSON.parse(raw) as Character
        dispatch({ type: 'LOAD_CHARACTER', payload: c })
      }
      const customRaw = localStorage.getItem(CUSTOM_CLASSES_KEY)
      if (customRaw) {
        const list = JSON.parse(customRaw) as CustomClass[]
        dispatch({ type: 'LOAD_CUSTOM_CLASSES', payload: list })
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.character))
    } catch {
      // ignore
    }
  }, [state.character])

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_CLASSES_KEY, JSON.stringify(state.customClasses))
    } catch {
      // ignore
    }
  }, [state.customClasses])

  const updateCharacter = useCallback((patch: Partial<Character>) => {
    dispatch({ type: 'UPDATE_CHARACTER', payload: patch })
  }, [])

  const applyLevelUp = useCallback((snap: LevelUpSnapshot) => {
    dispatch({ type: 'APPLY_LEVEL_UP', payload: snap })
  }, [])

  const resetCharacter = useCallback(() => {
    dispatch({ type: 'RESET_CHARACTER' })
  }, [])

  const loadCharacter = useCallback((c: Character) => {
    dispatch({ type: 'LOAD_CHARACTER', payload: c })
  }, [])

  const saveCustomClass = useCallback((c: CustomClass) => {
    dispatch({ type: 'SAVE_CUSTOM_CLASS', payload: c })
  }, [])

  const deleteCustomClass = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CUSTOM_CLASS', payload: id })
  }, [])

  const getCustomClass = useCallback(
    (id: string) => state.customClasses.find((c) => c.id === id),
    [state.customClasses]
  )

  const exportCharacter = useCallback(() => {
    const blob = new Blob([JSON.stringify(state.character, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ficha-${state.character.name || 'personagem'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [state.character])

  const importCharacter = useCallback((json: string): Character | null => {
    try {
      const c = JSON.parse(json) as Character
      if (c && typeof c.level === 'number' && c.abilityScores) {
        dispatch({ type: 'LOAD_CHARACTER', payload: c })
        return c
      }
    } catch {
      // ignore
    }
    return null
  }, [])

  const value: CharacterContextValue = {
    ...state,
    updateCharacter,
    applyLevelUp,
    resetCharacter,
    loadCharacter,
    saveCustomClass,
    deleteCustomClass,
    getCustomClass,
    exportCharacter,
    importCharacter,
  }

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within CharacterProvider')
  return ctx
}
