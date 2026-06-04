/**
 * router.js — Hash 路由模組
 * 負責頁面切換（#cover / #feed / #post）與 Chat_Panel 動畫控制
 */

import { chat } from './chat.js'

// 頁面 hash 對應的容器 ID 對照表
const PAGE_MAP = {
  '#cover': 'cover-page',
  '#feed': 'feed-page',
  '#post': 'post-page',
  '#login': 'login-page',
  '#vote': 'vote-page',
  '#leaderboard': 'leaderboard-page',
  '#profile': 'profile-page',
}

// 所有頁面 ID 清單
const ALL_PAGES = Object.values(PAGE_MAP)

/**
 * 根據目前 hash 切換頁面可見性，並同步更新導覽列 active class
 * @param {string} hash - 目前的 window.location.hash
 */
function applyHash(hash) {
  const normalizedHash = hash || '#cover'
  const targetId = PAGE_MAP[normalizedHash] || PAGE_MAP['#cover']

  ALL_PAGES.forEach((pageId) => {
    const el = document.getElementById(pageId)
    if (!el) return

    if (pageId === targetId) {
      el.classList.remove('hidden')
    } else {
      el.classList.add('hidden')
    }
  })

  // 封面頁時隱藏導覽列
  const navBar = document.getElementById('nav-bar')
  if (navBar) {
    if (normalizedHash === '#cover') {
      navBar.classList.add('nav-hidden')
    } else {
      navBar.classList.remove('nav-hidden')
    }
  }

  // 同步更新導覽列 active class
  document.querySelectorAll('.nav-link').forEach((link) => {
    const page = link.getAttribute('data-page')
    const linkHash = `#${page}`

    if (normalizedHash !== '#cover' && linkHash === normalizedHash) {
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
    if (!window.location.hash) {
      window.location.hash = '#cover'
    }

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
   * @param {string|number} chatRoomId - 聊天室 ID
   * @param {string|number} storyId - 慘事 ID（可選，用於發送訊息）
   */
  openChat(chatRoomId, storyId = null) {
    const panel = document.getElementById('chat-panel')
    if (!panel) return

    if (chatRoomId) {
      chat.open(chatRoomId, storyId)
    }

    panel.classList.remove('hidden')
    panel.classList.remove('slide-out')
    panel.classList.add('slide-in')
    panel.setAttribute('aria-hidden', 'false')
  },

  /**
   * 觸發 Chat_Panel 滑出動畫
   */
  closeChat() {
    const panel = document.getElementById('chat-panel')
    if (!panel) return

    chat.close()

    panel.classList.add('slide-out')
    panel.classList.remove('slide-in')

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
