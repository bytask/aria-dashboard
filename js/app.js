/* App - Main initialization and theme management */
const App = {
  _tabsEnabled: false,

  async init() {
    await Storage.init();
    await Storage.migrate();

    const theme = Storage.get('theme', 'auto');
    this.applyTheme(theme);

    Navbar.init();
    CalendarWidget.init();
    GmailWidget.init();
    SlackWidget.init();
    ThingsWidget.init();
    NewsWidget.init();
    XTrendsWidget.init();
    GitHubWidget.init();
    KoreanKeyboardWidget.init();
    SessionsWidget.init();
    TimePick.init();
    Settings.init();

    // Bind TimePick button
    document.getElementById('timepick-btn')?.addEventListener('click', () => TimePick.open());

    this.initResponsiveTabs();
  },

  applyTheme(theme) {
    const root = document.documentElement;
    root.removeAttribute('data-theme');

    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    }
  },

  initResponsiveTabs() {
    const tabBar = document.getElementById('responsive-tabs');
    const tabs = tabBar.querySelectorAll('.resp-tab');

    // Bind tab clicks
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchCategory(tab.dataset.category);
      });
    });

    // Watch for viewport resize to enable/disable tab mode
    const mq = window.matchMedia('(max-width: 1200px)');
    const handleChange = (e) => {
      this._tabsEnabled = e.matches;
      if (e.matches) {
        // Enter tab mode: show the active category
        const activeTab = tabBar.querySelector('.resp-tab.active');
        this.switchCategory(activeTab?.dataset.category || 'schedule');
      } else {
        // Exit tab mode: show all widgets
        document.querySelectorAll('.widget-card[data-category]').forEach(el => {
          el.classList.remove('category-visible');
        });
      }
    };

    mq.addEventListener('change', handleChange);
    handleChange(mq);
  },

  switchCategory(category) {
    const tabBar = document.getElementById('responsive-tabs');

    // Update tab active state
    tabBar.querySelectorAll('.resp-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.category === category);
    });

    // Show/hide widgets by category
    document.querySelectorAll('.widget-card[data-category]').forEach(el => {
      if (el.dataset.category === category) {
        el.classList.add('category-visible');
      } else {
        el.classList.remove('category-visible');
      }
    });
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
