/* X Trends widget - X API v2 with keyword filtering */
const XTrendsWidget = {
  body: null,
  refreshInterval: null,

  init() {
    this.body = document.getElementById('xtrends-body');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 15 * 60 * 1000);
  },

  async render() {
    const token = Storage.get('x_token');
    const keywordsRaw = Storage.get('x_keywords', '');

    if (token) {
      const trends = await this.fetchTrends(token, keywordsRaw);
      if (trends) {
        this.renderTrends(trends);
        return;
      }
    }

    // Mock data
    this.renderTrends(this.filterByKeywords(MockData.xTrends, keywordsRaw));
  },

  async fetchTrends(token, keywordsRaw) {
    try {
      // X API v2: search recent tweets matching user keywords, aggregate as "trends"
      const keywords = this.parseKeywords(keywordsRaw);
      if (keywords.length === 0) {
        // No keywords: get general trending topics via woeid=1 (worldwide)
        // Note: GET /2/trends requires appropriate API access level
        try {
          const data = await API.fetch(
            'https://api.x.com/2/trends/by/woeid/1',
            { token, cacheTTL: 15 * 60 * 1000, cacheKey: 'x_trends_global' }
          );
          if (data.data) {
            return data.data.slice(0, 8).map(t => ({
              topic: t.trend_name || t.name,
              posts: this.formatCount(t.tweet_count),
              url: `https://x.com/search?q=${encodeURIComponent(t.trend_name || t.name)}`,
            }));
          }
        } catch {
          // Trends endpoint may not be available, fall through to search
        }
      }

      // Keyword-based: search recent popular tweets for each keyword
      const trends = [];
      for (const kw of keywords.slice(0, 6)) {
        try {
          const q = encodeURIComponent(kw + ' -is:retweet');
          const data = await API.fetch(
            `https://api.x.com/2/tweets/search/recent?query=${q}&max_results=10&tweet.fields=public_metrics`,
            { token, cacheTTL: 15 * 60 * 1000, cacheKey: `x_kw_${kw}` }
          );
          const count = data.meta?.result_count || 0;
          const totalEngagement = (data.data || []).reduce((sum, t) => {
            const m = t.public_metrics || {};
            return sum + (m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0);
          }, 0);

          trends.push({
            topic: kw,
            posts: this.formatCount(totalEngagement),
            url: `https://x.com/search?q=${encodeURIComponent(kw)}`,
            engagement: totalEngagement,
          });
        } catch {
          trends.push({
            topic: kw,
            posts: '--',
            url: `https://x.com/search?q=${encodeURIComponent(kw)}`,
            engagement: 0,
          });
        }
      }

      // Sort by engagement
      trends.sort((a, b) => (b.engagement || 0) - (a.engagement || 0));
      return trends.length > 0 ? trends : null;
    } catch {
      return null;
    }
  },

  filterByKeywords(mockTrends, keywordsRaw) {
    const keywords = this.parseKeywords(keywordsRaw);
    if (keywords.length === 0) return mockTrends;
    return mockTrends.filter(t =>
      keywords.some(kw => t.topic.toLowerCase().includes(kw.toLowerCase()))
    );
  },

  parseKeywords(raw) {
    if (!raw) return [];
    return raw.split(',').map(k => k.trim()).filter(Boolean);
  },

  formatCount(n) {
    if (n === undefined || n === null) return '--';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  },

  renderTrends(trends) {
    if (!trends || trends.length === 0) {
      this.body.innerHTML = `<div class="widget-empty"><span class="widget-empty-icon" style="font-size:20px">𝕏</span><span>No matching trends</span></div>`;
      return;
    }

    this.body.innerHTML = trends.map((trend, i) => `
      <a class="news-item" href="${this.escapeAttr(trend.url || '#')}" target="_blank" rel="noopener">
        <div class="news-info">
          <div class="news-meta" style="margin-top:0;margin-bottom:2px;font-weight:600;color:var(--text-tertiary)">${i + 1}</div>
          <div class="news-title">${this.escapeHtml(trend.topic)}</div>
          <div class="news-meta">${this.escapeHtml(trend.posts)} engagements</div>
        </div>
      </a>
    `).join('');
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
