import { useState } from 'react'

/** Açık/koyu mod anahtarı; tercih localStorage'da saklanır. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('infosession:theme', next ? 'dark' : 'light')
    setDark(next)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Açık moda geç' : 'Koyu moda geç'}
      className="btn-ghost flex h-12 w-12 items-center justify-center text-xl"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
