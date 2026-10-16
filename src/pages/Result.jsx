import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { getResult } from '../api/client.js'

/** Sonuç: büyük masa numarası, masadakiler, tema, buz kırıcı. Bekleme listesi ve havuzda bekleme varyantları. */
export default function Result({ result, onResultUpdate }) {
  // Havuzda bekleyen katılımcı için otomatik polling
  useEffect(() => {
    if (result.status !== 'waiting') return

    const interval = setInterval(async () => {
      try {
        const next = await getResult()
        if (next && next.status !== 'waiting') {
          onResultUpdate?.(next)
        }
      } catch {
        /* Ağ hatası olursa sonraki turda tekrar dene */
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [result.status, onResultUpdate])

  if (result.status === 'waiting') {
    return (
      <div className="flex flex-1 flex-col justify-center text-center py-6">
        {result.alreadyJoined && <Again />}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-500/10 text-6xl shadow-inner dark:bg-white/10"
        >
          ☕
        </motion.div>
        <h1 className="mt-5 text-3xl font-black">Cevapların Kaydedildi! 🎉</h1>
        <p className="mt-2 text-lg font-bold opacity-80">
          Harika, <span className="text-brand-600 dark:text-violet-300">{result.name}</span>!
        </p>
        <p className="mt-3 text-base font-semibold leading-relaxed opacity-75 max-w-sm mx-auto">
          Diğer katılımcıların da testi tamamlaması bekleniyor. Organizatör masaları dağıttığında masan ve arkadaşların burada otomatik olarak belirecek.
        </p>

        <div className="mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-100/80 px-5 py-2.5 text-sm font-extrabold text-brand-700 dark:bg-white/10 dark:text-violet-200 mx-auto">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500"></span>
          </span>
          <span>Masalar birazdan dağıtılacak…</span>
        </div>

        <p className="mt-4 text-xs font-bold opacity-50">
          Sayfayı açık tutabilirsin, ekran otomatik güncellenecektir 📲
        </p>
      </div>
    )
  }

  if (result.status === 'waitlist') {
    return (
      <div className="flex flex-1 flex-col justify-center text-center">
        <div className="text-8xl" aria-hidden="true">⏳</div>
        <h1 className="mt-4 text-3xl font-black">Masalar şu an dolu!</h1>
        <p className="mt-3 text-lg font-bold opacity-80">
          Çok popülersin, {result.name}! Bekleme listesinde <b>{result.position}. sıradasın</b>. Bir yer açılırsa
          organizatörler seni masaya alacak. Kafeden uzaklaşma 😉
        </p>
        {result.alreadyJoined && <Again />}
      </div>
    )
  }

  const { table } = result
  return (
    <div className="flex flex-1 flex-col pt-2">
      {result.alreadyJoined && <Again />}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 160, damping: 12 }}
        className="rounded-[36px] bg-gradient-to-br from-brand-600 via-fuchsia-500 to-pop p-7 text-center text-white shadow-2xl shadow-violet-500/40"
      >
        <p className="text-lg font-extrabold opacity-90">Selam {result.name}! 🎉</p>
        <p className="mt-1 text-xl font-black">Senin masan:</p>
        <h1 className="mt-1 text-7xl font-black leading-none" data-testid="table-number">Masa {result.tableId}</h1>
        <p className="mt-4 inline-block rounded-full bg-white/25 px-4 py-2 font-extrabold">{table.theme}</p>
      </motion.div>

      <section className="card mt-5 p-5" aria-labelledby="mates">
        <h2 id="mates" className="mb-3 text-lg font-black">Masa arkadaşların 👥</h2>
        <ul className="flex flex-wrap gap-2">
          {table.members.map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className={`rounded-full px-4 py-2 text-base font-extrabold ${
                m.id === result.meId
                  ? 'bg-brand-600 text-white'
                  : 'bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-violet-200'
              }`}
            >
              {m.name}
              {m.id === result.meId && ' (sen)'}
            </motion.li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-bold opacity-60">Sonradan gelenler de masana katılabilir, liste güncellenir.</p>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="text-lg font-black">Buz kırıcı soru 🧊</h2>
        <p className="mt-2 text-xl font-extrabold leading-snug">“{table.iceBreaker}”</p>
      </section>
    </div>
  )
}

function Again() {
  return (
    <p className="mb-4 rounded-2xl bg-mint/20 px-4 py-3 text-center text-sm font-extrabold">
      👋 Tekrar hoş geldin! Bu cihazdan zaten katılmıştın, sonucun burada.
    </p>
  )
}
