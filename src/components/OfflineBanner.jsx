import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/** İnternet kopunca üstte uyarı gösterir. */
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="alert"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed inset-x-3 top-3 z-50 rounded-2xl bg-pop px-4 py-3 text-center font-extrabold text-white shadow-lg"
        >
          📡 İnternetin koptu! Bağlanınca kaldığın yerden devam edebilirsin.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
