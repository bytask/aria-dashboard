/* Gmail widget - Important emails (unread or received today) */
const GmailWidget = {
  body: null,
  badge: null,
  refreshInterval: null,

  init() {
    this.body = document.getElementById('gmail-body');
    this.badge = document.getElementById('gmail-badge');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 5 * 60 * 1000);
  },

  async render() {
    const token = Storage.get('google_token');

    if (token) {
      try {
        // Important AND (unread OR received today)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}/${mm}/${dd}`;

        const query = `is:important (is:unread OR after:${dateStr})`;
        const listUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`;
        const listData = await API.fetch(listUrl, {
          token,
          cacheTTL: 5 * 60 * 1000,
          cacheKey: 'gmail_list',
        });

        const messages = listData.messages || [];
        const emails = [];

        for (const msg of messages) {
          const detail = await API.fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { token, cacheTTL: 10 * 60 * 1000, cacheKey: `gmail_msg_${msg.id}` }
          );

          const headers = detail.payload?.headers || [];
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
          const date = headers.find(h => h.name === 'Date')?.value || '';
          const isUnread = (detail.labelIds || []).includes('UNREAD');

          const senderName = from.replace(/<.*>/, '').trim().replace(/"/g, '');
          emails.push({
            sender: senderName,
            subject,
            time: this.formatRelativeTime(date),
            initial: senderName.charAt(0).toUpperCase(),
            color: this.stringToColor(senderName),
            link: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`,
            isUnread,
          });
        }

        this.renderEmails(emails);
        return;
      } catch (e) {
        if (e.message === 'AUTH_EXPIRED') {
          Storage.remove('google_token');
        }
      }
    }

    this.renderEmails(MockData.gmail);
  },

  renderEmails(emails) {
    if (emails.length === 0) {
      this.badge.style.display = 'none';
      this.body.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon">📭</span><span>No important emails</span></div>`;
      return;
    }

    const unreadCount = emails.filter(e => e.isUnread).length;
    this.badge.style.display = unreadCount > 0 ? '' : 'none';
    this.badge.textContent = unreadCount;

    this.body.innerHTML = emails.map(email => `
      <div class="mail-item ${email.isUnread ? 'mail-unread' : ''}" ${email.link ? `data-link="${this.escapeAttr(email.link)}"` : ''}>
        <div class="mail-avatar" style="background: ${email.color}">${this.escapeHtml(email.initial)}</div>
        <div class="mail-info">
          <div class="mail-sender">${this.escapeHtml(email.sender)}</div>
          <div class="mail-subject">${this.escapeHtml(email.subject)}</div>
        </div>
        <span class="mail-time">${this.escapeHtml(email.time)}</span>
      </div>
    `).join('');

    this.body.querySelectorAll('.mail-item[data-link]').forEach(el => {
      el.addEventListener('click', () => window.open(el.dataset.link, '_blank'));
    });
  },

  escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  },

  stringToColor(str) {
    const colors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff3b30', '#5ac8fa', '#ffcc00'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
