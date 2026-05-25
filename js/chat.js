/**
 * chat.js — Chat 面板邏輯模組
 * 負責 Chat_Panel 的行為控制：關閉按鈕與外部點擊關閉
 */

import { router } from './router.js'
import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'

// 用於清理事件監聽器的 AbortController
let _controller = null

/**
 * 聊天室狀態管理物件
 * Requirement 2.1, 4.1
 */
export const chatState = {
  chatRoomId: null,        // 當前聊天室 ID
  storyId: null,           // 當前慘事 ID（用於發送訊息的 sender_story_id）
  messages: [],            // 訊息列表
  lastFetchedAt: null,     // 最後一次取得訊息的時間戳
  pollingInterval: null,   // 輪詢計時器
  isSending: false,        // 發送中旗標
}

export const chat = {
  /**
   * 初始化 Chat 面板：綁定關閉按鈕、發送按鈕與外部點擊事件
   * 若已初始化過，先清除舊的事件監聽器再重新綁定
   * Requirement 2.1, 4.1
   */
  init() {
    // 清除上一次的事件監聽器
    if (_controller) {
      _controller.abort()
    }
    _controller = new AbortController()
    const signal = _controller.signal

    const panel = document.getElementById('chat-panel')
    const closeBtn = document.getElementById('chat-close-btn')
    const sendBtn = document.getElementById('chat-send-btn')
    const chatInput = document.getElementById('chat-input')

    if (!panel || !closeBtn) return

    // 7.3：關閉按鈕點擊事件 — 呼叫 router.closeChat()
    closeBtn.addEventListener('click', () => {
      router.closeChat()
    }, { signal })

    // 發送按鈕點擊事件（如果存在）
    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => {
        const content = chatInput.value
        if (content.trim()) {
          this.sendMessage(content)
        }
      }, { signal })

      // Enter 鍵發送訊息
      chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          const content = chatInput.value
          if (content.trim()) {
            this.sendMessage(content)
          }
        }
      }, { signal })
    }

    // 7.2：點擊 Chat_Panel 外部區域關閉邏輯
    // 條件：點擊目標不在 panel 內，且 panel 目前可見（不含 hidden class）
    document.addEventListener('click', (event) => {
      if (!panel.classList.contains('hidden') && !panel.contains(event.target)) {
        router.closeChat()
      }
    }, { signal })
  },

  /**
   * 驗證訊息內容
   * Requirement 5.4
   * @param {string} content - 訊息內容
   * @returns {{valid: boolean, content?: string, error?: string}} 驗證結果
   */
  validateMessage(content) {
    const trimmed = content.trim()
    
    if (!trimmed) {
      return { valid: false, error: '訊息不可為空白' }
    }
    
    if (trimmed.length > 500) {
      return { valid: false, error: '訊息長度超過限制（最多 500 字）' }
    }
    
    return { valid: true, content: trimmed }
  },

  /**
   * 發送訊息
   * Requirement 2.3, 2.4, 5.4
   * @param {string} content - 訊息內容
   */
  async sendMessage(content) {
    // 驗證訊息內容
    const validation = this.validateMessage(content)
    
    if (!validation.valid) {
      console.error(validation.error)
      return
    }
    
    const trimmedContent = validation.content
    
    // 檢查是否有聊天室 ID 和慘事 ID
    if (!chatState.chatRoomId || !chatState.storyId) {
      console.error('聊天室未初始化')
      return
    }
    
    // 檢查是否正在發送中
    if (chatState.isSending) {
      return
    }
    
    // 設定發送中旗標
    chatState.isSending = true
    
    try {
      // 呼叫 API 發送訊息
      const result = await fetchClient.sendMessage(
        chatState.chatRoomId,
        chatState.storyId,
        trimmedContent
      )
      
      if (result.ok && result.data) {
        // 發送成功，立即顯示訊息（不等待輪詢）
        chatState.messages.push(result.data)
        chatState.lastFetchedAt = result.data.created_at
        
        // 重新渲染訊息列表
        this.renderMessages()
        
        // 清空輸入框
        const chatInput = document.getElementById('chat-input')
        if (chatInput) {
          chatInput.value = ''
        }
      } else {
        // 發送失敗，顯示錯誤訊息
        console.error('訊息送出失敗，你的話語迷失在虛空中')
        // 可以在這裡顯示錯誤提示給使用者
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      // 重置發送中旗標
      chatState.isSending = false
    }
  },

  /**
   * 開啟聊天室
   * Requirement 2.1, 2.5, 3.1, 3.5
   * @param {string|number} chatRoomId - 聊天室 ID
   * @param {string|number} storyId - 慘事 ID（用於發送訊息）
   */
  async open(chatRoomId, storyId = null) {
    const panel = document.getElementById('chat-panel')
    const messagesContainer = document.getElementById('chat-messages')
    
    if (!panel) {
      console.error('Chat panel element not found')
      return
    }

    // 更新聊天室狀態
    chatState.chatRoomId = chatRoomId
    chatState.storyId = storyId

    // 顯示聊天室面板（移除 hidden class）
    panel.classList.remove('hidden')
    panel.setAttribute('aria-hidden', 'false')

    // 顯示載入指示器
    if (messagesContainer) {
      messagesContainer.innerHTML = '<div class="chat-loading">載入中… 🗑️</div>'
    }

    // 載入初始訊息
    try {
      const result = await fetchClient.getMessages(chatRoomId)
      
      if (result.ok && result.data) {
        chatState.messages = result.data.messages || []
        
        // 更新 lastFetchedAt 為最新訊息的時間戳
        if (chatState.messages.length > 0) {
          chatState.lastFetchedAt = chatState.messages[chatState.messages.length - 1].created_at
        } else {
          // 若無訊息，使用當前時間
          chatState.lastFetchedAt = new Date().toISOString()
        }

        // 渲染訊息（目前先簡單顯示）
        this.renderMessages()
      } else {
        // 載入失敗，顯示錯誤訊息
        if (messagesContainer) {
          messagesContainer.innerHTML = '<div class="chat-error">聊天室載入失敗，連系統都放棄你了</div>'
        }
        console.error('Failed to load messages:', result.status)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      if (messagesContainer) {
        messagesContainer.innerHTML = '<div class="chat-error">聊天室載入失敗，連系統都放棄你了</div>'
      }
    }

    // 啟動輪詢機制（每 3 秒呼叫 pollMessages）
    this.startPolling()
  },

  /**
   * 啟動訊息輪詢
   * Requirement 3.1, 3.2
   */
  startPolling() {
    // 清除現有的輪詢計時器
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval)
    }

    // 每 3 秒輪詢一次
    chatState.pollingInterval = setInterval(() => {
      this.pollMessages()
    }, 3000)
  },

  /**
   * 輪詢新訊息
   * Requirement 3.1, 3.2, 3.3, 3.4
   */
  async pollMessages() {
    if (!chatState.chatRoomId || !chatState.lastFetchedAt) {
      return
    }

    try {
      const result = await fetchClient.getMessages(
        chatState.chatRoomId,
        chatState.lastFetchedAt
      )

      if (result.ok && result.data && result.data.messages.length > 0) {
        // 有新訊息，更新狀態並渲染
        chatState.messages.push(...result.data.messages)
        chatState.lastFetchedAt = result.data.messages[result.data.messages.length - 1].created_at
        this.renderMessages()
      }
    } catch (error) {
      // 靜默處理錯誤（記錄到 console，不中斷輪詢）
      console.error('Polling error:', error)
    }
  },

  /**
   * 渲染訊息列表（使用 renderer 模組）
   * Requirement 2.2, 2.5
   */
  renderMessages() {
    renderer.renderMessages(chatState.messages, chatState.storyId)
  },

  /**
   * 關閉聊天室
   * Requirement 4.1, 4.2, 4.4
   */
  close() {
    // 停止輪詢（clearInterval）
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval)
      chatState.pollingInterval = null
    }

    // 保留 chatRoomId、storyId 與 messages（支援重新開啟）
    // chatState.chatRoomId、chatState.storyId 和 chatState.messages 不清空
    // 注意：面板的隱藏由 router.closeChat() 處理（包含動畫）
  },
}
