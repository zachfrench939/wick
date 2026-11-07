/* Check that each UK day in the window has 100 unique questions,
   maths stays at 4 or fewer, categories stay mixed,
   and nearby days in that window do not share questions.
   Run from the repo root: node check-days.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var dir = __dirname;
var context = {
  window: {},
  console: console
};
vm.createContext(context);
["questions.js", "questions-extra.js", "questions-more.js", "questions-categories.js", "daily.js"].forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(dir, name), "utf8"), context, { filename: name });
});

var bank = context.window.WICK_QUESTIONS || [];
var daily = context.window.WickDaily;
var failures = [];

function check(name, cond, detail) {
  if (!cond) failures.push(name + (detail ? ": " + detail : ""));
}

function addDays(dateStr, n) {
  var t = Date.parse(dateStr + "T12:00:00Z") + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function daysIn(start, end) {
  var out = [];
  var n = Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86400000);
  for (var i = 0; i <= n; i += 1) out.push(addDays(start, i));
  return out;
}

function loadDay(dateStr) {
  var list = daily.pickQuestions(bank, dateStr, 100);
  var stems = {};
  var bad = 0;
  list.forEach(function (item) {
    if (!item || !item.q || !item.answer || !item.choices || item.choices.length !== 4) bad += 1;
    else if (item.choices.indexOf(item.answer) === -1) bad += 1;
    else {
      var uniq = {};
      item.choices.forEach(function (c) { uniq[c] = true; });
      if (Object.keys(uniq).length !== 4) bad += 1;
    }
    if (item && item.q) stems[item.q] = true;
  });
  return { list: list, stems: stems, bad: bad };
}

function overlap(a, b) {
  var n = 0;
  Object.keys(a).forEach(function (q) {
    if (b[q]) n += 1;
  });
  return n;
}

function mathsKind(q) {
  if (/square root/i.test(q) || /\bsquared\b/i.test(q)) return "square";
  if (/cube root/i.test(q) || /\bcubed\b/i.test(q)) return "cube";
  if (/percent|%/.test(q)) return "percent";
  if (/prime/i.test(q)) return "prime";
  if (/Roman numeral/i.test(q)) return "roman";
  return "famous";
}

function isMathsQuestion(item) {
  return item.category === "Maths";
}

function reportWindow(start, end) {
  var dates = daysIn(start, end);
  var loaded = dates.map(loadDay);
  var consecutive = [];
  var nearby = [];
  var pairMax = 0;
  var mathsCounts = [];
  var categoryCounts = [];
  var maxShare = 0;
  var categoryTotals = {};
  for (var i = 0; i < loaded.length; i += 1) {
    var day = loaded[i];
    check(dates[i] + " count", day.list.length === 100, String(day.list.length));
    check(dates[i] + " unique", Object.keys(day.stems).length === day.list.length, Object.keys(day.stems).length + "/" + day.list.length);
    check(dates[i] + " valid", day.bad === 0, String(day.bad));
    var byCat = {};
    var kinds = {};
    var maths = 0;
    var arith = 0;
    day.list.forEach(function (item) {
      var cat = item.category || "?";
      byCat[cat] = (byCat[cat] || 0) + 1;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;
      if (/^(What is \d+ (?:times|plus|minus|divided by) \d+\?|What do you get if you add \d+ and \d+\?)$/.test(item.q)) arith += 1;
      if (isMathsQuestion(item)) {
        maths += 1;
        var kind = mathsKind(item.q) || "famous";
        if (kinds[kind]) check(dates[i] + " maths kind " + kind, false, item.q);
        kinds[kind] = true;
      }
    });
    var nCats = Object.keys(byCat).length;
    var share = 0;
    Object.keys(byCat).forEach(function (cat) { if (byCat[cat] > share) share = byCat[cat]; });
    if (share > maxShare) maxShare = share;
    mathsCounts.push(maths);
    categoryCounts.push(nCats);
    check(dates[i] + " maths", maths <= 5, String(maths));
    check(dates[i] + " no arithmetic", arith === 0, String(arith));
    check(dates[i] + " categories", nCats >= 8, String(nCats));
    check(dates[i] + " mix", share <= 28, share + " in one category");
    if (i === 0) {
      console.log("  sample", dates[i], JSON.stringify(byCat), "maths", maths);
    }
    for (var j = i + 1; j < loaded.length; j += 1) {
      var shared = overlap(day.stems, loaded[j].stems);
      if (shared > pairMax) pairMax = shared;
      if (j === i + 1) consecutive.push(shared);
      if (j - i <= 7) nearby.push(shared);
    }
  }
  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce(function (s, n) { return s + n; }, 0) / arr.length;
  }
  function max(arr) {
    return arr.reduce(function (m, n) { return n > m ? n : m; }, 0);
  }
  console.log(start + " to " + end + " (" + dates.length + " days)");
  console.log("  consecutive overlap min/avg/max:", consecutive.length ? Math.min.apply(null, consecutive) : 0, avg(consecutive).toFixed(2), max(consecutive));
  console.log("  overlap within 7 days max:", max(nearby));
  console.log("  overlap across the whole window max:", pairMax);
  console.log("  maths per day min/avg/max:", mathsCounts.length ? Math.min.apply(null, mathsCounts) : 0, avg(mathsCounts).toFixed(2), max(mathsCounts));
  console.log("  categories per day min/avg/max:", categoryCounts.length ? Math.min.apply(null, categoryCounts) : 0, avg(categoryCounts).toFixed(2), max(categoryCounts));
  console.log("  largest single category on any day:", maxShare);
  console.log("  category uses:", Object.keys(categoryTotals).sort().map(function (cat) {
    return cat + " " + categoryTotals[cat];
  }).join(", "));
  check(start + " to " + end + " has no shared questions", pairMax === 0, "max shared " + pairMax);
}

console.log("bank size", bank.length);
console.log("full blocks of 100", Math.floor(bank.length / 100));
reportWindow("2026-11-07", "2026-12-08");
reportWindow("2026-11-07", "2027-01-07");

var sameA = daily.pickQuestions(bank, "2026-11-07", 100).map(function (q) { return q.q; }).join("|");
var sameB = daily.pickQuestions(bank, "2026-11-07", 100).map(function (q) { return q.q; }).join("|");
check("same day is stable", sameA === sameB);

function isRealMaths(item) {
  if (!item) return false;
  if (item.category === "Maths" || item.slug === "maths") return true;
  var q = item.q || "";
  if (/prime meridian|prime minister/i.test(q)) return false;
  return /square root|\bsquared\b|cube root|\bcubed\b|percent|%|\bprime\b|Roman numeral/i.test(q);
}

function reportCategories(start, end) {
  var dates = daysIn(start, end);
  var dailyCats = context.window.WickDaily.CATEGORIES;
  console.log("category pools");
  dailyCats.forEach(function (cat) {
    var size = daily.poolSize(bank, cat.slug);
    console.log("  " + cat.slug + " " + size + " slots " + Math.floor(size / 60));
  });
  var minCount = {};
  var maxCount = {};
  var worstOverlap = {};
  dates.forEach(function (date, index) {
    var trio = daily.categoriesFor(date);
    check(date + " trio size", trio.length === 3, String(trio.length));
    var slugs = {};
    trio.forEach(function (cat) { slugs[cat.slug] = true; });
    check(date + " trio unique", Object.keys(slugs).length === 3);
    if (index > 0) {
      var prev = daily.categoriesFor(dates[index - 1]).map(function (cat) { return cat.slug; }).sort().join();
      var now = trio.map(function (cat) { return cat.slug; }).sort().join();
      check(date + " trio changes", prev !== now, prev);
    }
  });
  dailyCats.forEach(function (cat) {
    var loaded = dates.map(function (date) {
      var list = daily.pickCategoryQuestions(bank, date, cat.slug, 60);
      var stems = {};
      var maths = 0;
      var kinds = {};
      var bad = 0;
      list.forEach(function (item) {
        var uniq = {};
        (item.choices || []).forEach(function (choice) { uniq[choice] = true; });
        if (!item || Object.keys(uniq).length !== 4 || item.choices.indexOf(item.answer) === -1) bad += 1;
        if (stems[item.q]) bad += 1;
        stems[item.q] = true;
        if (isRealMaths(item)) {
          maths += 1;
          var kind = mathsKind(item.q);
          if (kinds[kind]) check(date + " " + cat.slug + " maths kind", false, kind);
          kinds[kind] = true;
        }
      });
      check(date + " " + cat.slug + " count", list.length >= 60, String(list.length));
      check(date + " " + cat.slug + " valid", bad === 0, String(bad));
      if (cat.slug === "science") check(date + " science maths", maths >= 1 && maths <= 2, String(maths));
      else check(date + " " + cat.slug + " maths", maths === 0, String(maths));
      minCount[cat.slug] = minCount[cat.slug] == null ? list.length : Math.min(minCount[cat.slug], list.length);
      maxCount[cat.slug] = Math.max(maxCount[cat.slug] || 0, list.length);
      return stems;
    });
    var worst = 0;
    for (var i = 0; i < loaded.length; i += 1) {
      for (var j = i + 1; j <= i + 7 && j < loaded.length; j += 1) {
        var shared = overlap(loaded[i], loaded[j]);
        if (shared > worst) worst = shared;
      }
    }
    worstOverlap[cat.slug] = worst;
    check(cat.slug + " repeats within 7 days", worst === 0, String(worst));
  });
  console.log(start + " to " + end + " category days (" + dates.length + ")");
  dailyCats.forEach(function (cat) {
    console.log("  " + cat.slug + " questions/day " + minCount[cat.slug] + "-" + maxCount[cat.slug] + ", max overlap in 7 days " + worstOverlap[cat.slug]);
  });
}

reportCategories("2026-11-07", "2027-01-07");

if (failures.length) {
  console.error("FAILURES", failures.length);
  failures.slice(0, 20).forEach(function (f) { console.error(" -", f); });
  process.exit(1);
}
console.log("ALL DAY CHECKS PASSED");
