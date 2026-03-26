/* Navbar widget - Clock, Date, Network Status */
const Navbar = {
  init() {
    this.clockEl = document.getElementById('navbar-clock');
    this.dateEl = document.getElementById('navbar-date');
    this.networkEl = document.getElementById('network-status');
    this.networkLabel = document.getElementById('network-label');

    this.updateClock();
    this.updateNetwork();

    setInterval(() => this.updateClock(), 1000);
    setInterval(() => this.updateNetwork(), 10000);

    window.addEventListener('online', () => this.updateNetwork());
    window.addEventListener('offline', () => this.updateNetwork());
  },

  updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    this.clockEl.innerHTML = `${h}:${m}<span class="clock-seconds">:${s}</span>`;
    this.dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  },

  updateNetwork() {
    const online = navigator.onLine;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    let label = online ? 'Online' : 'Offline';
    let details = '';

    if (online && conn) {
      const type = conn.effectiveType || conn.type || '';
      const downlink = conn.downlink;
      const rtt = conn.rtt;

      if (type) details += type.toUpperCase();
      if (downlink) details += ` ${downlink}Mbps`;
      if (rtt !== undefined) details += ` ${rtt}ms`;
      label = details.trim() || 'Online';
    }

    this.networkEl.className = `navbar-icon ${online ? 'network-online' : 'network-offline'}`;
    this.networkLabel.textContent = label;
  },
};
