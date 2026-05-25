// Feature: trash-match-frontend, Property 2: 對任意僅由空白字元組成的字串，投稿被拒絕且 API 未被呼叫

/**
 * post.test.js — Post 頁邏輯測試
 * 包含屬性測試（fast-check）與單元測試
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { post, postState, handleSubmit } from './post.js'

// ─────────────────────────────────────────────
// 模擬相依模組
// ─────────────────────────────────────────────

vi.mock('./fetchClient.js', () => ({
  fetchClient: {
    postStory: vi.fn(),
  },
}))

vi.mock('./renderer.js', () => ({
  renderer: {
    renderError: vi.fn(),
    renderSuccess: vi.fn(),
    clearPostForm: vi.fn(),
  },
}))

import { fetchClient } from './fetchClient.js'
import { renderer } from './renderer.js'

// ─────────────────────────────────────────────
// DOM 設定輔助函式
// ─────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <form id="post-form" novalidate>
      <textarea id="post-input"></textarea>
      <div id="post-feedback" role="alert"></div>
      <button id="post-submit" type="submit">我也沒救了，送出</button>
    </form>
    <div id="post-success-avatar" class="hidden" aria-hidden="true"></div>
  `
}

// ─────────────────────────────────────────────
// 屬性測試（fast-check）
// ─────────────────────────────────────────────

/**
 * **Validates: Requirements 3.3**
 * 屬性 2：對任意僅由空白字元組成的字串，投稿被拒絕且 API 未被呼叫
 */
describe('屬性測試 — 屬性 2：空白字串投稿被拒絕', () => {
  beforeEach(() => {
    setupDOM()
    vi.clearAllMocks()
    postState.isSubmitting = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('對任意僅由空白字元組成的字串，投稿被拒絕且 API 未被呼叫（最少 100 次迭代）', async () => {
    // 空白字元字串生成器：包含空字串、空格、Tab、換行及其組合
    // 使用 fc.string() 過濾只保留 trim 後為空的字串
    const whitespaceStringArb = fc.oneof(
      // 純空字串
      fc.constant(''),
      // 單一空白字元
      fc.constantFrom(' ', '\t', '\n', '\r'),
      // 多個空白字元組合（重複空白字元）
      fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
        .map((chars) => chars.join(''))
    )

    await fc.assert(
      fc.asyncProperty(whitespaceStringArb, async (whitespaceStr) => {
        // 重置 DOM 與 mock
        setupDOM()
        vi.clearAllMocks()
        postState.isSubmitting = false

        // 設定輸入框內容為空白字串
        const inputEl = document.getElementById('post-input')
        inputEl.value = whitespaceStr

        // 建立模擬的 submit 事件
        const event = new Event('submit', { bubbles: true, cancelable: true })
        event.preventDefault = vi.fn()

        // 執行送出處理
        await handleSubmit(event)

        // 驗證：API 不應被呼叫
        expect(fetchClient.postStory).not.toHaveBeenCalled()

        // 驗證：應顯示錯誤訊息
        expect(renderer.renderError).toHaveBeenCalledWith(
          document.getElementById('post-feedback'),
          '總得說點什麼吧？'
        )
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// 單元測試
// ─────────────────────────────────────────────

describe('post.js 單元測試', () => {
  beforeEach(() => {
    setupDOM()
    vi.clearAllMocks()
    postState.isSubmitting = false
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────
  // 6.1 初始化：綁定表單送出事件
  // ─────────────────────────────────────────────

  describe('初始化（post.init）', () => {
    it('應綁定表單送出事件', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: true, status: 201, data: {} })

      post.init()

      // 設定有效輸入
      document.getElementById('post-input').value = '我今天很慘'

      // 觸發表單送出
      const form = document.getElementById('post-form')
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

      await vi.waitFor(() => {
        expect(fetchClient.postStory).toHaveBeenCalledTimes(1)
      })
    })
  })

  // ─────────────────────────────────────────────
  // 6.2 空白驗證
  // ─────────────────────────────────────────────

  describe('空白驗證', () => {
    it('輸入框為空時應顯示「總得說點什麼吧？」', async () => {
      document.getElementById('post-input').value = ''

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.renderError).toHaveBeenCalledWith(
        document.getElementById('post-feedback'),
        '總得說點什麼吧？'
      )
    })

    it('輸入框只有空格時應顯示「總得說點什麼吧？」', async () => {
      document.getElementById('post-input').value = '   '

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.renderError).toHaveBeenCalledWith(
        document.getElementById('post-feedback'),
        '總得說點什麼吧？'
      )
    })

    it('輸入框只有 Tab 與換行時應顯示「總得說點什麼吧？」', async () => {
      document.getElementById('post-input').value = '\t\n\t'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.renderError).toHaveBeenCalledWith(
        document.getElementById('post-feedback'),
        '總得說點什麼吧？'
      )
    })

    it('空白驗證失敗時不應呼叫 fetchClient.postStory', async () => {
      document.getElementById('post-input').value = '  '

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(fetchClient.postStory).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────
  // 6.3 送出按鈕點擊：呼叫 postStory，請求中按鈕 disabled
  // ─────────────────────────────────────────────

  describe('送出按鈕點擊', () => {
    it('應呼叫 fetchClient.postStory 並傳入輸入內容', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: true, status: 201, data: {} })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(fetchClient.postStory).toHaveBeenCalledWith('我今天很慘')
    })

    it('請求進行中送出按鈕應為 disabled', async () => {
      let resolvePostStory
      fetchClient.postStory.mockReturnValue(
        new Promise((resolve) => {
          resolvePostStory = resolve
        })
      )

      document.getElementById('post-input').value = '我今天很慘'
      const submitBtn = document.getElementById('post-submit')

      const event = new Event('submit')
      event.preventDefault = vi.fn()

      // 不 await，讓請求保持進行中
      const promise = handleSubmit(event)

      // 請求進行中，按鈕應為 disabled
      expect(submitBtn.disabled).toBe(true)

      // 完成請求
      resolvePostStory({ ok: true, status: 201, data: {} })
      await promise

      // 請求完成後，按鈕應恢復
      expect(submitBtn.disabled).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // 6.4 POST 回傳 201：清空表單並顯示成功訊息
  // ─────────────────────────────────────────────

  describe('POST 回傳 201 成功情境', () => {
    it('應呼叫 renderer.clearPostForm()', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: true, status: 201, data: {} })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.clearPostForm).toHaveBeenCalledTimes(1)
    })

    it('應顯示「你的慘事已送出，大家都懂你」', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: true, status: 201, data: {} })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.renderSuccess).toHaveBeenCalledWith(
        document.getElementById('post-feedback'),
        '你的慘事已送出，大家都懂你'
      )
    })

    it('成功後應移除 post-success-avatar 的 hidden class', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: true, status: 201, data: {} })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      const avatarEl = document.getElementById('post-success-avatar')
      expect(avatarEl.classList.contains('hidden')).toBe(false)
    })

    it('成功後送出按鈕應恢復為可用狀態', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: true, status: 201, data: {} })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(document.getElementById('post-submit').disabled).toBe(false)
    })
  })

  // ─────────────────────────────────────────────
  // 6.5 POST 非 201 回應：顯示錯誤訊息
  // ─────────────────────────────────────────────

  describe('POST 非 201 失敗情境', () => {
    it('應顯示「送出失敗，你的慘事暫時無人接收」', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: false, status: 500, data: null })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.renderError).toHaveBeenCalledWith(
        document.getElementById('post-feedback'),
        '送出失敗，你的慘事暫時無人接收'
      )
    })

    it('400 回應時應顯示錯誤訊息', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: false, status: 400, data: null })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.renderError).toHaveBeenCalledWith(
        document.getElementById('post-feedback'),
        '送出失敗，你的慘事暫時無人接收'
      )
    })

    it('失敗後不應呼叫 renderer.clearPostForm', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: false, status: 500, data: null })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(renderer.clearPostForm).not.toHaveBeenCalled()
    })

    it('失敗後送出按鈕應恢復為可用狀態', async () => {
      fetchClient.postStory.mockResolvedValue({ ok: false, status: 500, data: null })

      document.getElementById('post-input').value = '我今天很慘'

      const event = new Event('submit')
      event.preventDefault = vi.fn()
      await handleSubmit(event)

      expect(document.getElementById('post-submit').disabled).toBe(false)
    })
  })
})
