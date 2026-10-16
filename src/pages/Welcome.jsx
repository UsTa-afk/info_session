import { motion } from 'framer-motion'

/** Karşılama ekranı */
export default function Welcome({ onStart }) {
  return (
    <div className="flex flex-1 flex-col justify-between pt-6">
      <div className="text-center">
        <motion.div
          className="mx-auto mb-6 text-8xl"
          animate={{ rotate: [0, -8, 8, -4, 0], y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.2 }}
          aria-hidden="true"
        >
          ☕
        </motion.div>
        <h1 className="text-4xl font-black leading-tight">
          Info Session'a <br />
          <span className="bg-gradient-to-r from-brand-600 via-fuchsia-500 to-pop bg-clip-text text-transparent">
            hoş geldin!
          </span>
        </h1>
        <p className="mt-4 text-lg font-bold opacity-80">
          8 kısa soru, 1-2 dakika. Sana en uygun masayı bulalım; yeni insanlarla tanış, kaynaş! 🎉
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <div className="card flex items-center gap-3 px-5 py-4 text-sm font-bold">
          <span className="text-2xl" aria-hidden="true">📱</span>
          Anketi sadece bir kez doldurabilirsin, o yüzden içinden geldiği gibi cevapla.
        </div>
        <button type="button" className="btn-primary w-full" onClick={onStart}>
          Hadi başlayalım 🚀
        </button>
      </div>
    </div>
  )
}
