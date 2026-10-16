/**
 * CSV üretimi (saf JS; backend de aynen kullanabilir).
 * - Formül enjeksiyonuna karşı: =, +, -, @ ile başlayan hücrelerin başına ' eklenir.
 * - Ayraç virgül, satır sonu CRLF. Excel için BOM'u indirme tarafı ekler.
 */
import { QUESTIONS } from './questions.js'

export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(columns, rows) {
  const lines = [columns.map(csvCell).join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c])).join(','))
  return lines.join('\r\n') + '\r\n'
}

const answerText = (v) => (Array.isArray(v) ? v.join(';') : v ?? '')

/**
 * Katılımcı CSV'si. state: {tables, waitlist}; people: {id -> {answers, createdAt}} (opsiyonel).
 */
export function buildParticipantsCsv(state, people = {}) {
  const columns = ['id', 'name', 'status', 'table_number', 'waitlist_position', 'joined_at', ...QUESTIONS.map((q) => q.id)]
  const toRow = (m, status, table, position) => {
    const p = people[m.id] ?? {}
    const row = {
      id: m.id,
      name: m.name,
      status,
      table_number: table ?? '',
      waitlist_position: position ?? '',
      joined_at: p.createdAt ? new Date(p.createdAt).toISOString() : '',
    }
    for (const q of QUESTIONS) row[q.id] = answerText(p.answers?.[q.id])
    return row
  }
  const rows = [
    ...state.tables.flatMap((t) => t.members.map((m) => toRow(m, 'seated', t.id, null))),
    ...state.waitlist.map((m, i) => toRow(m, 'waitlist', null, i + 1)),
    ...(state.waiting ?? []).map((m) => toRow(m, 'waiting', null, null)),
  ]
  return toCsv(columns, rows)
}
