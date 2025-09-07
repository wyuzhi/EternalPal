const app = getApp();

Page({
  data: {
    // 基本信息
    petName: '',
    petType: '',
    petGender: '',
    petBirthday: '',
    petDescription: '',
    petStory: '',
    
    // 性格和爱好
    petPersonalities: [],
    petHobbies: [],
    
    // 图片
    petImage: '',
    generatedPetImage: '',
    // modelUrl: '',
    
    // 亲密度系统
    intimacyLevel: 0,
    intimacyPoints: 0,
    intimacyProgress: 0,
    
    // 统计信息
    createdDate: '',
    lastActiveDate: '',
    totalChatCount: 0,
    totalPlayTime: 0,
    
    // 其他信息
    petId: '',
    userId: ''
  },

  onLoad: function(options) {
    console.log('[PetProfile] 页面加载，参数:', options);
    
    // 从参数中获取宠物信息
    if (options) {
      this.setData({
        petName: options.petName || '我的宠物',
        petType: options.petType || 'dog',
        petId: options.petId || ''
      });
    }
    
    // 从本地存储获取当前宠物信息
    const currentPet = tt.getStorageSync('currentPet') || {};
    if (currentPet.id) {
      this.loadPetProfile(currentPet);
    } else {
      // 模拟数据
      this.setData({
        // 基本信息
        petName: '我的宠物',
        petType: '狗狗',
        petGender: 'male',
        petBirthday: '2025-01-01',
        petPersonalities_desc: '这是一个可爱的虚拟宠物，陪伴你度过美好时光。',
        petHobbies_desc: '这是一个可爱的虚拟宠物，陪伴你度过美好时光。',
        petStory: '从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前从前',
        
        // 性格和爱好
        petPersonalities: ['活力满满', '温顺乖巧'],
        petHobbies: ['跑跳玩耍', '安静发呆'],
        
        // 图片和模型
        petImage: '',
        generatedPetImage: '',
        modelUrl: '',
        
        // 亲密度系统
        intimacyLevel: 0,
        intimacyPoints: 10,
        intimacyProgress: 10,
        
        // 统计信息
        createdDate: new Date().toLocaleDateString('zh-CN'),
        lastActiveDate: new Date().toLocaleDateString('zh-CN'),
        totalChatCount: 0,
        totalPlayTime: 0,
        
        // 其他信息
        petId: '',
        userId: ''
      });
    }
  },

  // 加载宠物档案信息
  loadPetProfile: function(petInfo) {
    console.log('[PetProfile] 加载宠物档案信息:', petInfo);
    
    // 计算亲密度等级和进度
    const intimacyInfo = this.calculateIntimacyLevel(petInfo.intimacy_points || 0);
    
    // 解析性格和爱好字符串
    const personalities = petInfo.personality ? petInfo.personality.split(',').filter(p => p.trim()) : [];
    const hobbies = petInfo.hobby ? petInfo.hobby.split(',').filter(h => h.trim()) : [];
    
    this.setData({
      // 基本信息
      petName: petInfo.name || '我的宠物',
      petType: petInfo.type || 'dog',
      petGender: petInfo.gender || 'unknown',
      petBirthday: petInfo.birthday || '',
      petDescription: petInfo.description || petInfo.story || '这是一个可爱的虚拟宠物，陪伴你度过美好时光。',
      petStory: petInfo.story || '',
      
      // 性格和爱好
      petPersonalities: personalities,
      petHobbies: hobbies,
      
      // 图片和模型
      petImage: petInfo.preview_url || petInfo.generated_image || '/images/petTypes/dog.svg',
      generatedPetImage: petInfo.generated_image || '',
      modelUrl: petInfo.model_url || '',
      
      // 亲密度系统
      intimacyLevel: intimacyInfo.level,
      intimacyPoints: petInfo.intimacy_points || 0,
      intimacyProgress: intimacyInfo.progress,
      
      // 统计信息
      createdDate: petInfo.created_at ? new Date(petInfo.created_at).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN'),
      lastActiveDate: petInfo.last_active ? new Date(petInfo.last_active).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN'),
      totalChatCount: petInfo.total_chat_count || 0,
      totalPlayTime: petInfo.total_play_time || 0,
      
      // 其他信息
      petId: petInfo.id || '',
      userId: petInfo.user_id || ''
    });
  },

  // 计算亲密度等级和进度
  calculateIntimacyLevel: function(intimacyPoints) {
    const maxLevel = 99;
    const pointsPerLevel = 100;
    
    const level = Math.min(Math.floor(intimacyPoints / pointsPerLevel), maxLevel);
    
    let progress = 0;
    if (level < maxLevel) {
      const currentLevelPoints = intimacyPoints % pointsPerLevel;
      progress = (currentLevelPoints / pointsPerLevel) * 100;
    } else {
      progress = 100;
    }
    
    return {
      level: level,
      progress: Math.round(progress)
    };
  },

  // 编辑宠物信息
  onEditTap: function() {
    tt.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    });
  },

  // 分享宠物档案 TODO
  onShareTap: function() {
    tt.showShareMenu({
      withShareTicket: true,
      success: function() {
        console.log('[PetProfile] 分享菜单调起成功');
      },
      fail: function(error) {
        console.error('[PetProfile] 分享菜单调起失败:', error);
        tt.showToast({
          title: '分享失败',
          icon: 'none'
        });
      }
    });
  }
});
