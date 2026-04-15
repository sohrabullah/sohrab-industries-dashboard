// ============================================
// SEPARATE CHAT MODULE - NO CONFLICTS
// Works with your existing admin.js
// Save as: admin-chat.js
// ============================================

(function() {
    'use strict';
    
    // Chat configuration
    const CHAT_SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
    const CHAT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';
    
    let chatSupabase = null;
    let currentChatUser = null;
    let currentChatType = null;
    let currentChatName = null;
    let chatInitialized = false;
    let refreshInterval = null;
    
    // DOM Elements
    let chatUsersList = null;
    let chatMessagesArea = null;
    let chatHeaderPlaceholder = null;
    let chatInputArea = null;
    let chatMessageInput = null;
    let sendChatBtn = null;
    let chatSearch = null;
    let chatUnreadBadge = null;
    
    // Helper to get investors and buyers from global variables
    function getInvestorsAndBuyers() {
        const investors = (typeof window.allInvestors !== 'undefined') ? window.allInvestors : [];
        const buyers = (typeof window.allBuyers !== 'undefined') ? window.allBuyers : [];
        return { investors, buyers };
    }
    
    // Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Show notification (reuse existing function if available)
    function showChatNotification(message, isError) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, isError);
        } else {
            const toast = document.createElement('div');
            toast.className = `toast-notification ${isError ? 'toast-error' : 'toast-success'}`;
            toast.innerHTML = isError ? `⚠️ ${message}` : `✨ ${message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
    
    // Initialize Supabase for chat
    function initChatSupabase() {
        if (typeof supabase === 'undefined') {
            console.error('[Chat] Supabase not loaded');
            return false;
        }
        chatSupabase = supabase.createClient(CHAT_SUPABASE_URL, CHAT_SUPABASE_ANON_KEY);
        return true;
    }
    
    // Load chat contacts
    async function loadChatContacts() {
        if (!chatSupabase) return;
        
        try {
            const { investors, buyers } = getInvestorsAndBuyers();
            
            const { data: messages, error } = await chatSupabase
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Build contacts map
            const contactsMap = new Map();
            
            // Add all buyers
            buyers.forEach(buyer => {
                contactsMap.set(`buyer_${buyer.id}`, {
                    id: buyer.id,
                    type: 'buyer',
                    name: buyer.full_name || 'Unknown',
                    email: buyer.email,
                    lastMsg: 'Click to message',
                    unread: 0,
                    timestamp: null
                });
            });
            
            // Add all investors
            investors.forEach(investor => {
                contactsMap.set(`investor_${investor.id}`, {
                    id: investor.id,
                    type: 'investor',
                    name: investor.full_name || 'Unknown',
                    email: investor.email,
                    lastMsg: 'Click to message',
                    unread: 0,
                    timestamp: null
                });
            });
            
            // Update with message data
            if (messages && messages.length > 0) {
                for (const msg of messages) {
                    let contactId = msg.buyer_id || msg.user_id;
                    let contactType = msg.user_type || (msg.buyer_id ? 'buyer' : 'investor');
                    
                    if (contactId && contactType) {
                        const key = `${contactType}_${contactId}`;
                        if (contactsMap.has(key)) {
                            const contact = contactsMap.get(key);
                            contact.lastMsg = msg.message ? msg.message.substring(0, 40) : '';
                            contact.timestamp = msg.created_at;
                            
                            if (msg.receiver_type === 'admin' && !msg.is_admin_read) {
                                contact.unread = (contact.unread || 0) + 1;
                            }
                            contactsMap.set(key, contact);
                        }
                    }
                }
            }
            
            // Convert to array and sort
            let contactsArray = Array.from(contactsMap.values());
            contactsArray.sort((a, b) => {
                if (!a.timestamp && !b.timestamp) return 0;
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            // Update unread badge
            const totalUnread = contactsArray.reduce((sum, c) => sum + (c.unread || 0), 0);
            if (chatUnreadBadge) {
                if (totalUnread > 0) {
                    chatUnreadBadge.style.display = 'inline-block';
                    chatUnreadBadge.innerText = totalUnread;
                } else {
                    chatUnreadBadge.style.display = 'none';
                }
            }
            
            // Render contacts
            renderContactsList(contactsArray);
            
        } catch (err) {
            console.error('[Chat] Error loading contacts:', err);
        }
    }
    
    function renderContactsList(contacts) {
        if (!chatUsersList) return;
        
        if (contacts.length === 0) {
            chatUsersList.innerHTML = '<div class="empty-state">No contacts found</div>';
            return;
        }
        
        let html = '';
        for (const contact of contacts) {
            const isActive = (currentChatUser === contact.id && currentChatType === contact.type);
            const activeClass = isActive ? 'active' : '';
            
            html += `
                <div class="chat-user-item ${activeClass}" data-chat-id="${contact.id}" data-chat-type="${contact.type}" data-chat-name="${escapeHtml(contact.name)}">
                    <div class="user-avatar">${contact.name ? contact.name.charAt(0).toUpperCase() : '?'}</div>
                    <div class="user-info">
                        <div class="user-name">${escapeHtml(contact.name)} <span class="user-type">(${contact.type === 'buyer' ? 'Customer' : 'Investor'})</span></div>
                        <div class="user-last-msg">${escapeHtml(contact.lastMsg)}</div>
                    </div>
                    ${contact.unread > 0 ? `<div class="unread-badge">${contact.unread}</div>` : ''}
                </div>
            `;
        }
        
        chatUsersList.innerHTML = html;
        
        // Attach click events
        const items = chatUsersList.querySelectorAll('.chat-user-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.chatId;
                const userType = item.dataset.chatType;
                const userName = item.dataset.chatName;
                selectChatContact(userId, userType, userName);
            });
        });
        
        // Search functionality
        if (chatSearch) {
            const originalContacts = [...contacts];
            chatSearch.oninput = function() {
                const term = this.value.toLowerCase();
                const filtered = originalContacts.filter(c => c.name.toLowerCase().includes(term));
                renderContactsList(filtered);
            };
        }
    }
    
    async function selectChatContact(userId, userType, userName) {
        currentChatUser = userId;
        currentChatType = userType;
        currentChatName = userName;
        
        if (chatHeaderPlaceholder) {
            chatHeaderPlaceholder.innerHTML = `
                <div class="user-avatar" style="width:45px;height:45px;">${userName ? userName.charAt(0).toUpperCase() : '?'}</div>
                <div>
                    <div class="user-name">${escapeHtml(userName)}</div>
                    <div class="user-type">${userType === 'buyer' ? 'Customer' : 'Investor'}</div>
                </div>
            `;
        }
        
        if (chatInputArea) {
            chatInputArea.style.display = 'flex';
        }
        
        await loadConversation(userId, userType);
        
        // Mark messages as read
        if (chatSupabase) {
            await chatSupabase
                .from('contact_messages')
                .update({ is_admin_read: true })
                .eq('buyer_id', userId)
                .eq('receiver_type', 'admin');
        }
        
        await loadChatContacts();
    }
    
    async function loadConversation(userId, userType) {
        if (!chatSupabase) return;
        
        try {
            const { data: messages1 } = await chatSupabase
                .from('contact_messages')
                .select('*')
                .eq('buyer_id', userId)
                .order('created_at', { ascending: true });
            
            const { data: messages2 } = await chatSupabase
                .from('contact_messages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });
            
            let allMessages = [...(messages1 || []), ...(messages2 || [])];
            const uniqueMessages = [];
            const seenIds = new Set();
            
            for (const msg of allMessages) {
                if (!seenIds.has(msg.id)) {
                    seenIds.add(msg.id);
                    uniqueMessages.push(msg);
                }
            }
            
            uniqueMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            renderMessages(uniqueMessages);
            
        } catch (err) {
            console.error('[Chat] Error loading conversation:', err);
            if (chatMessagesArea) {
                chatMessagesArea.innerHTML = '<div class="empty-chat"><i class="fas fa-exclamation-triangle"></i><p>Error loading messages</p></div>';
            }
        }
    }
    
    function renderMessages(messages) {
        if (!chatMessagesArea) return;
        
        if (messages.length === 0) {
            chatMessagesArea.innerHTML = '<div class="empty-chat"><i class="fas fa-comment"></i><p>No messages yet. Send a message to start conversation.</p></div>';
            return;
        }
        
        let html = '';
        for (const msg of messages) {
            const isSent = msg.sender_type === 'admin';
            const bubbleClass = isSent ? 'message-sent' : 'message-received';
            const time = new Date(msg.created_at).toLocaleString();
            
            html += `
                <div class="message-bubble ${bubbleClass}">
                    ${escapeHtml(msg.message)}
                    <div class="message-time">${time}</div>
                </div>
            `;
        }
        
        chatMessagesArea.innerHTML = html;
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }
    
    async function sendMessage() {
        if (!chatSupabase) {
            showChatNotification('Chat not initialized', true);
            return;
        }
        
        if (!currentChatUser) {
            showChatNotification('Please select a contact first', true);
            return;
        }
        
        const message = chatMessageInput ? chatMessageInput.value.trim() : '';
        if (!message) {
            showChatNotification('Please enter a message', true);
            return;
        }
        
        const newMessage = {
            id: crypto.randomUUID(),
            buyer_id: currentChatType === 'buyer' ? currentChatUser : null,
            user_id: currentChatType !== 'buyer' ? currentChatUser : null,
            user_type: currentChatType,
            sender_type: 'admin',
            receiver_type: currentChatType,
            message: message,
            created_at: new Date().toISOString(),
            is_admin_read: true,
            status: 'sent'
        };
        
        try {
            const { error } = await chatSupabase
                .from('contact_messages')
                .insert([newMessage]);
            
            if (error) throw error;
            
            if (chatMessageInput) chatMessageInput.value = '';
            
            await loadConversation(currentChatUser, currentChatType);
            await loadChatContacts();
            
            showChatNotification(`Message sent to ${currentChatName} from Sohrab Industries Support`, false);
            
        } catch (err) {
            console.error('[Chat] Error sending message:', err);
            showChatNotification('Error sending message: ' + err.message, true);
        }
    }
    
    function setupRealtimeSubscription() {
        if (!chatSupabase) return;
        
        chatSupabase
            .channel('admin-chat-channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'contact_messages'
            }, (payload) => {
                loadChatContacts();
                if (currentChatUser) {
                    const newMsg = payload.new;
                    if (newMsg && (newMsg.buyer_id === currentChatUser || newMsg.user_id === currentChatUser)) {
                        loadConversation(currentChatUser, currentChatType);
                    }
                }
            })
            .subscribe();
    }
    
    function startPeriodicRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            const chatSection = document.getElementById('chatSection');
            if (chatSection && chatSection.classList.contains('active')) {
                loadChatContacts();
            }
        }, 5000);
    }
    
    function getDOMElements() {
        chatUsersList = document.getElementById('chatUsersList');
        chatMessagesArea = document.getElementById('chatMessagesArea');
        chatHeaderPlaceholder = document.getElementById('chatHeaderPlaceholder');
        chatInputArea = document.getElementById('chatInputArea');
        chatMessageInput = document.getElementById('chatMessageInput');
        sendChatBtn = document.getElementById('sendChatBtn');
        chatSearch = document.getElementById('chatSearch');
        chatUnreadBadge = document.getElementById('chatUnreadBadge');
    }
    
    function attachEventListeners() {
        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', sendMessage);
        }
        
        if (chatMessageInput) {
            chatMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
    }
    
    // Check if chat section exists
    function chatSectionExists() {
        return document.getElementById('chatSection') !== null;
    }
    
    // Initialize chat module
    function initChat() {
        if (chatInitialized) return;
        
        if (!chatSectionExists()) {
            console.log('[Chat] Chat section not found, skipping initialization');
            return;
        }
        
        getDOMElements();
        
        if (!initChatSupabase()) {
            console.error('[Chat] Failed to initialize Supabase');
            return;
        }
        
        attachEventListeners();
        setupRealtimeSubscription();
        startPeriodicRefresh();
        
        // Initial load after a delay to ensure main data is loaded
        setTimeout(() => {
            loadChatContacts();
        }, 1500);
        
        chatInitialized = true;
        console.log('[Chat] Chat module initialized successfully');
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        setTimeout(initChat, 500);
    }
    
    // Also try when window loads
    window.addEventListener('load', function() {
        if (!chatInitialized && chatSectionExists()) {
            setTimeout(initChat, 300);
        }
    });
    
})();
