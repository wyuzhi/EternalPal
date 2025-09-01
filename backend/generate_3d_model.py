# 导入必要的模块
import os
import json
import time
import logging
import traceback
from datetime import datetime
import requests
from zipfile import ZipFile
from io import BytesIO
import sys

# 确保能导入app模块以访问数据库
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('3DModelGenerator')

# 配置文件存储路径
MODEL_STORAGE_PATH = os.path.join(current_dir, 'models')
IMAGE_STORAGE_PATH = os.path.join(current_dir, '../images')  # images目录仍保留在前端

# 创建存储目录（如果不存在）
os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
os.makedirs(IMAGE_STORAGE_PATH, exist_ok=True)

# 定义轮询间隔（秒）
POLLING_INTERVAL = 2

# 导入hunyuan_3d模块
from hunyuan_3d import *

# 导入app模块以访问数据库
from backend.app import db, Pet

# 导入豆包图片生成模块
from doubao_seededit import generate_image_with_doubao

# 下载文件函数
def download_file(url, save_path):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return True, save_path
    except Exception as e:
        logger.error(f"下载文件失败: {str(e)}")
        return False, str(e)

# 从ZIP文件中提取OBJ文件
def extract_obj_from_zip(zip_file_path, extract_dir):
    try:
        with ZipFile(zip_file_path, 'r') as zip_ref:
            # 创建解压目录
            os.makedirs(extract_dir, exist_ok=True)
            
            # 解压所有文件
            zip_ref.extractall(extract_dir)
            
            # 查找OBJ文件
            obj_files = []
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    if file.lower().endswith('.obj'):
                        obj_files.append(os.path.join(root, file))
            
            if not obj_files:
                logger.warning("ZIP文件中未找到OBJ文件")
                # 查找其他3D模型文件格式
                for root, dirs, files in os.walk(extract_dir):
                    for file in files:
                        if file.lower().endswith(('.fbx', '.gltf', '.glb', '.stl')):
                            obj_files.append(os.path.join(root, file))
                
            return True, obj_files[0] if obj_files else None
    except Exception as e:
        logger.error(f"解压ZIP文件失败: {str(e)}")
        return False, str(e)

# 生成3D模型的主函数
def generate_3d_model(image_url=None, prompt=None, pet_id=None):
    logger.info(f"开始生成3D模型 - pet_id: {pet_id}, image_url: {'已提供' if image_url else '未提供'}, prompt: {'已提供' if prompt else '未提供'}")
    
    try:
        # 创建3D客户端
        client = Hunyuan3DClient()
        
        # 尝试使用图像生成3D模型（如果提供了图像）
        if image_url:
            try:
                # 首先使用豆包生成新图片
                logger.info(f"开始使用豆包生成新图片，原始图片URL: {image_url}")
                
                # 从数据库获取宠物信息，用于生成更准确的提示词
                pet_prompt = """
这是一只可爱的宠物，生成ip形象设计图。让宠物处于站立姿势、精准复刻特征，背景为纯白色，无杂色。
毛发还原毛色，完全还原毛发走势和质感，胡须保色泽韧性。
五官复刻眼球颜色、瞳孔形状，眼周毛走向，鼻子质感，嘴唇弧度；耳朵还原大小、弧度及内侧绒毛。
肢体按原图比例：颈、躯干、四肢骨骼，脚掌肉垫，尾巴形态。站姿符合习性，自然协调。
3D 渲染达高精度，毛发用 PBR 材质，显光影细节；三点布光，明暗分明。形象保留原生特征，强化细节、增强亲和力。
"""
                
                # 如果有宠物ID，获取宠物信息来丰富提示词
                if pet_id:
                    try:
                        pet = Pet.query.get(pet_id)
                        if pet:
                            # 构建更详细的宠物描述提示词
                            pet_desc_parts = []
                            if pet.name:
                                pet_desc_parts.append(f"名叫{pet.name}")
                            if pet.type:
                                pet_desc_parts.append(f"是一只{pet.type}")
                            if pet.gender:
                                pet_desc_parts.append(f"，性别是{pet.gender}")
                            if pet.personality:
                                pet_desc_parts.append(f"，性格{pet.personality}")
                            if pet.hobby:
                                pet_desc_parts.append(f"，喜欢{pet.hobby}")
                            
                            if pet_desc_parts:
                                pet_prompt = f"这是一只{' '.join(pet_desc_parts)}的宠物，" + pet_prompt
                    except Exception as db_error:
                        logger.error(f"获取宠物信息失败: {str(db_error)}")
                        # 继续使用默认提示词
                
                # 调用豆包生成新图片
                new_image_url = generate_image_with_doubao(
                    prompt=pet_prompt,
                    image_input=image_url
                )
                
                logger.info(f"通过豆包生成新图片成功，新图片URL: {new_image_url}")
                
                # 使用新生成的图片URL来生成3D模型
                logger.info(f"尝试通过新生成的图片生成3D模型")
                result = client.generate_from_image(new_image_url)
                if result:
                    logger.info(f"通过新生成的图片生成3D模型成功，任务ID: {result.get('job_id', '未知')}")
                    return process_3d_model_result(result, pet_id)
            except Exception as e:
                logger.error(f"通过新生成的图片生成3D模型失败: {str(e)}")
                # 如果新图片生成或3D模型生成失败，回退到使用原始图片
                logger.info("回退到使用原始图片生成3D模型")
                try:
                    result = client.generate_from_image(image_url)
                    if result:
                        logger.info(f"通过原始图片生成3D模型成功，任务ID: {result.get('job_id', '未知')}")
                        return process_3d_model_result(result, pet_id)
                except Exception as fallback_error:
                    logger.error(f"通过原始图片生成3D模型也失败: {str(fallback_error)}")
                    # 如果原始图片生成也失败且提供了提示词，则尝试通过提示词生成
                    if prompt:
                        logger.info("回退到通过提示词生成3D模型")
                    else:
                        raise Exception("图像生成失败且未提供提示词")
        
        # 如果没有提供图像或图像生成失败，使用提示词生成
        if prompt:
            logger.info(f"通过提示词生成3D模型")
            result = client.generate_from_text(prompt)
            if result:
                logger.info(f"通过提示词生成3D模型成功，任务ID: {result.get('job_id', '未知')}")
                return process_3d_model_result(result, pet_id)
        
        # 如果都失败了
        logger.error("3D模型生成失败，没有可用的生成方式")
        return None
        
    except Exception as e:
        logger.error(f"生成3D模型时出错: {str(e)}")
        traceback.print_exc()
        return None

# 处理3D模型生成结果
def process_3d_model_result(result, pet_id=None):
    try:
        # 获取任务ID和状态
        job_id = result.get('job_id')
        status = result.get('status', 'pending')
        
        # 如果任务还在处理中，进行轮询
        if status == 'pending':
            logger.info(f"任务 {job_id} 正在处理中，开始轮询...")
            
            # 创建3D客户端用于轮询
            client = Hunyuan3DClient()
            
            # 轮询直到任务完成或超时
            start_time = time.time()
            max_wait_time = 300  # 最大等待时间5分钟
            
            while time.time() - start_time < max_wait_time:
                # 更新宠物状态为generating（如果提供了pet_id）
                if pet_id:
                    update_pet_status(pet_id, 'generating')
                    
                # 轮询任务状态
                result = client.query_job(job_id)
                if result:
                    status = result.get('status')
                    
                    if status == 'completed':
                        logger.info(f"任务 {job_id} 完成")
                        return save_and_process_model_files(result, pet_id)
                    elif status == 'failed':
                        logger.error(f"任务 {job_id} 失败: {result.get('error_message', '未知错误')}")
                        # 更新宠物状态为failed
                        if pet_id:
                            update_pet_status(pet_id, 'failed')
                        return None
                    
                # 等待一段时间后再次轮询
                time.sleep(POLLING_INTERVAL)
                
            logger.error(f"任务 {job_id} 超时")
            # 更新宠物状态为timeout
            if pet_id:
                update_pet_status(pet_id, 'timeout')
            return None
        
        # 如果任务已经完成，直接处理结果
        elif status == 'completed':
            logger.info(f"任务 {job_id} 已完成，开始处理结果")
            return save_and_process_model_files(result, pet_id)
        
        # 其他状态
        else:
            logger.error(f"任务 {job_id} 状态异常: {status}")
            # 更新宠物状态为failed
            if pet_id:
                update_pet_status(pet_id, 'failed')
            return None
            
    except Exception as e:
        logger.error(f"处理3D模型结果时出错: {str(e)}")
        traceback.print_exc()
        # 更新宠物状态为failed
        if pet_id:
            update_pet_status(pet_id, 'failed')
        return None

# 保存和处理模型文件
def save_and_process_model_files(result, pet_id=None):
    try:
        file_urls = result.get('file_urls', {})
        
        # 即使没有文件URL，只要有preview_image_url，也认为成功
        if not file_urls and not result.get('preview_image_url'):
            logger.error("没有找到文件URL和预览图URL")
            # 更新宠物状态为failed
            if pet_id:
                update_pet_status(pet_id, 'failed')
            return None
        
        # 创建唯一的模型ID
        model_id = f"model_{int(time.time())}_{pet_id if pet_id else 'unknown'}"
        model_dir = os.path.join(MODEL_STORAGE_PATH, model_id)
        os.makedirs(model_dir, exist_ok=True)
        
        # 保存模型信息
        model_info = {
            'model_id': model_id,
            'creation_time': datetime.utcnow().isoformat(),
            'file_urls': {},
            # 保存preview_image_url以便后续使用
            'preview_image_url': result.get('preview_image_url', '')
        }
        
        # 初始化本地文件路径变量
        local_obj_path = None
        local_preview_path = None
        
        # 下载和解压文件
        if file_urls:
            logger.info(f"获取到文件URL信息，开始下载和解压: {list(file_urls.keys())}")
            for file_type, file_info in file_urls.items():
                if isinstance(file_info, dict) and 'url' in file_info:
                    file_url = file_info['url']
                    file_ext = os.path.splitext(file_url)[1].lower()
                    
                    # 为每种文件类型创建独立的目录
                    file_dir = os.path.join(model_dir, file_type.lower())
                    os.makedirs(file_dir, exist_ok=True)
                    
                    # 下载文件
                    if file_ext == '.zip':
                        # 下载ZIP文件
                        zip_file_path = os.path.join(file_dir, f'{file_type.lower()}.zip')
                        success, zip_result = download_file(file_url, zip_file_path)
                        if success:
                            logger.info(f"成功下载ZIP文件到: {zip_file_path}")
                            
                            # 解压ZIP文件
                            extract_dir = os.path.join(file_dir, 'extracted')
                            success, extract_result = extract_obj_from_zip(zip_file_path, extract_dir)
                            if success and extract_result:
                                logger.info(f"成功从ZIP中提取模型文件: {extract_result}")
                                # 如果是OBJ文件或替代的3D模型文件，保存本地路径
                                if extract_result.lower().endswith(('.obj', '.fbx', '.gltf', '.glb', '.stl')):
                                    local_obj_path = extract_result
                                    
                                model_info['file_urls'][file_type] = {
                                    'url': file_url,
                                    'local_path': extract_result
                                }
                            else:
                                logger.error(f"解压ZIP文件失败或未找到模型文件")
                    else:
                        # 下载非ZIP文件
                        file_name = os.path.basename(file_url.split('?')[0])  # 移除URL参数
                        file_path = os.path.join(file_dir, file_name)
                        success, file_result = download_file(file_url, file_path)
                        if success:
                            logger.info(f"成功下载文件到: {file_path}")
                            model_info['file_urls'][file_type] = {
                                'url': file_url,
                                'local_path': file_path
                            }
                            # 如果是3D模型文件，保存本地路径
                            if file_path.lower().endswith(('.obj', '.fbx', '.gltf', '.glb', '.stl')):
                                local_obj_path = file_path
                        else:
                            logger.error(f"下载文件失败: {file_result}")
                    
                    # 保存预览图URL（如果有）
                    if file_info.get('preview_image_url'):
                        model_info['file_urls'][file_type]['preview_image_url'] = file_info['preview_image_url']
        
        # 下载预览图
        if model_info.get('preview_image_url'):
            preview_url = model_info['preview_image_url']
            # 创建预览图存储目录
            preview_dir = os.path.join(IMAGE_STORAGE_PATH, 'previews')
            os.makedirs(preview_dir, exist_ok=True)
            
            # 下载预览图
            preview_filename = f"preview_{model_id}{os.path.splitext(preview_url.split('?')[0])[1]}"
            preview_path = os.path.join(preview_dir, preview_filename)
            success, preview_result = download_file(preview_url, preview_path)
            if success:
                logger.info(f"成功下载预览图到: {preview_path}")
                model_info['preview_local_path'] = preview_path
                local_preview_path = preview_path
            else:
                logger.error(f"下载预览图失败: {preview_result}")
        
        # 保存模型信息到JSON文件
        json_path = os.path.join(model_dir, 'model_info.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(model_info, f, ensure_ascii=False, indent=2)
        
        logger.info(f"模型信息已保存到 {json_path}")
        
        # 更新宠物记录（如果提供了pet_id）
        if pet_id:
            # 更新宠物的model_url和preview_url
            try:
                pet = Pet.query.get(pet_id)
                if pet:
                    # 设置model_url为HTTP可访问的URL路径
                    if local_obj_path:
                        # 获取相对路径（相对于models目录）
                        # 定义MODEL_STORAGE_PATH
                        current_dir = os.path.dirname(os.path.abspath(__file__))
                        MODEL_STORAGE_PATH = os.path.join(current_dir, 'models')
                        rel_path = os.path.relpath(local_obj_path, MODEL_STORAGE_PATH)
                        # 构建HTTP URL
                        model_url = f"/models/{rel_path}"
                        pet.model_url = model_url
                        logger.info(f"已更新宠物 {pet_id} 的模型URL: {pet.model_url}")
                    
                    # 设置preview_url为HTTP可访问的URL路径
                    if local_preview_path:
                        # 对于预览图，我们仍然使用前端images目录的路径
                        # 从路径中提取相对于项目根目录的部分
                        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                        rel_preview_path = os.path.relpath(local_preview_path, project_root)
                        # 构建相对于小程序根目录的路径（前端使用）
                        preview_url = f"/{rel_preview_path}"
                        pet.preview_url = preview_url
                        logger.info(f"已更新宠物 {pet_id} 的预览图URL: {pet.preview_url}")
                    
                    # 更新状态为completed
                    pet.status = 'completed'
                    db.session.commit()
                    logger.info(f"已更新宠物 {pet_id} 的模型信息")
                else:
                    logger.error(f"未找到宠物记录，ID: {pet_id}")
            except Exception as e:
                logger.error(f"更新宠物模型信息时出错: {str(e)}")
                db.session.rollback()
        
        return model_info
        
    except Exception as e:
        logger.error(f"保存和处理模型文件时出错: {str(e)}")
        traceback.print_exc()
        # 更新宠物状态为failed
        if pet_id:
            update_pet_status(pet_id, 'failed')
        return None

# 更新宠物状态
def update_pet_status(pet_id, status):
    try:
        # 获取宠物记录
        pet = Pet.query.get(pet_id)
        if pet:
            # 更新状态
            pet.status = status
            db.session.commit()
            logger.info(f"已更新宠物 {pet_id} 状态为 {status}")
        else:
            logger.error(f"未找到宠物记录，ID: {pet_id}")
    except Exception as e:
        logger.error(f"更新宠物状态时出错: {str(e)}")
        db.session.rollback()



# 根据宠物数据创建描述文本
def create_pet_description(pet_data):
    # 从宠物数据中提取信息
    name = pet_data.get('name', '宠物')
    pet_type = pet_data.get('type', '')
    gender = pet_data.get('gender', '')
    personality = pet_data.get('personality', '')
    hobby = pet_data.get('hobby', '')
    story = pet_data.get('story', '')
    # 构建描述文本
    description = f"这是一只名叫{name}的"
    
    if pet_type:
        description += f"{pet_type}"
    else:
        description += "小动物"
    
    if gender:
        description += f"，性别是{gender}"
    
    if personality:
        description += f"，性格{personality}"
    
    if hobby:
        description += f"，喜欢{hobby}"
    
    if story:
        description += f"。{story}"
    
    description += "。请根据这些信息生成一个可爱、生动的3D模型。"
    
    return description

# 测试代码（仅在直接运行此脚本时执行）
if __name__ == '__main__':
    # 以下代码保持不变
    # 测试创建宠物描述
    test_pet_data = {
        'name': '小白',
        'type': '小狗',
        'gender': '公',
        'personality': '活泼可爱',
        'hobby': '玩球',
        'story': '这是一只非常可爱的小狗，喜欢和主人一起玩耍。'
    }
    
    prompt = create_pet_description(test_pet_data)
    print(f"测试生成的描述文本: {prompt}")
    
    # 注意：运行实际的3D模型生成可能需要API密钥和网络连接
    # 如果需要测试完整流程，可以取消下面的注释
    # result = generate_3d_model(prompt=prompt)
    # print(f"测试结果: {result}")