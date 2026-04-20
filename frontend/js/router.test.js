// Feature: trash-match-frontend, Property 5: 對任意合法 hash，navigate 後 hash 與頁面可見性一致

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { router } from './router.js'

/**
 * 建立測試所需的 DOM 環境
 * 包含 #feed-page、#post-page、#chat-panel、.nav-link[data-page="feed"]、.nav-link[data-page="post"]
 */
function setupDOM() {
  document.body.innerHTML = `
    <nav id="nav-bar">
      <a href="#feed" class="nav-link active" data-page="feed" aria-current="page">首頁</a>
      <a href="#post" class="nav-link" data-page="post">投稿</a>
    </nav>
    <main>
      <section id="feed-page" class="page"></section>
      <section id="post-page" class="page hidden"></section>
    </main>
    <aside id="chat-panel" class="chat-panel hidden" aria-hidden="true"></aside>
  `
}

describe('router 模組', () => {
  beforeEach(() => {
    setupDOM()
    // 重置 hash
    window.location.hash = ''
  })

  // ─── 屬性 5：對任意合法 hash，navigate 後 hash 與頁面可見性一致 ───
  it('屬性 5：對任意合法 hash，navigate 後 window.location.hash 等於該 hash 且對應頁面可見', () => {
    fc.assert(
      fc.property(
        // 從合法 hash 清單中隨機選取
        fc.constantFrom('#feed', '#post'),
        (hash) => {
          setupDOM()

          router.navigate(hash)

          // 驗證 window.location.hash 等於目標 hash
          expect(window.location.hash).toBe(hash)

          // 驗證對應頁面可見（無 hidden class）
          const pageIdMap = { '#feed': 'feed-page', '#post': 'post-page' }
          const targetId = pageIdMap[hash]
          const targetPage = document.getElementById(targetId)
          expect(targetPage).not.toBeNull()
          expect(targetPage.classList.contains('hidden')).toBe(false)

          // 驗證其他頁面隱藏（有 hidden class）
          const otherIds = Object.values(pageIdMap).filter((id) => id !== targetId)
          otherIds.forEach((otherId) => {
            const otherPage = document.getElementById(otherId)
            expect(otherPage).not.toBeNull()
            expect(otherPage.classList.contains('hidden')).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  // ─── 單元測試：init() ───
  describe('init()', () => {
    it('應根據初始 hash #feed 顯示 feed-page', () => {
      window.location.hash = '#feed'
      router.init()
      expect(document.getElementById('feed-page').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('post-page').classList.contains('hidden')).toBe(true)
    })

    it('應根據初始 hash #post 顯示 post-page', () => {
      window.location.hash = '#post'
      router.init()
      expect(document.getElementById('post-page').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('feed-page').classList.contains('hidden')).toBe(true)
    })

    it('無 hash 時預設顯示 feed-page', () => {
      window.location.hash = ''
      router.init()
      expect(document.getElementById('feed-page').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('post-page').classList.contains('hidden')).toBe(true)
    })
  })

  // ─── 單元測試：navigate() ───
  describe('navigate()', () => {
    it('navigate("#post") 應顯示 post-page 並隱藏 feed-page', () => {
      router.navigate('#post')
      expect(document.getElementById('post-page').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('feed-page').classList.contains('hidden')).toBe(true)
    })

    it('navigate("#feed") 應顯示 feed-page 並隱藏 post-page', () => {
      router.navigate('#post')
      router.navigate('#feed')
      expect(document.getElementById('feed-page').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('post-page').classList.contains('hidden')).toBe(true)
    })

    it('navigate 後應同步更新導覽列 active class', () => {
      router.navigate('#post')
      const feedLink = document.querySelector('.nav-link[data-page="feed"]')
      const postLink = document.querySelector('.nav-link[data-page="post"]')
      expect(postLink.classList.contains('active')).toBe(true)
      expect(feedLink.classList.contains('active')).toBe(false)
    })
  })

  // ─── 單元測試：openChat() ───
  describe('openChat()', () => {
    it('應移除 hidden class 並加上 slide-in class', () => {
      const panel = document.getElementById('chat-panel')
      router.openChat()
      expect(panel.classList.contains('hidden')).toBe(false)
      expect(panel.classList.contains('slide-in')).toBe(true)
      expect(panel.classList.contains('slide-out')).toBe(false)
    })

    it('應設定 aria-hidden="false"', () => {
      const panel = document.getElementById('chat-panel')
      router.openChat()
      expect(panel.getAttribute('aria-hidden')).toBe('false')
    })
  })

  // ─── 單元測試：closeChat() ───
  describe('closeChat()', () => {
    it('應加上 slide-out class 並移除 slide-in class', () => {
      const panel = document.getElementById('chat-panel')
      // 先開啟
      router.openChat()
      // 再關閉
      router.closeChat()
      expect(panel.classList.contains('slide-out')).toBe(true)
      expect(panel.classList.contains('slide-in')).toBe(false)
    })

    it('animationend 事件觸發後應加回 hidden class 並設定 aria-hidden="true"', () => {
      const panel = document.getElementById('chat-panel')
      router.openChat()
      router.closeChat()

      // jsdom 不支援 CSS 動畫，手動觸發 animationend 事件
      panel.dispatchEvent(new Event('animationend'))

      expect(panel.classList.contains('hidden')).toBe(true)
      expect(panel.getAttribute('aria-hidden')).toBe('true')
    })
  })
})
