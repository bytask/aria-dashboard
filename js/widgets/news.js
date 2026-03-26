/* News widget - Google News RSS or NewsAPI.org */
const NewsWidget = {
  body: null,
  refreshInterval: null,

  init() {
    this.body = document.getElementById('news-body');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 15 * 60 * 1000);
  },

  async render() {
    const source = Storage.get('news_source', 'google');
    let articles;

    if (source === 'newsapi') {
      articles = await this.fetchNewsAPI();
    } else {
      articles = await this.fetchGoogleNews();
    }

    if (!articles) articles = MockData.news;

    if (articles.length === 0) {
      this.body.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon">📰</span><span>No news</span></div>`;
      return;
    }

    this.body.innerHTML = articles.map(article => {
      const linkAttrs = article.url
        ? `href="${this.escapeAttr(article.url)}" target="_blank" rel="noopener"`
        : `href="#"`;
      return `
        <a class="news-item" ${linkAttrs}>
          <div class="news-info">
            <div class="news-title">${this.escapeHtml(article.title)}</div>
            <div class="news-meta">${this.escapeHtml(article.source)} · ${this.escapeHtml(article.time)}</div>
          </div>
        </a>
      `;
    }).join('');
  },

  async fetchGoogleNews() {
    try {
      // Google News RSS → parse via a CORS proxy or direct fetch (works in Chrome extensions)
      const rssUrl = 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja';
      const response = await fetch(rssUrl, {
        cache: 'default',
      });
      if (!response.ok) return null;

      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = xml.querySelectorAll('item');

      const articles = [];
      for (let i = 0; i < Math.min(items.length, 8); i++) {
        const item = items[i];
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const source = item.querySelector('source')?.textContent || 'Google News';

        articles.push({
          title,
          source,
          time: this.formatRelativeTime(pubDate),
          url: link,
        });
      }
      return articles.length > 0 ? articles : null;
    } catch {
      return null;
    }
  },

  async fetchNewsAPI() {
    const apiKey = Storage.get('news_api_key');
    if (!apiKey) return null;

    try {
      const data = await API.fetch(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=8&apiKey=${apiKey}`,
        { cacheTTL: 15 * 60 * 1000, cacheKey: 'news' }
      );
      if (data.articles) {
        return data.articles.map(a => ({
          title: a.title || 'No title',
          source: a.source?.name || 'Unknown',
          time: this.formatRelativeTime(a.publishedAt),
          url: a.url,
        }));
      }
    } catch { /* fall through */ }
    return null;
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
