/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Kristian Mario Mišković (TekiDeki)
 * Circuit Lab UI: breadboard drawing, touch and mouse interaction, lessons, quiz cards, repair mode. */
(function () {
  'use strict';

  const E = window.CircuitEngine;
  const I18N = window.CircuitI18N;
  const LESSONS = window.CircuitLessons.LESSONS;
  const CARDS = window.CircuitCards.CARDS;
  const CATEGORIES = window.CircuitCards.CATEGORIES;
  const CHALLENGES = window.CircuitRepair.CHALLENGES;

  const LANGS = ['ro', 'en', 'sr-latn', 'sr-cyrl'];
  const STORE_KEY = 'circuit-lab:v1';
  const COLS = 30;
  const PITCH = 18;
  const X0 = 46;
  const ROW_Y = { 'P1+': 22, 'P1-': 40, a: 84, b: 102, c: 120, d: 138, e: 156, f: 212, g: 230, h: 248, i: 266, j: 284, 'P2+': 340, 'P2-': 358 };
  const ROWS_ALL = 'abcdefghij'.split('');
  const RAILS = ['P1+', 'P1-', 'P2+', 'P2-'];
  const WIRE_COLORS = ['#dc2626', '#111827', '#eab308', '#2563eb', '#16a34a', '#f97316', '#a855f7'];
  const TOOL_PART_TYPES = ['battery', 'resistor', 'led', 'diode', 'capacitor', 'button', 'switch', 'npn', 'relay', 'ldr', 'ntc', 'pot'];
  const CAT_LABEL = { ro: {}, en: {}, 'sr-latn': {}, 'sr-cyrl': {} };

  // ---------- state ----------
  const S = {
    lang: 'en',
    tab: 'lab',
    circuit: { parts: [], wires: [] },
    tool: 'select',
    partType: 'resistor',
    pending: null,
    selected: null,
    undo: [],
    simulated: false,
    result: null,
    measure: null,
    drag: null,
    down: null,
    lesson: 0,
    deck: { cat: 'all', order: [], index: 0, answered: null, score: 0, done: false, correct: 0 },
    challenge: null,
    challengeResult: null,
    done: {},
    toastTimer: null
  };

  // ---------- language helpers ----------
  function ui(key) {
    const table = I18N.ui[S.lang] || I18N.ui.en;
    return table[key] !== undefined ? table[key] : (I18N.ui.en[key] !== undefined ? I18N.ui.en[key] : key);
  }
  function srKey(lang) { return lang === 'sr-latn' || lang === 'sr-cyrl' ? 'sr' : lang; }
  function cyrOut(text) { return S.lang === 'sr-cyrl' ? I18N.toCyrillic(text) : text; }
  // Localised value of a content object {ro, en, sr} (sr is Serbian Latin).
  function L(obj) {
    if (obj === undefined || obj === null) return '';
    if (typeof obj === 'string') return cyrOut(obj);
    const v = obj[srKey(S.lang)];
    if (Array.isArray(v)) return v.map(cyrOut);
    return cyrOut(v);
  }
  function setLang(lang) {
    if (LANGS.indexOf(lang) < 0) return;
    S.lang = lang;
    document.documentElement.lang = lang === 'sr-latn' ? 'sr-Latn' : (lang === 'sr-cyrl' ? 'sr-Cyrl' : lang);
    saveStore();
    renderAll();
  }
  function detectLang() {
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.indexOf('ro') === 0) return 'ro';
    if (nav.indexOf('sr') === 0) return nav.indexOf('cyrl') >= 0 || nav.indexOf('-cy') >= 0 ? 'sr-cyrl' : 'sr-latn';
    return 'en';
  }

  // ---------- persistence ----------
  function saveStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        lang: S.lang, tab: S.tab, circuit: S.circuit, done: S.done, challenge: S.challenge
      }));
    } catch (e) { /* storage unavailable: keep working in memory */ }
  }
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // ---------- geometry ----------
  const HOLE_IDS = [];
  for (let c = 1; c <= COLS; c++) for (const r of ROWS_ALL) HOLE_IDS.push(r + c);
  for (let c = 1; c <= COLS; c++) for (const r of RAILS) HOLE_IDS.push(r + c);

  function holeXY(id) {
    const p = E.parseHole(id);
    if (!p) return null;
    return [X0 + (p.col - 1) * PITCH, ROW_Y[p.row]];
  }
  function holeAt(x, y, radius) {
    let best = null, bestD = (radius || 9) * (radius || 9);
    for (const id of HOLE_IDS) {
      const xy = holeXY(id);
      const d = (xy[0] - x) * (xy[0] - x) + (xy[1] - y) * (xy[1] - y);
      if (d < bestD) { bestD = d; best = id; }
    }
    return best;
  }
  function svgPoint(evt) {
    const svg = document.getElementById('board');
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function formatOhm(R) {
    if (R >= 1e6) return (R / 1e6) + ' MΩ';
    if (R >= 1000) return (R / 1000) + ' kΩ';
    return R + ' Ω';
  }
  function fmtI(I) {
    const a = Math.abs(I);
    if (a < 1e-6) return '0 A';
    if (a < 1e-3) return (I * 1e6).toFixed(0) + ' µA';
    return (I * 1e3).toFixed(a * 1e3 < 10 ? 1 : 0) + ' mA';
  }
  function fmtV(V) { return (Math.abs(V) < 0.005 ? 0 : V).toFixed(2) + ' V'; }
  function fmtP(P) { return P < 1e-3 ? (P * 1e6).toFixed(0) + ' µW' : (P * 1e3).toFixed(P * 1e3 < 10 ? 1 : 0) + ' mW'; }

  // ---------- part identity / labels ----------
  function partLabel(part) {
    const list = S.circuit.parts.filter(p => p.type === part.type);
    const n = list.indexOf(part) + 1;
    return typeName(part.type) + ' ' + n;
  }
  function typeName(type) {
    const names = ui('typeNames');
    return names && names[type] ? names[type] : type;
  }
  function partSummary(part) {
    const props = part.props || {};
    switch (part.type) {
      case 'battery': return (props.V !== undefined ? props.V : 9) + ' V';
      case 'resistor': return formatOhm(props.R || 220);
      case 'led': return ui('colorNames')[props.color || 'red'];
      case 'capacitor': return (props.uF || 100) + ' µF';
      case 'ldr': return ui('light') + ' ' + Math.round((props.light === undefined ? 0.5 : props.light) * 100) + '%';
      case 'ntc': return (props.temp === undefined ? 25 : props.temp) + ' °C';
      case 'pot': return Math.round((props.pos === undefined ? 0.5 : props.pos) * 100) + '%';
      default: return '';
    }
  }

  // ---------- SVG drawing ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  const RES_BANDS = ['#111111', '#8b4513', '#dc2626', '#f97316', '#facc15', '#16a34a', '#2563eb', '#9333ea', '#737373', '#f8fafc'];
  function bandColors(R) {
    const e = Math.floor(Math.log10(R));
    const mant = R / Math.pow(10, e);
    const d1 = Math.floor(mant + 1e-9);
    const d2 = Math.round((mant - d1) * 10);
    return [RES_BANDS[d1], RES_BANDS[d2], RES_BANDS[Math.max(0, e - 1)]];
  }

  function resistorSVG(x1, x2, y, fill, label, R) {
    let g = '';
    g += `<line x1="${x1}" y1="${y}" x2="${x1}" y2="${y - 17}" class="lead"/>`;
    g += `<line x1="${x2}" y1="${y}" x2="${x2}" y2="${y - 17}" class="lead"/>`;
    g += `<rect x="${x1}" y="${y - 28}" width="${x2 - x1}" height="11" rx="4" fill="${fill}"/>`;
    if (R) {
      const bands = bandColors(R);
      const w = x2 - x1;
      bands.forEach((c, i) => { g += `<rect x="${x1 + w * (0.5 + i * 0.1) - 2}" y="${y - 28}" width="4" height="11" fill="${c}"/>`; });
    } else if (label) {
      g += `<text x="${(x1 + x2) / 2}" y="${y - 20}" class="lbl-in" text-anchor="middle">${esc(label)}</text>`;
    }
    return g;
  }

  function partSVG(part, res) {
    const pins = E.partPins(part);
    const xy = pins.map(holeXY);
    const props = part.props || {};
    const info = res && res.parts ? res.parts.get(part.id) : null;
    let g = '';
    const burned = !!part.burned;
    switch (part.type) {
      case 'battery': {
        const x = xy[0][0];
        const top = part.row === 'P1' ? -30 : 326;
        const bot = part.row === 'P1' ? 52 : 372;
        g += `<rect x="${x - 12}" y="${top}" width="24" height="${bot - top}" rx="5" class="battery"/>`;
        g += `<text x="${x}" y="${(top + bot) / 2 + 4}" class="lbl-in" text-anchor="middle">${props.V !== undefined ? props.V : 9}V</text>`;
        g += `<text x="${x + 16}" y="${ROW_Y[part.row + '+'] + 4}" class="plus">+</text>`;
        g += `<text x="${x + 16}" y="${ROW_Y[part.row + '-'] + 4}" class="minus">-</text>`;
        break;
      }
      case 'resistor': {
        g += resistorSVG(xy[0][0], xy[1][0], xy[0][1], '#d6b98c', '', props.R || 220);
        if (info && Math.abs(info.I) > 1e-6) g += `<text x="${(xy[0][0] + xy[1][0]) / 2}" y="${xy[0][1] - 34}" class="cur" text-anchor="middle">${fmtI(info.I)}</text>`;
        break;
      }
      case 'ldr': {
        g += resistorSVG(xy[0][0], xy[1][0], xy[0][1], '#c9a46a', '', 0);
        const cx = (xy[0][0] + xy[1][0]) / 2;
        g += `<circle cx="${cx}" cy="${xy[0][1] - 40}" r="6" fill="#fde68a" stroke="#a16207"/><text x="${cx}" y="${xy[0][1] - 36}" class="lbl-in" text-anchor="middle" style="fill:#111">LDR</text>`;
        break;
      }
      case 'ntc': {
        g += resistorSVG(xy[0][0], xy[1][0], xy[0][1], '#a16207', 'NTC', 0);
        break;
      }
      case 'led': {
        const x1 = xy[0][0], x2 = xy[1][0], y = xy[0][1];
        const cx = (x1 + x2) / 2;
        const color = E.LED_COLORS[props.color || 'red'].hex;
        const b = info && info.brightness ? info.brightness : 0;
        g += `<line x1="${x1}" y1="${y}" x2="${x1}" y2="${y - 20}" class="lead"/><line x1="${x2}" y1="${y}" x2="${x2}" y2="${y - 20}" class="lead"/>`;
        if (burned) {
          g += `<circle cx="${cx}" cy="${y - 32}" r="9" fill="#111"/><path d="M${cx - 5} ${y - 37}L${cx + 5} ${y - 27}M${cx + 5} ${y - 37}L${cx - 5} ${y - 27}" stroke="#f87171" stroke-width="2"/>`;
        } else {
          if (b > 0.02) g += `<circle cx="${cx}" cy="${y - 32}" r="${14 + 6 * b}" fill="${color}" opacity="${0.25 + 0.5 * b}"/>`;
          g += `<circle cx="${cx}" cy="${y - 32}" r="8" fill="${color}" stroke="#334155" stroke-width="1"/>`;
        }
        g += `<text x="${x1 - 4}" y="${y - 22}" class="sign">+</text>`;
        if (info && Math.abs(info.I) > 1e-6 && !burned) g += `<text x="${cx}" y="${y - 52}" class="cur" text-anchor="middle">${fmtI(info.I)}</text>`;
        break;
      }
      case 'diode':
      case 'capacitor': {
        const x1 = xy[0][0], x2 = xy[1][0], y = xy[0][1];
        const fill = part.type === 'capacitor' ? '#1d4ed8' : '#111827';
        g += `<line x1="${x1}" y1="${y}" x2="${x1}" y2="${y - 18}" class="lead"/><line x1="${x2}" y1="${y}" x2="${x2}" y2="${y - 18}" class="lead"/>`;
        g += `<rect x="${x1 + 2}" y="${y - 30}" width="${x2 - x1 - 4}" height="12" rx="3" fill="${fill}"/>`;
        if (part.type === 'diode') g += `<rect x="${x2 - 8}" y="${y - 30}" width="3" height="12" fill="#e5e7eb"/>`;
        else g += `<text x="${(x1 + x2) / 2}" y="${y - 21}" class="lbl-in" text-anchor="middle">${props.uF ? props.uF + 'µ' : 'C'}</text>`;
        if (burned) g += `<text x="${(x1 + x2) / 2}" y="${y - 40}" class="burnt" text-anchor="middle">×</text>`;
        break;
      }
      case 'button':
      case 'switch': {
        const x1 = xy[0][0], x2 = xy[1][0], y = xy[0][1];
        const pressed = part.type === 'button' ? !!props.pressed : !!props.on;
        const dy = part.type === 'button' && pressed ? 3 : 0;
        g += `<line x1="${x1}" y1="${y}" x2="${x1}" y2="${y - 18}" class="lead"/><line x1="${x2}" y1="${y}" x2="${x2}" y2="${y - 18}" class="lead"/>`;
        g += `<rect x="${x1 - 6}" y="${y - 34 + dy}" width="${x2 - x1 + 12}" height="16" rx="4" fill="${pressed ? '#4b5563' : '#374151'}"/>`;
        if (part.type === 'switch') {
          const kx = pressed ? x2 - 2 : x1 + 2;
          g += `<circle cx="${kx}" cy="${y - 26}" r="5" fill="${pressed ? '#22c55e' : '#f87171'}"/>`;
        } else {
          g += `<circle cx="${(x1 + x2) / 2}" cy="${y - 26 + dy}" r="4" fill="#e5e7eb"/>`;
        }
        break;
      }
      case 'npn': {
        const [x0, x1b, x2] = [xy[0][0], xy[1][0], xy[2][0]];
        const y = xy[0][1];
        g += `<line x1="${x0}" y1="${y}" x2="${x0}" y2="${y - 16}" class="lead"/><line x1="${x1b}" y1="${y}" x2="${x1b}" y2="${y - 22}" class="lead"/><line x1="${x2}" y1="${y}" x2="${x2}" y2="${y - 16}" class="lead"/>`;
        g += `<circle cx="${x1b}" cy="${y - 30}" r="14" fill="#111827"/><text x="${x1b}" y="${y - 27}" class="lbl-in" text-anchor="middle">NPN</text>`;
        g += `<text x="${x0 + 4}" y="${y - 2}" class="sign">B</text><text x="${x1b + 4}" y="${y - 2}" class="sign">C</text><text x="${x2 + 4}" y="${y - 2}" class="sign">E</text>`;
        break;
      }
      case 'relay': {
        const xs = xy.map(p => p[0]);
        const y = xy[0][1];
        const left = xs[0] - 7, right = xs[4] + 7;
        xs.forEach(x => { g += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 18}" class="lead"/>`; });
        const closed = !!(part.state && part.state.closed);
        g += `<rect x="${left}" y="${y - 46}" width="${right - left}" height="28" rx="5" fill="#1f2937"/>`;
        g += `<text x="${(left + right) / 2}" y="${y - 34}" class="lbl-in" text-anchor="middle">RELAY</text>`;
        g += `<circle cx="${right - 10}" cy="${y - 26}" r="4" fill="${closed ? '#22c55e' : '#6b7280'}"/>`;
        g += `<text x="${xs[2]}" y="${y - 2}" class="sign">C</text><text x="${xs[3]}" y="${y - 2}" class="sign">N</text><text x="${xs[4]}" y="${y - 2}" class="sign">-</text>`;
        break;
      }
      case 'pot': {
        const xs = xy.map(p => p[0]);
        const y = xy[0][1];
        const pos = props.pos === undefined ? 0.5 : props.pos;
        xs.forEach(x => { g += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 18}" class="lead"/>`; });
        g += `<rect x="${xs[0] - 8}" y="${y - 42}" width="${xs[2] - xs[0] + 16}" height="26" rx="6" fill="#1f2937"/>`;
        g += `<line x1="${xs[0]}" y1="${y - 28}" x2="${xs[2]}" y2="${y - 28}" stroke="#94a3b8" stroke-width="2"/>`;
        const kx = xs[0] + (xs[2] - xs[0]) * (1 - pos);
        g += `<circle cx="${kx}" cy="${y - 28}" r="5" fill="#fde047"/>`;
        break;
      }
      default: break;
    }
    return g;
  }

  function wireSVG(w, index) {
    const a = holeXY(w.a), b = holeXY(w.b);
    if (!a || !b) return '';
    const color = WIRE_COLORS[index % WIRE_COLORS.length];
    const mx = (a[0] + b[0]) / 2;
    const my = Math.min(a[1], b[1]) - 26 - Math.abs(a[0] - b[0]) * 0.05;
    const sel = S.selected === w.id ? ' selected' : '';
    return `<path d="M${a[0]} ${a[1]} Q${mx} ${my} ${b[0]} ${b[1]}" class="wire${sel}" stroke="${color}" data-wire="${w.id}"/>`;
  }

  function boardBase() {
    let g = '';
    g += `<rect x="6" y="-30" width="602" height="394" rx="12" class="board-bg"/>`;
    // rails
    const rail = (row, color) => {
      g += `<line x1="${X0 - 14}" y1="${ROW_Y[row]}" x2="${X0 + (COLS - 1) * PITCH + 14}" y2="${ROW_Y[row]}" stroke="${color}" stroke-width="1.5" opacity=".6"/>`;
    };
    rail('P1+', '#dc2626'); rail('P1-', '#2563eb'); rail('P2+', '#dc2626'); rail('P2-', '#2563eb');
    g += `<text x="16" y="${ROW_Y['P1+'] + 4}" class="rail-sign" fill="#dc2626">+</text><text x="16" y="${ROW_Y['P1-'] + 4}" class="rail-sign" fill="#2563eb">-</text>`;
    g += `<text x="16" y="${ROW_Y['P2+'] + 4}" class="rail-sign" fill="#dc2626">+</text><text x="16" y="${ROW_Y['P2-'] + 4}" class="rail-sign" fill="#2563eb">-</text>`;
    // column numbers
    for (let c = 5; c <= COLS; c += 5) g += `<text x="${X0 + (c - 1) * PITCH}" y="-14" class="colnum" text-anchor="middle">${c}</text>`;
    // row letters
    for (const r of ROWS_ALL) g += `<text x="30" y="${ROW_Y[r] + 4}" class="rowletter" text-anchor="middle">${r}</text>`;
    g += `<text x="307" y="190" class="channel" text-anchor="middle">a-e · f-j</text>`;
    // holes
    for (const id of HOLE_IDS) {
      const xy = holeXY(id);
      g += `<circle cx="${xy[0]}" cy="${xy[1]}" r="3.4" class="hole" data-hole="${id}"/>`;
    }
    return g;
  }

  function renderBoard() {
    const svg = document.getElementById('board');
    const res = S.simulated ? S.result : null;
    let g = boardBase();
    S.circuit.wires.forEach((w, i) => { g += wireSVG(w, i); });
    // pins highlight
    const pinned = new Set();
    S.circuit.parts.forEach(p => E.partPins(p).forEach(h => pinned.add(h)));
    for (const h of pinned) {
      const xy = holeXY(h);
      if (xy) g += `<circle cx="${xy[0]}" cy="${xy[1]}" r="2.2" class="pin"/>`;
    }
    S.circuit.parts.forEach(p => {
      const sel = S.selected === p.id ? ' selected-part' : '';
      g += `<g class="part${sel}" data-part="${p.id}">${partSVG(p, res)}</g>`;
    });
    if (S.pending) {
      const xy = holeXY(S.pending);
      if (xy) g += `<circle cx="${xy[0]}" cy="${xy[1]}" r="7" class="pending"/>`;
    }
    if (S.measure) {
      const xy = holeXY(S.measure.hole);
      if (xy) {
        const txt = S.measure.v === null ? ui('measureNone') : fmtV(S.measure.v);
        g += `<circle cx="${xy[0]}" cy="${xy[1]}" r="7" class="measure"/>`;
        g += `<text x="${xy[0] + 10}" y="${xy[1] - 10}" class="measure-txt">${esc(S.measure.v === null ? '-' : txt)}</text>`;
      }
    }
    svg.innerHTML = g;
    svg.setAttribute('aria-label', ui('appTitle'));
  }

  // ---------- circuit editing ----------
  function pushUndo() {
    S.undo.push(JSON.stringify(S.circuit));
    if (S.undo.length > 80) S.undo.shift();
  }
  function nextId(prefix) {
    let n = 1;
    const used = new Set(S.circuit.parts.map(p => p.id).concat(S.circuit.wires.map(w => w.id)));
    while (used.has(prefix + n)) n++;
    return prefix + n;
  }
  function placePart(type, hole) {
    const chk = E.checkPlacement(S.circuit, type, hole);
    if (!chk.ok) {
      const map = { occupied: 'errOccupied', offBoard: 'errOffBoard', needsRail: 'errNeedsRail', noRail: 'errNoRail', badHole: 'errBadHole' };
      toast(ui(map[chk.reason] || 'errBadHole'));
      return false;
    }
    pushUndo();
    const part = { id: nextId('p'), type: type, row: chk.row, col: chk.col, props: Object.assign({}, E.TYPES[type].defaults), burned: false };
    S.circuit.parts.push(part);
    S.selected = part.id;
    afterEdit();
    return true;
  }
  function addWire(a, b) {
    if (a === b) return;
    if (S.circuit.wires.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return;
    pushUndo();
    S.circuit.wires.push({ id: nextId('w'), a: a, b: b });
    afterEdit();
  }
  function removeSelected() {
    if (!S.selected) return;
    pushUndo();
    S.circuit.parts = S.circuit.parts.filter(p => p.id !== S.selected);
    S.circuit.wires = S.circuit.wires.filter(w => w.id !== S.selected);
    S.selected = null;
    afterEdit();
  }
  // Burns are permanent: an undo never un-burns a part that is burned now.
  function undo() {
    if (!S.undo.length) return;
    const next = JSON.parse(S.undo.pop());
    const burnedIds = new Set(S.circuit.parts.filter(p => p.burned).map(p => p.id));
    next.parts.forEach(p => { if (burnedIds.has(p.id)) p.burned = true; });
    S.circuit = next;
    S.selected = null;
    afterEdit();
  }
  function afterEdit() {
    if (S.simulated) runSim(false);
    saveStore();
    renderLab();
  }
  function runSim(announce) {
    S.result = E.simulate(S.circuit);
    S.simulated = true;
    if (announce) {
      const r = S.result;
      if (r.noPower) setStatus(ui('noPower'), 'warn');
      else if (r.warnings.some(w => w.code === 'burn')) setStatus(ui('burnDone') + r.warnings.filter(w => w.code === 'burn').length, 'bad');
      else if (r.shorted) setStatus(ui('shorted'), 'bad');
      else if (!r.converged) setStatus(ui('noConverge'), 'warn');
      else setStatus(ui('ok') + ' · I = ' + fmtI(r.batteryCurrent), 'good');
    }
    if (S.result && S.result.burnedNow && S.result.burnedNow.length) saveStore();
  }
  function setStatus(text, kind) {
    const el = document.getElementById('status');
    el.textContent = text;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }
  let toastTimer = null;
  function toast(text) {
    const t = document.getElementById('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- pointer interaction ----------
  function hitPart(p) {
    for (const part of S.circuit.parts) {
      const xy = E.partPins(part).map(holeXY);
      const xs = xy.map(q => q[0]), ys = xy.map(q => q[1]);
      let minX = Math.min.apply(null, xs) - 12, maxX = Math.max.apply(null, xs) + 12;
      let minY = Math.min.apply(null, ys) - 50, maxY = Math.max.apply(null, ys) + 14;
      if (part.type === 'battery') { minY = part.row === 'P1' ? -32 : 322; maxY = part.row === 'P1' ? 56 : 376; }
      if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) return part;
    }
    return null;
  }
  function hitWire(p) {
    for (const w of S.circuit.wires) {
      const a = holeXY(w.a), b = holeXY(w.b);
      if (!a || !b) continue;
      const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 26 - Math.abs(a[0] - b[0]) * 0.05;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mx + t * t * b[0];
        const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * my + t * t * b[1];
        if ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) < 64) return w;
      }
    }
    return null;
  }

  function onDown(e) {
    if (e.button && e.button !== 0) return;
    const p = svgPoint(e);
    const part = hitPart(p);
    const wire = part ? null : hitWire(p);
    const hole = holeAt(p.x, p.y, 10);
    S.down = { x: p.x, y: p.y, part: part, wire: wire, hole: hole, moved: false, startHole: hole, pointerId: e.pointerId };
    if (S.tool === 'select' && part) {
      S.drag = { id: part.id, origCol: part.col, origRow: part.row, startCol: hole ? E.parseHole(hole).col : part.col, startRow: part.row, changed: false };
      if (part.type === 'button') {
        part.props.pressed = true;
        if (S.simulated) runSim(false);
        renderBoard();
      }
      try { document.getElementById('board').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!S.down) return;
    const p = svgPoint(e);
    const dx = p.x - S.down.x, dy = p.y - S.down.y;
    if (!S.down.moved && dx * dx + dy * dy > 36) S.down.moved = true;
    if (S.drag && S.down.moved) {
      const part = S.circuit.parts.find(q => q.id === S.drag.id);
      const h = holeAt(p.x, p.y, 14);
      if (part && h) {
        const hp = E.parseHole(h);
        const isRailHole = hp.row[0] === 'P';
        if (isRailHole === (part.type === 'battery')) {
          const newCol = hp.col - (S.drag.startCol - S.drag.origCol);
          const others = { parts: S.circuit.parts.filter(q => q.id !== part.id), wires: [] };
          const chk = E.checkPlacement(others, part.type, hp.row + newCol);
          if (chk.ok && (part.col !== chk.col || part.row !== chk.row)) {
            part.col = chk.col; part.row = chk.row; S.drag.changed = true;
            renderBoard();
          }
        }
      }
    }
    e.preventDefault();
  }

  function onUp(e) {
    const down = S.down;
    S.down = null;
    if (!down) return;
    const drag = S.drag;
    S.drag = null;
    const p = svgPoint(e);
    if (drag && drag.changed) {
      // the part already moved in onMove; store the undo state from before the move
      pushUndo();
      S.undo[S.undo.length - 1] = JSON.stringify(Object.assign({}, S.circuit, { parts: S.circuit.parts.map(q => (q.id === drag.id ? Object.assign({}, q, { col: drag.origCol, row: drag.origRow }) : q)) }));
      S.selected = drag.id;
      afterEdit();
      return;
    }
    const part = down.part;
    if (part && part.type === 'button') {
      part.props.pressed = false;
      if (S.simulated) runSim(false);
      saveStore();
    }
    if (down.moved) { renderLab(); return; }
    // tap
    const hole = holeAt(p.x, p.y, 10);
    switch (S.tool) {
      case 'select': {
        if (part) {
          if (part.type === 'switch') {
            pushUndo();
            part.props.on = !part.props.on;
            if (S.simulated) runSim(false);
            S.selected = part.id;
            afterEdit();
          } else {
            S.selected = part.id;
            renderLab();
          }
        } else if (down.wire) {
          S.selected = down.wire.id;
          renderLab();
        } else {
          S.selected = null;
          renderLab();
        }
        break;
      }
      case 'place': {
        if (hole) placePart(S.partType, hole);
        else toast(ui('placeHint'));
        break;
      }
      case 'wire': {
        if (!hole) { toast(ui('wireFrom')); break; }
        if (!S.pending) { S.pending = hole; renderLab(); setStatus(ui('wireTo'), ''); }
        else {
          const from = S.pending;
          S.pending = null;
          addWire(from, hole);
        }
        break;
      }
      case 'measure': {
        if (!hole) break;
        const v = S.simulated && S.result ? S.result.nodeVoltage(hole) : null;
        S.measure = { hole: hole, v: v };
        if (!S.simulated) setStatus(ui('simulate') + ' →', 'warn');
        renderBoard();
        break;
      }
      case 'delete': {
        if (part) { S.selected = part.id; removeSelected(); }
        else if (down.wire) { S.selected = down.wire.id; removeSelected(); }
        break;
      }
      default: break;
    }
    e.preventDefault();
  }

  function onCancel() { S.down = null; S.drag = null; }

  // ---------- rendering: toolbar, inspector, readout ----------
  function renderToolbar() {
    const tools = [
      ['select', 'select'], ['wire', 'wire'], ['measure', 'measure'], ['delete', 'del']
    ];
    const g1 = document.getElementById('groupTools');
    g1.innerHTML = `<span class="label">${esc(ui('select'))}</span>` + tools.map(([id, key]) =>
      `<button type="button" data-tool="${id}" aria-pressed="${S.tool === id}">${esc(ui(key))}</button>`).join('');
    const g2 = document.getElementById('groupParts');
    g2.innerHTML = TOOL_PART_TYPES.map(t =>
      `<button type="button" data-part="${t}" aria-pressed="${S.tool === 'place' && S.partType === t}">${esc(ui('typeNames')[t])}</button>`).join('');
    const hints = {
      select: ui('selectHint'), wire: S.pending ? ui('wireTo') : ui('wireFrom'),
      measure: ui('measureHint'), delete: ui('del') + ': ' + ui('selectHint'),
      place: ui('placeHint')
    };
    document.getElementById('toolHint').textContent = hints[S.tool] || '';
    const ex = document.getElementById('examples');
    const cur = ex.value;
    ex.innerHTML = `<option value="">${esc(ui('examples'))}</option>` + LESSONS.map((l, i) => `<option value="${i}">${esc(L(l.title))}</option>`).join('');
    ex.value = cur || '';
    document.getElementById('btnUndo').disabled = S.undo.length === 0;
  }

  function renderInspector() {
    const title = document.getElementById('inspectTitle');
    const body = document.getElementById('inspectBody');
    const part = S.circuit.parts.find(p => p.id === S.selected);
    const wire = S.circuit.wires.find(w => w.id === S.selected);
    if (part) {
      title.textContent = partLabel(part);
      const props = part.props || {};
      let h = '';
      if (part.burned) h += `<p><span class="tag burn">${esc(ui('burnedHint'))}</span></p>`;
      const select = (key, opts, val, fmt) => `<label>${esc(ui(key))}<br><select data-prop="${key}">` + opts.map(o => `<option value="${o}" ${String(o) === String(val) ? 'selected' : ''}>${esc(fmt(o))}</option>`).join('') + '</select></label>';
      const range = (key, val, max) => `<label>${esc(ui(key))}: <span data-out="${key}">${val}</span><input type="range" min="0" max="${max}" step="1" value="${val}" data-range="${key}"></label>`;
      switch (part.type) {
        case 'battery': h += select('value', E.BATTERY_VOLTAGES, props.V !== undefined ? props.V : 9, v => v + ' V'); break;
        case 'resistor': h += select('value', E.RESISTOR_VALUES, props.R || 220, formatOhm); break;
        case 'led': h += select('color', Object.keys(E.LED_COLORS), props.color || 'red', k => ui('colorNames')[k]); break;
        case 'capacitor': h += select('value', [1, 10, 47, 100, 470], props.uF || 100, v => v + ' µF'); break;
        case 'button': h += `<label><input type="checkbox" data-check="pressed" ${props.pressed ? 'checked' : ''}> ${esc(ui('pressed'))}</label>`; break;
        case 'switch': h += `<label><input type="checkbox" data-check="on" ${props.on ? 'checked' : ''}> ${esc(ui('on'))}</label>`; break;
        case 'ldr': h += range('light', Math.round((props.light === undefined ? 0.5 : props.light) * 100), 100); break;
        case 'ntc': h += range('temp', props.temp === undefined ? 25 : props.temp, 100); break;
        case 'pot': h += range('pos', Math.round((props.pos === undefined ? 0.5 : props.pos) * 100), 100); break;
        default: break;
      }
      h += `<div class="row"><button type="button" data-act="delete-part">${esc(ui('del'))}</button></div>`;
      body.innerHTML = h;
    } else if (wire) {
      title.textContent = ui('wire') + ' · ' + wire.a + ' → ' + wire.b;
      body.innerHTML = `<div class="row"><button type="button" data-act="delete-part">${esc(ui('del'))}</button></div>`;
    } else {
      title.textContent = ui('inspect');
      body.innerHTML = `<p class="hint">${esc(ui('none'))}</p>`;
    }
  }

  function renderReadout() {
    const box = document.getElementById('readout');
    document.getElementById('readoutTitle').textContent = ui('status');
    document.getElementById('dcNote').textContent = ui('dcNote');
    if (!S.simulated || !S.result) {
      box.innerHTML = `<p class="hint">${esc(ui('simulate'))}</p>`;
      return;
    }
    const r = S.result;
    let h = '';
    const warn = [];
    if (r.noPower) warn.push(ui('noPower'));
    if (r.shorted) warn.push(ui('shorted'));
    if (!r.converged) warn.push(ui('noConverge'));
    r.warnings.forEach(w => { if (w.code === 'relayLoop') warn.push(ui('relayLoop')); });
    if (warn.length) h += warn.map(t => `<p class="status warn">${esc(t)}</p>`).join('');
    if (!r.noPower) {
      h += `<table class="readout"><thead><tr><th></th><th>${esc(ui('current'))}</th><th>${esc(ui('voltage'))}</th><th>${esc(ui('power'))}</th></tr></thead><tbody>`;
      S.circuit.parts.forEach(part => {
        const info = r.parts.get(part.id);
        if (!info) return;
        let tag = '';
        if (part.burned) tag = `<span class="tag burn">${esc(ui('burnedNames'))}</span>`;
        else if (part.type === 'relay') tag = `<span class="tag ${part.state && part.state.closed ? 'on' : 'off'}">${esc(part.state && part.state.closed ? ui('closedWord') : ui('openWord'))}</span>`;
        else if (part.type === 'led' || part.type === 'npn' || part.type === 'button' || part.type === 'switch') tag = `<span class="tag ${info.on ? 'on' : 'off'}">${esc(info.on ? ui('on') : ui('off'))}</span>`;
        h += `<tr><td>${esc(partLabel(part))}<br>${tag}</td><td class="num">${fmtI(info.I)}</td><td class="num">${fmtV(info.V || 0)}</td><td class="num">${fmtP(info.P || 0)}</td></tr>`;
      });
      h += '</tbody></table>';
    }
    box.innerHTML = h;
  }

  function renderLab() {
    renderToolbar();
    renderBoard();
    renderInspector();
    renderReadout();
    const rep = document.getElementById('repairPanel');
    rep.hidden = S.tab !== 'repair';
    if (S.tab === 'repair') renderRepairPanel();
    document.getElementById('btnSimulate').textContent = S.simulated ? ui('resimulate') : ui('simulate');
    document.getElementById('btnClear').textContent = ui('clear');
    document.getElementById('btnUndo').textContent = ui('undo');
    if (S.simulated && S.result) {
      const r = S.result;
      if (r.noPower) setStatus(ui('noPower'), 'warn');
      else if (r.shorted) setStatus(ui('shorted'), 'bad');
      else if (r.warnings.some(w => w.code === 'burn')) setStatus(ui('burnDone') + S.circuit.parts.filter(p => p.burned).length, 'bad');
      else setStatus(ui('ok') + ' · I = ' + fmtI(r.batteryCurrent), 'good');
    } else {
      setStatus('', '');
    }
  }

  // ---------- repair (broken circuits) ----------
  function challengeTitle(ch) { return L(ch.title); }
  function describeScenario(sc) {
    const parts = [];
    const inp = sc.in || {};
    if (inp.button !== undefined) parts.push(ui('inputButton') + ': ' + (inp.button ? ui('yes') : ui('no')));
    if (inp.switch !== undefined) parts.push(ui('inputSwitch') + ': ' + (inp.switch ? ui('yes') : ui('no')));
    if (inp.ldr !== undefined) parts.push(ui('inputLdr') + ': ' + Math.round(inp.ldr * 100) + '%');
    if (inp.ntc !== undefined) parts.push(ui('inputNtc') + ': ' + inp.ntc + ' °C');
    if (inp.pot !== undefined) parts.push(ui('inputPot') + ': ' + Math.round(inp.pot * 100) + '%');
    const exp = [];
    Object.keys(sc.expect || {}).forEach(k => {
      const m = /^(led|relay|npn)(\d*)$/.exec(k);
      if (!m) return;
      const name = m[1] === 'led' ? ui('expLed') : m[1] === 'relay' ? ui('expRelay') : ui('expNpn');
      const num = m[2] ? ' ' + m[2] : '';
      const v = sc.expect[k];
      const word = v === 'on' ? ui('expOn') : v === 'off' ? ui('expOff') : v === 'closed' ? ui('expClosed') : v === 'open' ? ui('expOpen') : v === 'saturated' ? ui('expSaturated') : v;
      exp.push(name + num + ' ' + word);
    });
    return { inputs: parts, expects: exp };
  }
  function gotWord(got) {
    const map = { on: ui('expOn'), off: ui('expOff'), closed: ui('expClosed'), open: ui('expOpen'), saturated: ui('expSaturated') };
    return map[got] || '-';
  }
  function loadChallenge(id) {
    const ch = CHALLENGES.find(c => c.id === id);
    if (!ch) return;
    S.challenge = id;
    S.challengeResult = null;
    S.circuit = E.buildCircuit(ch.setup);
    S.undo = [];
    S.selected = null;
    S.pending = null;
    S.simulated = false;
    S.result = null;
    S.measure = null;
    saveStore();
  }
  function nextChallengeId() {
    const idx = CHALLENGES.findIndex(c => c.id === S.challenge);
    for (let i = 1; i <= CHALLENGES.length; i++) {
      const c = CHALLENGES[(idx + i) % CHALLENGES.length];
      if (!S.done[c.id]) return c.id;
    }
    return null;
  }
  function checkChallenge() {
    const ch = CHALLENGES.find(c => c.id === S.challenge);
    if (!ch) return;
    S.simulated = true;
    S.result = E.simulate(S.circuit);
    const res = E.evaluateScenarios(S.circuit, ch.scenarios);
    S.challengeResult = res;
    if (res.pass) {
      S.done[ch.id] = true;
      toast(ui('repairPass'));
    }
    saveStore();
    renderLab();
  }
  function renderRepairPanel() {
    const rep = document.getElementById('repairPanel');
    const ch = CHALLENGES.find(c => c.id === S.challenge) || CHALLENGES[0];
    const doneCount = CHALLENGES.filter(c => S.done[c.id]).length;
    let h = `<h2>${esc(ui('tabRepair'))}</h2>`;
    h += `<p class="hint">${esc(ui('repairIntro'))}</p>`;
    h += `<div class="progress" aria-label="${esc(ui('repairProgress'))}"><span style="width:${Math.round(doneCount / CHALLENGES.length * 100)}%"></span></div>`;
    h += `<p class="hint">${esc(ui('repairProgress'))}: ${doneCount} ${esc(ui('progressOf'))} ${CHALLENGES.length}</p>`;
    h += `<div class="repair-list">` + CHALLENGES.map((c, i) => `<button type="button" data-challenge="${c.id}" aria-current="${c.id === ch.id}"><span>${i + 1}. ${esc(challengeTitle(c))}</span><span class="tag ${S.done[c.id] ? 'on' : 'off'}">${esc(S.done[c.id] ? ui('repairStatusOk') : ui('repairStatusTodo'))}</span></button>`).join('') + `</div>`;
    h += `<div class="scenario"><strong>${esc(challengeTitle(ch))}</strong><p style="margin:6px 0 0">${esc(L(ch.symptom))}</p></div>`;
    h += `<p><strong>${esc(ui('repairGoal'))}</strong></p>`;
    ch.scenarios.forEach((sc, i) => {
      const d = describeScenario(sc);
      const r = S.challengeResult ? S.challengeResult.results[i] : null;
      const cls = r ? (r.pass ? 'ok' : 'fail') : '';
      h += `<div class="scenario ${cls}"><strong>${esc(ui('repairScenario'))} ${i + 1}</strong><ul>` +
        d.inputs.map(x => `<li>${esc(x)}</li>`).join('') +
        d.expects.map(x => `<li>${esc(x)}</li>`).join('') +
        `</ul>`;
      if (r) {
        h += `<ul>` + r.checks.map(c => `<li>${c.ok ? '✓' : '✗'} ${esc(c.key)}: ${esc(ui('scenarioGot'))} ${esc(gotWord(c.got))}${c.ok ? '' : ' (' + esc(ui('scenarioWant')) + ' ' + esc(gotWord(c.want)) + ')'}</li>`).join('') +
          (r.burned.length ? `<li>✗ ${esc(ui('damaged'))}</li>` : '') +
          (r.shorted ? `<li>✗ ${esc(ui('noBurnShort'))}</li>` : '') + `</ul>`;
      }
      h += `</div>`;
    });
    if (S.challengeResult) {
      if (S.challengeResult.pass) {
        const nxt = nextChallengeId();
        h += `<div class="banner good"><strong>${esc(ui('repairPass'))}</strong></div>`;
        if (nxt) h += `<div class="row" style="margin-top:8px"><button type="button" class="primary" data-act="next-challenge">${esc(ui('repairNext'))}</button></div>`;
        else h += `<p class="banner good">${esc(ui('repairDone'))}</p>`;
      } else {
        h += `<div class="banner bad">${esc(ui('repairFail'))}</div>`;
      }
    }
    h += `<div class="row" style="margin-top:10px"><button type="button" class="primary" data-act="check">${esc(ui('repairCheck'))}</button>` +
      `<button type="button" data-act="reset-challenge">${esc(ui('repairReset'))}</button></div>`;
    h += `<hr style="border:0;border-top:1px solid var(--line);margin:12px 0">`;
    rep.innerHTML = h;
  }

  // ---------- lessons ----------
  let lessonOpen = false;
  function renderLessons() {
    const root = document.getElementById('lessonsRoot');
    if (!lessonOpen) {
      root.innerHTML = `<p class="hint" style="margin:0 0 12px">${esc(ui('lessonsIntro'))}</p>` +
        `<div class="lesson-grid">` + LESSONS.map((l, i) => `
          <article class="panel lesson-card">
            <div class="num">${esc(ui('lessonNumber'))} ${i + 1}</div>
            <h3>${esc(L(l.title))}</h3>
            <p>${esc(L(l.body).slice(0, 1)[0].slice(0, 160))}…</p>
            <div class="row"><button type="button" data-lesson="${i}">${esc(ui('lessonNumber'))} ${i + 1}</button></div>
          </article>`).join('') + `</div>`;
      return;
    }
    const l = LESSONS[S.lesson];
    const paras = L(l.body);
    root.innerHTML = `
      <article class="panel lesson-body">
        <div class="num" style="color:var(--muted)">${esc(ui('lessonNumber'))} ${S.lesson + 1} / ${LESSONS.length}</div>
        <h2 style="margin:4px 0 12px">${esc(L(l.title))}</h2>
        ${paras.map(p => `<p>${esc(p)}</p>`).join('')}
        <div class="keybox"><strong>${esc(ui('lessonKey'))}</strong>${esc(L(l.key))}</div>
        <div class="lesson-nav">
          <button type="button" data-act="lesson-prev" ${S.lesson === 0 ? 'disabled' : ''}>${esc(ui('lessonPrev'))}</button>
          <button type="button" class="primary" data-act="lesson-load" ${l.preset ? '' : 'disabled'}>${esc(ui('lessonLoad'))}</button>
          <button type="button" data-act="lesson-next" ${S.lesson === LESSONS.length - 1 ? 'disabled' : ''}>${esc(ui('lessonNext'))}</button>
        </div>
        <p class="hint"><button type="button" data-act="lessons-back" style="min-height:36px">←</button></p>
      </article>`;
  }

  // ---------- quiz cards ----------
  function deckCards() {
    const idx = [];
    CARDS.forEach((c, i) => { if (S.deck.cat === 'all' || c.c === S.deck.cat) idx.push(i); });
    return idx;
  }
  function shuffleDeck() {
    const idx = deckCards();
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    S.deck.order = idx;
    S.deck.index = 0;
    S.deck.answered = null;
    S.deck.score = 0;
    S.deck.correct = 0;
    S.deck.done = false;
  }
  function catName(c) {
    const names = {
      basics: { ro: 'Bazele', en: 'Basics', sr: 'Osnove' },
      ohm: { ro: 'Ohm și putere', en: 'Ohm and power', sr: 'Om i snaga' },
      led: { ro: 'LED-uri', en: 'LEDs', sr: 'LED diode' },
      switches: { ro: 'Butoane și tranzistori', en: 'Switches and transistors', sr: 'Prekidači i tranzistori' },
      relays: { ro: 'Relee', en: 'Relays', sr: 'Releji' },
      sensors: { ro: 'Senzori', en: 'Sensors', sr: 'Senzori' },
      safety: { ro: 'Siguranță și reparații', en: 'Safety and repair', sr: 'Bezbednost i popravke' }
    };
    return L(names[c] || { ro: c, en: c, sr: c });
  }
  function renderCards() {
    const root = document.getElementById('cardsRoot');
    if (!S.deck.order.length && !S.deck.done) shuffleDeck();
    const chips = [['all', { ro: 'Toate', en: 'All', sr: 'Sve' }]].concat(CATEGORIES.map(c => [c, null]));
    let h = `<p class="hint" style="margin:0 0 10px">${esc(ui('cardsIntro'))}</p>`;
    h += `<div class="chips" role="group" aria-label="${esc(ui('cardsCategory'))}">` + chips.map(([c, lab]) =>
      `<button type="button" data-cat="${c}" aria-pressed="${S.deck.cat === c}">${esc(lab ? L(lab) : catName(c))}</button>`).join('') + `</div>`;
    const total = S.deck.order.length;
    if (S.deck.done) {
      h += `<article class="panel"><h2>${esc(ui('cardsDone'))}</h2><p style="font-size:1.2rem">${esc(ui('cardsScore'))}: <strong>${S.deck.correct} / ${total}</strong></p>` +
        `<div class="row"><button type="button" class="primary" data-act="cards-restart">${esc(ui('cardsRestart'))}</button></div></article>`;
      root.innerHTML = h;
      return;
    }
    if (!total) { root.innerHTML = h; return; }
    const card = CARDS[S.deck.order[S.deck.index]];
    const q = card[srKey(S.lang)];
    const answered = S.deck.answered;
    h += `<article class="panel">
      <div class="num" style="color:var(--muted)">${esc(ui('cardsCategory'))}: ${esc(catName(card.c))} · ${esc(ui('cardsProgress'))} ${S.deck.index + 1} / ${total} · ${esc(ui('cardsScore'))} ${S.deck.correct}</div>
      <div class="progress"><span style="width:${Math.round((S.deck.index) / total * 100)}%"></span></div>
      <p class="card-q">${esc(L(q.q))}</p>
      <div class="options">` + q.o.map((opt, i) => {
        let cls = '';
        if (answered !== null) {
          if (i === card.a) cls = 'correct';
          else if (i === answered) cls = 'wrong';
        }
        return `<button type="button" class="${cls}" data-opt="${i}" ${answered !== null ? 'disabled' : ''}>${esc(L(opt))}</button>`;
      }).join('') + `</div>`;
    if (answered !== null) {
      h += `<div class="explain"><strong>${esc(answered === card.a ? ui('cardsCorrect') : ui('cardsWrong'))}</strong> ${esc(L(q.e))}</div>` +
        `<div class="row" style="margin-top:12px"><button type="button" class="primary" data-act="cards-next">${esc(ui('cardsNext'))}</button></div>`;
    }
    h += `</article>`;
    root.innerHTML = h;
  }
  function cardOption(i) {
    if (S.deck.answered !== null) return;
    const card = CARDS[S.deck.order[S.deck.index]];
    S.deck.answered = i;
    if (i === card.a) { S.deck.score++; S.deck.correct++; }
    renderCards();
  }
  function cardNext() {
    S.deck.answered = null;
    S.deck.index++;
    if (S.deck.index >= S.deck.order.length) S.deck.done = true;
    renderCards();
  }

  // ---------- tabs and events ----------
  function setTab(tab) {
    S.tab = tab;
    if (tab === 'repair' && !S.challenge) {
      const first = CHALLENGES.find(c => !S.done[c.id]) || CHALLENGES[0];
      loadChallenge(first.id);
    }
    document.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    document.querySelectorAll('section.view').forEach(s => s.classList.remove('active'));
    const v = tab === 'lessons' ? 'view-lessons' : tab === 'cards' ? 'view-cards' : 'view-lab';
    document.getElementById(v).classList.add('active');
    saveStore();
    renderAll();
  }

  function applyStaticText() {
    document.documentElement.lang = S.lang === 'sr-latn' ? 'sr-Latn' : (S.lang === 'sr-cyrl' ? 'sr-Cyrl' : S.lang);
    document.getElementById('appTitle').textContent = ui('appTitle');
    document.getElementById('tagline').textContent = ui('tagline');
    document.getElementById('tabBtnLab').textContent = ui('tabLab');
    document.getElementById('tabBtnLessons').textContent = ui('tabLessons');
    document.getElementById('tabBtnCards').textContent = ui('tabCards');
    document.getElementById('tabBtnRepair').textContent = ui('tabRepair');
    document.getElementById('footerCredits').textContent = ui('credits');
    document.getElementById('footerPrivacy').textContent = ui('privacy');
    document.getElementById('donateLink').textContent = ui('donate');
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
    document.querySelectorAll('[role="tab"]').forEach(b => { b.dataset.tab === S.tab ? b.setAttribute('aria-selected', 'true') : b.setAttribute('aria-selected', 'false'); });
  }

  function renderAll() {
    applyStaticText();
    renderLab();
    renderLessons();
    renderCards();
  }

  function loadCircuit(circuit) {
    pushUndo();
    S.circuit = circuit;
    S.selected = null;
    S.pending = null;
    S.measure = null;
    S.simulated = false;
    S.result = null;
    afterEdit();
  }

  function bind() {
    const svg = document.getElementById('board');
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onCancel);
    svg.addEventListener('pointerleave', e => { if (S.down && !S.down.moved) onCancel(e); });

    document.getElementById('side').addEventListener('input', e => {
      const t = e.target;
      const part = S.circuit.parts.find(p => p.id === S.selected);
      if (!part) return;
      if (t.dataset.range) {
        const v = Number(t.value);
        if (t.dataset.range === 'light') part.props.light = v / 100;
        if (t.dataset.range === 'temp') part.props.temp = v;
        if (t.dataset.range === 'pos') part.props.pos = v / 100;
        const out = document.querySelector('[data-out="' + t.dataset.range + '"]');
        if (out) out.textContent = v;
        if (S.simulated) runSim(false);
        renderBoard();
        renderReadout();
        saveStore();
      }
    });
    document.getElementById('side').addEventListener('change', e => {
      const t = e.target;
      const part = S.circuit.parts.find(p => p.id === S.selected);
      if (!part) return;
      pushUndo();
      if (t.dataset.prop) {
        const v = t.value;
        if (part.type === 'battery') part.props.V = Number(v);
        else if (part.type === 'resistor') part.props.R = Number(v);
        else if (part.type === 'led') part.props.color = v;
        else if (part.type === 'capacitor') part.props.uF = Number(v);
      }
      if (t.dataset.check) {
        if (t.dataset.check === 'pressed') part.props.pressed = t.checked;
        if (t.dataset.check === 'on') part.props.on = t.checked;
      }
      afterEdit();
    });
    document.getElementById('side').addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      if (t.dataset.act === 'delete-part') removeSelected();
      if (t.dataset.act === 'check') checkChallenge();
      if (t.dataset.act === 'reset-challenge') { loadChallenge(S.challenge); renderLab(); }
      if (t.dataset.act === 'next-challenge') { const id = nextChallengeId(); if (id) loadChallenge(id); renderLab(); }
    });
    document.getElementById('side').addEventListener('click', e => {
      const b = e.target.closest('[data-challenge]');
      if (!b) return;
      loadChallenge(b.dataset.challenge);
      renderLab();
    });

    document.getElementById('toolbar').addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.tool) {
        S.tool = t.dataset.tool;
        S.pending = null;
        if (S.tool !== 'measure') S.measure = null;
        renderLab();
      } else if (t.dataset.part) {
        S.tool = 'place';
        S.partType = t.dataset.part;
        S.pending = null;
        renderLab();
        toast(ui('placeHint'));
      }
    });
    document.getElementById('btnSimulate').addEventListener('click', () => {
      runSim(true);
      saveStore();
      renderLab();
    });
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnClear').addEventListener('click', () => {
      if (!S.circuit.parts.length && !S.circuit.wires.length) return;
      loadCircuit({ parts: [], wires: [] });
    });
    document.getElementById('examples').addEventListener('change', e => {
      const v = e.target.value;
      if (v === '') return;
      const preset = LESSONS[Number(v)].preset;
      loadCircuit(E.buildCircuit(preset));
      e.target.value = '';
      setTab('lab');
    });

    document.querySelectorAll('[role="tab"]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

    document.getElementById('lessonsRoot').addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.lesson !== undefined) { S.lesson = Number(t.dataset.lesson); lessonOpen = true; saveStore(); renderLessons(); window.scrollTo(0, 0); return; }
      const act = t.dataset.act;
      if (act === 'lesson-prev' && S.lesson > 0) { S.lesson--; renderLessons(); window.scrollTo(0, 0); }
      if (act === 'lesson-next' && S.lesson < LESSONS.length - 1) { S.lesson++; renderLessons(); window.scrollTo(0, 0); }
      if (act === 'lessons-back') { lessonOpen = false; renderLessons(); }
      if (act === 'lesson-load') {
        const preset = LESSONS[S.lesson].preset;
        loadCircuit(E.buildCircuit(preset));
        setTab('lab');
      }
    });
    document.getElementById('cardsRoot').addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.cat) { S.deck.cat = t.dataset.cat; shuffleDeck(); renderCards(); return; }
      if (t.dataset.opt !== undefined) { cardOption(Number(t.dataset.opt)); return; }
      if (t.dataset.act === 'cards-next') { cardNext(); return; }
      if (t.dataset.act === 'cards-restart') { shuffleDeck(); renderCards(); }
    });

    document.addEventListener('keydown', e => {
      if (S.tab === 'lab' || S.tab === 'repair') {
        if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected && !(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) { e.preventDefault(); removeSelected(); }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'Escape') { S.tool = 'select'; S.pending = null; renderLab(); }
      }
    });
  }

  function init() {
    const saved = loadStore();
    S.lang = saved && saved.lang && LANGS.indexOf(saved.lang) >= 0 ? saved.lang : detectLang();
    S.done = saved && saved.done ? saved.done : {};
    if (saved && saved.circuit && Array.isArray(saved.circuit.parts)) S.circuit = saved.circuit;
    S.challenge = saved && saved.challenge ? saved.challenge : null;
    S.tab = saved && saved.tab && ['lab', 'lessons', 'cards', 'repair'].indexOf(saved.tab) >= 0 ? saved.tab : 'lab';
    document.documentElement.lang = S.lang === 'sr-latn' ? 'sr-Latn' : (S.lang === 'sr-cyrl' ? 'sr-Cyrl' : S.lang);
    bind();
    document.querySelectorAll('section.view').forEach(s => s.classList.remove('active'));
    const v = S.tab === 'lessons' ? 'view-lessons' : S.tab === 'cards' ? 'view-cards' : 'view-lab';
    document.getElementById(v).classList.add('active');
    if (S.tab === 'repair' && !S.challenge) loadChallenge(CHALLENGES[0].id);
    renderAll();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
    }
  }

  // boot
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
