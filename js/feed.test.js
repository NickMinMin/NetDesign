/**
 * feed.test.js — Feed 頁邏輯單元測試
 * 驗證各種 API 回應情境下的 DOM 狀態與按鈕狀態
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { feed, feedState } from './feed.js'

// ─────────────────────────────────────────────
// 模擬相依模組
// ─────────────────────────────────────────────

// 模擬 fetchClient
vi.mock('./fetchClient.js', () => ({
  fetchClient: {
    getRandomStory: vi.fn(),
    patStory: vi.fn(),
  },
}))

// 模擬 renderer
vi.mock('./renderer.js', () => ({
  renderer: {
    renderStoryCard: vi.fn(),
    renderError: vi.fn(),
    updatePatCount: vi.fn(),
  },
}))

// 模擬 router
vi.mock('./router.js', () => ({
  router: {
    openChat: vi.fn(),
  },
}))

// 取得模擬後的模組
import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'
import { router } from './router.js'

// ─────────────────────────────────────────────
// DOM 設定輔助函式
// ─────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <div id="story-content"></div>
    <span id="pat-count">0</span>
    <button id="pat-btn" type="button">拍拍</button>
    <button id="next-btn" type="button">換一則</button>
    <div id="feed-feedback"></div>
  `
}

// ─────────────────────────────────────────────
// 測試套件
// ─────────────────────────────────────────────

describe('feed.js 單元測試', () => {
  beforeEach(() => {
    setupDOM()
    // 重置所有 mock 呼叫記錄
    vi.clearAllMocks()
    // 重置 feedState
    feedState.currentStory = null
    feedState.isPatting = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 5.1 初始化：呼叫 getRandomStory 並渲染結果
  // ─────────────────────────────────────────────

  describe('初始化（feed.init）', () => {
    it('應呼叫 fetchClient.getRandomStory', async () => {
      const mockStory = { id: 'story-1', content: '今天被老闆罵了', pat_count: 3 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })

      feed.init()

      // 等待非同步操作完成
      await vi.waitFor(() => {
        expect(fetchClient.getRandomStory).toHaveBeenCalledTimes(1)
      })
    })

    it('API 成功時應呼叫 renderer.renderStoryCard 渲染慘事', async () => {
      const mockStory = { id: 'story-1', content: '今天被老闆罵了', pat_count: 3 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })

      feed.init()

      await vi.waitFor(() => {
        expect(renderer.renderStoryCard).toHaveBeenCalledWith(mockStory)
      })
    })

    it('API 成功時應更新 feedState.currentStory', async () => {
      const mockStory = { id: 'story-1', content: '今天被老闆罵了', pat_count: 3 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })

      feed.init()

      await vi.waitFor(() => {
        expect(feedState.currentStory).toEqual(mockStory)
      })
    })
  })

  // ─────────────────────────────────────────────
  // 5.2 換一則按鈕：重新呼叫 API 並更新 Story_Card
  // ─────────────────────────────────────────────

  describe('換一則按鈕', () => {
    it('點擊後應重新呼叫 fetchClient.getRandomStory', async () => {
      const mockStory = { id: 'story-2', content: '被甩了', pat_count: 10 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })

      feed.init()

      // 等待初始化完成
      await vi.waitFor(() => expect(fetchClient.getRandomStory).toHaveBeenCalledTimes(1))

      // 點擊換一則
      document.getElementById('next-btn').click()

      await vi.waitFor(() => {
        expect(fetchClient.getRandomStory).toHaveBeenCalledTimes(2)
      })
    })

    it('點擊後應以新資料呼叫 renderer.renderStoryCard', async () => {
      const firstStory = { id: 'story-1', content: '第一則慘事', pat_count: 1 }
      const secondStory = { id: 'story-2', content: '第二則慘事', pat_count: 5 }

      fetchClient.getRandomStory
        .mockResolvedValueOnce({ ok: true, status: 200, data: firstStory })
        .mockResolvedValueOnce({ ok: true, status: 200, data: secondStory })

      feed.init()
      await vi.waitFor(() => expect(renderer.renderStoryCard).toHaveBeenCalledWith(firstStory))

      document.getElementById('next-btn').click()

      await vi.waitFor(() => {
        expect(renderer.renderStoryCard).toHaveBeenCalledWith(secondStory)
      })
    })
  })

  // ─────────────────────────────────────────────
  // 5.3 GET /api/stories/random 非 200 回應
  // ─────────────────────────────────────────────

  describe('getRandomStory 非 200 回應', () => {
    it('應呼叫 renderer.renderError 顯示「目前沒有慘事，快去投稿吧！」', async () => {
      fetchClient.getRandomStory.mockResolvedValue({ ok: false, status: 404, data: null })

      feed.init()

      await vi.waitFor(() => {
        expect(renderer.renderError).toHaveBeenCalledWith(
          document.getElementById('feed-feedback'),
          '目前沒有慘事，快去投稿吧！'
        )
      })
    })

    it('API 失敗時不應呼叫 renderer.renderStoryCard', async () => {
      fetchClient.getRandomStory.mockResolvedValue({ ok: false, status: 500, data: null })

      feed.init()

      await vi.waitFor(() => {
        expect(renderer.renderError).toHaveBeenCalled()
      })

      expect(renderer.renderStoryCard).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────
  // 5.4 Pat_Button 點擊事件：呼叫 patStory，請求中按鈕 disabled
  // ─────────────────────────────────────────────

  describe('拍拍按鈕點擊', () => {
    it('應呼叫 fetchClient.patStory 並傳入目前慘事 ID', async () => {
      const mockStory = { id: 'story-abc', content: '慘事', pat_count: 0 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({
        ok: true,
        status: 200,
        data: { pat_count: 1, match_unlocked: false },
      })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(fetchClient.patStory).toHaveBeenCalledWith('story-abc')
      })
    })

    it('請求進行中按鈕應為 disabled', async () => {
      const mockStory = { id: 'story-abc', content: '慘事', pat_count: 0 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })

      // 讓 patStory 暫停，以便檢查 disabled 狀態
      let resolvePatStory
      fetchClient.patStory.mockReturnValue(
        new Promise((resolve) => {
          resolvePatStory = resolve
        })
      )

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      const patBtn = document.getElementById('pat-btn')
      patBtn.click()

      // 請求進行中，按鈕應為 disabled
      await vi.waitFor(() => {
        expect(patBtn.disabled).toBe(true)
      })

      // 完成請求
      resolvePatStory({ ok: true, status: 200, data: { pat_count: 1, match_unlocked: false } })

      // 請求完成後，按鈕應恢復
      await vi.waitFor(() => {
        expect(patBtn.disabled).toBe(false)
      })
    })

    it('無目前慘事時點擊拍拍不應呼叫 patStory', async () => {
      fetchClient.getRandomStory.mockResolvedValue({ ok: false, status: 404, data: null })

      feed.init()
      await vi.waitFor(() => expect(renderer.renderError).toHaveBeenCalled())

      document.getElementById('pat-btn').click()

      // 等待一個 tick
      await new Promise((r) => setTimeout(r, 10))

      expect(fetchClient.patStory).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────
  // 5.5 拍拍成功：呼叫 renderer.updatePatCount 遞增顯示值
  // ─────────────────────────────────────────────

  describe('拍拍成功回應', () => {
    it('應呼叫 renderer.updatePatCount 更新拍拍數', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 5 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({
        ok: true,
        status: 200,
        data: { pat_count: 6, match_unlocked: false },
      })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(renderer.updatePatCount).toHaveBeenCalledWith(6)
      })
    })

    it('拍拍成功後應更新 feedState.currentStory.pat_count', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 5 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({
        ok: true,
        status: 200,
        data: { pat_count: 6, match_unlocked: false },
      })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(feedState.currentStory.pat_count).toBe(6)
      })
    })
  })

  // ─────────────────────────────────────────────
  // 5.6 拍拍回應 match_unlocked=true：呼叫 router.openChat()
  // ─────────────────────────────────────────────

  describe('拍拍回應 match_unlocked=true', () => {
    it('應呼叫 router.openChat()', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 2 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({
        ok: true,
        status: 200,
        data: { pat_count: 3, match_unlocked: true },
      })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(router.openChat).toHaveBeenCalledTimes(1)
      })
    })

    it('match_unlocked=false 時不應呼叫 router.openChat()', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 0 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({
        ok: true,
        status: 200,
        data: { pat_count: 1, match_unlocked: false },
      })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(renderer.updatePatCount).toHaveBeenCalled()
      })

      expect(router.openChat).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────
  // 5.7 拍拍失敗：呼叫 renderer.renderError 顯示錯誤訊息
  // ─────────────────────────────────────────────

  describe('拍拍失敗回應', () => {
    it('應呼叫 renderer.renderError 顯示「拍拍失敗，請稍後再試」', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 0 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({ ok: false, status: 500, data: null })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(renderer.renderError).toHaveBeenCalledWith(
          document.getElementById('feed-feedback'),
          '拍拍失敗，請稍後再試'
        )
      })
    })

    it('拍拍失敗後按鈕應恢復為可用狀態', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 0 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({ ok: false, status: 500, data: null })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      const patBtn = document.getElementById('pat-btn')
      patBtn.click()

      await vi.waitFor(() => {
        expect(renderer.renderError).toHaveBeenCalled()
      })

      expect(patBtn.disabled).toBe(false)
    })

    it('拍拍失敗後不應呼叫 renderer.updatePatCount', async () => {
      const mockStory = { id: 'story-1', content: '慘事', pat_count: 0 }
      fetchClient.getRandomStory.mockResolvedValue({ ok: true, status: 200, data: mockStory })
      fetchClient.patStory.mockResolvedValue({ ok: false, status: 500, data: null })

      feed.init()
      await vi.waitFor(() => expect(feedState.currentStory).toEqual(mockStory))

      document.getElementById('pat-btn').click()

      await vi.waitFor(() => {
        expect(renderer.renderError).toHaveBeenCalled()
      })

      expect(renderer.updatePatCount).not.toHaveBeenCalled()
    })
  })
})
