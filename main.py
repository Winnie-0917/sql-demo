from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import os
import hashlib
import secrets

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = secrets.token_hex(16)  # 用於session管理
CORS(app, supports_credentials=True)  # 允許跨域請求並支持憑證

# 資料庫配置（XAMPP預設設定）
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # XAMPP預設密碼為空
    'database': 'pos_system',
    'charset': 'utf8mb4'
}

def get_db_connection():
    """建立資料庫連接"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"資料庫連接錯誤: {e}")
        return None

def init_database():
    """初始化資料庫和表格"""
    try:
        # 先連接到MySQL（不指定資料庫）
        connection = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = connection.cursor()
        
        # 創建資料庫（如果不存在）
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_CONFIG['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cursor.execute(f"USE {DB_CONFIG['database']}")
        
        # 創建用戶表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_username (username)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)

        # 創建商品表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        # 創建訂單表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                subtotal DECIMAL(10, 2) NOT NULL,
                tax DECIMAL(10, 2) NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        # 創建訂單項目表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id),
                INDEX idx_order_id (order_id),
                INDEX idx_product_id (product_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        
        
        connection.commit()
        cursor.close()
        connection.close()
        
        # 資料庫遷移：更新現有表結構
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # 檢查並添加 orders 表的 user_id 欄位（如果不存在）
            try:
                cursor.execute("""
                    SELECT COUNT(*) FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = %s 
                    AND TABLE_NAME = 'orders' 
                    AND COLUMN_NAME = 'user_id'
                """, (DB_CONFIG['database'],))
                
                if cursor.fetchone()[0] == 0:
                    print("正在更新 orders 表結構，添加 user_id 欄位...")
                    # 先檢查 users 表是否存在
                    cursor.execute("""
                        SELECT COUNT(*) FROM information_schema.TABLES 
                        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'users'
                    """, (DB_CONFIG['database'],))
                    
                    users_exists = cursor.fetchone()[0] > 0
                    
                    if users_exists:
                        # 添加 user_id 欄位和索引
                        cursor.execute("""
                            ALTER TABLE orders 
                            ADD COLUMN user_id INT NULL AFTER id,
                            ADD INDEX idx_user_id (user_id)
                        """)
                        connection.commit()
                        
                        # 嘗試添加外鍵約束
                        try:
                            # 先檢查外鍵是否已存在
                            cursor.execute("""
                                SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE 
                                WHERE TABLE_SCHEMA = %s 
                                AND TABLE_NAME = 'orders' 
                                AND CONSTRAINT_NAME = 'fk_orders_user'
                            """, (DB_CONFIG['database'],))
                            
                            if cursor.fetchone()[0] == 0:
                                cursor.execute("""
                                    ALTER TABLE orders 
                                    ADD CONSTRAINT fk_orders_user 
                                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                                """)
                                connection.commit()
                        except Error as fk_error:
                            # 如果外鍵創建失敗（可能是因為已有數據不符合約束），只記錄但不中斷
                            print(f"注意: 無法添加外鍵約束: {fk_error}")
                            print("user_id 欄位已添加，但外鍵約束未創建（這不影響功能）")
                        
                        print("orders 表結構更新成功！")
                    else:
                        print("警告: users 表不存在，無法添加 user_id 欄位")
            except Error as e:
                print(f"更新表結構時發生錯誤: {e}")
                # 繼續執行，不中斷初始化
            
            cursor.close()
            connection.close()
        
        # 插入一些範例商品和默認用戶（如果表格是空的）
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # 插入範例商品
            cursor.execute("SELECT COUNT(*) FROM products")
            count = cursor.fetchone()[0]
            
            if count == 0:
                sample_products = [
                    ('可樂', 30.00, 100, '經典可樂飲料'),
                    ('薯片', 50.00, 80, '原味薯片'),
                    ('巧克力', 45.00, 60, '牛奶巧克力'),
                    ('礦泉水', 20.00, 150, '純淨礦泉水'),
                    ('麵包', 35.00, 50, '新鮮麵包')
                ]
                cursor.executemany("""
                    INSERT INTO products (name, price, stock, description)
                    VALUES (%s, %s, %s, %s)
                """, sample_products)
                connection.commit()
            
            # 插入默認管理員帳號（如果不存在）
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
            admin_exists = cursor.fetchone()[0]
            
            if admin_exists == 0:
                # 默認密碼: admin123 (使用SHA256哈希)
                default_password = hashlib.sha256('admin123'.encode()).hexdigest()
                cursor.execute("""
                    INSERT INTO users (username, password, name, role)
                    VALUES (%s, %s, %s, %s)
                """, ('admin', default_password, '系統管理員', 'admin'))
                connection.commit()
                print("已創建默認管理員帳號: admin / admin123")
            
            cursor.close()
            connection.close()
        
        print("資料庫初始化成功！")
        return True
    except Error as e:
        print(f"資料庫初始化錯誤: {e}")
        return False

# 提供靜態文件
@app.route('/')
def index():
    """提供主頁"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """提供靜態文件（CSS、JS等）"""
    return send_from_directory('.', path)

# 工具函數：密碼哈希
def hash_password(password):
    """對密碼進行SHA256哈希"""
    return hashlib.sha256(password.encode()).hexdigest()

# 工具函數：檢查登入狀態
def check_login():
    """檢查用戶是否已登入"""
    return 'user_id' in session

# 工具函數：檢查管理員權限
def check_admin():
    """檢查用戶是否為管理員"""
    return check_login() and session.get('role') == 'admin'

# API路由 - 用戶認證

@app.route('/api/auth/register', methods=['POST'])
def register():
    """用戶註冊"""
    data = request.json
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': '缺少必要欄位'}), 400
    
    username = data['username'].strip()
    password = data['password']
    name = data.get('name', '').strip()
    
    if len(username) < 3:
        return jsonify({'error': '用戶名至少需要3個字符'}), 400
    
    if len(password) < 6:
        return jsonify({'error': '密碼至少需要6個字符'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor()
        
        # 檢查用戶名是否已存在
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': '用戶名已存在'}), 400
        
        # 創建新用戶
        hashed_password = hash_password(password)
        cursor.execute("""
            INSERT INTO users (username, password, name, role)
            VALUES (%s, %s, %s, %s)
        """, (username, hashed_password, name or username, 'user'))
        
        user_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        connection.close()
        
        # 自動登入
        session['user_id'] = user_id
        session['username'] = username
        session['name'] = name or username
        session['role'] = 'user'
        
        return jsonify({
            'message': '註冊成功',
            'user': {
                'id': user_id,
                'username': username,
                'name': name or username,
                'role': 'user'
            }
        }), 201
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用戶登入"""
    data = request.json
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': '請輸入用戶名和密碼'}), 400
    
    username = data['username'].strip()
    password = data['password']
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        hashed_password = hash_password(password)
        
        cursor.execute("""
            SELECT id, username, name, role FROM users
            WHERE username = %s AND password = %s
        """, (username, hashed_password))
        
        user = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not user:
            return jsonify({'error': '用戶名或密碼錯誤'}), 401
        
        # 設置session
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['name'] = user['name'] or user['username']
        session['role'] = user['role']
        
        return jsonify({
            'message': '登入成功',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'name': user['name'] or user['username'],
                'role': user['role']
            }
        })
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用戶登出"""
    session.clear()
    return jsonify({'message': '登出成功'})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """檢查登入狀態"""
    if check_login():
        return jsonify({
            'logged_in': True,
            'user': {
                'id': session.get('user_id'),
                'username': session.get('username'),
                'name': session.get('name'),
                'role': session.get('role')
            }
        })
    else:
        return jsonify({'logged_in': False})

@app.route('/api/auth/profile', methods=['PUT'])
def update_profile():
    """更新用戶資料（用戶名、密碼、姓名）"""
    if not check_login():
        return jsonify({'error': '請先登入'}), 401
    
    data = request.json
    if not data:
        return jsonify({'error': '缺少資料'}), 400
    
    user_id = session.get('user_id')
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor()
        
        # 獲取當前用戶信息
        cursor.execute("SELECT username, password FROM users WHERE id = %s", (user_id,))
        current_user = cursor.fetchone()
        if not current_user:
            cursor.close()
            connection.close()
            return jsonify({'error': '用戶不存在'}), 404
        
        updates = []
        params = []
        
        # 更新用戶名（如果提供）
        if 'username' in data and data['username']:
            new_username = data['username'].strip()
            if len(new_username) < 3:
                cursor.close()
                connection.close()
                return jsonify({'error': '用戶名至少需要3個字符'}), 400
            
            # 檢查新用戶名是否已被其他用戶使用
            cursor.execute("SELECT id FROM users WHERE username = %s AND id != %s", (new_username, user_id))
            if cursor.fetchone():
                cursor.close()
                connection.close()
                return jsonify({'error': '用戶名已被使用'}), 400
            
            updates.append("username = %s")
            params.append(new_username)
        
        # 更新密碼（如果提供）
        if 'password' in data and data['password']:
            new_password = data['password']
            if len(new_password) < 6:
                cursor.close()
                connection.close()
                return jsonify({'error': '密碼至少需要6個字符'}), 400
            
            # 驗證舊密碼（如果提供）
            if 'old_password' in data and data['old_password']:
                old_password_hash = hash_password(data['old_password'])
                if current_user[1] != old_password_hash:
                    cursor.close()
                    connection.close()
                    return jsonify({'error': '舊密碼錯誤'}), 400
            
            hashed_password = hash_password(new_password)
            updates.append("password = %s")
            params.append(hashed_password)
        
        # 更新姓名（如果提供）
        if 'name' in data:
            new_name = data['name'].strip() if data['name'] else None
            updates.append("name = %s")
            params.append(new_name)
        
        if not updates:
            cursor.close()
            connection.close()
            return jsonify({'error': '沒有需要更新的資料'}), 400
        
        # 執行更新
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, params)
        connection.commit()
        
        # 獲取更新後的用戶信息
        cursor.execute("SELECT id, username, name, role FROM users WHERE id = %s", (user_id,))
        updated_user = cursor.fetchone()
        
        # 更新session
        if 'username' in data and data['username']:
            session['username'] = updated_user[1]
        if 'name' in data:
            session['name'] = updated_user[2] or updated_user[1]
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '資料更新成功',
            'user': {
                'id': updated_user[0],
                'username': updated_user[1],
                'name': updated_user[2] or updated_user[1],
                'role': updated_user[3]
            }
        })
    except Error as e:
        return jsonify({'error': str(e)}), 500

# API路由 - 商品管理

@app.route('/api/products', methods=['GET'])
def get_products():
    """獲取所有商品"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM products ORDER BY id DESC")
        products = cursor.fetchall()
        
        # 轉換Decimal為float以便JSON序列化
        for product in products:
            product['price'] = float(product['price'])
            product['stock'] = int(product['stock'])
        
        cursor.close()
        connection.close()
        return jsonify(products)
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """獲取單一商品"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cursor.fetchone()
        
        if not product:
            return jsonify({'error': '商品不存在'}), 404
        
        product['price'] = float(product['price'])
        product['stock'] = int(product['stock'])
        
        cursor.close()
        connection.close()
        return jsonify(product)
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['POST'])
def create_product():
    """創建新商品"""
    data = request.json
    
    if not data or not data.get('name') or not data.get('price') or not data.get('stock'):
        return jsonify({'error': '缺少必要欄位'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO products (name, price, stock, description)
            VALUES (%s, %s, %s, %s)
        """, (
            data['name'],
            data['price'],
            data['stock'],
            data.get('description', '')
        ))
        connection.commit()
        product_id = cursor.lastrowid
        cursor.close()
        connection.close()
        
        return jsonify({'id': product_id, 'message': '商品創建成功'}), 201
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    """更新商品"""
    data = request.json
    
    if not data:
        return jsonify({'error': '缺少資料'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor()
        
        # 檢查商品是否存在
        cursor.execute("SELECT id FROM products WHERE id = %s", (product_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': '商品不存在'}), 404
        
        # 更新商品
        cursor.execute("""
            UPDATE products
            SET name = %s, price = %s, stock = %s, description = %s
            WHERE id = %s
        """, (
            data.get('name'),
            data.get('price'),
            data.get('stock'),
            data.get('description', ''),
            product_id
        ))
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': '商品更新成功'})
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    """刪除商品"""
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        # 設置為手動提交模式（禁用自動提交）
        connection.autocommit = False
        cursor = connection.cursor()
        
        # 檢查商品是否存在
        cursor.execute("SELECT id FROM products WHERE id = %s", (product_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': '商品不存在'}), 404
        
        # 先刪除所有相關的訂單項目（因為外鍵約束）
        cursor.execute("DELETE FROM order_items WHERE product_id = %s", (product_id,))
        
        # 然後刪除商品
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        
        # 提交事務
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': '商品刪除成功'})
    except Error as e:
        # 如果發生錯誤，回滾事務
        if connection:
            connection.rollback()
            cursor.close()
            connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['POST'])
def create_order():
    """創建訂單"""
    # 檢查登入狀態
    if not check_login():
        return jsonify({'error': '請先登入才能結帳'}), 401
    
    data = request.json
    
    if not data or not data.get('items'):
        return jsonify({'error': '缺少訂單項目'}), 400
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        # 設置為手動提交模式（禁用自動提交）
        connection.autocommit = False
        cursor = connection.cursor()
        
        # 檢查庫存並更新
        for item in data['items']:
            product_id = item['product_id']
            quantity = item['quantity']
            
            cursor.execute("SELECT stock FROM products WHERE id = %s", (product_id,))
            result = cursor.fetchone()
            
            if not result:
                connection.rollback()
                cursor.close()
                connection.close()
                return jsonify({'error': f'商品 ID {product_id} 不存在'}), 400
            
            current_stock = result[0]
            if current_stock < quantity:
                connection.rollback()
                cursor.close()
                connection.close()
                return jsonify({'error': f'商品 ID {product_id} 庫存不足'}), 400
            
            # 更新庫存
            cursor.execute("""
                UPDATE products SET stock = stock - %s WHERE id = %s
            """, (quantity, product_id))
        
        # 獲取當前登入用戶ID
        user_id = session.get('user_id') if 'user_id' in session else None
        
        # 創建訂單
        cursor.execute("""
            INSERT INTO orders (user_id, subtotal, tax, total)
            VALUES (%s, %s, %s, %s)
        """, (
            user_id,
            data['subtotal'],
            data['tax'],
            data['total']
        ))
        order_id = cursor.lastrowid
        
        # 創建訂單項目
        for item in data['items']:
            cursor.execute("""
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (%s, %s, %s, %s)
            """, (
                order_id,
                item['product_id'],
                item['quantity'],
                item['price']
            ))
        
        # 提交事務
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'order_id': order_id, 'message': '訂單創建成功'}), 201
    except Error as e:
        # 如果發生錯誤，回滾事務
        if connection:
            connection.rollback()
            cursor.close()
            connection.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """獲取當前登入用戶的訂單"""
    # 檢查登入狀態
    if not check_login():
        return jsonify({'error': '請先登入'}), 401
    
    user_id = session.get('user_id')
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 只獲取當前用戶的訂單
        cursor.execute("""
            SELECT o.*, 
                   GROUP_CONCAT(
                       CONCAT(oi.quantity, 'x ', p.name, ' (NT$', oi.price, ')')
                       SEPARATOR ', '
                   ) as items_display
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = %s
            GROUP BY o.id
            ORDER BY o.created_at DESC
        """, (user_id,))
        orders = cursor.fetchall()
        
        # 獲取每個訂單的詳細項目
        for order in orders:
            order['total'] = float(order['total'])
            order['subtotal'] = float(order['subtotal'])
            order['tax'] = float(order['tax'])
            
            # 獲取訂單項目詳情
            cursor.execute("""
                SELECT oi.*, p.name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = %s
            """, (order['id'],))
            items = cursor.fetchall()
            
            for item in items:
                item['price'] = float(item['price'])
                item['quantity'] = int(item['quantity'])
            
            order['items'] = items
        
        cursor.close()
        connection.close()
        return jsonify(orders)
    except Error as e:
        return jsonify({'error': str(e)}), 500

# 管理員統計API

@app.route('/api/admin/stats/employee-sales', methods=['GET'])
def get_employee_sales():
    """獲取各位員工銷售數量"""
    if not check_admin():
        return jsonify({'error': '需要管理員權限'}), 403
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 查詢每位員工的銷售數量（總金額和商品數量）
        cursor.execute("""
            SELECT 
                u.id,
                u.username,
                u.name,
                COALESCE(SUM(o.total), 0) as total_sales,
                COALESCE(SUM(oi.quantity), 0) as total_items_sold
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE u.role = 'user'
            GROUP BY u.id, u.username, u.name
            ORDER BY total_sales DESC
        """)
        
        results = cursor.fetchall()
        
        # 轉換數據類型
        for result in results:
            result['total_sales'] = float(result['total_sales'])
            result['total_items_sold'] = int(result['total_items_sold'])
        
        cursor.close()
        connection.close()
        return jsonify(results)
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats/daily-product-sales', methods=['GET'])
def get_daily_product_sales():
    """獲取當日產品銷售數量"""
    if not check_admin():
        return jsonify({'error': '需要管理員權限'}), 403
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 查詢當日每種產品的銷售數量
        cursor.execute("""
            SELECT 
                p.id,
                p.name,
                p.price,
                COALESCE(SUM(oi.quantity), 0) as quantity_sold,
                COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE DATE(o.created_at) = CURDATE() OR o.created_at IS NULL
            GROUP BY p.id, p.name, p.price
            ORDER BY quantity_sold DESC
        """)
        
        results = cursor.fetchall()
        
        # 轉換數據類型
        for result in results:
            result['price'] = float(result['price'])
            result['quantity_sold'] = int(result['quantity_sold'])
            result['total_revenue'] = float(result['total_revenue'])
        
        cursor.close()
        connection.close()
        return jsonify(results)
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats/employee-average', methods=['GET'])
def get_employee_average():
    """獲取每位員工銷售平均數量"""
    if not check_admin():
        return jsonify({'error': '需要管理員權限'}), 403
    
    connection = get_db_connection()
    if not connection:
        return jsonify({'error': '資料庫連接失敗'}), 500
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # 查詢每位員工的平均銷售數量（平均訂單金額、平均訂單商品數量）
        cursor.execute("""
            SELECT 
                u.id,
                u.username,
                u.name,
                COUNT(o.id) as order_count,
                CASE 
                    WHEN COUNT(o.id) > 0 THEN COALESCE(AVG(o.total), 0)
                    ELSE 0
                END as avg_order_amount,
                CASE 
                    WHEN COUNT(o.id) > 0 THEN COALESCE(AVG(order_item_count.item_count), 0)
                    ELSE 0
                END as avg_items_per_order
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            LEFT JOIN (
                SELECT order_id, SUM(quantity) as item_count
                FROM order_items
                GROUP BY order_id
            ) order_item_count ON o.id = order_item_count.order_id
            WHERE u.role = 'user'
            GROUP BY u.id, u.username, u.name
            ORDER BY avg_order_amount DESC
        """)
        
        results = cursor.fetchall()
        
        # 轉換數據類型
        for result in results:
            result['order_count'] = int(result['order_count'])
            result['avg_order_amount'] = float(result['avg_order_amount'])
            result['avg_items_per_order'] = float(result['avg_items_per_order'])
        
        cursor.close()
        connection.close()
        return jsonify(results)
    except Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康檢查"""
    return jsonify({'status': 'ok', 'message': 'POS系統API運行中'})

if __name__ == '__main__':
    print("正在初始化資料庫...")
    if init_database():
        print("資料庫初始化完成！")
        print("啟動Flask伺服器...")
        print("=" * 50)
        print("POS系統已啟動！")
        print("請在瀏覽器中訪問: http://localhost:5000")
        print("API服務運行在: http://localhost:5000/api")
        print("=" * 50)
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("資料庫初始化失敗，請檢查XAMPP是否運行並確認資料庫配置")

