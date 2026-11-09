/* =========================================================
   Theater3D — walk-through 3D auditorium for Kamala Cinemas
   - WebGL hall (Three.js) with every seat as a real 3D seat
   - Trailer plays on the screen via a CSS3D YouTube layer that
     shows through a transparent "hole" in the WebGL canvas
   - Hall view (orbit) and Seat view (sit + look around)
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';

const AREA_COLOR = { LG1: 0x9a1f45, LG2: 0x9a1f45, CE: 0xc0161f, EL: 0x8e1118, BU: 0x5a3033 };
const C_SOLD = new THREE.Color(0x2a2224);
const C_PICK = new THREE.Color(0x6fdc9a);
const C_WHITE = new THREE.Color(0xffffff);
const CSS_W = 1600;                               // px width of the CSS screen surface

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function seatGeometry() {
  const parts = [];
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push(g); };
  box(0.48, 0.14, 0.46, 0, 0.44, 0.0);       // cushion
  box(0.48, 0.6, 0.12, 0, 0.8, 0.25);        // backrest (behind the sitter, +z)
  box(0.44, 0.1, 0.14, 0, 1.12, 0.24);       // head roll
  box(0.06, 0.2, 0.48, -0.25, 0.58, 0.0);    // arm L
  box(0.06, 0.2, 0.48, 0.25, 0.58, 0.0);     // arm R
  box(0.4, 0.38, 0.34, 0, 0.19, 0.04);       // base
  return mergeGeometries(parts);
}
function personGeometry() {
  const head = new THREE.SphereGeometry(0.12, 16, 12);
  head.scale(1, 1.15, 1); head.translate(0, 1.22, 0.08);
  const torso = new THREE.CapsuleGeometry(0.16, 0.26, 4, 12);
  torso.scale(1.3, 1, 0.75); torso.translate(0, 0.8, 0.12);
  return mergeGeometries([head.toNonIndexed(), torso.toNonIndexed()]);
}

export class Theater3D {
  constructor(stage, { onHover, onSeatClick, onMode } = {}) {
    this.stage = stage;
    this.cb = { onHover: onHover || (() => {}), onSeatClick: onSeatClick || (() => {}), onMode: onMode || (() => {}) };
    this.mode = 'hall';
    this.running = false;
    this.hoverIndex = -1;
    this.occupied = new Set();
    this.selected = new Set();

    // Renderers: CSS3D (trailer) underneath, WebGL on top with a transparent hole for the screen
    this.css = new CSS3DRenderer();
    this.css.domElement.className = 'layer-css';
    stage.appendChild(this.css.domElement);

    this.gl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.gl.setClearColor(0x000000, 0);
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.15;
    this.gl.domElement.className = 'layer-gl';
    stage.appendChild(this.gl.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070304, 0.018);
    this.cssScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 300);
    this.camera.rotation.order = 'YXZ';

    this.controls = new OrbitControls(this.camera, this.gl.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = 1.48;
    this.controls.screenSpacePanning = true;
    this.controls.enabled = false;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._bindPointer();

    new ResizeObserver(() => this._resize()).observe(stage);
    this._resize();
    this._loop = this._loop.bind(this);
  }

  /* ---------------- public API ---------------- */
  setHall(hall, movie, trailerId) {
    const sameHall = this.hall === hall;
    this.hall = hall; this.movie = movie; this.trailerId = trailerId;
    if (this.group) { this._dispose(this.group); this.scene.remove(this.group); }
    if (this.cssObj) this.cssScene.remove(this.cssObj);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.seatList = [];                         // instance index -> seat
    this.seatIndex = new Map();                 // seat id -> instance index
    hall.rows.forEach((row) => row.seats.forEach((s) => { this.seatIndex.set(s.id, this.seatList.length); this.seatList.push(s); }));
    this._buildRoom();
    this._buildScreen();
    this._buildSeats();
    this._applyStates();
    this.current = null;
    this.anim = null;
    const td = this._topDownPose();
    this.camera.position.copy(td.pos);
    this.camera.quaternion.copy(td.quat);
    this.mode = 'map';
    this._dirty = true;
    this.cb.onMode('map', null);
  }

  setStates(occupied, selected) {
    this.occupied = occupied; this.selected = new Set(selected);
    if (this.seatMesh) this._applyStates();
    this._dirty = true;
  }

  /* Overhead camera that frames every seat (also the start/end of the fly-in) */
  _topDownPose() {
    const h = this.hall;
    const xs = this.seatList.map((s) => s.x);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const z0 = h.rows[0].z, z1 = h.rows[h.rows.length - 1].z;
    const midZ = (z0 + z1) / 2, w = maxX - minX + 2, d = z1 - z0 + 2;
    this.camera.fov = this._seatFov(); this.camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const need = Math.max(d / 2 / t, w / 2 / (t * this.camera.aspect));
    const pos = new THREE.Vector3(0, h.rows[h.rows.length - 1].floor * 0.5 + need, midZ);
    const tmp = new THREE.PerspectiveCamera();
    tmp.up.set(0, 0, -1);                       // screen at the top of the frame
    tmp.position.copy(pos);
    tmp.lookAt(0, 0, midZ);
    return { pos, quat: tmp.quaternion.clone() };
  }

  /* Map -> seat: start overhead, then descend into the seat */
  enterSeat(id) {
    const td = this._topDownPose();
    this.anim = null;
    this.camera.position.copy(td.pos);
    this.camera.quaternion.copy(td.quat);
    this.sitAt(id, { dur: 1700, lift: 0 });
  }

  /* Seat -> map: rise back up overhead */
  exitSeat(done) {
    const td = this._topDownPose();
    this.cb.onMode('flying', null);
    this._fly(td.pos, td.quat, 1000, 0, () => {
      this.mode = 'map';
      this.current = null;
      this._applyStates();
      this._dirty = true;
      done && done();
    });
  }

  _seatFov() { return this._fov(this.camera.aspect < 0.9 ? 74 : 66); }

  sitAt(id, opts = {}) {
    const s = this.hall.seats.get(id);
    if (!s) return;
    this.current = id;
    this._applyStates();
    const eye = new THREE.Vector3(s.x, s.y + 0.02, s.z + 0.04);
    // on portrait phones aim a little low so the screen sits in the top half, above the bottom sheet
    const portrait = this.camera.aspect < 0.9;
    const look = new THREE.Vector3(s.x * 0.15, this.hall.screenCentreY - (portrait ? 2.1 : 0.5), 0);
    const tmp = new THREE.PerspectiveCamera();
    tmp.rotation.order = 'YXZ';
    tmp.position.copy(eye); tmp.lookAt(look);
    const e = new THREE.Euler().setFromQuaternion(tmp.quaternion, 'YXZ');
    this.base = { yaw: e.y, pitch: e.x };
    this.look = { yaw: e.y, pitch: e.x };
    this.controls.enabled = false;
    const far = this.camera.position.distanceTo(eye);
    this.camera.fov = this._seatFov(); this.camera.updateProjectionMatrix();
    this._fly(eye, tmp.quaternion, opts.dur || Math.min(1500, 650 + far * 40), opts.lift ?? Math.min(2, far * 0.12), () => {
      this.mode = 'seat';
      this.cb.onMode('seat', id);
    });
    this.cb.onMode('flying', id);
  }

  toHall() {
    const { pos, target } = this._overviewPose();
    const tmp = new THREE.PerspectiveCamera();
    tmp.position.copy(pos); tmp.lookAt(target);
    this.camera.fov = this._fov(78); this.camera.updateProjectionMatrix();
    this._fly(pos, tmp.quaternion, 1400, 2.5, () => {
      this.mode = 'hall';
      this.controls.target.copy(target);
      this.controls.enabled = true;
      this.controls.update();
      this.cb.onMode('hall', null);
    });
    this.current = null;
    this.cb.onMode('flying', null);
  }

  neighbour(id, dx, dRow) {
    const s = this.hall.seats.get(id);
    if (!s) return null;
    const rows = this.hall.rows;
    if (dRow) {
      const r = rows[s.rowIndex + dRow];
      if (!r) return null;
      let best = null, bd = Infinity;
      r.seats.forEach((o) => { const d = Math.abs(o.x - s.x); if (d < bd) { bd = d; best = o; } });
      return best && best.id;
    }
    const seats = rows[s.rowIndex].seats;
    const i = seats.findIndex((o) => o.id === id);
    const n = seats[i + dx];
    return n ? n.id : null;
  }

  /* Render the view from a seat (poster on the screen) to a JPEG data URL — used on the ticket */
  snapshot(id, outW = 720, outH = 340) {
    const s = this.hall && this.hall.seats.get(id);
    const hole = this.group && this.group.getObjectByName('screen');
    if (!s || !hole) return null;
    const cam = this.camera;
    const saved = { p: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov };
    const holeMat = hole.material;
    const img = this.movie.img;
    let posterMat = null;
    if (img && img.complete && img.naturalWidth) {
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      const r = (this.hall.screenH / this.hall.screenW) * (img.naturalWidth / img.naturalHeight);
      tex.repeat.set(1, Math.min(1, r));
      tex.offset.set(0, (1 - tex.repeat.y) * 0.65);
      tex.needsUpdate = true;
      posterMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false });
      hole.material = posterMat;
    }
    cam.position.set(s.x, s.y + 0.02, s.z + 0.04);
    cam.lookAt(0, this.hall.screenCentreY - 0.3, 0);
    // render at the ticket's own aspect ratio (independent of the stage / phone orientation)
    const prevRatio = this.gl.getPixelRatio();
    this.gl.setPixelRatio(1);
    this.gl.setSize(outW, outH, false);
    cam.aspect = outW / outH;
    cam.fov = 46;
    cam.updateProjectionMatrix();
    this.gl.render(this.scene, cam);
    const out = document.createElement('canvas');
    out.width = outW; out.height = outH;
    const g = out.getContext('2d');
    g.fillStyle = '#050203'; g.fillRect(0, 0, outW, outH);
    g.drawImage(this.gl.domElement, 0, 0, outW, outH);
    const url = out.toDataURL('image/jpeg', 0.85);
    hole.material = holeMat;
    if (posterMat) { posterMat.map.dispose(); posterMat.dispose(); }
    this.gl.setPixelRatio(prevRatio);
    cam.position.copy(saved.p); cam.quaternion.copy(saved.q); cam.fov = saved.fov;
    this._resize();
    return url;
  }

  setSound(on) {
    const f = this.iframe;
    if (!f || !f.contentWindow) return;
    const cmd = (func, args = []) => f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    if (on) { cmd('unMute'); cmd('setVolume', [100]); cmd('playVideo'); } else cmd('mute');
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._mountTrailer();
    this._resize();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    if (this.iframe) this.iframe.src = 'about:blank';   // stops audio/video
  }

  /* ---------------- building the hall ---------------- */
  _mat(color, opts = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts }); }
  _add(geo, mat, x, y, z, parent = this.group) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }

  _buildRoom() {
    const h = this.hall, g = this.group;
    const W = h.wallX, C = h.ceiling, back = h.backZ + 0.5, len = back + 0.6;
    const carpet = this._mat(0x1d1517), riser = this._mat(0x141012), wall = this._mat(0x0f0d0e);
    const led = new THREE.MeshBasicMaterial({ color: 0x8a4a14 });
    const aisleLed = new THREE.MeshBasicMaterial({ color: 0xffb35c });

    // lights
    g.add(new THREE.AmbientLight(0xffe0d8, 0.18));
    g.add(new THREE.HemisphereLight(0x3a2224, 0x0a0405, 0.5));
    const c0 = new THREE.Color(this.movie.colors[0]).lerp(C_WHITE, 0.55);
    this.screenLight = new THREE.SpotLight(c0, 2.2, 0, 1.05, 1, 0);
    this.screenLight.position.set(0, h.screenCentreY, 1.2);
    this.screenLight.target.position.set(0, 1.5, back * 0.65);
    g.add(this.screenLight, this.screenLight.target);

    // floor in front of the first row + stage
    const firstZ = h.rows[0].z;
    this._add(new THREE.BoxGeometry(W * 2, 0.4, firstZ + 0.4), carpet, 0, -0.2, (firstZ - 0.4) / 2 - 0.2);
    this._add(new THREE.BoxGeometry(h.screenW + 3, 0.5, 1.4), this._mat(0x1a0809), 0, 0.25, 0.5);
    this._add(new THREE.BoxGeometry(h.screenW + 3, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0x6fdc9a }), 0, 0.5, 1.2);

    // stadium platforms with step lights
    h.rows.forEach((row, i) => {
      const prev = h.rows[i - 1], next = h.rows[i + 1];
      const z0 = prev ? (prev.z + row.z) / 2 + 0.15 : firstZ - 0.55;
      const z1 = next ? (row.z + next.z) / 2 + 0.15 : back;
      const hgt = row.floor + 0.6;
      this._add(new THREE.BoxGeometry(W * 2, hgt, z1 - z0), i % 2 ? carpet : riser, 0, row.floor - hgt / 2, (z0 + z1) / 2);
      this._add(new THREE.BoxGeometry(W * 2, 0.025, 0.03), led, 0, row.floor + 0.012, z0 + 0.02);
      // aisle lights where there are gaps between seats
      const xs = row.seats.map((s) => s.x);
      for (let k = 1; k < xs.length; k++) {
        if (xs[k] - xs[k - 1] > 1.2) {
          const ax = (xs[k] + xs[k - 1]) / 2;
          this._add(new THREE.BoxGeometry(0.18, 0.04, 0.05), aisleLed, ax, row.floor + 0.03, z0 + 0.03);
        }
      }
    });

    // side walls with acoustic panels + sconces
    [-1, 1].forEach((side) => {
      this._add(new THREE.BoxGeometry(0.2, C + 4, len), wall, side * (W + 0.1), C / 2 - 1, len / 2 - 0.6);
      for (let z = 0.4, k = 0; z < back - 0.5; z += 2.1, k++) {
        const fa = h.floorAt(z);
        const ph = C - fa - 2.2;
        this._add(new THREE.BoxGeometry(0.12, ph, 1.9), this._mat(k % 2 ? 0x232022 : 0x1a1819, { roughness: 1 }),
          side * (W - 0.05), fa + 1.2 + ph / 2, z + 0.95);
        if (k % 2 === 0) {
          const sconce = this._add(new THREE.BoxGeometry(0.08, 0.5, 0.18), new THREE.MeshBasicMaterial({ color: 0xffc27a }), side * (W - 0.14), fa + 2.4, z + 0.95);
          if (k % 4 === 0) {
            const pl = new THREE.PointLight(0xff9a50, 1.6, 7, 1.6);
            pl.position.set(side * (W - 0.6), fa + 2.4, z + 0.95);
            g.add(pl);
          }
          sconce.renderOrder = 1;
        }
      }
    });

    // front wall, back wall, ceiling with star lights
    this._add(new THREE.PlaneGeometry(W * 2, C + 2), wall, 0, C / 2, -0.35);
    const backWall = this._add(new THREE.PlaneGeometry(W * 2, C + 6), wall, 0, C / 2, back);
    backWall.rotation.y = Math.PI;
    const ceil = this._add(new THREE.PlaneGeometry(W * 2, len), this._mat(0x0b0506), 0, C, len / 2 - 0.6);
    ceil.rotation.x = Math.PI / 2;
    const starPos = [];
    for (let i = 0; i < 520; i++) starPos.push((Math.random() * 2 - 1) * (W - 0.4), C - 0.02, Math.random() * (back - 1) + 0.5);
    const stars = new THREE.BufferGeometry();
    stars.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffe6c0, size: 0.06, sizeAttenuation: true, fog: false }));
    g.add(this.stars);

    // projector window + light beam toward the screen
    const proj = new THREE.Vector3(0, Math.min(C - 1, h.rows[h.rows.length - 1].floor + 3.2), back - 0.05);
    this._add(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff4dd }), proj.x, proj.y, proj.z - 0.01).rotation.y = Math.PI;
    const sw = h.screenW / 2, sb = h.screenBottom, st = h.screenBottom + h.screenH;
    const beam = new THREE.BufferGeometry();
    const p = proj.toArray();
    const corners = [[-sw, sb, 0.05], [sw, sb, 0.05], [sw, st, 0.05], [-sw, st, 0.05]];
    const verts = [];
    for (let i = 0; i < 4; i++) verts.push(...p, ...corners[i], ...corners[(i + 1) % 4]);
    beam.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    this.beam = new THREE.Mesh(beam, new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.movie.colors[0]).lerp(C_WHITE, 0.6), transparent: true, opacity: 0.035,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    g.add(this.beam);
  }

  _buildScreen() {
    const h = this.hall, g = this.group;
    const sw = h.screenW, sh = h.screenH, cy = h.screenCentreY;
    // masking frame
    this._add(new THREE.BoxGeometry(sw + 0.6, sh + 0.6, 0.12), new THREE.MeshBasicMaterial({ color: 0x020202 }), 0, cy, -0.08);
    // Kamala-red curtains with folds
    const cw = 3.2, ch = sh + 2.6;
    const cGeo = new THREE.PlaneGeometry(cw, ch, 48, 1);
    const pos = cGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 9) * 0.09);
    cGeo.computeVertexNormals();
    const velvet = this._mat(0x7a0c14, { roughness: 0.65, side: THREE.DoubleSide });
    [-1, 1].forEach((side) => this._add(cGeo, velvet, side * (sw / 2 + cw / 2 - 0.25), cy + 0.6, 0.15));
    this._add(new THREE.BoxGeometry(sw + 5, 0.9, 0.3), velvet, 0, cy + sh / 2 + 0.9, 0.2);
    // Kamala logo above the screen
    new THREE.TextureLoader().load('assets/kamala-logo.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const lw = 3.6;
      const logo = this._add(new THREE.PlaneGeometry(lw, lw / 5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: 0xffffff, fog: false }), 0, cy + sh / 2 + 2.1, -0.2);
      logo.renderOrder = 2;
    });
    // the "hole": writes transparent pixels so the CSS3D trailer underneath shows through
    const hole = this._add(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({
      color: 0x000000, opacity: 0, blending: THREE.NoBlending, side: THREE.DoubleSide, fog: false, toneMapped: false,
    }), 0, cy, 0.01);
    hole.name = 'screen';

    // CSS3D surface (poster fallback + YouTube iframe)
    const hpx = Math.round(CSS_W * sh / sw);
    const el = document.createElement('div');
    el.className = 'screen-surface';
    el.style.width = CSS_W + 'px';
    el.style.height = hpx + 'px';
    el.style.backgroundImage = `url("${this.movie.poster}")`;
    this.screenEl = el;
    this.iframe = null;
    this.cssObj = new CSS3DObject(el);
    this.cssObj.position.set(0, cy, 0.01);
    this.cssObj.scale.setScalar(sw / CSS_W);
    this.cssScene.add(this.cssObj);
    if (this.running) this._mountTrailer();
  }

  _mountTrailer() {
    if (!this.screenEl || !this.trailerId) return;
    if (!this.iframe) {
      this.iframe = document.createElement('iframe');
      this.iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      this.iframe.title = `${this.movie.title} trailer`;
      this.iframe.setAttribute('frameborder', '0');
      this.screenEl.appendChild(this.iframe);
    }
    const id = this.trailerId;
    const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    if (this.iframe.src !== src) this.iframe.src = src;
  }

  _buildSeats() {
    const n = this.seatList.length;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.05 });
    this.seatMesh = new THREE.InstancedMesh(seatGeometry(), mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    this.seatList.forEach((s, i) => {
      const couple = s.type !== 'S';
      sc.set(couple ? 1.17 : 1, couple ? 1.05 : 1, couple ? 1.1 : 1);
      p.set(s.x, s.y - 1.15, s.z);
      m.compose(p, q, sc);
      this.seatMesh.setMatrixAt(i, m);
      this.seatMesh.setColorAt(i, new THREE.Color(AREA_COLOR[s.area.code]));
    });
    this.seatMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.seatMesh);

    this.people = new THREE.InstancedMesh(personGeometry(), new THREE.MeshStandardMaterial({ color: 0x0e0a0b, roughness: 0.6 }), n);
    this.people.count = 0;
    this.group.add(this.people);
  }

  _applyStates() {
    const tmp = new THREE.Color();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    let k = 0;
    this.seatList.forEach((s, i) => {
      const sold = this.occupied.has(s.id);
      const picked = this.selected.has(s.id);
      tmp.set(sold ? C_SOLD : picked ? C_PICK : new THREE.Color(AREA_COLOR[s.area.code]));
      if (i === this.hoverIndex) tmp.lerp(C_WHITE, sold ? 0.15 : 0.5);
      if (s.id === this.current && !picked) tmp.lerp(C_PICK, 0.35);
      this.seatMesh.setColorAt(i, tmp);
      if (sold && s.id !== this.current) {
        p.set(s.x, s.y - 1.15, s.z);
        m.compose(p, q, one);
        this.people.setMatrixAt(k++, m);
      }
    });
    this.people.count = k;
    this.people.instanceMatrix.needsUpdate = true;
    this.seatMesh.instanceColor.needsUpdate = true;
  }

  /* ---------------- camera ---------------- */
  _overviewPose() {
    const h = this.hall, back = h.backZ;
    const top = h.rows[h.rows.length - 1].floor;
    return {
      pos: new THREE.Vector3(h.wallX * 0.35, Math.min(h.ceiling - 0.8, top + 5.5), back - 0.5),
      target: new THREE.Vector3(0, 1.4, back * 0.42),
    };
  }

  _intro() {
    const h = this.hall;
    this.mode = 'flying';
    this.controls.enabled = false;
    // start in front of the screen looking out at the empty hall, then sweep up to the back
    this.camera.position.set(0, h.screenCentreY + 1, 3);
    this.camera.lookAt(0, 1.5, h.backZ * 0.6);
    this.camera.fov = this._fov(78); this.camera.updateProjectionMatrix();
    setTimeout(() => this.toHall(), 350);
  }

  _fly(toPos, toQuat, dur, lift, done) {
    this.anim = {
      fromPos: this.camera.position.clone(), fromQ: this.camera.quaternion.clone(),
      toPos: toPos.clone(), toQ: toQuat.clone(), t0: performance.now(), dur, lift, done,
    };
  }

  /* vertical FOV that keeps roughly `hDeg` of horizontal view on any screen shape (phones in portrait) */
  _fov(hDeg) {
    const a = this.camera.aspect || 1;
    const v = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hDeg) / 2) / a) * 180 / Math.PI;
    return THREE.MathUtils.clamp(v, 50, 96);
  }

  _resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.gl.setSize(w, h);
    this.css.setSize(w, h);
    this.camera.aspect = w / h;
    if (!this.anim) this.camera.fov = this.mode === 'hall' ? this._fov(78) : this._seatFov();
    this._dirty = true;
    this.camera.updateProjectionMatrix();
  }

  /* ---------------- input ---------------- */
  _bindPointer() {
    const el = this.gl.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, yaw: this.look?.yaw, pitch: this.look?.pitch, moved: false };
      if (this.mode === 'seat') el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) down.moved = true;
        if (this.mode === 'seat' && down.moved) {
          const k = 0.0035 * (this.camera.fov / 60);
          this.look.yaw = THREE.MathUtils.clamp(down.yaw + dx * k, this.base.yaw - 1.4, this.base.yaw + 1.4);
          this.look.pitch = THREE.MathUtils.clamp(down.pitch + dy * k, -0.75, 0.85);
          return;
        }
      }
      this._hoverAt(e.clientX, e.clientY);
    });
    const up = (e) => {
      if (down && !down.moved) {
        const id = this._pick(e.clientX, e.clientY);
        if (id) this.cb.onSeatClick(id);
      }
      down = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('pointerleave', () => { if (!down) this._setHover(-1); this.cb.onHover(null); });
    el.addEventListener('wheel', (e) => {
      if (this.mode !== 'seat') return;
      e.preventDefault();
      this.camera.fov = THREE.MathUtils.clamp(this.camera.fov + e.deltaY * 0.03, 24, 100);
      this.camera.updateProjectionMatrix();
    }, { passive: false });
    el.addEventListener('dblclick', () => { if (this.mode === 'seat') this.look = { ...this.base }; });
  }

  _ray(x, y) {
    const r = this.gl.domElement.getBoundingClientRect();
    this.pointer.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.seatMesh, false)[0];
    return hit ? hit.instanceId : -1;
  }
  _pick(x, y) { const i = this._ray(x, y); return i >= 0 ? this.seatList[i].id : null; }
  _hoverAt(x, y) {
    if (!this.seatMesh || this.anim) return;
    const i = this._ray(x, y);
    this._setHover(i);
    this.gl.domElement.style.cursor = i >= 0 ? 'pointer' : this.mode === 'seat' ? 'grab' : 'default';
    this.cb.onHover(i >= 0 ? this.seatList[i].id : null, x, y);
  }
  _setHover(i) {
    if (i === this.hoverIndex) return;
    this.hoverIndex = i;
    this._applyStates();
  }

  /* ---------------- frame loop ---------------- */
  _loop(t) {
    if (!this.running) return;
    requestAnimationFrame(this._loop);
    // while the 2D seat map is on top, don't burn battery re-rendering an unchanged hall
    if (this.mode === 'map' && !this.anim && !this._dirty) return;
    this._dirty = false;
    if (this.anim) {
      const a = this.anim;
      const k = Math.min(1, (t - a.t0) / a.dur), e = ease(k);
      this.camera.position.lerpVectors(a.fromPos, a.toPos, e);
      this.camera.position.y += Math.sin(Math.PI * e) * a.lift;
      this.camera.quaternion.slerpQuaternions(a.fromQ, a.toQ, e);
      if (k >= 1) { this.anim = null; a.done && a.done(); }
    } else if (this.mode === 'seat') {
      const r = this.camera.rotation;
      r.y += (this.look.yaw - r.y) * 0.2;
      r.x += (this.look.pitch - r.x) * 0.2;
      r.z = 0;
    } else if (this.mode === 'hall') {
      this.controls.update();
      const tg = this.controls.target, h = this.hall;
      tg.x = THREE.MathUtils.clamp(tg.x, -h.wallX + 1, h.wallX - 1);
      tg.y = THREE.MathUtils.clamp(tg.y, 0, h.ceiling - 2);
      tg.z = THREE.MathUtils.clamp(tg.z, 0, h.backZ);
    }
    // the star ceiling only makes sense from inside the hall
    if (this.stars) this.stars.visible = this.camera.position.y < this.hall.ceiling - 0.2;
    // projector flicker
    if (this.screenLight) {
      const f = 1 + 0.08 * Math.sin(t / 230) + 0.05 * Math.sin(t / 71);
      this.screenLight.intensity = 2.2 * f;
      // keep the beam subtle; fade it when the camera is near the projector
      const near = this.camera.position.z > this.hall.backZ - 4 ? 0.35 : 1;
      this.beam.material.opacity = 0.018 * f * near;
    }
    this.gl.render(this.scene, this.camera);
    this.css.render(this.cssScene, this.camera);
  }

  _dispose(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { m.map && m.map.dispose(); m.dispose(); });
    });
  }
}
