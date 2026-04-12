// ============================================
// SOHRAB INDUSTRIES - COMPLETE MASTER SCRIPT
// Handles Investors, Buyers, and Admin Functionality
// ============================================

// Supabase Configuration - Your Real Keys
const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let currentUserType = null; // 'investor', 'buyer', 'admin'

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
function showNotification(message, isError = false, duration = 3000) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = isError ? `❌ ${message}` : `✅ ${message}`;
    
    // Add styles if not already in CSS
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.right = '30px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '10px';
    toast.style.color = 'white';
    toast.style.fontWeight = '500';
    toast.style.zIndex = '10000';
    toast.style.animation = 'slideInRight 0.3s ease';
    toast.style.fontFamily = "'Inter', sans-serif";
    
    if (isError) {
        toast.style.background = '#dc3545';
    } else {
        toast.style.background = '#28a745';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// LOADING SPINNER
// ============================================
function showLoading(elementId, show) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (show) {
        const originalHtml = element.innerHTML;
        element.setAttribute('data-original', originalHtml);
        element.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Loading...';
        element.disabled = true;
    } else {
        const original = element.getAttribute('data-original');
        if (original) element.innerHTML = original;
        element.disabled = false;
    }
}

// ============================================
// AUTHENTICATION CHECK
// ============================================
async function checkAuth(requiredUserType = null) {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = 'index.html';
            return null;
        }
        
        currentUser = user;
        
        // Determine user type from email or database
        const adminEmails = ['admin@sohrab.com', 'sohrabullahkn786@gmail.com'];
        if (adminEmails.includes(user.email)) {
            currentUserType = 'admin';
        } else {
            // Check if user exists in investors table
            const { data: investor } = await supabase
                .from('investors')
                .select('id')
                .eq('id', user.id)
                .single();
            
            if (investor) {
                currentUserType = 'investor';
            } else {
                currentUserType = 'buyer';
            }
        }
        
        // If specific user type required, validate
        if (requiredUserType && currentUserType !== requiredUserType) {
            if (requiredUserType === 'investor') {
                window.location.href = 'dashboard.html';
            } else if (requiredUserType === 'buyer') {
                window.location.href = 'buyer.html';
            } else if (requiredUserType === 'admin') {
                window.location.href = 'admin.html';
            }
            return null;
        }
        
        // Update UI elements
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) {
            userNameSpan.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email.split('@')[0]}`;
        }
        
        const adminEmailSpan = document.getElementById('adminEmail');
        if (adminEmailSpan) {
            adminEmailSpan.innerHTML = `<i class="fas fa-user-shield"></i> ${user.email}`;
        }
        
        return user;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// ============================================
// LOGOUT FUNCTION
// ============================================
async function logout() {
    try {
        await supabase.auth.signOut();
        localStorage.removeItem('user');
        localStorage.removeItem('cart');
        showNotification('Logged out successfully!', false);
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    } catch (error) {
        showNotification('Error logging out: ' + error.message, true);
    }
}

// ============================================
// FORMAT CURRENCY
// ============================================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('PKR', 'Rs.');
}

// ============================================
// DATE FORMATTING
// ============================================
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ============================================
// INVESTOR FUNCTIONS
// ============================================

// Load investor investments
async function loadInvestments(investorId) {
    try {
        const { data, error } = await supabase
            .from('investments')
            .select('*')
            .eq('investor_id', investorId)
            .order('investment_date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading investments:', error);
        return [];
    }
}

// Load investor profits
async function loadProfits(investorId) {
    try {
        const { data, error } = await supabase
            .from('profits')
            .select('*')
            .eq('investor_id', investorId)
            .order('month', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading profits:', error);
        return [];
    }
}

// Load investor withdrawals
async function loadWithdrawals(investorId) {
    try {
        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('investor_id', investorId)
            .order('request_date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        return [];
    }
}

// Request withdrawal
async function requestWithdrawal(investorId, amount, paymentMethod, accountDetails) {
    try {
        const { error } = await supabase
            .from('withdrawals')
            .insert([{
                investor_id: investorId,
                amount: parseFloat(amount),
                request_date: new Date().toISOString().split('T')[0],
                status: 'pending',
                payment_method: paymentMethod,
                notes: accountDetails
            }]);
        
        if (error) throw error;
        showNotification('Withdrawal request submitted successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Calculate investor stats
function calculateInvestorStats(investments, profits) {
    const activeInvestments = investments.filter(i => i.status === 'active');
    const totalInvested = activeInvestments.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalProfit = profits.filter(p => p.paid).reduce((sum, p) => sum + (p.amount || 0), 0);
    const availableBalance = totalProfit;
    
    return {
        totalInvested,
        totalProfit,
        availableBalance,
        activeCount: activeInvestments.length
    };
}

// ============================================
// BUYER FUNCTIONS
// ============================================

// Load all products
async function loadProducts(category = null) {
    try {
        let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Load product categories
async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// Load buyer orders
async function loadBuyerOrders(buyerId) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', buyerId)
            .eq('user_type', 'buyer')
            .order('order_date', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading orders:', error);
        return [];
    }
}

// Place order
async function placeOrder(buyerId, cartItems, address, paymentMethod) {
    try {
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const { data, error } = await supabase
            .from('orders')
            .insert([{
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
        
        if (error) throw error;
        
        // Update product stock
        for (const item of cartItems) {
            const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.id)
                .single();
            
            if (product) {
                await supabase
                    .from('products')
                    .update({ stock_quantity: (product.stock_quantity || 0) - item.quantity })
                    .eq('id', item.id);
            }
        }
        
        showNotification('Order placed successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error placing order: ' + error.message, true);
        return false;
    }
}

// Add to wishlist
async function addToWishlist(userId, userType, productId) {
    try {
        const { error } = await supabase
            .from('wishlist')
            .insert([{
                user_id: userId,
                user_type: userType,
                product_id: productId
            }]);
        
        if (error) throw error;
        showNotification('Added to wishlist!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Load wishlist
async function loadWishlist(userId, userType) {
    try {
        const { data, error } = await supabase
            .from('wishlist')
            .select('*, products(*)')
            .eq('user_id', userId)
            .eq('user_type', userType);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading wishlist:', error);
        return [];
    }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

// Load all investors (admin)
async function loadAllInvestors() {
    try {
        const { data, error } = await supabase
            .from('investors')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading investors:', error);
        return [];
    }
}

// Load all buyers (admin)
async function loadAllBuyers() {
    try {
        const { data, error } = await supabase
            .from('buyers')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading buyers:', error);
        return [];
    }
}

// Add investment (admin)
async function addInvestment(investorId, amount, date, notes = '') {
    try {
        const { error } = await supabase
            .from('investments')
            .insert([{
                investor_id: investorId,
                amount: parseFloat(amount),
                investment_date: date,
                status: 'active',
                notes: notes
            }]);
        
        if (error) throw error;
        
        // Update investor's total investment
        const { data: investments } = await supabase
            .from('investments')
            .select('amount')
            .eq('investor_id', investorId)
            .eq('status', 'active');
        
        const totalInvestment = investments?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
        
        await supabase
            .from('investors')
            .update({ total_investment: totalInvestment })
            .eq('id', investorId);
        
        showNotification('Investment added successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Add profit (admin)
async function addProfit(investorId, amount, month) {
    try {
        const { error } = await supabase
            .from('profits')
            .insert([{
                investor_id: investorId,
                amount: parseFloat(amount),
                month: month + '-01',
                paid: true,
                paid_date: new Date().toISOString().split('T')[0]
            }]);
        
        if (error) throw error;
        
        // Update investor's total profit
        const { data: profits } = await supabase
            .from('profits')
            .select('amount')
            .eq('investor_id', investorId)
            .eq('paid', true);
        
        const totalProfit = profits?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        
        await supabase
            .from('investors')
            .update({ total_profit: totalProfit, available_balance: totalProfit })
            .eq('id', investorId);
        
        showNotification('Profit added successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Approve withdrawal (admin)
async function approveWithdrawal(withdrawalId, amount, investorId) {
    try {
        const { error } = await supabase
            .from('withdrawals')
            .update({
                status: 'approved',
                processed_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', withdrawalId);
        
        if (error) throw error;
        
        // Update investor's available balance
        const { data: investor } = await supabase
            .from('investors')
            .select('available_balance')
            .eq('id', investorId)
            .single();
        
        if (investor) {
            const newBalance = (investor.available_balance || 0) - amount;
            await supabase
                .from('investors')
                .update({ available_balance: newBalance })
                .eq('id', investorId);
        }
        
        showNotification('Withdrawal approved!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Reject withdrawal (admin)
async function rejectWithdrawal(withdrawalId) {
    try {
        const { error } = await supabase
            .from('withdrawals')
            .update({ status: 'rejected' })
            .eq('id', withdrawalId);
        
        if (error) throw error;
        showNotification('Withdrawal rejected', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Add product (admin)
async function addProduct(productData) {
    try {
        const { error } = await supabase
            .from('products')
            .insert([{
                name: productData.name,
                category: productData.category,
                wattage: productData.wattage,
                price: parseFloat(productData.price),
                stock_quantity: parseInt(productData.stock) || 0,
                description: productData.description || '',
                is_active: true
            }]);
        
        if (error) throw error;
        showNotification('Product added successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Update product (admin)
async function updateProduct(productId, productData) {
    try {
        const { error } = await supabase
            .from('products')
            .update({
                name: productData.name,
                category: productData.category,
                wattage: productData.wattage,
                price: parseFloat(productData.price),
                stock_quantity: parseInt(productData.stock) || 0,
                description: productData.description || ''
            })
            .eq('id', productId);
        
        if (error) throw error;
        showNotification('Product updated successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Delete product (admin)
async function deleteProduct(productId) {
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', productId);
        
        if (error) throw error;
        showNotification('Product deleted successfully!', false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Update order status (admin)
async function updateOrderStatus(orderId, status) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: status })
            .eq('id', orderId);
        
        if (error) throw error;
        showNotification(`Order status updated to ${status}`, false);
        return true;
    } catch (error) {
        showNotification('Error: ' + error.message, true);
        return false;
    }
}

// Get dashboard statistics (admin)
async function getDashboardStats() {
    try {
        // Get counts
        const { count: investorCount } = await supabase
            .from('investors')
            .select('*', { count: 'exact', head: true });
        
        const { count: buyerCount } = await supabase
            .from('buyers')
            .select('*', { count: 'exact', head: true });
        
        const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
        
        const { count: pendingWithdrawals } = await supabase
            .from('withdrawals')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        // Get totals
        const { data: investments } = await supabase
            .from('investments')
            .select('amount');
        const totalInvestment = investments?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
        
        const { data: profits } = await supabase
            .from('profits')
            .select('amount')
            .eq('paid', true);
        const totalProfit = profits?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('payment_status', 'paid');
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        
        return {
            investorCount: investorCount || 0,
            buyerCount: buyerCount || 0,
            orderCount: orderCount || 0,
            pendingWithdrawals: pendingWithdrawals || 0,
            totalInvestment,
            totalProfit,
            totalRevenue
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return null;
    }
}

// ============================================
// CART MANAGEMENT (Local Storage)
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
    
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id: productId, name: productName, price: price, quantity: 1 });
    }
    
    saveCart(userId, cart);
    showNotification(`${productName} added to cart!`, false);
}

function updateCartQuantity(userId, productId, change) {
    const cart = getCart(userId);
    const item = cart.find(i => i.id === productId);
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            const index = cart.findIndex(i => i.id === productId);
            cart.splice(index, 1);
        }
        saveCart(userId, cart);
    }
}

function removeFromCart(userId, productId) {
    const cart = getCart(userId);
    const newCart = cart.filter(i => i.id !== productId);
    saveCart(userId, newCart);
    showNotification('Item removed from cart', false);
}

function clearCart(userId) {
    localStorage.removeItem(`cart_${userId}`);
    updateCartCount(userId);
}

function updateCartCount(userId) {
    const cart = getCart(userId);
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        el.innerHTML = count;
    });
}

function getCartTotal(cart) {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// ============================================
// EXPORT FUNCTIONS (CSV)
// ============================================

function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showNotification('No data to export', true);
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Export completed!', false);
}

// ============================================
// INITIALIZE PAGE BASED ON CURRENT PAGE
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Add animation styles if not present
    if (!document.querySelector('#dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .toast-notification {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 10000;
                font-family: 'Inter', sans-serif;
            }
            .status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                display: inline-block;
            }
            .status-active, .status-approved, .status-delivered {
                background: #d4edda;
                color: #155724;
            }
            .status-pending {
                background: #fff3cd;
                color: #856404;
            }
            .status-inactive, .status-rejected {
                background: #f8d7da;
                color: #721c24;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize based on page
    if (currentPage === 'dashboard.html' || currentPage === 'dashboard') {
        // Investor dashboard initialization
        const user = await checkAuth('investor');
        if (user) {
            console.log('Investor dashboard initialized for:', user.email);
        }
    } else if (currentPage === 'buyer.html' || currentPage === 'buyer') {
        // Buyer dashboard initialization
        const user = await checkAuth('buyer');
        if (user) {
            console.log('Buyer dashboard initialized for:', user.email);
        }
    } else if (currentPage === 'admin.html' || currentPage === 'admin') {
        // Admin panel initialization
        const user = await checkAuth('admin');
        if (user) {
            console.log('Admin panel initialized for:', user.email);
        }
    }
});

// Make all functions globally available
window.supabase = supabase;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.checkAuth = checkAuth;
window.logout = logout;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;

// Investor functions
window.loadInvestments = loadInvestments;
window.loadProfits = loadProfits;
window.loadWithdrawals = loadWithdrawals;
window.requestWithdrawal = requestWithdrawal;
window.calculateInvestorStats = calculateInvestorStats;

// Buyer functions
window.loadProducts = loadProducts;
window.loadCategories = loadCategories;
window.loadBuyerOrders = loadBuyerOrders;
window.placeOrder = placeOrder;
window.addToWishlist = addToWishlist;
window.loadWishlist = loadWishlist;

// Admin functions
window.loadAllInvestors = loadAllInvestors;
window.loadAllBuyers = loadAllBuyers;
window.addInvestment = addInvestment;
window.addProfit = addProfit;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.addProduct = addProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.getDashboardStats = getDashboardStats;

// Cart functions
window.getCart = getCart;
window.saveCart = saveCart;
window.addToCartLocal = addToCartLocal;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.updateCartCount = updateCartCount;
window.getCartTotal = getCartTotal;

// Export functions
window.exportToCSV = exportToCSV;

console.log('Sohrab Industries Master Script Loaded Successfully!');
