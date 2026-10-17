// Engine tests: run with `node tests/engine.test.cjs`
'use strict';
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '..', 'src', 'engine.js'));

let n = 0;
function make() { return { parts: [], wires: [] }; }
function add(c, type, hole, props) {
  const chk = E.checkPlacement(c, type, hole);
  if (!chk.ok) throw new Error('placement ' + type + ' at ' + hole + ': ' + chk.reason);
  const part = { id: 'p' + (++n), type: type, row: chk.row, col: chk.col, props: Object.assign({}, E.TYPES[type].defaults, props || {}), burned: false };
  c.parts.push(part);
  return part;
}
function wire(c, a, b) { c.wires.push({ id: 'w' + (++n), a: a, b: b }); }
function battery(c, col, V) { return add(c, 'battery', 'P1+' + col, { V: V === undefined ? 5 : V }); }
function run(c) { return E.simulate(c); }
function test(name, fn) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { console.log('FAIL ' + name + '\n     ' + e.message); process.exitCode = 1; }
}
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' expected ~' + b + ' got ' + a + ' (tol ' + tol + ')');

test('voltage divider 9 V, 1k over 1k gives 4.5 V', () => {
  const c = make();
  battery(c, 1, 9);                       // + on P1+1, - on P1-1
  const r1 = add(c, 'resistor', 'e3', { R: 1000 });  // e3 - e7
  add(c, 'resistor', 'e8', { R: 1000 });             // e8 - e12
  wire(c, 'P1+3', 'e3');
  wire(c, 'e7', 'e8');
  wire(c, 'e12', 'P1-12');
  const res = run(c);
  near(res.nodeVoltage('e7'), 4.5, 0.01, 'midpoint');
  assert.ok(res.converged);
  assert.strictEqual(res.warnings.filter(w => w.code === 'burn').length, 0);
  void r1;
});

test('LED with 220 ohm on 5 V lights (about 14 mA)', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'resistor', 'e3', { R: 220 });       // e3 - e7
  add(c, 'led', 'e8', { color: 'red' });      // anode e8, cathode e9
  wire(c, 'P1+3', 'e3');
  wire(c, 'e7', 'e8');
  wire(c, 'e9', 'P1-9');
  const res = run(c);
  const led = res.parts.get(c.parts[2].id);
  assert.ok(led.on, 'LED should be on');
  assert.ok(led.I > 0.010 && led.I < 0.018, 'LED current ' + led.I);
  assert.ok(!led.burned);
  assert.strictEqual(res.warnings.filter(w => w.code === 'burn').length, 0);
});

test('LED without resistor on 5 V burns and stays burned', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'led', 'e8', { color: 'red' });
  wire(c, 'P1+8', 'e8');
  wire(c, 'e9', 'P1-9');
  const res = run(c);
  const led = c.parts[1];
  assert.ok(led.burned, 'LED should be burned');
  assert.ok(res.burnedNow.length === 1, 'burn reported');
  // a second run keeps it burned and off
  const res2 = run(c);
  assert.ok(!res2.parts.get(led.id).on);
});

test('LED with 1 k on 5 V stays safe and is dim', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'resistor', 'e3', { R: 1000 });
  add(c, 'led', 'e8', { color: 'green' });
  wire(c, 'P1+3', 'e3');
  wire(c, 'e7', 'e8');
  wire(c, 'e9', 'P1-9');
  const res = run(c);
  const led = res.parts.get(c.parts[1].id);
  assert.ok(led.on && led.I < 0.005, 'dim LED, I=' + led.I);
  assert.ok(!c.parts[2].burned);
});

test('resistor 100 ohm across 9 V burns (0.81 W)', () => {
  const c = make();
  battery(c, 1, 9);
  add(c, 'resistor', 'e3', { R: 100 });
  wire(c, 'P1+3', 'e3');
  wire(c, 'e7', 'P1-7');
  run(c);
  assert.ok(c.parts[1].burned);
});

test('push button: open is off, pressed is on', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'resistor', 'e3', { R: 330 });
  add(c, 'button', 'e8', { pressed: false });   // e8 - e10
  add(c, 'led', 'e11', { color: 'red' });      // e11 - e12
  wire(c, 'P1+3', 'e3');
  wire(c, 'e7', 'e8');
  wire(c, 'e10', 'e11');
  wire(c, 'e12', 'P1-12');
  let res = run(c);
  assert.ok(!res.parts.get(c.parts[3].id).on, 'off when open');
  c.parts[2].props.pressed = true;
  res = run(c);
  assert.ok(res.parts.get(c.parts[3].id).on, 'on when pressed');
});

test('LDR: dark gives a large resistance, bright gives a small one', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'ldr', 'e3', { light: 0 });           // e3 - e5
  add(c, 'resistor', 'e6', { R: 1000 });       // e6 - e10
  wire(c, 'P1+3', 'e3');
  wire(c, 'e5', 'e6');
  wire(c, 'e10', 'P1-10');
  let res = run(c);
  // LDR (top) and 1k (bottom) in series: the middle node follows the LDR resistance
  const dark = res.nodeVoltage('e5');           // LDR 1 MOhm: middle near 0 V
  c.parts[1].props.light = 1;
  res = run(c);
  const bright = res.nodeVoltage('e5');         // LDR 1 kOhm: middle at 2.5 V
  assert.ok(dark < 0.1, 'dark mid ' + dark);
  near(bright, 2.5, 0.05, 'bright mid');
});

test('NPN switch: a button drives the base, the transistor lights the LED', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'resistor', 'b3', { R: 470 });        // b3 - b7 (collector load, LED side)
  add(c, 'led', 'b8', { color: 'red' });       // anode b8, cathode b9
  add(c, 'npn', 'j10', {});                    // B j10, C j11, E j12
  add(c, 'button', 'e20', { pressed: false }); // e20 - e22 (from + rail to the base resistor)
  add(c, 'resistor', 'e24', { R: 10000 });     // e24 - e28 (base resistor)
  add(c, 'resistor', 'b13', { R: 100000 });    // b13 - b17 (base pull-down)
  wire(c, 'P1+3', 'b3');
  wire(c, 'b7', 'b8');
  wire(c, 'b9', 'j11');                         // LED cathode to collector
  wire(c, 'j12', 'P1-12');                      // emitter to ground
  wire(c, 'P1+20', 'e20');
  wire(c, 'e22', 'e24');
  wire(c, 'e28', 'j10');                        // base
  wire(c, 'b13', 'j10');
  wire(c, 'b17', 'P1-17');
  // parts: 0 battery, 1 collector resistor, 2 LED, 3 NPN, 4 button, 5 base resistor, 6 pull-down
  const ledId = c.parts[2].id, npnId = c.parts[3].id, btnId = c.parts[4].id;
  let res = run(c);
  const off = res.parts.get(ledId).on;
  c.parts[4].props.pressed = true;
  res = run(c);
  const on = res.parts.get(ledId).on;
  assert.strictEqual(res.parts.get(btnId).on, true);
  assert.ok(!off, 'LED off when base is pulled down');
  assert.ok(on, 'LED on when base is driven');
  assert.ok(res.parts.get(npnId).saturated, 'transistor saturated');
});

test('relay: coil pulls the contacts and lights the LED on the contact side', () => {
  const c = make();
  battery(c, 1, 5);
  add(c, 'relay', 'e10', {});                  // coil e10,e11 ; COM e12, NO e13, NC e14
  add(c, 'resistor', 'b15', { R: 220 });       // b15 - b19 (contact side)
  add(c, 'led', 'b20', { color: 'green' });    // b20 anode, b21 cathode
  wire(c, 'P1+10', 'e10');
  wire(c, 'e11', 'P1-11');
  wire(c, 'P1+12', 'e12');                     // COM to + rail
  wire(c, 'e13', 'b15');                       // NO to resistor
  wire(c, 'b19', 'b20');
  wire(c, 'b21', 'P1-21');
  const res = run(c);
  const relay = c.parts[1];
  assert.ok(relay.state && relay.state.closed, 'relay closed');
  assert.ok(res.parts.get(c.parts[3].id).on, 'contact-side LED on');
});

test('relay pull-in threshold: 2 V (29 mA) stays open, 3 V (43 mA) closes', () => {
  const build = V => E.buildCircuit({
    parts: [{ type: 'battery', hole: 'P1+1', props: { V: V } }, { type: 'relay', hole: 'e10' }],
    wires: [['P1+10', 'e10'], ['e11', 'P1-11']]
  });
  const weak = build(2);
  E.simulate(weak);
  assert.strictEqual(weak.parts[1].state.closed, false, '2 V should not close the relay');
  const strong = build(3);
  E.simulate(strong);
  assert.strictEqual(strong.parts[1].state.closed, true, '3 V should close the relay');
});

test('no battery gives a clear "no power" result', () => {
  const c = make();
  add(c, 'resistor', 'e3', { R: 220 });
  const res = run(c);
  assert.ok(res.noPower);
});

test('two holes on the same column strip are connected, different columns are not', () => {
  assert.strictEqual(E.stripOf('a5'), E.stripOf('e5'));
  assert.strictEqual(E.stripOf('f5'), E.stripOf('j5'));
  assert.notStrictEqual(E.stripOf('e5'), E.stripOf('f5'));
  assert.strictEqual(E.stripOf('P1+1'), E.stripOf('P1+30'));
  assert.notStrictEqual(E.stripOf('P1+1'), E.stripOf('P1-1'));
});

test('placement rules: rails only for batteries, occupied holes rejected', () => {
  const c = make();
  assert.strictEqual(E.checkPlacement(c, 'battery', 'e5').ok, false);
  assert.strictEqual(E.checkPlacement(c, 'resistor', 'P1+5').ok, false);
  add(c, 'resistor', 'e5', { R: 10 });
  assert.strictEqual(E.checkPlacement(c, 'led', 'e5').ok, false);
  assert.strictEqual(E.checkPlacement(c, 'led', 'e7').ok, true);
  assert.strictEqual(E.checkPlacement(c, 'resistor', 'e31').ok, false);
});

test('3 V battery with a 100 ohm resistor and red LED: safe, converges', () => {
  const c = make();
  battery(c, 1, 3);
  add(c, 'resistor', 'e3', { R: 100 });
  add(c, 'led', 'e8', { color: 'red' });
  wire(c, 'P1+3', 'e3');
  wire(c, 'e7', 'e8');
  wire(c, 'e9', 'P1-9');
  const res = run(c);
  assert.ok(res.converged);
  assert.ok(!c.parts[2].burned, 'LED at 3 V with 100 ohm should be safe');
  assert.ok(res.parts.get(c.parts[2].id).I > 0.005);
});
