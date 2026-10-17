// Every broken circuit must fail as shipped and pass once repaired with the known fix.
// Run: node tests/challenges.test.cjs
'use strict';
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '..', 'src', 'engine.js'));
const { CHALLENGES } = require(path.join(__dirname, '..', 'src', 'content_repair.js'));

const same = (a, b) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);

// Known fixes (kept out of the app on purpose: the player gets no hints)
const FIXES = {
  'led-reversed': s => { rmWire(s, 'e7', 'e9'); rmWire(s, 'e8', 'P1-8'); addWire(s, 'e7', 'e8'); addWire(s, 'e9', 'P1-9'); },
  'resistor-too-small': s => { rmPart(s, 'resistor', 'e3'); addPart(s, 'resistor', 'e3', { R: 330 }); },
  'dead-button': s => { rmWire(s, 'P1+22', 'e22'); addWire(s, 'e22', 'e24'); },
  'relay-no-click': s => { rmWire(s, 'e10', 'P1-10'); addWire(s, 'P1+10', 'e10'); },
  'transistor-swapped': s => { rmWire(s, 'b9', 'j12'); rmWire(s, 'j11', 'P1-11'); addWire(s, 'b9', 'j11'); addWire(s, 'j12', 'P1-12'); },
  'ldr-inverted': s => {
    rmWire(s, 'P1+3', 'e3'); rmWire(s, 'e5', 'e6'); rmWire(s, 'e10', 'P1-10');
    addWire(s, 'P1+6', 'e6'); addWire(s, 'e3', 'P1-3'); addWire(s, 'e10', 'e5');
  },
  'rails-swapped': s => { rmWire(s, 'P1-3', 'e3'); rmWire(s, 'e9', 'P1+9'); addWire(s, 'P1+3', 'e3'); addWire(s, 'e9', 'P1-9'); },
  'pot-floating-wiper': s => { addWire(s, 'e4', 'e8'); },
  'burned-led': s => { rmPart(s, 'led', 'e8'); addPart(s, 'led', 'e8', { color: 'white' }); },
  'two-leds-series': s => { rmWire(s, 'e9', 'e11'); rmWire(s, 'e10', 'P1-10'); addWire(s, 'e9', 'e10'); addWire(s, 'e11', 'P1-11'); },
  'relay-driver': s => {
    rmWire(s, 'e12', 'j12'); rmWire(s, 'j11', 'P1-11');
    addWire(s, 'e12', 'j11'); addWire(s, 'j12', 'P1-12'); addWire(s, 'e22', 'e24');
  },
  'hidden-short': s => { rmWire(s, 'P1+15', 'P1-15'); }
};

function rmWire(s, a, b) {
  const i = s.wires.findIndex(w => same(w, [a, b]));
  if (i < 0) throw new Error('no wire ' + a + '-' + b);
  s.wires.splice(i, 1);
}
function addWire(s, a, b) { s.wires.push([a, b]); }
function rmPart(s, type, hole) {
  const i = s.parts.findIndex(p => p.type === type && p.hole === hole);
  if (i < 0) throw new Error('no part ' + type + ' at ' + hole);
  s.parts.splice(i, 1);
}
function addPart(s, type, hole, props) { s.parts.push({ type: type, hole: hole, props: props || {} }); }
const clone = o => JSON.parse(JSON.stringify(o));

let failed = 0;
for (const ch of CHALLENGES) {
  const label = ch.id;
  try {
    assert.ok(FIXES[ch.id], 'missing fix for ' + ch.id);
    const broken = E.buildCircuit(ch.setup);
    const bad = E.evaluateScenarios(broken, ch.scenarios);
    assert.strictEqual(bad.pass, false, 'broken circuit must fail its scenarios');

    const spec = clone(ch.setup);
    FIXES[ch.id](spec);
    const fixed = E.buildCircuit(spec);
    const good = E.evaluateScenarios(fixed, ch.scenarios);
    const detail = good.results.map(r => r.checks.map(c => c.key + '=' + c.got + (c.ok ? '' : ' (want ' + c.want + ')')).join(' ') + (r.burned.length ? ' BURNED' : '') + (r.shorted ? ' SHORT' : '')).join(' | ');
    assert.strictEqual(good.pass, true, 'repaired circuit must pass: ' + detail);
    console.log('ok   ' + label + '  [' + detail + ']');
  } catch (e) {
    failed++;
    console.log('FAIL ' + label + '\n     ' + e.message.split('\n')[0]);
  }
}
console.log(failed ? failed + ' failed' : 'all ' + CHALLENGES.length + ' challenges verified');
if (failed) process.exitCode = 1;
