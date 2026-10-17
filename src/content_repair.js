/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Kristian Mario Mišković (TekiDeki)
 * Twelve broken circuits. The player gets the symptom and the scenarios, never the fault.
 * Scenario keys: led / led2 / led3 (LED in order), relay, npn (transistor), with on/off/closed/open.
 * Inputs: button, switch, ldr (light 0..1), ntc (temperature), pot (wiper 0..1). */
(function (global) {
  'use strict';

  const CHALLENGES = [
    {
      id: 'led-reversed',
      title: { ro: 'LED-ul invers', en: 'The backwards LED', sr: 'LED okrenut naopako' },
      symptom: {
        ro: 'Alimentare pe 5 V, rezistor de 220 Ω, LED roșu. LED-ul nu se aprinde deloc.',
        en: '5 V supply, 220 Ω resistor, red LED. The LED never lights up.',
        sr: 'Napajanje 5 V, otpornik 220 Ω, crveni LED. LED se nikad ne upali.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 220 } },
          { type: 'led', hole: 'e8', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e9'], ['e8', 'P1-8']]
      },
      scenarios: [{ in: {}, expect: { led: 'on' } }]
    },
    {
      id: 'resistor-too-small',
      title: { ro: 'Rezistorul care fumegă', en: 'The smoking resistor', sr: 'Otpornik koji dimi' },
      symptom: {
        ro: 'Circuit cu LED pe 9 V. La simulare, rezistorul devine fierbinte și LED-ul nu se aprinde.',
        en: 'An LED circuit on 9 V. When simulated the resistor gets hot and the LED stays off.',
        sr: 'Kolo sa LED-om na 9 V. Pri simulaciji otpornik se zagreje, a LED ne svetli.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 9 } },
          { type: 'resistor', hole: 'e3', props: { R: 10 } },
          { type: 'led', hole: 'e8', props: { color: 'green' } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e9', 'P1-9']]
      },
      scenarios: [{ in: {}, expect: { led: 'on' } }]
    },
    {
      id: 'dead-button',
      title: { ro: 'Butonul mort', en: 'The dead button', sr: 'Mrtav taster' },
      symptom: {
        ro: 'Când apeși butonul, LED-ul ar trebui să se aprindă. Nu se întâmplă nimic, indiferent de apăsare.',
        en: 'Pressing the button should light the LED. Nothing happens, whether it is pressed or not.',
        sr: 'Kad pritisneš taster, LED treba da se upali. Ništa se ne dešava, bez obzira na pritisak.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'button', hole: 'e20' },
          { type: 'resistor', hole: 'e24', props: { R: 330 } },
          { type: 'led', hole: 'e29', props: { color: 'red' } }
        ],
        wires: [['P1+20', 'e20'], ['P1+22', 'e22'], ['e28', 'e29'], ['e30', 'P1-30']]
      },
      scenarios: [
        { in: { button: false }, expect: { led: 'off' } },
        { in: { button: true }, expect: { led: 'on' } }
      ]
    },
    {
      id: 'relay-no-click',
      title: { ro: 'Releul mut', en: 'The silent relay', sr: 'Nemi relej' },
      symptom: {
        ro: 'Releul trebuie să tragă când circuitul este alimentat, iar contactul să închidă. Releul rămâne în repaus.',
        en: 'The relay should pull in when the circuit is powered, closing its contact. It stays at rest.',
        sr: 'Relej treba da privuče kad je kolo pod naponom i zatvori kontakt. Ostaje u mirovanju.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'relay', hole: 'e10' },
          { type: 'resistor', hole: 'b15', props: { R: 220 } },
          { type: 'led', hole: 'b20', props: { color: 'green' } }
        ],
        wires: [
          ['P1+12', 'e12'], ['e13', 'b15'], ['b19', 'b20'], ['b21', 'P1-21'],
          ['e10', 'P1-10'], ['e11', 'P1-11']
        ]
      },
      scenarios: [{ in: {}, expect: { relay: 'closed', led: 'on' } }]
    },
    {
      id: 'transistor-swapped',
      title: { ro: 'Tranzistorul nu conduce', en: 'The transistor that will not switch', sr: 'Tranzistor koji ne provodi' },
      symptom: {
        ro: 'Un buton deschide baza tranzistorului, iar LED-ul din colector ar trebui să se aprindă la apăsare. Nu se aprinde.',
        en: 'A button drives the transistor base, and the LED on the collector should light when pressed. It does not.',
        sr: 'Taster vodi bazu tranzistora, a LED na kolektoru treba da se upali kad se pritisne. Ne upali se.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'b3', props: { R: 470 } },
          { type: 'led', hole: 'b8', props: { color: 'red' } },
          { type: 'npn', hole: 'j10' },
          { type: 'button', hole: 'e20' },
          { type: 'resistor', hole: 'e24', props: { R: 10000 } },
          { type: 'resistor', hole: 'b25', props: { R: 100000 } }
        ],
        wires: [
          ['P1+3', 'b3'], ['b7', 'b8'], ['b9', 'j12'], ['j11', 'P1-11'],
          ['P1+20', 'e20'], ['e22', 'e24'], ['e28', 'j10'], ['b25', 'j10'], ['b29', 'P1-29']
        ]
      },
      scenarios: [
        { in: { button: false }, expect: { led: 'off' } },
        { in: { button: true }, expect: { led: 'on', npn: 'on' } }
      ]
    },
    {
      id: 'ldr-inverted',
      title: { ro: 'Lumina inversată', en: 'The inverted light sensor', sr: 'Obrnut svetlosni senzor' },
      symptom: {
        ro: 'LED-ul trebuie să se aprindă în întuneric și să se stingă la lumină. Acum face exact invers.',
        en: 'The LED should light in the dark and go out in the light. Right now it does the opposite.',
        sr: 'LED treba da svetli u mraku, a da se ugasi na svetlosti. Sad radi obrnuto.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'ldr', hole: 'e3', props: { light: 0.5 } },
          { type: 'resistor', hole: 'e6', props: { R: 2200 } },
          { type: 'resistor', hole: 'b5', props: { R: 330 } },
          { type: 'led', hole: 'b10', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['e5', 'e6'], ['e10', 'P1-10'], ['b9', 'b10'], ['b11', 'P1-11']]
      },
      scenarios: [
        { in: { ldr: 0 }, expect: { led: 'on' } },
        { in: { ldr: 1 }, expect: { led: 'off' } }
      ]
    },
    {
      id: 'rails-swapped',
      title: { ro: 'Șinele inversate', en: 'The swapped rails', sr: 'Zamenjene šine' },
      symptom: {
        ro: 'Bateria este conectată corect, dar LED-ul din circuit nu se aprinde niciodată.',
        en: 'The battery is connected correctly, but the LED in this circuit never lights.',
        sr: 'Baterija je dobro povezana, ali LED u ovom kolu se nikad ne upali.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 220 } },
          { type: 'led', hole: 'e8', props: { color: 'blue' } }
        ],
        wires: [['P1-3', 'e3'], ['e7', 'e8'], ['e9', 'P1+9']]
      },
      scenarios: [{ in: {}, expect: { led: 'on' } }]
    },
    {
      id: 'pot-floating-wiper',
      title: { ro: 'Potențiometrul mut', en: 'The silent potentiometer', sr: 'Nemi potenciometar' },
      symptom: {
        ro: 'Rotind potențiometrul, LED-ul ar trebui să se aprindă când cursorul e sus și să se stingă când e jos. Nu se schimbă nimic.',
        en: 'Turning the potentiometer should light the LED when the wiper is high and turn it off when low. Nothing changes.',
        sr: 'Okretanjem potenciometra LED treba da se upali kad je klizač gore, a ugasi kad je dole. Ništa se ne menja.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'pot', hole: 'e3', props: { pos: 0.5 } },
          { type: 'resistor', hole: 'e8', props: { R: 1000 } },
          { type: 'led', hole: 'e13', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['P1-5', 'e5'], ['e12', 'e13'], ['e14', 'P1-14']]
      },
      scenarios: [
        { in: { pot: 0.9 }, expect: { led: 'on' } },
        { in: { pot: 0.05 }, expect: { led: 'off' } }
      ]
    },
    {
      id: 'burned-led',
      title: { ro: 'LED-ul ars', en: 'The burned LED', sr: 'Izgoreo LED' },
      symptom: {
        ro: 'Circuitul era bun ieri. Astăzi LED-ul nu mai luminează, deși rezistorul și bateria sunt în regulă.',
        en: 'This circuit worked yesterday. Today the LED is dark, though the resistor and battery are fine.',
        sr: 'Kolo je radilo juče. Danas LED ne svetli, iako su otpornik i baterija u redu.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 330 } },
          { type: 'led', hole: 'e8', props: { color: 'white' }, burned: true }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e9', 'P1-9']]
      },
      scenarios: [{ in: {}, expect: { led: 'on' } }]
    },
    {
      id: 'two-leds-series',
      title: { ro: 'Două LED-uri în serie', en: 'Two LEDs in series', sr: 'Dve LED diode u redu' },
      symptom: {
        ro: 'Două LED-uri roșii în serie, cu un rezistor de 330 Ω, pe 5 V. Niciunul nu se aprinde.',
        en: 'Two red LEDs in series with a 330 Ω resistor on 5 V. Neither lights up.',
        sr: 'Dve crvene LED diode u redu sa otpornikom 330 Ω na 5 V. Nijedna ne svetli.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 330 } },
          { type: 'led', hole: 'e8', props: { color: 'red' } },
          { type: 'led', hole: 'e10', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e9', 'e11'], ['e10', 'P1-10']]
      },
      scenarios: [{ in: {}, expect: { led: 'on', led2: 'on' } }]
    },
    {
      id: 'relay-driver',
      title: { ro: 'Releul comandat de tranzistor', en: 'The relay driven by a transistor', sr: 'Relej koji vodi tranzistor' },
      symptom: {
        ro: 'Butonul ar trebui să tragă releul prin tranzistor. Apăsat, releul rămâne deschis, iar tranzistorul nu comută.',
        en: 'The button should pull the relay in through the transistor. Pressed, the relay stays open and the transistor does not switch.',
        sr: 'Taster treba da privuče relej preko tranzistora. Pritisnut, relej ostaje otvoren, a tranzistor ne prebacuje.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'relay', hole: 'e11' },
          { type: 'npn', hole: 'j10' },
          { type: 'button', hole: 'e20' },
          { type: 'resistor', hole: 'e24', props: { R: 10000 } },
          { type: 'resistor', hole: 'b25', props: { R: 100000 } }
        ],
        wires: [
          ['P1+11', 'e11'], ['e12', 'j12'], ['e13', 'P1+13'],
          ['P1+20', 'e20'], ['e28', 'j10'], ['b25', 'j10'], ['b29', 'P1-29'], ['j11', 'P1-11']
        ]
      },
      scenarios: [
        { in: { button: false }, expect: { relay: 'open' } },
        { in: { button: true }, expect: { relay: 'closed', npn: 'on' } }
      ]
    },
    {
      id: 'hidden-short',
      title: { ro: 'Scurtcircuitul ascuns', en: 'The hidden short', sr: 'Skriveni kratki spoj' },
      symptom: {
        ro: 'Un circuit simplu cu LED. Bateria pare încărcată, dar LED-ul rămâne stins și simulatorul semnalează ceva la sursă.',
        en: 'A simple LED circuit. The battery looks charged, but the LED stays off and the simulator warns about the source.',
        sr: 'Jednostavno kolo sa LED-om. Baterija izgleda napunjena, ali LED ostaje ugašen i simulator upozorava na izvor.'
      },
      setup: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 220 } },
          { type: 'led', hole: 'e8', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e9', 'P1-9'], ['P1+15', 'P1-15']]
      },
      scenarios: [{ in: {}, expect: { led: 'on' } }]
    }
  ];

  const api = { CHALLENGES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CircuitRepair = api;
})(typeof window !== 'undefined' ? window : globalThis);
