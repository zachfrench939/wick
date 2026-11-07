/* Daily Wick. Each UK day has the same three categories for everyone.
   A free player picks one. Wick Pro, when window.WICK_IS_PRO is true,
   unlocks all three and past days. Nothing here contacts a server. */
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

  function isPro() {
    return root.WICK_IS_PRO === true;
  }

  function todayResult(now) {
    var data = read();
    var today = londonDate(now || new Date());
    var runs = dayRuns(data, today);
    var chosen = dayChosen(data, today);
    if (chosen && runs[chosen]) return runs[chosen];
    var slugs = Object.keys(runs);
    if (slugs.length) return runs[slugs[0]];
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
    if (todayResult(now)) return "";
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
    var date = result.date && result.date <= today ? result.date : today;
    var forToday = date === today;
    if (!forToday && !isPro()) return data;
    if (forToday) {
      var prev = played[today] || { score: 0, correct: -1 };
      if (result.correct >= (prev.correct == null ? -1 : prev.correct)) {
        played[today] = { score: result.score, correct: result.correct, category: result.category || "" };
      }
    }
    var best = Math.max(data.bestDaily || 0, forToday ? streak : (data.streak || 0));
    var run = {
      date: date,
      dayNumber: dayNumber(date),
      category: result.category || "",
      score: result.score,
      answered: result.answered,
      correct: result.correct,
      accuracy: result.accuracy,
      bestStreak: result.bestStreak,
      results: result.results,
      roundSize: result.roundSize
    };
    var days = data.days && typeof data.days === "object" ? data.days : {};
    var bucket = days[date] && typeof days[date] === "object" ? days[date] : {};
    if (!bucket.runs || typeof bucket.runs !== "object") bucket.runs = {};
    if (result.category) bucket.runs[result.category] = run;
    if (!isPro() && forToday) bucket.chosen = bucket.chosen || result.category || "";
    days[date] = bucket;
    var saved = {
      lastDate: forToday ? today : (data.lastDate || ""),
      streak: forToday ? streak : (data.streak || 0),
      bestDaily: forToday ? best : Math.max(data.bestDaily || 0, data.streak || 0),
      grace: forToday ? grace : graceLeft(data),
      covered: forToday ? covered : !!data.covered,
      played: played,
      days: days,
      result: forToday ? run : (data.result || run)
    };
    if (!forToday && data.lastDate) {
      saved.lastDate = data.lastDate;
      saved.streak = data.streak || 0;
      saved.bestDaily = data.bestDaily || 0;
      saved.grace = graceLeft(data);
      saved.covered = !!data.covered;
    }
    write(saved);
    return saved;
  }

  var CATEGORIES = [
    { slug: "geography", emoji: "🌍", name: "Geography", teaser: "Capitals, flags, maps and world landmarks" },
    { slug: "history", emoji: "🏛️", name: "History", teaser: "Empires, battles, monarchs and historic eras" },
    { slug: "science", emoji: "🧪", name: "Science", teaser: "Physics, chemistry, biology and a little maths" },
    { slug: "nature", emoji: "🌿", name: "Nature & Animals", teaser: "Wildlife, oceans, botany and ecosystems" },
    { slug: "space", emoji: "🚀", name: "Space", teaser: "Planets, constellations, moons and cosmic missions" },
    { slug: "film", emoji: "🎬", name: "Film & TV", teaser: "Classic cinema, blockbusters and iconic television" },
    { slug: "music", emoji: "🎵", name: "Music", teaser: "Bands, classical, albums, instruments and hits" },
    { slug: "sport", emoji: "⚽", name: "Sport", teaser: "Football, Olympics, tennis, records and legends" },
    { slug: "food", emoji: "🍲", name: "Food & Drink", teaser: "World cuisine, ingredients, dishes and culinary facts" },
    { slug: "language", emoji: "📚", name: "Language & Words", teaser: "Etymology, idioms, alphabets and vocabulary" },
    { slug: "art", emoji: "🎨", name: "Art & Culture", teaser: "Paintings, literature, mythology and architecture" },
    { slug: "tech", emoji: "💡", name: "Tech & Inventions", teaser: "Pioneering inventors, computing and engineering" }
  ];

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function categoryBySlug(slug) {
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].slug === slug) return CATEGORIES[i];
    }
    return null;
  }

  function shortDate(dateStr) {
    var month = MONTHS[Number(dateStr.slice(5, 7)) - 1] || "";
    return Number(dateStr.slice(8, 10)) + " " + month;
  }

  function categoriesFor(dateStr) {
    var start = dayNumber(dateStr) % CATEGORIES.length;
    var out = [];
    for (var i = 0; i < 3; i += 1) out.push(CATEGORIES[(start + i) % CATEGORIES.length]);
    return out;
  }

  function validQuestion(item) {
    if (!item || !item.q || !item.answer || !item.choices || item.choices.length !== 4) return false;
    if (item.choices.indexOf(item.answer) === -1) return false;
    var seen = {};
    for (var i = 0; i < item.choices.length; i += 1) {
      if (!item.choices[i] || seen[item.choices[i]]) return false;
      seen[item.choices[i]] = true;
    }
    return true;
  }

  function slugOf(item) {
    if (!item) return "";
    if (item.slug && categoryBySlug(item.slug)) return item.slug;
    var q = item.q || "";
    var kind = mathsKind(q);
    if (isArithmetic(q) || item.category === "Maths" || (kind && !/prime meridian|prime minister/i.test(q))) return "maths";
    var name = item.category || "";
    if (name === "Science" && /planet|astronaut|constellation|Milky Way|solar system|comet|asteroid|black hole|light-year|light year|supernova|galaxy|\bMoon\b|NASA|orbit the Sun|dwarf planet|North Star|Big Dipper|Southern Cross/i.test(q)) {
      return "space";
    }
    if (name === "Geography" && /language|person from/i.test(q)) return "language";
    if (name === "UK") {
      if (/battle|war|reigned|invasion|Magna Carta|coronation|Gunpowder|civil war|Act of Union|abdication/i.test(q)) return "history";
      return "geography";
    }
    var mapped = {
      Geography: "geography",
      Capitals: "geography",
      Cities: "geography",
      Flags: "geography",
      Landmarks: "geography",
      Places: "geography",
      History: "history",
      Science: "science",
      Nature: "nature",
      Space: "space",
      "Film & TV": "film",
      Film: "film",
      Music: "music",
      Sport: "sport",
      Food: "food",
      "Food & Drink": "food",
      Language: "language",
      Words: "language",
      Art: "art",
      Stories: "art",
      Inventions: "tech",
      Tech: "tech"
    };
    return mapped[name] || "";
  }

  var poolCache = { bank: null, extra: -1, map: null };

  function buildPools(bank) {
    var extra = root.WICK_CATEGORY_EXTRA || [];
    if (poolCache.map && poolCache.bank === bank && poolCache.extra === extra.length) return poolCache.map;
    var map = {};
    var seen = {};
    function add(item) {
      if (!validQuestion(item) || isArithmetic(item.q)) return;
      var slug = slugOf(item);
      if (!slug) return;
      var key = slug + "\n" + item.q;
      if (seen[key]) return;
      seen[key] = true;
      if (!map[slug]) map[slug] = [];
      map[slug].push(item);
    }
    (bank || []).forEach(add);
    extra.forEach(add);
    poolCache = { bank: bank, extra: extra.length, map: map };
    return map;
  }

  function stripe(ordered, dateStr, count) {
    var slots = Math.floor(ordered.length / count);
    if (slots < 1) slots = 1;
    var block = (dayNumber(dateStr) - 1) % slots;
    var out = [];
    for (var i = block; i < ordered.length && out.length < count; i += slots) out.push(ordered[i]);
    return out;
  }

  function mathsForDay(items, dateStr) {
    var by = {};
    var kinds = [];
    orderedBank(items).forEach(function (item) {
      var kind = mathsKind(item.q) || "famous";
      if (!by[kind]) {
        by[kind] = [];
        kinds.push(kind);
      }
      by[kind].push(item);
    });
    var seq = [];
    var guard = 0;
    while (guard < 10000) {
      var added = false;
      for (var i = 0; i < kinds.length; i += 1) {
        if (by[kinds[i]].length) {
          seq.push(by[kinds[i]].shift());
          added = true;
        }
      }
      if (!added) break;
      guard += 1;
    }
    var pairSlots = Math.max(1, Math.floor(seq.length / 2));
    var pair = (dayNumber(dateStr) - 1) % pairSlots;
    var want = dayNumber(dateStr) % 2 === 0 ? 2 : 1;
    var first = seq[pair * 2];
    var second = seq[pair * 2 + 1];
    var out = [];
    if (first) out.push(first);
    if (want === 2 && second) {
      var kindA = mathsKind(first.q) || "famous";
      var kindB = mathsKind(second.q) || "famous";
      if (kindA !== kindB) out.push(second);
    }
    return out;
  }

  function pickCategoryQuestions(bank, dateStr, slug, count) {
    if (!categoryBySlug(slug)) return [];
    count = count || 60;
    var map = buildPools(bank);
    var base = stripe(orderedBank(map[slug] || []), dateStr, count);
    var extra = slug === "science" ? mathsForDay(map.maths || [], dateStr) : [];
    return shuffle(base.concat(extra), mulberry32(hash("wick-cat:" + dateStr + ":" + slug)));
  }

  function poolSize(bank, slug) {
    var map = buildPools(bank);
    return (map[slug] || []).length;
  }

  function dayBucket(data, date) {
    if (!data || !data.days || typeof data.days !== "object") return null;
    var bucket = data.days[date];
    if (!bucket || typeof bucket !== "object") return null;
    return bucket;
  }

  function dayRuns(data, date) {
    var bucket = dayBucket(data, date);
    if (!bucket || !bucket.runs || typeof bucket.runs !== "object") return {};
    return bucket.runs;
  }

  function dayChosen(data, date) {
    var bucket = dayBucket(data, date);
    return bucket && bucket.chosen ? bucket.chosen : "";
  }

  function dayView(now, dateStr) {
    var today = londonDate(now || new Date());
    var date = dateStr || today;
    var data = read() || {};
    var runs = dayRuns(data, date);
    var chosen = dayChosen(data, date);
    var legacy = !Object.keys(runs).length && data.result && data.result.date === date && !data.result.category;
    var pro = isPro();
    var cats = categoriesFor(date).map(function (cat) {
      var result = runs[cat.slug] || null;
      var state = "open";
      if (result) state = "done";
      else if (date > today) state = "locked";
      else if (!pro && date !== today) state = "locked";
      else if (!pro && (legacy || (chosen && chosen !== cat.slug))) state = "locked";
      else if (!pro && chosen === cat.slug) state = "ready";
      return {
        slug: cat.slug,
        emoji: cat.emoji,
        name: cat.name,
        teaser: cat.teaser,
        state: state,
        result: result
      };
    });
    var played = !!legacy || cats.some(function (cat) { return cat.state === "done"; });
    return {
      date: date,
      today: today,
      dayNumber: dayNumber(date),
      shortDate: shortDate(date),
      pro: pro,
      legacy: !!legacy,
      legacyResult: legacy ? data.result : null,
      chosen: chosen,
      played: played,
      categories: cats,
      tomorrow: categoriesFor(shiftDate(today, 1))
    };
  }

  function canPlay(dateStr, slug, now) {
    var view = dayView(now, dateStr);
    for (var i = 0; i < view.categories.length; i += 1) {
      if (view.categories[i].slug === slug) {
        var state = view.categories[i].state;
        return state === "open" || state === "ready";
      }
    }
    return false;
  }

  function commitCategory(dateStr, slug, now) {
    if (!canPlay(dateStr, slug, now)) return false;
    if (isPro()) return true;
    var data = read() || {};
    if (!data.days || typeof data.days !== "object") data.days = {};
    var bucket = data.days[dateStr] && typeof data.days[dateStr] === "object" ? data.days[dateStr] : {};
    if (!bucket.runs || typeof bucket.runs !== "object") bucket.runs = {};
    bucket.chosen = slug;
    data.days[dateStr] = bucket;
    return write(data);
  }

  function saveTier(now, slug, tier) {
    var data = read();
    if (!data || !tier) return false;
    var today = londonDate(now || new Date());
    var bucket = dayBucket(data, today);
    if (!bucket || !bucket.runs || !bucket.runs[slug]) return false;
    bucket.runs[slug].tierLabel = tier.tierLabel || "";
    bucket.runs[slug].percentileText = tier.text || "";
    if (data.result && data.result.date === today && data.result.category === slug) {
      data.result.tierLabel = tier.tierLabel || "";
      data.result.percentileText = tier.text || "";
    }
    return write(data);
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
    CATEGORIES: CATEGORIES,
    isPro: isPro,
    bestDaily: bestDaily,
    nudge: nudge,
    weekDates: weekDates,
    calendarDates: calendarDates,
    deviceStats: deviceStats,
    londonDate: londonDate,
    dayNumber: dayNumber,
    nextMidnight: nextMidnight,
    shortDate: shortDate,
    categoriesFor: categoriesFor,
    categoryBySlug: categoryBySlug,
    pickQuestions: pickQuestions,
    pickCategoryQuestions: pickCategoryQuestions,
    poolSize: poolSize,
    todayResult: todayResult,
    dayView: dayView,
    canPlay: canPlay,
    commitCategory: commitCategory,
    saveTier: saveTier,
    currentStreak: currentStreak,
    record: record,
    formatRemaining: formatRemaining
  };
})(window);
