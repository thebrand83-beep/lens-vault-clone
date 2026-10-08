/* Offline replica of the Base44 login screen used by LensVaultPro.
 * Reproduces the three views (Sign in / Create account / Reset password), native field
 * validation and loading states. It NEVER sends credentials anywhere: no network requests are made. */
(function () {
  var BASE = (window.__LV_BASE__ || '/').replace(/\/?$/, '/');
  var root = document.getElementById('root');
  var views = {};
  document.querySelectorAll('template[data-view]').forEach(function (t) { views[t.dataset.view] = t; });
  var SPIN = '<svg style="width:16px;height:16px;animation:lvspin 1s linear infinite;margin-inline-end:6px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

  function notice(card, html, kind) {
    var n = card.querySelector('.lv-notice');
    if (!n) { n = document.createElement('div'); n.className = 'lv-notice'; n.setAttribute('role', 'alert'); }
    var form = card.querySelector('form');
    (form || card).parentNode.insertBefore(n, form || null);
    n.style.cssText = 'margin:0 0 16px;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.45;text-align:center;' +
      (kind === 'error' ? 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca' : 'background:#f8fafc;color:#334155;border:1px solid #e2e8f0');
    n.innerHTML = html;
  }
  var OFFLINE = 'This is an offline copy of LensVaultPro. Sign-in and registration are turned off, so nothing was sent. ' +
    '<a href="' + BASE + '" style="font-weight:500;text-decoration:underline">Back to the home page</a>';

  function show(name) {
    root.innerHTML = '';
    root.appendChild(views[name].content.cloneNode(true));
    var card = root.querySelector('main');
    card.querySelectorAll('button').forEach(function (b) {
      var t = b.textContent.trim();
      if (t === 'Forgot password?') b.onclick = function () { show('forgot'); };
      else if (/Sign up$/.test(t)) b.onclick = function () { show('signup'); };
      else if (t === 'Back to sign in') b.onclick = function () { show('signin'); };
      else if (t === 'Continue with Google') b.onclick = function (e) { e.preventDefault(); notice(card, OFFLINE); };
    });
    var form = card.querySelector('form');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = form.querySelector('#password'), cpw = form.querySelector('#confirmPassword');
      if (name === 'signup') {
        if (pw.value.length < 8) return notice(card, 'Password must be at least 8 characters', 'error');
        if (pw.value !== cpw.value) return notice(card, 'Passwords do not match', 'error');
      }
      var btn = form.querySelector('button[type=submit]'), label = btn.innerHTML;
      btn.disabled = true; form.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      btn.innerHTML = SPIN + ({ signin: 'Signing in...', signup: 'Creating account...', forgot: 'Sending...' }[name]);
      setTimeout(function () {
        btn.disabled = false; btn.innerHTML = label;
        form.querySelectorAll('input').forEach(function (i) { i.disabled = false; if (i.type === 'password') i.value = ''; });
        notice(card, OFFLINE);
      }, 900);
    });
    var first = card.querySelector('input'); if (first) first.focus({ preventScroll: true });
  }
  show('signin');
})();
