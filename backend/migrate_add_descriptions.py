#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：为Pet表添加personalities_desc和hobbies_desc字段
"""

import sqlite3
import os

def migrate_database():
    """为Pet表添加新的描述字段"""
    db_path = 'eternal_pal.db'
    
    if not os.path.exists(db_path):
        print(f"数据库文件 {db_path} 不存在")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(pet)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # 添加personalities_desc字段
        if 'personalities_desc' not in columns:
            cursor.execute("ALTER TABLE pet ADD COLUMN personalities_desc TEXT")
            print("已添加 personalities_desc 字段")
        else:
            print("personalities_desc 字段已存在")
        
        # 添加hobbies_desc字段
        if 'hobbies_desc' not in columns:
            cursor.execute("ALTER TABLE pet ADD COLUMN hobbies_desc TEXT")
            print("已添加 hobbies_desc 字段")
        else:
            print("hobbies_desc 字段已存在")
        
        conn.commit()
        print("数据库迁移完成")
        
        # 验证字段添加成功
        cursor.execute("PRAGMA table_info(pet)")
        columns_after = [column[1] for column in cursor.fetchall()]
        print(f"当前Pet表字段: {columns_after}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"数据库迁移失败: {str(e)}")
        if 'conn' in locals():
            conn.close()
        return False

if __name__ == '__main__':
    print("开始数据库迁移...")
    success = migrate_database()
    if success:
        print("迁移成功完成！")
    else:
        print("迁移失败！")