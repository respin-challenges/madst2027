/* =====================================================================
   MADST Challenge - site script (no dependencies)
   Content lives in content/*.json. This file only renders it.
   ===================================================================== */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Languages (order = matrix order).
  // code: challenge language codes, as given by the organisers.
  // lang: HTML language tag for screen readers (BCP 47). Kept separate
  //       because several challenge codes are other languages' ISO 639-1
  //       codes (bh, ch, mg, mt), which would mislabel the text.
  // native: native-script names.
  //   NEED THESE DETAILS: organisers to confirm the native-script spellings.
  //   They are not displayed until SHOW_NATIVE is set to true.
  //   NEED THESE DETAILS: no claim about which languages appear in existing
  //   speech translation benchmarks is shown; see
  //   reference_docs/ASLI2027_benchmark_survey.txt.
  // ------------------------------------------------------------------
  var SHOW_NATIVE = false;
  var LANGS = [
    { code: 'bn', lang: 'bn',  en: 'Bengali',       native: 'বাংলা' },
    { code: 'bh', lang: 'bho', en: 'Bhojpuri',      native: 'भोजपुरी' },
    { code: 'ch', lang: 'hne', en: 'Chhattisgarhi', native: 'छत्तीसगढ़ी' },
    { code: 'hi', lang: 'hi',  en: 'Hindi',         native: 'हिन्दी' },
    { code: 'kn', lang: 'kn',  en: 'Kannada',       native: 'ಕನ್ನಡ' },
    { code: 'mg', lang: 'mag', en: 'Magahi',        native: 'मगही' },
    { code: 'mt', lang: 'mai', en: 'Maithili',      native: 'मैथिली' },
    { code: 'mr', lang: 'mr',  en: 'Marathi',       native: 'मराठी' },
    { code: 'te', lang: 'te',  en: 'Telugu',        native: 'తెలుగు' }
  ];
  var DEV_PER_DIRECTION = 1800;   // proposal: 200 groups x 9 source languages
  var TEST_PER_DIRECTION = 2700;  // proposal: 300 groups x 9 source languages

  var DAY = 86400000;

  // ------------------------------------------------------------------
  // Utilities
  // ------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^[a-z0-9_\-./#?=&%]+$/i.test(u) && !/^\/\//.test(u)) return u; // relative
    return null;
  }

  // Minimal formatting: blank line = paragraph, **bold**, [text](url)
  function rich(text) {
    if (!text) return '';
    return String(text).split(/\n\s*\n/).map(function (para) {
      var html = esc(para.trim()).replace(/\n/g, '<br>');
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
        var u = safeUrl(url.replace(/&amp;/g, '&'));
        return u ? '<a href="' + esc(u) + '">' + label + '</a>' : label;
      });
      return '<p>' + html + '</p>';
    }).join('');
  }

  function fmtInt(n) { return Number(n).toLocaleString('en-US'); }

  var cache = {};
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch('content/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    return cache[name];
  }

  function showError(el, what, site) {
    var hint = location.protocol === 'file:'
      ? ' This page was opened directly from disk; open it through a web server instead (see README).'
      : ' Reload the page to try again.';
    var contact = site && site.contact && site.contact.email
      ? ' If the problem continues, email <a href="mailto:' + esc(site.contact.email) + '">' + esc(site.contact.email) + '</a>.'
      : '';
    el.innerHTML = '<div class="state state-error" role="alert"><strong>Could not load ' + esc(what) + '.</strong><p>' + esc(hint.trim()) + contact + '</p></div>';
    el.removeAttribute('aria-busy');
  }

  function done(el) { el.removeAttribute('aria-busy'); }

  // ------------------------------------------------------------------
  // Dates and time zones
  // All event times are wall-clock times in the site time zone
  // (content/site.json -> timezone.utcOffsetMinutes; AoE = -720).
  // ------------------------------------------------------------------
  function parts(dateStr) { var p = dateStr.split('-').map(Number); return { y: p[0], m: p[1], d: p[2] }; }

  function instant(dateStr, timeStr, offsetMin) {
    var p = parts(dateStr);
    var t = (timeStr || '00:00').split(':').map(Number);
    return new Date(Date.UTC(p.y, p.m - 1, p.d, t[0], t[1]) - offsetMin * 60000);
  }

  function evStart(ev, off) { return instant(ev.date, ev.time, off); }
  function evEnd(ev, off) {
    if (ev.time && !ev.endDate) return instant(ev.date, ev.time, off);
    return new Date(instant(ev.endDate || ev.date, '23:59', off).getTime() + 59999);
  }

  var fmtLong = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  var fmtDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  var fmtShort = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  var fmtLocal = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

  function civil(dateStr) { var p = parts(dateStr); return new Date(Date.UTC(p.y, p.m - 1, p.d)); }
  function dayText(dateStr, withWeekday) { return (withWeekday ? fmtLong : fmtDay).format(civil(dateStr)); }

  function rangeText(ev) {
    if (!ev.endDate) return dayText(ev.date);
    var a = parts(ev.date), b = parts(ev.endDate);
    if (a.y === b.y) return fmtShort.format(civil(ev.date)) + ' – ' + dayText(ev.endDate);
    return dayText(ev.date) + ' – ' + dayText(ev.endDate);
  }

  // Calendar days from "today in the site time zone" to the event date.
  function daysUntil(dateStr, off, now) {
    var local = new Date(now.getTime() + off * 60000);
    var today = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
    return Math.round((civil(dateStr).getTime() - today) / DAY);
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function timeLeft(ev, off, now) {
    if (!ev.time) {
      var d = daysUntil(ev.date, off, now);
      if (d <= 0) return 'today';
      if (d === 1) return 'tomorrow';
      return 'in ' + plural(d, 'day');
    }
    var ms = evStart(ev, off).getTime() - now.getTime();
    if (ms <= 0) return 'now closed';
    var days = Math.floor(ms / DAY);
    var hours = Math.floor((ms % DAY) / 3600000);
    var mins = Math.floor((ms % 3600000) / 60000);
    if (days >= 1) return plural(days, 'day') + ', ' + plural(hours, 'hour') + ' left';
    if (hours >= 1) return plural(hours, 'hour') + ', ' + plural(mins, 'minute') + ' left';
    return plural(Math.max(mins, 1), 'minute') + ' left';
  }

  function classify(events, off, now) {
    var dated = events.filter(function (e) { return !!e.date; });
    var undated = events.filter(function (e) { return !e.date; });
    dated.sort(function (a, b) { return evStart(a, off) - evStart(b, off); });
    var upcoming = dated.filter(function (e) { return evEnd(e, off) > now; });
    var next = upcoming.filter(function (e) { return e.countdown; })[0] || upcoming[0] || null;
    return { dated: dated, undated: undated, upcoming: upcoming, next: next };
  }

  function statusTag(ev) {
    return ev.status === 'confirmed'
      ? '<span class="tag tag-confirmed">Confirmed</span>'
      : '<span class="tag tag-tentative">Tentative</span>';
  }

  function deadlineTimeText(ev, tz) {
    return ev.time ? ev.time + ' ' + esc(tz.label) : '';
  }

  // ------------------------------------------------------------------
  // Site-wide bindings (contact, links, host, last updated)
  // ------------------------------------------------------------------
  function bindSite(site) {
    $all('[data-contact]').forEach(function (el) {
      var key = el.getAttribute('data-contact') || 'email';
      var v = site.contact && site.contact[key];
      if (!v) return; // keep the static "to be announced" text
      if (/email/i.test(key)) el.innerHTML = '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>';
      else el.innerHTML = '<a href="' + esc(safeUrl(v) || '#') + '">' + esc((site.contact.discussionLabel) || v) + '</a>';
    });
    $all('[data-link]').forEach(function (el) {
      var u = site.links && safeUrl(site.links[el.getAttribute('data-link')]);
      if (u) { el.setAttribute('href', u); el.hidden = false; }
    });
    $all('[data-link-missing]').forEach(function (el) {
      var u = site.links && site.links[el.getAttribute('data-link-missing')];
      if (u) el.hidden = true;
    });
    $all('[data-last-updated]').forEach(function (el) {
      if (site.lastUpdated) el.textContent = dayText(site.lastUpdated);
    });
    $all('[data-tz]').forEach(function (el) {
      var tz = site.timezone || {};
      if (tz.note) el.innerHTML = rich(tz.note).replace(/^<p>|<\/p>$/g, '');
    });
  }

  // ------------------------------------------------------------------
  // Deadline strip (every page)
  // ------------------------------------------------------------------
  function renderStrip(site, tl) {
    var el = $('#deadline-strip');
    if (!el) return;
    var tz = site.timezone;
    function paint() {
      var c = classify(tl.events, tz.utcOffsetMinutes, new Date());
      var ev = c.next;
      if (!ev) { el.hidden = true; return; }
      var when = dayText(ev.date) + (ev.time ? ', ' + ev.time + ' ' + tz.label : '');
      el.querySelector('.wrap').innerHTML =
        '<span>Next date</span>' +
        '<a href="dates.html#' + esc(ev.id) + '">' + esc(ev.title) + '</a>' +
        '<span class="ds-when">' + esc(when) + ', ' + esc(timeLeft(ev, tz.utcOffsetMinutes, new Date())) + '</span>' +
        (ev.status !== 'confirmed' ? '<span class="tag tag-tentative">Tentative</span>' : '');
      el.hidden = false;
    }
    paint();
    setInterval(paint, 60000);
  }

  // ------------------------------------------------------------------
  // Timeline
  // ------------------------------------------------------------------
  function timelineItem(ev, tz, now, nextId, showLocal) {
    var off = tz.utcOffsetMinutes;
    var past = evEnd(ev, off) <= now;
    var cls = past ? 'is-past' : (ev.id === nextId ? 'is-next' : '');
    var dateLine = ev.endDate ? rangeText(ev) : dayText(ev.date, true);
    var timeLine = ev.time ? deadlineTimeText(ev, tz) : '';
    var local = '';
    if (showLocal && ev.time && !past) {
      local = '<p class="t-desc">Your local time: ' + esc(fmtLocal.format(evStart(ev, off))) + '</p>';
    }
    var meta = past
      ? '<span class="tag">Passed</span>'
      : statusTag(ev) + (ev.id === nextId ? ' <span class="tag tag-next">Next</span>' : '');
    return '<li id="' + esc(ev.id) + '" class="' + cls + '">' +
      '<div class="t-date">' + esc(dateLine) + (timeLine ? '<small>' + timeLine + '</small>' : '') + '</div>' +
      '<div><div class="t-title">' + esc(ev.title) + '</div>' +
      (ev.description ? '<p class="t-desc">' + esc(ev.description) + '</p>' : '') +
      local +
      '<div class="t-meta">' + meta + '</div></div></li>';
  }

  function renderTimeline(el, site, tl) {
    var tz = site.timezone;
    var now = new Date();
    var c = classify(tl.events, tz.utcOffsetMinutes, now);
    var mode = el.getAttribute('data-mode') || 'full';
    var ids = (el.getAttribute('data-ids') || '').split(',').filter(Boolean);
    var list, html = '';

    if (ids.length) {
      list = tl.events.filter(function (e) { return ids.indexOf(e.id) !== -1; });
      var datedSel = list.filter(function (e) { return e.date; }).sort(function (a, b) { return evStart(a, tz.utcOffsetMinutes) - evStart(b, tz.utcOffsetMinutes); });
      html = '<ol class="timeline">' + datedSel.map(function (e) { return timelineItem(e, tz, now, c.next && c.next.id, false); }).join('') +
        list.filter(function (e) { return !e.date; }).map(tbaItem).join('') + '</ol>';
    } else if (mode === 'upcoming') {
      var n = parseInt(el.getAttribute('data-limit') || '5', 10);
      list = c.upcoming.slice(0, n);
      html = list.length
        ? '<ol class="timeline">' + list.map(function (e) { return timelineItem(e, tz, now, c.next && c.next.id, false); }).join('') + '</ol>'
        : '<div class="state"><strong>No upcoming dates.</strong><p>All scheduled dates have passed. See the <a href="dates.html">full timeline</a>.</p></div>';
    } else {
      html = '<ol class="timeline">' + c.dated.map(function (e) { return timelineItem(e, tz, now, c.next && c.next.id, true); }).join('') + '</ol>';
      if (c.undated.length) {
        html += '<h3 id="tba">Dates still to be announced</h3><ol class="timeline">' + c.undated.map(tbaItem).join('') + '</ol>';
      }
    }
    el.innerHTML = html;
    done(el);
  }

  function tbaItem(ev) {
    return '<li id="' + esc(ev.id) + '"><div class="t-date">To be announced</div><div><div class="t-title">' + esc(ev.title) + '</div>' +
      (ev.description ? '<p class="t-desc">' + esc(ev.description) + '</p>' : '') + '</div></li>';
  }

  function renderCountdown(el, site, tl) {
    var tz = site.timezone;
    function paint() {
      var now = new Date();
      var ev = classify(tl.events, tz.utcOffsetMinutes, now).next;
      if (!ev) {
        el.innerHTML = '<div class="state"><strong>No upcoming deadlines.</strong><p>See the <a href="dates.html">full timeline</a> for past dates.</p></div>';
        return;
      }
      el.innerHTML = '<div class="countdown">' +
        '<span class="c-label">Next date' + (ev.status !== 'confirmed' ? ' (tentative)' : '') + '</span>' +
        '<span class="c-title">' + esc(ev.title) + '</span>' +
        '<span class="c-date">' + esc(dayText(ev.date, true)) + (ev.time ? ', ' + esc(ev.time) + ' ' + esc(tz.label) : '') + '</span>' +
        '<span class="c-left" aria-live="off">' + esc(timeLeft(ev, tz.utcOffsetMinutes, now)) + '</span>' +
        (ev.time ? '<span class="c-tz">Your local time: ' + esc(fmtLocal.format(evStart(ev, tz.utcOffsetMinutes))) + '</span>' : '') +
        '</div>';
    }
    paint();
    done(el);
    setInterval(paint, 30000);
  }

  // ------------------------------------------------------------------
  // Calendar (.ics) export
  // ------------------------------------------------------------------
  function icsDate(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsDay(dateStr, addDays) {
    var d = new Date(civil(dateStr).getTime() + (addDays || 0) * DAY);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
  function icsText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function fold(line) {
    var out = [];
    while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); }
    out.push(line);
    return out.join('\r\n');
  }

  function buildIcs(site, tl) {
    var off = site.timezone.utcOffsetMinutes;
    var stamp = icsDate(new Date());
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MADST Challenge//Dates//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + icsText(site.name)];
    tl.events.filter(function (e) { return e.date; }).forEach(function (e) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + e.id + '@madst-challenge');
      lines.push('DTSTAMP:' + stamp);
      if (e.time) {
        var t = evStart(e, off);
        lines.push('DTSTART:' + icsDate(t));
        lines.push('DTEND:' + icsDate(t));
      } else {
        lines.push('DTSTART;VALUE=DATE:' + icsDay(e.date));
        lines.push('DTEND;VALUE=DATE:' + icsDay(e.endDate || e.date, 1));
      }
      lines.push(fold('SUMMARY:' + icsText(site.shortName + ': ' + e.title + (e.status !== 'confirmed' ? ' (tentative)' : ''))));
      if (e.description) lines.push(fold('DESCRIPTION:' + icsText(e.description)));
      lines.push('STATUS:' + (e.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  function bindIcs(site, tl) {
    $all('[data-ics]').forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener('click', function () {
        var blob = new Blob([buildIcs(site, tl)], { type: 'text/calendar;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'madst-challenge-dates.ics';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      });
    });
  }

  // ------------------------------------------------------------------
  // Resource status table (home)
  // ------------------------------------------------------------------
  function renderStatus(el, site, tl) {
    var off = site.timezone.utcOffsetMinutes;
    var byId = {};
    tl.events.forEach(function (e) { byId[e.id] = e; });
    var rows = site.resources.map(function (r) {
      var ev = r.event && byId[r.event];
      var expected = ev && ev.date
        ? esc(dayText(ev.date)) + (ev.status !== 'confirmed' ? ' <span class="tag tag-tentative">Tentative</span>' : '')
        : (r.expectedText ? esc(r.expectedText) : '<span class="muted">To be announced</span>');
      var url = safeUrl(r.url);
      var state = url
        ? '<a class="tag tag-available" href="' + esc(url) + '">Available</a>'
        : (ev && ev.date && evEnd(ev, off) < new Date() ? '<span class="tag">Not yet linked</span>' : '<span class="tag">Not yet released</span>');
      return '<tr><th scope="row">' + esc(r.label) + '</th><td>' + expected + '</td><td>' + state + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="table-scroll" tabindex="0" role="region" aria-label="Release status"><table class="data status-table">' +
      '<thead><tr><th scope="col">Item</th><th scope="col">Expected</th><th scope="col">Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    done(el);
  }

  // ------------------------------------------------------------------
  // News
  // ------------------------------------------------------------------
  function newsItem(item, compact) {
    var link = safeUrl(item.link);
    var body = item.body || '';
    if (compact) body = body.split(/\n\s*\n/)[0];
    return '<li class="news-item"><article><header>' +
      '<time datetime="' + esc(item.date) + '">' + esc(dayText(item.date)) + '</time>' +
      (item.category ? '<span class="tag">' + esc(item.category) + '</span>' : '') +
      (item.pinned && compact ? '<span class="tag tag-next">Pinned</span>' : '') +
      '<h3>' + esc(item.title) + '</h3></header>' +
      '<div class="news-body">' + rich(body) + '</div>' +
      (link ? '<a class="news-link" href="' + esc(link) + '">' + esc(item.linkText || 'Read more') + '</a>' : '') +
      '</article></li>';
  }

  function renderNews(el, data) {
    var limit = parseInt(el.getAttribute('data-limit') || '0', 10);
    var compact = el.hasAttribute('data-compact');
    var items = (data.items || []).filter(function (i) { return i && i.date && i.title && i.publish !== false; });
    items.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    if (limit) {
      items.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });
      items = items.slice(0, limit);
    }
    if (!items.length) {
      el.innerHTML = '<div class="state"><strong>No announcements yet.</strong></div>';
      done(el);
      return;
    }
    var filterable = el.hasAttribute('data-filter');
    var cats = [];
    items.forEach(function (i) { if (i.category && cats.indexOf(i.category) === -1) cats.push(i.category); });
    var bar = '';
    if (filterable && cats.length > 1) {
      bar = '<div class="filter-bar" role="group" aria-label="Filter announcements by category">' +
        '<button type="button" aria-pressed="true" data-cat="">All</button>' +
        cats.map(function (c) { return '<button type="button" aria-pressed="false" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') +
        '</div>';
    }
    el.innerHTML = bar + '<ol class="news-list' + (compact ? ' news-compact' : '') + '">' + items.map(function (i) { return newsItem(i, compact); }).join('') + '</ol>' +
      '<p class="visually-hidden" aria-live="polite" data-news-status></p>';
    if (bar) {
      var lis = $all('.news-item', el);
      $all('.filter-bar button', el).forEach(function (b) {
        b.addEventListener('click', function () {
          var cat = b.getAttribute('data-cat');
          $all('.filter-bar button', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          var shown = 0;
          lis.forEach(function (li, idx) {
            var match = !cat || items[idx].category === cat;
            li.hidden = !match;
            if (match) shown++;
          });
          $('[data-news-status]', el).textContent = 'Showing ' + plural(shown, 'announcement') + '.';
        });
      });
    }
    done(el);
  }

  // ------------------------------------------------------------------
  // Direction matrix
  // ------------------------------------------------------------------
  function directionText(src, tgt) {
    return '<strong>' + esc(src.en) + ' to ' + esc(tgt.en) + '</strong> (' + src.code + '–' + tgt.code + '): ' + fmtInt(DEV_PER_DIRECTION) + ' development and ' +
      fmtInt(TEST_PER_DIRECTION) + ' test sentences, each with human reference text and human reference speech.';
  }

  function buildMatrix(opts) {
    // opts.cell(src, tgt, r, c) -> {attrs, content, label}
    var head = '<thead><tr><th class="corner" scope="col"><span class="visually-hidden">Source language</span><span aria-hidden="true">From \u2193 to \u2192</span></th>' +
      LANGS.map(function (l, c) {
        return '<th scope="col" data-c="' + c + '"><abbr class="code" title="' + esc(l.en) + '">' + l.code + '</abbr><span class="visually-hidden">' + esc(l.en) + '</span></th>';
      }).join('') + '</tr></thead>';
    var body = '<tbody>' + LANGS.map(function (src, r) {
      return '<tr data-r="' + r + '"><th scope="row"><span class="en">' + esc(src.en) + '</span><abbr class="code-row" title="' + esc(src.en) + '" aria-hidden="true">' + src.code + '</abbr>' +
        (SHOW_NATIVE ? '<span class="native" lang="' + src.lang + '">' + esc(src.native) + '</span>' : '') + '</th>' +
        LANGS.map(function (tgt, c) {
          if (r === c) return '<td class="matrix-cell diag"><span class="visually-hidden">Same language, not evaluated</span></td>';
          var cell = opts.cell(src, tgt, r, c);
          return '<td class="matrix-cell' + (cell.cls ? ' ' + cell.cls : '') + '" data-r="' + r + '" data-c="' + c + '" tabindex="-1" style="--r:' + r + ';--c:' + c + (cell.style ? ';' + cell.style : '') + '"' +
            (cell.attrs || '') + ' aria-label="' + esc(cell.label) + '">' + (cell.content || '') + '</td>';
        }).join('') + '</tr>';
    }).join('') + '</tbody>';
    return head + body;
  }

  function wireMatrix(table, readout, describe, idle) {
    var cells = $all('td.matrix-cell:not(.diag)', table);
    if (!cells.length) return;
    cells[0].tabIndex = 0;
    function at(r, c) { return $('td[data-r="' + r + '"][data-c="' + c + '"]', table); }
    function highlight(cell) {
      $all('.is-active, .is-row, .is-col', table).forEach(function (n) { n.classList.remove('is-active', 'is-row', 'is-col'); });
      if (!cell) { if (readout) readout.innerHTML = idle; return; }
      var r = +cell.getAttribute('data-r'), c = +cell.getAttribute('data-c');
      cell.classList.add('is-active');
      cell.parentNode.classList.add('is-row');
      var colHead = $('thead th[data-c="' + c + '"]', table);
      if (colHead) colHead.classList.add('is-col');
      if (readout) readout.innerHTML = describe(LANGS[r], LANGS[c], cell);
    }
    cells.forEach(function (cell) {
      cell.addEventListener('mouseenter', function () { highlight(cell); });
      cell.addEventListener('focus', function () {
        cells.forEach(function (x) { x.tabIndex = -1; });
        cell.tabIndex = 0;
        highlight(cell);
      });
      cell.addEventListener('click', function () { cell.focus(); });
    });
    table.addEventListener('mouseleave', function () {
      if (!table.contains(document.activeElement)) highlight(null);
    });
    table.addEventListener('focusout', function (e) {
      if (!table.contains(e.relatedTarget)) highlight(null);
    });
    table.addEventListener('keydown', function (e) {
      var cur = document.activeElement;
      if (!cur || !cur.classList.contains('matrix-cell')) return;
      var r = +cur.getAttribute('data-r'), c = +cur.getAttribute('data-c');
      var n = LANGS.length, dr = 0, dc = 0;
      switch (e.key) {
        case 'ArrowRight': dc = 1; break;
        case 'ArrowLeft': dc = -1; break;
        case 'ArrowDown': dr = 1; break;
        case 'ArrowUp': dr = -1; break;
        case 'Home': c = r === 0 ? 1 : 0; break;
        case 'End': c = r === n - 1 ? n - 2 : n - 1; break;
        default: return;
      }
      e.preventDefault();
      if (dr || dc) {
        var nr = r + dr, nc = c + dc;
        if (nr === nc) { nr += dr; nc += dc; }
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) return;
        r = nr; c = nc;
      }
      var next = at(r, c);
      if (next) next.focus();
    });
  }

  function renderMatrix(el) {
    var idle = 'Point to or tab into a cell to see that direction. Use the arrow keys to move.';
    el.innerHTML =
      '<figure class="matrix-figure">' +
      '<div class="matrix-scroll"><table class="matrix' + (el.hasAttribute('data-animate') ? ' is-animating' : '') + '">' +
      '<caption class="visually-hidden">The 72 evaluated translation directions. Rows are source languages, columns are target languages.</caption>' +
      buildMatrix({
        cell: function (src, tgt) {
          return { label: src.en + ' to ' + tgt.en };
        }
      }) + '</table></div>' +
      '<p class="matrix-readout" aria-live="polite">' + idle + '</p>' +
      '<figcaption class="matrix-caption">All 72 directions among the nine languages are evaluated. Rows are source languages, columns are target languages.</figcaption>' +
      '</figure>';
    var table = $('table.matrix', el);
    wireMatrix(table, $('.matrix-readout', el), function (s, t) { return directionText(s, t); }, idle);
    if (table.classList.contains('is-animating')) {
      setTimeout(function () { table.classList.remove('is-animating'); }, 1600);
    }
    done(el);
  }

  // ------------------------------------------------------------------
  // Leaderboard
  // ------------------------------------------------------------------
  function fmtScore(v) { return v == null || v === '' ? '<span class="muted">–</span>' : esc(typeof v === 'number' ? v.toFixed(1) : v); }

  function heatmap(board) {
    var vals = Object.keys(board.directions || {}).map(function (k) { return board.directions[k]; }).filter(function (v) { return typeof v === 'number'; });
    if (!vals.length) return '';
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var table = '<table class="matrix">' +
      '<caption class="visually-hidden">' + esc(board.primary) + ' per direction, ' + esc(board.task) + ', ' + esc(board.track) + '</caption>' +
      buildMatrix({
        cell: function (src, tgt) {
          var v = board.directions[src.code + '-' + tgt.code];
          if (typeof v !== 'number') return { cls: 'heat', label: src.en + ' to ' + tgt.en + ': no score', content: '<span class="muted">–</span>' };
          var t = max === min ? 1 : (v - min) / (max - min);
          var light = 94 - t * 58; // lightness 94% -> 36%
          var ink = light < 60 ? '#fff' : 'var(--ink)';
          return { cls: 'heat', style: 'background:hsl(232 55% ' + light.toFixed(0) + '%);color:' + ink, label: src.en + ' to ' + tgt.en + ': ' + v.toFixed(1), content: v.toFixed(1) };
        }
      }) + '</table>';
    return '<h4 class="small" style="margin-top:var(--s-5)">' + esc(board.primary) + ' by direction' + (board.directionsLabel ? ' (' + esc(board.directionsLabel) + ')' : '') + '</h4>' +
      '<div class="matrix-scroll">' + table + '</div>';
  }

  function renderLeaderboard(el, lb, site, tl) {
    var byId = {};
    tl.events.forEach(function (e) { byId[e.id] = e; });
    var res = byId.results;
    var when = res && res.date ? dayText(res.date) + (res.status !== 'confirmed' ? ' (tentative)' : '') : 'a date to be announced';
    var html = (lb.note ? '<div class="callout">' + rich(lb.note) + '</div>' : '');
    html += lb.boards.map(function (b) {
      var entries = (lb.published ? b.entries : []) || [];
      var head = '<div class="board" id="' + esc(b.id) + '"><h3>' + esc(b.task) + '</h3>' +
        '<p class="board-meta">' + esc(b.track) + '. Primary metric: ' + esc(b.primary) + (b.aggregation ? ', ' + esc(b.aggregation) : '') + '.' +
        (b.secondary && b.secondary.length ? ' Also reported: ' + esc(b.secondary.join(', ')) + '.' : '') + '</p>';
      if (!entries.length) {
        return head + '<div class="state"><strong>No results yet.</strong><p>Results announcement: ' + esc(when) + '.</p></div></div>';
      }
      var sec = b.secondary || [];
      var rows = entries.map(function (e) {
        return '<tr>' +
          '<td class="n">' + (e.isBaseline ? '<span class="muted">–</span>' : '<span class="rank">' + esc(e.rank) + '</span>') + '</td>' +
          '<th scope="row">' + esc(e.team) + (e.isBaseline ? ' <span class="tag">Baseline</span>' : '') +
          (e.affiliation ? '<div class="small">' + esc(e.affiliation) + '</div>' : '') + '</th>' +
          '<td>' + esc(e.system || '') + '</td>' +
          '<td class="n"><strong>' + fmtScore(e.primary) + '</strong></td>' +
          sec.map(function (m) { return '<td class="n">' + fmtScore(e.secondary && e.secondary[m]) + '</td>'; }).join('') +
          '</tr>';
      }).join('');
      return head + '<div class="table-scroll" tabindex="0" role="region" aria-label="' + esc(b.task + ', ' + b.track) + '"><table class="data">' +
        '<thead><tr><th scope="col" class="n">Rank</th><th scope="col">Team</th><th scope="col">System</th><th scope="col" class="n">' + esc(b.primary) + '</th>' +
        sec.map(function (m) { return '<th scope="col" class="n">' + esc(m) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        heatmap(b) + '</div>';
    }).join('');
    el.innerHTML = html;
    $all('table.matrix', el).forEach(function (t) {
      wireMatrix(t, null, function () { return ''; }, '');
    });
    done(el);
  }

  // ------------------------------------------------------------------
  // FAQ and people
  // ------------------------------------------------------------------
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function renderFaq(el, data) {
    var items = (data.items || []).filter(function (i) { return i.q && i.a; });
    if (!items.length) {
      el.innerHTML = '<div class="state"><strong>No questions answered yet.</strong><p>Answers will be added as the rules are finalised.</p></div>';
      done(el);
      return;
    }
    var groups = [];
    items.forEach(function (i) {
      var g = i.group || 'General';
      var found = groups.filter(function (x) { return x.name === g; })[0];
      if (!found) { found = { name: g, items: [] }; groups.push(found); }
      found.items.push(i);
    });
    el.innerHTML = groups.map(function (g) {
      return '<section><h2 id="' + slug(g.name) + '">' + esc(g.name) + '</h2><div class="faq">' +
        g.items.map(function (i) {
          return '<details id="' + slug(i.q).slice(0, 60) + '"><summary>' + esc(i.q) + '</summary><div class="answer">' + rich(i.a) + '</div></details>';
        }).join('') + '</div></section>';
    }).join('');
    // Open a question linked by hash
    if (location.hash) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target && target.tagName === 'DETAILS') target.open = true;
    }
    done(el);
  }

  function renderPeople(el, data) {
    var key = el.getAttribute('data-people');
    var list = (data[key] || []).filter(function (p) { return p && p.name; });
    var empty = el.getAttribute('data-empty') || 'To be announced.';
    if (!list.length) {
      el.innerHTML = '<div class="state"><strong>To be announced.</strong><p>' + esc(empty) + '</p></div>';
      done(el);
      return;
    }
    el.innerHTML = '<ul class="people">' + list.map(function (p) {
      var u = safeUrl(p.url);
      var name = u ? '<a href="' + esc(u) + '">' + esc(p.name) + '</a>' : esc(p.name);
      return '<li><div class="p-name">' + name + '</div>' +
        (p.affiliation ? '<div class="p-aff">' + esc(p.affiliation) + '</div>' : '') +
        (p.role ? '<div class="p-role">' + esc(p.role) + '</div>' : '') + '</li>';
    }).join('') + '</ul>';
    done(el);
  }

  // ------------------------------------------------------------------
  // Navigation, table of contents
  // ------------------------------------------------------------------
  function initNav() {
    var btn = $('.nav-toggle');
    var nav = $('#site-nav');
    if (!btn || !nav) return;
    function set(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
      btn.textContent = open ? 'Close' : 'Menu';
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    var mq = window.matchMedia('(min-width: 1100px)');
    var onChange = function () { if (mq.matches) set(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  function initToc() {
    var toc = $('.toc[data-auto]');
    var content = $('.content');
    if (!toc || !content) return;
    var heads = $all('h2[id]', content);
    if (heads.length < 2) { toc.hidden = true; return; }
    toc.innerHTML = '<h2>On this page</h2><ul>' + heads.map(function (h) {
      return '<li><a href="#' + h.id + '">' + esc(h.textContent) + '</a></li>';
    }).join('') + '</ul>';
    if (!('IntersectionObserver' in window)) return;
    var links = $all('a', toc);
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(function (h) { obs.observe(h); });
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------
  function each(sel, fn) { $all(sel).forEach(fn); }

  function boot() {
    initNav();
    each('[data-render="matrix"]', renderMatrix);

    var siteP = load('site');
    var tlP = load('timeline');

    Promise.all([siteP, tlP]).then(function (r) {
      var site = r[0], tl = r[1];
      bindSite(site);
      renderStrip(site, tl);
      bindIcs(site, tl);
      each('[data-render="timeline"]', function (el) { try { renderTimeline(el, site, tl); } catch (e) { showError(el, 'the dates', site); } });
      each('[data-render="countdown"]', function (el) { try { renderCountdown(el, site, tl); } catch (e) { showError(el, 'the next deadline', site); } });
      each('[data-render="status"]', function (el) { try { renderStatus(el, site, tl); } catch (e) { showError(el, 'the release status', site); } });

      each('[data-render="leaderboard"]', function (el) {
        load('leaderboard').then(function (lb) { renderLeaderboard(el, lb, site, tl); }).catch(function () { showError(el, 'the leaderboard', site); });
      });
    }).catch(function () {
      each('[data-render="timeline"],[data-render="countdown"],[data-render="status"],[data-render="leaderboard"]', function (el) { showError(el, 'the dates', null); });
    });

    each('[data-render="news"]', function (el) {
      load('news').then(function (d) { renderNews(el, d); }).catch(function () { siteP.then(function (s) { showError(el, 'the announcements', s); }, function () { showError(el, 'the announcements', null); }); });
    });
    each('[data-render="faq"]', function (el) {
      load('faq').then(function (d) { renderFaq(el, d); initToc(); }).catch(function () { showError(el, 'the questions', null); });
    });
    each('[data-render="people"]', function (el) {
      load('people').then(function (d) { renderPeople(el, d); }).catch(function () { showError(el, 'the list of people', null); });
    });

    if (!$('[data-render="faq"]')) initToc();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
