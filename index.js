// API基礎URL
const API_BASE_URL = 'http://localhost:5000/api';

// 購物車
let cart = [];
let products = [];
let currentUser = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// 設置事件監聽器
function setupEventListeners() {
    // 搜尋功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterProducts(e.target.value);
        });
    }

    // 商品表單提交
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }

    // 登入表單提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 註冊表單提交
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 帳號設定表單提交
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // 監聽新密碼輸入，顯示/隱藏舊密碼欄位
    const profileNewPassword = document.getElementById('profileNewPassword');
    if (profileNewPassword) {
        profileNewPassword.addEventListener('input', function() {
            const oldPasswordGroup = document.getElementById('oldPasswordGroup');
            if (oldPasswordGroup) {
                oldPasswordGroup.style.display = this.value ? 'block' : 'none';
                if (!this.value) {
                    document.getElementById('profileOldPassword').value = '';
                }
            }
        });
    }
}

// 檢查登入狀態
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/status`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.logged_in) {
                currentUser = data.user;
                updateUIForLoggedIn();
            } else {
                updateUIForLoggedOut();
            }
        } else {
            updateUIForLoggedOut();
        }
    } catch (error) {
        console.error('檢查登入狀態失敗:', error);
        updateUIForLoggedOut();
    }
    
    // 無論是否登入都載入商品（但可能需要限制某些功能）
    loadProducts();
}

// 更新UI為已登入狀態
function updateUIForLoggedIn() {
    const userInfo = document.getElementById('userInfo');
    const loginButtons = document.getElementById('loginButtons');
    const userName = document.getElementById('userName');
    const adminButtons = document.getElementById('adminButtons');
    
    if (userInfo && loginButtons && userName) {
        userInfo.style.display = 'flex';
        loginButtons.style.display = 'none';
        userName.textContent = `歡迎, ${currentUser.name || currentUser.username}`;
        
        // 如果是管理員，顯示管理員按鈕
        if (adminButtons && currentUser && currentUser.role === 'admin') {
            adminButtons.style.display = 'inline-block';
        } else if (adminButtons) {
            adminButtons.style.display = 'none';
        }
    }
}

// 更新UI為未登入狀態
function updateUIForLoggedOut() {
    const userInfo = document.getElementById('userInfo');
    const loginButtons = document.getElementById('loginButtons');
    
    if (userInfo && loginButtons) {
        userInfo.style.display = 'none';
        loginButtons.style.display = 'flex';
    }
    
    currentUser = null;
}

// 顯示登入模態框
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('loginUsername').focus();
    }
}

// 關閉登入模態框
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('loginForm').reset();
    }
}

// 顯示註冊模態框
function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('registerUsername').focus();
    }
}

// 關閉註冊模態框
function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('registerForm').reset();
    }
}

// 切換到註冊
function switchToRegister() {
    closeLoginModal();
    showRegisterModal();
}

// 切換到登入
function switchToLogin() {
    closeRegisterModal();
    showLoginModal();
}

// 處理登入
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('請輸入用戶名和密碼');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUIForLoggedIn();
            closeLoginModal();
            alert('登入成功！');
        } else {
            alert(`登入失敗: ${data.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('登入錯誤:', error);
        alert('登入時發生錯誤，請稍後再試');
    }
}

// 處理註冊
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const name = document.getElementById('registerName').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    
    if (!username || !password) {
        alert('請輸入用戶名和密碼');
        return;
    }
    
    if (username.length < 3) {
        alert('用戶名至少需要3個字符');
        return;
    }
    
    if (password.length < 6) {
        alert('密碼至少需要6個字符');
        return;
    }
    
    if (password !== passwordConfirm) {
        alert('兩次輸入的密碼不一致');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, name, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUIForLoggedIn();
            closeRegisterModal();
            alert('註冊成功！已自動登入');
        } else {
            alert(`註冊失敗: ${data.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('註冊錯誤:', error);
        alert('註冊時發生錯誤，請稍後再試');
    }
}

// 登出
async function logout() {
    if (!confirm('確定要登出嗎？')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            currentUser = null;
            updateUIForLoggedOut();
            cart = [];
            updateCart();
            alert('已登出');
        } else {
            alert('登出失敗');
        }
    } catch (error) {
        console.error('登出錯誤:', error);
        alert('登出時發生錯誤');
    }
}

// 顯示帳號設定模態框
function showProfileModal() {
    if (!currentUser) {
        alert('請先登入');
        return;
    }
    
    const modal = document.getElementById('profileModal');
    if (modal) {
        // 載入當前用戶信息
        document.getElementById('profileUsername').value = currentUser.username || '';
        document.getElementById('profileName').value = currentUser.name || '';
        document.getElementById('profileNewPassword').value = '';
        document.getElementById('profileConfirmPassword').value = '';
        document.getElementById('profileOldPassword').value = '';
        document.getElementById('oldPasswordGroup').style.display = 'none';
        
        modal.style.display = 'block';
    }
}

// 關閉帳號設定模態框
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('profileForm').reset();
    }
}

// 處理帳號設定更新
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('請先登入');
        return;
    }
    
    const username = document.getElementById('profileUsername').value.trim();
    const name = document.getElementById('profileName').value.trim();
    const newPassword = document.getElementById('profileNewPassword').value;
    const confirmPassword = document.getElementById('profileConfirmPassword').value;
    const oldPassword = document.getElementById('profileOldPassword').value;
    
    // 驗證用戶名
    if (!username || username.length < 3) {
        alert('用戶名至少需要3個字符');
        return;
    }
    
    // 如果提供了新密碼，驗證密碼
    if (newPassword) {
        if (newPassword.length < 6) {
            alert('密碼至少需要6個字符');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('兩次輸入的新密碼不一致');
            return;
        }
        
        if (!oldPassword) {
            alert('更改密碼時需要輸入舊密碼');
            return;
        }
    }
    
    try {
        const updateData = {
            username: username,
            name: name || null
        };
        
        // 如果提供了新密碼，添加到更新數據中
        if (newPassword) {
            updateData.password = newPassword;
            updateData.old_password = oldPassword;
        }
        
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 更新當前用戶信息
            currentUser = data.user;
            updateUIForLoggedIn();
            closeProfileModal();
            alert('資料更新成功！');
        } else {
            alert(`更新失敗: ${data.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('更新資料錯誤:', error);
        alert('更新資料時發生錯誤，請稍後再試');
    }
}

// 載入商品列表
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (response.ok) {
            products = await response.json();
            displayProducts(products);
        } else {
            console.error('載入商品失敗');
            showError('無法載入商品列表');
        }
    } catch (error) {
        console.error('錯誤:', error);
        showError('無法連接到伺服器，請確認後端服務是否運行');
    }
}

// 顯示商品
function displayProducts(productsToShow) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    if (productsToShow.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">沒有找到商品</p>';
        return;
    }

    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card" onclick="addToCart(${product.id})">
            <h3>${escapeHtml(product.name)}</h3>
            <div class="price">NT$ ${product.price.toFixed(2)}</div>
            <div class="stock ${product.stock < 10 ? 'low' : ''}">
                庫存: ${product.stock}
            </div>
            ${product.description ? `<p style="font-size: 12px; color: #666; margin-top: 8px;">${escapeHtml(product.description)}</p>` : ''}
        </div>
    `).join('');
}

// 過濾商品
function filterProducts(searchTerm) {
    const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayProducts(filtered);
}

// 添加到購物車
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        alert('商品庫存不足');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            alert('已達庫存上限');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock
        });
    }

    updateCart();
}

// 更新購物車顯示
function updateCart() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">購物車是空的</p>';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <div class="item-price">NT$ ${item.price.toFixed(2)} × ${item.quantity}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="decreaseQuantity(${item.id})">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">移除</button>
                </div>
            </div>
        `).join('');
    }

    updateCartSummary();
}

// 更新購物車總計
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `NT$ ${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `NT$ ${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `NT$ ${total.toFixed(2)}`;
}

// 增加數量
function increaseQuantity(productId) {
    const item = cart.find(i => i.id === productId);
    if (item && item.quantity < item.stock) {
        item.quantity++;
        updateCart();
    } else {
        alert('已達庫存上限');
    }
}

// 減少數量
function decreaseQuantity(productId) {
    const item = cart.find(i => i.id === productId);
    if (item && item.quantity > 1) {
        item.quantity--;
        updateCart();
    } else {
        removeFromCart(productId);
    }
}

// 從購物車移除
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCart();
}

// 清空購物車
function clearCart() {
    if (cart.length === 0) return;
    if (confirm('確定要清空購物車嗎？')) {
        cart = [];
        updateCart();
    }
}

// 結帳
async function checkout() {
    if (!currentUser) {
        alert('請先登入才能結帳');
        showLoginModal();
        return;
    }
    
    if (cart.length === 0) {
        alert('購物車是空的');
        return;
    }

    if (!confirm('確定要結帳嗎？')) return;

    try {
        const orderData = {
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price: item.price
            })),
            subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            tax: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.05,
            total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.05
        };

        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const result = await response.json();
            alert(`結帳成功！訂單編號: ${result.order_id}`);
            cart = [];
            updateCart();
            loadProducts(); // 重新載入商品以更新庫存
        } else {
            const error = await response.json();
            alert(`結帳失敗: ${error.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('結帳錯誤:', error);
        alert('結帳時發生錯誤，請稍後再試');
    }
}

// 顯示商品管理模態框
function showProductModal() {
    if (!currentUser) {
        alert('請先登入才能管理商品');
        showLoginModal();
        return;
    }
    
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'block';
        loadProductList();
        resetProductForm();
    }
}

// 關閉商品管理模態框
function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 重置商品表單
function resetProductForm() {
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDescription').value = '';
}

// 處理商品表單提交
async function handleProductSubmit(e) {
    e.preventDefault();

    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        description: document.getElementById('productDescription').value
    };

    try {
        let response;
        if (productId) {
            // 更新商品
            response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(productData)
            });
        } else {
            // 新增商品
            response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(productData)
            });
        }

        if (response.ok) {
            alert(productId ? '商品更新成功' : '商品新增成功');
            resetProductForm();
            loadProducts();
            loadProductList();
        } else {
            const error = await response.json();
            alert(`操作失敗: ${error.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('錯誤:', error);
        alert('操作時發生錯誤，請稍後再試');
    }
}

// 載入商品列表（用於管理）
async function loadProductList() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (response.ok) {
            const productList = await response.json();
            displayProductList(productList);
        }
    } catch (error) {
        console.error('載入商品列表失敗:', error);
    }
}

// 顯示商品列表（用於管理）
function displayProductList(products) {
    const productList = document.getElementById('productList');
    if (!productList) return;

    if (products.length === 0) {
        productList.innerHTML = '<p style="text-align: center; color: #999;">尚無商品</p>';
        return;
    }

    productList.innerHTML = products.map(product => `
        <div class="product-item">
            <div class="product-item-info">
                <h4>${escapeHtml(product.name)}</h4>
                <div class="product-details">
                    價格: NT$ ${product.price.toFixed(2)} | 庫存: ${product.stock}
                    ${product.description ? ` | ${escapeHtml(product.description)}` : ''}
                </div>
            </div>
            <div class="product-item-actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">編輯</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">刪除</button>
            </div>
        </div>
    `).join('');
}

// 編輯商品
async function editProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description || '';
        }
    } catch (error) {
        console.error('載入商品失敗:', error);
        alert('無法載入商品資訊');
    }
}

// 刪除商品
async function deleteProduct(productId) {
    if (!confirm('確定要刪除這個商品嗎？')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            alert('商品刪除成功');
            loadProducts();
            loadProductList();
        } else {
            const error = await response.json();
            alert(`刪除失敗: ${error.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('刪除錯誤:', error);
        alert('刪除時發生錯誤，請稍後再試');
    }
}

// 顯示訂單記錄
async function showOrderHistory() {
    // 先檢查登入狀態
    try {
        const statusResponse = await fetch(`${API_BASE_URL}/auth/status`, {
            credentials: 'include'
        });
        
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (!statusData.logged_in) {
                alert('請先登入才能查看訂單記錄');
                showLoginModal();
                return;
            }
            // 更新 currentUser
            currentUser = statusData.user;
        } else {
            alert('請先登入才能查看訂單記錄');
            showLoginModal();
            return;
        }
    } catch (error) {
        console.error('檢查登入狀態失敗:', error);
        alert('無法檢查登入狀態，請稍後再試');
        return;
    }
    
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'block';
        await loadOrderHistory();
    }
}

// 關閉訂單記錄模態框
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 載入訂單記錄
async function loadOrderHistory() {
    const orderHistory = document.getElementById('orderHistory');
    if (!orderHistory) return;
    
    // 顯示載入中
    orderHistory.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">載入中...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrderHistory(orders);
        } else if (response.status === 401) {
            // 如果收到 401，關閉模態框並提示登入
            closeOrderModal();
            currentUser = null;
            updateUIForLoggedOut();
            alert('登入已過期，請重新登入');
            showLoginModal();
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            orderHistory.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">無法載入訂單記錄: ${error.error || '未知錯誤'}</p>`;
        }
    } catch (error) {
        console.error('載入訂單記錄失敗:', error);
        orderHistory.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">無法連接到伺服器，請確認後端服務是否運行</p>';
    }
}

// 顯示訂單記錄
function displayOrderHistory(orders) {
    const orderHistory = document.getElementById('orderHistory');
    if (!orderHistory) return;

    if (orders.length === 0) {
        orderHistory.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">您目前尚無訂單記錄</p>';
        return;
    }

    orderHistory.innerHTML = orders.map(order => `
        <div class="order-item">
            <h4>訂單 #${order.id}</h4>
            <div class="order-details">日期: ${new Date(order.created_at).toLocaleString('zh-TW')}</div>
            <div class="order-details">商品數量: ${order.items.length} 項</div>
            <div class="order-details">
                商品: ${order.items.map(item => `${escapeHtml(item.name)} × ${item.quantity}`).join(', ')}
            </div>
            <div class="order-total">總計: NT$ ${parseFloat(order.total).toFixed(2)}</div>
            <div class="order-actions" style="margin-top: 10px; display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="editOrder(${order.id})" style="padding: 5px 15px; font-size: 14px;">編輯</button>
                <button class="btn btn-delete" onclick="deleteOrder(${order.id})" style="padding: 5px 15px; font-size: 14px; background-color: #e74c3c;">刪除</button>
            </div>
        </div>
    `).join('');
}

// 刪除訂單
async function deleteOrder(orderId) {
    if (!confirm('確定要刪除這個訂單嗎？刪除後將恢復商品庫存。')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('訂單刪除成功');
            await loadOrderHistory(); // 重新載入訂單記錄
            loadProducts(); // 重新載入商品以更新庫存顯示
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            alert(`刪除失敗: ${error.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('刪除訂單錯誤:', error);
        alert('刪除訂單時發生錯誤，請稍後再試');
    }
}

// 編輯訂單
async function editOrder(orderId) {
    try {
        // 獲取訂單詳情
        const response = await fetch(`${API_BASE_URL}/orders`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            alert('無法載入訂單資訊');
            return;
        }
        
        const orders = await response.json();
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            alert('找不到訂單');
            return;
        }
        
        // 顯示編輯模態框
        const modal = document.getElementById('editOrderModal');
        if (modal) {
            document.getElementById('editOrderId').value = order.id;
            document.getElementById('editOrderNumber').value = `#${order.id}`;
            document.getElementById('editOrderDate').value = new Date(order.created_at).toLocaleString('zh-TW');
            
            // 顯示訂單商品，允許編輯數量
            const editOrderItems = document.getElementById('editOrderItems');
            editOrderItems.innerHTML = order.items.map(item => {
                // 獲取當前商品庫存（考慮已訂購的數量）
                const product = products.find(p => p.id === item.product_id);
                const currentStock = product ? product.stock : 0;
                // 最大可訂購數量 = 當前庫存 + 原訂單中的數量（因為會先恢復庫存）
                const maxQuantity = currentStock + item.quantity;
                
                return `
                <div class="edit-order-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <div style="flex: 1;">
                        <strong>${escapeHtml(item.name)}</strong>
                        <div style="color: #666; font-size: 14px;">單價: NT$ ${item.price.toFixed(2)} | 可用庫存: ${maxQuantity}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <label>數量:</label>
                        <input type="number" 
                               class="order-item-quantity" 
                               data-product-id="${item.product_id}"
                               data-price="${item.price}"
                               data-max-stock="${maxQuantity}"
                               value="${item.quantity}" 
                               min="1"
                               max="${maxQuantity}"
                               style="width: 60px; padding: 5px;"
                               onchange="validateOrderItemQuantity(this)">
                    </div>
                    <button type="button" 
                            class="btn btn-delete" 
                            onclick="removeOrderItem(this)"
                            style="padding: 5px 10px; font-size: 12px; background-color: #e74c3c;">
                        移除
                    </button>
                </div>
            `;
            }).join('');
            
            // 添加「添加商品」按鈕
            const addButtonDiv = document.createElement('div');
            addButtonDiv.style.marginTop = '15px';
            const addProductBtn = document.createElement('button');
            addProductBtn.type = 'button';
            addProductBtn.className = 'btn btn-secondary';
            addProductBtn.textContent = '添加商品';
            addProductBtn.style.padding = '8px 15px';
            addProductBtn.addEventListener('click', function(e) {
                e.preventDefault();
                addProductToOrder();
            });
            addButtonDiv.appendChild(addProductBtn);
            editOrderItems.appendChild(addButtonDiv);
            
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('載入訂單錯誤:', error);
        alert('載入訂單時發生錯誤');
    }
}

// 移除訂單項目（編輯時）
function removeOrderItem(button) {
    if (confirm('確定要移除此商品嗎？')) {
        button.closest('.edit-order-item').remove();
        updateEditOrderSummary();
    }
}

// 添加商品到訂單（編輯時）
async function addProductToOrder() {
    try {
        console.log('addProductToOrder 被調用');
        console.log('當前 products:', products);
        
        // 檢查商品列表是否已載入
        if (!products || products.length === 0) {
            console.log('商品列表為空，嘗試載入...');
            await loadProducts();
            // 如果載入後還是空的，提示用戶
            if (!products || products.length === 0) {
                alert('目前沒有可用的商品');
                return;
            }
            console.log('商品列表載入成功，共', products.length, '個商品');
        }
        
        // 獲取訂單項目容器
        const editOrderItemsContainer = document.getElementById('editOrderItems');
        if (!editOrderItemsContainer) {
            console.error('找不到 editOrderItems 元素');
            alert('找不到訂單項目容器');
            return;
        }
        console.log('找到訂單項目容器');
        
        // 獲取當前訂單中已有的商品ID
        const existingProductIds = new Set();
        const existingQuantityInputs = editOrderItemsContainer.querySelectorAll('.order-item-quantity');
        existingQuantityInputs.forEach(input => {
            const productId = parseInt(input.getAttribute('data-product-id'));
            if (productId) {
                existingProductIds.add(productId);
            }
        });
        
        // 過濾掉已經在訂單中的商品
        const availableProducts = products.filter(p => !existingProductIds.has(p.id));
        console.log('可用商品數量:', availableProducts.length, '總商品數:', products.length);
        
        if (availableProducts.length === 0) {
            alert('所有商品都已添加到訂單中');
            return;
        }
        
        // 檢查是否已經有選擇器存在
        const existingContainer = document.querySelector('#addProductContainer');
        if (existingContainer) {
            console.log('移除現有的選擇器');
            existingContainer.remove();
        }
        
        // 創建一個簡單的商品選擇器
        const productSelect = document.createElement('select');
        productSelect.id = 'productSelectForOrder';
        productSelect.style.width = '200px';
        productSelect.style.padding = '8px';
        productSelect.style.marginRight = '10px';
        
        // 添加選項（只顯示未在訂單中的商品）
        try {
            productSelect.innerHTML = '<option value="">選擇商品...</option>' + 
                availableProducts.map(p => {
                    try {
                        return `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} - NT$ ${p.price.toFixed(2)} (庫存: ${p.stock})</option>`;
                    } catch (e) {
                        console.error('處理商品時出錯:', p, e);
                        return '';
                    }
                }).filter(opt => opt !== '').join('');
            console.log('商品選擇器創建成功');
        } catch (e) {
            console.error('創建商品選擇器選項時出錯:', e);
            throw e;
        }
    
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.value = '1';
    quantityInput.style.width = '80px';
    quantityInput.style.padding = '5px';
    quantityInput.style.marginLeft = '10px';
    
    // 先創建容器，這樣在 onclick 函數中就可以訪問
    const container = document.createElement('div');
    container.id = 'addProductContainer';
    container.style.cssText = 'display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;';
    
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn btn-primary';
    addButton.textContent = '添加';
    addButton.onclick = function() {
        try {
            const selectedOption = productSelect.options[productSelect.selectedIndex];
            if (!selectedOption.value) {
                alert('請選擇商品');
                return;
            }
            
            const productId = parseInt(selectedOption.value);
            const price = parseFloat(selectedOption.dataset.price);
            const quantity = parseInt(quantityInput.value);
            
            // 確保 products 已載入
            if (!products || products.length === 0) {
                alert('商品列表尚未載入，請稍候再試');
                return;
            }
            
            const product = products.find(p => p.id === productId);
        
        if (!product) {
            alert('找不到商品');
            return;
        }
        
        if (quantity > product.stock) {
            alert('庫存不足');
            return;
        }
        
        // 檢查數量是否有效
        if (quantity < 1) {
            alert('數量至少為 1');
            return;
        }
        
        // 添加新項目（因為已經過濾掉已存在的商品，所以直接添加）
        const editOrderItemsContainer = document.getElementById('editOrderItems');
        if (!editOrderItemsContainer) {
            alert('找不到訂單項目容器');
            return;
        }
        
        const newItem = document.createElement('div');
        newItem.className = 'edit-order-item';
        newItem.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;';
        newItem.innerHTML = `
            <div style="flex: 1;">
                <strong>${escapeHtml(product.name)}</strong>
                <div style="color: #666; font-size: 14px;">單價: NT$ ${price.toFixed(2)} | 可用庫存: ${product.stock}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <label>數量:</label>
                <input type="number" 
                       class="order-item-quantity" 
                       data-product-id="${productId}"
                       data-price="${price}"
                       value="${quantity}" 
                       min="1"
                       max="${product.stock}"
                       data-max-stock="${product.stock}"
                       style="width: 60px; padding: 5px;"
                       onchange="validateOrderItemQuantity(this)">
            </div>
            <button type="button" 
                    class="btn btn-delete" 
                    onclick="removeOrderItem(this)"
                    style="padding: 5px 10px; font-size: 12px; background-color: #e74c3c;">
                移除
            </button>
        `;
        
        // 插入到「添加商品」按鈕之前
        // 找到包含「添加商品」按鈕的 div（最後一個直接子元素）
        const lastChild = editOrderItemsContainer.lastElementChild;
        if (lastChild) {
            // 檢查是否是最後一個子元素且包含「添加商品」按鈕
            const addButton = lastChild.querySelector && lastChild.querySelector('button');
            if (addButton && addButton.textContent.trim() === '添加商品') {
                // 確保 lastChild 是 editOrderItemsContainer 的直接子節點
                if (lastChild.parentNode === editOrderItemsContainer) {
                    editOrderItemsContainer.insertBefore(newItem, lastChild);
                } else {
                    editOrderItemsContainer.appendChild(newItem);
                }
            } else {
                editOrderItemsContainer.appendChild(newItem);
            }
        } else {
            editOrderItemsContainer.appendChild(newItem);
        }
        updateEditOrderSummary();
        
        // 移除選擇器容器
        if (container && container.parentNode) {
            container.remove();
        }
        } catch (error) {
            console.error('添加商品按鈕點擊時發生錯誤:', error);
            alert('添加商品時發生錯誤: ' + (error.message || '未知錯誤'));
        }
    };
    
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.textContent = '取消';
    cancelButton.style.marginLeft = '10px';
    cancelButton.onclick = function() {
        if (container && container.parentNode) {
            container.remove();
        }
    };
    
    // 將元素添加到容器
    container.appendChild(productSelect);
    container.appendChild(quantityInput);
    container.appendChild(addButton);
    container.appendChild(cancelButton);
    
    // 插入到「添加商品」按鈕之前
    // 找到包含「添加商品」按鈕的 div（最後一個直接子元素）
    const lastChild = editOrderItemsContainer.lastElementChild;
    if (lastChild) {
        // 檢查是否是最後一個子元素且包含「添加商品」按鈕
        const addButton = lastChild.querySelector && lastChild.querySelector('button');
        if (addButton && addButton.textContent.trim() === '添加商品') {
            // 確保 lastChild 是 editOrderItemsContainer 的直接子節點
            if (lastChild.parentNode === editOrderItemsContainer) {
                editOrderItemsContainer.insertBefore(container, lastChild);
            } else {
                editOrderItemsContainer.appendChild(container);
            }
        } else {
            editOrderItemsContainer.appendChild(container);
        }
    } else {
        editOrderItemsContainer.appendChild(container);
    }
    } catch (error) {
        console.error('添加商品到訂單時發生錯誤:', error);
        console.error('錯誤堆棧:', error.stack);
        console.error('錯誤詳情:', {
            message: error.message,
            name: error.name,
            products: products,
            editOrderItems: document.getElementById('editOrderItems')
        });
        alert('添加商品時發生錯誤: ' + (error.message || '未知錯誤') + '\n請查看控制台獲取詳細信息');
    }
}

// 驗證訂單項目數量
function validateOrderItemQuantity(input) {
    const maxStock = parseInt(input.dataset.maxStock);
    const value = parseInt(input.value);
    
    if (value < 1) {
        input.value = 1;
        alert('數量至少為 1');
    } else if (value > maxStock) {
        input.value = maxStock;
        alert(`數量不能超過可用庫存 ${maxStock}`);
    }
}

// 更新編輯訂單摘要
function updateEditOrderSummary() {
    // 這個函數可以在編輯訂單時顯示實時總計
    // 目前先不實現，因為表單提交時會計算
}

// 關閉編輯訂單模態框
function closeEditOrderModal() {
    const modal = document.getElementById('editOrderModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('editOrderForm').reset();
    }
}

// 處理編輯訂單表單提交
document.addEventListener('DOMContentLoaded', () => {
    const editOrderForm = document.getElementById('editOrderForm');
    if (editOrderForm) {
        editOrderForm.addEventListener('submit', handleEditOrderSubmit);
    }
});

async function handleEditOrderSubmit(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('editOrderId').value;
    if (!orderId) {
        alert('訂單ID不存在');
        return;
    }
    
    // 收集訂單項目
    const quantityInputs = document.querySelectorAll('.order-item-quantity');
    const items = [];
    
    for (const input of quantityInputs) {
        const productId = parseInt(input.dataset.productId);
        const price = parseFloat(input.dataset.price);
        const quantity = parseInt(input.value);
        
        if (quantity > 0) {
            items.push({
                product_id: productId,
                quantity: quantity,
                price: price
            });
        }
    }
    
    if (items.length === 0) {
        alert('訂單至少需要一個商品');
        return;
    }
    
    // 計算總額
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                items: items,
                subtotal: subtotal,
                tax: tax,
                total: total
            })
        });
        
        if (response.ok) {
            alert('訂單更新成功');
            closeEditOrderModal();
            await loadOrderHistory(); // 重新載入訂單記錄
            loadProducts(); // 重新載入商品以更新庫存顯示
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            alert(`更新失敗: ${error.error || '未知錯誤'}`);
        }
    } catch (error) {
        console.error('更新訂單錯誤:', error);
        alert('更新訂單時發生錯誤，請稍後再試');
    }
}

// 工具函數：轉義HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 工具函數：顯示錯誤
function showError(message) {
    alert(message);
}

// 管理員統計功能

// 顯示管理員統計模態框
function showAdminStats() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('需要管理員權限');
        return;
    }
    
    const modal = document.getElementById('adminStatsModal');
    if (modal) {
        modal.style.display = 'block';
        // 找到第一個按鈕並激活
        const firstButton = document.querySelector('.admin-tabs .tab-btn');
        switchAdminTab('employee-sales', firstButton); // 默認顯示第一個標籤
    }
}

// 關閉管理員統計模態框
function closeAdminStatsModal() {
    const modal = document.getElementById('adminStatsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 切換管理員統計標籤
function switchAdminTab(tabName, buttonElement) {
    // 隱藏所有標籤內容
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有按鈕的active類
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 顯示選中的標籤內容
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // 添加按鈕的active類
    if (buttonElement) {
        buttonElement.classList.add('active');
    }
    
    // 載入對應的數據
    if (tabName === 'employee-sales') {
        loadEmployeeSales();
    } else if (tabName === 'daily-products') {
        loadDailyProductSales();
    } else if (tabName === 'employee-average') {
        loadEmployeeAverage();
    }
}

// 載入員工銷售數量
async function loadEmployeeSales() {
    const tableBody = document.getElementById('employeeSalesTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">載入中...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats/employee-sales`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">尚無員工銷售記錄</td></tr>';
            } else {
                tableBody.innerHTML = data.map(employee => `
                    <tr>
                        <td>${escapeHtml(employee.name || employee.username)}${employee.role === 'admin' ? ' <span style="color: #e74c3c; font-size: 12px;">(管理員)</span>' : ''}</td>
                        <td>${escapeHtml(employee.username)}</td>
                        <td>NT$ ${employee.total_sales.toFixed(2)}</td>
                        <td>${employee.total_items_sold}</td>
                    </tr>
                `).join('');
            }
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">載入失敗: ${error.error || '未知錯誤'}</td></tr>`;
        }
    } catch (error) {
        console.error('載入員工銷售數據失敗:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">無法連接到伺服器</td></tr>';
    }
}

// 載入當日產品銷售
async function loadDailyProductSales() {
    const tableBody = document.getElementById('dailyProductsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">載入中...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats/daily-product-sales`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">今日尚無產品銷售記錄</td></tr>';
            } else {
                tableBody.innerHTML = data.map(product => `
                    <tr>
                        <td>${escapeHtml(product.name)}</td>
                        <td>NT$ ${product.price.toFixed(2)}</td>
                        <td>${product.quantity_sold}</td>
                        <td>NT$ ${product.total_revenue.toFixed(2)}</td>
                    </tr>
                `).join('');
            }
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">載入失敗: ${error.error || '未知錯誤'}</td></tr>`;
        }
    } catch (error) {
        console.error('載入當日產品銷售數據失敗:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">無法連接到伺服器</td></tr>';
    }
}

// 載入員工平均銷售
async function loadEmployeeAverage() {
    const tableBody = document.getElementById('employeeAverageTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">載入中...</td></tr>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats/employee-average`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">尚無員工銷售記錄</td></tr>';
            } else {
                tableBody.innerHTML = data.map(employee => `
                    <tr>
                        <td>${escapeHtml(employee.name || employee.username)}${employee.role === 'admin' ? ' <span style="color: #e74c3c; font-size: 12px;">(管理員)</span>' : ''}</td>
                        <td>${escapeHtml(employee.username)}</td>
                        <td>${employee.order_count}</td>
                        <td>NT$ ${employee.avg_order_amount.toFixed(2)}</td>
                        <td>${employee.avg_items_per_order.toFixed(2)}</td>
                    </tr>
                `).join('');
            }
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #e74c3c;">載入失敗: ${error.error || '未知錯誤'}</td></tr>`;
        }
    } catch (error) {
        console.error('載入員工平均銷售數據失敗:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #e74c3c;">無法連接到伺服器</td></tr>';
    }
}

// 點擊模態框外部關閉
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const orderModal = document.getElementById('orderModal');
    const editOrderModal = document.getElementById('editOrderModal');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const adminStatsModal = document.getElementById('adminStatsModal');
    const profileModal = document.getElementById('profileModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === orderModal) {
        closeOrderModal();
    }
    if (event.target === editOrderModal) {
        closeEditOrderModal();
    }
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === registerModal) {
        closeRegisterModal();
    }
    if (event.target === adminStatsModal) {
        closeAdminStatsModal();
    }
    if (event.target === profileModal) {
        closeProfileModal();
    }
}

