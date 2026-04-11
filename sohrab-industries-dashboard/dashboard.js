// Supabase Configuration - REPLACE WITH YOUR VALUES
const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Check if user is logged in
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    document.getElementById('userName').innerHTML = `👤 ${user.email}`;
    
    // Load all data
    await loadInvestments();
    await loadProfits();
    await loadOrders();
    await loadWithdrawals();
    await loadStats();
    
    return user;
}

// Load investments
async function loadInvestments() {
    const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('investor_id', currentUser.id)
        .order('investment_date', { ascending: false });
    
    if (error) {
        console.error('Error loading investments:', error);
        return;
    }
    
    const tbody = document.getElementById('investmentsList');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No investments yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(inv => `
        <tr>
            <td>${new Date(inv.investment_date).toLocaleDateString()}</td>
            <td>Rs. ${inv.amount.toLocaleString()}</td>
            <td>${inv.investment_type || 'Regular'}</td>
            <td><span class="status ${inv.status}">${inv.status}</span></td>
            <td>${inv.notes || '-'}</td>
        </tr>
    `).join('');
}

// Load profits
async function loadProfits() {
    const { data, error } = await supabase
        .from('profits')
        .select('*')
        .eq('investor_id', currentUser.id)
        .order('month', { ascending: false });
    
    if (error) {
        console.error('Error loading profits:', error);
        return;
    }
    
    const tbody = document.getElementById('profitsList');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No profits recorded yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(profit => `
        <tr>
            <td>${new Date(profit.month).toLocaleDateString('default', { year: 'numeric', month: 'long' })}</td>
            <td>Rs. ${profit.amount.toLocaleString()}</td>
            <td>${profit.paid ? '✅ Paid' : '⏳ Pending'}</td>
            <td>${profit.paid_date ? new Date(profit.paid_date).toLocaleDateString() : '-'}</td>
        </tr>
    `).join('');
}

// Load orders
async function loadOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('investor_id', currentUser.id)
        .order('order_date', { ascending: false });
    
    if (error) {
        console.error('Error loading orders:', error);
        return;
    }
    
    const tbody = document.getElementById('ordersList');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No orders yet. Browse our bulbs!</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(order => `
        <tr>
            <td>${order.product_name}</td>
            <td>${order.quantity}</td>
            <td>Rs. ${order.total_amount.toLocaleString()}</td>
            <td>${new Date(order.order_date).toLocaleDateString()}</td>
            <td><span class="status ${order.delivery_status}">${order.delivery_status}</span></td>
        </tr>
    `).join('');
}

// Load withdrawals
async function loadWithdrawals() {
    const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('investor_id', currentUser.id)
        .order('request_date', { ascending: false });
    
    if (error) {
        console.error('Error loading withdrawals:', error);
        return;
    }
    
    const tbody = document.getElementById('withdrawalsList');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No withdrawal requests</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(w => `
        <tr>
            <td>${new Date(w.request_date).toLocaleDateString()}</td>
            <td>Rs. ${w.amount.toLocaleString()}</td>
            <td><span class="status ${w.status}">${w.status}</span></td>
            <td>${w.processed_date ? new Date(w.processed_date).toLocaleDateString() : '-'}</td>
        </tr>
    `).join('');
}

// Load statistics
async function loadStats() {
    // Total investments
    const { data: investments } = await supabase
        .from('investments')
        .select('amount')
        .eq('investor_id', currentUser.id)
        .eq('status', 'active');
    
    const totalInvested = investments?.reduce((sum, i) => sum + i.amount, 0) || 0;
    document.getElementById('totalInvestment').innerHTML = `Rs. ${totalInvested.toLocaleString()}`;
    document.getElementById('activeInvestments').innerHTML = investments?.length || 0;
    
    // Total profits
    const { data: profits } = await supabase
        .from('profits')
        .select('amount')
        .eq('investor_id', currentUser.id)
        .eq('paid', true);
    
    const totalProfit = profits?.reduce((sum, p) => sum + p.amount, 0) || 0;
    document.getElementById('totalProfit').innerHTML = `Rs. ${totalProfit.toLocaleString()}`;
    
    // Available balance (simplified - you can customize calculation)
    document.getElementById('availableBalance').innerHTML = `Rs. ${(totalProfit).toLocaleString()}`;
}

// Show investment form
function showInvestmentForm() {
    document.getElementById('investmentModal').style.display = 'block';
}

// Show withdrawal form
function showWithdrawalForm() {
    document.getElementById('withdrawalModal').style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Submit investment request
document.getElementById('investmentRequest')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = document.getElementById('investmentAmount').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const transactionId = document.getElementById('transactionId').value;
    
    // Store request (you can create a separate table for pending requests)
    // For now, just show confirmation
    alert(`Investment request submitted!\nAmount: Rs. ${amount}\nMethod: ${paymentMethod}\n\nOur team will verify and update your investment within 24 hours.`);
    
    closeModal('investmentModal');
    e.target.reset();
});

// Submit withdrawal request
document.getElementById('withdrawalRequest')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = document.getElementById('withdrawAmount').value;
    const method = document.getElementById('withdrawMethod').value;
    const accountDetails = document.getElementById('accountDetails').value;
    
    // Insert withdrawal request
    const { error } = await supabase
        .from('withdrawals')
        .insert([
            {
                investor_id: currentUser.id,
                amount: parseFloat(amount),
                request_date: new Date().toISOString().split('T')[0],
                status: 'pending',
                payment_method: method,
                notes: accountDetails
            }
        ]);
    
    if (error) {
        alert('Error submitting request: ' + error.message);
    } else {
        alert('Withdrawal request submitted successfully!');
        closeModal('withdrawalModal');
        e.target.reset();
        await loadWithdrawals();
    }
});

// Tab switching
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.add('active');
    event.target.classList.add('active');
}

// Logout
async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Initialize
checkAuth();

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
