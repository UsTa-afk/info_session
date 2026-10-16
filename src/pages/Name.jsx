import { useState } from 'react'

/** İsim ekranı: boş isim engellenir, gizlilik notu gösterilir. */
export default function Name({ initial = '', onNext, onBack }) {
  const [name, setName] = useState(initial)
  const [touched, setTouched] = useState(false)
  const trimmed = name.trim()
  const invalid = trimmed.length < 2

  const submit = (e) => {
    e.preventDefault()
    setTouched(true)
    if (!invalid) onNext(trimmed)
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col pt-6">
      <div className="text-6xl" aria-hidden="true">👋</div>
      <h2 className="mt-3 text-3xl font-black leading-tight">Sana nasıl hitap edelim?</h2>
      <p className="mt-2 font-bold opacity-70">Masandakiler seni bu isimle görecek.</p>

      <input
        id="name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        autoComplete="given-name"
        placeholder="Adın (veya takma adın)"
        aria-invalid={touched && invalid}
        className={`card mt-6 h-16 w-full px-5 text-xl font-extrabold outline-none focus:border-brand-500 ${
          touched && invalid ? '!border-pop' : ''
        }`}
      />
      {touched && invalid && (
        <p role="alert" className="mt-2 font-extrabold text-pop">
          Bir isim yazmadan devam edemeyiz 🙈
        </p>
      )}

      <p className="card mt-5 flex gap-3 px-4 py-3 text-sm font-bold">
        <span aria-hidden="true">🔒</span>
        Gizlilik notu: Verilerin sadece bu etkinlikte masa eşleştirmek için kullanılır, başka bir amaçla paylaşılmaz.
      </p>

      <div className="mt-auto flex gap-3 pt-8">
        <button type="button" className="btn-ghost px-5" onClick={onBack} aria-label="Geri">←</button>
        <button type="submit" className="btn-primary flex-1">Devam et</button>
      </div>
    </form>
  )
}
