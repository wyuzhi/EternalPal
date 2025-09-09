from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from datetime import datetime

# 初始化Flask应用和数据库
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////Users/yuzhi/miniprograms/EternalPal/backend/eternal_pal.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 定义User模型（与app.py中的定义保持一致）
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    douyin_id = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.id}: {self.douyin_id}>'

# 查询并显示所有用户数据
def query_all_users():
    with app.app_context():
        try:
            # 查询所有用户
            users = User.query.all()
            
            if not users:
                print("数据库中没有用户数据")
                return
            
            print("数据库中的用户数据：")
            print("=" * 80)
            print(f"{'ID':<5} | {'抖音ID':<30} | {'创建时间':<25}")
            print("=" * 80)
            
            for user in users:
                # 格式化创建时间
                created_at_str = user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else 'N/A'
                print(f"{user.id:<5} | {user.douyin_id:<30} | {created_at_str:<25}")
            
            print("=" * 80)
            print(f"总计: {len(users)} 个用户")
            
        except Exception as e:
            print(f"查询用户数据时出错: {str(e)}")

if __name__ == "__main__":
    query_all_users()