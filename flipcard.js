/* =========================================================
   FlipCard — plain-JavaScript port of the React Bits component.
   The site has no React or build step, so the motion springs are
   replaced by the small spring below; behaviour and constants match.
   Expects .flip-card__shadow, __rotor and __face--front/--back.
   Each face holds a [data-flip] button for keyboard users.
   ========================================================= */

const SLOP = { fine: 4, coarse: 8 };
const TILT_SPRING = { stiffness: 240, damping: 24, mass: 0.6, rest: 0.01 };
const LIFT_SPRING = { stiffness: 320, damping: 26, mass: 1, rest: 0.0005 };
const FLING = 0.16;
const HISTORY_MS = 90;
const SUBSTEP = 1 / 240;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const snap = (deg) => Math.round(deg / 180) * 180;
const isBack = (deg) => Math.abs(Math.round(deg / 180)) % 2 === 1;

class Spring {
  constructor(value, config, wake) {
    Object.assign(this, config, { value, target: value, velocity: 0, active: false, wake });
  }
  set(target, velocity = this.velocity) {
    this.target = target;
    this.velocity = velocity;
    this.active = true;
    this.wake();
  }
  jump(value) {
    this.value = this.target = value;
    this.velocity = 0;
    this.active = false;
    this.wake();
  }
  stop() {
    this.active = false;
    this.velocity = 0;
    this.target = this.value;
  }
  step(dt) {
    if (!this.active) return false;
    for (let n = Math.ceil(dt / SUBSTEP); n > 0; n--) {
      const force = -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
      this.velocity += (force / this.mass) * SUBSTEP;
      this.value += this.velocity * SUBSTEP;
    }
    if (Math.abs(this.value - this.target) < this.rest && Math.abs(this.velocity) < this.rest * 10) {
      this.value = this.target;
      this.velocity = 0;
      this.active = false;
    }
    return this.active;
  }
}

const DEFAULTS = { dragDistance: 0, tiltMax: 12, hoverScale: 1.03, perspective: 1100, stiffness: 170, damping: 20 };

export function createFlipCard(root, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const rotor = root.querySelector('.flip-card__rotor');
  const shadow = root.querySelector('.flip-card__shadow');
  const front = root.querySelector('.flip-card__face--front');
  const back = root.querySelector('.flip-card__face--back');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let raf = 0, last = 0, shown = false, target = 0, grip = null;
  const wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const turn = new Spring(0, { stiffness: o.stiffness, damping: o.damping, mass: 1, rest: 0.05 }, wake);
  const tiltX = new Spring(0, TILT_SPRING, wake);
  const tiltY = new Spring(0, TILT_SPRING, wake);
  const lift = new Spring(1, LIFT_SPRING, wake);
  const sheen = new Spring(0, { ...LIFT_SPRING, rest: 0.002 }, wake);
  const springs = [turn, tiltX, tiltY, lift, sheen];
  let gx = 50, gy = 50;

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const moving = springs.map((s) => s.step(dt)).some(Boolean);
    render();
    raf = moving ? requestAnimationFrame(tick) : 0;
  }
  function render() {
    if (reduce) return;
    rotor.style.transform = `perspective(${o.perspective}px) scale(${lift.value}) rotateX(${tiltX.value}deg) rotateY(${turn.value + tiltY.value}deg)`;
    rotor.style.setProperty('--fc-gx', `${gx}%`);
    rotor.style.setProperty('--fc-gy', `${gy}%`);
    rotor.style.setProperty('--fc-sheen', sheen.value);
    const facing = Math.abs(Math.cos((turn.value * Math.PI) / 180));
    shadow.style.transform = `scaleX(${0.08 + 0.92 * facing})`;
    shadow.style.opacity = 0.1 + 0.9 * facing * facing;
  }
  function syncFaces() {
    front.inert = shown;
    back.inert = !shown;
    root.dataset.side = shown ? 'back' : 'front';
    if (reduce) root.dataset.fade = shown ? 'back' : 'front';
  }
  function settle(to, velocity, instant) {
    target = to;
    if (instant || reduce) turn.jump(to);
    else turn.set(to, velocity);
    const next = isBack(to);
    if (next === shown) return;
    shown = next;
    syncFaces();
  }
  function flip(instant) {
    const base = snap(turn.value);
    settle(isBack(base) ? base - 180 : base + 180, 0, instant);
  }
  function rest() {
    tiltX.set(0);
    tiltY.set(0);
    sheen.set(0);
    lift.set(1);
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || grip) return;
    try { root.setPointerCapture(e.pointerId); } catch {}
    turn.stop();
    grip = {
      id: e.pointerId, x: e.clientX, base: turn.value, moved: false, hist: [],
      slop: e.pointerType === 'touch' ? SLOP.coarse : SLOP.fine,
    };
    if (!reduce) lift.set(o.hoverScale);
  });
  root.addEventListener('pointermove', (e) => {
    const g = grip;
    if (g && g.id === e.pointerId) {
      const d = e.clientX - g.x;
      if (!g.moved) {
        if (Math.abs(d) < g.slop || reduce) return;
        g.moved = true;
        root.dataset.dragging = '';
        tiltX.set(0);
        tiltY.set(0);
        sheen.set(0);
      }
      const span = o.dragDistance > 0 ? o.dragDistance : root.offsetWidth;
      const deg = g.base + (d / span) * 180;
      turn.jump(deg);
      const now = performance.now();
      g.hist.push({ t: now, v: deg });
      while (g.hist.length > 2 && now - g.hist[0].t > HISTORY_MS) g.hist.shift();
      return;
    }
    if (reduce || e.pointerType === 'touch') return;
    const r = root.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / r.width, 0, 1);
    const py = clamp((e.clientY - r.top) / r.height, 0, 1);
    tiltX.set((0.5 - py) * 2 * o.tiltMax);
    tiltY.set((px - 0.5) * 2 * o.tiltMax);
    gx = px * 100;
    gy = py * 100;
    sheen.set(1);
  });
  function release(e, cancelled) {
    const g = grip;
    if (!g || g.id !== e.pointerId) return;
    grip = null;
    try { if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId); } catch {}
    delete root.dataset.dragging;
    if (e.pointerType === 'touch' || !root.matches(':hover')) rest();
    if (!g.moved) {
      if (!cancelled) flip(false);
      else settle(target, 0, false);
      return;
    }
    const here = turn.value;
    let velocity = 0;
    const a = g.hist[0], b = g.hist[g.hist.length - 1];
    if (!cancelled && a && b && b.t > a.t && performance.now() - b.t < 60) velocity = ((b.v - a.v) / (b.t - a.t)) * 1000;
    const to = cancelled ? snap(g.base) : clamp(snap(here + velocity * FLING), snap(here) - 180, snap(here) + 180);
    settle(to, velocity, false);
  }
  root.addEventListener('pointerup', (e) => release(e, false));
  root.addEventListener('pointercancel', (e) => release(e, true));
  root.addEventListener('lostpointercapture', (e) => release(e, true));
  root.addEventListener('pointerenter', (e) => { if (!reduce && e.pointerType !== 'touch') lift.set(o.hoverScale); });
  root.addEventListener('pointerleave', () => { if (!grip) rest(); });
  root.addEventListener('dragstart', (e) => e.preventDefault());

  // keyboard activation of a face's button: pointer presses are handled above (they have detail > 0)
  root.addEventListener('click', (e) => {
    if (e.detail !== 0 || !e.target.closest('[data-flip]')) return;
    flip(true);
    (shown ? back : front).querySelector('[data-flip]')?.focus({ preventScroll: true });
  });

  syncFaces();
  render();
}
