// ============================================
// SOHRAB INDUSTRIES - COMPLETE MASTER SCRIPT
// UPDATED WITH WORKING TOGGLE AND FORM SUBMISSION
// ============================================

// Supabase Configuration - Your Real Keys
const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let currentUserType = null;

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
function showNotification(message, isError = false, duration = 3000) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = isError ? `❌ ${message}` : `✅ ${message}`;
    
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '40px';
    toast.style.color = 'white';
    toast.style.fontWeight = '500';
    toast.style.zIndex = '10000';
    toast.style.fontFamily = "'Inter', sans-serif";
    toast.style.textAlign = 'center';
    
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
        
        const adminEmails = ['admin@sohrab.com', 'sohrabullahkn786@gmail.com'];
        if (adminEmails.includes(user.email)) {
            currentUserType = 'admin';
        } else {
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
// AUTH PAGE TOGGLE FUNCTIONS - FOR investor-auth.html and buyer-auth.html
// ============================================
function initAuthPage() {
    console.log('Initializing auth page...');
    
    // Get elements
    const signupSection = document.getElementById('signupSection');
    const loginSection = document.getElementById('loginSection');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const signupTabBtn = document.getElementById('signupTabBtn');
    const toggleFormLink = document.getElementById('toggleFormLink');
    
    // If elements don't exist, we're not on an auth page
    if (!signupSection || !loginSection) {
        console.log('Not on auth page, skipping init');
        return;
    }
    
    console.log('Auth page detected, setting up toggles');
    
    // Function to show Login Form (HIDE Signup, SHOW Login)
    function showLoginForm() {
        console.log('Showing login form');
        signupSection.style.display = 'none';
        loginSection.style.display = 'block';
        if (loginTabBtn) loginTabBtn.classList.add('active');
        if (signupTabBtn) signupTabBtn.classList.remove('active');
        if (toggleFormLink) toggleFormLink.innerHTML = "Don't have an account? Sign Up →";
    }
    
    // Function to show Signup Form (HIDE Login, SHOW Signup)
    function showSignupForm() {
        console.log('Showing signup form');
        loginSection.style.display = 'none';
        signupSection.style.display = 'block';
        if (signupTabBtn) signupTabBtn.classList.add('active');
        if (loginTabBtn) loginTabBtn.classList.remove('active');
        if (toggleFormLink) toggleFormLink.innerHTML = "Already have an account? Login →";
    }
    
    // Add click event listeners
    if (loginTabBtn) {
        loginTabBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    }
    
    if (signupTabBtn) {
        signupTabBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showSignupForm();
        });
    }
    
    if (toggleFormLink) {
        toggleFormLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginSection.style.display === 'none' || loginSection.style.display === '') {
                showLoginForm();
            } else {
                showSignupForm();
            }
        });
    }
    
    // Setup signup button if it exists
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignup);
    }
    
    // Setup login button if it exists
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // Enter key support
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (loginSection && loginSection.style.display !== 'none') {
                    const btn = document.getElementById('loginBtn');
                    if (btn) btn.click();
                } else {
                    const btn = document.getElementById('signupBtn');
                    if (btn) btn.click();
                }
            }
        });
    });
}

// ============================================
// HANDLE SIGNUP - For investor-auth.html
// ============================================
async function handleSignup() {
    console.log('Signup button clicked');
    
    // Get form values based on which form is visible (investor or buyer)
    const isInvestorPage = window.location.pathname.includes('investor-auth');
    const isBuyerPage = window.location.pathname.includes('buyer-auth');
    
    let name, email, phone, password, confirm, extraField;
    
    if (isInvestorPage) {
        name = document.getElementById('signupName')?.value.trim();
        email = document.getElementById('signupEmail')?.value.trim();
        phone = document.getElementById('signupPhone')?.value.trim();
        const city = document.getElementById('signupCity')?.value.trim();
        extraField = city;
        password = document.getElementById('signupPassword')?.value;
        confirm = document.getElementById('signupConfirm')?.value;
    } else {
        name = document.getElementById('signupName')?.value.trim();
        email = document.getElementById('signupEmail')?.value.trim();
        phone = document.getElementById('signupPhone')?.value.trim();
        const address = document.getElementById('signupAddress')?.value.trim();
        extraField = address;
        password = document.getElementById('signupPassword')?.value;
        confirm = document.getElementById('signupConfirm')?.value;
    }
    
    // Validation
    if (!name || !email || !phone || !extraField || !password) {
        showNotification('Please fill all fields', true);
        return;
    }
    if (password !== confirm) {
        showNotification('Passwords do not match', true);
        return;
    }
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', true);
        return;
    }
    
    const btn = document.getElementById('signupBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Creating Account...';
    
    try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    phone: phone,
                    role: isInvestorPage ? 'investor' : 'buyer'
                }
            }
        });
        
        if (authError) {
            showNotification(authError.message, true);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            return;
        }
        
        if (authData.user) {
            // Insert into appropriate table
            if (isInvestorPage) {
                const { error: insertError } = await supabase
                    .from('investors')
                    .insert([{
                        id: authData.user.id,
                        email: email,
                        full_name: name,
                        phone: phone,
                        city: extraField,
                        created_at: new Date().toISOString()
                    }]);
                if (insertError) console.error('Insert error:', insertError);
            } else {
                const { error: insertError } = await supabase
                    .from('buyers')
                    .insert([{
                        id: authData.user.id,
                        email: email,
                        full_name: name,
                        phone: phone,
                        address: extraField,
                        created_at: new Date().toISOString()
                    }]);
                if (insertError) console.error('Insert error:', insertError);
            }
            
            showNotification('Account created successfully! Please login.', false);
            
            // Clear form
            document.querySelectorAll('#signupSection input').forEach(input => input.value = '');
            
            // Switch to login form
            const loginSection = document.getElementById('loginSection');
            const signupSection = document.getElementById('signupSection');
            const loginTabBtn = document.getElementById('loginTabBtn');
            const signupTabBtn = document.getElementById('signupTabBtn');
            const toggleLink = document.getElementById('toggleFormLink');
            
            if (signupSection && loginSection) {
                signupSection.style.display = 'none';
                loginSection.style.display = 'block';
                if (loginTabBtn) loginTabBtn.classList.add('active');
                if (signupTabBtn) signupTabBtn.classList.remove('active');
                if (toggleLink) toggleLink.innerHTML = "Don't have an account? Sign Up →";
            }
        }
    } catch (err) {
        console.error('Error:', err);
        showNotification('An error occurred. Please try again.', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

// ============================================
// HANDLE LOGIN - For investor-auth.html and buyer-auth.html
// ============================================
async function handleLogin() {
    console.log('Login button clicked');
    
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showNotification('Please enter email and password', true);
        return;
    }
    
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Logging in...';
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            showNotification('Invalid email or password', true);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Login';
            return;
        }
        
        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Determine redirect based on page type
            const isInvestorPage = window.location.pathname.includes('investor-auth');
            const isBuyerPage = window.location.pathname.includes('buyer-auth');
            
            if (isInvestorPage) {
                localStorage.setItem('userType', 'investor');
                showNotification('Login successful! Redirecting to Investor Dashboard...', false);
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else if (isBuyerPage) {
                localStorage.setItem('userType', 'buyer');
                showNotification('Login successful! Redirecting to Buyer Dashboard...', false);
                setTimeout(() => {
                    window.location.href = 'buyer.html';
                }, 1500);
            } else {
                window.location.href = 'dashboard.html';
            }
        }
    } catch (err) {
        console.error('Error:', err);
        showNotification('An error occurred. Please try again.', true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Login';
    }
}

// ============================================
// INVESTOR FUNCTIONS
// ============================================
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

// ============================================
// ADMIN FUNCTIONS
// ============================================
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

async function getDashboardStats() {
    try {
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
    
    console.log('Page loaded:', currentPage);
    
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
                left: 50%;
                transform: translateX(-50%);
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
    
    // Initialize auth page if this is an auth page
    if (currentPage === 'investor-auth.html' || currentPage === 'buyer-auth.html') {
        initAuthPage();
    }
    
    // Initialize dashboards
    if (currentPage === 'dashboard.html' || currentPage === 'dashboard') {
        const user = await checkAuth('investor');
        if (user) {
            console.log('Investor dashboard initialized for:', user.email);
        }
    } else if (currentPage === 'buyer.html' || currentPage === 'buyer') {
        const user = await checkAuth('buyer');
        if (user) {
            console.log('Buyer dashboard initialized for:', user.email);
        }
    } else if (currentPage === 'admin.html' || currentPage === 'admin') {
        const user = await checkAuth('admin');
        if (user) {
            console.log('Admin panel initialized for:', user.email);
        }
    }
});

// Make all functions globally available
window.supabase = supabase;
window.showNotification = showNotification;
window.checkAuth = checkAuth;
window.logout = logout;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.initAuthPage = initAuthPage;
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;

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

// Admin functions
window.loadAllInvestors = loadAllInvestors;
window.loadAllBuyers = loadAllBuyers;
window.addInvestment = addInvestment;
window.addProfit = addProfit;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
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
