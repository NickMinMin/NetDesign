/**
 * session.js — 匿名代號系統模組
 * 負責取得/建立使用者的匿名代號，並存在 localStorage
 */

const SESSION_TOKEN_KEY = 'trashmatch_session_token'
const SESSION_NICKNAME_KEY = 'trashmatch_nickname'

/**
 * 取得目前的 session token（從 localStorage）
 * @returns {string|null}
 */
export function getSessionToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY)
}

/**
 * 取得目前的暱稱（從 localStorage）
 * @returns {string|null}
 */
export function getNickname() {
  return localStorage.getItem(SESSION_NICKNAME_KEY)
}

/**
 * 初始化 session：
 * - 若 localStorage 已有 token，帶著 token 去後端確認
 * - 若沒有，後端自動產生新代號
 * - 將 token 和 nickname 存入 localStorage
 * - 僅在未登入狀態下更新導覽列顯示代號（避免與 auth.js 衝突）
 */
export async function initSession() {
  const existingToken = getSessionToken()
  const base = (window.API_BASE_URL || '').replace(/\/$/, '')
  const url = existingToken
    ? `${base}/api/session?token=${existingToken}`
    : `${base}/api/session`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data.session_token && data.nickname) {
      // 存入 localStorage
      localStorage.setItem(SESSION_TOKEN_KEY, data.session_token)
      localStorage.setItem(SESSION_NICKNAME_KEY, data.nickname)

      // 僅在未登入時更新導覽列（已登入由 auth.js 負責顯示真實代號）
      const isLoggedIn = !!localStorage.getItem('trashmatch_auth_token')
      if (!isLoggedIn) {
        updateNavNickname(data.nickname)
      }
    }
  } catch (err) {
    // 網路失敗時用本地暫存的代號，不影響使用
    const cached = getNickname()
    const isLoggedIn = !!localStorage.getItem('trashmatch_auth_token')
    if (cached && !isLoggedIn) updateNavNickname(cached)
  }
}

/**
 * 更新導覽列的代號顯示
 * @param {string} nickname - 代號，例如「垃圾桶 #4521」
 */
function updateNavNickname(nickname) {
  const el = document.getElementById('nav-nickname')
  if (el) {
    el.textContent = `👤 ${nickname}`
  }
}
