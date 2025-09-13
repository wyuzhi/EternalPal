#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ge_router.py 的简化测试文件
测试文生图和文+图生图功能
"""

import os
import sys
import unittest
import tempfile
import base64
from unittest.mock import patch, mock_open, MagicMock
from PIL import Image

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ge_router import generate_image


class TestGeRouter(unittest.TestCase):
    """ge_router 简化测试类"""
    
    def setUp(self):
        """测试前的准备工作"""
        # 模拟 API 响应
        self.mock_api_response = {
            "choices": [{
                "message": {
                    "content": "这是生成的图片：data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                }
            }]
        }
        
        # 创建一个简单的 1x1 像素 PNG 图片的 base64 数据
        self.test_image_bytes = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        )
    
    @patch('ge_router.requests.post')
    def test_text_to_image(self, mock_post):
        """测试文生图功能"""
        # 模拟 API 响应
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_post.return_value = mock_response
        
        # 测试纯文本生成图片
        result = generate_image("画一只可爱的小猫")
        
        # 验证结果
        self.assertIsInstance(result, bytes)
        self.assertEqual(result, self.test_image_bytes)
        
        # 验证 API 调用
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        self.assertIn('Authorization', call_args[1]['headers'])
        print("✅ 文生图测试通过")
    
    @patch('ge_router.requests.post')
    @patch('builtins.open', new_callable=mock_open)
    @patch('os.path.isfile')
    @patch('mimetypes.guess_type')
    def test_text_and_image_to_image(self, mock_guess_type, mock_isfile, mock_file, mock_post):
        """测试文+图生图功能"""
        # 设置模拟
        mock_isfile.return_value = True
        mock_guess_type.return_value = ('image/png', None)
        mock_file.return_value.read.return_value = b'fake_image_data'
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_post.return_value = mock_response
        
        # 测试文+图生图（使用本地图片路径）
        result = generate_image(
            "把这只猫变成橘色的",
            image_path="/path/to/test.png"
        )
        
        # 验证结果
        self.assertIsInstance(result, bytes)
        self.assertEqual(result, self.test_image_bytes)
        
        # 验证文件操作
        mock_isfile.assert_called_with("/path/to/test.png")
        mock_file.assert_called_with("/path/to/test.png", "rb")
        print("✅ 文+图生图测试通过")
    
    @patch('ge_router.requests.post')
    def test_text_and_url_to_image(self, mock_post):
        """测试文+图片URL生图功能"""
        # 模拟 API 响应
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_post.return_value = mock_response
        
        # 测试文+图生图（使用图片URL）
        result = generate_image(
            "把这只猫变成黑色的",
            image_url="https://example.com/cat.jpg"
        )
        
        # 验证结果
        self.assertIsInstance(result, bytes)
        self.assertEqual(result, self.test_image_bytes)
        print("✅ 文+图片URL生图测试通过")


if __name__ == '__main__':
    print("开始运行 ge_router 简化测试...")
    unittest.main(verbosity=2)