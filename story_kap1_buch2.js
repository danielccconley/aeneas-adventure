// story_kap1_buch2.js
// Kapitel 1 (didaktisch) – Buch 2 der Aeneis, Version mit 4 Einstiegsknoten

window.storyNodes_kap1_buch2 = [

  /* -----------------------------------------
     NODE 1 – Aeneas erwacht
  ------------------------------------------ */
  {
    id: 1,
    book: 2,
    chapter: 1,
    isStart: true,
    title: "Erwachen in Troja",
    image: "images/kap1_buch2_node01_3to2.jpg",
    paragraphs: [
      "Du fährst aus unruhigen Träumen auf, dein Herz hämmert noch vom letzten Bild, das dir im Schlaf erschienen war: brennende Mauern, fallende Helme, das Krachen von Speeren – und dahinter die Schreie sterbender Gefährten, das Zersplittern trojanischer Schilde und der brennende Geschmack von Rauch, Blut und Angst, der sich tief in deine Erinnerung eingebrannt hat. Doch nun herrscht eine unnatürliche Stille in deinem Gemach – eine Stille, die nur von fernem Jubel durchbrochen wird. Für einen Moment weißt du nicht, ob du noch träumst. Doch dann dringen Schritte, Rufe und hastiges Stimmengewirr durch die Straßen Trojas zu dir. Ein ungläubiges Raunen geht durch die Stadt, als hätte sich ein gewaltiger Schleier gehoben.",
      "Überall rufen die Menschen, die Griechen seien abgezogen – nach all den Jahren voller Belagerungen, Hunger, Täuschungen und immer neuer Angriffe. Der Krieg sei vorüber, behaupten sie. Manche lachen schon, andere weinen vor Erleichterung. Am Strand, so erzählen einige, habe man ein riesiges hölzernes Pferd gefunden, größer als jedes bekannte Kriegsgerät, kunstvoll zusammengefügt, ein Werk, das für sich allein Bewunderung gebiete. Ein Geschenk, sagen die Leute, ein Opfer an die Götter – oder an Troja selbst.",
"Doch in dir regt sich ein tiefes, ungutes Gefühl. Etwas stimmt nicht. Zu plötzlich, zu vollkommen wirkt diese Wendung. Kann ein zehnjähriger Krieg – ein Krieg, der Helden, Städte und ganze Geschlechter verschlungen hat – wirklich so abrupt enden? Während du dich erhebst, spürst du die Schwere der Jahre in deinen Gliedern, und deine Gedanken wandern zu jenen, die dir Halt geben: zu deinem greisen Vater Anchises, dessen Blick oft tiefer reicht als der der Sterblichen; zu deiner Frau Kreusa, die selbst in den dunkelsten Nächten Ruhe ausstrahlt; und zu deinem Sohn Ascanius, der inmitten der Trümmer des Krieges aufgewachsen ist.",
      "Trotz des Jubels draußen spürst du es klar: Die Götter haben noch nicht ihr letztes Wort gesprochen. Willst du selbst nachsehen, was es mit dem hölzernen Pferd auf sich hat – oder zuvor einen deiner Angehörigen aufsuchen, um ihren Rat einzuholen?"
    ],
    choices: [
      { text: "mit Anchises sprechen", target: 2 },
      { text: "mit Kreusa sprechen", target: 3 },
      { text: "nach Ascanius sehen", target: 4 },
      { text: "direkt zum Pferd am Strand gehen", target: 5 }
    ]
  },

  /* -----------------------------------------
     NODE 2 – Gespräch mit Anchises
  ------------------------------------------ */
  {
    id: 2,
    book: 2,
    chapter: 1,
    title: "Anchises’ Warnung",
    image: "images/kap1_buch2_node02_3to2.jpg",
    paragraphs: [
      "Dein Vater Anchises sitzt erschöpft, aber wachsam vor dir. Du siehst die Spuren unzähliger Nächte in seinen Augen – Nächte, in denen der Krieg und all seine Schrecken ihn um den Schlaf gebracht haben. Er hat vieles gesehen, mehr als ein Sterblicher ertragen sollte, du bemerkst, wie sich seine Stirn in Falten legt. Er glaubt den Gerüchten vom plötzlichen Frieden nicht. Zu oft haben die Griechen – allen voran Odysseus, Meister der Täuschungen – Troja an der Nase herumgeführt. Zu oft schien ein Ausweg greifbar, nur um sich als Falle zu entpuppen.",
      "Unter Anstrengung erhebt Anchises den Kopf und richtet seinen ernsten, klaren Blick auf dich. Seine Stimme ist ruhig, doch fest, als er dich warnt: Du solltest vorsichtig sein, nichts überstürzen und nicht leichtgläubig an ein unerwartetes Wunder glauben. Denn Wunder, so sagt er mit leisem Nachdruck, seien selten – und in Zeiten wie diesen fast immer trügerisch.",
    ],
    choices: [
      { text: "Du brichst nun zum Strand auf, um das Pferd mit eigenen Augen zu betrachten", target: 5 }
    ]
  },

  /* -----------------------------------------
     NODE 3 – Gespräch mit Kreusa
  ------------------------------------------ */
  {
    id: 3,
    book: 2,
    chapter: 1,
    title: "Kreusas Hoffnung",
    image: "images/kap1_buch2_node03_3to2.jpg",
    paragraphs: [
      "Kreusa stürzt auf dich zu und fällt dir mit einer solchen Wucht in die Arme, als wolle sie dich nie wieder loslassen. Du spürst, wie ihr ganzer Körper vor aufgestauter Anspannung zittert. Tränen der Erleichterung stehen in ihren Augen, während sie dein Gesicht mit den Händen umfasst.",
      "Hastig, fast atemlos, beginnt sie von einer Zukunft zu sprechen, die sich plötzlich wieder möglich anfühlt: ein Leben ohne Waffen in den Straßen, ohne Schiffe der Griechen am Horizont, ohne Schreie der Verwundeten, die sich nachts wie Geister durch die Gassen schleichen. Sie malt Bilder von ruhigen Tagen, an denen Ascanius mit anderen Kindern spielt, von Festen, bei denen Musik und Lachen den Platz des Waffenlärms einnehmen. Vielleicht, so hofft sie, können die Narben der letzten Jahre eines Tages verblassen.",
      "Du lächelst, als du ihr zuhörst, und für einen kurzen Moment spürst du die Wärme dieser Hoffnung auch in dir. Doch tief in deinem Inneren bleibt ein Schatten der Unruhe. Etwas an der plötzlichen Wendung, am hölzernen Pferd, an der überstürzten Freude der Menschen lässt dich nicht los. Während du Kreusa im Arm hältst, weißt du, dass du ihren Traum von Frieden um jeden Preis schützen willst – aber du kannst das dumpfe Gefühl nicht zum Schweigen bringen, dass die Gefahr noch nicht vorüber ist."
    ],
    choices: [
      { text: "Du brichst nun zum Strand auf, um das Pferd mit eigenen Augen zu betrachten", target: 5 }
    ]
  },

  /* -----------------------------------------
     NODE 4 – Ascanius schläft
  ------------------------------------------ */
  {
    id: 4,
    book: 2,
    chapter: 1,
    title: "Ascanius schläft",
    image: "images/kap1_buch2_node04_3to2.jpg",
    paragraphs: [
      "Ascanius schläft ruhig, in eine weiche Decken gewickelt, sein kleiner Körper warm und entspannt, als könne selbst der Lärm der aufgewühlten Stadt ihn nicht erreichen.",
      "Lange stehst du an seinem Lager und betrachtest deinen Sohn. Der gleichmäßige Rhythmus seines Atems, das leichte Heben und Senken seiner Brust, der friedliche Ausdruck auf seinem Gesicht – all das lässt den vergangenen Krieg für einen flüchtigen Augenblick wie etwas Irreales erscheinen, wie einen bösen Traum, der irgendwo weit hinter diesen vier Wänden gefangen bleibt.",
      "Du streckst die Hand aus, berührst sanft eine Haarsträhne, die sich über seine Stirn gelegt hat. Du bringst es nicht übers Herz, ihn zu wecken, nicht jetzt, nicht in diesem Moment des Friedens. Und so löst du dich schließlich von seinem Bett und wendest dich dem zunehmenden Lärm vom Strand zu, der ruft wie ein bevorstehendes Schicksal."
    ],
    choices: [
      { text: "Du brichst nun zum Strand auf, um das Pferd mit eigenen Augen zu betrachten", target: 5 }
    ]
  },

  /* -----------------------------------------
     NODE 5 – Laokoon warnt
  ------------------------------------------ */
  {
    id: 5,
    book: 2,
    chapter: 1,
    title: "Laokoon erhebt seine Stimme",
    image: "images/kap1_buch2_node05_3to2.jpg",
    paragraphs: [
      "Du begibst dich mit deinen Landsleuten zum Strand, getrieben von einer Mischung aus Unglaube, Hoffnung und berauschender Erleichterung. Dort erhebt sich das gewaltige Holzpferd – ein Gebilde von solcher Größe und fremder Macht, dass es wie ein stummer, drohender Riese über den Köpfen der Menge thront.",
      "Viele sehen darin ein göttliches Zeichen, ein erhabenes Opfer, das Minerva zugedacht sei. Sie fallen vor dem Pferd auf die Knie, küssen den Boden, rufen den Frieden aus und danken den Göttern, dass die Griechen endlich verschwunden seien. Andere tanzen, lachen, weinen – erschöpft von einem Krieg, der ihr Leben fast über ein Jahrzehnt lang geprägt hat, und berauscht von der Aussicht, dass all dies nun ein Ende finden könnte.",
      "Doch dann drängt sich Laokoon, der trojanische Priester des Apollon und ein erfahrener Mahner vor griechischer List, durch die Menge, seine Schritte fest, seine Miene finster. Mit donnernder Stimme erhebt er sich über den Lärm der jubelnden Menschen und ruft eine Warnung aus: Sie sollen dem Geschenk der Griechen nicht trauen. Zu viel List, zu viel Verrat habe dieses Volk bereits über Troja gebracht.Um seine Worte zu bekräftigen, ergreift er eine schwere Lanze, holt weit aus und schleudert sie kraftvoll gegen das Holzpferd. Das metallische Krachen des Aufpralls hallt über den Strand hinweg. Dann folgt ein tiefes, dumpfes Dröhnen – ein Klang, der aus dem Innern des Pferdes zu kommen scheint und der mit unheimlicher Deutlichkeit verrät, dass das Gebilde hohl ist. Ein Raunen geht durch die Menge, und für einen Augenblick erstarrt ganz Troja in atemloser Spannung.",
      
    ],
    choices: [
      { text: "Du hörst Laokoon schweigend zu", target: 6 },
      { text: "Du entscheidest dich Laokoon zu widersprechen", target: 7 }
    ]
  },

  /* -----------------------------------------
     NODE 6 – Streit in der Menge
  ------------------------------------------ */
  {
    id: 6,
    book: 2,
    chapter: 1,
    title: "Streit in der Menge",
    image: "images/kap1_buch2_node06_3to2.jpg",
    paragraphs: [
      "Laokoon setzt seine Rede fort.  Die Griechen seien Meister der Täuschung, ruft er mit bebender Stimme; nichts, was sie zurückließen, könne man je als Geschenk betrachten. Was wie ein Opfer für die Götter wirke, könne in Wahrheit ein Werkzeug des Untergangs sein – eine Kriegswaffe, geschaffen, um Troja zu täuschen. Vielleicht, so ruft er eindringlich, seien im Bauch des Ungetüms bewaffnete Männer verborgen, bereit, im Schutz der Nacht aus dem Holz hervorzubrechen und die Stadt im Schlaf zu überrumpeln. Oder das Gebilde diene als Auge der Griechen, ein Ausguck, von dem aus sie Trojas Mauern und Straßen ausspionieren, während sie nur zum Schein davonsegelten.",
      "Einige Trojaner nicken ihm zu, überzeugt von seiner Logik, während andere ihm energisch widersprechen und ihn beschuldigen, die ersehnte Hoffnung zunichtezumachen. Noch während die Worte hin- und herprallen, entsteht am Rand der Menge Unruhe: Eine Gruppe Soldaten schleift jemanden zum Strand.",
      
    ],
    choices: [
      { text: "Du wendest dich der neuen Unruhe zu", target: 10 }
    ]
  },

  /* -----------------------------------------
     NODE 7 – Aeneas widerspricht (Auctoritas-Test)
  ------------------------------------------ */
  {
    id: 7,
    book: 2,
    chapter: 1,
    title: "Wort gegen Wort",
    image: "images/kap1_buch2_node07_3to2.jpg",
    paragraphs: [
      "Aeneas tritt hervor. Er kann nicht schweigen.",
      "Er erinnert daran, dass ein Krieg enden müsse, dass auch die Griechen irgendwann den Zorn der Götter fürchten müssten.",
      "Laokoon fährt ihn scharf an, wirft ihm Naivität vor. Die Menge beobachtet angespannt das Ringen der beiden Stimmen."
    ],
    type: "test",
    test: {
      attribute: "auctoritas",
      modifier: 0,
      pietasRerollCost: 1,
      description: "Kannst du die Menge von deiner Sicht überzeugen?",
      successTarget: 8,
      failureTarget: 9,
      successHpDelta: 0,
      successPietasDelta: 0,
      successXpDelta: 0,
      failureHpDelta: 0,
      failurePietasDelta: 0,
      failureXpDelta: 0
    }
  },

  /* -----------------------------------------
     NODE 8 – Auctoritas Erfolg
  ------------------------------------------ */
  {
    id: 8,
    book: 2,
    chapter: 1,
    title: "Ein gewonnener Moment",
    image: "images/kap1_buch2_node07_3to2.jpg",
    paragraphs: [
      "Aeneas’ Worte finden Gehör. Einige beginnen nachdenklich zu nicken, die Rufe werden leiser.",
      "Laokoon wirkt für einen Moment gebremst, der Streit verliert an Schärfe.",
      "Doch bevor die Diskussion weiter eskalieren kann, bricht am Rand des Strandes neue Unruhe aus: Eine Gruppe schleift einen gefesselten Griechen heran."
    ],
    choices: [
      { text: "Den Blick auf den Gefangenen richten", target: 10, xpDelta: 1 }
    ]
  },

  /* -----------------------------------------
     NODE 9 – Auctoritas Misserfolg
  ------------------------------------------ */
  {
    id: 9,
    book: 2,
    chapter: 1,
    title: "Getadelter Widerspruch",
    image: "images/kap1_buch2_node07_3to2.jpg",
    paragraphs: [
      "Laokoon weist Aeneas scharf zurecht. Einige in der Menge lachen, andere wenden sich ab.",
      "Aeneas spürt den Stich der Demütigung, doch bevor er antworten kann, übertönen neue Rufe die Szene.",
      "Soldaten drängen heran – sie haben einen Griechen gefunden, der sich versteckt hielt."
    ],
    choices: [
      { text: "Den gefangenen Griechen ansehen", target: 10 }
    ]
  },

  /* -----------------------------------------
     NODE 10 – Sinon erscheint (Intuitio-Test)
  ------------------------------------------ */
  {
    id: 10,
    book: 2,
    chapter: 1,
    title: "Der gefesselte Sinon",
    image: "images/kap1_buch2_node10_3to2.jpg",
    paragraphs: [
      "Eine Gruppe junger Trojaner zerrt einen gefesselten Griechen heran. Er stürzt zu Boden, ringt nach Luft.",
      "Unter Schluchzen gibt er an, Sinon zu heißen. Er erzählt, er sei von seinen Gefährten zum Opfer bestimmt worden und nur knapp entkommen.",
      "Seine Worte sind voller Leid, doch seine Augen wirken zuweilen zu klar."
    ],
    type: "test",
    test: {
      attribute: "intuitio",
      modifier: 0,
      pietasRerollCost: 1,
      description: "Spürst du, ob Sinons Geschichte nicht stimmt?",
      successTarget: 11,
      failureTarget: 12,
      successHpDelta: 0,
      successPietasDelta: 0,
      successXpDelta: 0,
      failureHpDelta: 0,
      failurePietasDelta: 0,
      failureXpDelta: 0
    }
  },

  /* -----------------------------------------
     NODE 11 – Intuitio Erfolg
  ------------------------------------------ */
  {
    id: 11,
    book: 2,
    chapter: 1,
    title: "Ein ungutes Gefühl",
    image: "images/kap1_buch2_node11_3to2.jpg",
    paragraphs: [
      "Je länger Aeneas Sinons Erzählung lauscht, desto schwerer legt sich ein Schatten auf sein Herz.",
      "Die Gesten sind zu passend, die Tränen zu recht gesetzt. Die Geschichte wirkt einstudiert.",
      "Ein leises, aber eindringliches Flüstern der Götter scheint ihn zu warnen: Hier ist mehr als bloßes Leid."
    ],
    choices: [
      { text: "Trotz Zweifel den weiteren Ereignissen folgen", target: 13, xpDelta: 1 }
    ]
  },

  /* -----------------------------------------
     NODE 12 – Intuitio Misserfolg
  ------------------------------------------ */
  {
    id: 12,
    book: 2,
    chapter: 1,
    title: "Das Herz erweicht",
    image: "images/kap1_buch2_node11_3to2.jpg",
    paragraphs: [
      "Als Sinon schildert, wie er beinahe geopfert worden wäre, fühlt Aeneas tiefes Mitleid.",
      "Das Leid in seinen Worten klingt echt, die Wunden scheinen frisch.",
      "Seine Zweifel verstummen, während die Menge immer empfänglicher für Sinons Geschichte wird."
    ],
    choices: [
      { text: "Dem weiteren Geschehen folgen", target: 13 }
    ]
  },

  /* -----------------------------------------
     NODE 13 – Priamos zeigt Gnade
  ------------------------------------------ */
  {
    id: 13,
    book: 2,
    chapter: 1,
    title: "Gnade Trojas",
    image: "images/kap1_buch2_node13_3to2.jpg",
    paragraphs: [
      "Die Trojaner lösen Sinons Fesseln, reichen ihm Wasser und verbinden seine Wunden.",
      "Vor König Priamos bedankt sich Sinon mit gesenktem Haupt und nennt das Pferd ein heiliges Zeichen der Minerva.",
      "Priamos spricht von Gnade, von göttlicher Führung und vom Ende des Krieges. Die Menge jubelt."
    ],
    choices: [
      { text: "Weiter", target: 14 }
    ]
  },

  /* -----------------------------------------
     NODE 14 – Tod Laokoons
  ------------------------------------------ */
  {
    id: 14,
    book: 2,
    chapter: 1,
    title: "Zeichen des Zorns",
    image: "images/kap1_buch2_node14_3to2.jpg",
    paragraphs: [
      "Laokoon bringt am Meeresufer ein Opfer dar, um die Götter erneut um Führung zu bitten.",
      "Doch plötzlich brechen zwei gewaltige Schlangen aus den Wellen hervor und stürzen sich auf ihn und seine Söhne.",
      "Ihre Schreie zerreißen die Luft, während die Schlangen sie erbarmungslos erwürgen. Die Menge erstarrt – erst in Entsetzen, dann in ehrfürchtigem Schauder.",
      "„Die Götter strafen den, der zweifelt!“, ruft jemand. Mehr und mehr sind überzeugt: Das Pferd muss in die Stadt."
    ],
    choices: [
      { text: "Bei Minerva um Verzeihung bitten", target: 15 },
      { text: "Den Göttern für den vermeintlichen Frieden danken", target: 16 },
      { text: "Dich unter die Feiernden mischen", target: 17 }
    ]
  },

  /* -----------------------------------------
     NODE 15 – Demut vor Minerva
  ------------------------------------------ */
  {
    id: 15,
    book: 2,
    chapter: 1,
    title: "Demut vor Minerva",
    image: "images/kap1_buch2_node15_3to2.jpg",
    paragraphs: [
      "Aeneas tritt vor den Schrein der Minerva. Das Bildnis der Göttin leuchtet im goldenen Licht des späten Tages.",
      "Er senkt den Blick, bekennt seine Zweifel und bittet um Vergebung.",
      "Ob die Göttin ihn erhört, bleibt im Schweigen des Tempels verborgen."
    ],
    choices: []
  },

  /* -----------------------------------------
     NODE 16 – Dank für den Frieden
  ------------------------------------------ */
  {
    id: 16,
    book: 2,
    chapter: 1,
    title: "Dank für den Frieden",
    image: "images/kap1_buch2_node16_3to2.jpg",
    paragraphs: [
      "Aeneas dankt den Göttern für das vermeintliche Ende des Krieges.",
      "Die Flammen der Altarlampen werfen warmes Licht auf die Mauern der Stadt.",
      "Für einen Moment scheint der Frieden greifbar – doch tief in ihm bleibt ein Rest von Unruhe."
    ],
    choices: []
  },

  /* -----------------------------------------
     NODE 17 – Im Jubel Trojas
  ------------------------------------------ */
  {
    id: 17,
    book: 2,
    chapter: 1,
    title: "Im Jubel Trojas",
    image: "images/kap1_buch2_node17_3to2.jpg",
    paragraphs: [
      "Aeneas mischt sich unter die Feiernden. Wein fließt in Strömen, Gesänge erfüllen die Straßen.",
      "Kinder tanzen um das Pferd, Männer erzählen lauthals von einem neuen Zeitalter des Friedens.",
      "Ein trügerischer Frieden legt sich über Troja – wie der tiefe Atemzug vor einem Sturm."
    ],
    choices: []
  }

];

