/**
 * fetchClient.js
 * 封裝 Fetch API 呼叫的統一模組
 * 所有方法回傳 Promise<{ ok: boolean, status: number, data: any }>
 */

/**
 * 取得錯誤訊息
 * @param {string} context - 錯誤情境（pat, send_message, load_chat, load_story）
 * @param {number} status - HTTP 狀態碼
 * @returns {string} 搞笑錯誤文案
 */
export function getErrorMessage(context, status) {
  const messages = {
    pat: '拍拍失敗，請稍後再試',
    send_message: '訊息送出失敗，你的話語迷失在虛空中',
    load_chat: '聊天室載入失敗，連系統都放棄你了',
    load_story: '目前沒有慘事，快去投稿吧！',
  }
  return messages[context] || '操作失敗，請稍後再試'
}

/**
 * API 基底網址
 * 部署到 Render 後，把下面這個網址改成你的 Render 網址
 * 例如：https://trashmatch.onrender.com
 *
 * 如果頁面有先設定 window.API_BASE_URL，會優先使用它
 */
const API_BASE_URL =
  window.API_BASE_URL || 'https://你的-render-網址.onrender.com'

/**
 * 組合完整 API 網址
 * @param {string} url
 * @returns {string}
 */
function buildFullUrl(url) {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    return url
  }
  return `${API_BASE_URL}${url}`
}

/**
 * 內部統一請求函式
 * @param {string} url - 請求網址
 * @param {RequestInit} [options] - fetch 選項
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
async function request(url, options) {
  try {
    const fullUrl = buildFullUrl(url)
    const res = await fetch(fullUrl, options)
    const data = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    // 網路例外（無法連線、DNS 失敗等）
    return { ok: false, status: 0, data: null, error: err.message }
  }
}

/**
 * fetchClient 公開介面
 */
export const fetchClient = {
  /**
   * 取得隨機慘事
   * GET /api/stories/random
   * @returns {Promise<{ ok: boolean, status: number, data: { id: string|number, content: string, pat_count: number } | null }>}
   */
  getRandomStory() {
    return request('/api/stories/random')
  },

  /**
   * 對指定慘事拍拍
   * PUT /api/stories/<id>/pat
   * @param {string|number} storyId - 慘事 ID
   * @returns {Promise<{ ok: boolean, status: number, data: { pat_count: number, match_unlocked: boolean, chat_room_id?: number } | null }>}
   */
  patStory(storyId) {
    return request(`/api/stories/${storyId}/pat`, {
      method: 'PUT',
    })
  },

  /**
   * 投稿新慘事
   * POST /api/stories
   * @param {string} content - 慘事內容
   * @returns {Promise<{ ok: boolean, status: number, data: any }>}
   */
  postStory(content) {
    return request('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  },

  /**
   * 取得聊天室 ID（若不存在則建立）
   * POST /api/chat-rooms
   * @param {string|number} storyId - 慘事 ID
   * @returns {Promise<{ ok: boolean, status: number, data: { chat_room_id: number, created_at: string } | null }>}
   */
  getChatRoomId(storyId) {
    return request('/api/chat-rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId }),
    })
  },

  /**
   * 取得聊天室訊息
   * GET /api/chat-rooms/<chat_room_id>/messages
   * @param {string|number} chatRoomId - 聊天室 ID
   * @param {string|null} since - ISO 8601 時間戳，只回傳此時間之後的訊息（可選）
   * @returns {Promise<{ ok: boolean, status: number, data: { messages: Array } | null }>}
   */
  getMessages(chatRoomId, since = null) {
    const url = new URL(`/api/chat-rooms/${chatRoomId}/messages`, API_BASE_URL)
    if (since) {
      url.searchParams.set('since', since)
    }
    return request(url.toString())
  },

  /**
   * 發送訊息
   * POST /api/chat-rooms/<chat_room_id>/messages
   * @param {string|number} chatRoomId - 聊天室 ID
   * @param {string|number} senderStoryId - 發送者的慘事 ID
   * @param {string} content - 訊息內容
   * @returns {Promise<{ ok: boolean, status: number, data: { id: number, sender_story_id: number, content: string, created_at: string } | null }>}
   */
  sendMessage(chatRoomId, senderStoryId, content) {
    return request(`/api/chat-rooms/${chatRoomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_story_id: senderStoryId,
        content: content.trim(),
      }),
    })
  },
}
