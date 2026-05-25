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
    <div id="chat-messages"></div>
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

    it('應包含 feedback-msg--error 類別', () => {
      const container = document.getElementById('feedback-container')
      renderer.renderError(container, '錯誤訊息')
      const errorElement = container.querySelector('.feedback-msg--error')
      expect(errorElement).not.toBeNull()
      expect(errorElement.textContent).toBe('錯誤訊息')
    })

    it('應使用 CSS class 而非 inline style', () => {
      const container = document.getElementById('feedback-container')
      renderer.renderError(container, '錯誤訊息')
      const errorElement = container.querySelector('.feedback-msg--error')
      expect(errorElement).not.toBeNull()
      expect(errorElement.className).toContain('feedback-msg')
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

// ─────────────────────────────────────────────
// 單元測試：聊天室訊息渲染
// ─────────────────────────────────────────────

describe('renderer 聊天室訊息渲染測試', () => {
  beforeEach(() => {
    setupDOM()
  })

  describe('renderMessages', () => {
    it('應渲染訊息列表並區分發送者與接收者', () => {
      const messages = [
        { id: 1, sender_story_id: 123, content: '你好', created_at: '2025-01-15T10:00:00Z' },
        { id: 2, sender_story_id: 456, content: '嗨', created_at: '2025-01-15T10:01:00Z' },
      ]
      const currentStoryId = 123

      renderer.renderMessages(messages, currentStoryId)

      const container = document.getElementById('chat-messages')
      const messageElements = container.querySelectorAll('.chat-message')
      
      expect(messageElements.length).toBe(2)
      expect(messageElements[0].classList.contains('chat-message--sender')).toBe(true)
      expect(messageElements[1].classList.contains('chat-message--receiver')).toBe(true)
    })

    it('應正確渲染多則訊息（5則以上）', () => {
      const messages = [
        { id: 1, sender_story_id: 123, content: '第一則訊息', created_at: '2025-01-15T10:00:00Z' },
        { id: 2, sender_story_id: 456, content: '第二則訊息', created_at: '2025-01-15T10:01:00Z' },
        { id: 3, sender_story_id: 123, content: '第三則訊息', created_at: '2025-01-15T10:02:00Z' },
        { id: 4, sender_story_id: 456, content: '第四則訊息', created_at: '2025-01-15T10:03:00Z' },
        { id: 5, sender_story_id: 123, content: '第五則訊息', created_at: '2025-01-15T10:04:00Z' },
        { id: 6, sender_story_id: 456, content: '第六則訊息', created_at: '2025-01-15T10:05:00Z' },
      ]
      const currentStoryId = 123

      renderer.renderMessages(messages, currentStoryId)

      const container = document.getElementById('chat-messages')
      const messageElements = container.querySelectorAll('.chat-message')
      
      // 應渲染所有 6 則訊息
      expect(messageElements.length).toBe(6)
      
      // 驗證每則訊息的內容都正確顯示
      expect(container.textContent).toContain('第一則訊息')
      expect(container.textContent).toContain('第六則訊息')
      
      // 驗證發送者/接收者分類正確
      expect(messageElements[0].classList.contains('chat-message--sender')).toBe(true)
      expect(messageElements[1].classList.contains('chat-message--receiver')).toBe(true)
      expect(messageElements[2].classList.contains('chat-message--sender')).toBe(true)
    })

    it('應正確處理包含特殊字元的訊息內容', () => {
      const messages = [
        { id: 1, sender_story_id: 123, content: '訊息包含 emoji 😊💬✨', created_at: '2025-01-15T10:00:00Z' },
        { id: 2, sender_story_id: 456, content: '訊息包含標點符號！？、，。', created_at: '2025-01-15T10:01:00Z' },
        { id: 3, sender_story_id: 123, content: '訊息包含引號 "test" \'test\'', created_at: '2025-01-15T10:02:00Z' },
      ]
      const currentStoryId = 123

      renderer.renderMessages(messages, currentStoryId)

      const container = document.getElementById('chat-messages')
      
      // 所有特殊字元應正確顯示
      expect(container.textContent).toContain('😊💬✨')
      expect(container.textContent).toContain('！？、，。')
      expect(container.textContent).toContain('"test"')
    })

    it('應正確處理長訊息內容', () => {
      const longContent = '這是一則很長的訊息內容，'.repeat(20) // 約 200 字
      const messages = [
        { id: 1, sender_story_id: 123, content: longContent, created_at: '2025-01-15T10:00:00Z' },
      ]
      const currentStoryId = 123

      renderer.renderMessages(messages, currentStoryId)

      const container = document.getElementById('chat-messages')
      const messageElements = container.querySelectorAll('.chat-message')
      
      // 應成功渲染長訊息
      expect(messageElements.length).toBe(1)
      expect(container.textContent).toContain('這是一則很長的訊息內容')
    })

    it('應正確顯示訊息內容與時間戳', () => {
      const messages = [
        { id: 1, sender_story_id: 123, content: '測試訊息', created_at: '2025-01-15T10:00:00Z' },
      ]
      const currentStoryId = 123

      renderer.renderMessages(messages, currentStoryId)

      const container = document.getElementById('chat-messages')
      expect(container.textContent).toContain('測試訊息')
    })

    it('應跳脫 HTML 特殊字元防止 XSS', () => {
      const messages = [
        { id: 1, sender_story_id: 123, content: '<script>alert("xss")</script>', created_at: '2025-01-15T10:00:00Z' },
      ]
      const currentStoryId = 123

      renderer.renderMessages(messages, currentStoryId)

      const container = document.getElementById('chat-messages')
      // 應該不包含實際的 script 標籤
      expect(container.querySelector('script')).toBeNull()
      // 應該包含跳脫後的文字
      expect(container.textContent).toContain('<script>')
    })

    it('空訊息陣列應顯示空狀態', () => {
      renderer.renderMessages([], 123)

      const container = document.getElementById('chat-messages')
      expect(container.textContent).toContain('你們都沒救了，不如聊聊吧')
    })

    it('null 訊息應顯示空狀態', () => {
      renderer.renderMessages(null, 123)

      const container = document.getElementById('chat-messages')
      expect(container.textContent).toContain('你們都沒救了，不如聊聊吧')
    })
  })

  describe('renderChatGreeting', () => {
    it('應顯示配對成功訊息', () => {
      renderer.renderChatGreeting()

      const container = document.getElementById('chat-messages')
      expect(container.textContent).toContain('💘 配對成功！你們都沒救了')
    })

    it('container 不存在時不應拋出例外', () => {
      document.body.innerHTML = ''
      expect(() => renderer.renderChatGreeting()).not.toThrow()
    })
  })

  describe('renderEmptyChatState', () => {
    it('應顯示空狀態訊息', () => {
      renderer.renderEmptyChatState()

      const container = document.getElementById('chat-messages')
      expect(container.textContent).toContain('你們都沒救了，不如聊聊吧 💬✨')
    })

    it('應包含 chat-empty 類別', () => {
      renderer.renderEmptyChatState()

      const container = document.getElementById('chat-messages')
      const emptyElement = container.querySelector('.chat-empty')
      expect(emptyElement).not.toBeNull()
      expect(emptyElement.textContent).toContain('你們都沒救了，不如聊聊吧')
    })

    it('container 不存在時不應拋出例外', () => {
      document.body.innerHTML = ''
      expect(() => renderer.renderEmptyChatState()).not.toThrow()
    })
  })

  describe('formatTimestamp', () => {
    it('應顯示「剛剛」對於 1 分鐘內的訊息', () => {
      const now = new Date()
      const timestamp = new Date(now.getTime() - 30000).toISOString() // 30 秒前
      
      const result = renderer.formatTimestamp(timestamp)
      expect(result).toBe('剛剛')
    })

    it('應顯示「X 分鐘前」對於 1 小時內的訊息', () => {
      const now = new Date()
      const timestamp = new Date(now.getTime() - 5 * 60000).toISOString() // 5 分鐘前
      
      const result = renderer.formatTimestamp(timestamp)
      expect(result).toBe('5 分鐘前')
    })

    it('應顯示「X 小時前」對於 24 小時內的訊息', () => {
      const now = new Date()
      const timestamp = new Date(now.getTime() - 3 * 3600000).toISOString() // 3 小時前
      
      const result = renderer.formatTimestamp(timestamp)
      expect(result).toBe('3 小時前')
    })

    it('應顯示絕對時間對於超過 24 小時的訊息', () => {
      const now = new Date()
      const timestamp = new Date(now.getTime() - 25 * 3600000).toISOString() // 25 小時前
      
      const result = renderer.formatTimestamp(timestamp)
      // 應該包含日期格式
      expect(result).toMatch(/\d+\/\d+/)
    })
  })

  describe('scrollToLatestMessage', () => {
    it('應設定容器的 scrollTop 為 scrollHeight', () => {
      const container = document.getElementById('chat-messages')
      // 模擬有內容的容器
      Object.defineProperty(container, 'scrollHeight', {
        configurable: true,
        value: 1000
      })

      renderer.scrollToLatestMessage()

      // scrollTop 應該被設定為 scrollHeight
      expect(container.scrollTop).toBe(1000)
    })

    it('container 不存在時不應拋出例外', () => {
      document.body.innerHTML = ''
      expect(() => renderer.scrollToLatestMessage()).not.toThrow()
    })
  })

  describe('escapeHtml', () => {
    it('應跳脫 < 和 > 字元', () => {
      const result = renderer.escapeHtml('<div>test</div>')
      expect(result).toBe('&lt;div&gt;test&lt;/div&gt;')
    })

    it('應跳脫 & 字元', () => {
      const result = renderer.escapeHtml('Tom & Jerry')
      expect(result).toBe('Tom &amp; Jerry')
    })

    it('應跳脫 script 標籤防止 XSS', () => {
      const result = renderer.escapeHtml('<script>alert("xss")</script>')
      expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
    })

    it('普通文字應保持不變', () => {
      const result = renderer.escapeHtml('Hello World')
      expect(result).toBe('Hello World')
    })
  })
})
