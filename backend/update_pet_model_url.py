import sqlite3
import os

# 获取数据库路径
db_path = os.path.join(os.path.dirname(__file__), 'eternal_pal.db')

# 要更新的宠物ID和新的model_url
pet_id = 1
new_model_url = "http://127.0.0.1:5001/models/model_1756655049_1/obj/extracted/c6926b400abd8f812beb5441974736a6.obj"

try:
    # 连接到数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"连接数据库成功: {db_path}")
    
    # 先检查宠物是否存在
    cursor.execute("SELECT * FROM pet WHERE id = ?", (pet_id,))
    pet = cursor.fetchone()
    
    if not pet:
        print(f"错误：ID为{pet_id}的宠物不存在")
    else:
        # 执行更新操作
        cursor.execute("UPDATE pet SET model_url = ? WHERE id = ?", (new_model_url, pet_id))
        
        # 提交更改
        conn.commit()
        
        print(f"成功更新ID为{pet_id}的宠物的model_url")
        print(f"更新后model_url: {new_model_url}")
        
        # 验证更新是否成功
        cursor.execute("SELECT model_url FROM pet WHERE id = ?", (pet_id,))
        updated_model_url = cursor.fetchone()[0]
        print(f"数据库中实际存储的model_url: {updated_model_url}")
        
except sqlite3.Error as e:
    print(f"数据库错误: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
        print("数据库连接已关闭")