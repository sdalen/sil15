import './style.css'
import { teams, tournaments } from './data.js'

const GAME_MINUTES = 20

const THEME = {
  hvit: { pill: 'bg-white text-navy ring-2 ring-slate-300', dot: 'bg-white ring-1 ring-slate-400', accent: 'border-slate-400', soft: 'bg-slate-100' },
  rod: { pill: 'bg-sh-red text-white', dot: 'bg-sh-red', accent: 'border-sh-red', soft: 'bg-red-50' },
  bla: { pill: 'bg-sh-blue text-white', dot: 'bg-sh-blue', accent: 'border-sh-blue', soft: 'bg-blue-50' },
  gul: { pill: 'bg-sh-yellow text-navy', dot: 'bg-sh-yellow', accent: 'border-sh-yellow', soft: 'bg-amber-50' },
}

const store = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch {} },
}

const state = {
  team: teams.find(t => t.id === location.hash.slice(1))?.id || store.get('team') || 'hvit',
  tab: 'kamper',
  showPast: false,
  open: new Set(),
}

// ---------- hjelpefunksjoner ----------
const at = (date, time) => new Date(`${date}T${time}:00`)
const addMin = (d, m) => new Date(d.getTime() + m * 60000)
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)
const fmtDate = (date, opts) => cap(new Intl.DateTimeFormat('nb-NO', opts).format(at(date, '12:00')))
const longDate = date => fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = date => fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })

function daysUntil(date) {
  const diff = Math.round((startOfDay(at(date, '12:00')) - startOfDay(new Date())) / 86400000)
  if (diff === 0) return 'I dag'
  if (diff === 1) return 'I morgen'
  if (diff > 1) return `Om ${diff} dager`
  return null
}

function teamTournaments(teamName) {
  return tournaments
    .filter(t => t.teams.includes(teamName))
    .map(t => ({
      ...t,
      myGames: t.games
        .map(([time, bane, home, away], i) => ({ nr: i + 1, time, bane, home, away }))
        .filter(g => g.home === teamName || g.away === teamName)
        .map(g => ({ ...g, isHome: g.home === teamName, opponent: g.home === teamName ? g.away : g.home })),
    }))
}

function gameStatus(t, time) {
  const now = new Date()
  const s = at(t.date, time)
  if (now >= addMin(s, GAME_MINUTES)) return 'done'
  if (now >= s) return 'live'
  return 'upcoming'
}

const isOver = t => new Date() > at(t.date, t.end)

const shortTeam = name => name.replace(/^Storhamar /, 'SH ')

// ---------- kalender (.ics) ----------
function osloToUtc(date, time) {
  // Finn Oslo-offset for den aktuelle datoen (håndterer sommer-/vintertid)
  const guess = new Date(`${date}T${time}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Oslo', timeZoneName: 'shortOffset' })
    .formatToParts(guess).find(p => p.type === 'timeZoneName').value // f.eks. "GMT+1"
  const m = parts.match(/GMT([+-]\d+)?(?::(\d+))?/)
  const offsetMin = m && m[1] ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] || 0) : 0
  return addMin(guess, -offsetMin)
}
const icsStamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function downloadIcs(team) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Storhamar U12//NO', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${team.name} U12`]
  const stamp = icsStamp(new Date())
  for (const t of teamTournaments(team.name)) {
    for (const g of t.myGames) {
      const start = osloToUtc(t.date, g.time)
      lines.push(
        'BEGIN:VEVENT',
        `UID:sil15-t${t.nr}-k${g.nr}-${team.id}@storhamar-u12`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsStamp(start)}`,
        `DTEND:${icsStamp(addMin(start, GAME_MINUTES))}`,
        `SUMMARY:${g.home} – ${g.away}`,
        `LOCATION:${t.place}\\, bane ${g.bane}`,
        `DESCRIPTION:U12 turnering nr ${t.nr} i ${t.place}. Kamp ${g.nr}\\, bane ${g.bane}.`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Kamp snart', 'TRIGGER:-PT60M', 'END:VALARM',
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `storhamar-${team.id}-u12.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// ---------- visning ----------
function header() {
  return `
  <header class="bg-navy text-white pt-safe sticky top-0 z-20 shadow-lg">
    <div class="mx-auto max-w-xl px-4 pb-3">
      <div class="flex items-center gap-3">
        <img src="${import.meta.env.BASE_URL}favicon.svg" alt="" class="h-9 w-9" />
        <div class="leading-tight">
          <h1 class="text-lg font-bold">Storhamar U12</h1>
          <p class="text-xs text-white/70">Sesongen 2026–2027 · født 2015</p>
        </div>
        <button id="install" class="ml-auto hidden rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">Installer app</button>
      </div>
      <nav class="mt-3 grid grid-cols-4 gap-2" aria-label="Velg lag">
        ${teams.map(t => `
          <button data-team="${t.id}" class="rounded-xl py-2 text-sm font-bold transition ${THEME[t.id].pill} ${state.team === t.id ? 'scale-105 shadow-md outline-2 outline-offset-2 outline-white' : 'opacity-60'}">
            ${t.short}
          </button>`).join('')}
      </nav>
    </div>
  </header>`
}

function tabs() {
  const tab = (id, label) => `
    <button data-tab="${id}" class="flex-1 rounded-lg py-2 text-sm font-semibold transition ${state.tab === id ? 'bg-white shadow text-navy' : 'text-slate-500'}">${label}</button>`
  return `<div class="flex gap-1 rounded-xl bg-slate-200 p-1">${tab('kamper', 'Kamper')}${tab('spillere', 'Spillere')}</div>`
}

function gameRow(t, g, theme) {
  const st = gameStatus(t, g.time)
  const badge = st === 'live'
    ? '<span class="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">Pågår</span>'
    : ''
  return `
    <li class="flex items-center gap-3 px-4 py-3 ${st === 'done' ? 'opacity-45' : ''} ${st === 'live' ? theme.soft : ''}">
      <div class="w-14 shrink-0 text-lg font-bold tabular-nums">${g.time}</div>
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold">mot ${g.opponent} ${badge}</div>
        <div class="text-xs text-slate-500">${g.isHome ? 'Hjemmelag' : 'Bortelag'} · kamp ${g.nr}</div>
      </div>
      <div class="shrink-0 rounded-lg bg-navy px-2.5 py-1 text-center text-white">
        <div class="text-[9px] uppercase leading-none tracking-wide text-white/70">Bane</div>
        <div class="text-base font-bold leading-tight">${g.bane}</div>
      </div>
    </li>`
}

function fullProgram(t, teamName) {
  const rows = []
  const breakIdx = t.games.findIndex(g => g[0] > t.iceBreak)
  t.games.forEach(([time, bane, home, away], i) => {
    if (i === breakIdx) {
      rows.push(`<tr class="bg-sky-100 text-sky-900"><td class="py-1 pl-3 tabular-nums">${t.iceBreak}</td><td colspan="3" class="py-1 text-center font-semibold">Iskjøring</td></tr>`)
    }
    const mine = home === teamName || away === teamName
    const cls = n => (n === teamName ? 'font-bold' : '')
    rows.push(`
      <tr class="border-t border-slate-100 ${mine ? 'bg-amber-50' : ''}">
        <td class="py-1.5 pl-3 tabular-nums">${time}</td>
        <td class="py-1.5 text-center">${bane}</td>
        <td class="py-1.5 pr-1 ${cls(home)}">${shortTeam(home)}</td>
        <td class="py-1.5 pr-3 ${cls(away)}">${shortTeam(away)}</td>
      </tr>`)
  })
  return `
    <details data-nr="${t.nr}" class="group border-t border-slate-100" ${state.open.has(t.nr) ? 'open' : ''}>
      <summary class="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-slate-600">
        Hele turneringsoppsettet
        <span class="transition group-open:rotate-180">▾</span>
      </summary>
      <table class="w-full text-xs">
        <thead class="text-left text-slate-500">
          <tr><th class="pl-3 font-medium">Tid</th><th class="text-center font-medium">Bane</th><th class="font-medium">Hjemme</th><th class="font-medium">Borte</th></tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      <p class="px-4 py-2 text-xs text-slate-500">Deltagende lag: ${t.teams.join(', ')}</p>
    </details>`
}

function tournamentCard(t, team, { highlight = false } = {}) {
  const theme = THEME[team.id]
  const until = daysUntil(t.date)
  const first = t.myGames[0].time
  return `
    <article class="overflow-hidden rounded-2xl bg-white shadow-sm ${highlight ? `border-l-8 ${theme.accent}` : ''}">
      <div class="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          ${highlight ? '<div class="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Neste turnering</div>' : ''}
          <h3 class="text-lg font-bold leading-tight">${highlight ? longDate(t.date) : shortDate(t.date)}</h3>
          <p class="text-sm text-slate-600">📍 ${t.place} · turnering ${t.nr}</p>
          <p class="text-xs text-slate-500">Første kamp ${first} · iskjøring ${t.iceBreak}</p>
        </div>
        ${until && !isOver(t) ? `<span class="shrink-0 rounded-full ${until === 'I dag' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'} px-3 py-1 text-xs font-bold">${until}</span>` : ''}
      </div>
      <ul class="divide-y divide-slate-100 border-t border-slate-100">
        ${t.myGames.map(g => gameRow(t, g, theme)).join('')}
      </ul>
      ${fullProgram(t, team.name)}
    </article>`
}

function kamperView(team) {
  const all = teamTournaments(team.name)
  const upcoming = all.filter(t => !isOver(t))
  const past = all.filter(isOver)
  const [next, ...rest] = upcoming
  return `
    <section class="space-y-4">
      ${next ? tournamentCard(next, team, { highlight: true }) : `<p class="rounded-2xl bg-white p-6 text-center text-slate-500">Ingen flere turneringer denne sesongen.</p>`}
      ${rest.length ? `<h2 class="px-1 pt-2 text-sm font-bold uppercase tracking-wider text-slate-500">Senere</h2>${rest.map(t => tournamentCard(t, team)).join('')}` : ''}
      ${past.length ? `
        <button id="toggle-past" class="w-full rounded-xl py-2 text-sm font-medium text-slate-500 hover:bg-slate-200">
          ${state.showPast ? 'Skjul' : 'Vis'} tidligere turneringer (${past.length})
        </button>
        ${state.showPast ? past.map(t => tournamentCard(t, team)).join('') : ''}` : ''}
      <button id="ics" class="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white shadow">
        📅 Legg kampene til ${team.name} i kalenderen
      </button>
    </section>`
}

function spillereView(team) {
  const sorted = [...team.players].sort((a, b) => (a.nr === null) - (b.nr === null) || Number(a.nr) - Number(b.nr))
  return `
    <section class="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div class="flex items-center gap-2 px-4 py-3">
        <span class="h-4 w-4 rounded-full ${THEME[team.id].dot}"></span>
        <h2 class="font-bold">${team.name}</h2>
        <span class="ml-auto text-sm text-slate-500">${team.players.length} spillere</span>
      </div>
      <ul class="divide-y divide-slate-100 border-t border-slate-100">
        ${sorted.map(p => `
          <li class="flex items-center gap-4 px-4 py-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${THEME[team.id].pill}">${p.nr ?? '–'}</span>
            <span class="text-base font-medium">${p.name}</span>
            ${p.note ? `<span class="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600" title="Keeperdrakt">🥅 ${p.note.replace('K ', 'nr ')}</span>` : ''}
          </li>`).join('')}
      </ul>
    </section>
    <p class="mt-3 px-1 text-xs text-slate-500">– = mangler draktnummer. 🥅 = nummer på keeperdrakt.</p>`
}

function iosHint() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches
  if (!ios || standalone || store.get('hideIosHint')) return ''
  return `
    <div class="relative rounded-2xl bg-sky-50 p-4 pr-10 text-sm text-sky-900 ring-1 ring-sky-200">
      <strong>Lag app på telefonen:</strong> trykk på Del-knappen <span aria-hidden="true">⎋</span> i Safari og velg «Legg til på Hjem-skjerm».
      <button id="hide-ios" class="absolute right-3 top-3 text-sky-700" aria-label="Lukk">✕</button>
    </div>`
}

function render() {
  const team = teams.find(t => t.id === state.team) || teams[0]
  document.querySelector('#app').innerHTML = `
    ${header()}
    <main class="mx-auto max-w-xl space-y-4 px-4 py-4">
      ${iosHint()}
      ${tabs()}
      ${state.tab === 'kamper' ? kamperView(team) : spillereView(team)}
      <footer class="pt-4 pb-8 text-center text-xs text-slate-400">
        Kilde: NIHF Region Innlandet og Romerike – turneringsoppsett U12 2026–2027
      </footer>
    </main>`
  if (deferredPrompt) document.querySelector('#install')?.classList.remove('hidden')
}

// ---------- hendelser ----------
let deferredPrompt = null

document.addEventListener('click', async e => {
  const el = e.target.closest('button')
  if (!el) return
  if (el.dataset.team) {
    state.team = el.dataset.team
    store.set('team', state.team)
    history.replaceState(null, '', `#${state.team}`)
    render()
  } else if (el.dataset.tab) {
    state.tab = el.dataset.tab
    render()
  } else if (el.id === 'toggle-past') {
    state.showPast = !state.showPast
    render()
  } else if (el.id === 'ics') {
    downloadIcs(teams.find(t => t.id === state.team))
  } else if (el.id === 'hide-ios') {
    store.set('hideIosHint', '1')
    render()
  } else if (el.id === 'install' && deferredPrompt) {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    render()
  }
})

document.addEventListener('toggle', e => {
  const nr = Number(e.target.dataset?.nr)
  if (!nr) return
  e.target.open ? state.open.add(nr) : state.open.delete(nr)
}, true)

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  deferredPrompt = e
  document.querySelector('#install')?.classList.remove('hidden')
})

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1)
  if (teams.some(t => t.id === id)) { state.team = id; render() }
})

// Oppdater «pågår»/ferdig-status hvert minutt, og når appen åpnes igjen
setInterval(render, 60000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) render() })

render()
