import { useEffect, useRef } from 'react'

/** Basit modal: Esc ve dışarı tıklama ile kapanır, açılınca odak panele gider. */
export default function Modal({ title, onClose, children, id }) {
  const panel = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        id={id}
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 text-brand-700 shadow-2xl outline-none dark:bg-[#1c1930] dark:text-white sm:p-6"
      >
        <h2 className="mb-3 text-xl font-black text-[#1e1b4b] dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  )
}
