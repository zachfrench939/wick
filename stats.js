/* Daily score comparison via the Supabase REST API. No SDK.
   A failed request resolves quietly so the quiz keeps working. */
(function (root) {
  "use strict";

  var DEVICE_KEY = "wick-device-id";

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

  function deviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (!id && root.crypto && root.crypto.randomUUID) {
        id = root.crypto.randomUUID();
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id || "";
    } catch (err) {
      return "";
    }
  }

  function endpoint(path) {
    return String(settings().url).replace(/\/+$/, "") + path;
  }

  function quiet(res) {
    if (!res) return null;
    if (res.ok) return res.json().catch(function () { return {}; });
    return null;
  }

  function submitDailyScore(dayNumber, score) {
    try {
      if (!configured()) return Promise.resolve({ ok: false, skipped: true });
      var day = Number(dayNumber);
      var value = Math.round(Number(score));
      if (!isFinite(day) || day < 1 || !isFinite(value)) {
        return Promise.resolve({ ok: false, skipped: true });
      }
      if (value < 0) value = 0;
      if (value > 100) value = 100;
      var id = deviceId();
      if (!id) return Promise.resolve({ ok: false, skipped: true });
      return fetch(endpoint("/rest/v1/daily_scores"), {
        method: "POST",
        headers: {
          apikey: settings().key,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ day: day, score: value, device_id: id })
      }).then(function (res) {
        if (res.status === 409) return { ok: true, duplicate: true };
        return res.text().then(function (body) {
          if (res.ok) return { ok: true, duplicate: false };
          if (body && body.indexOf("duplicate") !== -1) return { ok: true, duplicate: true };
          return { ok: false, duplicate: false };
        });
      }).catch(function () {
        return { ok: false, duplicate: false };
      });
    } catch (err) {
      return Promise.resolve({ ok: false, skipped: true });
    }
  }

  function rpc(name, body) {
    if (!configured()) return Promise.resolve(null);
    return fetch(endpoint("/rest/v1/rpc/" + name), {
      method: "POST",
      headers: {
        apikey: settings().key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).then(quiet).then(function (data) {
      if (!data) return null;
      if (Array.isArray(data)) return data[0] || null;
      return data;
    }).catch(function () { return null; });
  }

  function getDailyDistribution(dayNumber) {
    return rpc("daily_distribution", { p_day: Number(dayNumber) });
  }

  function getDailyRank(dayNumber, score) {
    return rpc("daily_rank", { p_day: Number(dayNumber), p_score: Number(score) });
  }

  root.WickStats = {
    configured: configured,
    submitDailyScore: submitDailyScore,
    getDailyDistribution: getDailyDistribution,
    getDailyRank: getDailyRank
  };
})(window);
