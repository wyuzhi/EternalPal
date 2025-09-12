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
    model: str = "gemini-2.5-flash-image-preview",
    api_key: Optional[str] = None,
    timeout_seconds: int = 60,
) -> bytes:
    """
    根据文本或文本+图片生成结果图像。

    参数:
        prompt_text: 必填，提示词文本。
        image_url: 可选，输入图片 URL（用于图像编辑/合成）。
        image_path: 可选，本地图片路径（优先于 image_url）。
        model: 使用的模型名称，默认 "gemini-2.5-flash-image-preview"。
        api_key: API 密钥；若不提供，将从环境变量 LAOZHANG_API_KEY 读取。
        timeout_seconds: 请求超时时长（秒）。

    返回:
        生成图片的二进制字节数据（例如 PNG）。

    异常:
        ValueError: 当缺少 API Key 时。
        RuntimeError: 当接口返回非 200 或未解析到图片数据时。
    """
    # 尝试多个API Key作为备用方案
    api_keys = [
        'sk-KEQ6oUVsJVU7HPVB7eE4C27160854748B50fEd089a3cB71c',
        os.getenv("LAOZHANG_API_KEY"),
        os.getenv("BACKUP_API_KEY")
    ]
    
    resolved_api_key = None
    for key in api_keys:
        if key:
            resolved_api_key = key
            break
    
    if not resolved_api_key:
        raise ValueError("缺少 API Key，请通过参数 api_key 传入或设置环境变量 LAOZHANG_API_KEY。")

    headers = {
        "Authorization": f"Bearer {resolved_api_key}",
        "Content-Type": "application/json",
    }

    content_blocks = [
        {"type": "text", "text": prompt_text},
    ]
    # 若提供本地图片路径，则优先使用本地图片，转换为 data URL 形式
    if image_path:
        if not os.path.isfile(image_path):
            raise RuntimeError(f"本地图片不存在: {image_path}")
        mime_type, _ = mimetypes.guess_type(image_path)
        if not mime_type:
            mime_type = "image/png"
        with open(image_path, "rb") as f:
            raw_bytes = f.read()
        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"
        content_blocks.append(
            {
                "type": "image_url",
                "image_url": {"url": data_url},
            }
        )
    elif image_url:
        content_blocks.append(
            {
                "type": "image_url",
                "image_url": {"url": image_url},
            }
        )

    payload = {
        "model": model,
        "stream": False,
        "messages": [
            {"role": "user", "content": content_blocks},
        ],
    }
    LAOZHANG_API_URL = "https://api.laozhang.ai/v1/chat/completions"
    response = requests.post(LAOZHANG_API_URL, headers=headers, data=json.dumps(payload), timeout=timeout_seconds)
    if response.status_code != 200:
        error_detail = response.text
        # 检查是否是token相关的错误
        if "count_token_messages_failed" in error_detail:
            raise RuntimeError(f"API配额或计费问题: {response.status_code} {error_detail}")
        else:
            raise RuntimeError(f"请求失败: {response.status_code} {error_detail}")

    result = response.json()
    try:
        content = result["choices"][0]["message"]["content"]
    except Exception as error:
        raise RuntimeError(f"无法解析返回内容: {result}") from error

    # 提取 data:image/...;base64,xxxxx 形式的 Base64 数据（容忍换行/空白）
    base64_match = re.search(
        r"data:image/[^;]+;base64,([A-Za-z0-9+/=\s]+)",
        content,
        flags=re.IGNORECASE | re.MULTILINE | re.DOTALL,
    )
    if not base64_match:
        raise RuntimeError("未找到 Base64 图片数据")

    image_base64 = base64_match.group(1)
    # 去除可能的空白/换行
    image_base64 = re.sub(r"\s+", "", image_base64)
    try:
        return base64.b64decode(image_base64)
    except Exception as error:
        raise RuntimeError("Base64 解码失败") from error


if __name__ == "__main__":
    print("=== 示例: 仅文本生成图片 ===")
    # 示例 1：文本+本地图片路径（优先）
    prompt = "画一只可爱的小狗狗"
    image_path = "/Users/yuzhi/miniprograms/EternalPal/images/index_1.png"  # 请替换为你的本地图片路径

   
