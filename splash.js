/* =========================================================
   Opening splash — drag the curtains open, then a film-leader
   countdown plays on the screen and we fade into the lobby.
   ========================================================= */
(() => {
  const root = document.documentElement;
  const splash = document.getElementById('splash');
  if (!splash || root.classList.contains('no-splash')) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dust = document.getElementById('spDust');
  const leader = document.getElementById('spLeader');
  let open = 0;               // 0..1 how far the curtains are pulled
  let done = false;
  let finger = null;          // {x, y} while touching, for the dust
  let idleTimer = null;

  const setOpen = (v) => { open = Math.max(0, Math.min(1, v)); splash.style.setProperty('--open', open.toFixed(3)); };

  /* ---------- drag to part the curtains ---------- */
  let start = null;
  splash.addEventListener('pointerdown', (e) => {
    if (done || e.target.closest('.sp-skip')) return;
    start = { x: e.clientX, y: e.clientY, open, t: performance.now() };
    finger = { x: e.clientX, y: e.clientY };
    splash.classList.add('dragging');
    splash.setPointerCapture(e.pointerId);
    clearTimeout(idleTimer);
  });
  splash.addEventListener('pointermove', (e) => {
    finger = { x: e.clientX, y: e.clientY };
    if (!start || done) return;
    // pulling sideways (either direction) or up opens the curtains
    const dx = Math.abs(e.clientX - start.x), dy = Math.max(0, start.y - e.clientY);
    const pull = Math.max(dx, dy) / (window.innerWidth * 0.55);
    setOpen(start.open + pull);
  });
  const release = (e) => {
    if (!start || done) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    splash.classList.remove('dragging');
    // a tap, or a pull past a quarter of the way, opens the curtains fully
    if (moved < 8 || open > 0.25) enter();
    else { setOpen(0); armIdle(); }
    start = null;
    finger = null;
  };
  splash.addEventListener('pointerup', release);
  splash.addEventListener('pointercancel', (e) => { splash.classList.remove('dragging'); start = null; finger = null; setOpen(0); armIdle(); });

  document.getElementById('spOpen').addEventListener('click', (e) => { e.stopPropagation(); enter(); });
  document.getElementById('spSkip').addEventListener('click', (e) => { e.stopPropagation(); finish(true); });
  document.addEventListener('keydown', (e) => {
    if (done) return;
    if (e.key === 'Escape') finish(true);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); }
  });

  // nobody touched it? open by itself after a few seconds
  const armIdle = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!done && !start) enter(); }, 9000); };
  armIdle();

  /* ---------- opening sequence ---------- */
  function enter() {
    if (done) return;
    done = true;
    clearTimeout(idleTimer);
    splash.classList.remove('dragging');
    try { navigator.vibrate && navigator.vibrate(12); } catch (e) {}
    setOpen(1);
    if (reduce) { setTimeout(() => finish(), 350); return; }
    setTimeout(runLeader, 650);
  }

  function finish(skip) {
    done = true;
    clearTimeout(idleTimer);
    try { sessionStorage.setItem('kamala-splash', '1'); } catch (e) {}
    splash.classList.add('leaving');
    setTimeout(() => {
      root.classList.add('splash-done');
      cancelAnimationFrame(dustRaf);
    }, skip ? 450 : 750);
  }

  /* ---------- film leader countdown: 3 · 2 · 1 ---------- */
  function runLeader() {
    const g = leader.getContext('2d');
    const S = leader.width, c = S / 2, R = S * 0.42;
    const per = 520, total = per * 3;
    const t0 = performance.now();
    (function frame(t) {
      const el = t - t0;
      if (el >= total) { finish(); return; }
      const n = 3 - Math.floor(el / per);
      const p = (el % per) / per;
      g.clearRect(0, 0, S, S);
      // film-grain grey disc
      g.fillStyle = '#2a2a2f'; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
      // sweep
      g.fillStyle = 'rgba(111,220,154,.28)';
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, R, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.closePath(); g.fill();
      // crosshair + rings
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(c, c, R * 0.82, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(c - R * 1.1, c); g.lineTo(c + R * 1.1, c); g.moveTo(c, c - R * 1.1); g.lineTo(c, c + R * 1.1); g.stroke();
      // number
      g.fillStyle = '#fff';
      g.font = `${Math.round(S * 0.5)}px "Bebas Neue", Impact, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), c, c + S * 0.03);
      // flicker
      if (Math.random() < 0.12) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, S, S); }
      requestAnimationFrame(frame);
    })(t0);
  }

  /* ---------- dust drifting in the projector beam (swirls away from your finger) ---------- */
  let dustRaf = 0;
  if (!reduce) {
    const g = dust.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = dust.clientWidth; H = dust.clientHeight;
      dust.width = W * dpr; dust.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);
    const motes = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.00025, vy: -Math.random() * 0.0004 - 0.0001, a: Math.random() * 0.5 + 0.2, ox: 0, oy: 0,
    }));
    (function tick() {
      g.clearRect(0, 0, W, H);
      motes.forEach((m) => {
        m.x += m.vx; m.y += m.vy;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02) m.x = 1.02; if (m.x > 1.02) m.x = -0.02;
        let px = m.x * W + m.ox, py = m.y * H + m.oy;
        if (finger) {
          const dx = px - finger.x, dy = py - finger.y, d = Math.hypot(dx, dy);
          if (d < 110 && d > 0.1) { const f = (110 - d) / 110 * 6; m.ox += dx / d * f; m.oy += dy / d * f; }
        }
        m.ox *= 0.95; m.oy *= 0.95;
        // brighter inside the beam (centre of the screen)
        const inBeam = 1 - Math.min(1, Math.abs(px - W / 2) / (W * 0.45));
        g.fillStyle = `rgba(255,248,235,${(m.a * (0.35 + inBeam * 0.9)).toFixed(3)})`;
        g.beginPath(); g.arc(px, py, m.r, 0, Math.PI * 2); g.fill();
      });
      dustRaf = requestAnimationFrame(tick);
    })();
  }
})();
