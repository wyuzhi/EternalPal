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
          
          that.setData({
            messages: messagesWithValidIds
          });
          
          // 延迟执行滚动，确保DOM已经更新
          setTimeout(() => {
            that.scrollToBottom();
          }, 100);
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
    
    return validId;
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
    modelStatus: '未知', // 模型状态
    modelMessage: '无', // 模型消息
    rendererInitialized: false, // 渲染器初始化状态
    safeAreaBottom: 0, // 底部安全区域距离
    systemInfo: null, // 系统信息
    quickReplies: [], // 快捷话术数据

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
      progress: Math.round(progress)
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

  // 初始化快捷话术
  initQuickReplies: function() {
    console.log('[Companion] 初始化快捷话术');
    
    // 先设置模拟数据
    const mockReplies = [
      { id: 1, text: '测试3D功能', isTest: true },
      { id: 2, text: '测试亲密度', isTest: true },
      { id: 3, text: '哈喽，好久不见', isTest: false },
      { id: 4, text: '今天过得怎么样', isTest: false },
      { id: 5, text: '讲个笑话', isTest: false },
      { id: 6, text: '陪我聊聊天', isTest: false },
      { id: 7, text: '吃饭了没', isTest: false },
      { id: 8, text: '我们去散步吧', isTest: false },
      { id: 9, text: '给你买了逗猫棒', isTest: false },
      { id: 10, text: '好想你啊', isTest: false },
      { id: 11, text: '今天好冷', isTest: false }
    ];
    
    this.setData({
      quickReplies: mockReplies
    });
    
    //TODO: 获取话术数据，AI生成，最多8条
  },

  // 初始化亲密度系统
  initIntimacySystem: function() {
    console.log('[Companion] 初始化亲密度系统');
    
    // TODO: 从后端获取用户的当前亲密值
    // 这里设置一个演示用的初始值
    const initialIntimacyPoints = 50; // 演示：设置为50点，0级50%进度
    const intimacyInfo = this.calculateIntimacyLevel(initialIntimacyPoints);
    
    this.setData({
      intimacyPoints: initialIntimacyPoints,
      intimacyLevel: intimacyInfo.level,
      intimacyProgress: intimacyInfo.progress
    });
    
    console.log(`[Companion] 亲密度系统初始化完成: ${initialIntimacyPoints}点, ${intimacyInfo.level}级, ${intimacyInfo.progress}%进度`);
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
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 初始化快捷话术
    this.initQuickReplies();
    
    // 初始化亲密度系统（设置一些初始值用于演示）
    this.initIntimacySystem();
    
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
    } else if (this.data.petId) {
      // 有宠物ID，获取聊天记录
      this.fetchChatHistory();
    } else if (!this.data.preview_url) {
      // 如果没有preview_url，设置一个默认值用于演示
      this.setData({
        preview_url: 'https://example.com/mock-pet-animation.gif',
        petName: '示例宠物',
        petType: 'default',
        isImageMode: true,
        modelLoaded: true
      });
    }
    
  },
  
  // 从API查询用户的宠物信息
  fetchUserPetInfo: function(userId) {
    const that = this;
    
    tt.showLoading({
      title: '正在获取灵伴信息...',
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
          
          // 标记需要初始化3D渲染器，但不在这里直接调用
          // 让onReady统一处理初始化
          console.log('[Companion] 宠物信息获取完成，等待onReady初始化3D渲染器');
          
          // 获取聊天记录
          that.fetchChatHistory();
        } else {
          // 没有获取到宠物信息
          console.log('未获取到宠物信息');
          tt.showToast({
            title: '获取灵伴信息失败',
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
    
    try {
      // 防止重复初始化
      if (this.modelRenderer) {
        console.log('[Companion] ModelRenderer已存在，先销毁');
        this.modelRenderer.dispose();
        this.modelRenderer = null;
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
  load3DModel: function(modelUrl) {
    console.log('[Companion] 开始加载3D模型，URL:', modelUrl);
    const that = this;
    
    if (!this.modelRenderer) {
      console.error('[Companion] ModelRenderer未初始化，无法加载模型');
      return;
    }
    
    tt.showLoading({
      title: '正在加载3D模型...',
    });
    
    // 初始化加载状态
    console.log('[Companion] 设置加载状态');
    that.setData({
      modelPlaceholderText: '模型加载中...',
      loadingProgress: 0,
      modelStatus: '加载中',
      modelMessage: '正在下载模型文件'
    });
    
    console.log('[Companion] 调用ModelRenderer.loadOBJModel');
    this.modelRenderer.loadOBJModel(modelUrl, this.data.material_url, this.data.texture_url).then((model) => {
      tt.hideLoading();
      console.log('[Companion] 3D模型加载成功');
      
      // 模型加载成功后启动动画循环
      console.log('[Companion] 启动动画循环');
      that.modelRenderer.startAnimation();
      
      that.setData({
        modelLoaded: true,
        modelPlaceholderText: '',
        isImageMode: false,
        firstLoadSuccess: true,
        loadingProgress: 100,
        modelStatus: '加载成功',
        modelMessage: '模型已就绪，动画运行中'
      });
    }).catch((error) => {
      tt.hideLoading();
      console.error('[Companion] 加载3D模型异常:', error);
      
      that.setData({
        modelLoaded: false,
        modelPlaceholderText: '加载3D模型失败: ' + error.message,
        isImageMode: false,
        loadingProgress: 0,
        modelStatus: '加载失败',
        modelMessage: error.message || '模型文件加载错误'
      });
    });
  },
  
  onReady: function() {
    console.log('[Companion] 页面渲染完成，onReady被调用');
    // 页面渲染完成后滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 300);
    
    // 如果有宠物ID且未初始化3D渲染器，则尝试初始化
    if (this.data.petId && !this.modelRenderer) {
      console.log('[Companion] onReady中检测到需要初始化3D渲染器');
      setTimeout(() => {
        this.init3DRenderer();
      }, 200);
    } else {
      console.log('[Companion] onReady中跳过3D渲染器初始化，petId:', this.data.petId, 'modelRenderer存在:', !!this.modelRenderer);
    }
  },
  
  onShow: function() {
    console.log('[Companion] 页面显示，onShow被调用');
    
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
    if (this.modelRenderer) {
      console.log('[Companion] 销毁ModelRenderer实例');
      this.modelRenderer.dispose();
      this.modelRenderer = null;
    }
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
      this.modelRenderer.startAnimation();
    }
  },
    
  // 输入框内容变化
  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },
  
  // 滚动到底部方法 - 使用scroll-into-view方式
  scrollToBottom: function() {
    console.log('开始执行滚动到底部操作');
    const messages = this.data.messages;
    
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const validScrollId = `message-${latestMessage.validId || this.getValidScrollId(latestMessage.id)}`;
      console.log('尝试滚动到最新消息，ID:', validScrollId);
      
      // 设置scroll-into-view属性，指向最新消息的id
      this.setData({
        scrollToMessageId: validScrollId
      });
      
      // 为了确保每次都能触发滚动，添加一个延迟重置的逻辑
      setTimeout(() => {
        this.setData({
          scrollToMessageId: validScrollId
        });
      }, 100);
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
    
    if (!this.data.petId) {
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
    
    // 添加用户消息到界面
    const userId = Date.now();
    const newMessages = this.data.messages.concat({
      id: userId,
      validId: this.getValidScrollId(userId),
      text: message,
      isUser: true,
      timestamp: new Date().getTime()
    });
    
    this.setData({
      messages: newMessages
    });
    
    // 用户消息显示后立即滚动到最新消息
    setTimeout(() => {
      this.scrollToBottom();
    }, 50);
    
    // 调用API发送消息
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
          
          // 更新AI回复
          const aiMessageId = aiMessage.id || Date.now() + 1;
          const updatedMessages = that.data.messages.concat({
            id: aiMessageId,
            validId: that.getValidScrollId(aiMessageId),
            text: aiMessage.content || aiMessage.text,
            isUser: false,
            timestamp: new Date().getTime()
          });
          
          that.setData({
            messages: updatedMessages
          });
          
          // 处理亲密值更新（TODO: 从后端获取新的亲密值）
          if (aiMessage.intimacy_points !== undefined) {
            that.updateIntimacyInfo(aiMessage.intimacy_points);
          }
          
          // 延迟执行滚动，确保DOM已经更新
          setTimeout(() => {
            that.scrollToBottom();
          }, 100);
        } else {
          console.error('AI回复失败:', res.data.message || '未知错误');
          tt.showToast({
            title: 'AI回复失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        console.error('发送消息网络失败:', error);
        tt.showToast({
          title: '网络错误，发送失败',
          icon: 'none'
        });
      }
    });
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
    this.setData({
      showFloatMenu: !this.data.showFloatMenu
    });
  },

  // 菜单项点击事件
  onMenuItemTap: function(e) {
    const { action } = e.currentTarget.dataset;
    console.log('点击了菜单项:', action);
    
    // 根据action执行不同操作
    switch(action) {
      case 'info':
        tt.showToast({ title: '查看宠物信息', icon: 'none' });
        break;
      case 'settings':
        tt.showToast({ title: '打开设置', icon: 'none' });
        break;
      case 'share':
        tt.showShareMenu({
          withShareTicket: true,
          menus: ['shareAppMessage', 'shareTimeline']
        });
        break;
    }
    
    // 关闭菜单
    this.setData({ showFloatMenu: false });
  },

  handleCanvasTouchStart(e) {
    if (this.modelRenderer && this.modelRenderer.model) {
      this.modelRenderer.stopAnimation();
      
      // 记录触摸起始点
      this.touchStartX = e.touches[0].clientX;
      
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
      } else {
        this.isPinching = false;
      }
    }
  },

  handleCanvasTouchMove(e) {
    if (!this.modelRenderer || !this.modelRenderer.model) return;
    
    // 处理缩放操作（双指触摸）
    if (this.isPinching && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentPinchDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // 计算缩放比例
      if (this.initialPinchDistance > 0) {
        const scaleFactor = currentPinchDistance / this.initialPinchDistance;
        
        // 调用ModelRenderer的缩放方法
        if (Math.abs(scaleFactor - 1) > 0.01) { // 添加阈值，避免微小变化
          this.modelRenderer.scaleModel(scaleFactor);
          this.initialPinchDistance = currentPinchDistance; // 更新初始距离
        }
      }
    } 
    // 处理旋转操作（单指触摸）
    else if (e.touches.length === 1) {
      const touchX = e.touches[0].clientX;
      const deltaX = touchX - this.touchStartX;
      
      // 调整旋转速度，使其更平滑
      const rotationSpeed = 0.01;
      this.modelRenderer.model.rotation.y += deltaX * rotationSpeed;
      this.modelRenderer.render();
      this.touchStartX = touchX;
    }
  },

  handleCanvasTouchEnd() {
    if (this.modelRenderer) {
      // 重置触摸状态
      this.isPinching = false;
      this.initialPinchDistance = 0;
      
      // 恢复自动旋转
      this.modelRenderer.startAnimation();
    }
  },
  
  // 双击重置模型缩放
  handleCanvasDoubleTap() {
    if (this.modelRenderer) {
      this.modelRenderer.resetModelScale();
    }
  }
});