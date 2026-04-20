/**
 * renderer.js — DOM 渲染模組
 * 負責將 API 回傳資料動態渲染至 DOM
 */

export const renderer = {
  /**
   * 將慘事物件渲染至 Story_Card
   * @param {Object} story - 慘事物件 { id, content, pat_count }
   */
  renderStoryCard(story) {
    const contentEl = document.getElementById('story-content')
    const patCountEl = document.getElementById('pat-count')

    if (contentEl) {
      contentEl.textContent = story.content
    }
    if (patCountEl) {
      patCountEl.textContent = story.pat_count
    }
  },

  /**
   * 在指定容器插入錯誤訊息文字
   * @param {HTMLElement} container - 目標容器 DOM 元素
   * @param {string} msg - 錯誤訊息字串
   */
  renderError(container, msg) {
    if (!container) return
    const el = document.createElement('p')
    el.className = 'feedback feedback--error'
    el.style.color = 'var(--color-error, #f87171)'
    el.textContent = msg
    container.innerHTML = ''
    container.appendChild(el)
  },

  /**
   * 在指定容器插入成功訊息文字
   * @param {HTMLElement} container - 目標容器 DOM 元素
   * @param {string} msg - 成功訊息字串
   */
  renderSuccess(container, msg) {
    if (!container) return
    const el = document.createElement('p')
    el.className = 'feedback feedback--success'
    el.style.color = 'var(--color-success, #4ade80)'
    el.textContent = msg
    container.innerHTML = ''
    container.appendChild(el)
  },

  /**
   * 更新 #pat-count 顯示數值
   * @param {number} count - 最新拍拍數
   */
  updatePatCount(count) {
    const el = document.getElementById('pat-count')
    if (el) {
      el.textContent = count
    }
  },

  /**
   * 清空投稿表單輸入框（#post-input）
   */
  clearPostForm() {
    const el = document.getElementById('post-input')
    if (el) {
      el.value = ''
    }
  },
}
