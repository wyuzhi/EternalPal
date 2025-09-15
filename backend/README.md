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
  ## 注意事项
1. 确保MySQL服务已启动并运行
2. 首次运行前需初始化数据库
3. 开发环境下使用Flask内置服务器，生产环境建议使用Gunicorn或uWSGI
4. 生产环境需修改.env文件中的FLASK_ENV为production

## 火山云服务器部署指南

### 一、服务器环境准备
1. 在火山云控制台创建一台云服务器，推荐选择：
   - 操作系统：Ubuntu 20.04或CentOS 7/8
   - CPU：至少2核
   - 内存：至少4GB
   - 磁盘：至少40GB

2. 登录服务器（使用SSH）

### 二、安装必要软件
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y  # Ubuntu系统
# 或 
sudo yum update -y  # CentOS系统

# 安装Python和pip
sudo apt install python3 python3-pip python3-venv git -y  # Ubuntu
# 或
sudo yum install python3 python3-pip python3-venv git -y  # CentOS
```

### 三、项目部署
1. **克隆项目代码**
```bash
# 创建项目目录
mkdir -p /var/www/eternalpal
cd /var/www/eternalpal

# 克隆代码（假设您使用git管理代码）
git clone <您的项目仓库地址> .
cd backend
```

2. **创建虚拟环境并安装依赖**
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt
```

3. **配置环境变量**
```bash
# 复制.env.example文件（如果有）
# cp .env.example .env

# 编辑.env文件
nano .env
```

在.env文件中，修改以下配置：
```
# 数据库URL - 可继续使用SQLite或切换到MySQL/PostgreSQL
DATABASE_URL=sqlite:////var/www/eternalpal/backend/eternal_pal.db

# 应用URL配置 - 设置为您的域名或服务器IP
APP_URL=http://您的域名或服务器IP:5001

# 保留其他API密钥配置
```

4. **初始化数据库**
```bash
# 运行数据库初始化脚本
python init_db.py
```

### 四、配置WSGI服务器
使用Gunicorn作为WSGI服务器：

```bash
# 安装Gunicorn
pip install gunicorn

# 测试运行
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### 五、配置Systemd服务
创建系统服务以便自动启动和管理应用：

```bash
# 创建服务文件
sudo nano /etc/systemd/system/eternalpal.service
```

添加以下内容：
```
[Unit]
Description=EternalPal Flask Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/eternalpal/backend
Environment="PATH=/var/www/eternalpal/backend/venv/bin"
ExecStart=/var/www/eternalpal/backend/venv/bin/gunicorn -w 4 -b 0.0.0.0:5001 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

启动并启用服务：
```bash
sudo systemctl start eternalpal
sudo systemctl enable eternalpal
```

# 查看eternalpal服务状态
sudo systemctl status eternalpal

# 查看服务实时日志
sudo journalctl -u eternalpal -f

### 六、配置Nginx（可选但推荐）
安装并配置Nginx作为反向代理：

```bash
# 安装Nginx
sudo apt install nginx -y  # Ubuntu
# 或
sudo yum install nginx -y  # CentOS

# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/eternalpal
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name 您的域名或服务器IP;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件配置（可选，根据需要调整）
    location /uploads {
        alias /var/www/eternalpal/backend/uploads;
        expires 30d;
    }

    location /models {
        alias /var/www/eternalpal/backend/models;
        expires 30d;
    }
}
```

启用配置并重启Nginx：
```bash
sudo ln -s /etc/nginx/sites-available/eternalpal /etc/nginx/sites-enabled/
sudo nginx -t  # 检查配置是否正确
sudo systemctl restart nginx
```

### 七、配置防火墙
```bash
# Ubuntu系统（使用ufw）
sudo ufw allow 'Nginx Full'
sudo ufw allow 22/tcp  # 允许SSH连接
sudo ufw enable

# CentOS系统（使用firewalld）
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

### 八、配置HTTPS（推荐）
建议使用Certbot获取免费的SSL证书：

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu
# 或
sudo yum install certbot python3-certbot-nginx -y  # CentOS

# 生成证书
sudo certbot --nginx -d 您的域名
```

### 九、定期备份（重要）
创建备份脚本并设置定时任务：

```bash
# 创建备份目录
mkdir -p /var/backups/eternalpal

# 创建备份脚本
nano /var/www/eternalpal/backup.sh
```

添加以下内容：
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/eternalpal"
DATE=$(date +%Y%m%d_%H%M%S)

# 备份数据库
cp /var/www/eternalpal/backend/eternal_pal.db "$BACKUP_DIR/db_backup_$DATE.db"

# 备份上传文件
zip -r "$BACKUP_DIR/uploads_backup_$DATE.zip" /var/www/eternalpal/backend/uploads/

# 删除7天前的备份
find "$BACKUP_DIR" -name "*" -mtime +7 -delete
```

设置执行权限并创建定时任务：
```bash
chmod +x /var/www/eternalpal/backup.sh
crontab -e
```

添加每日备份任务：
```
0 2 * * * /var/www/eternalpal/backup.sh
```

### 十、测试和监控
1. 访问您的域名或服务器IP，检查后端服务是否正常运行
2. 查看应用日志：`sudo journalctl -u eternalpal -f`
3. 定期检查服务器资源使用情况和应用运行状态

完成以上步骤后，您的EternalPal后端应该已经成功部署在火山云服务器上了。根据实际情况，您可能需要调整一些配置以适应您的具体环境和需求。

