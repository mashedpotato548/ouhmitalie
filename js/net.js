/* Ouhmitalie — synchronisation en direct, sans serveur à nous.
   Chaque téléphone publie son propre état (messages « retenus ») sur des brokers MQTT publics gratuits,
   chiffré avec une clé dérivée du code du salon. Plusieurs brokers en parallèle = tolérance aux pannes :
   les messages sont des instantanés complets, donc les doublons sont sans effet. */
(function () {
  'use strict';
  var OUH = window.OUH;

  var DEFAULT_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://mqtt.eclipseprojects.io:443/mqtt'
  ];

  function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(str) { var s = atob(str), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function weakHash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return ('0000000' + h.toString(16)).slice(-8); }

  function Net(opts) {
    this.room = String(opts.room).toUpperCase();
    this.onMessage = opts.onMessage;
    this.onStatus = opts.onStatus || function () { };
    this.onUp = opts.onUp || function () { };
    this.brokers = opts.brokers || DEFAULT_BROKERS;
    this.clients = []; this.up = []; this.retry = [];
    this.queue = Promise.resolve();
    this.key = null; this.base = null; this.stopped = false;
  }

  Net.prototype.start = function () {
    var self = this, enc = new TextEncoder(), subtle = window.crypto && window.crypto.subtle;
    var ready = subtle
      ? Promise.all([
        subtle.digest('SHA-256', enc.encode('ouhmitalie/cle/' + self.room)).then(function (d) { return subtle.importKey('raw', d, 'AES-GCM', false, ['encrypt', 'decrypt']); }),
        subtle.digest('SHA-256', enc.encode('ouhmitalie/salon/' + self.room))
      ]).then(function (r) { self.key = r[0]; self.base = 'ouhm/' + hex(r[1]).slice(0, 20); })
      : Promise.resolve().then(function () { self.base = 'ouhm/clair' + weakHash(self.room) + weakHash(self.room.split('').reverse().join('')); });
    return ready.then(function () {
      self.brokers.forEach(function (_, i) { self._connect(i); });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') self.brokers.forEach(function (_, i) { if (!self.up[i]) self._connect(i); });
      });
    });
  };

  Net.prototype._connect = function (i) {
    var self = this;
    if (self.stopped || typeof Paho === 'undefined') return;
    clearTimeout(self.retry[i]);
    var old = self.clients[i];
    if (old) { old.onConnectionLost = old.onMessageArrived = function () { }; try { old.disconnect(); } catch (e) { } }
    var c;
    try { c = new Paho.Client(self.brokers[i], 'ouh_' + Math.random().toString(36).slice(2, 12)); } catch (e) { return; }
    self.clients[i] = c; self.up[i] = false;
    var again = function () {
      if (self.clients[i] !== c) return;
      self.up[i] = false; self.onStatus(self.status());
      clearTimeout(self.retry[i]);
      self.retry[i] = setTimeout(function () { self._connect(i); }, 2500 + Math.random() * 2500);
    };
    c.onConnectionLost = again;
    c.onMessageArrived = function (m) { self._in(m); };
    try {
      c.connect({
        timeout: 8, keepAliveInterval: 20, cleanSession: true, mqttVersion: 4,
        onSuccess: function () {
          if (self.clients[i] !== c) return;
          self.up[i] = true;
          try { c.subscribe(self.base + '/#', { qos: 0 }); } catch (e) { }
          self.onStatus(self.status());
          self.onUp(i);
        },
        onFailure: again
      });
    } catch (e) { again(); }
  };

  Net.prototype.status = function () { return this.up.filter(Boolean).length; };

  Net.prototype._in = function (m) {
    var self = this, topic = m.destinationName, retained = !!m.retained, raw;
    try { raw = m.payloadString; } catch (e) { return; }
    if (!raw || topic.indexOf(self.base + '/') !== 0) return;
    var parts = topic.slice(self.base.length + 1).split('/');
    self.queue = self.queue.then(function () { return self._open(raw); }).then(function (obj) {
      if (obj && typeof obj === 'object') self.onMessage(parts[0], parts[1] || null, obj, retained);
    }).catch(function () { });
  };

  Net.prototype._open = function (raw) {
    if (raw[0] === 'P' && !this.key) return Promise.resolve(JSON.parse(raw.slice(1)));
    if (raw[0] !== 'E' || !this.key) return Promise.resolve(null);
    var data = unb64(raw.slice(1));
    return window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, this.key, data.slice(12))
      .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  };

  Net.prototype._seal = function (obj) {
    var json = JSON.stringify(obj);
    if (!this.key) return Promise.resolve('P' + json);
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    return window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, this.key, new TextEncoder().encode(json)).then(function (ct) {
      var out = new Uint8Array(12 + ct.byteLength); out.set(iv, 0); out.set(new Uint8Array(ct), 12);
      return 'E' + b64(out);
    });
  };

  // kind : 'g' (partie) · 'p' (joueur) · 'a' (photo d'un joueur ajouté). only = index d'un seul broker.
  Net.prototype.publish = function (kind, id, obj, only) {
    var self = this;
    if (!self.base) return;
    var topic = self.base + '/' + kind + (id ? '/' + id : '');
    self.outq = (self.outq || Promise.resolve()).then(function () { return self._seal(obj); }).then(function (payload) {
      self.clients.forEach(function (c, i) {
        if (only != null && only !== i) return;
        if (!self.up[i]) return;
        try { c.send(topic, payload, 0, true); } catch (e) { }
      });
    }).catch(function () { });
  };

  OUH.Net = Net;
})();
