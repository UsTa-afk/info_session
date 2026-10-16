import OptionCard from './OptionCard.jsx'
import SliderQuestion from './SliderQuestion.jsx'

/** Soru tipine göre doğru girdiyi gösterir: slider | cards | multi */
export default function QuestionCard({ question, value, onChange }) {
  const toggle = (v) => {
    const cur = Array.isArray(value) ? value : []
    if (cur.includes(v)) onChange(cur.filter((x) => x !== v))
    else if (cur.length < question.max) onChange([...cur, v])
  }
  const cur = Array.isArray(value) ? value : []

  return (
    <section aria-labelledby="q-title">
      <div className="mb-3 text-6xl" aria-hidden="true">{question.emoji}</div>
      <h2 id="q-title" className="text-[1.65rem] font-black leading-tight">{question.text}</h2>
      {question.hint && <p className="mt-1 text-sm font-bold opacity-60">{question.hint}</p>}
      <div className="mt-6 flex flex-col gap-3">
        {question.type === 'slider' && (
          <SliderQuestion question={question} value={value} onChange={onChange} />
        )}
        {question.type === 'cards' &&
          question.options.map((o) => (
            <OptionCard
              key={o.value}
              {...o}
              selected={value === o.value}
              onClick={() => onChange(question.optional && value === o.value ? undefined : o.value)}
            />
          ))}
        {question.type === 'multi' &&
          question.options.map((o) => (
            <OptionCard
              key={o.value}
              {...o}
              selected={cur.includes(o.value)}
              disabled={!cur.includes(o.value) && cur.length >= question.max}
              onClick={() => toggle(o.value)}
            />
          ))}
      </div>
    </section>
  )
}
