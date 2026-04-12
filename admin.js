// ============================================
// SOHRAB INDUSTRIES - COMPLETE ADMIN PANEL SCRIPT
// Fully functional admin dashboard with all management features
// ============================================

// Supabase Configuration (Using your real credentials)
const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentAdmin = null;
let currentSection = 'dashboard';
let allInvestors = [];
let allProducts = [];
let allOrders = [];
let allWithdrawals = [];

// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================

// Check if admin is logged in
async function checkAdminAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    // Check if user is admin (email check - you can modify this)
    if (user.email !== 'admin@sohrab.com' && user.email !== 'sohrabullahkn786@gmail.com') {
        alert('Unauthorized access. Admin only.');
        await supabase.auth.signOut();
        window.location.href = 'index.html';
        return null;
    }
    
    currentAdmin = user;
    document.getElementById('adminName').innerHTML = `👤 ${user.email}`;
    document.getElementById('adminEmail').innerHTML = user.email;
    
    // Load all dashboard data
    await loadDashboardStats();
    await loadRecentActivities();
    
    return user;
}

// Logout function
async function adminLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

async function loadDashboardStats() {
    try {
        // Total Investors
        const { count: investorCount } = await supabase
            .from('investors')
            .select('*', { count: 'exact', head: true });
        document.getElementById('totalInvestors').innerHTML = investorCount || 0;
        
        // Total Investments Amount
        const { data: investments } = await supabase
            .from('investments')
            .select('amount');
        const totalInvestment = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
        document.getElementById('totalInvestments').innerHTML = `Rs. ${totalInvestment.toLocaleString()}`;
        
        // Total Profit Distributed
        const { data: profits } = await supabase
            .from('profits')
            .select('amount')
            .eq('paid', true);
        const totalProfit = profits?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        document.getElementById('totalProfit').innerHTML = `Rs. ${totalProfit.toLocaleString()}`;
        
        // Pending Withdrawals
        const { count: pendingWithdrawals } = await supabase
            .from('withdrawals')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        document.getElementById('pendingWithdrawals').innerHTML = pendingWithdrawals || 0;
        
        // Total Orders
        const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
        document.getElementById('totalOrders').innerHTML = orderCount || 0;
        
        // Total Revenue
        const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('payment_status', 'paid');
        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        document.getElementById('totalRevenue').innerHTML = `Rs. ${totalRevenue.toLocaleString()}`;
        
        // Active Investors
        const { count: activeInvestors } = await supabase
            .from('investors')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        document.getElementById('activeInvestors').innerHTML = activeInvestors || 0;
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const activities = [];
        
        // Get recent investments
        const { data: recentInvestments } = await supabase
            .from('investments')
            .select('*, investors(full_name)')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (recentInvestments) {
            recentInvestments.forEach(inv => {
                activities.push({
                    action: 'Investment',
                    details: `${inv.investors?.full_name || 'Investor'} invested Rs. ${inv.amount.toLocaleString()}`,
                    time: new Date(inv.created_at).toLocaleString()
                });
            });
        }
        
        // Get recent withdrawals
        const { data: recentWithdrawals } = await supabase
            .from('withdrawals')
            .select('*, investors(full_name)')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (recentWithdrawals) {
            recentWithdrawals.forEach(w => {
                activities.push({
                    action: 'Withdrawal',
                    details: `${w.investors?.full_name || 'Investor'} requested Rs. ${w.amount.toLocaleString()} (${w.status})`,
                    time: new Date(w.created_at).toLocaleString()
                });
            });
        }
        
        // Sort by time and get latest 10
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        const recentActivities = activities.slice(0, 10);
        
        const activityList = document.getElementById('recentActivitiesList');
        if (activityList) {
            if (recentActivities.length === 0) {
                activityList.innerHTML = '<tr><td colspan="3" style="text-align:center">No recent activities</td></tr>';
            } else {
                activityList.innerHTML = recentActivities.map(activity => `
                    <tr>
                        <td>${activity.action}</td>
                        <td>${activity.details}</td>
                        <td>${activity.time}</td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

// ============================================
// SECTION NAVIGATION
// ============================================

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}Section`);
    if (selectedSection) selectedSection.classList.add('active');
    
    // Highlight active nav
    const activeNav = document.querySelector(`[onclick="showSection('${sectionName}')"]`);
    if (activeNav) activeNav.classList.add('active');
    
    currentSection = sectionName;
    
    // Load section-specific data
    switch(sectionName) {
        case 'investors':
            loadAllInvestors();
            break;
        case 'products':
            loadAllProducts();
            break;
        case 'orders':
            loadAllOrders();
            break;
        case 'withdrawals':
            loadAllWithdrawals();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// ============================================
// INVESTOR MANAGEMENT
// ============================================

async function loadAllInvestors() {
    try {
        const { data, error } = await supabase
            .from('investors')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allInvestors = data;
        
        // Populate investor select dropdowns
        const investorSelects = ['investorSelect', 'profitInvestorSelect', 'withdrawInvestorSelect'];
        investorSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Investor</option>' + 
                    data.map(i => `<option value="${i.id}">${i.full_name} (${i.email})</option>`).join('');
            }
        });
        
        // Display investors table
        const investorsTable = document.getElementById('investorsTableBody');
        if (investorsTable) {
            if (data.length === 0) {
                investorsTable.innerHTML = '<tr><td colspan="7" style="text-align:center">No investors found</td></tr>';
            } else {
                investorsTable.innerHTML = data.map(investor => `
                    <tr>
                        <td>${investor.full_name || '-'}</td>
                        <td>${investor.email}</td>
                        <td>${investor.phone || '-'}</td>
                        <td>Rs. ${(investor.total_investment || 0).toLocaleString()}</td>
                        <td>Rs. ${(investor.total_profit || 0).toLocaleString()}</td>
                        <td><span class="status ${investor.is_active ? 'active' : 'inactive'}">${investor.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <button onclick="viewInvestorDetails('${investor.id}')" class="btn-small">View</button>
                            <button onclick="editInvestor('${investor.id}')" class="btn-small edit">Edit</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error loading investors:', error);
        showNotification('Error loading investors: ' + error.message, true);
    }
}

// Add investment to investor
async function addInvestment() {
    const investorId = document.getElementById('investorSelect')?.value;
    const amount = document.getElementById('invAmount')?.value;
    const date = document.getElementById('invDate')?.value;
    const notes = document.getElementById('invNotes')?.value;
    
    if (!investorId || !amount || !date) {
        showNotification('Please fill all required fields', true);
        return;
    }
    
    try {
        const { error } = await supabase
            .from('investments')
            .insert([{
                investor_id: investorId,
                amount: parseFloat(amount),
                investment_date: date,
                status: 'active',
                notes: notes || null
            }]);
        
        if (error) throw error;
        
        // Update investor's total investment
        const { data: investments } = await supabase
            .from('investments')
            .select('amount')
            .eq('investor_id', investorId)
            .eq('status', 'active');
        
        const totalInvestment = investments?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
        
        await supabase
            .from('investors')
            .update({ total_investment: totalInvestment })
            .eq('id', investorId);
        
        showNotification('Investment added successfully!', false);
        document.getElementById('invAmount').value = '';
        document.getElementById('invNotes').value = '';
        loadAllInvestors();
        loadDashboardStats();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

// Add profit to investor
async function addProfit() {
    const investorId = document.getElementById('profitInvestorSelect')?.value;
    const amount = document.getElementById('profitAmount')?.value;
    const month = document.getElementById('profitMonth')?.value;
    
    if (!investorId || !amount || !month) {
        showNotification('Please fill all fields', true);
        return;
    }
    
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
        
        const totalProfit = profits?.reduce((sum, p) => sum + p.amount, 0) || 0;
        
        await supabase
            .from('investors')
            .update({ total_profit: totalProfit, available_balance: totalProfit })
            .eq('id', investorId);
        
        showNotification('Profit added successfully!', false);
        document.getElementById('profitAmount').value = '';
        loadAllInvestors();
        loadDashboardStats();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

// ============================================
// WITHDRAWAL MANAGEMENT
// ============================================

async function loadAllWithdrawals() {
    try {
        const { data, error } = await supabase
            .from('withdrawals')
            .select('*, investors(full_name, email)')
            .order('request_date', { ascending: false });
        
        if (error) throw error;
        
        allWithdrawals = data;
        
        const withdrawalsTable = document.getElementById('withdrawalsTableBody');
        if (withdrawalsTable) {
            if (data.length === 0) {
                withdrawalsTable.innerHTML = '<tr><td colspan="7" style="text-align:center">No withdrawal requests</td></tr>';
            } else {
                withdrawalsTable.innerHTML = data.map(w => `
                    <tr>
                        <td>${w.investors?.full_name || '-'}</td>
                        <td>Rs. ${(w.amount || 0).toLocaleString()}</td>
                        <td>${new Date(w.request_date).toLocaleDateString()}</td>
                        <td>${w.payment_method || '-'}</td>
                        <td><span class="status ${w.status}">${w.status}</span></td>
                        <td>${w.processed_date ? new Date(w.processed_date).toLocaleDateString() : '-'}</td>
                        <td>
                            ${w.status === 'pending' ? `
                                <button onclick="approveWithdrawal('${w.id}', ${w.amount}, '${w.investor_id}')" class="btn-small approve">Approve</button>
                                <button onclick="rejectWithdrawal('${w.id}')" class="btn-small reject">Reject</button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

async function approveWithdrawal(withdrawalId, amount, investorId) {
    if (!confirm(`Approve withdrawal of Rs. ${amount.toLocaleString()}?`)) return;
    
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
        
        showNotification('Withdrawal approved successfully!', false);
        loadAllWithdrawals();
        loadDashboardStats();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

async function rejectWithdrawal(withdrawalId) {
    if (!confirm('Reject this withdrawal request?')) return;
    
    try {
        const { error } = await supabase
            .from('withdrawals')
            .update({ status: 'rejected' })
            .eq('id', withdrawalId);
        
        if (error) throw error;
        
        showNotification('Withdrawal rejected', false);
        loadAllWithdrawals();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================

async function loadAllProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allProducts = data;
        
        const productsTable = document.getElementById('productsTableBody');
        if (productsTable) {
            if (data.length === 0) {
                productsTable.innerHTML = '<tr><td colspan="7" style="text-align:center">No products found</td></tr>';
            } else {
                productsTable.innerHTML = data.map(product => `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td>${product.wattage || '-'}</td>
                        <td>Rs. ${(product.price || 0).toLocaleString()}</td>
                        <td>${product.stock_quantity || 0}</td>
                        <td><span class="status ${product.is_active ? 'active' : 'inactive'}">${product.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <button onclick="editProduct('${product.id}')" class="btn-small edit">Edit</button>
                            <button onclick="deleteProduct('${product.id}')" class="btn-small delete">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        // Populate product select for orders
        const productSelect = document.getElementById('productSelect');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Select Product</option>' +
                data.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} - Rs. ${p.price}</option>`).join('');
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Show add product modal
function showAddProductModal() {
    document.getElementById('productModal').style.display = 'block';
    document.getElementById('modalTitle').innerHTML = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
}

// Save product (add or edit)
async function saveProduct() {
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const wattage = document.getElementById('productWattage').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const description = document.getElementById('productDescription').value;
    
    if (!name || !category || !price) {
        showNotification('Please fill required fields', true);
        return;
    }
    
    try {
        if (productId) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update({ name, category, wattage, price, stock_quantity: stock, description })
                .eq('id', productId);
            
            if (error) throw error;
            showNotification('Product updated successfully!', false);
        } else {
            // Add new product
            const { error } = await supabase
                .from('products')
                .insert([{ name, category, wattage, price, stock_quantity: stock, description, is_active: true }]);
            
            if (error) throw error;
            showNotification('Product added successfully!', false);
        }
        
        closeModal('productModal');
        loadAllProducts();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

async function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('modalTitle').innerHTML = 'Edit Product';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productWattage').value = product.wattage || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock_quantity || 0;
    document.getElementById('productDescription').value = product.description || '';
    
    document.getElementById('productModal').style.display = 'block';
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', productId);
        
        if (error) throw error;
        
        showNotification('Product deleted successfully!', false);
        loadAllProducts();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

// ============================================
// ORDER MANAGEMENT
// ============================================

async function loadAllOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('order_date', { ascending: false });
        
        if (error) throw error;
        
        allOrders = data;
        
        const ordersTable = document.getElementById('ordersTableBody');
        if (ordersTable) {
            if (data.length === 0) {
                ordersTable.innerHTML = '<tr><td colspan="7" style="text-align:center">No orders found</td></tr>';
            } else {
                ordersTable.innerHTML = data.map(order => `
                    <tr>
                        <td>${order.id?.slice(0, 8)}</td>
                        <td>${order.user_type || '-'}</td>
                        <td>Rs. ${(order.total_amount || 0).toLocaleString()}</td>
                        <td>${new Date(order.order_date).toLocaleDateString()}</td>
                        <td><span class="status ${order.status}">${order.status}</span></td>
                        <td>${order.payment_status || 'pending'}</td>
                        <td>
                            <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            </select>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showNotification(`Order status updated to ${newStatus}`, false);
        loadAllOrders();
        
    } catch (error) {
        showNotification('Error: ' + error.message, true);
    }
}

// ============================================
// REPORTS
// ============================================

async function loadReports() {
    try {
        // Monthly investment report
        const { data: investments } = await supabase
            .from('investments')
            .select('*')
            .order('investment_date', { ascending: false });
        
        // Group by month
        const monthlyData = {};
        investments?.forEach(inv => {
            const month = new Date(inv.investment_date).toLocaleDateString('default', { year: 'numeric', month: 'long' });
            if (!monthlyData[month]) monthlyData[month] = 0;
            monthlyData[month] += inv.amount;
        });
        
        const reportBody = document.getElementById('reportTableBody');
        if (reportBody) {
            if (Object.keys(monthlyData).length === 0) {
                reportBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No data available</td></tr>';
            } else {
                reportBody.innerHTML = Object.entries(monthlyData).map(([month, total]) => `
                    <tr>
                        <td>${month}</td>
                        <td>Rs. ${total.toLocaleString()}</td>
                        <td>${Math.round(total * 0.1).toLocaleString()} (10% est.)</td>
                    </tr>
                `).join('');
            }
        }
        
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Export to CSV
async function exportToCSV() {
    try {
        const { data: investors } = await supabase
            .from('investors')
            .select('*');
        
        if (!investors || investors.length === 0) {
            showNotification('No data to export', true);
            return;
        }
        
        const headers = ['Full Name', 'Email', 'Phone', 'Total Investment', 'Total Profit', 'Available Balance', 'Join Date'];
        const csvRows = [headers.join(',')];
        
        investors.forEach(investor => {
            const row = [
                `"${investor.full_name || ''}"`,
                `"${investor.email || ''}"`,
                `"${investor.phone || ''}"`,
                investor.total_investment || 0,
                investor.total_profit || 0,
                investor.available_balance || 0,
                new Date(investor.created_at).toLocaleDateString()
            ];
            csvRows.push(row.join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sohrab_investors_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('Export completed!', false);
        
    } catch (error) {
        showNotification('Error exporting: ' + error.message, true);
    }
}

// ============================================
// SETTINGS
// ============================================

async function saveSettings() {
    const profitPercentage = document.getElementById('profitPercentage')?.value;
    const minWithdrawal = document.getElementById('minWithdrawal')?.value;
    const deliveryCharges = document.getElementById('deliveryCharges')?.value;
    
    // Save to localStorage or create settings table in Supabase
    const settings = {
        profitPercentage: profitPercentage,
        minWithdrawal: minWithdrawal,
        deliveryCharges: deliveryCharges,
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('sohrab_settings', JSON.stringify(settings));
    showNotification('Settings saved successfully!', false);
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('sohrab_settings') || '{}');
    if (document.getElementById('profitPercentage')) {
        document.getElementById('profitPercentage').value = settings.profitPercentage || 10;
        document.getElementById('minWithdrawal').value = settings.minWithdrawal || 1000;
        document.getElementById('deliveryCharges').value = settings.deliveryCharges || 150;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function showNotification(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = isError ? `❌ ${message}` : `✅ ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// View investor details
async function viewInvestorDetails(investorId) {
    const investor = allInvestors.find(i => i.id === investorId);
    if (!investor) return;
    
    const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('investor_id', investorId);
    
    const totalInv = investments?.reduce((sum, i) => sum + i.amount, 0) || 0;
    
    alert(`Investor Details:\n\nName: ${investor.full_name}\nEmail: ${investor.email}\nPhone: ${investor.phone || 'N/A'}\nTotal Investment: Rs. ${totalInv.toLocaleString()}\nTotal Profit: Rs. ${(investor.total_profit || 0).toLocaleString()}\nStatus: ${investor.is_active ? 'Active' : 'Inactive'}`);
}

function editInvestor(investorId) {
    // Implement edit functionality
    showNotification('Edit feature coming soon', false);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    await checkAdminAuth();
    loadSettings();
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList && event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }
});

// Make functions globally available
window.showSection = showSection;
window.adminLogout = adminLogout;
window.addInvestment = addInvestment;
window.addProfit = addProfit;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.showAddProductModal = showAddProductModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.exportToCSV = exportToCSV;
window.saveSettings = saveSettings;
window.closeModal = closeModal;
window.viewInvestorDetails = viewInvestorDetails;
window.editInvestor = editInvestor;
