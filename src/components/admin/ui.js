/** Admin ekranı için ortak Tailwind sınıfları (min 44px dokunma alanı). */
const base =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-extrabold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

export const btn = {
  primary: `${base} bg-gradient-to-br from-brand-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30`,
  ghost: `${base} border-2 border-brand-100 bg-white/70 dark:border-white/15 dark:bg-white/10`,
  danger: `${base} bg-pop text-white shadow-lg shadow-orange-500/30`,
  small:
    'inline-flex min-h-9 items-center justify-center rounded-full border-2 border-brand-100 px-3 text-xs font-extrabold transition active:scale-95 hover:bg-brand-50 dark:border-white/15 dark:hover:bg-white/10',
  smallDanger:
    'inline-flex min-h-9 items-center justify-center rounded-full border-2 border-pop/30 text-pop px-3 text-xs font-extrabold transition active:scale-95 hover:bg-pop/10 dark:border-pop/40 dark:text-pop dark:hover:bg-pop/20',
}

export function messageOf(e) {
  if (e?.name === 'NetworkError') return 'Bağlantı yok 📡 İnternetini kontrol et.'
  return e?.message || 'Beklenmeyen bir hata oluştu'
}
