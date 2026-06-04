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

// 允許的分類白名單（防止非預期值插入 DOM）
const VALID_CATEGORIES = Object.keys(CATEGORY_EMOJI)

function showFeedback(msg) {
  const el = document.getElementById('profile-feedback')
  if (el) el.textContent = msg
}

function clearFeedback() {
  const el = document.getElementById('profile-feedback')
  if (el) el.textContent = ''
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
 * 渲染我的慘事列表（完全用 DOM API，避免 XSS）
 */
function renderMyStories(stories) {
  const listEl = document.getElementById('profile-stories-list')
  if (!listEl) return

  listEl.innerHTML = ''

  if (stories.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'profile-story-empty'
    empty.textContent = '你還沒發過慘事，快去投稿！'
    listEl.appendChild(empty)
    return
  }

  stories.forEach((story) => {
    // 防禦：確保 category 是合法值
    const safeCategory = VALID_CATEGORIES.includes(story.category) ? story.category : '其他衰事'
    const emoji = CATEGORY_EMOJI[safeCategory]
    const summary = story.content.length > 80
      ? story.content.slice(0, 80) + '…'
      : story.content

    const li = document.createElement('li')
    li.className = 'profile-story-item'

    // header（分類 + 日期）
    const header = document.createElement('div')
    header.className = 'profile-story-header'

    const categorySpan = document.createElement('span')
    categorySpan.className = 'profile-story-category'
    categorySpan.textContent = `${emoji} ${safeCategory}`

    const dateSpan = document.createElement('span')
    dateSpan.className = 'profile-story-date'
    dateSpan.textContent = formatDate(story.created_at)

    header.appendChild(categorySpan)
    header.appendChild(dateSpan)

    // 內容
    const contentP = document.createElement('p')
    contentP.className = 'profile-story-content'
    contentP.textContent = summary  // textContent 防 XSS

    // 統計列
    const statsDiv = document.createElement('div')
    statsDiv.className = 'profile-story-stats'

    const patSpan = document.createElement('span')
    patSpan.textContent = `🫂 ${story.pat_count} 拍拍`

    const commentSpan = document.createElement('span')
    commentSpan.textContent = `💬 ${story.comment_count} 留言`

    const voteSpan = document.createElement('span')
    voteSpan.textContent = `⚔️ ${story.vote_count} 票`

    statsDiv.appendChild(patSpan)
    statsDiv.appendChild(commentSpan)
    statsDiv.appendChild(voteSpan)

    // 聊天室按鈕（若有）
    if (story.chat_room_id) {
      const btn = document.createElement('button')
      btn.className = 'pixel-btn pixel-btn--sm profile-open-chat-btn'
      btn.textContent = '💬 開聊天室'
      btn.addEventListener('click', () => {
        router.openChat(String(story.chat_room_id), String(story.id))
      })
      statsDiv.appendChild(btn)
    }

    li.appendChild(header)
    li.appendChild(contentP)
    li.appendChild(statsDiv)
    listEl.appendChild(li)
  })
}

/**
 * 載入我的頁面資料
 * stats 和 stories 分開處理，任一失敗不影響另一個顯示
 */
async function loadProfile() {
  clearFeedback()

  if (!auth.requireLogin()) return

  const [statsRes, storiesRes] = await Promise.all([
    fetchClient.getMyStats(),
    fetchClient.getMyStories(),
  ])

  // stats
  if (statsRes.ok && statsRes.data) {
    renderStats(statsRes.data)
  } else if (statsRes.status === 0) {
    showFeedback('個人頁面功能尚未在伺服器上線，請稍後再試')
  } else if (!statsRes.ok) {
    showFeedback('統計資料載入失敗')
  }

  // stories（獨立處理，不受 stats 失敗影響）
  if (storiesRes.ok && storiesRes.data) {
    renderMyStories(storiesRes.data.stories)
  } else if (storiesRes.status === 0) {
    // 已在 stats 顯示錯誤，不重複
  } else if (!storiesRes.ok) {
    const listEl = document.getElementById('profile-stories-list')
    if (listEl) {
      listEl.innerHTML = '<li class="profile-story-empty">載入失敗，請稍後再試</li>'
    }
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
