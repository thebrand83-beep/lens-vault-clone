/* LensVaultPro offline copy - local mock of the Base44 API.
 * The original app is behind a Base44 login. Unauthenticated visitors get HTTP 403
 * {reason:"auth_required"} from the API, which makes the app render its public landing page.
 * This shim reproduces exactly those responses locally, so the ORIGINAL bundle runs unchanged
 * and nothing is ever sent to Base44 (contact form / analytics are simulated, never transmitted). */
(function () {
  var BASE = (window.__LV_BASE__ || '/').replace(/\/?$/, '/');
  try { localStorage.setItem('base44_app_base_url', BASE.replace(/\/$/, '')); } catch (e) {}
  var APP = '69e8ed07921fadc9e44633d0';
  var AUTH = { message: 'You must be logged in to access this app', detail: null, traceback: null,
    extra_data: { app_id: APP, reason: 'auth_required' }, request_id: null };
  var RATES = window.__LV_RATES__ || { base: 'USD', rates: { USD: 1, ILS: 3.7 } };
  var outbox = [];
  window.__LV_OUTBOX__ = outbox; // simulated (unsent) contact-form messages, for inspection only

  function route(method, url, body) {
    var u; try { u = new URL(url, location.href); } catch (e) { return null; }
    if (u.hostname === 'api.exchangerate-api.com') return { status: 200, json: RATES };
    var i = u.pathname.indexOf('/api/');
    if (i < 0 || u.origin !== location.origin) return null;
    var p = u.pathname.slice(i + 4); // e.g. /apps/<id>/entities/User/me
    if (/\/analytics\/track/.test(p)) return { status: 200, json: { accepted: 1 } };
    if (/^\/app-logs\//.test(p)) return { status: 200, json: {} };
    if (/\/integration-endpoints\/Core\/SendEmail$/.test(p)) {
      var data = null; try { data = JSON.parse(body || 'null'); } catch (e) {}
      outbox.push({ at: new Date().toISOString(), data: data });
      console.info('[offline copy] Contact form submission simulated - nothing was sent.', data);
      return { status: 200, json: { status: 'simulated', sent: false }, delay: 900 };
    }
    if (/\/public\/login-info\//.test(p)) return { status: 200, json: { id: APP, name: 'LensVaultPro', slug: 'lens-vault' } };
    if (/\/public\/prod\/domain\//.test(p)) return { status: 200, json: APP };
    // Everything else (public-settings, User/me, entities, functions...) behaves like the live
    // site for a signed-out visitor.
    return { status: 403, json: AUTH };
  }
  window.__LV_ROUTE__ = route;

  // ---- fetch ----
  var realFetch = window.fetch && window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var method = (init && init.method) || (input && input.method) || 'GET';
    var r = route(method, url, init && init.body);
    if (!r) return realFetch(input, init);
    return new Promise(function (res) {
      setTimeout(function () {
        res(new Response(JSON.stringify(r.json), { status: r.status, headers: { 'Content-Type': 'application/json' } }));
      }, r.delay || 30);
    });
  };

  // ---- XMLHttpRequest (axios) ----
  var RealXHR = window.XMLHttpRequest;
  function MockXHR() {
    this._real = null; this._h = {}; this.readyState = 0; this.status = 0; this.statusText = '';
    this.response = null; this.responseText = ''; this.responseURL = ''; this.responseType = '';
    this.timeout = 0; this.withCredentials = false; this._ls = {};
    this.upload = { addEventListener: function () {}, removeEventListener: function () {} };
  }
  var EVENTS = ['readystatechange', 'load', 'error', 'abort', 'timeout', 'loadend', 'loadstart', 'progress'];
  MockXHR.prototype.addEventListener = function (t, f) { (this._ls[t] = this._ls[t] || []).push(f); if (this._real) this._real.addEventListener(t, f); };
  MockXHR.prototype.removeEventListener = function (t, f) { var a = this._ls[t] || []; var k = a.indexOf(f); if (k >= 0) a.splice(k, 1); if (this._real) this._real.removeEventListener(t, f); };
  MockXHR.prototype._emit = function (t) {
    var ev = { type: t, target: this, currentTarget: this };
    if (typeof this['on' + t] === 'function') this['on' + t](ev);
    (this._ls[t] || []).slice().forEach(function (f) { f.call(this, ev); }, this);
  };
  MockXHR.prototype.open = function (method, url) {
    this._method = method; this._url = url; this._args = arguments;
    this.readyState = 1;
  };
  MockXHR.prototype.setRequestHeader = function (k, v) { this._h[k] = v; };
  MockXHR.prototype.getAllResponseHeaders = function () { return this._real ? this._real.getAllResponseHeaders() : 'content-type: application/json\r\n'; };
  MockXHR.prototype.getResponseHeader = function (k) { return this._real ? this._real.getResponseHeader(k) : (/content-type/i.test(k) ? 'application/json' : null); };
  MockXHR.prototype.overrideMimeType = function () {};
  MockXHR.prototype.abort = function () { if (this._real) return this._real.abort(); this._aborted = true; };
  MockXHR.prototype.send = function (body) {
    var self = this, r = route(this._method, this._url, body);
    if (!r) { // pass-through to a real XHR
      var x = this._real = new RealXHR();
      x.open.apply(x, this._args);
      for (var k in this._h) x.setRequestHeader(k, this._h[k]);
      x.responseType = this.responseType; x.timeout = this.timeout; x.withCredentials = this.withCredentials;
      EVENTS.forEach(function (t) {
        x.addEventListener(t, function () {
          ['readyState', 'status', 'statusText', 'response', 'responseURL'].forEach(function (p) { try { self[p] = x[p]; } catch (e) {} });
          try { self.responseText = x.responseText; } catch (e) {}
          self._emit(t);
        });
      });
      return x.send(body);
    }
    setTimeout(function () {
      if (self._aborted) return;
      var txt = JSON.stringify(r.json);
      self.status = r.status; self.statusText = r.status === 200 ? 'OK' : 'Forbidden';
      self.responseText = txt; self.response = self.responseType === 'json' ? r.json : txt;
      self.responseURL = new URL(self._url, location.href).href;
      self.readyState = 4;
      self._emit('readystatechange'); self._emit('load'); self._emit('loadend');
    }, r.delay || 30);
  };
  window.XMLHttpRequest = MockXHR;
})();
