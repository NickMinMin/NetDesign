/**
 * fetchClient.test.js
 * fetchClient 模組的單元測試
 * 涵蓋各種 HTTP 狀態碼與網路例外情境
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchClient, getErrorMessage } from './fetchClient.js'

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
      const patData = { pat_count: 1, match_unlocked: true }
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

  // ─── getChatRoomId ────────────────────────────────────────────────────────

  describe('getChatRoomId(storyId)', () => {
    it('回傳 200 時，ok=true 且 data 包含 chat_room_id 和 created_at', async () => {
      const chatRoomData = { chat_room_id: 42, created_at: '2025-01-15T10:30:00Z' }
      fetch.mockReturnValue(mockFetchResponse(200, chatRoomData))

      const result = await fetchClient.getChatRoomId('abc123')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data.chat_room_id).toBe(42)
      expect(result.data.created_at).toBe('2025-01-15T10:30:00Z')
    })

    it('回傳 404 時，ok=false', async () => {
      fetch.mockReturnValue(mockFetchResponse(404, { message: '找不到慘事' }))

      const result = await fetchClient.getChatRoomId('notexist')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })

    it('回傳 400 時，ok=false（pat_count 不足）', async () => {
      fetch.mockReturnValue(mockFetchResponse(400, { message: 'pat_count 必須 >= 1' }))

      const result = await fetchClient.getChatRoomId('story-1')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
    })

    it('呼叫正確的 API 端點 POST /api/chat-rooms，並傳入 JSON body', async () => {
      fetch.mockReturnValue(mockFetchResponse(200, { chat_room_id: 1, created_at: '2025-01-15T10:30:00Z' }))

      await fetchClient.getChatRoomId('story-99')

      expect(fetch).toHaveBeenCalledWith('/api/chat-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: 'story-99' }),
      })
    })
  })

  // ─── getMessages ──────────────────────────────────────────────────────────

  describe('getMessages(chatRoomId, since)', () => {
    it('回傳 200 時，ok=true 且 data 包含 messages 陣列', async () => {
      const messagesData = {
        messages: [
          { id: 1, sender_story_id: 123, content: '你也很慘嗎？', created_at: '2025-01-15T10:31:00Z' },
          { id: 2, sender_story_id: 456, content: '對啊，我們都沒救了', created_at: '2025-01-15T10:31:30Z' },
        ]
      }
      fetch.mockReturnValue(mockFetchResponse(200, messagesData))

      const result = await fetchClient.getMessages(42)

      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data.messages).toHaveLength(2)
      expect(result.data.messages[0].content).toBe('你也很慘嗎？')
    })

    it('回傳 404 時，ok=false（聊天室不存在）', async () => {
      fetch.mockReturnValue(mockFetchResponse(404, { message: '聊天室不存在' }))

      const result = await fetchClient.getMessages(999)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })

    it('不帶 since 參數時，呼叫正確的 API 端點 GET /api/chat-rooms/<id>/messages', async () => {
      fetch.mockReturnValue(mockFetchResponse(200, { messages: [] }))

      await fetchClient.getMessages(42)

      const callUrl = fetch.mock.calls[0][0]
      expect(callUrl).toContain('/api/chat-rooms/42/messages')
      expect(callUrl).not.toContain('since')
    })

    it('帶 since 參數時，正確帶入查詢參數', async () => {
      fetch.mockReturnValue(mockFetchResponse(200, { messages: [] }))

      await fetchClient.getMessages(42, '2025-01-15T10:31:00Z')

      const callUrl = fetch.mock.calls[0][0]
      expect(callUrl).toContain('/api/chat-rooms/42/messages')
      expect(callUrl).toContain('since=2025-01-15T10%3A31%3A00Z')
    })

    it('回傳空訊息列表時，ok=true 且 messages 為空陣列', async () => {
      fetch.mockReturnValue(mockFetchResponse(200, { messages: [] }))

      const result = await fetchClient.getMessages(42)

      expect(result.ok).toBe(true)
      expect(result.data.messages).toEqual([])
    })
  })

  // ─── sendMessage ──────────────────────────────────────────────────────────

  describe('sendMessage(chatRoomId, senderStoryId, content)', () => {
    it('回傳 201 時，ok=true 且 data 包含訊息資料', async () => {
      const messageData = {
        id: 3,
        sender_story_id: 123,
        content: '我們一起加油吧',
        created_at: '2025-01-15T10:32:00Z'
      }
      fetch.mockReturnValue(mockFetchResponse(201, messageData))

      const result = await fetchClient.sendMessage(42, 123, '我們一起加油吧')

      expect(result.ok).toBe(true)
      expect(result.status).toBe(201)
      expect(result.data.id).toBe(3)
      expect(result.data.content).toBe('我們一起加油吧')
    })

    it('回傳 404 時，ok=false（聊天室不存在）', async () => {
      fetch.mockReturnValue(mockFetchResponse(404, { message: '聊天室不存在' }))

      const result = await fetchClient.sendMessage(999, 123, '測試訊息')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
    })

    it('回傳 400 時，ok=false（內容驗證失敗）', async () => {
      fetch.mockReturnValue(mockFetchResponse(400, { message: '訊息不可為空白' }))

      const result = await fetchClient.sendMessage(42, 123, '   ')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(400)
    })

    it('回傳 403 時，ok=false（非聊天室參與者）', async () => {
      fetch.mockReturnValue(mockFetchResponse(403, { message: '你不是這個聊天室的成員' }))

      const result = await fetchClient.sendMessage(42, 999, '測試訊息')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(403)
    })

    it('呼叫正確的 API 端點 POST /api/chat-rooms/<id>/messages，並傳入 JSON body', async () => {
      fetch.mockReturnValue(mockFetchResponse(201, {
        id: 1,
        sender_story_id: 123,
        content: '測試訊息',
        created_at: '2025-01-15T10:32:00Z'
      }))

      await fetchClient.sendMessage(42, 123, '測試訊息')

      expect(fetch).toHaveBeenCalledWith('/api/chat-rooms/42/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_story_id: 123,
          content: '測試訊息',
        }),
      })
    })

    it('自動去除訊息內容的前後空白', async () => {
      fetch.mockReturnValue(mockFetchResponse(201, {
        id: 1,
        sender_story_id: 123,
        content: '測試訊息',
        created_at: '2025-01-15T10:32:00Z'
      }))

      await fetchClient.sendMessage(42, 123, '  測試訊息  ')

      expect(fetch).toHaveBeenCalledWith('/api/chat-rooms/42/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_story_id: 123,
          content: '測試訊息',
        }),
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

    it('getChatRoomId 遇到網路例外時，ok=false、status=0、data=null', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await fetchClient.getChatRoomId('some-id')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data).toBeNull()
    })

    it('getMessages 遇到網路例外時，ok=false、status=0、data=null', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await fetchClient.getMessages(42)

      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data).toBeNull()
    })

    it('sendMessage 遇到網路例外時，ok=false、status=0、data=null', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await fetchClient.sendMessage(42, 123, '測試訊息')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(0)
      expect(result.data).toBeNull()
    })
  })

  // ─── getErrorMessage ──────────────────────────────────────────────────────

  describe('getErrorMessage(context, status)', () => {
    it('context="pat" 時，回傳拍拍失敗訊息', () => {
      const message = getErrorMessage('pat', 404)
      expect(message).toBe('拍拍失敗，請稍後再試')
    })

    it('context="send_message" 時，回傳訊息送出失敗訊息', () => {
      const message = getErrorMessage('send_message', 500)
      expect(message).toBe('訊息送出失敗，你的話語迷失在虛空中')
    })

    it('context="load_chat" 時，回傳聊天室載入失敗訊息', () => {
      const message = getErrorMessage('load_chat', 404)
      expect(message).toBe('聊天室載入失敗，連系統都放棄你了')
    })

    it('context="load_story" 時，回傳無慘事訊息', () => {
      const message = getErrorMessage('load_story', 404)
      expect(message).toBe('目前沒有慘事，快去投稿吧！')
    })

    it('未知 context 時，回傳預設錯誤訊息', () => {
      const message = getErrorMessage('unknown_context', 500)
      expect(message).toBe('操作失敗，請稍後再試')
    })

    it('不同 HTTP 狀態碼不影響訊息內容（僅依 context 決定）', () => {
      const message404 = getErrorMessage('pat', 404)
      const message500 = getErrorMessage('pat', 500)
      const message0 = getErrorMessage('pat', 0)
      
      expect(message404).toBe('拍拍失敗，請稍後再試')
      expect(message500).toBe('拍拍失敗，請稍後再試')
      expect(message0).toBe('拍拍失敗，請稍後再試')
    })
  })
})
