/* GitHub Issues widget */
const GitHubWidget = {
  body: null,
  badge: null,
  refreshInterval: null,

  init() {
    this.body = document.getElementById('github-body');
    this.badge = document.getElementById('github-badge');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 5 * 60 * 1000);
  },

  async render() {
    const token = Storage.get('github_token');
    const repo = Storage.get('github_repo');

    if (token && repo) {
      try {
        const data = await API.fetch(
          `https://api.github.com/repos/${repo}/issues?state=open&per_page=8&sort=updated`,
          {
            token,
            cacheTTL: 5 * 60 * 1000,
            cacheKey: `github_${repo}`,
          }
        );

        if (Array.isArray(data)) {
          const issues = data
            .filter(item => !item.pull_request)
            .map(item => ({
              title: item.title,
              number: item.number,
              state: item.state,
              user: item.user?.login || 'unknown',
              time: this.formatRelativeTime(item.updated_at),
              url: item.html_url,
              labels: (item.labels || []).map(l => ({
                name: l.name,
                color: `#${l.color}`,
              })),
            }));
          this.renderIssues(issues);
          return;
        }
      } catch (e) {
        if (e.message === 'AUTH_EXPIRED') {
          Storage.remove('github_token');
        }
      }
    }

    this.renderIssues(MockData.github);
  },

  renderIssues(issues) {
    if (issues.length === 0) {
      this.badge.style.display = 'none';
      this.body.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon">🎉</span><span>No open issues</span></div>`;
      return;
    }

    this.badge.style.display = '';
    this.badge.textContent = issues.length;

    this.body.innerHTML = issues.map(issue => `
      <a class="gh-item" href="${this.escapeAttr(issue.url || '#')}" target="_blank" rel="noopener">
        <svg class="gh-state gh-state-${issue.state}" width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
          ${issue.state === 'open' ? '<circle cx="8" cy="8" r="2.5" fill="currentColor"/>' : '<path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'}
        </svg>
        <div class="gh-info">
          <div class="gh-title">${this.escapeHtml(issue.title)}</div>
          <div class="gh-meta">
            #${issue.number} · ${this.escapeHtml(issue.user)} · ${this.escapeHtml(issue.time)}
            ${issue.labels.map(l => `<span class="gh-label" style="background:${l.color}22;color:${l.color}">${this.escapeHtml(l.name)}</span>`).join('')}
          </div>
        </div>
      </a>
    `).join('');
  },

  formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};
