/**
 * API İSTEMCİSİ — uygulamanın backend ile konuştuğu TEK nokta.
 * Fonksiyonlar API_CONTRACT.md'deki uçlarla birebir eşleşir. USE_MOCK=false
 * olduğunda aynı fonksiyonlar fetch ile gerçek API'yi (VITE_API_BASE_URL) çağırır.
 *
 *   createParticipant  POST  /api/participants
 *   getParticipant     GET   /api/participants/:id
 *   getTables          GET   /api/tables
 *   moveParticipant    PATCH /api/participants/:id/table   (admin)
 *   rebalance          POST  /api/admin/rebalance          (admin)
 *   resetAll           POST  /api/admin/reset              (admin)
 *   exportCsv          GET   /api/admin/export.csv         (admin)
 *   health             GET   /api/health
 *   adminLogin         POST  /api/admin/login              (token alır)
 *
 * join() ve getResult() katılımcı ekranının eski "sonuç nesnesi" biçimini koruyan
 * ince adaptörlerdir; UI değişmeden çalışır.
 */
import * as mock from './mockServer.js'
import { ApiError, NetworkError } from './errors.js'

export { ApiError, NetworkError }

// VITE_USE_MOCK=false (veya bu satırı false yaparak) gerçek API'ye geçilir.
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'false') !== 'false'
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

const DEVICE_KEY = 'infosession:device'
const PID_KEY = 'infosession:participant'
const LEGACY_ME_KEY = 'infosession:me'
const ADMIN_KEY = 'infosession:admin-token'

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

function storedParticipantId() {
  const id = localStorage.getItem(PID_KEY)
  if (id) return id
  try {
    return JSON.parse(localStorage.getItem(LEGACY_ME_KEY))?.id ?? null
  } catch {
    return null
  }
}

function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new NetworkError('offline')
  }
}

const adminToken = () => sessionStorage.getItem(ADMIN_KEY)

async function request(path, { method = 'GET', body, admin = false, text = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (admin && adminToken()) headers.Authorization = `Bearer ${adminToken()}`
  let res
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new NetworkError('network')
  }
  if (!res.ok) {
    let err = {}
    try {
      err = (await res.json()).error ?? {}
    } catch {
      /* gövde JSON değil */
    }
    throw new ApiError(res.status, err.code ?? 'http_error', err.message ?? `HTTP ${res.status}`, err.details)
  }
  return text ? res.text() : res.json()
}

// --- Herkese açık uçlar ------------------------------------------------------

/** POST /api/participants -> {id, name, status, tableNumber, tablemates, theme, ...} */
export async function createParticipant(name, answers) {
  assertOnline()
  const payload = { name, answers, deviceId: deviceId() }
  const p = USE_MOCK
    ? await mock.createParticipant(payload)
    : await request('/api/participants', { method: 'POST', body: payload })
  localStorage.setItem(PID_KEY, p.id)
  return p
}

/** GET /api/participants/:id */
export async function getParticipant(id) {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK ? mock.getParticipant(id) : request(`/api/participants/${encodeURIComponent(id)}`)
}

/** GET /api/tables */
export async function getTables() {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK ? mock.getTables() : request('/api/tables')
}

/** GET /api/health */
export async function health() {
  return USE_MOCK ? mock.health() : request('/api/health')
}

// --- Admin uçları ------------------------------------------------------------

/** Parola ile token alır ve oturum boyunca saklar (401 -> ApiError). */
export async function adminLogin(password) {
  if (!USE_MOCK) assertOnline()
  const { token } = USE_MOCK
    ? await mock.adminLogin(password)
    : await request('/api/admin/login', { method: 'POST', body: { password } })
  sessionStorage.setItem(ADMIN_KEY, token)
}
export const adminLogout = () => sessionStorage.removeItem(ADMIN_KEY)
export const hasAdminToken = () => !!adminToken()

/** PATCH /api/participants/:id/table (kapasite dolu -> 409 table_full) */
export async function moveParticipant(id, tableNumber) {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK
    ? mock.moveParticipant(id, tableNumber, adminToken())
    : request(`/api/participants/${encodeURIComponent(id)}/table`, { method: 'PATCH', body: { tableNumber }, admin: true })
}

/** DELETE /api/participants/:id */
export async function deleteParticipant(id) {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK
    ? mock.deleteParticipant(id, adminToken())
    : request(`/api/participants/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true })
}

/** POST /api/admin/rebalance */
export async function rebalance() {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK ? mock.rebalance(adminToken()) : request('/api/admin/rebalance', { method: 'POST', admin: true })
}

/** POST /api/admin/reset */
export async function resetAll() {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK ? mock.reset(adminToken()) : request('/api/admin/reset', { method: 'POST', admin: true })
}

/** POST /api/admin/seed (test için katılımcı simüle eder) */
export async function seedParticipants(count = 30) {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK
    ? mock.devSeed(count)
    : request('/api/admin/seed', { method: 'POST', body: { count }, admin: true })
}

/** GET /api/admin/export.csv -> CSV metni */
export async function exportCsv() {
  if (!USE_MOCK) assertOnline()
  return USE_MOCK ? mock.exportCsv(adminToken()) : request('/api/admin/export.csv', { admin: true, text: true })
}

// --- Katılımcı ekranı adaptörleri (eski sonuç nesnesi biçimi) ----------------

function toResult(p, alreadyJoined) {
  if (p.status === 'waiting') {
    return { status: 'waiting', name: p.name, meId: p.id, alreadyJoined }
  }
  if (p.status === 'waitlist') {
    return { status: 'waitlist', name: p.name, meId: p.id, position: p.waitlistPosition, alreadyJoined }
  }
  return {
    status: 'seated',
    name: p.name,
    meId: p.id,
    tableId: p.tableNumber,
    table: {
      id: p.tableNumber,
      members: [{ id: p.id, name: p.name }, ...p.tablemates],
      theme: p.theme,
      iceBreaker: p.iceBreaker,
    },
    alreadyJoined,
  }
}

/** Anketi gönderir, masa sonucunu döner. Cihaz daha önce katıldıysa (409) mevcut sonucu verir. */
export async function join(name, answers) {
  try {
    return toResult(await createParticipant(name, answers), false)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.details?.participantId) {
      localStorage.setItem(PID_KEY, e.details.participantId)
      return toResult(await getParticipant(e.details.participantId), true)
    }
    throw e
  }
}

/** Bu cihazın kayıtlı sonucu (yoksa veya sunucuda silindiyse null). */
export async function getResult() {
  const id = storedParticipantId()
  if (!id) return null
  try {
    return toResult(await getParticipant(id), true)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      localStorage.removeItem(PID_KEY)
      return null
    }
    throw e
  }
}

/** Geliştirme araçları: sadece mock modunda var. */
export const dev = USE_MOCK
  ? {
      seed: async (n) => {
        await mock.devSeed(n)
        return getResult()
      },
      reset: () => {
        mock.devReset()
        localStorage.removeItem(PID_KEY)
        sessionStorage.removeItem(ADMIN_KEY)
      },
    }
  : null
