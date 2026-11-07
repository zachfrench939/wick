/* Daily Wick. Same 100 questions for everyone on a UK calendar day.
   Nothing here contacts a server. */
(function (root) {
  "use strict";

  var EPOCH = "2026-11-03";
  var KEY = "wick-daily";

  function londonDate(date) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    function grab(type) {
      for (var i = 0; i < parts.length; i += 1) {
        if (parts[i].type === type) return parts[i].value;
      }
      return "";
    }
    return grab("year") + "-" + grab("month") + "-" + grab("day");
  }

  function dayNumber(dateStr) {
    var day = Date.parse(dateStr + "T12:00:00Z");
    var epoch = Date.parse(EPOCH + "T12:00:00Z");
    return Math.round((day - epoch) / 86400000) + 1;
  }

  function nextMidnight(now) {
    var start = londonDate(now);
    var lo = now.getTime();
    var hi = lo + 26 * 60 * 60 * 1000;
    while (hi - lo > 1000) {
      var mid = Math.floor((lo + hi) / 2);
      if (londonDate(new Date(mid)) === start) lo = mid;
      else hi = mid;
    }
    return hi;
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function orderedBank(bank) {
    return bank.slice().sort(function (a, b) {
      var ha = hash("wick-order:" + a.q);
      var hb = hash("wick-order:" + b.q);
      if (ha !== hb) return ha < hb ? -1 : 1;
      if (a.q < b.q) return -1;
      if (a.q > b.q) return 1;
      return 0;
    });
  }

  /* Each day takes the next block of `count` questions in a fixed order.
     Nearby days do not share questions until every full block has been used. */
  function pickQuestions(bank, dateStr, count) {
    var ordered = orderedBank(bank);
    var slots = Math.floor(ordered.length / count);
    if (slots < 1) slots = 1;
    var dayIndex = dayNumber(dateStr) - 1;
    var block = ((dayIndex % slots) + slots) % slots;
    var start = block * count;
    return ordered.slice(start, start + count).map(function (item, n) {
      var choiceRng = mulberry32(hash("wick-v1:" + dateStr + ":" + n + ":" + item.q));
      return {
        category: item.category,
        q: item.q,
        answer: item.answer,
        choices: shuffle(item.choices.slice(), choiceRng)
      };
    });
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      return false;
    }
  }

  function todayResult(now) {
    var data = read();
    var today = londonDate(now || new Date());
    if (!data || !data.result || data.result.date !== today) return null;
    return data.result;
  }

  function currentStreak(now) {
    var data = read();
    if (!data || !data.lastDate) return 0;
    var today = londonDate(now || new Date());
    if (data.lastDate === today) return data.streak || 0;
    if (dayNumber(today) - dayNumber(data.lastDate) === 1) return data.streak || 0;
    return 0;
  }

  function record(result, now) {
    var today = londonDate(now || new Date());
    var data = read() || {};
    var streak = 1;
    if (data.lastDate === today) streak = data.streak || 1;
    else if (data.lastDate && dayNumber(today) - dayNumber(data.lastDate) === 1) {
      streak = (data.streak || 0) + 1;
    }
    var saved = {
      lastDate: today,
      streak: streak,
      result: {
        date: today,
        dayNumber: dayNumber(today),
        score: result.score,
        answered: result.answered,
        correct: result.correct,
        accuracy: result.accuracy,
        bestStreak: result.bestStreak,
        results: result.results,
        roundSize: result.roundSize
      }
    };
    write(saved);
    return saved;
  }

  function formatRemaining(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  root.WickDaily = {
    EPOCH: EPOCH,
    londonDate: londonDate,
    dayNumber: dayNumber,
    nextMidnight: nextMidnight,
    pickQuestions: pickQuestions,
    todayResult: todayResult,
    currentStreak: currentStreak,
    record: record,
    formatRemaining: formatRemaining
  };
})(window);
