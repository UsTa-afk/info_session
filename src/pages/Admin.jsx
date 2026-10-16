import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ApiError,
  adminLogout,
  exportCsv,
  getTables,
  hasAdminToken,
  moveParticipant,
  deleteParticipant,
  rebalance,
  resetAll,
  seedParticipants,
} from '../api/client.js'
import ThemeToggle from '../components/ThemeToggle.jsx'
import ConfirmDialog from '../components/admin/ConfirmDialog.jsx'
import LoginForm from '../components/admin/LoginForm.jsx'
import MoveDialog from '../components/admin/MoveDialog.jsx'
import ProjectorView from '../components/admin/ProjectorView.jsx'
import TableCard from '../components/admin/TableCard.jsx'
import { btn, messageOf } from '../components/admin/ui.js'

/** /admin — parola kapısı + yönetim paneli. */
export default function Admin() {
  const [authed, setAuthed] = useState(hasAdminToken())

  useEffect(() => {
    const prev = document.title
    document.title = 'Admin · Info Session'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6">
      {authed ? (
        <Dashboard onLogout={() => setAuthed(false)} />
      ) : (
        <>
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <LoginForm onSuccess={() => setAuthed(true)} />
        </>
      )}
    </div>
  )
}

function Stat({ label, value, children }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
      {children}
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [moving, setMoving] = useState(null) // {member, from}
  const [deleting, setDeleting] = useState(null) // member
  const [confirm, setConfirm] = useState(null) // 'rebalance' | 'reset'
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [projector, setProjector] = useState(false)
  const toastTimer = useRef(null)

  const logout = useCallback(() => {
    adminLogout()
    onLogout()
  }, [onLogout])

  const notify = useCallback((text, kind = 'ok') => {
    setToast({ text, kind })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const load = useCallback(async () => {
    try {
      setData(await getTables())
      setLoadError(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return logout()
      setLoadError(messageOf(e))
    }
  }, [logout])

  useEffect(() => {
    load()
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  /** Bir admin işlemini çalıştırır; 401'de oturumu kapatır, hatada toast gösterir. */
  const run = async (fn, okText) => {
    setBusy(true)
    try {
      const r = await fn()
      notify(typeof okText === 'function' ? okText(r) : okText)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return logout()
      notify(messageOf(e), 'error')
    } finally {
      setBusy(false)
      setMoving(null)
      setDeleting(null)
      setConfirm(null)
      load()
    }
  }

  const downloadCsv = () =>
    run(async () => {
      const csv = await exportCsv()
      // BOM: Excel'in Türkçe karakterleri doğru okuması için
      const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `katilimcilar-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }, 'CSV indirildi 📄')

  const exitProjector = useCallback(() => setProjector(false), [])

  if (!data) {
    return (
      <p className="mt-24 text-center text-xl font-extrabold" role="status">
        {loadError ?? 'Yükleniyor… ☕'}
      </p>
    )
  }

  const { totals } = data
  const pct = Math.round(totals.occupancy * 100)

  return (
    <>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black sm:text-3xl">🛠 Admin · Masa Yönetimi</h1>
        <div className="flex items-center gap-2">
          <button id="admin-logout" type="button" className={btn.ghost} onClick={logout}>
            Çıkış
          </button>
          <ThemeToggle />
        </div>
      </header>

      {loadError && (
        <p role="alert" className="mb-3 rounded-2xl bg-pop/15 px-4 py-2 text-sm font-extrabold text-pop">
          {loadError} — son veri gösteriliyor
        </p>
      )}

      <section aria-label="Özet" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Katılımcı" value={totals.participants} />
        <Stat label="Masada" value={`${totals.seated} · ${totals.tableCount} masa`} />
        <Stat label="Dağıtım Bekleyen" value={totals.waiting ?? 0} />
        <Stat label="Bekleme Listesi" value={totals.waitlisted} />
      </section>

      {(totals.waiting ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-500/15 border border-brand-500/30 p-4 text-brand-900 dark:text-brand-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-black text-base">{totals.waiting} katılımcı havuzda dağıtım bekliyor!</p>
              <p className="text-xs font-bold opacity-80">Katılımcılar şu anda bekleme ekranında. Hazır olduğunda masaları dağıtabilirsin.</p>
            </div>
          </div>
          <button
            type="button"
            className={`${btn.primary} !shadow-lg`}
            onClick={() => setConfirm('rebalance')}
            disabled={busy}
          >
            ✨ {data.tables.length === 0 ? 'Masaları Dağıt' : 'Dağıtımı Güncelle'} ({totals.waiting} kişi)
          </button>
        </div>
      )}

      <section aria-label="İşlemler" className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button id="admin-projector" type="button" className={btn.primary} onClick={() => setProjector(true)}>
          📺 Masa Listesi
        </button>
        <button id="admin-export" type="button" className={btn.ghost} onClick={downloadCsv} disabled={busy}>
          📄 CSV indir
        </button>
        <button
          id="admin-rebalance"
          type="button"
          className={data.tables.length === 0 ? btn.primary : (totals.waiting ?? 0) > 0 ? btn.primary : btn.ghost}
          onClick={() => setConfirm('rebalance')}
          disabled={busy || totals.participants === 0}
        >
          {data.tables.length === 0 ? '✨ Masaları Dağıt' : (totals.waiting ?? 0) > 0 ? `🔀 Dağıt (${totals.waiting} yeni)` : '🔀 Yeniden Dağıt'}
        </button>
        <button
          id="admin-seed"
          type="button"
          className={btn.ghost}
          onClick={() => setConfirm('seed')}
          disabled={busy}
          title="Sistemi test etmek için 30 sahte katılımcı simüle eder"
        >
          🧪 30 Simüle Et
        </button>
        <button
          id="admin-reset"
          type="button"
          className={`${btn.danger} !bg-none`}
          onClick={() => setConfirm('reset')}
          disabled={busy || totals.participants === 0}
        >
          🗑 Sıfırla
        </button>
        <button id="admin-refresh" type="button" className={btn.ghost} onClick={load} disabled={busy}>
          ↻ Yenile
        </button>
      </section>

      <section aria-label="Masalar" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[...data.tables].sort((a, b) => a.number - b.number).map((t) => (
          <TableCard
            key={t.number}
            table={t}
            onMove={(member, from) => setMoving({ member, from })}
            onDelete={(member) => setDeleting(member)}
          />
        ))}
      </section>
      {data.tables.length === 0 && (
        <div className="card mt-5 p-8 text-center">
          {(totals.waiting ?? 0) > 0 ? (
            <>
              <div className="text-5xl mb-3">👥</div>
              <p className="text-xl font-black">Havuzda {totals.waiting} katılımcı hazır bekliyor!</p>
              <p className="mt-2 text-sm font-bold opacity-75 max-w-md mx-auto">
                Katılımcıların karakter testleri tamamlandı. Masaları en uyumlu şekilde oluşturmak için dağıtımı başlatabilirsin.
              </p>
              <button
                type="button"
                className={`${btn.primary} mt-4 text-base px-6 py-3 shadow-lg shadow-brand-500/25`}
                onClick={() => setConfirm('rebalance')}
                disabled={busy}
              >
                ✨ Masaları Şimdi Dağıt ({totals.waiting} kişi)
              </button>
            </>
          ) : (
            <p className="text-lg font-extrabold opacity-80">Henüz katılımcı yok. İlk kayıt geldiğinde masalar burada görünür 🙂</p>
          )}
        </div>
      )}

      {data.waiting && data.waiting.length > 0 && (
        <section aria-label="Havuzda bekleyenler" className="card mt-5 p-4" id="waiting-pool">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">⏳ Dağıtım Bekleyen Katılımcılar ({data.waiting.length})</h2>
            <span className="text-xs font-bold opacity-60">Admin dağıtımı bekleniyor</span>
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.waiting.map((w, idx) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1 bg-brand-50/50 dark:bg-white/5">
                <span className="truncate font-bold text-sm">
                  {idx + 1}. {w.name}
                </span>
                <button
                  id={`delete-${w.id}`}
                  type="button"
                  className={btn.smallDanger}
                  onClick={() => setDeleting(w)}
                  aria-label={`${w.name} kişisini sil`}
                  title="Katılımcıyı sil"
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.waitlist.length > 0 && (
        <section aria-label="Bekleme listesi" className="card mt-5 p-4" id="waitlist">
          <h2 className="text-lg font-black">⏳ Bekleme listesi ({data.waitlist.length})</h2>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {data.waitlist.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-0.5 hover:bg-brand-50 dark:hover:bg-white/5">
                <span className="truncate font-bold">
                  {w.position}. {w.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button id={`move-${w.id}`} type="button" className={btn.small} onClick={() => setMoving({ member: w, from: null })}>
                    Masaya al
                  </button>
                  <button
                    id={`delete-${w.id}`}
                    type="button"
                    className={btn.smallDanger}
                    onClick={() => setDeleting(w)}
                    aria-label={`${w.name} kişisini sil`}
                    title="Katılımcıyı sil"
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {moving && (
        <MoveDialog
          member={moving.member}
          currentTable={moving.from}
          tables={data.tables}
          busy={busy}
          onClose={() => setMoving(null)}
          onPick={(n) =>
            run(() => moveParticipant(moving.member.id, n), `${moving.member.name} → Masa ${n} ✅`)
          }
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`${deleting.name} silinsin mi?`}
          confirmLabel="Evet, sil"
          danger
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() =>
            run(() => deleteParticipant(deleting.id), `${deleting.name} silindi 🗑`)
          }
        >
          <b>{deleting.name}</b> sistemden tamamen silinecek. Boşalan koltuğa başka biri oturabilir veya aynı cihazla yeniden kayıt olabilir. <b>Bu işlem geri alınamaz.</b>
        </ConfirmDialog>
      )}

      {confirm === 'rebalance' && (
        <ConfirmDialog
          title={data.tables.length === 0 ? 'Masalar dağıtılsın mı?' : 'Yeniden dağıtılsın mı?'}
          confirmLabel={data.tables.length === 0 ? 'Masaları Dağıt' : 'Yeniden Dağıt'}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() =>
            run(
              rebalance,
              (r) =>
                data.tables.length === 0
                  ? `Masalar dağıtıldı: ${r.totals.seated} kişi, ${r.totals.tableCount} masa ✨`
                  : `Yeniden dağıtıldı: ${r.totals.seated} kişi, ${r.totals.tableCount} masa 🔀`
            )
          }
        >
          {data.tables.length === 0 ? (
            <>
              Havuzdaki <b>{totals.participants} katılımcı</b>, ilgi alanları ve karakter testlerine göre en uyumlu masalara
              yerleştirilecek. Katılımcıların ekranlarında masaları otomatik olarak belirecek.
            </>
          ) : (
            <>
              Tüm katılımcılar ({totals.participants} kişi) baştan eşleştirme algoritmasıyla dağıtılır.{' '}
              <b>Elle yaptığın taşımalar ve şu anki masa numaraları değişir.</b>
            </>
          )}
        </ConfirmDialog>
      )}

      {confirm === 'seed' && (
        <ConfirmDialog
          title="30 Katılımcı Simüle Edilsin mi?"
          confirmLabel="Simüle Et"
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(() => seedParticipants(30), '30 test katılımcısı simüle edildi 🧪')}
        >
          Sistemi ve algoritmayı test etmek için <b>30 sahte katılımcı</b> sisteme eklenecek.
          {data.tables.length === 0 ? (
            <>
              <br />
              <br />
              Katılımcılar doğrudan <b>dağıtım havuzuna</b> eklenir. Ardından <b>"Masaları Dağıt"</b> butonuna basarak
              algoritmanın masaları nasıl oluşturduğunu test edebilirsin.
            </>
          ) : (
            <>
              <br />
              <br />
              Mevcut masalara uygun şekilde yerleştirilirler; kapasite dolarsa bekleme listesi oluşur.
            </>
          )}
          <br />
          <br />
          Testin bitince <b>Sıfırla</b> butonu ile tümünü tek tıkla silebilirsin.
        </ConfirmDialog>
      )}

      {confirm === 'reset' && (
        <ConfirmDialog
          title="Tüm veriler silinsin mi?"
          confirmLabel="Evet, sıfırla"
          danger
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(resetAll, 'Tüm katılımcılar silindi 🗑')}
        >
          {totals.participants} katılımcının tamamı ve masa yerleşimi silinir. <b>Bu işlem geri alınamaz.</b> Gerekirse önce CSV
          indir.
        </ConfirmDialog>
      )}

      {projector && <ProjectorView initial={data} onExit={exitProjector} />}

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-extrabold text-white shadow-xl ${
            toast.kind === 'error' ? 'bg-pop' : 'bg-brand-600'
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  )
}
