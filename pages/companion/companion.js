const app = getApp();
const ModelRenderer = require('./ModelRenderer');

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
    model_url: '',
    petId: '',
    modelLoaded: false, // 默认设置为未加载状态
    moodLevel: 3,
    messages: [],
    inputValue: '',
    isRecording: false,
    modelPlaceholderText: '',
    sceneName: '',
    isImageMode: false, // 默认使用3D模型模式
    firstLoadSuccess: false,
    scrollToMessageId: '',
    showFloatMenu: false, // 控制浮动菜单显示
  },
  
  // 3D模型渲染器实例
  modelRenderer: null,

  onLoad: function(options) {
    console.log("Welcome to Mini Code");
    
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
        preview_url: options.preview_url || '/images/dog.png',
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
            model_url: petInfo.model_url || '',
            petId: petInfo.id,
            isImageMode: false,
            modelPlaceholderText: '正在加载3D模型...',
            firstLoadSuccess: true
          });
          
          // 保存宠物信息到本地存储
          tt.setStorageSync('currentPet', petInfo);
          
          // 延迟初始化3D渲染器，确保canvas元素已经创建
    setTimeout(() => {
      that.init3DRenderer();
    }, 100);
          
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
    const that = this;
    try {
      // 创建渲染器实例
      this.modelRenderer = new ModelRenderer();
      
      // 初始化渲染器
      this.modelRenderer.init('modelCanvas').then((success) => {
        if (success) {
          console.log('3D渲染器初始化成功');
          if (that.data.model_url) {
            // 加载3D模型
            that.load3DModel(that.data.model_url);
          } else {
            console.warn('3D渲染器初始化成功但没有模型URL');
            console.log('切换到图片模式前的状态：', {
              preview_url: that.data.preview_url,
              generatedPetImage: that.data.generatedPetImage,
              isImageMode: that.data.isImageMode
            });
            that.setData({
              modelLoaded: true,
              modelPlaceholderText: '没有可加载的3D模型',
              isImageMode: true
            });
            console.log('切换到图片模式后的状态：', {
              preview_url: that.data.preview_url,
              generatedPetImage: that.data.generatedPetImage,
              isImageMode: that.data.isImageMode
            });
          }
        } else {
          console.warn('3D渲染器初始化失败，切换到图片模式');
          console.log('切换到图片模式前的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generatedPetImage,
            isImageMode: that.data.isImageMode
          });
          that.setData({
            modelLoaded: true,
            modelPlaceholderText: '无法初始化3D渲染器，将显示图片',
            isImageMode: true
          });
          console.log('切换到图片模式后的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generatedPetImage,
            isImageMode: that.data.isImageMode
          });
        }
      }).catch((error) => {
        console.error('初始化3D渲染器过程中发生错误:', error);
          console.log('切换到图片模式前的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generatedPetImage,
            isImageMode: that.data.isImageMode
          });
          that.setData({
            modelLoaded: true,
            modelPlaceholderText: '加载3D渲染器出错',
            isImageMode: true
          });
          console.log('切换到图片模式后的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generatedPetImage,
            isImageMode: that.data.isImageMode
          });
      });
    } catch (error) {
      console.error('初始化3D渲染器异常:', error);
        console.log('切换到图片模式前的状态：', {
          preview_url: that.data.preview_url,
          generatedPetImage: that.data.generatedPetImage,
          isImageMode: that.data.isImageMode
        });
        that.setData({
          modelLoaded: true,
          modelPlaceholderText: '加载3D模型失败',
          isImageMode: true
        });
        console.log('切换到图片模式后的状态：', {
          preview_url: that.data.preview_url,
          generatedPetImage: that.data.generatedPetImage,
          isImageMode: that.data.isImageMode
        });
    }
  },
  
  // 加载3D模型
  load3DModel: function(modelUrl) {
    const that = this;
    
    if (this.modelRenderer) {
      tt.showLoading({
        title: '正在加载3D模型...',
      });
      
      this.modelRenderer.loadModel(modelUrl).then((success) => {
        tt.hideLoading();
        
        if (success) {
          console.log('3D模型加载成功');
          that.setData({
            modelLoaded: true,
            modelPlaceholderText: '',
            isImageMode: false,
            firstLoadSuccess: true
          });
        } else {
          console.warn('3D模型加载失败');
          console.log('切换到图片模式前的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generated_image,
            isImageMode: that.data.isImageMode
          });
          that.setData({
            modelLoaded: true,
            modelPlaceholderText: '3D模型加载失败，将显示图片',
            isImageMode: true
          });
          console.log('切换到图片模式后的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generated_image,
            isImageMode: that.data.isImageMode
          });
        }
      }).catch((error) => {
        tt.hideLoading();
        console.error('加载3D模型异常:', error);
          console.log('切换到图片模式前的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generated_image,
            isImageMode: that.data.isImageMode
          });
          that.setData({
            modelLoaded: true,
            modelPlaceholderText: '加载3D模型异常',
            isImageMode: true
          });
          console.log('切换到图片模式后的状态：', {
            preview_url: that.data.preview_url,
            generatedPetImage: that.data.generated_image,
            isImageMode: that.data.isImageMode
          });
      });
    }
  },
  
  onReady: function() {
    console.log('页面渲染完成，onReady被调用');
    // 页面渲染完成后滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 300);
    
    // 如果有宠物ID且未初始化3D渲染器，则尝试初始化
    if (this.data.petId && !this.modelRenderer) {
      setTimeout(() => {
        this.init3DRenderer();
      }, 200);
    }
  },
  
  onShow: function() {
    console.log('页面显示，onShow被调用');
    
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
    if (this.modelRenderer) {
      this.modelRenderer.destroy();
      this.modelRenderer = null;
    }
  },
  
  // 页面隐藏时停止旋转
  onHide: function() {
    if (this.modelRenderer) {
      this.modelRenderer.stopRotation();
    }
  },
  
  // 页面重新显示时继续旋转
  onBackShow: function() {
    if (this.modelRenderer) {
      this.modelRenderer.startRotation();
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
            messages: updatedMessages,
            moodLevel: aiMessage.mood_level || that.data.moodLevel
          });
          
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
    if (this.modelRenderer) {
      this.modelRenderer.destroy();
      this.modelRenderer = null;
    }
    
    this.setData({
      isImageMode: false,
      modelLoaded: false,
      modelPlaceholderText: '重新加载模型...'
    });
    
    // 重新初始化3D渲染器
    if (this.data.petId) {
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
      this.modelRenderer.stopRotation();
      this.touchStartX = e.touches[0].clientX;
    }
  },

  handleCanvasTouchMove(e) {
    if (this.modelRenderer && this.modelRenderer.model) {
      const touchX = e.touches[0].clientX;
      const deltaX = touchX - this.touchStartX;
      this.modelRenderer.model.rotation.y += deltaX * 0.01;
      this.modelRenderer.render();
      this.touchStartX = touchX;
    }
  },

  handleCanvasTouchEnd() {
    if (this.modelRenderer) {
      this.modelRenderer.startRotation();
    }
  }
});