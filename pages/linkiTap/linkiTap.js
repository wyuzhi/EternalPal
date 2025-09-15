// NFC拉起页面 - linkiTap
const app = getApp();

Page({
  data: {
    // 当前日期
    currentDate: '',
    currentMonth: '',
    currentDay: '',
    
    // 陪伴天数
    companionDays: 0,
    daysDigits: [],
    
    // 宠物信息
    petName: '',
    petAvatar: '/images/logo.svg', // 默认灵仔头像
    
    // 开场白
    greetingText: '你好！很高兴见到你～',
    
    // 拍一拍场景类型
    tapType: 'self', // 'self': 自己拍自己, 'received': 别人拍我, 'sent': 我拍别人
    targetUserName: '', // 目标用户名
    targetUserAvatar: '', // 目标用户头像
    
    // 测试模式
    debugMode: false,
    
    // 系统信息
    safeAreaBottom: 0
  },

  onLoad: function (options) {
    console.log('[LinkiTap] NFC拉起页面加载', options);
    
    // 解析URL参数，确定拍一拍场景
    this.parseTapType(options);
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 初始化数据
    this.initData();
    
    // 开发环境下添加测试功能
    if (options.debug === 'true') {
      this.addTestButtons();
    }
  },

  // 解析拍一拍类型
  parseTapType: function(options) {
    console.log('[LinkiTap] 解析拍一拍类型', options);
    
    // 从URL参数中获取拍一拍类型和目标用户信息
    const tapType = options.type || 'self'; // 默认自己拍自己
    const targetUserName = options.targetUser || '';
    const targetUserAvatar = options.targetAvatar || '';
    const debugMode = options.debug === 'true';
    
    this.setData({
      tapType: tapType,
      targetUserName: targetUserName,
      targetUserAvatar: targetUserAvatar,
      debugMode: debugMode
    });
    
    console.log('[LinkiTap] 拍一拍类型:', tapType, '目标用户:', targetUserName, '调试模式:', debugMode);
  },

  // 获取系统信息
  getSystemInfo: function() {
    const that = this;
    tt.getSystemInfo({
      success: function(res) {
        console.log('[LinkiTap] 获取系统信息成功:', res);
        
        // 计算底部安全区域距离
        let safeAreaBottom = 0;
        if (res.safeArea) {
          safeAreaBottom = res.screenHeight - res.safeArea.bottom;
        }
        
        that.setData({
          safeAreaBottom: safeAreaBottom
        });
      },
      fail: function(error) {
        console.error('[LinkiTap] 获取系统信息失败:', error);
        that.setData({
          safeAreaBottom: 0
        });
      }
    });
  },

  // 初始化数据
  initData: function() {
    console.log('[LinkiTap] 初始化数据');
    
    // 设置当前日期
    this.setCurrentDate();
    
    // 获取宠物信息
    this.loadPetInfo();
    
    // 计算陪伴天数
    this.calculateCompanionDays();
    
    // 设置随机开场白
    this.setGreeting();
  },

  // 设置当前日期
  setCurrentDate: function() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    this.setData({
      currentDate: `今天是${month}月${day}日`,
      currentMonth: month,
      currentDay: day
    });
  },

  // 加载宠物信息
  loadPetInfo: function() {
    console.log('[LinkiTap] 加载宠物信息');
    
    // 从本地存储获取当前宠物信息
    const currentPet = tt.getStorageSync('currentPet') || {};
    
    if (currentPet.name) {
      this.setData({
        petName: currentPet.name,
        petAvatar: currentPet.avatar || '/images/logo.svg'
      });
      console.log('[LinkiTap] 宠物名称:', currentPet.name);
    } else {
      console.log('[LinkiTap] 未找到宠物信息，使用默认名称');
      this.setData({
        petName: '灵仔'
      });
    }
  },

  // 计算陪伴天数
  calculateCompanionDays: function() {
    // 从本地存储获取宠物创建时间
    const currentPet = tt.getStorageSync('currentPet') || {};
    
    console.log('[LinkiTap] 当前宠物数据:', currentPet);
    
    let startDate;
    if (currentPet.created_at) {
      startDate = new Date(currentPet.created_at);
      console.log('[LinkiTap] 使用宠物创建时间:', currentPet.created_at);
    } else {
      // 如果没有宠物创建时间，尝试从服务器获取最新信息
      console.log('[LinkiTap] 未找到创建时间，尝试从服务器获取最新宠物信息');
      this.fetchLatestPetInfo();
      return; // 等待服务器返回后再计算
    }
    
    const today = new Date();
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const newDays = Math.max(1, daysDiff); // 至少显示1天
    
    this.setData({
      companionDays: newDays
    });
    
    // 初始化数字显示
    this.initDaysDigits(newDays);
    
    console.log('[LinkiTap] 陪伴天数计算 - 开始时间:', startDate, '今天:', today, '天数:', newDays);
  },

  // 从服务器获取最新宠物信息
  fetchLatestPetInfo: function() {
    const userInfo = tt.getStorageSync('userInfo') || {};
    if (!userInfo.id) {
      console.log('[LinkiTap] 未找到用户信息，使用当前时间作为开始时间');
      this.calculateCompanionDaysWithCurrentTime();
      return;
    }

    const that = this;
    tt.request({
      url: app.globalData.API_BASE_URL + '/users/' + userInfo.id + '/latest_pet',
      method: 'GET',
      success: function(res) {
        console.log('[LinkiTap] 获取最新宠物信息结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          const latestPet = res.data.data;
          
          // 更新本地存储的宠物信息
          tt.setStorageSync('currentPet', latestPet);
          
          // 重新计算陪伴天数
          that.calculateCompanionDays();
        } else {
          console.log('[LinkiTap] 未获取到宠物信息，使用当前时间');
          that.calculateCompanionDaysWithCurrentTime();
        }
      },
      fail: function(error) {
        console.error('[LinkiTap] 获取最新宠物信息失败:', error);
        that.calculateCompanionDaysWithCurrentTime();
      }
    });
  },

  // 使用当前时间计算陪伴天数（作为备用方案）
  calculateCompanionDaysWithCurrentTime: function() {
    const startDate = new Date();
    const today = new Date();
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const newDays = Math.max(1, daysDiff);
    
    this.setData({
      companionDays: newDays
    });
    
    this.initDaysDigits(newDays);
    
    console.log('[LinkiTap] 使用当前时间计算陪伴天数:', newDays);
  },

  // 初始化数字显示（复用memory页面的逻辑）
  initDaysDigits: function(days) {
    const daysStr = days.toString();
    const digits = [];
    
    for (let i = 0; i < daysStr.length; i++) {
      digits.push({
        current: daysStr[i],
        next: daysStr[i],
        isAnimating: false
      });
    }
    
    this.setData({
      daysDigits: digits
    });
  },

  // 设置开场白
  setGreeting: function() {
    const tapType = this.data.tapType;
    let greetingText = '';
    
    switch(tapType) {
      case 'self':
        // 自己拍自己
        const selfGreetings = [
          '嘿，我来啦，今天一起开心吗？',
          '咕噜，陪伴日 +1！',
          '别忘了，有我在你身边哦～',
          '拍了拍我一下，我们今天的故事就开始啦'
        ];
        greetingText = selfGreetings[Math.floor(Math.random() * selfGreetings.length)];
        break;
        
      case 'received':
        // 别人拍我
        const receivedGreetings = [
          '有人找我啦！',
          '快跟我一起回应ta的拍一拍吧！'
        ];
        greetingText = receivedGreetings.join('\n');
        break;
        
      case 'sent':
        // 我拍别人
        const sentGreetings = [
          '咕噜，你找到了ta啦！',
          '快带我认识认识！',
          '快看看ta的反应吧！'
        ];
        greetingText = sentGreetings.join('\n');
        break;
        
      default:
        greetingText = '嘿，我来啦，今天一起开心吗？';
    }
    
    this.setData({
      greetingText: greetingText
    });
  },

  // 主要按钮点击事件
  onStartCompanion: function() {
    const tapType = this.data.tapType;
    console.log('[LinkiTap] 点击主要按钮，场景类型:', tapType);
    
    switch(tapType) {
      case 'self':
        // 自己拍自己 - 开启今日陪伴
        this.navigateToCompanion();
        break;
        
      case 'received':
        // 别人拍我 - 回应拍一拍
        this.respondToTap();
        break;
        
      case 'sent':
        // 我拍别人 - 发起互动
        this.initiateInteraction();
        break;
    }
  },

  // 跳转到companion页面
  navigateToCompanion: function() {
    tt.navigateTo({
      url: '/pages/companion/companion',
      success: function() {
        console.log('[LinkiTap] 跳转到companion页面成功');
      },
      fail: function(error) {
        console.error('[LinkiTap] 跳转到companion页面失败:', error);
        tt.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 回应拍一拍
  respondToTap: function() {
    console.log('[LinkiTap] 回应拍一拍');
    // TODO: 实现回应拍一拍的逻辑
    tt.showToast({
      title: '回应拍一拍功能待实现',
      icon: 'none'
    });
  },

  // 发起互动
  initiateInteraction: function() {
    console.log('[LinkiTap] 发起互动');
    // TODO: 实现发起互动的逻辑，跳转到聊天或消息页面
    tt.showToast({
      title: '发起互动功能待实现',
      icon: 'none'
    });
  },

  // 忽略按钮点击（仅received场景）
  onIgnore: function() {
    console.log('[LinkiTap] 忽略拍一拍');
    // 关闭当前页面
    tt.navigateBack({
      success: function() {
        console.log('[LinkiTap] 忽略成功，返回上一页');
      },
      fail: function() {
        // 如果没有上一页，则跳转到首页
        tt.reLaunch({
          url: '/pages/guide/guide'
        });
      }
    });
  },

  // 撤回按钮点击（仅sent场景）
  onWithdraw: function() {
    console.log('[LinkiTap] 撤回拍一拍');
    
    // 显示确认对话框
    tt.showModal({
      title: '确认撤回',
      content: '确定要撤回这次拍一拍吗？',
      confirmText: '确认撤回',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认撤回
          this.executeWithdraw();
        } else {
          // 用户取消撤回
          console.log('[LinkiTap] 用户取消撤回');
        }
      }
    });
  },

  // 执行撤回操作
  executeWithdraw: function() {
    console.log('[LinkiTap] 执行撤回操作');
    
    // TODO: 实现撤回拍一拍的逻辑
    // 这里可以调用后端API撤回拍一拍
    
    // 显示撤回成功提示
    tt.showToast({
      title: '撤回成功',
      icon: 'success',
      duration: 1500
    });
    
    // 延迟关闭页面
    setTimeout(() => {
      tt.navigateBack({
        success: function() {
          console.log('[LinkiTap] 撤回成功，返回上一页');
        },
        fail: function() {
          // 如果没有上一页，则跳转到首页
          tt.reLaunch({
            url: '/pages/guide/guide'
          });
        }
      });
    }, 1500);
  },

  // 添加测试按钮（开发环境）
  addTestButtons: function() {
    console.log('[LinkiTap] 添加测试按钮');
    // 这里可以添加测试按钮的逻辑，比如显示测试面板
    tt.showModal({
      title: '测试模式',
      content: '当前场景: ' + this.data.tapType + '\n目标用户: ' + this.data.targetUserName,
      showCancel: false,
      confirmText: '确定'
    });
  },

  // 测试方法：切换场景
  testSwitchScenario: function(e) {
    const scenario = e.currentTarget.dataset.scenario;
    console.log('[LinkiTap] 测试切换场景:', scenario);
    
    let url = '/pages/linkiTap/linkiTap?debug=true';
    
    switch(scenario) {
      case 'self':
        // 自己拍自己
        break;
      case 'received':
        url += '&type=received&targetUser=测试用户';
        break;
      case 'sent':
        url += '&type=sent&targetUser=目标用户';
        break;
    }
    
    tt.redirectTo({
      url: url,
      success: function() {
        console.log('[LinkiTap] 场景切换成功');
      },
      fail: function(error) {
        console.error('[LinkiTap] 场景切换失败:', error);
      }
    });
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: `${this.data.petName}在等你回来 - Linki`,
      path: '/pages/guide/guide?from=share&isShare=true',
      templateId: "3h8i11h04d3g40njx3"
    };
  }
});