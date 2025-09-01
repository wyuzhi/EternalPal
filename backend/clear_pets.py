from app import app, db, Pet,Chat

# 创建应用上下文并删除所有宠物数据
with app.app_context():
    try:
        # 查询并删除所有宠物记录
        pets_count = Chat.query.count()
        Chat.query.delete()
        db.session.commit()
                # 查询并删除所有宠物记录
        pets_count = Pet.query.count()
        Pet.query.delete()
        db.session.commit()
        print(f"成功删除了 {pets_count} 条宠物数据！")
    except Exception as e:
        db.session.rollback()
        print(f"删除宠物数据时出错: {str(e)}")