import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCharacter } from '../context/CharacterContext'
import ErrorBoundary from '../components/ErrorBoundary'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  const { character } = useCharacter()

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          D&D Ficha
        </Link>
        <div className={styles.links}>
          <Link
            to="/"
            className={location.pathname === '/' ? styles.active : undefined}
          >
            Início
          </Link>
          <Link
            to="/create"
            className={location.pathname === '/create' ? styles.active : undefined}
          >
            Criar personagem
          </Link>
          <Link
            to="/sheet"
            className={location.pathname === '/sheet' ? styles.active : undefined}
          >
            Ficha
          </Link>
          <Link
            to="/level-up"
            className={location.pathname === '/level-up' ? styles.active : undefined}
          >
            Subir de nível
          </Link>
          <Link
            to="/custom-classes"
            className={location.pathname === '/custom-classes' ? styles.active : undefined}
          >
            Classes custom
          </Link>
        </div>
        {character.name ? (
          <span className={styles.currentChar}>
            {character.name}
            {character.class?.name && ` (${character.class.name} ${character.level})`}
          </span>
        ) : null}
      </nav>
      <main className={styles.main}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
