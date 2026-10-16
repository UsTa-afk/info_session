import { describe, it, expect } from 'vitest'
import {
  assignAll,
  createState,
  placeLatecomer,
  tableCountFor,
  tableTheme,
  totalScore,
  MAX_SEATS,
  TABLE_CAPACITY,
  MIXED_THEME,
} from './matching.js'

import { fakePeople } from './fakePeople.js'

const sizes = (s) => s.tables.map((t) => t.members.length)

describe('tableCountFor', () => {
  it('min(12, ceil(n/6))', () => {
    expect(tableCountFor(0)).toBe(0)
    expect(tableCountFor(1)).toBe(1)
    expect(tableCountFor(20)).toBe(4)
    expect(tableCountFor(72)).toBe(12)
    expect(tableCountFor(500)).toBe(12)
  })
})

describe('assignAll', () => {
  it('20 kişi -> 4 masa, 5\'er kişi', () => {
    const s = assignAll(fakePeople(20))
    expect(sizes(s)).toEqual([5, 5, 5, 5])
    expect(s.waitlist).toHaveLength(0)
  })

  it('21 kişi -> boyutlar en fazla 1 fark eder', () => {
    const z = sizes(assignAll(fakePeople(21)))
    expect(Math.max(...z) - Math.min(...z)).toBeLessThanOrEqual(1)
  })

  it('72 kişi -> 12 masa, kapasite aşılmaz', () => {
    const s = assignAll(fakePeople(72))
    expect(s.tables).toHaveLength(12)
    expect(Math.max(...sizes(s))).toBeLessThanOrEqual(TABLE_CAPACITY)
    const ids = s.tables.flatMap((t) => t.members.map((m) => m.id))
    expect(new Set(ids).size).toBe(72)
  })

  it('swap ve greedy toplam skoru tohumlama sonrası iyileştirir (swap\'sız <= swap\'lı)', () => {
    const people = fakePeople(30)
    const noSwap = totalScore(assignAll(people, { swapIterations: 0 }))
    const withSwap = totalScore(assignAll(people, { swapIterations: 400 }))
    expect(withSwap).toBeGreaterThanOrEqual(noSwap)
  })

  it('deterministik', () => {
    const a = assignAll(fakePeople(25)).tables.map((t) => t.members.map((m) => m.id))
    const b = assignAll(fakePeople(25)).tables.map((t) => t.members.map((m) => m.id))
    expect(a).toEqual(b)
  })
})

describe('placeLatecomer', () => {
  it('geç gelen mevcut dağılımı bozmaz', () => {
    const base = assignAll(fakePeople(20))
    const before = base.tables.map((t) => t.members.map((m) => m.id))
    const { state, result } = placeLatecomer(base, fakePeople(1, 100)[0])
    expect(result.status).toBe('seated')
    const after = state.tables.map((t) => t.members.map((m) => m.id).filter((id) => id !== 'fake100'))
    expect(after).toEqual(before)
    expect(Math.max(...sizes(state))).toBeLessThanOrEqual(TABLE_CAPACITY)
    // 21. kişi en boş (5 kişilik) bir masaya oturur, 6'ya çıkar.
    expect(sizes(state).reduce((a, b) => a + b, 0)).toBe(21)
  })

  it('boş durumdan başlayınca ilk kişi Masa 1\'e oturur', () => {
    const { result } = placeLatecomer(createState(), fakePeople(1)[0])
    expect(result).toEqual({ status: 'seated', tableId: 1 })
  })

  it('tüm masalar doluyken bekleme listesi döner', () => {
    const full = assignAll(fakePeople(MAX_SEATS))
    const { state, result } = placeLatecomer(full, fakePeople(1, 500)[0])
    expect(result).toEqual({ status: 'waitlist', position: 1 })
    expect(state.waitlist).toHaveLength(1)
    expect(sizes(state).every((n) => n === TABLE_CAPACITY)).toBe(true)
    const second = placeLatecomer(state, fakePeople(1, 501)[0])
    expect(second.result.position).toBe(2)
  })

  it('72\'den fazla kişi toplu dağıtımda bekleme listesine düşer', () => {
    const s = assignAll(fakePeople(75))
    expect(s.waitlist).toHaveLength(3)
  })
})

describe('tableTheme', () => {
  it('ortak ilgi varsa tema, yoksa karma', () => {
    const mk = (interests) => ({ vec: { interests, social: 0, style: null, goal: null, dept: null } })
    expect(tableTheme({ members: [mk(['tech']), mk(['tech']), mk(['art'])] })).toContain('Teknoloji')
    expect(tableTheme({ members: [mk(['tech']), mk(['art']), mk(['sport'])] })).toBe(MIXED_THEME)
  })
})
