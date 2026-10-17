/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Kristian Mario Mišković (TekiDeki)
 * UI strings. Serbian Cyrillic is generated from Serbian Latin (deterministic transliteration). */
(function (global) {
  'use strict';

  const CYR_MAP = {
    a: 'а', b: 'б', c: 'ц', 'č': 'ч', 'ć': 'ћ', d: 'д', 'đ': 'ђ', e: 'е', f: 'ф', g: 'г', h: 'х',
    i: 'и', j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', 'š': 'ш',
    t: 'т', u: 'у', v: 'в', z: 'з', 'ž': 'ж'
  };
  const DIGRAPHS = { lj: 'љ', nj: 'њ', 'dž': 'џ' };

  function toCyrillic(text) {
    return String(text).replace(/(lj|nj|dž|Lj|Nj|Dž|LJ|NJ|DŽ)|[A-Za-zČĆĐŠŽčćđšž]/g, m => {
      if (m.length === 2 && DIGRAPHS[m.toLowerCase()]) {
        const low = DIGRAPHS[m.toLowerCase()];
        return m[0] === m[0].toUpperCase() ? low.toUpperCase() : low;
      }
      const lower = m.toLowerCase();
      const out = CYR_MAP[lower];
      if (!out) return m;
      return m === lower ? out : out.toUpperCase();
    });
  }

  const ui = {
    ro: {
      appTitle: 'Circuit Lab',
      tagline: 'Simulator de breadboard: pune piese, apasă Simulează.',
      yes: 'da', no: 'nu', light: 'Lumină', noBurnShort: 'Scurtcircuit la sursă', checkedAt: 'Verificare',
      progressOf: 'din', challengeDone: 'Reparat', challengeOpen: 'Deschide',
      tipNone: '', closedWord: 'închis', openWord: 'deschis', recent: 'Ultimele piese',
      tabLab: 'Laborator', tabLessons: 'Lecții', tabCards: 'Carduri', tabRepair: 'Circuite stricate',
      simulate: 'Simulează', resimulate: 'Resimulează', reset: 'Resetează', clear: 'Golește', undo: 'Anulează',
      del: 'Șterge', measure: 'Măsoară', wire: 'Fir', select: 'Selectează', examples: 'Exemple',
      inspect: 'Piesa selectată', none: 'Nimic selectat', value: 'Valoare', color: 'Culoare',
      light: 'Lumină', temp: 'Temperatură', pos: 'Poziție cursor', pressed: 'Apăsat', on: 'Pornit', off: 'Oprit',
      closed: 'Închis', open: 'Deschis', current: 'Curent', voltage: 'Tensiune', power: 'Putere',
      status: 'Stare', ok: 'Simulare reușită', noPower: 'Adaugă o baterie pe șina de alimentare.',
      shorted: 'Scurtcircuit: bateria dă peste 1 A. Verifică firele dintre + și -.',
      noConverge: 'Simularea nu s-a stabilizat. Verifică circuitul.',
      relayLoop: 'Releul nu s-a stabilizat (contactele se alimentează singure).',
      burnDone: 'Ai ars: ', damaged: 'Piesă arsă', burnedHint: 'Arsă: scoate-o și pune una nouă.',
      errOccupied: 'Gaura este deja ocupată.', errOffBoard: 'Piesa iese de pe placă.',
      errNeedsRail: 'Bateria se pune pe șinele de alimentare (P1 sau P2).',
      errNoRail: 'Piesele se pun pe rândurile a-j, nu pe șine.', errBadHole: 'Alege o gaură.',
      wireFrom: 'Alege primul capăt al firului.', wireTo: 'Alege al doilea capăt.', wireCancel: 'Fir anulat.',
      measureHint: 'Atinge o gaură pentru tensiunea față de masă (-).',
      measureNone: 'Gaură fără conexiune la circuit.', ground: 'masa (-)',
      placeHint: 'Atinge o gaură pentru a plasa piesa.', selectHint: 'Atinge o piesă sau un fir. Trage piesa pentru a o muta.',
      cardsIntro: 'Întrebări cu un singur răspuns corect. Explicația apare după alegere.',
      cardsScore: 'Scor', cardsNext: 'Următoarea', cardsRestart: 'Reia', cardsCorrect: 'Corect.', cardsWrong: 'Greșit.',
      cardsDone: 'Ai terminat setul.', cardsCategory: 'Categorie', cardsProgress: 'Întrebarea',
      lessonsIntro: 'Citește lecția, apoi încarcă circuitul ei în laborator și experimentează.',
      lessonLoad: 'Încarcă în laborator', lessonPrev: 'Înapoi', lessonNext: 'Înainte', lessonKey: 'Ține minte',
      lessonNumber: 'Lecția', repairIntro: 'Circuitele sunt stricate. Nu ai indicii: găsește defectele, repară-le și verifică.',
      repairCheck: 'Verifică', repairPass: 'Circuitul funcționează în toate situațiile.', repairFail: 'Încă nu. Verifică scenariul marcat.',
      repairReset: 'Refă circuitul stricat', repairNext: 'Circuitul următor', repairDone: 'Ai reparat toate circuitele.',
      repairGoal: 'Obiectiv', repairScenario: 'Scenariu', repairPressed: 'Apasă butonul',
      repairStatusOk: 'Reparat', repairStatusTodo: 'De reparat', repairProgress: 'Progres',
      scenarioWant: 'Se așteaptă', scenarioGot: 'Obținut', noBurn: 'Nicio piesă arsă',
      inputButton: 'Buton apăsat', inputSwitch: 'Comutator pornit', inputLdr: 'Lumină (LDR)', inputNtc: 'Temperatură (NTC)', inputPot: 'Potențiometru',
      expLed: 'LED-ul', expRelay: 'Releul', expNpn: 'Tranzistorul', expOn: 'aprins', expOff: 'stins',
      expClosed: 'închis', expOpen: 'deschis', expSaturated: 'în saturație',
      donate: 'Susține proiectul', credits: 'Apache-2.0 · TekiDeki', privacy: 'Fără cont, fără urmărire. Totul rulează în browser.',
      dcNote: 'Simularea este în curent continuu (regim staționar). Condensatorul apare ca circuit deschis.',
      colorNames: { red: 'roșu', green: 'verde', yellow: 'galben', blue: 'albastru', white: 'alb' },
      typeNames: {
        battery: 'Baterie', resistor: 'Rezistor', led: 'LED', diode: 'Diodă', capacitor: 'Condensator',
        button: 'Buton', switch: 'Comutator', npn: 'Tranzistor NPN', relay: 'Releu', ldr: 'Fotorezistor (LDR)',
        ntc: 'Termistor NTC', pot: 'Potențiometru'
      },
      burnedNames: 'arsă', wireColor: 'Culoare fir'
    },
    en: {
      appTitle: 'Circuit Lab',
      tagline: 'Breadboard simulator: place parts, press Simulate.',
      yes: 'yes', no: 'no', light: 'Light', noBurnShort: 'Short circuit at the source', checkedAt: 'Check',
      progressOf: 'of', challengeDone: 'Fixed', challengeOpen: 'Open',
      tipNone: '', closedWord: 'closed', openWord: 'open', recent: 'Recent parts',
      tabLab: 'Lab', tabLessons: 'Lessons', tabCards: 'Cards', tabRepair: 'Broken circuits',
      simulate: 'Simulate', resimulate: 'Simulate again', reset: 'Reset', clear: 'Clear', undo: 'Undo',
      del: 'Delete', measure: 'Measure', wire: 'Wire', select: 'Select', examples: 'Examples',
      inspect: 'Selected part', none: 'Nothing selected', value: 'Value', color: 'Colour',
      light: 'Light', temp: 'Temperature', pos: 'Wiper position', pressed: 'Pressed', on: 'On', off: 'Off',
      closed: 'Closed', open: 'Open', current: 'Current', voltage: 'Voltage', power: 'Power',
      status: 'Status', ok: 'Simulation complete', noPower: 'Add a battery on the power rails.',
      shorted: 'Short circuit: the battery delivers over 1 A. Check the wires between + and -.',
      noConverge: 'The simulation did not settle. Check the circuit.',
      relayLoop: 'The relay did not settle (its contacts keep powering its own coil).',
      burnDone: 'Burned: ', damaged: 'Burned part', burnedHint: 'Burned: remove it and place a new one.',
      errOccupied: 'That hole is already taken.', errOffBoard: 'The part would go off the board.',
      errNeedsRail: 'Batteries go on the power rails (P1 or P2).',
      errNoRail: 'Parts go on rows a-j, not on the rails.', errBadHole: 'Pick a hole.',
      wireFrom: 'Pick the first end of the wire.', wireTo: 'Pick the other end.', wireCancel: 'Wire cancelled.',
      measureHint: 'Tap a hole to read its voltage against ground (-).',
      measureNone: 'This hole is not connected to the circuit.', ground: 'ground (-)',
      placeHint: 'Tap a hole to place the part.', selectHint: 'Tap a part or a wire. Drag a part to move it.',
      cardsIntro: 'Single-answer questions. The explanation appears after you choose.',
      cardsScore: 'Score', cardsNext: 'Next', cardsRestart: 'Restart', cardsCorrect: 'Correct.', cardsWrong: 'Wrong.',
      cardsDone: 'You finished the set.', cardsCategory: 'Category', cardsProgress: 'Question',
      lessonsIntro: 'Read the lesson, then load its circuit into the lab and experiment.',
      lessonLoad: 'Load into the lab', lessonPrev: 'Back', lessonNext: 'Next', lessonKey: 'Remember',
      lessonNumber: 'Lesson', repairIntro: 'These circuits are broken. There are no hints: find the faults, fix them and check.',
      repairCheck: 'Check', repairPass: 'The circuit works in every scenario.', repairFail: 'Not yet. Look at the failing scenario.',
      repairReset: 'Restore the broken circuit', repairNext: 'Next circuit', repairDone: 'You repaired every circuit.',
      repairGoal: 'Goal', repairScenario: 'Scenario', repairPressed: 'Press the button',
      repairStatusOk: 'Fixed', repairStatusTodo: 'To fix', repairProgress: 'Progress',
      scenarioWant: 'Expected', scenarioGot: 'Got', noBurn: 'No burned parts',
      inputButton: 'Button pressed', inputSwitch: 'Switch on', inputLdr: 'Light (LDR)', inputNtc: 'Temperature (NTC)', inputPot: 'Potentiometer',
      expLed: 'The LED', expRelay: 'The relay', expNpn: 'The transistor', expOn: 'on', expOff: 'off',
      expClosed: 'closed', expOpen: 'open', expSaturated: 'saturated',
      donate: 'Support the project', credits: 'Apache-2.0 · TekiDeki', privacy: 'No account, no tracking. Everything runs in your browser.',
      dcNote: 'The simulation is DC steady state. A capacitor shows as an open circuit.',
      colorNames: { red: 'red', green: 'green', yellow: 'yellow', blue: 'blue', white: 'white' },
      typeNames: {
        battery: 'Battery', resistor: 'Resistor', led: 'LED', diode: 'Diode', capacitor: 'Capacitor',
        button: 'Push button', switch: 'Switch', npn: 'NPN transistor', relay: 'Relay', ldr: 'Photoresistor (LDR)',
        ntc: 'NTC thermistor', pot: 'Potentiometer'
      },
      burnedNames: 'burned', wireColor: 'Wire colour'
    },
    'sr-latn': {
      appTitle: 'Circuit Lab',
      tagline: 'Simulator breadboard-a: postavi delove, pritisni Simuliraj.',
      yes: 'da', no: 'ne', light: 'Svetlost', noBurnShort: 'Kratak spoj na izvoru', checkedAt: 'Provera',
      progressOf: 'od', challengeDone: 'Popravljeno', challengeOpen: 'Otvori',
      tipNone: '', closedWord: 'zatvoren', openWord: 'otvoren', recent: 'Nedavni delovi',
      tabLab: 'Laboratorija', tabLessons: 'Lekcije', tabCards: 'Kartice', tabRepair: 'Pokvarena kola',
      simulate: 'Simuliraj', resimulate: 'Simuliraj ponovo', reset: 'Resetuj', clear: 'Očisti', undo: 'Poništi',
      del: 'Obriši', measure: 'Meri', wire: 'Žica', select: 'Izaberi', examples: 'Primeri',
      inspect: 'Izabrani deo', none: 'Ništa nije izabrano', value: 'Vrednost', color: 'Boja',
      light: 'Svetlost', temp: 'Temperatura', pos: 'Položaj klizača', pressed: 'Pritisnuto', on: 'Uključeno', off: 'Isključeno',
      closed: 'Zatvoren', open: 'Otvoren', current: 'Struja', voltage: 'Napon', power: 'Snaga',
      status: 'Stanje', ok: 'Simulacija završena', noPower: 'Dodaj bateriju na šine za napajanje.',
      shorted: 'Kratak spoj: baterija daje preko 1 A. Proveri žice između + i -.',
      noConverge: 'Simulacija se nije stabilizovala. Proveri kolo.',
      relayLoop: 'Relej se nije stabilizovao (kontakti sami napajaju svoj kalem).',
      burnDone: 'Izgorelo: ', damaged: 'Izgoreo deo', burnedHint: 'Izgoreo: izvadi ga i stavi novi.',
      errOccupied: 'Ta rupica je već zauzeta.', errOffBoard: 'Deo bi izašao van ploče.',
      errNeedsRail: 'Baterija ide na šine za napajanje (P1 ili P2).',
      errNoRail: 'Delovi idu u redove a-j, ne na šine.', errBadHole: 'Izaberi rupicu.',
      wireFrom: 'Izaberi prvi kraj žice.', wireTo: 'Izaberi drugi kraj.', wireCancel: 'Žica poništena.',
      measureHint: 'Dodirni rupicu da vidiš napon u odnosu na masu (-).',
      measureNone: 'Ta rupica nije povezana sa kolom.', ground: 'masa (-)',
      placeHint: 'Dodirni rupicu da postaviš deo.', selectHint: 'Dodirni deo ili žicu. Prevuci deo da ga pomeriš.',
      cardsIntro: 'Pitanja sa jednim tačnim odgovorom. Objašnjenje se pojavi kad izabereš.',
      cardsScore: 'Rezultat', cardsNext: 'Sledeće', cardsRestart: 'Ponovi', cardsCorrect: 'Tačno.', cardsWrong: 'Netačno.',
      cardsDone: 'Završio si set.', cardsCategory: 'Kategorija', cardsProgress: 'Pitanje',
      lessonsIntro: 'Pročitaj lekciju, pa učitaj njeno kolo u laboratoriju i isprobaj.',
      lessonLoad: 'Učitaj u laboratoriju', lessonPrev: 'Nazad', lessonNext: 'Napred', lessonKey: 'Zapamti',
      lessonNumber: 'Lekcija', repairIntro: 'Ova kola su pokvarena. Nema nagoveštaja: nađi kvarove, popravi ih i proveri.',
      repairCheck: 'Proveri', repairPass: 'Kolo radi u svim scenarijima.', repairFail: 'Još nije. Pogledaj scenario koji ne prolazi.',
      repairReset: 'Vrati pokvareno kolo', repairNext: 'Sledeće kolo', repairDone: 'Popravio si sva kola.',
      repairGoal: 'Cilj', repairScenario: 'Scenario', repairPressed: 'Pritisni taster',
      repairStatusOk: 'Popravljeno', repairStatusTodo: 'Za popravku', repairProgress: 'Napredak',
      scenarioWant: 'Očekivano', scenarioGot: 'Dobijeno', noBurn: 'Nijedan deo nije izgoreo',
      inputButton: 'Taster pritisnut', inputSwitch: 'Prekidač uključen', inputLdr: 'Svetlost (LDR)', inputNtc: 'Temperatura (NTC)', inputPot: 'Potenciometar',
      expLed: 'LED', expRelay: 'Relej', expNpn: 'Tranzistor', expOn: 'svetli', expOff: 'ne svetli',
      expClosed: 'zatvoren', expOpen: 'otvoren', expSaturated: 'u zasićenju',
      donate: 'Podrži projekat', credits: 'Apache-2.0 · TekiDeki', privacy: 'Bez naloga, bez praćenja. Sve radi u pregledaču.',
      dcNote: 'Simulacija je jednosmerna struja (stacionarno stanje). Kondenzator je prekid kola.',
      colorNames: { red: 'crvena', green: 'zelena', yellow: 'žuta', blue: 'plava', white: 'bela' },
      typeNames: {
        battery: 'Baterija', resistor: 'Otpornik', led: 'LED', diode: 'Dioda', capacitor: 'Kondenzator',
        button: 'Taster', switch: 'Prekidač', npn: 'NPN tranzistor', relay: 'Relej', ldr: 'Fotootpornik (LDR)',
        ntc: 'NTC termistor', pot: 'Potenciometar'
      },
      burnedNames: 'izgoreo', wireColor: 'Boja žice'
    }
  };

  // Build the Cyrillic table from the Latin one (same keys, same structure).
  function cyrilize(obj) {
    if (typeof obj === 'string') return toCyrillic(obj);
    if (Array.isArray(obj)) return obj.map(cyrilize);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const k of Object.keys(obj)) out[k] = cyrilize(obj[k]);
      return out;
    }
    return obj;
  }
  ui['sr-cyrl'] = cyrilize(ui['sr-latn']);

  const api = { ui, toCyrillic };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CircuitContentUI = api;
  global.CircuitI18N = { ui: ui, toCyrillic: toCyrillic };
})(typeof window !== 'undefined' ? window : globalThis);
