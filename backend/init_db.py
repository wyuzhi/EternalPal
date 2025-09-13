from app import app, db, Pet, User, Chat
from datetime import datetime

# 创建数据库表
with app.app_context():
    # 删除所有表（如果存在）
    db.drop_all()
    # 创建所有表
    db.create_all()

    print('数据库表已创建成功！')

    # 可选：添加测试数据
    try:
        # 创建测试用户（使用抖音ID）
        test_user = User(
            douyin_id='douyin_test_user_123456'
        )
        db.session.add(test_user)
        db.session.commit()

        # 创建测试宠物
        test_pet = Pet(
            name='测试宠物',
            type='猫咪',
            gender='female',
            personality='活泼,可爱',
            hobby='睡觉,玩耍',
            story='这是一只测试宠物',
            generated_image='/images/test_pet.png',
            model_url='/models/cat.glb',
            user_id=test_user.id,


        )
        db.session.add(test_pet)
        db.session.commit()

        # 创建测试聊天记录
        chat1 = Chat(
            content='你好，宠物！',
            is_user=True,
            pet_id=test_pet.id
        )
        chat2 = Chat(
            content='你好，主人！',
            is_user=False,
            pet_id=test_pet.id
        )
        db.session.add(chat1)
        db.session.add(chat2)
        db.session.commit()

        print('测试数据已添加成功！')
    except Exception as e:
        db.session.rollback()
        print(f'添加测试数据失败: {str(e)}')