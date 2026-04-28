/**
 * router.js — Hash 路由模組
 * 負責頁面切換（#feed / #post）與 Chat_Panel 動畫控制
 */

import { chat } from './chat.js'

// 頁面 hash 對應的容器 ID 對照表
const PAGE_MAP = {
  '#feed': 'feed-page',
  '#post': 'post-page',
}

// 所有頁面 ID 清單
const ALL_PAGES = Object.values(PAGE_MAP)

/**
 * 根據目前 hash 切換頁面可見性，並同步更新導覽列 active class
 * @param {string} hash - 目前的 window.location.hash
 */
function applyHash(hash) {
  const targetId = PAGE_MAP[hash] || PAGE_MAP['#feed']

  ALL_PAGES.forEach((pageId) => {
    const el = document.getElementById(pageId)
    if (!el) return
    if (pageId === targetId) {
      el.classList.remove('hidden')
    } else {
      el.classList.add('hidden')
    }
  })

  // 同步更新導覽列 active class
  document.querySelectorAll('.nav-link').forEach((link) => {
    const page = link.getAttribute('data-page')
    const linkHash = `#${page}`
    if (linkHash === hash || (!PAGE_MAP[hash] && linkHash === '#feed')) {
      link.classList.add('active')
      link.setAttribute('aria-current', 'page')
    } else {
      link.classList.remove('active')
      link.removeAttribute('aria-current')
    }
  })
}

export const router = {
  /**
   * 初始化路由：監聽 hashchange 事件，並根據初始 hash 切換頁面
   */
  init() {
    window.addEventListener('hashchange', () => {
      applyHash(window.location.hash)
    })
    // 根據初始 hash 決定顯示哪個頁面
    applyHash(window.location.hash)
  },

  /**
   * 切換至指定 hash 頁面
   * @param {string} hash - 目標 hash，例如 '#feed' 或 '#post'
   */
  navigate(hash) {
    window.location.hash = hash
    applyHash(hash)
  },

  /**
   * 觸發 Chat_Panel 滑入動畫並初始化聊天室
   * 移除 hidden class，加上 slide-in class，移除 slide-out class
   * @param {string|number} chatRoomId - 聊天室 ID
   * @param {string|number} storyId - 慘事 ID（可選，用於發送訊息）
   */
  openChat(chatRoomId, storyId = null) {
    const panel = document.getElementById('chat-panel')
    if (!panel) return
    
    // 初始化聊天室（載入訊息並啟動輪詢）
    if (chatRoomId) {
      chat.open(chatRoomId, storyId)
    }
    
    // 觸發滑入動畫
    panel.classList.remove('hidden')
    panel.classList.remove('slide-out')
    panel.classList.add('slide-in')
    panel.setAttribute('aria-hidden', 'false')
  },

  /**
   * 觸發 Chat_Panel 滑出動畫
   * 加上 slide-out class，移除 slide-in class
   * 動畫結束後加回 hidden class 並設定 aria-hidden="true"
   * 同時呼叫 chat.close() 停止輪詢並保留狀態
   */
  closeChat() {
    const panel = document.getElementById('chat-panel')
    if (!panel) return
    
    // 呼叫 chat.close() 停止輪詢並保留狀態
    chat.close()
    
    panel.classList.add('slide-out')
    panel.classList.remove('slide-in')

    // 動畫結束後隱藏面板（只監聽一次）
    panel.addEventListener(
      'animationend',
      () => {
        panel.classList.add('hidden')
        panel.setAttribute('aria-hidden', 'true')
      },
      { once: true }
    )
  },
}
