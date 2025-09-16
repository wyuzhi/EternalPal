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
    
    print("=== 将所有Pet的user_id更新为0 ===")
    print(f"连接数据库成功: {db_path}")
    print(f"操作时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 首先查询当前所有宠物的信息
    cursor.execute("SELECT id, name, user_id FROM pet ORDER BY id")
    all_pets = cursor.fetchall()
    
    if not all_pets:
        print("数据库中没有找到任何宠物记录")
    else:
        print(f"找到 {len(all_pets)} 个宠物记录:")
        print("更新前的状态:")
        for pet_id, pet_name, current_user_id in all_pets:
            print(f"  ID={pet_id}, 名称='{pet_name}', user_id={current_user_id}")
        print()
        
        # 更新所有宠物的user_id为0
        cursor.execute("UPDATE pet SET user_id = 0")
        
        # 检查是否有行被更新
        if cursor.rowcount > 0:
            print(f"成功更新: {cursor.rowcount} 个宠物的user_id已更改为0")
            
            # 提交更改
            conn.commit()
            print("更改已提交到数据库")
            print()
            
            # 验证更新结果
            cursor.execute("SELECT id, name, user_id FROM pet ORDER BY id")
            updated_pets = cursor.fetchall()
            print("更新后的状态:")
            for pet_id, pet_name, new_user_id in updated_pets:
                print(f"  ID={pet_id}, 名称='{pet_name}', user_id={new_user_id}")
        else:
            print("警告：没有行被更新")
    
except sqlite3.Error as e:
    print(f"数据库错误: {e}")
    if 'conn' in locals():
        conn.rollback()
        print("已回滚更改")
except Exception as e:
    print(f"其他错误: {e}")
    if 'conn' in locals():
        conn.rollback()
        print("已回滚更改")
finally:
    if 'conn' in locals() and conn:
        conn.close()
        print()
        print("数据库连接已关闭")

print()
print("=== 更新完成 ===")