(function () {
  "use strict";

  var DURATION_MS = 60 * 1000;
  var TIME_BONUS_MS = 2000;
  var SHARE_URL = "https://wickquiz.com";
  var STREAK_MARKS = [3, 5, 10, 15, 20, 25];
  var ROUND_SIZE = 100;
  var ADVANCE_MS = 380;
  var COOLDOWN_MS = 2000;
  var BEST_KEY = "wick-best-score";
  var SOUND_KEY = "wick-sound";

  var wrap = document.getElementById("wrap");
  var screens = {
    start: document.getElementById("screen-start"),
    play: document.getElementById("screen-play"),
    end: document.getElementById("screen-end")
  };
  var categoryCards = document.getElementById("category-cards");
  var pickPrompt = document.getElementById("pick-prompt");
  var dayNote = document.getElementById("day-note");
  var tomorrowLine = document.getElementById("tomorrow-line");
  var homeNudge = document.getElementById("home-nudge");
  var compareHome = document.getElementById("compare-home");
  var practiceSelect = document.getElementById("practice-category");
  var comeBack = document.getElementById("come-back");
  var pickModal = document.getElementById("pick-confirm");
  var pickCopy = document.getElementById("pick-copy");
  var pickYes = document.getElementById("pick-yes");
  var pickNo = document.getElementById("pick-no");
  var proModal = document.getElementById("pro-modal");
  var proCopy = document.getElementById("pro-copy");
  var proSoon = document.getElementById("pro-soon");
  var proNotify = document.getElementById("pro-notify");
  var proClose = document.getElementById("pro-close");
  var rankSwitch = document.getElementById("rank-switch");
  var pendingSlug = "";
  var pendingDate = "";
  var bestScoreEl = document.getElementById("best-score");
  var loadError = document.getElementById("load-error");
  var soundBtn = document.getElementById("sound-toggle");
  var timer = document.getElementById("timer");
  var timerClock = document.getElementById("timer-clock");
  var timePop = document.getElementById("time-pop");
  var comboEl = document.getElementById("combo");
  var sparksEl = document.getElementById("sparks");
  var endTime = document.getElementById("end-time");
  var candle = document.getElementById("candle");
  var openPanel = document.getElementById("daily-open");
  var donePanel = document.getElementById("daily-done");
  var dayOpen = document.getElementById("day-open");
  var dayDone = document.getElementById("day-done");
  var openStreak = document.getElementById("open-streak");
  var doneScore = document.getElementById("done-score");
  var doneAnswered = document.getElementById("done-answered");
  var doneAcc = document.getElementById("done-acc");
  var doneRun = document.getElementById("done-run");
  var doneDaily = document.getElementById("done-daily");
  var nextOpen = document.getElementById("next-open");
  var nextDone = document.getElementById("next-done");
  var nextEnd = document.getElementById("next-end");
  var practiceBtn = document.getElementById("practice-btn");
  var practiceNote = document.getElementById("practice-note");
  var endDaily = document.getElementById("end-daily");
  var confirmCopy = document.getElementById("confirm-copy");
  var counterEl = document.getElementById("counter");
  var scoreEl = document.getElementById("score");
  var streakEl = document.getElementById("streak");
  var categoryEl = document.getElementById("category");
  var questionEl = document.getElementById("question");
  var questionText = document.getElementById("question-text");
  var pop = document.getElementById("pop");
  var choicesEl = document.getElementById("choices");
  var nextBtn = document.getElementById("next-btn");
  var endBtn = document.getElementById("end-btn");
  var endReason = document.getElementById("end-reason");
  var verdictEl = document.getElementById("verdict");
  var endScore = document.getElementById("end-score");
  var endAcc = document.getElementById("end-acc");
  var endCorrect = document.getElementById("end-correct");
  var endStreak = document.getElementById("end-streak");
  var endBest = document.getElementById("end-best");
  var newBestEl = document.getElementById("new-best");
  var gridEl = document.getElementById("grid");
  var shareBtn = document.getElementById("share-btn");
  var shareStatus = document.getElementById("share-status");
  var shareFallback = document.getElementById("share-fallback");
  var shareText = document.getElementById("share-text");
  var againBtn = document.getElementById("again-btn");
  var confirmEl = document.getElementById("confirm");
  var confirmYes = document.getElementById("confirm-yes");
  var confirmNo = document.getElementById("confirm-no");
  var live = document.getElementById("live");

  var mode = "start";
  var deck = [];
  var index = 0;
  var score = 0;
  var streak = 0;
  var bestStreak = 0;
  var correct = 0;
  var answered = 0;
  var results = [];
  var current = null;
  var locked = false;
  var ended = false;
  var endAt = 0;
  var timerId = 0;
  var advanceId = 0;
  var warnedTen = false;
  var soundOn = false;
  var practice = false;
  var runSlug = "";
  var runDate = "";
  var rankSlug = "";
  var blowingOut = false;
  var timeAddedMs = 0;
  var clockId = 0;
  var cooldownUntil = 0;
  var cooldownId = 0;
  var cooldownEl = document.getElementById("cooldown");
  var cooldownLabel = document.getElementById("cooldown-label");
  var cooldownBar = document.getElementById("cooldown-bar");
  var compareEl = document.getElementById("compare");
  var compareDone = document.getElementById("compare-done");
  var audioCtx = null;
  var lastResult = null;

  function readBest() {
    try {
      var raw = localStorage.getItem(BEST_KEY);
      if (raw === null || raw === "") return null;
      var n = Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch (err) {
      return null;
    }
  }

  function writeBest(n) {
    try {
      localStorage.setItem(BEST_KEY, String(n));
      return true;
    } catch (err) {
      return false;
    }
  }

  function formatScore(n) {
    return Number(n).toLocaleString("en-GB");
  }

  function formatClock(ms) {
    return String(Math.ceil(Math.max(0, ms) / 1000));
  }

  function pageUrl() {
    var url = new URL("./", window.location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  }

  function bank() {
    var list = window.WICK_QUESTIONS;
    if (!list || !list.length) return [];
    return list.filter(function (item) {
      return item && item.q && item.answer && item.category &&
        item.choices && item.choices.length === 4 &&
        item.choices.indexOf(item.answer) !== -1;
    });
  }

  function pointsFor(n) {
    if (n >= 4) return 250;
    if (n >= 3) return 200;
    if (n >= 2) return 150;
    return 100;
  }

  function labelFor(n) {
    if (n >= 4) return "BLAZING";
    if (n >= 3) return "SHARP";
    if (n >= 2) return "NICE";
    return "GOT IT";
  }

  function say(text) {
    live.textContent = text;
  }

  function renderBest() {
    var best = readBest();
    bestScoreEl.textContent = best === null ? "—" : formatScore(best);
  }

  function renderSound() {
    soundBtn.textContent = soundOn ? "Sound on" : "Sound off";
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundBtn.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
  }

  function ensureAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") {
        var resumed = audioCtx.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
      }
      return audioCtx;
    } catch (err) {
      return null;
    }
  }

  function blip(steps) {
    if (!soundOn) return;
    try {
      var ctx = ensureAudio();
      if (!ctx) return;
      var now = ctx.currentTime;
      steps.forEach(function (step) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var start = now + (step.at || 0);
        osc.type = step.type || "sine";
        osc.frequency.setValueAtTime(step.freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(step.gain || 0.05, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + step.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + step.dur + 0.02);
      });
    } catch (err) {}
  }

  function showScreen(name) {
    screens.start.hidden = name !== "start";
    screens.play.hidden = name !== "play";
    screens.end.hidden = name !== "end";
    document.body.classList.remove("is-start", "is-play", "is-end");
    document.body.classList.add("is-" + name);
    var playing = name === "play";
    timer.hidden = !playing;
    if (!playing) document.body.classList.remove("is-urgent");
    if (playing) renderCountdown();
  }

  function heatFor(n) {
    if (n >= 25) return 6;
    if (n >= 20) return 5;
    if (n >= 15) return 4;
    if (n >= 10) return 3;
    if (n >= 5) return 2;
    if (n >= 3) return 1;
    return 0;
  }

  function renderCandle(ms) {
    var pct = Math.max(0, Math.min(100, (ms / DURATION_MS) * 100));
    var value = pct + "%";
    candle.style.setProperty("--burn", value);
    document.body.style.setProperty("--burn", value);
    document.body.style.setProperty("--glow", String(pct / 100));
    var out = ms <= 0;
    candle.classList.toggle("is-out", out);
    document.body.classList.toggle("is-out", out);
  }

  function showTimePop() {
    if (!timePop) return;
    timePop.textContent = "+2s";
    timePop.classList.remove("is-show");
    void timePop.offsetWidth;
    timePop.classList.add("is-show");
  }

  function burst() {
    if (!sparksEl) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sparksEl.textContent = "";
    if (reduce) return;
    for (var i = 0; i < 8; i += 1) {
      var bit = document.createElement("i");
      bit.style.setProperty("--x", ((i % 2 === 0 ? -1 : 1) * (8 + (i * 3))) + "px");
      bit.style.setProperty("--y", (-10 - (i % 4) * 6) + "px");
      sparksEl.appendChild(bit);
    }
  }

  function renderBadges(el, days) {
    if (!el || !window.WickDaily || !window.WickDaily.BADGES) return;
    el.textContent = "";
    window.WickDaily.BADGES.forEach(function (badge) {
      var li = document.createElement("li");
      li.className = days >= badge.at ? "is-on" : "";
      li.textContent = badge.name;
      li.title = badge.at + " days in a row";
      el.appendChild(li);
    });
  }

  function countUp(el, target) {
    if (!el) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target < 1) {
      el.textContent = formatScore(target);
      return;
    }
    var start = 0;
    if (window.performance && performance.now) start = performance.now();
    var dur = 700;
    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatScore(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function renderTimer(ms) {
    var low = ms > 0 && ms <= 10000;
    timerClock.textContent = formatClock(ms);
    timer.classList.toggle("is-low", low);
    document.body.classList.toggle("is-urgent", low && ms > 0);
    renderCandle(ms);
  }

  function renderStatus() {
    var prefix = "";
    if (runSlug && window.WickDaily.categoryBySlug(runSlug)) {
      prefix = window.WickDaily.categoryBySlug(runSlug).name.toUpperCase() + " · ";
    }
    counterEl.textContent = prefix + "QUESTION " + index + " OF " + deck.length;
    scoreEl.textContent = "SCORE " + formatScore(score);
    streakEl.textContent = "ANSWER STREAK " + streak;
  }

  function showPop(text, bad) {
    pop.textContent = text;
    pop.classList.toggle("is-bad", !!bad);
    pop.classList.remove("is-show");
    void pop.offsetWidth;
    pop.classList.add("is-show");
  }

  function paintChoices(picked) {
    Array.prototype.forEach.call(choicesEl.children, function (btn) {
      var i = Number(btn.getAttribute("data-i"));
      var text = current.choices[i];
      btn.disabled = true;
      if (text === current.answer) btn.classList.add("is-correct");
      else if (i === picked) btn.classList.add("is-wrong");
      else btn.classList.add("is-idle");
    });
  }

  function renderChoices() {
    choicesEl.textContent = "";
    current.choices.forEach(function (text, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.setAttribute("data-i", String(i));
      var key = document.createElement("span");
      key.className = "key";
      key.setAttribute("aria-hidden", "true");
      key.textContent = String(i + 1);
      var label = document.createElement("span");
      label.className = "choice-text";
      label.textContent = text;
      btn.appendChild(key);
      btn.appendChild(label);
      btn.setAttribute("aria-label", "Answer " + (i + 1) + ": " + text);
      choicesEl.appendChild(btn);
    });
  }

  function showQuestion() {
    if (index >= deck.length) {
      finish("bank");
      return;
    }
    current = deck[index];
    index += 1;
    locked = false;
    mode = "play";
    if (runSlug && window.WickDaily.categoryBySlug(runSlug)) {
      var meta = window.WickDaily.categoryBySlug(runSlug);
      categoryEl.textContent = meta.emoji + " " + meta.name;
    } else {
      categoryEl.textContent = current.category;
    }
    questionText.textContent = current.q;
    pop.textContent = "";
    pop.classList.remove("is-show", "is-bad");
    nextBtn.hidden = true;
    clearCooldown();
    renderChoices();
    renderStatus();
    renderTimer(Math.max(0, endAt - Date.now()));
    if (questionEl.focus) questionEl.focus({ preventScroll: true });
  }

  function clearCooldown() {
    clearInterval(cooldownId);
    cooldownUntil = 0;
    if (cooldownEl) cooldownEl.hidden = true;
  }

  function paintCooldown() {
    var left = cooldownUntil - Date.now();
    if (left < 0) left = 0;
    if (cooldownBar) cooldownBar.style.width = ((left / COOLDOWN_MS) * 100) + "%";
    if (cooldownLabel) cooldownLabel.textContent = "Wait " + Math.max(1, Math.ceil(left / 1000));
  }

  function startCooldown() {
    cooldownUntil = Date.now() + COOLDOWN_MS;
    if (cooldownEl) cooldownEl.hidden = false;
    paintCooldown();
    clearInterval(cooldownId);
    cooldownId = setInterval(paintCooldown, 100);
  }

  function choose(i) {
    if (Date.now() < cooldownUntil) return;
    if (mode !== "play" || locked || !current) return;
    if (i < 0 || i > 3) return;
    var choice = current.choices[i];
    var right = choice === current.answer;
    locked = true;
    mode = "feedback";
    answered += 1;
    results.push(right);
    if (right) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
      var pts = pointsFor(streak);
      score += pts;
      correct += 1;
      endAt += TIME_BONUS_MS;
      timeAddedMs += TIME_BONUS_MS;
      showTimePop();
      candle.classList.remove("is-gain");
      void candle.offsetWidth;
      candle.classList.add("is-gain");
      var mark = STREAK_MARKS.indexOf(streak) !== -1;
      var label = mark ? "On fire x" + streak : labelFor(streak);
      showPop(mark ? label : "+" + pts + " " + label, false);
      if (comboEl) comboEl.textContent = mark ? label : "";
      document.body.setAttribute("data-heat", String(heatFor(streak)));
      candle.setAttribute("data-heat", String(heatFor(streak)));
      if (mark) {
        burst();
        if (soundOn && navigator.vibrate) {
          try { navigator.vibrate([12, 24, 12]); } catch (err) {}
        }
      }
      say("Correct. " + label + ". Plus " + pts + " points. Two seconds added. Streak " + streak + ".");
      blip([
        { freq: 523 + heatFor(streak) * 20, dur: 0.09, gain: 0.05 },
        { freq: 659 + heatFor(streak) * 24, dur: 0.12, gain: 0.05, at: 0.08 }
      ]);
    } else {
      streak = 0;
      if (comboEl) comboEl.textContent = "";
      document.body.setAttribute("data-heat", "0");
      candle.setAttribute("data-heat", "0");
      showPop("NOT QUITE", true);
      say("Not quite. The answer was " + current.answer + ".");
      blip([{ freq: 180, dur: 0.14, gain: 0.045, type: "sine" }]);
    }
    paintChoices(i);
    renderStatus();
    nextBtn.hidden = true;
    clearTimeout(advanceId);
    if (right) {
      clearCooldown();
      advanceId = setTimeout(advance, ADVANCE_MS);
    } else {
      startCooldown();
      advanceId = setTimeout(function () {
        clearCooldown();
        advance();
      }, COOLDOWN_MS);
    }
  }

  function advance() {
    clearTimeout(advanceId);
    if (mode !== "feedback" || ended) return;
    if (Date.now() >= endAt) {
      finish("time");
      return;
    }
    if (index >= deck.length) {
      finish("bank");
      return;
    }
    showQuestion();
  }

  function verdictFor(reason) {
    if (answered === 0) return "The wick is lit. Take a swing.";
    if (answered >= 3 && correct === answered) return "All correct. Clean burn.";
    var pct = correct / answered;
    if (answered >= 8 && pct >= 0.9) return "Brilliant. That wick burned bright.";
    if (answered >= 5 && pct >= 0.75) return "Sharp work. Steady flame.";
    if (pct >= 0.6) return "Solid sprint. Nicely done.";
    if (pct >= 0.4) return "A warm run. Light it again.";
    return "Tricky set. One good answer starts a streak.";
  }

  function reasonLabel(reason) {
    if (reason === "bank") return "All questions done";
    if (reason === "end") return "You ended it";
    return "Time's up";
  }

  function accuracyText() {
    if (!answered) return "—";
    return Math.round((correct / answered) * 100) + "%";
  }

  function buildShare(result) {
    var lines = [];
    if (!result.practice && result.categoryMeta) {
      lines.push("Wick · " + result.shortDate + " · " + result.categoryMeta.emoji + " " + result.categoryMeta.name + " " + result.correct + " 🔥");
    } else if (result.practice) {
      var practiceName = result.categoryMeta ? (" · " + result.categoryMeta.emoji + " " + result.categoryMeta.name) : "";
      lines.push("Wick · Practice" + practiceName);
    } else {
      lines.push("Wick #" + result.dayNumber + ", " + result.correct + " correct");
    }
    if (result.results.length) {
      lines.push("");
      for (var i = 0; i < result.results.length; i += 8) {
        lines.push(result.results.slice(i, i + 8).map(function (ok) {
          return ok ? "🟩" : "🟥";
        }).join(""));
      }
    }
    lines.push("");
    lines.push(SHARE_URL);
    return lines.join("\n");
  }

  function renderGrid(flags) {
    gridEl.textContent = "";
    if (!flags.length) return;
    for (var i = 0; i < flags.length; i += 8) {
      var span = document.createElement("span");
      span.textContent = flags.slice(i, i + 8).map(function (ok) {
        return ok ? "🟩" : "🟥";
      }).join("");
      gridEl.appendChild(span);
    }
  }

  function closeConfirmQuiet() {
    confirmEl.hidden = true;
    document.body.classList.remove("modal-open");
    wrap.inert = false;
  }

  function closeConfirm() {
    closeConfirmQuiet();
    if (mode === "feedback" && !ended) {
      clearTimeout(advanceId);
      var wait = cooldownUntil > Date.now() ? (cooldownUntil - Date.now()) : ADVANCE_MS;
      advanceId = setTimeout(function () {
        clearCooldown();
        advance();
      }, wait);
    }
    if (!screens.play.hidden) endBtn.focus();
  }

  function openConfirm() {
    if (ended || mode === "start" || mode === "end" || mode === "ending") return;
    clearTimeout(advanceId);
    var runName = runSlug && window.WickDaily.categoryBySlug(runSlug);
    confirmCopy.textContent = practice
      ? "This practice run is not scored."
      : ("This is your one scored go" + (runName ? " at " + runName.name : "") + " today.");
    confirmEl.hidden = false;
    document.body.classList.add("modal-open");
    wrap.inert = true;
    confirmYes.focus();
  }

  function tierFromRank(correctCount, dist, rank) {
    var count = Number(dist && dist.count);
    if (!isFinite(count) || count < 1) return null;
    if (count < 5) {
      return {
        tierLabel: "",
        text: "You're one of the first " + count + (count === 1 ? " player" : " players") + " today."
      };
    }
    var fraction = Number(rank && rank.fraction);
    if (!isFinite(fraction)) return null;
    var average = dist.average == null ? "—" : dist.average;
    var label = "";
    var text = "";
    if (fraction >= 0.99) {
      label = "top 1%";
      text = "Top 1%";
    } else if (fraction >= 0.95) {
      label = "top 5%";
      text = "Top 5%";
    } else if (fraction >= 0.9) {
      label = "top 10%";
      text = "Top 10%";
    } else if (fraction >= 0.75) {
      label = "top 25%";
      text = "Top 25%";
    } else if (fraction >= 0.5) {
      label = "better than 50%";
      text = "Better than 50% of players";
    } else {
      text = "Keep going, today's average was " + average + ".";
    }
    if (label) text += ". Today's average is " + average + " across " + count + " players.";
    else text += " " + count + " players today.";
    return { tierLabel: label, text: text };
  }

  function showComparison(el, dayNumber, correctCount, isPractice, doSubmit, category) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    if (isPractice) return;
    var stats = window.WickStats;
    if (!stats || !stats.configured()) return;
    var score = Math.max(0, Math.min(100, Math.round(Number(correctCount)) || 0));
    var start;
    try {
      start = doSubmit ? stats.submitDailyScore(dayNumber, score, category) : Promise.resolve({ ok: true, categorySaved: true });
    } catch (err) {
      return;
    }
    start.then(function (sent) {
      if (doSubmit && sent && sent.ok === false && !sent.duplicate) return null;
      if (category && sent && sent.categorySaved === false) return null;
      return Promise.all([
        stats.getDailyDistribution(dayNumber, category),
        stats.getDailyRank(dayNumber, score, category)
      ]);
    }).then(function (pair) {
      if (!pair || !pair[0] || !pair[1]) return;
      var tier = tierFromRank(score, pair[0], pair[1]);
      if (!tier) return;
      if (lastResult && !lastResult.practice && lastResult.dayNumber === dayNumber && (!category || lastResult.category === category)) {
        lastResult.tierLabel = tier.tierLabel;
      }
      if (category && window.WickDaily.saveTier) window.WickDaily.saveTier(new Date(), category, tier);
      el.hidden = false;
      el.textContent = tier.text;
      if (categoryCards) paintCards(window.WickDaily.dayView(new Date()));
    }).catch(function () {});
  }

  var homeDate = "";
  var streakPanel = document.getElementById("streak-panel");
  var rankPanel = document.getElementById("rank-panel");
  var pillBtn = document.getElementById("streak-pill");
  var pillCount = document.getElementById("pill-count");
  var weekDots = document.getElementById("week-dots");

  function panelOpen() {
    return (streakPanel && !streakPanel.hidden) || (rankPanel && !rankPanel.hidden);
  }

  function setWrapInert(on) {
    wrap.inert = on;
    document.body.classList.toggle("modal-open", on);
  }

  function renderPill() {
    if (!pillBtn || !window.WickDaily) return;
    var now = new Date();
    var daily = window.WickDaily;
    var today = daily.londonDate(now);
    var streak = daily.currentStreak(now);
    var stats = daily.deviceStats(now);
    pillCount.textContent = String(streak);
    pillBtn.setAttribute("aria-label", "Daily streak " + streak + " days. Open details.");
    weekDots.textContent = "";
    daily.weekDates(now).forEach(function (date) {
      var dot = document.createElement("i");
      var played = !!stats.playedMap[date];
      if (date === today && played) dot.className = "is-today is-on";
      else if (date === today) dot.className = "is-today";
      else if (date > today) dot.className = "is-future";
      else if (played) dot.className = "is-on";
      else dot.className = "is-miss";
      weekDots.appendChild(dot);
    });
  }

  function paintPersonal(now) {
    var stats = window.WickDaily.deviceStats(now);
    var list = document.getElementById("personal-stats");
    var hist = document.getElementById("personal-hist");
    if (!list || !hist) return;
    var average = stats.average == null ? "—" : stats.average.toFixed(1);
    list.innerHTML = "";
    [
      ["Played", String(stats.played)],
      ["Average correct", average],
      ["Best score", document.getElementById("best-score").textContent],
      ["Longest streak", String(stats.bestStreak)]
    ].forEach(function (row) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.textContent = row[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      list.appendChild(wrap);
    });
    hist.textContent = "";
    var max = stats.buckets.reduce(function (m, n) { return n > m ? n : m; }, 0);
    stats.buckets.forEach(function (n) {
      var bar = document.createElement("i");
      bar.style.height = (max ? Math.max(8, Math.round((n / max) * 100)) : 8) + "%";
      hist.appendChild(bar);
    });
  }

  function paintCalendar(now) {
    var box = document.getElementById("streak-calendar");
    if (!box) return;
    var daily = window.WickDaily;
    var today = daily.londonDate(now);
    var stats = daily.deviceStats(now);
    box.textContent = "";
    ["M", "T", "W", "T", "F", "S", "S"].forEach(function (label) {
      var head = document.createElement("span");
      head.className = "cal-head";
      head.textContent = label;
      box.appendChild(head);
    });
    daily.calendarDates(now).forEach(function (date) {
      var cell = document.createElement(date < today ? "button" : "span");
      cell.className = "cal-day";
      if (cell.tagName === "BUTTON") cell.type = "button";
      if (stats.playedMap[date]) cell.classList.add("is-on");
      if (date === today) cell.classList.add("is-today");
      if (date > today) cell.classList.add("is-future");
      cell.textContent = String(Number(date.slice(8)));
      var names = daily.categoriesFor(date).map(function (cat) { return cat.emoji + " " + cat.name; }).join(", ");
      cell.title = date + (stats.playedMap[date] ? " played" : "") + ". " + names;
      if (date < today) {
        cell.addEventListener("click", function () {
          if (daily.isPro()) {
            var playable = daily.categoriesFor(date).filter(function (cat) {
              return daily.canPlay(date, cat.slug, now);
            });
            if (!playable.length) return;
            pendingSlug = playable[0].slug;
            pendingDate = date;
            pickCopy.textContent = "Play " + playable[0].name + " from " + daily.shortDate(date) + "?";
            pickYes.textContent = "Play " + playable[0].name;
            closeStreakPanel();
            openPick();
            return;
          }
          closeStreakPanel();
          openPro(daily.shortDate(date) + " had " + names + ". Playing a past day is part of Wick Pro, coming soon.");
        });
      }
      box.appendChild(cell);
    });
  }

  function openStreakPanel() {
    if (!streakPanel) return;
    if (rankPanel) rankPanel.hidden = true;
    var now = new Date();
    var daily = window.WickDaily;
    var streak = daily.currentStreak(now);
    var stats = daily.deviceStats(now);
    document.getElementById("streak-now").textContent = streak + (streak === 1 ? " day in a row." : " days in a row.");
    document.getElementById("streak-best").textContent = "Best streak: " + stats.bestStreak + ".";
    var note = document.getElementById("streak-note");
    note.textContent = daily.nudge(now) || (daily.todayResult(now) ? "Come back tomorrow for new categories." : "One scored category each day.");
    var next = null;
    daily.BADGES.forEach(function (badge) {
      if (!next && streak < badge.at) next = badge;
    });
    document.getElementById("streak-next").textContent = next
      ? "Next badge at " + next.at + " days. " + (next.at - streak) + " to go."
      : "You have every streak badge.";
    renderBadges(document.getElementById("panel-badges"), daily.bestDaily(now));
    paintCalendar(now);
    paintPersonal(now);
    streakPanel.hidden = false;
    setWrapInert(true);
    document.getElementById("streak-close").focus();
  }

  function closeStreakPanel() {
    if (!streakPanel) return;
    streakPanel.hidden = true;
    if (!rankPanel || rankPanel.hidden) setWrapInert(false);
    if (pillBtn) pillBtn.focus();
  }

  function bandLabel(score) {
    if (score >= 0.99) return "Top 1%";
    if (score >= 0.95) return "Top 5%";
    if (score >= 0.9) return "Top 10%";
    if (score >= 0.75) return "Top 25%";
    if (score >= 0.5) return "Top 50%";
    return "Below the middle";
  }

  function round1(n) {
    var v = Number(n);
    if (!isFinite(v)) return "—";
    return (Math.round(v * 10) / 10).toString();
  }

  function paintRank(dist, rank, yours) {
    var bars = document.getElementById("rank-bars");
    var you = document.getElementById("rank-you");
    var summary = document.getElementById("rank-summary");
    var stats = document.getElementById("rank-stats");
    bars.textContent = "";
    stats.innerHTML = "";
    var count = Number(dist && dist.count);
    if (!dist || !isFinite(count) || count < 1) {
      summary.textContent = "No scored results for this category yet. Practice is not included.";
      you.textContent = "";
      return;
    }
    summary.textContent = "No names. These are today's scores only.";
    var cuts = [0, dist.p50, dist.p75, dist.p90, dist.p95, dist.p99, 100].map(function (n) {
      var v = Number(n);
      return isFinite(v) ? v : 0;
    });
    var shares = [50, 25, 15, 5, 4, 1];
    var names = ["Lower half", "50–75", "75–90", "90–95", "95–99", "Top 1%"];
    var here = -1;
    if (yours != null) {
      for (var i = 0; i < 6; i += 1) {
        if (yours >= cuts[i] && (i === 5 || yours < cuts[i + 1] || cuts[i + 1] === cuts[i])) here = i;
      }
      if (here < 0) here = yours >= cuts[5] ? 5 : 0;
    }
    shares.forEach(function (share, i) {
      var col = document.createElement("div");
      col.className = "rank-col" + (i === here ? " is-you" : "");
      var bar = document.createElement("i");
      bar.style.height = Math.max(8, share * 1.6) + "px";
      var cap = document.createElement("span");
      cap.textContent = names[i];
      col.appendChild(bar);
      col.appendChild(cap);
      if (i === here) {
        var mark = document.createElement("em");
        mark.textContent = "You";
        col.appendChild(mark);
      }
      bars.appendChild(col);
    });
    var fraction = rank ? Number(rank.fraction) : NaN;
    if (yours == null) you.textContent = "Play today's Wick to mark your place.";
    else if (!isFinite(fraction)) you.textContent = "Your score is in. The rank is still loading.";
    else you.textContent = "You are here: " + yours + " correct. " + bandLabel(fraction) + ".";
    [
      ["Players", String(count)],
      ["Average", round1(dist.average)],
      ["99th percentile", round1(dist.p99)]
    ].forEach(function (row) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.textContent = row[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      stats.appendChild(wrap);
    });
  }

  function loadRank(day, slug, yours) {
    var retry = document.getElementById("rank-retry");
    if (retry) retry.hidden = true;
    document.getElementById("rank-summary").textContent = "Loading today's scores.";
    window.WickStats.getDailyDistribution(day, slug).then(function (dist) {
      if (!dist) {
        document.getElementById("rank-summary").textContent = "Category rankings are not available yet.";
        var retryEarly = document.getElementById("rank-retry");
        if (retryEarly) retryEarly.hidden = false;
        document.getElementById("rank-you").textContent = "";
        document.getElementById("rank-bars").textContent = "";
        document.getElementById("rank-stats").textContent = "";
        return;
      }
      var next = yours == null ? Promise.resolve(null) : window.WickStats.getDailyRank(day, yours, slug);
      return next.then(function (rank) { paintRank(dist, rank, yours); });
    }).catch(function () {
      document.getElementById("rank-summary").textContent = "Today's scores could not be loaded.";
      var retry = document.getElementById("rank-retry");
      if (retry) retry.hidden = false;
    });
  }

  function openRankPanel(slug) {
    if (!rankPanel || !window.WickStats) return;
    if (streakPanel) streakPanel.hidden = true;
    rankPanel.hidden = false;
    setWrapInert(true);
    document.getElementById("rank-close").focus();
    var now = new Date();
    var daily = window.WickDaily;
    var today = daily.londonDate(now);
    var day = daily.dayNumber(today);
    var view = daily.dayView(now);
    if (!slug) slug = (view.categories.filter(function (cat) { return cat.result; })[0] || view.categories[0]).slug;
    rankSlug = slug;
    if (rankSwitch) {
      rankSwitch.textContent = "";
      view.categories.forEach(function (cat) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = cat.slug === rankSlug ? "is-on" : "";
        btn.textContent = cat.emoji + " " + cat.name;
        btn.addEventListener("click", function () { openRankPanel(cat.slug); });
        rankSwitch.appendChild(btn);
      });
    }
    var yours = null;
    view.categories.forEach(function (cat) {
      if (cat.slug === rankSlug && cat.result) yours = cat.result.correct;
    });
    if (!window.WickStats.configured()) {
      document.getElementById("rank-summary").textContent = "Score comparison is not switched on.";
      return;
    }
    loadRank(day, rankSlug, yours);
  }

  function closeRankPanel() {
    if (!rankPanel) return;
    rankPanel.hidden = true;
    setWrapInert(false);
    if (pillBtn) pillBtn.focus();
  }

  function renderCountdown() {
    var now = new Date();
    var today = window.WickDaily.londonDate(now);
    if (homeDate && today !== homeDate && mode !== "play" && mode !== "feedback" && mode !== "ending" && mode !== "starting") {
      paintHome();
      return;
    }
    var left = window.WickDaily.nextMidnight(now) - now.getTime();
    var clock = window.WickDaily.formatRemaining(Math.max(0, left));
    var fresh = "New Wick in " + clock;
    var played = !!window.WickDaily.todayResult(now);
    var hint = window.WickDaily.nudge(now);
    nextDone.textContent = fresh;
    nextEnd.textContent = fresh;
    nextOpen.textContent = played ? fresh : (hint || "A new Wick starts at midnight.");
    renderPill();
  }

  function fillPractice() {
    if (!practiceSelect || practiceSelect.options.length) return;
    var mixed = document.createElement("option");
    mixed.value = "";
    mixed.textContent = "Mixed questions";
    practiceSelect.appendChild(mixed);
    window.WickDaily.CATEGORIES.forEach(function (cat) {
      var opt = document.createElement("option");
      opt.value = cat.slug;
      opt.textContent = cat.emoji + " " + cat.name;
      practiceSelect.appendChild(opt);
    });
  }

  function tomorrowText(view) {
    return "Tomorrow: " + view.tomorrow.map(function (cat) {
      return cat.emoji + " " + cat.name;
    }).join(" · ");
  }

  function paintCards(view) {
    if (!categoryCards || !view) return;
    categoryCards.textContent = "";
    view.categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-card is-" + cat.state;
      var emoji = document.createElement("span");
      emoji.className = "category-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = cat.emoji;
      var copy = document.createElement("span");
      copy.className = "category-copy";
      var name = document.createElement("span");
      name.className = "category-name";
      name.textContent = cat.name;
      var teaser = document.createElement("span");
      teaser.className = "category-teaser";
      teaser.textContent = cat.teaser;
      var status = document.createElement("span");
      status.className = "category-status";
      if (cat.state === "done" && cat.result) {
        status.textContent = "Done · " + cat.result.correct + (cat.result.tierLabel ? " · " + cat.result.tierLabel : "");
      } else if (cat.state === "locked") {
        status.textContent = view.date === view.today ? "Closed today" : "Not open";
      } else {
        status.textContent = "Start";
      }
      copy.appendChild(name);
      copy.appendChild(teaser);
      copy.appendChild(status);
      btn.appendChild(emoji);
      btn.appendChild(copy);
      var label = cat.emoji + " " + cat.name + ". " + status.textContent;
      btn.setAttribute("aria-label", label);
      btn.addEventListener("click", function () {
        if (cat.state === "locked") {
          openPro(view.date === view.today
            ? "You score one category today. The others stay closed until tomorrow. Practice does not use this pick."
            : "Past days stay closed. Today's three are the free game.");
          return;
        }
        if (cat.state === "done") return;
        pendingSlug = cat.slug;
        pendingDate = view.today;
        if (window.WickDaily.isPro()) {
          pickCopy.textContent = "Play " + cat.name + "?";
        } else {
          pickCopy.textContent = "Play " + cat.name + " as today's scored category? The other two close after you confirm. Practice will not do this.";
        }
        pickYes.textContent = "Play " + cat.name;
        openPick();
      });
      categoryCards.appendChild(btn);
    });
  }

  function openPick() {
    if (!pickModal) return;
    pickModal.hidden = false;
    document.body.classList.add("modal-open");
    if (wrap) wrap.inert = true;
    pickYes.focus();
  }

  function closePick() {
    if (!pickModal) return;
    pickModal.hidden = true;
    if ((!proModal || proModal.hidden) && confirmEl.hidden && !panelOpen()) {
      document.body.classList.remove("modal-open");
      if (wrap) wrap.inert = false;
    }
  }

  function openPro(message) {
    if (!proModal) return;
    if (proCopy) proCopy.textContent = message || "The free game scores one category today. Practice stays open and is not scored.";
    if (proSoon) proSoon.hidden = true;
    if (proNotify) proNotify.disabled = false;
    proModal.hidden = false;
    document.body.classList.add("modal-open");
    if (wrap) wrap.inert = true;
    if (proClose) proClose.focus();
    else if (proNotify) proNotify.focus();
  }

  function closePro() {
    if (!proModal) return;
    proModal.hidden = true;
    if ((!pickModal || pickModal.hidden) && confirmEl.hidden && !panelOpen()) {
      document.body.classList.remove("modal-open");
      if (wrap) wrap.inert = false;
    }
  }

  function paintHome() {
    var now = new Date();
    var daily = window.WickDaily;
    var today = daily.londonDate(now);
    homeDate = today;
    var view = daily.dayView(now);
    var streak = daily.currentStreak(now);
    dayOpen.textContent = "Wick · " + view.shortDate;
    if (dayDone) dayDone.textContent = "Wick · " + view.shortDate;
    openStreak.textContent = String(streak);
    var badgeDays = daily.bestDaily ? daily.bestDaily(now) : streak;
    renderBadges(document.getElementById("open-badges"), badgeDays);
    if (view.legacy && view.legacyResult) {
      pickPrompt.textContent = "You already played today's Wick.";
      dayNote.textContent = "You scored " + view.legacyResult.correct + ". Come back tomorrow for new categories.";
    } else if (view.played) {
      pickPrompt.textContent = "Come back tomorrow for new categories.";
      dayNote.textContent = "Today's scored category is done. The other two stay closed until tomorrow.";
    } else if (view.chosen) {
      var chosen = daily.categoryBySlug(view.chosen);
      pickPrompt.textContent = "You picked " + (chosen ? chosen.name : "a category") + ". The others stay locked today.";
      dayNote.textContent = "That choice is your one scored go.";
    } else {
      pickPrompt.textContent = "Tap a category to start today's scored game.";
      dayNote.textContent = "You confirm before the other two close. Practice, further down, does not use this pick.";
    }
    if (homeNudge) homeNudge.textContent = daily.nudge(now);
    if (tomorrowLine) tomorrowLine.textContent = tomorrowText(view);
    paintCards(view);
    if (openPanel) openPanel.hidden = false;
    if (donePanel) donePanel.hidden = true;
    var played = null;
    view.categories.forEach(function (cat) {
      if (cat.result) played = cat;
    });
    if (compareHome) {
      if (played) showComparison(compareHome, view.dayNumber, played.result.correct, false, false, played.slug);
      else {
        compareHome.hidden = true;
        compareHome.textContent = "";
      }
    }
    renderBest();
    renderCountdown();
    var status = document.getElementById("load-status");
    if (status) status.hidden = true;
  }

  function finish(reason) {
    if (ended) return;
    ended = true;
    clearInterval(timerId);
    clearTimeout(advanceId);
    clearCooldown();
    mode = "end";
    closeConfirmQuiet();
    var had = readBest();
    var better = !practice && score > (had === null ? 0 : had);
    var savedBest = had;
    if (better) {
      if (writeBest(score)) savedBest = score;
      else better = false;
    }
    var accuracy = accuracyText();
    var now = new Date();
    var dailyStreak = window.WickDaily.currentStreak(now);
    if (!practice) {
      var saved = window.WickDaily.record({
        score: score,
        answered: answered,
        correct: correct,
        accuracy: accuracy,
        bestStreak: bestStreak,
        results: results.slice(),
        roundSize: deck.length,
        category: runSlug,
        date: runDate || window.WickDaily.londonDate(now)
      }, now);
      dailyStreak = saved.streak;
    }
    lastResult = {
      score: score,
      correct: correct,
      answered: answered,
      accuracy: accuracy,
      bestStreak: bestStreak,
      results: results.slice(),
      roundSize: deck.length,
      newBest: better,
      reason: reason,
      practice: practice,
      dayNumber: window.WickDaily.dayNumber(runDate || window.WickDaily.londonDate(now)),
      category: runSlug,
      categoryMeta: runSlug ? window.WickDaily.categoryBySlug(runSlug) : null,
      shortDate: window.WickDaily.shortDate(runDate || window.WickDaily.londonDate(now)),
      dailyStreak: dailyStreak,
      timeAdded: timeAddedMs
    };
    endReason.textContent = practice ? "Practice" : reasonLabel(reason);
    verdictEl.textContent = practice ? "Not scored. Have another look." : verdictFor(reason);
    endScore.textContent = "0";
    countUp(endScore, score);
    if (endTime) endTime.textContent = (timeAddedMs / 1000).toFixed(1) + "s";
    var shareTitle = document.getElementById("share-card-title");
    if (shareTitle) {
      shareTitle.textContent = lastResult.categoryMeta
        ? ("Wick · " + lastResult.shortDate + " · " + lastResult.categoryMeta.emoji + " " + lastResult.categoryMeta.name)
        : ("Wick · " + formatScore(score));
    }
    if (comeBack && !practice) {
      comeBack.textContent = "Come back tomorrow for new categories. " + tomorrowText(window.WickDaily.dayView(now));
    } else if (comeBack) {
      comeBack.textContent = "Practice is not scored.";
    }
    renderBadges(document.getElementById("end-badges"), window.WickDaily.bestDaily ? window.WickDaily.bestDaily(now) : dailyStreak);
    endAcc.textContent = accuracy;
    endCorrect.textContent = answered + " of " + deck.length;
    endStreak.textContent = String(bestStreak);
    endDaily.textContent = String(dailyStreak);
    newBestEl.hidden = !better;
    practiceNote.hidden = !practice;
    showComparison(compareEl, lastResult.dayNumber, correct, practice, !practice, runSlug);
    renderGrid(results);
    shareStatus.textContent = "";
    shareFallback.hidden = true;
    shareText.value = "";
    renderBest();
    renderCountdown();
    paintHome();
    showScreen("end");
    verdictEl.focus();
    say((practice ? "Practice. " : "") + reasonLabel(reason) + ". Score " + formatScore(score) + ". " + verdictEl.textContent);
  }

  function tick() {
    if (ended || blowingOut) return;
    var left = endAt - Date.now();
    if (left <= 0) {
      blowingOut = true;
      locked = true;
      mode = "ending";
      clearInterval(timerId);
      clearTimeout(advanceId);
      renderTimer(0);
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(function () { finish("time"); }, reduce ? 0 : 900);
      return;
    }
    renderTimer(left);
    if (!warnedTen && left <= 10000) {
      warnedTen = true;
      say("Ten seconds left.");
    }
  }

  function applyDeepLink() {
    var params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch (err) {
      return;
    }
    if (params.get("archive") === "1") {
      openPro("Past days stay in the archive. Play the full archive with Wick Pro (coming soon).");
      return;
    }
    var practiceSlug = params.get("practice") || "";
    if (practiceSlug && window.WickDaily.categoryBySlug(practiceSlug)) {
      if (practiceSelect) practiceSelect.value = practiceSlug;
      if (params.get("start") === "1") startGame(true, practiceSlug);
      return;
    }
    var dailySlug = params.get("daily") || "";
    if (!dailySlug || !window.WickDaily.categoryBySlug(dailySlug)) return;
    var now = new Date();
    var today = window.WickDaily.londonDate(now);
    if (!window.WickDaily.canPlay(today, dailySlug, now)) return;
    pendingSlug = dailySlug;
    pendingDate = today;
    var meta = window.WickDaily.categoryBySlug(dailySlug);
    pickCopy.textContent = window.WickDaily.isPro()
      ? "Play " + meta.name + "?"
      : "Play " + meta.name + " as today's scored category? The other two close after you confirm.";
    pickYes.textContent = "Play " + meta.name;
    openPick();
  }

  function startGame(asPractice, slug, dateStr) {
    if (mode === "play" || mode === "feedback" || mode === "starting" || mode === "ending") return;
    var source = bank();
    if (!source.length || !window.WickDaily) {
      mode = "start";
      loadError.hidden = false;
      showScreen("start");
      return;
    }
    var now = new Date();
    var today = window.WickDaily.londonDate(now);
    var playDate = dateStr || today;
    practice = !!asPractice;
    if (!practice) {
      if (!slug || !window.WickDaily.canPlay(playDate, slug, now) || !window.WickDaily.commitCategory(playDate, slug, now)) {
        paintHome();
        showScreen("start");
        return;
      }
    }
    mode = "starting";
    loadError.hidden = true;
    runSlug = slug || "";
    runDate = playDate;
    if (runSlug) deck = window.WickDaily.pickCategoryQuestions(source, playDate, runSlug, 60);
    else deck = window.WickDaily.pickQuestions(source, today, ROUND_SIZE);
    if (!deck.length) {
      mode = "start";
      loadError.hidden = false;
      showScreen("start");
      return;
    }
    index = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    correct = 0;
    answered = 0;
    results = [];
    current = null;
    locked = false;
    ended = false;
    blowingOut = false;
    warnedTen = false;
    timeAddedMs = 0;
    if (comboEl) comboEl.textContent = "";
    document.body.setAttribute("data-heat", "0");
    candle.setAttribute("data-heat", "0");
    candle.classList.remove("is-out", "is-gain");
    document.body.classList.remove("is-out");
    endAt = Date.now() + DURATION_MS;
    clearInterval(timerId);
    clearTimeout(advanceId);
    closeConfirmQuiet();
    showScreen("play");
    renderTimer(DURATION_MS);
    timerId = setInterval(tick, 200);
    showQuestion();
    say((practice ? "Practice. " : "Wick " + window.WickDaily.dayNumber(today) + ". ") + "Sixty seconds. " + deck.length + " questions.");
  }

  var canon = document.querySelector('link[rel="canonical"]');
  if (canon) canon.setAttribute("href", pageUrl());

  soundOn = false;
  try {
    soundOn = localStorage.getItem(SOUND_KEY) === "on";
  } catch (err) {
    soundOn = false;
  }
  renderSound();
  function revealLoadError() {
    var status = document.getElementById("load-status");
    if (status) status.hidden = true;
    if (loadError) loadError.hidden = false;
  }
  function markReady() {
    var status = document.getElementById("load-status");
    if (status) status.hidden = true;
  }
  var retryLoad = document.getElementById("retry-load");
  if (retryLoad) retryLoad.addEventListener("click", function () { window.location.reload(); });
  var rankRetry = document.getElementById("rank-retry");
  if (rankRetry) rankRetry.addEventListener("click", function () { openRankPanel(rankSlug); });
  if (!window.WickDaily) {
    revealLoadError();
    showScreen("start");
  } else {
    fillPractice();
    paintHome();
    if (!bank().length) revealLoadError();
    else markReady();
    showScreen("start");
    if (bank().length) applyDeepLink();
  }
  clockId = setInterval(function () {
    if (mode === "play" || mode === "feedback" || mode === "ending") return;
    renderCountdown();
  }, 1000);

  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    } catch (err) {}
    renderSound();
    if (soundOn) {
      ensureAudio();
      blip([{ freq: 660, dur: 0.07, gain: 0.05 }]);
    }
  });

  practiceBtn.addEventListener("click", function () {
    var slug = practiceSelect ? practiceSelect.value : "";
    startGame(true, slug);
  });
  againBtn.addEventListener("click", function () { startGame(true, runSlug, runDate); });
  pickYes.addEventListener("click", function () {
    var slug = pendingSlug;
    var date = pendingDate;
    closePick();
    startGame(false, slug, date);
  });
  pickNo.addEventListener("click", closePick);
  proNotify.addEventListener("click", function () {
    if (proSoon) proSoon.hidden = false;
    proNotify.disabled = true;
  });
  proClose.addEventListener("click", closePro);
  document.getElementById("archive-btn").addEventListener("click", function () {
    openPro("Past days stay closed. Today's three are the free game. Practice can replay a category without a score.");
  });
  nextBtn.addEventListener("click", advance);
  endBtn.addEventListener("click", openConfirm);
  confirmYes.addEventListener("click", function () {
    closeConfirmQuiet();
    finish("end");
  });
  confirmNo.addEventListener("click", closeConfirm);
  if (pillBtn) pillBtn.addEventListener("click", openStreakPanel);
  document.getElementById("streak-close").addEventListener("click", closeStreakPanel);
  document.getElementById("open-rank").addEventListener("click", function () { openRankPanel(); });
  document.getElementById("rank-close").addEventListener("click", closeRankPanel);
  document.getElementById("rank-end").addEventListener("click", function () { openRankPanel(); });
  document.getElementById("rank-home").addEventListener("click", function () { openRankPanel(); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && pickModal && !pickModal.hidden) {
      event.preventDefault();
      closePick();
      return;
    }
    if (event.key === "Escape" && proModal && !proModal.hidden) {
      event.preventDefault();
      closePro();
      return;
    }
    if (event.key !== "Escape" || !panelOpen()) return;
    if (rankPanel && !rankPanel.hidden) closeRankPanel();
    else closeStreakPanel();
  });

  choicesEl.addEventListener("click", function (event) {
    var btn = event.target.closest("button[data-i]");
    if (!btn) return;
    choose(Number(btn.getAttribute("data-i")));
  });

  confirmEl.addEventListener("keydown", function (event) {
    if (confirmEl.hidden) return;
    var items = [confirmYes, confirmNo];
    if (event.key === "Escape") {
      event.preventDefault();
      closeConfirm();
      return;
    }
    if (event.key !== "Tab") return;
    if (items.indexOf(document.activeElement) === -1) {
      event.preventDefault();
      (event.shiftKey ? confirmNo : confirmYes).focus();
      return;
    }
    if (event.shiftKey && document.activeElement === confirmYes) {
      event.preventDefault();
      confirmNo.focus();
    } else if (!event.shiftKey && document.activeElement === confirmNo) {
      event.preventDefault();
      confirmYes.focus();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (!confirmEl.hidden || panelOpen()) return;
    if ((pickModal && !pickModal.hidden) || (proModal && !proModal.hidden)) return;
    if (Date.now() < cooldownUntil) return;
    if (mode === "play" && !locked) {
      var map = { "1": 0, "2": 1, "3": 2, "4": 3 };
      if (Object.prototype.hasOwnProperty.call(map, event.key)) {
        event.preventDefault();
        choose(map[event.key]);
      }
    }
  });

  shareBtn.addEventListener("click", function () {
    if (!lastResult) return;
    var text = buildShare(lastResult);
    var copy = navigator.clipboard && navigator.clipboard.writeText;
    if (!copy) {
      shareFallback.hidden = false;
      shareText.value = text;
      shareStatus.textContent = "Select the result below and copy it.";
      shareText.focus();
      shareText.select();
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      shareFallback.hidden = true;
      shareStatus.textContent = "Copied. You can paste it anywhere.";
    }).catch(function () {
      shareFallback.hidden = false;
      shareText.value = text;
      shareStatus.textContent = "Select the result below and copy it.";
      shareText.focus();
      shareText.select();
    });
  });
})();
