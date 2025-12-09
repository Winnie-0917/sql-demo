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
    
    if (userInfo && loginButtons && userName) {
        userInfo.style.display = 'flex';
        loginButtons.style.display = 'none';
        userName.textContent = `歡迎, ${currentUser.name || currentUser.username}`;
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
    if (!currentUser) {
        alert('請先登入才能查看訂單記錄');
        showLoginModal();
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
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrderHistory(orders);
        } else if (response.status === 401) {
            orderHistory.innerHTML = '<p style="text-align: center; color: #e74c3c;">請先登入才能查看訂單記錄</p>';
        } else {
            const error = await response.json().catch(() => ({ error: '未知錯誤' }));
            orderHistory.innerHTML = `<p style="text-align: center; color: #999;">無法載入訂單記錄: ${error.error || '未知錯誤'}</p>`;
        }
    } catch (error) {
        console.error('載入訂單記錄失敗:', error);
        orderHistory.innerHTML = '<p style="text-align: center; color: #999;">無法連接到伺服器</p>';
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
                商品: ${order.items.map(item => `${item.name} × ${item.quantity}`).join(', ')}
            </div>
            <div class="order-total">總計: NT$ ${parseFloat(order.total).toFixed(2)}</div>
        </div>
    `).join('');
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

// 點擊模態框外部關閉
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const orderModal = document.getElementById('orderModal');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === orderModal) {
        closeOrderModal();
    }
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === registerModal) {
        closeRegisterModal();
    }
}

