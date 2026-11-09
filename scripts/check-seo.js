/* Offline checks for the static SEO pages. Run after scripts/build-seo.js. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var failures = [];

function check(name, ok, detail) {
  if (!ok) failures.push(name + (detail ? ": " + detail : ""));
}

var sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
check("sitemap xml", sitemap.indexOf("<?xml") === 0 && sitemap.indexOf("</urlset>") !== -1);
var locs = [];
sitemap.replace(/<loc>([^<]+)<\/loc>/g, function (_, loc) {
  locs.push(loc);
  return _;
});
check("sitemap has home", locs.indexOf("https://wickquiz.com/") !== -1);
check("sitemap count", locs.length >= 18, String(locs.length));

var robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
check("robots sitemap", robots.indexOf("Sitemap: https://wickquiz.com/sitemap.xml") !== -1);

function fileFor(loc) {
  var rel = loc.replace("https://wickquiz.com", "");
  if (rel === "/") return "index.html";
  if (rel.charAt(rel.length - 1) === "/") return rel.slice(1) + "index.html";
  return rel.slice(1);
}

locs.forEach(function (loc) {
  var rel = fileFor(loc);
  check("file " + rel, fs.existsSync(path.join(root, rel)));
});

function readHtml(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function pageChecks(rel) {
  var html = readHtml(rel);
  check(rel + " lang", html.indexOf("<html lang=\"en-GB\">") === 0 || html.indexOf("<html lang=\"en-GB\">") !== -1);
  var h1 = html.match(/<h1[\s>]/g) || [];
  check(rel + " one h1", h1.length === 1, String(h1.length));
  check(rel + " title", /<title>[^<]+<\/title>/.test(html));
  check(rel + " description", /<meta name="description" content="[^"]+"/.test(html));
  check(rel + " canonical", /<link rel="canonical" href="https:\/\/wickquiz\.com\/[^"]*"/.test(html));
  ["og:title", "og:description", "og:url", "og:image"].forEach(function (prop) {
    check(rel + " " + prop, html.indexOf("property=\"" + prop + "\"") !== -1);
  });
  check(rel + " twitter", html.indexOf("name=\"twitter:card\"") !== -1);
  var ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (rel === "about.html" || rel === "privacy.html" || rel === "cookies.html" || rel === "auth.html") return;
  check(rel + " json-ld", !!ld);
  if (!ld) return;
  var data;
  try {
    data = JSON.parse(ld[1]);
  } catch (err) {
    check(rel + " json parse", false, err.message);
    return;
  }
  var type = data["@type"] || (data["@graph"] && "graph");
  check(rel + " schema context", data["@context"] === "https://schema.org" || !!(data["@graph"]));
  if (data["@graph"]) {
    var types = data["@graph"].map(function (node) {
      return Array.isArray(node["@type"]) ? node["@type"].join(",") : node["@type"];
    });
    check(rel + " website", types.indexOf("WebSite") !== -1);
    check(rel + " organization", types.indexOf("Organization") !== -1);
    check(rel + " game", types.some(function (item) { return item.indexOf("Game") !== -1; }));
  }
  if (type === "FAQPage") {
    check(rel + " faq entities", data.mainEntity && data.mainEntity.length >= 8);
    data.mainEntity.forEach(function (q) {
      check(rel + " faq visible " + q.name, html.indexOf(q.name) !== -1);
      check(rel + " faq answer visible", html.indexOf(q.acceptedAnswer.text.slice(0, 40)) !== -1);
    });
  }
  if (type === "Quiz") {
    check(rel + " quiz parts", data.hasPart && data.hasPart.length >= 4 && data.hasPart.length <= 5, String(data.hasPart && data.hasPart.length));
    data.hasPart.forEach(function (q) {
      check(rel + " question visible", html.indexOf(q.text) !== -1 || html.indexOf(q.text.replace(/&/g, "&amp;")) !== -1);
    });
  }
}

["index.html", "about/index.html", "faq/index.html", "archive/index.html", "privacy.html", "cookies.html", "auth.html", "404.html"].forEach(pageChecks);
["geography", "history", "science", "nature", "space", "film", "music", "sport", "food", "language", "art", "tech"].forEach(function (slug) {
  pageChecks(slug + "-quiz/index.html");
});

var context = { window: {} };
vm.createContext(context);
["questions.js", "questions-extra.js", "questions-more.js", "questions-categories.js", "daily.js"].forEach(function (name) {
  vm.runInContext(fs.readFileSync(path.join(root, name), "utf8"), context, { filename: name });
});
var daily = context.window.WickDaily;
var bank = context.window.WICK_QUESTIONS;
var today = daily.londonDate(new Date());
var archiveDir = path.join(root, "archive");
fs.readdirSync(archiveDir).forEach(function (name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) return;
  pageChecks("archive/" + name + "/index.html");
  check(name + " is past", name < today, name + " vs " + today);
  var html = readHtml("archive/" + name + "/index.html");
  var full = [];
  daily.categoriesFor(name).forEach(function (cat) {
    daily.pickCategoryQuestions(bank, name, cat.slug, 60).forEach(function (item) {
      full.push(item.q);
    });
  });
  var shown = 0;
  full.forEach(function (q) {
    var escaped = q.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (html.indexOf(q) !== -1 || html.indexOf(escaped) !== -1) shown += 1;
  });
  check(name + " sample only", shown >= 4 && shown <= 5, String(shown) + " of " + full.length);
});

var home = readHtml("index.html");
check("home links faq", home.indexOf("href=\"faq/\"") !== -1);
check("home links archive", home.indexOf("href=\"archive/\"") !== -1);
check("home links geography", home.indexOf("href=\"geography-quiz/\"") !== -1);

if (failures.length) {
  console.error("FAILURES", failures.length);
  failures.forEach(function (item) { console.error(" -", item); });
  process.exit(1);
}
console.log("SEO checks passed", locs.length, "urls");
