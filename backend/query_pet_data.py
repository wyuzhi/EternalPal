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
    
    print("=== 查询数据库中的Pet数据 ===")
    print(f"连接数据库成功: {db_path}")
    print()
    
    # 查询pet表的所有数据
    cursor.execute("SELECT * FROM pet")
    rows = cursor.fetchall()
    
    # 获取列名
    columns = [desc[0] for desc in cursor.description]
    
    if not rows:
        print("宠物表中没有数据")
    else:
        print(f"找到 {len(rows)} 条宠物记录:")
        print("=" * 80)
        
        # 打印列名
        print(" | ".join(f"{col:<15}" for col in columns))
        print("-" * 80)
        
        # 打印每条记录
        for row in rows:
            # 格式化时间
            formatted_row = []
            for i, value in enumerate(row):
                if columns[i] == 'created_at' and value:
                    try:
                        # 将字符串转换为datetime对象
                        dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S.%f')
                        formatted_row.append(dt.strftime('%Y-%m-%d %H:%M:%S'))
                    except:
                        formatted_row.append(str(value))
                # 对于URL类型的字段，不限制显示长度
                elif columns[i] in ['generated_image', 'model_url', 'preview_url']:
                    formatted_row.append(str(value))
                else:
                    formatted_row.append(str(value)[:15])  # 其他字段限制显示长度
            print(" | ".join(f"{val:<15}" for val in formatted_row))
    
    # 查询宠物数量统计
    cursor.execute("SELECT type, COUNT(*) as count FROM pet GROUP BY type")
    type_counts = cursor.fetchall()
    
    if type_counts:
        print()
        print("宠物类型统计:")
        for pet_type, count in type_counts:
            print(f"- {pet_type}: {count}只")
    
    # 关闭连接
    conn.close()
    
except sqlite3.Error as e:
    print(f"数据库错误: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()

print()
print("=== 查询完成 ===")