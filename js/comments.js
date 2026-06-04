/**
 * comments.js — 公開留言模組
 * 在 Feed 頁的慘事卡片下方顯示留言區
 */

import { fetchClient } from './fetchClient.js'
import { auth } from './auth.js'

let currentStoryId = null

/**
 * 載入並渲染指定慘事的留言
 */
async function loadComments(storyId) {
  currentStoryId = storyId
  const listEl = document.getElementById('comments-list')
  const countEl = document.getElementById('comments-count')
  if (!listEl) return

  // 切換慘事時清空留言輸入框，避免送出舊稿到新慘事
  const inputEl = document.getElementById('comment-input')
  if (inputEl) inputEl.value = ''

  listEl.innerHTML = '<p class="comments-empty">載入中…</p>'

  let result
  try {
    result = await fetchClient.getComments(storyId)
  } catch {
    listEl.innerHTML = '<p class="comments-empty">留言暫時無法載入</p>'
    return
  }

  // 後端還沒部署新版或路由不存在時，靜默降級
  if (!result.ok) {
    if (result.status === 404 || result.status === 0) {
      listEl.innerHTML = '<p class="comments-empty">還沒有人留言，你來第一個</p>'
      if (countEl) countEl.textContent = '0'
    } else {
      listEl.innerHTML = '<p class="comments-error">留言載入失敗</p>'
    }
    return
  }

  const comments = result.data?.comments ?? []
  if (countEl) countEl.textContent = comments.length

  if (comments.length === 0) {
    listEl.innerHTML = '<p class="comments-empty">還沒有人留言，你來第一個</p>'
    return
  }

  listEl.innerHTML = comments.map((c) => `
    <div class="comment-item">
      <span class="comment-author">${escapeHtml(c.author_name)}</span>
      <span class="comment-time">${formatRelativeTime(c.created_at)}</span>
      <p class="comment-content">${escapeHtml(c.content)}</p>
    </div>
  `).join('')
}

/**
 * 送出留言
 */
async function submitComment() {
  if (!currentStoryId) return

  const inputEl = document.getElementById('comment-input')
  const feedbackEl = document.getElementById('comment-feedback')
  const submitBtn = document.getElementById('comment-submit')

  const content = (inputEl?.value || '').trim()
  if (!content) {
    if (feedbackEl) feedbackEl.textContent = '留言不可為空白'
    return
  }
  if (content.length > 200) {
    if (feedbackEl) feedbackEl.textContent = '留言最多 200 字'
    return
  }

  if (feedbackEl) feedbackEl.textContent = ''
  if (submitBtn) submitBtn.disabled = true

  try {
    const sessionToken = localStorage.getItem('trashmatch_session_token') || ''
    const result = await fetchClient.addComment(currentStoryId, content, sessionToken)

    if (result.ok) {
      if (inputEl) inputEl.value = ''
      await loadComments(currentStoryId)
    } else if (result.status === 404 || result.status === 0) {
      if (feedbackEl) feedbackEl.textContent = '留言功能尚未在伺服器上線，請等待部署完成'
    } else {
      if (feedbackEl) feedbackEl.textContent = result.data?.message || '留言失敗，請稍後再試'
    }
  } catch {
    if (feedbackEl) feedbackEl.textContent = '網路錯誤，請稍後再試'
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatRelativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins} 分鐘前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} 小時前`
  return `${Math.floor(hrs / 24)} 天前`
}

export const comments = {
  /**
   * 切換到新的慘事時，更新留言區資料
   */
  loadForStory(storyId) {
    if (!storyId) return
    loadComments(storyId)
  },

  init() {
    const submitBtn = document.getElementById('comment-submit')
    if (submitBtn) {
      submitBtn.addEventListener('click', submitComment)
    }

    const inputEl = document.getElementById('comment-input')
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          submitComment()
        }
      })
    }
  },
}
