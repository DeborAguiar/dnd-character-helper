import { Link } from 'react-router-dom'
import { SHOW_CUSTOM_CLASSES, SHOW_DEMO_CHARACTER } from '../config'
import { useCharacter } from '../context/CharacterContext'
import { createDemoCharacter } from '../types/character'
import styles from './Home.module.css'

export default function Home() {
  const { character, exportCharacter, importCharacter, loadCharacter } = useCharacter()
  const hasCharacter = character.name || character.class?.name

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      if (importCharacter(text)) {
        alert('Ficha importada com sucesso!')
      } else {
        alert('Arquivo inválido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={styles.home}>
      <h1>D&D 5e — Ajudante de Ficha</h1>
      <p className={styles.subtitle}>
        Simplifique a criação de personagens e a subida de nível. Dados da{' '}
        <a href="https://www.dnd5eapi.co/" target="_blank" rel="noreferrer">
          dnd5eapi
        </a>
        .
      </p>

      <div className={styles.cards}>
        {!hasCharacter ? (
          <div className={styles.card}>
            <h2>Novo personagem</h2>
            <p>Comece criando seu personagem do zero: raça, classe, atributos e equipamento.</p>
            <Link to="/create" className={styles.button}>
              Criar personagem
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.card}>
              <h2>Seu personagem</h2>
              <p>
                <strong>{character.name || 'Sem nome'}</strong>
                {character.class?.name && (
                  <> — {character.class.name} nível {character.level}</>
                )}
              </p>
              <div className={styles.row}>
                <Link to="/sheet" className={styles.button}>
                  Ver ficha
                </Link>
                <Link to="/level-up" className={styles.buttonSecondary}>
                  Subir de nível
                </Link>
              </div>
            </div>
          </>
        )}

        <div className={styles.card}>
          <h2>Ficha (exportar / importar)</h2>
          <p>Baixe sua ficha em JSON para guardar ou use em outro dispositivo.</p>
          <div className={styles.row}>
            <button type="button" onClick={exportCharacter} className={styles.button}>
              Baixar ficha
            </button>
            <label className={styles.buttonSecondary}>
              Carregar ficha
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                hidden
              />
            </label>
          </div>
        </div>

        {SHOW_DEMO_CHARACTER && (
          <div className={styles.card}>
            <h2>Personagem de teste</h2>
            <p>Mago nível 5 com magias para testar a tela de subir de nível e a ficha.</p>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={() => {
                try {
                  loadCharacter(createDemoCharacter())
                } catch (e) {
                  console.error('Erro ao carregar personagem de teste:', e)
                  alert('Erro ao carregar personagem de teste. Veja o console.')
                }
              }}
            >
              Carregar personagem de teste
            </button>
          </div>
        )}

        {SHOW_CUSTOM_CLASSES && (
          <div className={styles.card}>
            <h2>Classes customizadas</h2>
            <p>Defina classes caseiras e use na criação de personagem e no level-up.</p>
            <Link to="/custom-classes" className={styles.button}>
              Gerenciar classes
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
