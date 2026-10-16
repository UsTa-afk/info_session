/**
 * MASA EŞLEŞTİRME ALGORİTMASI (saf JS, framework'e bağımsız)
 * ---------------------------------------------------------------------------
 * YAKLAŞIM: tohumlama + açgözlü (greedy) yerleştirme + swap ile yerel iyileştirme.
 *
 * NEDEN?
 *  - En fazla 72 kişi var; kesin optimum (NP-zor atama problemi) gereksiz ve
 *    yavaş. Greedy hızlı, deterministik ve açıklanabilir; swap ile kalite artar.
 *  - Tek bir "masa skoru" fonksiyonu (tableScore) hem toplu dağıtımda hem geç
 *    gelen kişi yerleştirmede kullanılır; böylece iki mod tutarlı kalır.
 *  - Boyutlar baştan dengelenir: n kişi, k masa -> her masa floor(n/k) ya da
 *    ceil(n/k) kişi (20 kişi -> 4 masa x 5). Swap boyutu değiştirmez.
 *  - Geç gelenler için mevcut kişiler ASLA yer değiştirmez; yeni kişi sadece en
 *    yüksek skorlu müsait masaya eklenir (state değişmez, yeni state döner).
 *
 * SKOR (masa başına):
 *  + ortak ilgi alanı (çiftler başına)       + sohbet tarzı çeşitliliği
 *  + içe/dışa dönük denge (ortalama ~0, yayılım yüksek)
 *  + aynı beklenti (küçük)                   - aynı bölüm (çeşitlilik cezası)
 *  - doluluk dengesi cezası (sadece geç gelen yerleştirmede)
 */
import { QUESTIONS } from './questions.js'
export { fakePeople } from './fakePeople.js'

export const MAX_TABLES = 12
export const TABLE_CAPACITY = 6
export const MAX_SEATS = MAX_TABLES * TABLE_CAPACITY

// Ağırlıklar tek yerde: ayarlamak kolay.
export const WEIGHTS = {
  sharedInterest: 1.5,
  socialMean: 2.0,
  socialSpread: 1.0,
  styleVariety: 1.0,
  sameGoal: 0.3,
  sameDept: 1.0,
  fill: 2.5,
}

/** Masa sayısı = min(12, ceil(katılımcı/6)) */
export function tableCountFor(n) {
  if (n <= 0) return 0
  return Math.min(MAX_TABLES, Math.ceil(n / TABLE_CAPACITY))
}

/** Cevapları sayısal özellik vektörüne çevirir (questions.js yorumlarına bakın). */
export function buildVector(answers = {}) {
  let socialSum = 0
  let weightSum = 0
  for (const q of QUESTIONS) {
    if (q.contribution !== 'social') continue
    const a = answers[q.id]
    if (a === undefined || a === null) continue
    let val
    if (q.type === 'slider') val = (Number(a) - 3) / 2
    else val = q.options.find((o) => o.value === a)?.social
    if (val === undefined) continue
    socialSum += val * q.weight
    weightSum += q.weight
  }
  return {
    social: weightSum ? socialSum / weightSum : 0,
    interests: Array.isArray(answers.interests) ? answers.interests.slice(0, 2) : [],
    style: answers.style ?? null,
    goal: answers.goal ?? null,
    dept: answers.dept ?? null,
    fun: answers.drink ?? null,
  }
}

function toMember(person) {
  return { id: person.id, name: person.name, vec: person.vec ?? buildVector(person.answers) }
}

/** Bir masanın (üye listesinin) kalite skoru. Yüksek = daha uyumlu/karma. */
export function tableScore(members) {
  const n = members.length
  if (n === 0) return 0
  let score = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = members[i].vec
      const b = members[j].vec
      score += a.interests.filter((x) => b.interests.includes(x)).length * WEIGHTS.sharedInterest
      if (a.goal && a.goal === b.goal) score += WEIGHTS.sameGoal
      if (a.dept && a.dept === b.dept) score -= WEIGHTS.sameDept
    }
  }
  const socials = members.map((m) => m.vec.social)
  const mean = socials.reduce((s, x) => s + x, 0) / n
  const spread = Math.sqrt(socials.reduce((s, x) => s + (x - mean) ** 2, 0) / n)
  score += n * (WEIGHTS.socialSpread * spread - WEIGHTS.socialMean * Math.abs(mean))
  const styles = new Set(members.map((m) => m.vec.style).filter(Boolean))
  score += styles.size * WEIGHTS.styleVariety
  return score
}

/** Yeni kişinin bir masaya katılmasının marjinal skoru (doluluk cezası hariç). */
export function scorePerson(member, tableMembers) {
  return tableScore([...tableMembers, member]) - tableScore(tableMembers)
}

// ---------------------------------------------------------------------------
// Etiketler
// ---------------------------------------------------------------------------
const THEMES = {
  tech: 'Teknoloji meraklıları 🚀',
  art: 'Sanat & tasarım tayfası 🎨',
  sport: 'Spor aşıkları ⚽',
  startup: 'Girişimci ruhlar 💡',
  musicGame: 'Müzik & oyun severler 🎮',
}
export const MIXED_THEME = 'Karma çılgınlar 🎲'

const ICE_BREAKERS = {
  tech: 'Hayatını en çok kolaylaştıran uygulama hangisi, neden?',
  art: 'Son zamanlarda seni en çok etkileyen tasarım ya da eser neydi?',
  sport: 'Hiç denemediğin ama denemek istediğin spor hangisi?',
  startup: 'Sınırsız bütçen olsa hangi girişimi kurardın?',
  musicGame: 'Şu an en çok döndürdüğün şarkı ya da oyun ne?',
  mixed: 'Üç kelimeyle kendini anlat, masa tahmin etsin! 🎲',
}

function dominantInterest(members) {
  const counts = {}
  for (const m of members) for (const i of m.vec.interests) counts[i] = (counts[i] || 0) + 1
  const [top, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? []
  if (top && count >= 2 && count >= members.length * 0.5) return top
  return null
}

/** Masaya otomatik ortak tema etiketi. */
export function tableTheme(table) {
  const key = dominantInterest(table.members)
  return key ? THEMES[key] : MIXED_THEME
}

/** Temaya göre buz kırıcı soru önerisi. */
export function iceBreaker(table) {
  return ICE_BREAKERS[dominantInterest(table.members) ?? 'mixed']
}

// ---------------------------------------------------------------------------
// Durum
// ---------------------------------------------------------------------------
export function createState() {
  return { tables: [], waitlist: [], waiting: [] }
}

/** Dışarıya (UI/API) verilecek özet: tema ve buz kırıcı eklenmiş masa görünümü. */
export function describeTable(table) {
  return {
    id: table.id,
    members: table.members.map((m) => ({ id: m.id, name: m.name })),
    theme: tableTheme(table),
    iceBreaker: iceBreaker(table),
  }
}

/**
 * GEÇ GELEN: mevcut kimseyi oynatmadan en yüksek skorlu müsait masaya yerleştirir.
 * Gerekirse (formül gerektiriyorsa) yeni masa açar. Hepsi doluysa bekleme listesi.
 * Döner: { state: yeniState, result: {status:'seated', tableId} | {status:'waitlist', position} }
 */
export function placeLatecomer(state, person) {
  const member = toMember(person)
  const seated = state.tables.reduce((s, t) => s + t.members.length, 0)
  const tables = state.tables.map((t) => ({ ...t, members: [...t.members] }))

  const candidates = tables.filter((t) => t.members.length < TABLE_CAPACITY)
  if (tables.length < tableCountFor(seated + 1)) {
    candidates.push({ id: tables.length + 1, members: [], isNew: true })
  }
  if (candidates.length === 0) {
    const waitlist = [...state.waitlist, member]
    return {
      state: { tables, waitlist, ...(state.waiting ? { waiting: state.waiting } : {}) },
      result: { status: 'waitlist', position: waitlist.length },
    }
  }
  const minSize = Math.min(...candidates.map((t) => t.members.length))
  let best = null
  for (const t of candidates) {
    const s = scorePerson(member, t.members) - WEIGHTS.fill * (t.members.length - minSize)
    if (!best || s > best.s) best = { t, s }
  }
  best.t.members.push(member)
  if (best.t.isNew) {
    delete best.t.isNew
    tables.push(best.t)
  }
  return {
    state: { tables, waitlist: state.waitlist, ...(state.waiting ? { waiting: state.waiting } : {}) },
    result: { status: 'seated', tableId: best.t.id },
  }
}

// Deterministik rastgele sayı üreteci (testler tekrarlanabilir olsun)
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function distance(a, b) {
  const shared = a.interests.filter((x) => b.interests.includes(x)).length
  return Math.abs(a.social - b.social) + (a.style !== b.style ? 0.5 : 0) + (2 - shared) * 0.5
}

/**
 * TOPLU DAĞITIM: tohumlama + greedy + swap.
 * 72'den fazla kişi varsa ilk 72'si oturur, kalanlar bekleme listesine girer.
 */
export function assignAll(people, { swapIterations = 400, seed = 42 } = {}) {
  const all = people.map(toMember)
  const seatedMembers = all.slice(0, MAX_SEATS)
  const waitlist = all.slice(MAX_SEATS)
  const m = seatedMembers.length
  const k = tableCountFor(m)
  if (k === 0) return { tables: [], waitlist }

  const base = Math.floor(m / k)
  const extra = m % k
  const tables = Array.from({ length: k }, (_, i) => ({ id: i + 1, members: [] }))

  // 1) Tohumlama: birbirine en uzak k kişiyi ayrı masalara koy (farthest-point).
  const remaining = [...seatedMembers]
  const seeds = [remaining.splice(0, 1)[0]]
  while (seeds.length < k) {
    let bestIdx = 0
    let bestD = -1
    remaining.forEach((p, idx) => {
      const d = Math.min(...seeds.map((s) => distance(s.vec, p.vec)))
      if (d > bestD) {
        bestD = d
        bestIdx = idx
      }
    })
    seeds.push(remaining.splice(bestIdx, 1)[0])
  }
  seeds.forEach((s, i) => tables[i].members.push(s))

  // 2) Greedy: boyut dengesini koruyarak en yüksek marjinal skorlu masaya.
  const bigTables = () => tables.filter((t) => t.members.length > base).length
  const allowed = (t) =>
    t.members.length < base || (t.members.length === base && bigTables() < extra)
  for (const p of remaining) {
    let best = null
    for (const t of tables) {
      if (!allowed(t)) continue
      const s = scorePerson(p, t.members)
      if (!best || s > best.s) best = { t, s }
    }
    best.t.members.push(p)
  }

  // 3) Swap: iki masadan birer kişi değiştir, toplam skor artıyorsa kabul et.
  if (k > 1) {
    const rnd = mulberry32(seed)
    for (let it = 0; it < swapIterations; it++) {
      const a = tables[Math.floor(rnd() * k)]
      let b = tables[Math.floor(rnd() * k)]
      if (a === b) b = tables[(tables.indexOf(a) + 1) % k]
      const i = Math.floor(rnd() * a.members.length)
      const j = Math.floor(rnd() * b.members.length)
      const before = tableScore(a.members) + tableScore(b.members)
      const na = a.members.map((x, idx) => (idx === i ? b.members[j] : x))
      const nb = b.members.map((x, idx) => (idx === j ? a.members[i] : x))
      if (tableScore(na) + tableScore(nb) > before + 1e-9) {
        a.members = na
        b.members = nb
      }
    }
  }
  return { tables, waitlist }
}

/** Toplam skor (iyileşmeyi ölçmek için). */
export function totalScore(state) {
  return state.tables.reduce((s, t) => s + tableScore(t.members), 0)
}

// ---------------------------------------------------------------------------
// Admin işlemleri (taşıma, yeniden dağıtma)
// ---------------------------------------------------------------------------

/** Masalardaki + bekleme listesindeki + havuzda bekleyen herkes. */
export function allMembers(state) {
  return [...state.tables.flatMap((t) => t.members), ...state.waitlist, ...(state.waiting ?? [])]
}

/** Admin işlemi başarısız olursa fırlatılır; code: PARTICIPANT_NOT_FOUND | NO_SUCH_TABLE | TABLE_FULL */
export class SeatingError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'SeatingError'
    this.code = code
  }
}

/**
 * Bir kişiyi başka masaya taşır (bekleme listesindeki veya havuzdaki kişi de masaya alınabilir).
 * Kapasite kontrolü burada yapılır; state değişmez, yeni state döner.
 */
export function moveParticipant(state, personId, toTableId) {
  const from = state.tables.find((t) => t.members.some((m) => m.id === personId))
  const person =
    from
      ? from.members.find((m) => m.id === personId)
      : state.waitlist.find((m) => m.id === personId) || state.waiting?.find((m) => m.id === personId)
  if (!person) throw new SeatingError('PARTICIPANT_NOT_FOUND', 'Katılımcı bulunamadı')
  const to = state.tables.find((t) => t.id === toTableId)
  if (!to) throw new SeatingError('NO_SUCH_TABLE', 'Böyle bir masa yok')
  if (from && from.id === to.id) return state
  if (to.members.length >= TABLE_CAPACITY) throw new SeatingError('TABLE_FULL', `Masa ${to.id} dolu`)
  return {
    tables: state.tables.map((t) => {
      if (t.id === to.id) return { ...t, members: [...t.members, person] }
      if (from && t.id === from.id) return { ...t, members: t.members.filter((m) => m.id !== personId) }
      return t
    }),
    waitlist: state.waitlist.filter((m) => m.id !== personId),
    ...(state.waiting ? { waiting: state.waiting.filter((m) => m.id !== personId) } : {}),
  }
}

/**
 * Bir kişiyi masalardan, bekleme listesinden veya havuzdan çıkarır.
 */
export function removeParticipant(state, personId) {
  const from = state.tables.find((t) => t.members.some((m) => m.id === personId))
  const inWaitlist = state.waitlist.some((m) => m.id === personId)
  const inWaiting = state.waiting?.some((m) => m.id === personId)
  if (!from && !inWaitlist && !inWaiting) throw new SeatingError('PARTICIPANT_NOT_FOUND', 'Katılımcı bulunamadı')
  return {
    tables: state.tables.map((t) =>
      from && t.id === from.id ? { ...t, members: t.members.filter((m) => m.id !== personId) } : t
    ),
    waitlist: state.waitlist.filter((m) => m.id !== personId),
    ...(state.waiting ? { waiting: state.waiting.filter((m) => m.id !== personId) } : {}),
  }
}


/**
 * Herkesi (masadakiler + bekleyenler) assignAll ile baştan dağıtır.
 * order: (a, b) => sayı — kimin önce/ sonra sayılacağı (ör. katılım zamanı); bekleme listesi sırasını belirler.
 */
export function rebalance(state, { order, ...options } = {}) {
  const people = allMembers(state)
  if (order) people.sort(order)
  return assignAll(people, options)
}
