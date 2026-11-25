/* Ouhmitalie — banque de questions.
   Format : OUH.add('theme', [ { id, d (1 facile · 2 moyen · 3 difficile), q, a:[BONNE, fausse, fausse, fausse], e } ])
   La 1re réponse est toujours la bonne : le jeu mélange l'ordre à l'affichage. */
(function (root) {
  var OUH = (root.OUH = root.OUH || {});
  OUH.Q = [];
  OUH.byId = {};
  OUH.add = function (theme, list) {
    list.forEach(function (q) {
      q.t = theme;
      OUH.Q.push(q);
      OUH.byId[q.id] = q;
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
