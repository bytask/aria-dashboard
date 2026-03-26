/* TimePick - Drag-select availability slots overlay */
const TimePick = {
  overlay: null,
  selectedSlots: [],
  googleEvents: [],
  currentWeek: null,
  _isDragging: false,
  _dragStart: null,
  _dragEnd: null,
  _modalBuilt: false,

  START_H: 7,
  END_H: 23,
  CELL_H: 26,

  init() {
    this.overlay = document.getElementById('timepick-overlay');
    this._setCurrentWeekToMonday();
    this._bindGlobalEvents();
  },

  // --- Open / Close ---

  open() {
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (!this._modalBuilt) {
      this._buildModal();
      this._modalBuilt = true;
    }
    this._loadGoogleEvents().then(() => {
      this._updateGrid();
      this._updateNav();
      this._scrollToTime(10);
    });
  },

  close() {
    this.overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  // --- Week ---

  _setCurrentWeekToMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    this.currentWeek = new Date(today.getFullYear(), today.getMonth(), diff);
  },

  _getWeekDates() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.currentWeek);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  },

  _prevWeek() {
    this.currentWeek.setDate(this.currentWeek.getDate() - 7);
    this._loadGoogleEvents().then(() => {
      this._updateGrid();
      this._updateNav();
      this._scrollToTime(10);
    });
  },

  _nextWeek() {
    this.currentWeek.setDate(this.currentWeek.getDate() + 7);
    this._loadGoogleEvents().then(() => {
      this._updateGrid();
      this._updateNav();
      this._scrollToTime(10);
    });
  },

  // --- Google Calendar ---

  async _loadGoogleEvents() {
    const token = Storage.get('google_token');
    if (!token) { this._loadMockEvents(); return; }

    try {
      const weekDates = this._getWeekDates();
      const timeMin = weekDates[0].toISOString();
      const end = new Date(weekDates[6]); end.setHours(23, 59, 59);
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=100`;

      const data = await API.fetch(url, {
        token,
        cacheTTL: 5 * 60 * 1000,
        cacheKey: `timepick_${this.currentWeek.toISOString().slice(0, 10)}`,
      });

      this.googleEvents = (data.items || [])
        .filter(item => item.start?.dateTime)
        .map(item => ({
          id: item.id,
          summary: item.summary || 'No title',
          start: item.start.dateTime,
          end: item.end.dateTime,
        }));
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') Storage.remove('google_token');
      this._loadMockEvents();
    }
  },

  _loadMockEvents() {
    const weekDates = this._getWeekDates();
    const iso = (date, h, m) => {
      const d = new Date(date); d.setHours(h, m, 0, 0); return d.toISOString();
    };
    this.googleEvents = [
      { id: 'mock-1', summary: 'Team Standup',     start: iso(weekDates[0], 9, 30),  end: iso(weekDates[0], 10, 0) },
      { id: 'mock-2', summary: 'Sprint Planning',  start: iso(weekDates[0], 14, 0),  end: iso(weekDates[0], 15, 30) },
      { id: 'mock-3', summary: '1:1 with Manager', start: iso(weekDates[1], 11, 0),  end: iso(weekDates[1], 11, 30) },
      { id: 'mock-4', summary: 'Design Review',    start: iso(weekDates[2], 10, 0),  end: iso(weekDates[2], 11, 0) },
      { id: 'mock-5', summary: 'Lunch Meeting',    start: iso(weekDates[2], 12, 0),  end: iso(weekDates[2], 13, 0) },
      { id: 'mock-6', summary: 'Client Call',      start: iso(weekDates[3], 15, 0),  end: iso(weekDates[3], 16, 0) },
      { id: 'mock-7', summary: 'All Hands',        start: iso(weekDates[4], 10, 0),  end: iso(weekDates[4], 11, 0) },
      { id: 'mock-8', summary: 'Code Review',      start: iso(weekDates[4], 14, 0),  end: iso(weekDates[4], 14, 30) },
    ];
  },

  // --- Helpers ---

  _isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  },

  _isToday(d) { return this._isSameDay(d, new Date()); },
  _toMin(h, m) { return h * 60 + m; },

  _escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  },

  // --- Slot Logic ---

  _isSlotSelected(date, hour, minute) {
    return this.selectedSlots.some(slot => {
      if (!this._isSameDay(slot.date, date)) return false;
      const c = this._toMin(hour, minute);
      return c >= this._toMin(slot.startHour, slot.startMinute) &&
             c < this._toMin(slot.endHour, slot.endMinute);
    });
  },

  _hasGoogleEvent(date, hour, minute) {
    const cs = new Date(date); cs.setHours(hour, minute, 0, 0);
    const ce = new Date(date); ce.setHours(hour, minute + 30, 0, 0);
    return this.googleEvents.some(ev => {
      const es = new Date(ev.start);
      return this._isSameDay(es, date) && es < ce && new Date(ev.end) > cs;
    });
  },

  _isInDragSelection(date, hour, minute) {
    if (!this._isDragging || !this._dragStart || !this._dragEnd) return false;
    if (!this._isSameDay(this._dragStart.date, this._dragEnd.date)) return false;
    if (!this._isSameDay(date, this._dragStart.date)) return false;
    const s = this._toMin(this._dragStart.hour, this._dragStart.minute);
    const e = this._toMin(this._dragEnd.hour, this._dragEnd.minute);
    const c = this._toMin(hour, minute);
    return c >= Math.min(s, e) && c <= Math.max(s, e);
  },

  _addSlot(newSlot) {
    const ns = this._toMin(newSlot.startHour, newSlot.startMinute);
    const ne = this._toMin(newSlot.endHour, newSlot.endMinute);

    // If the exact range is already fully selected, toggle it off
    const exact = this.selectedSlots.find(slot =>
      this._isSameDay(slot.date, newSlot.date) &&
      this._toMin(slot.startHour, slot.startMinute) === ns &&
      this._toMin(slot.endHour, slot.endMinute) === ne
    );
    if (exact) {
      this.selectedSlots = this.selectedSlots.filter(s => s !== exact);
      this._updateCellStates();
      this._updateOutput();
      return;
    }

    // Remove overlapping slots on the same day, then add
    this.selectedSlots = this.selectedSlots.filter(slot => {
      if (!this._isSameDay(slot.date, newSlot.date)) return true;
      const ss = this._toMin(slot.startHour, slot.startMinute);
      const se = this._toMin(slot.endHour, slot.endMinute);
      return !(ns < se && ne > ss);
    });
    this.selectedSlots.push(newSlot);
    this._updateCellStates();
    this._updateOutput();
  },

  _clearSlots() {
    this.selectedSlots = [];
    this._updateCellStates();
    this._updateOutput();
  },

  // --- Merge & Text ---

  _mergeConsecutive(slots) {
    if (!slots.length) return [];
    const sorted = [...slots].sort((a, b) => {
      const d = a.date.getTime() - b.date.getTime();
      return d !== 0 ? d : this._toMin(a.startHour, a.startMinute) - this._toMin(b.startHour, b.startMinute);
    });
    const merged = [];
    let cur = { ...sorted[0], date: new Date(sorted[0].date) };
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (this._isSameDay(cur.date, next.date) &&
          this._toMin(cur.endHour, cur.endMinute) === this._toMin(next.startHour, next.startMinute)) {
        cur.endHour = next.endHour;
        cur.endMinute = next.endMinute;
      } else {
        merged.push(cur);
        cur = { ...next, date: new Date(next.date) };
      }
    }
    merged.push(cur);
    return merged;
  },

  _generateText() {
    if (!this.selectedSlots.length) return '';
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const merged = this._mergeConsecutive(this.selectedSlots);
    const groups = {};
    for (const slot of merged) {
      const y = slot.date.getFullYear();
      const mo = String(slot.date.getMonth() + 1).padStart(2, '0');
      const da = String(slot.date.getDate()).padStart(2, '0');
      const key = `${y}-${mo}-${da}`;
      const dateStr = `${y}/${mo}/${da} (${dayNames[slot.date.getDay()]})`;
      const sT = `${String(slot.startHour).padStart(2, '0')}:${String(slot.startMinute).padStart(2, '0')}`;
      const eT = `${String(slot.endHour).padStart(2, '0')}:${String(slot.endMinute).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = { date: dateStr, times: [] };
      groups[key].times.push(`${sT}-${eT}`);
    }
    return Object.values(groups).map(g => `${g.date} ${g.times.join(' / ')}`).join('\n');
  },

  async _copyText() {
    const text = this._generateText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const btn = this.overlay.querySelector('.tp-copy-btn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
    } catch (e) { console.error('Copy failed:', e); }
  },

  // --- Drag ---

  _bindGlobalEvents() {
    const endDrag = () => {
      if (!this._isDragging) return;
      if (this._dragStart && this._dragEnd && this._isSameDay(this._dragStart.date, this._dragEnd.date)) {
        const s = this._toMin(this._dragStart.hour, this._dragStart.minute);
        const e = this._toMin(this._dragEnd.hour, this._dragEnd.minute);
        const minM = Math.min(s, e), maxM = Math.max(s, e) + 30;
        this._addSlot({
          date: new Date(this._dragStart.date),
          startHour: Math.floor(minM / 60), startMinute: minM % 60,
          endHour: Math.floor(maxM / 60), endMinute: maxM % 60,
        });
      }
      this._isDragging = false;
      this._dragStart = null;
      this._dragEnd = null;
    };
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay?.classList.contains('open')) this.close();
    });
  },

  // --- Build Modal (once) ---

  _buildModal() {
    const { START_H, END_H, CELL_H } = this;
    const rowCount = (END_H - START_H) * 2;

    // Build time rows template
    let gridRows = '';
    for (let h = START_H; h < END_H; h++) {
      for (const m of [0, 30]) {
        const isHour = m === 0;
        const label = isHour ? `${String(h).padStart(2, '0')}:00` : '';
        gridRows += `<div class="tp-time-label${isHour ? '' : ' tp-half'}">${label}</div>`;
        for (let di = 0; di < 7; di++) {
          gridRows += `<div class="tp-cell${isHour ? ' tp-hour-border' : ''}" data-di="${di}" data-h="${h}" data-m="${m}"></div>`;
        }
      }
    }

    this.overlay.innerHTML = `
      <div class="tp-backdrop"></div>
      <div class="tp-modal">
        <div class="tp-header">
          <div class="tp-header-left">
            <svg class="tp-header-icon" width="16" height="16" viewBox="0 0 18 18"><rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="1.3"/><line x1="6" y1="1" x2="6" y2="5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            <h2>TimePick</h2>
          </div>
          <div class="tp-header-actions">
            <button class="tp-reset-btn" style="display:none">Reset</button>
            <button class="tp-close-btn">&times;</button>
          </div>
        </div>
        <div class="tp-nav">
          <button class="tp-nav-btn" data-action="prev">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M8 2L4 6L8 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
          <span class="tp-nav-label"></span>
          <button class="tp-nav-btn" data-action="next">
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
          </button>
        </div>
        <div class="tp-scroll">
          <div class="tp-grid-wrapper">
            <div class="tp-day-headers">
              <div class="tp-corner"></div>
              <div class="tp-day-header" data-di="0"></div>
              <div class="tp-day-header" data-di="1"></div>
              <div class="tp-day-header" data-di="2"></div>
              <div class="tp-day-header" data-di="3"></div>
              <div class="tp-day-header" data-di="4"></div>
              <div class="tp-day-header" data-di="5"></div>
              <div class="tp-day-header" data-di="6"></div>
            </div>
            <div class="tp-grid-body">
              <div class="tp-grid" style="grid-template-columns:44px repeat(7,1fr);grid-template-rows:repeat(${rowCount},${CELL_H}px);">
                ${gridRows}
              </div>
              <div class="tp-events-layer"></div>
            </div>
          </div>
        </div>
        <div class="tp-output-section tp-empty">
          <span class="tp-output-hint">Drag to select available time slots</span>
        </div>
      </div>
    `;

    this._bindModalEvents();
  },

  // --- Update Parts (no flash) ---

  _updateNav() {
    const weekDates = this._getWeekDates();
    const label = this.overlay.querySelector('.tp-nav-label');
    if (label) {
      const s = weekDates[0], e = weekDates[6];
      label.textContent = `${s.getFullYear()}/${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
    }
  },

  _updateGrid() {
    const weekDates = this._getWeekDates();
    const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

    // Update day headers
    this.overlay.querySelectorAll('.tp-day-header').forEach(el => {
      const di = parseInt(el.dataset.di);
      const d = weekDates[di];
      const today = this._isToday(d);
      el.innerHTML = `<span class="tp-day-name">${dayNames[di]}</span><span class="tp-day-num">${d.getDate()}</span>`;
      el.classList.toggle('tp-today', today);
    });

    // Update cell states
    this._updateCellStates();

    // Update event overlays
    this._renderEventOverlays();
  },

  _updateCellStates() {
    const weekDates = this._getWeekDates();
    this.overlay.querySelectorAll('.tp-cell').forEach(cell => {
      const di = parseInt(cell.dataset.di);
      const h = parseInt(cell.dataset.h);
      const m = parseInt(cell.dataset.m);
      const date = weekDates[di];
      const selected = this._isSlotSelected(date, h, m);
      const conflict = selected && this._hasGoogleEvent(date, h, m);

      cell.classList.toggle('tp-selected', selected && !conflict);
      cell.classList.toggle('tp-conflict', conflict);
      cell.classList.remove('tp-dragging');
    });
  },

  _renderEventOverlays() {
    const layer = this.overlay.querySelector('.tp-events-layer');
    if (!layer) return;

    const weekDates = this._getWeekDates();
    const { START_H, END_H, CELL_H } = this;

    let html = '';
    for (let di = 0; di < 7; di++) {
      const date = weekDates[di];
      const dayEvents = this.googleEvents.filter(ev => this._isSameDay(new Date(ev.start), date));
      for (const ev of dayEvents) {
        const es = new Date(ev.start), ee = new Date(ev.end);
        const sMin = es.getHours() * 60 + es.getMinutes();
        const eMin = ee.getHours() * 60 + ee.getMinutes();
        if (eMin <= START_H * 60 || sMin >= END_H * 60) continue;
        const clampS = Math.max(sMin, START_H * 60);
        const clampE = Math.min(eMin, END_H * 60);
        const top = ((clampS - START_H * 60) / 30) * CELL_H;
        const height = ((clampE - clampS) / 30) * CELL_H;
        // Position within the 7-column area (excluding time label column)
        const colW = `(100% - 44px) / 7`;
        const left = `calc(${colW} * ${di} + 44px + 1px)`;
        const width = `calc(${colW} - 2px)`;
        const sT = `${String(es.getHours()).padStart(2, '0')}:${String(es.getMinutes()).padStart(2, '0')}`;
        const eT = `${String(ee.getHours()).padStart(2, '0')}:${String(ee.getMinutes()).padStart(2, '0')}`;
        html += `<div class="tp-ev-block" style="top:${top}px;height:${height}px;left:${left};width:${width}">
          <span class="tp-ev-title">${this._escapeHtml(ev.summary)}</span>
          ${height >= 26 ? `<span class="tp-ev-time">${sT} – ${eT}</span>` : ''}
        </div>`;
      }
    }
    layer.innerHTML = html;
  },

  _updateOutput() {
    const section = this.overlay.querySelector('.tp-output-section');
    if (!section) return;
    const hasSlots = this.selectedSlots.length > 0;
    const outputText = this._generateText();

    if (hasSlots) {
      section.classList.remove('tp-empty');
      section.innerHTML = `
        <pre class="tp-output-text">${this._escapeHtml(outputText)}</pre>
        <button class="tp-copy-btn">Copy</button>`;
      section.querySelector('.tp-copy-btn').addEventListener('click', () => this._copyText());
    } else {
      section.classList.add('tp-empty');
      section.innerHTML = '<span class="tp-output-hint">Drag to select available time slots</span>';
    }

    // Reset button
    const resetBtn = this.overlay.querySelector('.tp-reset-btn');
    if (resetBtn) resetBtn.style.display = hasSlots ? '' : 'none';
  },

  _scrollToTime(hour) {
    const scroll = this.overlay.querySelector('.tp-grid-body');
    if (scroll) scroll.scrollTop = (hour - this.START_H) * 2 * this.CELL_H;
  },

  // --- Bind Events (once) ---

  _bindModalEvents() {
    const o = this.overlay;
    o.querySelector('.tp-backdrop').addEventListener('click', () => this.close());
    o.querySelector('.tp-close-btn').addEventListener('click', () => this.close());
    o.querySelector('.tp-reset-btn').addEventListener('click', () => this._clearSlots());
    o.querySelector('[data-action="prev"]').addEventListener('click', () => this._prevWeek());
    o.querySelector('[data-action="next"]').addEventListener('click', () => this._nextWeek());

    // Drag on cells
    o.querySelectorAll('.tp-cell').forEach(cell => {
      const di = parseInt(cell.dataset.di);
      const h = parseInt(cell.dataset.h);
      const m = parseInt(cell.dataset.m);

      cell.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const date = this._getWeekDates()[di];
        this._isDragging = true;
        this._dragStart = { date, hour: h, minute: m };
        this._dragEnd = { date, hour: h, minute: m };
        this._updateDragVisual();
      });

      cell.addEventListener('mouseenter', () => {
        if (!this._isDragging || !this._dragStart) return;
        const date = this._getWeekDates()[di];
        if (this._isSameDay(this._dragStart.date, date)) {
          this._dragEnd = { date, hour: h, minute: m };
          this._updateDragVisual();
        }
      });

      cell.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const date = this._getWeekDates()[di];
        this._isDragging = true;
        this._dragStart = { date, hour: h, minute: m };
        this._dragEnd = { date, hour: h, minute: m };
        this._updateDragVisual();
      }, { passive: false });

      cell.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el?.classList.contains('tp-cell')) {
          const tdi = parseInt(el.dataset.di);
          const th = parseInt(el.dataset.h);
          const tm = parseInt(el.dataset.m);
          const tDate = this._getWeekDates()[tdi];
          if (this._isDragging && this._dragStart && this._isSameDay(this._dragStart.date, tDate)) {
            this._dragEnd = { date: tDate, hour: th, minute: tm };
            this._updateDragVisual();
          }
        }
      }, { passive: false });
    });
  },

  _updateDragVisual() {
    const weekDates = this._getWeekDates();
    this.overlay.querySelectorAll('.tp-cell').forEach(cell => {
      const di = parseInt(cell.dataset.di);
      const h = parseInt(cell.dataset.h);
      const m = parseInt(cell.dataset.m);
      cell.classList.toggle('tp-dragging', this._isInDragSelection(weekDates[di], h, m));
    });
  },
};
