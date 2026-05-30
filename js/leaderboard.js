/**
 * leaderboard.js — 慘度排行榜頁面模組
 * 負責 #leaderboard 頁面的資料載入、渲染與重新整理互動
 */

import { fetchClient } from './fetchClient.js'

/**
 * 顯示訊息至 leaderboard-feedback 區塊
 * @param {string} message - 要顯示的訊息文字
 */
function showFeedback(message) {
  const feedbackEl = document.getElementById('leaderboard-feedback')
  if (feedbackEl) {
    feedbackEl.textContent = message
  }
}

/**
 * 清空訊息提示區
 */
function clearFeedback() {
  const feedbackEl = document.getElementById('leaderboard-feedback')
  if (feedbackEl) {
    feedbackEl.textContent = ''
  }
}

/**
 * 渲染排行榜列表
 * @param {Array<{id: number, content: string, vote_count: number}>} stories - 排行榜資料
 */
function renderLeaderboard(stories) {
  const listEl = document.getElementById('leaderboard-list')
  if (!listEl) return

  // 清空現有內容
  listEl.innerHTML = ''

  stories.forEach((story, index) => {
    const rank = index + 1
    // 排名 emoji 前三名特殊標示
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
    // 內容摘要最多 100 字
    const summary = story.content.length > 100
      ? story.content.slice(0, 100) + '…'
      : story.content

    const li = document.createElement('li')
    li.className = 'leaderboard-item'
    li.innerHTML = `
      <span class="leaderboard-rank">${rankEmoji}</span>
      <span class="leaderboard-content">${summary}</span>
      <span class="leaderboard-votes">
        <span class="leaderboard-votes-count">${story.vote_count}</span>
        票
      </span>
    `
    listEl.appendChild(li)
  })
}

/**
 * 從後端取得排行榜資料並更新頁面
 * - 成功且有資料：渲染排行榜列表
 * - 成功但空陣列：顯示提示訊息
 * - 失敗：顯示錯誤訊息
 */
async function loadLeaderboard() {
  clearFeedback()

  const listEl = document.getElementById('leaderboard-list')
  if (listEl) {
    listEl.innerHTML = ''
  }

  const result = await fetchClient.getLeaderboard()

  if (!result.ok) {
    showFeedback('載入失敗，請稍後再試')
    return
  }

  const stories = result.data && result.data.stories ? result.data.stories : []

  if (stories.length === 0) {
    showFeedback('還沒有人投票，快去 #vote 頁面開始比慘！')
    return
  }

  renderLeaderboard(stories)
}

// 公開介面
export const leaderboard = {
  /**
   * 初始化排行榜模組：
   * - 監聽 hashchange 事件，切換至 #leaderboard 時自動載入資料
   * - 綁定「重新整理」按鈕事件
   */
  init() {
    // 監聽路由切換（需求 5.1, 7.2, 7.4）
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#leaderboard') {
        loadLeaderboard()
      }
    })

    // 若頁面初始載入時 hash 已是 #leaderboard，立即載入
    if (window.location.hash === '#leaderboard') {
      loadLeaderboard()
    }

    // 綁定「重新整理」按鈕（需求 5.4）
    const refreshBtn = document.getElementById('leaderboard-refresh-btn')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadLeaderboard()
      })
    }
  },
}

// 匯出內部函式供測試使用
export { loadLeaderboard, renderLeaderboard, showFeedback }
