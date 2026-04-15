// ============================================
// SEPARATE CHAT MODULE - No conflicts with existing admin.js
// ============================================
// This file works independently and does not modify any existing functions
// Save as: admin-chat.js
// Include after admin.js: <script src="admin-chat.js"></script>
// ============================================

(function() {
    'use strict';
    
    // Use different variable names to avoid conflicts
    const CHAT_SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
    const CHAT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';
    
    let chatSupabase = null;
    let chatCurrentUser = null;
    let chatCurrentType = null;
    let chatCurrentName = null;
    let chatRefreshInterval = null;
    let chatInitialized = false;
    
    // DOM Elements
    let chatUsersListEl = null;
    let chatMessagesAreaEl = null;
    let chatHeaderPlaceholderEl = null;
    let chatInputAreaEl = null;
    let chatMessageInputEl = null;
    let sendChatBtnEl = null;
    let chatSearchEl = null;
    let chatUnreadBadgeEl = null;
    
    // Helper function to get investors and buyers from global variables
    function getInvestorsAndBuyers() {
        // Access global variables set by admin.js
        const investors = (typeof window.allInvestors !== 'undefined') ? window.allInvestors : [];
        const buyers = (typeof window.allBuyers !== 'undefined') ? window.allBuyers : [];
        return { investors, buyers };
    }
    
    // Escape HTML
    function chatEscapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Show toast notification (reuse existing or create own)
    function chatShowNotification(message, isError = false) {
        // Try to use existing showNotification if available
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
    
    // Load chat contacts (buyers and investors with messages)
    async function chatLoadContacts() {
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
            if (chatUnreadBadgeEl) {
                if (totalUnread > 0) {
                    chatUnreadBadgeEl.style.display = 'inline-block';
                    chatUnreadBadgeEl.innerText = totalUnread;
                } else {
                    chatUnreadBadgeEl.style.display = 'none';
                }
            }
            
            // Render contacts
            chatRenderContactsList(contactsArray);
            
        } catch (err) {
            console.error('[Chat] Error loading contacts:', err);
        }
    }
    
    function chatRenderContactsList(contacts) {
        if (!chatUsersListEl) return;
        
        if (contacts.length === 0) {
            chatUsersListEl.innerHTML = '<div class="empty-state">No contacts found</div>';
            return;
        }
        
        let html = '';
        for (const contact of contacts) {
            const isActive = (chatCurrentUser === contact.id && chatCurrentType === contact.type);
            const activeClass = isActive ? 'active' : '';
            
            html += `
                <div class="chat-user-item ${activeClass}" data-chat-id="${contact.id}" data-chat-type="${contact.type}" data-chat-name="${chatEscapeHtml(contact.name)}">
                    <div class="user-avatar">${contact.name ? contact.name.charAt(0).toUpperCase() : '?'}</div>
                    <div class="user-info">
                        <div class="user-name">${chatEscapeHtml(contact.name)} <span class="user-type">(${contact.type === 'buyer' ? 'Customer' : 'Investor'})</span></div>
                        <div class="user-last-msg">${chatEscapeHtml(contact.lastMsg)}</div>
                    </div>
                    ${contact.unread > 0 ? `<div class="unread-badge">${contact.unread}</div>` : ''}
                </div>
            `;
        }
        
        chatUsersListEl.innerHTML = html;
        
        // Attach click events
        const items = chatUsersListEl.querySelectorAll('.chat-user-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.chatId;
                const userType = item.dataset.chatType;
                const userName = item.dataset.chatName;
                chatSelectContact(userId, userType, userName);
            });
        });
        
        // Search functionality
        if (chatSearchEl) {
            const originalContacts = [...contacts];
            chatSearchEl.oninput = function() {
                const term = this.value.toLowerCase();
                const filtered = originalContacts.filter(c => c.name.toLowerCase().includes(term));
                chatRenderContactsList(filtered);
            };
        }
    }
    
    async function chatSelectContact(userId, userType, userName) {
        chatCurrentUser = userId;
        chatCurrentType = userType;
        chatCurrentName = userName;
        
        if (chatHeaderPlaceholderEl) {
            chatHeaderPlaceholderEl.innerHTML = `
                <div class="user-avatar" style="width:45px;height:45px;">${userName ? userName.charAt(0).toUpperCase() : '?'}</div>
                <div>
                    <div class="user-name">${chatEscapeHtml(userName)}</div>
                    <div class="user-type">${userType === 'buyer' ? 'Customer' : 'Investor'}</div>
                </div>
            `;
        }
        
        if (chatInputAreaEl) {
            chatInputAreaEl.style.display = 'flex';
        }
        
        await chatLoadConversation(userId, userType);
        
        // Mark messages as read
        if (chatSupabase) {
            await chatSupabase
                .from('contact_messages')
                .update({ is_admin_read: true })
                .eq('buyer_id', userId)
                .eq('receiver_type', 'admin');
        }
        
        await chatLoadContacts();
    }
    
    async function chatLoadConversation(userId, userType) {
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
            chatRenderMessages(uniqueMessages);
            
        } catch (err) {
            console.error('[Chat] Error loading conversation:', err);
        }
    }
    
    function chatRenderMessages(messages) {
        if (!chatMessagesAreaEl) return;
        
        if (messages.length === 0) {
            chatMessagesAreaEl.innerHTML = '<div class="empty-chat"><i class="fas fa-comment"></i><p>No messages yet. Send a message to start conversation.</p></div>';
            return;
        }
        
        let html = '';
        for (const msg of messages) {
            const isSent = msg.sender_type === 'admin';
            const bubbleClass = isSent ? 'message-sent' : 'message-received';
            const time = new Date(msg.created_at).toLocaleString();
            
            html += `
                <div class="message-bubble ${bubbleClass}">
                    ${chatEscapeHtml(msg.message)}
                    <div class="message-time">${time}</div>
                </div>
            `;
        }
        
        chatMessagesAreaEl.innerHTML = html;
        chatMessagesAreaEl.scrollTop = chatMessagesAreaEl.scrollHeight;
    }
    
    async function chatSendMessage() {
        if (!chatSupabase) {
            chatShowNotification('Chat not initialized', true);
            return;
        }
        
        if (!chatCurrentUser) {
            chatShowNotification('Please select a contact first', true);
            return;
        }
        
        const message = chatMessageInputEl ? chatMessageInputEl.value.trim() : '';
        if (!message) {
            chatShowNotification('Please enter a message', true);
            return;
        }
        
        const newMessage = {
            id: crypto.randomUUID(),
            buyer_id: chatCurrentType === 'buyer' ? chatCurrentUser : null,
            user_id: chatCurrentType !== 'buyer' ? chatCurrentUser : null,
            user_type: chatCurrentType,
            sender_type: 'admin',
            receiver_type: chatCurrentType,
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
            
            if (chatMessageInputEl) chatMessageInputEl.value = '';
            
            await chatLoadConversation(chatCurrentUser, chatCurrentType);
            await chatLoadContacts();
            
            chatShowNotification(`Message sent to ${chatCurrentName} from Sohrab Industries Support`, false);
            
        } catch (err) {
            console.error('[Chat] Error sending message:', err);
            chatShowNotification('Error sending message: ' + err.message, true);
        }
    }
    
    function chatSetupRealtime() {
        if (!chatSupabase) return;
        
        chatSupabase
            .channel('admin-chat-channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'contact_messages'
            }, (payload) => {
                chatLoadContacts();
                if (chatCurrentUser) {
                    const newMsg = payload.new;
                    if (newMsg && (newMsg.buyer_id === chatCurrentUser || newMsg.user_id === chatCurrentUser)) {
                        chatLoadConversation(chatCurrentUser, chatCurrentType);
                    }
                }
            })
            .subscribe();
    }
    
    function chatGetElements() {
        chatUsersListEl = document.getElementById('chatUsersList');
        chatMessagesAreaEl = document.getElementById('chatMessagesArea');
        chatHeaderPlaceholderEl = document.getElementById('chatHeaderPlaceholder');
        chatInputAreaEl = document.getElementById('chatInputArea');
        chatMessageInputEl = document.getElementById('chatMessageInput');
        sendChatBtnEl = document.getElementById('sendChatBtn');
        chatSearchEl = document.getElementById('chatSearch');
        chatUnreadBadgeEl = document.getElementById('chatUnreadBadge');
    }
    
    function chatAttachEvents() {
        if (sendChatBtnEl) {
            sendChatBtnEl.addEventListener('click', chatSendMessage);
        }
        
        if (chatMessageInputEl) {
            chatMessageInputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    chatSendMessage();
                }
            });
        }
    }
    
    function chatStartPeriodicRefresh() {
        if (chatRefreshInterval) clearInterval(chatRefreshInterval);
        chatRefreshInterval = setInterval(() => {
            const chatSection = document.getElementById('chatSection');
            if (chatSection && chatSection.classList.contains('active')) {
                chatLoadContacts();
            }
        }, 5000);
    }
    
    // Check if chat section exists in the page
    function chatSectionExists() {
        return document.getElementById('chatSection') !== null;
    }
    
    // Override showSection to also handle chat loading
    const originalShowSection = window.showSection;
    if (typeof originalShowSection === 'function') {
        window.showSection = function(section) {
            originalShowSection(section);
            if (section === 'chat') {
                setTimeout(() => {
                    chatLoadContacts();
                }, 100);
            }
        };
    }
    
    // Initialize chat module
    function chatInit() {
        if (chatInitialized) return;
        
        // Check if chat section exists in DOM
        if (!chatSectionExists()) {
            console.log('[Chat] Chat section not found in DOM, skipping initialization');
            return;
        }
        
        chatGetElements();
        
        if (!initChatSupabase()) {
            console.error('[Chat] Failed to initialize Supabase');
            return;
        }
        
        chatAttachEvents();
        chatSetupRealtime();
        chatStartPeriodicRefresh();
        
        // Initial load after a short delay to ensure main data is loaded
        setTimeout(() => {
            chatLoadContacts();
        }, 1000);
        
        chatInitialized = true;
        console.log('[Chat] Chat module initialized successfully');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', chatInit);
    } else {
        setTimeout(chatInit, 500);
    }
    
    // Also try to initialize when window loads (ensures all scripts are loaded)
    window.addEventListener('load', function() {
        if (!chatInitialized && chatSectionExists()) {
            setTimeout(chatInit, 500);
        }
    });
    
})();
