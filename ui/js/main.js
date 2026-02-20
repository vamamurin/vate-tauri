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
  lang:  'en',
  lunar: false,
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
let current  = new Date();
let today    = new Date();
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
}

// ─────────────────────────────────────────────────────────────
//  RENDER CALENDAR
// ─────────────────────────────────────────────────────────────
function render() {
  const dict = I18N[settings.lang];
  const y = current.getFullYear(), m = current.getMonth();

  // Month title: italic month name + year
  document.getElementById('monthTitle').innerHTML =
    `<em>${dict.months[m]}</em> ${y}`;

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

  let cells = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, mo: m===0?11:m-1, yr: m===0?y-1:y, other: true });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, mo: m, yr: y, other: false });
  while (cells.length < 42) {
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

    // Day number
    // const num = document.createElement('div');
    // num.className   = 'day-num';
    // num.textContent = c.day;
    // div.appendChild(num);

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

    div.appendChild(dateGroup);

    // Event dots
    if (evList.length) {
      const dots = document.createElement('div');
      dots.className = 'dots';
      evList.slice(0, 5).forEach(e => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.cssText = `background:${e.color};color:${e.color}`;
        dots.appendChild(dot);
      });
      div.appendChild(dots);

      if (evList.length > 1) {
        const badge = document.createElement('div');
        badge.className   = 'event-count';
        badge.textContent = evList.length;
        div.appendChild(badge);
      }
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
  current  = new Date();
  selected = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
  render();
  renderPanel();
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

// ─────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────
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
}

initApp();