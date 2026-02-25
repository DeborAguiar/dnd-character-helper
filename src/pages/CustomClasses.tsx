import { useState } from 'react'
import { useCharacter } from '../context/CharacterContext'
import type { CustomClass } from '../types/customClass'
import { createBlankCustomClass } from '../types/customClass'
import styles from './CustomClasses.module.css'

export default function CustomClasses() {
  const { customClasses, saveCustomClass, deleteCustomClass } = useCharacter()
  const [editing, setEditing] = useState<CustomClass | null>(null)
  const [showForm, setShowForm] = useState(false)

  const startNew = () => {
    setEditing(createBlankCustomClass())
    setShowForm(true)
  }

  const startEdit = (c: CustomClass) => {
    setEditing({ ...c })
    setShowForm(true)
  }

  const save = () => {
    if (!editing) return
    const updated = { ...editing, updatedAt: new Date().toISOString() }
    saveCustomClass(updated)
    setEditing(null)
    setShowForm(false)
  }

  const remove = (id: string) => {
    if (confirm('Excluir esta classe?')) deleteCustomClass(id)
  }

  return (
    <div className={styles.page}>
      <h1>Classes customizadas</h1>
      <p className={styles.subtitle}>
        Crie classes caseiras e defina a progressão nível a nível. Depois use na criação de
        personagem.
      </p>

      <button type="button" onClick={startNew} className={styles.newBtn}>
        + Nova classe
      </button>

      <ul className={styles.list}>
        {customClasses.map((c) => (
          <li key={c.id} className={styles.item}>
            <div>
              <strong>{c.name || '(Sem nome)'}</strong>
              <span className={styles.meta}>d{c.hitDie}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" onClick={() => startEdit(c)}>
                Editar
              </button>
              <button type="button" onClick={() => remove(c.id)} className={styles.danger}>
                Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>

      {customClasses.length === 0 && !showForm && (
        <p className={styles.muted}>Nenhuma classe customizada. Clique em &quot;Nova classe&quot;.</p>
      )}

      {showForm && editing && (
        <CustomClassForm
          customClass={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => { setEditing(null); setShowForm(false) }}
        />
      )}
    </div>
  )
}

function CustomClassForm({
  customClass,
  onChange,
  onSave,
  onCancel,
}: {
  customClass: CustomClass
  onChange: (c: CustomClass) => void
  onSave: () => void
  onCancel: () => void
}) {
  const [tab, setTab] = useState<'basics' | 'levels'>('basics')

  const update = (patch: Partial<CustomClass>) => {
    onChange({ ...customClass, ...patch })
  }

  return (
    <div className={styles.form}>
      <h2>{customClass.id ? 'Editar classe' : 'Nova classe'}</h2>
      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === 'basics' ? styles.tabActive : undefined}
          onClick={() => setTab('basics')}
        >
          Básico
        </button>
        <button
          type="button"
          className={tab === 'levels' ? styles.tabActive : undefined}
          onClick={() => setTab('levels')}
        >
          Níveis
        </button>
      </div>

      {tab === 'basics' && (
        <div className={styles.section}>
          <label>
            Nome
            <input
              value={customClass.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Ex: Guerreiro"
            />
          </label>
          <label>
            Dado de vida (d?)
            <select
              value={customClass.hitDie}
              onChange={(e) => update({ hitDie: Number(e.target.value) })}
            >
              {[6, 8, 10, 12].map((d) => (
                <option key={d} value={d}>
                  d{d}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === 'levels' && (
        <div className={styles.section}>
          <p className={styles.hint}>
            Para cada nível você pode definir bônus de atributo (0 ou 1), bônus de proficiência e
            IDs de features. Crie features abaixo e associe ao nível.
          </p>
          <div className={styles.levelsGrid}>
            {customClass.levels.slice(0, 10).map((l) => (
              <div key={l.level} className={styles.levelCard}>
                <strong>Nível {l.level}</strong>
                <div>
                  ASI: {l.abilityScoreBonuses} · Prof: +{l.profBonus}
                </div>
                <div>
                  Features: {l.featureIds.length}
                </div>
              </div>
            ))}
          </div>
          <p className={styles.muted}>
            Níveis 11–20 seguem o mesmo padrão (ASI em 12, 14, 16, 19). Edite o código da classe
            ou adicione mais campos depois.
          </p>
        </div>
      )}

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" onClick={onSave} className={styles.saveBtn}>
          Salvar
        </button>
      </div>
    </div>
  )
}
