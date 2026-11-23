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
import { createHash } from 'node:crypto';
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

// Logo bar at the top of every page: host conference on the left,
// organisers on the right. w/h are the image files' pixel sizes.
// url: null shows the logo without a link. alt is the organisation's name.
const HOST_LOGO = { img: 'assets/img/asli.png', w: 211, h: 160, cls: 'logo-asli' };
const ORGANISERS = [
  { img: 'assets/img/iisc.png', w: 181, h: 160, name: 'Indian Institute of Science (IISc)', lines: ['IISc', 'Indian Institute of Science'], url: null, cls: 'logo-iisc' },
  { img: 'assets/img/spire.png', w: 104, h: 160, name: 'SPIRE Lab', lines: ['SPIRE Lab', 'IISc'], url: 'https://spire.ee.iisc.ac.in/', cls: 'logo-spire' },
  { img: 'assets/img/respin.png', w: 246, h: 160, name: 'RESPIN', lines: ['RESPIN'], url: 'https://respin.iisc.ac.in/', cls: 'logo-respin' },
];

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

// Version tags on the stylesheet and script, so browsers fetch the new
// files after every change instead of a cached copy.
const ver = (rel) => createHash('sha1').update(readFileSync(join(root, rel))).digest('hex').slice(0, 8);
const cssVer = ver('assets/css/site.css');
const jsVer = ver('assets/js/site.js');

const head = `
  <link rel="icon" href="data:,">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Latin:wdth,wght@75..125,400..700&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400&amp;display=swap">
  ${indicFonts}
  <link rel="stylesheet" href="assets/css/site.css?v=${cssVer}">
  <script src="assets/js/site.js?v=${jsVer}" defer></script>
  `;

function logo(o) {
  // The written name is aria-hidden: the image alt already gives it, and the
  // text is hidden on small screens.
  const text = o.lines ? `<span class="logo-text" aria-hidden="true">${o.lines.map((l, i) => `<span${i === 0 ? ' class="logo-text-main"' : ''}>${esc(l)}</span>`).join('')}</span>` : '';
  const img = `<img src="${o.img}" width="${Math.round(o.w / 2)}" height="${Math.round(o.h / 2)}" alt="${esc(o.name)}">${text}`;
  return o.url
    ? `<a class="logo ${o.cls}" href="${esc(o.url)}" title="${esc(o.name)}">${img}</a>`
    : `<span class="logo ${o.cls}" title="${esc(o.name)}">${img}</span>`;
}

function logoBar() {
  const host = { ...HOST_LOGO, name: site.host.name, url: site.host.url,
    lines: [site.host.name, `${site.host.dates.replace(' November', ' Nov').replace(' December', ' Dec')}, ${site.host.city}`] };
  return `<aside class="logo-bar" aria-label="Host conference and organisers">
    <div class="wrap logo-bar-inner">
      ${logo(host)}
      <ul class="logo-orgs" aria-label="Organised by">
        ${ORGANISERS.map((o) => `<li>${logo(o)}</li>`).join('\n        ')}
      </ul>
    </div>
  </aside>`;
}

function header(current) {
  const items = NAV.map(([href, label]) =>
    `<li><a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a></li>`).join('\n          ');
  return `
  <a class="skip-link" href="#main">Skip to content</a>
  <aside id="deadline-strip" class="deadline-strip" aria-label="Next date" hidden><div class="wrap"></div></aside>
  ${logoBar()}
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

function footer() {
  const links = [['index.html', 'Home'], ...NAV].map(([href, label]) =>
    `<li><a href="${href}">${label}</a></li>`).join('\n          ');
  return `
  <footer class="site-footer">
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
