(function () {
  "use strict";

  var auth = window.WickAuth;
  var statusEl = document.getElementById("auth-status");
  var loadingEl = document.getElementById("auth-loading");
  var signedIn = document.getElementById("panel-signed-in");
  var forms = document.getElementById("panel-forms");
  var passwordPanel = document.getElementById("panel-password");
  var emailEl = document.getElementById("signed-in-email");
  var currentField = document.getElementById("current-password-field");
  var recovery = false;

  function say(text) {
    statusEl.textContent = text || "";
  }

  function show(name) {
    loadingEl.hidden = true;
    signedIn.hidden = name !== "in";
    forms.hidden = name !== "forms";
    passwordPanel.hidden = name !== "password";
  }

  function tab(which) {
    var map = { login: "login-form", signup: "signup-form", reset: "reset-form" };
    Object.keys(map).forEach(function (key) {
      var form = document.getElementById(map[key]);
      var button = document.getElementById("tab-" + key);
      var on = key === which;
      form.hidden = !on;
      button.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function paint() {
    var session = auth.readSession();
    if (session && session.user && session.user.email) {
      emailEl.textContent = session.user.email;
      show(recovery ? "password" : "in");
      currentField.hidden = !!recovery;
      return;
    }
    emailEl.textContent = "";
    show("forms");
  }

  function emailOf(id) {
    return String(document.getElementById(id).value || "").trim();
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validPassword(value) {
    return typeof value === "string" && value.length >= 8 && value.length <= 72;
  }

  document.getElementById("tab-login").addEventListener("click", function () { tab("login"); });
  document.getElementById("tab-signup").addEventListener("click", function () { tab("signup"); });
  document.getElementById("tab-reset").addEventListener("click", function () { tab("reset"); });

  document.getElementById("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var email = emailOf("login-email");
    var password = document.getElementById("login-password").value;
    if (!validEmail(email) || !validPassword(password)) {
      say("Enter an email and a password of 8 to 72 characters.");
      return;
    }
    say("Signing in.");
    auth.signIn(email, password).then(function (result) {
      document.getElementById("login-password").value = "";
      if (!result.ok) {
        say(result.message);
        return;
      }
      recovery = false;
      say("Signed in on this device.");
      paint();
    });
  });

  document.getElementById("signup-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var email = emailOf("signup-email");
    var password = document.getElementById("signup-password").value;
    if (!validEmail(email) || !validPassword(password)) {
      say("Enter an email and a password of 8 to 72 characters.");
      return;
    }
    say("Creating the account.");
    auth.signUp(email, password).then(function (result) {
      document.getElementById("signup-password").value = "";
      if (!result.ok) {
        say(result.message);
        return;
      }
      if (result.needsConfirmation) {
        say("Check that inbox for a confirmation link. It should return to the Wick account page. You can keep playing without waiting.");
        tab("login");
        return;
      }
      recovery = false;
      say("Account created and signed in on this device.");
      paint();
    });
  });

  document.getElementById("reset-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var email = emailOf("reset-email");
    if (!validEmail(email)) {
      say("Enter an email address.");
      return;
    }
    say("Sending the request.");
    auth.recover(email).then(function (result) {
      say(result.message);
    });
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    say("Signing out.");
    auth.signOut().then(function () {
      recovery = false;
      say("Signed out on this device. The quiz on this device is unchanged.");
      paint();
    });
  });

  document.getElementById("show-password-btn").addEventListener("click", function () {
    recovery = false;
    currentField.hidden = false;
    show("password");
    document.getElementById("new-password").focus();
  });

  document.getElementById("password-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var next = document.getElementById("new-password").value;
    var again = document.getElementById("new-password-2").value;
    var current = document.getElementById("current-password").value;
    if (!validPassword(next) || next !== again) {
      say("Enter the same new password twice, with 8 to 72 characters.");
      return;
    }
    say("Saving the password.");
    auth.updatePassword(next, null, recovery ? "" : current).then(function (result) {
      document.getElementById("new-password").value = "";
      document.getElementById("new-password-2").value = "";
      document.getElementById("current-password").value = "";
      say(result.message);
      if (result.ok) {
        recovery = false;
        paint();
      }
    });
  });

  if (location.hash === "#set-password") recovery = true;
  window.addEventListener("wick-auth", function () {
    if (location.hash === "#set-password") recovery = true;
    paint();
  });
  auth.currentSession().then(function () {
    paint();
    if (recovery && auth.readSession()) {
      show("password");
      say("Choose a new password for this account.");
      document.getElementById("new-password").focus();
    } else if (location.hash === "#signed-in" && auth.readSession()) {
      say("Email confirmed. You are signed in on this device.");
    }
  });
})();
