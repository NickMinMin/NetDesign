/**
 * profile.js — 我的頁面模組
 * 顯示登入使用者的統計數據與發過的慘事列表
 */

import { fetchClient } from './fetchClient.js'
import { auth } from './auth.js'
import { router } from './router.js'

const CATEGORY_EMOJI = {
  '愛情慘劇': '💔',
  '職場地獄': '😩',
  '考試爆炸': '📚',
  '家庭悲劇': '🏠',
  '其他衰事': '🗑️',
}

function showFeedback(msg) {
  const el = document.getElementById('profile-feedback')
  if (el) el.textContent = msg
}

function clearFeedback() {
  const el = document.getElementById('profile-feedback')
  if (el) el.textContent = ''
}

/**
 * 渲染統計數據
 */
function renderStats(stats) {
  const map = {
    'profile-stat-stories': stats.story_count,
    'profile-stat-pats': stats.total_pats,
    'profile-stat-votes': stats.total_votes,
    'profile-stat-chats': stats.chat_room_count,
  }
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val
  })
}

/**
 * 渲染我的慘事列表
 */
function renderMyStories(stories) {
  const listEl = document.getElementById('profile-stories-list')
  if (!listEl) return

  listEl.innerHTML = ''

  if (stories.length === 0) {
    listEl.innerHTML = '<li class="profile-story-empty">你還沒發過慘事，快去投稿！</li>'
    return
  }

  stories.forEach((story) => {
    const emoji = CATEGORY_EMOJI[story.category] || '🗑️'
    const summary = story.content.length > 80
      ? story.content.slice(0, 80) + '…'
      : story.content

    const li = document.createElement('li')
    li.className = 'profile-story-item'
    li.innerHTML = `
      <div class="profile-story-header">
        <span class="profile-story-category">${emoji} ${story.category}</span>
        <span class="profile-story-date">${formatDate(story.created_at)}</span>
      </div>
      <p class="profile-story-content">${escapeHtml(summary)}</p>
      <div class="profile-story-stats">
        <span>🫂 ${story.pat_count} 拍拍</span>
        <span>💬 ${story.comment_count} 留言</span>
        <span>⚔️ ${story.vote_count} 票</span>
        ${story.chat_room_id
          ? `<button class="pixel-btn pixel-btn--sm profile-open-chat-btn"
               data-chat-room-id="${story.chat_room_id}"
               data-story-id="${story.id}">
               💬 開聊天室
             </button>`
          : ''}
      </div>
    `
    listEl.appendChild(li)
  })

  // 綁定聊天室按鈕
  listEl.querySelectorAll('.profile-open-chat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chatRoomId = btn.dataset.chatRoomId
      const storyId = btn.dataset.storyId
      router.openChat(chatRoomId, storyId)
    })
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
}

/**
 * 載入我的頁面資料
 */
async function loadProfile() {
  clearFeedback()

  if (!auth.requireLogin()) return

  // 並行請求統計 + 慘事列表
  const [statsRes, storiesRes] = await Promise.all([
    fetchClient.getMyStats(),
    fetchClient.getMyStories(),
  ])

  if (statsRes.ok && statsRes.data) {
    renderStats(statsRes.data)
  }

  if (storiesRes.ok && storiesRes.data) {
    renderMyStories(storiesRes.data.stories)
  } else {
    showFeedback('載入失敗，請稍後再試')
  }
}

export const profile = {
  init() {
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#profile') {
        loadProfile()
      }
    })

    if (window.location.hash === '#profile') {
      loadProfile()
    }
  },
}
