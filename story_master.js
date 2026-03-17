// story_master.js
// Sammelt alle Kapitel-Story-Arrays und baut window.storyNodes für die engine.js.

(function () {
  "use strict";

  function safe(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  // Hier können später weitere Kapitel hinzugefügt werden:
  // z.B. ...safe(window.storyNodes_kap2_buch3), ...
  window.storyNodes = [
    ...safe(window.storyNodes_kap1_buch2)
  ];
})();
