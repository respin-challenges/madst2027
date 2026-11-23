# MADST Challenge website

Website of the **MADST Challenge** (Multilingual Any-Direction Speech Translation across nine Indian languages), a challenge at [ASLI 2027](https://2027.ieeeasli.org/).

Plain static HTML, CSS and JavaScript. No framework, no build step, no dependencies. It runs on GitHub Pages as is.

## Structure

```
index.html            Home
challenge.html        Motivation, languages, tasks, tracks, references
data.html             Corpus, splits, access, licence
evaluation.html       Metrics and scoring
baselines.html        Baseline systems and tools
participate.html      Steps from registration to paper, rules
dates.html            Full timeline, calendar export
leaderboard.html      Official results (empty until results exist)
news.html             Announcements
faq.html              Questions with settled answers
organisers.html       People
contact.html          Email and postal address
404.html              Custom "page not found" (served by GitHub Pages)

content/              All changeable data (edit these, not the pages)
  site.json           Name, host, time zone, contact, links, release status
  timeline.json       Every date on the site
  news.json           Announcements
  leaderboard.json    Results
  people.json         Organisers, committee, sponsors
  faq.json            FAQ entries
assets/css/site.css   Styles (design tokens at the top)
assets/js/site.js     Renders the content files; no dependencies
assets/img/           Logos (IISc, SPIRE Lab, RESPIN, ASLI 2027), resized from the originals in reference_docs/
tools/sync-layout.mjs Optional: rewrites header/nav/footer on every page
.nojekyll             Tells GitHub Pages to serve files as they are
```

`reference_docs/` (proposal, organiser input sheets, planning audit) is listed in `.gitignore` and is **not** published.

## Unconfirmed details

Anything not yet confirmed by the organisers is left out of the pages and marked in the code with `NEED THESE DETAILS` (HTML comments, comments in `site.js`) or `_NEED_THESE_DETAILS` (keys in `content/*.json`). The full list is kept in `reference_docs/ASLI2027_NEED_THESE_DETAILS.txt`.

## How content flows

1. Organisers fill in the text sheets in `reference_docs/` (`ASLI2027_*.txt`).
2. Claude (or anyone) copies the confirmed values into `content/*.json` and, for prose, into the relevant page.
3. A value that is `null` in the JSON is never shown as if it existed: the site shows "to be announced", hides buttons that would have no destination, and keeps "not yet released" in the status table.

## Updating announcements

Edit `content/news.json` and add an object to `items`:

```json
{
  "date": "2027-02-01",
  "category": "Data",
  "title": "Training and development data released",
  "body": "First paragraph.\n\nSecond paragraph with a [link](data.html) and **bold** text.",
  "link": "https://example.org/data",
  "linkText": "Download instructions",
  "pinned": false
}
```

- `category`: Announcement, Data, Rules, Deadline or Results.
- Order does not matter; the newest is shown first automatically.
- The home page shows the three newest (pinned items first). The news page shows all, with a category filter once there is more than one category.
- Set `"publish": false` to keep a draft in the file without showing it.
- To remove an announcement, delete its object.

## Updating deadlines

All dates live in `content/timeline.json`. Each event has:

| Field | Meaning |
|---|---|
| `date` | `YYYY-MM-DD`, or `null` for "to be announced" |
| `time` | `"23:59"` for deadlines, `null` for whole-day events |
| `endDate` | optional, for multi-day events |
| `status` | `confirmed` or `tentative` (tentative is labelled on the site) |
| `countdown` | `true` lets the event appear as the "next date" in the top strip and countdown (both are switched off for now: set `SHOW_NEXT_DATE = true` in `assets/js/site.js` once the dates are final) |

Times are in the site time zone set in `content/site.json` (`timezone.utcOffsetMinutes`; AoE is `-720`). The site converts deadlines to each visitor's local time, marks past dates as passed, never shows a passed date as upcoming, and offers an `.ics` calendar download.

Page prose mentions a few dates in words (for example on `participate.html`). If a date changes, search the HTML files for the old date as well.

## Updating the leaderboard

Only enter official results. In `content/leaderboard.json`:

1. Add entries to the right board:
   ```json
   { "rank": 1, "team": "Team name", "affiliation": "University", "system": "E2E",
     "primary": 45.2, "secondary": { "BLEU": 18.3 } }
   ```
   Baseline reference rows use `"isBaseline": true` and no rank.
2. Optional per-direction scores for the 9 x 9 heatmap: `"directions": { "bn-hi": 41.2, ... }` using the challenge codes `bn bh ch hi kn mg mt mr te`.
3. Set `"published": true`. Until then, every board shows an explanatory empty state.

## Updating other content

- **Contact, registration, server and data links:** `content/site.json`. Filling a link (for example `links.registration`) makes the matching button appear everywhere.
- **Release status table (home):** `resources` in `content/site.json`. Add a `url` when an item is released.
- **People:** `content/people.json`.
- **FAQ:** `content/faq.json`. Only add questions with settled answers.
- **Page text:** edit the HTML file directly. Keep the `<!-- layout:... -->` markers.
- **Footer logos:** the logo list and their links are at the top of `tools/sync-layout.mjs` (`ORGANISERS`, `HOST_LOGO`); run the script after changing them.
- **Navigation, challenge name, host details in header/footer:** change `tools/sync-layout.mjs` or `content/site.json`, then run `node tools/sync-layout.mjs` from the repository root. It rewrites the shared header, navigation and footer on every page.

## Previewing locally

The pages load `content/*.json`, so open them through a web server rather than by double-clicking:

```
python -m http.server 8000
```

Then visit http://localhost:8000/.

## Deploying

Repository: [respin-challenges/madst2027](https://github.com/respin-challenges/madst2027). Site address: https://respin-challenges.github.io/madst2027/

1. Push to `main`.
2. In the repository, go to **Settings > Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`. Changes go live a minute or two after each push.
3. Do not enable Pages before the ASLI 2027 challenge-proposal notification (17 Dec 2026): a live site presents MADST as an ASLI 2027 challenge.
4. Once the site loads, uncomment the prepared MADST entry in `index.html` of [respin-challenges.github.io](https://github.com/respin-challenges/respin-challenges.github.io) so the RESPIN challenges page links to it.

All links are relative, so the site also works at a domain root or under a custom domain (add a `CNAME` file). The custom `404.html` detects whether the site is served from a domain root or a `/<repository>/` subpath, so its links and styles work in both cases.

## Design notes

- The direction matrix (nine languages by nine) is the identity element; the same grid becomes the per-direction score heatmap on the leaderboard. It makes no claim about which languages appear in other benchmarks.
- Colour: an indigo scale, plus one warm accent reserved for the next deadline. Status is always given in text, never by colour alone.
- Logos: the ASLI 2027 logo sits next to the host line on the home page; the IISc, SPIRE Lab, RESPIN and ASLI logos appear in a white band at the top of every footer, each with its name written beside it. No other decorative images.
- Type: Anek (Ek Type) for headings and interface; Source Serif 4 for reading text. Native-script names are hidden until the organisers confirm them (`SHOW_NATIVE` in `assets/js/site.js`); turning them on and running `node tools/sync-layout.mjs` also adds the subset Indic-script fonts.
- Accessibility: skip link, visible focus, keyboard-operable matrix, labelled regions for scrolling tables, reduced-motion support, WCAG AA contrast.
