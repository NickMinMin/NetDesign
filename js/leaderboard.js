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
 * @param {Array<{id: number, content: string, vote_count: number, pat_count: number, score: number}>} stories
 */
function renderLeaderboard(stories) {
  const listEl = document.getElementById('leaderboard-list')
  if (!listEl) return

  listEl.innerHTML = ''

  stories.forEach((story, index) => {
    const rank = index + 1
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
    const summary = story.content.length > 100
      ? story.content.slice(0, 100) + '…'
      : story.content

    const li = document.createElement('li')
    li.className = 'leaderboard-item'

    // 排名
    const rankSpan = document.createElement('span')
    rankSpan.className = 'leaderboard-rank'
    rankSpan.textContent = rankEmoji

    // 內容（textContent 防 XSS）
    const contentSpan = document.createElement('span')
    contentSpan.className = 'leaderboard-content'
    contentSpan.textContent = summary

    // 分數區（拍拍 + 投票 = 綜合慘度）
    const scoreSpan = document.createElement('span')
    scoreSpan.className = 'leaderboard-votes'

    const scoreNum = document.createElement('span')
    scoreNum.className = 'leaderboard-votes-count'
    // 優先用後端回傳的 score（綜合分），若沒有則 fallback 用 vote_count
    scoreNum.textContent = story.score ?? story.vote_count

    scoreSpan.appendChild(scoreNum)
    scoreSpan.append(' 慘')  // 「慘」比「票」更貼合主題

    // 小分類標籤（若有）
    const detailSpan = document.createElement('span')
    detailSpan.className = 'leaderboard-detail'
    detailSpan.textContent = `🫂${story.pat_count ?? 0} ⚔️${story.vote_count ?? 0}`

    li.appendChild(rankSpan)
    li.appendChild(contentSpan)
    li.appendChild(detailSpan)
    li.appendChild(scoreSpan)
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
    showFeedback('還沒有人上榜，去拍拍或投票讓慘事登上排行榜！')
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
