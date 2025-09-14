import os
import json
import base64
import re
import mimetypes
from typing import Optional

import requests





def generate_image(
    prompt_text: str,
    image_url: Optional[str] = None,
    image_path: Optional[str] = None,
    *,
    model: str = "doubao-seedream-4-0-250828",
    api_key: Optional[str] = None,
    timeout_seconds: int = 60,
) -> bytes:
    """
    根据文本或文本+图片生成结果图像。

    参数:
        prompt_text: 必填，提示词文本。
        image_url: 可选，输入图片 URL（用于图像编辑/合成）。
        image_path: 可选，本地图片路径（优先于 image_url）。
        model: 使用的模型名称，默认 "doubao-seedream-4-0-250828"。
        api_key: API 密钥；若不提供，将使用默认密钥。
        timeout_seconds: 请求超时时长（秒）。

    返回:
        生成图片的二进制字节数据（例如 PNG）。

    异常:
        ValueError: 当缺少 API Key 时。
        RuntimeError: 当接口返回非 200 或未解析到图片数据时。
    """
    # 从环境变量获取SeedDream API配置
    resolved_api_key = api_key or os.getenv('SEEDDREAM_API_KEY')
    resolved_model = model or os.getenv('SEEDDREAM_MODEL', 'doubao-seedream-4-0-250828')
    api_url = os.getenv('SEEDDREAM_API_URL', 'https://ark.cn-beijing.volces.com/api/v3/images/generations')
    
    if not resolved_api_key:
        raise ValueError("缺少 API Key")

    headers = {
        "Authorization": f"Bearer {resolved_api_key}",
        "Content-Type": "application/json",
    }

    # 构建豆包API的请求体
    payload = {
        "model": resolved_model,
        "prompt": prompt_text,
        "response_format": "url",
        "size": "2K",
        "stream": False,
        "watermark": True
    }
    
    # 如果有图片输入，添加到请求中
    if image_path or image_url:
        image_list = []
        
        # 优先使用本地图片路径
        if image_path:
            if not os.path.isfile(image_path):
                raise RuntimeError(f"本地图片不存在: {image_path}")
            # 对于本地图片，需要先上传或转换为URL
            # 这里暂时跳过本地图片处理，因为豆包API需要URL
            pass
        elif image_url:
            image_list.append(image_url)
            
        if image_list:
            payload["image"] = image_list
    
    response = requests.post(api_url, headers=headers, data=json.dumps(payload), timeout=timeout_seconds)
    
    if response.status_code != 200:
        error_detail = response.text
        raise RuntimeError(f"请求失败: {response.status_code} {error_detail}")

    result = response.json()
    
    try:
        # 豆包API返回格式：{"data": [{"url": "图片URL"}]}
        image_url = result["data"][0]["url"]
        
        # 下载图片并返回二进制数据
        image_response = requests.get(image_url, timeout=timeout_seconds)
        if image_response.status_code != 200:
            raise RuntimeError(f"下载图片失败: {image_response.status_code}")
            
        return image_response.content
        
    except Exception as error:
        raise RuntimeError(f"无法解析返回内容或下载图片: {result}") from error


if __name__ == "__main__":
    print("=== 示例: 仅文本生成图片 ===")
    # 示例 1：文本+本地图片路径（优先）
    prompt = "画一只可爱的小狗狗"
    image_path = "/Users/yuzhi/miniprograms/EternalPal/images/index_1.png"  # 请替换为你的本地图片路径

   
