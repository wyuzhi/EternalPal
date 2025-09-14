#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：为Pet表添加description字段
"""

import sqlite3
import os
from datetime import datetime

def add_description_column():
    """为Pet表添加description字段"""
    
    # 数据库文件路径
    db_path = 'eternal_pal.db'
    
    if not os.path.exists(db_path):
        print(f"数据库文件 {db_path} 不存在")
        return False
    
    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查description字段是否已存在
        cursor.execute("PRAGMA table_info(pet)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'description' in columns:
            print("description字段已存在，无需添加")
            conn.close()
            return True
        
        # 添加description字段
        print("正在添加description字段...")
        cursor.execute("ALTER TABLE pet ADD COLUMN description TEXT")
        
        # 提交更改
        conn.commit()
        
        # 验证字段是否添加成功
        cursor.execute("PRAGMA table_info(pet)")
        columns_after = [column[1] for column in cursor.fetchall()]
        
        if 'description' in columns_after:
            print("✅ description字段添加成功")
            success = True
        else:
            print("❌ description字段添加失败")
            success = False
        
        conn.close()
        return success
        
    except Exception as e:
        print(f"❌ 数据库迁移失败: {e}")
        if 'conn' in locals():
            conn.close()
        return False

if __name__ == '__main__':
    print(f"开始数据库迁移 - {datetime.now()}")
    success = add_description_column()
    
    if success:
        print("🎉 数据库迁移完成")
    else:
        print("💥 数据库迁移失败")
        exit(1)