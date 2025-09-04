#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试3D模型文件提取和数据库更新功能
"""

import os
import sys
import json
from datetime import datetime

# 添加当前目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from combined_3d_generator import save_and_process_model_files
from app import app, db, Pet

def test_3d_model_processing():
    """测试3D模型处理功能"""
    print("开始测试3D模型文件提取和数据库更新功能...")
    
    # 直接测试已存在的ZIP文件
    zip_file_path = '/Users/yuzhi/miniprograms/EternalPal/backend/models/model_1756646397_1/obj/c2e83649-536e-46de-b5db-94c7a2c48f8a_0.zip'
    extract_dir = '/tmp/test_extract_full'
    
    # 测试文件提取
    from combined_3d_generator import extract_obj_from_zip
    success, result = extract_obj_from_zip(zip_file_path, extract_dir)
    
    if success:
        print(f"文件提取成功: {result}")
        
        # 构建测试URL
        import os
        base_url = 'http://localhost:5000/models'
        model_id = 'test_model_123'
        
        obj_filename = os.path.basename(result['obj'])
        mtl_filename = os.path.basename(result['mtl']) if result.get('mtl') else None
        png_filename = os.path.basename(result['png']) if result.get('png') else None
        
        test_result = {
            'file_urls': {
                'obj': {
                    'url': f'{base_url}/{model_id}/obj/{obj_filename}'
                }
            },
            'preview_image_url': f'{base_url}/{model_id}/preview.jpg',
            'local_files': {
                'obj': result['obj'],
                'mtl': result['mtl'],
                'png': result['png']
            }
        }
    else:
        print(f"文件提取失败: {result}")
        return
    
    # 在应用上下文中运行测试
    with app.app_context():
        # 创建一个测试宠物
        test_pet = Pet(
            name='测试宠物',
            type='小狗',
            gender='公',
            personality='活泼',
            hobby='玩球',
            story='这是一个测试宠物',
            user_id=1,
            status='generating'
        )
        
        db.session.add(test_pet)
        db.session.commit()
        
        print(f"创建测试宠物，ID: {test_pet.id}")
        
        # 直接测试数据库更新逻辑
        if 'local_files' in test_result:
            # 模拟文件已经存在的情况，直接更新数据库
            local_files = test_result['local_files']
            
            # 构建URL
            base_url = 'http://localhost:5000'
            model_id = f'model_{int(datetime.now().timestamp())}_{test_pet.id}'
            
            if local_files.get('obj'):
                obj_filename = os.path.basename(local_files['obj'])
                test_pet.model_url = f'{base_url}/models/{model_id}/obj/{obj_filename}'
            
            if local_files.get('mtl'):
                mtl_filename = os.path.basename(local_files['mtl'])
                test_pet.material_url = f'{base_url}/models/{model_id}/obj/{mtl_filename}'
            
            if local_files.get('png'):
                png_filename = os.path.basename(local_files['png'])
                test_pet.texture_url = f'{base_url}/models/{model_id}/obj/{png_filename}'
            
            test_pet.preview_url = f'{base_url}/models/{model_id}/preview.jpg'
            test_pet.status = 'completed'
            
            db.session.commit()
            
            result = {
                'model_id': model_id,
                'obj_file': local_files.get('obj'),
                'mtl_file': local_files.get('mtl'),
                'png_file': local_files.get('png')
            }
        else:
            result = None
        
        if result:
            print("文件处理成功！")
            print(f"处理结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 检查数据库更新
            updated_pet = Pet.query.get(test_pet.id)
            if updated_pet:
                print("\n数据库更新结果:")
                print(f"模型URL: {updated_pet.model_url}")
                print(f"材质URL: {updated_pet.material_url}")
                print(f"纹理URL: {updated_pet.texture_url}")
                print(f"预览URL: {updated_pet.preview_url}")
                print(f"状态: {updated_pet.status}")
            else:
                print("错误：无法找到更新后的宠物记录")
        else:
            print("文件处理失败！")
        
        # 清理测试数据
        db.session.delete(test_pet)
        db.session.commit()
        print(f"\n已清理测试宠物 ID: {test_pet.id}")

if __name__ == '__main__':
    test_3d_model_processing()