/**
 * Define se o card "Personagem de teste" é exibido na Home.
 * Em produção, mantenha false para que visitantes não vejam.
 * Em dev/local, use .env.local com VITE_SHOW_DEMO_CHARACTER=true
 */
export const SHOW_DEMO_CHARACTER =
  import.meta.env.VITE_SHOW_DEMO_CHARACTER === 'true'
