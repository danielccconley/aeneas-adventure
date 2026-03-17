
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
// - Startscreen + Autosave/Load über localStorage
// - Debug-Modus mit globalem Toggle-Button & Debug-Panel

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
  const SAVE_KEY = "aeneisSave_v1";
  const DEBUG_STORAGE_KEY = "aeneisDebugMode_v1";
  const ACHIEVEMENT_STORAGE_KEY = "aeneisAchievements_v1";

  // Beispiel-Achievements (du kannst das später beliebig erweitern / umbenennen)
  const achievementDefinitions = {
    first_ending: {
      name: "Erstes Ende",
      description: "Du hast zum ersten Mal ein Ende des Abenteuers erreicht."
    },
    many_endings: {
      name: "Pfadfinder",
      description: "Du hast mehrere verschiedene Enden erkundet."
    },
    secret_scene: {
      name: "Entdecker",
      description: "Du hast eine geheime Szene oder einen besonderen Ort gefunden."
    },
    max_pietas: {
      name: "Frommer Held",
      description: "Deine Pietas hat einen sehr hohen Wert erreicht."
    }
  };

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
    },

    // Debug-Status
    debug: false,

    // Entscheidungsprotokoll (wird nicht persistent gespeichert)
    decisionLog: [],

    // Achievements-Status
    achievements: {},

    // Gesehene Enden (für Achievement-Zwecke, nur in der laufenden Sitzung)
    endingsSeen: {}
  };

  const debugUndoStack = [];

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

    // Liste für Zustände (States)
    dom.stateList = document.getElementById("state-list");

    // Debug-UI (Toggle & Panel)
    createDebugUi();

    // Achievements-UI und -Logik
    initAchievementUi();
    initAchievements();

    // Musiksystem initialisieren
    initMusicSystem();
    createMusicUi();

    // Entscheidungsprotokoll-UI
    initDecisionLogUi();

    // Kapitelkarte / Chapter-Map
    initChapterMapUi();
  }

  // --- DEBUG-HILFSFUNKTIONEN ------------------------------------------

  function debugLog(...args) {
    if (!state.debug) return;
    console.log("[Aeneis DEBUG]", ...args);
  }

  function setDebugMode(on) {
    state.debug = !!on;

    if (dom.debugToggle) {
      dom.debugToggle.textContent = state.debug ? "Debug: AN" : "Debug: AUS";
      dom.debugToggle.style.opacity = state.debug ? "1" : "0.6";
    }
    if (dom.debugPanel) {
      dom.debugPanel.style.display = state.debug ? "block" : "none";
    }
    if (dom.debugUndoButton) {
      dom.debugUndoButton.style.display = state.debug ? "block" : "none";
    }

    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, state.debug ? "1" : "0");
    } catch (e) {
      // egal
    }
  }

  function loadDebugModeFromStorage() {
    try {
      const raw = localStorage.getItem(DEBUG_STORAGE_KEY);
      if (raw === "1") {
        setDebugMode(true);
      } else {
        setDebugMode(false);
      }
    } catch (e) {
      setDebugMode(false);
    }
  }

  function createDebugUi() {
    if (dom.debugToggle) return; // schon erstellt

    // Toggle-Button unten rechts (immer sichtbar)
    const btn = document.createElement("button");
    btn.id = "debug-toggle";
    btn.textContent = "Debug: AUS";
    btn.style.position = "fixed";
    btn.style.bottom = "10px";
    btn.style.right = "10px";
    btn.style.zIndex = "10000";
    btn.style.fontSize = "0.85rem";
    btn.style.padding = "6px 10px";
    btn.style.opacity = "0.6";
    btn.style.background = "#333333";
    btn.style.border = "1px solid #c8a86d";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";

    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = state.debug ? "1" : "0.6";
    });

    btn.addEventListener("click", () => {
      setDebugMode(!state.debug);
      debugLog("Debug-Modus umgeschaltet:", state.debug);
    });

    document.body.appendChild(btn);
    dom.debugToggle = btn;

    // Undo-Button (nur im Debug-Modus sichtbar)
    const undoBtn = document.createElement("button");
    undoBtn.id = "debug-undo";
    undoBtn.textContent = "Undo";
    undoBtn.style.position = "fixed";
    undoBtn.style.bottom = "40px";
    undoBtn.style.right = "10px";
    undoBtn.style.zIndex = "10000";
    undoBtn.style.fontSize = "0.75rem";
    undoBtn.style.padding = "4px 8px";
    undoBtn.style.opacity = "0.8";
    undoBtn.style.background = "#444444";
    undoBtn.style.border = "1px solid #c8a86d";
    undoBtn.style.borderRadius = "8px";
    undoBtn.style.cursor = "pointer";
    undoBtn.style.display = "none";

    undoBtn.addEventListener("mouseenter", () => {
      undoBtn.style.opacity = "1";
    });
    undoBtn.addEventListener("mouseleave", () => {
      undoBtn.style.opacity = "0.8";
    });

    undoBtn.addEventListener("click", () => {
      debugUndo();
    });

    document.body.appendChild(undoBtn);
    dom.debugUndoButton = undoBtn;

    // Debug-Panel oben rechts
    const panel = document.createElement("div");
    panel.id = "debug-panel";
    panel.style.position = "fixed";
    panel.style.top = "10px";
    panel.style.right = "10px";
    panel.style.maxWidth = "260px";
    panel.style.padding = "8px 10px";
    panel.style.fontSize = "0.78rem";
    panel.style.background = "rgba(0,0,0,0.85)";
    panel.style.border = "1px solid #c8a86d";
    panel.style.borderRadius = "8px";
    panel.style.color = "#f2e6d2";
    panel.style.zIndex = "9999";
    panel.style.pointerEvents = "none";
    panel.style.display = "none";

    document.body.appendChild(panel);
    dom.debugPanel = panel;
  }

  function updateDebugPanel(node) {
    if (!dom.debugPanel) return;
    if (!state.debug) return;

    const activeFlags = Object.keys(state.flags).filter(k => state.flags[k]);

    dom.debugPanel.innerHTML =
      "<strong>DEBUG-Infos</strong>" +
      "<br>Node-ID: " + (node && typeof node.id !== "undefined" ? node.id : "–") +
      "<br>Buch/Kapitel: " +
      (node && typeof node.book !== "undefined" ? node.book : "–") +
      " / " +
      (node && typeof node.chapter !== "undefined" ? node.chapter : "–") +
      "<br>Level: " + state.level +
      "<br>XP: " + state.xp +
      "<br>Vigor: " + state.vigor + " / " + state.maxVigor +
      "<br>Pietas: " + state.pietas +
      "<br>Aktive Flags: " + (activeFlags.length ? activeFlags.join(", ") : "–");
  }


  // --- DEBUG-KONSOLENFUNKTIONEN & HOTKEYS ----------------------------

  // 1) Vigor auf Maximum setzen
  window.debugMaxHeal = function () {
    state.vigor = state.maxVigor;
    debugLog("Debug Maxheal ausgeführt. Vigor =", state.vigor, "/", state.maxVigor);
    renderStats();
  };

  // 2) Zu einem bestimmten Knoten springen
  window.debugJumpTo = function (nodeId) {
    if (typeof nodeId === "string") {
      const parsed = parseInt(nodeId, 10);
      if (!isNaN(parsed)) nodeId = parsed;
    }

    if (typeof nodeId !== "number" || !Number.isFinite(nodeId)) {
      console.warn("[DEBUG] Bitte eine gültige Node-ID angeben, z.B. debugJumpTo(12).");
      return;
    }

    debugLog("Debug JumpTo ausgeführt. Springe zu Node", nodeId);
    if (typeof goToNode === "function") {
      goToNode(nodeId);
    } else {
      console.warn("[DEBUG] goToNode ist nicht verfügbar.");
    }
  };

  // 3) Item ins Inventar legen
  window.debugGiveItem = function (itemName) {
    if (!itemName || typeof itemName !== "string") {
      console.warn("[DEBUG] Bitte einen Item-Namen angeben, z.B. debugGiveItem('Faden').");
      return;
    }

    if (!Array.isArray(state.inventory)) {
      state.inventory = [];
    }

    if (!state.inventory.includes(itemName)) {
      state.inventory.push(itemName);
      debugLog("Debug GiveItem:", itemName, "→ Inventar:", state.inventory);
    } else {
      debugLog("Debug GiveItem: Item war bereits im Inventar:", itemName);
    }

    renderInventory();
  };

  // Tastenkürzel für die drei Funktionen
  function setupDebugHotkeys() {
    document.addEventListener("keydown", (ev) => {
      // Nur, wenn der Debug-Modus aktiv ist
      if (!state.debug) return;
      if (!ev.altKey || !ev.shiftKey) return;

      switch (ev.code) {
        case "Digit1":
          // Alt+Shift+1 -> Maxheal
          ev.preventDefault();
          window.debugMaxHeal();
          break;
        case "Digit2":
          // Alt+Shift+2 -> zu Node springen (per Prompt)
          ev.preventDefault();
          const nodeIdStr = prompt("Zu welcher Node-ID springen? (z.B. 1, 5, 23 …)");
          if (nodeIdStr !== null) {
            window.debugJumpTo(nodeIdStr);
          }
          break;
        case "Digit3":
          // Alt+Shift+3 -> Item ins Inventar legen (per Prompt)
          ev.preventDefault();
          const itemName = prompt("Welches Item ins Inventar legen?");
          if (itemName) {
            window.debugGiveItem(itemName);
          }
          break;
        case "KeyZ":
          // Alt+Shift+Z -> Undo letzten Schritt
          ev.preventDefault();
          debugUndo();
          break;
      }
    });
  }

  // --- DEBUG UNDO-FUNKTIONALITÄT -------------------------------------

  function pushUndoSnapshot() {
    if (!state.debug) return;

    const snapshot = {
      state: {
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
        nodeGainOnce: { ...state.nodeGainOnce },
        lastGainMessage: state.lastGainMessage,
        currentNodeId: state.currentNodeId
      },
      chapterState: {
        book: state.chapterState.book,
        chapter: state.chapterState.chapter,
        startNodeId: state.chapterState.startNodeId,
        snapshot: state.chapterState.snapshot
      }
    };

    debugUndoStack.push(snapshot);
    // Begrenze die Länge des Undo-Stacks, um Speicher zu schonen
    if (debugUndoStack.length > 50) {
      debugUndoStack.shift();
    }

    debugLog("Undo-Snapshot gespeichert. Stack-Länge:", debugUndoStack.length);
  }

  function debugUndo() {
    if (!state.debug) return;
    if (!debugUndoStack.length) {
      console.warn("[DEBUG] Kein Undo-Schritt vorhanden.");
      return;
    }

    const snapshot = debugUndoStack.pop();
    const s = snapshot.state;

    state.attributes = { ...s.attributes };
    state.vigor = s.vigor;
    state.maxVigor = s.maxVigor;
    state.pietas = s.pietas;
    state.xp = s.xp;
    state.level = s.level;
    state.pendingLevelUps = s.pendingLevelUps;
    state.postLevelTarget = s.postLevelTarget;
    state.inventory = [...s.inventory];
    state.flags = { ...s.flags };
    state.nodeGainOnce = { ...s.nodeGainOnce };
    state.lastGainMessage = s.lastGainMessage;
    state.currentNodeId = s.currentNodeId;

    if (snapshot.chapterState) {
      state.chapterState.book = snapshot.chapterState.book;
      state.chapterState.chapter = snapshot.chapterState.chapter;
      state.chapterState.startNodeId = snapshot.chapterState.startNodeId;
      state.chapterState.snapshot = snapshot.chapterState.snapshot;
    }

    renderStats();
    renderInventory();
    renderStates();

    if (typeof goToNode === "function" && state.currentNodeId != null) {
      goToNode(state.currentNodeId);
    }

    debugLog("Debug Undo ausgeführt. Wiederhergestellte Node:", state.currentNodeId);
  }

  // Auch global verfügbar machen (Konsole)
  window.debugUndo = debugUndo;

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

  // Zustände rendern (Flags)
  function renderStates() {
    if (!dom.stateList) return;

    dom.stateList.innerHTML = "";

    const activeStates = Object.keys(state.flags).filter(k => state.flags[k]);

    if (!activeStates.length) {
      const li = document.createElement("li");
      li.textContent = "Keine besonderen Zustände.";
      li.style.listStyleType = "none";
      li.style.marginLeft = "0";
      li.style.paddingLeft = "0";
      li.style.fontSize = "inherit";
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

    // Achievement: sehr hohe Pietas
    if (state.pietas >= 10) {
      unlockAchievement("max_pietas");
    }
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
      debugLog("Kapitel-Snapshot gesetzt:", {
        book: cs.book,
        chapter: cs.chapter,
        startNodeId: cs.startNodeId
      });
    }
  }

  // --- SAVE / LOAD ----------------------------------------------------

  function hasSaveGame() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
  }

  function clearSaveGame() {
    try {
      localStorage.removeItem(SAVE_KEY);
      debugLog("Spielstand gelöscht.");
    } catch (e) {
      // egal
    }
  }

  function getSaveData() {
    return {
      version: 1,
      state: {
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
        nodeGainOnce: { ...state.nodeGainOnce },
        lastGainMessage: state.lastGainMessage,
        currentNodeId: state.currentNodeId
        // Achievements werden separat gespeichert
      },
      chapterState: {
        book: state.chapterState.book,
        chapter: state.chapterState.chapter,
        startNodeId: state.chapterState.startNodeId
        // snapshot speichern wir nicht, da Tod den Stand sowieso neu setzt
      }
    };
  }

  function saveGame() {
    // Nur speichern, wenn wir schon in der Story sind
    if (state.currentNodeId == null) return;
    try {
      const data = getSaveData();
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      debugLog("Autosave durchgeführt (Node:", state.currentNodeId, ").");
    } catch (e) {
      // Wenn localStorage blockiert ist, ignorieren
      console.warn("Speichern nicht möglich:", e);
    }
  }

  function loadGameFromStorage() {
    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      alert("Fehler beim Laden des Spielstands.");
      return;
    }
    if (!raw) {
      alert("Kein gespeicherter Spielstand vorhanden.");
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      alert("Gespeicherter Spielstand ist beschädigt.");
      return;
    }

    if (!data || !data.state || typeof data.state.currentNodeId === "undefined") {
      alert("Gespeicherter Spielstand ist unvollständig.");
      return;
    }

    const s = data.state;

    state.attributes = { ...(s.attributes || {}) };
    state.vigor = typeof s.vigor === "number" ? s.vigor : START_VIGOR;
    state.maxVigor = typeof s.maxVigor === "number" ? s.maxVigor : START_VIGOR;
    state.pietas = typeof s.pietas === "number" ? s.pietas : 0;
    state.xp = typeof s.xp === "number" ? s.xp : 0;
    state.level = typeof s.level === "number" ? s.level : getLevelInfo(state.xp).level;
    state.pendingLevelUps = typeof s.pendingLevelUps === "number" ? s.pendingLevelUps : 0;
    state.postLevelTarget = s.postLevelTarget || null;
    state.inventory = Array.isArray(s.inventory) ? [...s.inventory] : [];
    state.flags = s.flags || {};
    state.nodeGainOnce = s.nodeGainOnce || {};
    state.lastGainMessage = s.lastGainMessage || null;
    state.currentNodeId = s.currentNodeId;

    if (data.chapterState) {
      state.chapterState.book = data.chapterState.book ?? null;
      state.chapterState.chapter = data.chapterState.chapter ?? null;
      state.chapterState.startNodeId = data.chapterState.startNodeId ?? null;
      // snapshot wird beim nächsten Kapitelwechsel neu gesetzt
      state.chapterState.snapshot = null;
    }

    // Achievements werden separat geladen
    loadAchievementsFromStorage();

    renderStats();
    renderInventory();
    renderStates();

    // Entscheidungsprotokoll wird bei geladenen Spielständen neu begonnen
    state.decisionLog = [];

    debugLog("Spielstand geladen:", {
      currentNodeId: state.currentNodeId,
      level: state.level,
      xp: state.xp
    });

    goToNode(state.currentNodeId);
  }

  // --- TOD / KAMPFUNFÄHIGKEIT ----------------------------------------

  function showDefeatScreen() {
    const node = nodesById.get(state.currentNodeId) || null;
    onDeath(node);
    debugLog("Aeneas kampfunfähig – DefeatScreen.");

    // Bild oben – verwendet dein Bild
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
        clearSaveGame();
        showStartScreen();
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

    // State für ein neues Spiel zurücksetzen
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
    state.lastGainMessage = null;

    // Kapitel-Tracking zurücksetzen
    state.chapterState.book = null;
    state.chapterState.chapter = null;
    state.chapterState.startNodeId = null;
    state.chapterState.snapshot = null;

    // Entscheidungsprotokoll leeren (neuer Durchlauf)
    state.decisionLog = [];

    // Achievements bestehen bewusst weiter (Metafortschritt)
    renderStats();
    renderInventory();
    renderStates();

    debugLog("Einleitung angezeigt, State zurückgesetzt.");
  }

  // --- STARTSCREEN ----------------------------------------------------

  function showStartScreen() {
    setImage("images/aeneas_stadtmauer_3to2.jpg");

    if (!dom.nodeText) return;

    dom.nodeText.innerHTML = "";

    const title = document.createElement("h2");
    title.innerHTML = "Die Aeneis – rette dein Volk und gründe Rom";
    dom.nodeText.appendChild(title);

    const p = document.createElement("p");
    p.innerHTML =
      "Willkommen im interaktiven Epos nach Vergil. " +
      "Du kannst ein neues Abenteuer beginnen oder – falls vorhanden – einen früheren Spielstand fortsetzen.";
    dom.nodeText.appendChild(p);

    clearChoices();

    // Neues Spiel
    addChoiceButton("Neues Spiel beginnen", () => {
      clearSaveGame();
      showIntro();
    });

    // Fortsetzen
    const contBtn = addChoiceButton("Fortsetzen (gespeichertes Spiel)", () => {
      loadGameFromStorage();
    });
    if (!hasSaveGame()) {
      contBtn.disabled = true;
    }

    // Erfolge ansehen
    addChoiceButton("Erfolge ansehen", () => {
      openAchievementsScreen();
    });

    // Optional: Save löschen
    const delBtn = addChoiceButton("Gespeicherten Spielstand löschen", () => {
      clearSaveGame();
      contBtn.disabled = true;
      alert("Gespeicherter Spielstand wurde gelöscht.");
    });

    renderStats();
    renderInventory();
    renderStates();

    debugLog("Startscreen angezeigt. Save vorhanden:", hasSaveGame());
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

          debugLog("Attribut gewürfelt:", key, "=", val);
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
      debugLog("Durchschnitts-Aeneas gestartet (alle Attribute = 10).");
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

        debugLog("Bonuspunkt vergeben auf", key, "→", state.attributes[key]);
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

    // Auswahländerungen sollen den Zustand der Tausch-Schaltflächen aktualisieren
    selectA.addEventListener("change", () => {
      refreshSwapButtons();
    });
    selectB.addEventListener("change", () => {
      refreshSwapButtons();
    });

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

      debugLog("Attribute getauscht:", a, "<->", b, "→", state.attributes);
    });

    skipSwapBtn.addEventListener("click", () => {
      if (!allAttributesSet() || !bonusesDone()) return;
      skipSwap = true;
      updateControls();

      debugLog("Auf Attributs-Tausch verzichtet.");
    });

    clearChoices();
    const startBtn = addChoiceButton("Abenteuer beginnen", () => {
      if (!allAttributesSet()) return;
      if (!bonusesDone()) return;
      if (!swapDone && !skipSwap) return;
      debugLog("Charaktererschaffung abgeschlossen, Starte Story mit Attributen:", state.attributes);
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

    debugLog("Story geladen. Anzahl Knoten:", nodesById.size);

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
    debugLog("Starte Story bei Node", startNode.id);
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
    onNodeEntered(node);
    debugLog("goToNode:", id, "Node:", node);
    renderNode(node);
  }

  function renderNode(node) {
    dom.nodeText.innerHTML = "";

    // Bild aus dem aktuellen Knoten setzen (oder ausblenden)
    if (node && node.image) {
      setImage(node.image);
    } else {
      setImage(null);
    }

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

    // Debug-Panel aktualisieren
    updateDebugPanel(node);

    // Autosave nach jedem Knoten
    saveGame();

    debugLog("Node gerendert:", {
      id: node.id,
      type: node.type || "normal",
      currentNodeId: state.currentNodeId,
      vigor: state.vigor,
      pietas: state.pietas,
      xp: state.xp,
      level: state.level
    });
  }


  // --- CHOICES & EFFECTS ----------------------------------------------

  function renderNormalChoices(node) {
    if (!Array.isArray(node.choices) || !node.choices.length) {
      onEndingReached(node);
      addChoiceButton("Ende dieses Pfades", () => { });
      return;
    }

    node.choices.forEach(choice => {
      addChoiceButton(choice.text || "Weiter", () => {
        // Vor der Wahl einen Undo-Snapshot speichern (nur im Debug-Modus)
        pushUndoSnapshot();
        onChoiceTaken(node, choice);
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
            onItemAdded(it);
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

    debugLog("Choice angewandt:", choice, {
      nodeId,
      deltaVigor: dV,
      deltaPietas: dP,
      deltaXp: dX,
      vigor: state.vigor,
      pietas: state.pietas,
      xp: state.xp
    });

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

      onTestResolved(node, success, roll);
      renderStats();

      debugLog("Probenwurf:", {
        nodeId,
        attribute: attrKey,
        base,
        mod,
        target,
        roll,
        success,
        deltaVigor: dV,
        deltaPietas: dP,
        deltaXp: dX,
        vigor: state.vigor,
        pietas: state.pietas,
        xp: state.xp
      });

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

  
  // --- MUSIK-SYSTEM ---------------------------------------------------

  const MUSIC_TRACKS = {
    // Hier kannst du später konkrete Musikdateien eintragen, z.B.:
    // intro: "audio/intro.mp3",
    // battle_theme: "audio/battle_theme.mp3"
  };

  let musicAudio = null;
  let currentMusicId = null;
  let musicMuted = false;

  function initMusicSystem() {
    try {
      musicAudio = new Audio();
      musicAudio.loop = true;
    } catch (e) {
      musicAudio = null;
    }
  }

  function setMusicById(id) {
    if (!musicAudio) return;

    // Wenn sich die gewünschte Musik nicht ändert, nichts tun
    if (id === currentMusicId) return;

    currentMusicId = id || null;

    if (!currentMusicId) {
      // Keine Musik für diesen Knoten
      musicAudio.pause();
      return;
    }

    const src = MUSIC_TRACKS[currentMusicId];
    if (!src) {
      // Kein gültiger Eintrag für diese ID
      musicAudio.pause();
      return;
    }

    musicAudio.src = src;

    if (!musicMuted) {
      musicAudio.play().catch(() => {
        // Autoplay-Sperren können hier auftreten, müssen aber nicht behandelt werden
      });
    }
  }

  function toggleMusicMute() {
    musicMuted = !musicMuted;
    if (!musicAudio) return;

    if (musicMuted) {
      musicAudio.pause();
    } else if (currentMusicId) {
      musicAudio.play().catch(() => {});
    }

    if (dom.musicToggle) {
      dom.musicToggle.textContent = musicMuted ? "Musik: AUS" : "Musik: AN";
      dom.musicToggle.style.opacity = musicMuted ? "0.6" : "0.8";
    }
  }

  function createMusicUi() {
    if (dom.musicToggle) return;

    const btn = document.createElement("button");
    btn.id = "music-toggle";
    btn.textContent = "Musik: AN";
    btn.style.position = "fixed";
    btn.style.bottom = "10px";
    btn.style.left = "10px";
    btn.style.zIndex = "9999";
    btn.style.fontSize = "0.85rem";
    btn.style.padding = "6px 10px";
    btn.style.opacity = "0.8";
    btn.style.background = "#333333";
    btn.style.border = "1px solid #c8a86d";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";

    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = musicMuted ? "0.6" : "0.8";
    });

    btn.addEventListener("click", () => {
      toggleMusicMute();
    });

    document.body.appendChild(btn);
    dom.musicToggle = btn;

    // Anfangszustand
    btn.textContent = musicMuted ? "Musik: AUS" : "Musik: AN";
    btn.style.opacity = musicMuted ? "0.6" : "0.8";
  }


  // --- ENTSCHEIDUNGSPROTOKOLL (LOG) ----------------------------------

  function addLogEntry(entry) {
    if (!state.decisionLog) {
      state.decisionLog = [];
    }
    const base = {
      step: state.decisionLog.length + 1,
      timestamp: Date.now()
    };
    const merged = Object.assign(base, entry);
    state.decisionLog.push(merged);
  }

  function initDecisionLogUi() {
    if (dom.logButton) return;

    // Log-Button unten links (über dem Musik-Button)
    const btn = document.createElement("button");
    btn.id = "log-toggle";
    btn.textContent = "Log";
    btn.style.position = "fixed";
    btn.style.bottom = "40px";
    btn.style.left = "10px";
    btn.style.zIndex = "9999";
    btn.style.fontSize = "0.85rem";
    btn.style.padding = "6px 10px";
    btn.style.opacity = "0.8";
    btn.style.background = "#333333";
    btn.style.border = "1px solid #c8a86d";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";

    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "0.8";
    });

    btn.addEventListener("click", () => {
      openDecisionLogOverlay();
    });

    document.body.appendChild(btn);
    dom.logButton = btn;

    // Overlay für die Log-Anzeige
    const overlay = document.createElement("div");
    overlay.id = "decision-log-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.7)";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9400";

    const box = document.createElement("div");
    box.style.background = "rgba(20,10,8,0.96)";
    box.style.border = "2px solid #c8a86d";
    box.style.borderRadius = "10px";
    box.style.padding = "14px 16px";
    box.style.maxWidth = "520px";
    box.style.width = "92%";
    box.style.color = "#f2e6d2";
    box.style.boxShadow = "0 0 18px rgba(0,0,0,0.8)";
    box.style.maxHeight = "80vh";
    box.style.overflowY = "auto";

    const heading = document.createElement("h3");
    heading.textContent = "Entscheidungsprotokoll";
    heading.style.marginTop = "0";
    heading.style.marginBottom = "8px";
    heading.style.color = "#d6b15a";

    const info = document.createElement("p");
    info.textContent = "Hier siehst du eine Übersicht über die wichtigsten Schritte deines aktuellen Durchlaufs.";

    const list = document.createElement("div");
    list.id = "decision-log-list";

    const buttonRow = document.createElement("div");
    buttonRow.style.display = "flex";
    buttonRow.style.justifyContent = "space-between";
    buttonRow.style.gap = "8px";
    buttonRow.style.marginTop = "10px";

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Log kopieren";
    copyBtn.addEventListener("click", () => {
      copyDecisionLogToClipboard();
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Schließen";
    closeBtn.addEventListener("click", () => {
      closeDecisionLogOverlay();
    });

    buttonRow.appendChild(copyBtn);
    buttonRow.appendChild(closeBtn);

    box.appendChild(heading);
    box.appendChild(info);
    box.appendChild(list);
    box.appendChild(buttonRow);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    dom.logOverlay = overlay;
    dom.logList = list;
    dom.logCopyButton = copyBtn;

    // Klick auf den halbtransparenten Hintergrund schließt das Overlay
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) {
        closeDecisionLogOverlay();
      }
    });
  }

  function openDecisionLogOverlay() {
    if (!dom.logOverlay) return;
    renderDecisionLogList();
    dom.logOverlay.style.display = "flex";
  }

  function closeDecisionLogOverlay() {
    if (!dom.logOverlay) return;
    dom.logOverlay.style.display = "none";
  }

  function renderDecisionLogList() {
    if (!dom.logList) return;

    dom.logList.innerHTML = "";

    if (!state.decisionLog || !state.decisionLog.length) {
      const p = document.createElement("p");
      p.textContent = "Es sind noch keine Einträge im Log vorhanden.";
      dom.logList.appendChild(p);
      return;
    }

    state.decisionLog.forEach(entry => {
      const row = document.createElement("div");
      row.style.borderBottom = "1px solid rgba(255,255,255,0.08)";
      row.style.padding = "4px 0";

      const stepSpan = document.createElement("span");
      stepSpan.style.fontWeight = "bold";
      stepSpan.textContent = entry.step + ". ";

      const textSpan = document.createElement("span");
      textSpan.textContent = formatDecisionLogEntry(entry);

      row.appendChild(stepSpan);
      row.appendChild(textSpan);
      dom.logList.appendChild(row);
    });
  }

  function formatDecisionLogEntry(entry) {
    switch (entry.type) {
      case "node": {
        const parts = [];
        if (typeof entry.nodeId !== "undefined") {
          parts.push("Abschnitt " + entry.nodeId);
        }
        if (typeof entry.book !== "undefined" && typeof entry.chapter !== "undefined") {
          parts.push("(Buch " + entry.book + ", Kapitel " + entry.chapter + ")");
        }
        return "Du erreichst " + (parts.length ? parts.join(" ") : "einen neuen Abschnitt") + ".";
      }
      case "choice":
        return 'Entscheidung: "' + (entry.choiceText || "…") + "'.";
      case "test":
        return "Probe: Wurf " + entry.roll + (entry.success ? " (Erfolg)." : " (Misserfolg).");
      case "item":
        return "Gegenstand erhalten: " + (entry.itemId || "unbekannt") + ".";
      case "ending":
        return "Du hast ein Ende dieses Pfades erreicht.";
      case "death":
        return "Aeneas wird kampfunfähig (Vigor erschöpft).";
      default:
        return entry.description || "Ereignis.";
    }
  }

  function copyDecisionLogToClipboard() {
    if (!state.decisionLog || !state.decisionLog.length) return;

    const lines = state.decisionLog.map(e => {
      return e.step + ". " + formatDecisionLogEntry(e);
    });
    const text = lines.join("\n");

    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        // Falls das Kopieren fehlschlägt, ignorieren wir es einfach
      });
    }
  }


  // --- KAPITELKARTE / CHAPTER-MAP ------------------------------------

  const DEFAULT_CHAPTER_MAP_IMAGE = "images/chapter_default.jpg";

  function initChapterMapUi() {
    if (dom.chapterMapButton) return;

    // Button unten links (über dem Log-Button)
    const btn = document.createElement("button");
    btn.id = "chapter-map-toggle";
    btn.textContent = "Karte";
    btn.style.position = "fixed";
    btn.style.bottom = "70px";
    btn.style.left = "10px";
    btn.style.zIndex = "9999";
    btn.style.fontSize = "0.85rem";
    btn.style.padding = "6px 10px";
    btn.style.opacity = "0.8";
    btn.style.background = "#333333";
    btn.style.border = "1px solid #c8a86d";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";

    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "0.8";
    });

    btn.addEventListener("click", () => {
      openChapterMapOverlay();
    });

    document.body.appendChild(btn);
    dom.chapterMapButton = btn;

    // Overlay für Kapitelkarte
    const overlay = document.createElement("div");
    overlay.id = "chapter-map-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.75)";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9450";

    const box = document.createElement("div");
    box.style.background = "rgba(20,10,8,0.96)";
    box.style.border = "2px solid #c8a86d";
    box.style.borderRadius = "10px";
    box.style.padding = "12px 14px";
    box.style.maxWidth = "90vw";
    box.style.maxHeight = "85vh";
    box.style.boxShadow = "0 0 18px rgba(0,0,0,0.8)";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.gap = "6px";

    const heading = document.createElement("h3");
    heading.textContent = "Kapitelkarte";
    heading.style.margin = "0 0 4px 0";
    heading.style.color = "#d6b15a";

    const info = document.createElement("p");
    info.textContent =
      "Du kannst für jedes Kapitel eine eigene Karte hinterlegen, z.B. 'chapter_book2_chapter1.jpg' im Ordner 'images'.";
    info.style.fontSize = "0.8rem";
    info.style.textAlign = "center";
    info.style.opacity = "0.8";

    const img = document.createElement("img");
    img.id = "chapter-map-image";
    img.src = DEFAULT_CHAPTER_MAP_IMAGE;
    img.alt = "Kapitelkarte";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "70vh";
    img.style.border = "1px solid #c8a86d";
    img.style.borderRadius = "8px";
    img.style.objectFit = "contain";
    img.style.backgroundColor = "rgba(0,0,0,0.3)";

    img.addEventListener("error", () => {
      if (img.src.indexOf(DEFAULT_CHAPTER_MAP_IMAGE) === -1) {
        img.src = DEFAULT_CHAPTER_MAP_IMAGE;
      }
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Schließen";
    closeBtn.style.marginTop = "6px";
    closeBtn.addEventListener("click", () => {
      closeChapterMapOverlay();
    });

    box.appendChild(heading);
    box.appendChild(info);
    box.appendChild(img);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) {
        closeChapterMapOverlay();
      }
    });

    dom.chapterMapOverlay = overlay;
    dom.chapterMapImage = img;
  }

  function openChapterMapOverlay() {
    if (!dom.chapterMapOverlay) return;
    dom.chapterMapOverlay.style.display = "flex";
  }

  function closeChapterMapOverlay() {
    if (!dom.chapterMapOverlay) return;
    dom.chapterMapOverlay.style.display = "none";
  }

  function updateChapterMapForNode(node) {
    if (!dom.chapterMapImage) return;

    let src = DEFAULT_CHAPTER_MAP_IMAGE;

    if (node && typeof node.book !== "undefined" && typeof node.chapter !== "undefined") {
      const b = node.book;
      const c = node.chapter;
      src = "images/chapter_book" + b + "_chapter" + c + ".jpg";
    }

    dom.chapterMapImage.src = src;
  }

// --- EREIGNIS-HOOKS -------------------------------------------------

  function onNodeEntered(node) {
    debugLog("Hook onNodeEntered:", node && node.id);

    if (node) {
      addLogEntry({
        type: "node",
        nodeId: node.id,
        book: typeof node.book !== "undefined" ? node.book : undefined,
        chapter: typeof node.chapter !== "undefined" ? node.chapter : undefined
      });
    }

    // Kapitelkarte für diesen Abschnitt aktualisieren
    updateChapterMapForNode(node);

    // Musik für diesen Knoten setzen (falls in story.js definiert)
    if (node && node.music) {
      setMusicById(node.music);
    } else {
      // Falls kein Eintrag vorhanden ist, wird die Musik gestoppt
      setMusicById(null);
    }

    // Später: z.B. Achievements oder Statistiken hier einhängen
  }

  function onChoiceTaken(node, choice) {
    debugLog("Hook onChoiceTaken:", node && node.id, choice && choice.text);

    addLogEntry({
      type: "choice",
      nodeId: node && typeof node.id !== "undefined" ? node.id : undefined,
      choiceText: choice && choice.text ? choice.text : ""
    });

    // Später: z.B. Entscheidungspfad-Tracking
  }

  function onTestResolved(node, success, roll) {
    debugLog("Hook onTestResolved:", node && node.id, "success=", success, "roll=", roll);

    addLogEntry({
      type: "test",
      nodeId: node && typeof node.id !== "undefined" ? node.id : undefined,
      success: !!success,
      roll: roll
    });

    // Später: z.B. Zähler für gelungene/fehlgeschlagene Proben
  }

  function onEndingReached(node) {
    debugLog("Hook onEndingReached:", node && node.id);

    const nodeId = node && typeof node.id !== "undefined" ? node.id : undefined;

    addLogEntry({
      type: "ending",
      nodeId: nodeId
    });

    // Achievement: erstes Ende erreicht
    unlockAchievement("first_ending");

    // Achievement: mehrere verschiedene Enden erkundet
    if (typeof nodeId !== "undefined" && nodeId !== null) {
      if (!state.endingsSeen[nodeId]) {
        state.endingsSeen[nodeId] = true;
        const distinctEndings = Object.keys(state.endingsSeen).length;
        if (distinctEndings >= 3) {
          unlockAchievement("many_endings");
        }
      }
    }
  }

  function onItemAdded(itemId) {
    debugLog("Hook onItemAdded:", itemId);

    addLogEntry({
      type: "item",
      itemId: itemId
    });

    // Später: Sammel-Achievements
  }

  function onDeath(node) {
    debugLog("Hook onDeath:", node && node.id);

    addLogEntry({
      type: "death",
      nodeId: node && typeof node.id !== "undefined" ? node.id : undefined
    });

    // Später: Death-/Retry-Statistiken oder spezielles Achievement
  }

  // --- ACHIEVEMENTS: LOGIK & SPEICHERUNG ------------------------------

  function initAchievements() {
    // Basiszustand: alle Achievements sind zunächst false
    state.achievements = {};
    Object.keys(achievementDefinitions).forEach(id => {
      state.achievements[id] = false;
    });
    // Dann aus localStorage laden (setzt ggf. einige auf true)
    loadAchievementsFromStorage();
    // UI aktualisieren, falls Overlay offen war
    renderAchievementsList();
  }

  function saveAchievementsToStorage() {
    try {
      const data = {
        version: 1,
        achievements: state.achievements
      };
      localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(data));
      debugLog("Achievements gespeichert.");
    } catch (e) {
      console.warn("Achievements konnten nicht gespeichert werden:", e);
    }
  }

  function loadAchievementsFromStorage() {
    let raw;
    try {
      raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    } catch (e) {
      console.warn("Fehler beim Laden der Achievements:", e);
      return;
    }
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (data && data.achievements) {
        Object.keys(achievementDefinitions).forEach(id => {
          if (Object.prototype.hasOwnProperty.call(data.achievements, id)) {
            state.achievements[id] = !!data.achievements[id];
          }
        });
      }
      debugLog("Achievements geladen:", state.achievements);
    } catch (e) {
      console.warn("Gespeicherte Achievements sind beschädigt:", e);
    }
  }

  /**
   * Achievement freischalten.
   * Kann von überall her aufgerufen werden, z.B.:
   *   unlockAchievement("first_ending");
   */
  function unlockAchievement(id) {
    if (!achievementDefinitions[id]) {
      debugLog("Unbekanntes Achievement:", id);
      return;
    }
    if (state.achievements[id]) {
      return; // schon freigeschaltet
    }
    state.achievements[id] = true;
    saveAchievementsToStorage();
    showAchievementPopup(id);
    renderAchievementsList();
    debugLog("Achievement freigeschaltet:", id, achievementDefinitions[id].name);
  }

  // global verfügbar machen, damit story.js es aufrufen kann
  window.unlockAchievement = unlockAchievement;

  // --- ACHIEVEMENTS: UI (Popup + Overlay) -----------------------------

  function initAchievementUi() {
    // Popup (rechts unten)
    const popup = document.createElement("div");
    popup.id = "achievement-popup";
    popup.style.position = "fixed";
    popup.style.right = "20px";
    popup.style.bottom = "20px";
    popup.style.maxWidth = "260px";
    popup.style.padding = "10px 12px";
    popup.style.borderRadius = "8px";
    popup.style.background = "rgba(0,0,0,0.85)";
    popup.style.color = "#f2e6d2";
    popup.style.fontSize = "0.85rem";
    popup.style.zIndex = "9000";
    popup.style.opacity = "0";
    popup.style.transform = "translateY(20px)";
    popup.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    popup.style.pointerEvents = "none";
    popup.style.boxShadow = "0 0 10px rgba(0,0,0,0.7)";
    popup.style.display = "none";

    const title = document.createElement("div");
    title.id = "achievement-popup-title";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "4px";
    title.style.color = "#d6b15a";

    const desc = document.createElement("div");
    desc.id = "achievement-popup-desc";

    popup.appendChild(title);
    popup.appendChild(desc);

    document.body.appendChild(popup);
    dom.achievementPopup = popup;
    dom.achievementPopupTitle = title;
    dom.achievementPopupDesc = desc;

    // Overlay für Erfolge-Liste
    const overlay = document.createElement("div");
    overlay.id = "achievements-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.7)";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9500";

    const box = document.createElement("div");
    box.style.background = "rgba(20,10,8,0.95)";
    box.style.border = "2px solid #c8a86d";
    box.style.borderRadius = "10px";
    box.style.padding = "16px 18px";
    box.style.maxWidth = "420px";
    box.style.width = "90%";
    box.style.color = "#f2e6d2";
    box.style.boxShadow = "0 0 18px rgba(0,0,0,0.8)";
    box.style.maxHeight = "80vh";
    box.style.overflowY = "auto";

    const heading = document.createElement("h3");
    heading.textContent = "Erfolge";
    heading.style.marginTop = "0";
    heading.style.marginBottom = "8px";
    heading.style.color = "#d6b15a";

    const info = document.createElement("p");
    info.textContent = "Hier siehst du alle bisher definierten Erfolge dieses Abenteuers.";

    const list = document.createElement("div");
    list.id = "achievements-list";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Schließen";
    closeBtn.style.marginTop = "10px";

    closeBtn.addEventListener("click", () => {
      overlay.style.display = "none";
    });

    box.appendChild(heading);
    box.appendChild(info);
    box.appendChild(list);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    dom.achievementsOverlay = overlay;
    dom.achievementsList = list;
  }

  let achievementPopupTimeoutId = null;

  function showAchievementPopup(id) {
    if (!dom.achievementPopup || !dom.achievementPopupTitle || !dom.achievementPopupDesc) return;
    const def = achievementDefinitions[id];
    if (!def) return;

    dom.achievementPopupTitle.textContent = def.name;
    dom.achievementPopupDesc.textContent = def.description;

    dom.achievementPopup.style.display = "block";

    // kleine „Einblend“-Animation
    requestAnimationFrame(() => {
      dom.achievementPopup.style.opacity = "1";
      dom.achievementPopup.style.transform = "translateY(0)";
    });

    if (achievementPopupTimeoutId != null) {
      clearTimeout(achievementPopupTimeoutId);
    }
    achievementPopupTimeoutId = setTimeout(() => {
      dom.achievementPopup.style.opacity = "0";
      dom.achievementPopup.style.transform = "translateY(20px)";
      setTimeout(() => {
        if (dom.achievementPopup) {
          dom.achievementPopup.style.display = "none";
        }
      }, 300);
    }, 3000);
  }

  function openAchievementsScreen() {
    if (!dom.achievementsOverlay) return;
    renderAchievementsList();
    dom.achievementsOverlay.style.display = "flex";
  }

  function renderAchievementsList() {
    if (!dom.achievementsList) return;

    dom.achievementsList.innerHTML = "";

    const ids = Object.keys(achievementDefinitions);
    if (!ids.length) {
      const p = document.createElement("p");
      p.textContent = "Es sind derzeit keine Erfolge definiert.";
      dom.achievementsList.appendChild(p);
      return;
    }

    ids.forEach(id => {
      const def = achievementDefinitions[id];
      const unlocked = !!state.achievements[id];

      const item = document.createElement("div");
      item.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
      item.style.padding = "6px 0";

      const nameRow = document.createElement("div");
      nameRow.style.display = "flex";
      nameRow.style.justifyContent = "space-between";
      nameRow.style.alignItems = "center";

      const name = document.createElement("span");
      name.textContent = def.name;
      name.style.fontWeight = unlocked ? "bold" : "normal";

      const status = document.createElement("span");
      status.textContent = unlocked ? "✔️" : "❓";
      status.style.opacity = unlocked ? "1" : "0.6";

      nameRow.appendChild(name);
      nameRow.appendChild(status);

      const desc = document.createElement("div");
      desc.textContent = def.description;
      desc.style.fontSize = "0.85rem";
      desc.style.opacity = unlocked ? "1" : "0.8";

      item.appendChild(nameRow);
      item.appendChild(desc);

      dom.achievementsList.appendChild(item);
    });
  }

  // --- STARTUP --------------------------------------------------------

  window.addEventListener("DOMContentLoaded", () => {
    initDom();
    // Debug-Mode (Button ist bereits erstellt), Status aus localStorage laden
    loadDebugModeFromStorage();

    // Debug-Tastenkombinationen aktivieren
    setupDebugHotkeys();

    if (loadStory()) {
      renderStats();
      renderInventory();
      renderStates();
      showStartScreen(); // Startscreen statt direkt Einleitung
    }
  });

})();
