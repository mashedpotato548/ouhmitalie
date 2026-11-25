/* Ouhmitalie — petits bonhommes : une tête (photo ou emoji) posée sur un corps costumé. */
(function () {
  'use strict';
  var OUH = window.OUH;
  var INK = '#1F1A17', SKIN = '#E9B48A';

  // Rangs du parcours : chaque rang débloque son costume.
  OUH.RANKS = [
    { id: 'touriste', name: 'Touriste', xp: 0, emoji: '📸' },
    { id: 'pizzaiolo', name: 'Pizzaiolo', xp: 1500, emoji: '🍕' },
    { id: 'gondolier', name: 'Gondolier', xp: 4000, emoji: '🛶' },
    { id: 'gladiateur', name: 'Gladiateur', xp: 8000, emoji: '⚔️' },
    { id: 'centurion', name: 'Centurion', xp: 13000, emoji: '🛡️' },
    { id: 'senateur', name: 'Sénateur', xp: 19000, emoji: '📜' },
    { id: 'doge', name: 'Doge', xp: 26000, emoji: '💍' },
    { id: 'empereur', name: 'Empereur', xp: 35000, emoji: '👑' }
  ];
  OUH.rankIndex = function (xp) {
    var r = 0;
    OUH.RANKS.forEach(function (k, i) { if ((xp || 0) >= k.xp) r = i; });
    return r;
  };

  var S = 'stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"';
  var TORSO = 'M27 9 Q50 1 73 9 L78 52 Q50 60 22 52 Z';

  function baseBody(o) {
    // o : shirt, sleeve, pants, shoes, back (svg derrière), front (svg devant), handL / handR (svg tenu en main)
    var sl = o.sleeve || o.shirt;
    return '<svg class="bob-body" viewBox="-6 -4 112 86" aria-hidden="true">' +
      (o.back || '') +
      '<g ' + S + '>' +
      '<rect x="31" y="48" width="15" height="24" rx="5" fill="' + o.pants + '"/>' +
      '<rect x="54" y="48" width="15" height="24" rx="5" fill="' + o.pants + '"/>' +
      '<ellipse cx="36" cy="74" rx="11" ry="5.5" fill="' + (o.shoes || INK) + '"/>' +
      '<ellipse cx="64" cy="74" rx="11" ry="5.5" fill="' + (o.shoes || INK) + '"/>' +
      '<path class="arm-l" d="M27 14 L9 38" stroke-width="15" stroke="' + INK + '" fill="none"/>' +
      '<path class="arm-r" d="M73 14 L91 38" stroke-width="15" stroke="' + INK + '" fill="none"/>' +
      '</g>' +
      '<path d="M27 14 L9 38" stroke="' + sl + '" stroke-width="9" stroke-linecap="round" fill="none"/>' +
      '<path d="M73 14 L91 38" stroke="' + sl + '" stroke-width="9" stroke-linecap="round" fill="none"/>' +
      '<circle cx="8" cy="40" r="6.5" fill="' + SKIN + '" ' + S + '/>' +
      '<circle cx="92" cy="40" r="6.5" fill="' + SKIN + '" ' + S + '/>' +
      '<path d="' + TORSO + '" fill="' + o.shirt + '" ' + S + '/>' +
      '<clipPath id="tc' + o.uid + '"><path d="' + TORSO + '"/></clipPath>' +
      '<g clip-path="url(#tc' + o.uid + ')">' + (o.front || '') + '</g>' +
      '<path d="' + TORSO + '" fill="none" ' + S + '/>' +
      (o.over || '') +
      '</svg>';
  }

  var uid = 0;
  var BODIES = {
    touriste: function () {
      var f = '';
      [[36, 20], [58, 16], [66, 36], [44, 40], [30, 34], [52, 28]].forEach(function (p, i) {
        f += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + (i % 2 ? '#FFC83D' : '#FF7BAC') + '"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.5" fill="#fff"/>';
      });
      var over = '<path d="M38 6 L46 30 M62 6 L56 30" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
        '<rect x="40" y="28" width="22" height="15" rx="3" fill="#3A3A45" ' + S + '/><circle cx="51" cy="35.5" r="4.5" fill="#9AD0FF" stroke="' + INK + '" stroke-width="2"/>';
      return baseBody({ uid: ++uid, shirt: '#22B8C9', pants: '#F2E2B8', shoes: '#E63B2E', front: f, over: over });
    },
    pizzaiolo: function () {
      var f = '<circle cx="43" cy="24" r="2.2" fill="' + INK + '"/><circle cx="57" cy="24" r="2.2" fill="' + INK + '"/><circle cx="43" cy="36" r="2.2" fill="' + INK + '"/><circle cx="57" cy="36" r="2.2" fill="' + INK + '"/>' +
        '<path d="M34 4 L50 20 L66 4 Z" fill="#E63B2E" stroke="' + INK + '" stroke-width="2.5"/>';
      var over = '<g ' + S + '><circle cx="94" cy="30" r="12" fill="#E9A54B"/></g><circle cx="94" cy="30" r="8.5" fill="#E63B2E"/>' +
        '<circle cx="91" cy="27" r="2.6" fill="#FFFDF6"/><circle cx="97" cy="32" r="2.6" fill="#FFFDF6"/><circle cx="96" cy="25.5" r="1.6" fill="#1E9E5A"/>';
      return baseBody({ uid: ++uid, shirt: '#FFFDF6', pants: '#3A3A45', front: f, over: over });
    },
    gondolier: function () {
      var f = '';
      for (var y = 6; y < 60; y += 12) f += '<rect x="10" y="' + y + '" width="80" height="6" fill="#1D3C8F"/>';
      f += '<rect x="10" y="44" width="80" height="7" fill="#E63B2E"/>';
      var over = '<path d="M93 -2 L93 80" stroke="' + INK + '" stroke-width="6.5" stroke-linecap="round"/><path d="M93 -2 L93 80" stroke="#B9814A" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="92" cy="40" r="6.5" fill="' + SKIN + '" ' + S + '/>';
      return baseBody({ uid: ++uid, shirt: '#FFFDF6', sleeve: '#1D3C8F', pants: '#22222B', front: f, over: over });
    },
    gladiateur: function () {
      var f = '<path d="M24 6 L80 54 L70 58 L20 14 Z" fill="#6B3F22"/><rect x="10" y="40" width="80" height="8" fill="#FFC83D"/><circle cx="50" cy="44" r="4.5" fill="#E63B2E" stroke="' + INK + '" stroke-width="2"/>';
      var over = '<g ' + S + '><circle cx="8" cy="36" r="15" fill="#E63B2E"/><circle cx="8" cy="36" r="5.5" fill="#FFC83D"/></g>';
      return baseBody({ uid: ++uid, shirt: '#B9814A', sleeve: SKIN, pants: '#6B3F22', shoes: '#6B3F22', front: f, over: over });
    },
    centurion: function () {
      var back = '<path d="M20 8 Q50 -2 80 8 L90 66 Q50 74 10 66 Z" fill="#C4271C" ' + S + '/>';
      var f = '<rect x="26" y="6" width="48" height="34" rx="8" fill="#C9D3DE" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M38 16 Q50 24 62 16 M40 28 Q50 34 60 28" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
        '<g stroke="' + INK + '" stroke-width="2" fill="#FFC83D"><rect x="26" y="42" width="10" height="14"/><rect x="38" y="42" width="10" height="14"/><rect x="50" y="42" width="10" height="14"/><rect x="62" y="42" width="10" height="14"/></g>';
      return baseBody({ uid: ++uid, shirt: '#E63B2E', pants: SKIN, shoes: '#6B3F22', back: back, front: f });
    },
    senateur: function () {
      var f = '<path d="M20 2 L34 2 L82 56 L66 60 Z" fill="#7A2E8E"/><path d="M30 30 Q50 40 74 30" stroke="#D9D2C2" stroke-width="2" fill="none"/><path d="M26 42 Q50 52 78 42" stroke="#D9D2C2" stroke-width="2" fill="none"/>';
      var over = '<g ' + S + '><rect x="-2" y="26" width="12" height="24" rx="5" fill="#F6E7B4"/></g>';
      return baseBody({ uid: ++uid, shirt: '#FFFDF6', pants: '#FFFDF6', shoes: '#B9814A', front: f, over: over });
    },
    doge: function () {
      var f = '';
      [[34, 30], [50, 26], [66, 30], [42, 42], [58, 42], [50, 52]].forEach(function (p) {
        f += '<path d="M' + p[0] + ' ' + (p[1] - 4) + ' l3.5 4 l-3.5 4 l-3.5 -4 Z" fill="#C4271C"/>';
      });
      f += '<path d="M20 0 L80 0 L76 18 Q50 26 24 18 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<circle cx="34" cy="10" r="1.6" fill="' + INK + '"/><circle cx="44" cy="15" r="1.6" fill="' + INK + '"/><circle cx="56" cy="15" r="1.6" fill="' + INK + '"/><circle cx="66" cy="10" r="1.6" fill="' + INK + '"/><circle cx="50" cy="8" r="1.6" fill="' + INK + '"/>';
      return baseBody({ uid: ++uid, shirt: '#F0B429', pants: '#C4271C', shoes: '#C4271C', front: f });
    },
    empereur: function () {
      var back = '<path d="M22 8 Q50 -2 78 8 L86 62 Q50 70 14 62 Z" fill="#5B1E7A" ' + S + '/>';
      var f = '<path d="M66 2 L80 2 L34 60 L18 56 Z" fill="#FFC83D"/><rect x="10" y="40" width="80" height="6" fill="#FFC83D"/>';
      var over = '<g ' + S + '><circle cx="92" cy="26" r="9" fill="#FFC83D"/></g><path d="M88 26 h8 M92 22 v8" stroke="' + INK + '" stroke-width="2"/>';
      return baseBody({ uid: ++uid, shirt: '#7A2E8E', pants: '#FFFDF6', shoes: '#FFC83D', back: back, front: f, over: over });
    }
  };

  function laurel(color) {
    var s = '';
    for (var i = 0; i < 7; i++) {
      var a = (-78 + i * 13) * Math.PI / 180, b = (78 - i * 13) * Math.PI / 180;
      [a, b].forEach(function (t, k) {
        if (i === 6 && k === 1) return;
        var x = 50 + 46 * Math.sin(t), y = 58 - 46 * Math.cos(t), rot = t * 180 / Math.PI + (k ? -35 : 35);
        s += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="5.2" ry="10" fill="' + color + '" ' + S + ' transform="rotate(' + rot.toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
      });
    }
    return s;
  }

  // Chapeaux : viewBox 0 0 100 60, le bas du dessin se pose sur le haut de la tête.
  var HATS = {
    touriste: '<g ' + S + '><path d="M20 52 Q18 14 50 14 Q82 14 80 52 Z" fill="#E63B2E"/><path d="M62 50 Q92 42 100 54 Q84 58 62 56 Z" fill="#C4271C"/><circle cx="50" cy="14" r="4" fill="#FFFDF6"/></g>',
    pizzaiolo: '<g ' + S + ' fill="#FFFDF6"><circle cx="30" cy="24" r="16"/><circle cx="70" cy="24" r="16"/><circle cx="50" cy="16" r="18"/><rect x="24" y="30" width="52" height="24" rx="3"/></g><path d="M34 38 v12 M50 36 v14 M66 38 v12" stroke="#D9D2C2" stroke-width="2.5" stroke-linecap="round"/>',
    gondolier: '<g ' + S + '><ellipse cx="50" cy="50" rx="48" ry="8" fill="#F2D27A"/><path d="M26 50 L28 22 Q50 16 72 22 L74 50 Z" fill="#F2D27A"/><path d="M26.5 42 L27 32 Q50 27 73 32 L73.5 42 Q50 37 26.5 42 Z" fill="#E63B2E"/></g>',
    gladiateur: '<g ' + S + '><path d="M40 12 Q50 -6 76 4 Q62 8 60 22 Z" fill="#E63B2E"/><path d="M18 56 Q14 12 50 12 Q86 12 82 56 Z" fill="#C98A3B"/><rect x="14" y="46" width="72" height="10" rx="4" fill="#E9B84A"/></g>',
    centurion: '<g ' + S + '><path d="M4 30 Q8 2 50 2 Q92 2 96 30 Q74 16 50 16 Q26 16 4 30 Z" fill="#E63B2E"/><path d="M18 56 Q14 14 50 14 Q86 14 82 56 Z" fill="#C9D3DE"/><rect x="14" y="46" width="72" height="10" rx="4" fill="#FFC83D"/></g>',
    senateur: laurel('#1E9E5A'),
    doge: '<g ' + S + '><path d="M18 56 Q14 26 40 20 Q50 2 70 4 Q88 10 82 56 Z" fill="#C4271C"/><path d="M16 56 Q16 42 20 40 Q50 32 80 40 Q84 42 84 56 Z" fill="#FFC83D"/><circle cx="50" cy="46" r="5" fill="#22B8C9"/></g>',
    empereur: laurel('#FFC83D')
  };
  // Réglages par chapeau : largeur (× tête) et décalage vertical (× tête)
  var HATFIT = { touriste: [0.9, -0.3], pizzaiolo: [0.86, -0.42], gondolier: [1.12, -0.4], gladiateur: [0.98, -0.3], centurion: [1.04, -0.32], senateur: [1.08, -0.1], doge: [0.9, -0.36], empereur: [1.08, -0.1] };

  
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  OUH.esc = esc;

  var BG = ['#FFC83D', '#22B8C9', '#FF7BAC', '#9B7BFF', '#5CC96B', '#FF8A3D'];
  function hue(pid) { var h = 0; for (var i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) >>> 0; return BG[h % BG.length]; }

  // head : { img } | { emoji } | { letter }
  OUH.headHTML = function (pid, head) {
    if (head.img) return '<span class="head"><img src="' + esc(head.img) + '" alt="" draggable="false"></span>';
    return '<span class="head head-emo" style="background:' + hue(pid) + '"><span>' + esc(head.emoji || head.letter || '?') + '</span></span>';
  };

  // Bonhomme complet. opts : cos, cls (classes d'animation), mini (tête seule)
  OUH.bobHTML = function (pid, head, opts) {
    opts = opts || {};
    var cos = Object.prototype.hasOwnProperty.call(BODIES, opts.cos) ? opts.cos : 'touriste', fit = HATFIT[cos];
    var hat = '<svg class="bob-hat" viewBox="0 0 100 60" style="width:' + (fit[0] * 100) + '%;top:' + (fit[1] * 100) + '%" aria-hidden="true">' + HATS[cos] + '</svg>';
    if (opts.mini) return '<span class="bob bob-mini ' + (opts.cls || '') + '">' + OUH.headHTML(pid, head) + '</span>';
    return '<span class="bob ' + (opts.cls || '') + '"><span class="bob-top">' + OUH.headHTML(pid, head) + hat + '</span>' + BODIES[cos]() + '</span>';
  };
})();
