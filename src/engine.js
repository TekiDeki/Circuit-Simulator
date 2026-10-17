/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Kristian Mario Mišković (TekiDeki)
 * Circuit engine: breadboard connectivity, modified nodal analysis (MNA) and
 * Newton-Raphson for diodes, LEDs and an Ebers-Moll NPN transistor.
 * DC steady state only. No DOM access, so it can be tested with Node. */
(function (global) {
  'use strict';

  const VT = 0.025852;          // thermal voltage at 300 K
  const COLS = 30;              // breadboard columns
  const ROWS_A = ['a', 'b', 'c', 'd', 'e'];
  const ROWS_B = ['f', 'g', 'h', 'i', 'j'];
  const RAILS = ['P1', 'P2'];   // each rail pair has a "+" and a "-" row
  const G_OPEN = 1e-9;          // open contacts / open switches leak 1 GOhm
  const R_CLOSED = 0.01;        // closed switch, relay contact
  const R_BATT_INT = 0.2;       // battery internal resistance
  const R_RELAY_COIL = 70;      // 5 V relay coil
  const LIMIT_STEP = 0.4;       // max change of a junction voltage per Newton step

  const LIMITS = {
    ledMaxA: 0.030,             // above 30 mA the LED burns
    ledReverseV: -5,            // reverse voltage above 5 V burns the LED
    diodeMaxA: 0.300,
    resistorMaxW: 0.25,
    transistorMaxA: 0.500,
    batteryShortA: 1.0,         // above 1 A the battery is shorted (warning only)
    relayPullA: 0.030,
    relayReleaseA: 0.012,
    ledOnA: 0.0005,
    ledFullA: 0.015
  };

  const LED_COLORS = {
    red:    { Vf: 1.9, hex: '#ef4444' },
    green:  { Vf: 2.1, hex: '#22c55e' },
    yellow: { Vf: 2.0, hex: '#facc15' },
    blue:   { Vf: 3.0, hex: '#3b82f6' },
    white:  { Vf: 3.1, hex: '#f8fafc' }
  };

  const RESISTOR_VALUES = [10, 47, 100, 220, 330, 470, 1000, 4700, 10000, 100000];
  const BATTERY_VOLTAGES = [3, 4.5, 6, 9, 12];

  // pins: dc = column offset from the anchor column.
  // rail parts: rail = true, pins use pol ('+' or '-') on the clicked rail pair.
  const TYPES = {
    battery:   { rail: true, pins: [{ dc: 0, pol: '+' }, { dc: 0, pol: '-' }], defaults: { V: 9 } },
    resistor:  { pins: [{ dc: 0 }, { dc: 4 }], defaults: { R: 220 } },
    led:       { pins: [{ dc: 0 }, { dc: 1 }], defaults: { color: 'red' } },            // 0 anode, 1 cathode
    diode:     { pins: [{ dc: 0 }, { dc: 2 }], defaults: {} },                          // 0 anode, 1 cathode
    capacitor: { pins: [{ dc: 0 }, { dc: 2 }], defaults: { uF: 100 } },
    button:    { pins: [{ dc: 0 }, { dc: 2 }], defaults: { pressed: false } },
    switch:    { pins: [{ dc: 0 }, { dc: 2 }], defaults: { on: false } },
    npn:       { pins: [{ dc: 0 }, { dc: 1 }, { dc: 2 }], defaults: {} },               // 0 B, 1 C, 2 E
    relay:     { pins: [{ dc: 0 }, { dc: 1 }, { dc: 2 }, { dc: 3 }, { dc: 4 }], defaults: {} }, // 0,1 coil; 2 COM, 3 NO, 4 NC
    ldr:       { pins: [{ dc: 0 }, { dc: 2 }], defaults: { light: 0.5 } },              // 0..1 light level
    ntc:       { pins: [{ dc: 0 }, { dc: 2 }], defaults: { temp: 25 } },                // degrees C
    pot:       { pins: [{ dc: 0 }, { dc: 1 }, { dc: 2 }], defaults: { pos: 0.5 } }      // 0 a, 1 wiper, 2 b
  };

  // ---------- breadboard geometry ----------
  function parseHole(h) {
    const m = /^(P[12][+-]|[a-j])(\d+)$/.exec(String(h));
    if (!m) return null;
    const col = Number(m[2]);
    if (col < 1 || col > COLS) return null;
    return { row: m[1], col: col };
  }

  function holeId(row, col) { return row + col; }

  // Holes that share a strip are electrically connected.
  function stripOf(h) {
    const p = parseHole(h);
    if (!p) return null;
    if (p.row[0] === 'P') return 'R' + p.row;               // whole rail row is one strip
    const half = ROWS_A.indexOf(p.row) >= 0 ? 'A' : 'B';    // a-e and f-j are split by the centre gap
    return 'C' + p.col + half;
  }

  function partRowFor(type, clickedRow) {
    const spec = TYPES[type];
    if (spec.rail) return clickedRow[0] === 'P' ? clickedRow.slice(0, 2) : null;
    return clickedRow[0] === 'P' ? null : clickedRow;
  }

  function partPins(part) {
    const spec = TYPES[part.type];
    return spec.pins.map(p => {
      const row = spec.rail ? part.row + p.pol : part.row;
      return holeId(row, part.col + p.dc);
    });
  }

  // Returns { ok, reason } for placing a part with its anchor hole at (row, col).
  function checkPlacement(circuit, type, clickedHole, ignoreId) {
    const hp = parseHole(clickedHole);
    if (!hp) return { ok: false, reason: 'badHole' };
    const row = partRowFor(type, hp.row);
    if (!row) return { ok: false, reason: TYPES[type].rail ? 'needsRail' : 'noRail' };
    const probe = { type: type, row: row, col: hp.col };
    const pins = partPins(probe);
    const used = new Set();
    for (const p of circuit.parts) {
      if (p.id === ignoreId) continue;
      for (const h of partPins(p)) used.add(h);
    }
    for (const h of pins) {
      const ph = parseHole(h);
      if (!ph) return { ok: false, reason: 'offBoard' };
      if (used.has(h)) return { ok: false, reason: 'occupied' };
    }
    return { ok: true, row: row, col: hp.col, pins: pins };
  }

  // ---------- small dense linear solver ----------
  function solveDense(A, b, n) {
    for (let k = 0; k < n; k++) {
      let p = k, max = Math.abs(A[k * n + k]);
      for (let i = k + 1; i < n; i++) {
        const v = Math.abs(A[i * n + k]);
        if (v > max) { max = v; p = i; }
      }
      if (max < 1e-300) throw new Error('singular');
      if (p !== k) {
        for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[p * n + j]; A[p * n + j] = t; }
        const tb = b[k]; b[k] = b[p]; b[p] = tb;
      }
      const piv = A[k * n + k];
      for (let i = k + 1; i < n; i++) {
        const f = A[i * n + k] / piv;
        if (f === 0) continue;
        for (let j = k; j < n; j++) A[i * n + j] -= f * A[k * n + j];
        b[i] -= f * b[k];
      }
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= A[i * n + j] * x[j];
      x[i] = s / A[i * n + i];
    }
    return x;
  }

  function clampExp(v) { return Math.exp(Math.min(v, 60)); }

  // Diode-like junction. Returns current from anode to cathode and its slope.
  function junction(v, Is, n) {
    const e = clampExp(v / (n * VT));
    return { i: Is * (e - 1), g: Is / (n * VT) * e };
  }

  // Ebers-Moll transport model for an NPN. vbe, vbc in volts.
  function npnCurrents(vbe, vbc, p) {
    const Is = p.Is, bF = p.bF, bR = p.bR;
    const eF = clampExp(vbe / VT), eR = clampExp(vbc / VT);
    const If = Is * (eF - 1), Ir = Is * (eR - 1);
    const dIf = Is / VT * eF, dIr = Is / VT * eR;
    const iB = If / bF + Ir / bR;
    const iC = If - Ir * (1 + 1 / bR);
    return {
      iB: iB, iC: iC,
      dIBbe: dIf / bF, dIBbc: dIr / bR,
      dICbe: dIf, dICbc: -dIr * (1 + 1 / bR)
    };
  }

  const DIODE_MODELS = {
    led: function (color) {
      const Vf = LED_COLORS[color].Vf;
      const n = 2.0;
      return { n: n, Is: 0.02 / Math.exp(Vf / (n * VT)) };
    },
    diode: function () { const n = 1.8; return { n: n, Is: 0.01 / Math.exp(0.7 / (n * VT)) }; }
  };

  const NPN_MODEL = { Is: 1e-14, bF: 150, bR: 3 };

  // ---------- circuit simulation ----------
  function simulate(circuit) {
    let guard = 0;
    let result = null;
    const allBurned = [];
    for (;;) {
      result = solveOnce(circuit, 0);
      if (!result.burnedNow.length || guard++ >= 4) break;
      for (const id of result.burnedNow) {
        const part = circuit.parts.find(p => p.id === id);
        if (part) { part.burned = true; allBurned.push(id); }
      }
    }
    result.burnedNow = [...new Set(allBurned)];
    return result;
  }

  function solveOnce(circuit, depth) {
    depth = depth || 0;
    const warnings = [];
    const burnedNow = [];

    // 1. union-find over strips, joined by wires
    const parent = new Map();
    const find = k => {
      if (!parent.has(k)) parent.set(k, k);
      let r = k;
      while (parent.get(r) !== r) r = parent.get(r);
      let c = k;
      while (parent.get(c) !== r) { const nx = parent.get(c); parent.set(c, r); c = nx; }
      return r;
    };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    for (const w of circuit.wires) {
      const sa = stripOf(w.a), sb = stripOf(w.b);
      if (sa && sb) union(sa, sb);
    }

    const batteries = circuit.parts.filter(p => !p.burned && p.type === 'battery');
    const parts = circuit.parts;
    const info = new Map();
    for (const p of parts) info.set(p.id, { id: p.id, type: p.type, V: 0, I: 0, P: 0, on: false, burned: !!p.burned });

    if (!batteries.length) {
      return {
        ok: false, noPower: true, warnings: [{ code: 'noPower' }], burnedNow: [],
        converged: true, batteryCurrent: 0, parts: info,
        nodeVoltage: () => null
      };
    }

    // 2. ground = minus pin of the first battery
    const groundPin = partPins(batteries[0])[1];
    const groundRoot = find(stripOf(groundPin));

    // 3. node indices
    const nodeIndex = new Map();
    let nNodes = 0;
    const nodeOfRoot = root => {
      if (root === groundRoot) return -1;
      if (!nodeIndex.has(root)) nodeIndex.set(root, nNodes++);
      return nodeIndex.get(root);
    };
    const nodeOfHole = h => nodeOfRoot(find(stripOf(h)));
    // make sure every pin/wire strip has a node
    for (const p of parts) for (const h of partPins(p)) nodeOfHole(h);
    for (const w of circuit.wires) { nodeOfHole(w.a); nodeOfHole(w.b); }

    // 4. elements
    const linear = [];       // { a, b, g, part, kind }
    const sources = [];      // { x, m, V, part }  (x = internal node, m = minus)
    const devices = [];      // nonlinear
    const relayCoils = [];

    for (const p of parts) {
      if (p.burned) continue;
      const pins = partPins(p).map(nodeOfHole);
      const pr = (p.props || {});
      switch (p.type) {
        case 'battery': {
          const x = nNodes++;             // internal node behind the internal resistance
          linear.push({ a: pins[0], b: x, g: 1 / R_BATT_INT, part: p, kind: 'batt' });
          sources.push({ x: x, m: pins[1], V: pr.V !== undefined ? pr.V : 9, part: p });
          break;
        }
        case 'resistor': {
          const R = pr.R || 220;
          linear.push({ a: pins[0], b: pins[1], g: 1 / R, part: p, kind: 'R', R: R });
          break;
        }
        case 'ldr': {
          const L = Math.min(1, Math.max(0, pr.light === undefined ? 0.5 : pr.light));
          const R = Math.exp(Math.log(1e6) * (1 - L) + Math.log(1e3) * L);
          linear.push({ a: pins[0], b: pins[1], g: 1 / R, part: p, kind: 'R', R: R });
          break;
        }
        case 'ntc': {
          const T = pr.temp === undefined ? 25 : pr.temp;
          const R = 10000 * Math.exp(3950 * (1 / (T + 273.15) - 1 / 298.15));
          linear.push({ a: pins[0], b: pins[1], g: 1 / R, part: p, kind: 'R', R: R });
          break;
        }
        case 'pot': {
          const pos = Math.min(0.999, Math.max(0.001, pr.pos === undefined ? 0.5 : pr.pos));
          const total = 10000;
          // pos = 0: wiper at b (0 V end); pos = 1: wiper at a (supply end). Wiper voltage = V x pos (unloaded).
          linear.push({ a: pins[0], b: pins[1], g: 1 / Math.max(total * (1 - pos), 0.001), part: p, kind: 'potA', R: total * (1 - pos) });
          linear.push({ a: pins[1], b: pins[2], g: 1 / Math.max(total * pos, 0.001), part: p, kind: 'potB', R: total * pos });
          break;
        }
        case 'capacitor': {
          linear.push({ a: pins[0], b: pins[1], g: G_OPEN, part: p, kind: 'open' });
          break;
        }
        case 'button':
        case 'switch': {
          const closed = p.type === 'button' ? !!pr.pressed : !!pr.on;
          linear.push({ a: pins[0], b: pins[1], g: closed ? 1 / R_CLOSED : G_OPEN, part: p, kind: 'sw', closed: closed });
          break;
        }
        case 'led': {
          const m = DIODE_MODELS.led(pr.color || 'red');
          devices.push({ type: 'diode', pins: [pins[0], pins[1]], n: m.n, Is: m.Is, part: p, lin: [0] });
          break;
        }
        case 'diode': {
          const m = DIODE_MODELS.diode();
          devices.push({ type: 'diode', pins: [pins[0], pins[1]], n: m.n, Is: m.Is, part: p, lin: [0] });
          break;
        }
        case 'npn': {
          devices.push({ type: 'npn', pins: [pins[0], pins[1], pins[2]], part: p, lin: [0, 0] });
          break;
        }
        case 'relay': {
          if (!p.state) p.state = { closed: false };
          linear.push({ a: pins[0], b: pins[1], g: 1 / R_RELAY_COIL, part: p, kind: 'coil' });
          relayCoils.push(p);
          linear.push({ a: pins[2], b: pins[3], g: p.state.closed ? 1 / R_CLOSED : G_OPEN, part: p, kind: 'contactNO' });
          linear.push({ a: pins[2], b: pins[4], g: p.state.closed ? G_OPEN : 1 / R_CLOSED, part: p, kind: 'contactNC' });
          break;
        }
        default:
          break;
      }
    }

    // leakage to ground keeps floating islands solvable
    for (let i = 0; i < nNodes; i++) linear.push({ a: i, b: -1, g: G_OPEN, part: null, kind: 'leak' });

    const nV = sources.length;
    const n = nNodes + nV;
    let x = new Float64Array(n);
    let converged = false;
    let iter = 0;
    const MAX_ITER = 300;

    const vAt = (idx, vec) => (idx < 0 ? 0 : vec[idx]);

    for (iter = 0; iter < MAX_ITER; iter++) {
      const A = new Float64Array(n * n);
      const b = new Float64Array(n);
      const stampG = (a, c, g) => {
        if (a >= 0) A[a * n + a] += g;
        if (c >= 0) A[c * n + c] += g;
        if (a >= 0 && c >= 0) { A[a * n + c] -= g; A[c * n + a] -= g; }
      };
      for (const e of linear) stampG(e.a, e.b, e.g);
      sources.forEach((s, j) => {
        const k = nNodes + j;
        if (s.x >= 0) { A[s.x * n + k] += 1; A[k * n + s.x] += 1; }
        if (s.m >= 0) { A[s.m * n + k] -= 1; A[k * n + s.m] -= 1; }
        b[k] = s.V;
      });
      // linearised nonlinear devices: i_k(v) = i_k(vL) + sum_j J_kj (v_j - vL_j)
      for (const d of devices) {
        if (d.type === 'diode') {
          const vL = d.lin[0];
          const jn = junction(vL, d.Is, d.n);
          const [a, c] = d.pins;
          const i0 = jn.i, g = jn.g;
          // currents into the device at anode (a) and cathode (c)
          // J: [a][a]=g, [a][c]=-g, [c][a]=-g, [c][c]=g ; vL = (vL, 0)
          const ca = i0 - g * vL;
          const cc = -i0 + g * vL;
          if (a >= 0) { A[a * n + a] += g; if (c >= 0) A[a * n + c] -= g; b[a] -= ca; }
          if (c >= 0) { A[c * n + c] += g; if (a >= 0) A[c * n + a] -= g; b[c] -= cc; }
        } else if (d.type === 'npn') {
          const vbeL = d.lin[0], vbcL = d.lin[1];
          const r = npnCurrents(vbeL, vbcL, NPN_MODEL);
          const [B, C, E] = d.pins;
          // terminal voltages at the linearisation point: vE=0, vB=vbe, vC=vbe-vbc
          const vLB = vbeL, vLC = vbeL - vbcL, vLE = 0;
          const vL = [vLB, vLC, vLE];
          // derivatives of currents w.r.t. (vB, vC, vE)
          const JB = [r.dIBbe + r.dIBbc, -r.dIBbc, -r.dIBbe];
          const JC = [r.dICbe + r.dICbc, -r.dICbc, -r.dICbe];
          const JE = [-(JB[0] + JC[0]), -(JB[1] + JC[1]), -(JB[2] + JC[2])];
          const I0 = [r.iB, r.iC, -(r.iB + r.iC)];
          const Jm = [JB, JC, JE];
          const nodes = [B, C, E];
          for (let row = 0; row < 3; row++) {
            const nr = nodes[row];
            if (nr < 0) continue;
            let cst = I0[row];
            for (let col = 0; col < 3; col++) cst -= Jm[row][col] * vL[col];
            for (let col = 0; col < 3; col++) {
              const nc = nodes[col];
              if (nc >= 0) A[nr * n + nc] += Jm[row][col];
            }
            b[nr] -= cst;
          }
        }
      }

      const xNew = solveDense(A, b, n);

      // update linearisation points with a step limit (junction voltages only)
      let maxChange = 0;
      for (const d of devices) {
        if (d.type === 'diode') {
          const [a, c] = d.pins;
          const vd = vAt(a, xNew) - vAt(c, xNew);
          const delta = vd - d.lin[0];
          maxChange = Math.max(maxChange, Math.abs(delta));
          d.lin[0] += Math.max(-LIMIT_STEP, Math.min(LIMIT_STEP, delta));
        } else if (d.type === 'npn') {
          const [B, C, E] = d.pins;
          const vbe = vAt(B, xNew) - vAt(E, xNew);
          const vbc = vAt(B, xNew) - vAt(C, xNew);
          const dbe = vbe - d.lin[0], dbc = vbc - d.lin[1];
          maxChange = Math.max(maxChange, Math.abs(dbe), Math.abs(dbc));
          d.lin[0] += Math.max(-LIMIT_STEP, Math.min(LIMIT_STEP, dbe));
          d.lin[1] += Math.max(-LIMIT_STEP, Math.min(LIMIT_STEP, dbc));
        }
      }
      let linChange = 0;
      for (let i = 0; i < n; i++) linChange = Math.max(linChange, Math.abs(xNew[i] - x[i]));
      x = xNew;
      if (devices.length === 0) { converged = true; break; }
      if (maxChange < 1e-7 && linChange < 1e-6 && iter > 0) { converged = true; break; }
    }
    if (!converged) warnings.push({ code: 'noConverge' });

    // 5. relay state update (coil current with hysteresis)
    let relayChanged = false;
    for (const p of relayCoils) {
      const pins = partPins(p).map(nodeOfHole);
      const Ic = (vAt(pins[0], x) - vAt(pins[1], x)) / R_RELAY_COIL;
      const was = p.state.closed;
      if (!was && Ic >= LIMITS.relayPullA) p.state.closed = true;
      else if (was && Ic < LIMITS.relayReleaseA) p.state.closed = false;
      if (p.state.closed !== was) relayChanged = true;
    }
    if (relayChanged) {
      // re-solve with the new contact states (bounded recursion: relays settle in one or two passes)
      if (depth >= 4) { warnings.push({ code: 'relayLoop' }); }
      else return solveOnce(circuit, depth + 1);
    }

    // 6. per-part results and burn checks
    let batteryCurrent = 0;
    for (const L of linear) {
      if (L.kind !== 'batt') continue;
      const I = (vAt(L.a, x) - vAt(L.b, x)) * L.g;
      // L.a is the external + node; L.b is the internal node: current leaves + into the circuit
      batteryCurrent += -I;
    }
    for (const s of sources) {
      const i = info.get(s.part.id);
      i.V = s.V;
    }
    for (const L of linear) {
      const i = L.part ? info.get(L.part.id) : null;
      if (!i) continue;
      const va = vAt(L.a, x), vb = vAt(L.b, x);
      const I = (va - vb) * L.g;
      if (L.kind === 'batt') {
        i.I = -I;                       // current leaving the + terminal
      } else if (L.kind === 'R' || L.kind === 'potA' || L.kind === 'potB') {
        i.I = I; i.V = va - vb; i.P = I * I * L.R;
        if (L.kind === 'R' && i.P > LIMITS.resistorMaxW) burnedNow.push(L.part.id);
        i.on = Math.abs(I) > 1e-6;
      } else if (L.kind === 'sw') {
        i.I = I; i.V = va - vb; i.on = L.closed;
      } else if (L.kind === 'coil') {
        i.I = I; i.V = va - vb; i.on = Math.abs(I) > LIMITS.relayReleaseA;
      } else if (L.kind === 'contactNO' || L.kind === 'contactNC') {
        i.I = I;
        i.closed = L.part.state && L.part.state.closed;
      }
    }
    for (const d of devices) {
      const i = info.get(d.part.id);
      if (d.type === 'diode') {
        const [a, c] = d.pins;
        const vd = vAt(a, x) - vAt(c, x);
        const I = junction(vd, d.Is, d.n).i;
        i.I = I; i.V = vd; i.P = Math.abs(I * vd);
        const ledLike = d.part.type === 'led';
        i.on = I > LIMITS.ledOnA;
        i.brightness = ledLike ? Math.min(1, Math.max(0, I / LIMITS.ledFullA)) : 0;
        if (ledLike) {
          if (I > LIMITS.ledMaxA || vd < LIMITS.ledReverseV) burnedNow.push(d.part.id);
        } else if (I > LIMITS.diodeMaxA) burnedNow.push(d.part.id);
      } else if (d.type === 'npn') {
        const [B, C, E] = d.pins;
        const vbe = vAt(B, x) - vAt(E, x), vbc = vAt(B, x) - vAt(C, x);
        const r = npnCurrents(vbe, vbc, NPN_MODEL);
        i.I = r.iC; i.Ib = r.iB; i.Ic = r.iC; i.V = vAt(C, x) - vAt(E, x);
        i.on = r.iC > 0.001;
        i.saturated = i.on && (vAt(C, x) - vAt(E, x)) < 0.3;
        if (r.iC > LIMITS.transistorMaxA) burnedNow.push(d.part.id);
      }
    }
    for (const p of parts) {
      if (p.type === 'capacitor') {
        const i = info.get(p.id);
        i.I = 0;
        i.open = true;
      }
    }
    const shorted = batteryCurrent > LIMITS.batteryShortA;
    if (shorted) warnings.push({ code: 'short' });
    if (burnedNow.length) warnings.push({ code: 'burn', parts: burnedNow.slice() });
    // a reversed battery is still a valid circuit, but the LEDs will burn
    for (const p of parts) if (p.burned) warnings.push({ code: 'damaged', part: p.id });

    return {
      ok: true,
      noPower: false,
      converged: converged,
      iterations: iter + 1,
      batteryCurrent: batteryCurrent,
      shorted: shorted,
      warnings: warnings,
      burnedNow: [...new Set(burnedNow)],
      parts: info,
      nodeVoltage: function (h) {
        const s = stripOf(h);
        if (!s) return null;
        const root = find(s);
        if (root === groundRoot) return 0;
        const idx = nodeIndex.get(root);
        if (idx === undefined) return null;
        return x[idx];
      }
    };
  }

  // Apply scenario inputs (defaults for every input, so scenarios are independent),
  // simulate, and compare the expectations. Burns are real: a burned part stays burned.
  const INPUT_DEFAULTS = { button: false, switch: false, ldr: 0.5, ntc: 25, pot: 0.5 };
  function evaluateScenarios(circuit, scenarios) {
    const results = [];
    let allPass = true;
    for (let si = 0; si < scenarios.length; si++) {
      const sc = scenarios[si];
      const inputs = Object.assign({}, INPUT_DEFAULTS, sc.in || {});
      const btn = circuit.parts.filter(p => p.type === 'button');
      const sw = circuit.parts.filter(p => p.type === 'switch');
      const ldr = circuit.parts.filter(p => p.type === 'ldr');
      const ntc = circuit.parts.filter(p => p.type === 'ntc');
      const pot = circuit.parts.filter(p => p.type === 'pot');
      btn.forEach(p => { p.props.pressed = !!inputs.button; });
      sw.forEach(p => { p.props.on = !!inputs.switch; });
      ldr.forEach(p => { p.props.light = inputs.ldr; });
      ntc.forEach(p => { p.props.temp = inputs.ntc; });
      pot.forEach(p => { p.props.pos = inputs.pot; });
      circuit.parts.filter(p => p.type === 'relay').forEach(p => { p.state = { closed: false }; });
      const r = simulate(circuit);
      const checks = [];
      let pass = true;
      for (const key of Object.keys(sc.expect || {})) {
        const want = sc.expect[key];
        const m = /^(led|relay|npn)(\d*)$/.exec(key);
        if (!m) continue;
        const idx = m[2] ? Number(m[2]) - 1 : 0;
        const type = m[1] === 'npn' ? 'npn' : m[1];
        const list = circuit.parts.filter(p => p.type === type);
        const part = list[idx];
        let got = 'missing';
        if (part) {
          const info = r.parts.get(part.id);
          if (type === 'relay') got = part.state && part.state.closed ? 'closed' : 'open';
          else got = info && info.on ? 'on' : 'off';
        }
        const ok = part && got === want;
        if (!ok) pass = false;
        checks.push({ key: key, want: want, got: got, ok: !!ok });
      }
      const burnedAny = circuit.parts.filter(p => p.burned).map(p => p.id);
      if (burnedAny.length) pass = false;
      if (r.warnings.some(w => w.code === 'short')) pass = false;
      if (!pass) allPass = false;
      results.push({ index: si, pass: pass, checks: checks, burned: burnedAny, shorted: r.warnings.some(w => w.code === 'short') });
    }
    return { pass: allPass, results: results };
  }

  // Build a circuit from a compact spec: parts [{type, hole, props, id}], wires [[holeA, holeB]]
  function buildCircuit(spec) {
    const c = { parts: [], wires: [] };
    let n = 0;
    for (const ps of spec.parts || []) {
      const chk = checkPlacement(c, ps.type, ps.hole);
      if (!chk.ok) throw new Error('buildCircuit: ' + ps.type + ' at ' + ps.hole + ' (' + chk.reason + ')');
      const props = Object.assign({}, TYPES[ps.type].defaults, ps.props || {});
      c.parts.push({ id: ps.id || ('p' + (++n)), type: ps.type, row: chk.row, col: chk.col, props: props, burned: !!ps.burned });
    }
    for (const w of spec.wires || []) {
      c.wires.push({ id: 'w' + (++n), a: w[0], b: w[1] });
    }
    return c;
  }

  const api = {
    buildCircuit, evaluateScenarios,
    VT, COLS, LETTERS: { A: ROWS_A, B: ROWS_B }, RAILS,
    TYPES, LED_COLORS, RESISTOR_VALUES, BATTERY_VOLTAGES, LIMITS,
    parseHole, holeId, stripOf, partPins, partRowFor, checkPlacement,
    simulate, solveDense, junction, npnCurrents
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CircuitEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
