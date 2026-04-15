// ALL ORIGINAL JAVASCRIPT CODE PRESERVED - WITH PROFESSIONAL SWEETALERT2 POPUPS INSTEAD OF ALERTS/CONFIRMS
document.addEventListener('DOMContentLoaded', function() {
    const SUPABASE_URL = 'https://czvxrjtdintvfjcgblxm.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dnhyanRkaW50dmZqY2dibHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTY4NTcsImV4cCI6MjA5MTQ3Mjg1N30.jc8n6tinfkM7LuEMza1N2yX2u-IeVgOfFcaAtwBjX0g';
    
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded');
        return;
    }
    
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    let allInvestors = [], allBuyers = [], allOrders = [], allWithdrawals = [], allProducts = [];

    // Professional popup notification function (replaces all alerts)
    function showNotification(msg, isError = false, title = "") { 
        Swal.fire({
            icon: isError ? 'error' : 'success',
            title: title || (isError ? 'Error!' : 'Success!'),
            text: msg,
            background: 'linear-gradient(145deg, #1a3d33, #0f2a22)',
            color: '#fff',
            confirmButtonColor: '#E8B13C',
            confirmButtonText: 'OK',
            timer: isError ? 3000 : 2000,
            showConfirmButton: true
        });
    }
    
    // Professional confirmation dialog
    async function confirmAction(message, title = "Confirm Action") {
        const result = await Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#E8B13C',
            cancelButtonColor: '#dc3545',
            confirmButtonText: 'Yes, proceed!',
            cancelButtonText: 'Cancel',
            background: 'linear-gradient(145deg, #1a3d33, #0f2a22)',
            color: '#fff'
        });
        return result.isConfirmed;
    }
    
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

    async function checkAuth() {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error || !user) { 
            window.location.href = 'admin-auth.html'; 
            return null; 
        }
        const adminEmails = ['admin@sohrab.com', 'sohrabullahkn687@gmail.com'];
        if (!adminEmails.includes(user.email)) { 
            showNotification('Unauthorized access!', true, 'Access Denied'); 
            window.location.href = 'index.html'; 
            return null; 
        }
        document.getElementById('adminEmail').innerHTML = `<i class="fas fa-user-shield"></i> ${user.email}`;
        await refreshAllData();
        return user;
    }

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

    window.addNewInvestor = async function() {
        const name = document.getElementById('newInvestorName').value.trim();
        const email = document.getElementById('newInvestorEmail').value.trim();
        const phone = document.getElementById('newInvestorPhone').value;
        const city = document.getElementById('newInvestorCity').value;
        const investment = parseFloat(document.getElementById('newInvestorInvestment').value) || 0;
        if(!name || !email){ showNotification('Name and email are required!', true, 'Missing Fields'); return; }
        const { error } = await supabaseClient.from('investors').insert([{ 
            id: crypto.randomUUID(), full_name: name, email, phone, city, 
            total_investment: investment, total_profit: 0, available_balance: investment,
            created_at: new Date().toISOString() 
        }]);
        if(error){ showNotification(error.message, true, 'Database Error'); return; }
        showNotification('Investor added successfully!', false, 'Added');
        document.getElementById('newInvestorName').value = '';
        document.getElementById('newInvestorEmail').value = '';
        document.getElementById('newInvestorInvestment').value = '0';
        await loadInvestors(); await loadStats();
    };

    window.deleteInvestor = async function(id){ 
        if(await confirmAction('Delete this investor and all their records? This action cannot be undone.', 'Delete Investor')){ 
            await supabaseClient.from('investments').delete().eq('investor_id',id); 
            await supabaseClient.from('profits').delete().eq('investor_id',id); 
            await supabaseClient.from('withdrawals').delete().eq('investor_id',id); 
            await supabaseClient.from('investors').delete().eq('id',id); 
            showNotification('Investor deleted successfully', false, 'Deleted'); 
            await loadInvestors(); await loadStats(); 
        } 
    };

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

    window.addNewBuyer = async function() {
        const name = document.getElementById('newBuyerName').value.trim();
        const email = document.getElementById('newBuyerEmail').value.trim();
        const phone = document.getElementById('newBuyerPhone').value;
        const address = document.getElementById('newBuyerAddress').value;
        if(!name || !email){ showNotification('Name and email required!', true, 'Missing Fields'); return; }
        const { error } = await supabaseClient.from('buyers').insert([{ id: crypto.randomUUID(), full_name: name, email, phone, address, created_at: new Date().toISOString() }]);
        if(error){ showNotification(error.message, true, 'Error'); return; }
        showNotification('Buyer added successfully!', false, 'Added');
        document.getElementById('newBuyerName').value = '';
        document.getElementById('newBuyerEmail').value = '';
        document.getElementById('newBuyerAddress').value = '';
        await loadBuyers(); await loadStats();
    };

    window.deleteBuyer = async function(id){ 
        if(await confirmAction('Delete this buyer?', 'Delete Buyer')){ 
            await supabaseClient.from('buyers').delete().eq('id',id); 
            showNotification('Buyer deleted', false, 'Deleted'); 
            await loadBuyers(); await loadStats(); 
        } 
    };

    async function loadProducts() {
        const { data } = await supabaseClient.from('products').select('*').order('created_at',{ascending:false});
        allProducts = data || [];
        const productsList = document.getElementById('productsList');
        if (productsList) {
            if (!data || data.length === 0) {
                productsList.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-box-open"></i> No products found. Add your first product!</td</tr>';
                return;
            }
            productsList.innerHTML = (data||[]).map(p=>`<tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>Rs.${(p.price||0).toLocaleString()}</td>
                <td>${p.stock_quantity||0}</td>
                <td class="action-buttons"><button onclick="editProduct('${p.id}')" class="btn-warning"><i class="fas fa-edit"></i> Edit</button><button onclick="uploadProductImage('${p.id}')" class="btn-info"><i class="fas fa-image"></i> Upload Image</button><button onclick="deleteProduct('${p.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>`).join('');
        }
    }

    // Edit product with professional popup
    window.editProduct = async function(id) {
        const product = allProducts.find(p => p.id === id);
        if(!product) return;
        const { value: formData } = await Swal.fire({
            title: 'Edit Product',
            html: `
                <input id="editName" class="swal2-input" placeholder="Product Name" value="${product.name}">
                <input id="editPrice" class="swal2-input" placeholder="Price" value="${product.price}">
                <input id="editStock" class="swal2-input" placeholder="Stock Quantity" value="${product.stock_quantity}">
            `,
            focusConfirm: false,
            background: 'linear-gradient(145deg, #1a3d33, #0f2a22)',
            color: '#fff',
            confirmButtonColor: '#E8B13C',
            preConfirm: () => {
                return {
                    name: document.getElementById('editName').value,
                    price: parseFloat(document.getElementById('editPrice').value),
                    stock: parseInt(document.getElementById('editStock').value) || 0
                };
            }
        });
        if (formData) {
            await supabaseClient.from('products').update({
                name: formData.name,
                price: formData.price,
                stock_quantity: formData.stock
            }).eq('id', id);
            showNotification('Product updated successfully!', false, 'Updated');
            await loadProducts();
        }
    };

    // Upload product image from PC/Mobile
    window.uploadProductImage = async function(id) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    await supabaseClient.from('products').update({ image_url: ev.target.result }).eq('id', id);
                    showNotification('Product image uploaded successfully!', false, 'Uploaded');
                    await loadProducts();
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    window.addNewProduct = async function() {
        const name = document.getElementById('newProductName').value.trim();
        const category = document.getElementById('newProductCategory').value;
        const wattage = document.getElementById('newProductWattage').value;
        const price = parseFloat(document.getElementById('newProductPrice').value);
        const stock = parseInt(document.getElementById('newProductStock').value) || 0;
        if(!name || !category || !price){ showNotification('Name, category and price required', true, 'Missing Fields'); return; }
        const { error } = await supabaseClient.from('products').insert([{ 
            id: crypto.randomUUID(), name, category, wattage, price, 
            stock_quantity: stock, is_active: true, created_at: new Date().toISOString() 
        }]);
        if(error){ showNotification(error.message, true, 'Error'); return; }
        showNotification('Product added successfully!', false, 'Added');
        document.getElementById('newProductName').value = '';
        document.getElementById('newProductPrice').value = '';
        document.getElementById('newProductStock').value = '0';
        document.getElementById('newProductWattage').value = '';
        await loadProducts(); await loadStats();
    };

    window.deleteProduct = async function(id){ 
        if(await confirmAction('Delete this product?', 'Delete Product')){ 
            await supabaseClient.from('products').update({is_active:false}).eq('id',id); 
            showNotification('Product deleted successfully', false, 'Deleted'); 
            await loadProducts(); 
            await loadStats(); 
        } 
    };
    
    window.searchProducts = function() { 
        const term = document.getElementById('productSearch').value.toLowerCase(); 
        const rows = document.querySelectorAll('#productsList tr'); 
        rows.forEach(row=>{ row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none'; }); 
    };

    window.addInvestment = async function() { 
        const investorId = document.getElementById('investorSelect').value, amount = parseFloat(document.getElementById('invAmount').value), date = document.getElementById('invDate').value, paymentMethod = document.getElementById('invPaymentMethod').value, transactionId = document.getElementById('invTransactionId').value; 
        if(!investorId || !amount || !date){ showNotification('Please fill all required fields', true, 'Missing Fields'); return; } 
        const { error } = await supabaseClient.from('investments').insert([{ investor_id: investorId, amount, investment_date: date, payment_method: paymentMethod, transaction_id: transactionId, status: 'active' }]); 
        if(error){ showNotification(error.message, true, 'Error'); return; } 
        const { data: investments } = await supabaseClient.from('investments').select('amount').eq('investor_id',investorId).eq('status','active'); 
        const totalInvestment = investments?.reduce((s,i)=>s+(i.amount||0),0)||0; 
        const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id',investorId).single(); 
        const newBalance = (investor?.available_balance||0) + amount; 
        await supabaseClient.from('investors').update({ total_investment: totalInvestment, available_balance: newBalance }).eq('id',investorId); 
        showNotification('Investment added successfully!', false, 'Added'); 
        document.getElementById('invAmount').value = ''; 
        await loadInvestmentHistory(); await loadInvestors(); await loadStats(); 
    };

    window.addProfit = async function() { 
        const investorId = document.getElementById('profitInvestorSelect').value, amount = parseFloat(document.getElementById('profitAmount').value), month = document.getElementById('profitMonth').value, percentage = parseFloat(document.getElementById('profitPercentage').value) || 10; 
        if(!investorId || !amount || !month){ showNotification('Please fill all fields', true, 'Missing Fields'); return; } 
        const { error } = await supabaseClient.from('profits').insert([{ investor_id: investorId, amount, month: month + '-01', profit_percentage: percentage, paid: true, paid_date: new Date().toISOString().split('T')[0] }]); 
        if(error){ showNotification(error.message, true, 'Error'); return; } 
        const { data: profits } = await supabaseClient.from('profits').select('amount').eq('investor_id',investorId).eq('paid',true); 
        const totalProfit = profits?.reduce((s,p)=>s+(p.amount||0),0)||0; 
        const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id',investorId).single(); 
        const newBalance = (investor?.available_balance||0) + amount; 
        await supabaseClient.from('investors').update({ total_profit: totalProfit, available_balance: newBalance }).eq('id',investorId); 
        showNotification('Profit added successfully!', false, 'Added'); 
        document.getElementById('profitAmount').value = ''; 
        await loadProfitHistory(); await loadInvestors(); await loadStats(); 
    };

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
                <td class="action-buttons"><button onclick="updateInvestmentStatus('${i.id}')" class="btn-warning"><i class="fas fa-sync-alt"></i> Update Status</button><button onclick="deleteInvestment('${i.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>`).join('');
        }
    }
    
    window.updateInvestmentStatus = async function(id) {
        const { value: status } = await Swal.fire({
            title: 'Update Investment Status',
            input: 'select',
            inputOptions: { 'active': 'Active', 'pending': 'Pending', 'rejected': 'Rejected' },
            inputValue: 'active',
            background: 'linear-gradient(145deg, #1a3d33, #0f2a22)',
            color: '#fff',
            confirmButtonColor: '#E8B13C'
        });
        if (status) {
            await supabaseClient.from('investments').update({ status: status }).eq('id', id);
            showNotification(`Status updated to ${status}`, false, 'Updated');
            await loadInvestmentHistory();
        }
    };
    
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
    
    async function loadWithdrawals() { 
        const { data } = await supabaseClient.from('withdrawals').select('*, investors(full_name, email)').order('request_date', { ascending: false });
        allWithdrawals = data || [];
        const withdrawalsList = document.getElementById('withdrawalsList');
        if (!withdrawalsList) return;
        
        if (!allWithdrawals || allWithdrawals.length === 0) {
            withdrawalsList.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i> No withdrawal requests found</td</tr>';
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
                    ` : `<button onclick="deleteWithdrawal('${w.id}')" class="btn-danger"><i class="fas fa-trash"></i> Delete</button>`}
                </td>
            </tr>
        `).join('');
    }
    
    window.deleteWithdrawal = async function(id) {
        if(await confirmAction('Delete this processed withdrawal request?', 'Delete Withdrawal')) {
            await supabaseClient.from('withdrawals').delete().eq('id', id);
            showNotification('Withdrawal request deleted', false, 'Deleted');
            await loadWithdrawals();
            await loadStats();
        }
    };
    
    window.searchWithdrawals = function() {
        const term = document.getElementById('withdrawalSearch').value.toLowerCase();
        const filtered = allWithdrawals.filter(w => 
            w.investors?.full_name?.toLowerCase().includes(term) || 
            w.investors?.email?.toLowerCase().includes(term)
        );
        const withdrawalsList = document.getElementById('withdrawalsList');
        if (!withdrawalsList) return;
        
        if (filtered.length === 0) {
            withdrawalsList.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-search"></i> No withdrawal requests found</td</tr>';
            return;
        }
        
        withdrawalsList.innerHTML = filtered.map(w => `...`).join('');
    };
    
    window.resetWithdrawalSearch = function() {
        document.getElementById('withdrawalSearch').value = '';
        loadWithdrawals();
    };
    
    async function loadOrders() { 
        const { data } = await supabaseClient.from('orders').select('*').order('order_date', { ascending: false });
        allOrders = data || [];
        const ordersList = document.getElementById('ordersList');
        if (!ordersList) return;
        
        if (!allOrders || allOrders.length === 0) {
            ordersList.innerHTML = '<tr><td colspan="10" class="empty-state"><i class="fas fa-inbox"></i> No orders found</td</tr>';
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
                    <td><strong>${o.customer_name || o.user_type || 'buyer'}</strong></td>
                    <td><small>${productsList.substring(0, 50)}${productsList.length > 50 ? '...' : ''}</small></td>
                    <td>Rs. ${(o.total_amount || 0).toLocaleString()}</td>
                    <td>${new Date(o.order_date).toLocaleDateString()}</td>
                    <td>${o.payment_method || '-'}</td>
                    <td>
                        <select onchange="updatePaymentStatus('${o.id}', this.value)" class="status-badge" style="padding: 5px; background: rgba(0,0,0,0.3);">
                            <option value="pending" ${o.payment_status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="paid" ${o.payment_status === 'paid' ? 'selected' : ''}>Paid</option>
                        </select>
                      </td>
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
                        <button onclick="editOrder('${o.id}')" class="btn-warning" title="Edit Price/Address"><i class="fas fa-edit"></i> Edit</button>
                        <button onclick="deleteOrder('${o.id}')" class="btn-danger" title="Delete"><i class="fas fa-trash"></i> Delete</button>
                      </td>
                </tr>
            `;
        }).join('');
    }
    
    window.editOrder = async function(id) {
        const order = allOrders.find(o => o.id === id);
        if(!order) return;
        const { value: formData } = await Swal.fire({
            title: 'Edit Order',
            html: `
                <input id="editAmount" class="swal2-input" placeholder="Total Amount" value="${order.total_amount}">
                <input id="editAddress" class="swal2-input" placeholder="Delivery Address" value="${order.delivery_address || ''}">
                <input id="editCustomer" class="swal2-input" placeholder="Customer Name" value="${order.customer_name || order.user_type || ''}">
            `,
            background: 'linear-gradient(145deg, #1a3d33, #0f2a22)',
            color: '#fff',
            confirmButtonColor: '#E8B13C',
            preConfirm: () => {
                return {
                    amount: parseFloat(document.getElementById('editAmount').value),
                    address: document.getElementById('editAddress').value,
                    customer: document.getElementById('editCustomer').value
                };
            }
        });
        if (formData) {
            await supabaseClient.from('orders').update({
                total_amount: formData.amount,
                delivery_address: formData.address,
                customer_name: formData.customer
            }).eq('id', id);
            showNotification('Order updated successfully!', false, 'Updated');
            await loadOrders();
        }
    };
    
    window.updatePaymentStatus = async function(id, status) { 
        const { error } = await supabaseClient.from('orders').update({ payment_status: status }).eq('id', id); 
        if (error) { 
            showNotification(error.message, true, 'Error'); 
        } else { 
            showNotification(`Payment status updated to ${status}!`, false, 'Updated'); 
            await loadOrders(); 
        } 
    };
    
    window.updateOrderStatus = async function(id, status) { 
        const { error } = await supabaseClient.from('orders').update({ status: status }).eq('id', id); 
        if (error) { 
            showNotification(error.message, true, 'Error'); 
        } else { 
            showNotification(`Order status updated to ${status}!`, false, 'Updated'); 
            await loadOrders(); 
        } 
    };
    
    window.deleteOrder = async function(id) { 
        if(await confirmAction('Delete this order? This action cannot be undone.', 'Delete Order')) { 
            const { error } = await supabaseClient.from('orders').delete().eq('id', id); 
            if (error) { 
                showNotification(error.message, true, 'Error'); 
            } else { 
                showNotification('Order deleted successfully!', false, 'Deleted'); 
                await loadOrders(); 
                await loadStats(); 
            } 
        } 
    };
    
    window.searchOrders = function() { 
        const term = document.getElementById('orderSearch').value.toLowerCase(); 
        const filtered = allOrders.filter(o => 
            o.id?.toLowerCase().includes(term) || 
            (o.customer_name || o.user_type)?.toLowerCase().includes(term) ||
            o.delivery_address?.toLowerCase().includes(term)
        ); 
        const ordersList = document.getElementById('ordersList');
        if (!ordersList) return;
        
        if (filtered.length === 0) {
            ordersList.innerHTML = '<tr><td colspan="10" class="empty-state"><i class="fas fa-search"></i> No orders found</td</tr>';
            return;
        }
        
        ordersList.innerHTML = filtered.map(o => `...`).join('');
    };
    
    window.resetOrderSearch = function() { 
        document.getElementById('orderSearch').value = ''; 
        loadOrders(); 
    };
    
    async function loadRecentActivities() { 
        const activities = []; 
        const { data: inv } = await supabaseClient.from('investments').select('*,investors(full_name)').order('created_at',{ascending:false}).limit(5); 
        if(inv) inv.forEach(i=>activities.push({action:'Investment',details:`${i.investors?.full_name} invested Rs.${i.amount}`,time:new Date(i.created_at).toLocaleString()})); 
        const { data: ord } = await supabaseClient.from('orders').select('*').order('created_at',{ascending:false}).limit(5); 
        if(ord) ord.forEach(o=>activities.push({action:'Order',details:`Order #${o.id?.slice(0,8)} - Rs.${o.total_amount} by ${o.customer_name || o.user_type}`,time:new Date(o.created_at).toLocaleString()})); 
        const { data: wd } = await supabaseClient.from('withdrawals').select('*,investors(full_name)').order('created_at',{ascending:false}).limit(5); 
        if(wd) wd.forEach(w=>activities.push({action:'Withdrawal Request',details:`${w.investors?.full_name} requested Rs.${w.amount} (${w.status})`,time:new Date(w.created_at).toLocaleString()})); 
        activities.sort((a,b)=>new Date(b.time)-new Date(a.time)); 
        const recentActivities = document.getElementById('recentActivities');
        if (recentActivities) {
            recentActivities.innerHTML = activities.slice(0,10).map(a=>`<tr>
                <td>${a.action}</td>
                <td>${a.details}</td>
                <td>${a.time}</td>
                <td class="action-buttons"><button onclick="viewActivityDetail('${a.action}', '${a.details}')" class="btn-info"><i class="fas fa-eye"></i> View</button></td>
            </tr>`).join('');
        }
    }
    
    window.viewActivityDetail = function(action, details) {
        Swal.fire({
            title: `${action} Details`,
            text: details,
            icon: 'info',
            background: 'linear-gradient(145deg, #1a3d33, #0f2a22)',
            color: '#fff',
            confirmButtonColor: '#E8B13C'
        });
    };

    window.approveInvestment = async function(id, amount, investorId) { 
        if(!await confirmAction(`Approve investment of Rs. ${amount.toLocaleString()}?`, 'Approve Investment')) return; 
        await supabaseClient.from('investments').update({ status: 'active' }).eq('id', id); 
        const { data: investments } = await supabaseClient.from('investments').select('amount').eq('investor_id', investorId).eq('status', 'active'); 
        const totalInvestment = investments?.reduce((s, i) => s + (i.amount || 0), 0) || 0; 
        const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id', investorId).single(); 
        const newBalance = (investor?.available_balance || 0) + amount; 
        await supabaseClient.from('investors').update({ total_investment: totalInvestment, available_balance: newBalance }).eq('id', investorId); 
        showNotification('Investment approved successfully!', false, 'Approved'); 
        await loadInvestmentRequests(); 
        await loadInvestmentHistory(); 
        await loadInvestors(); 
        await loadStats(); 
    };
    
    window.rejectInvestment = async function(id) { 
        if(!await confirmAction('Reject this investment request?', 'Reject Investment')) return; 
        await supabaseClient.from('investments').update({ status: 'rejected' }).eq('id', id); 
        showNotification('Investment rejected', false, 'Rejected'); 
        await loadInvestmentRequests(); 
        await loadStats(); 
    };
    
    window.approveWithdrawal = async function(id, amount, investorId){ 
        if(!await confirmAction(`Approve withdrawal of Rs. ${amount.toLocaleString()}?`, 'Approve Withdrawal')) return; 
        const { error } = await supabaseClient.from('withdrawals').update({ status: 'approved', processed_date: new Date().toISOString().split('T')[0] }).eq('id', id); 
        if(error) { showNotification(error.message, true, 'Error'); return; }
        
        const { data: investor } = await supabaseClient.from('investors').select('available_balance').eq('id', investorId).single(); 
        if(investor) { 
            const newBalance = (investor.available_balance || 0) - amount;
            await supabaseClient.from('investors').update({ available_balance: newBalance }).eq('id', investorId); 
        }
        showNotification('Withdrawal approved and balance updated!', false, 'Approved'); 
        await loadWithdrawals(); 
        await loadInvestors(); 
        await loadStats(); 
    };
    
    window.rejectWithdrawal = async function(id){ 
        if(!await confirmAction('Reject this withdrawal request?', 'Reject Withdrawal')) return;
        await supabaseClient.from('withdrawals').update({ status: 'rejected' }).eq('id', id); 
        showNotification('Withdrawal rejected', false, 'Rejected'); 
        await loadWithdrawals(); 
    };
    
    window.deleteInvestment = async function(id){ 
        if(await confirmAction('Delete this investment record?', 'Delete Investment')){ 
            await supabaseClient.from('investments').delete().eq('id',id); 
            await loadInvestmentHistory(); 
            await loadInvestors(); 
            await loadStats(); 
            showNotification('Investment deleted', false, 'Deleted'); 
        } 
    };
    
    window.deleteProfit = async function(id){ 
        if(await confirmAction('Delete this profit record?', 'Delete Profit')){ 
            await supabaseClient.from('profits').delete().eq('id',id); 
            await loadProfitHistory(); 
            await loadInvestors(); 
            await loadStats(); 
            showNotification('Profit deleted', false, 'Deleted'); 
        } 
    };

    window.searchInvestors = function() { 
        const term = document.getElementById('investorSearch').value.toLowerCase(); 
        const filtered = allInvestors.filter(i=>i.full_name?.toLowerCase().includes(term)||i.email?.toLowerCase().includes(term)); 
        const investorsList = document.getElementById('investorsList');
        if (investorsList) {
            investorsList.innerHTML = filtered.map(i=>`<tr>...</td>`).join('');
        }
    };
    
    window.resetInvestorSearch = function() { 
        document.getElementById('investorSearch').value = ''; 
        loadInvestors(); 
    };
    
    window.searchBuyers = function() { 
        const term = document.getElementById('buyerSearch').value.toLowerCase(); 
        const filtered = allBuyers.filter(b=>b.full_name?.toLowerCase().includes(term)||b.email?.toLowerCase().includes(term)); 
        const buyersList = document.getElementById('buyersList');
        if (buyersList) {
            buyersList.innerHTML = filtered.map(b=>`<td>...</td>`).join('');
        }
    };
    
    window.resetBuyerSearch = function() { 
        document.getElementById('buyerSearch').value = ''; 
        loadBuyers(); 
    };
    
    window.handleLogout = async function(){ 
        await supabaseClient.auth.signOut(); 
        localStorage.clear(); 
        window.location.href = 'index.html'; 
    };
    
    checkAuth();
});
