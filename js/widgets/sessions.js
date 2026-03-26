/* Claude Sessions widget - displays recent ARIA engine sessions */
const SessionsWidget = {
  body: null,
  badge: null,
  refreshInterval: null,

  init() {
    this.body = document.getElementById('sessions-body');
    this.badge = document.getElementById('sessions-badge');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 60 * 1000);
  },

  async render() {
    const url = Storage.get('aria_engine_url');

    if (url) {
      try {
        const data = await API.fetch(
          `${url.replace(/\/+$/, '')}/sessions`,
          { cacheTTL: 60 * 1000, cacheKey: 'aria_sessions' }
        );

        if (Array.isArray(data)) {
          this.renderSessions(data);
          return;
        }
      } catch (e) {
        console.warn('Sessions fetch failed:', e);
      }
    }

    this.renderSessions(MockData.sessions);
  },

  renderSessions(sessions) {
    if (!sessions || sessions.length === 0) {
      this.badge.style.display = 'none';
      this.body.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon">🤖</span><span>No sessions</span></div>`;
      return;
    }

    this.badge.style.display = '';
    this.badge.textContent = sessions.length;

    this.body.innerHTML = sessions.map(s => `
      <div class="session-item">
        <div class="session-icon">${this.workspaceIcon(s.workspace)}</div>
        <div class="session-info">
          <div class="session-title">${this.escapeHtml(this.truncate(s.first_message, 60))}</div>
          <div class="session-meta">
            <span class="session-workspace">${this.escapeHtml(s.workspace)}</span>
            <span class="session-separator">·</span>
            <span>${s.message_count} msgs</span>
            <span class="session-separator">·</span>
            <span>${this.formatRelativeTime(s.last_activity)}</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  workspaceIcon(workspace) {
    if (workspace.includes('piper')) return '📋';
    if (workspace.includes('ideabox')) return '💡';
    if (workspace.includes('engine')) return '⚙️';
    if (workspace.includes('test')) return '🧪';
    return '💬';
  },

  truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
  },

  formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
