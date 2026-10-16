/**
 * MOCK SUNUCU (localStorage tabanlı)
 * ---------------------------------------------------------------------------
 * API_CONTRACT.md'deki uçları AYNI gövde ve hata kodlarıyla taklit eder; her
 * fonksiyon bir uca karşılık gelir. Not: localStorage cihazlar arası paylaşılmaz;
 * yani bu mock'ta sadece bu tarayıcıdaki katılımcılar görünür. Gerçek etkinlik
 * için USE_MOCK=false (bkz. README "Backend'e geçiş adımları").
 *
 * Veri: { tables, waitlist, people } — people: id -> {id,name,answers,deviceId,createdAt}
 */
import {
  MAX_SEATS,
  SeatingError,
  TABLE_CAPACITY,
  allMembers,
  buildVector,
  createState,
  describeTable,
  moveParticipant as moveInState,
  removeParticipant as removeFromState,
  placeLatecomer,
  rebalance as rebalanceState,
  tableTheme,
} from '../lib/matching.js'
import { fakePeople } from '../lib/fakePeople.js'
import { buildParticipantsCsv } from '../lib/csv.js'
import { validateRegistration } from '../lib/validate.js'
import { ApiError } from './errors.js'

const DB_KEY = 'infosession:db'
const ME_KEY = 'infosession:me'
const ADMIN_TOKEN_KEY = 'infosession:mock-admin-token'

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms))

function loadDb() {
  try {
    const d = JSON.parse(localStorage.getItem(DB_KEY))
    if (d && Array.isArray(d.tables))
      return { tables: d.tables, waitlist: d.waitlist ?? [], waiting: d.waiting ?? [], people: d.people ?? {} }
  } catch {
    /* bozuk veri: sıfırdan başla */
  }
  return { ...createState(), people: {} }
}
const saveDb = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db))

function requireAdmin(token) {
  const expected = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (!token || !expected || token !== expected) {
    throw new ApiError(401, 'unauthorized', 'Yönetici yetkisi gerekli')
  }
}

/** Bir katılımcının sözleşmedeki görünümü (POST/GET /api/participants yanıtı). */
function participantView(db, id) {
  const table = db.tables.find((t) => t.members.some((m) => m.id === id))
  if (table) {
    const me = table.members.find((m) => m.id === id)
    const d = describeTable(table)
    return {
      id,
      name: me.name,
      status: 'seated',
      tableNumber: table.id,
      tablemates: d.members.filter((m) => m.id !== id),
      theme: d.theme,
      iceBreaker: d.iceBreaker,
    }
  }
  const idx = db.waitlist.findIndex((m) => m.id === id)
  if (idx >= 0) {
    return {
      id,
      name: db.waitlist[idx].name,
      status: 'waitlist',
      waitlistPosition: idx + 1,
      tableNumber: null,
      tablemates: [],
      theme: null,
      iceBreaker: null,
    }
  }
  const waitingMember = db.waiting?.find((m) => m.id === id)
  if (waitingMember) {
    return {
      id,
      name: waitingMember.name,
      status: 'waiting',
      tableNumber: null,
      tablemates: [],
      theme: null,
      iceBreaker: null,
      waitlistPosition: null,
    }
  }
  return null
}

/** GET /api/tables gövdesi. */
function tablesView(db) {
  const seated = db.tables.reduce((s, t) => s + t.members.length, 0)
  const waiting = db.waiting ?? []
  return {
    tables: [...db.tables]
      .sort((a, b) => a.id - b.id)
      .map((t) => ({
        number: t.id,
        capacity: TABLE_CAPACITY,
        count: t.members.length,
        theme: tableTheme(t),
        members: t.members.map(({ id, name }) => ({ id, name })),
      })),
    waitlist: db.waitlist.map((m, i) => ({ id: m.id, name: m.name, position: i + 1 })),
    waiting: waiting.map((m) => ({ id: m.id, name: m.name })),
    totals: {
      participants: seated + db.waitlist.length + waiting.length,
      seated,
      waitlisted: db.waitlist.length,
      waiting: waiting.length,
      tableCount: db.tables.length,
      capacity: MAX_SEATS,
      occupancy: Math.round((seated / MAX_SEATS) * 1000) / 1000,
    },
  }
}

const byJoinTime = (people) => (a, b) => (people[a.id]?.createdAt ?? 0) - (people[b.id]?.createdAt ?? 0)

// --- Herkese açık uçlar ------------------------------------------------------

/** POST /api/participants */
export async function createParticipant({ name, answers, deviceId } = {}) {
  await delay()
  const { name: cleanName, fields } = validateRegistration({ name, answers })
  if (fields.length) throw new ApiError(400, 'invalid_data', 'Geçersiz veri', { fields })

  const db = loadDb()
  if (deviceId) {
    const dup = Object.values(db.people).find((p) => p.deviceId === deviceId && participantView(db, p.id))
    if (dup) {
      throw new ApiError(409, 'already_registered', 'Bu cihaz zaten kayıtlı', { participantId: dup.id })
    }
  }
  const id = `u${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
  const person = { id, name: cleanName, answers, deviceId, createdAt: Date.now() }

  if (db.tables.length === 0) {
    const vec = buildVector(answers)
    const next = {
      ...db,
      waiting: [...(db.waiting ?? []), { id, name: cleanName, vec, answers }],
      people: { ...db.people, [id]: person },
    }
    saveDb(next)
    return participantView(next, id)
  }

  const { state } = placeLatecomer(db, { id, name: cleanName, answers })
  const next = { ...state, people: { ...db.people, [id]: person } }
  saveDb(next)
  return participantView(next, id)
}

/** GET /api/participants/:id */
export async function getParticipant(id) {
  await delay(250)
  const view = participantView(loadDb(), id)
  if (!view) throw new ApiError(404, 'not_found', 'Katılımcı bulunamadı')
  return view
}

/** GET /api/tables */
export async function getTables() {
  await delay(120)
  return tablesView(loadDb())
}

/** GET /api/health */
export async function health() {
  return { status: 'ok', time: new Date().toISOString() }
}

// --- Admin uçları ------------------------------------------------------------

/** POST /api/admin/login (sözleşmeye eklenen yardımcı uç) */
export async function adminLogin(password) {
  await delay(200)
  const expected = import.meta.env.VITE_ADMIN_PASSWORD
  if (!expected) throw new ApiError(401, 'unauthorized', 'VITE_ADMIN_PASSWORD tanımlı değil (.env)')
  if (password !== expected) throw new ApiError(401, 'unauthorized', 'Parola hatalı')
  const token = `mock-${crypto.randomUUID()}`
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  return { token }
}

/** PATCH /api/participants/:id/table */
export async function moveParticipant(id, tableNumber, token) {
  await delay(150)
  requireAdmin(token)
  if (!Number.isInteger(tableNumber)) throw new ApiError(400, 'invalid_data', 'tableNumber tam sayı olmalı', { fields: ['tableNumber'] })
  const db = loadDb()
  try {
    const next = { ...moveInState(db, id, tableNumber), people: db.people }
    saveDb(next)
    return participantView(next, id)
  } catch (e) {
    if (!(e instanceof SeatingError)) throw e
    if (e.code === 'PARTICIPANT_NOT_FOUND') throw new ApiError(404, 'not_found', e.message)
    if (e.code === 'TABLE_FULL') throw new ApiError(409, 'table_full', e.message, { tableNumber })
    throw new ApiError(400, 'invalid_data', e.message, { fields: ['tableNumber'] })
  }
}

/** DELETE /api/participants/:id */
export async function deleteParticipant(id, token) {
  await delay(150)
  requireAdmin(token)
  const db = loadDb()
  try {
    const nextState = removeFromState(db, id)
    const people = { ...db.people }
    delete people[id]
    const next = { ...nextState, people }
    saveDb(next)
    return { status: 'ok', id }
  } catch (e) {
    if (e instanceof SeatingError && e.code === 'PARTICIPANT_NOT_FOUND') {
      throw new ApiError(404, 'not_found', e.message)
    }
    throw e
  }
}

/** POST /api/admin/rebalance */
export async function rebalance(token) {
  await delay(200)
  requireAdmin(token)
  const db = loadDb()
  const next = { ...rebalanceState(db, { order: byJoinTime(db.people) }), people: db.people }
  saveDb(next)
  return { status: 'ok', ...tablesView(next) }
}

/** POST /api/admin/reset */
export async function reset(token) {
  await delay(200)
  requireAdmin(token)
  saveDb({ ...createState(), people: {} })
  return { status: 'ok' }
}

/** GET /api/admin/export.csv (düz metin döner) */
export async function exportCsv(token) {
  await delay(100)
  requireAdmin(token)
  const db = loadDb()
  return buildParticipantsCsv(db, db.people)
}

// --- Geliştirme araçları (sadece mock) ---------------------------------------

/** n sahte katılımcı ekler ve herkesi yeniden dengeler (assignAll). */
export async function devSeed(n = 30) {
  const db = loadDb()
  const offset = allMembers(db).filter((m) => m.id.startsWith('fake')).length
  const fakes = fakePeople(n, offset)
  const now = Date.now()
  const people = { ...db.people }
  fakes.forEach((f, i) => {
    people[f.id] = { id: f.id, name: f.name, answers: f.answers, createdAt: now + i }
  })

  if (db.tables.length === 0) {
    const next = {
      ...db,
      waiting: [
        ...(db.waiting ?? []),
        ...fakes.map((f) => ({ id: f.id, name: f.name, vec: buildVector(f.answers), answers: f.answers })),
      ],
      people,
    }
    saveDb(next)
    return { status: 'ok', added: n }
  }

  // Yeni sahteler masalara girmeden önce mevcut herkesin yanına eklenir, sonra toplu dağıtılır.
  const merged = {
    tables: db.tables,
    waitlist: [...db.waitlist, ...fakes.map((f) => ({ id: f.id, name: f.name, vec: buildVector(f.answers) }))],
    waiting: db.waiting ?? [],
  }
  saveDb({ ...rebalanceState(merged, { order: byJoinTime(people) }), people })
  return { status: 'ok', added: n }
}

export function devReset() {
  localStorage.removeItem(DB_KEY)
  localStorage.removeItem(ME_KEY)
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}
