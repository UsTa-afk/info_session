import { Suspense, lazy, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { dev, getResult } from './api/client.js'
import OfflineBanner from './components/OfflineBanner.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Welcome from './pages/Welcome.jsx'
import Name from './pages/Name.jsx'
import Quiz from './pages/Quiz.jsx'
import Result from './pages/Result.jsx'

// Geliştirici araçları sadece ?dev=1 ile ve mock modunda görünür
const SHOW_DEV = dev && new URLSearchParams(location.search).get('dev') === '1'

const Admin = lazy(() => import('./pages/Admin.jsx'))
const isAdminRoute = () => location.pathname.replace(/\/+$/, '') === '/admin'

/** Basit yol ayrımı: /admin -> yönetim paneli, diğer her şey katılımcı akışı. */
export default function App() {
  if (isAdminRoute()) {
    return (
      <Suspense fallback={<p className="mt-24 text-center text-xl font-extrabold">Yükleniyor… ☕</p>}>
        <Admin />
      </Suspense>
    )
  }
  return <Participant />
}

function Participant() {
  const [step, setStep] = useState('loading')
  const [name, setName] = useState('')
  const [result, setResult] = useState(null)

  // Açılışta bu cihaz daha önce katıldı mı? Evetse doğrudan sonuç.
  useEffect(() => {
    getResult()
      .then((r) => {
        if (r) {
          setResult({ ...r, alreadyJoined: true })
          setStep('result')
        } else setStep('welcome')
      })
      .catch(() => setStep('welcome'))
  }, [])

  const refresh = async () => {
    const r = await dev.seed(30)
    if (r) setResult({ ...r, alreadyJoined: true })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-4">
      <OfflineBanner />
      <header className="mb-2 flex items-center justify-between">
        <span className="text-lg font-black">☕ Info Session</span>
        <ThemeToggle />
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          className="flex flex-1 flex-col"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 'loading' && <p className="m-auto text-xl font-extrabold">Yükleniyor… ☕</p>}
          {step === 'welcome' && <Welcome onStart={() => setStep('name')} />}
          {step === 'name' && (
            <Name
              initial={name}
              onBack={() => setStep('welcome')}
              onNext={(n) => {
                setName(n)
                setStep('quiz')
              }}
            />
          )}
          {step === 'quiz' && (
            <Quiz
              name={name}
              onBack={() => setStep('name')}
              onDone={(r) => {
                setResult(r)
                setStep('result')
              }}
            />
          )}
          {step === 'result' && result && <Result result={result} onResultUpdate={setResult} />}
        </motion.main>
      </AnimatePresence>

      {SHOW_DEV && (
        <div className="mt-6 flex gap-2 rounded-2xl border-2 border-dashed border-pop p-3 text-sm font-bold">
          <span className="flex-1">🛠 DEV</span>
          <button id="dev-seed" type="button" className="rounded-full bg-pop px-3 py-2 text-white" onClick={refresh}>
            30 sahte ekle
          </button>
          <button
            id="dev-reset"
            type="button"
            className="rounded-full bg-brand-600 px-3 py-2 text-white"
            onClick={() => {
              dev.reset()
              location.reload()
            }}
          >
            Sıfırla
          </button>
        </div>
      )}
    </div>
  )
}
