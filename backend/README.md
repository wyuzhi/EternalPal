# AI萌宠后端服务

这是AI萌宠小程序的后端服务，使用Python Flask框架开发，提供API接口和数据库支持。

## 技术栈
- Python 3.8+
- Flask 2.0.1
- Flask-SQLAlchemy 2.5.1
- Flask-CORS 3.0.10
- PyMySQL 1.0.2
- MySQL 8.0

## 项目结构
```
backend/
├── app.py              # 应用主文件
├── requirements.txt    # 依赖包列表
├── .env                # 环境变量配置
├── init_db.py          # 数据库初始化脚本
└── README.md           # 项目说明
```

## 环境设置
1. 安装依赖包
   ```
   pip install -r requirements.txt
   ```

2. 配置环境变量
   修改.env文件中的数据库连接信息，确保与您的MySQL配置匹配。
   ```
   DATABASE_URL=mysql+pymysql://username:password@localhost:3306/eternal_pal
   ```

3. 初始化数据库
   ```
   python init_db.py
   ```
   这将创建数据库表并添加测试数据。

## 运行服务
```
python app.py
```
服务将运行在 http://localhost:5000

## API接口

### 健康检查
- URL: /api/health
- 方法: GET
- 描述: 检查服务是否正常运行
- 返回示例:
  ```json
  {
    "status": "ok",
    "message": "Backend service is running"
  }
  ```

### 创建宠物
- URL: /api/pets
- 方法: POST
- 描述: 创建新宠物
- 请求体示例:
  ```json
  {
    "name": "宠物名称",
    "type": "猫咪",
    "gender": "female",
    "personality": "活泼,可爱",
    "hobby": "睡觉,玩耍",
    "story": "宠物故事",
    "generated_image": "/images/pet.png",
    "model_url": "/models/cat.glb",
    "user_id": 1
  }
  ```
- 返回示例:
  ```json
  {
    "status": "success",
    "message": "Pet created successfully",
    "pet_id": 1
  }
  ```

### 获取宠物详情
- URL: /api/pets/{pet_id}
- 方法: GET
- 描述: 获取宠物详细信息
- 返回示例:
  ```json
  {
    "status": "success",
    "data": {
      "id": 1,
      "name": "宠物名称",
      "type": "猫咪",
      "gender": "female",
      "personality": "活泼,可爱",
      "hobby": "睡觉,玩耍",
      "story": "宠物故事",
      "generated_image": "/images/pet.png",
      "model_url": "/models/cat.glb",
      "created_at": "2023-05-20T10:30:00Z"
    }
  }
  ```

### 添加聊天记录
- URL: /api/pets/{pet_id}/chats
- 方法: POST
- 描述: 添加宠物聊天记录
- 请求体示例:
  ```json
  {
    "content": "你好，宠物！",
    "is_user": true
  }
  ```
- 返回示例:
  ```json
  {
    "status": "success",
    "message": "Chat added successfully"
  }
  ```

### 获取聊天记录
- URL: /api/pets/{pet_id}/chats
- 方法: GET
- 描述: 获取宠物聊天记录
- 返回示例:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 1,
        "content": "你好，宠物！",
        "is_user": true,
        "created_at": "2023-05-20T10:35:00Z"
      },
      {
        "id": 2,
        "content": "你好，主人！",
        "is_user": false,
        "created_at": "2023-05-20T10:36:00Z"
      }
    ]
  }
  ```

## 注意事项
1. 确保MySQL服务已启动并运行
2. 首次运行前需初始化数据库
3. 开发环境下使用Flask内置服务器，生产环境建议使用Gunicorn或uWSGI
4. 生产环境需修改.env文件中的FLASK_ENV为production