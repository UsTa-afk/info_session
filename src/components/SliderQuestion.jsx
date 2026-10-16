import { motion } from 'framer-motion'

const FACES = ['😶', '🙂', '😊', '😄', '🤩']

/** 1-5 arası, tek elle dokunması kolay büyük yuvarlak ölçek (slider yerine). */
export default function SliderQuestion({ question, value, onChange }) {
  const values = Array.from({ length: question.max - question.min + 1 }, (_, i) => question.min + i)
  return (
    <div>
      <div className="flex justify-between gap-2">
        {values.map((v, i) => (
          <motion.button
            key={v}
            type="button"
            whileTap={{ scale: 0.9 }}
            animate={{ scale: value === v ? 1.12 : 1 }}
            onClick={() => onChange(v)}
            aria-label={`${v} / ${question.max}`}
            aria-pressed={value === v}
            className={`card flex h-16 w-16 flex-col items-center justify-center text-2xl ${
              value === v ? 'opt-selected' : ''
            }`}
          >
            <span aria-hidden="true">{FACES[i]}</span>
            <span className="text-xs font-extrabold opacity-60">{v}</span>
          </motion.button>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-sm font-bold opacity-70">
        <span className="max-w-[40%]">{question.minLabel}</span>
        <span className="max-w-[40%] text-right">{question.maxLabel}</span>
      </div>
    </div>
  )
}
