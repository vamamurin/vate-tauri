// ─────────────────────────────────────────────────────────────
//  HOLIDAYS
//  Built-in data: computed while rendering, never saved to jobs.json.
//
//  cal:   'solar' | 'lunar'
//  m, d:  month (1-12) and day in that calendar
//  rule:  special case instead of m/d ('lunarNewYearsEve')
//  theme: decoration group, see HOLIDAY_THEMES
//  off:   paid day off under current Vietnamese labour law
//  since: first year the day exists (optional)
// ─────────────────────────────────────────────────────────────

// Lower priority number wins when several holidays share a day
const HOLIDAY_THEMES = {
  tet:         { priority: 1, fx: 'petals',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="12" cy="6.2" r="3.9"/><circle cx="17.5" cy="10.2" r="3.9"/><circle cx="15.4" cy="16.7" r="3.9"/><circle cx="8.6" cy="16.7" r="3.9"/><circle cx="6.5" cy="10.2" r="3.9"/></g><circle cx="12" cy="12" r="2.4" fill="#fff4d0"/></svg>' },
  christmas:   { priority: 2, fx: 'snow',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8 17 8.6h-2.6l4.4 6h-3.4l3.6 5.2H5l3.6-5.2H5.2l4.4-6H7z"/><rect x="10.6" y="19.8" width="2.8" height="3" rx=".6" fill="currentColor"/></svg>' },
  midautumn:   { priority: 3, fx: 'lanterns',
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><rect x="9.6" y="1.5" width="4.8" height="2.6" rx="1"/><ellipse cx="12" cy="12" rx="7.2" ry="7.6"/><rect x="9.6" y="19.9" width="4.8" height="2.6" rx="1"/></g><path d="M12 4.6v14.8M8.2 5.6c-1.8 3.8-1.8 9 0 12.8M15.8 5.6c1.8 3.8 1.8 9 0 12.8" stroke="#fff4d0" stroke-width="1.1" fill="none" opacity=".75"/></svg>' },
  national:    { priority: 4, fx: null,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.2 2.9 6.6 7.1.7-5.4 4.7 1.6 7L12 17.5l-6.2 3.7 1.6-7L2 9.5l7.1-.7z"/></svg>' },
  love:        { priority: 5, fx: null,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.6-4.6-9.6-9.4C.9 8.2 3 4.4 6.7 4.4c2.1 0 3.7 1.2 5.3 3.2 1.6-2 3.2-3.2 5.3-3.2 3.7 0 5.8 3.8 4.3 7.2C19.6 16.4 12 21 12 21z"/></svg>' },
  traditional: { priority: 6, fx: null,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M12 2.8c2.6 3.1 3.1 7.2 0 12.4-3.1-5.2-2.6-9.3 0-12.4z"/><path d="M2.6 8.6c4.2 0 7.3 2.6 9.4 6.8-4.7 1-8.3-1.6-9.4-6.8z"/><path d="M21.4 8.6c-4.2 0-7.3 2.6-9.4 6.8 4.7 1 8.3-1.6 9.4-6.8z"/></g><path d="M4.8 17.6c2.5 2.1 4.6 3.1 7.2 3.1s4.7-1 7.2-3.1" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>' },
  observance:  { priority: 7, fx: null,
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z"/></svg>' },
};

const HOLIDAYS = [
  // ── Solar calendar ─────────────────────────────────────────
  { cal: 'solar', m: 1,  d: 1,  theme: 'observance', off: true,
    vi: 'Tết Dương lịch', en: "New Year's Day" },
  { cal: 'solar', m: 2,  d: 3,  theme: 'national',
    vi: 'Ngày thành lập Đảng Cộng sản Việt Nam', en: 'Communist Party of Vietnam Founding Day' },
  { cal: 'solar', m: 2,  d: 14, theme: 'love',
    vi: 'Lễ Tình nhân (Valentine)', en: "Valentine's Day" },
  { cal: 'solar', m: 2,  d: 27, theme: 'observance',
    vi: 'Ngày Thầy thuốc Việt Nam', en: "Vietnamese Doctors' Day" },
  { cal: 'solar', m: 3,  d: 8,  theme: 'love',
    vi: 'Ngày Quốc tế Phụ nữ', en: "International Women's Day" },
  { cal: 'solar', m: 3,  d: 26, theme: 'national',
    vi: 'Ngày thành lập Đoàn TNCS Hồ Chí Minh', en: 'Ho Chi Minh Communist Youth Union Founding Day' },
  { cal: 'solar', m: 4,  d: 30, theme: 'national', off: true,
    vi: 'Ngày Giải phóng miền Nam, thống nhất đất nước', en: 'Reunification Day' },
  { cal: 'solar', m: 5,  d: 1,  theme: 'national', off: true,
    vi: 'Ngày Quốc tế Lao động', en: "International Workers' Day" },
  { cal: 'solar', m: 5,  d: 19, theme: 'national',
    vi: 'Ngày sinh Chủ tịch Hồ Chí Minh', en: "President Ho Chi Minh's Birthday" },
  { cal: 'solar', m: 6,  d: 1,  theme: 'observance',
    vi: 'Ngày Quốc tế Thiếu nhi', en: "International Children's Day" },
  { cal: 'solar', m: 7,  d: 27, theme: 'national',
    vi: 'Ngày Thương binh - Liệt sĩ', en: "War Invalids and Martyrs' Day" },
  { cal: 'solar', m: 8,  d: 19, theme: 'national',
    vi: 'Ngày Cách mạng tháng Tám thành công', en: 'August Revolution Day' },
  { cal: 'solar', m: 9,  d: 2,  theme: 'national', off: true,
    vi: 'Quốc khánh nước CHXHCN Việt Nam', en: 'National Day' },
  { cal: 'solar', m: 10, d: 13, theme: 'observance', since: 2004,
    vi: 'Ngày Doanh nhân Việt Nam', en: "Vietnamese Entrepreneurs' Day" },
  { cal: 'solar', m: 10, d: 20, theme: 'love',
    vi: 'Ngày Phụ nữ Việt Nam', en: "Vietnamese Women's Day" },
  { cal: 'solar', m: 11, d: 20, theme: 'observance',
    vi: 'Ngày Nhà giáo Việt Nam', en: "Vietnamese Teachers' Day" },
  // Nghị quyết 28/2026/QH16: paid day off every year
  { cal: 'solar', m: 11, d: 24, theme: 'national', off: true, since: 2026,
    vi: 'Ngày Văn hóa Việt Nam', en: 'Vietnamese Culture Day' },
  { cal: 'solar', m: 12, d: 22, theme: 'national',
    vi: 'Ngày thành lập Quân đội Nhân dân Việt Nam', en: "Vietnam People's Army Day" },
  { cal: 'solar', m: 12, d: 24, theme: 'christmas',
    vi: 'Đêm Giáng sinh', en: 'Christmas Eve' },
  { cal: 'solar', m: 12, d: 25, theme: 'christmas',
    vi: 'Lễ Giáng sinh (Noel)', en: 'Christmas Day' },

  // ── Lunar calendar ─────────────────────────────────────────
  { cal: 'lunar', rule: 'lunarNewYearsEve', theme: 'tet',
    vi: 'Giao thừa', en: "Lunar New Year's Eve" },
  { cal: 'lunar', m: 1,  d: 1,  theme: 'tet', off: true,
    vi: 'Mùng 1 Tết Nguyên đán', en: 'Lunar New Year, day 1' },
  { cal: 'lunar', m: 1,  d: 2,  theme: 'tet', off: true,
    vi: 'Mùng 2 Tết Nguyên đán', en: 'Lunar New Year, day 2' },
  { cal: 'lunar', m: 1,  d: 3,  theme: 'tet', off: true,
    vi: 'Mùng 3 Tết Nguyên đán', en: 'Lunar New Year, day 3' },
  { cal: 'lunar', m: 1,  d: 15, theme: 'traditional',
    vi: 'Tết Nguyên Tiêu (Rằm tháng Giêng)', en: 'Lantern Festival' },
  { cal: 'lunar', m: 3,  d: 3,  theme: 'traditional',
    vi: 'Tết Hàn Thực', en: 'Cold Food Festival' },
  { cal: 'lunar', m: 3,  d: 10, theme: 'national', off: true,
    vi: 'Giỗ Tổ Hùng Vương', en: "Hung Kings' Commemoration Day" },
  { cal: 'lunar', m: 4,  d: 15, theme: 'traditional',
    vi: 'Lễ Phật Đản', en: "Buddha's Birthday" },
  { cal: 'lunar', m: 5,  d: 5,  theme: 'traditional',
    vi: 'Tết Đoan Ngọ', en: 'Double Fifth Festival (Doan Ngo)' },
  { cal: 'lunar', m: 7,  d: 15, theme: 'traditional',
    vi: 'Lễ Vu Lan (Báo hiếu)', en: 'Vu Lan Festival' },
  { cal: 'lunar', m: 8,  d: 15, theme: 'midautumn',
    vi: 'Tết Trung Thu (Rằm tháng Tám)', en: 'Mid-Autumn Festival' },
  { cal: 'lunar', m: 12, d: 23, theme: 'traditional',
    vi: 'Tết Ông Công, Ông Táo', en: 'Kitchen Gods Day' },
];

/**
 * Holidays falling on a solar date, highest-priority theme first.
 * @param {number} y   solar year
 * @param {number} m   solar month, 1-12
 * @param {number} d   solar day
 * @param {(d:number, m:number, y:number) => {day:number, month:number, leap:boolean}} lunarOf
 */
function getHolidays(y, m, d, lunarOf) {
  let lunar = null;          // computed only if a lunar rule needs it
  const getLunar = () => lunar || (lunar = lunarOf(d, m, y));

  const found = HOLIDAYS.filter(h => {
    if (h.since && y < h.since) return false;

    if (h.cal === 'solar') return h.m === m && h.d === d;

    const l = getLunar();
    if (l.leap) return false; // festivals follow the regular month, not the leap one

    if (h.rule === 'lunarNewYearsEve') {
      // Last day of lunar month 12 (29th or 30th): tomorrow is 1/1
      if (l.month !== 12 || l.day < 29) return false;
      const next = new Date(y, m - 1, d + 1);
      const ln = lunarOf(next.getDate(), next.getMonth() + 1, next.getFullYear());
      return ln.month === 1 && ln.day === 1 && !ln.leap;
    }
    return h.m === l.month && h.d === l.day;
  });

  return found.sort((a, b) =>
    HOLIDAY_THEMES[a.theme].priority - HOLIDAY_THEMES[b.theme].priority);
}
