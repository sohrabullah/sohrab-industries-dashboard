// Supabase Configuration
const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';

// Global variables
let supabaseClient;
let allInvestors = [];
let allBuyers = [];
let allOrders = [];
let allWithdrawals = [];

// Initialize Supabase
function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded');
        return false;
    }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
}

// Toast Notification
function showNotification(msg, isError) { 
    const t = document.createElement('div'); 
    t.className = `toast-notification ${isError ? 'toast-error' : 'toast-success'}`; 
    t.innerHTML = isError ? `⚠️ ${msg}` : `✨ ${msg}`; 
    document.body.appendChild(t); 
    setTimeout(() => t.remove(), 3000); 
}

// Show Section
window.showSection = function(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const targetSection = document.getElementById(`${section}Section`);
    if (targetSection) targetSection.classList.add('active');
    if (event && event.target && event.target.classList) event.target.classList.add('active');
    else {
        const btns = document.querySelectorAll('.nav-tab');
        for(let btn of btns) {
            if(btn.innerText.toLowerCase().includes(section.toLowerCase())) {
                btn.classList.add('active');
                break;
            }
        }
    }
};

// Authentication Check
async function checkAuth() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) { 
        window.location.href = 'admin-auth.html'; 
        return null; 
    }
    const adminEmails = ['admin@sohrab.com', 'sohrabullahkn687@gmail.com'];
    if (!adminEmails.includes(user.email)) { 
        showNotification('Unauthorized', true); 
        window.location.href = 'index.html'; 
        return null; 
    }
    document.getElementById('adminEmail').innerHTML = `<i class="fas fa-user-shield"></i> ${user.email}`;
    await refreshAllData();
    return user;
}

// Refresh All Data
async function refreshAllData() {
    await loadStats();
    await loadInvestors();
    await loadBuyers();
    await loadInvestmentRequests();
    await loadInvestmentHistory();
    await loadProfitHistory();
    await loadWithdrawals();
    await loadProducts();
    await loadOrders();
    await loadRecentActivities();
}

// Load Statistics
async function loadStats() {
    const { count: ic } = await supabaseClient.from('investors').select('*', { count: 'exact', head: true });
    document.getElementById('totalInvestors').innerHTML = ic || 0;
    const { count: bc } = await supabaseClient.from('buyers').select('*', { count: 'exact', head: true });
    document.getElementById('totalBuyers').innerHTML = bc || 0;
    const { count: pr } = await supabaseClient.from('investments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    document.getElementById('pendingRequests').innerHTML = pr || 0;
    const { data: inv } = await supabaseClient.from('investments').select('amount');
    const totalInv = inv?.reduce((s,i)=>s+(i.amount||0),0)||0;
    document.getElementById('totalInvestments').innerHTML = `Rs. ${totalInv.toLocaleString()}`;
    const { data: prof } = await supabaseClient.from('profits').select('amount').eq('paid',true);
    const totalProf = prof?.reduce((s,p)=>s+(p.amount||0),0)||0;
    document.getElementById('totalProfit').innerHTML = `Rs. ${totalProf.toLocaleString()}`;
    const { count: pw } = await supabaseClient.from('withdrawals').select('*',{count:'exact',head:true}).eq('status','pending');
    document.getElementById('pendingWithdrawals').innerHTML = pw || 0;
    const { count: pc } = await supabaseClient.from('products').select('*',{count:'exact',head:true}).eq('is_active',true);
    document.getElementById('totalProducts').innerHTML = pc || 0;
    const { count: oc } = await supabaseClient.from('orders').select('*',{count:'exact',head:true});
    document.getElementById('totalOrders').innerHTML = oc || 0;
}

// Load Investors
async function loadInvestors() {
    const { data } = await supabaseClient.from('investors').select('*').order('created_at', { ascending: false });
    allInvestors = data || [];
    const selectHtml = '<option value="">Select Investor</option>' + allInvestors.map(i=>`<option value="${i.id}">${i.full_name}</option>`).join('');
    const investorSelect = document.getElementById('investorSelect');
    const profitSelect = document.getElementById('profitInvestorSelect');
    if (investorSelect) investorSelect.innerHTML = selectHtml;
    if (profitSelect) profitSelect.innerHTML = selectHtml;
    const investorsList = document.getElementById('investorsList');
    if (investorsList) {
        investorsList.innerHTML = allInvestors.map(i=>`<tr>
            <td><strong>${i.full_name}</strong></td>
            <td>${i.email}</td>
            <td>${i.phone||'-'}</td>
            <td>${i.city||'-'}</td>
            <td>Rs.${(i.total_investment||0).toLocaleString()}</td>
            <td>Rs.${(i.total_profit||0).toLocaleString()}</td>
            <td>Rs.${(i.available_balance||0).toLocaleString()}</td>
            <td class="action-buttons"><button onclick="deleteInvestor('${i.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
}

// Add New Investor
window.addNewInvestor = async function() {
    const name = document.getElementById('newInvestorName').value.trim();
    const email = document.getElementById('newInvestorEmail').value.trim();
    const phone = document.getElementById('newInvestorPhone').value;
    const city = document.getElementById('newInvestorCity').value;
    const investment = parseFloat(document.getElementById('newInvestorInvestment').value) || 0;
    if(!name || !email){ showNotification('Name and email required', true); return; }
    const { error } = await supabaseClient.from('investors').insert([{ 
        id: crypto.randomUUID(), full_name: name, email, phone, city, 
        total_investment: investment, total_profit: 0, available_balance: investment,
        created_at: new Date().toISOString() 
    }]);
    if(error){ showNotification(error.message, true); return; }
    showNotification('Investor added!', false);
    document.getElementById('newInvestorName').value = '';
    document.getElementById('newInvestorEmail').value = '';
    document.getElementById('newInvestorInvestment').value = '0';
    await loadInvestors(); await loadStats();
};

// Delete Investor
window.deleteInvestor = async function(id){ 
    if(confirm('Delete this investor?')){ 
        await supabaseClient.from('investments').delete().eq('investor_id',id); 
        await supabaseClient.from('profits').delete().eq('investor_id',id); 
        await supabaseClient.from('withdrawals').delete().eq('investor_id',id); 
        await supabaseClient.from('investors').delete().eq('id',id); 
        showNotification('Investor deleted', false); 
        await loadInvestors(); await loadStats(); 
    } 
};

// Load Buyers
async function loadBuyers() {
    const { data } = await supabaseClient.from('buyers').select('*').order('created_at', { ascending: false });
    allBuyers = data || [];
    const buyersList = document.getElementById('buyersList');
    if (buyersList) {
        buyersList.innerHTML = allBuyers.map(b=>`<tr>
            <td><strong>${b.full_name}</strong></td>
            <td>${b.email}</td>
            <td>${b.phone||'-'}</td>
            <td>${b.address||'-'}</td>
            <td class="action-buttons"><button onclick="deleteBuyer('${b.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
}

// Add New Buyer
window.addNewBuyer = async function() {
    const name = document.getElementById('newBuyerName').value.trim();
    const email = document.getElementById('newBuyerEmail').value.trim();
    const phone = document.getElementById('newBuyerPhone').value;
    const address = document.getElementById('newBuyerAddress').value;
    if(!name || !email){ showNotification('Name and email required', true); return; }
    const { error } = await supabaseClient.from('buyers').insert([{ id: crypto.randomUUID(), full_name: name, email, phone, address, created_at: new Date().toISOString() }]);
    if(error){ showNotification(error.message, true); return; }
    showNotification('Buyer added!', false);
    document.getElementById('newBuyerName').value = '';
    document.getElementById('newBuyerEmail').value = '';
    document.getElementById('newBuyerAddress').value = '';
    await loadBuyers(); await loadStats();
};

// Delete Buyer
window.deleteBuyer = async function(id){ 
    if(confirm('Delete this buyer?')){ 
        await supabaseClient.from('buyers').delete().eq('id',id); 
        showNotification('Buyer deleted', false); 
        await loadBuyers(); await loadStats(); 
    } 
};

// Load Products
async function loadProducts() {
    const { data } = await supabaseClient.from('products').select('*').order('created_at',{ascending:false});
    const productsList = document.getElementById('productsList');
    if (productsList) {
        productsList.innerHTML = (data||[]).map(p=>`<tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>Rs.${(p.price||0).toLocaleString()}</td>
            <td>${p.stock_quantity||0}</td>
            <td class="action-buttons"><button onclick="deleteProduct('${p.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
}

// Add New Product
window.addNewProduct = async function() {
    const name = document.getElementById('newProductName').value.trim();
    const category = document.getElementById('newProductCategory').value;
    const wattage = document.getElementById('newProductWattage').value;
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const stock = parseInt(document.getElementById('newProductStock').value) || 0;
    if(!name || !category || !price){ showNotification('Name, category and price required', true); return; }
    const { error } = await supabaseClient.from('products').insert([{ name, category, wattage, price, stock_quantity: stock, is_active: true, created_at: new Date().toISOString() }]);
    if(error){ showNotification(error.message, true); return; }
    showNotification('Product added!', false);
    document.getElementById('newProductName').value = '';
    document.getElementById('newProductPrice').value = '';
    await loadProducts(); await loadStats();
};

// Delete Product
window.deleteProduct = async function(id){ 
    if(confirm('Delete this product?')){ 
        await supabaseClient.from('products').update({is_active:false}).eq('id',id); 
        showNotification('Product deleted', false); 
        await loadProducts(); await loadStats(); 
    } 
};

// Add Investment
window.addInvestment = async function() { 
    const investorId = document.getElementById('investorSelect').value;
    const amount = parseFloat(document.getElementById('invAmount').value);
    const date = document.getElementById('invDate').value;
    const paymentMethod = document.getElementById('invPaymentMethod').value;
    const transactionId = document.getElementById('invTransactionId').value; 
    if(!investorId || !amount || !date){ showNotification('Fill all fields',true); return; } 
    const { error } = await supabaseClient.from('investments').insert([{ investor_id: investorId, amount, investment_date: date, payment_method: paymentMethod, transaction_id: transactionId, status: 'active' }]); 
    if(error){ showNotification(error.message,true); return; } 
    const { data: investments } = await supabaseClient.from('investments').select('amount').eq('investor_id',investorId).eq('status','active'); 
    const totalInvestment = investments?.reduce((s,i)=>s+(i.amount||0),0)||0; 
    const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id',investorId).single(); 
    const newBalance = (investor?.available_balance||0) + amount; 
    await supabaseClient.from('investors').update({ total_investment: totalInvestment, available_balance: newBalance }).eq('id',investorId); 
    showNotification('Investment added!',false); 
    document.getElementById('invAmount').value = ''; 
    await loadInvestmentHistory(); await loadInvestors(); await loadStats(); 
};

// Add Profit
window.addProfit = async function() { 
    const investorId = document.getElementById('profitInvestorSelect').value;
    const amount = parseFloat(document.getElementById('profitAmount').value);
    const month = document.getElementById('profitMonth').value;
    const percentage = parseFloat(document.getElementById('profitPercentage').value) || 10; 
    if(!investorId || !amount || !month){ showNotification('Fill all fields',true); return; } 
    const { error } = await supabaseClient.from('profits').insert([{ investor_id: investorId, amount, month: month + '-01', profit_percentage: percentage, paid: true, paid_date: new Date().toISOString().split('T')[0] }]); 
    if(error){ showNotification(error.message,true); return; } 
    const { data: profits } = await supabaseClient.from('profits').select('amount').eq('investor_id',investorId).eq('paid',true); 
    const totalProfit = profits?.reduce((s,p)=>s+(p.amount||0),0)||0; 
    const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id',investorId).single(); 
    const newBalance = (investor?.available_balance||0) + amount; 
    await supabaseClient.from('investors').update({ total_profit: totalProfit, available_balance: newBalance }).eq('id',investorId); 
    showNotification('Profit added!',false); 
    document.getElementById('profitAmount').value = ''; 
    await loadProfitHistory(); await loadInvestors(); await loadStats(); 
};

// Load Investment History
async function loadInvestmentHistory() { 
    const { data } = await supabaseClient.from('investments').select('*,investors(full_name)').order('investment_date',{ascending:false}); 
    const investmentHistory = document.getElementById('investmentHistory');
    if (investmentHistory) {
        investmentHistory.innerHTML = (data||[]).map(i=>`<tr>
            <td>${i.investors?.full_name||'-'}</td>
            <td>Rs.${(i.amount||0).toLocaleString()}</td>
            <td>${new Date(i.investment_date).toLocaleDateString()}</td>
            <td>${i.payment_method||'-'}</td>
            <td><span class="status-badge status-${i.status}">${i.status}</span></td>
            <td class="action-buttons"><button onclick="deleteInvestment('${i.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
}

// Load Profit History
async function loadProfitHistory() { 
    const { data } = await supabaseClient.from('profits').select('*,investors(full_name)').order('month',{ascending:false}); 
    const profitHistory = document.getElementById('profitHistory');
    if (profitHistory) {
        profitHistory.innerHTML = (data||[]).map(p=>`<tr>
            <td>${p.investors?.full_name||'-'}</td>
            <td>Rs.${(p.amount||0).toLocaleString()}</td>
            <td>${new Date(p.month).toLocaleDateString('default',{month:'long',year:'numeric'})}</td>
            <td>${p.profit_percentage||10}%</td>
            <td><span class="status-badge ${p.paid?'status-active':'status-pending'}">${p.paid?'Paid':'Pending'}</span></td>
            <td class="action-buttons"><button onclick="deleteProfit('${p.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
}

// Load Investment Requests
async function loadInvestmentRequests() { 
    const { data } = await supabaseClient.from('investments').select('*, investors(full_name, email)').eq('status', 'pending').order('created_at', { ascending: false }); 
    const requestsList = document.getElementById('investmentRequestsList');
    if (requestsList) {
        requestsList.innerHTML = (data || []).map(req => `<tr>
            <td><strong>${req.investors?.full_name || '-'}</strong><br><small>${req.investors?.email || '-'}</small></td>
            <td>Rs. ${(req.amount || 0).toLocaleString()}</td>
            <td>${new Date(req.created_at).toLocaleDateString()}</td>
            <td>${req.payment_method || '-'}</td>
            <td>${req.transaction_id || '-'}</td>
            <td class="action-buttons"><button onclick="approveInvestment('${req.id}', ${req.amount}, '${req.investor_id}')" class="btn-success"><i class="fas fa-check"></i> Approve</button><button onclick="rejectInvestment('${req.id}')" class="btn-danger"><i class="fas fa-times"></i> Reject</button></td>
        </tr>`).join('');
    }
}

// Load Withdrawals
async function loadWithdrawals() { 
    const { data } = await supabaseClient.from('withdrawals').select('*, investors(full_name, email)').order('request_date', { ascending: false });
    allWithdrawals = data || [];
    const withdrawalsList = document.getElementById('withdrawalsList');
    if (!withdrawalsList) return;
    
    if (!allWithdrawals || allWithdrawals.length === 0) {
        withdrawalsList.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i> No withdrawal requests found</td></tr>';
        return;
    }
    
    withdrawalsList.innerHTML = allWithdrawals.map(w => `
        <tr>
            <td><strong>${w.investors?.full_name || 'Unknown'}</strong></td>
            <td><small>${w.investors?.email || '-'}</small></td>
            <td>Rs. ${(w.amount || 0).toLocaleString()}</td>
            <td>${new Date(w.request_date).toLocaleDateString()}</td>
            <td>${w.payment_method || '-'}</td>
            <td><small>${w.account_details || '-'}</small></td>
            <td><span class="status-badge ${w.status === 'pending' ? 'status-pending' : (w.status === 'approved' ? 'status-active' : 'status-cancelled')}">${w.status}</span></td>
            <td class="action-buttons">
                ${w.status === 'pending' ? `
                    <button onclick="approveWithdrawal('${w.id}', ${w.amount}, '${w.investor_id}')" class="btn-success"><i class="fas fa-check"></i> Approve</button>
                    <button onclick="rejectWithdrawal('${w.id}')" class="btn-danger"><i class="fas fa-times"></i> Reject</button>
                ` : `<span class="status-badge status-active">Processed</span>`}
             </td>
        </tr>
    `).join('');
}

// Search Withdrawals
window.searchWithdrawals = function() {
    const term = document.getElementById('withdrawalSearch').value.toLowerCase();
    const filtered = allWithdrawals.filter(w => 
        w.investors?.full_name?.toLowerCase().includes(term) || 
        w.investors?.email?.toLowerCase().includes(term)
    );
    const withdrawalsList = document.getElementById('withdrawalsList');
    if (!withdrawalsList) return;
    
    if (filtered.length === 0) {
        withdrawalsList.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-search"></i> No withdrawal requests found</td></tr>';
        return;
    }
    
    withdrawalsList.innerHTML = filtered.map(w => `
        <tr>
            <td><strong>${w.investors?.full_name || 'Unknown'}</strong></td>
            <td><small>${w.investors?.email || '-'}</small></td>
            <td>Rs. ${(w.amount || 0).toLocaleString()}</td>
            <td>${new Date(w.request_date).toLocaleDateString()}</td>
            <td>${w.payment_method || '-'}</td>
            <td><small>${w.account_details || '-'}</small></td>
            <td><span class="status-badge ${w.status === 'pending' ? 'status-pending' : (w.status === 'approved' ? 'status-active' : 'status-cancelled')}">${w.status}</span></td>
            <td class="action-buttons">
                ${w.status === 'pending' ? `
                    <button onclick="approveWithdrawal('${w.id}', ${w.amount}, '${w.investor_id}')" class="btn-success"><i class="fas fa-check"></i> Approve</button>
                    <button onclick="rejectWithdrawal('${w.id}')" class="btn-danger"><i class="fas fa-times"></i> Reject</button>
                ` : `<span class="status-badge status-active">Processed</span>`}
              </td>
        </tr>
    `).join('');
};

// Reset Withdrawal Search
window.resetWithdrawalSearch = function() {
    document.getElementById('withdrawalSearch').value = '';
    loadWithdrawals();
};

// Load Orders
async function loadOrders() { 
    const { data } = await supabaseClient.from('orders').select('*').order('order_date', { ascending: false });
    allOrders = data || [];
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    
    if (!allOrders || allOrders.length === 0) {
        ordersList.innerHTML = '<tr><td colspan="10" class="empty-state"><i class="fas fa-inbox"></i> No orders found</td></tr>';
        return;
    }
    
    ordersList.innerHTML = allOrders.map(o => {
        let productsList = '-';
        try {
            const items = JSON.parse(o.notes || '[]');
            if (Array.isArray(items) && items.length > 0) {
                productsList = items.map(item => `${item.name} (x${item.quantity})`).join(', ');
            } else {
                productsList = o.notes || '-';
            }
        } catch(e) {
            productsList = o.notes || '-';
        }
        
        return `
            <tr>
                <td><strong>${o.id?.slice(0, 12)}...</strong><br><small style="color:#E8B13C;">${o.id}</small></td>
                <td>${o.user_type || 'buyer'}</td>
                <td><small>${productsList.substring(0, 50)}${productsList.length > 50 ? '...' : ''}</small></td>
                <td>Rs. ${(o.total_amount || 0).toLocaleString()}</td>
                <td>${new Date(o.order_date).toLocaleDateString()}</td>
                <td>${o.payment_method || '-'}</td>
                <td><span class="status-badge ${o.payment_status === 'paid' ? 'status-active' : 'status-pending'}">${o.payment_status || 'pending'}</span></td>
                <td><small>${o.delivery_address?.substring(0, 30) || '-'}</small></td>
                <td>
                    <select onchange="updateOrderStatus('${o.id}', this.value)" class="status-badge" style="padding: 5px; background: rgba(0,0,0,0.3);">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                  </td>
                <td class="action-buttons">
                    <button onclick="viewOrderDetails('${o.id}')" class="btn-info" title="View Details"><i class="fas fa-eye"></i></button>
                    <button onclick="deleteOrder('${o.id}')" class="btn-danger" title="Delete"><i class="fas fa-trash"></i></button>
                  </td>
            </table>
        `;
    }).join('');
}

// Update Order Status
window.updateOrderStatus = async function(id, status) { 
    const { error } = await supabaseClient.from('orders').update({ status: status }).eq('id', id); 
    if (error) { 
        showNotification(error.message, true); 
    } else { 
        showNotification(`Order status updated to ${status}!`, false); 
        await loadOrders(); 
    } 
};

// Delete Order
window.deleteOrder = async function(id) { 
    if (confirm('Delete this order? This action cannot be undone.')) { 
        const { error } = await supabaseClient.from('orders').delete().eq('id', id); 
        if (error) { 
            showNotification(error.message, true); 
        } else { 
            showNotification('Order deleted successfully!', false); 
            await loadOrders(); 
            await loadStats(); 
        } 
    } 
};

// View Order Details
window.viewOrderDetails = async function(id) {
    const { data } = await supabaseClient.from('orders').select('*').eq('id', id);
    if (data && data[0]) {
        const order = data[0];
        let productsHtml = '-';
        try {
            const items = JSON.parse(order.notes || '[]');
            if (Array.isArray(items) && items.length > 0) {
                productsHtml = items.map(item => `${item.name} - Quantity: ${item.quantity} - Price: Rs. ${item.price}`).join('\n');
            }
        } catch(e) {
            productsHtml = order.notes || '-';
        }
        
        alert(`📦 ORDER DETAILS\n\nOrder ID: ${order.id}\nCustomer: ${order.user_type}\nTotal Amount: Rs. ${order.total_amount}\nOrder Date: ${new Date(order.order_date).toLocaleDateString()}\nPayment Method: ${order.payment_method}\nPayment Status: ${order.payment_status}\nOrder Status: ${order.status}\nDelivery Address: ${order.delivery_address}\n\nProducts:\n${productsHtml}`);
    }
};

// Search Orders
window.searchOrders = function() { 
    const term = document.getElementById('orderSearch').value.toLowerCase(); 
    const filtered = allOrders.filter(o => 
        o.id?.toLowerCase().includes(term) || 
        o.user_type?.toLowerCase().includes(term) ||
        o.delivery_address?.toLowerCase().includes(term)
    ); 
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    
    if (filtered.length === 0) {
        ordersList.innerHTML = '<tr><td colspan="10" class="empty-state"><i class="fas fa-search"></i> No orders found</td></tr>';
        return;
    }
    
    ordersList.innerHTML = filtered.map(o => {
        let productsList = '-';
        try {
            const items = JSON.parse(o.notes || '[]');
            if (Array.isArray(items) && items.length > 0) {
                productsList = items.map(item => `${item.name} (x${item.quantity})`).join(', ');
            }
        } catch(e) { productsList = o.notes || '-'; }
        return `<tr>
            <td><strong>${o.id?.slice(0, 12)}...</strong></td>
            <td>${o.user_type || 'buyer'}</td>
            <td>${productsList.substring(0, 40)}</td>
            <td>Rs. ${(o.total_amount || 0).toLocaleString()}</td>
            <td>${new Date(o.order_date).toLocaleDateString()}</td>
            <td>${o.payment_method || '-'}</td>
            <td>${o.payment_status || 'pending'}</td>
            <td>${o.delivery_address?.substring(0, 20) || '-'}</td>
            <td><select onchange="updateOrderStatus('${o.id}', this.value)"><option value="pending" ${o.status==='pending'?'selected':''}>Pending</option><option value="processing" ${o.status==='processing'?'selected':''}>Processing</option><option value="shipped" ${o.status==='shipped'?'selected':''}>Shipped</option><option value="delivered" ${o.status==='delivered'?'selected':''}>Delivered</option></select></td>
            <td class="action-buttons"><button onclick="viewOrderDetails('${o.id}')" class="btn-info">View</button><button onclick="deleteOrder('${o.id}')" class="btn-danger">Delete</button></td>
        </tr>`;
    }).join('');
};

// Reset Order Search
window.resetOrderSearch = function() { 
    document.getElementById('orderSearch').value = ''; 
    loadOrders(); 
};

// Load Recent Activities
async function loadRecentActivities() { 
    const activities = []; 
    const { data: inv } = await supabaseClient.from('investments').select('*,investors(full_name)').order('created_at',{ascending:false}).limit(5); 
    if(inv) inv.forEach(i=>activities.push({action:'Investment',details:`${i.investors?.full_name} invested Rs.${i.amount}`,time:new Date(i.created_at).toLocaleString()})); 
    const { data: ord } = await supabaseClient.from('orders').select('*').order('created_at',{ascending:false}).limit(5); 
    if(ord) ord.forEach(o=>activities.push({action:'Order',details:`Order #${o.id?.slice(0,8)} - Rs.${o.total_amount}`,time:new Date(o.created_at).toLocaleString()})); 
    const { data: wd } = await supabaseClient.from('withdrawals').select('*,investors(full_name)').order('created_at',{ascending:false}).limit(5); 
    if(wd) wd.forEach(w=>activities.push({action:'Withdrawal Request',details:`${w.investors?.full_name} requested Rs.${w.amount} (${w.status})`,time:new Date(w.created_at).toLocaleString()})); 
    activities.sort((a,b)=>new Date(b.time)-new Date(a.time)); 
    const recentActivities = document.getElementById('recentActivities');
    if (recentActivities) {
        recentActivities.innerHTML = activities.slice(0,10).map(a=>`<tr>
            <td>${a.action}</td>
            <td>${a.details}</td>
            <td>${a.time}</td>
        </tr>`).join('');
    }
}

// Approve Investment
window.approveInvestment = async function(id, amount, investorId) { 
    if (!confirm(`Approve investment of Rs. ${amount.toLocaleString()}?`)) return; 
    await supabaseClient.from('investments').update({ status: 'active' }).eq('id', id); 
    const { data: investments } = await supabaseClient.from('investments').select('amount').eq('investor_id', investorId).eq('status', 'active'); 
    const totalInvestment = investments?.reduce((s, i) => s + (i.amount || 0), 0) || 0; 
    const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id', investorId).single(); 
    const newBalance = (investor?.available_balance || 0) + amount; 
    await supabaseClient.from('investors').update({ total_investment: totalInvestment, available_balance: newBalance }).eq('id', investorId); 
    showNotification('Investment approved!', false); 
    await loadInvestmentRequests(); 
    await loadInvestmentHistory(); 
    await loadInvestors(); 
    await loadStats(); 
};

// Reject Investment
window.rejectInvestment = async function(id) { 
    if (!confirm('Reject this investment request?')) return; 
    await supabaseClient.from('investments').update({ status: 'rejected' }).eq('id', id); 
    showNotification('Investment rejected', false); 
    await loadInvestmentRequests(); 
    await loadStats(); 
};

// Approve Withdrawal
window.approveWithdrawal = async function(id, amount, investorId){ 
    if(!confirm(`Approve withdrawal of Rs. ${amount.toLocaleString()}?`)) return; 
    const { error } = await supabaseClient.from('withdrawals').update({ status: 'approved', processed_date: new Date().toISOString().split('T')[0] }).eq('id', id); 
    if(error) { showNotification(error.message, true); return; }
    
    const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id', investorId).single(); 
    if(investor) { 
        const newBalance = (investor.available_balance || 0) - amount;
        await supabaseClient.from('investors').update({ available_balance: newBalance }).eq('id', investorId); 
    }
    showNotification('Withdrawal approved and balance updated!', false); 
    await loadWithdrawals(); 
    await loadInvestors(); 
    await loadStats(); 
};

// Reject Withdrawal
window.rejectWithdrawal = async function(id){ 
    if(!confirm('Reject this withdrawal request?')) return;
    await supabaseClient.from('withdrawals').update({ status: 'rejected' }).eq('id', id); 
    showNotification('Withdrawal rejected', false); 
    await loadWithdrawals(); 
};

// Delete Investment
window.deleteInvestment = async function(id){ 
    if(confirm('Delete this investment?')){ 
        await supabaseClient.from('investments').delete().eq('id',id); 
        await loadInvestmentHistory(); 
        await loadInvestors(); 
        await loadStats(); 
        showNotification('Deleted',false); 
    } 
};

// Delete Profit
window.deleteProfit = async function(id){ 
    if(confirm('Delete this profit?')){ 
        await supabaseClient.from('profits').delete().eq('id',id); 
        await loadProfitHistory(); 
        await loadInvestors(); 
        await loadStats(); 
        showNotification('Deleted',false); 
    } 
};

// Search Investors
window.searchInvestors = function() { 
    const term = document.getElementById('investorSearch').value.toLowerCase(); 
    const filtered = allInvestors.filter(i=>i.full_name?.toLowerCase().includes(term)||i.email?.toLowerCase().includes(term)); 
    const investorsList = document.getElementById('investorsList');
    if (investorsList) {
        investorsList.innerHTML = filtered.map(i=>`<tr>
            <td><strong>${i.full_name}</strong></td>
            <td>${i.email}</td>
            <td>${i.phone||'-'}</td>
            <td>${i.city||'-'}</td>
            <td>Rs.${(i.total_investment||0).toLocaleString()}</td>
            <td>Rs.${(i.total_profit||0).toLocaleString()}</td>
            <td>Rs.${(i.available_balance||0).toLocaleString()}</td>
            <td class="action-buttons"><button onclick="deleteInvestor('${i.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
};

// Reset Investor Search
window.resetInvestorSearch = function() { 
    document.getElementById('investorSearch').value = ''; 
    loadInvestors(); 
};

// Search Buyers
window.searchBuyers = function() { 
    const term = document.getElementById('buyerSearch').value.toLowerCase(); 
    const filtered = allBuyers.filter(b=>b.full_name?.toLowerCase().includes(term)||b.email?.toLowerCase().includes(term)); 
    const buyersList = document.getElementById('buyersList');
    if (buyersList) {
        buyersList.innerHTML = filtered.map(b=>`<tr>
            <td><strong>${b.full_name}</strong></td>
            <td>${b.email}</td>
            <td>${b.phone||'-'}</td>
            <td>${b.address||'-'}</td>
            <td class="action-buttons"><button onclick="deleteBuyer('${b.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
        </tr>`).join('');
    }
};

// Reset Buyer Search
window.resetBuyerSearch = function() { 
    document.getElementById('buyerSearch').value = ''; 
    loadBuyers(); 
};

// Search Products
window.searchProducts = function() { 
    const term = document.getElementById('productSearch').value.toLowerCase(); 
    const rows = document.querySelectorAll('#productsList tr'); 
    rows.forEach(row=>{ row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; }); 
};

// Logout
window.handleLogout = async function(){ 
    await supabaseClient.auth.signOut(); 
    localStorage.clear(); 
    window.location.href = 'index.html'; 
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (initSupabase()) {
        checkAuth();
    }
});
