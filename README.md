# Wick

Wick is a daily one-minute quiz. Each UK day, everyone sees the same three categories and picks one. A correct answer adds 2 seconds to the clock. A wrong answer does not.

## Free and Pro

The free game is the one on the site today.

- You see three categories. You can start only one of them. The other two lock for the day and say “Pro: play every category”.
- The choice asks you to confirm, so a mis-tap does not use the day.
- One finished category keeps the daily streak.
- After that, the page looks ahead: come back tomorrow, with the names of tomorrow’s three categories.
- Practice stays free. It can be mixed, or any category, and it is not scored.
- Past days cannot be played. The calendar names that day’s categories and points at Wick Pro.

The free game scores one category a day. `window.WICK_IS_PRO` remains in the code as a later switch for a wider game. Payments and paid entitlements are not part of this site.

An account is optional. Email confirmation is required by the live Auth settings (`mailer_autoconfirm` false on 7 November 2026). Before real sign-ups, set the Supabase Site URL to `https://wickquiz.com` and allow `https://wickquiz.com/auth.html` as a redirect. This repository does not change that configuration and does not send confirmation email. Rankings keep the device id already on the browser. Signing in does not copy it onto the account.

GoatCounter counts visits on wickquiz.com. It is a cookie-free counter and stores nothing on the device, so the site does not ask for permission and does not show a banner. The script is `https://gc.zgo.at/count.js` and the endpoint is `https://zachfrenchwickquiz.goatcounter.com/count`. Other hosts are not counted. The dashboard is not embedded. Nothing here is a statement of legal compliance.

Published with GitHub Pages from this repository at [wickquiz.com](https://wickquiz.com). The repository zachfrench939.github.io does not serve that domain.

## Retention design

These are the habits borrowed from Wordle, Connections, Duolingo and the NYT Games streaks. Each one is there because it gives a reason to return tomorrow, and none of them invents pressure.

- **One category a day, then a real countdown.** The free game is one scored category. The results screen says “Come back tomorrow for new categories” and names tomorrow’s three. The clock is midnight in the UK.
- **A streak you can see.** Wordle and the NYT games keep people coming back with a count of days in a row. Wick keeps that count on the device and shows it in a pill on the edge of the screen, with this week’s seven days as dots.
- **A quiet nudge only when a streak is actually open.** If yesterday was played and today is not, the start screen says to play today to keep the streak. If there is no streak, it stays silent.
- **One covered miss.** Duolingo’s streak freeze, without the shop. A single missed day does not wipe a streak, and that cover refills after a 7-day run. Two missed days reset it. Nothing is bought or gambled.
- **Milestones, not loot.** Badges at 3, 7, 14, 30, 50 and 100 days mark a real run. The panel says how many days are left to the next one.
- **Your own record.** Played days, average correct, best score, longest streak, and a small chart of your own results. That is the Connections/Wordle stats idea, stored only on this device.
- **Where you sat today.** Today’s rankings use the existing score service: how many people played, the average, the 99th percentile, and bands of the score spread with “You are here.” No names.
- **Play it again, unscored.** Practice can be mixed or any category. It does not change the daily result, the streak, or the ranking.
- **A result you can copy.** The emoji grid is the Wordle share, plus the link. Wick does not post it.

## SEO

These pages are static files on GitHub Pages. `node scripts/build-seo.js` writes them, plus `robots.txt` and `sitemap.xml`. It uses the London date. A day is added to the archive only after that day has ended. Each archive page names that day’s three categories and prints four sample questions with answers. It does not print the rest of the round. Today’s questions and future days are not published. Category guides each show four sample questions from the bank and a link that starts a one-minute practice round.

Published paths:

- `/` the game
- `/about/` how to play
- `/faq/`
- `/archive/` and `/archive/YYYY-MM-DD/` for past days
- `/geography-quiz/`, `/history-quiz/`, `/science-quiz/`, `/nature-quiz/`, `/space-quiz/`, `/film-quiz/`, `/music-quiz/`, `/sport-quiz/`, `/food-quiz/`, `/language-quiz/`, `/art-quiz/`, `/tech-quiz/`
- `/privacy.html`, `/cookies.html`, `/auth.html`
- `/404.html`

`.github/workflows/archive.yml` runs the same script each day and commits new archive pages. GoatCounter counts these paths on wickquiz.com as page loads.

### Manual steps

HTTPS is not enforced on the GitHub Pages site, and this repository’s token cannot change that setting. In the repository’s Pages settings, turn on **Enforce HTTPS**. Until that is on, `http://wickquiz.com/` answers over HTTP. `https://www.wickquiz.com/` already redirects to `https://wickquiz.com/`. `http://www.wickquiz.com/` currently redirects to `http://wickquiz.com/`, so the HTTPS switch is what finishes that chain.

Search Console and Bing should use an HTML file in this repository, not a DNS TXT record. The domain’s DNS is not edited from here, and an HTML file can be committed next to `index.html` as soon as the verification filename is known. After either site accepts the file, submit `https://wickquiz.com/sitemap.xml`.

Useful links, if they are genuine: a short post where you already write, a British quiz or pub community you are part of, and the GitHub repository. Do not buy links. Do not publish the full daily answers on another site. The archive on this site is the teaser.
