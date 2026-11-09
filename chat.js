/* =========================================================
   Ask Kamala — a scripted helper for the theatre.
   It answers only from the data the site already shows, and says
   so when it doesn't know. Booking links reuse the page's own
   data-movie / data-quick / data-trailer click handlers.
   ========================================================= */

const QUICK = ["What's on today?", 'Ticket prices', 'How do I get there?', 'Parking', 'Coming soon'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const norm = (s) => s.toLowerCase().replace(/\./g, '').replace(/[’']/g, '').replace(/\s+/g, ' ').trim();
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* A title matches on its full name, or a distinctive first or last word ("ramayan", "amman"). */
function titlePatterns(title) {
  const words = norm(title).replace(/&/g, ' ').split(' ').filter(Boolean);
  const pats = [norm(title)];
  if (words[0].length >= 6) pats.push(words[0].slice(0, 6));
  else if (words.length === 1) pats.push(words[0]);
  const last = words[words.length - 1];
  if (words.length > 1 && last.length >= 5) pats.push(last);
  return pats;
}
const findTitle = (q, list) => list.find((m) => titlePatterns(m.title).some((p) => new RegExp(`\\b${p}`).test(q)));

export function initChat(site) {
  const { theatre, screens, movies, comingSoon, dates, showsFor, shortDay, todayISO, rupee } = site;

  const call = `<a href="tel:${theatre.phoneHref}">${theatre.phone}</a>`;
  const seatKinds = () => {
    const seen = new Map();
    Object.values(screens).forEach((s) => s.areas.forEach((a) => seen.set(a.name, a.price)));
    return [...seen];
  };
  const openShows = (id, date) => showsFor(id, date).map((s, i) => ({ s, i })).filter(({ s }) => !s.closed);
  const hasShows = (date) => movies.some((m) => openShows(m.id, date).length);

  function pickDate(q) {
    const today = todayISO();
    if (/\b(tomorrow|tmrw|naalai|nalaikku)\b/.test(q)) {
      const d = new Date(`${today}T00:00:00`);
      d.setDate(d.getDate() + 1);
      return { date: isoOf(d), asked: true };
    }
    const day = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w.slice(0, 3)}(${w.slice(3)})?\\b`).test(q));
    if (day >= 0) {
      const match = dates.find((d) => new Date(`${d}T00:00:00`).getDay() === day);
      return { date: match || null, asked: true };
    }
    if (/\b(today|tonight|now|inniku)\b/.test(q)) return { date: today, asked: true };
    return { date: soonestDate(hasShows), asked: false };
  }
  /* Today if possible, then the next date with shows, then whatever the page is still offering. */
  function soonestDate(open) {
    const today = todayISO();
    return dates.find((d) => d >= today && open(d)) || dates.find(open) || dates[0];
  }
  const upcomingDates = (open) => {
    const today = todayISO(), ahead = dates.filter((d) => d >= today && open(d));
    return (ahead.length ? ahead : dates.filter(open)).map(dayName).join(', ');
  };
  const dayName = (iso) => (iso === todayISO() ? 'today' : shortDay(iso));

  const filmBlock = (m, date) => {
    const shows = openShows(m.id, date);
    if (!shows.length) return '';
    return `<div class="cb-film"><b>${m.title}</b><div class="cb-times">${shows.map(({ s, i }) =>
      `<button data-quick="${m.id}|${date}|${i}">${s.time}<small>${screens[s.screen].name}${s.fmt === '3D' ? ' · 3D' : ''}</small></button>`).join('')}</div></div>`;
  };

  function showtimes(q, film) {
    const picked = pickDate(q);
    const date = film && !picked.asked ? soonestDate((d) => openShows(film.id, d).length) : picked.date;
    const list = (film ? [film] : movies).map((m) => filmBlock(m, date)).filter(Boolean).join('');
    if (date && list) return `<p>Shows for <b>${dayName(date)}</b>. Tap a time to pick your seat.</p>${list}`;
    if (film) {
      const open = (d) => openShows(film.id, d).length;
      return dates.some(open)
        ? `<p>No ${film.title} shows are listed for that day. It's on ${upcomingDates(open)}.</p>`
        : `<p>I can't see any open shows for ${film.title} right now. Call ${call} to check.</p>`;
    }
    return `<p>No shows are listed for that day. Tickets are open for ${upcomingDates(hasShows)}.</p>`;
  }

  const prices = () => `<p>Ticket prices at Kamala, the same on both screens:</p><dl class="cb-table">${seatKinds().map(([n, p]) =>
    `<div><dt>${n}</dt><dd>${rupee(p)}</dd></div>`).join('')}</dl><p class="cb-note">Booking fees are added at checkout, before you pay.</p>`;

  const where = () => `<p><b>${theatre.name}</b><br>${theatre.address}</p><p>The metro is close by, and there's parking for 150 cars and 350 two-wheelers.</p><p><a class="cb-link" href="${theatre.maps}" target="_blank" rel="noopener">Open in Google Maps ↗</a></p>`;

  const screensInfo = () => `<p>Kamala has ${Object.keys(screens).length} screens, both with 4K RGB Laser projection and Dolby 7.1 sound.</p><dl class="cb-table">${Object.values(screens).map((s) =>
    `<div><dt>${s.name}</dt><dd>${s.capacity} seats</dd></div>`).join('')}</dl>`;

  const filmCard = (m) => `<p><b>${m.title}</b> · ${m.cert} · ${m.dur}<br>${m.genre} · ${m.lang}</p><p>${m.blurb}</p><p class="cb-note">Directed by ${m.director}. With ${m.cast}.</p><div class="cb-actions"><button class="cb-primary" data-movie="${m.id}">Book ${m.title}</button><button data-trailer="${m.id}">Watch trailer</button></div>`;

  const upcomingDate = (m) => new Date(`${m.release}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const upcomingCard = (m) => `<p><b>${m.title}</b> · ${m.lang} · ${m.genre}</p><p>${m.blurb}</p><p class="cb-note">Opens across Chennai on ${upcomingDate(m)}. Kamala hasn't announced shows for it yet.</p>`;
  const upcomingList = () => `<p>Opening across Chennai soon. Kamala hasn't announced its next titles yet.</p><dl class="cb-table">${comingSoon.map((m) =>
    `<div><dt>${m.title}<small>${m.lang}</small></dt><dd>${upcomingDate(m)}</dd></div>`).join('')}</dl>`;

  const threeD = () => {
    const blocks = dates.flatMap((d) => movies.filter((m) => openShows(m.id, d).some(({ s }) => s.fmt === '3D')).map((m) => {
      const shows = openShows(m.id, d).filter(({ s }) => s.fmt === '3D');
      return `<div class="cb-film"><b>${m.title} · ${shortDay(d)}</b><div class="cb-times">${shows.map(({ s, i }) => `<button data-quick="${m.id}|${d}|${i}">${s.time}<small>${screens[s.screen].name} · 3D</small></button>`).join('')}</div></div>`;
    }));
    return blocks.length ? `<p>3D shows, with 3D glasses provided:</p>${blocks.join('')}` : `<p>I can't see any 3D shows open right now.</p>`;
  };

  const dontKnow = (topic) => `<p>I don't have ${topic} here. The theatre can help on ${call}.</p>`;
  const help = () => `<p>I didn't catch that. I can help with showtimes, ticket prices, directions, parking, screens and what's coming soon. For anything else, call ${call}.</p>`;

  /* First matching rule answers, so specific questions come before general ones. */
  function answer(raw) {
    const q = norm(raw);
    const film = findTitle(q, movies);
    const soon = findTitle(q, comingSoon);

    if (/^(hi|hey|hello|hii+|vanakkam|namaste|yo)\b/.test(q) && q.split(' ').length <= 3) return `<p>Hello! What would you like to know about Kamala?</p>`;
    if (/\b(thanks|thank you|thx|nandri)\b/.test(q)) return `<p>You're welcome. Enjoy the film!</p>`;
    if (/\b(refund|cancel|cancellation|reschedule|exchange)\b/.test(q)) return dontKnow('the refund or cancellation policy');
    if (/\b(offers?|discounts?|coupons?|promo|promos)\b/.test(q)) return dontKnow('details of any offers');
    if (/\b(job|career|hiring|rent|private screening|bulk)\b/.test(q)) return dontKnow('that information');
    if (/\b(phone|call|contact|number|reach you)\b/.test(q)) return `<p>You can call Kamala Cinemas on ${call}.</p>`;
    if (/\b(parking|park|bike|two wheeler|two-wheeler|car)\b/.test(q)) return `<p>Yes, Kamala has parking for <b>150 cars</b> and <b>350 two-wheelers</b>.</p>`;
    if (/\b(food|snack|snacks|popcorn|drink|drinks|canteen|menu|eat)\b/.test(q)) return `<p>Yes, food and beverages are available at the theatre. I don't have the menu or prices here, but the theatre can help on ${call}.</p>`;
    if (/\b(where|address|location|located|direction|directions|map|maps|reach|route|metro|enga)\b/.test(q)) return where();
    if (/\b(couple|sofa|sofas|lounge)\b/.test(q)) return `<p>Yes, both screens have couple sofas: Couple Seat Lounge 1, Lounge 2 and Couple Seat Elite. They're shown in pink on the seat map, at ${rupee(seatKinds().find(([n]) => /couple/i.test(n))[1])}.</p>`;
    if (/\b(price|prices|cost|costs|rate|rates|fare|charge|how much|evlo|evvalavu|budget|cheapest)\b/.test(q)) return prices();
    if (/\b(view|see the screen|best seat|which seat|seat view)\b/.test(q)) return `<p>Pick any show, then tap a seat on the map. You'll see the screen from that exact seat before you book it.</p>`;
    if (/\b(book|booking|buy|reserve)\b/.test(q) && film) return `<p>Pick a time for ${film.title}:</p>${filmBlock(film, firstOpenDate(film))}`;
    if (/\b(book|booking|buy|reserve|ticket|tickets)\b/.test(q) && !/\b(show|time|timing)\b/.test(q)) return `<p>Choose a film below, pick a time, tap a seat to see your view, then check out.</p><div class="cb-actions">${movies.map((m) => `<button data-movie="${m.id}">${m.title}</button>`).join('')}</div>`;
    if (/\b3d\b/.test(q)) return threeD();
    if (/\b(atmos|imax)\b/.test(q)) return `<p>Kamala's screens use 4K RGB Laser projection with Dolby 7.1 sound. I don't see IMAX or Atmos listed.</p>`;
    if (/\b(screen|screens|sound|dolby|4k|laser|projection|seats|capacity|ac|air conditioning)\b/.test(q)) return screensInfo();
    if (film && /\b(show|shows|time|times|timing|timings|when|today|tonight|tomorrow|mon|tue|wed|thu|fri|sat|sun)\b/.test(q)) return showtimes(q, film);
    if (film) return filmCard(film);
    if (soon) return upcomingCard(soon);
    if (/\b(coming|upcoming|soon|next|release|releases|new)\b/.test(q)) return upcomingList();
    if (/\b(show|shows|time|times|timing|timings|playing|running|movie|movies|film|films|today|tonight|tomorrow|whats on|on today)\b/.test(q)) return showtimes(q, null);
    return help();
  }
  function firstOpenDate(film) { return dates.find((d) => openShows(film.id, d).length) || dates[0]; }

  /* ---------- Interface ---------- */
  const root = document.createElement('div');
  root.className = 'chat';
  root.innerHTML = `
    <section class="cb-panel" id="cbPanel" role="dialog" aria-label="Ask Kamala" hidden>
      <header class="cb-head">
        <img src="assets/kamala-emblem.png" alt="" width="30" height="30">
        <div><b>Ask Kamala</b><small>Showtimes, prices and directions</small></div>
        <button class="cb-x" aria-label="Close chat">✕</button>
      </header>
      <div class="cb-log" id="cbLog" role="log" aria-live="polite"></div>
      <div class="cb-chips">${QUICK.map((t) => `<button type="button" data-ask="${t}">${t}</button>`).join('')}</div>
      <form class="cb-form" autocomplete="off">
        <input id="cbInput" type="text" maxlength="200" placeholder="Ask about shows, prices, parking" aria-label="Your question">
        <button type="submit" aria-label="Send">↑</button>
      </form>
    </section>
    <button class="cb-launch" id="cbLaunch" aria-haspopup="dialog" aria-expanded="false" aria-controls="cbPanel">
      <img src="assets/kamala-emblem.png" alt="" width="24" height="24"><span>Ask Kamala</span>
    </button>`;
  document.body.appendChild(root);

  const panel = root.querySelector('#cbPanel'), log = root.querySelector('#cbLog'),
    input = root.querySelector('#cbInput'), launch = root.querySelector('#cbLaunch');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false, waiting = false;

  const bubble = (cls) => {
    const el = document.createElement('div');
    el.className = `cb-msg ${cls}`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };
  function say(html) {
    bubble('bot').innerHTML = html;
    log.scrollTop = log.scrollHeight;
  }
  function ask(text) {
    const q = text.trim();
    if (!q || waiting) return;
    bubble('me').textContent = q;       // the visitor's words are never parsed as HTML
    waiting = true;
    const dots = bubble('bot typing');
    dots.innerHTML = '<i></i><i></i><i></i>';
    setTimeout(() => {
      dots.remove();
      say(answer(q));
      waiting = false;
    }, calm ? 0 : 420);
  }
  function open() {
    panel.hidden = false;
    root.classList.add('open');
    launch.setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      say(`<p>Hi, I'm here to help with Kamala's showtimes, ticket prices and directions. What do you need?</p>`);
    }
    if (matchMedia('(hover: hover)').matches) input.focus();
  }
  function close(refocus = true) {
    panel.hidden = true;
    root.classList.remove('open');
    launch.setAttribute('aria-expanded', 'false');
    if (refocus) launch.focus();
  }

  launch.addEventListener('click', () => (panel.hidden ? open() : close()));
  root.querySelector('.cb-x').addEventListener('click', () => close());
  root.querySelector('.cb-form').addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = '';
  });
  root.querySelector('.cb-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]');
    if (b) ask(b.dataset.ask);
  });
  log.addEventListener('click', (e) => {
    if (e.target.closest('[data-movie], [data-quick], [data-trailer]')) close(false);   // the page takes over from here
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  return { launch };
}
