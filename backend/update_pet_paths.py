# 更新数据库中宠物记录的路径，使其与新的目录结构和URL格式一致
import os
import sys

# 添加项目根目录到搜索路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db, Pet

if __name__ == '__main__':
    # 获取当前脚本所在目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # 获取项目根目录
    project_root = os.path.dirname(current_dir)
    
    # 使用app上下文
    with app.app_context():
        # 获取所有宠物记录
        pets = Pet.query.all()
        
        if not pets:
            print("数据库中没有宠物记录需要更新")
            sys.exit(0)
        
        print(f"找到 {len(pets)} 条宠物记录，开始更新路径...")
        
        updated_count = 0
        
        for pet in pets:
            # 检查并更新model_url
            if pet.model_url:
                # 如果是本地文件路径，转换为HTTP URL
                if os.path.isfile(pet.model_url):
                    try:
                        # 获取相对于backend目录的路径
                        rel_path = os.path.relpath(pet.model_url, current_dir)
                        # 构建HTTP URL
                        new_model_url = f"/models/{rel_path}"
                        
                        if new_model_url != pet.model_url:
                            print(f"更新宠物 {pet.id} 的model_url: {pet.model_url} -> {new_model_url}")
                            pet.model_url = new_model_url
                            updated_count += 1
                    except ValueError:
                        # 如果无法获取相对路径，跳过
                        print(f"警告：无法转换宠物 {pet.id} 的model_url到相对路径: {pet.model_url}")
            
            # 检查并更新preview_url
            if pet.preview_url:
                # 如果是本地文件路径，转换为前端可访问的路径
                if os.path.isfile(pet.preview_url):
                    try:
                        # 获取相对于项目根目录的路径
                        rel_preview_path = os.path.relpath(pet.preview_url, project_root)
                        # 构建相对于小程序根目录的路径
                        new_preview_url = f"/{rel_preview_path}"
                        
                        if new_preview_url != pet.preview_url:
                            print(f"更新宠物 {pet.id} 的preview_url: {pet.preview_url} -> {new_preview_url}")
                            pet.preview_url = new_preview_url
                            updated_count += 1
                    except ValueError:
                        # 如果无法获取相对路径，跳过
                        print(f"警告：无法转换宠物 {pet.id} 的preview_url到相对路径: {pet.preview_url}")
        
        # 提交更改
        db.session.commit()
        print(f"已成功更新 {updated_count} 条路径信息")
        print("路径更新完成")