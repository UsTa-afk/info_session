import { useEffect, useRef, useState } from 'react'
import { getTables } from '../../api/client.js'

const REFRESH_MS = 5000

/** Projektör için tam ekran masa listesi: büyük yazı, 5 sn'de bir otomatik yenileme, Esc ile çıkış. */
export default function ProjectorView({ initial, onExit }) {
  const [data, setData] = useState(initial)
  const [updated, setUpdated] = useState(() => new Date())
  const [failed, setFailed] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const d = await getTables()
        if (!alive) return
        setData(d)
        setUpdated(new Date())
        setFailed(false)
      } catch {
        if (alive) setFailed(true)
      }
    }
    const timer = setInterval(tick, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onExit()
    const onFs = () => !document.fullscreenElement && onExit()
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    root.current?.requestFullscreen?.().catch(() => {})
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [onExit])

  const time = updated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div
      ref={root}
      id="projector-view"
      role="dialog"
      aria-label="Masa listesi"
      className="fixed inset-0 z-40 overflow-auto bg-[#12101f] p-[2vmin] text-white"
    >
      <header className="mb-[2vmin] flex items-center justify-between gap-4">
        <h1 className="text-[clamp(1.75rem,4vmin,4rem)] font-black">☕ Masa Listesi</h1>
        <div className="flex items-center gap-3 text-[clamp(0.85rem,1.6vmin,1.4rem)] font-bold">
          <span className={failed ? 'text-pop' : 'text-mint'}>
            {failed ? '⚠ Bağlantı sorunu — son veri' : `● Canlı · ${time}`}
          </span>
          <button
            id="projector-exit"
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-full border-2 border-white/25 px-4 font-extrabold hover:bg-white/10"
          >
            Kapat (Esc)
          </button>
        </div>
      </header>

      <div className="grid gap-[1.5vmin] [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
        {[...data.tables].sort((a, b) => a.number - b.number).map((t) => (
          <section key={t.number} className="rounded-3xl border-2 border-white/10 bg-white/[0.07] p-[2vmin]" data-testid={`projector-table-${t.number}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[clamp(1.6rem,3.6vmin,3.4rem)] font-black text-mint">Masa {t.number}</h2>
              <span className="text-[clamp(1rem,2vmin,1.8rem)] font-extrabold opacity-70">
                {t.count}/{t.capacity}
              </span>
            </div>
            <p className="mb-[1vmin] truncate text-[clamp(0.9rem,1.7vmin,1.5rem)] font-bold text-violet-300">{t.theme}</p>
            <ul className="text-[clamp(1.1rem,2.6vmin,2.4rem)] font-extrabold leading-snug">
              {t.members.map((m) => (
                <li key={m.id} className="truncate">
                  {m.name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {data.tables.length === 0 && (
        <p className="mt-[10vmin] text-center text-[clamp(1.5rem,4vmin,3.5rem)] font-black opacity-70">Henüz katılımcı yok 🙂</p>
      )}

      {data.waitlist.length > 0 && (
        <section className="mt-[2vmin] rounded-3xl border-2 border-pop/40 bg-pop/10 p-[2vmin]">
          <h2 className="text-[clamp(1.2rem,2.8vmin,2.6rem)] font-black text-pop">⏳ Bekleme listesi ({data.waitlist.length})</h2>
          <p className="mt-1 text-[clamp(1rem,2.2vmin,2rem)] font-bold">{data.waitlist.map((w) => w.name).join(' · ')}</p>
        </section>
      )}
    </div>
  )
}
