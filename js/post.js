/**
 * post.js — Post 頁邏輯模組
 * 負責投稿表單的事件綁定、輸入驗證與 API 呼叫
 */

import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'

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

  // 空白驗證：trim 後為空則顯示提示並阻止送出（需求 3.3）
  if (content.trim() === '') {
    renderer.renderError(feedbackEl, '總得說點什麼吧？')
    return
  }

  // 若正在送出中，忽略重複點擊
  if (postState.isSubmitting) return

  // 設定請求進行中狀態（需求 3.6）
  postState.isSubmitting = true
  if (submitBtn) submitBtn.disabled = true

  try {
    const result = await fetchClient.postStory(content)

    if (result.status === 201) {
      // 送出成功：清空表單並顯示成功訊息（需求 3.4）
      renderer.clearPostForm()
      renderer.renderSuccess(feedbackEl, '你的慘事已送出，大家都懂你')

      // 顯示成功頭像（需求 6.2）
      const avatarEl = document.getElementById('post-success-avatar')
      if (avatarEl) {
        avatarEl.classList.remove('hidden')
        avatarEl.removeAttribute('aria-hidden')
      }
    } else {
      // 非 201 回應：顯示錯誤訊息（需求 3.5）
      renderer.renderError(feedbackEl, '送出失敗，你的慘事暫時無人接收')
    }
  } finally {
    // 確保按鈕狀態一定被恢復
    postState.isSubmitting = false
    if (submitBtn) submitBtn.disabled = false
  }
}

// 公開介面
export const post = {
  /**
   * 初始化 Post 頁：綁定表單送出事件
   */
  init() {
    const formEl = document.getElementById('post-form')
    if (formEl) {
      formEl.addEventListener('submit', handleSubmit)
    }
  },
}

// 匯出內部函式供測試使用
export { handleSubmit }
