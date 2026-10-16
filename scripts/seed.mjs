// 30 sahte katılımcı üretip toplu dağıtımın dengesini doğrular: npm run seed
import { assignAll, describeTable, totalScore, TABLE_CAPACITY } from '../src/lib/matching.js'
import { fakePeople } from '../src/lib/fakePeople.js'

const N = Number(process.argv[2] ?? 30)
const state = assignAll(fakePeople(N))

console.log(`\n${N} katılımcı -> ${state.tables.length} masa (bekleme listesi: ${state.waitlist.length})\n`)
for (const t of state.tables) {
  const d = describeTable(t)
  console.log(`Masa ${String(d.id).padStart(2)} (${d.members.length} kişi) ${d.theme}`)
  console.log(`   ${d.members.map((m) => m.name).join(', ')}`)
}

const sizes = state.tables.map((t) => t.members.length)
const ok = Math.max(...sizes) <= TABLE_CAPACITY && Math.max(...sizes) - Math.min(...sizes) <= 1
console.log(`\nBoyutlar: [${sizes.join(', ')}]  Toplam skor: ${totalScore(state).toFixed(2)}`)
console.log(ok ? '✅ Dağılım dengeli, kapasite aşılmadı.' : '❌ Dağılım dengesiz!')
process.exit(ok ? 0 : 1)
