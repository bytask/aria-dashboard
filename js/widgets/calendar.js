/* Calendar widget - Month view + daily timeline */
const CalendarWidget = {
  body: null,
  currentYear: null,
  currentMonth: null,
  selectedDate: null,
  events: {},
  _nowTimer: null,

  init() {
    this.body = document.getElementById('calendar-body');
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDate = this.dateKey(now);
    this.loadEvents();
    this.render();
    // Update now-line every minute
    this._nowTimer = setInterval(() => this._updateNowLine(), 60000);
  },

  dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  async loadEvents() {
    const token = Storage.get('google_token');

    if (token) {
      try {
        const start = new Date(this.currentYear, this.currentMonth, 1);
        const end = new Date(this.currentYear, this.currentMonth + 1, 0, 23, 59, 59);
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=100&conferenceDataVersion=1`;

        const data = await API.fetch(url, {
          token,
          cacheTTL: 5 * 60 * 1000,
          cacheKey: `calendar_${this.currentYear}_${this.currentMonth}`,
        });

        this.events = {};
        for (const item of (data.items || [])) {
          const dateStr = (item.start?.dateTime || item.start?.date || '').slice(0, 10);
          if (!this.events[dateStr]) this.events[dateStr] = [];
          // Extract Meet link from hangoutLink or conferenceData
          let meetLink = item.hangoutLink || '';
          if (!meetLink && item.conferenceData?.entryPoints) {
            const videoEntry = item.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
            if (videoEntry) meetLink = videoEntry.uri;
          }

          this.events[dateStr].push({
            title: item.summary || 'No title',
            subtitle: item.location || item.description?.slice(0, 50) || '',
            startRaw: item.start?.dateTime,
            endRaw: item.end?.dateTime,
            start: this.formatTime(item.start?.dateTime),
            end: this.formatTime(item.end?.dateTime),
            color: this.eventColor(this.events[dateStr].length),
            meetLink,
          });
        }
        this.render();
        return;
      } catch (e) {
        if (e.message === 'AUTH_EXPIRED') Storage.remove('google_token');
      }
    }

    // Mock data
    this.events = {};
    const today = new Date();
    const todayKey = this.dateKey(today);
    const y = today.getFullYear(), mo = today.getMonth(), da = today.getDate();

    this.events[todayKey] = [
      { title: 'TWO エンジニア研修', subtitle: 'Claude Code training', start: '09:00', end: '10:30', startRaw: new Date(y,mo,da,9,0).toISOString(), endRaw: new Date(y,mo,da,10,30).toISOString(), color: '#007aff', meetLink: 'https://meet.google.com/xxx-xxxx-xxx' },
      { title: 'CAIO MTG', subtitle: '株式会社TWO', start: '11:00', end: '12:00', startRaw: new Date(y,mo,da,11,0).toISOString(), endRaw: new Date(y,mo,da,12,0).toISOString(), color: '#ff9500', meetLink: 'https://meet.google.com/yyy-yyyy-yyy' },
      { title: 'AI Guild #12', subtitle: 'Weekly session', start: '14:30', end: '15:30', startRaw: new Date(y,mo,da,14,30).toISOString(), endRaw: new Date(y,mo,da,15,30).toISOString(), color: '#34c759', meetLink: '' },
      { title: '提案書レビュー', subtitle: 'ARIA architecture', start: '17:00', end: '18:00', startRaw: new Date(y,mo,da,17,0).toISOString(), endRaw: new Date(y,mo,da,18,0).toISOString(), color: '#ff3b30', meetLink: 'https://meet.google.com/zzz-zzzz-zzz' },
    ];

    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
    const d1 = this.dateKey(addDays(today, 1));
    const nd = addDays(today, 1);
    this.events[d1] = [
      { title: 'Sprint Review', subtitle: 'Team standup', start: '10:00', end: '11:00', startRaw: new Date(nd.getFullYear(),nd.getMonth(),nd.getDate(),10,0).toISOString(), endRaw: new Date(nd.getFullYear(),nd.getMonth(),nd.getDate(),11,0).toISOString(), color: '#af52de' },
      { title: 'Design Sync', subtitle: 'Figma review', start: '14:00', end: '15:00', startRaw: new Date(nd.getFullYear(),nd.getMonth(),nd.getDate(),14,0).toISOString(), endRaw: new Date(nd.getFullYear(),nd.getMonth(),nd.getDate(),15,0).toISOString(), color: '#007aff' },
    ];
    const d2 = this.dateKey(addDays(today, 3));
    const nd2 = addDays(today, 3);
    this.events[d2] = [
      { title: '1:1 Meeting', subtitle: 'Manager', start: '15:00', end: '15:30', startRaw: new Date(nd2.getFullYear(),nd2.getMonth(),nd2.getDate(),15,0).toISOString(), endRaw: new Date(nd2.getFullYear(),nd2.getMonth(),nd2.getDate(),15,30).toISOString(), color: '#ff9500' },
    ];
    const d3 = this.dateKey(addDays(today, -1));
    const nd3 = addDays(today, -1);
    this.events[d3] = [
      { title: 'All Hands', subtitle: 'Company update', start: '10:00', end: '11:00', startRaw: new Date(nd3.getFullYear(),nd3.getMonth(),nd3.getDate(),10,0).toISOString(), endRaw: new Date(nd3.getFullYear(),nd3.getMonth(),nd3.getDate(),11,0).toISOString(), color: '#34c759' },
    ];
  },

  eventColor(index) {
    const colors = ['#007aff', '#ff9500', '#34c759', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00'];
    return colors[index % colors.length];
  },

  render() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
    const todayKey = this.dateKey(new Date());
    const selectedEvents = this.events[this.selectedDate] || [];
    const isSelectedToday = this.selectedDate === todayKey;

    // Month grid
    let daysHtml = '';
    for (let i = firstDay - 1; i >= 0; i--) {
      daysHtml += `<div class="cal-day other-month">${daysInPrevMonth - i}</div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let classes = 'cal-day';
      if (key === todayKey) classes += ' today';
      if (key === this.selectedDate && key !== todayKey) classes += ' selected';
      const hasEvents = this.events[key]?.length > 0;
      daysHtml += `<div class="${classes}" data-date="${key}">${d}${hasEvents ? '<span class="cal-day-dot"></span>' : ''}</div>`;
    }
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      daysHtml += `<div class="cal-day other-month">${i}</div>`;
    }

    // Timeline (7:00 - 22:00)
    const startHour = 7, endHour = 22;
    let hourRows = '';
    for (let h = startHour; h <= endHour; h++) {
      hourRows += `<div class="cal-hour-row" data-hour="${h}">
        <span class="cal-hour-label">${String(h).padStart(2, '0')}:00</span>
        <div class="cal-hour-line"></div>
      </div>`;
    }

    // Event blocks on timeline
    const ROW_H = 48;
    let eventBlocks = '';
    for (const ev of selectedEvents) {
      const sDate = new Date(ev.startRaw);
      const eDate = new Date(ev.endRaw);
      if (isNaN(sDate) || isNaN(eDate)) continue;

      const sMin = sDate.getHours() * 60 + sDate.getMinutes();
      const eMin = eDate.getHours() * 60 + eDate.getMinutes();
      const top = ((sMin - startHour * 60) / 60) * ROW_H;
      const height = Math.max(((eMin - sMin) / 60) * ROW_H, 22);

      const meetBtn = ev.meetLink
        ? `<a class="cal-meet-btn" href="${ev.meetLink}" target="_blank" rel="noopener" title="Join Meet">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="currentColor"/></svg>
          </a>`
        : '';

      eventBlocks += `<div class="cal-tl-event" style="top:${top}px;height:${height}px;border-left-color:${ev.color};background:${ev.color}18">
        <div class="cal-tl-event-row">
          <span class="cal-tl-event-title">${this.escapeHtml(ev.title)}</span>
          ${meetBtn}
        </div>
        ${height >= 36 ? `<span class="cal-tl-event-time">${ev.start} - ${ev.end}</span>` : ''}
        ${height >= 52 && ev.subtitle ? `<span class="cal-tl-event-subtitle">${this.escapeHtml(ev.subtitle)}</span>` : ''}
      </div>`;
    }

    // Now line
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowTop = ((nowMin - startHour * 60) / 60) * ROW_H;
    const showNow = isSelectedToday && nowMin >= startHour * 60 && nowMin <= endHour * 60;
    const nowLineHtml = showNow
      ? `<div class="cal-now-line" id="cal-now-line" style="top:${nowTop}px"><div class="cal-now-dot"></div></div>`
      : '';

    const selDate = new Date(this.selectedDate + 'T00:00:00');
    const scheduleLabel = isSelectedToday ? "TODAY'S SCHEDULE" : `${selDate.getMonth() + 1}/${selDate.getDate()} SCHEDULE`;

    this.body.innerHTML = `
      <div class="cal-month-nav">
        <button data-action="prev">&lsaquo;</button>
        <span class="cal-month-title">${this.currentYear} / ${monthNames[this.currentMonth]}</span>
        <button data-action="next">&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${weekdays.map(w => `<span class="cal-weekday">${w}</span>`).join('')}
        ${daysHtml}
      </div>
      <div class="cal-schedule" id="cal-schedule">
        <div class="cal-schedule-header">
          <span class="cal-schedule-title">${scheduleLabel}</span>
          ${selectedEvents.length > 0 ? `<span class="cal-schedule-badge">${selectedEvents.length}</span>` : ''}
        </div>
        <div class="cal-timeline" id="cal-timeline">
          ${hourRows}
          ${eventBlocks}
          ${nowLineHtml}
        </div>
      </div>
    `;

    // Bind events
    this.body.querySelector('[data-action="prev"]').addEventListener('click', () => this.prevMonth());
    this.body.querySelector('[data-action="next"]').addEventListener('click', () => this.nextMonth());
    this.body.querySelectorAll('.cal-day[data-date]').forEach(el => {
      el.addEventListener('click', () => this.selectDate(el.dataset.date));
    });

    // Scroll to current time
    this._scrollToNow();
  },

  _scrollToNow() {
    const schedule = document.getElementById('cal-schedule');
    const nowLine = document.getElementById('cal-now-line');
    if (schedule && nowLine) {
      const offset = nowLine.offsetTop - schedule.clientHeight / 3;
      schedule.scrollTop = Math.max(0, offset);
    } else if (schedule) {
      // If not today, scroll to first event or 9am
      const firstEvent = schedule.querySelector('.cal-tl-event');
      if (firstEvent) {
        schedule.scrollTop = Math.max(0, firstEvent.offsetTop - 20);
      } else {
        schedule.scrollTop = (9 - 7) * 48;
      }
    }
  },

  _updateNowLine() {
    const nowLine = document.getElementById('cal-now-line');
    if (!nowLine) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const top = ((nowMin - 7 * 60) / 60) * 48;
    nowLine.style.top = top + 'px';
  },

  selectDate(dateKey) {
    this.selectedDate = dateKey;
    this.render();
  },

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.loadEvents();
    this.render();
  },

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    this.loadEvents();
    this.render();
  },

  formatTime(dateStr) {
    if (!dateStr) return 'All day';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
