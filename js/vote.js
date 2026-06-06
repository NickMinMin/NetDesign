/**
 * vote.js — 投票對決頁面模組
 * 真正 pair 制：每一組對決有自己的 pair_id
 */

import { fetchClient } from './fetchClient.js'
import { auth } from './auth.js'

let pairId = null
let storyA = null
let storyB = null

function getEl(id) {
  return document.getElementById(id)
}

function showFeedback(message) {
  const el = getEl('vote-feedback')
  if (el) el.textContent = message
}

function clearFeedback() {
  const el = getEl('vote-feedback')
  if (el) el.textContent = ''
}

export function calculatePercentages(countA, countB) {
  const total = countA + countB
  if (total === 0) {
    return { pctA: 50, pctB: 50 }
  }
  const pctA = Math.round((countA / total) * 100)
  const pctB = 100 - pctA
  return { pctA, pctB }
}

function showResults(votesA, votesB) {
  const resultsEl = getEl('vote-results')
  const nextBtn = getEl('vote-next-btn')
  const btnA = getEl('vote-btn-a')
  const btnB = getEl('vote-btn-b')

  const { pctA, pctB } = calculatePercentages(votesA, votesB)

  const barA = resultsEl?.querySelector('[data-bar="a"]')
  const barB = resultsEl?.querySelector('[data-bar="b"]')
  if (barA) barA.style.setProperty('--pct', pctA + '%')
  if (barB) barB.style.setProperty('--pct', pctB + '%')

  const pctTextA = resultsEl?.querySelector('[data-pct="a"]')
  const pctTextB = resultsEl?.querySelector('[data-pct="b"]')
  if (pctTextA) pctTextA.textContent = `${pctA}% (${votesA}票)`
  if (pctTextB) pctTextB.textContent = `${pctB}% (${votesB}票)`

  if (resultsEl) resultsEl.removeAttribute('hidden')
  if (btnA) btnA.setAttribute('hidden', '')
  if (btnB) btnB.setAttribute('hidden', '')
  if (nextBtn) nextBtn.removeAttribute('hidden')
}

function renderPair(newPairId, a, b) {
  pairId = newPairId
  storyA = a
  storyB = b

  const cardA = getEl('vote-story-a')
  const cardB = getEl('vote-story-b')
  const btnA = getEl('vote-btn-a')
  const btnB = getEl('vote-btn-b')
  const resultsEl = getEl('vote-results')
  const nextBtn = getEl('vote-next-btn')

  if (cardA) cardA.textContent = a.content
  if (cardB) cardB.textContent = b.content

  if (btnA) {
    btnA.removeAttribute('hidden')
    btnA.disabled = false
  }
  if (btnB) {
    btnB.removeAttribute('hidden')
    btnB.disabled = false
  }

  if (resultsEl) resultsEl.setAttribute('hidden', '')
  if (nextBtn) nextBtn.setAttribute('hidden', '')

  clearFeedback()
}

async function handleVote(votedStoryId) {
  if (!auth.requireLogin()) return
  if (!pairId) return

  const btnA = getEl('vote-btn-a')
  const btnB = getEl('vote-btn-b')

  if (btnA) btnA.disabled = true
  if (btnB) btnB.disabled = true

  const result = await fetchClient.votePair(pairId, votedStoryId)

  if (result.ok) {
    const votesA = result.data.votes_a ?? 0
    const votesB = result.data.votes_b ?? 0
    showResults(votesA, votesB)
  } else if (result.status === 409) {
    showFeedback('你已經對這組對決投過票了，換一組吧 👇')
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  } else if (result.status === 401) {
    auth.requireLogin()
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  } else {
    showFeedback(result.data?.message || '投票失敗，請稍後再試')
    if (btnA) btnA.disabled = false
    if (btnB) btnB.disabled = false
  }
}

async function loadPair() {
  clearFeedback()

  const result = await fetchClient.getRandomPair()

  if (!result.ok) {
    showFeedback('目前慘事不足，快去投稿吧！')

    const btnA = getEl('vote-btn-a')
    const btnB = getEl('vote-btn-b')
    if (btnA) {
      btnA.setAttribute('hidden', '')
      btnA.disabled = true
    }
    if (btnB) {
      btnB.setAttribute('hidden', '')
      btnB.disabled = true
    }
    return
  }

  const newPairId = result.data.pair_id
  const [a, b] = result.data.stories
  renderPair(newPairId, a, b)
}

export const vote = {
  init() {
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#vote') {
        loadPair()
      }
    })

    if (window.location.hash === '#vote') {
      loadPair()
    }

    const btnA = getEl('vote-btn-a')
    if (btnA) {
      btnA.addEventListener('click', () => {
        if (storyA) {
          handleVote(storyA.id)
        }
      })
    }

    const btnB = getEl('vote-btn-b')
    if (btnB) {
      btnB.addEventListener('click', () => {
        if (storyB) {
          handleVote(storyB.id)
        }
      })
    }

    const nextBtn = getEl('vote-next-btn')
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        loadPair()
      })
    }
  }
}
