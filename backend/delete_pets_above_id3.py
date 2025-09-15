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
    
    print("=== 删除id大于3的宠物数据 ===")
    print(f"连接数据库成功: {db_path}")
    print()
    
    # 首先查询要删除的记录
    cursor.execute("SELECT id, name, type FROM pet WHERE id > 1")
    pets_to_delete = cursor.fetchall()
    
    if not pets_to_delete:
        print("没有找到id大于3的宠物记录")
    else:
        print(f"找到 {len(pets_to_delete)} 条需要删除的宠物记录:")
        print("-" * 50)
        for pet_id, name, pet_type in pets_to_delete:
            print(f"ID: {pet_id}, 名称: {name}, 类型: {pet_type}")
        print("-" * 50)
        
        # 确认删除
        confirm = input("确认删除以上宠物记录吗？(y/N): ")
        if confirm.lower() in ['y', 'yes']:
            # 执行删除操作
            cursor.execute("DELETE FROM pet WHERE id > 1")
            deleted_count = cursor.rowcount
            
            # 提交事务
            conn.commit()
            
            print(f"\n成功删除 {deleted_count} 条宠物记录")
            
            # 查询剩余的记录
            cursor.execute("SELECT COUNT(*) FROM pet")
            remaining_count = cursor.fetchone()[0]
            print(f"数据库中剩余 {remaining_count} 条宠物记录")
            
            # 显示剩余的记录
            if remaining_count > 0:
                cursor.execute("SELECT id, name, type FROM pet ORDER BY id")
                remaining_pets = cursor.fetchall()
                print("\n剩余的宠物记录:")
                print("-" * 30)
                for pet_id, name, pet_type in remaining_pets:
                    print(f"ID: {pet_id}, 名称: {name}, 类型: {pet_type}")
        else:
            print("取消删除操作")
    
    # 关闭连接
    conn.close()
    
except sqlite3.Error as e:
    print(f"数据库错误: {e}")
    if 'conn' in locals():
        conn.rollback()
finally:
    if 'conn' in locals() and conn:
        conn.close()

print()
print("=== 操作完成 ===")