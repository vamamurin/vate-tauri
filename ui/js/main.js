// ─────────────────────────────────────────────────────────────
//  TAURI BRIDGE
// ─────────────────────────────────────────────────────────────
const { invoke } = window.__TAURI__.core;

// ─────────────────────────────────────────────────────────────
//  COLORS
// ─────────────────────────────────────────────────────────────
const COLORS = [
  { hex: '#c94f2a', name: 'Terracotta' },
  { hex: '#2a7ac9', name: 'Cobalt' },
  { hex: '#2ac97a', name: 'Emerald' },
  { hex: '#c9a82a', name: 'Amber' },
  { hex: '#9b5de5', name: 'Violet' },
  { hex: '#e5635d', name: 'Coral' },
];

// // ─────────────────────────────────────────────────────────────
// //  SETTINGS  (persisted via localStorage) fuk this shit
// // ─────────────────────────────────────────────────────────────
// let settings = {
//   lang:  'en',
//   lunar: false,
// };

// function loadSettings() {
//   try {
//     const saved = localStorage.getItem('calendarSettings');
//     if (saved) settings = { ...settings, ...JSON.parse(saved) };
//   } catch(_) {}
// }

// function saveSettings() {
//   localStorage.setItem('calendarSettings', JSON.stringify(settings));
// }

// ─────────────────────────────────────────────────────────────
//  SETTINGS  (persisted via Rust JSON)
// ─────────────────────────────────────────────────────────────
let settings = {
  lang:       'en',
  lunar:      false,
  holidays:   true,   // show holidays on the calendar
  holidayFx:  true,   // animated decorations for some holidays
};

async function loadSettings() {
  try {
    const saved = await invoke('load_settings'); // Gọi Rust
    if (saved && saved !== "{}") {
      settings = { ...settings, ...JSON.parse(saved) };
    }
  } catch(e) { 
    console.error('Load settings error:', e); 
  }
}

async function saveSettings() {
  try {
    // Gọi Rust, truyền biến settingsJson vào
    await invoke('save_settings', { settingsJson: JSON.stringify(settings) });
  } catch(e) {
    console.error('Save settings error:', e);
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function t(key) { return I18N[settings.lang][key] || I18N.en[key] || key; }
function key(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────────────────────
//  LUNAR CALENDAR  (Hồ Ngọc Đức algorithm, GMT+7)
// ─────────────────────────────────────────────────────────────
const lunarCalc = (() => {
  function INT(d) { return Math.floor(d); }

  function jdFromDate(dd, mm, yy) {
    let a = INT((14 - mm) / 12);
    let y = yy + 4800 - a;
    let m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y
              + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) {
      jd = dd + INT((153 * m + 2) / 5) + 365 * y
           + INT(y / 4) - 32083;
    }
    return jd;
  }

  function jdToDate(jd) {
    let a, b, c, d, e, m;
    if (jd > 2299160) {
      a = jd + 32044;
      b = INT((4 * a + 3) / 146097);
      c = a - INT(146097 * b / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    d = INT((4 * c + 3) / 1461);
    e = c - INT(1461 * d / 4);
    m = INT((5 * e + 2) / 153);
    let day   = e - INT((153 * m + 2) / 5) + 1;
    let month = m + 3 - 12 * INT(m / 10);
    let year  = 100 * b + d - 4800 + INT(m / 10);
    return [day, month, year];
  }

  function newMoonDay(k, timeZone) {
    const T  = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k
              + 0.0001178 * T2 - 0.000000155 * T3
              + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    let M   = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    let Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    let F   = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1  = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M)
              - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr)
              - 0.0004 * Math.sin(dr * 3 * Mpr) + 0.0104 * Math.sin(dr * 2 * F)
              - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr))
              + 0.0004 * Math.sin(dr * (2 * F + M)) - 0.0004 * Math.sin(dr * (2 * F - M))
              - 0.0006 * Math.sin(dr * (2 * F + Mpr)) + 0.001 * Math.sin(dr * (2 * F - Mpr))
              + 0.0005 * Math.sin(dr * (M + 2 * Mpr));
    let deltat;
    if (T < -11) {
      deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
      deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return INT(Jd1 + C1 - deltat + 0.5 + timeZone / 24);
  }

  function sunLongitude(jdn, timeZone) {
    const T  = (jdn - 2451545.5 - timeZone / 24) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M  = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL   = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
               + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
               + 0.00029 * Math.sin(dr * 3 * M);
    let L    = L0 + DL;
    L        = L * dr;
    L        = L - Math.PI * 2 * INT(L / (Math.PI * 2));
    return INT(L / Math.PI * 6);
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k   = INT(off / 29.530588853);
    let nm    = newMoonDay(k, timeZone);
    const sunLng = sunLongitude(nm, timeZone);
    if (sunLng >= 9) nm = newMoonDay(k - 1, timeZone);
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0, i = 1, arc = sunLongitude(newMoonDay(k + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = sunLongitude(newMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  function convertSolarToLunar(dd, mm, yy, timeZone) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k         = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart  = newMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) monthStart = newMoonDay(k, timeZone);

    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1, timeZone);
    }

    const lunarDay   = dayNumber - monthStart + 1;
    const diff       = INT((monthStart - a11) / 29);
    let lunarLeap    = false;
    let lunarMonth   = diff + 11;

    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) lunarLeap = true;
      }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

    return { day: lunarDay, month: lunarMonth, year: lunarYear, leap: lunarLeap };
  }

  // Can Chi cho Năm, Tháng, Ngày
  const CAN  = ['Giáp','Ất','Bính','Đinh','Mậu','Kỷ','Canh','Tân','Nhâm','Quý'];
  const CHI  = ['Tý','Sửu','Dần','Mão','Thìn','Tị','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];

  return {
    get(dd, mm, yy) {
      return convertSolarToLunar(dd, mm, yy, 7);
    },
    canChiYear(y) { 
      return CAN[(y + 6) % 10] + ' ' + CHI[(y + 8) % 12]; 
    },
    canChiMonth(m, y) { 
      return CAN[(y * 12 + m + 3) % 10] + ' ' + CHI[(m + 1) % 12]; 
    },
    canChiDay(d, m, y) {
      const jd = jdFromDate(d, m, y);
      return CAN[(jd + 9) % 10] + ' ' + CHI[(jd + 1) % 12];
    }
  };
})();

// ─────────────────────────────────────────────────────────────
//  APP STATE
// ─────────────────────────────────────────────────────────────
let today    = new Date();
// Always the 1st of the displayed month, so setMonth() never overflows
// (e.g. Jan 31 + 1 month would otherwise become Mar 3)
let current  = new Date(today.getFullYear(), today.getMonth(), 1);
let selected = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
let events   = {};
let chosenColor = COLORS[0].hex;

// ─────────────────────────────────────────────────────────────
//  SAVE / LOAD (Tauri/Rust)
// ─────────────────────────────────────────────────────────────
async function saveToDisk() {
  try {
    await invoke('save_jobs', { jobsJson: JSON.stringify(events) });
  } catch(e) { console.error('Save error:', e); }
}

// ─────────────────────────────────────────────────────────────
//  APPLY LANGUAGE  — updates all data-i18n elements + placeholders
// ─────────────────────────────────────────────────────────────
function applyLanguage() {
  const L = settings.lang;
  const dict = I18N[L];

  // Static text nodes marked with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  // Placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });

  // Sync segment control highlight
  document.querySelectorAll('#langControl .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === L);
  });

  // Sync lunar toggle
  document.getElementById('lunarToggle').checked = settings.lunar;

  // Sync holiday toggles (effects only make sense when holidays are shown)
  document.getElementById('holidayToggle').checked   = settings.holidays;
  document.getElementById('holidayFxToggle').checked = settings.holidayFx;
  document.getElementById('holidayFxRow').classList.toggle('is-disabled', !settings.holidays);
}

// ─────────────────────────────────────────────────────────────
//  HOLIDAY HELPERS  (data lives in holidays.js)
// ─────────────────────────────────────────────────────────────
// y: full year, m0: month 0-11, d: day
function holidaysOn(y, m0, d) {
  if (!settings.holidays) return [];
  return getHolidays(y, m0 + 1, d, (dd, mm, yy) => lunarCalc.get(dd, mm, yy));
}

function holidayName(h) {
  return h[settings.lang] || h.en;
}

// ─────────────────────────────────────────────────────────────
//  HOLIDAY EFFECTS
//  Tier 2: effect inside the selected-day card
//  Tier 3: effect over the whole app
// ─────────────────────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Particle counts: [card, whole app]
const FX_TYPES = {
  petals:    { motion: 'fall',  count: [10, 26] },
  snow:      { motion: 'fall',  count: [14, 42] },
  confetti:  { motion: 'fall',  count: [12, 32] },
  stars:     { motion: 'fall',  count: [8, 20] },
  hearts:    { motion: 'rise',  count: [7, 18] },
  lanterns:  { motion: 'rise',  count: [5, 14] },
  fireworks: { motion: 'burst', count: [3, 6] },   // bursts of 12 sparks each
};

function effectsAllowed() {
  return settings.holidays && settings.holidayFx && !prefersReducedMotion.matches;
}

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * Fill `layer` with particles for one holiday.
 * Colours come from the .fx-theme-<theme> class (see style.css).
 * Does nothing if the same effect is already running, so it never restarts on re-render.
 */
function setFx(layer, holiday, big) {
  const want = holiday ? `${holiday.fx}:${holiday.theme}:${big ? 'big' : 'small'}` : '';
  if (layer.dataset.fx === want) return;

  layer.dataset.fx = want;
  layer.innerHTML  = '';
  layer.className  = layer.className.replace(/\bfx-theme-\S+/g, '').trim();
  if (!holiday) return;

  layer.classList.add(`fx-theme-${holiday.theme}`);
  updateFxTravel(layer);

  const type = FX_TYPES[holiday.fx];
  const n    = type.count[big ? 1 : 0];

  for (let i = 0; i < n; i++) {
    if (type.motion === 'burst') {
      // A firework: 12 sparks flying out from one point, repeating with its own rhythm
      const burst = document.createElement('div');
      burst.className = 'fx-burst';
      burst.style.setProperty('--x',     `${rand(10, 90)}%`);
      burst.style.setProperty('--y',     `${rand(big ? 10 : 15, big ? 55 : 60)}%`);
      burst.style.setProperty('--dur',   `${rand(2.6, 3.6)}s`);
      burst.style.setProperty('--delay', `${-rand(0, 3.6)}s`);
      burst.style.setProperty('--r',     `${big ? rand(55, 95) : rand(26, 40)}px`);
      for (let s = 0; s < 12; s++) {
        const spark = document.createElement('span');
        spark.className = `fx-spark c${(s + i) % 3 + 1}`;
        spark.style.setProperty('--a', `${s * 30}deg`);
        burst.appendChild(spark);
      }
      layer.appendChild(burst);
    } else {
      const p = document.createElement('span');
      p.className = `fx-p fx-${holiday.fx} c${i % 3 + 1}`;
      // Spread evenly across the width, random timing so particles never line up
      p.style.setProperty('--x',     `${(i + Math.random() * 0.8) / n * 100}%`);
      p.style.setProperty('--delay', `${-rand(0, 10)}s`);
      p.style.setProperty('--dur',   `${big ? rand(9, 15) : rand(6, 11)}s`);
      p.style.setProperty('--size',  `${rand(0.75, big ? 1.5 : 1.3)}`);
      p.style.setProperty('--sway',  `${(Math.random() < 0.5 ? -1 : 1) * rand(8, big ? 40 : 22)}px`);
      layer.appendChild(p);
    }
  }
}

// Particles travel the full height of their layer
function updateFxTravel(layer) {
  layer.style.setProperty('--travel', `${layer.clientHeight + 40}px`);
}

/**
 * Apply tier 2/3 effects for the selected day.
 * `hols` is already sorted, most important first.
 */
function applyHolidayEffects(hols) {
  const top = effectsAllowed() ? hols.find(h => h.tier >= 2 && h.fx) : null;
  const app = document.querySelector('.app');

  // Tier 3 → whole app (the card stays calm, the overlay covers it anyway)
  setFx(document.getElementById('appFx'), top && top.tier === 3 ? top : null, true);
  setFx(document.getElementById('selFx'), top && top.tier === 2 ? top : null, false);

  // Festive accent on the app frame for tier 3 days
  app.className = app.className.replace(/\bhol-\S+|\bfestive\b/g, '').trim();
  if (top && top.tier === 3) app.classList.add('festive', `hol-${top.theme}`);
}

// ─────────────────────────────────────────────────────────────
//  CELL SIZE
//  Cells show more detail when there is room for it:
//    xs → number (+ lunar), colour bar for holidays, event dots
//    md → + holiday icon
//    lg → + holiday name and event titles instead of dots
// ─────────────────────────────────────────────────────────────
const CELL_GAP = 4;

function cellLayout(grid, rows) {
  const w = (grid.clientWidth  - CELL_GAP * 6) / 7;
  const h = (grid.clientHeight - CELL_GAP * (rows - 1)) / rows;
  const size = (w < 54 || h < 50) ? 'xs' : (w >= 92 && h >= 74) ? 'lg' : 'md';
  return { w, h, size };
}

// Re-render only when the window change affects what fits in a cell
let lastLayoutKey = '';
let lastRows = 6;
function layoutKey(l) {
  return `${l.size}:${Math.floor(l.h / 18)}`;
}

// How many event titles fit in a large cell
function eventSlots(cellH, hasHoliday) {
  const head = settings.lunar ? 40 : 32;     // number (+ lunar) row incl. padding
  const hol  = hasHoliday ? 17 : 0;          // holiday name line
  const free = cellH - head - hol - 8;
  return Math.max(0, Math.floor((free + 2) / 18)); // 16px line + 2px gap
}

// ─────────────────────────────────────────────────────────────
//  RENDER CALENDAR
// ─────────────────────────────────────────────────────────────
function render() {
  const dict = I18N[settings.lang];
  const y = current.getFullYear(), m = current.getMonth();

  // Month title: italic month name + year (click opens the month/year picker)
  document.getElementById('monthTitleText').innerHTML =
    `<em>${dict.months[m]}</em> ${y}`;
  document.getElementById('monthTitle').title = dict.pickMonth;
  if (isPickerOpen()) renderPicker();

  // Day labels
  document.getElementById('dayLabels').innerHTML =
    dict.days.map((d, i) =>
      `<div class="day-label${i===0||i===6?' we':''}">${d}</div>`
    ).join('');

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();
  const grid        = document.getElementById('daysGrid');
  grid.innerHTML    = '';

  // Only as many weeks as the month needs (4-6), so rows get taller instead of empty
  const rows = Math.ceil((firstDay + daysInMonth) / 7);
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  const layout = cellLayout(grid, rows);
  grid.dataset.size = layout.size;
  lastLayoutKey = layoutKey(layout);
  lastRows = rows;

  let cells = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, mo: m===0?11:m-1, yr: m===0?y-1:y, other: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, mo: m, yr: y, other: false });
  while (cells.length < rows * 7) {
    let d = cells.length - firstDay - daysInMonth + 1;
    cells.push({ day: d, mo: m===11?0:m+1, yr: m===11?y+1:y, other: true });
  }

  cells.forEach(c => {
    const div     = document.createElement('div');
    const cellKey = key(c.yr, c.mo, c.day);
    const isToday = !c.other && c.day===today.getDate() && c.mo===today.getMonth() && c.yr===today.getFullYear();
    const isSel   = selected && key(selected.y, selected.m, selected.d) === cellKey;
    const dow     = new Date(c.yr, c.mo, c.day).getDay();
    const isWE    = dow===0 || dow===6;
    const evList  = events[cellKey] || [];

    div.className = ['day-cell',
      c.other  ? 'other-month' : '',
      isToday  ? 'today'       : '',
      isSel    ? 'selected'    : '',
      isWE && !c.other ? 'we-day' : '',
    ].filter(Boolean).join(' ');

    // Head row: date (+ lunar) on the left, holiday icon on the right
    const head = document.createElement('div');
    head.className = 'cell-head';

    const dateGroup = document.createElement('div');
    dateGroup.className = 'date-group';

    const num = document.createElement('div');
    num.className   = 'day-num';
    num.textContent = c.day;
    dateGroup.appendChild(num);

    // Lunar date label (chui luôn vào group)
    if (settings.lunar && !c.other) {
      const lunar = lunarCalc.get(c.day, c.mo + 1, c.yr);
      const lunarEl = document.createElement('div');
      lunarEl.className = 'lunar-label';
      if (lunar.day === 1) {
        lunarEl.textContent = dict.lunarFirst(lunar.month);
        lunarEl.classList.add('lunar-first');
      } else {
        lunarEl.textContent = dict.lunarDay(lunar.day);
      }
      dateGroup.appendChild(lunarEl);
    }

    head.appendChild(dateGroup);
    div.appendChild(head);

    // Holiday: tinted cell + theme icon + tooltip with all names
    const hols = c.other ? [] : holidaysOn(c.yr, c.mo, c.day);
    const top  = hols[0];  // most important decides the look
    if (top) {
      div.classList.add('holiday', `hol-${top.theme}`, `tier-${top.tier}`);
      if (hols.some(h => h.off)) div.classList.add('hol-off');
      if (top.tier >= 2 && effectsAllowed()) div.classList.add('hol-anim');
      div.title = hols.map(holidayName).join(' · ');

      const icon = document.createElement('span');
      icon.className = 'hol-icon';
      icon.innerHTML = HOLIDAY_THEMES[top.theme].icon;
      head.appendChild(icon);
    }

    if (layout.size === 'lg' && !c.other) {
      // Large cell: holiday name + event titles
      const body = document.createElement('div');
      body.className = 'cell-body';

      if (top) {
        const name = document.createElement('div');
        name.className   = 'cell-hol';
        name.textContent = holidayName(top) + (hols.length > 1 ? ` +${hols.length - 1}` : '');
        body.appendChild(name);
      }

      const slots = eventSlots(layout.h, !!top);
      const shown = evList.length > slots ? Math.max(0, slots - 1) : evList.length;
      evList.slice(0, shown).forEach(e => {
        const ev = document.createElement('div');
        ev.className = 'cell-ev';
        ev.style.setProperty('--ev', e.color);
        ev.textContent = e.name;
        body.appendChild(ev);
      });
      if (evList.length > shown) {
        const more = document.createElement('div');
        more.className   = 'cell-more';
        more.textContent = `+${evList.length - shown}`;
        body.appendChild(more);
      }
      div.appendChild(body);
    } else if (evList.length) {
      // Small/medium cell: coloured dots, "+N" when there are more than 3
      const dots = document.createElement('div');
      dots.className = 'dots';
      evList.slice(0, 3).forEach(e => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.background = e.color;
        dots.appendChild(dot);
      });
      if (evList.length > 3) {
        const more = document.createElement('span');
        more.className   = 'dots-more';
        more.textContent = `+${evList.length - 3}`;
        dots.appendChild(more);
      }
      div.appendChild(dots);
    }

    if (!c.other) {
      div.addEventListener('click', () => {
        selected = { y: c.yr, m: c.mo, d: c.day };
        render();
        renderPanel();
      });
    }
    grid.appendChild(div);
  });

  // Progress bar
  const totalDays  = daysInMonth;
  const currentDay = (y===today.getFullYear() && m===today.getMonth()) ? today.getDate() : 0;
  const pct        = Math.round((currentDay / totalDays) * 100);
  document.getElementById('progressFill').style.width  = pct + '%';
  document.getElementById('progressLabel').textContent =
    dict.progressLabel(pct, dict.months[m]);

  // Streak badge event count
  const totalEvs = Object.values(events).flat().length;
  document.getElementById('streakCount').textContent = totalEvs;

  // Update event label text (dynamic span)
  const eventsSpan = document.querySelector('#streakCount + span');
  if (eventsSpan) eventsSpan.textContent = ' ' + dict.events;
}

// ─────────────────────────────────────────────────────────────
//  RENDER SIDE PANEL
// ─────────────────────────────────────────────────────────────
function renderPanel() {
  if (!selected) return;
  const dict = I18N[settings.lang];
  const k    = key(selected.y, selected.m, selected.d);
  const date = new Date(selected.y, selected.m, selected.d);

  // Weekday and date in chosen language
  document.getElementById('selWeekday').textContent =
    dict.daysLong[date.getDay()];
  document.getElementById('selDate').textContent =
    settings.lang === 'vi'
      ? `${date.getDate()} ${dict.months[date.getMonth()]} ${date.getFullYear()}`
      : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Lunar line in selected date display
  const lunarLine = document.getElementById('selLunar');
  if (settings.lunar) {
    const lunar = lunarCalc.get(selected.d, selected.m + 1, selected.y);
    const ccYear = lunarCalc.canChiYear(lunar.year);
    const ccMonth = lunarCalc.canChiMonth(lunar.month, lunar.year);
    const ccDay = lunarCalc.canChiDay(selected.d, selected.m + 1, selected.y);
    
    lunarLine.innerHTML = dict.lunarDate(lunar.day, lunar.month, ccDay, ccMonth, ccYear, lunar.year);
    lunarLine.style.display = 'block';
  } else {
    lunarLine.innerHTML = '';
    lunarLine.style.display = 'none';
  }

  // Holidays of the selected day: one chip each, plus the card effect
  const hols = holidaysOn(selected.y, selected.m, selected.d);
  document.getElementById('selHolidays').innerHTML = hols.map(h => `
    <div class="hol-chip hol-${h.theme}">
      <span class="hol-chip-icon">${HOLIDAY_THEMES[h.theme].icon}</span>
      <span class="hol-chip-name">${holidayName(h)}</span>
      ${h.off ? `<span class="hol-chip-off">${dict.dayOff}</span>` : ''}
    </div>
  `).join('');
  applyHolidayEffects(hols);

  // Events list
  const evList = events[k] || [];
  const list   = document.getElementById('eventList');

  if (!evList.length) {
    list.innerHTML = `<div class="no-events">${dict.noEvents}</div>`;
    return;
  }

  list.innerHTML = evList.map((e, i) => `
    <div class="event-item" data-k="${k}" data-i="${i}">
      <div class="event-color-dot" style="background:${e.color};color:${e.color}"></div>
      <div class="event-info">
        <div class="event-name">${e.name}</div>
        <div class="event-time">${e.time ? fmtTime(e.time) : dict.allDay}</div>
      </div>
      <button class="del-btn" data-k="${k}" data-i="${i}">✕</button>
    </div>
  `).join('');

  // Click to open task modal
  list.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.del-btn')) return;
      const ki = item.dataset.k;
      const ii = parseInt(item.dataset.i);
      const ev = events[ki][ii];
      openTaskModal(ev.name, ev.time ? fmtTime(ev.time) : dict.allDay);
    });
  });

  // Delete button
  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ki = btn.dataset.k;
      const ii = parseInt(btn.dataset.i);
      events[ki].splice(ii, 1);
      if (!events[ki].length) delete events[ki];
      await saveToDisk();
      render();
      renderPanel();
    });
  });
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
}

// ─────────────────────────────────────────────────────────────
//  COLOR PICKER
// ─────────────────────────────────────────────────────────────
const colorRow = document.getElementById('colorRow');
COLORS.forEach(c => {
  const btn = document.createElement('div');
  btn.className = 'cpick' + (c.hex === chosenColor ? ' active' : '');
  btn.style.background = c.hex;
  btn.title = c.name;
  btn.addEventListener('click', () => {
    chosenColor = c.hex;
    colorRow.querySelectorAll('.cpick').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
  colorRow.appendChild(btn);
});

// Legend
document.getElementById('legend').innerHTML = COLORS.slice(0, 4).map(c =>
  `<div class="legend-item">
    <div class="legend-dot" style="background:${c.hex}"></div>${c.name}
  </div>`
).join('');

// ─────────────────────────────────────────────────────────────
//  HEADER BUTTON EVENTS
// ─────────────────────────────────────────────────────────────
document.getElementById('closeBtn').addEventListener('click', () => invoke('exit_app'));

document.getElementById('addBtn').addEventListener('click', async () => {
  if (!selected) return;
  const name = document.getElementById('eventName').value.trim();
  if (!name) return;
  const time = document.getElementById('eventTime').value;
  const k    = key(selected.y, selected.m, selected.d);
  if (!events[k]) events[k] = [];
  events[k].push({ name, time, color: chosenColor });
  events[k].sort((a, b) => a.time.localeCompare(b.time));
  document.getElementById('eventName').value = '';
  document.getElementById('eventTime').value = '';
  document.getElementById('eventTime').type  = 'text';
  await saveToDisk();
  render();
  renderPanel();
});

document.getElementById('eventName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('addBtn').click();
});

document.getElementById('prevBtn').addEventListener('click', () => {
  current.setMonth(current.getMonth() - 1); render();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  current.setMonth(current.getMonth() + 1); render();
});
document.getElementById('todayBtn').addEventListener('click', () => {
  current  = new Date(today.getFullYear(), today.getMonth(), 1);
  selected = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  render();
  renderPanel();
});

// ─────────────────────────────────────────────────────────────
//  MONTH / YEAR PICKER
// ─────────────────────────────────────────────────────────────
// Range kept where the lunar algorithm is reliable
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

const titleBtn   = document.getElementById('monthTitle');
const picker     = document.getElementById('monthPicker');
const yearInput  = document.getElementById('mpYearInput');
const monthsGrid = document.getElementById('mpMonths');
const prevYearBtn = document.getElementById('mpPrevYear');
const nextYearBtn = document.getElementById('mpNextYear');
let pickerYear   = current.getFullYear();

function isPickerOpen() {
  return picker.classList.contains('open');
}

function isValidYear(n) {
  return Number.isInteger(n) && n >= YEAR_MIN && n <= YEAR_MAX;
}

// Year row: value, button states, labels
function renderPickerYear() {
  const dict = I18N[settings.lang];
  yearInput.value = pickerYear;
  yearInput.setAttribute('aria-label', dict.yearLabel);
  prevYearBtn.title = dict.prevYear;
  nextYearBtn.title = dict.nextYear;
  prevYearBtn.disabled = pickerYear <= YEAR_MIN;
  nextYearBtn.disabled = pickerYear >= YEAR_MAX;
}

// 12-month grid for pickerYear
function renderPickerMonths() {
  const dict = I18N[settings.lang];
  monthsGrid.innerHTML = dict.monthsShort.map((name, i) => {
    const cls = ['mp-month'];
    if (pickerYear === current.getFullYear() && i === current.getMonth()) cls.push('active');
    if (pickerYear === today.getFullYear()   && i === today.getMonth())   cls.push('is-today');
    return `<button type="button" class="${cls.join(' ')}" data-m="${i}" aria-label="${dict.months[i]} ${pickerYear}">${name}</button>`;
  }).join('');
}

function renderPicker() {
  picker.setAttribute('aria-label', I18N[settings.lang].pickMonth);
  renderPickerYear();
  renderPickerMonths();
}

function openPicker() {
  pickerYear = current.getFullYear();
  renderPicker();
  picker.classList.add('open');
  titleBtn.setAttribute('aria-expanded', 'true');
  yearInput.focus();
  yearInput.select();
}

function closePicker(returnFocus = false) {
  if (!isPickerOpen()) return;
  picker.classList.remove('open');
  titleBtn.setAttribute('aria-expanded', 'false');
  yearInput.classList.remove('invalid');
  if (returnFocus) titleBtn.focus();
}

function goToMonth(year, month) {
  current = new Date(year, month, 1);
  render();
  closePicker(true);
}

function stepPickerYear(delta) {
  const next = pickerYear + delta;
  if (!isValidYear(next)) return;
  pickerYear = next;
  yearInput.classList.remove('invalid');
  renderPickerYear();
  renderPickerMonths();
}

function flagInvalidYear() {
  yearInput.classList.remove('invalid');
  void yearInput.offsetWidth; // restart the shake animation
  yearInput.classList.add('invalid');
}

titleBtn.addEventListener('click', () => {
  isPickerOpen() ? closePicker(true) : openPicker();
});

prevYearBtn.addEventListener('click', () => stepPickerYear(-1));
nextYearBtn.addEventListener('click', () => stepPickerYear(+1));

monthsGrid.addEventListener('click', e => {
  const btn = e.target.closest('.mp-month');
  if (btn) goToMonth(pickerYear, parseInt(btn.dataset.m));
});

// Typing a year: digits only; the grid follows as soon as 4 valid digits are in
yearInput.addEventListener('input', () => {
  yearInput.value = yearInput.value.replace(/\D/g, '').slice(0, 4);
  yearInput.classList.remove('invalid');
  const n = parseInt(yearInput.value, 10);
  if (yearInput.value.length === 4 && isValidYear(n)) {
    pickerYear = n;
    prevYearBtn.disabled = pickerYear <= YEAR_MIN;
    nextYearBtn.disabled = pickerYear >= YEAR_MAX;
    renderPickerMonths();
  }
});

yearInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const n = parseInt(yearInput.value, 10);
    // Enter jumps to the same month in the typed year
    if (isValidYear(n)) goToMonth(n, current.getMonth());
    else flagInvalidYear();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    stepPickerYear(+1);
    yearInput.select();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    stepPickerYear(-1);
    yearInput.select();
  }
});

// Leaving the field with an unfinished/invalid year restores the last valid one
yearInput.addEventListener('blur', () => {
  if (parseInt(yearInput.value, 10) !== pickerYear) {
    yearInput.value = pickerYear;
    yearInput.classList.remove('invalid');
  }
});

// Close on Escape or on a click outside the picker
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isPickerOpen()) closePicker(true);
});

document.addEventListener('mousedown', e => {
  if (isPickerOpen() && !picker.contains(e.target) && !titleBtn.contains(e.target)) {
    closePicker();
  }
});

// ─────────────────────────────────────────────────────────────
//  TASK MODAL
// ─────────────────────────────────────────────────────────────
function openTaskModal(name, timeStr) {
  document.getElementById('modalName').textContent = name;
  document.getElementById('modalTime').textContent = timeStr;
  document.getElementById('taskModal').classList.add('active');
}

window.closeTaskModal = function() {
  document.getElementById('taskModal').classList.remove('active');
};

document.getElementById('taskModal').addEventListener('click', function(e) {
  if (e.target === this) closeTaskModal();
});

// ─────────────────────────────────────────────────────────────
//  SETTINGS MODAL
// ─────────────────────────────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

function openSettingsModal() {
  // Sync UI to current settings before showing
  applyLanguage();
  document.getElementById('settingsModal').classList.add('active');
}

window.closeSettingsModal = function() {
  document.getElementById('settingsModal').classList.remove('active');
};

document.getElementById('settingsModal').addEventListener('click', function(e) {
  if (e.target === this) closeSettingsModal();
});

// Language segment buttons
document.querySelectorAll('#langControl .seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    settings.lang = btn.dataset.val;
    saveSettings();
    applyLanguage();
    render();
    renderPanel();
  });
});

// Lunar toggle
document.getElementById('lunarToggle').addEventListener('change', function() {
  settings.lunar = this.checked;
  saveSettings();
  render();
  renderPanel();
});

// Holiday toggles
document.getElementById('holidayToggle').addEventListener('change', function() {
  settings.holidays = this.checked;
  saveSettings();
  applyLanguage();
  render();
  renderPanel();
});

document.getElementById('holidayFxToggle').addEventListener('change', function() {
  settings.holidayFx = this.checked;
  saveSettings();
  render();       // animated cells
  renderPanel();  // card / whole-app effect
});

// Follow the OS "reduce motion" setting live
prefersReducedMotion.addEventListener('change', () => { render(); renderPanel(); });

// Window resized: re-render cells if a different amount of detail now fits,
// and stretch running effects to the new height
let resizeFrame = 0;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (!appReady) return;
    const grid = document.getElementById('daysGrid');
    if (layoutKey(cellLayout(grid, lastRows)) !== lastLayoutKey) render();
    updateFxTravel(document.getElementById('appFx'));
    updateFxTravel(document.getElementById('selFx'));
  });
}).observe(document.getElementById('daysGrid'));

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
let appReady = false;

async function initApp() {
  await loadSettings();
  applyLanguage();

  try {
    const data = await invoke('load_jobs');
    if (data) events = JSON.parse(data);
  } catch(e) {
    console.error('Load error, starting fresh:', e);
    events = {};
  }

  render();
  renderPanel();
  appReady = true;
}

initApp();