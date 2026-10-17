# Circuit Lab

A breadboard circuit simulator that runs in the browser. Place parts on a breadboard, press **Simulate**, and watch currents, voltages and power. Built for learning electronics, with lessons, quiz cards and broken circuits to repair.

Live: https://tekideki.github.io/Circuit-Simulator/

## Features

- **Breadboard**: 30 columns, a-e and f-j strips split by the centre channel, and two power rails per side. Drag parts, tap to select, and undo with Ctrl+Z.
- **Parts (12)**: battery, resistor, LED (red, green, yellow, blue, white), diode, capacitor, push button, switch, NPN transistor, SPDT relay, photoresistor (LDR), NTC thermistor, potentiometer.
- **Burn mechanics**: an LED without enough series resistance burns and stays burned. Overloaded resistors, diodes and transistors burn too. A burn cannot be undone.
- **Simulation**: DC steady state with Newton iteration on diode and transistor models. Relays switch from their coil current with hysteresis. Shorts and "no power" are reported clearly.
- **10 lessons** with presets you can load onto the board.
- **60 quiz cards** in 7 categories, shuffled, with explanations and a score.
- **12 broken circuits** to repair. You get the symptom and the goal, with no hints. The checker runs the scenarios and reports which expectation failed.
- **Four languages**: Română, English, Srpski (Latinica), Srpski (ćirilica). Serbian Cyrillic is generated from the Latin text.
- **Tablet ready**: touch and pen input, touch targets of at least 40 px, responsive layout, offline after the first load (service worker).
- **Private**: no account, no tracking, no network calls. Your circuit is saved in your browser's local storage.

## Use it

Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari, including iPad). Nothing needs to be installed and there is no build step for users.

## Development

The sources live in `src/`. `build.py` inlines them into the single-file `index.html`:

```
python3 build.py          # writes index.html
node tests/engine.test.cjs
node tests/lessons.test.cjs
node tests/challenges.test.cjs
python3 tests/ui_test.py  # Playwright end-to-end test (needs playwright and chromium)
```

`build.py` refuses to write when a source contains an em dash, an en dash or a byte order mark, when the four locales have different keys, or when inlined JavaScript contains a closing script tag.

| File | Purpose |
| --- | --- |
| `src/engine.js` | Circuit solver, placement rules, burn and relay logic, scenario evaluation |
| `src/content_ui.js` | UI strings in four locales and the transliteration to Cyrillic |
| `src/content_lessons.js` | 10 lessons and their presets |
| `src/content_cards.js` | 60 quiz cards |
| `src/content_repair.js` | 12 broken circuits and their scenarios |
| `src/app.js` | Breadboard rendering, interaction, panels, persistence |
| `src/template.html` | Layout and styles |

## Model limits

This is a teaching model, not a SPICE replacement. It uses DC steady state, so capacitors are open circuits and there is no transient or AC analysis. Component models are simplified (for example, a generic LED Vf per colour, and an ideal relay coil with a pull-in threshold).

## Licence

Apache License 2.0. See `LICENSE`.

Copyright 2026 Kristian Mario Mišković (TekiDeki).

## Support

If you find it useful, you can [support the project](https://paypal.me/TekiDeki).
