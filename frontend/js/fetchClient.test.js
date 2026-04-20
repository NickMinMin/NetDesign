/**
 * fetchClient.test.js
 * fetchClient 模組的單元測試
 * 涵蓋各種 HTTP 狀態碼與網路例外情境
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchClient } from './fetchClient.js'

// 建立模擬 fetch 回應的輔助函式
function mockFetchResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })
}

// 建立模擬 fetch 回應（JSON 解析失敗）的輔助函式
function mockFetchResponseBadJson(status) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
  })
}

describe('fetchClient', () => {
  beforeEach(() => {
    // 每個測試前重置 fetch mock
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── getRandomStory ───────────────────────────────────────────────────────

  describe('getRandomStory()', () => {
    it('回傳 200 時，ok=true 且 data 包含 id、content、pat_count', async () => {
      const storyData = { id: 'abc123', content: '今天被老闆罵了三次', pat_count: 5 }
      fetch.mockReturnValue(mockFetchResponse(200, storyData))

      const result = await fetchClient.getRandomStory()

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toEqual(storyData)
      expect(result.data.id).toBe('abc123')
      expect(result.data.content).toBe('今天被老闆罵了三次')
      expect(result.data.pat_count).toBe(5)
    })

    it('回傳 404 時，ok=false', async () => {
      fetch.mockReturnValue(mockFetchResponse(404, { message: '找不到慘事' }))

      const result = await fetchClient.getRandomStory()

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })

    it('回傳 500 時，ok=false', async () => {
      fetch.mockReturnValue(mockFetchResponse(500, null))

      const result = await fetchClient.getRandomStory()

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
    })

    it('呼叫正確的 API 端點 GET /api/stories/random', async () => {
      fetch.mockReturnValue(mockFetchResponse(200, { id: '1', content: '慘', pat_count: 0 }))

      await fetchClient.getRandomStory()

      expect(fetch).toHaveBeenCalledWith('/api/stories/random', undefined)
    })

    it('JSON 解析失敗時，data 為 null 但 ok 仍依 HTTP 狀態決定', async () => {
      fetch.mockReturnValue(mockFetchResponseBadJson(200))

      const result = await fetchClient.getRandomStory()

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toBeNull()
    })
  })

  // ─── patStory ─────────────────────────────────────────────────────────────

  describe('patStory(storyId)', () => {
    it('回傳 200 時，ok=true 且 data 包含 pat_count', async () => {
      const patData = { pat_count: 6, match_unlocked: false }
      fetch.mockReturnValue(mockFetchResponse(200, patData))

      const result = await fetchClient.patStory('abc123')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data.pat_count).toBe(6)
    })

    it('回傳 200 且 match_unlocked=true 時，data.match_unlocked 為 true', async () => {
      const patData = { pat_count: 3, match_unlocked: true }
      fetch.mockReturnValue(mockFetchResponse(200, patData))

      const result = await fetchClient.patStory('abc123')

      expect(result.ok).toBe(true)
      expect(result.data.match_unlocked).toBe(true)
      expect(result.data.pat_count).toBe(3)
    })

    it('回傳 404 時，ok=false', async () => {
      fetch.mockReturnValue(mockFetchResponse(404, { message: '找不到慘事' }))

      const result = await fetchClient.patStory('notexist')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })

    it('呼叫正確的 API 端點 PUT /api/stories/<id>/pat', async () => {
      fetch.mockReturnValue(mockFetchResponse(200, { pat_count: 1, match_unlocked: false }))

      await fetchClient.patStory('story-99')

      expect(fetch).toHaveBeenCalledWith('/api/stories/story-99/pat', {
        method: 'PUT',
      })
    })
  })

  // ─── postStory ────────────────────────────────────────────────────────────

  describe('postStory(content)', () => {
    it('回傳 201 時，ok=true 且 status=201', async () => {
      const createdData = { id: 'new-id', content: '我今天丟了工作', pat_count: 0 }
      fetch.mockReturnValue(mockFetchResponse(201, createdData))

      const result = await fetchClient.postStory('我今天丟了工作')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
    })

    it('回傳 500 時，ok=false', async () => {
      fetch.mockReturnValue(mockFetchResponse(500, { message: '伺服器錯誤' }))

      const result = await fetchClient.postStory('我今天丟了工作')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
    })

    it('回傳 400 時，ok=false', async () => {
      fetch.mockReturnValue(mockFetchResponse(400, { message: '內容不可為空' }))

      const result = await fetchClient.postStory('')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
    })

    it('呼叫正確的 API 端點 POST /api/stories，並傳入 JSON body', async () => {
      fetch.mockReturnValue(mockFetchResponse(201, { id: '1', content: '慘事', pat_count: 0 }))

      await fetchClient.postStory('慘事內容')

      expect(fetch).toHaveBeenCalledWith('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '慘事內容' }),
      })
    })
  })

  // ─── 網路例外處理 ──────────────────────────────────────────────────────────

  describe('網路例外處理', () => {
    it('fetch 拋出網路例外時，ok=false、status=0、data=null', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await fetchClient.getRandomStory()

      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data).toBeNull()
    })

    it('網路例外時，error 欄位包含錯誤訊息', async () => {
      fetch.mockRejectedValue(new TypeError('Network request failed'))

      const result = await fetchClient.getRandomStory()

      expect(result.error).toBe('Network request failed')
    })

    it('patStory 遇到網路例外時，ok=false、status=0、data=null', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await fetchClient.patStory('some-id')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data).toBeNull()
    })

    it('postStory 遇到網路例外時，ok=false、status=0、data=null', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await fetchClient.postStory('慘事內容')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data).toBeNull()
    })
  })
})
