import { btn } from './ui.js'

/** Tek masa kartı: doluluk çubuğu + oturanlar + "Taşı" butonları. */
export default function TableCard({ table, onMove, onDelete }) {
  const pct = Math.round((table.count / table.capacity) * 100)
  const full = table.count >= table.capacity
  return (
    <article className="card p-4" aria-label={`Masa ${table.number}`} data-testid={`table-${table.number}`}>
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-black">Masa {table.number}</h3>
        <span className={`text-sm font-extrabold ${full ? 'text-pop' : 'text-brand-600 dark:text-violet-300'}`}>
          {table.count}/{table.capacity}
        </span>
      </header>
      <p className="mt-0.5 min-h-5 truncate text-sm font-bold opacity-70">{table.theme}</p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Masa ${table.number} doluluk`}
      >
        <div
          className={`h-full rounded-full transition-all ${full ? 'bg-pop' : 'bg-gradient-to-r from-brand-500 to-mint'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1">
        {table.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl px-2 py-0.5 hover:bg-brand-50 dark:hover:bg-white/5">
            <span className="truncate font-bold">{m.name}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id={`move-${m.id}`}
                type="button"
                className={btn.small}
                onClick={() => onMove(m, table.number)}
                aria-label={`${m.name} kişisini taşı`}
              >
                Taşı
              </button>
              {onDelete && (
                <button
                  id={`delete-${m.id}`}
                  type="button"
                  className={btn.smallDanger}
                  onClick={() => onDelete(m)}
                  aria-label={`${m.name} kişisini sil`}
                  title="Katılımcıyı sil"
                >
                  Sil
                </button>
              )}
            </div>
          </li>
        ))}
        {table.members.length === 0 && <li className="px-2 text-sm font-bold opacity-50">Boş masa</li>}
      </ul>
    </article>
  )
}
