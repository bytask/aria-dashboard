/* Settings panel - manages API tokens and theme preferences */
const Settings = {
  panel: null,
  overlay: null,

  init() {
    this.panel = document.getElementById('settings-panel');
    this.overlay = document.getElementById('settings-overlay');

    document.getElementById('settings-btn').addEventListener('click', () => this.open());
    document.getElementById('settings-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());
    document.getElementById('settings-save').addEventListener('click', () => this.save());
    document.getElementById('google-oauth-btn').addEventListener('click', () => this.googleOAuth());

    // Toggle NewsAPI key row visibility
    document.getElementById('setting-news-source').addEventListener('change', (e) => {
      document.getElementById('newsapi-key-row').style.display =
        e.target.value === 'newsapi' ? '' : 'none';
    });

    this.loadValues();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.panel.classList.contains('open')) {
        this.close();
      }
    });
  },

  open() {
    this.loadValues();
    this.panel.classList.add('open');
    this.overlay.classList.add('open');
  },

  close() {
    this.panel.classList.remove('open');
    this.overlay.classList.remove('open');
  },

  loadValues() {
    document.getElementById('setting-theme').value = Storage.get('theme', 'auto');
    document.getElementById('setting-google-token').value = Storage.get('google_token', '');
    document.getElementById('setting-slack-token').value = Storage.get('slack_token', '');
    document.getElementById('setting-news-source').value = Storage.get('news_source', 'google');
    document.getElementById('setting-news-key').value = Storage.get('news_api_key', '');
    document.getElementById('setting-x-token').value = Storage.get('x_token', '');
    document.getElementById('setting-x-keywords').value = Storage.get('x_keywords', '');
    document.getElementById('setting-things-url').value = Storage.get('things_url', '');
    document.getElementById('setting-github-token').value = Storage.get('github_token', '');
    document.getElementById('setting-github-repo').value = Storage.get('github_repo', '');
    document.getElementById('setting-aria-engine-url').value = Storage.get('aria_engine_url', '');

    // Show/hide NewsAPI key row
    document.getElementById('newsapi-key-row').style.display =
      Storage.get('news_source', 'google') === 'newsapi' ? '' : 'none';

    // Google OAuth status
    const statusEl = document.getElementById('google-oauth-status');
    const token = Storage.get('google_token');
    if (token) {
      statusEl.textContent = 'Connected';
      document.getElementById('google-oauth-btn').textContent = 'Re-authenticate';
    } else {
      statusEl.textContent = '';
      document.getElementById('google-oauth-btn').textContent = 'Sign in with Google';
    }
  },

  googleOAuth() {
    if (typeof chrome !== 'undefined' && chrome.identity && chrome.identity.getAuthToken) {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          document.getElementById('google-oauth-status').textContent =
            'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        if (token) {
          Storage.set('google_token', token);
          document.getElementById('setting-google-token').value = token;
          document.getElementById('google-oauth-status').textContent = 'Connected';
          document.getElementById('google-oauth-btn').textContent = 'Re-authenticate';
          API.cache = {};
          CalendarWidget.loadEvents();
          GmailWidget.render();
        }
      });
    } else {
      document.getElementById('google-oauth-status').textContent =
        'OAuth requires Chrome extension mode. Use manual token below.';
    }
  },

  save() {
    const theme = document.getElementById('setting-theme').value;
    const googleToken = document.getElementById('setting-google-token').value.trim();
    const slackToken = document.getElementById('setting-slack-token').value.trim();
    const newsSource = document.getElementById('setting-news-source').value;
    const newsKey = document.getElementById('setting-news-key').value.trim();
    const xToken = document.getElementById('setting-x-token').value.trim();
    const xKeywords = document.getElementById('setting-x-keywords').value.trim();
    const thingsUrl = document.getElementById('setting-things-url').value.trim();
    const githubToken = document.getElementById('setting-github-token').value.trim();
    const githubRepo = document.getElementById('setting-github-repo').value.trim();
    const ariaEngineUrl = document.getElementById('setting-aria-engine-url').value.trim();

    Storage.set('theme', theme);
    Storage.set('news_source', newsSource);

    const pairs = [
      ['google_token', googleToken],
      ['slack_token', slackToken],
      ['news_api_key', newsKey],
      ['x_token', xToken],
      ['x_keywords', xKeywords],
      ['things_url', thingsUrl],
      ['github_token', githubToken],
      ['github_repo', githubRepo],
      ['aria_engine_url', ariaEngineUrl],
    ];
    for (const [key, val] of pairs) {
      if (val) Storage.set(key, val);
      else Storage.remove(key);
    }

    App.applyTheme(theme);

    API.cache = {};
    CalendarWidget.loadEvents();
    GmailWidget.render();
    SlackWidget.render();
    ThingsWidget.render();
    NewsWidget.render();
    XTrendsWidget.render();
    GitHubWidget.render();
    SessionsWidget.render();

    this.close();
  },
};
