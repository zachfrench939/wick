/* First-party storage choices for Wick. This is not GoatCounter.
   The choice lives in localStorage. This file does not set an HTTP cookie
   and does not load any analytics script. */
(function (root) {
  "use strict";

  var KEY = "wick-consent";
  var VERSION = 1;
  var MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  var lastFocus = null;

  function now() {
    return Date.now();
  }

  function read() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== VERSION || typeof data.analytics !== "boolean" || typeof data.at !== "string") {
        return null;
      }
      var at = Date.parse(data.at);
      if (!isFinite(at) || now() - at > MAX_AGE_MS || at > now() + 60000) return null;
      return { v: VERSION, analytics: data.analytics, at: data.at };
    } catch (err) {
      return null;
    }
  }

  function write(analytics) {
    var data = {
      v: VERSION,
      analytics: !!analytics,
      at: new Date(now()).toISOString()
    };
    try {
      root.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      return null;
    }
    try {
      root.dispatchEvent(new root.CustomEvent("wick-consent", { detail: data }));
    } catch (err) {}
    return data;
  }

  function signalOn() {
    var nav = root.navigator || {};
    var dnt = nav.doNotTrack || root.doNotTrack || nav.msDoNotTrack;
    if (dnt === "1" || dnt === "yes") return true;
    return nav.globalPrivacyControl === true;
  }

  function choice() {
    return read();
  }

  function analyticsOn() {
    var data = read();
    return !!(data && data.analytics === true);
  }

  var banner = null;
  var dialog = null;
  var analyticsInput = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
    document.body.classList.remove("has-cookie-banner");
  }

  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    document.body.classList.add("has-cookie-banner");
    var note = banner.querySelector("[data-signal-note]");
    if (note) note.hidden = !signalOn();
  }

  function syncDialog() {
    if (!analyticsInput) return;
    var data = read();
    analyticsInput.checked = !!(data && data.analytics);
    analyticsInput.disabled = signalOn();
    var note = dialog.querySelector("[data-signal-note]");
    if (note) note.hidden = !signalOn();
  }

  function focusable(container) {
    return Array.prototype.slice.call(container.querySelectorAll("button, [href], input, summary")).filter(function (node) {
      return !node.disabled && node.tabIndex !== -1 && !node.hidden;
    });
  }

  function openDialog() {
    if (!dialog) return;
    lastFocus = document.activeElement;
    syncDialog();
    dialog.hidden = false;
    document.body.classList.add("modal-open");
    var wrap = document.getElementById("wrap");
    if (wrap) wrap.inert = true;
    var first = dialog.querySelector("#cookie-allow") || dialog.querySelector("button");
    if (first) first.focus();
  }

  function closeDialog() {
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    var wrap = document.getElementById("wrap");
    var otherOpen = document.querySelector(".modal:not([hidden])");
    if (!otherOpen) {
      document.body.classList.remove("modal-open");
      if (wrap) wrap.inert = false;
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function decide(analytics) {
    write(!!analytics);
    hideBanner();
    closeDialog();
  }

  function build() {
    banner = el("section", "cookie-banner");
    banner.id = "cookie-banner";
    banner.setAttribute("aria-labelledby", "cookie-title");
    banner.hidden = true;
    var title = el("h2", "cookie-title", "Optional page counts");
    title.id = "cookie-title";
    var copy = el("p", "cookie-copy");
    copy.appendChild(document.createTextNode("Wick can count page loads with GoatCounter if you allow it. The quiz works either way. Allow and reject are equal choices. "));
    var policy = el("a", null, "Cookie and storage notice");
    policy.href = "cookies.html";
    copy.appendChild(policy);
    copy.appendChild(document.createTextNode("."));
    var signal = el("p", "cookie-signal", "Your browser is sending Do Not Track or Global Privacy Control, so page counts stay off even if you allow them.");
    signal.setAttribute("data-signal-note", "");
    signal.hidden = true;
    var actions = el("div", "cookie-actions");
    var reject = el("button", "cookie-choice", "Reject optional");
    reject.type = "button";
    reject.id = "cookie-reject";
    var allow = el("button", "cookie-choice", "Allow optional");
    allow.type = "button";
    allow.id = "cookie-allow";
    actions.appendChild(reject);
    actions.appendChild(allow);
    var settings = el("button", "text-btn cookie-settings", "Cookie settings");
    settings.type = "button";
    settings.id = "cookie-settings";
    banner.appendChild(title);
    banner.appendChild(copy);
    banner.appendChild(signal);
    banner.appendChild(actions);
    banner.appendChild(settings);
    var home = document.getElementById("wrap");
    if (home) home.insertBefore(banner, home.firstChild);
    else document.body.insertBefore(banner, document.body.firstChild);

    dialog = el("div", "modal cookie-modal");
    dialog.id = "cookie-dialog";
    dialog.hidden = true;
    var card = el("div", "modal-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "cookie-dialog-title");
    var heading = el("h2", null, "Cookie settings");
    heading.id = "cookie-dialog-title";
    var intro = el("p", null, "Necessary storage keeps the quiz and this choice on this device. Optional page counts stay off unless you allow them.");
    var necessary = el("label", "cookie-row");
    var necessaryBox = document.createElement("input");
    necessaryBox.type = "checkbox";
    necessaryBox.checked = true;
    necessaryBox.disabled = true;
    necessary.appendChild(necessaryBox);
    var necessaryText = el("span", null, "Necessary. The quiz, your progress, and this choice. Always on while you use the site.");
    necessary.appendChild(necessaryText);
    var optional = el("label", "cookie-row");
    analyticsInput = document.createElement("input");
    analyticsInput.type = "checkbox";
    analyticsInput.id = "cookie-analytics";
    optional.appendChild(analyticsInput);
    optional.appendChild(el("span", null, "Optional page counts. GoatCounter, off until you allow them. Not used for ads."));
    var dialogSignal = el("p", null, "Do Not Track or Global Privacy Control is on, so page counts stay off.");
    dialogSignal.setAttribute("data-signal-note", "");
    dialogSignal.hidden = true;
    var dialogActions = el("div", "cookie-actions");
    var dialogReject = el("button", "cookie-choice", "Reject optional");
    dialogReject.type = "button";
    var dialogAllow = el("button", "cookie-choice", "Allow optional");
    dialogAllow.type = "button";
    dialogActions.appendChild(dialogReject);
    dialogActions.appendChild(dialogAllow);
    var save = el("button", "secondary", "Save settings");
    save.type = "button";
    var close = el("button", "secondary", "Close");
    close.type = "button";
    card.appendChild(heading);
    card.appendChild(intro);
    card.appendChild(necessary);
    card.appendChild(optional);
    card.appendChild(dialogSignal);
    card.appendChild(dialogActions);
    card.appendChild(save);
    card.appendChild(close);
    dialog.appendChild(card);
    document.body.appendChild(dialog);

    reject.addEventListener("click", function () { decide(false); });
    allow.addEventListener("click", function () { decide(true); });
    settings.addEventListener("click", openDialog);
    dialogReject.addEventListener("click", function () { decide(false); });
    dialogAllow.addEventListener("click", function () { decide(true); });
    save.addEventListener("click", function () { decide(analyticsInput.checked); });
    close.addEventListener("click", closeDialog);
    dialog.addEventListener("keydown", function (event) {
      if (dialog.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusable(card);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-manage-cookies]"), function (button) {
      button.addEventListener("click", function () {
        openDialog();
      });
    });
  }

  function boot() {
    build();
    if (read()) hideBanner();
    else showBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  root.WickConsent = {
    KEY: KEY,
    MAX_AGE_MS: MAX_AGE_MS,
    read: read,
    write: write,
    choice: choice,
    analyticsOn: analyticsOn,
    signalOn: signalOn,
    open: openDialog
  };
})(window);
