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
 */
export const chatState = {
  chatRoomId: null,        // 當前聊天室 ID
  storyId: null,           // 當前發言者身分 ID（用於發送訊息的 sender_story_id）
  messages: [],            // 訊息列表
  lastFetchedAt: null,     // 最後一次取得訊息的時間戳
  pollingInterval: null,   // 輪詢計時器
  isSending: false,        // 發送中旗標
}

export const chat = {
  /**
   * 初始化 Chat 面板：綁定關閉按鈕、發送按鈕與外部點擊事件
   * 若已初始化過，先清除舊的事件監聽器再重新綁定
   */
  init() {
    // 清除上一次的事件監聽器
    if (_controller) {
      _controller.abort()
    }
    _controller = new AbortController()
    const signal = _controller.signal

    const closeBtn = document.getElementById('chat-close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => router.closeChat(), { signal })
    }

    // 點擊面板外部可關閉聊天室
    document.addEventListener('click', (event) => {
      const panel = document.getElementById('chat-panel')
      const isClickInside = panel && panel.contains(event.target)
      const isClickNav = event.target.closest('.nav-link')
      const isClickPat = event.target.closest('#pat-btn')
      
      // 只有當面板已開啟，且點擊處不在面板、導覽列、拍拍按鈕內時，才觸發關閉
      if (panel && !panel.classList.contains('hidden') && !isClickInside && !isClickNav && !isClickPat) {
        router.closeChat()
      }
    }, { signal })

    // 綁定發送訊息按鈕與 Enter 鍵事件
    const sendBtn = document.getElementById('chat-send-btn')
    const chatInput = document.getElementById('chat-input')

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (chatInput) this.sendMessage(chatInput.value)
      }, { signal })
    }

    if (chatInput) {
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.sendMessage(chatInput.value)
        }
      }, { signal })
    }
  },

  /**
   * 開啟並初始化聊天室數據
   * @param {string|number} chatRoomId - 聊天室 ID
   * @param {string|number} storyId - 觸發配對的慘事 ID
   */
  async open(chatRoomId, storyId = null) {
    chatState.chatRoomId = chatRoomId
    chatState.messages = []
    chatState.lastFetchedAt = null
    chatState.isSending = false

    // 【核心雙向匿名身分對齊】
    // 檢查本地是否有該故事的 Token。如果有，代表我是主辦人（發文者）；如果沒有，代表我是來取暖的拍拍者
    const hasTokenForThisStory = localStorage.getItem(`story_token_${storyId}`) !== null
    if (hasTokenForThisStory) {
      chatState.storyId = storyId
    } else {
      // 如果我是拍拍解鎖別人故事的人，自動將我的發言身分切換成我自己的故事 ID
      const myOwnLastStoryId = localStorage.getItem('my_last_story_id')
      chatState.storyId = myOwnLastStoryId || storyId // 降級相容機制
    }

    // 清空輸入框與舊訊息
    const chatInput = document.getElementById('chat-input')
    if (chatInput) chatInput.value = ''
    renderer.renderEmptyChatState()

    // 立即載入歷史訊息
    await this.pollMessages()

    // 清除舊的輪詢定時器，重新啟動 3 秒輪詢
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval)
    }

    // 每 3 秒輪詢一次機制
    chatState.pollingInterval = setInterval(() => {
      this.pollMessages()
    }, 3000)
  },

  /**
   * 輪詢新訊息
   */
  async pollMessages() {
    if (!chatState.chatRoomId) return

    try {
      const result = await fetchClient.getMessages(
        chatState.chatRoomId,
        chatState.lastFetchedAt
      )

      if (result.ok && result.data && result.data.messages.length > 0) {
        // 有新訊息，更新狀態並加入列表
        chatState.messages.push(...result.data.messages)
        // 紀錄最後一則訊息的時間戳，供下次 query 增量使用
        chatState.lastFetchedAt = result.data.messages[result.data.messages.length - 1].created_at
        this.renderMessages()
      }
    } catch (error) {
      console.error('Polling error:', error)
    }
  },

  /**
   * 渲染訊息列表
   */
  renderMessages() {
    const container = document.getElementById('chat-messages')
    if (!container) return

    if (chatState.messages.length === 0) {
      renderer.renderEmptyChatState()
      return
    }

    // 將所有訊息轉換成像素風聊天氣泡 HTML
    const messagesHtml = chatState.messages
      .map((msg) => {
        // 判斷這則訊息是不是目前這台瀏覽器發出的
        const isMe = String(msg.sender_story_id) === String(chatState.storyId)
        const msgClass = isMe ? 'chat-message--me' : 'chat-message--other'
        const senderName = isMe ? '你 (匿名衰鬼)' : '對方衰鬼'
        const escapedContent = renderer.escapeHtml(msg.content)
        const formattedTime = renderer.formatTimestamp(msg.created_at)

        return `
          <div class="chat-message ${msgClass}">
            <div class="chat-message__bubble">
              <div class="chat-message__meta">${senderName} • ${formattedTime}</div>
              <div class="chat-message__text">${escapedContent}</div>
            </div>
          </div>
        `
      })
      .join('')

    container.innerHTML = messagesHtml
    renderer.scrollToLatestMessage()
  },

  /**
   * 發送一則新訊息
   * @param {string} content - 訊息文字
   */
  async sendMessage(content) {
    const trimmed = content.strip ? content.strip() : content.trim()
    if (!trimmed || chatState.isSending || !chatState.chatRoomId || !chatState.storyId) return

    // 開啟鎖定狀態，防連點
    chatState.isSending = true
    const sendBtn = document.getElementById('chat-send-btn')
    const chatInput = document.getElementById('chat-input')
    if (sendBtn) sendBtn.disabled = true

    try {
      const result = await fetchClient.sendMessage(
        chatState.chatRoomId,
        chatState.storyId,
        trimmed
      )

      if (result.ok && result.data) {
        // 清空輸入框
        if (chatInput) chatInput.value = ''
        // 將自己發送的即時訊息推入狀態並重新渲染
        chatState.messages.push(result.data)
        chatState.lastFetchedAt = result.data.created_at
        this.renderMessages()
      } else {
        alert(result.data?.message || '訊息發送失敗，你的尊嚴遭到系統攔截')
      }
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      // 確保不論成功或失敗，一定解開按鈕鎖定
      chatState.isSending = false
      if (sendBtn) sendBtn.disabled = false
      if (chatInput) chatInput.focus()
    }
  },

  /**
   * 關閉聊天室並徹底釋放定時器記憶體
   */
  close() {
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval)
      chatState.pollingInterval = null
    }
    chatState.chatRoomId = null
    chatState.storyId = null
    chatState.messages = []
    chatState.lastFetchedAt = null
  },
}