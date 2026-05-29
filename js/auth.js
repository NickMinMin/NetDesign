/**
 * auth.js — 帳號系統模組
 * 負責登入、註冊、登出、JWT 儲存，以及導覽列登入狀態顯示
 */

const AUTH_TOKEN_KEY = 'trashmatch_auth_token'
const AUTH_NICKNAME_KEY = 'trashmatch_auth_nickname'
const AUTH_CODE_NAME_KEY = 'trashmatch_auth_code_name'

// ===== Token 存取 =====

/**
 * 取得目前的 JWT token
 * @returns {string|null}
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * 取得目前登入使用者的真實暱稱
 * @returns {string|null}
 */
export function getAuthNickname() {
  return localStorage.getItem(AUTH_NICKNAME_KEY)
}

/**
 * 取得目前登入使用者的隨機代號
 * @returns {string|null}
 */
export function getAuthCodeName() {
  return localStorage.getItem(AUTH_CODE_NAME_KEY)
}

/**
 * 是否已登入
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getAuthToken()
}

/**
 * 儲存登入資訊
 * @param {string} token
 * @param {string} nickname
 * @param {string} codeName
 */
function saveAuth(token, nickname, codeName) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_NICKNAME_KEY, nickname)
  localStorage.setItem(AUTH_CODE_NAME_KEY, codeName)
}

/**
 * 清除登入資訊
 */
function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_NICKNAME_KEY)
  localStorage.removeItem(AUTH_CODE_NAME_KEY)
}

// ===== 導覽列狀態 =====

/**
 * 根據登入狀態更新導覽列顯示
 */
export function updateNavAuthState() {
  const nicknameEl = document.getElementById('nav-nickname')
  const loginBtn = document.getElementById('nav-login-btn')
  const logoutBtn = document.getElementById('nav-logout-btn')

  if (isLoggedIn()) {
    const codeName = getAuthCodeName()
    if (nicknameEl) {
      nicknameEl.textContent = `👤 ${codeName}`
      nicknameEl.classList.remove('hidden')
    }
    if (loginBtn) loginBtn.classList.add('hidden')
    if (logoutBtn) logoutBtn.classList.remove('hidden')
  } else {
    if (nicknameEl) nicknameEl.classList.add('hidden')
    if (loginBtn) loginBtn.classList.remove('hidden')
    if (logoutBtn) logoutBtn.classList.add('hidden')
  }
}

// ===== 登入頁 Tab 切換 =====

function switchTab(tabName) {
  const loginPanel = document.getElementById('tab-login')
  const registerPanel = document.getElementById('tab-register')
  const loginTabBtn = document.getElementById('tab-btn-login')
  const registerTabBtn = document.getElementById('tab-btn-register')

  if (tabName === 'login') {
    loginPanel?.classList.remove('hidden')
    registerPanel?.classList.add('hidden')
    loginTabBtn?.classList.add('login-tab--active')
    loginTabBtn?.setAttribute('aria-selected', 'true')
    registerTabBtn?.classList.remove('login-tab--active')
    registerTabBtn?.setAttribute('aria-selected', 'false')
  } else {
    registerPanel?.classList.remove('hidden')
    loginPanel?.classList.add('hidden')
    registerTabBtn?.classList.add('login-tab--active')
    registerTabBtn?.setAttribute('aria-selected', 'true')
    loginTabBtn?.classList.remove('login-tab--active')
    loginTabBtn?.setAttribute('aria-selected', 'false')
  }
}

// ===== 訊息提示 =====

function showFeedback(el, message, type = 'error') {
  if (!el) return
  el.innerHTML = `<div class="feedback-msg feedback-msg--${type}">${message}</div>`
}

function clearFeedback(el) {
  if (el) el.innerHTML = ''
}

// ===== API 呼叫 =====

async function apiRegister(nickname, password) {
  const res = await fetch(`${window.API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

async function apiLogin(nickname, password) {
  const res = await fetch(`${window.API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password }),
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

// ===== 表單處理 =====

async function handleLogin(event) {
  event.preventDefault()
  const nicknameEl = document.getElementById('login-nickname')
  const passwordEl = document.getElementById('login-password')
  const feedbackEl = document.getElementById('login-feedback')
  const submitBtn = document.getElementById('login-submit')

  clearFeedback(feedbackEl)

  const nickname = nicknameEl?.value.trim() || ''
  const password = passwordEl?.value || ''

  if (!nickname || !password) {
    showFeedback(feedbackEl, '暱稱和密碼都要填')
    return
  }

  if (submitBtn) submitBtn.disabled = true

  try {
    const result = await apiLogin(nickname, password)

    if (result.ok && result.data.token) {
      saveAuth(result.data.token, result.data.nickname, result.data.code_name)
      updateNavAuthState()
      // 登入成功，跳回首頁
      window.location.hash = '#feed'
    } else {
      showFeedback(feedbackEl, result.data.message || '登入失敗，請再試一次')
    }
  } catch {
    showFeedback(feedbackEl, '網路錯誤，請稍後再試')
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}

async function handleRegister(event) {
  event.preventDefault()
  const nicknameEl = document.getElementById('register-nickname')
  const passwordEl = document.getElementById('register-password')
  const feedbackEl = document.getElementById('register-feedback')
  const submitBtn = document.getElementById('register-submit')

  clearFeedback(feedbackEl)

  const nickname = nicknameEl?.value.trim() || ''
  const password = passwordEl?.value || ''

  if (!nickname) {
    showFeedback(feedbackEl, '暱稱不可為空白')
    return
  }
  if (nickname.length > 20) {
    showFeedback(feedbackEl, '暱稱最多 20 個字')
    return
  }
  if (!password || password.length < 4) {
    showFeedback(feedbackEl, '密碼至少 4 個字元')
    return
  }

  if (submitBtn) submitBtn.disabled = true

  try {
    const result = await apiRegister(nickname, password)

    if (result.ok && result.data.token) {
      saveAuth(result.data.token, result.data.nickname, result.data.code_name)
      updateNavAuthState()
      // 註冊成功，跳回首頁
      window.location.hash = '#feed'
    } else {
      showFeedback(feedbackEl, result.data.message || '註冊失敗，請再試一次')
    }
  } catch {
    showFeedback(feedbackEl, '網路錯誤，請稍後再試')
  } finally {
    if (submitBtn) submitBtn.disabled = false
  }
}

function handleLogout() {
  clearAuth()
  updateNavAuthState()
  window.location.hash = '#login'
}

// ===== 公開介面 =====

export const auth = {
  /**
   * 初始化帳號系統：
   * - 更新導覽列狀態
   * - 綁定登入/註冊/登出表單事件
   * - 綁定 Tab 切換
   * - 未登入時若在需要登入的頁面自動跳轉
   */
  init() {
    // 更新導覽列
    updateNavAuthState()

    // 綁定登出按鈕
    const logoutBtn = document.getElementById('nav-logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout)
    }

    // 綁定 Tab 切換
    const loginTabBtn = document.getElementById('tab-btn-login')
    const registerTabBtn = document.getElementById('tab-btn-register')
    if (loginTabBtn) loginTabBtn.addEventListener('click', () => switchTab('login'))
    if (registerTabBtn) registerTabBtn.addEventListener('click', () => switchTab('register'))

    // 綁定登入表單
    const loginForm = document.getElementById('login-form')
    if (loginForm) loginForm.addEventListener('submit', handleLogin)

    // 綁定註冊表單
    const registerForm = document.getElementById('register-form')
    if (registerForm) registerForm.addEventListener('submit', handleRegister)
  },

  /**
   * 若未登入，跳轉到登入頁
   * 可在需要登入的操作前呼叫
   * @returns {boolean} 是否已登入
   */
  requireLogin() {
    if (!isLoggedIn()) {
      window.location.hash = '#login'
      return false
    }
    return true
  },
}
