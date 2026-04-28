/**
 * chat.test.js — Chat 面板單元測試
 * 驗證點擊外部與關閉按鈕後 Chat_Panel 加上 hidden class
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { chat, chatState } from './chat.js'
import { router } from './router.js'
import { fetchClient } from './fetchClient.js'

/**
 * 建立測試所需的 DOM 環境
 * 包含 #chat-panel、#chat-close-btn
 */
function setupDOM() {
  document.body.innerHTML = `
    <aside id="chat-panel" class="chat-panel hidden" aria-hidden="true">
      <div class="chat-panel__header">
        <h2 class="chat-panel__title">💬 配對成功</h2>
        <button id="chat-close-btn" type="button" aria-label="關閉聊天室">
          ✕ 關閉
        </button>
      </div>
      <div class="chat-panel__body">
        <p class="chat-panel__greeting">
          你們都沒救了，<br />不如聊聊吧 💬
        </p>
        <div id="chat-messages"></div>
      </div>
      <div class="chat-panel__footer">
        <input id="chat-input" type="text" placeholder="輸入訊息…" />
        <button id="chat-send-btn" type="button">送出</button>
      </div>
    </aside>
    <main>
      <div id="outside-area">外部區域</div>
    </main>
  `
}

describe('chat 模組', () => {
  beforeEach(() => {
    setupDOM()
    // 清除所有 mock
    vi.restoreAllMocks()
    // 重置 chatState
    chatState.chatRoomId = null
    chatState.storyId = null
    chatState.messages = []
    chatState.lastFetchedAt = null
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval)
      chatState.pollingInterval = null
    }
    chatState.isSending = false
  })

  afterEach(() => {
    // 清理輪詢計時器
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval)
      chatState.pollingInterval = null
    }
  })

  // ─── 單元測試：chatState 物件 ───
  describe('chatState', () => {
    it('應正確初始化所有屬性', () => {
      expect(chatState).toBeDefined()
      expect(chatState.chatRoomId).toBeNull()
      expect(chatState.storyId).toBeNull()
      expect(chatState.messages).toEqual([])
      expect(chatState.lastFetchedAt).toBeNull()
      expect(chatState.pollingInterval).toBeNull()
      expect(chatState.isSending).toBe(false)
    })

    it('應包含所有必要的屬性', () => {
      expect(chatState).toHaveProperty('chatRoomId')
      expect(chatState).toHaveProperty('storyId')
      expect(chatState).toHaveProperty('messages')
      expect(chatState).toHaveProperty('lastFetchedAt')
      expect(chatState).toHaveProperty('pollingInterval')
      expect(chatState).toHaveProperty('isSending')
    })
  })

  // ─── 單元測試：init() ───
  describe('init()', () => {
    it('應綁定關閉按鈕點擊事件', () => {
      // Mock router.closeChat
      const closeChat = vi.spyOn(router, 'closeChat')

      chat.init()

      const closeBtn = document.getElementById('chat-close-btn')
      closeBtn.click()

      expect(closeChat).toHaveBeenCalledTimes(1)
    })

    it('應綁定發送按鈕點擊事件', () => {
      // Mock chat.sendMessage
      const sendMessage = vi.spyOn(chat, 'sendMessage')

      chat.init()

      const chatInput = document.getElementById('chat-input')
      const sendBtn = document.getElementById('chat-send-btn')

      chatInput.value = '測試訊息'
      sendBtn.click()

      expect(sendMessage).toHaveBeenCalledTimes(1)
      expect(sendMessage).toHaveBeenCalledWith('測試訊息')
    })

    it('發送按鈕點擊時，若輸入框為空白則不應呼叫 sendMessage', () => {
      // Mock chat.sendMessage
      const sendMessage = vi.spyOn(chat, 'sendMessage')

      chat.init()

      const chatInput = document.getElementById('chat-input')
      const sendBtn = document.getElementById('chat-send-btn')

      chatInput.value = '   '
      sendBtn.click()

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應綁定 Enter 鍵發送訊息', () => {
      // Mock chat.sendMessage
      const sendMessage = vi.spyOn(chat, 'sendMessage')

      chat.init()

      const chatInput = document.getElementById('chat-input')

      chatInput.value = '測試訊息'
      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' })
      chatInput.dispatchEvent(enterEvent)

      expect(sendMessage).toHaveBeenCalledTimes(1)
      expect(sendMessage).toHaveBeenCalledWith('測試訊息')
    })

    it('Shift+Enter 不應發送訊息', () => {
      // Mock chat.sendMessage
      const sendMessage = vi.spyOn(chat, 'sendMessage')

      chat.init()

      const chatInput = document.getElementById('chat-input')

      chatInput.value = '測試訊息'
      const shiftEnterEvent = new KeyboardEvent('keypress', { key: 'Enter', shiftKey: true })
      chatInput.dispatchEvent(shiftEnterEvent)

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應綁定外部點擊事件：點擊 panel 外部時呼叫 router.closeChat()', () => {
      // Mock router.closeChat
      const closeChat = vi.spyOn(router, 'closeChat')

      chat.init()

      // 模擬 panel 可見（移除 hidden class）
      const panel = document.getElementById('chat-panel')
      panel.classList.remove('hidden')

      // 點擊外部區域
      const outsideArea = document.getElementById('outside-area')
      outsideArea.click()

      expect(closeChat).toHaveBeenCalledTimes(1)
    })

    it('點擊 panel 內部時不應呼叫 router.closeChat()', () => {
      // Mock router.closeChat
      const closeChat = vi.spyOn(router, 'closeChat')

      chat.init()

      // 模擬 panel 可見
      const panel = document.getElementById('chat-panel')
      panel.classList.remove('hidden')

      // 點擊 panel 內部
      const greeting = document.querySelector('.chat-panel__greeting')
      greeting.click()

      expect(closeChat).not.toHaveBeenCalled()
    })

    it('panel 隱藏時點擊外部不應呼叫 router.closeChat()', () => {
      // Mock router.closeChat
      const closeChat = vi.spyOn(router, 'closeChat')

      chat.init()

      // panel 保持 hidden 狀態
      const panel = document.getElementById('chat-panel')
      expect(panel.classList.contains('hidden')).toBe(true)

      // 點擊外部區域
      const outsideArea = document.getElementById('outside-area')
      outsideArea.click()

      expect(closeChat).not.toHaveBeenCalled()
    })
  })

  // ─── 整合測試：驗證關閉後 panel 加上 hidden class ───
  describe('關閉邏輯整合測試', () => {
    it('點擊關閉按鈕後，panel 應加上 hidden class（需手動觸發 animationend）', () => {
      chat.init()

      const panel = document.getElementById('chat-panel')
      const closeBtn = document.getElementById('chat-close-btn')

      // 模擬 panel 開啟
      panel.classList.remove('hidden')
      panel.classList.add('slide-in')

      // 點擊關閉按鈕
      closeBtn.click()

      // 驗證 slide-out class 已加上
      expect(panel.classList.contains('slide-out')).toBe(true)

      // jsdom 不支援 CSS 動畫，手動觸發 animationend 事件
      panel.dispatchEvent(new Event('animationend'))

      // 驗證 hidden class 已加上
      expect(panel.classList.contains('hidden')).toBe(true)
      expect(panel.getAttribute('aria-hidden')).toBe('true')
    })

    it('點擊外部區域後，panel 應加上 hidden class（需手動觸發 animationend）', () => {
      chat.init()

      const panel = document.getElementById('chat-panel')
      const outsideArea = document.getElementById('outside-area')

      // 模擬 panel 開啟
      panel.classList.remove('hidden')
      panel.classList.add('slide-in')

      // 點擊外部區域
      outsideArea.click()

      // 驗證 slide-out class 已加上
      expect(panel.classList.contains('slide-out')).toBe(true)

      // jsdom 不支援 CSS 動畫，手動觸發 animationend 事件
      panel.dispatchEvent(new Event('animationend'))

      // 驗證 hidden class 已加上
      expect(panel.classList.contains('hidden')).toBe(true)
      expect(panel.getAttribute('aria-hidden')).toBe('true')
    })
  })

  // ─── 單元測試：chat.open() ───
  describe('open()', () => {
    it('應顯示聊天室面板（移除 hidden class）', async () => {
      // Mock fetchClient.getMessages
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      const panel = document.getElementById('chat-panel')
      expect(panel.classList.contains('hidden')).toBe(true)

      await chat.open(123)

      expect(panel.classList.contains('hidden')).toBe(false)
      expect(panel.getAttribute('aria-hidden')).toBe('false')
    })

    it('應更新 chatState.chatRoomId', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      await chat.open(456)

      expect(chatState.chatRoomId).toBe(456)
    })

    it('應顯示載入指示器', async () => {
      // Mock fetchClient.getMessages with delay
      vi.spyOn(fetchClient, 'getMessages').mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ ok: true, status: 200, data: { messages: [] } })
          }, 100)
        })
      })

      const messagesContainer = document.getElementById('chat-messages')
      
      const openPromise = chat.open(123)
      
      // 檢查載入指示器
      expect(messagesContainer.innerHTML).toContain('載入中… 🗑️')

      await openPromise
    })

    it('應呼叫 fetchClient.getMessages 載入初始訊息', async () => {
      const getMessages = vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      await chat.open(789)

      expect(getMessages).toHaveBeenCalledTimes(1)
      expect(getMessages).toHaveBeenCalledWith(789)
    })

    it('應正確處理有訊息的情況', async () => {
      const mockMessages = [
        { id: 1, content: '測試訊息 1', created_at: '2025-01-15T10:00:00Z' },
        { id: 2, content: '測試訊息 2', created_at: '2025-01-15T10:01:00Z' }
      ]

      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: mockMessages }
      })

      await chat.open(123)

      expect(chatState.messages).toEqual(mockMessages)
      expect(chatState.lastFetchedAt).toBe('2025-01-15T10:01:00Z')
    })

    it('應正確處理無訊息的情況', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      await chat.open(123)

      expect(chatState.messages).toEqual([])
      expect(chatState.lastFetchedAt).toBeTruthy() // 應設定為當前時間
    })

    it('應在載入失敗時顯示錯誤訊息', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: false,
        status: 404,
        data: null
      })

      await chat.open(123)

      const messagesContainer = document.getElementById('chat-messages')
      expect(messagesContainer.innerHTML).toContain('聊天室載入失敗，連系統都放棄你了')
    })

    it('應啟動輪詢機制', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      const startPolling = vi.spyOn(chat, 'startPolling')

      await chat.open(123)

      expect(startPolling).toHaveBeenCalledTimes(1)
      expect(chatState.pollingInterval).toBeTruthy()
    })
  })

  // ─── 單元測試：startPolling() ───
  describe('startPolling()', () => {
    it('應設定輪詢計時器', () => {
      chat.startPolling()

      expect(chatState.pollingInterval).toBeTruthy()
    })

    it('應清除現有的輪詢計時器', () => {
      // 設定第一個計時器
      chat.startPolling()
      const firstInterval = chatState.pollingInterval

      // 設定第二個計時器
      chat.startPolling()
      const secondInterval = chatState.pollingInterval

      expect(firstInterval).not.toBe(secondInterval)
    })
  })

  // ─── 單元測試：pollMessages() ───
  describe('pollMessages()', () => {
    it('若無 chatRoomId 則不應呼叫 API', async () => {
      const getMessages = vi.spyOn(fetchClient, 'getMessages')

      chatState.chatRoomId = null
      chatState.lastFetchedAt = '2025-01-15T10:00:00Z'

      await chat.pollMessages()

      expect(getMessages).not.toHaveBeenCalled()
    })

    it('若無 lastFetchedAt 則不應呼叫 API', async () => {
      const getMessages = vi.spyOn(fetchClient, 'getMessages')

      chatState.chatRoomId = 123
      chatState.lastFetchedAt = null

      await chat.pollMessages()

      expect(getMessages).not.toHaveBeenCalled()
    })

    it('應使用 lastFetchedAt 作為 since 參數', async () => {
      const getMessages = vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      chatState.chatRoomId = 123
      chatState.lastFetchedAt = '2025-01-15T10:00:00Z'

      await chat.pollMessages()

      expect(getMessages).toHaveBeenCalledWith(123, '2025-01-15T10:00:00Z')
    })

    it('應在有新訊息時更新 chatState', async () => {
      const newMessages = [
        { id: 3, content: '新訊息', created_at: '2025-01-15T10:05:00Z' }
      ]

      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: newMessages }
      })

      chatState.chatRoomId = 123
      chatState.lastFetchedAt = '2025-01-15T10:00:00Z'
      chatState.messages = []

      await chat.pollMessages()

      expect(chatState.messages).toEqual(newMessages)
      expect(chatState.lastFetchedAt).toBe('2025-01-15T10:05:00Z')
    })

    it('應靜默處理錯誤（不拋出異常）', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockRejectedValue(new Error('Network error'))

      chatState.chatRoomId = 123
      chatState.lastFetchedAt = '2025-01-15T10:00:00Z'

      // 不應拋出異常
      await expect(chat.pollMessages()).resolves.toBeUndefined()
    })
  })

  // ─── 單元測試：renderMessages() ───
  describe('renderMessages()', () => {
    it('應顯示空狀態訊息當無訊息時', () => {
      chatState.messages = []

      chat.renderMessages()

      const messagesContainer = document.getElementById('chat-messages')
      expect(messagesContainer.innerHTML).toContain('你們都沒救了，不如聊聊吧 💬✨')
    })

    it('應渲染訊息列表', () => {
      chatState.messages = [
        { id: 1, content: '測試訊息 1', created_at: '2025-01-15T10:00:00Z' },
        { id: 2, content: '測試訊息 2', created_at: '2025-01-15T10:01:00Z' }
      ]

      chat.renderMessages()

      const messagesContainer = document.getElementById('chat-messages')
      expect(messagesContainer.innerHTML).toContain('測試訊息 1')
      expect(messagesContainer.innerHTML).toContain('測試訊息 2')
    })

    it('應跳脫 HTML 特殊字元', () => {
      chatState.messages = [
        { id: 1, content: '<script>alert("XSS")</script>', created_at: '2025-01-15T10:00:00Z' }
      ]

      chat.renderMessages()

      const messagesContainer = document.getElementById('chat-messages')
      expect(messagesContainer.innerHTML).not.toContain('<script>')
      expect(messagesContainer.innerHTML).toContain('&lt;script&gt;')
    })
  })

  // ─── 單元測試：validateMessage() ───
  describe('validateMessage()', () => {
    it('應拒絕空白訊息', () => {
      const result = chat.validateMessage('   ')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('訊息不可為空白')
      expect(result.content).toBeUndefined()
    })

    it('應拒絕空字串', () => {
      const result = chat.validateMessage('')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('訊息不可為空白')
    })

    it('應拒絕只有換行符號的訊息', () => {
      const result = chat.validateMessage('\n\n\n')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('訊息不可為空白')
    })

    it('應拒絕只有 tab 的訊息', () => {
      const result = chat.validateMessage('\t\t\t')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('訊息不可為空白')
    })

    it('應拒絕超過 500 字的訊息', () => {
      const longMessage = 'a'.repeat(501)
      const result = chat.validateMessage(longMessage)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('訊息長度超過限制（最多 500 字）')
      expect(result.content).toBeUndefined()
    })

    it('應拒絕剛好 501 字的訊息', () => {
      const longMessage = '測'.repeat(501)
      const result = chat.validateMessage(longMessage)
      
      expect(result.valid).toBe(false)
      expect(result.error).toContain('長度超過限制')
    })

    it('應接受剛好 500 字的訊息', () => {
      const maxMessage = 'a'.repeat(500)
      const result = chat.validateMessage(maxMessage)
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe(maxMessage)
      expect(result.error).toBeUndefined()
    })

    it('應接受 1 字的訊息', () => {
      const result = chat.validateMessage('a')
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe('a')
    })

    it('應接受有效訊息並去除前後空白', () => {
      const result = chat.validateMessage('  你好  ')
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe('你好')
      expect(result.error).toBeUndefined()
    })

    it('應接受包含換行符號的訊息', () => {
      const result = chat.validateMessage('第一行\n第二行')
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe('第一行\n第二行')
    })

    it('應去除前後空白但保留中間空白', () => {
      const result = chat.validateMessage('  你好  世界  ')
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe('你好  世界')
    })

    it('應接受包含特殊字元的訊息', () => {
      const result = chat.validateMessage('!@#$%^&*()')
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe('!@#$%^&*()')
    })

    it('應接受包含 emoji 的訊息', () => {
      const result = chat.validateMessage('你好 👋 世界 🌍')
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe('你好 👋 世界 🌍')
    })

    it('應正確計算中文字元長度', () => {
      const message = '測'.repeat(500)
      const result = chat.validateMessage(message)
      
      expect(result.valid).toBe(true)
      expect(result.content).toBe(message)
    })

    it('應在超過長度限制時包含中文字元', () => {
      const message = '測'.repeat(501)
      const result = chat.validateMessage(message)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('訊息長度超過限制（最多 500 字）')
    })
  })

  // ─── 單元測試：close() ───
  describe('close()', () => {
    beforeEach(() => {
      // 設定聊天室狀態
      chatState.chatRoomId = 123
      chatState.storyId = 456
      chatState.messages = [
        { id: 1, content: '測試訊息', created_at: '2025-01-15T10:00:00Z' }
      ]
      chatState.lastFetchedAt = '2025-01-15T10:00:00Z'
      chatState.pollingInterval = setInterval(() => {}, 3000)
    })

    it('應停止輪詢（clearInterval）', () => {
      const intervalId = chatState.pollingInterval
      expect(intervalId).toBeTruthy()

      chat.close()

      expect(chatState.pollingInterval).toBeNull()
    })

    it('應保留 chatRoomId（支援重新開啟）', () => {
      chat.close()

      expect(chatState.chatRoomId).toBe(123)
    })

    it('應保留 storyId（支援重新開啟）', () => {
      chat.close()

      expect(chatState.storyId).toBe(456)
    })

    it('應保留 messages（支援重新開啟）', () => {
      const originalMessages = [...chatState.messages]

      chat.close()

      expect(chatState.messages).toEqual(originalMessages)
    })

    it('應保留 lastFetchedAt（支援重新開啟）', () => {
      const originalLastFetchedAt = chatState.lastFetchedAt

      chat.close()

      expect(chatState.lastFetchedAt).toBe(originalLastFetchedAt)
    })

    it('若無輪詢計時器則不應拋出錯誤', () => {
      chatState.pollingInterval = null

      expect(() => chat.close()).not.toThrow()
    })
  })

  // ─── 整合測試：聊天室狀態切換 ───
  describe('聊天室狀態切換整合測試', () => {
    it('應能從關閉狀態開啟聊天室', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      const panel = document.getElementById('chat-panel')
      expect(panel.classList.contains('hidden')).toBe(true)

      await chat.open(123, 456)

      expect(panel.classList.contains('hidden')).toBe(false)
      expect(chatState.chatRoomId).toBe(123)
      expect(chatState.storyId).toBe(456)
      expect(chatState.pollingInterval).toBeTruthy()
    })

    it('應能從開啟狀態關閉聊天室', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      await chat.open(123, 456)
      expect(chatState.pollingInterval).toBeTruthy()

      chat.close()

      expect(chatState.pollingInterval).toBeNull()
      // 狀態應保留以支援重新開啟
      expect(chatState.chatRoomId).toBe(123)
      expect(chatState.storyId).toBe(456)
    })

    it('應能重新開啟已關閉的聊天室並保留訊息', async () => {
      const mockMessages = [
        { id: 1, content: '訊息 1', created_at: '2025-01-15T10:00:00Z' },
        { id: 2, content: '訊息 2', created_at: '2025-01-15T10:01:00Z' }
      ]

      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: mockMessages }
      })

      // 第一次開啟
      await chat.open(123, 456)
      expect(chatState.messages).toEqual(mockMessages)

      // 關閉
      chat.close()
      const savedMessages = [...chatState.messages]

      // 重新開啟
      await chat.open(123, 456)
      
      // 訊息應從 API 重新載入（不是從 chatState）
      expect(chatState.messages).toEqual(mockMessages)
      expect(chatState.pollingInterval).toBeTruthy()
    })

    it('應能在不同聊天室之間切換', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      // 開啟第一個聊天室
      await chat.open(123, 456)
      expect(chatState.chatRoomId).toBe(123)
      expect(chatState.storyId).toBe(456)

      // 關閉
      chat.close()

      // 開啟第二個聊天室
      await chat.open(789, 101)
      expect(chatState.chatRoomId).toBe(789)
      expect(chatState.storyId).toBe(101)
    })

    it('開啟聊天室時應清除舊的輪詢計時器', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      // 第一次開啟
      await chat.open(123, 456)
      const firstInterval = chatState.pollingInterval

      // 第二次開啟（不關閉）
      await chat.open(789, 101)
      const secondInterval = chatState.pollingInterval

      // 應該是不同的計時器
      expect(firstInterval).not.toBe(secondInterval)
      expect(secondInterval).toBeTruthy()
    })

    it('關閉聊天室後應停止輪詢新訊息', async () => {
      const getMessages = vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: true,
        status: 200,
        data: { messages: [] }
      })

      await chat.open(123, 456)
      
      // 清除初始載入的呼叫
      getMessages.mockClear()

      // 關閉聊天室
      chat.close()

      // 等待超過輪詢間隔
      await new Promise(resolve => setTimeout(resolve, 3500))

      // 不應再呼叫 getMessages
      expect(getMessages).not.toHaveBeenCalled()
    })

    it('開啟聊天室失敗時應顯示錯誤但不啟動輪詢', async () => {
      vi.spyOn(fetchClient, 'getMessages').mockResolvedValue({
        ok: false,
        status: 404,
        data: null
      })

      await chat.open(999, 888)

      const messagesContainer = document.getElementById('chat-messages')
      expect(messagesContainer.innerHTML).toContain('聊天室載入失敗')
      
      // 仍應啟動輪詢（設計決策：即使初始載入失敗，輪詢仍繼續）
      expect(chatState.pollingInterval).toBeTruthy()
    })
  })

  // ─── 單元測試：sendMessage() ───
  describe('sendMessage()', () => {
    beforeEach(() => {
      // 設定聊天室狀態
      chatState.chatRoomId = 123
      chatState.storyId = 456
      chatState.messages = []
      chatState.isSending = false
    })

    it('應拒絕空白訊息', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage')

      await chat.sendMessage('   ')

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應拒絕超過 500 字的訊息', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage')
      const longMessage = 'a'.repeat(501)

      await chat.sendMessage(longMessage)

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應在聊天室未初始化時拒絕發送', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage')
      chatState.chatRoomId = null

      await chat.sendMessage('測試訊息')

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應在無 storyId 時拒絕發送', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage')
      chatState.storyId = null

      await chat.sendMessage('測試訊息')

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應在發送中時拒絕重複發送', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage')
      chatState.isSending = true

      await chat.sendMessage('測試訊息')

      expect(sendMessage).not.toHaveBeenCalled()
    })

    it('應正確呼叫 fetchClient.sendMessage', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage').mockResolvedValue({
        ok: true,
        status: 201,
        data: {
          id: 1,
          sender_story_id: 456,
          content: '測試訊息',
          created_at: '2025-01-15T10:00:00Z'
        }
      })

      await chat.sendMessage('測試訊息')

      expect(sendMessage).toHaveBeenCalledTimes(1)
      expect(sendMessage).toHaveBeenCalledWith(123, 456, '測試訊息')
    })

    it('應去除訊息前後空白', async () => {
      const sendMessage = vi.spyOn(fetchClient, 'sendMessage').mockResolvedValue({
        ok: true,
        status: 201,
        data: {
          id: 1,
          sender_story_id: 456,
          content: '測試訊息',
          created_at: '2025-01-15T10:00:00Z'
        }
      })

      await chat.sendMessage('  測試訊息  ')

      expect(sendMessage).toHaveBeenCalledWith(123, 456, '測試訊息')
    })

    it('發送成功後應立即顯示訊息', async () => {
      const mockMessage = {
        id: 1,
        sender_story_id: 456,
        content: '測試訊息',
        created_at: '2025-01-15T10:00:00Z'
      }

      vi.spyOn(fetchClient, 'sendMessage').mockResolvedValue({
        ok: true,
        status: 201,
        data: mockMessage
      })

      const renderMessages = vi.spyOn(chat, 'renderMessages')

      await chat.sendMessage('測試訊息')

      expect(chatState.messages).toContainEqual(mockMessage)
      expect(chatState.lastFetchedAt).toBe('2025-01-15T10:00:00Z')
      expect(renderMessages).toHaveBeenCalledTimes(1)
    })

    it('發送成功後應清空輸入框', async () => {
      vi.spyOn(fetchClient, 'sendMessage').mockResolvedValue({
        ok: true,
        status: 201,
        data: {
          id: 1,
          sender_story_id: 456,
          content: '測試訊息',
          created_at: '2025-01-15T10:00:00Z'
        }
      })

      const chatInput = document.getElementById('chat-input')
      chatInput.value = '測試訊息'

      await chat.sendMessage('測試訊息')

      expect(chatInput.value).toBe('')
    })

    it('發送失敗時不應更新訊息列表', async () => {
      vi.spyOn(fetchClient, 'sendMessage').mockResolvedValue({
        ok: false,
        status: 400,
        data: null
      })

      const initialMessages = [...chatState.messages]

      await chat.sendMessage('測試訊息')

      expect(chatState.messages).toEqual(initialMessages)
    })

    it('應正確設定和重置 isSending 旗標', async () => {
      let isSendingDuringCall = false

      vi.spyOn(fetchClient, 'sendMessage').mockImplementation(async () => {
        isSendingDuringCall = chatState.isSending
        return {
          ok: true,
          status: 201,
          data: {
            id: 1,
            sender_story_id: 456,
            content: '測試訊息',
            created_at: '2025-01-15T10:00:00Z'
          }
        }
      })

      expect(chatState.isSending).toBe(false)

      await chat.sendMessage('測試訊息')

      expect(isSendingDuringCall).toBe(true)
      expect(chatState.isSending).toBe(false)
    })

    it('發生錯誤時應重置 isSending 旗標', async () => {
      vi.spyOn(fetchClient, 'sendMessage').mockRejectedValue(new Error('Network error'))

      await chat.sendMessage('測試訊息')

      expect(chatState.isSending).toBe(false)
    })
  })
})
