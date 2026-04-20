/**
 * feed.js — Feed 頁邏輯模組
 * 負責首頁慘事展示、拍拍互動與相關 API 呼叫
 */

import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'
import { router } from './router.js'

// 頁面內部狀態
const feedState = {
  currentStory: null, // 目前顯示的慘事 { id, content, pat_count }
  isPatting: false,   // 拍拍請求進行中旗標
}

/**
 * 載入一則隨機慘事並渲染至 Story_Card
 * 若 API 回傳非 200，顯示錯誤訊息
 */
async function loadStory() {
  const feedbackEl = document.getElementById('feed-feedback')
  // 清空上一次的錯誤訊息
  if (feedbackEl) feedbackEl.innerHTML = ''

  const result = await fetchClient.getRandomStory()

  if (result.ok && result.data) {
    feedState.currentStory = result.data
    renderer.renderStoryCard(result.data)
  } else {
    // 非 200 回應：顯示提示文字（需求 1.4）
    renderer.renderError(feedbackEl, '目前沒有慘事，快去投稿吧！')
  }
}

/**
 * 處理拍拍按鈕點擊事件
 * 呼叫 patStory API，請求進行中設定按鈕 disabled
 */
async function handlePat() {
  // 若無目前慘事或正在拍拍中，忽略
  if (!feedState.currentStory || feedState.isPatting) return

  const patBtn = document.getElementById('pat-btn')
  const feedbackEl = document.getElementById('feed-feedback')

  // 清空上一次的錯誤訊息
  if (feedbackEl) feedbackEl.innerHTML = ''

  // 設定請求進行中狀態（需求 2.4）
  feedState.isPatting = true
  if (patBtn) patBtn.disabled = true

  try {
    const result = await fetchClient.patStory(feedState.currentStory.id)

    if (result.ok && result.data) {
      // 拍拍成功：遞增顯示 pat_count（需求 2.2）
      renderer.updatePatCount(result.data.pat_count)
      // 同步更新內部狀態
      feedState.currentStory = {
        ...feedState.currentStory,
        pat_count: result.data.pat_count,
      }

      // 若配對解鎖，開啟聊天室（需求 2.3）
      if (result.data.match_unlocked) {
        router.openChat()
      }
    } else {
      // 拍拍失敗：顯示錯誤訊息（需求 2.5）
      renderer.renderError(feedbackEl, '拍拍失敗，請稍後再試')
    }
  } finally {
    // 確保按鈕狀態一定被恢復
    feedState.isPatting = false
    if (patBtn) patBtn.disabled = false
  }
}

// 公開介面
export const feed = {
  /**
   * 初始化 Feed 頁：載入第一則慘事，綁定按鈕事件
   */
  init() {
    // 載入第一則慘事（需求 1.1）
    loadStory()

    // 綁定「換一則」按鈕事件（需求 1.3）
    const nextBtn = document.getElementById('next-btn')
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        loadStory()
      })
    }

    // 綁定拍拍按鈕事件（需求 2.1）
    const patBtn = document.getElementById('pat-btn')
    if (patBtn) {
      patBtn.addEventListener('click', () => {
        handlePat()
      })
    }
  },
}

// 匯出內部函式供測試使用
export { loadStory, handlePat, feedState }
