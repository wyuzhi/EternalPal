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
      // 使用真实API获取最新的宠物信息
      this.fetchPetInfo(currentPet.id);
    } else if (this.data.petId) {
      // 如果有petId参数，直接获取宠物信息
      this.fetchPetInfo(this.data.petId);
    } else {
      // 尝试从用户信息获取最新宠物
      const userInfo = tt.getStorageSync('userInfo') || {};
      if (userInfo.id) {
        this.fetchUserLatestPet(userInfo.id);
      } else {
        this.showNoPetMessage();
      }
    }
  },

  // 获取宠物信息
  fetchPetInfo: function(petId) {
    const that = this;
    const app = getApp();
    
    tt.showLoading({
      title: '正在加载宠物信息...',
    });
    
    tt.request({
      url: `${app.globalData.API_BASE_URL}/pets/${petId}`,
      method: 'GET',
      success: function(res) {
        console.log('[PetProfile] 获取宠物信息成功:', res.data);
        
        if (res.data && res.data.id) {
          that.loadPetProfile(res.data);
        } else {
          console.error('[PetProfile] 宠物信息格式错误:', res.data);
          that.showErrorMessage('宠物信息格式错误');
        }
      },
      fail: function(error) {
        console.error('[PetProfile] 获取宠物信息失败:', error);
        that.showErrorMessage('获取宠物信息失败');
      },
      complete: function() {
        tt.hideLoading();
      }
    });
  },
  
  // 获取用户最新宠物
  fetchUserLatestPet: function(userId) {
    const that = this;
    const app = getApp();
    
    tt.showLoading({
      title: '正在加载宠物信息...',
    });
    
    tt.request({
      url: `${app.globalData.API_BASE_URL}/users/${userId}/latest_pet`,
      method: 'GET',
      success: function(res) {
        console.log('[PetProfile] 获取用户最新宠物成功:', res.data);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          that.loadPetProfile(res.data.data);
        } else {
          console.log('[PetProfile] 用户暂无宠物');
          that.showNoPetMessage();
        }
      },
      fail: function(error) {
        console.error('[PetProfile] 获取用户最新宠物失败:', error);
        that.showErrorMessage('获取宠物信息失败');
      },
      complete: function() {
        tt.hideLoading();
      }
    });
  },
  
  // 加载宠物档案信息
  loadPetProfile: function(petInfo) {
    console.log('[PetProfile] 加载宠物档案信息:', petInfo);
    
    // 计算亲密度等级和进度
    const intimacyInfo = this.calculateIntimacyLevel(petInfo.intimacy || 0);
    
    // 解析性格和爱好字符串
    const personalities = petInfo.personality ? petInfo.personality.split(',').filter(p => p.trim()) : [];
    const hobbies = petInfo.hobby ? petInfo.hobby.split(',').filter(h => h.trim()) : [];
    
    this.setData({
      // 基本信息
      petName: petInfo.name || '我的宠物',
      petType: petInfo.type || 'dog',
      petGender: petInfo.gender || 'unknown',
      petBirthday: petInfo.birthday || '',
      petDescription: petInfo.story || '这是一个可爱的虚拟宠物，陪伴你度过美好时光。',
      petStory: petInfo.story || '',
      
      // 性格和爱好
      petPersonalities: personalities,
      petHobbies: hobbies,
      
      // 图片和模型
      petImage: petInfo.preview_url || petInfo.generated_image || '',
      generatedPetImage: petInfo.generated_image || '',
      modelUrl: petInfo.model_url || '',
      
      // 亲密度系统
      intimacyLevel: intimacyInfo.level,
      intimacyPoints: petInfo.intimacy || 0,
      intimacyProgress: intimacyInfo.progress,
      
      // 统计信息
      createdDate: petInfo.created_at ? new Date(petInfo.created_at).toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN'),
      lastActiveDate: new Date().toLocaleDateString('zh-CN'), // 当前时间作为最后活跃时间
      totalChatCount: 0, // 暂时设为0，后续可以通过聊天记录API获取
      totalPlayTime: 0,  // 暂时设为0，后续可以添加统计功能
      
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

  // 显示无宠物消息
  showNoPetMessage: function() {
    this.setData({
      petName: '暂无宠物',
      petType: 'unknown',
      petDescription: '您还没有创建宠物，请先去创建/领养一个吧！'
    });
    
    tt.showModal({
      title: '提示',
      content: '您还没有宠物，是否前往创建？',
      success: function(res) {
        if (res.confirm) {
          tt.navigateTo({
            url: '/pages/guide/guide'
          });
        }
      }
    });
  },
  
  // 显示错误消息
  showErrorMessage: function(message) {
    tt.showToast({
      title: message,
      icon: 'none',
      duration: 2000
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
