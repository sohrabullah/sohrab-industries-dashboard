// ============================================
// SOHRAB INDUSTRIES - MASTER SCRIPT
// FULLY FUNCTIONING WITH ALL FIXES
// ============================================

const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentUserType = null;

// Toast Notification
function showNotification(message, isError = false, duration = 3000) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = isError ? `❌ ${message}` : `✅ ${message}`;
    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        padding: 12px 24px; border-radius: 40px; color: white; font-weight: 500;
        z-index: 10000; font-family: 'Inter', sans-serif; text-align: center;
        background: ${isError ? '#dc3545' : '#28a745'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
}

// Check Authentication
async function checkAuth(requiredUserType = null) {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.includes('investor-auth.html') &&
                !window.location.pathname.includes('buyer-auth.html') &&
                !window.location.pathname.includes('admin-auth.html')) {
                window.location.href = 'index.html';
            }
            return null;
        }
        
        currentUser = user;
        const adminEmails = ['admin@sohrab.com', 'sohrabullahkn687@gmail.com'];
        
        if (adminEmails.includes(user.email)) {
            currentUserType = 'admin';
        } else {
            const { data: investor } = await supabase.from('investors').select('id').eq('id', user.id).single();
            currentUserType = investor ? 'investor' : 'buyer';
        }
        
        // Update UI elements
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) userNameSpan.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email.split('@')[0]}`;
        
        const adminEmailSpan = document.getElementById('adminEmail');
        if (adminEmailSpan) adminEmailSpan.innerHTML = `<i class="fas fa-user-shield"></i> ${user.email}`;
        
        return user;
    } catch (error) {
        console.error('Auth error:', error);
        return null;
    }
}

// Logout
async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    showNotification('Logged out successfully!', false);
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
}

// Format Currency
function formatCurrency(amount) {
    return `Rs. ${(amount || 0).toLocaleString()}`;
}

// ============================================
// INVESTOR FUNCTIONS
// ============================================
async function loadInvestments(investorId) {
    const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('investor_id', investorId)
        .order('investment_date', { ascending: false });
    if (error) return [];
    return data || [];
}

async function loadProfits(investorId) {
    const { data, error } = await supabase
        .from('profits')
        .select('*')
        .eq('investor_id', investorId)
        .order('month', { ascending: false });
    if (error) return [];
    return data || [];
}

async function loadWithdrawals(investorId) {
    const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('investor_id', investorId)
        .order('request_date', { ascending: false });
    if (error) return [];
    return data || [];
}

async function requestWithdrawal(investorId, amount, paymentMethod, accountDetails) {
    const { error } = await supabase.from('withdrawals').insert([{
        investor_id: investorId,
        amount: parseFloat(amount),
        request_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        payment_method: paymentMethod,
        notes: accountDetails
    }]);
    if (error) { showNotification(error.message, true); return false; }
    showNotification('Withdrawal request submitted!', false);
    return true;
}

// ============================================
// BUYER FUNCTIONS
// ============================================
async function loadProducts(category = null) {
    let query = supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (category && category !== 'all') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) return [];
    return data || [];
}

async function loadBuyerOrders(buyerId) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', buyerId)
        .eq('user_type', 'buyer')
        .order('order_date', { ascending: false });
    if (error) return [];
    return data || [];
}

async function placeOrder(buyerId, cartItems, address, paymentMethod) {
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const { error } = await supabase.from('orders').insert([{
        user_id: buyerId,
        user_type: 'buyer',
        order_date: new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'Cash on Delivery' ? 'pending' : 'paid',
        delivery_address: address,
        notes: JSON.stringify(cartItems)
    }]);
    
    if (error) { showNotification(error.message, true); return false; }
    
    // Update stock quantities
    for (const item of cartItems) {
        const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.id).single();
        if (product) {
            await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - item.quantity }).eq('id', item.id);
        }
    }
    
    showNotification('Order placed successfully!', false);
    return true;
}

// ============================================
// ADMIN FUNCTIONS
// ============================================
async function loadAllInvestors() {
    const { data, error } = await supabase.from('investors').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
}

async function addInvestment(investorId, amount, date, notes = '') {
    const { error } = await supabase.from('investments').insert([{
        investor_id: investorId,
        amount: parseFloat(amount),
        investment_date: date,
        status: 'active',
        notes: notes
    }]);
    if (error) { showNotification(error.message, true); return false; }
    
    // Update investor total
    const { data: investments } = await supabase.from('investments').select('amount').eq('investor_id', investorId).eq('status', 'active');
    const totalInvestment = investments?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
    await supabase.from('investors').update({ total_investment: totalInvestment }).eq('id', investorId);
    
    showNotification('Investment added!', false);
    return true;
}

async function addProfit(investorId, amount, month) {
    const { error } = await supabase.from('profits').insert([{
        investor_id: investorId,
        amount: parseFloat(amount),
        month: month + '-01',
        paid: true,
        paid_date: new Date().toISOString().split('T')[0]
    }]);
    if (error) { showNotification(error.message, true); return false; }
    
    // Update investor profit
    const { data: profits } = await supabase.from('profits').select('amount').eq('investor_id', investorId).eq('paid', true);
    const totalProfit = profits?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    await supabase.from('investors').update({ total_profit: totalProfit, available_balance: totalProfit }).eq('id', investorId);
    
    showNotification('Profit added!', false);
    return true;
}

async function approveWithdrawal(withdrawalId, amount, investorId) {
    const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'approved', processed_date: new Date().toISOString().split('T')[0] })
        .eq('id', withdrawalId);
    if (error) { showNotification(error.message, true); return false; }
    
    const { data: investor } = await supabase.from('investors').select('available_balance').eq('id', investorId).single();
    if (investor) {
        await supabase.from('investors').update({ available_balance: (investor.available_balance || 0) - amount }).eq('id', investorId);
    }
    
    showNotification('Withdrawal approved!', false);
    return true;
}

// ============================================
// CART MANAGEMENT
// ============================================
function getCart(userId) {
    const cart = localStorage.getItem(`cart_${userId}`);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(userId, cart) {
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
    updateCartCount(userId);
}

function addToCartLocal(userId, productId, productName, price) {
    const cart = getCart(userId);
    const existing = cart.find(item => item.id === productId);
    if (existing) { existing.quantity++; } 
    else { cart.push({ id: productId, name: productName, price: price, quantity: 1 }); }
    saveCart(userId, cart);
    showNotification(`${productName} added to cart!`, false);
}

function updateCartCount(userId) {
    const cart = getCart(userId);
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => { el.innerHTML = count; });
}

// Make global
window.supabase = supabase;
window.showNotification = showNotification;
window.checkAuth = checkAuth;
window.logout = logout;
window.formatCurrency = formatCurrency;
window.loadInvestments = loadInvestments;
window.loadProfits = loadProfits;
window.loadWithdrawals = loadWithdrawals;
window.requestWithdrawal = requestWithdrawal;
window.loadProducts = loadProducts;
window.loadBuyerOrders = loadBuyerOrders;
window.placeOrder = placeOrder;
window.loadAllInvestors = loadAllInvestors;
window.addInvestment = addInvestment;
window.addProfit = addProfit;
window.approveWithdrawal = approveWithdrawal;
window.getCart = getCart;
window.addToCartLocal = addToCartLocal;
window.updateCartCount = updateCartCount;

console.log('Sohrab Industries Master Script Loaded!');
