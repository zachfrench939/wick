"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const rootDir = path.join(__dirname, "..");

function read(name) {
  return fs.readFileSync(path.join(rootDir, name), "utf8");
}

function browserContext(extra) {
  const store = new Map();
  const listeners = {};
  const context = {
    window: null,
    document: {
      title: "Wick — a 1-minute quiz",
      readyState: "complete",
      head: { appendChild: function () {} },
      body: {
        appendChild: function () {},
        insertBefore: function () {},
        classList: { add: function () {}, remove: function () {} }
      },
      getElementById: function () { return null; },
      querySelectorAll: function () { return []; },
      createElement: function () {
      const node = {
        className: "",
        hidden: false,
        textContent: "",
        style: {},
        children: [],
        appendChild: function (child) { node.children.push(child); return child; },
        setAttribute: function () {},
        addEventListener: function () {},
      createTextNode: function (text) { return { textContent: text }; },
        querySelector: function () { return { hidden: true }; },
        querySelectorAll: function () { return []; }
      };
      return node;
    },
      addEventListener: function () {},
      createTextNode: function (text) { return { textContent: text }; }
    },
    location: { hostname: "wickquiz.com", pathname: "/", search: "", hash: "", href: "https://wickquiz.com/" },
    history: { replaceState: function (_s, _t, next) { context.location.hash = String(next).includes("#") ? "#" + String(next).split("#")[1] : ""; context.location.search = ""; } },
    navigator: { doNotTrack: "0", globalPrivacyControl: false },
    localStorage: {
      getItem: function (key) { return store.has(key) ? store.get(key) : null; },
      setItem: function (key, value) { store.set(key, String(value)); },
      removeItem: function (key) { store.delete(key); }
    },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    dispatchEvent: function (event) { (listeners[event.type] || []).forEach(function (fn) { fn(event); }); },
    addEventListener: function (type, fn) { listeners[type] = listeners[type] || []; listeners[type].push(fn); },
    fetch: function () { throw new Error("unexpected network"); },
    Date: Date,
    URLSearchParams: URLSearchParams,
    JSON: JSON,
    Math: Math,
    encodeURIComponent: encodeURIComponent,
    Promise: Promise
  };
  context.window = context;
  Object.assign(context, extra || {});
  context.store = store;
  return context;
}

function load(filename, context) {
  vm.runInNewContext(read(filename), context, { filename: filename });
  return context;
}

test("analytics stays off without consent, off host, signal, query, or endpoint", function () {
  const context = load("analytics.js", browserContext({ WICK_GOATCOUNTER_ENDPOINT: "https://zachfrenchwickquiz.goatcounter.com/count" }));
  const plan = context.WickAnalytics.plan;
  const base = {
    endpoint: "https://zachfrenchwickquiz.goatcounter.com/count",
    analytics: true,
    hostname: "wickquiz.com",
    pathname: "/",
    search: "",
    hash: "",
    doNotTrack: "0",
    globalPrivacyControl: false,
    title: "Wick"
  };
  assert.equal(plan(base).ok, true);
  assert.equal(plan(base).script, "https://gc.zgo.at/count.js");
  assert.equal(plan(Object.assign({}, base, { analytics: false })).reason, "consent");
  assert.equal(plan(Object.assign({}, base, { hostname: "localhost" })).reason, "host");
  assert.equal(plan(Object.assign({}, base, { hostname: "preview.example.com" })).reason, "host");
  assert.equal(plan(Object.assign({}, base, { doNotTrack: "1" })).reason, "signal");
  assert.equal(plan(Object.assign({}, base, { globalPrivacyControl: true })).reason, "signal");
  assert.equal(plan(Object.assign({}, base, { search: "?token=secret" })).reason, "query");
  assert.equal(plan(Object.assign({}, base, { endpoint: "" })).reason, "endpoint");
  assert.equal(plan(Object.assign({}, base, { endpoint: "https://example.goatcounter.com/count" })).reason, "endpoint");
  assert.equal(context.WickAnalytics.normalizeEndpoint("https://ACCOUNT.goatcounter.com/count"), "");
  assert.equal(plan(Object.assign({}, base, { pathname: "/secret-answer" })).reason, "path");
});

test("one count on an allowed production load, and a second start does not add another script", function () {
  const beacons = [];
  let scripts = 0;
  const context = browserContext({
    WICK_GOATCOUNTER_ENDPOINT: "https://zachfrenchwickquiz.goatcounter.com/count",
    WickConsent: { analyticsOn: function () { return true; } }
  });
  context.navigator.sendBeacon = function (url) { beacons.push(url); return true; };
  context.document.createElement = function () {
    const node = {
      id: "",
      async: false,
      src: "",
      setAttribute: function () {},
      addEventListener: function (name, fn) { if (name === "load") node.onload = fn; },
      onload: null
    };
    return node;
  };
  context.document.head.appendChild = function (node) {
    scripts += 1;
    context.goatcounter.get_data = function () {
      return { p: "/", r: "https://evil.test/?token=1", t: "Wick", s: 1920, q: "?token=1", e: false };
    };
    context.goatcounter.count = function (vars) {
      const data = context.goatcounter.get_data(vars);
      if (data.p == null) return;
      const parts = ["p=" + encodeURIComponent(data.p)];
      if (vars.no_session) parts.push("ns=true");
      if (data.r) parts.push("r=" + encodeURIComponent(data.r));
      if (data.s) parts.push("s=" + encodeURIComponent(data.s));
      if (data.q) parts.push("q=" + encodeURIComponent(data.q));
      context.navigator.sendBeacon(context.goatcounter.endpoint + "?" + parts.join("&"));
    };
    nodeLoaded = node;
    if (node.onload) node.onload();
  };
  let nodeLoaded = null;
  load("analytics.js", context);
  assert.equal(scripts, 1);
  assert.equal(beacons.length, 1);
  assert.match(beacons[0], /^https:\/\/zachfrenchwickquiz\.goatcounter\.com\/count\?/);
  assert.match(beacons[0], /p=%2F/);
  assert.match(beacons[0], /ns=true/);
  assert.equal(/[?&](?:s|q|r)=/.test(beacons[0]), false, beacons[0]);
  assert.equal(beacons[0].includes("device"), false);
  const again = context.WickAnalytics.start();
  assert.equal(again.reason, "already");
  assert.equal(beacons.length, 1);
  context.WickAnalytics.stop();
  context.goatcounter.count({ path: "/again" });
  assert.equal(beacons.length, 1);
});

test("consent reject keeps quiz and account storage", function () {
  const context = load("consent.js", browserContext());
  context.localStorage.setItem("wick-daily", "{\"streak\":3}");
  context.localStorage.setItem("wick-device-id", "device-1");
  context.localStorage.setItem("wick-auth-session", "{\"access_token\":\"a\",\"refresh_token\":\"b\"}");
  context.WickConsent.write(false);
  assert.equal(context.WickConsent.analyticsOn(), false);
  assert.equal(context.localStorage.getItem("wick-daily"), "{\"streak\":3}");
  assert.equal(context.localStorage.getItem("wick-device-id"), "device-1");
  assert.equal(context.localStorage.getItem("wick-auth-session").includes("access_token"), true);
  const old = JSON.parse(context.localStorage.getItem("wick-consent"));
  old.at = new Date(Date.now() - context.WickConsent.MAX_AGE_MS - 1000).toISOString();
  context.localStorage.setItem("wick-consent", JSON.stringify(old));
  assert.equal(context.WickConsent.read(), null);
});

test("auth session does not touch the rankings id or user_metadata", async function () {
  const calls = [];
  const context = browserContext({ WICK_AUTH_NO_BOOT: true, SUPABASE_URL: "https://hlnlkcdmtnbzouomcxcg.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" });
  context.localStorage.setItem("wick-device-id", "device-keep");
  context.fetch = function (url, options) {
    calls.push({ url: String(url), body: options.body, auth: options.headers.Authorization });
    if (String(url).includes("grant_type=password")) {
      return Promise.resolve({
        ok: true,
        text: async function () {
          return JSON.stringify({
            access_token: "access-1",
            refresh_token: "refresh-1",
            expires_in: 3600,
            user: { id: "user-1", email: "person@example.com", user_metadata: { role: "admin" } }
          });
        }
      });
    }
    return Promise.resolve({ ok: true, text: async function () { return "{}"; } });
  };
  load("auth.js", context);
  const signed = await context.WickAuth.signIn("person@example.com", "long-password");
  assert.equal(signed.ok, true);
  assert.equal(signed.session.user.email, "person@example.com");
  assert.equal(signed.session.user.role, undefined);
  assert.equal(JSON.parse(context.localStorage.getItem("wick-auth-session")).user.user_metadata, undefined);
  assert.equal(context.localStorage.getItem("wick-device-id"), "device-keep");
  assert.equal(context.WickAuth.emailRedirectTo(), "https://wickquiz.com/auth.html");
  assert.equal(context.WickAuth.safeNext("https://evil.test"), "");
  assert.equal(context.WickAuth.safeNext("//evil.test"), "");
  assert.equal(context.WickAuth.safeNext("/auth.html"), "/auth.html");
  const signupBody = JSON.parse(calls[0] ? calls[0].body : "{}");
  assert.equal(signupBody.password, "long-password");
  assert.equal(signupBody.data, undefined);
  await context.WickAuth.signOut();
  assert.equal(context.localStorage.getItem("wick-auth-session"), null);
  assert.equal(context.localStorage.getItem("wick-device-id"), "device-keep");
});

test("recovery hash is stored without leaving the token in the address", function () {
  const context = browserContext({
    WICK_AUTH_NO_BOOT: true,
    SUPABASE_URL: "https://hlnlkcdmtnbzouomcxcg.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test"
  });
  context.location.pathname = "/auth.html";
  context.location.hash = "#access_token=secret-access&refresh_token=secret-refresh&expires_in=3600&type=recovery";
  load("auth.js", context);
  const result = context.WickAuth.consumeUrlAuth();
  return Promise.resolve(result).then(function (saved) {
    assert.equal(saved.ok, true);
    assert.equal(saved.type, "recovery");
    assert.equal(context.location.hash, "#set-password");
    assert.equal(String(context.location.hash).includes("secret-access"), false);
    assert.equal(context.WickAuth.readSession().access_token, "secret-access");
  });
});

test("pages do not embed GoatCounter unconditionally and do not advertise a checkout", function () {
  ["index.html", "about.html", "privacy.html", "cookies.html", "auth.html"].forEach(function (name) {
    const html = read(name);
    assert.equal(/<script[^>]+src=["'][^"']*gc\.zgo\.at/.test(html), false, name);
    assert.equal(html.includes("data-goatcounter="), false, name);
    assert.equal(/stripe|checkout|buy pro|one-time payment/i.test(html), false, name);
  });
  assert.match(read("config.js"), /https:\/\/zachfrenchwickquiz\.goatcounter\.com\/count/);
  assert.equal(read("auth.js").includes("wick-device-id"), false);
  assert.equal(/\.user_metadata|user_metadata\s*:/.test(read("auth.js")), false);
});
