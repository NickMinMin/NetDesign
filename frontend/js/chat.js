/**
 * chat.js — Chat 面板邏輯模組
 * 負責 Chat_Panel 的行為控制：關閉按鈕與外部點擊關閉
 */

import { router } from './router.js'

// 用於清理事件監聽器的 AbortController
let _controller = null

export const chat = {
  /**
   * 初始化 Chat 面板：綁定關閉按鈕與外部點擊事件
   * 若已初始化過，先清除舊的事件監聽器再重新綁定
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

    if (!panel || !closeBtn) return

    // 7.3：關閉按鈕點擊事件 — 呼叫 router.closeChat()
    closeBtn.addEventListener('click', () => {
      router.closeChat()
    }, { signal })

    // 7.2：點擊 Chat_Panel 外部區域關閉邏輯
    // 條件：點擊目標不在 panel 內，且 panel 目前可見（不含 hidden class）
    document.addEventListener('click', (event) => {
      if (!panel.classList.contains('hidden') && !panel.contains(event.target)) {
        router.closeChat()
      }
    }, { signal })
  },
}
