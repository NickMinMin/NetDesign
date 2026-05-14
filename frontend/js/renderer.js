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

    // 更新拍拍按鈕狀態
    this.updatePatButtonState(story.id)
  },

  /**
   * 在指定容器插入錯誤訊息文字
   * @param {HTMLElement} container - 目標容器 DOM 元素
   * @param {string} msg - 錯誤訊息字串
   */
  renderError(container, msg) {
    if (!container) return
    const el = document.createElement('p')
    el.className = 'feedback-msg feedback-msg--error'
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
    el.className = 'feedback-msg feedback-msg--success'
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
   * 更新拍拍按鈕狀態
   * @param {number} storyId - 故事ID
   */
  updatePatButtonState(storyId) {
    const patBtn = document.getElementById('pat-btn')
    if (!patBtn) return

    // 檢查是否已經拍過這個故事
    const pattedStories = new Set(JSON.parse(localStorage.getItem('pattedStories') || '[]'))
    const isPatted = pattedStories.has(storyId)

    if (isPatted) {
      patBtn.disabled = true
      patBtn.textContent = '已拍拍'
      patBtn.classList.add('pat-btn--disabled')
    } else {
      patBtn.disabled = false
      patBtn.textContent = '拍拍'
      patBtn.classList.remove('pat-btn--disabled')
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

  /**
   * 渲染訊息列表到聊天室
   * Requirement 2.2, 2.5, 6.2, 6.3
   * @param {Array} messages - 訊息陣列 [{id, sender_story_id, content, created_at}, ...]
   * @param {number|string} currentStoryId - 當前使用者的慘事 ID（用於區分發送者/接收者）
   */
  renderMessages(messages, currentStoryId) {
    const container = document.getElementById('chat-messages')
    if (!container) return

    // 若無訊息，顯示空狀態
    if (!messages || messages.length === 0) {
      this.renderEmptyChatState()
      return
    }

    // 生成訊息氣泡 HTML
    const messagesHtml = messages
      .map(msg => {
        const isSender = String(msg.sender_story_id) === String(currentStoryId)
        const bubbleClass = isSender ? 'chat-message--sender' : 'chat-message--receiver'
        const timestamp = this.formatTimestamp(msg.created_at)
        
        return `
          <div class="chat-message ${bubbleClass}">
            <div class="chat-message__content">${this.escapeHtml(msg.content)}</div>
            <div class="chat-message__time">${timestamp}</div>
          </div>
        `
      })
      .join('')

    container.innerHTML = messagesHtml

    // 自動滾動到最新訊息
    this.scrollToLatestMessage()
  },

  /**
   * 渲染聊天室開場白（配對成功訊息）
   * Requirement 6.2
   */
  renderChatGreeting() {
    const container = document.getElementById('chat-messages')
    if (!container) return

    const greetingHtml = `
      <div class="chat-greeting">
        💘 配對成功！你們都沒救了
      </div>
    `
    container.innerHTML = greetingHtml
  },

  /**
   * 渲染聊天室空狀態（無訊息時）
   * Requirement 6.3
   */
  renderEmptyChatState() {
    const container = document.getElementById('chat-messages')
    if (!container) return

    const emptyStateHtml = `
      <div class="chat-empty">
        你們都沒救了，不如聊聊吧 💬✨
      </div>
    `
    container.innerHTML = emptyStateHtml
  },

  /**
   * 格式化時間戳（顯示相對時間或絕對時間）
   * Requirement 2.5
   * @param {string} timestamp - ISO 8601 時間戳
   * @returns {string} 格式化後的時間
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    // 相對時間（1 小時內）
    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins} 分鐘前`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} 小時前`

    // 絕對時間（超過 24 小時）
    return date.toLocaleDateString('zh-TW', { 
      month: 'numeric', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  },

  /**
   * 自動滾動到最新訊息
   * Requirement 2.5
   */
  scrollToLatestMessage() {
    const container = document.getElementById('chat-messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  },

  /**
   * 跳脫 HTML 特殊字元（防止 XSS 攻擊）
   * @param {string} text - 原始文字
   * @returns {string} 跳脫後的文字
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  },
}
