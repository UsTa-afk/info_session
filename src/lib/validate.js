/**
 * Kayıt isteği doğrulaması (saf JS; mock ve gerçek backend aynı kuralı kullanabilir).
 * Döner: { name: temizlenmiş isim, fields: hatalı alan listesi (boşsa geçerli) }
 */
import { QUESTIONS, isAnswered } from './questions.js'

export const MAX_NAME_LENGTH = 60

function validAnswer(q, v) {
  if (v === undefined || v === null || v === '') return !!q.optional
  if (q.type === 'slider') return Number.isInteger(v) && v >= q.min && v <= q.max
  if (q.type === 'multi') {
    return Array.isArray(v) && v.length <= q.max && v.every((x) => q.options.some((o) => o.value === x))
  }
  return q.options.some((o) => o.value === v)
}

export function validateRegistration({ name, answers } = {}) {
  const fields = []
  const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  if (!clean || clean.length > MAX_NAME_LENGTH) fields.push('name')
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    fields.push('answers')
  } else {
    for (const q of QUESTIONS) {
      if (!isAnswered(q, answers[q.id]) || !validAnswer(q, answers[q.id])) fields.push(`answers.${q.id}`)
    }
  }
  return { name: clean, fields }
}
