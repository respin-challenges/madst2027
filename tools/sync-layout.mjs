#!/usr/bin/env node
/*
  Keeps the shared head links, header, navigation and footer identical on
  every page. Pages stay plain static HTML; this script only rewrites the
  regions between these markers:

    <!-- layout:head -->    ... <!-- /layout:head -->
    <!-- layout:header -->  ... <!-- /layout:header -->
    <!-- layout:footer -->  ... <!-- /layout:footer -->

  Run from the repository root after changing the navigation or the
  challenge name / host in content/site.json:

    node tools/sync-layout.mjs

  No dependencies. Optional: the site works without ever running it.
*/
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(readFileSync(join(root, 'content', 'site.json'), 'utf8'));

// Navigation, in display order.
const NAV = [
  ['challenge.html', 'Challenge'],
  ['data.html', 'Data'],
  ['evaluation.html', 'Evaluation'],
  ['baselines.html', 'Baselines'],
  ['participate.html', 'Participate'],
  ['dates.html', 'Dates'],
  ['leaderboard.html', 'Leaderboard'],
  ['news.html', 'News'],
  ['faq.html', 'FAQ'],
  ['organisers.html', 'Organisers'],
  ['contact.html', 'Contact'],
];

// Logos in the footer band. Images are decorative (alt=""), because the
// name is written next to each one. url: null shows the logo without a link.
const ORGANISERS = [
  { img: 'assets/img/iisc.png', w: 181, h: 160, name: 'Indian Institute of Science', url: null },
  { img: 'assets/img/spire.png', w: 104, h: 160, name: 'SPIRE Lab', url: 'https://spire.ee.iisc.ac.in/' },
  { img: 'assets/img/respin.png', w: 246, h: 160, name: 'RESPIN', url: 'https://respin.iisc.ac.in/' },
];
const HOST_LOGO = { img: 'assets/img/asli.png', w: 211, h: 160 };

const longDate = (iso) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(iso + 'T00:00:00Z'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Native-script characters used on the site: taken from site.js so the
// Indic font files are subset to exactly what is displayed.
const js = readFileSync(join(root, 'assets', 'js', 'site.js'), 'utf8');
const natives = [...js.matchAll(/native:\s*'([^']+)'/g)].map((m) => m[1]).join('');
const indicText = [...new Set([...natives])].join('');
const showNative = /var SHOW_NATIVE = true/.test(js);
const indicFonts = showNative
  ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500&amp;family=Anek+Devanagari:wght@500&amp;family=Anek+Kannada:wght@500&amp;family=Anek+Telugu:wght@500&amp;display=swap&amp;text=${encodeURIComponent(indicText)}">`
  : '<!-- Indic-script fonts are added here automatically when SHOW_NATIVE is true in assets/js/site.js -->';

const head = `
  <link rel="icon" href="data:,">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Latin:wdth,wght@75..125,400..700&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400&amp;display=swap">
  ${indicFonts}
  <link rel="stylesheet" href="assets/css/site.css">
  <script src="assets/js/site.js" defer></script>
  `;

function header(current) {
  const items = NAV.map(([href, label]) =>
    `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n          ');
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <aside id="deadline-strip" class="deadline-strip" aria-label="Next date" hidden><div class="wrap"></div></aside>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="index.html"${current === 'index.html' ? ' aria-current="page"' : ''}>
        <span class="brand-name">${esc(site.shortName)}</span>
        <span class="brand-host">Challenge at ${esc(site.host.name)}</span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav id="site-nav" class="site-nav" aria-label="Main">
        <ul>
          ${items}
        </ul>
      </nav>
    </div>
  </header>
  `;
}

function org(o) {
  const inner = `<img src="${o.img}" width="${Math.round(o.w / 2)}" height="${Math.round(o.h / 2)}" alt="" loading="lazy"><span>${esc(o.name)}</span>`;
  return o.url ? `<li><a class="org" href="${esc(o.url)}">${inner}</a></li>` : `<li><span class="org">${inner}</span></li>`;
}

function footer() {
  const links = [['index.html', 'Home'], ...NAV].map(([href, label]) =>
    `<li><a href="${href}">${label}</a></li>`).join('\n          ');
  const host = { ...HOST_LOGO, name: site.host.name, url: site.host.url };
  return `
  <footer class="site-footer">
    <div class="footer-orgs">
      <div class="wrap footer-orgs-inner">
        <div class="org-group">
          <h2>Organised by</h2>
          <ul class="org-list">
            ${ORGANISERS.map(org).join('\n            ')}
          </ul>
        </div>
        <div class="org-group">
          <h2>Hosted at</h2>
          <ul class="org-list">
            ${org(host)}
          </ul>
        </div>
      </div>
    </div>
    <div class="wrap footer-grid">
      <div>
        <p class="footer-name">${esc(site.name)}</p>
        <p>Multilingual any-direction speech translation across nine Indian languages.</p>
        <p>A challenge at <a href="${esc(site.host.url)}">${esc(site.host.name)}</a>, ${esc(site.host.dates)}, ${esc(site.host.city)}.</p>
      </div>
      <div>
        <h2>Contact</h2>
        <p data-contact="email">${site.contact.email ? `<a href="mailto:${esc(site.contact.email)}">${esc(site.contact.email)}</a>` : 'Contact address to be announced.'}</p>
        <p data-contact="discussionUrl"></p>
        <p><a href="contact.html">All contact details</a></p>
      </div>
      <div>
        <h2>Pages</h2>
        <ul class="footer-links">
          ${links}
        </ul>
      </div>
    </div>
    <div class="wrap footer-base">
      <span>Last updated <span data-last-updated>${esc(longDate(site.lastUpdated))}</span></span>
      <span>Paper deadlines are 23:59 ${esc(site.timezone.name)} (${esc(site.timezone.label)}), as set by ${esc(site.host.name)}.</span>
    </div>
  </footer>
  `;
}

function replaceRegion(html, name, content, file) {
  const re = new RegExp(`(<!-- layout:${name} -->)[\\s\\S]*?(<!-- /layout:${name} -->)`);
  if (!re.test(html)) { console.warn(`  ${file}: no layout:${name} markers, skipped`); return html; }
  return html.replace(re, `$1${content}$2`);
}

const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
for (const file of pages) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  const before = html;
  html = replaceRegion(html, 'head', head, file);
  html = replaceRegion(html, 'header', header(file), file);
  html = replaceRegion(html, 'footer', footer(), file);
  if (html !== before) { writeFileSync(path, html); console.log(`updated ${file}`); }
  else console.log(`unchanged ${file}`);
}
