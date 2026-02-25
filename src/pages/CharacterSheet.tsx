import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCharacter } from '../context/CharacterContext'
import { getClassSpells } from '../services/api'
import type { AbilityKey } from '../types/character'
import styles from './CharacterSheet.module.css'

type SpellByLevel = { level: number; index: string; name: string }[]

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'FOR',
  dex: 'DES',
  con: 'CON',
  int: 'INT',
  wis: 'SAB',
  cha: 'CAR',
}

function mod(n: number) {
  const m = Math.floor((n - 10) / 2)
  return m >= 0 ? `+${m}` : String(m)
}

const ALL_SKILLS: { index: string; name: string }[] = [
  { index: 'acrobatics', name: 'Acrobatics' },
  { index: 'animal-handling', name: 'Animal Handling' },
  { index: 'arcana', name: 'Arcana' },
  { index: 'athletics', name: 'Athletics' },
  { index: 'deception', name: 'Deception' },
  { index: 'history', name: 'History' },
  { index: 'insight', name: 'Insight' },
  { index: 'intimidation', name: 'Intimidation' },
  { index: 'investigation', name: 'Investigation' },
  { index: 'medicine', name: 'Medicine' },
  { index: 'nature', name: 'Nature' },
  { index: 'perception', name: 'Perception' },
  { index: 'performance', name: 'Performance' },
  { index: 'persuasion', name: 'Persuasion' },
  { index: 'religion', name: 'Religion' },
  { index: 'sleight-of-hand', name: 'Sleight of Hand' },
  { index: 'stealth', name: 'Stealth' },
  { index: 'survival', name: 'Survival' },
]

export default function CharacterSheet() {
  const { character, updateCharacter } = useCharacter()
  const [spellsGrouped, setSpellsGrouped] = useState<Record<number, SpellByLevel>>({})

  useEffect(() => {
    const indices = new Set([
      ...character.cantripsKnown,
      ...character.spellsKnown,
    ])
    if (indices.size === 0 || !character.class?.index || character.class.type === 'custom') {
      setSpellsGrouped({})
      return
    }
    let cancelled = false
    getClassSpells(character.class.index)
      .then((res) => {
        if (cancelled) return
        const map: Record<number, SpellByLevel> = {}
        for (const s of res.results ?? []) {
          if (indices.has(s.index)) {
            const lvl = s.level
            if (!map[lvl]) map[lvl] = []
            map[lvl].push({ level: s.level, index: s.index, name: s.name })
          }
        }
        for (const arr of Object.values(map)) {
          arr.sort((a, b) => a.name.localeCompare(b.name))
        }
        setSpellsGrouped(map)
      })
      .catch(() => { if (!cancelled) setSpellsGrouped({}) })
    return () => { cancelled = true }
  }, [character.class?.index, character.class?.type, character.cantripsKnown, character.spellsKnown])

  if (!character.name && !character.class?.name) {
    return (
      <div className={styles.empty}>
        <p>Nenhum personagem criado ainda.</p>
        <Link to="/create">Criar personagem</Link>
      </div>
    )
  }

  return (
    <div className={styles.sheet}>
      <header className={styles.header}>
        <h1>{character.name || 'Sem nome'}</h1>
        <p className={styles.subtitle}>
          {character.playerName && `${character.playerName} · `}
          {character.race?.name} {character.class?.name} nível {character.level}
          {character.subclass?.name && ` (${character.subclass.name})`}
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.abilities}>
          <h2>Atributos</h2>
          <div className={styles.abilityGrid}>
            {ABILITY_KEYS.map((key) => (
              <div key={key} className={styles.abilityBox}>
                <div className={styles.abilityLabel}>{ABILITY_NAMES[key]}</div>
                <div className={styles.abilityValue}>{character.abilityScores[key]}</div>
                <div className={styles.abilityMod}>{mod(character.abilityScores[key])}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.stats}>
          <h2>Combate</h2>
          <div className={styles.statRow}>
            <span>Classe de Armadura</span>
            <strong>—</strong>
          </div>
          <div className={styles.statRow}>
            <span>Iniciativa</span>
            <strong>{mod(character.abilityScores.dex)}</strong>
          </div>
          <div className={styles.statRow}>
            <span>Deslocamento</span>
            <strong>—</strong>
          </div>
          <div className={styles.statRow}>
            <span>Bônus de proficiência</span>
            <strong>+{character.proficiencyBonus}</strong>
          </div>
        </section>

        <section className={styles.hp}>
          <h2>Pontos de vida</h2>
          <div className={styles.hpRow}>
            <label>
              Atual
              <input
                type="number"
                min={0}
                max={character.maxHp}
                value={character.currentHp}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (!Number.isNaN(v)) {
                    updateCharacter({
                      currentHp: Math.max(0, Math.min(character.maxHp, v)),
                    })
                  }
                }}
              />
            </label>
            <span className={styles.sep}>/</span>
            <strong>{character.maxHp}</strong>
          </div>
          <p className={styles.hitDice}>
            Dados de vida: {character.hitDice || '—'} (usados: {character.hitDiceUsed})
          </p>
        </section>

        <section className={styles.list}>
          <h2>Perícias</h2>
          <ol className={styles.skillList}>
            {ALL_SKILLS.map((skill) => {
              const hasProficiency = character.skills.some((s) => s === `skill-${skill.index}` || s === skill.index)
              return (
                <li
                  key={skill.index}
                  className={hasProficiency ? styles.skillProficient : undefined}
                >
                  {skill.name}
                  {hasProficiency && <span className={styles.skillBadge} title="Proficiência"> ✓</span>}
                </li>
              )
            })}
          </ol>
        </section>

        <section className={styles.list}>
          <h2>Magias conhecidas / preparadas</h2>
          {Object.keys(spellsGrouped).length === 0 && character.cantripsKnown.length === 0 && character.spellsKnown.length === 0 && (
            <p className={styles.muted}>Nenhuma magia registrada.</p>
          )}
          {Object.keys(spellsGrouped).length > 0 && (
            <div className={styles.spellsByLevel}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => {
                const list = spellsGrouped[lvl]
                if (!list?.length) return null
                const levelLabel = lvl === 0 ? 'Truques' : `Nível ${lvl}`
                return (
                  <div key={lvl} className={styles.spellLevelGroup}>
                    <strong>{levelLabel}</strong>
                    <ol className={styles.spellList}>
                      {list.map((s) => (
                        <li key={s.index}>{s.name}</li>
                      ))}
                    </ol>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className={styles.equipmentSection}>
          <h2>Equipamento / Inventário</h2>
          {(() => {
            const counts: Record<string, number> = {}
            for (const id of character.equipment) {
              counts[id] = (counts[id] ?? 0) + 1
            }
            const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
            return entries.length ? (
              <ul className={styles.equipmentList}>
                {entries.map(([index, qty]) => (
                  <li key={index} className={styles.equipmentItem}>
                    <span className={styles.equipmentName}>
                      {index.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      {qty > 1 ? ` ×${qty}` : ''}
                    </span>
                    <button
                      type="button"
                      className={styles.equipmentRemove}
                      onClick={() => {
                        const i = character.equipment.indexOf(index)
                        if (i >= 0) {
                          const next = [...character.equipment]
                          next.splice(i, 1)
                          updateCharacter({ equipment: next })
                        }
                      }}
                      title="Remover um"
                    >
                      −
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>Nenhum item.</p>
            )
          })()}
          <div className={styles.equipmentAdd}>
            <input
              type="text"
              placeholder="Índice do item (ex.: longsword)"
              className={styles.equipmentInput}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const val = (e.currentTarget.value ?? '').trim().toLowerCase().replace(/\s+/g, '-')
                if (val) {
                  updateCharacter({ equipment: [...character.equipment, val] })
                  e.currentTarget.value = ''
                }
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                const input = (e.currentTarget as HTMLButtonElement).previousElementSibling as HTMLInputElement
                const val = (input?.value ?? '').trim().toLowerCase().replace(/\s+/g, '-')
                if (val) {
                  updateCharacter({ equipment: [...character.equipment, val] })
                  if (input) input.value = ''
                }
              }}
            >
              Adicionar
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
