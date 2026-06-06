/**
 * fetchClient.js
 * 統一處理 API 請求的模組
 */

const API_BASE_URL =
  window.API_BASE_URL || 'https://netdesign.onrender.com'

/**
 * 核心基礎請求函式
 */
async function request(url, options = {}) {
  const fullUrl = url.startsWith('http')
    ? url
    : `${API_BASE_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : '/' + url}`

  // 初始化 headers 物件，確保不為空
  options.headers = options.headers || {}

  // 如果有傳送 body 且非 FormData，自動補 Content-Type
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !options.headers['Content-Type']
  ) {
    options.headers['Content-Type'] = 'application/json'
  }

  // 全域自動補 JWT token（如果有登入）
  if (!options.headers['Authorization']) {
    const defaultJwt = localStorage.getItem('trashmatch_auth_token') || ''
    if (defaultJwt) {
      options.headers['Authorization'] = `Bearer ${defaultJwt}`
    }
  }

  try {
    const response = await fetch(fullUrl, options)
    let data = null

    try {
      data = await response.json()
    } catch (e) {
      // 避免後端回傳空回應時解析 JSON 噴錯
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    }
  } catch (error) {
    console.error(`API Error: ${fullUrl}`, error)
    return {
      ok: false,
      status: 0,
      data: null,
    }
  }
}

export const fetchClient = {
  /**
   * 隨機撈取一則慘事
   * @param {string} [url] - 可選，覆蓋預設 URL（用於傳遞 exclude_id 等 query param）
   */
  async getRandomStory(url = '/api/stories/random') {
    return request(url)
  },

  /**
   * 投稿新慘事（支援分類）
   */
  async postStoryWithCategory(content, category = '其他衰事') {
    return request('/api/stories', {
      method: 'POST',
      body: JSON.stringify({ content, category }),
    })
  },

  /**
   * 幫慘事拍拍
   * @param {number} storyId - 慘事 ID
   * @param {string} [sessionToken] - 未登入時的 session token，用於後端防重複
   */
  async patStory(storyId, sessionToken = '') {
    const body = sessionToken
      ? JSON.stringify({ session_token: sessionToken })
      : undefined

    return request(`/api/stories/${storyId}/pat`, {
      method: 'PUT',
      ...(body ? { body } : {}),
    })
  },

  /**
   * 建立或解鎖聊天室
   */
  async getChatRoomId(storyId) {
    return request('/api/chat-rooms', {
      method: 'POST',
      body: JSON.stringify({
        story_id: Number(storyId),
      }),
    })
  },

  /**
   * 撈取聊天室訊息列表
   */
  async getMessages(chatRoomId, since = null) {
    let url = `/api/chat-rooms/${chatRoomId}/messages`
    if (since) {
      url += `?since=${encodeURIComponent(since)}`
    }
    return request(url)
  },

  /**
   * 傳送聊天訊息
   * @param {Object} customOptions 用於接收從 chat.js 傳過來覆蓋 Authorization 的專屬故事 UUID token
   */
  async sendMessage(chatRoomId, senderStoryId, content, customOptions = {}) {
    // 預設先抓這篇慘事專屬 token
    const token = localStorage.getItem(`story_token_${senderStoryId}`)

    const headers = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const defaultOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender_story_id: Number(senderStoryId),
        content,
      }),
    }

    const mergedOptions = {
      ...defaultOptions,
      ...customOptions,
      headers: {
        ...defaultOptions.headers,
        ...(customOptions.headers || {}),
      },
    }

    return request(`/api/chat-rooms/${chatRoomId}/messages`, mergedOptions)
  },

  /**
   * 獲取慘事作者的匿名代號
   */
  async getStoryOwner(storyId) {
    return request(`/api/stories/${storyId}/owner`)
  },

  // ===== 方案 B：比慘 Pair API =====

  /**
   * 獲取一組新的慘事對決 pair
   * 回傳格式：
   * {
   *   pair_id: number,
   *   stories: [{ id, content }, { id, content }]
   * }
   */
  async getRandomPair() {
    return request('/api/stories/random-pair')
  },

  /**
   * 對某一組 pair 投票
   * @param {number} pairId - 對決組 ID
   * @param {number} votedStoryId - 被投票的 story ID
   */
  async votePair(pairId, votedStoryId) {
    return request(`/api/vote-pairs/${pairId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        voted_story_id: Number(votedStoryId),
      }),
    })
  },

  /**
   * 取得某一組 pair 的投票結果
   * 回傳格式：
   * {
   *   pair_id,
   *   story_a_id,
   *   story_b_id,
   *   votes_a,
   *   votes_b
   * }
   */
  async getPairResults(pairId) {
    return request(`/api/vote-pairs/${pairId}/results`, {
      method: 'GET',
    })
  },

  /**
   * 獲取慘度排行榜（前 10 名）
   */
  async getLeaderboard() {
    return request('/api/leaderboard', {
      method: 'GET',
    })
  },

  // ===== 留言功能 API =====

  /**
   * 取得某則慘事的公開留言
   */
  async getComments(storyId) {
    return request(`/api/stories/${storyId}/comments`)
  },

  /**
   * 新增公開留言
   */
  async addComment(storyId, content, sessionToken = '') {
    return request(`/api/stories/${storyId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        session_token: sessionToken,
      }),
    })
  },

  // ===== 我的頁面 API =====

  /**
   * 取得我的統計數據（需登入）
   */
  async getMyStats() {
    return request('/api/me/stats')
  },

  /**
   * 取得我發過的所有慘事（需登入）
   */
  async getMyStories() {
    return request('/api/me/stories')
  },
}
