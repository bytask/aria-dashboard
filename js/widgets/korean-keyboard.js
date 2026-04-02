/* Korean Keyboard widget - Mac keyboard setup guide for Korean input */
const KoreanKeyboardWidget = {
  body: null,

  init() {
    this.body = document.getElementById('korean-keyboard-body');
    this.render();
  },

  render() {
    const steps = [
      {
        icon: '',
        title: 'システム設定を開く',
        desc: 'メニュー > システム設定 > キーボード',
      },
      {
        icon: '🌐',
        title: '入力ソースを編集',
        desc: '「入力ソース」の「編集」をクリック',
      },
      {
        icon: '+',
        title: '韓国語を追加',
        desc: '左下の「+」> 韓国語 > 2-Set Korean を選択',
      },
      {
        icon: '⌨️',
        title: '入力切替',
        desc: 'Ctrl + Space または 🌐キー で切替',
      },
    ];

    const stepsHtml = steps.map((step, i) => `
      <div class="kr-kb-step">
        <div class="kr-kb-step-num">${i + 1}</div>
        <div class="kr-kb-step-content">
          <div class="kr-kb-step-title">${step.title}</div>
          <div class="kr-kb-step-desc">${step.desc}</div>
        </div>
      </div>
    `).join('');

    const keyboardPreview = `
      <div class="kr-kb-preview">
        <div class="kr-kb-row">
          ${['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'].map(k => `<span class="kr-kb-key">${k}</span>`).join('')}
        </div>
        <div class="kr-kb-row">
          ${['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'].map(k => `<span class="kr-kb-key">${k}</span>`).join('')}
        </div>
        <div class="kr-kb-row">
          ${['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'].map(k => `<span class="kr-kb-key">${k}</span>`).join('')}
        </div>
      </div>
    `;

    this.body.innerHTML = `
      <div class="kr-kb-guide">
        ${stepsHtml}
      </div>
      <div class="kr-kb-section-label">2-Set Korean 配列</div>
      ${keyboardPreview}
      <div class="kr-kb-tip">
        <span class="kr-kb-tip-icon">💡</span>
        <span>macOS Sequoia以降: システム設定 > キーボード > 入力ソース > 編集</span>
      </div>
    `;
  },
};
