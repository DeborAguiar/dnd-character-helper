import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SHOW_CUSTOM_CLASSES } from '../config'
import { useCharacter } from '../context/CharacterContext'
import { api, getClass, getRace, getSkill, getEquipmentCategory, getClassSpells, getByPath } from '../services/api'
import type { DndClass, Race } from '../types/api'
import type { AbilityKey } from '../types/character'
import { STANDARD_ABILITY_ARRAY } from '../types/character'
import styles from './CharacterCreate.module.css'

/** Uma opção de equipamento: lista fixa, escolha de categoria, ou ambos. */
type EquipmentOption =
  | { type: 'items'; label: string; itemIds: string[] }
  | { type: 'category'; label: string; categoryIndex: string; choose: number; itemIds?: string[] }
  | { type: 'itemsAndCategory'; label: string; itemIds: string[]; categoryIndex: string; choose: number }

/** Grupo de escolha da classe: "escolha 1 entre estas opções". */
interface EquipmentChoiceGroup {
  desc: string
  choose: number
  options: EquipmentOption[]
}

/** Converte opção bruta da API em lista de itemIds (índice repetido por quantidade). */
function parseEquipmentOption(
  opt: {
    option_type?: string
    count?: number
    of?: { index: string; name: string }
    items?: unknown[]
    choice?: { choose?: number; from?: { equipment_category?: { index: string; name: string } } }
  }
): EquipmentOption | null {
  if (!opt) return null
  if (opt.option_type === 'counted_reference' && opt.of) {
    const count = Math.max(1, opt.count ?? 1)
    const itemIds = Array(count).fill(opt.of.index) as string[]
    return { type: 'items', label: `${opt.of.name}${count > 1 ? ` (${count})` : ''}`, itemIds }
  }
  if (opt.option_type === 'multiple' && Array.isArray(opt.items)) {
    const allIds: string[] = []
    const labels: string[] = []
    let categoryPart: { categoryIndex: string; choose: number } | null = null
    for (const sub of opt.items) {
      const parsed = parseEquipmentOption(sub as Parameters<typeof parseEquipmentOption>[0])
      if (!parsed) continue
      if (parsed.type === 'items') {
        allIds.push(...parsed.itemIds)
        labels.push(parsed.label)
      } else if (parsed.type === 'category') {
        categoryPart = { categoryIndex: parsed.categoryIndex, choose: parsed.choose }
        labels.push(parsed.label)
      }
    }
    if (categoryPart && allIds.length) {
      return { type: 'itemsAndCategory', label: labels.join(' + '), itemIds: allIds, categoryIndex: categoryPart.categoryIndex, choose: categoryPart.choose }
    }
    if (categoryPart) return { type: 'category', label: labels.join(', '), categoryIndex: categoryPart.categoryIndex, choose: categoryPart.choose }
    if (allIds.length) return { type: 'items', label: labels.join(', '), itemIds: allIds }
    return null
  }
  if (opt.option_type === 'choice' && opt.choice?.from?.equipment_category) {
    const cat = opt.choice.from.equipment_category
    return {
      type: 'category',
      label: cat.name,
      categoryIndex: cat.index,
      choose: opt.choice.choose ?? 1,
    }
  }
  return null
}

/** Monta grupos de escolha de equipamento a partir da classe (API). */
function buildEquipmentChoiceGroups(classDetail: DndClass | null): EquipmentChoiceGroup[] {
  if (!classDetail?.starting_equipment_options) return []
  const groups: EquipmentChoiceGroup[] = []
  for (const group of classDetail.starting_equipment_options as { desc: string; choose: number; from?: { options?: unknown[] } }[]) {
    const options = (group.from?.options ?? [])
      .map((o) => parseEquipmentOption(o as Parameters<typeof parseEquipmentOption>[0]))
      .filter((o): o is EquipmentOption => o != null)
    if (options.length) groups.push({ desc: group.desc, choose: group.choose ?? 1, options })
  }
  return groups
}

/** Agrupa uma escolha de perícias: "escolha N entre estas". */
interface SkillChoiceGroup {
  choose: number
  options: { index: string; name: string }[]
}

function skillLabelFromIndex(index: string): string {
  return index
    .replace(/^skill-/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'Força',
  dex: 'Destreza',
  con: 'Constituição',
  int: 'Inteligência',
  wis: 'Sabedoria',
  cha: 'Carisma',
}

type Step = 'basics' | 'race' | 'class' | 'abilities' | 'skills' | 'equipment' | 'spells' | 'done'

export default function CharacterCreate() {
  const navigate = useNavigate()
  const { character, updateCharacter, getCustomClass, customClasses } = useCharacter()
  const [step, setStep] = useState<Step>('basics')
  const [races, setRaces] = useState<{ index: string; name: string }[]>([])
  const [classes, setClasses] = useState<{ index: string; name: string; type: 'api' | 'custom' }[]>([])
  const [loading, setLoading] = useState(true)
  const [raceDetail, setRaceDetail] = useState<Race | null>(null)
  const [classDetail, setClassDetail] = useState<DndClass | null>(null)
  const [skillDescriptions, setSkillDescriptions] = useState<Record<string, string>>({})
  const [hoveredSkillIndex, setHoveredSkillIndex] = useState<string | null>(null)
  const [equipmentChoiceByGroup, setEquipmentChoiceByGroup] = useState<Record<number, number>>({})
  const [equipmentCategoryPicks, setEquipmentCategoryPicks] = useState<Record<number, string[]>>({})
  const [categoryOptions, setCategoryOptions] = useState<Record<string, { index: string; name: string }[]>>({})
  const [classSpells, setClassSpells] = useState<{ index: string; name: string; level: number }[]>([])
  const [classLevel1, setClassLevel1] = useState<{ cantrips_known?: number; spells_known?: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rRes, cRes] = await Promise.all([api.races(), api.classes()])
        if (!cancelled) {
          setRaces(rRes.results)
          setClasses([
            ...cRes.results.map((x) => ({ ...x, type: 'api' as const })),
            ...(SHOW_CUSTOM_CLASSES ? customClasses.map((x) => ({ index: x.id, name: x.name, type: 'custom' as const })) : []),
          ])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [customClasses.length, SHOW_CUSTOM_CLASSES])

  useEffect(() => {
    if (!character.race?.index) {
      setRaceDetail(null)
      return
    }
    let cancelled = false
    getRace(character.race.index).then((r) => { if (!cancelled) setRaceDetail(r) })
    return () => { cancelled = true }
  }, [character.race?.index])

  useEffect(() => {
    if (!character.class?.index) {
      setClassDetail(null)
      return
    }
    const custom = getCustomClass(character.class.index)
    if (custom) {
      setClassDetail(null)
      return
    }
    let cancelled = false
    getClass(character.class.index).then((c) => { if (!cancelled) setClassDetail(c) })
    return () => { cancelled = true }
  }, [character.class?.index, getCustomClass])

  /** Carrega descrições das perícias quando está no passo de skills (índice da API = sem prefixo "skill-"). */
  useEffect(() => {
    if (step !== 'skills') return
    const allIndices = new Set<string>()
    if (classDetail?.proficiency_choices) {
      for (const pc of classDetail.proficiency_choices) {
        for (const o of pc.from?.options ?? []) {
          const item = o.item as { index?: string } | undefined
          if (item?.index?.startsWith('skill-')) allIndices.add(item.index)
        }
      }
    }
    const custom = character.class ? getCustomClass(character.class.index) : null
    if (custom?.proficiencyChoices) {
      for (const pc of custom.proficiencyChoices) {
        for (const index of pc.options) {
          if (index.startsWith('skill-')) allIndices.add(index)
        }
      }
    }
    if (allIndices.size === 0) return
    let cancelled = false
    const load = async () => {
      const next: Record<string, string> = {}
      for (const profIndex of allIndices) {
        if (cancelled) return
        const skillIndex = profIndex.replace(/^skill-/, '')
        try {
          const data = await getSkill(skillIndex)
          if (!cancelled && data.desc?.length) next[profIndex] = data.desc.join('\n\n')
        } catch {
          // ignora
        }
      }
      if (!cancelled) setSkillDescriptions((prev) => ({ ...prev, ...next }))
    }
    load()
    return () => { cancelled = true }
  }, [step, character.class?.index, classDetail, getCustomClass])

  const appliedScores = { ...character.abilityScores }
  const raceBonuses = raceDetail?.ability_bonuses ?? []
  for (const b of raceBonuses) {
    const key = b.ability_score.index as AbilityKey
    if (key in appliedScores) appliedScores[key] += b.bonus
  }

  /** Perícias fixas da classe (ex.: nenhuma para a maioria; algumas classes têm fixas). */
  const fixedSkillProficiencies = ((): string[] => {
    if (classDetail) {
      return (classDetail.proficiencies ?? [])
        .filter((p) => p.index.startsWith('skill-'))
        .map((p) => p.index)
    }
    return []
  })()

  /** Grupos de escolha de perícias conforme a classe. */
  const skillChoiceGroups = ((): SkillChoiceGroup[] => {
    if (classDetail?.proficiency_choices) {
      return classDetail.proficiency_choices
        .map((pc) => {
          const rawOptions = (pc.from?.options ?? [])
            .map((o) => o.item)
            .filter((item) => item != null && 'index' in item && String((item as { index: string }).index).startsWith('skill-')) as { index: string; name?: string }[]
          const options = rawOptions.map((item) => ({ index: item.index, name: (item.name ?? '').replace(/^Skill: /i, '').trim() || skillLabelFromIndex(item.index) }))
          if (options.length === 0) return null
          return { choose: pc.choose, options }
        })
        .filter((g): g is SkillChoiceGroup => g != null)
    }
    const custom = character.class ? getCustomClass(character.class.index) : null
    if (custom?.proficiencyChoices) {
      return custom.proficiencyChoices
        .filter((pc) => pc.options.length > 0)
        .map((pc) => ({
          choose: pc.choose,
          options: pc.options.map((index) => ({ index, name: skillLabelFromIndex(index) })),
        }))
    }
    return []
  })()

  const equipmentChoiceGroups = buildEquipmentChoiceGroups(classDetail)

  /** Classe ou raça tem magia? (só checamos classe por enquanto; raça pode ser trait com spell.) */
  const hasSpellcasting =
    (classDetail != null && ('spellcasting' in classDetail || 'spells' in classDetail)) ||
    (character.class?.type === 'custom' && character.class?.index && (() => {
      const c = getCustomClass(character.class.index)
      return c?.spellcastingByLevel === 1
    })())

  useEffect(() => {
    if (!hasSpellcasting || step !== 'spells' || !character.class?.index) return
    if (character.class.type === 'custom') return
    let cancelled = false
    Promise.all([
      getClassSpells(character.class.index),
      getByPath<{ spellcasting?: { cantrips_known?: number; spells_known?: number } }>(`/api/classes/${character.class.index}/levels/1`),
    ]).then(([spellsRes, level1]) => {
      if (!cancelled) {
        setClassSpells(spellsRes.results ?? [])
        setClassLevel1(level1?.spellcasting ?? null)
      }
    }).catch(() => { if (!cancelled) setClassLevel1(null) })
    return () => { cancelled = true }
  }, [hasSpellcasting, step, character.class?.index, character.class?.type])

  /** Equipamento fixo da classe (starting_equipment) + escolhas do jogador. */
  const fixedStartingEquipment = ((): string[] => {
    if (!classDetail?.starting_equipment) return []
    const raw = classDetail.starting_equipment as { index?: string; quantity?: number; equipment?: { index: string } }[]
    const out: string[] = []
    for (const e of raw) {
      const index = e.index ?? e.equipment?.index
      if (!index) continue
      const q = Math.max(1, e.quantity ?? 1)
      for (let i = 0; i < q; i++) out.push(index)
    }
    return out
  })()

  useEffect(() => {
    if (step !== 'equipment' || equipmentChoiceGroups.length === 0) return
    const categories = new Set<string>()
    for (const g of equipmentChoiceGroups) {
      for (const opt of g.options) {
        if (opt.type === 'category') categories.add(opt.categoryIndex)
      }
    }
    let cancelled = false
    for (const catIndex of categories) {
      if (categoryOptions[catIndex]) continue
      getEquipmentCategory(catIndex).then((data) => {
        if (!cancelled && data.equipment)
          setCategoryOptions((prev) => ({ ...prev, [catIndex]: data.equipment }))
      })
    }
    return () => { cancelled = true }
  }, [step, equipmentChoiceGroups])

  const applyEquipmentChoices = (): string[] => {
    const out = [...fixedStartingEquipment]
    for (let gi = 0; gi < equipmentChoiceGroups.length; gi++) {
      const group = equipmentChoiceGroups[gi]
      const optIdx = equipmentChoiceByGroup[gi]
      if (optIdx == null) continue
      const opt = group.options[optIdx]
      if (!opt) continue
      if (opt.type === 'items') out.push(...opt.itemIds)
      else if (opt.type === 'category' && equipmentCategoryPicks[gi]?.length) out.push(...equipmentCategoryPicks[gi])
      else if (opt.type === 'itemsAndCategory') {
        out.push(...opt.itemIds)
        if (equipmentCategoryPicks[gi]?.length) out.push(...equipmentCategoryPicks[gi])
      }
    }
    return out
  }

  const toggleSkillInGroup = (groupIndex: number, skillIndex: string) => {
    const group = skillChoiceGroups[groupIndex]
    if (!group) return
    const currentInGroup = character.skills.filter((s) => group.options.some((o) => o.index === s))
    const isSelected = currentInGroup.includes(skillIndex)
    let newInGroup: string[]
    if (isSelected) {
      newInGroup = currentInGroup.filter((s) => s !== skillIndex)
    } else {
      if (currentInGroup.length >= group.choose) return
      newInGroup = [...currentInGroup, skillIndex]
    }
    const otherGroupsSkills = skillChoiceGroups
      .map((g, i) => (i === groupIndex ? [] : character.skills.filter((s) => g.options.some((o) => o.index === s))))
      .flat()
    updateCharacter({ skills: [...fixedSkillProficiencies, ...otherGroupsSkills, ...newInGroup] })
  }

  /** Troca o valor de um atributo por um do array padrão; o que tinha esse valor recebe o anterior (sem repetir). */
  const assignAbility = (ability: AbilityKey, newValue: number) => {
    const current = character.abilityScores
    const oldValue = current[ability]
    if (oldValue === newValue) return
    const swapped = { ...current, [ability]: newValue }
    const otherKey = (ABILITY_KEYS.find((k) => k !== ability && current[k] === newValue)) as AbilityKey | undefined
    if (otherKey != null) swapped[otherKey] = oldValue
    updateCharacter({ abilityScores: swapped })
  }

  const handleFinish = () => {
    const cls = character.class
    let hitDie = 8
    let maxHp = 0
    if (classDetail) {
      hitDie = classDetail.hit_die
      maxHp = hitDie + (character.abilityScores.con >= 10 ? Math.floor((character.abilityScores.con - 10) / 2) : 0)
    }
    const custom = cls ? getCustomClass(cls.index) : null
    if (custom) {
      hitDie = custom.hitDie
      maxHp = hitDie + (character.abilityScores.con >= 10 ? Math.floor((character.abilityScores.con - 10) / 2) : 0)
    }
    updateCharacter({
      abilityScores: character.abilityScores,
      maxHp,
      currentHp: maxHp,
      hitDice: `1d${hitDie}`,
      hitDiceUsed: 0,
      proficiencyBonus: 2,
      equipment: applyEquipmentChoices(),
    })
    setStep('done')
    navigate('/sheet')
  }

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>
  }

  const steps: Step[] = hasSpellcasting
    ? ['basics', 'race', 'class', 'abilities', 'skills', 'equipment', 'spells', 'done']
    : ['basics', 'race', 'class', 'abilities', 'skills', 'equipment', 'done']
  const stepIndex = steps.indexOf(step)

  const cantripsToChoose = classLevel1?.cantrips_known ?? 0
  const spellsToChoose =
    (classLevel1?.spells_known ?? 0) ||
    (character.class?.index === 'wizard' ? 6 : 0)
  const cantripList = classSpells.filter((s) => s.level === 0)
  const level1SpellList = classSpells.filter((s) => s.level === 1)

  return (
    <div className={styles.page}>
      <h1>Criar personagem</h1>
      <div className={styles.progress}>
        {steps.slice(0, -1).map((s, i) => (
          <button
            key={s}
            type="button"
            className={i <= stepIndex ? styles.progActive : undefined}
            onClick={() => setStep(s)}
          >
            {s === 'basics' && 'Dados'}
            {s === 'race' && 'Raça'}
            {s === 'class' && 'Classe'}
            {s === 'abilities' && 'Atributos'}
            {s === 'skills' && 'Perícias'}
            {s === 'equipment' && 'Equipamento'}
            {s === 'spells' && 'Magias'}
          </button>
        ))}
      </div>

      {step === 'basics' && (
        <section className={styles.section}>
          <h2>Nome e jogador</h2>
          <label>
            Nome do personagem
            <input
              value={character.name}
              onChange={(e) => updateCharacter({ name: e.target.value })}
              placeholder="Ex: Aragorn"
            />
          </label>
          <label>
            Nome do jogador
            <input
              value={character.playerName}
              onChange={(e) => updateCharacter({ playerName: e.target.value })}
              placeholder="Seu nome"
            />
          </label>
          <button type="button" onClick={() => setStep('race')} className={styles.next}>
            Próximo →
          </button>
        </section>
      )}

      {step === 'race' && (
        <section className={styles.section}>
          <h2>Raça</h2>
          <div className={styles.grid}>
            {races.map((r) => (
              <button
                key={r.index}
                type="button"
                className={character.race?.index === r.index ? styles.selected : undefined}
                onClick={() => updateCharacter({ race: { index: r.index, name: r.name } })}
              >
                {r.name}
              </button>
            ))}
          </div>
          {raceDetail && (
            <div className={styles.detail}>
              <p>{raceDetail.size_description}</p>
              <p>Deslocamento: {raceDetail.speed} m.</p>
            </div>
          )}
          <div className={styles.row}>
            <button type="button" onClick={() => setStep('basics')}>← Voltar</button>
            <button type="button" onClick={() => setStep('class')} className={styles.next}>Próximo →</button>
          </div>
        </section>
      )}

      {step === 'class' && (
        <section className={styles.section}>
          <h2>Classe</h2>
          <div className={styles.grid}>
            {classes.map((c) => (
              <button
                key={c.index}
                type="button"
                className={character.class?.index === c.index ? styles.selected : undefined}
                onClick={() =>
                  updateCharacter({
                    class: { type: c.type, index: c.index, name: c.name },
                    subclass: null,
                  })
                }
              >
                {c.name}
                {c.type === 'custom' && ' (custom)'}
              </button>
            ))}
          </div>
          {classDetail && (
            <div className={styles.detail}>
              <p>Dado de vida: d{classDetail.hit_die}</p>
            </div>
          )}
          <div className={styles.row}>
            <button type="button" onClick={() => setStep('race')}>← Voltar</button>
            <button type="button" onClick={() => setStep('abilities')} className={styles.next}>Próximo →</button>
          </div>
        </section>
      )}

      {step === 'abilities' && (
        <section className={styles.section}>
          <h2>Atributos — array padrão (15, 14, 13, 12, 10, 8)</h2>
          <p className={styles.hint}>
            Atribua cada valor a um atributo; nenhum valor pode repetir.
          </p>
          <div className={styles.abilities}>
            {ABILITY_KEYS.map((key) => (
              <label key={key}>
                {ABILITY_NAMES[key]}
                <select
                  value={character.abilityScores[key]}
                  onChange={(e) => assignAbility(key, Number(e.target.value))}
                >
                  {STANDARD_ABILITY_ARRAY.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
                {raceDetail?.ability_bonuses?.find((b) => b.ability_score.index === key) && (
                  <span className={styles.bonus}>
                    +{raceDetail.ability_bonuses.find((b) => b.ability_score.index === key)?.bonus} (raça) ={' '}
                    {appliedScores[key]}
                  </span>
                )}
              </label>
            ))}
          </div>
          <div className={styles.row}>
            <button type="button" onClick={() => setStep('class')}>← Voltar</button>
            <button type="button" onClick={() => setStep('skills')} className={styles.next}>Próximo →</button>
          </div>
        </section>
      )}

      {step === 'skills' && (
        <section className={styles.section}>
          <h2>Perícias</h2>
          <p className={styles.hint}>
            Escolha as perícias conforme a classe <strong>{character.class?.name}</strong>. Cada grupo: escolha exatamente o número indicado.
          </p>
          {skillChoiceGroups.length === 0 ? (
            <p className={styles.muted}>
              Esta classe não tem escolhas de perícias na API ou ainda não foram definidas (classe custom).
            </p>
          ) : (
            <div className={styles.skillGroups}>
              {skillChoiceGroups.map((group, gi) => {
                const selected = character.skills.filter((s) => group.options.some((o) => o.index === s))
                return (
                  <div key={gi} className={styles.skillGroup}>
                    <h3>Escolha {group.choose} entre:</h3>
                    <div className={styles.skillOptions}>
                      {group.options.map((opt) => {
                        const checked = selected.includes(opt.index)
                        const desc = skillDescriptions[opt.index]
                        return (
                          <label
                            key={opt.index}
                            className={styles.skillOption}
                            onMouseEnter={() => setHoveredSkillIndex(opt.index)}
                            onMouseLeave={() => setHoveredSkillIndex(null)}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSkillInGroup(gi, opt.index)}
                              disabled={!checked && selected.length >= group.choose}
                            />
                            <span className={styles.skillOptionLabel}>
                              {opt.name}
                              {desc && hoveredSkillIndex === opt.index && (
                                <span className={styles.skillTooltip} role="tooltip">
                                  {desc}
                                </span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <p className={styles.skillCount}>
                      {selected.length} / {group.choose} escolhidas
                    </p>
                  </div>
                )
              })}
            </div>
          )}
          {fixedSkillProficiencies.length > 0 && (
            <p className={styles.hint}>
              Perícias fixas da classe: {fixedSkillProficiencies.map((s) => skillLabelFromIndex(s)).join(', ')}
            </p>
          )}
          <div className={styles.row}>
            <button type="button" onClick={() => setStep('abilities')}>← Voltar</button>
            <button type="button" onClick={() => setStep('equipment')} className={styles.next}>Próximo →</button>
          </div>
        </section>
      )}

      {step === 'equipment' && (
        <section className={styles.section}>
          <h2>Equipamento inicial</h2>
          <p className={styles.hint}>
            Escolha uma opção em cada grupo conforme a classe <strong>{character.class?.name}</strong>. Depois você pode editar o inventário na ficha.
          </p>
          {equipmentChoiceGroups.length === 0 ? (
            <p className={styles.muted}>
              Esta classe não tem opções de equipamento inicial na API. Você pode adicionar itens na ficha depois.
            </p>
          ) : (
            <div className={styles.equipmentGroups}>
              {equipmentChoiceGroups.map((group, gi) => {
                const selectedOptIdx = equipmentChoiceByGroup[gi]
                const selectedOpt = selectedOptIdx != null ? group.options[selectedOptIdx] : undefined
                const isCategory = selectedOpt?.type === 'category' || selectedOpt?.type === 'itemsAndCategory'
                const catIndex = selectedOpt?.type === 'category' ? selectedOpt.categoryIndex : selectedOpt?.type === 'itemsAndCategory' ? selectedOpt.categoryIndex : ''
                const catChoose = selectedOpt?.type === 'category' ? selectedOpt.choose : selectedOpt?.type === 'itemsAndCategory' ? selectedOpt.choose : 1
                const catList = catIndex ? categoryOptions[catIndex] ?? [] : []
                const picks = equipmentCategoryPicks[gi] ?? []
                return (
                  <div key={gi} className={styles.equipmentGroup}>
                    <h3>{group.desc}</h3>
                    <div className={styles.equipmentOptions}>
                      {group.options.map((opt, oi) => {
                        if (opt.type === 'items') {
                          return (
                            <button
                              key={oi}
                              type="button"
                              className={selectedOptIdx === oi ? styles.selected : undefined}
                              onClick={() => {
                                setEquipmentChoiceByGroup((prev) => ({ ...prev, [gi]: oi }))
                                setEquipmentCategoryPicks((prev) => {
                                  const next = { ...prev }
                                  delete next[gi]
                                  return next
                                })
                              }}
                            >
                              {opt.label}
                            </button>
                          )
                        }
                        return (
                          <button
                            key={oi}
                            type="button"
                            className={selectedOptIdx === oi ? styles.selected : undefined}
                            onClick={() => setEquipmentChoiceByGroup((prev) => ({ ...prev, [gi]: oi }))}
                          >
                            {opt.label} (escolher abaixo)
                          </button>
                        )
                      })}
                    </div>
                    {isCategory && catList.length > 0 && (
                      <div className={styles.categoryPick}>
                        <label>
                          Escolha {catChoose} {catChoose === 1 ? 'item' : 'itens'}:
                          {catChoose === 1 ? (
                            <select
                              value={picks[0] ?? ''}
                              onChange={(e) =>
                                setEquipmentCategoryPicks((prev) => ({
                                  ...prev,
                                  [gi]: e.target.value ? [e.target.value] : [],
                                }))
                              }
                            >
                              <option value="">—</option>
                              {catList.map((eq) => (
                                <option key={eq.index} value={eq.index}>
                                  {eq.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={styles.multiPick}>
                              {catList.map((eq) => {
                                const idx = picks.indexOf(eq.index)
                                const checked = idx >= 0
                                return (
                                  <label key={eq.index} className={styles.checkLabel}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        setEquipmentCategoryPicks((prev) => {
                                          const curr = prev[gi] ?? []
                                          if (checked) {
                                            const next = curr.filter((x) => x !== eq.index)
                                            return next.length ? { ...prev, [gi]: next } : (() => { const p = { ...prev }; delete p[gi]; return p })()
                                          }
                                          if (curr.length >= catChoose) return prev
                                          return { ...prev, [gi]: [...curr, eq.index] }
                                        })
                                      }}
                                    />
                                    {eq.name}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div className={styles.row}>
            <button type="button" onClick={() => setStep('skills')}>← Voltar</button>
            {hasSpellcasting ? (
              <button type="button" onClick={() => setStep('spells')} className={styles.next}>
                Próximo →
              </button>
            ) : (
              <button type="button" onClick={handleFinish} className={styles.next}>
                Finalizar criação
              </button>
            )}
          </div>
        </section>
      )}

      {step === 'spells' && (
        <section className={styles.section}>
          <h2>Magias iniciais</h2>
          <p className={styles.hint}>
            Escolha os truques e as magias de 1º nível conforme a classe <strong>{character.class?.name}</strong>.
          </p>
          {cantripsToChoose > 0 && cantripList.length > 0 && (
            <div className={styles.skillGroup}>
              <h3>Truques (cantrips) — escolha {cantripsToChoose}</h3>
              <div className={styles.skillOptions}>
                {cantripList.map((sp) => {
                  const selected = character.cantripsKnown.includes(sp.index)
                  return (
                    <label key={sp.index} className={styles.skillOption}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const next = selected
                            ? character.cantripsKnown.filter((x) => x !== sp.index)
                            : character.cantripsKnown.length < cantripsToChoose
                              ? [...character.cantripsKnown, sp.index]
                              : character.cantripsKnown
                          updateCharacter({ cantripsKnown: next })
                        }}
                        disabled={!selected && character.cantripsKnown.length >= cantripsToChoose}
                      />
                      <span>{sp.name}</span>
                    </label>
                  )
                })}
              </div>
              <p className={styles.skillCount}>
                {character.cantripsKnown.length} / {cantripsToChoose} escolhidos
              </p>
            </div>
          )}
          {spellsToChoose > 0 && level1SpellList.length > 0 && (
            <div className={styles.skillGroup}>
              <h3>Magias de 1º nível — escolha {spellsToChoose}</h3>
              <div className={styles.skillOptions}>
                {level1SpellList.map((sp) => {
                  const selected = character.spellsKnown.includes(sp.index)
                  return (
                    <label key={sp.index} className={styles.skillOption}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const next = selected
                            ? character.spellsKnown.filter((x) => x !== sp.index)
                            : character.spellsKnown.length < spellsToChoose
                              ? [...character.spellsKnown, sp.index]
                              : character.spellsKnown
                          updateCharacter({ spellsKnown: next })
                        }}
                        disabled={!selected && character.spellsKnown.length >= spellsToChoose}
                      />
                      <span>{sp.name}</span>
                    </label>
                  )
                })}
              </div>
              <p className={styles.skillCount}>
                {character.spellsKnown.length} / {spellsToChoose} escolhidas
              </p>
            </div>
          )}
          {cantripsToChoose === 0 && spellsToChoose === 0 && (
            <p className={styles.muted}>
              Esta classe prepara magias da lista completa (ex.: clérigo). Escolha truques acima se houver; as de 1º nível são preparadas na ficha.
            </p>
          )}
          <div className={styles.row}>
            <button type="button" onClick={() => setStep('equipment')}>← Voltar</button>
            <button type="button" onClick={handleFinish} className={styles.next}>
              Finalizar criação
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
