import Modal from './Modal.jsx'
import { btn } from './ui.js'

/** Onay penceresi (Yeniden Dağıt / Sıfırla). */
export default function ConfirmDialog({ title, children, confirmLabel, danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel} id="confirm-dialog">
      <div className="text-base font-semibold text-[#1e1b4b]/80 dark:text-white/80">{children}</div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button id="confirm-cancel" type="button" className={btn.ghost} onClick={onCancel} disabled={busy}>
          Vazgeç
        </button>
        <button id="confirm-ok" type="button" className={danger ? btn.danger : btn.primary} onClick={onConfirm} disabled={busy}>
          {busy ? 'Çalışıyor…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
