// ============================================
// ADMIN CHAT SYSTEM - Standalone Module
// ============================================
// This file handles all chat functionality for the admin panel
// Save as: admin-chat.js
// Include in HTML after admin.js: <script src="admin-chat.js"></script>
// ============================================

(function() {
    'use strict';
    
    // Configuration
    const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';
    
    // State variables
    let supabaseChat = null;
    let currentChatUser = null;
    let currentChatType = null;
    let currentChatName = null;
    let allInvestors = [];
    let allBuyers = [];
    let chatInitialized = false;
    let refreshInterval = null;
    
    // DOM Elements
    let chatUsersList, chatMessagesArea, chatHeaderPlaceholder, chatInputArea;
    let chatMessageInput, sendChatBtn, chatSearch, chatUnreadBadge;
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type === 'success' ? 'success' : 'error'}`;
        toast.innerHTML = type === 'success' ? `✅ ${message}` : `❌ ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // ============================================
    // DATA LOADING FUNCTIONS
    // ============================================
    
    function loadInvestorsAndBuyers() {
        // Try to get data from global variables (set by main admin.js)
        if (typeof window.allInvestors !== 'undefined' && window.allInvestors) {
            allInvestors = window.allInvestors;
        }
        if (typeof window.allBuyers !== 'undefined' && window.allBuyers) {
            allBuyers = window.allBuyers;
        }
        
        // If not available, fetch directly from Supabase
        if (allInvestors.length === 0 || allBuyers.length === 0) {
            const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
            if (supabase) {
                Promise.all([
                    supabase.from('investors').select('*'),
                    supabase.from('buyers').select('*')
                ]).then(([investorsRes, buyersRes]) => {
                    if (investorsRes.data) allInvestors = investorsRes.data;
                    if (buyersRes.data) allBuyers = buyersRes.data;
                    loadChatContacts();
                }).catch(err => console.error('Error fetching users:', err));
            }
        }
    }
    
    // ============================================
    // CHAT CONTACTS LIST
    // ============================================
    
    async function loadChatContacts() {
        if (!supabaseChat) return;
        
        try {
            // Get all messages
            const { data: messages, error } = await supabaseChat
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Build contacts map from investors and buyers
            const contactsMap = new Map();
            
            // Add all buyers
            allBuyers.forEach(buyer => {
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
            allInvestors.forEach(investor => {
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
            
            // Update with actual message data
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
                            
                            // Count unread messages (received by admin, not read)
                            if (msg.receiver_type === 'admin' && !msg.is_admin_read) {
                                contact.unread = (contact.unread || 0) + 1;
                            }
                            contactsMap.set(key, contact);
                        }
                    }
                }
            }
            
            // Convert to array and sort by latest message
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
            
            // Render contacts list
            renderContactsList(contactsArray);
            
        } catch (err) {
            console.error('Error loading chat contacts:', err);
            if (chatUsersList) {
                chatUsersList.innerHTML = '<div class="empty-state">Error loading contacts. Please refresh.</div>';
            }
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
                <div class="chat-user-item ${activeClass}" data-user-id="${contact.id}" data-user-type="${contact.type}" data-user-name="${escapeHtml(contact.name)}">
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
        
        // Attach click events to contact items
        const contactItems = chatUsersList.querySelectorAll('.chat-user-item');
        contactItems.forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                const userType = item.dataset.userType;
                const userName = item.dataset.userName;
                selectChatContact(userId, userType, userName);
            });
        });
        
        // Setup search functionality
        if (chatSearch) {
            const originalContacts = [...contacts];
            chatSearch.oninput = function() {
                const term = this.value.toLowerCase();
                const filtered = originalContacts.filter(c => c.name.toLowerCase().includes(term));
                renderContactsList(filtered);
            };
        }
    }
    
    // ============================================
    // CONVERSATION FUNCTIONS
    // ============================================
    
    async function selectChatContact(userId, userType, userName) {
        currentChatUser = userId;
        currentChatType = userType;
        currentChatName = userName;
        
        // Update header
        if (chatHeaderPlaceholder) {
            chatHeaderPlaceholder.innerHTML = `
                <div class="user-avatar" style="width:45px;height:45px;">${userName ? userName.charAt(0).toUpperCase() : '?'}</div>
                <div>
                    <div class="user-name">${escapeHtml(userName)}</div>
                    <div class="user-type">${userType === 'buyer' ? 'Customer' : 'Investor'}</div>
                </div>
            `;
        }
        
        // Show input area
        if (chatInputArea) {
            chatInputArea.style.display = 'flex';
        }
        
        // Load conversation
        await loadConversation(userId, userType);
        
        // Mark messages as read
        await supabaseChat
            .from('contact_messages')
            .update({ is_admin_read: true })
            .eq('buyer_id', userId)
            .eq('receiver_type', 'admin');
        
        // Refresh contacts to update unread counts
        await loadChatContacts();
    }
    
    async function loadConversation(userId, userType) {
        if (!supabaseChat) return;
        
        try {
            // Get messages where buyer_id matches (for buyers)
            const { data: messages1 } = await supabaseChat
                .from('contact_messages')
                .select('*')
                .eq('buyer_id', userId)
                .order('created_at', { ascending: true });
            
            // Get messages where user_id matches (for investors)
            const { data: messages2 } = await supabaseChat
                .from('contact_messages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });
            
            // Combine and deduplicate messages
            let allMessages = [...(messages1 || []), ...(messages2 || [])];
            const uniqueMessages = [];
            const seenIds = new Set();
            
            for (const msg of allMessages) {
                if (!seenIds.has(msg.id)) {
                    seenIds.add(msg.id);
                    uniqueMessages.push(msg);
                }
            }
            
            // Sort by creation time
            uniqueMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            // Render messages
            renderMessages(uniqueMessages);
            
        } catch (err) {
            console.error('Error loading conversation:', err);
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
                <div class="message-bubble ${bubbleClass}" data-msg-id="${msg.id}">
                    ${escapeHtml(msg.message)}
                    <div class="message-time">${time}</div>
                </div>
            `;
        }
        
        chatMessagesArea.innerHTML = html;
        
        // Scroll to bottom
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }
    
    // ============================================
    // SEND MESSAGE FUNCTION
    // ============================================
    
    async function sendMessage() {
        if (!supabaseChat) {
            showToast('Chat not initialized', 'error');
            return;
        }
        
        if (!currentChatUser) {
            showToast('Please select a contact first', 'error');
            return;
        }
        
        const message = chatMessageInput ? chatMessageInput.value.trim() : '';
        if (!message) {
            showToast('Please enter a message', 'error');
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
            const { error } = await supabaseChat
                .from('contact_messages')
                .insert([newMessage]);
            
            if (error) throw error;
            
            // Clear input
            if (chatMessageInput) chatMessageInput.value = '';
            
            // Reload conversation
            await loadConversation(currentChatUser, currentChatType);
            
            // Refresh contacts list
            await loadChatContacts();
            
            showToast(`Message sent to ${currentChatName} from Sohrab Industries Support`, 'success');
            
        } catch (err) {
            console.error('Error sending message:', err);
            showToast('Error sending message: ' + err.message, 'error');
        }
    }
    
    // ============================================
    // REAL-TIME SUBSCRIPTION
    // ============================================
    
    function setupRealtimeSubscription() {
        if (!supabaseChat) return;
        
        const channel = supabaseChat
            .channel('admin-chat')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'contact_messages'
            }, (payload) => {
                // Refresh contacts list
                loadChatContacts();
                
                // If the current conversation is affected, reload it
                if (currentChatUser) {
                    const newMsg = payload.new;
                    if (newMsg && (newMsg.buyer_id === currentChatUser || newMsg.user_id === currentChatUser)) {
                        loadConversation(currentChatUser, currentChatType);
                    }
                }
            })
            .subscribe();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
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
    
    function initSupabase() {
        if (typeof supabase !== 'undefined') {
            supabaseChat = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return true;
        } else {
            console.error('Supabase library not loaded');
            return false;
        }
    }
    
    function startPeriodicRefresh() {
        // Refresh contacts every 5 seconds as fallback for real-time
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (document.getElementById('chatSection') && 
                document.getElementById('chatSection').classList.contains('active')) {
                loadChatContacts();
            }
        }, 5000);
    }
    
    function init() {
        if (chatInitialized) return;
        
        // Get DOM elements
        getDOMElements();
        
        // Initialize Supabase
        if (!initSupabase()) return;
        
        // Attach event listeners
        attachEventListeners();
        
        // Load initial data
        loadInvestorsAndBuyers();
        
        // Setup real-time subscription
        setupRealtimeSubscription();
        
        // Start periodic refresh
        startPeriodicRefresh();
        
        chatInitialized = true;
        console.log('Chat system initialized');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // If DOM is already loaded, wait a bit for main data to be available
        setTimeout(init, 500);
    }
    
    // Also try to initialize when main data might be loaded
    setTimeout(() => {
        if (!chatInitialized) {
            loadInvestorsAndBuyers();
            if (supabaseChat) {
                loadChatContacts();
                setupRealtimeSubscription();
            }
        }
    }, 2000);
    
    // Expose some functions globally for debugging if needed
    window.chatSystem = {
        refreshContacts: loadChatContacts,
        sendMessage: sendMessage,
        getCurrentUser: () => ({ id: currentChatUser, type: currentChatType, name: currentChatName })
    };
    
})();
