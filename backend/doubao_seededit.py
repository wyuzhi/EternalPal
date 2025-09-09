import os
# 通过 pip install 'volcengine-python-sdk[ark]' 安装方舟SDK
from volcenginesdkarkruntime import Ark
import os
import base64
import requests
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('DoubaoImageGenerator')

def generate_image_with_doubao(
        prompt: str,
        image_input: str,
        seed: int = 123,
        guidance_scale: float = 5.5,
        size: str = "adaptive",
        watermark: bool = True,
        api_key: str = "a8713c43-079c-4971-89db-b0ba6b41343f",
        base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    ):
        """
        使用豆包模型生成图片
        
        Args:
            prompt (str): 图片生成提示词
            image_input (str): 输入图片的URL或本地文件路径
            seed (int): 随机种子，默认为123
            guidance_scale (float): 引导比例，默认为5.5
            size (str): 图片尺寸，默认为"adaptive"
            watermark (bool): 是否添加水印，默认为True
            api_key (str): API密钥
            base_url (str): API基础URL
        
        Returns:
            str: 生成图片的URL
        """
        # 初始化Ark客户端
        client = Ark(
            base_url=base_url,
            api_key=api_key,
        )
        
        # 处理输入图片（URL或本地文件）
        if os.path.exists(image_input):
            # 本地文件，转换为base64
            with open(image_input, "rb") as f:
                image_data = f.read()
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                # 检测文件扩展名，使用正确的MIME类型
                file_ext = os.path.splitext(image_input)[1].lower()
                if file_ext == '.png':
                    mime_type = 'image/png'
                elif file_ext in ['.jpg', '.jpeg']:
                    mime_type = 'image/jpeg'
                elif file_ext == '.gif':
                    mime_type = 'image/gif'
                else:
                    # 默认使用jpeg
                    mime_type = 'image/jpeg'
                    logger.warning(f"未知的图片格式: {file_ext}，默认使用jpeg格式")
                # 构造data URL
                image_url = f"data:{mime_type};base64,{image_base64}"
                logger.info(f"使用本地文件模式: {image_input}，格式: {mime_type}")
        else:
            # 检查是否是本地网络URL
            if image_input.startswith(('http://127.0.0.1', 'http://localhost', 'http://192.168.')):
                logger.info(f"检测到本地网络URL: {image_input}，将先下载图片再提交")
                try:
                    # 创建临时目录
                    os.makedirs('temp_images', exist_ok=True)
                    # 生成临时文件名
                    temp_filename = f"temp_images/{os.path.basename(image_input).split('?')[0]}"
                    # 下载图片
                    response = requests.get(image_input, stream=True)
                    response.raise_for_status()
                    with open(temp_filename, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    logger.info(f"图片已下载到本地: {temp_filename}")
                    # 使用本地文件模式
                    with open(temp_filename, "rb") as f:
                        image_data = f.read()
                        image_base64 = base64.b64encode(image_data).decode('utf-8')
                        # 检测文件扩展名，使用正确的MIME类型
                        file_ext = os.path.splitext(temp_filename)[1].lower()
                        if file_ext == '.png':
                            mime_type = 'image/png'
                        elif file_ext in ['.jpg', '.jpeg']:
                            mime_type = 'image/jpeg'
                        elif file_ext == '.gif':
                            mime_type = 'image/gif'
                        else:
                            # 默认使用jpeg
                            mime_type = 'image/jpeg'
                            logger.warning(f"未知的图片格式: {file_ext}，默认使用jpeg格式")
                        # 构造data URL
                        image_url = f"data:{mime_type};base64,{image_base64}"
                    logger.info(f"使用本地文件模式: {temp_filename}，格式: {mime_type}")
                    # 清理临时文件（可选，保留以便调试）
                    # os.remove(temp_filename)
                except Exception as e:
                    logger.error(f"下载本地图片失败: {str(e)}")
                    # 如果下载失败，尝试直接使用URL（可能会失败，但作为最后的尝试）
                    image_url = image_input
            else:
                # 网络URL
                image_url = image_input
        
        system_prompt = '''
        基于参考照片动物，精准复刻特征，生成ip形象设计图。首先，让宠物处于宠物的站立姿势、每一个色块的颜色和具体位置要百分百还原。
        背景为纯白色（RGB 255,255,255），无杂色。结合用户描述特征【{}】，毛发还原毛色（含饱和度、渐变），完全还原毛发走势和质感（例如体现短毛颗粒感或长毛蓬松度），胡须保色泽韧性。
        五官复刻眼球颜色、瞳孔形状，眼周毛走向，鼻子质感，嘴唇弧度；耳朵还原大小、弧度及内侧绒毛。肢体按原图比例：颈、躯干、四肢骨骼，脚掌肉垫，尾巴形态。站姿符合习性，自然协调。
        3D 渲染达高精度，毛发用 PBR 材质，显光影细节；三点布光，明暗分明。形象保留原生特征，强化细节、增强亲和力。'''.format(prompt)
        
        # 生成图片
        imagesResponse = client.images.generate(
            model="doubao-seededit-3-0-i2i-250628",
            prompt=system_prompt,
            image=image_url,
            seed=seed,
            guidance_scale=guidance_scale,
            size=size,
            watermark=watermark 
        )
        
        return imagesResponse.data[0].url


# 示例使用
if __name__ == "__main__":
    # ”图+文“ ----> 图
    user_prompt = "这是一只猕猴，平时活奔乱跳，很喜欢到处爬，看到人的时候特别喜欢大喊大叫"
    result_url = generate_image_with_doubao(
        prompt=user_prompt,
        image_input="storage/test2.jpeg"
    )

    print(result_url)

