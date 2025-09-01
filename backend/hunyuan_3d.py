import base64
import json
import os
import base64
from io import BytesIO
import requests
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.ai3d.v20250513 import models, ai3d_client
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量获取配置信息
SECRET_ID = os.getenv("TENCENTCLOUD_SECRET_ID")
SECRET_KEY = os.getenv("TENCENTCLOUD_SECRET_KEY")
REGION = os.getenv("TENCENTCLOUD_REGION", "ap-guangzhou")


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
            print("错误：必须提供图片路径/URL或文本提示词其中之一")
            return None
            
        if has_image and has_prompt:
            print("错误：图生3D和文生3D不能同时使用，请选择其中一种模式")
            return None
        
        # 初始化客户端
        cred = credential.Credential(SECRET_ID, SECRET_KEY)
        client = ai3d_client.Ai3dClient(cred, REGION)

        # 构造请求参数
        req = models.SubmitHunyuanTo3DJobRequest()
        
        if has_prompt:
            # 文生3D模式
            if len(prompt) > 200:
                print("警告：提示词超过200字符，将被截断")
                prompt = prompt[:200]
            req.Prompt = prompt
            print(f"使用文生3D模式，提示词: {prompt[:50]}...")
            
        else:
            # 图生3D模式
            if image_path:
                # 检查图片文件是否存在
                if not os.path.exists(image_path):
                    print(f"图片文件不存在: {image_path}")
                    return None
                    
                # 转换图片为Base64
                with open(image_path, "rb") as f:
                    image_base64 = base64.b64encode(f.read()).decode()
                req.ImageBase64 = image_base64
                print(f"使用图生3D模式（本地文件）: {image_path}")
                
            elif image_url:
                # 检查URL是否是本地网络地址
                if image_url.startswith(('http://127.0.0.1', 'http://localhost', 'http://192.168.')):
                    print(f"检测到本地网络URL: {image_url}，将先下载图片再提交")
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
                        print(f"图片已下载到本地: {temp_filename}")
                        # 使用本地文件模式
                        with open(temp_filename, "rb") as f:
                            image_base64 = base64.b64encode(f.read()).decode()
                        req.ImageBase64 = image_base64
                        print(f"使用图生3D模式（本地文件）: {temp_filename}")
                        # 清理临时文件（可选，保留以便调试）
                        # os.remove(temp_filename)
                    except Exception as e:
                        print(f"下载本地图片失败: {str(e)}")
                        return None
                else:
                    req.ImageUrl = image_url
                    print(f"使用图生3D模式（网络URL）: {image_url}")
        
        # 注意：当前SDK版本没有Num参数，不需要设置生成数量
        
        # 提交任务
        resp = client.SubmitHunyuanTo3DJob(req)
        print(f"任务提交成功！任务ID: {resp.JobId}")
        return resp.JobId

    except TencentCloudSDKException as e:
        print(f"提交任务失败: {e}")
        return None
    except Exception as e:
        print(f"提交任务时发生错误: {e}")
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
            
            print(f"任务完成，结果已保存到: {result_file}")
            
            # 提取GIF和OBJ文件信息
            try:
                result_files = resp_dict.get('ResultFile3Ds', [])
                if result_files:

                    file_info = {}
                    # 首先尝试提取PreviewImageUrl
                    if result_files[0].get('PreviewImageUrl'):
                        preview_image_url = result_files[0]['PreviewImageUrl']
                        print(f"找到预览图URL: {preview_image_url}")
                        resp_dict['preview_image_url'] = preview_image_url
                    
                    # 再提取其他文件信息
                    for file_3d in result_files[0].get('File3D', []):
                        file_type = file_3d.get('Type')
                        file_url = file_3d.get('Url')
                        if file_type and file_url:
                            file_info[file_type] = file_url
                    
                    # 将文件URL添加到返回结果中
                    resp_dict['file_urls'] = file_info
                    
                    # 打印文件下载链接
                    if file_info:
                        print("\n=== 3D文件下载链接 ===")
                        if 'GIF' in file_info:
                            print(f"GIF文件: {file_info['GIF']}")
                        if 'OBJ' in file_info:
                            print(f"OBJ文件: {file_info['OBJ']}")
            except Exception as e:
                print(f"提取文件信息时发生错误: {e}")
        
        return resp_dict

    except TencentCloudSDKException as e:
        print(f"查询任务失败: {e}")
        return None
    except Exception as e:
        print(f"查询任务时发生错误: {e}")
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

# 使用示例
if __name__ == "__main__":
    # 示例1：图生3D模式（本地文件）
    # job_id = hunyuan_submit_job(image_path="storage/test.JPEG")
    # print(f"提交任务ID: {job_id}")      # 1348574480150405120 提交过的，避免浪费API调用次数



    # 示例2：图生3D模式（网络URL）
    # job_id = hunyuan_submit_job(image_url="https://www.baidu.com/img/bdlogo.png")
    # print(f"提交任务ID: {job_id}")      # 1348575310345715712
    


    # 示例3：文生3D模式
    # prompt = '''老黄狗，黄毛带岁月粗糙光泽，右耳缺三角口耷拉如脱水枫叶，下巴搁门槛打盹，尾巴摇似破蒲扇扫起槐花瓣堆，舌上血泡蹭红裤脚，暖调温馨写实渲染，槐花香萦绕场景。'''
    # job_id = hunyuan_submit_job(prompt=prompt)
    # print(f"提交任务ID: {job_id}")    #    1348575693197590528



    # 测试查询现有任务
    job_id = '1348575693197590528'
    if job_id:
        # 查询任务状态
        result = hunyuan_query_job(job_id)
        if result:
            print(f"任务状态: {result['Status']}") #  RUN,DONE
            
            # 获取文件URL
            if result['Status'] == "DONE":
                file_urls = result.get('file_urls', {})
                if file_urls:
                    print(f"GIF URL: {file_urls.get('GIF', 'N/A')}")
                    print(f"OBJ URL: {file_urls.get('OBJ', 'N/A')}")
                else:
                    print("未找到文件URL")

