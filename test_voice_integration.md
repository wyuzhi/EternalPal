# 宠物消息语音播放功能测试指南

## 功能概述
本功能实现了宠物消息的语音播放，包括后端TTS API、前端播放逻辑和用户设置开关。

## 测试步骤

### 1. 后端API测试
确保后端服务正在运行（端口5001）:
```bash
cd backend
python3 app.py
```

测试TTS API接口：
```bash
curl -X POST http://localhost:5001/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"你好，我是你的宠物伙伴！"}'
```

期望返回：
```json
{
  "audio_url": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
  "filename": "mock_audio.wav",
  "is_mock": true,
  "message": "语音生成成功（模拟模式）",
  "status": "success"
}
```

### 2. 前端设置测试
1. 打开小程序，进入设置页面
2. 找到"宠物语音回复"开关
3. 测试开关切换功能
4. 验证设置是否持久化保存

### 3. 语音播放测试
1. 确保在设置中开启了"宠物语音回复"
2. 进入宠物陪伴页面
3. 发送消息给宠物
4. 观察是否有语音播放提示（模拟模式下显示提示）

### 4. 集成测试场景

#### 场景1：开启语音播放
1. 设置 -> 开启"宠物语音回复"
2. 陪伴页面 -> 发送消息
3. 应看到"语音功能正在模拟中"的提示

#### 场景2：关闭语音播放
1. 设置 -> 关闭"宠物语音回复"
2. 陪伴页面 -> 发送消息
3. 不应有任何语音相关提示

#### 场景3：页面切换保持设置
1. 开启语音播放设置
2. 切换到其他页面再返回
3. 设置应保持开启状态

## 技术实现要点

### 后端 (app.py)
- `/api/tts` POST接口
- 支持text参数（最大500字符）
- 模拟模式下返回测试音频URL
- 错误处理和日志记录

### 前端 (companion.js)
- `initVoiceSettings()`: 初始化语音设置
- `playAIReplyVoice()`: 播放AI回复语音
- `playAudioFromUrl()`: 从URL播放音频
- `stopCurrentAudio()`: 停止当前播放
- `toggleVoiceReply()`: 切换语音开关

### 设置页面 (settings.js/ttml)
- 语音播放开关UI
- `onVoiceReplyToggle()`: 处理开关切换
- 持久化存储设置

## 已知限制
1. 当前使用模拟模式，需要配置真实的TTS服务
2. 需要Python 3.10+才能使用fish_audio_sdk
3. 音频播放依赖小程序的tt.createInnerAudioContext API

## 扩展建议
1. 集成真实的TTS服务（如腾讯云、阿里云等）
2. 添加语音播放速度调节
3. 支持不同的语音音色选择
4. 添加语音播放进度条
5. 支持语音播放队列管理