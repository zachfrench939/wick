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

Optional GoatCounter page counts use `https://zachfrenchwickquiz.goatcounter.com/count` and `https://gc.zgo.at/count.js`. The script loads only after an opt-in, only on wickquiz.com, and not when Do Not Track or Global Privacy Control is set. The dashboard is not embedded. A signed-in check reported Europe/London, a login-only dashboard, and individual pageviews off. GoatCounter email verification was still pending. Nothing here is a statement of legal compliance.

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
