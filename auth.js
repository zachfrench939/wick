/* Optional email and password accounts via Supabase Auth.
   Anonymous play does not create a session.
   This file does not read or write the rankings device id.
   It does not use user_metadata for any decision.
   Passwords are sent to Auth and are not stored here. */
(function (root) {
  "use strict";

  var STORAGE_KEY = "wick-auth-session";
  var REDIRECT = "https://wickquiz.com/auth.html";
  var ALLOWED_NEXT = { "/": true, "/index.html": true, "/auth.html": true, "/about.html": true, "/privacy.html": true, "/cookies.html": true };
  var urlResult = null;

  function settings() {
    return {
      url: root.SUPABASE_URL || "",
      key: root.SUPABASE_PUBLISHABLE_KEY || ""
    };
  }

  function configured() {
    var s = settings();
    return !!(s.url && s.key);
  }

  function emailRedirectTo() {
    return REDIRECT;
  }

  function safeNext(value) {
    if (typeof value !== "string") return "";
    if (value.indexOf("//") !== -1 || value.indexOf("\\") !== -1 || value.indexOf(":") !== -1) return "";
    if (value.charAt(0) !== "/") return "";
    var path = value.split("?")[0].split("#")[0];
    if (ALLOWED_NEXT[path]) return path;
    if (/^\/(about|faq|archive)\/$/.test(path)) return path;
    if (/^\/archive\/\d{4}-\d{2}-\d{2}\/$/.test(path)) return path;
    if (/^\/(geography|history|science|nature|space|film|music|sport|food|language|art|tech)-quiz\/$/.test(path)) return path;
    return "";
  }

  function publicUser(user) {
    if (!user || typeof user !== "object") return null;
    return {
      id: typeof user.id === "string" ? user.id : "",
      email: typeof user.email === "string" ? user.email : ""
    };
  }

  function readSession() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.access_token !== "string" || typeof data.refresh_token !== "string") return null;
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Number(data.expires_at) || 0,
        token_type: "bearer",
        user: publicUser(data.user)
      };
    } catch (err) {
      return null;
    }
  }

  function saveSession(session) {
    if (!session || !session.access_token || !session.refresh_token) return null;
    var stored = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Number(session.expires_at) || (Math.floor(Date.now() / 1000) + (Number(session.expires_in) || 3600)),
      token_type: "bearer",
      user: publicUser(session.user)
    };
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
      return null;
    }
    notify();
    return stored;
  }

  function clearSession() {
    try {
      root.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {}
    notify();
  }

  function notify() {
    try {
      root.dispatchEvent(new root.CustomEvent("wick-auth", { detail: readSession() }));
    } catch (err) {}
  }

  function authBase() {
    return String(settings().url).replace(/\/+$/, "") + "/auth/v1";
  }

  function request(path, options) {
    options = options || {};
    if (!configured()) return Promise.resolve({ ok: false, status: 0, data: { message: "Sign-in is not configured." } });
    var headers = {
      apikey: settings().key,
      "Content-Type": "application/json"
    };
    headers.Authorization = "Bearer " + (options.token || settings().key);
    var fetcher = options.fetch || root.fetch;
    return fetcher(authBase() + path, {
      method: options.method || "POST",
      headers: headers,
      body: options.body == null ? undefined : JSON.stringify(options.body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = {};
        if (text) {
          try { data = JSON.parse(text); } catch (err) { data = { message: text }; }
        }
        return { ok: res.ok, status: res.status, data: data };
      });
    }).catch(function () {
      return { ok: false, status: 0, data: { message: "The account service could not be reached." } };
    });
  }

  function messageFrom(data) {
    if (!data) return "Something went wrong. Try again.";
    var text = data.msg || data.message || data.error_description || data.error || "";
    if (/password/i.test(text) && /least|short|weak|characters/i.test(text)) return "That password was rejected. Use at least 8 characters.";
    if (/rate|too many|once every/i.test(String(text))) return "Please wait a moment, then try again.";
    if (/invalid login|invalid credentials|email or password/i.test(String(text))) return "The email or password was not accepted.";
    if (/confirm|not confirmed/i.test(String(text))) return "Confirm the email before signing in. Check the inbox for the link.";
    if (text) return "The account service did not accept that. Nothing else was changed.";
    return "Something went wrong. Try again.";
  }

  function signUp(email, password, fetcher) {
    var redirect = encodeURIComponent(emailRedirectTo());
    return request("/signup?redirect_to=" + redirect, {
      fetch: fetcher,
      body: { email: email, password: password }
    }).then(function (res) {
      if (!res.ok) return { ok: false, message: messageFrom(res.data), session: null };
      var session = null;
      if (res.data && res.data.access_token) session = saveSession(res.data);
      else if (res.data && res.data.session && res.data.session.access_token) session = saveSession(res.data.session);
      return {
        ok: true,
        needsConfirmation: !session,
        session: session,
        user: publicUser(res.data && (res.data.user || res.data))
      };
    });
  }

  function signIn(email, password, fetcher) {
    return request("/token?grant_type=password", {
      fetch: fetcher,
      body: { email: email, password: password }
    }).then(function (res) {
      if (!res.ok) return { ok: false, message: messageFrom(res.data), session: null };
      return { ok: true, session: saveSession(res.data), message: "" };
    });
  }

  function signOut(fetcher) {
    var current = readSession();
    var done = Promise.resolve();
    if (current) {
      done = request("/logout?scope=local", {
        fetch: fetcher,
        token: current.access_token,
        body: {}
      });
    }
    return done.then(function () {
      clearSession();
      return { ok: true };
    });
  }

  function recover(email, fetcher) {
    var redirect = encodeURIComponent(emailRedirectTo());
    return request("/recover?redirect_to=" + redirect, {
      fetch: fetcher,
      body: { email: email }
    }).then(function () {
      return {
        ok: true,
        message: "If that email can receive a reset, a link will arrive. The link opens this page."
      };
    });
  }

  function verifyTokenHash(tokenHash, type, fetcher) {
    return request("/verify", {
      fetch: fetcher,
      body: { token_hash: tokenHash, type: type }
    }).then(function (res) {
      if (!res.ok) return { ok: false, message: "That link is not valid any more. Request a new one." };
      var session = res.data && res.data.access_token ? saveSession(res.data) : null;
      return { ok: !!session, session: session, type: type, message: session ? "" : "That link did not start a session." };
    });
  }

  function updatePassword(password, fetcher, currentPassword) {
    var current = readSession();
    if (!current) return Promise.resolve({ ok: false, message: "Sign in again before choosing a password." });
    var body = { password: password };
    if (currentPassword) body.current_password = currentPassword;
    return request("/user", {
      method: "PUT",
      fetch: fetcher,
      token: current.access_token,
      body: body
    }).then(function (res) {
      if (!res.ok) return { ok: false, message: messageFrom(res.data) };
      if (res.data && res.data.email) {
        current.user = publicUser(res.data);
        saveSession(current);
      }
      return { ok: true, message: "Password saved on this account." };
    });
  }

  function refresh(fetcher) {
    var current = readSession();
    if (!current) return Promise.resolve(null);
    return request("/token?grant_type=refresh_token", {
      fetch: fetcher,
      body: { refresh_token: current.refresh_token }
    }).then(function (res) {
      if (!res.ok) {
        clearSession();
        return null;
      }
      if (!res.data.user && current.user) res.data.user = current.user;
      return saveSession(res.data);
    });
  }

  function loadUser(fetcher) {
    var current = readSession();
    if (!current) return Promise.resolve(null);
    if (current.user && current.user.email) return Promise.resolve(current);
    return request("/user", {
      method: "GET",
      fetch: fetcher,
      token: current.access_token
    }).then(function (res) {
      if (!res.ok || !res.data) return current;
      current.user = publicUser(res.data);
      return saveSession(current) || current;
    });
  }

  function currentSession(fetcher) {
    var current = readSession();
    if (!current) return Promise.resolve(null);
    var next = current.expires_at && current.expires_at * 1000 - Date.now() < 60000
      ? refresh(fetcher)
      : Promise.resolve(current);
    return next.then(function (session) {
      if (!session) return null;
      if (session.user && session.user.email) return session;
      return loadUser(fetcher);
    });
  }

  function parseHash(hash) {
    var raw = String(hash || "");
    if (raw.charAt(0) === "#") raw = raw.slice(1);
    if (!raw) return null;
    var params = new URLSearchParams(raw);
    if (params.get("error")) {
      return { error: params.get("error_description") || params.get("error") };
    }
    if (!params.get("access_token") || !params.get("refresh_token")) return null;
    return {
      access_token: params.get("access_token"),
      refresh_token: params.get("refresh_token"),
      expires_in: Number(params.get("expires_in")) || 3600,
      type: params.get("type") || "",
      user: null
    };
  }

  function parseAuthQuery(search) {
    var raw = String(search || "");
    if (raw.charAt(0) === "?") raw = raw.slice(1);
    if (!raw) return null;
    var params = new URLSearchParams(raw);
    var tokenHash = params.get("token_hash") || "";
    var type = params.get("type") || "";
    var allowed = { signup: 1, email: 1, recovery: 1, invite: 1, email_change: 1 };
    if (!tokenHash || !allowed[type]) return null;
    return { token_hash: tokenHash, type: type, next: safeNext(params.get("next") || "") };
  }

  function showAuthLanding(kind) {
    var hash = kind === "recovery" ? "#set-password" : "#signed-in";
    var path = (root.location && root.location.pathname) || "";
    var here = /auth\.html$/.test(path);
    try {
      if (here) root.history.replaceState(null, "", path + hash);
      else root.location.assign("auth.html" + hash);
    } catch (err) {}
  }

  function consumeUrlAuth(fetcher) {
    var loc = root.location || { hash: "", search: "", pathname: "/" };
    var fromHash = parseHash(loc.hash);
    var fromQuery = parseAuthQuery(loc.search);
    if (!fromHash && !fromQuery) return Promise.resolve(null);
    try {
      root.history.replaceState(null, "", loc.pathname || "/auth.html");
    } catch (err) {}
    if (fromHash && fromHash.error) {
      urlResult = { ok: false, message: "The email link was rejected." };
      return Promise.resolve(urlResult);
    }
    if (fromHash && fromHash.access_token) {
      showAuthLanding(fromHash.type === "recovery" ? "recovery" : "signed-in");
      var saved = saveSession(fromHash);
      urlResult = { ok: !!saved, session: saved, type: fromHash.type || "" };
      return Promise.resolve(urlResult);
    }
    return verifyTokenHash(fromQuery.token_hash, fromQuery.type, fetcher).then(function (result) {
      result.type = fromQuery.type;
      urlResult = result;
      if (result.ok) showAuthLanding(fromQuery.type === "recovery" ? "recovery" : "signed-in");
      return result;
    });
  }

  function paintLinks() {
    if (!root.document) return;
    var session = readSession();
    Array.prototype.forEach.call(root.document.querySelectorAll("[data-auth-link]"), function (link) {
      link.textContent = session ? "Signed in" : "Account";
    });
  }

  root.addEventListener("wick-auth", paintLinks);

  if (!root.WICK_AUTH_NO_BOOT && root.document) {
    try {
      consumeUrlAuth();
      paintLinks();
    } catch (err) {}
  }

  root.WickAuth = {
    STORAGE_KEY: STORAGE_KEY,
    REDIRECT: REDIRECT,
    configured: configured,
    emailRedirectTo: emailRedirectTo,
    safeNext: safeNext,
    publicUser: publicUser,
    readSession: readSession,
    saveSession: saveSession,
    clearSession: clearSession,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    recover: recover,
    verifyTokenHash: verifyTokenHash,
    updatePassword: updatePassword,
    refresh: refresh,
    currentSession: currentSession,
    parseHash: parseHash,
    parseAuthQuery: parseAuthQuery,
    consumeUrlAuth: consumeUrlAuth,
    loadUser: loadUser,
    urlResult: function () { return urlResult; },
    messageFrom: messageFrom,
    paintLinks: paintLinks
  };
})(window);
