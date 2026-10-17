/* SPDX-License-Identifier: Apache-2.0
 * Copyright 2026 Kristian Mario Mišković (TekiDeki)
 * Ten lessons. Each one has a lab circuit that loads with one tap. Serbian Cyrillic is generated. */
(function (global) {
  'use strict';

  const LESSONS = [
    {
      id: 'breadboard',
      title: { ro: 'Placa de test (breadboard)', en: 'The breadboard', sr: 'Proto-ploča (breadboard)' },
      body: {
        ro: [
          'Pe o placă de test nu lipești nimic. Introduci piesele în găuri, iar găurile se leagă între ele după un tipar fix.',
          'Rândurile a-e dintr-o coloană sunt conectate între ele. La fel și f-j. Între e și f este canalul din mijloc, care le desparte. Șinele de pe margini (P1 și P2) sunt pentru alimentare: toate găurile dintr-un rând de șină sunt conectate pe toată lungimea.'
        ],
        en: [
          'On a breadboard you do not solder anything. You push the parts into holes, and the holes are joined by a fixed pattern.',
          'Rows a-e in one column are joined together, and so are f-j. The centre channel separates e from f. The rails along the edges (P1 and P2) are for power: every hole in one rail row is connected along its whole length.'
        ],
        sr: [
          'Na proto-ploči ništa ne lemiš. Delove ubodeš u rupice, a rupice su povezane po fiksnom obrascu.',
          'Redovi a-e u istoj koloni povezani su međusobno, isto kao i f-j. Srednji kanal razdvaja e i f. Šine uz ivice (P1 i P2) služe za napajanje: sve rupice u jednom redu šine povezane su po celoj dužini.'
        ]
      },
      key: {
        ro: 'Două găuri din aceeași coloană (a-e sau f-j) sunt conectate. Două găuri din coloane diferite nu sunt.',
        en: 'Two holes in the same column (a-e or f-j) are connected. Holes in different columns are not.',
        sr: 'Dve rupice u istoj koloni (a-e ili f-j) su povezane. Rupice u različitim kolonama nisu.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 9 } },
          { type: 'resistor', hole: 'e3', props: { R: 330 } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'P1-7']]
      }
    },
    {
      id: 'ohm',
      title: { ro: 'Tensiune, curent și rezistență', en: 'Voltage, current and resistance', sr: 'Napon, struja i otpor' },
      body: {
        ro: [
          'Tensiunea (V, în volți) împinge curentul. Curentul (I, în amperi) este cât de mult trece prin circuit. Rezistența (R, în ohmi) se opune curentului.',
          'Legea lui Ohm spune: U = I × R. Pe un rezistor de 470 Ω la 9 V, curentul este 9 / 470, adică aproximativ 19 mA. Puterea disipată este P = U × I, și rezistorul trebuie să o suporte (de obicei 0,25 W).'
        ],
        en: [
          'Voltage (V, in volts) pushes the current. Current (I, in amperes) is how much flows through the circuit. Resistance (R, in ohms) opposes the current.',
          'Ohm\'s law says: U = I × R. Across a 470 Ω resistor at 9 V the current is 9 / 470, about 19 mA. The power dissipated is P = U × I, and the resistor has to survive it (typically 0.25 W).'
        ],
        sr: [
          'Napon (V, u voltima) tera struju. Struja (I, u amperima) je koliko protiče kroz kolo. Otpor (R, u omima) se suprotstavlja struji.',
          'Omov zakon kaže: U = I × R. Na otporniku od 470 Ω pri 9 V struja je 9 / 470, oko 19 mA. Snaga koja se troši je P = U × I, a otpornik je mora izdržati (obično 0,25 W).'
        ]
      },
      key: {
        ro: 'U = I × R. Un rezistor de 100 Ω la 9 V consumă 0,81 W și arde.',
        en: 'U = I × R. A 100 Ω resistor across 9 V dissipates 0.81 W and burns.',
        sr: 'U = I × R. Otpornik od 100 Ω na 9 V troši 0,81 W i izgoreće.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 9 } },
          { type: 'resistor', hole: 'e3', props: { R: 470 } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'P1-7']]
      }
    },
    {
      id: 'led',
      title: { ro: 'LED-ul și rezistența de limitare', en: 'The LED and its current limiting resistor', sr: 'LED i otpornik za ograničenje struje' },
      body: {
        ro: [
          'LED-ul este o diodă: lasă curentul să treacă într-un singur sens, de la anod (+) la catod (-). Are o cădere de tensiune aproape constantă, de circa 1,9 V pentru roșu și 3 V pentru albastru sau alb.',
          'Odată ce tensiunea depășește această cădere, curentul crește foarte repede. Fără rezistor, LED-ul trage zeci de mA și se arde. Cu rezistorul în serie, curentul devine (Vsursă - Vled) / R. Pentru 5 V și 220 Ω ajungi la circa 14 mA.'
        ],
        en: [
          'An LED is a diode: it lets current pass in one direction only, from anode (+) to cathode (-). Its forward voltage is almost constant, about 1.9 V for red and about 3 V for blue or white.',
          'Once the voltage passes that drop, the current rises very quickly. Without a resistor the LED draws tens of mA and burns. With a resistor in series the current is (Vsupply - Vled) / R. At 5 V and 220 Ω you get about 14 mA.'
        ],
        sr: [
          'LED je dioda: propušta struju u jednom smeru, od anode (+) ka katodi (-). Njegov napon u propusnom smeru je skoro konstantan: oko 1,9 V za crvenu, a oko 3 V za plavu ili belu.',
          'Kad napon pređe taj pad, struja naglo raste. Bez otpornika LED povlači desetine mA i izgoreće. Sa otpornikom u redu, struja je (Unapajanje - Uled) / R. Za 5 V i 220 Ω dobijaš oko 14 mA.'
        ]
      },
      key: {
        ro: 'Întotdeauna un rezistor în serie cu LED-ul. Un LED pe 5 V direct se arde.',
        en: 'Always put a resistor in series with an LED. An LED straight across 5 V burns.',
        sr: 'Uvek stavi otpornik u red sa LED-om. LED direktno na 5 V izgoreće.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 220 } },
          { type: 'led', hole: 'e8', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e9', 'P1-9']]
      }
    },
    {
      id: 'divider',
      title: { ro: 'Divizorul de tensiune', en: 'The voltage divider', sr: 'Razdelnik napona' },
      body: {
        ro: [
          'Două rezistoare în serie împart tensiunea. Curentul este același prin ambele, dar tensiunea pe fiecare este proporțională cu rezistența sa.',
          'Tensiunea din mijloc este Uieșire = Usursă × R2 / (R1 + R2). Cu două rezistoare egale de 1 kΩ, pe 9 V obții 4,5 V. Divizoarele sunt folosite la citirea senzorilor, unde una dintre rezistențe se schimbă.'
        ],
        en: [
          'Two resistors in series divide the voltage. The same current flows through both, but the voltage across each is proportional to its resistance.',
          'The middle voltage is Vout = Vsupply × R2 / (R1 + R2). With two equal 1 kΩ resistors on 9 V you get 4.5 V. Dividers are used to read sensors, where one of the resistors changes.'
        ],
        sr: [
          'Dva otpornika u redu dele napon. Kroz oba protiče ista struja, ali je napon na svakom srazmeran njegovom otporu.',
          'Napon u sredini je Uizlaz = Unapajanje × R2 / (R1 + R2). Sa dva jednaka otpornika od 1 kΩ na 9 V dobijaš 4,5 V. Razdelnici se koriste za očitavanje senzora, gde se jedan otpornik menja.'
        ]
      },
      key: {
        ro: 'Tensiunea din mijloc depinde de raportul rezistențelor, nu de valorile absolute.',
        en: 'The middle voltage depends on the ratio of the resistors, not on their absolute values.',
        sr: 'Napon u sredini zavisi od odnosa otpornika, a ne od apsolutnih vrednosti.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 9 } },
          { type: 'resistor', hole: 'e3', props: { R: 1000 } },
          { type: 'resistor', hole: 'e8', props: { R: 1000 } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e12', 'P1-12']]
      }
    },
    {
      id: 'button',
      title: { ro: 'Butonul și comutatorul', en: 'Push buttons and switches', sr: 'Taster i prekidač' },
      body: {
        ro: [
          'Butonul (taster) face contact doar cât îl ții apăsat. Comutatorul rămâne în poziția în care l-ai lăsat. Din punct de vedere electric, amândoi închid sau deschid un drum pentru curent.',
          'Un buton lasat în aer nu este nici pe 0, nici pe 1. Pentru un semnal sigur se folosește un rezistor de tragere (pull-down) spre masă.'
        ],
        en: [
          'A push button only makes contact while you hold it down. A switch stays in the position you left it. Electrically both open or close a path for the current.',
          'A floating input is neither clearly low nor high. For a reliable signal, use a pull-down resistor to ground.'
        ],
        sr: [
          'Taster ostvaruje kontakt samo dok ga držiš pritisnutog. Prekidač ostaje u položaju u kom ga ostaviš. Električno oboje zatvaraju ili otvaraju put struji.',
          'Ulaz koji visi u vazduhu nije ni jasno nizak ni jasno visok. Za pouzdan signal koristi se pull-down otpornik prema masi.'
        ]
      },
      key: {
        ro: 'Butonul închide circuitul doar cât este apăsat. Un rezistor de tragere fixează semnalul.',
        en: 'A push button closes the circuit only while pressed. A pull-down resistor fixes the signal.',
        sr: 'Taster zatvara kolo samo dok je pritisnut. Pull-down otpornik fiksira signal.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'e3', props: { R: 330 } },
          { type: 'button', hole: 'e8' },
          { type: 'led', hole: 'e11', props: { color: 'green' } }
        ],
        wires: [['P1+3', 'e3'], ['e7', 'e8'], ['e10', 'e11'], ['e12', 'P1-12']]
      }
    },
    {
      id: 'transistor',
      title: { ro: 'Tranzistorul ca întrerupător', en: 'The transistor as a switch', sr: 'Tranzistor kao prekidač' },
      body: {
        ro: [
          'Tranzistorul NPN are trei picioare: baza (B), colectorul (C) și emitorul (E). Un curent mic prin bază permite un curent mult mai mare de la colector la emitor.',
          'Raportul dintre ele se numește câștig (β, de obicei 100 până la 300). Când tranzistorul este în saturație, funcționează ca un întrerupător închis. Între bază și emitor trebuie să existe circa 0,7 V, iar în bază pui un rezistor, ca să limitezi curentul.'
        ],
        en: [
          'An NPN transistor has three legs: base (B), collector (C) and emitter (E). A small current into the base allows a much larger current from collector to emitter.',
          'The ratio is the gain (β, usually 100 to 300). When the transistor is saturated it behaves like a closed switch. About 0.7 V must be present between base and emitter, and a resistor in the base limits the current.'
        ],
        sr: [
          'NPN tranzistor ima tri noge: bazu (B), kolektor (C) i emitor (E). Mala struja kroz bazu omogućava mnogo veću struju od kolektora ka emitoru.',
          'Odnos je pojačanje (β, obično 100 do 300). Kad je tranzistor u zasićenju, radi kao zatvoren prekidač. Između baze i emitora mora biti oko 0,7 V, a otpornik u bazi ograničava struju.'
        ]
      },
      key: {
        ro: 'Baza primește un curent mic, colectorul comută un curent mare. Nu lega sarcina direct la bază.',
        en: 'The base gets a small current, the collector switches a large one. Never connect the load straight to the base.',
        sr: 'Baza dobija malu struju, a kolektor prebacuje veliku. Nikad ne vezuj teret direktno na bazu.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'resistor', hole: 'b3', props: { R: 470 } },
          { type: 'led', hole: 'b8', props: { color: 'red' } },
          { type: 'npn', hole: 'j10' },
          { type: 'button', hole: 'e20' },
          { type: 'resistor', hole: 'e24', props: { R: 10000 } },
          { type: 'resistor', hole: 'b13', props: { R: 100000 } }
        ],
        wires: [
          ['P1+3', 'b3'], ['b7', 'b8'], ['b9', 'j11'], ['j12', 'P1-12'],
          ['P1+20', 'e20'], ['e22', 'e24'], ['e28', 'j10'], ['b13', 'j10'], ['b17', 'P1-17']
        ]
      }
    },
    {
      id: 'relay',
      title: { ro: 'Releul', en: 'The relay', sr: 'Relej' },
      body: {
        ro: [
          'Releul este un electromagnet care închide sau deschide contacte mecanice. Bobina (cele două picioare de sus) se alimentează separat de contactele (COM, NO, NC).',
          'COM este comunul, NO se închide când bobina este alimentată, iar NC se deschide. Pentru acest releu, bobina trage când curentul depășește circa 30 mA, adică aproximativ 2,1 V pe 70 Ω. Sub această valoare contactele rămân deschise. Releul separă două circuite: un semnal mic poate comanda un circuit mare.'
        ],
        en: [
          'A relay is an electromagnet that opens or closes mechanical contacts. The coil (the two top pins) is powered separately from the contacts (COM, NO, NC).',
          'COM is the common pin, NO closes when the coil is energised, and NC opens. For this relay the coil pulls in above about 30 mA, which is about 2.1 V across 70 Ω. Below that the contacts stay open. A relay separates two circuits: a small signal can switch a large load.'
        ],
        sr: [
          'Relej je elektromagnet koji otvara ili zatvara mehaničke kontakte. Kalem (dve gornje noge) napaja se odvojeno od kontakata (COM, NO, NC).',
          'COM je zajednički, NO se zatvara kad je kalem pod naponom, a NC se otvara. Za ovaj relej kalem privlači iznad oko 30 mA, to jest oko 2,1 V na 70 Ω. Ispod toga kontakti ostaju otvoreni. Relej razdvaja dva kola: mali signal može da uključi veliki teret.'
        ]
      },
      key: {
        ro: 'Releul separă circuitul de comandă de cel de putere. Diodă de protecție (flyback) la bobine mari.',
        en: 'A relay separates the control circuit from the power circuit. Use a flyback diode across large coils.',
        sr: 'Relej razdvaja upravljačko kolo od strujnog. Za veće kalemove koristi zaštitnu (flyback) diodu.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'relay', hole: 'e10' },
          { type: 'resistor', hole: 'b15', props: { R: 220 } },
          { type: 'led', hole: 'b20', props: { color: 'green' } }
        ],
        wires: [
          ['P1+10', 'e10'], ['e11', 'P1-11'], ['P1+12', 'e12'],
          ['e13', 'b15'], ['b19', 'b20'], ['b21', 'P1-21']
        ]
      }
    },
    {
      id: 'ldr',
      title: { ro: 'Fotorezistorul (LDR)', en: 'The light-dependent resistor (LDR)', sr: 'Fotootpornik (LDR)' },
      body: {
        ro: [
          'Fotorezistorul își schimbă rezistența în funcție de lumină: la întuneric are sute de kΩ sau chiar MΩ, la lumină puternică câțiva kΩ sau mai puțin.',
          'Pus într-un divizor de tensiune, LDR-ul transformă lumina într-o tensiune. Tensiunea din mijloc crește sau scade cu lumina, iar un circuit (de exemplu un tranzistor) poate reacționa la ea.'
        ],
        en: [
          'A photoresistor changes its resistance with light: in the dark it can be hundreds of kΩ or MΩ, in strong light a few kΩ or less.',
          'Placed in a voltage divider, the LDR turns light into a voltage. The middle voltage rises or falls with the light, and a circuit (for example a transistor) can react to it.'
        ],
        sr: [
          'Fotootpornik menja otpor u zavisnosti od svetlosti: u mraku može biti stotine kΩ ili MΩ, a na jakoj svetlosti nekoliko kΩ ili manje.',
          'Stavljen u razdelnik napona, LDR pretvara svetlost u napon. Napon u sredini raste ili opada sa svetlošću, a kolo (na primer tranzistor) može da reaguje na njega.'
        ]
      },
      key: {
        ro: 'Lumină mai multă, rezistență mai mică. Ajustează cursorul "Lumină" și vezi tensiunea din mijloc.',
        en: 'More light, less resistance. Move the Light slider and watch the middle voltage.',
        sr: 'Više svetlosti, manji otpor. Pomeri klizač "Svetlost" i gledaj napon u sredini.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'ldr', hole: 'e3', props: { light: 0.2 } },
          { type: 'resistor', hole: 'e6', props: { R: 10000 } }
        ],
        wires: [['P1+3', 'e3'], ['e5', 'e6'], ['e10', 'P1-10']]
      }
    },
    {
      id: 'pot',
      title: { ro: 'Potențiometrul și termistorul NTC', en: 'The potentiometer and the NTC thermistor', sr: 'Potenciometar i NTC termistor' },
      body: {
        ro: [
          'Potențiometrul are trei picioare: două capete fixe și un cursor (wiper) mobil. Cursorul împarte rezistența totală în două părți, deci este un divizor de tensiune reglabil. Îl folosești pentru volum, luminozitate sau setări.',
          'Termistorul NTC își scade rezistența când se încălzește. Pentru B = 3950 și 25 °C, valoarea este de 10 kΩ; la 50 °C scade la circa 3,6 kΩ.'
        ],
        en: [
          'A potentiometer has three legs: two fixed ends and a moving wiper. The wiper splits the total resistance into two parts, so it is an adjustable voltage divider. You use it for volume, brightness or settings.',
          'An NTC thermistor lowers its resistance when it heats up. For B = 3950 and 25 °C the value is 10 kΩ; at 50 °C it drops to about 3.6 kΩ.'
        ],
        sr: [
          'Potenciometar ima tri noge: dva fiksna kraja i pokretni klizač (wiper). Klizač deli ukupni otpor na dva dela, pa je to podesivi razdelnik napona. Koristi se za jačinu zvuka, svetlinu ili podešavanja.',
          'NTC termistor smanjuje otpor kad se zagreje. Za B = 3950 i 25 °C vrednost je 10 kΩ; na 50 °C pada na oko 3,6 kΩ.'
        ]
      },
      key: {
        ro: 'Potențiometrul este un divizor reglabil. Termistorul NTC scade rezistența la căldură.',
        en: 'A potentiometer is an adjustable divider. An NTC thermistor loses resistance when hot.',
        sr: 'Potenciometar je podesivi razdelnik. NTC termistor gubi otpor kad se zagreje.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'pot', hole: 'e3', props: { pos: 0.8 } },
          { type: 'resistor', hole: 'e8', props: { R: 1000 } },
          { type: 'led', hole: 'e13', props: { color: 'yellow' } }
        ],
        wires: [['P1+3', 'e3'], ['e5', 'P1-5'], ['e4', 'e8'], ['e12', 'e13'], ['e14', 'P1-14']]
      }
    },
    {
      id: 'capacitor',
      title: { ro: 'Condensatorul și siguranța', en: 'The capacitor and safe building', sr: 'Kondenzator i bezbedna gradnja' },
      body: {
        ro: [
          'Condensatorul stochează sarcină electrică. În curent continuu, în regim stabil, nu lasă curentul să treacă: pentru el este un circuit deschis. Se folosește la netezirea tensiunii, la filtre și la temporizări (în timp, se încarcă și se descarcă).',
          'Regulile de siguranță: verifică polaritatea LED-urilor și a condensatoarelor electrolitice, nu conecta niciodată + direct la - (scurtcircuit), și nu depăși puterea admisă a rezistoarelor.'
        ],
        en: [
          'A capacitor stores electric charge. In steady DC it blocks current, so it acts as an open circuit. It is used to smooth voltage, in filters and for timing (it charges and discharges over time).',
          'Safety rules: check the polarity of LEDs and electrolytic capacitors, never connect + straight to - (a short circuit), and never exceed the power rating of a resistor.'
        ],
        sr: [
          'Kondenzator čuva električno punjenje. U stacionarnoj jednosmernoj struji ne propušta struju: za njega je to prekid kola. Koristi se za glačanje napona, u filterima i za vremenska kola (puni se i prazni tokom vremena).',
          'Pravila bezbednosti: proveri polaritet LED-ova i elektrolitskih kondenzatora, nikad ne spajaj + direktno na - (kratak spoj), i ne prelazi dozvoljenu snagu otpornika.'
        ]
      },
      key: {
        ro: 'Condensatorul blochează curentul continuu. Un scurtcircuit + la - arde sursa sau firele.',
        en: 'A capacitor blocks steady DC. A short from + to - overheats the source or the wires.',
        sr: 'Kondenzator blokira jednosmernu struju u stanju mirovanja. Kratak spoj + na - pregreva izvor ili žice.'
      },
      preset: {
        parts: [
          { type: 'battery', hole: 'P1+1', props: { V: 5 } },
          { type: 'capacitor', hole: 'e3', props: { uF: 100 } },
          { type: 'resistor', hole: 'e7', props: { R: 220 } },
          { type: 'led', hole: 'e12', props: { color: 'red' } }
        ],
        wires: [['P1+3', 'e3'], ['e5', 'e7'], ['e11', 'e12'], ['e13', 'P1-13']]
      }
    }
  ];

  const api = { LESSONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.CircuitLessons = api;
})(typeof window !== 'undefined' ? window : globalThis);
