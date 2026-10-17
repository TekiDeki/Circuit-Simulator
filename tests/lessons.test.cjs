// Every lesson preset must build and behave as the lesson text says.
// Run: node tests/lessons.test.cjs
'use strict';
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '..', 'src', 'engine.js'));
const { LESSONS } = require(path.join(__dirname, '..', 'src', 'content_lessons.js'));

const byId = id => LESSONS.find(l => l.id === id);
const ledOf = (c, r, n) => r.parts.get(c.parts.filter(p => p.type === 'led')[n || 0].id);
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n     ' + e.message.split('\n')[0]); }
}

test('10 lessons, each with ro/en/sr text and a preset', () => {
  assert.strictEqual(LESSONS.length, 10);
  for (const l of LESSONS) {
    for (const k of ['title', 'key']) for (const lang of ['ro', 'en', 'sr']) assert.ok(l[k][lang], l.id + ' ' + k + ' ' + lang);
    for (const lang of ['ro', 'en', 'sr']) assert.ok(l.body[lang].length >= 2, l.id + ' body ' + lang);
    assert.ok(l.preset, l.id + ' preset');
  }
});

test('every preset builds on the board', () => {
  for (const l of LESSONS) E.buildCircuit(l.preset);
});

test('breadboard: 9 V through 330 ohm is about 27 mA', () => {
  const c = E.buildCircuit(byId('breadboard').preset);
  const r = E.simulate(c);
  assert.ok(Math.abs(r.batteryCurrent - 9 / 330) < 0.001, 'I=' + r.batteryCurrent);
});

test('ohm: 470 ohm on 9 V gives about 19 mA', () => {
  const r = E.simulate(E.buildCircuit(byId('ohm').preset));
  assert.ok(Math.abs(r.batteryCurrent - 9 / 470) < 0.001, 'I=' + r.batteryCurrent);
});

test('led: red LED with 220 ohm lights at about 14 mA', () => {
  const c = E.buildCircuit(byId('led').preset);
  const r = E.simulate(c);
  const led = ledOf(c, r);
  assert.ok(led.on && led.I > 0.012 && led.I < 0.016, 'I=' + led.I);
});

test('divider: midpoint is 4.5 V', () => {
  const c = E.buildCircuit(byId('divider').preset);
  const r = E.simulate(c);
  assert.ok(Math.abs(r.nodeVoltage('e7') - 4.5) < 0.01, 'V=' + r.nodeVoltage('e7'));
});

test('button: LED off with the button released (lesson starts unpressed)', () => {
  const c = E.buildCircuit(byId('button').preset);
  const r = E.simulate(c);
  assert.strictEqual(ledOf(c, r).on, false);
  c.parts.find(p => p.type === 'button').props.pressed = true;
  const r2 = E.simulate(c);
  assert.strictEqual(ledOf(c, r2).on, true);
});

test('transistor: LED off until the base button is pressed', () => {
  const c = E.buildCircuit(byId('transistor').preset);
  assert.strictEqual(ledOf(c, E.simulate(c)).on, false);
  c.parts.find(p => p.type === 'button').props.pressed = true;
  assert.strictEqual(ledOf(c, E.simulate(c)).on, true);
});

test('relay: coil on the rail pulls in and the contact-side LED lights', () => {
  const c = E.buildCircuit(byId('relay').preset);
  const r = E.simulate(c);
  assert.strictEqual(c.parts.find(p => p.type === 'relay').state.closed, true);
  assert.strictEqual(ledOf(c, r).on, true);
});

test('ldr: midpoint is between 0 and 5 V and moves with light', () => {
  const c = E.buildCircuit(byId('ldr').preset);
  const dark = E.simulate(c).nodeVoltage('e5');
  c.parts[1].props.light = 1;
  const bright = E.simulate(c).nodeVoltage('e5');
  assert.ok(dark > 0 && dark < 5 && bright > 0 && bright < 5);
  assert.ok(bright > dark, 'light lowers LDR resistance, which raises the midpoint in this wiring');
});

test('pot: wiper at 0.8 lights the yellow LED', () => {
  const c = E.buildCircuit(byId('pot').preset);
  const r = E.simulate(c);
  assert.strictEqual(ledOf(c, r).on, true);
});

test('capacitor: LED stays off in DC steady state', () => {
  const c = E.buildCircuit(byId('capacitor').preset);
  const r = E.simulate(c);
  assert.strictEqual(ledOf(c, r).on, false);
  assert.strictEqual(r.batteryCurrent < 1e-6, true);
});

console.log(failed ? failed + ' failed' : 'all lesson presets verified');
if (failed) process.exitCode = 1;
