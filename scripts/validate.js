// Sjekker at hver turnering følger NIHF-mønsteret (lag A–F i rekkefølgen fra "Deltagende lag").
import { tournaments, teams } from '../src/data.js'

const pattern = ['AB', 'CD', 'EF', 'AC', 'BD', 'EA', 'FC', 'DE', 'EB', 'FA', 'CB', 'DA', 'FD', 'EC', 'BF']
let errors = 0
for (const t of tournaments) {
  const L = Object.fromEntries('ABCDEF'.split('').map((k, i) => [k, t.teams[i]]))
  t.games.forEach(([time, bane, home, away], i) => {
    const exp = [L[pattern[i][0]], L[pattern[i][1]]]
    if (home !== exp[0] || away !== exp[1]) {
      errors++
      console.error(`T${t.nr} kamp ${i + 1}: ${home}–${away}, forventet ${exp.join('–')}`)
    }
    const expBane = i === 14 ? 1 : (i % 2) + 1
    if (bane !== expBane) { errors++; console.error(`T${t.nr} kamp ${i + 1}: bane ${bane}`) }
  })
  if (t.games.length !== 15) { errors++; console.error(`T${t.nr}: ${t.games.length} kamper`) }
}
for (const team of teams) {
  const n = tournaments.flatMap(t => t.games).filter(g => g[2] === team.name || g[3] === team.name).length
  console.log(`${team.name}: ${n} kamper`)
}
if (errors) { console.error(`${errors} feil`); process.exit(1) }
console.log('Serieoppsett OK')
