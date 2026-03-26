/* Things widget - Tasks from Things 3 with add support */
const ThingsWidget = {
  body: null,
  refreshInterval: null,
  _currentTasks: [],
  _serverConnected: false,

  init() {
    this.body = document.getElementById('things-body');
    this.render();
    this.refreshInterval = setInterval(() => this.render(), 5 * 60 * 1000);
  },

  async render() {
    const serverUrl = Storage.get('things_url');

    if (serverUrl) {
      try {
        const data = await API.fetch(`${serverUrl}/tasks/today`, {
          cacheTTL: 5 * 60 * 1000,
          cacheKey: 'things',
        });

        if (Array.isArray(data)) {
          this._serverConnected = true;
          this._currentTasks = data;
          this.renderTasks(data);
          return;
        }
      } catch {
        // Fall through to mock data
      }
    }

    this._serverConnected = false;
    this._currentTasks = Storage.get('things_local') || MockData.things;
    this.renderTasks(this._currentTasks);
  },

  renderTasks(tasks) {
    const addFormHtml = `
      <div class="things-add-form">
        <input type="text" class="things-add-input" id="things-add-input"
               placeholder="Add task..." />
        <button class="things-add-btn" id="things-add-btn">+</button>
      </div>
    `;

    const listHtml = tasks.length === 0
      ? `<div class="widget-empty" style="padding:12px 0"><span style="font-size:20px;opacity:0.4">✅</span><span>All done for today!</span></div>`
      : tasks.map((task, i) => `
          <div class="task-item">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-index="${i}"></div>
            <span class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</span>
            ${task.project ? `<span class="task-tag">${this.escapeHtml(task.project)}</span>` : ''}
          </div>
        `).join('');

    this.body.innerHTML = addFormHtml + listHtml;

    // Bind add form
    const input = document.getElementById('things-add-input');
    const addBtn = document.getElementById('things-add-btn');

    addBtn.addEventListener('click', () => this.addTask(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTask(input);
      }
    });

    // Bind checkboxes
    this.body.querySelectorAll('.task-checkbox').forEach(el => {
      el.addEventListener('click', () => {
        this.toggleTask(parseInt(el.dataset.index));
      });
    });
  },

  async addTask(input) {
    const title = input.value.trim();
    if (!title) return;

    const serverUrl = Storage.get('things_url');

    if (this._serverConnected && serverUrl) {
      try {
        await fetch(`${serverUrl}/tasks/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        delete API.cache['things'];
        await this.render();
        return;
      } catch { /* fall through */ }
    }

    const tasks = Storage.get('things_local') || [...MockData.things];
    tasks.unshift({ title, project: '', completed: false });
    Storage.set('things_local', tasks);
    this._currentTasks = tasks;
    this.renderTasks(tasks);
  },

  async toggleTask(index) {
    if (this._serverConnected) {
      delete API.cache['things'];
      await this.render();
      return;
    }

    const tasks = Storage.get('things_local') || [...MockData.things];
    if (tasks[index]) {
      tasks[index].completed = !tasks[index].completed;
      Storage.set('things_local', tasks);
      this._currentTasks = tasks;
      this.renderTasks(tasks);
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
