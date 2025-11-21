
// engine.js – Aeneis-Adventure mit
// - Einleitung
// - Charaktererschaffung mit 1W6+7, 2 Bonuspunkten, optionalem Tausch
// - Statusanzeige (Auctoritas, Virtus, Fortitudo, Prudentia, Dexteritas, Intuitio, Vigor, Pietas, Experientia)
// - Story-Knoten aus story.js
// - DSA-artigen Proben mit römischer Würfelanimation
// - In der Generierung: römische Würfelanzeige "XII (12)"
// - In der Story: Probenergebnisse in arabischen Zahlen
// - Nach Effekten (Vigor/Pietas/XP): goldene Hinweiszeile im nächsten Knoten
// - Nichtlineares Stufensystem: Level-Schwellen 0, 10, 30, 60, 100, 150, 210, ...
//   (Schwellwert(L) = 5 * L * (L - 1))
// - Experientia-Anzeige: aktuelle XP / XP bis zur nächsten Stufe (z.B. 83 / 100)
// - Stufenanzeige: "Stufe: X" im Statuskasten
// - Bei jedem Stufenaufstieg: +1 auf ein Basisattribut (Wahl) + 1W6 Vigor (max & aktuell) mit Würfelanimation
// - Tod/Kampfunfähigkeit bei Vigor <= 0 mit Kapitel-Neustart

(function () {
  "use strict";

  // --- KONFIG ---------------------------------------------------------

  const ATTRIBUTE_KEYS = [
    "auctoritas",
    "virtus",
    "fortitudo",
    "prudentia",
    "dexteritas",
    "intuitio"
  ];

  const START_VIGOR = 30;

  // --- STATE ----------------------------------------------------------

  const state = {
    attributes: {},
    vigor: START_VIGOR,
    maxVigor: START_VIGOR,
    pietas: 0,
    xp: 0,
    level: 1,
    pendingLevelUps: 0,
    postLevelTarget: null,
    inventory: [],
    flags: {},
    currentNodeId: null,
    nodeGainOnce: {},      // nodeId -> true, wenn positive Gains schon vergeben wurden
    lastGainMessage: null, // Text wie "[Du verlierst 4 Punkte Vigor. Du erhältst 1 Punkt Pietas.]"

    // Kapitel-Tracking für Neustart nach Tod
    chapterState: {
      book: null,
      chapter: null,
      startNodeId: null,
      snapshot: null
    }
  };

  // --- LEVEL-SYSTEM ---------------------------------------------------
  // Schwellenwerte: 0, 10, 30, 60, 100, 150, 210, ...
  // Formel: threshold(L) = 5 * L * (L - 1)

  function levelThreshold(level) {
    if (level <= 1) return 0;
    return 5 * level * (level - 1);
  }

  function getLevelInfo(totalXp) {
    let level = 1;
    let currentThreshold = levelThreshold(1); // 0
    let nextLevel = 2;
    let nextThreshold = levelThreshold(nextLevel); // 10

    while (totalXp >= nextThreshold) {
      level = nextLevel;
      currentThreshold = nextThreshold;
      nextLevel++;
      nextThreshold = levelThreshold(nextLevel);
      if (nextLevel > 1000) break; // Sicherheitsbremse
    }

    return {
      level,
      currentThreshold,
      nextThreshold
    };
  }

  // --- DOM-CACHE ------------------------------------------------------

  const dom = {};

  function initDom() {
    dom.nodeImage = document.getElementById("node-image");
    dom.nodeText = document.getElementById("node-text");
    dom.choices = document.getElementById("choices");

    dom.statAuctoritas = document.getElementById("stat-auctoritas");
    dom.statVirtus = document.getElementById("stat-virtus");
    dom.statFortitudo = document.getElementById("stat-fortitudo");
    dom.statPrudentia = document.getElementById("stat-prudentia");
    dom.statDexteritas = document.getElementById("stat-dexteritas");
    dom.statIntuitio = document.getElementById("stat-intuitio");

    dom.statVigor = document.getElementById("stat-vigor");
    dom.statPietas = document.getElementById("stat-pietas");
    dom.statXp = document.getElementById("stat-xp");

    dom.vigorBarFill = document.getElementById("vigor-bar-fill");
    dom.xpBarFill = document.getElementById("xp-bar-fill");

    dom.inventoryList = document.getElementById("inventory-list");

    dom.levelDisplay = document.getElementById("level-display");
    dom.portrait = document.getElementById("portrait");

    // NEU: Liste für Zustände (States)
    dom.stateList = document.getElementById("state-list");
  }

  // --- HILFSFUNKTIONEN ------------------------------------------------

  function setImage(srcOrNull) {
    if (!dom.nodeImage) return;
    if (srcOrNull) {
      dom.nodeImage.style.display = "block";
      dom.nodeImage.src = srcOrNull;
    } else {
      dom.nodeImage.style.display = "none";
      dom.nodeImage.src = "";
    }
  }

  function clearChoices() {
    if (!dom.choices) return;
    dom.choices.innerHTML = "";
  }

  function addChoiceButton(text, onClick) {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    dom.choices.appendChild(btn);
    return btn;
  }

  function valueOrDash(v) {
    return typeof v === "number" ? String(v) : "–";
  }

  function renderStats() {
    // Attribute
    if (dom.statAuctoritas) dom.statAuctoritas.textContent = valueOrDash(state.attributes.auctoritas);
    if (dom.statVirtus) dom.statVirtus.textContent = valueOrDash(state.attributes.virtus);
    if (dom.statFortitudo) dom.statFortitudo.textContent = valueOrDash(state.attributes.fortitudo);
    if (dom.statPrudentia) dom.statPrudentia.textContent = valueOrDash(state.attributes.prudentia);
    if (dom.statDexteritas) dom.statDexteritas.textContent = valueOrDash(state.attributes.dexteritas);
    if (dom.statIntuitio) dom.statIntuitio.textContent = valueOrDash(state.attributes.intuitio);

    // Level-Infos aus aktueller XP berechnen
    const { level, currentThreshold, nextThreshold } = getLevelInfo(state.xp);
    state.level = level;

    // Vigor: aktuell / max + Balken
    if (dom.statVigor) {
      dom.statVigor.textContent = state.vigor + " / " + state.maxVigor;
    }
    if (dom.vigorBarFill) {
      const ratioRaw = state.maxVigor > 0 ? state.vigor / state.maxVigor : 0;
      const ratio = Math.max(0, Math.min(1, ratioRaw));
      dom.vigorBarFill.style.width = (ratio * 100) + "%";
    }

    // Pietas: einfacher Wert
    if (dom.statPietas) dom.statPietas.textContent = state.pietas;

    // Experientia: aktuelle Gesamt-XP / Schwelle zur nächsten Stufe
    let xpDisplay = "";
    let xpRatio = 0;

    if (Number.isFinite(nextThreshold) && nextThreshold > currentThreshold) {
      xpDisplay = state.xp + " / " + nextThreshold;

      const segmentSpan = nextThreshold - currentThreshold;
      const xpInSegment = Math.max(0, Math.min(segmentSpan, state.xp - currentThreshold));
      xpRatio = segmentSpan > 0 ? xpInSegment / segmentSpan : 0;
    } else {
      // Falls irgendwann kein nächster Level mehr existieren sollte
      xpDisplay = String(state.xp);
      xpRatio = 1;
    }

    if (dom.statXp) {
      dom.statXp.textContent = xpDisplay;
    }
    if (dom.xpBarFill) {
      dom.xpBarFill.style.width = (Math.max(0, Math.min(1, xpRatio)) * 100) + "%";
    }

    // Stufenanzeige
    if (dom.levelDisplay) {
      dom.levelDisplay.textContent = "Stufe: " + level;
    }

    // Dynamischer Glow & Puls auf dem Porträt
    updatePortraitGlow();
  }

  function renderInventory() {
    if (!dom.inventoryList) return;
    dom.inventoryList.innerHTML = "";
    if (!state.inventory.length) {
      const li = document.createElement("li");
      li.textContent = "Keine besonderen Gegenstände.";
      dom.inventoryList.appendChild(li);
      return;
    }
    state.inventory.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      dom.inventoryList.appendChild(li);
    });
  }

  // NEU: Zustände rendern (Flags)
  function renderStates() {
    if (!dom.stateList) return;

    dom.stateList.innerHTML = "";

    const activeStates = Object.keys(state.flags).filter(k => state.flags[k]);

    if (!activeStates.length) {
      const li = document.createElement("li");
      li.textContent = "Keine besonderen Zustände.";
      // Kein Aufzählungszeichen + linksbündig
      li.style.listStyleType = "none";
      li.style.marginLeft = "0";
      li.style.paddingLeft = "0";
      // gleiche Schriftgröße wie "Keine besonderen Gegenstände."
      li.style.fontSize = "1.05rem";
      dom.stateList.appendChild(li);
      return;
    }

    activeStates.forEach(key => {
      const li = document.createElement("li");
      li.textContent = key; // ggf. später hübschere Labels
      dom.stateList.appendChild(li);
    });
  }

  function changeVigor(delta) {
    const next = state.vigor + delta;
    const clamped = Math.max(0, Math.min(state.maxVigor, next));
    state.vigor = clamped;
  }

  function changePietas(delta) {
    state.pietas = Math.max(0, state.pietas + delta);
  }

  function changeXp(delta) {
    // Level vor der Änderung merken
    const before = getLevelInfo(state.xp);
    state.xp = Math.max(0, state.xp + delta);
    const after = getLevelInfo(state.xp);

    const gained = after.level - before.level;
    if (gained > 0) {
      state.pendingLevelUps += gained;
      state.level = after.level;
    }
  }

  // --- PORTRAIT-GLOW LOGIK -------------------------------------------

  function updatePortraitGlow() {
    if (!dom.portrait) return;

    // Alle Glow-/Puls-Klassen entfernen
    dom.portrait.classList.remove("glow-low", "glow-medium", "glow-high", "portrait-pulse");

    if (state.maxVigor <= 0) {
      return;
    }

    const ratio = state.vigor / state.maxVigor;

    // Je nach Verhältnis Vigor / MaxVigor Glow-Stufe
    if (ratio < 0.25) {
      dom.portrait.classList.add("glow-high");
    } else if (ratio < 0.5) {
      dom.portrait.classList.add("glow-medium");
    } else if (ratio < 0.75) {
      dom.portrait.classList.add("glow-low");
    }

    // Zusätzlich: bei sehr niedrigem absoluten Vigor (< 10) pulsieren
    if (state.vigor < 10) {
      dom.portrait.classList.add("portrait-pulse");
    }
  }

  // --- KAPITEL-SNAPSHOT (für Neustart nach Tod) -----------------------

  function makeChapterSnapshot() {
    return {
      attributes: { ...state.attributes },
      vigor: state.vigor,
      maxVigor: state.maxVigor,
      pietas: state.pietas,
      xp: state.xp,
      level: state.level,
      pendingLevelUps: state.pendingLevelUps,
      postLevelTarget: state.postLevelTarget,
      inventory: [...state.inventory],
      flags: { ...state.flags },
      nodeGainOnce: { ...state.nodeGainOnce }
    };
  }

  function restoreChapterSnapshot(snapshot) {
    if (!snapshot) return;

    state.attributes = { ...snapshot.attributes };
    state.vigor = snapshot.vigor;
    state.maxVigor = snapshot.maxVigor;
    state.pietas = snapshot.pietas;
    state.xp = snapshot.xp;
    state.level = snapshot.level;
    state.pendingLevelUps = snapshot.pendingLevelUps;
    state.postLevelTarget = snapshot.postLevelTarget;
    state.inventory = [...snapshot.inventory];
    state.flags = { ...snapshot.flags };
    state.nodeGainOnce = { ...snapshot.nodeGainOnce };
    state.lastGainMessage = null;

    renderStats();
    renderInventory();
    renderStates();
  }

  function ensureChapterTracking(node) {
    if (!node) return;
    const book = node.book;
    const chapter = node.chapter;
    if (typeof book === "undefined" || typeof chapter === "undefined") return;

    const cs = state.chapterState;
    // Neues Kapitel betreten → Startknoten + Snapshot merken
    if (cs.book !== book || cs.chapter !== chapter || cs.startNodeId === null) {
      cs.book = book;
      cs.chapter = chapter;
      cs.startNodeId = node.id;
      cs.snapshot = makeChapterSnapshot();
    }
  }

  // --- TOD / KAMPFUNFÄHIGKEIT ----------------------------------------

  function showDefeatScreen() {
    // Bild oben – verwendet dein neues Bild
    setImage("images/death_aeneas.jpg");

    if (!dom.nodeText) return;

    dom.nodeText.innerHTML = "";

    const p1 = document.createElement("p");
    p1.innerHTML =
      "Der Lärm des Kampfes verblasst, das Dröhnen stürzt in eine ferne Stille. " +
      "Deine <span class=\"gold\">Vigor</span> ist erschöpft – Glieder und Geist verweigern den Dienst. " +
      "Für einen Augenblick siehst du nur noch Rauch, Funken und den Schimmer vergangener Hoffnungen.";
    dom.nodeText.appendChild(p1);

    const p2 = document.createElement("p");
    p2.innerHTML =
      "Ob dies der Tod des <span class=\"gold\">Aeneas</span> ist oder nur ein Sturz in die Bewusstlosigkeit, " +
      "wissen nur die Götter. Doch eines ist gewiss: Wenn du dein Volk retten willst, " +
      "musst du dieses Kapitel noch einmal von vorne durchleben.";
    dom.nodeText.appendChild(p2);

    const p3 = document.createElement("p");
    p3.innerHTML =
      "Die Bilder zerfließen – als würdest du die Zeit selbst zurückdrehen. " +
      "Bald stehst du wieder am Anfang der Prüfung, mit den Werten, die du damals besaßt.";
    dom.nodeText.appendChild(p3);

    clearChoices();

    addChoiceButton("Kapitel neu beginnen", () => {
      const cs = state.chapterState;
      if (cs && cs.snapshot && cs.startNodeId != null) {
        // Werte am Kapitelanfang wiederherstellen
        restoreChapterSnapshot(cs.snapshot);
        // Nach einem Tod Vigor wieder auf Maximalwert setzen
        state.vigor = state.maxVigor;
        // Zurück zum Startknoten des Kapitels
        goToNode(cs.startNodeId);
      } else {
        // Fallback: ganz von vorne
        showIntro();
      }
    });

    renderStats();
    renderInventory();
    renderStates();
  }

  // --- RÖMISCHE WÜRFELANIMATION --------------------------------------

  function toRoman(n) {
    const numerals = [
      [10, "X"],
      [9, "IX"],
      [8, "VIII"],
      [7, "VII"],
      [6, "VI"],
      [5, "V"],
      [4, "IV"],
      [3, "III"],
      [2, "II"],
      [1, "I"]
    ];
    if (n <= 0) return n.toString();
    let res = "";
    let remaining = n;
    while (remaining > 0) {
      for (let i = 0; i < numerals.length; i++) {
        const [val, sym] = numerals[i];
        if (remaining >= val) {
          res += sym;
          remaining -= val;
          break;
        }
      }
    }
    return res;
  }

  /**
   * Zeigt ein Overlay mit „rollender“ römischer Zahl an.
   * @param {number} sides – z.B. 20 oder 6
   * @param {function(number)} callback – bekommt den finalen Wurf
   * @param {object} [options] – z.B. { romanWithArabic: true }
   */
  function romanDiceRoll(sides, callback, options) {
    const roll = Math.floor(Math.random() * sides) + 1;
    const romanWithArabic = options && options.romanWithArabic;

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const box = document.createElement("div");
    box.style.background = "rgba(20,10,8,0.95)";
    box.style.border = "3px solid #c8a86d";
    box.style.borderRadius = "12px";
    box.style.padding = "16px 22px";
    box.style.minWidth = "260px";
    box.style.textAlign = "center";
    box.style.color = "#f2e6d2";
    box.style.boxShadow = "0 0 18px rgba(0,0,0,0.9)";

    const title = document.createElement("div");
    title.textContent = "Wurf des Schicksals";
    title.style.fontSize = "1.3rem";
    title.style.marginBottom = "8px";
    title.style.color = "#d6b15a";
    box.appendChild(title);

    const die = document.createElement("div");
    die.style.fontSize = "2.6rem";
    die.style.margin = "12px 0";
    die.style.letterSpacing = "0.1em";
    die.textContent = "–";
    box.appendChild(die);

    const sub = document.createElement("div");
    sub.style.fontSize = "0.95rem";
    sub.style.marginBottom = "12px";
    sub.textContent = "Der Würfel rollt…";
    box.appendChild(sub);

    const btn = document.createElement("button");
    btn.textContent = "Ergebnis übernehmen";
    btn.style.marginTop = "6px";
    btn.style.display = "none";
    box.appendChild(btn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    let elapsed = 0;
    const duration = 900;
    const interval = 80;
    const anim = setInterval(() => {
      elapsed += interval;
      const fake = Math.floor(Math.random() * sides) + 1;
      die.textContent = toRoman(fake);
      if (elapsed >= duration) {
        clearInterval(anim);
        die.textContent = toRoman(roll);
        if (romanWithArabic) {
          // z.B. Generierung: "XII (12)"
          sub.textContent = `Gewürfelt: ${toRoman(roll)} (${roll})`;
        } else {
          // Proben im Abenteuer: nur arabische Zahl
          sub.textContent = `Gewürfelt: ${roll}`;
        }
        btn.style.display = "inline-block";
      }
    }, interval);

    btn.addEventListener("click", () => {
      document.body.removeChild(overlay);
      callback(roll);
    });
  }

  // --- LEVEL-UP FLOW --------------------------------------------------

  function startLevelUpFlow(nextNodeId) {
    // Zielknoten merken
    state.postLevelTarget = (typeof nextNodeId !== "undefined" ? nextNodeId : null);

    const { level } = getLevelInfo(state.xp);

    dom.nodeText.innerHTML = "";
    clearChoices();

    const titleP = document.createElement("p");
    titleP.innerHTML =
      `<span class="gold">Stufenaufstieg!</span> ` +
      `Aeneas erreicht <strong>Stufe ${level}</strong>.`;
    dom.nodeText.appendChild(titleP);

    const attrP = document.createElement("p");
    attrP.innerHTML =
      "Wähle eine Eigenschaft, die du um <strong>+1</strong> steigern möchtest:";
    dom.nodeText.appendChild(attrP);

    const attrButtonsRow = document.createElement("div");
    attrButtonsRow.style.display = "flex";
    attrButtonsRow.style.flexWrap = "wrap";
    attrButtonsRow.style.gap = "6px";
    dom.nodeText.appendChild(attrButtonsRow);

    let attrChosen = false;

    ATTRIBUTE_KEYS.forEach(key => {
      const btn = document.createElement("button");
      btn.textContent = keyLabel(key) + " +1";
      btn.addEventListener("click", () => {
        if (attrChosen) return;
        state.attributes[key] = (state.attributes[key] || 0) + 1;
        attrChosen = true;
        renderStats();
        // Alle Attribut-Buttons deaktivieren
        const buttons = attrButtonsRow.querySelectorAll("button");
        buttons.forEach(b => b.disabled = true);
        updateContinueState();
      });
      attrButtonsRow.appendChild(btn);
    });

    const vigorP = document.createElement("p");
    vigorP.innerHTML =
      "Steigere außerdem deine <strong>Vigor</strong> um <strong>1W6</strong> Punkte:";
    dom.nodeText.appendChild(vigorP);

    const vigorInfo = document.createElement("p");
    vigorInfo.style.fontStyle = "italic";
    vigorInfo.style.marginTop = "4px";
    dom.nodeText.appendChild(vigorInfo);

    let vigorRolled = false;

    const vigorRollBtn = addChoiceButton("Vigor auswürfeln (1W6)", () => {
      if (vigorRolled) return;
      romanDiceRoll(6, (roll) => {
        vigorRolled = true;
        state.maxVigor += roll;
        state.vigor += roll;
        if (state.vigor > state.maxVigor) state.vigor = state.maxVigor;

        vigorInfo.textContent =
          `Deine Vigor steigt um ${roll} Punkte. Neuer Wert: ` +
          `${state.vigor} / ${state.maxVigor}.`;

        renderStats();
        vigorRollBtn.disabled = true;
        updateContinueState();
      }, { romanWithArabic: true });
    });

    const continueBtn = addChoiceButton("Zur Geschichte zurückkehren", () => { });
    continueBtn.disabled = true;

    function updateContinueState() {
      continueBtn.disabled = !(attrChosen && vigorRolled);
    }

    continueBtn.onclick = () => {
      if (continueBtn.disabled) return;

      if (state.pendingLevelUps > 0) {
        state.pendingLevelUps--;
      }

      const target = state.postLevelTarget;

      if (state.pendingLevelUps > 0) {
        // Es stehen noch weitere Level-Ups an: nächster Aufstieg direkt hinterher
        startLevelUpFlow(target);
      } else if (typeof target !== "undefined" && target !== null) {
        state.postLevelTarget = null;
        goToNode(target);
      } else {
        // Kein spezieller Zielknoten – kleiner Abschlussbildschirm
        dom.nodeText.innerHTML = "<p>Dein Aufstieg ist vollendet.</p>";
        clearChoices();
        addChoiceButton("Weiter …", () => { });
        renderStats();
      }
    };

    renderStats();
  }

  function handlePostChoiceNavigation(nextNodeId) {
    if (state.pendingLevelUps > 0) {
      startLevelUpFlow(nextNodeId);
    } else if (typeof nextNodeId !== "undefined" && nextNodeId !== null) {
      goToNode(nextNodeId);
    }
  }

  // --- EINLEITUNG -----------------------------------------------------

  function showIntro() {
    setImage("images/aeneas_stadtmauer_3to2.jpg");

    dom.nodeText.innerHTML = "";
    state.lastGainMessage = null;

    const p1 = document.createElement("p");
    p1.innerHTML =
      'Seit nunmehr zehn Jahren belagern die Griechen die Mauern Trojas – ein Krieg, der seinen Anfang nahm, als ' +
      '<span class="gold">Paris</span> die schöne <span class="gold">Helena</span> aus Sparta entführte und damit den Zorn der Griechen heraufbeschwor. ' +
      'Unzählige Schlachten wurden geschlagen, Helden sind gefallen, und zwischen Hoffnung und Verzweiflung erwuchs eine Generation, die den Frieden nur aus Geschichten kennt.';
    dom.nodeText.appendChild(p1);

    const p2 = document.createElement("p");
    p2.innerHTML =
      'Unter den Verteidigern steht ein Mann, dessen Name noch weit über diese Mauern hinaus klingen soll: ' +
      '<span class="gold">Aeneas</span>, Sohn der <span class="gold">Venus</span>, Krieger, Vater, Träger eines Schicksals, das größer ist als er selbst. ' +
      'Ihm ist vorherbestimmt, seinem Volk eine neue Heimat zu suchen und zum Stammvater des <span class="gold">Imperium Romanum</span> zu werden – des mächtigsten Reichs der antiken Welt.';
    dom.nodeText.appendChild(p2);

    const p3 = document.createElement("p");
    p3.innerHTML =
      'Doch bevor eine neue Zukunft entstehen kann, müssen zahlreiche Gefahren überwunden werden: listige Feinde, göttliche Prüfungen, Stürme auf offener See, fremde Länder, unerwartete Verbündete und grausame Täuschungen. ' +
      'Jeder Schritt wird dich vor Entscheidungen stellen, die Mut, Pflichtgefühl und Klugheit erfordern.';
    dom.nodeText.appendChild(p3);

    const p4 = document.createElement("p");
    p4.innerHTML =
      'Wirst du den trojanischen Helden auf seiner Mission begleiten, ihm durch alle Prüfungen beistehen und den Weg zu seiner Bestimmung finden – oder wird sein Schicksal in deinen Händen enden, bevor es überhaupt beginnen kann?<br>' +
      'Dies ist der Anfang eines Epos. Und du hältst seine Fäden in der Hand.';
    dom.nodeText.appendChild(p4);

    clearChoices();
    addChoiceButton("Dein Schicksal beginnt …", () => {
      startCharacterCreation();
    });

    ATTRIBUTE_KEYS.forEach(k => (state.attributes[k] = null));
    state.vigor = START_VIGOR;
    state.maxVigor = START_VIGOR;
    state.pietas = 0;
    state.xp = 0;
    state.level = 1;
    state.pendingLevelUps = 0;
    state.postLevelTarget = null;
    state.inventory = [];
    state.flags = {};
    state.nodeGainOnce = {};
    state.currentNodeId = null;

    // Kapitel-Tracking zurücksetzen
    state.chapterState.book = null;
    state.chapterState.chapter = null;
    state.chapterState.startNodeId = null;
    state.chapterState.snapshot = null;

    renderStats();
    renderInventory();
    renderStates();
  }

  // --- CHARAKTERERSCHAFFUNG -------------------------------------------

  function startCharacterCreation() {
    setImage(null);

    dom.nodeText.innerHTML = "";
    state.lastGainMessage = null;

    const pWach = document.createElement("p");
    pWach.innerHTML =
      "Vor dir liegt eine Wachstafel, wie sie die Auguren und Priester Trojas zur Deutung göttlicher Zeichen nutzten. " +
      "Die Würfel des Schicksals rollen – und die Götter beginnen, die Seele des <span class=\"gold\">Aeneas</span> zu formen.";
    dom.nodeText.appendChild(pWach);

    const img = document.createElement("img");
    img.src = "images/wachstafel_3to2.jpg";
    img.alt = "Römische Wachstafel des Schicksals";
    img.style.display = "block";
    img.style.margin = "0.5rem auto 1rem auto";
    img.style.maxWidth = "90%";
    img.style.border = "2px solid #5a3f2a";
    img.style.borderRadius = "8px";
    dom.nodeText.appendChild(img);

    const list = document.createElement("ul");
    list.innerHTML = `
      <li><strong>Auctoritas</strong>: Ausstrahlung, Wirkung auf andere.</li>
      <li><strong>Virtus</strong>: Mut und Tapferkeit im Angesicht der Gefahr.</li>
      <li><strong>Fortitudo</strong>: Körperliche Kraft und Durchhaltevermögen.</li>
      <li><strong>Prudentia</strong>: Klugheit, Voraussicht, Urteilskraft.</li>
      <li><strong>Dexteritas</strong>: Gewandtheit, Beweglichkeit, Geschick.</li>
      <li><strong>Intuitio</strong>: Gespür, innere Eingebung, Ahnung vor der Gefahr.</li>
    `;
    dom.nodeText.appendChild(list);

    const p1 = document.createElement("p");
    p1.innerHTML =
      "<strong>Vigor</strong> (Lebenskraft) beginnt bei " + START_VIGOR +
      ". Sinkt er auf 0, ist Aeneas kampfunfähig und du solltest das Kapitel neu beginnen. " +
      "<strong>Pietas</strong> (Pflichtgefühl) wächst, wenn du Familie, Gefährten und Götter ehrst – und kann in schwierigen Proben eingesetzt werden.";
    dom.nodeText.appendChild(p1);

    // Tabelle für Eigenschaften
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.marginTop = "10px";
    table.style.borderSpacing = "4px";

    const valueSpans = {};
    const rowElements = {};
    const rollDone = {};

    // Steuerung für Durchschnitts-Aeneas-Button
    let quickStartBox = null;
    let quickStartBtn = null;
    let anyAttributeRolled = false;

    function disableQuickStartChoice() {
      if (!quickStartBox || !quickStartBtn) return;
      if (anyAttributeRolled) return;
      anyAttributeRolled = true;
      quickStartBox.style.display = "none";
    }

    ATTRIBUTE_KEYS.forEach(key => {
      const tr = document.createElement("tr");
      rowElements[key] = tr;

      const tdLabel = document.createElement("td");
      tdLabel.style.width = "40%";
      tdLabel.textContent = keyLabel(key);
      tr.appendChild(tdLabel);

      const tdVal = document.createElement("td");
      const span = document.createElement("span");
      span.textContent = "–";
      valueSpans[key] = span;
      tdVal.appendChild(span);
      tr.appendChild(tdVal);

      const tdBtn = document.createElement("td");
      const btn = document.createElement("button");
      btn.textContent = "Würfeln (1W6 + 7)";
      btn.addEventListener("click", () => {
        romanDiceRoll(6, (roll) => {
          const val = roll + 7;
          state.attributes[key] = val;
          rollDone[key] = true;
          span.textContent = String(val);
          btn.disabled = true;

          // Sobald mindestens einmal gewürfelt wurde, Schnellstart-Option entfernen
          disableQuickStartChoice();

          renderStats();
          updateControls();
        }, { romanWithArabic: true });
      });
      tdBtn.appendChild(btn);
      tr.appendChild(tdBtn);

      table.appendChild(tr);
    });

    dom.nodeText.appendChild(table);

    // Schnellstart mit Durchschnitts-Aeneas (alle Attribute = 10)
    quickStartBox = document.createElement("div");
    quickStartBox.style.marginTop = "8px";
    quickStartBox.style.textAlign = "right";

    quickStartBtn = document.createElement("button");
    quickStartBtn.textContent =
      "Ich möchte darauf verzichten meinen Aeneas auszuwürfeln und starte lieber mit einem 'Durchschnitts-Aeneas'.";
    quickStartBtn.addEventListener("click", () => {
      // Nur erlaubt, solange noch kein Attribut gewürfelt wurde
      if (anyAttributeRolled) return;

      ATTRIBUTE_KEYS.forEach(key => {
        state.attributes[key] = 10;
        if (valueSpans[key]) {
          valueSpans[key].textContent = "10";
        }
      });
      renderStats();
      beginStory();
    });

    quickStartBox.appendChild(quickStartBtn);
    dom.nodeText.appendChild(quickStartBox);

    // Bonusphase
    const bonusBox = document.createElement("div");
    bonusBox.style.marginTop = "10px";
    bonusBox.innerHTML = `
      <p>Nachdem du alle Eigenschaften gewürfelt hast, kannst du:</p>
      <ul>
        <li><strong>zwei</strong> unterschiedliche Eigenschaften um jeweils <strong>+1</strong> erhöhen,</li>
        <li>und anschließend optional <strong>zwei</strong> Eigenschaften miteinander tauschen.</li>
      </ul>
    `;
    dom.nodeText.appendChild(bonusBox);

    const bonusSection = document.createElement("div");
    bonusSection.style.marginTop = "4px";

    const bonusInfo = document.createElement("p");
    bonusInfo.textContent = "Verteile zwei Bonuspunkte (auf zwei verschiedene Eigenschaften):";
    bonusSection.appendChild(bonusInfo);

    const bonusButtonsRow = document.createElement("div");
    bonusButtonsRow.style.display = "flex";
    bonusButtonsRow.style.flexWrap = "wrap";
    bonusButtonsRow.style.gap = "6px";

    let bonusPointsLeft = 2;
    const usedBonusAttrs = new Set();

    ATTRIBUTE_KEYS.forEach(key => {
      const btn = document.createElement("button");
      btn.textContent = `+1 auf ${keyLabel(key)}`;
      btn.addEventListener("click", () => {
        if (bonusPointsLeft <= 0) return;
        if (!rollDone[key]) return;
        if (usedBonusAttrs.has(key)) return;

        state.attributes[key] = (state.attributes[key] || 0) + 1;
        valueSpans[key].textContent = String(state.attributes[key]);
        bonusPointsLeft--;
        usedBonusAttrs.add(key);
        highlightBonusRow(key);
        renderStats();
        updateControls();
      });
      bonusButtonsRow.appendChild(btn);
    });

    bonusSection.appendChild(bonusButtonsRow);
    dom.nodeText.appendChild(bonusSection);

    function highlightBonusRow(key) {
      const row = rowElements[key];
      if (row) {
        row.style.backgroundColor = "rgba(214, 177, 90, 0.15)";
      }
    }

    // Tauschphase
    const swapSection = document.createElement("div");
    swapSection.style.marginTop = "10px";

    const pSwap = document.createElement("p");
    pSwap.textContent =
      "Du kannst nun optional zwei Eigenschaften auswählen, deren Werte du tauschen möchtest – " +
      "oder du entscheidest dich, keine Werte zu tauschen.";
    swapSection.appendChild(pSwap);

    const swapRow = document.createElement("div");
    swapRow.style.display = "flex";
    swapRow.style.flexWrap = "wrap";
    swapRow.style.gap = "6px";
    swapSection.appendChild(swapRow);

    const selectA = document.createElement("select");
    const selectB = document.createElement("select");
    const swapBtn = document.createElement("button");
    swapBtn.textContent = "Ausgewählte Werte tauschen";
    const skipSwapBtn = document.createElement("button");
    skipSwapBtn.textContent = "Keine Attributswerte tauschen";

    [selectA, selectB].forEach(sel => {
      sel.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "– wählen –";
      sel.appendChild(opt0);
      ATTRIBUTE_KEYS.forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = keyLabel(key);
        sel.appendChild(opt);
      });
    });

    swapRow.appendChild(selectA);
    swapRow.appendChild(selectB);
    swapRow.appendChild(swapBtn);
    swapRow.appendChild(skipSwapBtn);

    dom.nodeText.appendChild(swapSection);

    let swapDone = false;
    let skipSwap = false;

    function allAttributesSet() {
      return ATTRIBUTE_KEYS.every(k => typeof state.attributes[k] === "number");
    }

    function bonusesDone() {
      return bonusPointsLeft === 0;
    }

    function refreshBonusButtons() {
      const allSet = allAttributesSet();
      const buttons = bonusButtonsRow.querySelectorAll("button");
      buttons.forEach(btn => {
        const labelText = btn.textContent || "";
        const key = ATTRIBUTE_KEYS.find(k => labelText.includes(keyLabel(k)));
        if (!key) return;
        const already = usedBonusAttrs.has(key);
        btn.disabled = !allSet || already || bonusPointsLeft <= 0;
      });
    }

    function refreshSwapButtons() {
      const a = selectA.value;
      const b = selectB.value;
      const allSet = allAttributesSet();
      swapBtn.disabled = !allSet || !bonusesDone() || !a || !b || a === b || swapDone || skipSwap;
      skipSwapBtn.disabled = !allSet || !bonusesDone() || swapDone || skipSwap;
    }

    function updateControls() {
      refreshBonusButtons();
      refreshSwapButtons();
      if (allAttributesSet() && bonusesDone() && (swapDone || skipSwap)) {
        startBtn.disabled = false;
      } else {
        startBtn.disabled = true;
      }
    }

    swapBtn.addEventListener("click", () => {
      const a = selectA.value;
      const b = selectB.value;
      if (!a || !b || a === b) return;
      if (!allAttributesSet() || !bonusesDone()) return;
      const va = state.attributes[a];
      const vb = state.attributes[b];
      state.attributes[a] = vb;
      state.attributes[b] = va;
      valueSpans[a].textContent = String(vb);
      valueSpans[b].textContent = String(va);
      swapDone = true;
      renderStats();
      updateControls();
    });

    skipSwapBtn.addEventListener("click", () => {
      if (!allAttributesSet() || !bonusesDone()) return;
      skipSwap = true;
      updateControls();
    });

    clearChoices();
    const startBtn = addChoiceButton("Abenteuer beginnen", () => {
      if (!allAttributesSet()) return;
      if (!bonusesDone()) return;
      if (!swapDone && !skipSwap) return;
      beginStory();
    });
    startBtn.disabled = true;

    updateControls();
    renderStats();
  }

  function keyLabel(key) {
    switch (key) {
      case "auctoritas": return "Auctoritas";
      case "virtus": return "Virtus";
      case "fortitudo": return "Fortitudo";
      case "prudentia": return "Prudentia";
      case "dexteritas": return "Dexteritas";
      case "intuitio": return "Intuitio";
    }
    return key;
  }

  // --- STORY-LAUF -----------------------------------------------------

  let nodesById = new Map();

  function loadStory() {
    if (!Array.isArray(window.storyNodes)) {
      alert("Fehler: window.storyNodes ist nicht definiert oder kein Array.");
      return false;
    }
    nodesById.clear();
    window.storyNodes.forEach(n => {
      if (n && typeof n.id !== "undefined") {
        nodesById.set(n.id, n);
      }
    });
    return nodesById.size > 0;
  }

  function beginStory() {
    const startNode =
      Array.from(nodesById.values()).find(n => n.isStart) ||
      nodesById.get(1);
    if (!startNode) {
      alert("Kein Startknoten gefunden.");
      return;
    }
    goToNode(startNode.id);
  }

  function goToNode(id) {
    const node = nodesById.get(id);
    if (!node) {
      alert("Knoten " + id + " nicht gefunden.");
      return;
    }

    // Kapitel-Tracking aktualisieren (für Neustart nach Tod)
    ensureChapterTracking(node);

    state.currentNodeId = id;
    renderNode(node);
  }

  function renderNode(node) {
    dom.nodeText.innerHTML = "";

    // System-Hinweis zu Effekten aus dem letzten Knoten
    if (state.lastGainMessage) {
      const gainP = document.createElement("p");
      gainP.innerHTML = `<span class="gold">${state.lastGainMessage}</span>`;
      dom.nodeText.appendChild(gainP);
      state.lastGainMessage = null;
    }

    if (Array.isArray(node.paragraphs)) {
      node.paragraphs.forEach(p => {
        const el = document.createElement("p");
        el.innerHTML = p;
        dom.nodeText.appendChild(el);
      });
    } else if (node.text) {
      const el = document.createElement("p");
      el.innerHTML = node.text;
      dom.nodeText.appendChild(el);
    }

    clearChoices();

    if (node.type === "test" && node.test) {
      renderTestNode(node);
    } else {
      renderNormalChoices(node);
    }

    renderStats();
    renderInventory();
    renderStates();
  }

  // --- CHOICES & EFFECTS ----------------------------------------------

  function renderNormalChoices(node) {
    if (!Array.isArray(node.choices) || !node.choices.length) {
      addChoiceButton("Ende dieses Pfades", () => { });
      return;
    }

    node.choices.forEach(choice => {
      addChoiceButton(choice.text || "Weiter", () => {
        const died = applyChoiceEffects(choice);
        if (died) {
          showDefeatScreen();
        } else {
          handlePostChoiceNavigation(choice.target);
        }
      });
    });
  }

  function applyChoiceEffects(choice) {
    const nodeId = state.currentNodeId;
    const already = !!state.nodeGainOnce[nodeId];
    let gainedNow = false;

    let dV = 0;
    let dP = 0;
    let dX = 0;

    if (Array.isArray(choice.addItems)) {
      if (!already) {
        choice.addItems.forEach(it => {
          if (!state.inventory.includes(it)) {
            state.inventory.push(it);
          }
        });
        gainedNow = true;
      }
    }
    if (Array.isArray(choice.removeItems)) {
      choice.removeItems.forEach(it => {
        state.inventory = state.inventory.filter(x => x !== it);
      });
    }

    if (choice.setFlags) {
      Object.entries(choice.setFlags).forEach(([k, v]) => {
        state.flags[k] = v;
      });
    }

    if (typeof choice.hpDelta === "number") {
      if (choice.hpDelta > 0) {
        if (!already) {
          changeVigor(choice.hpDelta);
          dV += choice.hpDelta;
          gainedNow = true;
        }
      } else {
        changeVigor(choice.hpDelta);
        dV += choice.hpDelta;
      }
    }

    if (typeof choice.pietasDelta === "number") {
      if (choice.pietasDelta > 0) {
        if (!already) {
          changePietas(choice.pietasDelta);
          dP += choice.pietasDelta;
          gainedNow = true;
        }
      } else {
        changePietas(choice.pietasDelta);
        dP += choice.pietasDelta;
      }
    }

    if (typeof choice.xpDelta === "number") {
      if (choice.xpDelta > 0) {
        if (!already) {
          changeXp(choice.xpDelta);
          dX += choice.xpDelta;
          gainedNow = true;
        }
      } else {
        changeXp(choice.xpDelta);
        dX += choice.xpDelta;
      }
    }

    if (gainedNow && !already) {
      state.nodeGainOnce[nodeId] = true;
    }

    state.lastGainMessage = buildGainMessage(dV, dP, dX);

    renderStats();
    renderInventory();
    renderStates();

    // TRUE zurückgeben, wenn Aeneas kampfunfähig ist
    return state.vigor <= 0;
  }

  function buildGainMessage(dV, dP, dX) {
    const parts = [];
    function phrase(resourceName, d, singularWord) {
      const abs = Math.abs(d);
      const punkte = abs === 1 ? singularWord : "Punkte " + resourceName;
      if (d < 0) {
        return `Du verlierst ${abs} ${punkte}.`;
      } else {
        return `Du erhältst ${abs} ${punkte}.`;
      }
    }

    if (dV !== 0) {
      parts.push(phrase("Vigor", dV, "Punkt Vigor"));
    }
    if (dP !== 0) {
      parts.push(phrase("Pietas", dP, "Punkt Pietas"));
    }
    if (dX !== 0) {
      parts.push(phrase("Experientia", dX, "Punkt Experientia"));
    }

    if (!parts.length) return null;
    return "[" + parts.join(" ") + "]";
  }

  // --- PROBENKNOTEN ---------------------------------------------------

  function renderTestNode(node) {
    const t = node.test;
    const attrKey = t.attribute;
    const base = state.attributes[attrKey] || 8;
    const mod = t.modifier || 0;
    const pietasCost = t.pietasRerollCost || 0;

    const target = clamp(base + mod, 1, 20);
    const probability = computeProbability(target);

    const info = document.createElement("p");
    info.innerHTML =
      (t.description ? t.description + "<br>" : "") +
      difficultyLabel(mod, attrKey) + "<br>" +
      `Probe auf <strong>${keyLabel(attrKey)}</strong> – du benötigst eine <strong>${target}</strong> oder weniger (Erfolgswahrscheinlichkeit: <strong>${probability}%</strong>).` +
      `<br><small>Eine 1 ist immer Erfolg, eine 20 immer Misserfolg.</small>`;
    dom.nodeText.appendChild(info);

    const resultP = document.createElement("p");
    resultP.style.marginTop = "10px";
    dom.nodeText.appendChild(resultP);

    let alreadyRolled = false;
    let rerolled = false;

    const rollBtn = addChoiceButton("Probe würfeln", () => {
      if (alreadyRolled) return;
      alreadyRolled = true;
      rollBtn.disabled = true;
      romanDiceRoll(20, (roll) => {
        handleResult(roll, false);
      });
    });

    let pietasBtn = null;
    if (pietasCost > 0) {
      pietasBtn = addChoiceButton(`Pietas (${pietasCost}) einsetzen und neu würfeln`, () => {
        if (!alreadyRolled || rerolled) return;
        if (state.pietas < pietasCost) return;
        rerolled = true;
        changePietas(-pietasCost);
        renderStats();
        pietasBtn.disabled = true;
        romanDiceRoll(20, (roll) => {
          handleResult(roll, true);
        });
      });
      pietasBtn.disabled = true;
    }

    const continueBtn = addChoiceButton("Weiter", () => { });
    continueBtn.disabled = true;

    function handleResult(roll, isReroll) {
      const success = isSuccess(roll, target);
      const nodeId = state.currentNodeId;
      const already = !!state.nodeGainOnce[nodeId];
      let gainedNow = false;

      let dV = 0;
      let dP = 0;
      let dX = 0;

      let summary =
        (success ? "Erfolg! " : "Misserfolg! ") +
        `Wurf: ${roll} (Zielwert: ${target} auf ${keyLabel(attrKey)} ${base}` +
        (mod ? (mod > 0 ? ` + ${mod}` : ` ${mod}`) : "") +
        ")";

      if (roll === 1) summary += " – automatischer Erfolg!";
      if (roll === 20) summary += " – automatischer Misserfolg!";

      resultP.innerHTML = summary;

      const cfgHp = success ? t.successHpDelta : t.failureHpDelta;
      const cfgP = success ? t.successPietasDelta : t.failurePietasDelta;
      const cfgXp = success ? t.successXpDelta : t.failureXpDelta;

      if (typeof cfgHp === "number") {
        if (cfgHp > 0) {
          if (!already) {
            changeVigor(cfgHp);
            dV += cfgHp;
            gainedNow = true;
          }
        } else {
          changeVigor(cfgHp);
          dV += cfgHp;
        }
      }

      if (typeof cfgP === "number") {
        if (cfgP > 0) {
          if (!already) {
            changePietas(cfgP);
            dP += cfgP;
            gainedNow = true;
          }
        } else {
          changePietas(cfgP);
          dP += cfgP;
        }
      }

      if (typeof cfgXp === "number") {
        if (cfgXp > 0) {
          if (!already) {
            changeXp(cfgXp);
            dX += cfgXp;
            gainedNow = true;
          }
        } else {
          changeXp(cfgXp);
          dX += cfgXp;
        }
      }

      if (gainedNow && !already) {
        state.nodeGainOnce[nodeId] = true;
      }

      state.lastGainMessage = buildGainMessage(dV, dP, dX);

      renderStats();

      // Wenn Aeneas durch die Probe kampfunfähig wird → Todesscreen, keine weiteren Optionen
      if (state.vigor <= 0) {
        if (pietasBtn) pietasBtn.disabled = true;
        continueBtn.disabled = true;
        showDefeatScreen();
        return;
      }

      if (pietasBtn && !isReroll && !success && state.pietas >= pietasCost) {
        pietasBtn.disabled = false;
      } else if (pietasBtn) {
        pietasBtn.disabled = true;
      }

      const targetId = success ? t.successTarget : t.failureTarget;
      continueBtn.disabled = false;
      continueBtn.onclick = () => {
        handlePostChoiceNavigation(targetId);
      };
    }
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function computeProbability(target) {
    let success = 0;
    for (let r = 1; r <= 20; r++) {
      if (isSuccess(r, target)) success++;
    }
    return Math.round((success / 20) * 100);
  }

  function isSuccess(roll, target) {
    if (roll === 1) return true;
    if (roll === 20) return false;
    return roll <= target;
  }

  function difficultyLabel(modifier, attrKey) {
    const label = keyLabel(attrKey);
    if (modifier <= -9) return `Extrem schwierige Probe auf ${label} (um 9 erschwert).`;
    if (modifier <= -6) return `Sehr schwierige Probe auf ${label} (um 6 erschwert).`;
    if (modifier <= -3) return `Schwierige Probe auf ${label} (um 3 erschwert).`;
    if (modifier >= 9) return `Extrem leichte Probe auf ${label} (um 9 erleichtert).`;
    if (modifier >= 6) return `Sehr leichte Probe auf ${label} (um 6 erleichtert).`;
    if (modifier >= 3) return `Leichte Probe auf ${label} (um 3 erleichtert).`;
    return `Normale Probe auf ${label}.`;
  }

  // --- STARTUP --------------------------------------------------------

  window.addEventListener("DOMContentLoaded", () => {
    initDom();
    if (loadStory()) {
      renderStats();
      renderInventory();
      renderStates();
      showIntro();
    }
  });

})();

