/**
 * feed.js — Feed 頁邏輯模組
 * 負責首頁慘事展示、拍拍互動與相關 API 呼叫
 */

import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'
import { router } from './router.js'
import { auth } from './auth.js'
import { comments } from './comments.js'

// 頁面內部狀態
const feedState = {
  currentStory: null, // 目前顯示的慘事 { id, content, pat_count }
  isPatting: false,   // 拍拍請求進行中旗標
  pattedStories: new Set(), // 已拍拍的故事ID集合
  activeCategory: '',       // 目前篩選的分類（空字串 = 全部）
}

/**
 * 載入一則隨機慘事並渲染至 Story_Card
 * 若 API 回傳非 200，顯示錯誤訊息
 * @param {number|null} excludeId - 排除的慘事 id（避免連續抽到同一則）
 */
async function loadStory(excludeId = null) {
  const feedbackEl = document.getElementById('feed-feedback')
  if (feedbackEl) feedbackEl.innerHTML = ''

  // 組合 URL，支援 exclude_id 和 category 篩選
  const params = new URLSearchParams()
  if (excludeId) params.set('exclude_id', excludeId)
  if (feedState.activeCategory) params.set('category', feedState.activeCategory)
  const query = params.toString()
  const url = `/api/stories/random${query ? '?' + query : ''}`

  const result = await fetchClient.getRandomStory(url)

  if (result.ok && result.data) {
    feedState.currentStory = result.data
    renderer.renderStoryCard(result.data)
    // 載入這則慘事的留言
    comments.loadForStory(result.data.id)
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

  // 未登入則跳轉到登入頁
  if (!auth.requireLogin()) return

  // 檢查是否已經拍過這個故事（記憶中的集合）
  if (feedState.pattedStories.has(feedState.currentStory.id)) {
    renderer.renderError(document.getElementById('feed-feedback'), '你已經拍過這個慘事了，一件慘事只能按一次拍拍')
    return
  }

  const patBtn = document.getElementById('pat-btn')
  const feedbackEl = document.getElementById('feed-feedback')

  // 清空上一次的錯誤訊息
  if (feedbackEl) feedbackEl.innerHTML = ''

  // 設定請求進行中狀態（需求 2.4）
  feedState.isPatting = true
  if (patBtn) patBtn.disabled = true

  try {
    // 取得 session_token（未登入情況下用於後端防重複）
    const sessionToken = localStorage.getItem('trashmatch_session_token') || ''
    const result = await fetchClient.patStory(feedState.currentStory.id, sessionToken)

    if (result.ok && result.data) {
      // 拍拍成功：記錄已拍拍的故事（存在於記憶中）
      feedState.pattedStories.add(feedState.currentStory.id)
      if (window.__pattedStories) window.__pattedStories.add(feedState.currentStory.id)

      // 拍拍成功：遞增顯示 pat_count（需求 2.2）
      renderer.updatePatCount(result.data.pat_count)
      // 同步更新內部狀態
      feedState.currentStory = {
        ...feedState.currentStory,
        pat_count: result.data.pat_count,
      }

      // 若配對解鎖，開啟聊天室
      if (result.data.match_unlocked) {
        // 後端 pat 回應已包含 chat_room_id，直接使用，不需要再多一次 API 請求
        const chatRoomId = result.data.chat_room_id

        if (chatRoomId) {
          router.openChat(chatRoomId, feedState.currentStory.id)
        } else {
          // fallback：若 pat 回應沒帶 chat_room_id（極少情況），才另外取
          const chatRoomResult = await fetchClient.getChatRoomId(feedState.currentStory.id)
          if (chatRoomResult.ok && chatRoomResult.data) {
            router.openChat(chatRoomResult.data.chat_room_id, feedState.currentStory.id)
          } else {
            renderer.renderError(feedbackEl, '聊天室載入失敗，連系統都放棄你了')
          }
        }
      }
    } else if (result.status === 409) {
      // 後端回傳已拍過，同步記錄到記憶集合並更新按鈕狀態
      feedState.pattedStories.add(feedState.currentStory.id)
      if (window.__pattedStories) window.__pattedStories.add(feedState.currentStory.id)
      renderer.renderError(feedbackEl, '你已經拍過這個慘事了，一件慘事只能按一次拍拍')
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
    // 初始化記憶中的已拍拍集合（刷新後會重置）並掛到全域以供 renderer 使用
    window.__pattedStories = new Set()
    feedState.pattedStories = window.__pattedStories

    // 載入第一則慘事（需求 1.1）
    loadStory()

    // 初始化留言模組
    comments.init()

    // 綁定分類篩選按鈕
    document.querySelectorAll('.category-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        feedState.activeCategory = btn.dataset.category || ''
        // 更新 active 樣式
        document.querySelectorAll('.category-btn').forEach((b) => b.classList.remove('category-btn--active'))
        btn.classList.add('category-btn--active')
        // 重新載入
        loadStory()
      })
    })

    // 綁定「換一則」按鈕事件（需求 1.3）
    const nextBtn = document.getElementById('next-btn')
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        // 傳入目前慘事 id，避免連續抽到同一則
        const currentId = feedState.currentStory ? feedState.currentStory.id : null
        loadStory(currentId)
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
