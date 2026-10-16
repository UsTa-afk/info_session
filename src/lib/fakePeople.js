/**
 * Sahte katılımcı üretici — seed scripti, DEV aracı ve testler paylaşır.
 * Deterministik: aynı n her zaman aynı kişileri verir.
 */
const INTS = ['tech', 'art', 'sport', 'startup', 'musicGame']
const STYLES = ['listener', 'talker', 'funny']
const GOALS = ['network', 'friend', 'learn']
const DEPTS = ['engineering', 'business', 'design', 'science', 'social', null]
const NAMES = [
  'Ayşe', 'Mehmet', 'Elif', 'Can', 'Zeynep', 'Emre', 'Defne', 'Burak', 'Selin', 'Kerem',
  'Ece', 'Deniz', 'Naz', 'Arda', 'Irmak', 'Mert', 'Su', 'Yiğit', 'İpek', 'Ozan',
  'Duygu', 'Berk', 'Pelin', 'Tuna', 'Merve', 'Kaan', 'Aslı', 'Cem', 'Gizem', 'Barış',
]

export function fakePeople(n, offset = 0) {
  return Array.from({ length: n }, (_, i) => {
    const k = i + offset
    return {
      id: `fake${k}`,
      name: `${NAMES[k % NAMES.length]}${k >= NAMES.length ? ' ' + Math.floor(k / NAMES.length) : ''}`,
      answers: {
        crowd: (k % 5) + 1,
        starter: ((k * 3) % 5) + 1,
        interests: [INTS[k % 5], INTS[(k * 2 + 1) % 5]].filter((x, idx, a) => a.indexOf(x) === idx),
        style: STYLES[k % 3],
        goal: GOALS[(k * 7) % 3],
        dept: DEPTS[(k * 5) % 6],
        friday: ['home', 'game', 'out', 'study'][k % 4],
        drink: ['coffee', 'tea', 'cold', 'energy'][k % 4],
      },
    }
  })
}
