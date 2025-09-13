# -*- coding: utf-8 -*-
"""
文本转语音服务模块
支持多种TTS引擎的统一接口
"""

import os
import uuid
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

def generate_tts_audio(text: str, host: str) -> Tuple[str, str, bool]:
    """
    生成TTS音频文件
    
    Args:
        text: 要转换的文本
        host: 服务器host，用于生成URL
        
    Returns:
        tuple: (audio_url, filename, is_mock)
    """
    
    # 方案1: 尝试使用fish_audio_sdk (需要Python 3.10+)
    try:
        return _generate_with_fish_audio(text, host)
    except ImportError as e:
        logger.warning(f"fish_audio_sdk不可用: {e}")
    except Exception as e:
        logger.error(f"fish_audio_sdk生成失败: {e}")
    
    # 方案2: 尝试使用pyttsx3 (本地TTS)
    try:
        return _generate_with_pyttsx3(text, host)
    except ImportError as e:
        logger.warning(f"pyttsx3不可用: {e}")
    except Exception as e:
        logger.error(f"pyttsx3生成失败: {e}")
    
    # 方案3: 尝试使用gTTS (Google TTS)
    try:
        return _generate_with_gtts(text, host)
    except ImportError as e:
        logger.warning(f"gTTS不可用: {e}")
    except Exception as e:
        logger.error(f"gTTS生成失败: {e}")
    
    # 方案4: 返回模拟音频
    logger.info("所有TTS引擎都不可用，使用模拟音频")
    return _generate_mock_audio(text, host)

def _generate_with_fish_audio(text: str, host: str) -> Tuple[str, str, bool]:
    """使用fish_audio_sdk生成语音"""
    from fish_audio_sdk import Session, TTSRequest
    
    session = Session("3aa32d402483478185e818d76256f03c")
    
    # 生成文件路径
    filename = f"tts_fish_{uuid.uuid4().hex[:8]}.mp3"
    filepath = os.path.join('uploads', filename)
    os.makedirs('uploads', exist_ok=True)
    
    # 生成语音
    with open(filepath, "wb") as f:
        for chunk in session.tts(
            TTSRequest(text=text, reference_id='fee78e7eb3c64506b216610e6502e35b'),
            backend="speech-1.6"
        ):
            f.write(chunk)
    
    audio_url = f"http://{host}/uploads/{filename}"
    return audio_url, filename, False

def _generate_with_pyttsx3(text: str, host: str) -> Tuple[str, str, bool]:
    """使用pyttsx3生成语音"""
    import pyttsx3
    
    # 生成文件路径
    filename = f"tts_pyttsx3_{uuid.uuid4().hex[:8]}.wav"
    filepath = os.path.join('uploads', filename)
    os.makedirs('uploads', exist_ok=True)
    
    # 初始化TTS引擎
    engine = pyttsx3.init()
    
    # 设置语音属性
    voices = engine.getProperty('voices')
    if voices:
        # 尝试选择中文语音
        for voice in voices:
            if 'chinese' in voice.name.lower() or 'zh' in voice.id.lower():
                engine.setProperty('voice', voice.id)
                break
    
    # 设置语速和音量
    engine.setProperty('rate', 150)  # 语速
    engine.setProperty('volume', 0.8)  # 音量
    
    # 保存到文件
    engine.save_to_file(text, filepath)
    engine.runAndWait()
    
    audio_url = f"http://{host}/uploads/{filename}"
    return audio_url, filename, False

def _generate_with_gtts(text: str, host: str) -> Tuple[str, str, bool]:
    """使用gTTS生成语音"""
    from gtts import gTTS
    
    # 生成文件路径
    filename = f"tts_gtts_{uuid.uuid4().hex[:8]}.mp3"
    filepath = os.path.join('uploads', filename)
    os.makedirs('uploads', exist_ok=True)
    
    # 生成语音文件
    tts = gTTS(text=text, lang='zh', slow=False)
    tts.save(filepath)
    
    audio_url = f"http://{host}/uploads/{filename}"
    return audio_url, filename, False

def _generate_mock_audio(text: str, host: str) -> Tuple[str, str, bool]:
    """生成模拟音频响应"""
    logger.info(f"使用模拟音频模式，文本: {text}")
    
    # 返回一个测试音频URL
    mock_urls = [
        "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
        "https://www.zapsplat.com/wp-content/uploads/2015/sound-effects-one/zapsplat_multimedia_notification_chime_ping_001_44628.mp3",
        "https://soundbible.com/mp3/Ting-Popup_1-SoundBible.com-353625781.mp3"
    ]
    
    # 根据文本长度选择不同的模拟音频
    url_index = len(text) % len(mock_urls)
    audio_url = mock_urls[url_index]
    
    return audio_url, "mock_audio.wav", True

# 检查并安装依赖的辅助函数
def check_and_install_dependencies():
    """检查并尝试安装TTS依赖"""
    import subprocess
    import sys
    
    dependencies = [
        ("pyttsx3", "pyttsx3"),
        ("gtts", "gTTS"),
    ]
    
    installed = []
    failed = []
    
    for package_name, import_name in dependencies:
        try:
            __import__(import_name.lower())
            installed.append(package_name)
            logger.info(f"{package_name} 已安装")
        except ImportError:
            logger.warning(f"{package_name} 未安装，尝试安装...")
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package_name])
                installed.append(package_name)
                logger.info(f"{package_name} 安装成功")
            except Exception as e:
                failed.append((package_name, str(e)))
                logger.error(f"{package_name} 安装失败: {e}")
    
    return installed, failed

if __name__ == "__main__":
    # 测试TTS功能
    print("检查TTS依赖...")
    installed, failed = check_and_install_dependencies()
    
    print(f"已安装: {installed}")
    if failed:
        print(f"安装失败: {failed}")
    
    # 测试生成语音
    test_text = "你好，我是你的宠物伙伴！"
    try:
        audio_url, filename, is_mock = generate_tts_audio(test_text, "localhost:5001")
        print(f"语音生成成功:")
        print(f"  URL: {audio_url}")
        print(f"  文件名: {filename}")
        print(f"  模拟模式: {is_mock}")
    except Exception as e:
        print(f"语音生成失败: {e}")