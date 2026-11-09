/* Build static SEO pages, robots.txt, and sitemap.xml.
   Past days get a short teaser only. Today's and future answers are not written.
   Run from the repo root: node scripts/build-seo.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var crypto = require("crypto");

var root = path.join(__dirname, "..");
var context = { window: {}, console: console };
vm.createContext(context);
["questions.js", "questions-extra.js", "questions-more.js", "questions-categories.js", "daily.js"].forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(root, name), "utf8"), context, { filename: name });
});

var daily = context.window.WickDaily;
var bank = context.window.WICK_QUESTIONS || [];
var ARCHIVE_START = "2026-11-07";
var SITE = "https://wickquiz.com";

var PATHS = {
  geography: "geography-quiz",
  history: "history-quiz",
  science: "science-quiz",
  nature: "nature-quiz",
  space: "space-quiz",
  film: "film-quiz",
  music: "music-quiz",
  sport: "sport-quiz",
  food: "food-quiz",
  language: "language-quiz",
  art: "art-quiz",
  tech: "tech-quiz"
};

var INTROS = {
  geography: "A geography quiz is a fair way to test what has stayed put: capitals, flags, rivers, and the places people mix up. Wick’s geography round is written for a UK player, so official capitals and precise wording are used when a short question would have two honest answers. These sample questions and answers are from the same bank as the one-minute game. They are examples, not a full daily set.",
  history: "History questions in a pub quiz fall apart when the date is fuzzy. Wick sticks to events, monarchs, and treaties whose facts stay put, from Hastings and Magna Carta through to the twentieth century. The samples below are history quiz questions and answers from the game, with the answer shown so you can check them at the table. A scored daily round uses a fresh set and is not printed here in full.",
  science: "Science quiz questions should be answerable without a textbook on the table. Wick uses school-level physics, chemistry, and biology, plus at most one or two non-trivial maths questions in a science round. The examples here show the style: four choices, one answer, and no trick that depends on yesterday’s news. The full minute of questions stays in the game.",
  nature: "Nature and animals make good general knowledge because the names are stable: a blue whale is still the largest animal, and an oak still grows from an acorn. Wick’s nature round covers wildlife, oceans, plants, and habitats, in plain English. Use the samples to see the level. The daily game deals a longer set on the days nature is one of the three categories.",
  space: "A space quiz is more than naming the planets in order. Wick also asks about moons, constellations, and the missions people in Britain actually followed, from Apollo to Tim Peake. These space questions and answers are samples from the bank. They are not the full list for any coming day, so a later archive page can still be a surprise.",
  film: "Film and TV questions work in a pub quiz when the film is old enough to have settled. Wick asks about directors, years, and well-known roles, including British television, rather than last weekend’s opening. The samples below are real questions from the game. Playing the category deals a one-minute practice round, separate from today’s scored choice.",
  music: "Music rounds are kinder when they name the piece or the band and not a lyric you would have to sing. Wick’s questions cover classical works, British bands, instruments, and the terms on a score. The answers are printed with these samples so you can settle an argument. The daily set, when music is offered, is longer than this page.",
  sport: "Sport is a pub-quiz staple, and it dates quickly if the question is about last night. Wick uses records, rules, grounds, and tournaments that are already in the book: World Cups, Olympics, cricket, and football clubs. These are sample sport questions and answers. Your scored game is still one category, chosen on the day, and it is not copied out in full here.",
  food: "Food and drink questions travel well if they say which place a dish belongs to, and stay honest when two countries claim it. Wick’s food round covers British classics, world dishes, and the words cooks use. The samples show the question, the four choices, and the answer. A full minute of food questions is what you get when you practise the category.",
  language: "Language and words suit a general knowledge quiz because etymology and idiom do not change with the headlines. Wick asks about alphabets, British and American vocabulary, and phrases such as “once in a blue moon”. These samples are a short set of quiz questions and answers. The daily language round, on the days it appears, uses a different mix.",
  art: "Art and culture questions in Wick cover paintings, books, buildings, and myths that a family can talk about afterwards. The point is the fact, not a trick of wording. Sample questions and answers are below. They are a taste of the bank. The one-minute game, and any later archive page, does not reprint the whole round.",
  tech: "Tech and inventions questions are aimed at how things came to be, not at this week’s phone launch. Wick asks about British engineers, the web, and the machines that made the modern quiz possible to play in a browser. These samples include the answer. Practise the category for a minute, or go back to today’s three categories for the scored game."
};

var FAQ = [
  ["What is Wick?", "Wick is a free online quiz from the UK. Each London day, everyone sees the same three categories and picks one. You have 60 seconds. A right answer adds 2 seconds. A wrong answer adds none and pauses the buttons for 2 seconds."],
  ["Is Wick a general knowledge quiz?", "Yes. The bank covers geography, history, science, nature, space, film and TV, music, sport, food and drink, language, art and culture, and tech. It is written as general knowledge, in the style of pub quiz questions, not as a news quiz."],
  ["How do I play the daily quiz?", "Open the home page, read the three category cards, and choose one. Wick asks you to confirm, because a free player only gets one scored category that day. The other two stay locked until tomorrow. Practice is separate and is not scored."],
  ["How does scoring work?", "The first correct answer in a row is 100 points. The second is 150, the third is 200, and the fourth and later are 250. A miss scores nothing and resets the answer streak. The number in the share line is how many answers you got right."],
  ["What is the daily streak?", "A streak is the number of London days in a row you have finished a scored category. One category is enough to keep it. A single missed day can be covered once, and that cover comes back after a 7-day run. Two missed days reset the streak. The count stays on your device."],
  ["Can I practise one category?", "Yes. Practice is free and is not scored. You can pick any of the twelve categories, or a mixed set. A practice round does not change today’s result, the streak, or the ranking."],
  ["Do I need an account?", "No. The quiz works with no account. An optional email account exists for people who want one. It is not required to play, and the questions do not ask for your name."],
  ["What are the quiz questions and answers on the category pages?", "Each category page shows a few real questions from the Wick bank, with the answer printed underneath. They are samples. They are not the full list for today or for a future day."],
  ["Where are past daily quizzes?", "The archive lists days that have already ended, starting from 7 November 2026. Each past page names that day’s three categories and shows a short sample of questions and answers. The rest of that day’s set is not published. Playing the full archive is part of Wick Pro, which is not on sale yet."],
  ["Does Wick use cookies?", "The quiz itself does not need a cookie to play. Optional page counts stay off until you allow them. The privacy notice and the cookies page explain what is stored on the device and what a scored game can send."]
];

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function londonToday() {
  return daily.londonDate(new Date());
}

function shift(dateStr, days) {
  var t = Date.parse(dateStr + "T12:00:00Z") + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

function longDate(dateStr) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
  }).format(new Date(dateStr + "T12:00:00Z"));
}

function pastDates(today) {
  var out = [];
  if (today <= ARCHIVE_START) return out;
  var cursor = ARCHIVE_START;
  while (cursor < today) {
    out.push(cursor);
    cursor = shift(cursor, 1);
  }
  return out;
}

function write(rel, text) {
  var file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function prefixFor(depth) {
  return depth === 0 ? "" : new Array(depth + 1).join("../");
}

function nav(depth, current) {
  var p = prefixFor(depth);
  function item(href, label, id) {
    var here = current === id ? " aria-current=\"page\"" : "";
    return "<a href=\"" + p + href + "\"" + here + ">" + label + "</a>";
  }
  return [
    "<nav class=\"site-nav\" aria-label=\"Site\">",
    item("index.html", "Play", "play"),
    item("about/", "How to play", "about"),
    "<details class=\"nav-more\">",
    "<summary>Menu</summary>",
    "<div class=\"nav-menu\">",
    item("faq/", "FAQ", "faq"),
    item("archive/", "Past quizzes", "archive"),
    item("privacy.html", "Privacy", "privacy"),
    item("cookies.html", "Cookies", "cookies"),
    "</div>",
    "</details>",
    "</nav>"
  ].join("\n");
}

function quizLinks(depth) {
  var p = prefixFor(depth);
  var links = daily.CATEGORIES.map(function (cat) {
    return "<a href=\"" + p + PATHS[cat.slug] + "/\">" + esc(cat.emoji + " " + cat.name) + "</a>";
  });
  return "<nav class=\"quiz-links\" aria-label=\"Quizzes\">" + links.join("\n") + "</nav>";
}

function head(opts) {
  var p = prefixFor(opts.depth);
  var url = SITE + opts.path;
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en-GB\">",
    "<head>",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>" + esc(opts.title) + "</title>",
    "<meta name=\"description\" content=\"" + esc(opts.description) + "\">",
    "<meta name=\"theme-color\" content=\"#2046c7\">",
    "<meta name=\"referrer\" content=\"no-referrer\">",
    "<link rel=\"canonical\" href=\"" + url + "\">",
    "<meta property=\"og:title\" content=\"" + esc(opts.title) + "\">",
    "<meta property=\"og:description\" content=\"" + esc(opts.description) + "\">",
    "<meta property=\"og:url\" content=\"" + url + "\">",
    "<meta property=\"og:image\" content=\"" + SITE + "/og.png\">",
    "<meta property=\"og:image:width\" content=\"1200\">",
    "<meta property=\"og:image:height\" content=\"630\">",
    "<meta property=\"og:type\" content=\"website\">",
    "<meta property=\"og:locale\" content=\"en_GB\">",
    "<meta name=\"twitter:card\" content=\"summary_large_image\">",
    "<meta name=\"twitter:title\" content=\"" + esc(opts.title) + "\">",
    "<meta name=\"twitter:description\" content=\"" + esc(opts.description) + "\">",
    "<meta name=\"twitter:image\" content=\"" + SITE + "/og.png\">",
    "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'self' 'sha256-" + opts.ldHash + "' https://gc.zgo.at; connect-src 'self' https://hlnlkcdmtnbzouomcxcg.supabase.co https://zachfrenchwickquiz.goatcounter.com; base-uri 'self'; object-src 'none'\">",
    "<link rel=\"icon\" href=\"" + p + "favicon.ico\" sizes=\"48x48\">",
    "<link rel=\"icon\" href=\"" + p + "favicon.svg\" type=\"image/svg+xml\">",
    "<link rel=\"apple-touch-icon\" href=\"" + p + "apple-touch-icon.png\">",
    "<link rel=\"stylesheet\" href=\"" + p + "styles.css\">",
    "<script type=\"application/ld+json\">" + jsonLd(opts.ld) + "</script>",
    "</head>"
  ].join("\n");
}

function shell(opts, body) {
  var p = prefixFor(opts.depth);
  opts.ldHash = crypto.createHash("sha256").update(jsonLd(opts.ld), "utf8").digest("base64");
  return [
    head(opts),
    "<body>",
    "<div class=\"wrap\">",
    "<a class=\"skip\" href=\"#main\">Skip to content</a>",
    "<header class=\"top\">",
    "<p class=\"brand\"><a class=\"logo\" href=\"" + p + "index.html\"><img src=\"" + p + "brand/logo-icon.svg\" alt=\"\" width=\"36\" height=\"36\"><span>Wick</span></a></p>",
    nav(opts.depth, opts.nav || ""),
    "</header>",
    "<main id=\"main\" class=\"prose\" tabindex=\"-1\">",
    body,
    "</main>",
    "<footer>",
    "<nav aria-label=\"Information\">",
    "<a href=\"" + p + "index.html\">Play today’s quiz</a>",
    "<a href=\"" + p + "about/\">About</a>",
    "<a href=\"" + p + "faq/\">FAQ</a>",
    "<a href=\"" + p + "archive/\">Past quizzes</a>",
    "<a href=\"" + p + "privacy.html\">Privacy</a>",
    "<a href=\"" + p + "cookies.html\">Cookies</a>",
    "</nav>",
    quizLinks(opts.depth),
    "</footer>",
    "</div>",
    "<script src=\"" + p + "config.js\"></script>",
    "<script src=\"" + p + "auth.js\"></script>",
    "<script src=\"" + p + "consent.js\"></script>",
    "<script src=\"" + p + "analytics.js\"></script>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function questionBlock(item, cat) {
  var choices = item.choices.map(function (choice) {
    return "<li>" + esc(choice) + "</li>";
  }).join("");
  return [
    "<article class=\"sample-q\">",
    "<h3>" + esc(cat.emoji + " " + cat.name) + "</h3>",
    "<p>" + esc(item.q) + "</p>",
    "<ul>" + choices + "</ul>",
    "<p><strong>Answer:</strong> " + esc(item.answer) + "</p>",
    "</article>"
  ].join("\n");
}

function questionLd(item) {
  return {
    "@type": "Question",
    eduQuestionType: "Multiple choice",
    text: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
    suggestedAnswer: item.choices.filter(function (choice) {
      return choice !== item.answer;
    }).map(function (choice) {
      return { "@type": "Answer", text: choice };
    })
  };
}

function examples(slug) {
  var list = daily.pickCategoryQuestions(bank, "2027-06-01", slug, 60);
  return [list[8], list[21], list[34], list[47]].filter(Boolean);
}

function samplesForDay(dateStr) {
  var cats = daily.categoriesFor(dateStr);
  var picked = [];
  cats.forEach(function (cat, index) {
    var list = daily.pickCategoryQuestions(bank, dateStr, cat.slug, 60);
    var take = index === 0 ? 2 : 1;
    for (var n = 0; n < take && n < list.length; n += 1) {
      picked.push({ cat: cat, item: list[n] });
    }
  });
  return { cats: cats, samples: picked.slice(0, 5) };
}

function buildCategory(cat) {
  var slugPath = PATHS[cat.slug];
  var questions = examples(cat.slug);
  var title = cat.name + " quiz questions and answers | Wick";
  var description = "Free " + cat.name + " quiz questions and answers from Wick, a one-minute UK general knowledge game. Four samples here. The full minute is in the game.";
  var blocks = questions.map(function (item) { return questionBlock(item, cat); }).join("\n");
  var ld = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: cat.name + " quiz",
    description: description,
    url: SITE + "/" + slugPath + "/",
    inLanguage: "en-GB",
    about: cat.name,
    hasPart: questions.map(questionLd)
  };
  var body = [
    "<h1>" + esc(cat.emoji + " " + cat.name + " quiz") + "</h1>",
    "<p>" + esc(INTROS[cat.slug]) + "</p>",
    "<p>Wick is a free online quiz in the UK. On the <a href=\"../index.html\">daily quiz</a> you pick one of three categories. If " + esc(cat.name) + " is not one of today’s three, you can still practise it. Practice is not scored and does not use up today’s choice.</p>",
    "<p><a class=\"primary\" href=\"../index.html?practice=" + cat.slug + "&amp;start=1\">Practise " + esc(cat.name) + " for 1 minute</a></p>",
    "<h2>Sample questions and answers</h2>",
    blocks,
    "<h2>How this fits the daily game</h2>",
    "<p>" + esc(cat.teaser) + ". A scored round is 60 seconds, with 2 seconds added for each right answer. The other rules, the streak, and the rankings are explained in the <a href=\"../faq/\">FAQ</a> and on <a href=\"../about/\">how to play</a>. Past days, once they have ended, are listed in the <a href=\"../archive/\">archive</a> as a short sample, not the full set.</p>",
    "<p><a href=\"../index.html\">Play today’s Wick</a></p>"
  ].join("\n");
  write(slugPath + "/index.html", shell({
    depth: 1,
    path: "/" + slugPath + "/",
    title: title,
    description: description,
    ld: ld,
    nav: ""
  }, body));
}

function buildArchiveDay(dateStr, dates) {
  var pack = samplesForDay(dateStr);
  var names = pack.cats.map(function (cat) { return cat.name; }).join(", ");
  var title = "Wick quiz " + daily.shortDate(dateStr) + " | " + names;
  var description = "Sample questions and answers from Wick on " + longDate(dateStr) + ". The categories were " + names + ". This is a teaser, not the full round.";
  var index = dates.indexOf(dateStr);
  var prev = index > 0 ? dates[index - 1] : "";
  var next = index < dates.length - 1 ? dates[index + 1] : "";
  var catLinks = pack.cats.map(function (cat) {
    return "<a href=\"../../" + PATHS[cat.slug] + "/\">" + esc(cat.emoji + " " + cat.name) + "</a>";
  }).join(", ");
  var blocks = pack.samples.map(function (row) {
    return questionBlock(row.item, row.cat);
  }).join("\n");
  var intro = "On " + longDate(dateStr) + ", Wick offered three categories: " + pack.cats.map(function (cat) {
    return cat.emoji + " " + cat.name + " (" + cat.teaser + ")";
  }).join("; ") + ". Everyone who played that day chose one. A free game is one scored category, so the other two were not a second and third attempt. The four questions below are a sample from that day’s sets, with answers. The rest of the round is not on this page.";
  var ld = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: "Wick sample for " + longDate(dateStr),
    description: description,
    url: SITE + "/archive/" + dateStr + "/",
    datePublished: shift(dateStr, 1),
    inLanguage: "en-GB",
    hasPart: pack.samples.map(function (row) { return questionLd(row.item); })
  };
  var pager = "<p>";
  if (prev) pager += "<a href=\"../" + prev + "/\">Previous day</a> ";
  pager += "<a href=\"../\">All past quizzes</a>";
  if (next) pager += " <a href=\"../" + next + "/\">Next day</a>";
  pager += "</p>";
  var body = [
    "<h1>Wick on " + esc(longDate(dateStr)) + "</h1>",
    "<p>" + esc(intro) + "</p>",
    "<p>Categories: " + catLinks + ".</p>",
    "<h2>Sample questions and answers</h2>",
    blocks,
    "<p><a class=\"primary\" href=\"../../index.html?archive=1\">Play the full archive with Wick Pro (coming soon)</a></p>",
    "<p><a href=\"../../index.html\">Play today’s quiz</a>. The rules are on the <a href=\"../../faq/\">FAQ</a>.</p>",
    pager
  ].join("\n");
  write("archive/" + dateStr + "/index.html", shell({
    depth: 2,
    path: "/archive/" + dateStr + "/",
    title: title,
    description: description,
    ld: ld,
    nav: "archive"
  }, body));
  return pack.samples.map(function (row) { return row.item.q; });
}

function buildArchiveIndex(dates) {
  var title = "Past Wick quizzes | archive";
  var description = "An archive of Wick daily quizzes after each London day has ended. Each page names that day’s categories and shows a few sample questions and answers.";
  var items = dates.slice().reverse().map(function (dateStr) {
    var cats = daily.categoriesFor(dateStr).map(function (cat) {
      return cat.emoji + " " + cat.name;
    }).join(", ");
    return "<li><a href=\"" + dateStr + "/\">" + esc(longDate(dateStr)) + "</a> — " + esc(cats) + "</li>";
  }).join("\n");
  var ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Past Wick quizzes",
    itemListElement: dates.map(function (dateStr, index) {
      return {
        "@type": "ListItem",
        position: index + 1,
        url: SITE + "/archive/" + dateStr + "/",
        name: "Wick on " + longDate(dateStr)
      };
    })
  };
  var body = [
    "<h1>Past Wick quizzes</h1>",
    "<p>Wick is a daily general knowledge quiz. The same three categories are offered to everyone until midnight in the UK, and a free player picks one. This archive starts on 7 November 2026. A page is added only after that London day has ended. It names the categories and prints a few sample questions and answers. It does not print the rest of the round. Today’s questions, and any day still to come, are not here.</p>",
    "<p>Playing those full rounds later is <a href=\"../index.html?archive=1\">Wick Pro, which is coming soon</a>. There is no price and no email list. You can <a href=\"../index.html\">play today’s quiz</a> now.</p>",
    dates.length ? "<ul>" + items + "</ul>" : "<p>No past day has been published yet.</p>",
    "<p>Category guides: see the quiz links below, or start with the <a href=\"../geography-quiz/\">geography quiz</a> and the <a href=\"../science-quiz/\">science quiz questions</a>.</p>"
  ].join("\n");
  write("archive/index.html", shell({
    depth: 1,
    path: "/archive/",
    title: title,
    description: description,
    ld: ld,
    nav: "archive"
  }, body));
}

function buildFaq() {
  var title = "Wick FAQ | daily quiz, scoring, and streaks";
  var description = "Answers about the Wick daily quiz: how to play, scoring, streaks, practice, accounts, and where past questions and answers are published.";
  var blocks = FAQ.map(function (pair) {
    return "<h2>" + esc(pair[0]) + "</h2>\n<p>" + esc(pair[1]) + "</p>";
  }).join("\n");
  var ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: SITE + "/faq/",
    mainEntity: FAQ.map(function (pair) {
      return {
        "@type": "Question",
        name: pair[0],
        acceptedAnswer: { "@type": "Answer", text: pair[1] }
      };
    })
  };
  var body = "<h1>Wick questions and answers</h1>\n<p>Practical answers for the free UK quiz. For the legal notice, read <a href=\"../privacy.html\">privacy</a> and <a href=\"../cookies.html\">cookies and storage</a>.</p>\n" + blocks + "\n<p><a class=\"primary\" href=\"../index.html\">Play today’s quiz</a></p>";
  write("faq/index.html", shell({
    depth: 1,
    path: "/faq/",
    title: title,
    description: description,
    ld: ld,
    nav: "faq"
  }, body));
}

function buildAbout() {
  var title = "About Wick and how to play";
  var description = "How Wick works: a free one-minute UK daily quiz, three categories, one scored choice, a candle timer, and a result you can copy.";
  var ld = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: SITE + "/about/",
    name: title,
    description: description,
    isPartOf: { "@type": "WebSite", name: "Wick", url: SITE + "/" }
  };
  var body = [
    "<h1>About Wick and how to play</h1>",
    "<p>Wick is a free daily general knowledge quiz for a UK audience. From midnight to midnight in London, everyone sees the same three categories and picks one. You have one minute for that category. The other two lock until tomorrow. Practice can be mixed, or any category, and it is not scored.</p>",
    "<p>A candle burns with the 60-second clock. Each correct answer adds 2 seconds. A wrong answer adds no time, shows the right answer, and locks the buttons for 2 seconds. The round ends when the time runs out, the questions run out, or you end it.</p>",
    "<p>The pages are ordinary files. An account is optional. After a scored game, Wick can send the day, the category, how many you got right, and a random device id so it can show a ranking. Practice is not sent. The <a href=\"../privacy.html\">privacy notice</a> and the <a href=\"../cookies.html\">cookies page</a> describe that storage. The <a href=\"../faq/\">FAQ</a> answers the short version.</p>",
    "<h2>Scoring</h2>",
    "<ul>",
    "<li>First correct answer in a row: 100 points.</li>",
    "<li>Second in a row: 150.</li>",
    "<li>Third: 200.</li>",
    "<li>Fourth and beyond: 250.</li>",
    "</ul>",
    "<p>A wrong answer scores nothing and the answer streak returns to zero. Days played in a row are kept on this device, with badges at 3, 7, 14, 30, 50, and 100 days. One finished category is enough for the daily streak.</p>",
    "<h2>Questions and answers</h2>",
    "<p>Category pages such as the <a href=\"../geography-quiz/\">geography quiz</a> and the <a href=\"../science-quiz/\">science quiz</a> each show a few questions with answers. The <a href=\"../archive/\">archive</a> does the same for days that have ended. Neither page is the full set. The questions were chosen because the facts stay put. They are checked with care, and a wording may still not suit every reader.</p>",
    "<h2>Terms</h2>",
    "<p>Wick is for fun. Scores have no cash value and are not a certificate. Please keep it kind. The questions are meant to be family-friendly. This is a personal project on GitHub Pages. This page is not legal advice.</p>",
    "<p><a class=\"primary\" href=\"../index.html\">Play today’s quiz</a></p>"
  ].join("\n");
  write("about/index.html", shell({
    depth: 1,
    path: "/about/",
    title: title,
    description: description,
    ld: ld,
    nav: "about"
  }, body));
}

function build404() {
  var title = "Page not found | Wick";
  var description = "That Wick page is not here. Play today’s quiz, or open the FAQ, the archive, and the category guides.";
  var ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Page not found",
    url: SITE + "/404.html"
  };
  var body = [
    "<h1>That page is not on Wick</h1>",
    "<p>The address does not match a quiz page. You can play today’s free general knowledge quiz, read the FAQ, or open a category guide.</p>",
    "<p><a class=\"primary\" href=\"/\">Play today’s quiz</a></p>",
    "<p><a href=\"/faq/\">FAQ</a> · <a href=\"/archive/\">Past quizzes</a> · <a href=\"/geography-quiz/\">Geography quiz</a> · <a href=\"/about/\">How to play</a></p>"
  ].join("\n");
  write("404.html", shell({
    depth: 0,
    path: "/404.html",
    title: title,
    description: description,
    ld: ld,
    nav: ""
  }, body));
}

function buildRobots(urls) {
  var lines = [
    "User-agent: *",
    "Allow: /",
    "",
    "Sitemap: " + SITE + "/sitemap.xml",
    ""
  ];
  write("robots.txt", lines.join("\n"));
  var body = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
  ];
  urls.forEach(function (entry) {
    body.push("  <url><loc>" + entry.loc + "</loc><lastmod>" + entry.lastmod + "</lastmod></url>");
  });
  body.push("</urlset>", "");
  write("sitemap.xml", body.join("\n"));
}

function main() {
  var today = londonToday();
  var dates = pastDates(today);
  var published = "2026-11-09";
  var archiveMod = dates.length ? shift(dates[dates.length - 1], 1) : published;
  daily.CATEGORIES.forEach(buildCategory);
  dates.forEach(function (dateStr) { buildArchiveDay(dateStr, dates); });
  buildArchiveIndex(dates);
  buildFaq();
  buildAbout();
  build404();
  var urls = [
    { loc: SITE + "/", lastmod: published },
    { loc: SITE + "/about/", lastmod: published },
    { loc: SITE + "/faq/", lastmod: published },
    { loc: SITE + "/archive/", lastmod: archiveMod },
    { loc: SITE + "/privacy.html", lastmod: published },
    { loc: SITE + "/cookies.html", lastmod: published },
    { loc: SITE + "/auth.html", lastmod: published }
  ];
  daily.CATEGORIES.forEach(function (cat) {
    urls.push({ loc: SITE + "/" + PATHS[cat.slug] + "/", lastmod: published });
  });
  dates.forEach(function (dateStr) {
    urls.push({ loc: SITE + "/archive/" + dateStr + "/", lastmod: shift(dateStr, 1) });
  });
  buildRobots(urls);
  console.log("London today", today);
  console.log("Archive pages", dates.join(", ") || "(none)");
  console.log("Sitemap URLs", urls.length);
}

main();
