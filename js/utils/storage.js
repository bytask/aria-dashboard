/* Storage utility - chrome.storage.local with in-memory cache
 *
 * Uses chrome.storage.local (persists across browser data clears)
 * with a synchronous in-memory cache for read performance.
 * Falls back to localStorage when not running as a Chrome extension.
 */
const Storage = {
  _cache: {},
  _ready: false,
  _readyCallbacks: [],
  _useChromeStorage: false,

  async init() {
    this._useChromeStorage =
      typeof chrome !== 'undefined' &&
      chrome.storage &&
      chrome.storage.local;

    if (this._useChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
          for (const [k, v] of Object.entries(items || {})) {
            if (k.startsWith('aria_')) {
              this._cache[k.slice(5)] = v;
            }
          }
          this._ready = true;
          this._readyCallbacks.forEach(cb => cb());
          this._readyCallbacks = [];
          resolve();
        });
      });
    }

    // Fallback: load from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('aria_')) {
        try {
          this._cache[k.slice(5)] = JSON.parse(localStorage.getItem(k));
        } catch { /* skip */ }
      }
    }
    this._ready = true;
  },

  // Migrate existing localStorage data to chrome.storage.local (one-time)
  async migrate() {
    if (!this._useChromeStorage) return;

    const toMigrate = {};
    let found = false;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('aria_')) {
        try {
          toMigrate[k] = JSON.parse(localStorage.getItem(k));
          this._cache[k.slice(5)] = toMigrate[k];
          found = true;
        } catch { /* skip */ }
      }
    }

    if (found) {
      await new Promise((resolve) => {
        chrome.storage.local.set(toMigrate, () => {
          // Clear migrated keys from localStorage
          Object.keys(toMigrate).forEach(k => localStorage.removeItem(k));
          resolve();
        });
      });
    }
  },

  get(key, fallback = null) {
    const val = this._cache[key];
    return val !== undefined ? val : fallback;
  },

  set(key, value) {
    this._cache[key] = value;

    if (this._useChromeStorage) {
      chrome.storage.local.set({ [`aria_${key}`]: value });
    } else {
      try {
        localStorage.setItem(`aria_${key}`, JSON.stringify(value));
      } catch { /* full */ }
    }
  },

  remove(key) {
    delete this._cache[key];

    if (this._useChromeStorage) {
      chrome.storage.local.remove(`aria_${key}`);
    } else {
      localStorage.removeItem(`aria_${key}`);
    }
  },
};
