// story.js – Beispielgeschichte
// Zeigt die drei Themes: troja (Buch 2), mare (Buch 3), carthago (Buch 1)

window.storyNodes = [
  {
    id: 1,
    isStart: true,
    book: 2,
    chapter: 1,
    theme: "troja", // explizit, aber wäre hier auch der Default
    title: "Nacht in Troja",
    label: "Der Himmel steht in Flammen",
    paragraphs: [
      "Schwerer Rauch hängt über den Dächern <em>Troiae</em>. Durch die engen Gassen dringt das Rufen der Kämpfenden und das Krachen einstürzender Häuser. Noch bist du in deinem Haus, umgeben von den wenigen Habseligkeiten, die dir geblieben sind.",
      "Im Innenhof flackert das Licht einer sterbenden Fackel. Ferne Schreie lassen dich zusammenzucken – irgendetwas ist geschehen, das nicht mehr rückgängig zu machen ist. Die Götter haben sich abgewendet.",
      "Du bist <strong>Aeneas</strong>. Zwischen deiner <em>pietas</em> gegenüber Familie und Göttern und dem nackten Überleben musst du deinen Weg finden."
    ],
    choices: [
      {
        text: "Du rennst zu Anchises, deinem Vater, um ihn zu wecken und zu retten.",
        target: 2,
        pietasDelta: 1 // nur einmal beim ersten Besuch
      },
      {
        text: "Du trittst hinaus vor das Haus und versuchst, den Lärm zu deuten.",
        target: 3,
        xpDelta: 1 // kleine Erfahrung für das Erkunden
      },
      {
        text: "Demo: Du suchst dir bewusst eine gefährliche Route durch das Feuer (Probe auf Virtus).",
        target: 6,
        xpDelta: 1
      },
      {
        text: "TEST: Du erinnerst dich an all deine bisherigen Prüfungen (10 Experientia).",
        target: 9,
        xpDelta: 10 // einmaliger Erfahrungs-Boost für Levelup-Test
      },

      // --- TESTWAHLEN FÜR VIGOR-/GLOW-EFFEKT ----------------------------

      {
        text: "TEST: Du nimmst leichten Schaden (Glow ausprobieren).",
        target: 10,
        hpDelta: -6
      },
      {
        text: "TEST: Du nimmst schweren Schaden (starker Glow & Puls).",
        target: 11,
        hpDelta: -22
      }
    ]
  },

  {
    id: 2,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Anchises’ Lager",
    label: "Zwischen Furcht und Pflicht",
    paragraphs: [
      "Der kleine Raum, in dem <em>Anchises</em> schläft, ist von beißendem Rauch erfüllt. Der alte Mann fährt erschrocken hoch, als du ihn rüttelst. Seine Augen glänzen im Schein der fernen Flammen.",
      "„Mein Sohn“, flüstert er heiser, „die Götter haben Troja verlassen. Flieh du – ich bin zu alt, um diese Stadt noch einmal zu verlassen.“",
      "Dein Herz schlägt hart in deiner Brust. Deine <em>pietas</em> bindet dich an deinen Vater, doch vor den Toren scheint die Welt zu zerbrechen."
    ],
    choices: [
      {
        text: "Du schwörst, deinen Vater auf deinen Schultern zu tragen und ihn nicht zurückzulassen.",
        target: 3,
        pietasDelta: 1
      },
      {
        text: "Du zögerst – vielleicht ist es besser, zuerst nach deiner Frau und deinem Sohn zu sehen.",
        target: 3,
        xpDelta: 1
      }
    ]
  },

  // Test-Knoten: einfache Probe auf Virtus (Mut) beim Verlassen des Hauses
  {
    id: 3,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Durch die brennenden Straßen",
    label: "Probe auf Virtus",
    type: "test",
    paragraphs: [
      "Als du die Tür öffnest, schlägt dir eine Welle aus Hitze, Rauch und Lärm entgegen. Funken wirbeln durch die Luft, der Nachtwind treibt den Brand voran.",
      "Vor dir stürzt ein Dach ein – brennende Balken krachen zu Boden. Um deine Familie zu retten, musst du den Moment wagen, in dem du durch die Flammen brichst."
    ],
    test: {
      attribute: "virtus",          // Mut
      label: "Der Schritt ins Feuer",
      description: "Willst du dich mitten durch die Flammen wagen, um schneller zu den Fliehenden zu gelangen?",
      modifier: -3,                 // schwierige Probe
      pietasRerollCost: 1,          // optionaler Pietas-Einsatz

      // Konsequenzen bei Erfolg / Misserfolg
      successHpDelta: -2,           // leichter Schaden durch Funken & Hitze
      successPietasDelta: 1,        // die Götter sehen deinen Mut
      successXpDelta: 2,
      successTarget: 4,             // weiter zur Flucht aufs Meer

      failureHpDelta: -8,           // starkes Verbrennen / Erschöpfung
      failurePietasDelta: 0,
      failureXpDelta: 1,
      failureTarget: 4              // du schaffst es trotzdem, aber stärker verletzt
    }
    // Hinweis: Choices in Test-Knoten werden in der aktuellen engine.js NICHT verwendet
  },

  // Übergang zu Buch 3 – Meer-Theme
  {
    id: 4,
    book: 3,
    chapter: 1,
    // theme: "mare" – wird automatisch aus Buch 3 abgeleitet
    title: "Auf der Flucht übers Meer",
    label: "Die trojanische Flotte",
    paragraphs: [
      "Du hast es aus den brennenden Straßen <em>Troiae</em> bis zu den Schiffen am Strand geschafft. Hinter dir lodert der Himmel, als die Mauern der Stadt nach und nach im Feuer versinken.",
      "Mit den übrigen Überlebenden stichst du in See. Die Ruder schlagen den Rhythmus der Flucht, die Wellen glänzen schwarz im Licht des Feuers, das noch immer am Horizont flackert.",
      "Die Nacht wird kühler, doch deine Gedanken sind es nicht: Wo soll eine neue Heimat sein für das Volk, das du führst?"
    ],
    choices: [
      {
        text: "Du berätst dich mit deinen Gefährten über das Ziel eurer Fahrt.",
        target: 5,
        xpDelta: 2
      },
      {
        text: "Du trittst an den Bug und suchst in der Dunkelheit nach einem Zeichen der Götter.",
        target: 5,
        pietasDelta: 1
      }
    ]
  },

  // Buch 1 – Ankunft in Karthago
  {
    id: 5,
    book: 1,
    chapter: 1,
    // theme: "carthago" – wird automatisch aus Buch 1 abgeleitet
    title: "Küsten vor Karthago",
    label: "Eine fremde Stadt",
    paragraphs: [
      "Nach Tagen auf stürmischer See lichtet sich endlich der Nebel. Vor dir erhebt sich die Küste eines fremden Landes. Auf einer Anhöhe erkennst du Mauern, Türme und das Schimmern fremder Tempel – <em>Carthago</em>.",
      "Die Ruderer seufzen vor Erleichterung, als der Boden näher rückt. Doch in deinen Gedanken bleibt der Brand deiner Heimat und der Auftrag, den dir die Götter gaben: eine neue Stadt zu gründen, aus der einst ein Reich erwachsen soll.",
      "Vielleicht ist dies nur eine Station – oder der Beginn einer Versuchung, die dich von deinem Weg abbringt."
    ],
    choices: [
      {
        text: "Du beschließt, vorsichtig in die Stadt einzuziehen und die Stimmung der Bewohner zu prüfen.",
        target: 1,            // zur Demo: Schleife zurück nach Troja (später anpassen)
        xpDelta: 2
      },
      {
        text: "Du bleibst zunächst im Verborgenen und beobachtest Carthago vom Schatten eines Haines aus.",
        target: 1,            // ebenfalls zurück – später durch echte Fortsetzung ersetzen
        pietasDelta: 1
      }
    ]
  },

  // --- DEMO-PROBE AUF VIRTUS MIT EIGENEN FOLGEKNOTEN ------------------------

  {
    id: 6,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Im Rauch der brennenden Gasse",
    label: "Probe auf Virtus (Mut)",
    type: "test",
    paragraphs: [
      "Zwischen den Häusern Trojas wogt der Rauch. Über dir krachen Balken zu Boden, Funken stieben, und aus der Ferne hörst du das Krachen einstürzender Mauern. Du stützt <strong>Anchises</strong>, der schwer auf deine Schulter lastet, während <strong>Ascanius</strong> sich an deinem Gewand festklammert.",
      "Vor dir versperrt ein halb eingestürzter Dachbalken den Weg. Die Flammen schlagen näher, die Hitze brennt in der Brust. Wenn du jetzt nicht handelst, wird der Rückweg abgeschnitten."
    ],
    test: {
      attribute: "virtus",          // Mut
      modifier: -3,                 // schwierige Probe (um 3 erschwert)
      label: "Dem Feuer standhalten",
      description:
        "Du musst deine <strong>Virtus</strong> beweisen: Hältst du der Hitze stand und führst deine Familie durch die Flammen, ohne den Halt zu verlieren?",
      pietasRerollCost: 1,          // 1 Punkt Pietas für einen Neuwurf möglich

      // Konsequenzen bei Erfolg:
      successTarget: 7,
      successHpDelta: -2,           // du nimmst etwas Schaden
      successPietasDelta: 1,        // pflichtbewusst gehandelt
      successXpDelta: 2,

      // Konsequenzen bei Misserfolg:
      failureTarget: 8,
      failureHpDelta: -8,           // kräftiger Treffer / Rauchschaden
      failurePietasDelta: 0,
      failureXpDelta: 1
    }
  },

  {
    id: 7,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Durch das Feuer getragen",
    label: "Erfolg",
    paragraphs: [
      "Mit zusammengebissenen Zähnen drückst du dich an dem glühenden Balken vorbei. Die Hitze raubt dir den Atem, doch du lässt <strong>Anchises</strong> nicht los. <strong>Ascanius</strong> hustet, doch ihr erreicht eine schmalere Seitenstraße, in der der Rauch sich etwas lichtet.",
      "In deinem Inneren spürst du, dass die Götter deine <span class=\"key\">pietas</span> wahrgenommen haben. Trotz des Schmerzes bleibt dein Schritt fest."
    ],
    choices: [
      {
        text: "Weiter zur Küste – mit verbrannter Haut, aber erhobenem Haupt",
        target: 4
      }
    ]
  },

  {
    id: 8,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Unter dem herabstürzenden Dach",
    label: "Misserfolg",
    paragraphs: [
      "Du stolperst, als der Dachbalken vor dir mit einem Krachen herabstürzt. Ein Funkenregen geht auf euch nieder, Holz splittert, und du reißt <strong>Anchises</strong> im allerletzten Moment zur Seite.",
      "Schmerz schießt durch deine Schulter – ein brennendes Stück Holz hat dich getroffen. Du atmest schwer, deine Vigor ist erschöpft. Doch schließlich findest du einen Umweg durch eine Seitengasse. Der Weg hinaus aus der Stadt ist nun noch gefährlicher geworden."
    ],
    choices: [
      {
        text: "Trotz der Schmerzen weitergehen – die Schiffe müssen erreicht werden",
        target: 4
      }
    ]
  },

  // --- TEST-KNOTEN FÜR LEVELAUFSTIEG (10 XP) -------------------------------

  {
    id: 9,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Ein Moment der Erkenntnis",
    label: "Testknoten: Experientia +10",
    paragraphs: [
      "Mitten im Chaos der brennenden Stadt hältst du für einen Augenblick inne. Die Bilder der letzten Stunden ziehen an dir vorbei: Entscheidungen, Zweifel, Mut und Furcht.",
      "Du spürst, wie sich all diese Erlebnisse in dir sammeln – wie eine leise Stimme, die dich lehrt, künftig klarer zu sehen und sicherer zu handeln."
    ],
    choices: [
      {
        text: "Du reißt dich zusammen und kehrst in die Handlung zurück.",
        target: 1
      }
    ]
  },

  // --- TESTKNOTEN FÜR DEN VIGOR-GLOW ---------------------------------------

  {
    id: 10,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Leichte Verletzungen",
    label: "Glut auf der Haut",
    paragraphs: [
      "Du stolperst über herabgestürzte Ziegel und ein Funkenregen geht auf dich nieder. Die Hitze brennt an Armen und Gesicht, doch du fängst dich rechtzeitig, bevor du zu Boden stürzt.",
      "Es sind nur <em>leichte</em> Verletzungen – aber dein Atem geht schneller, und du spürst, wie deine <strong>Vigor</strong> nachlässt. In deinem Gesicht spiegelt sich die Erschöpfung."
    ],
    choices: [
      {
        text: "Zurück zu deinem Ausgangspunkt und weiter entscheiden …",
        target: 1
      }
    ]
  },

  {
    id: 11,
    book: 2,
    chapter: 1,
    theme: "troja",
    title: "Schwere Verletzungen",
    label: "Am Rand der Kräfte",
    paragraphs: [
      "Ein herabstürzender Balken schlägt nur knapp neben dir auf und schleudert dich gegen die Mauer. Ein betäubender Schmerz fährt durch deinen Körper, während Asche und Rauch dir den Atem rauben.",
      "Du brauchst einen Moment, um dich wieder aufzurichten. Jeder Herzschlag ist schwer, deine Beine fühlen sich an wie Blei, und deine <strong>Vigor</strong> ist bedrohlich gesunken – du weißt, dass du nicht mehr viele solcher Schläge überstehen wirst."
    ],
    choices: [
      {
        text: "Du rappelt dich auf und gehst zurück, um andere Entscheidungen zu treffen …",
        target: 1
      }
    ]
  }
];

