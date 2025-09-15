#!/usr/bin/env python3
import sqlite3
import os
from datetime import datetime

# 获取数据库路径
db_path = os.path.join(os.path.dirname(__file__), 'eternal_pal.db')

# 检查数据库文件是否存在
if not os.path.exists(db_path):
    print(f"错误：数据库文件不存在 - {db_path}")
    exit(1)

try:
    # 连接到数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=== 更新Pet的user_id ===")
    print(f"连接数据库成功: {db_path}")
    print()
    
    # 首先查询id为5的宠物当前信息
    cursor.execute("SELECT id, name, user_id FROM pet WHERE id = 4")
    pet_info = cursor.fetchone()
    
    if not pet_info:
        print("错误：未找到id为5的宠物")
    else:
        pet_id, pet_name, current_user_id = pet_info
        print(f"找到宠物: ID={pet_id}, 名称={pet_name}, 当前user_id={current_user_id}")
        
        # 更新user_id为1
        cursor.execute("UPDATE pet SET user_id = 1 WHERE id = 4")
        
        # 检查是否有行被更新
        if cursor.rowcount > 0:
            print(f"成功更新: 宠物'{pet_name}'的user_id已从{current_user_id}更改为1")
            
            # 提交更改
            conn.commit()
            
            # 验证更新结果
            cursor.execute("SELECT id, name, user_id FROM pet WHERE id = 5")
            updated_info = cursor.fetchone()
            if updated_info:
                print(f"验证结果: ID={updated_info[0]}, 名称={updated_info[1]}, 新user_id={updated_info[2]}")
        else:
            print("错误：没有行被更新")
    
except sqlite3.Error as e:
    print(f"数据库错误: {e}")
    if 'conn' in locals():
        conn.rollback()
finally:
    if 'conn' in locals() and conn:
        conn.close()

print()
print("=== 更新完成 ===")