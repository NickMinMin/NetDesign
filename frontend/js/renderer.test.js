// Feature: trash-match-frontend, Property 1: 對任意合法 Story 物件，renderStoryCard 後 DOM 包含 content 與 pat_count
// Feature: trash-match-frontend, Property 3: 對任意初始 pat_count，updatePatCount(count + 1) 後顯示值正確遞增
// Feature: trash-match-frontend, Property 4: 對任意錯誤訊息字串，renderError 後容器包含該訊息

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { renderer } from './renderer.js'

/**
 * 設定模擬 index.html 相關 DOM 元素的輔助函式
 */
function setupDOM() {
  document.body.innerHTML = `
    <div id="story-content"></div>
    <span id="pat-count">0</span>
    <textarea id="post-input"></textarea>
    <div id="feedback-container"></div>
  `
}

// ─────────────────────────────────────────────
// 單元測試：具體範例驗證
// ─────────────────────────────────────────────

describe('renderer 單元測試', () => {
  beforeEach(() => {
    setupDOM()
  })

  describe('renderStoryCard', () => {
    it('應將 content 填入 #story-content', () => {
      const story = { id: 'abc', content: '今天被老闆罵了三次', pat_count: 5 }
      renderer.renderStoryCard(story)
      expect(document.getElementById('story-content').textContent).toBe('今天被老闆罵了三次')
    })

    it('應將 pat_count 填入 #pat-count', () => {
      const story = { id: 'abc', content: '慘事內容', pat_count: 42 }
      renderer.renderStoryCard(story)
      expect(document.getElementById('pat-count').textContent).toBe('42')
    })

    it('pat_count 為 0 時應顯示 0', () => {
      const story = { id: 'xyz', content: '沒人拍拍', pat_count: 0 }
      renderer.renderStoryCard(story)
      expect(document.getElementById('pat-count').textContent).toBe('0')
    })
  })

  describe('renderError', () => {
    it('應在容器中插入錯誤訊息', () => {
      const container = document.getElementById('feedback-container')
      renderer.renderError(container, '目前沒有慘事，快去投稿吧！')
      expect(container.textContent).toBe('目前沒有慘事，快去投稿吧！')
    })

    it('應清除容器原有內容再插入', () => {
      const container = document.getElementById('feedback-container')
      container.innerHTML = '<p>舊訊息</p>'
      renderer.renderError(container, '新錯誤訊息')
      expect(container.querySelectorAll('p').length).toBe(1)
      expect(container.textContent).toBe('新錯誤訊息')
    })

    it('container 為 null 時不應拋出例外', () => {
      expect(() => renderer.renderError(null, '訊息')).not.toThrow()
    })
  })

  describe('renderSuccess', () => {
    it('應在容器中插入成功訊息', () => {
      const container = document.getElementById('feedback-container')
      renderer.renderSuccess(container, '你的慘事已送出，大家都懂你')
      expect(container.textContent).toBe('你的慘事已送出，大家都懂你')
    })

    it('container 為 null 時不應拋出例外', () => {
      expect(() => renderer.renderSuccess(null, '訊息')).not.toThrow()
    })
  })

  describe('updatePatCount', () => {
    it('應更新 #pat-count 的文字內容', () => {
      renderer.updatePatCount(99)
      expect(document.getElementById('pat-count').textContent).toBe('99')
    })

    it('應能更新為 0', () => {
      renderer.updatePatCount(0)
      expect(document.getElementById('pat-count').textContent).toBe('0')
    })
  })

  describe('clearPostForm', () => {
    it('應清空 #post-input 的值', () => {
      const input = document.getElementById('post-input')
      input.value = '我的慘事內容'
      renderer.clearPostForm()
      expect(input.value).toBe('')
    })

    it('輸入框已為空時不應拋出例外', () => {
      expect(() => renderer.clearPostForm()).not.toThrow()
    })
  })
})

// ─────────────────────────────────────────────
// 屬性測試：Property 1
// 對任意合法 Story 物件，renderStoryCard 後 DOM 包含 content 與 pat_count
// 驗證需求：需求 1.2
// ─────────────────────────────────────────────

describe('屬性測試 — 屬性 1：Story_Card 渲染完整性', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('**Validates: Requirements 1.2** 對任意合法 Story 物件，renderStoryCard 後 DOM 包含 content 與 pat_count', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          pat_count: fc.integer({ min: 0, max: 999999 }),
        }),
        (story) => {
          setupDOM()
          renderer.renderStoryCard(story)

          const contentEl = document.getElementById('story-content')
          const patCountEl = document.getElementById('pat-count')

          // DOM 應包含 content 文字
          expect(contentEl.textContent).toBe(story.content)
          // DOM 應包含 pat_count 數值
          expect(patCountEl.textContent).toBe(String(story.pat_count))
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// 屬性測試：Property 3
// 對任意初始 pat_count，updatePatCount(count + 1) 後顯示值正確遞增
// 驗證需求：需求 2.2
// ─────────────────────────────────────────────

describe('屬性測試 — 屬性 3：拍拍數遞增不變式', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('**Validates: Requirements 2.2** 對任意初始 pat_count，updatePatCount(count + 1) 後顯示值正確遞增', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999998 }),
        (initialCount) => {
          setupDOM()
          // 先設定初始值
          renderer.updatePatCount(initialCount)
          const before = parseInt(document.getElementById('pat-count').textContent, 10)

          // 遞增後更新
          renderer.updatePatCount(initialCount + 1)
          const after = parseInt(document.getElementById('pat-count').textContent, 10)

          // 顯示值應正確遞增 1
          expect(after).toBe(before + 1)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────
// 屬性測試：Property 4
// 對任意錯誤訊息字串，renderError 後容器包含該訊息
// 驗證需求：需求 1.4、2.5、3.5
// ─────────────────────────────────────────────

describe('屬性測試 — 屬性 4：錯誤訊息渲染完整性', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('**Validates: Requirements 1.4, 2.5, 3.5** 對任意錯誤訊息字串，renderError 後容器包含該訊息', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (msg) => {
          setupDOM()
          const container = document.getElementById('feedback-container')
          renderer.renderError(container, msg)

          // 容器應包含該錯誤訊息文字
          expect(container.textContent).toBe(msg)
        }
      ),
      { numRuns: 100 }
    )
  })
})
