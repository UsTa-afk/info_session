import { motion } from 'framer-motion'

/** Büyük dokunma alanlı seçenek kartı (kart seçimi ve çoklu seçim için ortak). */
export default function OptionCard({ emoji, label, selected, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`card flex min-h-[72px] w-full items-center gap-4 px-5 text-left text-lg font-extrabold transition-colors disabled:opacity-40 ${
        selected ? 'opt-selected' : ''
      }`}
    >
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <span className="flex-1">{label}</span>
      {selected && <span className="text-xl text-brand-600 dark:text-violet-300">✓</span>}
    </motion.button>
  )
}
