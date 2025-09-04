# 导入必要的模块
import os
import json
import time
import logging
import traceback
from datetime import datetime
import base64
from io import BytesIO
import requests
from zipfile import ZipFile
import sys
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.ai3d.v20250513 import models, ai3d_client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量获取主机和端口配置
HOST = os.getenv('HOST', 'localhost')
PORT = os.getenv('PORT', '5001')
# 从环境变量获取应用基础URL（用于云服务部署）
APP_URL = os.getenv('APP_URL', '')

# 在应用上下文中时才导入request对象
request = None
try:
    from flask import request
except ImportError:
    pass

# 从环境变量获取配置信息
SECRET_ID = os.getenv("TENCENTCLOUD_SECRET_ID")
SECRET_KEY = os.getenv("TENCENTCLOUD_SECRET_KEY")
REGION = os.getenv("TENCENTCLOUD_REGION", "ap-guangzhou")

# 确保能导入app模块以访问数据库
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('3DModelGenerator')

# 配置文件存储路径 - 确保所有文件都在backend目录内
MODEL_STORAGE_PATH = os.path.join(current_dir, 'models')
IMAGE_STORAGE_PATH = os.path.join(current_dir, 'images')  # 确保images目录也在backend内

# 创建存储目录（如果不存在）
os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
os.makedirs(IMAGE_STORAGE_PATH, exist_ok=True)
os.makedirs(os.path.join(IMAGE_STORAGE_PATH, 'previews'), exist_ok=True)

# 定义轮询间隔（秒）
POLLING_INTERVAL = 2

# 导入app模块以访问数据库
try:
    from backend.app import db, Pet
except ImportError:
    logger.warning("无法导入数据库模块，部分功能可能受限")
    db = None
    Pet = None

# 导入豆包图片生成模块
try:
    from doubao_seededit import generate_image_with_doubao
except ImportError:
    logger.warning("无法导入豆包图片生成模块，将使用原始图片")
    def generate_image_with_doubao(prompt=None, image_input=None):
        return image_input

# ====================== 混元3D API基础功能 ======================

def hunyuan_submit_job(image_path=None, prompt=None, image_url=None):
    """
    提交混元3D生成任务，支持图生3D和文生3D两种模式
    
    Args:
        image_path (str, optional): 图片文件路径（图生3D模式）
        prompt (str, optional): 3D内容描述，中文正向提示词（文生3D模式）
        image_url (str, optional): 图片URL（图生3D模式）
    
    Returns:
        str: 任务ID，失败返回None
    
    Note:
        - 图生3D模式：提供image_path或image_url其中之一
        - 文生3D模式：提供prompt
        - 图生3D和文生3D不能同时使用
    """
    try:
        # 参数验证
        has_image = (image_path is not None) or (image_url is not None)
        has_prompt = prompt is not None
        
        if not has_image and not has_prompt:
            logger.error("必须提供图片路径/URL或文本提示词其中之一")
            return None
            
        if has_image and has_prompt:
            logger.error("图生3D和文生3D不能同时使用，请选择其中一种模式")
            return None
        
        # 初始化客户端
        cred = credential.Credential(SECRET_ID, SECRET_KEY)
        client = ai3d_client.Ai3dClient(cred, REGION)

        # 构造请求参数
        req = models.SubmitHunyuanTo3DJobRequest()
        
        if has_prompt:
            # 文生3D模式
            if len(prompt) > 200:
                logger.warning("提示词超过200字符，将被截断")
                prompt = prompt[:200]
            req.Prompt = prompt
            logger.info(f"使用文生3D模式，提示词: {prompt[:50]}...")
            
        else:
            # 图生3D模式
            if image_path:
                # 检查图片文件是否存在
                if not os.path.exists(image_path):
                    logger.error(f"图片文件不存在: {image_path}")
                    return None
                    
                # 转换图片为Base64
                file_ext = os.path.splitext(image_path)[1].lower()
                with open(image_path, "rb") as f:
                    image_base64 = base64.b64encode(f.read()).decode()
                req.ImageBase64 = image_base64
                logger.info(f"使用图生3D模式（本地文件）: {image_path}，格式: {file_ext}")
                
            elif image_url:
                # 检查URL是否是本地网络地址
                if image_url.startswith(('http://127.0.0.1', 'http://localhost', 'http://192.168.')):
                    logger.info(f"检测到本地网络URL: {image_url}，将先下载图片再提交")
                    try:
                        # 创建临时目录
                        os.makedirs('temp_images', exist_ok=True)
                        # 生成临时文件名
                        temp_filename = f"temp_images/{os.path.basename(image_url).split('?')[0]}"
                        # 下载图片
                        response = requests.get(image_url, stream=True)
                        response.raise_for_status()
                        with open(temp_filename, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                if chunk:
                                    f.write(chunk)
                        logger.info(f"图片已下载到本地: {temp_filename}")
                        # 使用本地文件模式
                        file_ext = os.path.splitext(temp_filename)[1].lower()
                        with open(temp_filename, "rb") as f:
                            image_base64 = base64.b64encode(f.read()).decode()
                        req.ImageBase64 = image_base64
                        logger.info(f"使用图生3D模式（本地文件）: {temp_filename}，格式: {file_ext}")
                        # 清理临时文件（可选，保留以便调试）
                        # os.remove(temp_filename)
                    except Exception as e:
                        logger.error(f"下载本地图片失败: {str(e)}")
                        return None
                else:
                    req.ImageUrl = image_url
                    logger.info(f"使用图生3D模式（网络URL）: {image_url}")
        
        # 注意：当前SDK版本没有Num参数，不需要设置生成数量
        
        # 提交任务
        resp = client.SubmitHunyuanTo3DJob(req)
        logger.info(f"任务提交成功！任务ID: {resp.JobId}")
        return resp.JobId

    except TencentCloudSDKException as e:
        logger.error(f"提交任务失败: {e}")
        return None
    except Exception as e:
        logger.error(f"提交任务时发生错误: {e}")
        return None

def hunyuan_query_job(job_id):
    """
    查询任务状态
    
    :param job_id: 任务ID
    :return: 包含任务状态和文件URL的字典，失败返回None
    """
    try:
        # 初始化客户端
        cred = credential.Credential(SECRET_ID, SECRET_KEY)
        client = ai3d_client.Ai3dClient(cred, REGION)

        # 构造查询请求
        req = models.QueryHunyuanTo3DJobRequest()
        req.JobId = job_id

        # 发送查询请求
        resp = client.QueryHunyuanTo3DJob(req)
        resp_dict = resp._serialize()
        
        # 如果任务完成，保存结果到storage目录
        if resp_dict['Status'] == "DONE":
            os.makedirs("storage", exist_ok=True)
            result_file = f"storage/{job_id}.json"
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(resp_dict, f, ensure_ascii=False, indent=4)
            
            logger.info(f"任务完成，结果已保存到: {result_file}")
            
            # 提取GIF和OBJ文件信息
            try:
                result_files = resp_dict.get('ResultFile3Ds', [])
                if result_files:
                    file_info = {}
                    # 提取PreviewImageUrl
                    if result_files[0].get('PreviewImageUrl'):
                        preview_image_url = result_files[0]['PreviewImageUrl']
                        logger.info(f"找到预览图URL: {preview_image_url}")
                        resp_dict['preview_image_url'] = preview_image_url
                    
                    # 直接从ResultFile3Ds对象提取文件类型和URL，并按需要的格式保存
                    file_type = result_files[0].get('Type')
                    file_url = result_files[0].get('Url')
                    if file_type and file_url:
                        file_info[file_type] = {
                            'url': file_url,
                            'preview_image_url': preview_image_url
                        }
                    
                    # 将文件URL添加到返回结果中
                    resp_dict['file_urls'] = file_info
                    
                    # 打印文件下载链接
                    if file_info:
                        logger.info("\n=== 3D文件下载链接 ===")
                        for type_key, url in file_info.items():
                            logger.info(f"{type_key}文件: {url}")
            except Exception as e:
                logger.error(f"提取文件信息时发生错误: {e}")
        
        return resp_dict

    except TencentCloudSDKException as e:
        logger.error(f"查询任务失败: {e}")
        return None
    except Exception as e:
        logger.error(f"查询任务时发生错误: {e}")
        return None

class Hunyuan3DClient:
    """
    混元3D模型生成客户端
    封装了hunyuan_3d模块的功能，提供面向对象的接口
    """
    
    def generate_from_image(self, image_url):
        """
        从图片URL生成3D模型
        
        Args:
            image_url (str): 图片URL
        
        Returns:
            dict: 包含job_id和status的结果字典
        """
        job_id = hunyuan_submit_job(image_url=image_url)
        if job_id:
            return {
                'job_id': job_id,
                'status': 'pending'
            }
        return None
    
    def generate_from_text(self, prompt):
        """
        从文本描述生成3D模型
        
        Args:
            prompt (str): 文本描述
        
        Returns:
            dict: 包含job_id和status的结果字典
        """
        job_id = hunyuan_submit_job(prompt=prompt)
        if job_id:
            return {
                'job_id': job_id,
                'status': 'pending'
            }
        return None
    
    def query_job(self, job_id):
        """
        查询3D模型生成任务状态
        
        Args:
            job_id (str): 任务ID
        
        Returns:
            dict: 任务状态和结果信息
        """
        result = hunyuan_query_job(job_id)
        if result:
            # 转换腾讯云SDK返回的状态格式为内部使用的格式
            status_map = {
                "RUN": "pending",
                "DONE": "completed",
                "FAILED": "failed"
            }
            
            # 提取文件URL信息
            file_urls = {}
            if result.get('Status') == "DONE" and result.get('file_urls'):
                file_urls = result['file_urls']
            
            # 准备返回结果，包含preview_image_url字段
            return_dict = {
                'job_id': job_id,
                'status': status_map.get(result.get('Status'), 'unknown'),
                'file_urls': file_urls,
                'error_message': result.get('ErrorMsg')
            }
            
            # 如果有preview_image_url，添加到返回结果中
            if 'preview_image_url' in result:
                return_dict['preview_image_url'] = result['preview_image_url']
            
            return return_dict
        return None

# ====================== 3D模型生成高级功能 ======================

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
        # 确保ZIP文件存在
        if not os.path.exists(zip_file_path):
            logger.error(f"ZIP文件不存在: {zip_file_path}")
            return False, {"error": "ZIP文件不存在"}
            
        with ZipFile(zip_file_path, 'r') as zip_ref:
            # 创建解压目录并确保权限
            os.makedirs(extract_dir, exist_ok=True)
            logger.info(f"已创建解压目录: {extract_dir}")
            
            # 获取ZIP文件内容列表（用于调试）
            zip_contents = zip_ref.namelist()
            logger.info(f"ZIP文件内容: {zip_contents}")
            
            # 解压所有文件
            zip_ref.extractall(extract_dir)
            logger.info(f"成功解压所有文件到: {extract_dir}")
            
            # 列出解压目录内容（用于调试）
            if os.path.exists(extract_dir):
                extracted_files = os.listdir(extract_dir)
                logger.info(f"解压后目录内容: {extracted_files}")
            
            # 查找各种文件类型
            result_files = {
                'obj': None,
                'mtl': None,
                'png': None
            }
            
            for root, dirs, files in os.walk(extract_dir):
                logger.info(f"在目录 {root} 中查找文件")
                logger.info(f"找到文件: {files}")
                for file in files:
                    file_lower = file.lower()
                    full_path = os.path.join(root, file)
                    
                    if file_lower.endswith('.obj') and not result_files['obj']:
                        result_files['obj'] = full_path
                        logger.info(f"找到OBJ文件: {full_path}")
                    elif file_lower.endswith('.mtl') and not result_files['mtl']:
                        result_files['mtl'] = full_path
                        logger.info(f"找到MTL文件: {full_path}")
                    elif file_lower.endswith('.png') and not result_files['png']:
                        result_files['png'] = full_path
                        logger.info(f"找到PNG文件: {full_path}")
            
            # 如果没有找到OBJ文件，查找其他3D模型文件格式
            if not result_files['obj']:
                logger.warning("ZIP文件中未找到OBJ文件")
                for root, dirs, files in os.walk(extract_dir):
                    for file in files:
                        if file.lower().endswith(('.fbx', '.gltf', '.glb', '.stl')):
                            full_path = os.path.join(root, file)
                            result_files['obj'] = full_path
                            logger.info(f"找到其他3D模型文件: {full_path}")
                            break
                    if result_files['obj']:
                        break
                
            if result_files['obj']:
                logger.info(f"成功提取文件: OBJ={result_files['obj']}, MTL={result_files['mtl']}, PNG={result_files['png']}")
                return True, result_files
            else:
                logger.warning(f"ZIP文件中未找到任何支持的3D模型文件")
                return True, result_files
    except PermissionError as e:
        logger.error(f"解压ZIP文件权限错误: {str(e)}")
        return False, {"error": f"权限错误: {str(e)}"}
    except FileNotFoundError as e:
        logger.error(f"解压ZIP文件找不到文件错误: {str(e)}")
        return False, {"error": f"找不到文件: {str(e)}"}
    except Exception as e:
        logger.error(f"解压ZIP文件失败: {str(e)}")
        traceback.print_exc()
        return False, {"error": str(e)}

# 更新宠物状态
def update_pet_status(pet_id, status):
    try:
        if not db or not Pet:
            logger.warning("数据库模块不可用，无法更新宠物状态")
            return
        
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
        if db:
            db.session.rollback()

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
        local_mtl_path = None
        local_png_path = None
        local_preview_path = None
        
        # 下载和解压文件
        if file_urls:
            logger.info(f"获取到文件URL信息，开始下载和解压: {list(file_urls.keys())}")
            for file_type, file_info in file_urls.items():
                if isinstance(file_info, dict) and 'url' in file_info:
                    file_url = file_info['url']
                    # 为每种文件类型创建独立的目录
                    file_dir = os.path.join(model_dir, file_type.lower())
                    os.makedirs(file_dir, exist_ok=True)
                    
                    # 下载文件（直接按ZIP文件处理，不进行扩展名判断）
                    zip_file_path = os.path.join(file_dir, f'{file_type.lower()}.zip')
                    success, zip_result = download_file(file_url, zip_file_path)
                    if success:
                        logger.info(f"成功下载文件到: {zip_file_path}，将直接按ZIP文件处理")
                        
                        # 解压ZIP文件
                        extract_dir = os.path.join(file_dir, 'extracted')
                        success, extract_result = extract_obj_from_zip(zip_file_path, extract_dir)
                        if success and extract_result:
                            if isinstance(extract_result, dict):
                                # 新格式：包含obj、mtl、png文件路径的字典
                                logger.info(f"成功从ZIP中提取模型文件: {extract_result}")
                                
                                # 保存各种文件的本地路径
                                if extract_result.get('obj'):
                                    local_obj_path = extract_result['obj']
                                if extract_result.get('mtl'):
                                    local_mtl_path = extract_result['mtl']
                                if extract_result.get('png'):
                                    local_png_path = extract_result['png']
                                
                                model_info['file_urls'][file_type] = {
                                    'url': file_url,
                                    'local_paths': extract_result
                                }
                            else:
                                # 兼容旧格式：单个文件路径
                                logger.info(f"成功从ZIP中提取模型文件: {extract_result}")
                                if extract_result and extract_result.lower().endswith('.obj'):
                                    local_obj_path = extract_result
                                    
                                model_info['file_urls'][file_type] = {
                                    'url': file_url,
                                    'local_path': extract_result
                                }
                        else:
                            # 解压失败时，仍然保存下载的ZIP文件路径
                            logger.warning(f"解压ZIP文件失败或未找到模型文件，将使用原始ZIP文件路径")
                            model_info['file_urls'][file_type] = {
                                'url': file_url,
                                'local_path': zip_file_path
                            }
                    else:
                        logger.error(f"下载文件失败: {zip_result}")
                    
                    # 保存预览图URL（如果有）
                    if file_info.get('preview_image_url'):
                        model_info['file_urls'][file_type]['preview_image_url'] = file_info['preview_image_url']
        
        # 下载预览图 - 确保图片下载到backend文件夹内
        if model_info.get('preview_image_url'):
            preview_url = model_info['preview_image_url']
            # 创建预览图存储目录 - 使用更新后的IMAGE_STORAGE_PATH
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
                if not db or not Pet:
                    logger.warning("数据库模块不可用，无法更新宠物记录")
                    return model_info
                
                pet = Pet.query.get(pet_id)
                if pet:
                    # 设置model_url为HTTP可访问的URL路径
                    if local_obj_path:
                        # 获取相对路径（相对于models目录）
                        rel_path = os.path.relpath(local_obj_path, MODEL_STORAGE_PATH)
                        # 构建HTTP URL - 优先使用request.host，否则使用环境变量配置
                        try:
                            # 优先使用APP_URL（如果设置了）
                            if APP_URL:
                                model_url = f"{APP_URL}/models/{rel_path}"
                            # 其次尝试在请求上下文中获取host
                            elif request and hasattr(request, 'host'):
                                # 自动检测是否使用HTTPS（从请求头中）
                                scheme = request.headers.get('X-Forwarded-Proto', 'http')
                                model_url = f"{scheme}://{request.host}/models/{rel_path}"
                            else:
                                # 请求上下文外，使用环境变量配置
                                model_url = f"http://{HOST}:{PORT}/models/{rel_path}"
                            pet.model_url = model_url
                            logger.info(f"已更新宠物 {pet_id} 的模型URL: {pet.model_url}")
                        except Exception as e:
                            logger.error(f"构建模型URL时出错: {str(e)}")
                            # 出错时设置一个基本URL，避免model_url为None
                            if APP_URL:
                                pet.model_url = f"{APP_URL}/models/{rel_path}"
                            else:
                                pet.model_url = f"http://{HOST}:{PORT}/models/{rel_path}"
                    else:
                        logger.warning(f"未找到OBJ文件路径，无法设置model_url")
                        # 即使没有找到OBJ文件，也要确保model_url不为None
                        if APP_URL:
                            pet.model_url = f"{APP_URL}/models/{model_id}/"
                        else:
                            pet.model_url = f"http://{HOST}:{PORT}/models/{model_id}/"
                    
                    # 设置preview_url为HTTP可访问的URL路径
                    if local_preview_path:
                        # 获取相对路径（相对于backend目录）
                        rel_preview_path = os.path.relpath(local_preview_path, current_dir)
                        # 构建HTTP URL - 优先使用request.host，否则使用环境变量配置
                        try:
                            # 优先使用APP_URL（如果设置了）
                            if APP_URL:
                                preview_url = f"{APP_URL}/{rel_preview_path}"
                            # 其次尝试在请求上下文中获取host
                            elif request and hasattr(request, 'host'):
                                # 自动检测是否使用HTTPS（从请求头中）
                                scheme = request.headers.get('X-Forwarded-Proto', 'http')
                                preview_url = f"{scheme}://{request.host}/{rel_preview_path}"
                            else:
                                # 请求上下文外，使用环境变量配置
                                preview_url = f"http://{HOST}:{PORT}/{rel_preview_path}"
                            pet.preview_url = preview_url
                            logger.info(f"已更新宠物 {pet_id} 的预览图URL: {pet.preview_url}")
                        except Exception as e:
                            logger.error(f"构建预览图URL时出错: {str(e)}")
                    
                    # 设置material_url为HTTP可访问的URL路径
                    if local_mtl_path:
                        # 获取相对路径（相对于models目录）
                        rel_mtl_path = os.path.relpath(local_mtl_path, MODEL_STORAGE_PATH)
                        # 构建HTTP URL
                        try:
                            if APP_URL:
                                material_url = f"{APP_URL}/models/{rel_mtl_path}"
                            elif request and hasattr(request, 'host'):
                                scheme = request.headers.get('X-Forwarded-Proto', 'http')
                                material_url = f"{scheme}://{request.host}/models/{rel_mtl_path}"
                            else:
                                material_url = f"http://{HOST}:{PORT}/models/{rel_mtl_path}"
                            pet.material_url = material_url
                            logger.info(f"已更新宠物 {pet_id} 的材质URL: {pet.material_url}")
                        except Exception as e:
                            logger.error(f"构建材质URL时出错: {str(e)}")
                    
                    # 设置texture_url为HTTP可访问的URL路径
                    if local_png_path:
                        # 获取相对路径（相对于models目录）
                        rel_png_path = os.path.relpath(local_png_path, MODEL_STORAGE_PATH)
                        # 构建HTTP URL
                        try:
                            if APP_URL:
                                texture_url = f"{APP_URL}/models/{rel_png_path}"
                            elif request and hasattr(request, 'host'):
                                scheme = request.headers.get('X-Forwarded-Proto', 'http')
                                texture_url = f"{scheme}://{request.host}/models/{rel_png_path}"
                            else:
                                texture_url = f"http://{HOST}:{PORT}/models/{rel_png_path}"
                            pet.texture_url = texture_url
                            logger.info(f"已更新宠物 {pet_id} 的纹理URL: {pet.texture_url}")
                        except Exception as e:
                            logger.error(f"构建纹理URL时出错: {str(e)}")
                    
                    # 更新状态为completed
                    pet.status = 'completed'
                    db.session.commit()
                    logger.info(f"已更新宠物 {pet_id} 的模型信息")
                else:
                    logger.error(f"未找到宠物记录，ID: {pet_id}")
            except Exception as e:
                logger.error(f"更新宠物模型信息时出错: {str(e)}")
                traceback.print_exc()
                if db:
                    db.session.rollback()
        
        return model_info
        
    except Exception as e:
        logger.error(f"保存和处理模型文件时出错: {str(e)}")
        traceback.print_exc()
        # 更新宠物状态为failed
        if pet_id:
            update_pet_status(pet_id, 'failed')
        return None

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
                        if db and Pet:
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