import Modal from './Modal.jsx'
import { btn } from './ui.js'

/** Kişiyi taşımak için masa seçimi. Dolu ve mevcut masa seçilemez (sunucu da ayrıca kontrol eder). */
export default function MoveDialog({ member, currentTable, tables, busy, onPick, onClose }) {
  return (
    <Modal title={`${member.name} kişisini taşı`} onClose={onClose} id="move-dialog">
      <p className="mb-3 text-sm font-bold text-[#1e1b4b]/70 dark:text-white/70">
        {currentTable ? `Şu an: Masa ${currentTable}` : 'Şu an: Bekleme listesinde'} · Hedef masayı seç
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[...tables].sort((a, b) => a.number - b.number).map((t) => {
          const full = t.count >= t.capacity
          const here = t.number === currentTable
          return (
            <button
              key={t.number}
              id={`move-to-${t.number}`}
              type="button"
              disabled={busy || full || here}
              onClick={() => onPick(t.number)}
              className={`${btn.ghost} flex-col !rounded-2xl py-2 leading-tight text-[#1e1b4b] dark:text-white`}
            >
              <span>Masa {t.number}</span>
              <span className="text-xs font-bold opacity-70">
                {here ? 'mevcut' : full ? 'dolu' : `${t.count}/${t.capacity}`}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex justify-end">
        <button id="move-cancel" type="button" className={btn.ghost} onClick={onClose}>
          Kapat
        </button>
      </div>
    </Modal>
  )
}
