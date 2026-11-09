/* =========================================================
   Kamala Cinemas — booking flow + "view from your seat"
   Data below mirrors kamalacinemas.com / District (Ticketnew)
   listings captured on 9 Nov 2026. Replace with a live API later.
   ========================================================= */

import { Theater3D } from './theater3d.js';
import { initChat } from './chat.js';
import { createFlipCard } from './flipcard.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => Math.round(n * 100) / 100;
const rupee = (n) => '₹' + money(n).toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

/* ---------- Theatre ---------- */
const THEATRE = {
  name: 'Kamala Cinemas 4K RGB Laser Dolby',
  address: '156, Arcot Road, Vadapalani, Chennai, Tamil Nadu 600026',
  amenities: ['4K RGB Laser', 'Dolby 7.1', 'Sofa seating', 'Air conditioning', 'Food & Beverages', 'Metro nearby', 'Parking · 150 cars, 350 two-wheelers'],
  phone: '092822 00400', phoneHref: '+919282200400',
  maps: 'https://www.google.com/maps/search/?api=1&query=Kamala+Cinemas+Vadapalani+Chennai',
  instagram: 'https://www.instagram.com/kamalacinemas_vishnu/',
};

/* ---------- Now showing ---------- */
const MOVIES = [
  {
    id: 'ramayana', title: 'Ramayana', poster: 'assets/posters/ramayana.jpg',
    genre: 'Epic · Mythological', lang: 'Tamil', otherLangs: 'Also in Hindi, Telugu, Kannada',
    cert: 'U', dur: '3h 15m', released: '5 Nov 2026', director: 'Nitesh Tiwari',
    cast: 'Ranbir Kapoor, Yash, Sai Pallavi, Ravie Dubey', colors: ['#C50337', '#02060E'], tag: 'In 3D',
    trailer: 'IbX1Ap7E0XQ',   // Ramayana: Rise of a Legend — New Trailer (Tamil)
    blurb: 'Vishnu is born as Prince Rama to end the reign of the demon emperor Ravana — an exile, an abduction, and the greatest war ever fought.',
  },
  {
    id: 'scene', title: 'Scene', poster: 'assets/posters/scene.jpg',
    genre: 'Action · Comedy · Thriller', lang: 'Tamil', otherLangs: '',
    cert: 'UA16+', dur: '2h 29m', released: '6 Nov 2026', director: 'Jithu Madhavan',
    cast: 'Suriya, Nazriya Nazim, Naslen, Anandraj', colors: ['#C50337', '#02060E'], tag: 'Most shows',
    trailer: 'LM4ByXufv2w',   // Scene — Official Trailer (Sony Music South)
    blurb: 'Police officer Inbaraj reopens a case he never closed — this time with a chaotic, mismatched team along for the ride.',
  },
  {
    id: 'mookuthi', title: 'Mookuthi Amman 2', poster: 'assets/posters/mookuthi-amman-2.jpg',
    genre: 'Devotional · Thriller · Fantasy', lang: 'Tamil', otherLangs: '',
    cert: 'UA16+', dur: '2h 24m', released: '6 Nov 2026', director: 'Sundar C',
    cast: 'Nayanthara, Duniya Vijay, Regina Cassandra, Yogi Babu', colors: ['#C50337', '#02060E'], tag: 'New release',
    trailer: 'v263z3rTcLw',   // Mookuthi Amman 2 — World of Mahasakthi (Vels Film International)
    blurb: 'Goddess Mookuthi Amman returns across timelines to protect a young prince from a ruthless sorceress.',
  },
];
MOVIES.forEach((m) => { m.img = new Image(); m.img.src = m.poster; });

/* ---------- Coming soon (District's upcoming list for Chennai, 9 Nov 2026) ---------- */
const COMING_SOON = [
  { id: 'bhogi', title: 'Bhogi', poster: 'assets/posters/bhogi.jpg', lang: 'Telugu', genre: 'Period · Drama · Action', release: '2026-11-12',
    credits: 'Dir. Sampath Nandi · Sharwanand, Anupama Parameswaran, Dimple Hayathi',
    blurb: 'A period drama on the late-1960s Telangana–Maharashtra border, where buried truths surface amid conflict and change.' },
  { id: 'goat', title: 'G.O.A.T', poster: 'assets/posters/goat.jpg', lang: 'Telugu', genre: 'Action · Comedy · Drama', release: '2026-11-12', cert: 'UA16+',
    credits: 'Dir. Vedavyas Akula · Divya Bharathi, Sudigali Sudheer, Brahmaji',
    blurb: 'A sidelined legend is pulled back into the game by a crisis — and has to prove himself all over again.' },
  { id: 'bouma', title: 'Bouma', poster: 'assets/posters/bouma.jpg', lang: 'Malayalam', genre: 'Mystery · Thriller', release: '2026-11-12',
    credits: 'Dir. Rejin S. Babu · Dileesh Pothan, Vineeth Radhakrishnan, Aditi Balan',
    blurb: 'A singer returns to a lonely estate from her half-forgotten past just as women start going missing nearby.' },
  { id: 'jayannth', title: 'Jayannth & The Jingo Pen', poster: 'assets/posters/jayannth-jingo-pen.jpg', lang: 'Telugu', genre: 'Family · Drama', release: '2026-11-12',
    credits: 'Dir. Naveen Deshaboina · Tanikella Bharani, Satyam Rajesh, Ashish Gandhi',
    blurb: 'A boy who dreads maths gets a magic pen from his grandfather — and learns childhood is more than a report card.' },
  { id: 'aadi-anant', title: 'Aadi Anant', poster: 'assets/posters/aadi-anant.jpg', lang: 'Marathi', genre: 'Family · Drama', release: '2026-11-12',
    credits: 'Dir. Mahesh Limaye · Ashok Saraf, Sankarshan Karhade, Sakhi Gokhale',
    blurb: 'A warm story of two generations, their companionship and the memories they share.' },
  { id: 'super-gennie', title: 'Super Gennie', poster: 'assets/posters/super-gennie.jpg', lang: 'Gujarati', genre: 'Fantasy · Romance · Comedy', release: '2026-11-12',
    credits: 'Mukesh Suthar',
    blurb: 'A lonely Ahmedabad cab driver meets a genie with three wishes — then falls for Zara, and wishes may not be enough.' },
];
const REMIND_KEY = 'kamala-reminders';
const reminders = new Set((() => { try { return JSON.parse(localStorage.getItem(REMIND_KEY)) || []; } catch { return []; } })());
let soonLang = 'All';

/* ---------- Schedule (date → shows) ---------- */
const S1_DAY = (times) => times.map((time) => ({ movie: 'scene', time, screen: 'S1', fmt: '2D' }));
const SCHEDULE = {
  '2026-11-09': [
    { movie: 'scene', time: '03:00 PM', screen: 'S1', fmt: '2D', closed: true },
    { movie: 'mookuthi', time: '05:50 PM', screen: 'S2', fmt: '2D' },
    { movie: 'scene', time: '06:00 PM', screen: 'S1', fmt: '2D', closed: true },
    { movie: 'scene', time: '08:50 PM', screen: 'S2', fmt: '2D' },
    { movie: 'scene', time: '09:00 PM', screen: 'S1', fmt: '2D' },
    { movie: 'ramayana', time: '11:55 PM', screen: 'S2', fmt: '3D' },
    { movie: 'scene', time: '11:59 PM', screen: 'S1', fmt: '2D' },
  ],
  '2026-11-10': S1_DAY(['11:00 AM', '02:15 PM', '05:30 PM', '08:45 PM', '11:55 PM']),
  '2026-11-11': S1_DAY(['08:00 AM', '11:00 AM', '02:15 PM', '05:30 PM', '08:45 PM', '11:55 PM']),
};
const DATES = Object.keys(SCHEDULE).sort();

/* ---------- Auditoriums (exact layouts from District seat maps) ----------
   Rows are listed back-of-hall first, exactly as District shows them.
   S = seat · L/R = left/right half of a couple sofa · . = gap · null = walkway */
const CE_ROW_S1 = 'LRLRS..LRLRLRLRLRLRLRLRLR..SLRLR';
const EL_ROW_S1 = 'SSSSS..SSSSSSSSSSSSSSSSSS..SSSSS';
const EL_ROW_S2 = 'SSSSSSS...SSSSSSSSSSSSSSSSS...SSSSSSS';
const EL_ROW_S2b = '.SSSSSS...SSSSSSSSSSSSSSSSS...SSSSSS';
const rowsOf = (letters, cells) => letters.split('').map((r) => [r, cells]);

const AREA_COLORS = { LG1: '#F07A97', LG2: '#F07A97', CE: 'var(--kamala-silver)', EL: '#F3F5F9', BU: '#8F96A3' };
const SCREENS = {
  S1: {
    name: 'Screen 1', tech: '4K RGB Laser · Dolby 7.1',
    areas: [
      { code: 'LG1', name: 'Couple Seat Lounge 1', price: 183.8, rows: [['A', 'SLRLRLRLRLR'], ['B', 'LRLRLRLRLR']] },
      { code: 'LG2', name: 'Couple Seat Lounge 2', price: 183.8, rows: [['C', 'LRLRLRLRLRS'], ['D', 'LRLRLRLRLR']] },
      { code: 'CE', name: 'Couple Seat Elite', price: 183.8, rows: rowsOf('ABC', CE_ROW_S1) },
      { code: 'EL', name: 'Elite', price: 183.8, rows: [...rowsOf('DEFGHI', EL_ROW_S1), ['J', CE_ROW_S1], null, ...rowsOf('KLMNOPQRS', EL_ROW_S1)] },
      { code: 'BU', name: 'Budget', price: 54.35, rows: [['T', 'SSSSSS.SSSSSSSSSSSSSSSSSSSS.SSSSSS']] },
    ],
  },
  S2: {
    name: 'Screen 2', tech: '4K RGB Laser · Dolby 7.1',
    areas: [
      { code: 'LG1', name: 'Couple Seat Lounge 1', price: 183.8, rows: [['A', 'LRLRLRLR'], ['B', 'LRLRLRLRS']] },
      { code: 'LG2', name: 'Couple Seat Lounge 2', price: 183.8, rows: [['C', 'LRLRLRLR'], ['D', 'SLRLRLRLR']] },
      { code: 'CE', name: 'Couple Seat Elite', price: 183.8, rows: [['A', '...LRLRLRLRLRLRLRLRLRLRLRLRLRLRLR']] },
      { code: 'EL', name: 'Elite', price: 183.8, rows: [['A', 'S.S................................S'], ...rowsOf('BCD', EL_ROW_S2), ...rowsOf('EFGHI', EL_ROW_S2b), ['J', '....SSS...SSSSSSSSSSSSSSSSS...SSS']] },
      { code: 'BU', name: 'Budget', price: 54.35, rows: [['K', '....SSS..........................SSS']] },
    ],
  },
};

/* ---------- Build 3D hall geometry + seat index for a screen ---------- */
const PITCH = 0.56, EYE = 1.15, RISE = 0.36, FIRST_Z = 4.6;   // steep stadium rise: you see over the high-back seat in front
function buildHall(screenId) {
  const sc = SCREENS[screenId];
  const listing = [];
  sc.areas.forEach((area) => area.rows.forEach((r) => listing.push(r ? { area, rowId: r[0], cells: r[1] } : { gap: true })));
  const cols = Math.max(...listing.filter((r) => !r.gap).map((r) => r.cells.length));
  const front = listing.slice().reverse();            // nearest the screen first
  const seats = new Map();
  const rows = [];
  let z = FIRST_Z, floor = 0, prev = null;
  front.forEach((r) => {
    if (prev) {
      z += r.gap || prev.gap ? 0.75 : /[LR]/.test(r.cells) ? 1.15 : 0.95;
      floor += r.gap ? 0 : RISE;
    }
    prev = r;
    if (r.gap) return;
    const row = { z, floor, area: r.area, rowId: r.rowId, seats: [], index: rows.length };
    let n = 0;
    [...r.cells].forEach((ch, c) => {
      if (ch === '.') return;
      n++;
      const id = `${r.area.code}-${r.rowId}${n}`;
      const seat = { id, label: r.rowId + n, area: r.area, type: ch, x: (c - (cols - 1) / 2) * PITCH, y: floor + EYE, z, rowIndex: row.index };
      if (ch === 'R') { const left = row.seats[row.seats.length - 1]; seat.partner = left.id; left.partner = id; }
      row.seats.push(seat);
      seats.set(id, seat);
    });
    rows.push(row);
  });
  const hallW = cols * PITCH;
  const screenW = Math.min(hallW * 0.82, 16.5);
  const screenH = screenW / 2.3;
  const midEye = rows[Math.floor(rows.length / 2)].floor + EYE;
  const screenBottom = Math.max(1.5, midEye - screenH * 0.38);
  return {
    id: screenId, cols, rows, seats, screen: sc,
    wallX: hallW / 2 + 1.2,
    // stadium halls mount the screen high so back rows look over the high-back seats in front
    screenW, screenH, screenBottom, screenCentreY: screenBottom + screenH / 2,
    ceiling: Math.max(11, floor + 6, screenBottom + screenH + 3),
    backZ: z + 1.5,
    floorAt(zz) { let f = 0; for (const rw of rows) if (rw.z - 0.5 <= zz) f = rw.floor; return f; },
  };
}
const HALLS = { S1: buildHall('S1'), S2: buildHall('S2') };
Object.values(HALLS).forEach((h) => { h.screen.capacity = h.seats.size; });

/* ---------- State ---------- */
const MAX_SEATS = 10;
const FEE_PER_TICKET = 25;          // placeholder until real fee rules are known
const state = { step: 'movies', movie: null, date: DATES[0], show: null, hall: null, selected: [], occupied: new Set() };

/* ---------- Deterministic fake occupancy per show ---------- */
function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const showKey = (date, s) => `${date}|${s.movie}|${s.time}|${s.screen}`;
function occupancyFor(date, show) {
  const hall = HALLS[show.screen];
  const r = rng(showKey(date, show));
  const base = 0.05 + r() * 0.35;
  const set = new Set();
  hall.seats.forEach((s) => {
    if (s.type === 'R') { if (set.has(s.partner)) set.add(s.id); return; }
    const centre = 1 - Math.min(1, Math.abs(s.x) / (hall.cols * PITCH / 2));
    const cheap = s.area.code === 'BU' ? 0.2 : 0;
    if (r() < base + centre * 0.2 + cheap) set.add(s.id);
  });
  return set;
}

/* ---------- Dates ---------- */
const dateObj = (iso) => new Date(iso + 'T00:00:00');
const dateLabel = (iso) => dateObj(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const toMin = (t) => { const [hm, ap] = t.split(' '); let [h, m] = hm.split(':').map(Number); if (ap === 'PM' && h !== 12) h += 12; if (ap === 'AM' && h === 12) h = 0; return h * 60 + m; };

/* ---------- Navigation ---------- */
function go(step) {
  if (step === 'shows' && !state.movie) step = 'movies';
  if (step === 'seats' && !state.show) step = state.movie ? 'shows' : 'movies';
  if (step === 'checkout' && !state.selected.length) step = 'seats';
  const prev = state.step;
  state.step = step;
  document.body.dataset.step = step;
  if (step === 'checkout' && prev !== 'checkout') startHold();
  if (step !== 'checkout') stopHold();
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + step));
  document.body.classList.toggle('immersive', step === 'seats');
  if (step === 'seats') theater.start(); else theater.stop();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go]');
  if (t) { e.preventDefault(); go(t.dataset.go); return; }
  if (e.target.closest('[data-foot-top]')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const jump = e.target.closest('[data-foot-jump]');
  if (jump) {
    const elsewhere = state.step !== 'movies';
    if (elsewhere) go('movies');
    $('#' + jump.dataset.footJump).scrollIntoView({ behavior: elsewhere ? 'instant' : 'smooth', block: 'start' });
  }
});

/* ---------- Step 1: the lobby ---------- */
const showsFor = (movieId, date) => (SCHEDULE[date] || []).filter((s) => s.movie === movieId).sort((a, b) => toMin(a.time) - toMin(b.time));
const firstDateFor = (id) => DATES.find((d) => showsFor(id, d).some((s) => !s.closed)) || DATES[0];
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const shortDay = (iso) => (iso === todayISO() ? 'Today' : dateObj(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
const splitTime = (t) => t.split(' ');

function renderMovies() {
  renderLobby();
  $('#movieGrid').innerHTML = MOVIES.map((m) => {
    const d = firstDateFor(m.id);
    const shows = showsFor(m.id, d);
    return `
    <article class="today-card" style="--accent:${m.colors[0]}">
      <button class="tc-poster" data-movie="${m.id}" data-tilt aria-label="${m.title}: all showtimes">
        <img src="${m.poster}" alt="" loading="lazy"><span class="shine"></span>
        <span class="cert">${m.cert}</span>
      </button>
      <div class="tc-body">
        <div class="tc-top"><h3>${m.title}</h3><button class="play-mini" data-trailer="${m.id}" aria-label="Play the ${m.title} trailer">▶</button></div>
        <div class="g">${m.genre} · ${m.lang} · ${m.dur}</div>
        <div class="tc-day">${shortDay(d)}</div>
        <div class="tc-times">${shows.map((s, i) => s.closed
          ? `<span class="tc-time off">${s.time}<small>Closed</small></span>`
          : `<button class="tc-time" data-quick="${m.id}|${d}|${i}">${s.time}<small>${SCREENS[s.screen].name}${s.fmt === '3D' ? ' · 3D' : ''}</small></button>`).join('')}</div>
        <button class="tc-all" data-movie="${m.id}">All dates &amp; times →</button>
      </div>
    </article>`;
  }).join('');
  renderComingSoon();
  $('#theatreInfo').innerHTML = `
    <span class="flip-card__shadow" aria-hidden="true"></span>
    <div class="flip-card__rotor">
      <section class="flip-card__face flip-card__face--front ti-face">
        <h2 class="ti-title">About the theatre</h2>
        <div class="ti-row">
          <p class="ti-place"><b>${THEATRE.name}</b>${THEATRE.address}</p>
          <div class="ti-chips">${THEATRE.amenities.map((a) => `<span>${a}</span>`).join('')}</div>
        </div>
        <button type="button" class="ti-flip" data-flip>See the screens <i aria-hidden="true">↻</i></button>
        <span class="flip-card__glare" aria-hidden="true"></span>
      </section>
      <section class="flip-card__face flip-card__face--back ti-face">
        <h2 class="ti-title">The screens</h2>
        <div class="ti-screens">
          ${Object.values(SCREENS).map((s) => `
            <div class="ti-screen">
              <b>${s.name}</b>
              <strong>${s.capacity} seats</strong>
              <span>${s.tech}</span>
              <small>${s.areas.map((a) => a.name).join(' · ')}</small>
            </div>`).join('')}
        </div>
        <button type="button" class="ti-flip" data-flip>Back to the theatre <i aria-hidden="true">↻</i></button>
        <span class="flip-card__glare" aria-hidden="true"></span>
      </section>
    </div>`;
  createFlipCard($('#theatreInfo'));
  $('#footInfo').innerHTML = `
    <p class="foot-tag">See the screen from your seat before you book.</p>
    <div class="foot-col">
      <div>
        <h2>Visit</h2>
        <p>156, Arcot Road, Vadapalani<br>Chennai, Tamil Nadu 600026</p>
        <a class="foot-cta" href="${THEATRE.maps}" target="_blank" rel="noopener">Get directions ↗</a>
      </div>
    </div>
    <div class="foot-col">
      <div>
        <h2>Call</h2>
        <p><a href="tel:${THEATRE.phoneHref}">${THEATRE.phone}</a></p>
      </div>
      <div>
        <h2>Follow</h2>
        <p><a href="${THEATRE.instagram}" target="_blank" rel="noopener">Instagram ↗</a></p>
      </div>
    </div>
    <div class="foot-col">
      <div>
        <h2>Explore</h2>
        <ul>
          <li><button type="button" data-foot-jump="nowShowing">Today at Kamala</button></li>
          <li><button type="button" data-foot-jump="comingSoon">Coming soon</button></li>
          <li><button type="button" data-foot-jump="theatreInfo">About the theatre</button></li>
        </ul>
      </div>
    </div>`;
  initTilt();
}

/* Coverflow carousel of now-showing posters */
let cf = 0, cfTimer = null;
let lobbyInView = true;     // only auto-advance while the lobby is actually on screen
function renderLobby() {
  $('#coverflow').innerHTML = MOVIES.map((m, i) => `
    <div class="cf-card" data-cf="${i}" role="group" aria-roledescription="slide" aria-label="${m.title}">
      <div class="cf-face" data-tilt><img src="${m.poster}" alt="${m.title} poster"><span class="shine"></span><span class="cf-cta">Book ${m.title}</span></div>
      <div class="cf-reflect" style="background-image:url('${m.poster}')"></div>
    </div>`).join('');
  $('#cfDots').innerHTML = MOVIES.map((m, i) => `<button data-cfdot="${i}" aria-label="Show ${m.title}"></button>`).join('');
  // every film's details are rendered once and stacked in the same spot, so switching films
  // never changes the lobby's height (no jumping while you scroll)
  $('#lobbyInfo').innerHTML = MOVIES.map((m, i) => {
    const d = firstDateFor(m.id);
    const next = showsFor(m.id, d).filter((s) => !s.closed).slice(0, 4);
    return `<div class="li-slide" data-slide="${i}">
      <span class="lobby-kicker">Now showing at Kamala · ${m.tag}</span>
      <h1 class="lobby-title">${m.title}</h1>
      <p class="lobby-meta"><span class="cert-pill">${m.cert}</span>${m.genre} · ${m.lang} · ${m.dur}</p>
      <p class="lobby-blurb">${m.blurb}</p>
      <p class="lobby-credits">Dir. ${m.director} · ${m.cast}</p>
      <div class="lobby-next"><span>${shortDay(d)}</span>${next.map((s) => `<b>${s.time}</b>`).join('')}</div>
      <div class="lobby-cta">
        <button class="btn primary" data-movie="${m.id}">Book tickets</button>
        <button class="btn ghost" data-trailer="${m.id}">▶ Watch trailer</button>
      </div>
    </div>`;
  }).join('');
  setCf(cf);
  startCfTimer();
}
function setCf(i) {
  const n = MOVIES.length;
  cf = (i + n) % n;
  const narrow = window.innerWidth < 720;
  $$('.cf-card').forEach((c, j) => {
    let d = j - cf;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    const a = Math.abs(d);
    c.style.transform = `translateX(${d * (narrow ? 52 : 60)}%) translateZ(${-a * 240}px) rotateY(${-d * 44}deg)`;
    c.style.zIndex = 10 - a;
    c.style.opacity = a > 1 ? 0 : a ? 0.75 : 1;
    c.classList.toggle('active', d === 0);
  });
  $$('[data-cfdot]').forEach((b, j) => b.classList.toggle('on', j === cf));
  $$('.li-slide').forEach((s, j) => {
    const on = j === cf;
    s.classList.toggle('on', on);
    s.setAttribute('aria-hidden', String(!on));
    s.inert = !on;
  });
  const m = MOVIES[cf];
  const bg = $('#lobbyBg');
  const layer = document.createElement('div');
  layer.className = 'lb-layer';
  layer.style.backgroundImage = `url('${m.poster}')`;
  bg.appendChild(layer);
  requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('in')));
  while (bg.children.length > 2) bg.firstElementChild.remove();
  $('#lobby').style.setProperty('--accent', m.colors[0]);
}
const CF_INTERVAL = 3000;
// hold the current film only while the pointer is on something clickable for it
const CF_HOLD = '.cf-card.active:hover, .cf-nav:hover, .li-slide.on .lobby-cta:hover';
function startCfTimer() {
  clearInterval(cfTimer);
  cfTimer = setInterval(() => {
    if (lobbyInView && state.step === 'movies' && !document.hidden && !$('#lobby').querySelector(CF_HOLD) && $('#trailerModal').hidden) setCf(cf + 1);
  }, CF_INTERVAL);
}
// pause the carousel + its animations whenever the lobby isn't on screen
new IntersectionObserver(([e]) => {
  lobbyInView = e.intersectionRatio >= 0.55;
  $('#lobby').classList.toggle('paused', !e.isIntersecting);
}, { threshold: [0, 0.55] }).observe($('#lobby'));
let cfDown = null, cfSwiped = false;
$('#coverflow').addEventListener('click', (e) => {
  const c = e.target.closest('.cf-card');
  if (!c || cfSwiped) return;
  if (c.classList.contains('active')) selectMovie(MOVIES[cf].id);
  else { startCfTimer(); setCf(+c.dataset.cf); }
});
$('#cfPrev').addEventListener('click', () => { startCfTimer(); setCf(cf - 1); });
$('#cfNext').addEventListener('click', () => { startCfTimer(); setCf(cf + 1); });
$('#cfDots').addEventListener('click', (e) => { const b = e.target.closest('[data-cfdot]'); if (b) { startCfTimer(); setCf(+b.dataset.cfdot); } });
$('#coverflow').addEventListener('pointerdown', (e) => { cfDown = e.clientX; cfSwiped = false; });
$('#coverflow').addEventListener('pointerup', (e) => {
  if (cfDown === null) return;
  const dx = e.clientX - cfDown;
  cfDown = null;
  if (Math.abs(dx) > 40) { cfSwiped = true; startCfTimer(); setCf(cf + (dx < 0 ? 1 : -1)); setTimeout(() => { cfSwiped = false; }, 0); }
});
document.addEventListener('keydown', (e) => {
  if (state.step !== 'movies' || e.target.closest?.('input, textarea') || !$('#trailerModal').hidden) return;
  if (e.key === 'ArrowLeft') { startCfTimer(); setCf(cf - 1); }
  if (e.key === 'ArrowRight') { startCfTimer(); setCf(cf + 1); }
});
window.addEventListener('resize', () => { if (state.step === 'movies') setCf(cf); });

/* 3D tilt + glare on posters (mouse only, respects reduced motion) */
function initTilt(root = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return;
  $$('[data-tilt]', root).forEach((el) => {
    if (el._tilt) return;
    el._tilt = true;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
      el.style.setProperty('--ry', ((x - 0.5) * 18).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      el.classList.add('tilting');
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.classList.remove('tilting');
    });
  });
}

/* Trailer modal */
function openTrailer(id) {
  const m = MOVIES.find((x) => x.id === id);
  if (!m || !m.trailer) return;
  $('#trailerTitle').textContent = m.title;
  $('#trailerMeta').textContent = `${m.cert} · ${m.genre} · ${m.lang}`;
  $('#trailerFrame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${m.trailer}?autoplay=1&rel=0&modestbranding=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${m.title} trailer"></iframe>`;
  $('#trailerBook').dataset.movie = m.id;
  $('#trailerModal').hidden = false;
  document.body.classList.add('modal-open');
  $('#trailerModal .modal-x').focus();
}
function closeTrailer() {
  $('#trailerModal').hidden = true;
  $('#trailerFrame').innerHTML = '';
  document.body.classList.remove('modal-open');
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-trailer]');
  if (t) { e.preventDefault(); e.stopPropagation(); openTrailer(t.dataset.trailer); return; }
  if (e.target.closest('.modal-x') || e.target.id === 'trailerModal' || e.target.closest('#trailerBook')) closeTrailer();
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#trailerModal').hidden) closeTrailer(); });

function renderComingSoon() {
  const langs = ['All', ...new Set(COMING_SOON.map((m) => m.lang))];
  $('#soonFilters').innerHTML = langs.map((l) =>
    `<button role="tab" aria-selected="${l === soonLang}" class="soon-filter${l === soonLang ? ' active' : ''}" data-lang="${l}">${l}</button>`).join('');
  const list = COMING_SOON.filter((m) => soonLang === 'All' || m.lang === soonLang);
  $('#soonRow').innerHTML = list.map((m) => {
    const d = dateObj(m.release);
    const on = reminders.has(m.id);
    return `
    <article class="soon-card">
      <div class="soon-poster">
        <img src="${m.poster}" alt="${m.title} poster" loading="lazy">
        <span class="soon-date"><b>${d.getDate()}</b>${d.toLocaleDateString('en-IN', { month: 'short' })}</span>
        <div class="soon-blurb"><p>${m.blurb}</p><small>${m.credits}</small></div>
      </div>
      <div class="soon-meta">
        <h3>${m.title}</h3>
        <div class="g">${m.lang}${m.cert ? ' · ' + m.cert : ''} · ${m.genre}</div>
        <div class="l">Releases ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
        <button class="remind${on ? ' on' : ''}" data-remind="${m.id}" aria-pressed="${on}">${on ? '✓ Reminder set' : '🔔 Remind me'}</button>
      </div>
    </article>`;
  }).join('');
  syncSoonRail();
}
$('#soonFilters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  soonLang = b.dataset.lang;
  renderComingSoon();
});
$('#soonRow').addEventListener('click', (e) => {
  const b = e.target.closest('[data-remind]');
  if (!b) return;
  const id = b.dataset.remind;
  reminders.has(id) ? reminders.delete(id) : reminders.add(id);
  try { localStorage.setItem(REMIND_KEY, JSON.stringify([...reminders])); } catch {}
  renderComingSoon();
});

/* Glass scrubber for the Coming Soon row */
function syncSoonRail() {
  const row = $('#soonRow'), rail = $('#soonRail'), thumb = $('#soonThumb');
  const overflow = row.scrollWidth - row.clientWidth;
  rail.hidden = overflow <= 1;
  if (rail.hidden) return;
  const full = rail.clientWidth;
  const w = Math.max(72, Math.min(full * 0.3, full * row.clientWidth / row.scrollWidth));
  thumb.style.width = `${w}px`;
  thumb.style.transform = `translate3d(${(full - w) * (row.scrollLeft / overflow)}px, 0, 0)`;
}
$('#soonRow').addEventListener('scroll', syncSoonRail, { passive: true });
new ResizeObserver(syncSoonRail).observe($('#soonRow'));
$('#soonRail').addEventListener('pointerdown', (e) => {
  const row = $('#soonRow'), rail = $('#soonRail'), thumb = $('#soonThumb');
  const box = rail.getBoundingClientRect(), t = thumb.getBoundingClientRect();
  const grab = e.target === thumb ? e.clientX - t.left : t.width / 2;
  const travel = box.width - t.width;
  const move = (ev) => {
    const x = Math.min(travel, Math.max(0, ev.clientX - box.left - grab));
    row.scrollLeft = (x / travel) * (row.scrollWidth - row.clientWidth);
  };
  const end = () => {
    rail.removeEventListener('pointermove', move);
    rail.removeEventListener('pointerup', end);
    rail.removeEventListener('pointercancel', end);
    row.style.scrollSnapType = '';           // let the row settle on a card again
    thumb.classList.remove('dragging');
  };
  row.style.scrollSnapType = 'none';         // snapping would fight the drag
  thumb.classList.add('dragging');
  rail.setPointerCapture(e.pointerId);
  rail.addEventListener('pointermove', move);
  rail.addEventListener('pointerup', end);
  rail.addEventListener('pointercancel', end);
  move(e);
});
liquidGlass($('.topbar'), { scale: -80, chroma: 5, border: 0.1, mapBlur: 9, blur: 7, saturate: 1.6 });
liquidGlass($('#soonThumb'), { scale: -70, chroma: 5, border: 0.12, mapBlur: 6, blur: 0.6, saturate: 1.4 });

function selectMovie(id) {
  state.movie = MOVIES.find((m) => m.id === id);
  state.show = null;
  state.date = firstDateFor(id);
  renderShows();
  go('shows');
}
function startShow(movie, date, show) {
  Object.assign(state, { movie, date, show, hall: HALLS[show.screen], selected: [], occupied: occupancyFor(date, show) });
  renderShows();
  renderSeats();
  go('seats');
}
document.addEventListener('click', (e) => {
  const q = e.target.closest('[data-quick]');
  if (q) {
    const [id, d, i] = q.dataset.quick.split('|');
    startShow(MOVIES.find((m) => m.id === id), d, showsFor(id, d)[+i]);
    return;
  }
  const b = e.target.closest('[data-movie]');
  if (b && !b.closest('.cf-card')) selectMovie(b.dataset.movie);
});

/* ---------- Step 2: showtimes ---------- */
function renderShows() {
  const m = state.movie;
  $('#showBg').style.backgroundImage = `url('${m.poster}')`;
  $('#showHero').style.setProperty('--accent', m.colors[0]);
  $('#showPoster').innerHTML = `<img src="${m.poster}" alt="${m.title} poster"><span class="shine"></span>
    <button class="poster-play" data-trailer="${m.id}" aria-label="Play the ${m.title} trailer"><span>▶</span>Trailer</button>`;
  $('#showHead').innerHTML = `
    <span class="lobby-kicker">${m.tag} · Released ${m.released}</span>
    <h1 class="show-title">${m.title}</h1>
    <p class="lobby-meta"><span class="cert-pill">${m.cert}</span>${m.genre} · ${m.lang} · ${m.dur}</p>
    <p class="lobby-blurb">${m.blurb}</p>
    <dl class="credits-dl">
      <div><dt>Director</dt><dd>${m.director}</dd></div>
      <div><dt>Cast</dt><dd>${m.cast}</dd></div>
      ${m.otherLangs ? `<div><dt>Languages</dt><dd>${m.lang}. ${m.otherLangs}</dd></div>` : ''}
    </dl>`;
  $('#dates').innerHTML = DATES.map((d) => {
    const n = showsFor(m.id, d).filter((s) => !s.closed).length;
    const dt = dateObj(d);
    return `<button class="stub ${d === state.date ? 'active' : ''}" data-date="${d}" ${n ? '' : 'disabled'}>
      <span class="stub-day">${d === todayISO() ? 'Today' : dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
      <b>${dt.getDate()}</b>
      <span class="stub-mon">${dt.toLocaleDateString('en-IN', { month: 'short' })}</span>
      <span class="stub-count">${n ? `${n} show${n > 1 ? 's' : ''}` : 'No shows'}</span>
    </button>`;
  }).join('');
  const shows = showsFor(m.id, state.date);
  const groups = {};
  shows.forEach((s, i) => (groups[s.screen] ||= []).push([s, i]));
  $('#times').innerHTML = shows.length ? Object.entries(groups).map(([sid, list]) => {
    const sc = SCREENS[sid];
    return `<div class="screen-group">
      <div class="sg-head"><span class="sg-icon" aria-hidden="true"></span><div><b>${sc.name}</b><small>${sc.capacity} seats · ${sc.tech} · ${sc.areas.length} seat classes</small></div></div>
      <div class="sg-times">${list.map(([s, i]) => ticketBtn(s, i)).join('')}</div>
    </div>`;
  }).join('') : '<p class="muted">No shows for this movie on this date.</p>';
  initTilt($('#view-shows'));
}
function ticketBtn(s, i) {
  const [hm, ap] = splitTime(s.time);
  if (s.closed) return `<div class="tkt off"><span class="tkt-time">${hm}<small>${ap}</small></span><span class="tkt-info"><span class="tkt-fmt">${s.fmt}</span><span class="tkt-left">No tickets available</span></span><span class="tkt-stub">CLOSED</span></div>`;
  const hall = HALLS[s.screen];
  const occ = occupancyFor(state.date, s).size;
  const pct = occ / hall.seats.size;
  const cls = pct > 0.75 ? 'hot' : pct > 0.5 ? 'mid' : 'ok';
  const label = pct > 0.75 ? 'Almost full' : pct > 0.5 ? 'Filling fast' : 'Available';
  return `<button class="tkt ${cls}" data-show="${i}" data-tilt>
    <span class="tkt-time">${hm}<small>${ap}</small></span>
    <span class="tkt-info">
      <span class="tkt-fmt">${s.fmt}${s.fmt === '3D' ? ' <em>3D glasses provided</em>' : ''}</span>
      <span class="tkt-bar" title="${Math.round(pct * 100)}% booked"><i style="width:${Math.round(pct * 100)}%"></i></span>
      <span class="tkt-left">${label} · ${hall.seats.size - occ} seats left</span>
    </span>
    <span class="tkt-stub">ENTER<br>HALL</span>
  </button>`;
}
$('#dates').addEventListener('click', (e) => {
  const b = e.target.closest('[data-date]');
  if (!b || b.disabled) return;
  state.date = b.dataset.date;
  renderShows();
});
$('#times').addEventListener('click', (e) => {
  const b = e.target.closest('[data-show]');
  if (!b || b.classList.contains('torn')) return;
  b.classList.add('torn');                       // tear the ticket stub, then walk into the hall
  const show = showsFor(state.movie.id, state.date)[+b.dataset.show];
  setTimeout(() => startShow(state.movie, state.date, show), 420);
});

/* ---------- Step 3: seats — full seat map, tap to fly into the seat (mobile first) ---------- */
const stage = $('#stage');
let soundOn = false;
let viewing = null;              // seat being previewed in 3D
let mapSeats = [];               // [{ id, cx, cy, el }]

const theater = new Theater3D(stage, {
  onHover: () => {},
  onSeatClick: (id) => { if (theater.mode === 'seat' && id !== theater.current) previewSeat(id, true); },
  onMode: (mode) => {
    if (mode === 'seat') {
      $('#sheet').classList.add('up');
      $('#svHint').classList.add('show');
      setTimeout(() => $('#svHint').classList.remove('show'), 2600);
    }
  },
});
window.__kamala = { state, HALLS, theater };   // handy for debugging in the console

const AREA_KIND = { LG1: 'cp', LG2: 'cp', CE: 'cp', EL: 'av', BU: 'bu' };
const MAP_Z = 0.6;   // squash depth a little so the whole hall fits a phone screen

function renderSeats() {
  const m = state.movie, sc = state.hall.screen;
  $('#spTitle').textContent = m.title;
  $('#spSub').textContent = `${sc.name} · ${dateLabel(state.date)} · ${state.show.fmt}`;
  $('#spTimes').innerHTML = showsFor(m.id, state.date).map((s, i) => (s.closed ? '' :
    `<button class="pill${s === state.show ? ' on' : ''}" data-pill="${i}" role="tab" aria-selected="${s === state.show}">${s.time}<small>${SCREENS[s.screen].name}${s.fmt === '3D' ? ' · 3D' : ''}</small></button>`)).join('');
  const prices = [...new Set(sc.areas.map((a) => a.price))].sort((a, b) => b - a);
  $('.sp-legend .lg-bu').parentElement.lastChild.textContent = `Budget ${rupee(prices[prices.length - 1])}`;
  $('.sp-legend .lg-av').parentElement.lastChild.textContent = `Available ${rupee(prices[0])}`;
  viewing = null;
  $('#stageLoader').hidden = true;                  // the 2D map is the first screen — show it straight away
  showMap(true);
  $('#sheet').classList.remove('up');
  setSound(false);
  updateBar();
  requestAnimationFrame(() => { buildMap(); });      // after layout so the map can size itself
  // build the heavier 3D hall just after the map is on screen
  clearTimeout(hallBuildT);
  hallBuildT = setTimeout(ensureHall, 120);
}
$('#spTimes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pill]');
  if (!b || b.classList.contains('on')) return;
  startShow(state.movie, state.date, showsFor(state.movie.id, state.date)[+b.dataset.pill]);
});

/* Top-view seat map — true hall geometry, every seat visible */
function buildMap() {
  const hall = state.hall;
  const all = [...hall.seats.values()];
  const xs = all.map((s) => s.x);
  const lab = 0.8;
  const minX = Math.min(...xs) - PITCH / 2, maxX = Math.max(...xs) + PITCH / 2;
  const z0 = hall.rows[0].z;
  const W = maxX - minX + lab * 2;
  // stretch rows to use the phone's height (bigger tap targets), within sensible limits
  const box = $('#spMap');
  const depth = hall.rows[hall.rows.length - 1].z - z0;
  const fitZ = box.clientWidth > 0 ? ((box.clientHeight - 12) / box.clientWidth) * W / (depth + 1.2) : MAP_Z;
  const zk = Math.max(MAP_Z, Math.min(1.25, fitZ));
  const sh = Math.min(0.62, 0.4 * zk / MAP_Z * 0.8);
  const H = depth * zk + 0.8;
  const ox = lab - minX;
  let g = '';
  mapSeats = [];
  hall.rows.forEach((r, ri) => {
    const y = (r.z - z0) * zk + 0.4;
    const prev = hall.rows[ri - 1];
    if (prev && prev.area !== r.area) g += `<line class="area-line" x1="${lab}" x2="${W - lab}" y1="${(y - 0.36).toFixed(3)}" y2="${(y - 0.36).toFixed(3)}"/>`;
    g += `<text class="rl" x="${lab * 0.42}" y="${(y + 0.12).toFixed(3)}">${r.rowId}</text><text class="rl" x="${(W - lab * 0.42).toFixed(3)}" y="${(y + 0.12).toFixed(3)}">${r.rowId}</text>`;
    r.seats.forEach((s) => {
      const couple = s.type !== 'S';
      const w = couple ? PITCH * 0.97 : PITCH * 0.74;
      const shift = s.type === 'L' ? (PITCH - w) / 2 : s.type === 'R' ? -(PITCH - w) / 2 : 0;
      const cx = s.x + ox + shift;
      const kind = state.occupied.has(s.id) ? 'tk' : AREA_KIND[s.area.code];
      const rad = couple ? 0.12 : 0.1;
      g += `<rect class="st ${kind}${couple ? ' cpl ' + s.type : ''}" data-id="${s.id}" x="${(cx - w / 2).toFixed(3)}" y="${(y - sh / 2).toFixed(3)}" width="${w.toFixed(3)}" height="${sh.toFixed(3)}" rx="${rad}"/>`;
      mapSeats.push({ id: s.id, cx: s.x + ox, cy: y });
    });
  });
  $('#spMap').innerHTML = `<svg id="spSvg" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}" preserveAspectRatio="xMidYMin meet">${g}<g id="spFx"></g></svg>`;
  const svg = $('#spSvg');
  mapSeats.forEach((m) => { m.el = svg.querySelector(`[data-id="${m.id}"]`); });
  refreshMap();
}
function refreshMap() {
  const sel = new Set(state.selected);
  mapSeats.forEach((m) => {
    m.el.classList.toggle('sel', sel.has(m.id));
    m.el.classList.toggle('cur', m.id === viewing);
  });
}
function nearestSeat(clientX, clientY) {
  const svg = $('#spSvg');
  if (!svg) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let best = null, bd = 0.55;            // generous tap radius for small phone seats
  mapSeats.forEach((m) => {
    const d = Math.hypot(m.cx - p.x, (m.cy - p.y) * 1.2);
    if (d < bd) { bd = d; best = m; }
  });
  return best && { ...best, px: p.x, py: p.y };
}
let mapDown = null;
$('#spMap').addEventListener('pointerdown', (e) => { mapDown = { x: e.clientX, y: e.clientY }; });
$('#spMap').addEventListener('pointerup', (e) => {
  if (!mapDown || Math.hypot(e.clientX - mapDown.x, e.clientY - mapDown.y) > 10) { mapDown = null; return; }
  mapDown = null;
  const hit = nearestSeat(e.clientX, e.clientY);
  if (!hit) return;
  const fx = $('#spFx');
  fx.insertAdjacentHTML('beforeend', `<circle class="ripple" cx="${hit.cx}" cy="${hit.cy}" r="0.3"/>`);
  setTimeout(() => fx.firstElementChild?.remove(), 600);
  const seat = state.hall.seats.get(hit.id);
  if (state.occupied.has(hit.id)) { toast(`${seat.label} is already taken`); return; }
  previewSeat(hit.id);
});

let mapResizeT = null;
window.addEventListener('resize', () => { if (state.step === 'seats' && state.hall) { clearTimeout(mapResizeT); mapResizeT = setTimeout(buildMap, 150); } });
function showMap(on) {
  $('#seatpick').classList.toggle('out', !on);
  $('#seatview').hidden = on;
}

let hallBuildT = null;
function ensureHall() {
  clearTimeout(hallBuildT);
  if (theater.hall === state.hall && theater.movie === state.movie && theater._show === state.show) return;
  theater.setStates(state.occupied, state.selected);
  theater.setHall(state.hall, state.movie, state.movie.trailer);
  theater._show = state.show;
}
function previewSeat(id, fromSeat = false) {
  ensureHall();
  viewing = id;
  refreshMap();
  updateSheet(id);
  if (fromSeat) { theater.sitAt(id); return; }
  showMap(false);
  $('#sheet').classList.remove('up');
  theater.enterSeat(id);
}
function backToMap() {
  if (theater.mode === 'map') return;
  $('#sheet').classList.remove('up');
  theater.exitSeat(() => { viewing = null; refreshMap(); showMap(true); });
}

function viewTag(q) {
  if (q.tilt > 20) return ['Close to screen', 'warn'];
  if (q.side > 18) return ['Side view', 'warn'];
  if (q.score >= 90) return ['Sweet spot', ''];
  if (q.angW > 68) return ['Immersive', ''];
  if (q.angW < 44) return ['Full picture', ''];
  return ['Great view', ''];
}
function updateSheet(id) {
  const s = state.hall.seats.get(id);
  const row = state.hall.rows[s.rowIndex];
  const num = s.label.slice(row.rowId.length);
  const partner = s.partner && state.hall.seats.get(s.partner);
  const n = partner ? 2 : 1;
  const q = viewQuality(s);
  const [tag, tone] = viewTag(q);
  const sold = state.occupied.has(id), mine = state.selected.includes(id);
  $('#svSeat').textContent = s.label;
  $('#shTag').textContent = tag;
  $('#shTag').className = 'sh-tag ' + tone;
  $('#shSeat').textContent = partner
    ? `Row ${row.rowId}, Seats ${[num, partner.label.slice(row.rowId.length)].sort((a, b) => a - b).join('–')}`
    : `Row ${row.rowId}, Seat ${num}`;
  $('#shSub').textContent = `${s.area.name}${partner ? ' · couple sofa' : ''} · ${rupee(s.area.price * n)}`;
  const b = $('#pickBtn');
  b.disabled = sold;
  b.classList.toggle('remove', mine);
  b.textContent = sold ? 'Taken' : mine ? 'Remove seat' : `Select · ${rupee(s.area.price * n)}`;
  drawMini($('#shMini'), id);
}

/* tiny hall thumbnail with "you are here" */
function drawMini(cv, id) {
  const hall = state.hall;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 72, H = 58;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const all = [...hall.seats.values()];
  const minX = Math.min(...all.map((s) => s.x)), maxX = Math.max(...all.map((s) => s.x));
  const z0 = hall.rows[0].z, z1 = hall.rows[hall.rows.length - 1].z;
  const k = Math.min((W - 8) / (maxX - minX), (H - 12) / (z1 - z0));
  const ox = W / 2 - ((minX + maxX) / 2) * k, oy = 9 - z0 * k;
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(W * 0.22, 4); g.quadraticCurveTo(W / 2, 1, W * 0.78, 4); g.stroke();
  all.forEach((s) => {
    g.fillStyle = state.selected.includes(s.id) ? '#E6EAF0' : state.occupied.has(s.id) ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.28)';
    g.fillRect(ox + s.x * k - 0.7, oy + s.z * k - 0.7, 1.4, 1.4);
  });
  const c = hall.seats.get(id);
  if (c) {
    g.fillStyle = '#E6EAF0';
    g.beginPath(); g.arc(ox + c.x * k, oy + c.z * k, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(230,234,240,.4)'; g.lineWidth = 3;
    g.beginPath(); g.arc(ox + c.x * k, oy + c.z * k, 6, 0, Math.PI * 2); g.stroke();
  }
}

function toggleSeat(id) {
  if (state.occupied.has(id)) return false;
  const seat = state.hall.seats.get(id);
  const ids = seat.partner ? [seat.id, seat.partner] : [seat.id];   // couple sofas book as a pair
  if (state.selected.includes(id)) state.selected = state.selected.filter((x) => !ids.includes(x));
  else if (state.selected.length + ids.length <= MAX_SEATS) state.selected.push(...ids.filter((x) => !state.selected.includes(x)));
  else { toast(`You can book up to ${MAX_SEATS} seats at once`); return false; }
  theater.setStates(state.occupied, state.selected);
  updateBar();
  if (viewing) updateSheet(viewing);
  return state.selected.includes(id);
}

function setSound(on) {
  soundOn = on;
  theater.setSound(on);
  const b = $('#soundBtn');
  b.setAttribute('aria-pressed', on);
  b.textContent = on ? '🔊' : '🔇';
}

let toastT = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.classList.remove('show'); setTimeout(() => { t.hidden = true; }, 250); }, 1800);
}
const flashBar = toast;

$('#svBack').addEventListener('click', backToMap);
$('#shChange').addEventListener('click', backToMap);
$('#soundBtn').addEventListener('click', () => setSound(!soundOn));
$('#pickBtn').addEventListener('click', () => {
  if (!viewing) return;
  const label = state.hall.seats.get(viewing).label;
  const added = toggleSeat(viewing);
  if (added) { toast(`Seat ${label} selected`); setTimeout(backToMap, 450); }
});
// swipe the sheet down to go back to the map
let sheetY = null;
$('#sheet').addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) sheetY = e.clientY; });
$('#sheet').addEventListener('pointerup', (e) => { if (sheetY !== null && e.clientY - sheetY > 60) backToMap(); sheetY = null; });
document.addEventListener('keydown', (e) => {
  if (state.step !== 'seats' || e.target.closest?.('input, textarea')) return;
  if (e.key === 'Escape' && theater.mode === 'seat') { backToMap(); return; }
  if (theater.mode !== 'seat' || !viewing) return;
  const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (map[e.key]) {
    e.preventDefault();
    const next = theater.neighbour(viewing, ...map[e.key]);
    if (next) previewSeat(next, true);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    $('#pickBtn').click();
  }
});

function groupedSelection() {
  const groups = new Map();
  state.selected.forEach((id) => {
    const s = state.hall.seats.get(id);
    if (!groups.has(s.area)) groups.set(s.area, []);
    groups.get(s.area).push(s.label);
  });
  return [...groups].map(([area, labels]) => ({ area, labels }));
}
const ticketTotal = () => money(state.selected.reduce((sum, id) => sum + state.hall.seats.get(id).area.price, 0));
function updateBar() {
  const sel = state.selected;
  $('#spSel').textContent = sel.length
    ? `${sel.length} seat${sel.length > 1 ? 's' : ''} · ${groupedSelection().map((g) => g.labels.join(', ')).join(', ')}`
    : 'Choose your seat';
  $('#spTotal').textContent = sel.length ? rupee(ticketTotal()) : '—';
  $('#toCheckout').disabled = !sel.length;
  refreshMap();
}
function bestFreeSeat() {
  let best = null, bestScore = -1;
  state.hall.seats.forEach((s) => {
    if (state.occupied.has(s.id)) return;
    const sc = viewQuality(s).score - Math.abs(s.x) * 0.5;
    if (sc > bestScore) { bestScore = sc; best = s.id; }
  });
  return best;
}

$('#toCheckout').addEventListener('click', () => {
  // capture the real view from the best picked seat to print on the ticket
  const best = [...state.selected].sort((a, b) => viewQuality(state.hall.seats.get(b)).score - viewQuality(state.hall.seats.get(a)).score)[0];
  try { state.viewShot = theater.snapshot(best); state.viewSeat = state.hall.seats.get(best).label; } catch { state.viewShot = null; }
  renderCheckout();
  go('checkout');
});

function viewQuality(p) {
  const h = state.hall;
  const dist = Math.hypot(p.x, p.z, p.y - h.screenCentreY);
  const angW = 2 * Math.atan(h.screenW / 2 / p.z) * 180 / Math.PI;
  const side = Math.atan(Math.abs(p.x) / p.z) * 180 / Math.PI;
  const tilt = Math.atan((h.screenCentreY - p.y) / p.z) * 180 / Math.PI;
  const pen = Math.max(0, Math.abs(angW - 52) - 9) * 1.5 + Math.max(0, side - 7) * 1.5 + Math.max(0, tilt - 14) * 2.5;
  const score = Math.round(Math.max(15, Math.min(100, 100 - pen)));
  const label = score >= 90 ? 'Sweet spot' : score >= 76 ? 'Great view' : score >= 60 ? 'Good view' : 'Not ideal';
  let note = 'Balanced, immersive view of the whole screen.';
  if (tilt > 20) note = 'Very close — you’ll be looking up at the screen.';
  else if (side > 18) note = 'Angled view from the side of the hall.';
  else if (angW < 40) note = 'Whole screen in view, a little less immersive.';
  else if (angW > 68) note = 'Big and immersive — screen fills your vision.';
  return { score, label, note, dist, angW, side, tilt };
}

/* ---------- Step 4: checkout — live ticket, seat hold, payment ---------- */
const HOLD_SECONDS = 8 * 60;
let holdTimer = null;
function startHold() {
  stopHold();
  const end = Date.now() + HOLD_SECONDS * 1000;
  const tick = () => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    $('#holdTime').textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
    $('#hold').classList.toggle('urgent', left <= 60);
    $('#holdRing').style.setProperty('--p', (left / HOLD_SECONDS).toFixed(4));
    if (left === 0) {
      stopHold();
      state.selected = [];
      theater.setStates(state.occupied, state.selected);
      updateBar();
      go('seats');
      flashBar('Your seat hold expired — please pick your seats again');
    }
  };
  tick();
  holdTimer = setInterval(tick, 1000);
}
function stopHold() { clearInterval(holdTimer); holdTimer = null; }

function pricing() {
  const tickets = ticketTotal();
  const fee = FEE_PER_TICKET * state.selected.length;
  const gst = money(fee * 0.18);
  return { tickets, fee, gst, total: money(tickets + fee + gst) };
}
const esc = (v) => String(v || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const seatsText = () => groupedSelection().map((g) => `${g.labels.join(', ')}`).join(' · ');

function renderCheckout() {
  const p = pricing();
  const byArea = groupedSelection().map((g) =>
    `<div class="sum-row"><span>${g.area.name} × ${g.labels.length}<small>${g.labels.join(', ')}</small></span><b>${rupee(g.labels.length * g.area.price)}</b></div>`).join('');
  $('#summary').innerHTML = `
    ${byArea}
    <div class="sum-row"><span>Convenience fee<small>${rupee(FEE_PER_TICKET)} × ${state.selected.length}</small></span><b>${rupee(p.fee)}</b></div>
    <div class="sum-row"><span>GST on fee (18%)</span><b>${rupee(p.gst)}</b></div>
    <div class="sum-row total"><span>Total</span><b>${rupee(p.total)}</b></div>`;
  $('#payBtn').innerHTML = `<span>Pay ${rupee(p.total)}</span><i aria-hidden="true">→</i>`;
  renderPass();
}

/* Live ticket preview that fills in as you type */
function renderPass() {
  const m = state.movie, sc = state.hall.screen, f = $('#checkoutForm');
  const name = f.querySelector('[name="name"]').value.trim();
  const method = (f.querySelector('input[name=pay]:checked') || {}).value || 'upi';
  $('#pass').innerHTML = `
    <div class="pass-art" style="--poster:url('${m.poster}')">
      ${state.viewShot ? `<img class="pass-view" src="${state.viewShot}" alt="Your view of the screen from seat ${esc(state.viewSeat)}">` : ''}
      <div class="pass-art-text">
        <img class="pass-logo" src="assets/kamala-logo.png" alt="Kamala Cinemas">
        <span class="pass-viewtag">${state.viewShot ? `Your view from ${esc(state.viewSeat)}` : ''}</span>
      </div>
    </div>
    <div class="pass-body">
      <div class="pass-title"><h3>${m.title}</h3><span class="cert-pill">${m.cert}</span><span class="pass-fmt">${state.show.fmt}</span></div>
      <div class="pass-grid">
        <div><small>Date</small><b>${dateLabel(state.date)}</b></div>
        <div><small>Time</small><b>${state.show.time}</b></div>
        <div><small>Screen</small><b>${sc.name}</b></div>
        <div><small>Admit</small><b>${state.selected.length}</b></div>
        <div class="span2"><small>Seats</small><b>${esc(seatsText())}</b></div>
        <div class="span2"><small>Guest</small><b class="${name ? '' : 'ghost'}">${name ? esc(name) : 'Your name here'}</b></div>
      </div>
    </div>
    <div class="pass-stub">
      <div class="barcode" aria-hidden="true">${Array.from({ length: 38 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('')}</div>
      <div class="pass-total"><small>${{ upi: 'UPI', card: 'Card', netbanking: 'Net banking' }[method]}</small><b>${rupee(pricing().total)}</b></div>
    </div>`;
}
$('#checkoutForm').addEventListener('input', (e) => {
  e.target.classList.remove('invalid');
  e.target.closest('.field, .agree')?.classList.remove('invalid');
  if (e.target.name === 'name' || e.target.name === 'pay') renderPass();
});
$('#checkoutForm').addEventListener('change', (e) => { if (e.target.name === 'pay') renderPass(); });

$('#checkoutForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  let ok = true;
  $$('input[required]', form).forEach((inp) => {
    const valid = inp.checkValidity() && (inp.type === 'checkbox' || inp.value.trim() !== '');
    inp.classList.toggle('invalid', !valid);
    inp.closest('.field, .agree')?.classList.toggle('invalid', !valid);
    ok = ok && valid;
  });
  if (!ok) { form.querySelector('.invalid input, input.invalid')?.focus(); return; }
  const btn = $('#payBtn');
  btn.disabled = true;
  btn.classList.add('processing');
  btn.innerHTML = '<span>Confirming your seats…</span><i class="spinner" aria-hidden="true"></i>';
  stopHold();
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('processing');
    const fd = new FormData(form);
    renderDone(fd.get('name'), fd.get('email'), fd.get('phone'));
    state.step = 'done';
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-done'));
    document.body.classList.remove('immersive');
    theater.stop();
    window.scrollTo({ top: 0 });
  }, 1500);
});

/* ---------- E-ticket ---------- */
function qrGrid(seed) {
  const r = rng(seed);
  return Array.from({ length: 441 }, (_, i) => {
    const x = i % 21, y = Math.floor(i / 21);
    const finder = (fx, fy) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) {
      const lx = x % 14 % 7, ly = y % 14 % 7;
      const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6;
      const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
      return `<i class="${ring || core ? '' : 'w'}"></i>`;
    }
    return `<i class="${r() > 0.5 ? '' : 'w'}"></i>`;
  }).join('');
}

function icsFile(id) {
  const m = state.movie;
  const start = dateObj(state.date);
  start.setMinutes(toMin(state.show.time));
  const [, h = 0, mm = 0] = (m.dur.match(/(\d+)h\s*(\d+)?m?/) || []).map(Number);
  const end = new Date(start.getTime() + ((h || 2) * 60 + (mm || 0) + 15) * 60000);
  const f = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const t = (s) => String(s).replace(/([,;\\])/g, '\\$1');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kamala Cinemas//Tickets//EN', 'BEGIN:VEVENT',
    `UID:${id}@kamalacinemas`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${t(`${m.title} at Kamala Cinemas`)}`,
    `LOCATION:${t(THEATRE.address)}`,
    `DESCRIPTION:${t(`${state.hall.screen.name} · Seats ${seatsText()} · Booking ${id}`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${t(m.title)} starts in 1 hour`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function renderDone(name, email, phone) {
  const m = state.movie, p = pricing(), sc = state.hall.screen;
  const id = 'KMC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const first = esc(String(name).trim().split(' ')[0]);
  const ics = URL.createObjectURL(new Blob([icsFile(id)], { type: 'text/calendar' }));
  $('#done').innerHTML = `
    <div class="done-head">
      <span class="lobby-kicker">Booking confirmed · ${id}</span>
      <h1>Enjoy the show, ${first}!</h1>
      <p>We've sent your tickets to ${esc(email)} and +91 ${esc(phone)}.</p>
    </div>
    <div class="printer">
      <div class="printer-slot" aria-hidden="true"></div>
      <div class="print-clip" id="printClip">
        <div class="eticket-tilt" data-tilt>
          <button class="eticket" id="eticket" aria-label="E-ticket — click to flip">
            <div class="et-face et-front">
              <div class="pass-art" style="--poster:url('${m.poster}')">
                ${state.viewShot ? `<img class="pass-view" src="${state.viewShot}" alt="">` : ''}
                <div class="pass-art-text">
                  <img class="pass-logo" src="assets/kamala-logo.png" alt="Kamala Cinemas">
                  <span class="pass-viewtag">${state.viewShot ? `Your view from ${esc(state.viewSeat)}` : ''}</span>
                </div>
              </div>
              <div class="pass-body">
                <div class="pass-title"><h3>${m.title}</h3><span class="cert-pill">${m.cert}</span><span class="pass-fmt">${state.show.fmt}</span></div>
                <div class="pass-grid">
                  <div><small>Date</small><b>${dateLabel(state.date)}</b></div>
                  <div><small>Time</small><b>${state.show.time}</b></div>
                  <div><small>Screen</small><b>${sc.name}</b></div>
                  <div><small>Admit</small><b>${state.selected.length}</b></div>
                  <div class="span2"><small>Seats</small><b>${groupedSelection().map((g) => `${g.area.name}: ${g.labels.join(', ')}`).join('<br>')}</b></div>
                  <div class="span2"><small>Guest</small><b>${esc(name)}</b></div>
                </div>
              </div>
              <div class="pass-stub">
                <div class="barcode" aria-hidden="true">${Array.from({ length: 38 }, (_, i) => `<i style="width:${1 + ((i * 7) % 4)}px"></i>`).join('')}</div>
                <div class="pass-total"><small>Paid</small><b>${rupee(p.total)}</b></div>
              </div>
              <span class="holo" aria-hidden="true"></span>
              <span class="flip-hint">Tap to flip ↻</span>
            </div>
            <div class="et-face et-back">
              <img class="pass-logo" src="assets/kamala-logo.png" alt="">
              <div class="qr big" aria-hidden="true">${qrGrid(id)}</div>
              <div class="et-id"><small>Booking ID</small><b>${id}</b></div>
              <ul class="et-rules">
                <li>Show this QR at the Kamala entrance</li>
                <li>Please arrive 15 minutes before ${state.show.time}</li>
                <li>Tickets are non-cancellable</li>
                <li>${THEATRE.address}</li>
              </ul>
              <span class="flip-hint">Tap to flip ↻</span>
            </div>
          </button>
        </div>
      </div>
    </div>
    <div class="done-actions">
      <a class="btn ghost" href="${ics}" download="kamala-${id}.ics">📅 Add to calendar</a>
      <a class="btn ghost" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Kamala Cinemas, 156 Arcot Road, Vadapalani, Chennai')}" target="_blank" rel="noopener">📍 Directions</a>
      <button class="btn primary" id="again">Book another movie</button>
    </div>`;
  const clip = $('#printClip');
  clip.addEventListener('animationend', () => clip.classList.add('printed'), { once: true });
  $('#eticket').addEventListener('click', () => $('#eticket').classList.toggle('flipped'));
  initTilt($('#done'));
  confetti();
  $('#again').addEventListener('click', () => {
    Object.assign(state, { movie: null, show: null, hall: null, selected: [], date: DATES[0], viewShot: null });
    $('#checkoutForm').reset();
    go('movies');
  });
}

/* Kamala-coloured confetti burst */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const g = c.getContext('2d');
  const W = c.width = innerWidth, H = c.height = innerHeight;
  const cols = ['#C50337', '#E6EAF0', '#ffffff', '#8F96A3', '#7A0224'];
  const ps = Array.from({ length: 170 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(t) {
    g.clearRect(0, 0, W, H);
    ps.forEach((p) => {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r))); g.restore();
    });
    if (t - t0 < 3200) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

/* ---------- Boot ---------- */
renderMovies();
go('movies');
const chat = initChat({ theatre: THEATRE, screens: SCREENS, movies: MOVIES, comingSoon: COMING_SOON, dates: DATES, showsFor, shortDay, todayISO, rupee });
liquidGlass(chat.launch, { scale: -46, chroma: 4, border: 0.12, mapBlur: 6, blur: 5, saturate: 1.6 });
