/**
 * chat.js — Chat 面板邏輯模組
 */

import { router } from './router.js';
import { fetchClient } from './fetchClient.js';
import { renderer } from './renderer.js';

let _controller = null;

export const chatState = {
  chatRoomId: null,
  storyId: null,
  messages: [],
  lastFetchedAt: null,
  pollingInterval: null,
  isSending: false,
};

export const chat = {
  init() {
    if (_controller) _controller.abort();
    _controller = new AbortController();
    const signal = _controller.signal;

    const closeBtn = document.getElementById('chat-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => router.closeChat(), { signal });
    }

    document.addEventListener('click', (event) => {
      const panel = document.getElementById('chat-panel');
      const isClickInside = panel && panel.contains(event.target);
      const isClickNav = event.target.closest('.nav-link');
      const isClickPat = event.target.closest('#pat-btn');
      
      if (panel && !panel.classList.contains('hidden') && !isClickInside && !isClickNav && !isClickPat) {
        router.closeChat();
      }
    }, { signal });

    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (chatInput) this.sendMessage(chatInput.value);
      }, { signal });
    }

    if (chatInput) {
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.sendMessage(chatInput.value);
        }
      }, { signal });
    }
  },

  async open(chatRoomId, storyId = null) {
    chatState.chatRoomId = chatRoomId;
    chatState.messages = [];
    chatState.lastFetchedAt = null;
    chatState.isSending = false;

    const hasTokenForThisStory = localStorage.getItem(`story_token_${storyId}`) !== null;
    chatState.storyId = hasTokenForThisStory ? storyId : (localStorage.getItem('my_last_story_id') || storyId);

    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.value = '';
    renderer.renderEmptyChatState();

    await this.pollMessages();

    if (chatState.pollingInterval) clearInterval(chatState.pollingInterval);

    chatState.pollingInterval = setInterval(() => {
      this.pollMessages();
    }, 3000);
  },

  async pollMessages() {
    if (!chatState.chatRoomId) return;

    try {
      const result = await fetchClient.getMessages(chatState.chatRoomId, chatState.lastFetchedAt);

      if (result.ok && result.data && result.data.messages.length > 0) {
        chatState.messages.push(...result.data.messages);
        chatState.lastFetchedAt = result.data.messages[result.data.messages.length - 1].created_at;
        this.renderMessages();
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  },

  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (chatState.messages.length === 0) {
      renderer.renderEmptyChatState();
      return;
    }

    container.innerHTML = chatState.messages
      .map((msg) => {
        const isMe = String(msg.sender_story_id) === String(chatState.storyId);
        const msgClass = isMe ? 'chat-message--me' : 'chat-message--other';
        const senderName = isMe ? '你 (匿名衰鬼)' : '對方衰鬼';
        const escapedContent = renderer.escapeHtml(msg.content);
        const formattedTime = renderer.formatTimestamp(msg.created_at);

        return `
          <div class="chat-message ${msgClass}">
            <div class="chat-message__bubble">
              <div class="chat-message__meta">${senderName} • ${formattedTime}</div>
              <div class="chat-message__text">${escapedContent}</div>
            </div>
          </div>
        `;
      }).join('');
    
    renderer.scrollToLatestMessage();
  },

  async sendMessage(content) {
    const trimmed = content.trim();
    if (!trimmed || chatState.isSending || !chatState.chatRoomId || !chatState.storyId) return;

    chatState.isSending = true;
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    if (sendBtn) sendBtn.disabled = true;

    try {
      const result = await fetchClient.sendMessage(chatState.chatRoomId, chatState.storyId, trimmed);

      if (result.ok && result.data) {
        if (chatInput) chatInput.value = '';
        chatState.messages.push(result.data);
        chatState.lastFetchedAt = result.data.created_at;
        this.renderMessages();
      } else {
        alert(result.data?.message || '訊息發送失敗');
      }
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      chatState.isSending = false;
      if (sendBtn) sendBtn.disabled = false;
      if (chatInput) chatInput.focus();
    }
  },

  close() {
    if (chatState.pollingInterval) {
      clearInterval(chatState.pollingInterval);
      chatState.pollingInterval = null;
    }
    chatState.chatRoomId = null;
    chatState.storyId = null;
    chatState.messages = [];
    chatState.lastFetchedAt = null;
  },
};