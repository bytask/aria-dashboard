/* API utility - fetch wrapper with caching, auth, and mock fallback */
const API = {
  cache: {},

  async fetch(url, options = {}) {
    const { token, cacheTTL = 0, cacheKey } = options;
    const key = cacheKey || url;

    // Check cache
    if (cacheTTL > 0) {
      const cached = this.cache[key];
      if (cached && Date.now() - cached.time < cacheTTL) {
        return cached.data;
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers, ...options });

    if (response.status === 401) {
      throw new Error('AUTH_EXPIRED');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Update cache
    if (cacheTTL > 0) {
      this.cache[key] = { data, time: Date.now() };
    }

    return data;
  }
};

/* Mock data for all API-dependent widgets */
const MockData = {
  calendar: [
    { title: 'Team Standup', start: '09:00', end: '09:15', color: '#007aff' },
    { title: 'Design Review', start: '10:30', end: '11:30', color: '#ff9500' },
    { title: 'Lunch with Alex', start: '12:00', end: '13:00', color: '#34c759' },
    { title: 'Sprint Planning', start: '14:00', end: '15:00', color: '#af52de' },
    { title: '1:1 with Manager', start: '16:00', end: '16:30', color: '#ff3b30' },
  ],

  gmail: [
    { sender: 'Sarah Chen', subject: 'Q1 Report - Final Review', time: '2h ago', initial: 'S', color: '#007aff' },
    { sender: 'GitHub', subject: '[aria-dashboard] PR #42 merged', time: '3h ago', initial: 'G', color: '#1d1d1f' },
    { sender: 'Alex Kim', subject: 'Re: Design system update', time: '5h ago', initial: 'A', color: '#34c759' },
    { sender: 'Notion', subject: 'Weekly digest - 3 new updates', time: '8h ago', initial: 'N', color: '#ff9500' },
    { sender: 'HR Team', subject: 'Reminder: Submit timesheet', time: '1d ago', initial: 'H', color: '#af52de' },
  ],

  slack: [
    { channel: '#engineering', sender: 'Mike', message: 'Just deployed v2.3.0 to staging. Can everyone do a quick smoke test?', time: '15m ago' },
    { channel: '#design', sender: 'Lisa', message: 'Updated the component library with new tokens. Check Figma.', time: '1h ago' },
    { channel: 'DM: Jordan', sender: 'Jordan', message: 'Hey, can we sync about the API changes this afternoon?', time: '2h ago' },
    { channel: '#general', sender: 'Bot', message: 'Reminder: All-hands meeting tomorrow at 10am', time: '4h ago' },
  ],

  news: [
    { title: 'Apple Announces New AI Features for macOS', source: 'The Verge', time: '1h ago', image: null },
    { title: 'Global Tech Spending Expected to Rise 8% in 2026', source: 'Reuters', time: '2h ago', image: null },
    { title: 'New JavaScript Runtime Challenges Node.js Dominance', source: 'TechCrunch', time: '3h ago', image: null },
    { title: 'Open Source AI Models Reach New Benchmark Milestones', source: 'Ars Technica', time: '5h ago', image: null },
    { title: 'Remote Work Trends: What Companies Are Doing in 2026', source: 'Bloomberg', time: '6h ago', image: null },
    { title: 'Quantum Computing Breakthrough in Error Correction', source: 'Nature', time: '8h ago', image: null },
  ],

  things: [
    { title: 'Review PR for auth module', project: 'Work', completed: false },
    { title: 'Write unit tests for API layer', project: 'Work', completed: false },
    { title: 'Update documentation', project: 'Work', completed: true },
    { title: 'Grocery shopping', project: 'Personal', completed: false },
    { title: 'Read chapter 5 of Design Patterns', project: 'Learning', completed: false },
    { title: 'Schedule dentist appointment', project: 'Personal', completed: true },
  ],

  xTrends: [
    { topic: 'Claude Code', posts: '12.4K', url: 'https://x.com/search?q=Claude+Code' },
    { topic: '#AIAgents', posts: '8.7K', url: 'https://x.com/search?q=%23AIAgents' },
    { topic: 'Apple WWDC', posts: '45.2K', url: 'https://x.com/search?q=Apple+WWDC' },
    { topic: '#OpenSource', posts: '5.1K', url: 'https://x.com/search?q=%23OpenSource' },
    { topic: 'TypeScript 6.0', posts: '3.8K', url: 'https://x.com/search?q=TypeScript+6.0' },
    { topic: 'Figma AI', posts: '2.9K', url: 'https://x.com/search?q=Figma+AI' },
  ],

  github: [
    { title: 'Fix authentication flow for OAuth redirect', number: 142, state: 'open', user: 'alex-dev', time: '2h ago', url: '#', labels: [{ name: 'bug', color: '#d73a4a' }] },
    { title: 'Add dark mode support to settings panel', number: 138, state: 'open', user: 'sarah-ui', time: '5h ago', url: '#', labels: [{ name: 'enhancement', color: '#a2eeef' }] },
    { title: 'Update API rate limiting configuration', number: 135, state: 'open', user: 'mike-ops', time: '1d ago', url: '#', labels: [{ name: 'infra', color: '#d4c5f9' }] },
    { title: 'Migrate database schema to v3', number: 130, state: 'open', user: 'jordan-db', time: '2d ago', url: '#', labels: [{ name: 'database', color: '#0075ca' }] },
    { title: 'Improve error messages in CLI', number: 127, state: 'open', user: 'lisa-dx', time: '3d ago', url: '#', labels: [{ name: 'dx', color: '#e4e669' }] },
  ],
};
