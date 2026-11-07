/* Optional GoatCounter page counts.
   The count script is added only when every gate below passes.
   There is no noscript pixel and no second embed in the HTML. */
(function (root) {
  "use strict";

  var SCRIPT_SRC = "https://gc.zgo.at/count.js";
  var SCRIPT_ID = "wick-goatcounter";
  var ALLOWED_PATHS = {
    "/": true,
    "/index.html": true,
    "/about.html": true,
    "/privacy.html": true,
    "/cookies.html": true
  };
  var generation = 0;
  var started = false;

  function normalizeEndpoint(value) {
    if (typeof value !== "string") return "";
    var trimmed = value.trim();
    var match = trimmed.match(/^https:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.goatcounter\.com\/count\/?$/);
    if (!match) return "";
    var code = match[1];
    if (/^(account|yourcode|mycode|example|changeme|placeholder|xxx|test)$/.test(code)) return "";
    return "https://" + code + ".goatcounter.com/count";
  }

  function safePath(pathname) {
    if (typeof pathname !== "string") return "";
    if (pathname.indexOf("?") !== -1 || pathname.indexOf("#") !== -1) return "";
    if (pathname.indexOf("\\") !== -1 || pathname.indexOf("..") !== -1) return "";
    if (!ALLOWED_PATHS[pathname]) return "";
    return pathname;
  }

  function signalOn(env) {
    var dnt = env.doNotTrack;
    if (dnt === "1" || dnt === "yes") return true;
    return env.globalPrivacyControl === true;
  }

  function plan(env) {
    env = env || {};
    var endpoint = normalizeEndpoint(env.endpoint);
    if (!endpoint) return { ok: false, reason: "endpoint" };
    if (env.analytics !== true) return { ok: false, reason: "consent" };
    if (signalOn(env)) return { ok: false, reason: "signal" };
    var host = String(env.hostname || "").toLowerCase();
    if (host !== "wickquiz.com" && host !== "www.wickquiz.com") return { ok: false, reason: "host" };
    if (env.search) return { ok: false, reason: "query" };
    if (env.hash === "#toggle-goatcounter") return { ok: false, reason: "hash" };
    var path = safePath(env.pathname || "/");
    if (!path) return { ok: false, reason: "path" };
    return {
      ok: true,
      endpoint: endpoint,
      script: SCRIPT_SRC,
      path: path,
      title: env.title || "Wick"
    };
  }

  function liveEnv() {
    var consent = root.WickConsent && root.WickConsent.analyticsOn ? root.WickConsent.analyticsOn() : false;
    var nav = root.navigator || {};
    var loc = root.location || { hostname: "", pathname: "/", search: "", hash: "" };
    return {
      endpoint: root.WICK_GOATCOUNTER_ENDPOINT || "",
      analytics: consent === true,
      hostname: loc.hostname,
      pathname: loc.pathname,
      search: loc.search,
      hash: loc.hash,
      doNotTrack: nav.doNotTrack || root.doNotTrack || nav.msDoNotTrack || "",
      globalPrivacyControl: nav.globalPrivacyControl === true,
      title: root.document && root.document.title ? root.document.title : "Wick"
    };
  }

  function harden(gc) {
    if (!gc || gc.__wickHardened || typeof gc.get_data !== "function") return;
    var original = gc.get_data;
    gc.get_data = function (vars) {
      var data = original.call(gc, vars);
      if (!data) return data;
      data.s = "";
      data.q = "";
      data.r = "";
      if (typeof data.p === "string" && (data.p.indexOf("?") !== -1 || data.p.indexOf("#") !== -1)) data.p = null;
      return data;
    };
    gc.__wickHardened = true;
  }

  function stop() {
    generation += 1;
    started = false;
    var doc = root.document;
    if (doc) {
      var existing = doc.getElementById(SCRIPT_ID);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    }
    if (root.goatcounter) {
      try {
        root.goatcounter.no_onload = true;
        root.goatcounter.no_events = true;
        root.goatcounter.count = function () {};
      } catch (err) {}
    }
  }

  function start() {
    try {
      if (started) return { ok: false, reason: "already" };
      var decision = plan(liveEnv());
      if (!decision.ok) return decision;
      var doc = root.document;
      if (!doc || !doc.head || !doc.createElement) return { ok: false, reason: "document" };
      if (doc.getElementById(SCRIPT_ID)) return { ok: false, reason: "already" };
      started = true;
      var token = generation;
      root.goatcounter = {
        no_onload: true,
        no_events: true,
        allow_local: false,
        allow_frame: false,
        endpoint: decision.endpoint,
        path: function () {
          if (token !== generation) return null;
          var again = plan(liveEnv());
          return again.ok ? again.path : null;
        },
        referrer: function () { return ""; },
        title: decision.title
      };
      var script = doc.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = SCRIPT_SRC;
      script.setAttribute("data-goatcounter", decision.endpoint);
      script.addEventListener("error", function () {});
      script.addEventListener("load", function () {
        if (token !== generation) return;
        var again = plan(liveEnv());
        if (!again.ok || !root.goatcounter || typeof root.goatcounter.count !== "function") return;
        try {
          harden(root.goatcounter);
          root.goatcounter.count({
            no_session: true,
            path: again.path,
            referrer: "",
            title: again.title,
            event: false
          });
        } catch (err) {}
      });
      doc.head.appendChild(script);
      return decision;
    } catch (err) {
      return { ok: false, reason: "error" };
    }
  }

  function onConsent(event) {
    var detail = event && event.detail;
    if (detail && detail.analytics === true) start();
    else stop();
  }

  root.addEventListener("wick-consent", onConsent);
  if (root.document && root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  root.WickAnalytics = {
    SCRIPT_SRC: SCRIPT_SRC,
    plan: plan,
    liveEnv: liveEnv,
    start: start,
    stop: stop,
    harden: harden,
    normalizeEndpoint: normalizeEndpoint,
    safePath: safePath
  };
})(window);
