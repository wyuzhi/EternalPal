import ModelRenderer from './ModelRenderer';
const app = getApp();

Page({
  // 获取聊天记录
  fetchChatHistory: function() {
    const that = this;
    const petId = this.data.petId;

    if (!petId) {
      console.error('没有宠物ID，无法获取聊天记录');
      return;
    }

    tt.showLoading({
      title: '正在获取聊天记录...',
    });

    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + petId + '/chat_history',
      method: 'GET',
      success: function(res) {
        tt.hideLoading();
        console.log('获取聊天记录结果:', res);

        if (res.data && res.data.status === 'success') {
          // 为历史消息添加validId属性
          const messagesWithValidIds = (res.data.data || []).map(msg => ({
            ...msg,
            validId: that.getValidScrollId(msg.id)
          }));
          
          // 添加时间分隔符
          const messagesWithSeparators = that.addTimeSeparators(messagesWithValidIds);
          
          that.setData({
            messages: messagesWithSeparators
          });
          
          // 延迟执行滚动，确保DOM已经更新
          setTimeout(() => {
            that.scrollToBottom();
          }, 200);
        } else {
          console.error('获取聊天记录失败:', res.data.message || '未知错误');
          tt.showToast({
            title: '获取聊天记录失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        tt.hideLoading();
        console.error('获取聊天记录网络失败:', error);
        tt.showToast({
          title: '网络错误，获取聊天记录失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 生成符合scroll-into-view要求的有效ID
  getValidScrollId: function(originalId) {
    // 将原始ID转换为字符串并移除所有非字母数字字符，只保留允许的特殊字符
    let validId = String(originalId)
      .replace(/[^a-zA-Z0-9-_:.]/g, '_') // 替换所有不允许的字符为下划线
      .replace(/\./g, '_'); // 特别处理小数点，将其替换为下划线
    
    // 确保ID以字母开头
    if (!/^[a-zA-Z]/.test(validId)) {
      validId = 'msg_' + validId; // 使用'msg_'作为前缀确保以字母开头
    }
    
    // 添加时间戳确保唯一性
    const timestamp = Date.now();
    validId = validId + '_' + timestamp;
    
    return validId;
  },

  // 格式化时间戳显示
  formatTimestamp: function(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // 获取今天的开始时间（00:00:00）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    // 获取消息的日期（不包含时间）
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
      // 今天：显示小时分钟
      return messageDate.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (messageDay.getTime() === yesterday.getTime()) {
      // 昨天：显示 "昨天 mm-dd"
      const month = String(messageDate.getMonth() + 1).padStart(2, '0');
      const day = String(messageDate.getDate()).padStart(2, '0');
      return `昨天 ${month}-${day}`;
    } else if (messageDay.getTime() === dayBeforeYesterday.getTime()) {
      // 前天：显示 "前天 mm-dd"
      const month = String(messageDate.getMonth() + 1).padStart(2, '0');
      const day = String(messageDate.getDate()).padStart(2, '0');
      return `前天 ${month}-${day}`;
    } else {
      // 前天之前：显示 "yyyy-mm-dd"
      const year = messageDate.getFullYear();
      const month = String(messageDate.getMonth() + 1).padStart(2, '0');
      const day = String(messageDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  },

  // 判断是否需要显示时间戳
  shouldShowTimestamp: function(currentMessage, previousMessage) {
    if (!currentMessage || !currentMessage.timestamp) return false;
    if (!previousMessage || !previousMessage.timestamp) return true;
    
    const currentTime = new Date(currentMessage.timestamp);
    const previousTime = new Date(previousMessage.timestamp);
    
    // 如果时间差超过5分钟，显示时间戳
    const timeDiff = currentTime.getTime() - previousTime.getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5分钟的毫秒数
    
    return timeDiff > fiveMinutes;
  },

  // 为消息数组添加时间分隔符
  addTimeSeparators: function(messages) {
    if (!messages || messages.length === 0) return [];
    
    // 首先过滤出真正的消息（不是分隔符）
    const realMessages = messages.filter(msg => !msg.isSeparator);
    
    const result = [];
    
    for (let i = 0; i < realMessages.length; i++) {
      const currentMessage = realMessages[i];
      const previousMessage = i > 0 ? realMessages[i - 1] : null;
      
      // 如果需要显示时间戳，先添加时间分隔符
      if (this.shouldShowTimestamp(currentMessage, previousMessage)) {
        result.push({
          id: `time-separator-${currentMessage.timestamp}`,
          type: 'time-separator',
          timestamp: currentMessage.timestamp,
          formattedTimestamp: this.formatTimestamp(currentMessage.timestamp),
          isSeparator: true
        });
      }
      
      // 添加当前消息
      result.push({
        ...currentMessage,
        isSeparator: false
      });
    }
    
    return result;
  },
  data: {
    petName: '',
    petType: '',
    generatedPetImage: '',
    preview_url: '',
    model_url: '',// 模型obj
    material_url: '',// 模型材质
    texture_url: '',// 模型纹理
    petId: '',
    modelLoaded: false, // 默认设置为未加载状态
    // 亲密度系统（TODO: 后端返回对应值）
    intimacyPoints: 0, // 总亲密值
    intimacyLevel: 0, // 亲密等级（由亲密值计算得出）
    intimacyProgress: 0, // 当前等级的进度百分比
    showIntimacyModule: false, // 是否显示亲密度模块
    intimacyModuleClass: '', // 亲密度模块的CSS类
    intimacyIncrement: 0, // 本次增加的亲密值
    showIntimacyIncrement: false, // 是否显示亲密值增加提示
    intimacyIncrementClass: '', // 亲密值增加提示的CSS类
    messages: [],
    inputValue: '',
    isRecording: false,
    modelPlaceholderText: '',
    sceneName: '',
    isImageMode: false, // 默认使用3D模型模式
    firstLoadSuccess: false,
    scrollToMessageId: '',
    showFloatMenu: false, // 控制浮动菜单显示
    menuAnimationClass: '', // 菜单动效类名
    modelStatus: '未知', // 模型状态
    modelMessage: '无', // 模型消息
    rendererInitialized: false, // 渲染器初始化状态
    safeAreaBottom: 0, // 底部安全区域距离
    systemInfo: null, // 系统信息
    keyboardHeight: 0, // 键盘高度（px）
    showUIElements: true, // 是否显示UI元素（快捷话术区和功能区）
    quickReplies: [], // 快捷话术数据
    // 功能区状态
    isMicOn: false, // 麦克风开关状态
    isSpeakerOn: false, // 扬声器开关状态
    isVideoActive: false, // 视频激活状态
    isArActive: false, // AR激活状态
    isTextChatActive: false, // 多聊激活状态
    // 测试模式
    isMockMode: false, // 是否使用模拟模式（默认开启，方便测试）
    // 3D模型控制
    modelRotationEnabled: false, // 3D模型旋转开关（默认关闭）
    // 气泡配置
    bubbleAutoHideTime: 5000, // 气泡自动消失时间/ms
    // 聊天模式状态
    chatMode: false, // 是否处于聊天模式
    showChatHistory: false, // 是否显示聊天历史
    // 当前对话气泡
    currentMessage: '', // 当前显示的消息内容
    bubbleAnimationClass: '', // 气泡动画类名
    // 用户消息显示
    userMessage: '', // 用户发送的消息，显示在输入区域上方
    userMessageAnimationClass: '', // 用户消息动画类名
    // AI回复数据
    aiReplies: [], // AI回复选项，在initQuickReplies中初始化
    // 语音播放相关
    enableVoiceReply: false, // 是否开启语音播放功能
    isPlaying: false, // 是否正在播放语音
    currentAudio: null, // 当前音频对象
    voiceLoadingMessages: [], // 正在生成语音的消息ID集合
    // 模拟聊天数据
    mockConversations: [
      { id: 1, text: "今天天气真不错呢！", isUser: false },
      { id: 2, text: "是啊，很适合出去散步", isUser: true },
      { id: 3, text: "我们一起去公园玩吧~", isUser: false },
      { id: 4, text: "好的，带上你最喜欢的玩具", isUser: true },
      { id: 5, text: "哇！太开心了！", isUser: false },
      { id: 6, text: "你今天心情看起来很好", isUser: true },
      { id: 7, text: "嗯嗯，因为有你陪伴呀~", isUser: false },
      { id: 8, text: "我也很开心能陪着你", isUser: true },
      { id: 9, text: "我们永远是好朋友对吧？", isUser: false },
      { id: 10, text: "当然！永远的好伙伴", isUser: true }
    ]

  },

  // 计算亲密等级和进度
  calculateIntimacyLevel: function(intimacyPoints) {
    // 满级为99级
    const maxLevel = 99;
    // 每100点升一级
    const pointsPerLevel = 100;
    
    // 计算等级（从0级开始）
    const level = Math.min(Math.floor(intimacyPoints / pointsPerLevel), maxLevel);
    
    // 计算当前等级的进度百分比
    let progress = 0;
    if (level < maxLevel) {
      const currentLevelPoints = intimacyPoints % pointsPerLevel;
      progress = (currentLevelPoints / pointsPerLevel) * 100;
    } else {
      // 满级时进度条满格
      progress = 100;
    }
    
    return {
      level: level,
      progress: parseFloat(progress.toFixed(2))
    };
  },

  // 更新亲密度信息
  updateIntimacyInfo: function(newIntimacyPoints) {
    const oldIntimacyPoints = this.data.intimacyPoints;
    const increment = newIntimacyPoints - oldIntimacyPoints;
    
    // 只有在亲密值增加时才显示模块
    if (increment > 0) {
      const intimacyInfo = this.calculateIntimacyLevel(newIntimacyPoints);
      
      this.setData({
        intimacyPoints: newIntimacyPoints,
        intimacyLevel: intimacyInfo.level,
        intimacyProgress: intimacyInfo.progress,
        showIntimacyModule: true,
        intimacyModuleClass: 'show',
        intimacyIncrement: increment,
        showIntimacyIncrement: true,
        intimacyIncrementClass: 'show'
      });
      
      // 1.5秒后开始消失动画
      setTimeout(() => {
        this.setData({
          intimacyIncrementClass: 'hide'
        });
      }, 1500);
      
      // 2秒后完全隐藏（等待动画完成）
      setTimeout(() => {
        this.setData({
          showIntimacyIncrement: false,
          intimacyIncrementClass: ''
        });
      }, 2000);
      
      // 2.5秒后开始整个模块的消失动画
      setTimeout(() => {
        this.setData({
          intimacyModuleClass: 'hide'
        });
      }, 2500);
      
      // 3秒后完全隐藏整个亲密度模块
      setTimeout(() => {
        this.setData({
          showIntimacyModule: false,
          intimacyModuleClass: ''
        });
      }, 3000);
    }
  },

  // 测试亲密度系统（仅供测试使用）
  testIntimacySystem: function() {
    // 模拟亲密值增加
    const currentPoints = this.data.intimacyPoints;
    const increment = Math.floor(Math.random() * 15) + 5; // 假设随机增加5-20点
    const newPoints = currentPoints + increment;
    
    console.log(`测试亲密度系统: ${currentPoints} -> ${newPoints} (+${increment})`);
    
    this.updateIntimacyInfo(newPoints);
  },
  
  // 3D模型渲染器实例
  modelRenderer: null,
  isInitializing3D: false, // 防止重复初始化的标记
  loadedModels: new Map(), // 已加载的3D模型缓存

  // 初始化快捷话术
  initQuickReplies: function() {
    console.log('[Companion] 初始化快捷话术');
    
    // 先设置模拟数据
    const mockReplies = [
      // { id: 1, text: '测试3D功能', isTest: true },
      // { id: 2, text: '测试亲密度', isTest: true },
      // { id: 3, text: '切换模拟模式', isTest: true },
      { id: 5, text: '哈喽，好久不见', isTest: false },
      { id: 6, text: '今天过得怎么样', isTest: false },
      { id: 7, text: '讲个笑话', isTest: false },
      { id: 8, text: '陪我聊聊天', isTest: false },
      { id: 9, text: '吃饭了没', isTest: false },
      { id: 10, text: '我们去散步吧', isTest: false },
      { id: 11, text: '给你买了逗猫棒', isTest: false },
      { id: 12, text: '好想你啊', isTest: false },
      { id: 13, text: '今天好冷', isTest: false }
    ];
    
    // 模拟AI回复数据
    const aiReplies = [
      { text: "你好呀！很高兴见到你~", intimacyIncrement: 5 },
      { text: "今天天气真不错呢！我们一起去散步吧~", intimacyIncrement: 3 },
      { text: "看到你开心我也很开心！让我们一起保持这份快乐吧~", intimacyIncrement: 8 },
      { text: "我也很喜欢和你在一起！你是我最好的朋友~", intimacyIncrement: 10 },
      { text: "我也饿了！我们一起去找好吃的吧~", intimacyIncrement: 4 },
      { text: "那我们休息一下吧！我会陪在你身边的~", intimacyIncrement: 6 },
      { text: "不用谢！能帮到你我很开心~", intimacyIncrement: 7 },
      { text: "再见！记得要经常来看我哦~我会想你的！", intimacyIncrement: 5 },
      { text: "这是个很有趣的问题呢！让我想想...", intimacyIncrement: 3 },
      { text: "真的吗？听起来很有趣呢！", intimacyIncrement: 4 },
      { text: "我也这么想的！", intimacyIncrement: 3 },
      { text: "谢谢你告诉我这些~", intimacyIncrement: 5 },
      { text: "哇，真的吗？", intimacyIncrement: 4 },
      { text: "我很开心能和你聊天！", intimacyIncrement: 6 },
      { text: "这让我想到了一个故事...", intimacyIncrement: 3 },
      { text: "你说得对！", intimacyIncrement: 4 },
      { text: "我学到了新东西！", intimacyIncrement: 5 },
      { text: "让我们一起努力吧~", intimacyIncrement: 6 },
      { text: "嗯嗯，我明白了！", intimacyIncrement: 3 },
      { text: "这真是太棒了！", intimacyIncrement: 7 },
      { text: "我们真是心有灵犀呢~", intimacyIncrement: 8 }
    ];
    
    this.setData({
      quickReplies: mockReplies,
      aiReplies: aiReplies
    });
    
    //TODO: 获取话术数据，AI生成，最多8条
  },

  // 初始化亲密度系统
  initIntimacySystem: function() {
    console.log('[Companion] 初始化亲密度系统');
    
    const that = this;
    const petId = this.data.petId;
    
    if (!petId) {
      console.log('[Companion] 宠物ID为空，使用默认亲密度值');
      const initialIntimacyPoints = 0;
      const intimacyInfo = this.calculateIntimacyLevel(initialIntimacyPoints);
      
      this.setData({
        intimacyPoints: initialIntimacyPoints,
        intimacyLevel: intimacyInfo.level,
        intimacyProgress: intimacyInfo.progress
      });
      return;
    }
    
    // 从后端获取宠物的当前亲密度
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + petId + '/intimacy',
      method: 'GET',
      success: function(res) {
        console.log('[Companion] 获取亲密度结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          const intimacyPoints = res.data.data.intimacy || 0;
          const intimacyInfo = that.calculateIntimacyLevel(intimacyPoints);
          
          that.setData({
            intimacyPoints: intimacyPoints,
            intimacyLevel: intimacyInfo.level,
            intimacyProgress: intimacyInfo.progress
          });
          
          console.log(`[Companion] 亲密度系统初始化完成: ${intimacyPoints}点, ${intimacyInfo.level}级, ${intimacyInfo.progress}%进度`);
        } else {
          console.log('[Companion] 获取亲密度失败，使用默认值');
          const initialIntimacyPoints = 0;
          const intimacyInfo = that.calculateIntimacyLevel(initialIntimacyPoints);
          
          that.setData({
            intimacyPoints: initialIntimacyPoints,
            intimacyLevel: intimacyInfo.level,
            intimacyProgress: intimacyInfo.progress
          });
        }
      },
      fail: function(error) {
        console.error('[Companion] 获取亲密度失败:', error);
        // 失败时使用默认值
        const initialIntimacyPoints = 0;
        const intimacyInfo = that.calculateIntimacyLevel(initialIntimacyPoints);
        
        that.setData({
          intimacyPoints: initialIntimacyPoints,
          intimacyLevel: intimacyInfo.level,
          intimacyProgress: intimacyInfo.progress
        });
      }
    });
  },

  // 更新宠物亲密度到后端
  updatePetIntimacy: function(increment) {
    const that = this;
    const petId = this.data.petId;
    
    if (!petId || increment <= 0) {
      return;
    }
    
    console.log(`[Companion] 更新宠物亲密度: +${increment}`);
    
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + petId + '/intimacy',
      method: 'PUT',
      data: {
        increment: increment
      },
      success: function(res) {
        console.log('[Companion] 更新亲密度结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          const newIntimacy = res.data.data.new_intimacy;
          const actualIncrement = res.data.data.increment;
          
          // 更新前端显示
          that.updateIntimacyInfo(newIntimacy);
          
          console.log(`[Companion] 亲密度更新成功: ${newIntimacy} (+${actualIncrement})`);
        }
      },
      fail: function(error) {
        console.error('[Companion] 更新亲密度失败:', error);
        // 失败时仍然更新前端显示（使用本地计算）
        const currentIntimacy = that.data.intimacyPoints;
        that.updateIntimacyInfo(currentIntimacy + increment);
      }
    });
  },

  // 初始化欢迎消息 TODO：AI去生成开场白
  initWelcomeMessage: function() {
    console.log('[Companion] 初始化欢迎消息');
    
    // 延迟显示欢迎消息，让页面先加载完成
    setTimeout(() => {
      let welcomeMessages;
      
      if (this.data.isMockMode) {
        // 模拟模式的欢迎消息
        welcomeMessages = [
          "嗨！我是模拟宠物，很高兴见到你~",
          "今天过得怎么样呀？我在等你呢！",
          "我一直在等你呢~",
          "想和我聊聊天吗？我会智能回复哦~",
          "有什么新鲜事要分享吗？我在~"
        ];
      } else {
        // 真实模式的欢迎消息
        welcomeMessages = [
          "嗨！很高兴见到你~",
          "今天过得怎么样呀？",
          "我一直在等你呢！",
          "想和我聊聊天吗？",
          "有什么新鲜事要分享吗？"
        ];
      }
      
      const randomWelcome = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      
      this.setData({
        currentMessage: randomWelcome,
        bubbleAnimationClass: ''
      });
      
      // 设置欢迎消息自动消失
      this.setBubbleAutoHide();
      
    }, 1000); // 1秒后显示欢迎消息
  },


  // 获取系统信息
  getSystemInfo: function() {
    const that = this;
    tt.getSystemInfo({
      success: function(res) {
        console.log('[Companion] 获取系统信息成功:', res);
        
        // 计算底部安全区域距离
        let safeAreaBottom = 0;
        if (res.safeArea) {
          // 安全区域底部距离 = 屏幕高度 - 安全区域底部坐标
          safeAreaBottom = res.screenHeight - res.safeArea.bottom;
        }
        
        that.setData({
          systemInfo: res,
          safeAreaBottom: safeAreaBottom
        });
        
        console.log('[Companion] 底部安全区域距离:', safeAreaBottom);
      },
      fail: function(error) {
        console.error('[Companion] 获取系统信息失败:', error);
        // 设置默认值
        that.setData({
          safeAreaBottom: 0
        });
      }
    });
  },

  onLoad: function(options) {
    console.log("[Companion] Welcome to Mini Code");
    console.log('[Companion] 页面加载完成，开始初始化');
    console.log('[Companion] 页面参数:', options);
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 初始化语音设置
    this.initVoiceSettings();
    
    // 初始化快捷话术
    this.initQuickReplies();
    
    // 初始化亲密度系统（设置一些初始值用于演示）
    this.initIntimacySystem();
    
    // 初始化开场白
    this.initWelcomeMessage();
    
    // 从本地存储加载旋转设置
    const savedRotationEnabled = tt.getStorageSync('modelRotationEnabled');
    if (savedRotationEnabled !== undefined && savedRotationEnabled !== null) {
      this.setData({
        modelRotationEnabled: savedRotationEnabled
      });
      console.log('[Companion] 已加载旋转设置:', savedRotationEnabled);
    }
    
    // 从本地存储获取用户信息
    const userInfo = tt.getStorageSync('userInfo') || {};
    const userId = userInfo.id;
    
    // 从参数中获取宠物信息
    if (options) {
      this.setData({
        petName: options.petName || '',
        petType: options.petType || '',
        generatedPetImage: options.generatedPetImage || '',
        // 设置默认占位图片URL，确保即使preview_url为空也能显示图片
        preview_url: options.preview_url || 'images/petTypes/dog.svg',
        model_url: options.model_url || '',
        petId: options.petId || ''
      });
    }
    
    // 如果没有从参数中获取到完整的宠物信息，但有用户ID，则从API查询
    if (userId && (!this.data.petId || !this.data.preview_url)) {
      this.fetchUserPetInfo(userId);
    } else if (this.data.petId && this.data.petId !== 'mock') {
      // 有真实宠物ID，获取聊天记录
      this.fetchChatHistory();
    } else if (!this.data.preview_url) {
      // 如果没有preview_url，设置一个默认值用于演示
      this.setData({
        preview_url: 'images/petTypes/dog.svg',
        petName: '模拟宠物',
        petType: 'dog',
        isImageMode: true,
        modelLoaded: true,
        petId: 'mock' // 设置为mock，确保使用模拟模式
      });
    }
    
  },
  
  // 从API查询用户的宠物信息
  fetchUserPetInfo: function(userId) {
    const that = this;
    
    tt.showLoading({
      title: '正在获取Linki信息...',
    });
    
    // 调用后端API获取用户的最新宠物信息
    tt.request({
      url: app.globalData.API_BASE_URL + '/users/' + userId + '/latest_pet',
      method: 'GET',
      success: function(res) {
        tt.hideLoading();
        console.log('获取用户最新宠物信息结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          const petInfo = res.data.data;
          
          // 更新宠物信息
          that.setData({
            petName: petInfo.name,
            petType: petInfo.type,
            generatedPetImage: petInfo.generated_image || '',
            // 设置默认占位图片URL，确保即使preview_url为空也能显示图片
            preview_url: petInfo.preview_url || '/images/dog.png',
            model_url: petInfo.model_url || '',// 模型obj
            material_url: petInfo.material_url || '',// 模型材质
            texture_url: petInfo.texture_url || '',// 模型纹理
            petId: petInfo.id,
            isImageMode: false,
            modelPlaceholderText: '正在加载3D模型...',
            firstLoadSuccess: true
          });
          
          // 保存宠物信息到本地存储
          tt.setStorageSync('currentPet', petInfo);
          
          // 宠物信息获取完成后，检查是否需要初始化3D渲染器
          console.log('[Companion] 宠物信息获取完成，检查3D渲染器初始化状态');
          
          // 如果页面已经ready且还没有初始化3D渲染器，则立即初始化
          if (that.pageReady && petInfo.id && petInfo.id !== 'mock' && !that.modelRenderer) {
            console.log('[Companion] 页面已ready，立即初始化3D渲染器');
            that.init3DRenderer();
          } else if (!that.pageReady) {
            console.log('[Companion] 页面尚未ready，将在onReady中初始化3D渲染器');
          } else if (that.modelRenderer) {
            console.log('[Companion] 3D渲染器已存在，跳过初始化');
          }
          
          // 获取聊天记录
          that.fetchChatHistory();
        } else {
          // 没有获取到宠物信息
          console.log('未获取到宠物信息');
          tt.showToast({
            title: '获取Linki信息失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        tt.hideLoading();
        console.error('获取用户最新宠物信息失败:', error);
        tt.showToast({
          title: '网络错误，获取失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 初始化3D渲染器
  init3DRenderer: function() {
    console.log('[Companion] 开始初始化3D渲染器');
    const that = this;
    
    // 检查是否在宠物模式
    if (this.data.chatMode) {
      console.log('[Companion] 当前在聊天模式，跳过3D渲染器初始化');
      return;
    }
    
    try {
      // 防止重复初始化
      if (this.modelRenderer) {
        console.log('[Companion] ModelRenderer已存在，先销毁');
        try {
          // 先尝试停止动画循环
          if (this.modelRenderer.stopAnimation && typeof this.modelRenderer.stopAnimation === 'function') {
            this.modelRenderer.stopAnimation();
          }
          
          // 然后安全地销毁渲染器
          if (this.modelRenderer.dispose && typeof this.modelRenderer.dispose === 'function') {
            this.modelRenderer.dispose();
          }
        } catch (error) {
          console.warn('[Companion] 销毁渲染器时出现警告:', error);
          // 忽略Three.js的cancelAnimationFrame警告，这是已知的兼容性问题
          if (!error.message || !error.message.includes('cancelAnimationFrame')) {
            console.error('[Companion] 销毁渲染器时出现严重错误:', error);
          }
        } finally {
          this.modelRenderer = null;
        }
      }
      
      // 添加初始化标记，防止并发初始化
      if (this.isInitializing3D) {
        console.log('[Companion] 3D渲染器正在初始化中，跳过重复调用');
        return;
      }
      this.isInitializing3D = true;
      
      // 创建ModelRenderer实例
      console.log('[Companion] 开始创建ModelRenderer实例');
      this.modelRenderer = new ModelRenderer();
      
      // 延迟初始化，避免canvas未准备好
      console.log('[Companion] 设置延迟初始化，等待canvas准备');
      setTimeout(() => {
        // 检查canvas是否存在
        const query = tt.createSelectorQuery();
        query.select('#modelCanvas').boundingClientRect((rect) => {
          if (rect) {
            console.log('[Companion] Canvas元素已准备就绪:', rect);
            console.log('[Companion] 开始初始化ModelRenderer，canvas ID: modelCanvas');
            this.modelRenderer.init('modelCanvas').then((success) => {
          console.log('[Companion] ModelRenderer初始化结果:', success);
          if (success) {
            console.log('[Companion] 3D渲染器初始化成功');
            
            // 更新渲染器状态
            that.setData({
              rendererInitialized: true,
              modelStatus: '渲染器已初始化',
              modelMessage: '等待加载模型'
            });
            
            // 先加载模型，然后在模型加载成功后启动动画
            // 如果有模型URL，立即加载模型
            if (that.data.model_url) {
              console.log('[Companion] 使用指定模型URL:', that.data.model_url);
              const defaultModelUrl = "https://lf3-developer.bytemastatic.com/obj/developer/misc/AI_AR_demo/logo.obj";

              that.load3DModel(that.data.model_url);
            } else {
              // 加载默认测试模型
              const defaultModelUrl = "https://lf3-developer.bytemastatic.com/obj/developer/misc/AI_AR_demo/logo.obj";
              console.log('[Companion] 使用默认测试模型:', defaultModelUrl);
              that.load3DModel(defaultModelUrl);
            }
            
            // 清除初始化标记
            that.isInitializing3D = false;
          } else {
            console.error('[Companion] 3D渲染器初始化失败');
            that.setData({
              modelLoaded: false,
              modelPlaceholderText: '3D渲染器初始化失败，请重试',
              rendererInitialized: false,
              modelStatus: '初始化失败',
              modelMessage: '渲染器创建失败'
            });
            
            // 清除初始化标记
            that.isInitializing3D = false;
          }
        }).catch((error) => {
          console.error('[Companion] 3D渲染器初始化异常:', error);
          that.setData({
            modelLoaded: false,
            modelPlaceholderText: '3D渲染器初始化异常: ' + error.message
          });
          
          // 清除初始化标记
          that.isInitializing3D = false;
        });
          } else {
            console.error('[Companion] Canvas元素不存在或不可见');
            that.setData({
              modelLoaded: false,
              modelPlaceholderText: 'Canvas元素不可用'
            });
            
            // 清除初始化标记
            that.isInitializing3D = false;
          }
        }).exec();
      }, 500);
    } catch (error) {
      console.error('[Companion] 创建ModelRenderer实例失败:', error);
      this.setData({
        modelLoaded: false,
        modelPlaceholderText: '无法创建3D渲染器: ' + error.message
      });
      
      // 清除初始化标记
      this.isInitializing3D = false;
    }
  },
  
  // 加载3D模型
  /*
  // 模型文件缓存
  modelCache: new Map(),
  
  // 网络状态检测
  checkNetworkStatus: function() {
    return new Promise((resolve) => {
      tt.getNetworkType({
        success: (res) => {
          const networkType = res.networkType;
          console.log('[Companion] 网络类型:', networkType);
          
          // 判断网络质量
          let quality = 'good';
          if (networkType === 'none') {
            quality = 'none';
          } else if (networkType === '2g') {
            quality = 'poor';
          } else if (networkType === '3g') {
            quality = 'fair';
          } else if (networkType === '4g' || networkType === '5g' || networkType === 'wifi') {
            quality = 'good';
          }
          
          resolve({ networkType, quality });
        },
        fail: () => {
          console.warn('[Companion] 获取网络状态失败，假设网络良好');
          resolve({ networkType: 'unknown', quality: 'good' });
        }
      });
    });
  },
  
  // 预加载模型文件（并行加载）
  preloadModelFiles: function(modelUrl, materialUrl, textureUrl) {
    const that = this;
    const cacheKey = `${modelUrl}_${materialUrl || ''}_${textureUrl || ''}`;
    
    // 检查缓存
    if (this.modelCache.has(cacheKey)) {
      console.log('[Companion] 模型文件已缓存，跳过预加载');
      return Promise.resolve(this.modelCache.get(cacheKey));
    }
    
    console.log('[Companion] 开始并行预加载模型文件');
    const promises = [];
    const fileTypes = [];
    
    // 预加载OBJ文件
    if (modelUrl) {
      fileTypes.push('obj');
      promises.push(
        new Promise((resolve) => {
          tt.request({
            url: modelUrl,
            method: 'GET',
            success: (res) => {
               if (res.statusCode === 200) {
                 console.log('[Companion] OBJ模型文件下载完成');
                 resolve({ type: 'obj', url: modelUrl, data: res.data });
               } else {
                 console.warn('[Companion] OBJ文件预加载失败: HTTP', res.statusCode);
                 resolve(null);
               }
             },
             fail: (error) => {
               console.warn('[Companion] OBJ文件预加载失败:', error);
               resolve(null);
             }
          });
        })
      );
    }
    
    // 预加载材质文件
    if (materialUrl) {
      fileTypes.push('mtl');
      promises.push(
        new Promise((resolve) => {
          tt.request({
            url: materialUrl,
            method: 'GET',
            success: (res) => {
               if (res.statusCode === 200) {
                 console.log('[Companion] 材质文件下载完成');
                 resolve({ type: 'mtl', url: materialUrl, data: res.data });
               } else {
                 console.warn('[Companion] 材质文件预加载失败: HTTP', res.statusCode);
                 resolve(null);
               }
             },
             fail: (error) => {
               console.warn('[Companion] 材质文件预加载失败:', error);
               resolve(null);
             }
          });
        })
      );
    }
    
    // 纹理文件由ModelRenderer自己处理，这里跳过预加载
    if (textureUrl) {
      console.log('[Companion] 纹理文件将由ModelRenderer处理:', textureUrl);
    }
    
    console.log('[Companion] 并行加载文件类型:', fileTypes);
    
    return Promise.all(promises).then(results => {
      const cache = {};
      let successCount = 0;
      
      results.forEach(result => {
        if (result) {
          cache[result.type] = result;
          successCount++;
        }
      });
      
      // 缓存结果
      this.modelCache.set(cacheKey, cache);
      console.log(`[Companion] 模型文件预加载完成，成功: ${successCount}/${promises.length}`);
      
      return cache;
    });
  },
  */

  load3DModel: function(modelUrl) {
    console.log('[Companion] 开始加载3D模型，URL:', modelUrl);
    const that = this;
    
    if (!this.modelRenderer) {
      console.error('[Companion] ModelRenderer未初始化，无法加载模型');
      return;
    }
    
    // 检查是否已经加载过这个模型
    const modelKey = `${modelUrl}_${this.data.material_url || ''}_${this.data.texture_url || ''}`;
    if (this.loadedModels.has(modelKey)) {
      console.log('[Companion] 模型已缓存，直接使用');
      const cachedModel = this.loadedModels.get(modelKey);
      
      // 直接使用缓存的模型
      if (this.modelRenderer.model) {
        this.modelRenderer.scene.remove(this.modelRenderer.model);
      }
      this.modelRenderer.model = cachedModel.clone();
      this.modelRenderer.scene.add(this.modelRenderer.model);
      
      // 启动动画循环
      that.modelRenderer.setRotationEnabled(that.data.modelRotationEnabled);
      that.modelRenderer.startAnimation();
      
      that.setData({
        modelLoaded: true,
        modelPlaceholderText: '',
        isImageMode: false,
        firstLoadSuccess: true,
        modelStatus: '加载成功'
      });
      return;
    }
    
    // 初始化加载状态
    console.log('[Companion] 设置加载状态');
    that.setData({
      modelPlaceholderText: '小主莫急，我的3d形象正在飞速赶来',
      modelStatus: '加载中'
    });
    
    console.log('[Companion] 调用ModelRenderer.loadOBJModel');
    this.modelRenderer.loadOBJModel(modelUrl, this.data.material_url, this.data.texture_url).then((model) => {
      console.log('[Companion] 3D模型加载成功');
      
      // 缓存加载的模型
      that.loadedModels.set(modelKey, model.clone());
      console.log('[Companion] 模型已缓存，下次加载将更快');
      
      // 模型加载成功后启动动画循环
      console.log('[Companion] 启动动画循环');
      // 设置旋转状态
      that.modelRenderer.setRotationEnabled(that.data.modelRotationEnabled);
      that.modelRenderer.startAnimation();
      
      that.setData({
        modelLoaded: true,
        modelPlaceholderText: '',
        isImageMode: false,
        firstLoadSuccess: true,
        modelStatus: '加载成功'
      });
    }).catch((error) => {
      console.error('[Companion] 加载3D模型异常:', error);
      
      that.setData({
        modelLoaded: false,
        modelPlaceholderText: '加载3D模型失败: ' + error.message,
        isImageMode: false,
        modelStatus: '加载失败'
      });
    });
  },
  
  onReady: function() {
    console.log('[Companion] 页面渲染完成，onReady被调用');
    
    // 标记页面已经ready
    this.pageReady = true;
    
    // 页面渲染完成后滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 500);
    
    // 如果有真实宠物ID且未初始化3D渲染器，则立即初始化
    if (this.data.petId && this.data.petId !== 'mock' && !this.modelRenderer) {
      console.log('[Companion] onReady中检测到需要初始化3D渲染器');
      this.init3DRenderer();
    } else {
      console.log('[Companion] onReady中跳过3D渲染器初始化，petId:', this.data.petId, 'modelRenderer存在:', !!this.modelRenderer);
    }
  },
  
  onShow: function() {
    console.log('[Companion] 页面显示，onShow被调用');
    
    // 重新初始化语音设置，确保从设置页面返回时能读取最新设置
    this.initVoiceSettings();
    
    // 检查是否有宠物信息更新
    const updatedPet = tt.getStorageSync('currentPet') || {};
    if (updatedPet.id && updatedPet.id === this.data.petId) {
      const hasModelUrlChanged = updatedPet.model_url && updatedPet.model_url !== this.data.model_url;
      
      this.setData({
        petName: updatedPet.name,
        petType: updatedPet.type,
        generatedPetImage: updatedPet.generated_image || '',
        preview_url: updatedPet.preview_url || '',
        model_url: updatedPet.model_url || ''
      });
      
      // 如果模型URL发生变化，重新加载模型
      if (hasModelUrlChanged && this.modelRenderer) {
        this.load3DModel(updatedPet.model_url);
      }
    }
  },
  
  // 页面卸载时销毁3D渲染器
  onUnload: function() {
    console.log('[Companion] 页面卸载，清理资源');
    
    // 停止并清理语音播放
    this.stopCurrentAudio();
    
    if (this.modelRenderer) {
      console.log('[Companion] 销毁ModelRenderer实例');
      this.modelRenderer.dispose();
      this.modelRenderer = null;
    }
    
    // 清理气泡消失定时器
    if (this.bubbleHideTimer) {
      clearTimeout(this.bubbleHideTimer);
      this.bubbleHideTimer = null;
    }
    
    // 清理用户消息消失定时器
    if (this.userMessageHideTimer) {
      clearTimeout(this.userMessageHideTimer);
      this.userMessageHideTimer = null;
    }
    
    // 清理延迟显示定时器
    if (this.delayShowTimer) {
      clearTimeout(this.delayShowTimer);
      this.delayShowTimer = null;
    }
    
    // 注意：这里不清理模型缓存，让缓存在应用生命周期内保持
    // 这样切换聊天模式或重新进入页面时可以快速加载
    // 如果需要释放内存，可以取消注释下面的代码：
    // this.loadedModels.clear();
    // console.log('[Companion] 模型缓存已清理');
  },
  
  // 测试3D模型渲染功能
  testModelRendering: function() {
    console.log('[Companion] 测试3D模型渲染功能');
    
    // 检查canvas元素
    const query = tt.createSelectorQuery();
    query.select('#modelCanvas').boundingClientRect((rect) => {
      if (rect) {
        console.log('[Companion] Canvas元素信息:', rect);
      } else {
        console.error('[Companion] 无法找到Canvas元素');
      }
    }).exec();
    
    if (!this.modelRenderer) {
      console.log('[Companion] 渲染器未初始化，开始初始化');
      this.init3DRenderer();
      return;
    }
    
    if (!this.modelRenderer.isInitialized) {
      console.log('[Companion] 渲染器未完成初始化');
      return;
    }
    
    // 强制渲染当前场景
    if (this.modelRenderer.renderer && this.modelRenderer.scene && this.modelRenderer.camera) {
      console.log('[Companion] 强制渲染当前场景');
      this.modelRenderer.renderer.render(this.modelRenderer.scene, this.modelRenderer.camera);
    }
    
    try {
      console.log('[Companion] 开始测试3D模型渲染功能');
      
      // 测试加载默认模型
      const testModelUrl = "https://lf3-developer.bytemastatic.com/obj/developer/misc/AI_AR_demo/logo.obj";
      console.log('[Companion] 使用测试模型URL:', testModelUrl);
      
      this.setData({
        modelLoaded: false,
        modelPlaceholderText: '正在测试加载模型...',
        isImageMode: false
      });
      
      this.load3DModel(testModelUrl);
      
      console.log('[Companion] 3D模型渲染功能测试启动');
      
      tt.showToast({
        title: '正在测试3D功能',
        icon: 'loading',
        duration: 2000
      });
      
      return true;
    } catch (error) {
      console.error('[Companion] 3D模型渲染测试失败:', error);
      tt.showToast({
        title: '测试失败: ' + error.message,
        icon: 'none'
      });
      return false;
    }
   },
   
   // 页面隐藏时停止旋转
  onHide: function() {
    console.log('[Companion] 页面隐藏，停止动画');
    if (this.modelRenderer) {
      this.modelRenderer.stopAnimation();
    }
  },
  
  // 页面重新显示时继续旋转
  onBackShow: function() {
    console.log('[Companion] 页面重新显示，继续动画');
    if (this.modelRenderer) {
      this.modelRenderer.setRotationEnabled(this.data.modelRotationEnabled);
      this.modelRenderer.startAnimation();
    }
  },
  
  // 切换3D模型旋转
  toggleModelRotation: function() {
    const newRotationState = !this.data.modelRotationEnabled;
    this.setData({
      modelRotationEnabled: newRotationState
    });
    
    if (this.modelRenderer) {
      this.modelRenderer.setRotationEnabled(newRotationState);
    }
    
    // 保存设置到本地存储
    tt.setStorageSync('modelRotationEnabled', newRotationState);
    
    const statusText = newRotationState ? '开启' : '关闭';
    console.log(`[Companion] 3D模型旋转已${statusText}`);
    
    // tt.showToast({
    //   title: `模型旋转已${statusText}`,
    //   icon: 'none',
    //   duration: 1500
    // });
  },
    
  // 输入框内容变化
  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 输入框聚焦事件
  onInputFocus: function(e) {
    const keyboardHeight = e.detail.height || 0;
    console.log('[Companion] 输入框聚焦，键盘高度:', keyboardHeight);
    console.log('[Companion] 系统信息:', this.data.systemInfo);
    
    // 清除延迟显示定时器（如果存在）
    if (this.delayShowTimer) {
      clearTimeout(this.delayShowTimer);
      this.delayShowTimer = null;
    }
    
    // 获取系统信息来判断是否为iOS设备
    const systemInfo = this.data.systemInfo;
    let adjustedKeyboardHeight = keyboardHeight;
    
    if (systemInfo && systemInfo.platform === 'ios') {
      // iOS设备上，键盘高度通常已经包含了安全区域
      // 但我们需要确保输入框紧贴键盘顶部
      console.log('[Companion] iOS设备，使用原始键盘高度:', keyboardHeight);
    } else {
      // Android设备或其他平台
      console.log('[Companion] 非iOS设备，键盘高度:', keyboardHeight);
    }
    
    // 立即隐藏UI元素
    this.setData({
      keyboardHeight: adjustedKeyboardHeight,
      showUIElements: false
    });
  },

  // 输入框失焦事件
  onInputBlur: function(e) {
    console.log('[Companion] 输入框失焦，键盘高度:', e.detail.height);
    
    // 立即重置键盘高度
    this.setData({
      keyboardHeight: 0
    });
    
    // 延迟显示UI元素，避免与键盘收起动画冲突
    this.delayShowTimer = setTimeout(() => {
      console.log('[Companion] 延迟显示UI元素');
      this.setData({
        showUIElements: true
      });
    }, 200);
  },
  
  // 滚动到底部方法 - 使用scroll-into-view方式
  scrollToBottom: function() {
    console.log('开始执行滚动到底部操作');
    const messages = this.data.messages;
    
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const validScrollId = `message-${latestMessage.validId || this.getValidScrollId(latestMessage.id)}`;
      console.log('尝试滚动到最新消息，ID:', validScrollId, '消息内容:', latestMessage.text);
      
      // 先清空scroll-into-view属性，确保下次设置能触发滚动
      this.setData({
        scrollToMessageId: ''
      });
      
      // 延迟设置scroll-into-view属性，确保DOM已更新
      setTimeout(() => {
        this.setData({
          scrollToMessageId: validScrollId
        });
        console.log('已设置scrollToMessageId:', validScrollId);
      }, 50);
    } else {
      console.log('没有消息，跳过滚动操作');
    }
  },
  
  // 滚动到指定消息ID
  scrollToMessage: function(messageId) {
    if (messageId) {
      console.log('滚动到指定消息，ID:', messageId);
      const validScrollId = `message-${this.getValidScrollId(messageId)}`;
      this.setData({
        scrollToMessageId: validScrollId
      });
    }
  },
  
  // 发送消息
  sendMessage: function() {
    const that = this;
    const message = this.data.inputValue.trim();
    
    if (!message) {
      tt.showToast({
        title: '消息不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 只有在非模拟模式下才检查petId
    if (!this.data.isMockMode && !this.data.petId) {
      tt.showToast({
        title: '请先创建或选择宠物',
        icon: 'none'
      });
      return;
    }
    
    // 清空输入框
    this.setData({
      inputValue: ''
    });
    
    // 根据模式显示用户消息
    if (this.data.chatMode) {
      // 聊天模式：不显示用户消息在输入区域上方
      this.setData({
        userMessage: ''
      });
    } else {
      // 宠物模式：显示用户消息在输入区域上方
      this.setData({
        userMessage: message,
        userMessageAnimationClass: ''
      });
    }
    
    // 不立即设置用户消息自动消失，等待AI回复后再消失
    
    // 添加用户消息到历史记录
    const userId = Date.now();
    const currentTimestamp = new Date().getTime();
    
    const newUserMessage = {
      id: userId,
      validId: this.getValidScrollId(userId),
      text: message,
      isUser: true,
      timestamp: currentTimestamp
    };
    
    // 将新消息添加到现有消息数组，然后重新添加时间分隔符
    const updatedMessages = this.data.messages.concat(newUserMessage);
    const messagesWithSeparators = this.addTimeSeparators(updatedMessages);
    
    this.setData({
      messages: messagesWithSeparators
    });
    
    // 用户消息显示后立即滚动到最新消息
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
    
    // 检查是否使用模拟模式
    const useMockMode = this.data.isMockMode || !this.data.petId || this.data.petId === 'mock';
    
    if (useMockMode) {
      // 模拟模式：使用本地模拟数据
      console.log('[Companion] 使用模拟模式发送消息');
      this.sendMockMessage(message);
    } else {
      // 真实模式：调用后端API
      console.log('[Companion] 使用真实API发送消息');
      tt.request({
        url: app.globalData.API_BASE_URL + '/pets/' + this.data.petId + '/chat',
        method: 'POST',
        data: {
          message: message,
          user_id: tt.getStorageSync('userInfo').id || 99 // 默认使用测试用户ID
        },
        success: function(res) {
          console.log('发送消息结果:', res);
          
           if (res.data && res.data.status === 'success' && res.data.data) {
             const aiMessage = res.data.data;
             
             // 根据模式处理AI回复显示
             if (that.data.chatMode) {
               // 聊天模式：不显示气泡，AI回复已在消息历史中
               that.setData({
                 userMessage: '',
                 userMessageAnimationClass: '',
                 currentMessage: ''
               });
             } else {
               // 宠物模式：清除用户消息显示，更新气泡显示AI回复
               that.setData({
                 userMessage: '', // 清除用户消息显示
                 userMessageAnimationClass: '', // 重置用户消息动画状态
                 currentMessage: aiMessage.content || aiMessage.text,
                 bubbleAnimationClass: ''
               });
               
               // 设置气泡自动消失
               that.setBubbleAutoHide();
             }
             
             // 更新消息历史记录
             const aiMessageId = aiMessage.id || Date.now() + 1;
             const aiTimestamp = new Date().getTime();
             
             const newAiMessage = {
               id: aiMessageId,
               validId: that.getValidScrollId(aiMessageId),
               text: aiMessage.content || aiMessage.text,
               isUser: false,
               timestamp: aiTimestamp
             };
             
             // 将新消息添加到现有消息数组，然后重新添加时间分隔符
             const updatedMessages = that.data.messages.concat(newAiMessage);
             const messagesWithSeparators = that.addTimeSeparators(updatedMessages);
             
             that.setData({
               messages: messagesWithSeparators
             });
             
             // 处理亲密值更新
             if (aiMessage.intimacy_points !== undefined) {
               // 使用后端返回的亲密度值直接更新显示
               that.updateIntimacyInfo(aiMessage.intimacy_points);
               
               // 显示亲密度增加提示
               if (aiMessage.intimacy_increment > 0) {
                 console.log(`[Companion] 亲密度增加: +${aiMessage.intimacy_increment}, 当前: ${aiMessage.intimacy_points}`);
               }
             } else {
               // 如果AI回复没有返回亲密度，使用API更新
               that.updatePetIntimacy(3);
             }
             
             // 如果开启了语音播放，自动播放AI回复
             if (that.data.enableVoiceReply) {
               that.playAIReplyVoice(aiMessage.content || aiMessage.text, aiMessageId);
             }
             
             // 聊天模式下延迟执行滚动，确保DOM已经更新
             if (that.data.chatMode) {
               setTimeout(() => {
                 that.scrollToBottom();
               }, 150);
             }
          } else {
            console.error('AI回复失败:', res.data.message || '未知错误');
            tt.showToast({
              title: 'AI回复失败',
              icon: 'none'
            });
            
            // AI回复失败时，设置用户消息自动消失
            that.setUserMessageAutoHide();
          }
        },
        fail: function(error) {
          console.error('发送消息网络失败:', error);
          tt.showToast({
            title: '网络错误，发送失败',
            icon: 'none'
          });
          
          // 网络失败时显示默认回复
          that.setData({
            currentMessage: "抱歉，网络连接出现问题，请稍后再试~",
            bubbleAnimationClass: ''
          });
          
          // 设置气泡自动消失
          that.setBubbleAutoHide();
          
          // 设置用户消息自动消失（因为AI没有回复）
          that.setUserMessageAutoHide();
        }
      });
    }
  },

  // 模拟消息发送（用于测试验证）
  sendMockMessage: function(message) {
    const that = this;
    
    // 模拟网络延迟
    setTimeout(() => {
      // 根据用户消息内容生成回复
      const mockReply = this.generateMockReply(message);
      
      // 根据模式处理AI回复显示
      if (that.data.chatMode) {
        // 聊天模式：不显示气泡，AI回复已在消息历史中
        that.setData({
          userMessage: '',
          userMessageAnimationClass: '',
          currentMessage: ''
        });
      } else {
        // 宠物模式：清除用户消息显示，更新气泡显示AI回复
        that.setData({
          userMessage: '', // 清除用户消息显示
          userMessageAnimationClass: '', // 重置用户消息动画状态
          currentMessage: mockReply.text,
          bubbleAnimationClass: ''
        });
        
        // 设置气泡自动消失
        that.setBubbleAutoHide();
      }
      
      // 更新消息历史记录
      const aiMessageId = Date.now() + 1;
      const aiTimestamp = new Date().getTime();
      
      const newAiMessage = {
        id: aiMessageId,
        validId: this.getValidScrollId(aiMessageId),
        text: mockReply.text,
        isUser: false,
        timestamp: aiTimestamp
      };
      
      // 将新消息添加到现有消息数组，然后重新添加时间分隔符
      const updatedMessages = this.data.messages.concat(newAiMessage);
      const messagesWithSeparators = this.addTimeSeparators(updatedMessages);
      
      this.setData({
        messages: messagesWithSeparators
      });
      
      // 模拟亲密度增加
      if (mockReply.intimacyIncrement > 0) {
        // 在模拟模式下，直接更新本地显示
        const currentIntimacy = this.data.intimacyPoints;
        this.updateIntimacyInfo(currentIntimacy + mockReply.intimacyIncrement);
      }
      
      // 如果开启了语音播放，自动播放模拟AI回复
      if (that.data.enableVoiceReply) {
        that.playAIReplyVoice(mockReply.text, aiMessageId);
      }
      
      // 聊天模式下延迟执行滚动，确保DOM已经更新
      if (that.data.chatMode) {
        setTimeout(() => {
          that.scrollToBottom();
        }, 150);
      }
      
    }, 1000 + Math.random() * 1000); // 1-2秒的随机延迟，模拟真实网络请求
  },

  // 生成模拟回复
  generateMockReply: function(userMessage) {
    // 从模拟aiReplies中随机选择回复
    const aiReplies = this.data.aiReplies || [];
    const randomReply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
    
    return randomReply || {
      text: "嗯嗯，我明白了！",
      intimacyIncrement: 3
    };
  },

  // 设置气泡自动消失
  setBubbleAutoHide: function() {
    const that = this;
    
    // 清除之前的定时器
    if (this.bubbleHideTimer) {
      clearTimeout(this.bubbleHideTimer);
    }
    
    // 设置新的定时器，根据配置时间自动消失
    this.bubbleHideTimer = setTimeout(() => {
      // 先添加消失动画类
      that.setData({
        bubbleAnimationClass: 'hide'
      });
      
      // 等待动画完成后清空消息
      setTimeout(() => {
        that.setData({
          currentMessage: '',
          bubbleAnimationClass: ''
        });
        console.log('[Companion] 气泡自动消失');
      }, 300); // 与CSS动画时间保持一致
    }, this.data.bubbleAutoHideTime);
  },

  // 设置用户消息自动消失
  setUserMessageAutoHide: function() {
    const that = this;
    
    // 清除之前的定时器
    if (this.userMessageHideTimer) {
      clearTimeout(this.userMessageHideTimer);
    }
    
    // 设置新的定时器，用户消息显示时间较短
    this.userMessageHideTimer = setTimeout(() => {
      // 先添加消失动画类
      that.setData({
        userMessageAnimationClass: 'hide'
      });
      
      // 等待动画完成后清空消息
      setTimeout(() => {
        that.setData({
          userMessage: '',
          userMessageAnimationClass: ''
        });
        console.log('[Companion] 用户消息自动消失');
      }, 300); // 与CSS动画时间保持一致
    }, 2000); // 用户消息显示2秒后消失
  },

  // 切换模拟模式
  toggleMockMode: function() {
    const newMockMode = !this.data.isMockMode;
    this.setData({
      isMockMode: newMockMode
    });
    
    const modeText = newMockMode ? '模拟模式' : '真实API模式';
    tt.showToast({
      title: `已切换到${modeText}`,
      icon: 'none',
      duration: 2000
    });
    
    console.log(`[Companion] 切换到${modeText}`);
  },


  // 使用快捷回复
  useQuickReply: function(e) {
    const text = e.currentTarget.dataset.text;
    
    // 根据按钮文本执行不同的测试功能
    if (text === '测试亲密度') {
      this.testIntimacySystem();
      return;
    }
    
    if (text === '测试3D功能') {
      this.testModelRendering();
      return;
    }
    
    if (text === '切换模拟模式') {
      this.toggleMockMode();
      return;
    }
    
    // 普通聊天消息
    this.setData({
      inputValue: text
    });
    this.sendMessage();
  },
  
  // 拍照功能
  takePhoto: function() {
    tt.chooseImage({
      count: 1,
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0];
        console.log('拍照成功:', tempFilePath);
        // 这里可以添加图片处理逻辑
      },
      fail: function(error) {
        console.error('拍照失败:', error);
        tt.showToast({
          title: '拍照失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 开始录音
  startRecording: function() {
    const that = this;
    
    tt.startRecord({
      success: function() {
        console.log('开始录音');
        that.setData({
          isRecording: true
        });
      },
      fail: function(error) {
        console.error('开始录音失败:', error);
        tt.showToast({
          title: '开始录音失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 停止录音
  stopRecording: function() {
    const that = this;
    
    tt.stopRecord({
      success: function(res) {
        console.log('停止录音:', res.tempFilePath);
        that.setData({
          isRecording: false
        });
        
        // 这里可以添加语音识别和发送逻辑
      },
      fail: function(error) {
        console.error('停止录音失败:', error);
        that.setData({
          isRecording: false
        });
        tt.showToast({
          title: '停止录音失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 重置模型显示
  resetModel: function() {
    console.log('[Companion] 开始重置模型');
    
    if (this.modelRenderer) {
      console.log('[Companion] 销毁现有ModelRenderer');
      this.modelRenderer.dispose(); // 使用dispose而不是destroy
      this.modelRenderer = null;
    }
    
    // 重置初始化标记
    this.isInitializing3D = false;
    
    this.setData({
      isImageMode: false,
      modelLoaded: false,
      modelPlaceholderText: '重新加载模型...'
    });
    
    // 重新初始化3D渲染器
    if (this.data.petId) {
      console.log('[Companion] 准备重新初始化3D渲染器');
      setTimeout(() => {
        this.init3DRenderer();
      }, 100);
    }
  },

  // 点击设置图标
  onSettingsTap: function() {
    const showMenu = !this.data.showFloatMenu;
    
    if (showMenu) {
      // 显示菜单
      this.setData({
        showFloatMenu: true,
        menuAnimationClass: 'show'
      });
    } else {
      // 隐藏菜单
      this.hideMenu();
    }
  },

  // 点击遮罩层关闭菜单
  onMenuMaskTap: function() {
    this.hideMenu();
  },

  // 隐藏菜单的通用方法
  hideMenu: function() {
    this.setData({
      menuAnimationClass: 'hide'
    });
    
    // 等待动画完成后隐藏菜单
    setTimeout(() => {
      this.setData({
        showFloatMenu: false,
        menuAnimationClass: ''
      });
    }, 200); // 与CSS动画时间保持一致
  },

  // 菜单项点击事件
  onMenuItemTap: function(e) {
    const { action } = e.currentTarget.dataset;
    console.log('点击了菜单项:', action);
    
    // 根据action执行不同操作
    switch(action) {
      case 'info':
        // 跳转到宠物档案页面
        this.navigateToPetProfile();
        break;
      case 'settings':
        // 跳转到设置页面
        tt.navigateTo({
          url: '/pages/settings/settings'
        });
        break;
      case 'share':
        // 分享功能由onShareAppMessage方法处理
        tt.showToast({ title: '请使用右上角分享按钮', icon: 'none' });
        break;
    }
    
    // 关闭菜单
    this.hideMenu();
  },

  // 跳转到宠物档案页面
  navigateToPetProfile: function() {
    console.log('[Companion] 跳转到宠物档案页面');
    
    // 准备传递给宠物档案页面的参数(示例)
    const petInfo = {
      petName: this.data.petName,
      petType: this.data.petType,
      petId: this.data.petId,
      preview_url: this.data.preview_url,
      generatedPetImage: this.data.generatedPetImage,
      intimacyPoints: this.data.intimacyPoints,
      intimacyLevel: this.data.intimacyLevel
    };
    
    // 构建跳转URL
    const url = `/pages/petProfile/petProfile?petName=${encodeURIComponent(petInfo.petName)}&petType=${encodeURIComponent(petInfo.petType)}&petId=${encodeURIComponent(petInfo.petId)}&preview_url=${encodeURIComponent(petInfo.preview_url)}&generatedPetImage=${encodeURIComponent(petInfo.generatedPetImage)}&intimacyPoints=${petInfo.intimacyPoints}&intimacyLevel=${petInfo.intimacyLevel}`;
    
    console.log('[Companion] 跳转URL:', url);
    
    tt.navigateTo({
      url: url,
      success: function() {
        console.log('[Companion] 成功跳转到宠物档案页面');
      },
      fail: function(error) {
        console.error('[Companion] 跳转到宠物档案页面失败:', error);
        tt.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 点击记忆图标跳转到记忆页面
  onMemoryTap: function() {
    console.log('[Companion] 点击记忆图标，跳转到记忆页面');
    
    tt.navigateTo({
      url: '/pages/memory/memory',
      success: function() {
        console.log('[Companion] 成功跳转到记忆页面');
      },
      fail: function(error) {
        console.error('[Companion] 跳转到记忆页面失败:', error);
        tt.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 分享功能实现
  onShareAppMessage: function(shareOption) {
    console.log('[Companion] 分享被触发，参数:', shareOption);
    
    // 分享小程序，用户打开后进入引导页面
    const sharePath = `/pages/guide/guide?from=share&isShare=true`;
    
    return {
      // 分享地址，用户打开后进入引导页面
      path: sharePath,
      // 分享模板ID（需要在抖音开放平台后台配置）
      templateId: "3h8i11h04d3g40njx3", // 这是一个示例ID，实际使用时需要替换为真实的模板ID
      // 分享标题
      title: 'Linki - 你的专属AI宠物',
      // 分享成功回调
      // success: function() {
      //   console.log('[Companion] 分享面板调起成功');
      //   tt.showToast({
      //     title: '分享成功',
      //     icon: 'success',
      //     duration: 2000
      //   });
      // },
      // 分享失败回调
      fail: function(e) {
        console.error('[Companion] 分享面板调起失败:', e);
        tt.showToast({
          title: '分享失败',
          icon: 'none',
          duration: 2000
        });
      }
    };
  },

  handleCanvasTouchStart(e) {
    if (this.modelRenderer && this.modelRenderer.model) {
      this.modelRenderer.stopAnimation();
      
      // 记录触摸起始点
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.lastTouchTime = Date.now();
      
      // 检测是否为多点触摸（缩放操作）
      if (e.touches.length === 2) {
        // 计算两个触摸点之间的初始距离
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.initialPinchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        this.isPinching = true;
        this.lastPinchDistance = this.initialPinchDistance;
      } else {
        this.isPinching = false;
      }
      
      // 添加触摸反馈
      this.setData({
        modelStatus: '触摸中'
      });
    }
  },

  handleCanvasTouchMove(e) {
    if (!this.modelRenderer || !this.modelRenderer.model) return;
    
    const currentTime = Date.now();
    const timeDelta = currentTime - (this.lastTouchTime || currentTime);
    this.lastTouchTime = currentTime;
    
    // 处理缩放操作（双指触摸）
    if (this.isPinching && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentPinchDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // 使用相对于上一次距离的缩放，提供更平滑的体验
      if (this.lastPinchDistance > 0) {
        const scaleFactor = currentPinchDistance / this.lastPinchDistance;
        
        // 降低阈值，提供更灵敏的缩放响应
        if (Math.abs(scaleFactor - 1) > 0.005) {
          this.modelRenderer.scaleModel(scaleFactor);
          this.lastPinchDistance = currentPinchDistance;
        }
      }
    } 
    // 处理旋转操作（单指触摸）
    else if (e.touches.length === 1) {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - this.touchStartX;
      const deltaY = touchY - this.touchStartY;
      
      // 基于时间的平滑旋转，提供更好的响应性
      const rotationSpeed = Math.min(0.02, 0.01 + timeDelta * 0.00001);
      
      // 水平旋转（Y轴）
      this.modelRenderer.model.rotation.y += deltaX * rotationSpeed;
      
      // 可选：添加垂直旋转（X轴），但限制范围
      const verticalRotation = deltaY * rotationSpeed * 0.5;
      const newRotationX = this.modelRenderer.model.rotation.x + verticalRotation;
      if (newRotationX > -Math.PI/3 && newRotationX < Math.PI/3) {
        this.modelRenderer.model.rotation.x = newRotationX;
      }
      
      this.modelRenderer.render();
      this.touchStartX = touchX;
      this.touchStartY = touchY;
    }
  },

  handleCanvasTouchEnd() {
    if (this.modelRenderer) {
      // 重置触摸状态
      this.isPinching = false;
      this.initialPinchDistance = 0;
      this.lastPinchDistance = 0;
      this.lastTouchTime = null;
      
      // 恢复自动旋转
      this.modelRenderer.startAnimation();
      
      // 移除触摸反馈
      this.setData({
        modelStatus: '就绪'
      });
    }
  },
  
  // 双击重置模型缩放
  handleCanvasDoubleTap() {
    if (this.modelRenderer) {
      this.modelRenderer.resetModelScale();
    }
  },

  // 功能区事件处理函数
  // TODO: 实现视频功能
  onVideoTap: function() {
    console.log('[Companion] 点击视频功能');
    const newVideoState = !this.data.isVideoActive;
    this.setData({
      isVideoActive: newVideoState
    });
    
    if (newVideoState) {
      tt.showToast({
        title: '视频功能已激活',
        icon: 'none'
      });
    } else {
      tt.showToast({
        title: '视频功能已关闭',
        icon: 'none'
      });
    }
  },

  // TODO: 实现麦克风功能
  onMicTap: function() {
    console.log('[Companion] 点击麦克风功能');
    const newMicState = !this.data.isMicOn;
    this.setData({
      isMicOn: newMicState
    });
    
    if (newMicState) {
      tt.showToast({
        title: '麦克风已开启',
        icon: 'none'
      });
    } else {
      tt.showToast({
        title: '麦克风已关闭',
        icon: 'none'
      });
    }
  },

  // TODO: 实现扬声器功能
  onSpeakerTap: function() {
    console.log('[Companion] 点击扬声器功能');
    const newSpeakerState = !this.data.isSpeakerOn;
    this.setData({
      isSpeakerOn: newSpeakerState
    });
    
    if (newSpeakerState) {
      tt.showToast({
        title: '扬声器已开启',
        icon: 'none'
      });
    } else {
      tt.showToast({
        title: '扬声器已关闭',
        icon: 'none'
      });
    }
  },

  // TODO: 实现AR功能
  onArTap: function() {
    console.log('[Companion] 点击AR功能');
    const newArState = !this.data.isArActive;
    this.setData({
      isArActive: newArState
    });
    
    if (newArState) {
      tt.showToast({
        title: 'AR功能已激活',
        icon: 'none'
      });
    } else {
      tt.showToast({
        title: 'AR功能已关闭',
        icon: 'none'
      });
    }
  },

  // 实现多聊功能 - 切换聊天模式
  onTextChatTap: function() {
    console.log('[Companion] 点击多聊功能，切换聊天模式');
    this.toggleChatMode();
  },

  // 切换聊天模式
  toggleChatMode: function() {
    const newChatMode = !this.data.chatMode;
    
    this.setData({
      chatMode: newChatMode,
      showChatHistory: newChatMode,
      isTextChatActive: newChatMode
    });
    
    // 如果切换到聊天模式，清除当前气泡和用户消息
    if (newChatMode) {
      this.setData({
        currentMessage: '',
        userMessage: ''
      });
      
      // 清除气泡自动消失定时器
      if (this.bubbleHideTimer) {
        clearTimeout(this.bubbleHideTimer);
        this.bubbleHideTimer = null;
      }
      
      console.log('[Companion] 切换到聊天模式');
    } else {
      console.log('[Companion] 切换到宠物模式');
      
      // 切换回宠物模式时，延迟重新初始化3D渲染器
      // 给DOM更新一些时间
      setTimeout(() => {
        this.reinit3DRenderer();
      }, 300);
    }
  },

  // 重新初始化3D渲染器（用于模式切换后恢复模型显示）
  reinit3DRenderer: function() {
    console.log('[Companion] 重新初始化3D渲染器');
    const that = this;
    
    // 检查canvas是否可见
    const query = tt.createSelectorQuery();
    query.select('#modelCanvas').boundingClientRect((rect) => {
      if (rect && rect.width > 0 && rect.height > 0) {
        console.log('[Companion] Canvas可见，尺寸:', rect.width, 'x', rect.height);
        
        // 强制重新初始化渲染器，因为WebGL上下文可能已丢失
        console.log('[Companion] 强制重新初始化3D渲染器');
        
        // 清理旧的渲染器状态
        if (that.modelRenderer) {
          try {
            // 先尝试停止动画循环
            if (that.modelRenderer.stopAnimation && typeof that.modelRenderer.stopAnimation === 'function') {
              that.modelRenderer.stopAnimation();
            }
            
            // 然后安全地销毁渲染器
            if (that.modelRenderer.dispose && typeof that.modelRenderer.dispose === 'function') {
              that.modelRenderer.dispose();
            }
          } catch (error) {
            console.warn('[Companion] 清理旧渲染器时出现警告:', error);
            // 忽略Three.js的cancelAnimationFrame警告，这是已知的兼容性问题
            if (!error.message || !error.message.includes('cancelAnimationFrame')) {
              console.error('[Companion] 清理渲染器时出现严重错误:', error);
            }
          } finally {
            that.modelRenderer = null;
          }
        }
        
        // 重置初始化标记
        that.isInitializing3D = false;
        
        that.init3DRenderer();
      } else {
        console.error('[Companion] Canvas不可见或尺寸为0，延迟重试');
        // Canvas不可见，延迟重试
        setTimeout(() => {
          that.reinit3DRenderer();
        }, 200);
      }
    }).exec();
  },
  
  // =========================== 语音播放相关方法 ===========================
  
  // 初始化语音设置
  initVoiceSettings: function() {
    console.log('[Companion] 初始化语音设置');
    
    // 从本地存储获取语音设置
    const voiceSettings = tt.getStorageSync('voiceSettings');
    const enableVoiceReply = voiceSettings && voiceSettings.enableVoiceReply !== undefined ? 
                             voiceSettings.enableVoiceReply : false;
    
    this.setData({
      enableVoiceReply: enableVoiceReply
    });
    
    console.log('[Companion] 语音播放设置:', enableVoiceReply ? '开启' : '关闭');
  },
  
  // 播放AI回复语音
  playAIReplyVoice: function(text, messageId) {
    console.log('[Companion] 开始播放AI回复语音:', text);
    
    if (!text || typeof text !== 'string') {
      console.warn('[Companion] 无效的文本内容，跳过语音播放');
      return;
    }
    
    // 检查是否开启语音播放
    if (!this.data.enableVoiceReply) {
      console.log('[Companion] 语音播放功能已关闭，跳过');
      return;
    }
    
    // 停止当前正在播放的语音
    this.stopCurrentAudio();
    
    // 标记正在生成语音的消息
    if (!this.data.voiceLoadingMessages.includes(messageId)) {
      this.data.voiceLoadingMessages.push(messageId);
      this.setData({
        voiceLoadingMessages: this.data.voiceLoadingMessages
      });
    }
    
    const that = this;
    
    // 调用后端文本转语音API
    tt.request({
      url: app.globalData.API_BASE_URL + '/tts',
      method: 'POST',
      data: {
        text: text
      },
      success: function(res) {
        console.log('[Companion] TTS API调用成功:', res);
        
        // 移除加载标记
        const index = that.data.voiceLoadingMessages.indexOf(messageId);
        if (index > -1) {
          that.data.voiceLoadingMessages.splice(index, 1);
          that.setData({
            voiceLoadingMessages: that.data.voiceLoadingMessages
          });
        }
        
        if (res.data && res.data.status === 'success' && res.data.audio_url) {
          // 播放生成的语音
          if (res.data.is_mock) {
            console.log('[Companion] 使用模拟音频文件');
            // 模拟模式下显示提示，但不实际播放
            tt.showToast({
              title: '语音功能正在模拟中',
              icon: 'none',
              duration: 1000
            });
          } else {
            that.playAudioFromUrl(res.data.audio_url);
          }
        } else {
          console.error('[Companion] TTS API返回错误:', res.data.message || '未知错误');
          tt.showToast({
            title: '语音生成失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: function(error) {
        console.error('[Companion] TTS API调用失败:', error);
        
        // 移除加载标记
        const index = that.data.voiceLoadingMessages.indexOf(messageId);
        if (index > -1) {
          that.data.voiceLoadingMessages.splice(index, 1);
          that.setData({
            voiceLoadingMessages: that.data.voiceLoadingMessages
          });
        }
        
        tt.showToast({
          title: '网络错误，语音播放失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 从 URL 播放音频
  playAudioFromUrl: function(audioUrl) {
    console.log('[Companion] 从 URL 播放音频:', audioUrl);
    
    if (!audioUrl) {
      console.error('[Companion] 无效的音频URL');
      return;
    }
    
    const that = this;
    
    try {
      // 创建音频对象
      const audio = tt.createInnerAudioContext();
      
      audio.src = audioUrl;
      audio.autoplay = true;
      
      // 设置播放事件监听
      audio.onPlay(() => {
        console.log('[Companion] 语音开始播放');
        that.setData({
          isPlaying: true,
          currentAudio: audio
        });
      });
      
      audio.onEnded(() => {
        console.log('[Companion] 语音播放结束');
        that.setData({
          isPlaying: false,
          currentAudio: null
        });
        audio.destroy();
      });
      
      audio.onError((error) => {
        console.error('[Companion] 语音播放错误:', error);
        that.setData({
          isPlaying: false,
          currentAudio: null
        });
        audio.destroy();
        
        tt.showToast({
          title: '语音播放失败',
          icon: 'none',
          duration: 2000
        });
      });
      
      audio.onStop(() => {
        console.log('[Companion] 语音播放停止');
        that.setData({
          isPlaying: false,
          currentAudio: null
        });
        audio.destroy();
      });
      
      // 开始播放
      audio.play();
      
    } catch (error) {
      console.error('[Companion] 创建音频对象失败:', error);
      tt.showToast({
        title: '语音播放器初始化失败',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // 停止当前播放的语音
  stopCurrentAudio: function() {
    if (this.data.currentAudio && this.data.isPlaying) {
      console.log('[Companion] 停止当前语音播放');
      this.data.currentAudio.stop();
    }
  },
  
  // 切换语音播放开关
  toggleVoiceReply: function() {
    const newVoiceState = !this.data.enableVoiceReply;
    
    this.setData({
      enableVoiceReply: newVoiceState
    });
    
    // 保存设置到本地存储
    const voiceSettings = {
      enableVoiceReply: newVoiceState
    };
    tt.setStorageSync('voiceSettings', voiceSettings);
    
    // 如果关闭语音，停止当前播放
    if (!newVoiceState) {
      this.stopCurrentAudio();
    }
    
    const statusText = newVoiceState ? '开启' : '关闭';
    console.log(`[Companion] 语音播放已${statusText}`);
    
    tt.showToast({
      title: `宠物语音已${statusText}`,
      icon: 'none',
      duration: 2000
    });
  }
  
});