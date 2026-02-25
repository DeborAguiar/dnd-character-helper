import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCharacter } from '../context/CharacterContext'
import { getClassLevels, getClass } from '../services/api'
import type { ClassLevel } from '../types/api'
import type { LevelUpSnapshot } from '../types/character'
import { createDemoCharacter } from '../types/character'
import LevelUpBlock from '../components/LevelUpBlock'
import ErrorBoundary from '../components/ErrorBoundary'
import styles from './LevelUp.module.css'

function levelMatches(l: ClassLevel & { level?: unknown }, levelNum: number): boolean {
  const n = l?.level
  return n === levelNum || Number(n) === levelNum
}

export default function LevelUp() {
  const navigate = useNavigate()
  const { character, applyLevelUp, getCustomClass, loadCharacter } = useCharacter()
  const [targetLevel, setTargetLevel] = useState(character.level + 1)
  const [levelsData, setLevelsData] = useState<ClassLevel[]>([])
  const [hitDie, setHitDie] = useState(8)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  const classIndex = character.class?.index
  const isCustom = character.class?.type === 'custom'
  const customClass = classIndex ? getCustomClass(classIndex) : null

  useEffect(() => {
    if (!classIndex) {
      setLevelsData([])
      setLoading(false)
      return
    }
    if (isCustom && customClass) {
      const fakeLevels: ClassLevel[] = customClass.levels.map((l) => ({
        level: l.level,
        ability_score_bonuses: l.abilityScoreBonuses,
        prof_bonus: l.profBonus,
        features: l.featureIds.map((id) => {
          const f = customClass.features.find((x) => x.id === id)
          return { index: id, name: f?.name ?? id, url: '' }
        }),
        class_specific: {},
        index: `custom-${l.level}`,
        class: { index: customClass.id, name: customClass.name, url: '' },
        url: '',
      }))
      setLevelsData(fakeLevels)
      setHitDie(customClass.hitDie)
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getClass(classIndex), getClassLevels(classIndex)])
      .then(([cls, levels]) => {
        if (!cancelled) {
          setHitDie(cls?.hit_die ?? 8)
          const raw: ClassLevel[] = Array.isArray(levels)
            ? levels
            : (levels && typeof levels === 'object' ? Object.values(levels) as ClassLevel[] : [])
          const list = raw.slice().sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0))
          setLevelsData(list)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Erro ao carregar classe')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [classIndex, isCustom, customClass?.id])

  const currentLevel = character.level
  const levelRange = Array.from(
    { length: Math.max(0, targetLevel - currentLevel) },
    (_, i) => currentLevel + i + 1
  )

  const handleApply = (snap: LevelUpSnapshot) => {
    applyLevelUp(snap)
    if (snap.level === targetLevel) {
      navigate('/sheet')
    }
  }

  if (!character.class) {
    return (
      <div className={styles.page}>
        <h1>Subir de nível</h1>
        <p className={styles.muted}>Crie um personagem e escolha uma classe primeiro.</p>
        <p className={styles.hint}>
          Ou carregue um personagem de teste (Mago nível 1 com magias) para experimentar:
        </p>
        <button
          type="button"
          className={styles.demoBtn}
          onClick={() => {
            try {
              loadCharacter(createDemoCharacter())
            } catch (e) {
              console.error('Erro ao carregar personagem de teste:', e)
              setError(e instanceof Error ? e.message : 'Erro ao carregar personagem de teste')
            }
          }}
        >
          Carregar personagem de teste
        </button>
      </div>
    )
  }

  // Ao ter classe mas ainda sem dados (ex.: acabou de carregar o personagem de teste), mostrar loading
  const hasLevelsData = levelsData.length > 0
  if (loading || (classIndex && !isCustom && !hasLevelsData)) {
    return <div className={styles.loading}>Carregando dados da classe...</div>
  }

  if (error) {
    return <div className={styles.error}>{error}</div>
  }

  return (
    <div className={styles.page}>
      <h1>Subir de nível</h1>
      <p className={styles.subtitle}>
        {character.name && `${character.name} — `}
        {character.class.name} nível {currentLevel}
      </p>

      <div className={styles.controls}>
        <label>
          Subir até o nível
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(Number(e.target.value))}
          >
            {Array.from({ length: 21 - currentLevel }, (_, i) => currentLevel + i).map(
              (n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              )
            )}
          </select>
        </label>
      </div>

      <ErrorBoundary>
      {levelRange.length === 0 ? (
        <p className={styles.muted}>Selecione um nível maior que o atual.</p>
      ) : (
        <>
          <p className={styles.levelsHint}>
            Nível {currentLevel} (atual) → {levelRange.map((n) => `Nível ${n}`).join(' → ')}
          </p>
          <div className={styles.levelsRow} ref={carouselRef}>
            {levelRange.map((levelNum, idx) => {
              const classLevelData = levelsData.find((l) => levelMatches(l, levelNum))
              const prevLevelData = levelsData.find((l) => levelMatches(l, levelNum - 1))
              const isApplied = character.levelUpHistory.some((h) => h.level === levelNum)
              const isLocked = levelNum > character.level + 1

              const estadoAtual = {
                level: levelNum - 1,
                maxHp: character.maxHp,
                currentHp: character.currentHp,
                abilityScores: character.abilityScores,
                proficiencyBonus: character.proficiencyBonus,
                spellsKnownCount: character.spellsKnown?.length ?? 0,
                cantripsKnownCount: character.cantripsKnown?.length ?? 0,
              }

              return (
                <Fragment key={levelNum}>
                  {idx > 0 && <div className={styles.arrowBetween} aria-hidden>→</div>}
                  <div className={styles.levelCard}>
                    {!classLevelData ? (
                      <div className={styles.slidePlaceholder}>
                        Nível {levelNum} — dados não encontrados
                      </div>
                    ) : (
                      <>
                        {isLocked && (
                          <div className={styles.lockedOverlay}>
                            Complete o nível {levelNum - 1} primeiro
                          </div>
                        )}
                        <LevelUpBlock
                          level={levelNum}
                          classLevelData={classLevelData}
                          prevLevelSpellcasting={prevLevelData?.spellcasting}
                          hitDie={hitDie}
                          estadoAtual={estadoAtual}
                          onApply={handleApply}
                          isApplied={isApplied}
                          disabled={isLocked}
                          classIndex={character.class?.index ?? ''}
                          isCustomClass={character.class?.type === 'custom'}
                        />
                      </>
                    )}
                  </div>
                </Fragment>
              )
            })}
          </div>
        </>
      )}
      </ErrorBoundary>
    </div>
  )
}
