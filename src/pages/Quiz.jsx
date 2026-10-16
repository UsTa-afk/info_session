import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QUESTIONS, isAnswered } from '../lib/questions.js'
import { join, NetworkError } from '../api/client.js'
import ProgressBar from '../components/ProgressBar.jsx'
import QuestionCard from '../components/QuestionCard.jsx'

/** Tek soru/ekran, animasyonlu geçiş, cevapsız ilerleme engeli. */
export default function Quiz({ name, onDone, onBack }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const q = QUESTIONS[index]
  const value = answers[q.id]
  const last = index === QUESTIONS.length - 1
  const canGo = isAnswered(q, value)
  const skippable = q.optional && (value === undefined || value === null)

  const go = (d) => {
    setDir(d)
    setIndex((i) => i + d)
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      onDone(await join(name, answers))
    } catch (e) {
      setError(
        e instanceof NetworkError
          ? 'İnternet bağlantın yok gibi görünüyor 📡 Bağlanınca tekrar dene, cevapların burada duruyor.'
          : 'Bir şeyler ters gitti 😅 Tekrar dener misin?',
      )
      setSubmitting(false)
    }
  }

  const next = () => (last ? submit() : go(1))
  const back = () => (index === 0 ? onBack() : go(-1))

  return (
    <div className="flex flex-1 flex-col pt-2">
      <ProgressBar current={index} total={QUESTIONS.length} />

      <div className="relative mt-8 flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={q.id}
            custom={dir}
            variants={{
              enter: (d) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22 }}
          >
            <QuestionCard
              question={q}
              value={value}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-pop/15 px-4 py-3 text-sm font-extrabold text-pop">
          {error}
        </p>
      )}
      {!canGo && (
        <p className="mt-3 text-center text-sm font-bold opacity-60">Devam etmek için bir seçim yap 👆</p>
      )}

      <div className="sticky bottom-0 -mx-5 mt-4 flex gap-3 px-5 pb-2 pt-3 backdrop-blur-sm">
        <button type="button" className="btn-ghost px-5" onClick={back} disabled={submitting} aria-label="Geri">
          ←
        </button>
        <button type="button" className="btn-primary flex-1" onClick={next} disabled={!canGo || submitting}>
          {submitting ? 'Masan aranıyor… 🔍' : last ? 'Masamı bul 🎉' : skippable ? 'Atla →' : 'İleri →'}
        </button>
      </div>
    </div>
  )
}
