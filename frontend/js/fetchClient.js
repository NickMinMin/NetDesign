/**
 * fetchClient.js
 * 封裝 Fetch API 呼叫的統一模組
 * 所有方法回傳 Promise<{ ok: boolean, status: number, data: any }>
 */

/**
 * 內部統一請求函式
 * @param {string} url - 請求網址
 * @param {RequestInit} [options] - fetch 選項
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
async function request(url, options) {
  try {
    const res = await fetch(url, options)
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
   * @returns {Promise<{ ok: boolean, status: number, data: { id: string, content: string, pat_count: number } | null }>}
   */
  getRandomStory() {
    return request('/api/stories/random')
  },

  /**
   * 對指定慘事拍拍
   * PUT /api/stories/<id>/pat
   * @param {string} storyId - 慘事 ID
   * @returns {Promise<{ ok: boolean, status: number, data: { pat_count: number, match_unlocked: boolean } | null }>}
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
}
