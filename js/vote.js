/**
 * vote.js — 投票對決頁面模組
 * 管理 #vote 頁面的所有 UI 邏輯：載入隨機對決組、投票互動、百分比顯示
 */

import { fetchClient } from './fetchClient.js'
import { auth } from './auth.js'

// 目前對決中的兩則 Story
let storyA = null
let storyB = null

// ===== DOM 輔助 =====

function getEl(id) {
  return document.getElementById(id)
}

function showFeedback(message) {
  const el = getEl('vote-feedback')
  if (el) el.textContent = message
}

function clearFeedback() {
  const el = getEl('vote-feedback')
  if (el) el.textContent = ''
}

// ===== 純函數：計算百分比 =====

/**
 * 計算兩則 Story 的得票百分比
 * @param {number} countA
 * @param {number} countB
 * @returns {{ pctA: number, pctB: number }} 兩者合計恆為 100
 */
export function calculatePercentages(countA, countB) {
  const total = countA + countB
  if (total === 0) {
    return { pctA: 50, pctB: 50 }
  }
  const pctA = Math.round((countA / total) * 100)
  const pctB = 100 - pctA
  return { pctA, pctB }
}

// ===== 渲染函數 =====

/**
 * 顯示兩則 Story 的百分比進度條，隱藏投票按鈕，顯示「換一組」按鈕
 * @param {number} pctA
 * @param {number} pctB
 */
function showResults(pctA, pctB) {
  const resultsEl = getEl('vote-results')
  const nextBtn = getEl('vote-next-btn')
  const btnA = getEl('vote-btn-a')
  const btnB = getEl('vote-btn-b')

  // 設定進度條 CSS 變數
  const barA = resultsEl?.querySelector('[data-bar="a"]')
  const barB = resultsEl?.querySelector('[data-bar="b"]')
  if (barA) barA.style.setProperty('--pct', pctA + '%')
  if (barB) barB.style.setProperty('--pct', pctB + '%')

  // 更新百分比文字
  const pctTextA = resultsEl?.querySelector('[data-pct="a"]')
  const pctTextB = resultsEl?.querySelector('[data-pct="b"]')
  if (pctTextA) pctTextA.textContent = pctA + '%'
  if (pctTextB) pctTextB.textContent = pctB + '%'

  // 顯示結果區塊
  if (resultsEl) resultsEl.removeAttribute('hidden')

  // 隱藏投票按鈕
  if (btnA) btnA.setAttribute('hidden', '')
  if (btnB) btnB.setAttribute('hidden', '')

  // 顯示「換一組」按鈕
  if (nextBtn) nextBtn.removeAttribute('hidden')
}

/**
 * 將兩則 Story 填入 DOM，顯示投票按鈕，隱藏結果區塊與「換一組」按鈕
 * @param {{ id: number, content: string }} a
 * @param {{ id: number, content: string }} b
 */
function renderPair(a, b) {
  storyA = a
  storyB = b

  const cardA = getEl('vote-story-a')
  const cardB = getEl('vote-story-b')
  const btnA = getEl('vote-btn-a')
  const btnB = getEl('vote-btn-b')
  const resultsEl = getEl('vote-results')
  const nextBtn = getEl('vote-next-btn')

  // 填入 Story 內容
  if (cardA) cardA.textContent = a.content
  if (cardB) cardB.textContent = b.content

  // 顯示投票按鈕
  if (btnA) {
    btnA.removeAttribute('hidden')
    btnA.disabled = false
  }
  if (btnB) {
    btnB.removeAttribute('hidden')
    btnB.disabled = false
  }

  // 隱藏百分比區塊與「換一組」按鈕
  if (resultsEl) resultsEl.setAttribute('hidden', '')
  if (nextBtn) nextBtn.setAttribute('hidden', '')

  clearFeedback()
}

// ===== 投票邏輯 =====

/**
 * 處理投票按鈕點擊
 * @param {number} votedId 被投票的 Story id
 * @param {number} opponentId 對手的 Story id
 */
async function handleVote(votedId, opponentId) {
  if (!auth.requireLogin()) return

  const btnA = getEl('vote-btn-a')
  const btnB = getEl('vote-btn-b')

  // 停用兩個按鈕，避免重複點擊
  if (btnA) btnA.disabled = true
  if (btnB) btnB.disabled = true

  const result = await fetchClient.voteStory(votedId, opponentId)

  if (result.ok) {
    const counts = result.data.vote_counts
    const countA = counts[String(storyA.id)] ?? 0
    const countB = counts[String(storyB.id)] ?? 0
    const { pctA, pctB } = calculatePercentages(countA, countB)
    showResults(pctA, pctB)
  } else if (result.status === 409) {
    showFeedback('你已經對這組對決投過票了，換一組吧 👇')
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  } else if (result.status === 401) {
    auth.requireLogin()
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  } else if (result.status === 0) {
    showFeedback('網路錯誤，請稍後再試')
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  } else {
    showFeedback('發生未知錯誤，請稍後再試')
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  }
}

// ===== 載入對決組 =====

async function loadPair() {
  clearFeedback()

  const result = await fetchClient.getRandomPair()

  if (!result.ok) {
    showFeedback('目前慘事不足，快去投稿吧！')

    const btnA = getEl('vote-btn-a')
    const btnB = getEl('vote-btn-b')
    if (btnA) {
      btnA.setAttribute('hidden', '')
      btnA.disabled = true
    }
    if (btnB) {
      btnB.setAttribute('hidden', '')
      btnB.disabled = true
    }
    return
  }

  const [a, b] = result.data.stories
  renderPair(a, b)
}

// ===== 公開介面 =====

export const vote = {
  /**
   * 初始化投票模組：
   * - 監聽 hashchange，當 hash === '#vote' 時載入對決組
   * - 綁定投票按鈕與「換一組」按鈕事件
   */
  init() {
    // 監聽路由切換
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#vote') {
        loadPair()
      }
    })

    // 若頁面初始載入時已在 #vote
    if (window.location.hash === '#vote') {
      loadPair()
    }

    // 綁定「這個比較慘」按鈕 A
    const btnA = getEl('vote-btn-a')
    if (btnA) {
      btnA.addEventListener('click', () => {
        if (storyA && storyB) {
          handleVote(storyA.id, storyB.id)
        }
      })
    }

    // 綁定「這個比較慘」按鈕 B
    const btnB = getEl('vote-btn-b')
    if (btnB) {
      btnB.addEventListener('click', () => {
        if (storyA && storyB) {
          handleVote(storyB.id, storyA.id)
        }
      })
    }

    // 綁定「換一組」按鈕
    const nextBtn = getEl('vote-next-btn')
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        loadPair()
      })
    }
  }
}
