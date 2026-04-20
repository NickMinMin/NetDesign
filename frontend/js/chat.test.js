/**
 * chat.test.js — Chat 面板單元測試
 * 驗證點擊外部與關閉按鈕後 Chat_Panel 加上 hidden class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { chat } from './chat.js'
import { router } from './router.js'

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
})
