import { motion } from 'framer-motion'

/** Üstteki ilerleme çubuğu: "Soru 3 / 8" */
export default function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100)
  return (
    <div className="w-full" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
      <div className="mb-2 flex justify-between text-sm font-extrabold text-brand-600 dark:text-violet-300">
        <span>Soru {current + 1} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-brand-100 dark:bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 via-fuchsia-500 to-pop"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  )
}
