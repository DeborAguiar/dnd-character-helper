import { useState, useEffect } from 'react'
import type { ClassLevel } from '../types/api'
import type { LevelUpSnapshot } from '../types/character'
import type { AbilityKey } from '../types/character'
import { getFeature, getClassSpells } from '../services/api'
import type { Feature } from '../types/api'
import styles from './LevelUpBlock.module.css'

const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'FOR',
  dex: 'DES',
  con: 'CON',
  int: 'INT',
  wis: 'SAB',
  cha: 'CAR',
}

interface EstadoAtual {
  level: number
  maxHp: number
  currentHp: number
  abilityScores: Record<AbilityKey, number>
  proficiencyBonus: number
  spellsKnownCount: number
  cantripsKnownCount: number
}

interface LevelUpBlockProps {
  level: number
  classLevelData: ClassLevel
  prevLevelSpellcasting?: ClassLevel['spellcasting']
  hitDie: number
  estadoAtual: EstadoAtual
  onApply: (snap: LevelUpSnapshot) => void
  isApplied?: boolean
  disabled?: boolean
  classIndex: string
  isCustomClass?: boolean
}

export default function LevelUpBlock({
  level,
  classLevelData,
  prevLevelSpellcasting,
  hitDie,
  estadoAtual,
  onApply,
  isApplied,
  disabled = false,
  classIndex,
  isCustomClass = false,
}: LevelUpBlockProps) {
  const [hpGained, setHpGained] = useState(hitDie)
  const [asiSelected, setAsiSelected] = useState<AbilityKey[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [cantripsChosen, setCantripsChosen] = useState<string[]>([])
  const [spellsChosen, setSpellsChosen] = useState<string[]>([])
  const [classSpells, setClassSpells] = useState<{ index: string; name: string; level: number }[]>([])
  const [loading, setLoading] = useState(true)

  const asiTotal = classLevelData.ability_score_bonuses
  const curSpell = classLevelData.spellcasting
  const prevCantrips = prevLevelSpellcasting?.cantrips_known ?? 0
  const prevSpells = prevLevelSpellcasting?.spells_known ?? 0
  const newCantrips = Math.max(0, (curSpell?.cantrips_known ?? 0) - prevCantrips)
  const newSpells = Math.max(0, (curSpell?.spells_known ?? 0) - prevSpells)
  const hasSpellChoice = newCantrips > 0 || newSpells > 0
  const spellChoiceComplete =
    !hasSpellChoice ||
    isCustomClass ||
    (cantripsChosen.length === newCantrips && spellsChosen.length === newSpells)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const feats: Feature[] = []
      for (const ref of classLevelData.features ?? []) {
        try {
          const f = await getFeature(ref.index)
          feats.push(f)
        } catch {
          feats.push({ index: ref.index, name: ref.name, url: ref.url, desc: [] })
        }
      }
      if (!cancelled) setFeatures(feats)
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [classLevelData.features])

  useEffect(() => {
    if (!hasSpellChoice || !classIndex || isCustomClass) {
      setClassSpells([])
      return
    }
    let cancelled = false
    getClassSpells(classIndex).then((res) => {
      if (cancelled) return
      setClassSpells(res.results ?? [])
    }).catch(() => { if (!cancelled) setClassSpells([]) })
    return () => { cancelled = true }
  }, [hasSpellChoice, classIndex, isCustomClass])

  const asiFromSelection =
    asiSelected.length === 1
      ? [{ ability: asiSelected[0], amount: 2 }]
      : asiSelected.length === 2
        ? [
            { ability: asiSelected[0], amount: 1 },
            { ability: asiSelected[1], amount: 1 },
          ]
        : []

  const toggleAsi = (ability: AbilityKey) => {
    setAsiSelected((prev) => {
      if (prev.includes(ability)) return prev.filter((a) => a !== ability)
      if (prev.length >= 2) return prev
      return [...prev, ability]
    })
  }

  const handleApply = () => {
    const conMod = Math.floor((estadoAtual.abilityScores.con - 10) / 2)
    const finalHp = hpGained + (conMod > 0 ? conMod : 0)
    onApply({
      level,
      hpGained: finalHp,
      abilityScoreImprovements: asiFromSelection.length ? asiFromSelection : undefined,
      cantripsKnown: cantripsChosen.length ? cantripsChosen : undefined,
      spellsKnown: spellsChosen.length ? spellsChosen : undefined,
      featuresGranted: (classLevelData.features ?? []).map((f) => f.index),
    })
  }

  return (
    <div className={`${styles.block} ${disabled ? styles.blockDisabled : ''}`}>
      <div className={styles.estadoAtual}>
        <h3>Estado atual (nível {level - 1})</h3>
        <dl>
          <dt>PV máx.</dt>
          <dd>{estadoAtual.maxHp}</dd>
          <dt>Bônus prof.</dt>
          <dd>+{estadoAtual.proficiencyBonus}</dd>
          <dt>Atributos</dt>
          <dd>
            {Object.entries(estadoAtual.abilityScores).map(([k, v]) => (
              <span key={k}>{ABILITY_NAMES[k as AbilityKey]} {v} </span>
            ))}
          </dd>
          {estadoAtual.spellsKnownCount > 0 && (
            <>
              <dt>Magias conhecidas</dt>
              <dd>{estadoAtual.spellsKnownCount}</dd>
            </>
          )}
        </dl>
      </div>

      <div className={styles.arrow}>→</div>

      <div className={styles.tasks}>
        <h3>Nível {level} — o que fazer</h3>
        {isApplied ? (
          <p className={styles.applied}>✓ Aplicado</p>
        ) : disabled ? (
          <p className={styles.locked}>Complete o nível anterior primeiro.</p>
        ) : (
          <>
            <div className={styles.task}>
              <label>
                <strong>1. Dados de vida</strong> — role 1d{hitDie} (ou use valor fixo)
                <input
                  type="number"
                  min={1}
                  max={hitDie}
                  value={hpGained}
                  onChange={(e) => setHpGained(Number(e.target.value) || 1)}
                />
              </label>
              <p className={styles.hint}>
                + modificador de CON ({Math.floor((estadoAtual.abilityScores.con - 10) / 2)}) ={' '}
                {hpGained + Math.floor((estadoAtual.abilityScores.con - 10) / 2)} PV neste nível
              </p>
            </div>

            {asiTotal > 0 && (
              <div className={styles.task}>
                <strong>2. Aumento de atributo (ASI)</strong> — selecione 1 atributo (+2) ou 2 atributos (+1 cada). Pode mudar até aplicar.
                <div className={styles.asi}>
                  {(Object.keys(ABILITY_NAMES) as AbilityKey[]).map((key) => {
                    const selected = asiSelected.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        className={styles.asiChip}
                        data-selected={selected ? 'true' : undefined}
                        style={selected ? { borderColor: '#c9a227', background: '#4a4020', color: '#e8c547', fontWeight: 600 } : undefined}
                        onClick={() => toggleAsi(key)}
                        disabled={!selected && asiSelected.length >= 2}
                      >
                        {ABILITY_NAMES[key]}
                      </button>
                    )
                  })}
                </div>
                {asiFromSelection.length > 0 && (
                  <p>
                    Escolhido: {asiFromSelection.map((a) => `+${a.amount} ${ABILITY_NAMES[a.ability]}`).join(' ')}
                  </p>
                )}
              </div>
            )}

            {!loading && features.length > 0 && (
              <div className={styles.task}>
                <strong>3. Recursos deste nível</strong>
                <ul>
                  {features.map((f) => (
                    <li key={f.index}>
                      <strong>{f.name}</strong>
                      {f.desc?.length ? <p className={styles.featureDesc}>{f.desc[0]}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasSpellChoice && (
              <div className={styles.task}>
                <strong>4. Nova(s) magia(s) conhecida(s)</strong>
                {isCustomClass ? (
                  <p className={styles.hint}>Classe custom: anote as magias no livro ou na ficha.</p>
                ) : (
                  <>
                    {newCantrips > 0 && (
                      <div className={styles.spellGroup}>
                        <p className={styles.hint}>Escolha até {newCantrips} truque(s):</p>
                        <div className={styles.spellList}>
                          {classSpells
                            .filter((s) => s.level === 0)
                            .map((s) => (
                              <label key={s.index} className={styles.spellLabel}>
                                <input
                                  type="checkbox"
                                  checked={cantripsChosen.includes(s.index)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (cantripsChosen.length < newCantrips) setCantripsChosen((prev) => [...prev, s.index])
                                    } else setCantripsChosen((prev) => prev.filter((i) => i !== s.index))
                                  }}
                                />
                                {s.name}
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                    {newSpells > 0 && (
                      <div className={styles.spellGroup}>
                        <p className={styles.hint}>Escolha até {newSpells} magia(s) de 1º nível:</p>
                        <div className={styles.spellList}>
                          {classSpells
                            .filter((s) => s.level === 1)
                            .map((s) => (
                              <label key={s.index} className={styles.spellLabel}>
                                <input
                                  type="checkbox"
                                  checked={spellsChosen.includes(s.index)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (spellsChosen.length < newSpells) setSpellsChosen((prev) => [...prev, s.index])
                                    } else setSpellsChosen((prev) => prev.filter((i) => i !== s.index))
                                  }}
                                />
                                {s.name}
                              </label>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {hasSpellChoice && !spellChoiceComplete && (
                <p className={styles.hint}>Escolha as magias acima antes de aplicar.</p>
              )}
            <button
              type="button"
              onClick={handleApply}
              className={styles.applyBtn}
              disabled={hasSpellChoice && !spellChoiceComplete}
            >
              Aplicar nível {level}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
