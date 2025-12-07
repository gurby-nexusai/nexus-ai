/**
 * AI Customer Support Widget
 * Embeddable chat widget with customer signup and AI/Human switching
 * 
 * Usage:
 * <script src="https://your-domain.com/support-widget.js"></script>
 * <script>
 *   AISupportWidget.init({
 *     apiUrl: 'https://your-api.com/api/support',
 *     companyName: 'Your Company'
 *   });
 * </script>
 */

(function() {
  'use strict';
  
  const AISupportWidget = {
    config: {
      apiUrl: '',
      companyName: 'Support'
    },
    
    currentUser: null,
    sessionId: null,
    chatMode: 'ai',
    isTyping: false,
    
    init: function(options) {
      this.config = { ...this.config, ...options };
      this.loadSession();
      this.injectStyles();
      this.injectHTML();
      this.attachEventListeners();
    },
    
    loadSession: function() {
      const saved = localStorage.getItem('aiSupportSession');
      if (saved) {
        const session = JSON.parse(saved);
        this.currentUser = session.user;
        this.sessionId = session.sessionId;
      }
    },
    
    saveSession: function() {
      localStorage.setItem('aiSupportSession', JSON.stringify({
        user: this.currentUser,
        sessionId: this.sessionId
      }));
    },
    
    injectStyles: function() {
      const style = document.createElement('style');
      style.textContent = `
        .ai-support-bubble {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 28px;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 999999;
          transition: transform 0.2s;
          border: none;
        }
        
        .ai-support-bubble:hover {
          transform: scale(1.1);
        }
        
        .ai-support-window {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 380px;
          height: 600px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
          display: none;
          flex-direction: column;
          z-index: 999999;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .ai-support-window.open {
          display: flex;
        }
        
        .ai-support-header {
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .ai-support-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
        
        .ai-support-status {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .ai-support-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        }
        
        .ai-support-auth {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .ai-support-auth h2 {
          font-size: 20px;
          margin: 0 0 8px 0;
          color: #333;
        }
        
        .ai-support-auth p {
          font-size: 14px;
          color: #666;
          margin: 0 0 16px 0;
        }
        
        .ai-support-auth input {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }
        
        .ai-support-auth button {
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .ai-support-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f9f9f9;
        }
        
        .ai-support-message {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
        }
        
        .ai-support-message.user {
          align-items: flex-end;
        }
        
        .ai-support-message.bot,
        .ai-support-message.agent {
          align-items: flex-start;
        }
        
        .ai-support-message-sender {
          font-size: 11px;
          color: #999;
          margin-bottom: 4px;
          padding: 0 4px;
        }
        
        .ai-support-message-bubble {
          max-width: 75%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }
        
        .ai-support-message.user .ai-support-message-bubble {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .ai-support-message.bot .ai-support-message-bubble {
          background: white;
          color: #333;
          border: 1px solid #e0e0e0;
        }
        
        .ai-support-message.agent .ai-support-message-bubble {
          background: #e3f2fd;
          color: #333;
          border: 1px solid #90caf9;
        }
        
        .ai-support-typing {
          display: flex;
          gap: 4px;
          padding: 10px 14px;
          background: white;
          border-radius: 12px;
          width: fit-content;
          border: 1px solid #e0e0e0;
        }
        
        .ai-support-typing span {
          width: 8px;
          height: 8px;
          background: #999;
          border-radius: 50%;
          animation: aiSupportTyping 1.4s infinite;
        }
        
        .ai-support-typing span:nth-child(2) { animation-delay: 0.2s; }
        .ai-support-typing span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes aiSupportTyping {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        
        .ai-support-mode-switch {
          padding: 12px 16px;
          background: #fff3cd;
          border-top: 1px solid #ffc107;
          border-bottom: 1px solid #ffc107;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        
        .ai-support-mode-switch button {
          padding: 6px 12px;
          background: #ffc107;
          color: #333;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .ai-support-input-area {
          padding: 16px;
          border-top: 1px solid #ddd;
          display: flex;
          gap: 8px;
          background: white;
        }
        
        .ai-support-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          resize: none;
          font-family: inherit;
          max-height: 100px;
        }
        
        .ai-support-send {
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        
        .ai-support-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .ai-support-hidden {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    },
    
    injectHTML: function() {
      const container = document.createElement('div');
      container.id = 'ai-support-widget';
      container.innerHTML = `
        <button class="ai-support-bubble">💬</button>
        <div class="ai-support-window">
          <div class="ai-support-header">
            <div>
              <h3>${this.config.companyName} Support</h3>
              <div class="ai-support-status"></div>
            </div>
            <button class="ai-support-close">×</button>
          </div>
          
          <div class="ai-support-auth">
            <h2>Welcome! 👋</h2>
            <p>Sign in to chat with our AI assistant or connect with a support agent.</p>
            <input type="text" class="ai-support-name" placeholder="Your Name" required>
            <input type="email" class="ai-support-email" placeholder="Your Email" required>
            <button class="ai-support-auth-btn">Start Chat</button>
          </div>
          
          <div class="ai-support-chat ai-support-hidden">
            <div class="ai-support-messages"></div>
            <div class="ai-support-mode-switch ai-support-hidden">
              <span>🤖 Currently chatting with AI</span>
              <button class="ai-support-human-btn">Talk to Human Agent</button>
            </div>
            <div class="ai-support-input-area">
              <textarea class="ai-support-input" placeholder="Type your message..." rows="1"></textarea>
              <button class="ai-support-send">Send</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    },
    
    attachEventListeners: function() {
      const bubble = document.querySelector('.ai-support-bubble');
      const window = document.querySelector('.ai-support-window');
      const closeBtn = document.querySelector('.ai-support-close');
      const authBtn = document.querySelector('.ai-support-auth-btn');
      const sendBtn = document.querySelector('.ai-support-send');
      const input = document.querySelector('.ai-support-input');
      const humanBtn = document.querySelector('.ai-support-human-btn');
      
      bubble.onclick = () => {
        window.classList.toggle('open');
        if (this.currentUser) {
          document.querySelector('.ai-support-auth').classList.add('ai-support-hidden');
          document.querySelector('.ai-support-chat').classList.remove('ai-support-hidden');
        }
      };
      
      closeBtn.onclick = () => window.classList.remove('open');
      
      authBtn.onclick = () => this.handleAuth();
      
      sendBtn.onclick = () => this.sendMessage();
      
      input.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      };
      
      input.oninput = () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      };
      
      humanBtn.onclick = () => this.switchToHuman();
    },
    
    handleAuth: function() {
      const name = document.querySelector('.ai-support-name').value.trim();
      const email = document.querySelector('.ai-support-email').value.trim();
      
      if (!name || !email) {
        alert('Please enter your name and email');
        return;
      }
      
      this.currentUser = { name, email };
      this.sessionId = Date.now().toString();
      this.saveSession();
      
      document.querySelector('.ai-support-auth').classList.add('ai-support-hidden');
      document.querySelector('.ai-support-chat').classList.remove('ai-support-hidden');
      document.querySelector('.ai-support-mode-switch').classList.remove('ai-support-hidden');
      
      this.addMessage('bot', `Hi ${name}! 👋 I'm your AI assistant. How can I help you today?`);
      this.updateStatus();
    },
    
    sendMessage: async function() {
      const input = document.querySelector('.ai-support-input');
      const message = input.value.trim();
      
      if (!message || this.isTyping) return;
      
      this.addMessage('user', message);
      input.value = '';
      input.style.height = 'auto';
      
      this.showTyping();
      
      try {
        const response = await fetch(this.config.apiUrl + '/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            message: message,
            customerName: this.currentUser.name,
            customerEmail: this.currentUser.email,
            mode: this.chatMode
          })
        });
        
        const data = await response.json();
        
        this.hideTyping();
        
        const sender = this.chatMode === 'ai' ? 'bot' : 'agent';
        this.addMessage(sender, data.response || 'Thank you for your message. We\'ll get back to you shortly.');
        
        if (this.chatMode === 'ai' && data.confidence && data.confidence < 0.7) {
          setTimeout(() => {
            this.addMessage('bot', "I'm not entirely sure about this. Would you like to speak with a human agent?");
          }, 1000);
        }
      } catch (error) {
        this.hideTyping();
        this.addMessage('bot', 'Sorry, I\'m having trouble connecting. Please try again.');
      }
    },
    
    switchToHuman: function() {
      this.chatMode = 'human';
      const modeSwitch = document.querySelector('.ai-support-mode-switch');
      modeSwitch.innerHTML = '<span>👤 Connected to human agent</span>';
      this.addMessage('bot', '✓ Connecting you to a human agent. Please wait...');
      this.updateStatus();
      
      setTimeout(() => {
        this.addMessage('agent', `Hi ${this.currentUser.name}, I'm here to help! What can I assist you with?`);
      }, 2000);
    },
    
    addMessage: function(sender, text) {
      const messagesDiv = document.querySelector('.ai-support-messages');
      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-support-message ${sender}`;
      
      const senderLabel = sender === 'user' ? 'You' : sender === 'agent' ? 'Support Agent' : 'AI Assistant';
      
      messageDiv.innerHTML = `
        <div class="ai-support-message-sender">${senderLabel}</div>
        <div class="ai-support-message-bubble">${text}</div>
      `;
      
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },
    
    showTyping: function() {
      this.isTyping = true;
      document.querySelector('.ai-support-send').disabled = true;
      
      const messagesDiv = document.querySelector('.ai-support-messages');
      const typingDiv = document.createElement('div');
      typingDiv.className = 'ai-support-message bot';
      typingDiv.id = 'ai-support-typing';
      typingDiv.innerHTML = `
        <div class="ai-support-typing">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      
      messagesDiv.appendChild(typingDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },
    
    hideTyping: function() {
      this.isTyping = false;
      document.querySelector('.ai-support-send').disabled = false;
      
      const typingDiv = document.getElementById('ai-support-typing');
      if (typingDiv) typingDiv.remove();
    },
    
    updateStatus: function() {
      const status = document.querySelector('.ai-support-status');
      status.textContent = this.chatMode === 'ai' ? '🤖 AI Assistant' : '👤 Human Agent';
    }
  };
  
  window.AISupportWidget = AISupportWidget;
})();
