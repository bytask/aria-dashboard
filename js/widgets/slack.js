/* Slack widget - Unread mentions and DMs */
const SlackWidget = {
  body: null,
  badge: null,
  refreshInterval: null,

  init() {
    this.body = document.getElementById('slack-body');
    this.badge = document.getElementById('slack-badge');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 5 * 60 * 1000);
  },

  async render() {
    const token = Storage.get('slack_token');

    if (token) {
      try {
        const data = await API.fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=10', {
          token,
          cacheTTL: 5 * 60 * 1000,
          cacheKey: 'slack_channels',
        });

        if (data.ok && data.channels) {
          const messages = [];
          for (const ch of data.channels.slice(0, 5)) {
            try {
              const hist = await API.fetch(
                `https://slack.com/api/conversations.history?channel=${ch.id}&limit=1`,
                { token, cacheTTL: 5 * 60 * 1000, cacheKey: `slack_hist_${ch.id}` }
              );
              if (hist.ok && hist.messages?.[0]) {
                messages.push({
                  channel: ch.name || 'DM',
                  sender: hist.messages[0].user || 'Unknown',
                  message: hist.messages[0].text || '',
                  time: this.formatRelativeTime(hist.messages[0].ts),
                });
              }
            } catch {
              // Skip failed channel
            }
          }
          this.renderMessages(messages);
          return;
        }
      } catch (e) {
        if (e.message === 'AUTH_EXPIRED') {
          Storage.remove('slack_token');
        }
      }
    }

    // Use mock data
    this.renderMessages(MockData.slack);
  },

  renderMessages(messages) {
    if (messages.length === 0) {
      this.badge.style.display = 'none';
      this.body.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon">💬</span><span>No new messages</span></div>`;
      return;
    }

    this.badge.style.display = '';
    this.badge.textContent = messages.length;

    this.body.innerHTML = messages.map(msg => `
      <div class="slack-item">
        <div class="slack-avatar">${this.escapeHtml(msg.sender.charAt(0).toUpperCase())}</div>
        <div class="slack-info">
          <div class="slack-channel">${this.escapeHtml(msg.channel)}</div>
          <div class="slack-message">${this.escapeHtml(msg.message)}</div>
          <div class="slack-meta">
            <span>${this.escapeHtml(msg.sender)}</span>
            <span>${this.escapeHtml(msg.time)}</span>
          </div>
        </div>
      </div>
    `).join('');
  },

  formatRelativeTime(ts) {
    if (!ts) return '';
    const date = new Date(parseFloat(ts) * 1000);
    if (isNaN(date)) return ts;
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
};
