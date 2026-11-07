(function () {
  "use strict";

  var DURATION_MS = 60 * 1000;
  var TIME_BONUS_MS = 500;
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
  var startBtn = document.getElementById("start-btn");
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
    timePop.textContent = "+0.5s";
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
    counterEl.textContent = "QUESTION " + index + " OF " + deck.length;
    scoreEl.textContent = "SCORE " + formatScore(score);
    streakEl.textContent = "STREAK " + streak;
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
    categoryEl.textContent = current.category;
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
      say("Correct. " + label + ". Plus " + pts + " points. Half a second added. Streak " + streak + ".");
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
    if (reason === "bank") return "All 100 done";
    if (reason === "end") return "You ended it";
    return "Time's up";
  }

  function accuracyText() {
    if (!answered) return "—";
    return Math.round((correct / answered) * 100) + "%";
  }

  function buildShare(result) {
    var lines = ["Wick #" + result.dayNumber];
    lines.push(result.practice ? "Practice · not scored" : "1 minute · " + result.roundSize + " questions");
    if (!result.practice && result.tierLabel) {
      lines[0] = "Wick #" + result.dayNumber + ", " + result.correct + " correct, " + result.tierLabel;
    } else if (!result.practice) {
      lines[0] = "Wick #" + result.dayNumber + ", " + result.correct + " correct";
    }
    lines.push("Score " + formatScore(result.score));
    if (result.newBest) lines.push("New best on this device");
    lines.push(result.answered + " of " + result.roundSize + " · " + result.accuracy);
    lines.push("Best streak " + result.bestStreak);
    if (!result.practice) lines.push("Daily streak " + result.dailyStreak);
    if (result.timeAdded) lines.push("Time added " + (result.timeAdded / 1000).toFixed(1) + "s");
    lines.push("");
    if (result.results.length) {
      for (var i = 0; i < result.results.length; i += 8) {
        lines.push(result.results.slice(i, i + 8).map(function (ok) {
          return ok ? "🟩" : "🟥";
        }).join(""));
      }
      lines.push("");
    }
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
    confirmCopy.textContent = practice
      ? "This practice run is not scored."
      : "This is your one scored Wick for today.";
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

  function showComparison(el, dayNumber, correctCount, isPractice, doSubmit) {
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    if (isPractice) return;
    var stats = window.WickStats;
    if (!stats || !stats.configured()) return;
    var score = Math.max(0, Math.min(100, Math.round(Number(correctCount)) || 0));
    var start;
    try {
      start = doSubmit ? stats.submitDailyScore(dayNumber, score) : Promise.resolve({ ok: true });
    } catch (err) {
      return;
    }
    start.then(function (sent) {
      if (doSubmit && sent && sent.ok === false && !sent.duplicate) return null;
      return Promise.all([
        stats.getDailyDistribution(dayNumber),
        stats.getDailyRank(dayNumber, score)
      ]);
    }).then(function (pair) {
      if (!pair || !pair[0] || !pair[1]) return;
      var tier = tierFromRank(score, pair[0], pair[1]);
      if (!tier) return;
      if (lastResult && !lastResult.practice && lastResult.dayNumber === dayNumber) {
        lastResult.tierLabel = tier.tierLabel;
      }
      el.hidden = false;
      el.textContent = tier.text;
    }).catch(function () {});
  }

  var homeDate = "";

  function renderCountdown() {
    var now = new Date();
    var today = window.WickDaily.londonDate(now);
    if (homeDate && today !== homeDate && mode !== "play" && mode !== "feedback" && mode !== "ending" && mode !== "starting") {
      paintHome();
      return;
    }
    var left = window.WickDaily.nextMidnight(now) - now.getTime();
    var text = "Next Wick in " + window.WickDaily.formatRemaining(Math.max(0, left));
    nextOpen.textContent = text;
    nextDone.textContent = text;
    nextEnd.textContent = text;
  }

  function paintHome() {
    var now = new Date();
    var daily = window.WickDaily;
    var today = daily.londonDate(now);
    homeDate = today;
    var label = "Wick #" + daily.dayNumber(today);
    var result = daily.todayResult(now);
    var streak = daily.currentStreak(now);
    dayOpen.textContent = label;
    dayDone.textContent = label;
    openStreak.textContent = String(streak);
    var badgeDays = window.WickDaily.bestDaily ? window.WickDaily.bestDaily(now) : streak;
    renderBadges(document.getElementById("open-badges"), badgeDays);
    renderBadges(document.getElementById("done-badges"), badgeDays);
    if (result) {
      openPanel.hidden = true;
      donePanel.hidden = false;
      doneScore.textContent = formatScore(result.score);
      doneAnswered.textContent = result.answered + " of " + result.roundSize;
      doneAcc.textContent = result.accuracy;
      doneRun.textContent = String(result.bestStreak);
      doneDaily.textContent = String(streak);
      showComparison(compareDone, result.dayNumber, result.correct, false, false);
    } else {
      openPanel.hidden = false;
      donePanel.hidden = true;
    }
    renderBest();
    renderCountdown();
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
        roundSize: deck.length
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
      dayNumber: window.WickDaily.dayNumber(window.WickDaily.londonDate(now)),
      dailyStreak: dailyStreak,
      timeAdded: timeAddedMs
    };
    endReason.textContent = practice ? "Practice" : reasonLabel(reason);
    verdictEl.textContent = practice ? "Not scored. Have another look." : verdictFor(reason);
    endScore.textContent = "0";
    countUp(endScore, score);
    if (endTime) endTime.textContent = (timeAddedMs / 1000).toFixed(1) + "s";
    var shareTitle = document.getElementById("share-card-title");
    if (shareTitle) shareTitle.textContent = "Wick · " + formatScore(score);
    renderBadges(document.getElementById("end-badges"), window.WickDaily.bestDaily ? window.WickDaily.bestDaily(now) : dailyStreak);
    endAcc.textContent = accuracy;
    endCorrect.textContent = answered + " of " + deck.length;
    endStreak.textContent = String(bestStreak);
    endDaily.textContent = String(dailyStreak);
    newBestEl.hidden = !better;
    practiceNote.hidden = !practice;
    showComparison(compareEl, lastResult.dayNumber, correct, practice, !practice);
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

  function startGame(asPractice) {
    if (mode === "play" || mode === "feedback" || mode === "starting" || mode === "ending") return;
    var source = bank();
    if (!source.length || !window.WickDaily) {
      mode = "start";
      loadError.hidden = false;
      showScreen("start");
      return;
    }
    var now = new Date();
    if (!asPractice && window.WickDaily.todayResult(now)) {
      paintHome();
      showScreen("start");
      return;
    }
    practice = !!asPractice;
    mode = "starting";
    loadError.hidden = true;
    var today = window.WickDaily.londonDate(now);
    deck = window.WickDaily.pickQuestions(source, today, ROUND_SIZE);
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
  paintHome();
  showScreen("start");
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

  startBtn.addEventListener("click", function () { startGame(false); });
  practiceBtn.addEventListener("click", function () { startGame(true); });
  againBtn.addEventListener("click", function () { startGame(true); });
  nextBtn.addEventListener("click", advance);
  endBtn.addEventListener("click", openConfirm);
  confirmYes.addEventListener("click", function () {
    closeConfirmQuiet();
    finish("end");
  });
  confirmNo.addEventListener("click", closeConfirm);

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
    if (!confirmEl.hidden) return;
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
