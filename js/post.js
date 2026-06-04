/**
 * post.js — Post 頁邏輯模組
 * 負責投稿表單的事件綁定、輸入驗證與 API 呼叫
 */

import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'
import { auth } from './auth.js'

// 頁面內部狀態
export const postState = {
  isSubmitting: false, // 投稿請求進行中旗標
}

/**
 * 處理投稿表單送出事件
 * 驗證輸入、呼叫 API、處理回應
 * @param {Event} event - 表單送出事件
 */
async function handleSubmit(event) {
  event.preventDefault()

  const inputEl = document.getElementById('post-input')
  const submitBtn = document.getElementById('post-submit')
  const feedbackEl = document.getElementById('post-feedback')

  // 清空上一次的回饋訊息
  if (feedbackEl) feedbackEl.innerHTML = ''

  const content = inputEl ? inputEl.value : ''

  // 空白驗證：trim 後為空則顯示提示並阻止送出
  if (content.trim() === '') {
    renderer.renderError(feedbackEl, '總得說點什麼吧？')
    return
  }

  // 未登入：先把內容存到 sessionStorage，跳轉登入後可自動填回
  if (!auth.requireLogin()) {
    sessionStorage.setItem('draft_post_content', content)
    return
  }

  // 若正在送出中，忽略重複點擊
  if (postState.isSubmitting) return

  // 設定請求進行中狀態
  postState.isSubmitting = true
  if (submitBtn) submitBtn.disabled = true

  try {
    const result = await fetchClient.postStory(content)

    if (result.status === 201) {
      // 【安全機制注入】持久化儲存屬於我這台裝置的故事 ID 與專屬身分密鑰 Token
      if (result.data && result.data.token) {
        localStorage.setItem(`story_token_${result.data.id}`, result.data.token)
        localStorage.setItem('my_last_story_id', result.data.id) // 記錄自己最新的故事 ID
      }

      // 投稿成功後清除草稿
      sessionStorage.removeItem('draft_post_content')

      // 送出成功：清空表單並顯示成功訊息
      renderer.clearPostForm()
      renderer.renderSuccess(feedbackEl, '你的慘事已送出，大家都懂你')

      // 顯示成功頭像
      const avatarEl = document.getElementById('post-success-avatar')
      if (avatarEl) {
        avatarEl.classList.remove('hidden')
        avatarEl.removeAttribute('aria-hidden')
      }
    } else {
      // 處理後端阻擋的錯誤（例如空白內容）
      renderer.renderError(feedbackEl, '送出失敗，你的慘事暫時無人接收')
    }
  } catch (error) {
    console.error('Submission error:', error)
    renderer.renderError(feedbackEl, '系統邊緣化了你的請求，請稍後再試')
  } finally {
    // 確保按鈕狀態一定被恢復
    postState.isSubmitting = false
    if (submitBtn) submitBtn.disabled = false
  }
}

/**
 * 若 sessionStorage 有存草稿（登入前留下的），自動填回輸入框
 */
function restoreDraft() {
  const draft = sessionStorage.getItem('draft_post_content')
  if (!draft) return

  const inputEl = document.getElementById('post-input')
  if (inputEl && !inputEl.value) {
    inputEl.value = draft
    // 填回後清除草稿，避免反覆填入
    sessionStorage.removeItem('draft_post_content')
  }
}

// 公開介面
export const post = {
  /**
   * 初始化 Post 頁：綁定表單送出事件，並在切換到 #post 頁時自動填回草稿
   */
  init() {
    const formEl = document.getElementById('post-form')
    if (formEl) {
      // 移除舊的監聽器（若有），確保冪等性
      formEl.removeEventListener('submit', handleSubmit)
      formEl.addEventListener('submit', handleSubmit)
    }

    // 監聽路由切換，切到 #post 時自動填回草稿（登入後返回的情況）
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#post') {
        restoreDraft()
      }
    })

    // 若頁面初始就在 #post，也嘗試填回草稿
    if (window.location.hash === '#post') {
      restoreDraft()
    }
  },
}