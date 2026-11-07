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

  function isArithmetic(q) {
    return /^(What is \d+ (?:times|plus|minus|divided by) \d+\?|What do you get if you add \d+ and \d+\?)$/.test(q || "");
  }

  /* Squares and their roots share a kind, and so do cubes, so a day never gets both. */
  function mathsKind(q) {
    var text = q || "";
    if (/square root/i.test(text) || /\bsquared\b/i.test(text)) return "square";
    if (/cube root/i.test(text) || /\bcubed\b/i.test(text)) return "cube";
    if (/percent|%/.test(text)) return "percent";
    if (/prime/i.test(text)) return "prime";
    if (/Roman numeral/i.test(text)) return "roman";
    return "";
  }

  function topicCategory(item) {
    var kind = mathsKind(item.q);
    if (kind || item.category === "Maths") return "Maths";
    var q = item.q || "";
    var category = item.category || "General";
    if (category === "Numbers") return "Measures";
    if (category !== "Geography") return category;
    if (/flag/i.test(q)) return "Flags";
    if (/capital/i.test(q)) return "Capitals";
    if (/currency/i.test(q)) return "Currencies";
    if (/language/i.test(q)) return "Language";
    if (/person from/i.test(q)) return "Words";
    if (/city of|these cities|is a city in|traveller in|world map/i.test(q)) return "Cities";
    if (/river|mountain|ocean|sea|desert|lake|island|strait|canal|waterfall|rainforest|bridge|tower|palace|wall/i.test(q)) return "Landmarks";
    return "Places";
  }

  var KIND_ORDER = ["square", "percent", "roman", "prime", "famous", "cube"];
  var scheduleCache = null;

  function buildSchedule(bank, count) {
    var mathsByKind = { square: [], cube: [], percent: [], prime: [], roman: [], famous: [] };
    var groups = {};
    bank.forEach(function (item) {
      if (!item || !item.q || isArithmetic(item.q)) return;
      var kind = mathsKind(item.q);
      if (kind) mathsByKind[kind].push(item);
      else if (item.category === "Maths") mathsByKind.famous.push(item);
      else {
        var category = topicCategory(item);
        if (!groups[category]) groups[category] = [];
        groups[category].push(item);
      }
    });
    KIND_ORDER.forEach(function (kind) {
      mathsByKind[kind] = orderedBank(mathsByKind[kind]);
    });
    var cats = Object.keys(groups).sort();
    cats.forEach(function (category) {
      groups[category] = orderedBank(groups[category]);
    });
    var mathsTotal = 0;
    KIND_ORDER.forEach(function (kind) { mathsTotal += mathsByKind[kind].length; });
    var restTotal = 0;
    cats.forEach(function (category) { restTotal += groups[category].length; });
    var mathsPer = 4;
    while (mathsPer > 1 && Math.floor(mathsTotal / mathsPer) < 62) mathsPer -= 1;
    var restPer = count - mathsPer;
    var slots = Math.min(Math.floor(mathsTotal / mathsPer), Math.floor(restTotal / restPer));
    if (slots < 1) slots = 1;

    var kindPointers = {};
    KIND_ORDER.forEach(function (kind) { kindPointers[kind] = 0; });
    var days = [];
    for (var s = 0; s < slots; s += 1) days.push([]);
    cats.forEach(function (category, offset) {
      groups[category].forEach(function (item, index) {
        days[(index + offset * 17) % slots].push(item);
      });
    });
    var moved = true;
    while (moved) {
      moved = false;
      var poor = 0;
      var rich = 0;
      for (var i = 1; i < slots; i += 1) {
        if (days[i].length < days[poor].length) poor = i;
        if (days[i].length > days[rich].length) rich = i;
      }
      if (days[poor].length >= restPer) break;
      if (days[rich].length <= days[poor].length) break;
      days[poor].push(days[rich].pop());
      moved = true;
    }
    for (var block = 0; block < slots; block += 1) {
      var buckets = {};
      days[block].forEach(function (item) {
        var category = topicCategory(item);
        if (!buckets[category]) buckets[category] = [];
        buckets[category].push(item);
      });
      var bucketNames = Object.keys(buckets);
      function bucketCount() {
        var total = 0;
        bucketNames.forEach(function (name) { total += buckets[name].length; });
        return total;
      }
      while (bucketCount() > restPer) {
        var biggest = bucketNames[0];
        bucketNames.forEach(function (name) {
          if (buckets[name].length > buckets[biggest].length) biggest = name;
        });
        buckets[biggest].pop();
      }
      var chosen = [];
      bucketNames.forEach(function (name) {
        chosen = chosen.concat(buckets[name]);
      });
      var pickedMaths = [];
      var usedKind = {};
      var look = 0;
      while (pickedMaths.length < mathsPer && look < KIND_ORDER.length * 3) {
        var kind = KIND_ORDER[(block + look) % KIND_ORDER.length];
        look += 1;
        if (usedKind[kind]) continue;
        if (kindPointers[kind] >= mathsByKind[kind].length) continue;
        usedKind[kind] = true;
        pickedMaths.push(mathsByKind[kind][kindPointers[kind]]);
        kindPointers[kind] += 1;
      }
      days[block] = chosen.concat(pickedMaths);
    }
    return days;
  }

  /* Each day is its own block: mixed categories, at most four maths questions,
     and no shared question until every block has been used. */
  function pickQuestions(bank, dateStr, count) {
    if (!scheduleCache || scheduleCache.count !== count || scheduleCache.bank !== bank) {
      scheduleCache = { bank: bank, count: count, days: buildSchedule(bank, count) };
    }
    var days = scheduleCache.days;
    var slots = days.length || 1;
    var dayIndex = dayNumber(dateStr) - 1;
    var block = ((dayIndex % slots) + slots) % slots;
    var list = shuffle(days[block] || [], mulberry32(hash("wick-mix:" + dateStr)));
    return list.map(function (item, n) {
      var choiceRng = mulberry32(hash("wick-v1:" + dateStr + ":" + n + ":" + item.q));
      return {
        category: topicCategory(item),
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

  function shiftDate(dateStr, n) {
    var t = Date.parse(dateStr + "T12:00:00Z") + n * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }

  function playedMap(data) {
    var played = data && data.played;
    if (!played || typeof played !== "object") return {};
    return played;
  }

  function graceLeft(data) {
    if (!data || data.grace == null) return 1;
    return data.grace;
  }

  function dayGap(data, today) {
    if (!data || !data.lastDate) return null;
    return dayNumber(today) - dayNumber(data.lastDate);
  }

  function currentStreak(now) {
    var data = read();
    if (!data || !data.lastDate) return 0;
    var today = londonDate(now || new Date());
    var gap = dayGap(data, today);
    if (gap === 0 || gap === 1) return data.streak || 0;
    if (gap === 2 && graceLeft(data) > 0) return data.streak || 0;
    return 0;
  }

  function nudge(now) {
    var data = read();
    var today = londonDate(now || new Date());
    if (data && data.result && data.result.date === today) return "";
    var streak = currentStreak(now);
    if (!streak) return "";
    var gap = dayGap(data, today);
    if (gap === 2 && graceLeft(data) > 0) {
      return "You missed a day. This one is covered. Play today to keep your " + streak + "-day streak.";
    }
    return "Play today to keep your " + streak + "-day streak.";
  }

  function weekDates(now) {
    var today = londonDate(now || new Date());
    var weekday = new Date(Date.parse(today + "T12:00:00Z")).getUTCDay();
    var sinceMonday = (weekday + 6) % 7;
    var dates = [];
    for (var i = 0; i < 7; i += 1) dates.push(shiftDate(today, i - sinceMonday));
    return dates;
  }

  function calendarDates(now) {
    var today = londonDate(now || new Date());
    var weekday = new Date(Date.parse(today + "T12:00:00Z")).getUTCDay();
    var sinceMonday = (weekday + 6) % 7;
    var start = shiftDate(today, -sinceMonday - 28);
    var dates = [];
    for (var i = 0; i < 35; i += 1) dates.push(shiftDate(start, i));
    return dates;
  }

  function deviceStats(now) {
    var data = read() || {};
    var played = playedMap(data);
    var dates = Object.keys(played);
    var sum = 0;
    var buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    dates.forEach(function (date) {
      var correct = Number(played[date] && played[date].correct);
      if (!isFinite(correct)) correct = 0;
      sum += correct;
      var band = correct >= 100 ? 10 : Math.floor(correct / 10);
      buckets[band] += 1;
    });
    return {
      played: dates.length,
      average: dates.length ? sum / dates.length : null,
      bestStreak: data.bestDaily || 0,
      buckets: buckets,
      grace: graceLeft(data),
      playedMap: played
    };
  }

  function record(result, now) {
    var today = londonDate(now || new Date());
    var data = read() || {};
    var gap = dayGap(data, today);
    var streak = 1;
    var grace = graceLeft(data);
    var covered = false;
    if (data.lastDate === today) streak = data.streak || 1;
    else if (gap === 1) streak = (data.streak || 0) + 1;
    else if (gap === 2 && grace > 0) {
      streak = (data.streak || 0) + 1;
      grace -= 1;
      covered = true;
    }
    if (streak >= 7) grace = Math.max(grace, 1);
    var played = playedMap(data);
    played[today] = { score: result.score, correct: result.correct };
    var best = Math.max(data.bestDaily || 0, streak);
    var saved = {
      lastDate: today,
      streak: streak,
      bestDaily: best,
      grace: grace,
      covered: covered,
      played: played,
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

  var BADGES = [
    { at: 3, name: "3 days" },
    { at: 7, name: "7 days" },
    { at: 14, name: "14 days" },
    { at: 30, name: "30 days" },
    { at: 50, name: "50 days" },
    { at: 100, name: "100 days" }
  ];

  function bestDaily(now) {
    var data = read() || {};
    var current = currentStreak(now);
    return Math.max(data.bestDaily || 0, current || 0);
  }

  root.WickDaily = {
    EPOCH: EPOCH,
    BADGES: BADGES,
    bestDaily: bestDaily,
    nudge: nudge,
    weekDates: weekDates,
    calendarDates: calendarDates,
    deviceStats: deviceStats,
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
