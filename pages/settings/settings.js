const app = getApp();

Page({
  data: {
    // 用户设置
    settings: {
      // 通知设置
      enableNotifications: true,
      enableSound: true,
      enableVibration: true,
      
      enableLocation: true,
      
      // 隐私设置
      enableDataCollection: true,
      
      // 语音设置
      enableVoiceReply: false, // 宠物语音回复功能
      
      // 其他设置
    }
  },

  onLoad: function(options) {
    console.log('[Settings] 设置页面加载');
    this.loadSettings();
  },

  // 加载用户设置
  loadSettings: function() {
    const savedSettings = tt.getStorageSync('userSettings');
    const voiceSettings = tt.getStorageSync('voiceSettings');
    
    // 合并设置
    let mergedSettings = { ...this.data.settings };
    
    if (savedSettings) {
      mergedSettings = { ...mergedSettings, ...savedSettings };
    }
    
    if (voiceSettings) {
      mergedSettings = { ...mergedSettings, ...voiceSettings };
    }
    
    this.setData({
      settings: mergedSettings
    });
  },

  // 保存设置
  saveSettings: function() {
    // 分别保存不同类型的设置
    const userSettings = {
      enableNotifications: this.data.settings.enableNotifications,
      enableSound: this.data.settings.enableSound,
      enableVibration: this.data.settings.enableVibration,
      enableLocation: this.data.settings.enableLocation,
      enableDataCollection: this.data.settings.enableDataCollection
    };
    
    const voiceSettings = {
      enableVoiceReply: this.data.settings.enableVoiceReply
    };
    
    tt.setStorageSync('userSettings', userSettings);
    tt.setStorageSync('voiceSettings', voiceSettings);
    
    tt.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  // 切换通知设置
  onNotificationToggle: function(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.enableNotifications': enabled
    });
    this.saveSettings();
  },

  // 切换声音设置
  onSoundToggle: function(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.enableSound': enabled
    });
    this.saveSettings();
  },

  // 切换震动设置
  onVibrationToggle: function(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.enableVibration': enabled
    });
    this.saveSettings();
  },


  // 切换数据收集
  onDataCollectionToggle: function(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.enableDataCollection': enabled
    });
    this.saveSettings();
  },


  // 清除缓存
  onClearCache: function() {
    tt.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          tt.clearStorageSync();
          tt.showToast({
            title: '缓存已清除',
            icon: 'success'
          });
          // 重新加载设置
          this.loadSettings();
        }
      }
    });
  },

  // 删除宠物数据
  onDeletePetData: function() {
    const currentPet = tt.getStorageSync('currentPet') || {};
    const petName = currentPet.name || '当前宠物';
    
    tt.showModal({
      title: '删除宠物数据',
      content: `确定要删除"${petName}"的所有数据吗？\n\n这将包括：\n• 宠物档案\n• 聊天记录\n• 亲密数据\n• 相关设置\n\n此操作不可恢复！`,
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          // 再次确认
          tt.showModal({
            title: '最后确认',
            content: '您真的要删除所有宠物数据吗？\n\n删除后将无法恢复！',
            confirmText: '确认删除',
            confirmColor: '#FF3B30',
            success: (confirmRes) => {
              if (confirmRes.confirm) {
                this.deletePetData();
              }
            }
          });
        }
      }
    });
  },

  // 执行删除宠物数据
  deletePetData: function() {
    tt.showLoading({
      title: '正在删除数据...'
    });

    try {
      // 获取当前宠物信息
      const currentPet = tt.getStorageSync('currentPet') || {};
      const petId = currentPet.id;

      // 删除本地存储的宠物相关数据
      const keysToRemove = ['currentPet'];
      
      // 如果有petId，删除特定宠物的数据
      if (petId) {
        keysToRemove.push(
          'petProfile_' + petId,
          'chatHistory_' + petId,
          'intimacyData_' + petId,
          'petSettings_' + petId
        );
      }
      
      // 清理所有相关的存储键
      keysToRemove.forEach(key => {
        try {
          tt.removeStorageSync(key);
          console.log('已清理存储键:', key);
        } catch (error) {
          console.warn('清理存储键失败:', key, error);
        }
      });
      
      // 额外清理：查找并删除所有可能的宠物相关数据
      try {
        const storageInfo = tt.getStorageInfoSync();
        const allKeys = storageInfo.keys || [];
        const petRelatedKeys = allKeys.filter(key => 
          key.startsWith('petProfile_') || 
          key.startsWith('chatHistory_') || 
          key.startsWith('intimacyData_') || 
          key.startsWith('petSettings_')
        );
        
        petRelatedKeys.forEach(key => {
          try {
            tt.removeStorageSync(key);
            console.log('额外清理存储键:', key);
          } catch (error) {
            console.warn('额外清理存储键失败:', key, error);
          }
        });
      } catch (error) {
        console.warn('获取存储信息失败:', error);
      }

      // 如果有宠物ID，尝试从服务器删除
      if (petId) {
        tt.request({
          url: app.globalData.API_BASE_URL + '/pets/' + petId,
          method: 'DELETE',
          success: (res) => {
            tt.hideLoading();
            console.log('服务器删除结果:', res);
            if (res.statusCode === 200) {
              this.showDeleteSuccess();
            } else {
              console.error('服务器删除失败，状态码:', res.statusCode);
              this.showDeleteSuccess(); // 本地数据已清除，仍然显示成功
            }
          },
          fail: (error) => {
            tt.hideLoading();
            console.error('服务器删除失败:', error);
            // 即使服务器删除失败，本地数据已清除，仍然显示成功
            this.showDeleteSuccess();
          }
        });
      } else {
        tt.hideLoading();
        this.showDeleteSuccess();
      }
    } catch (error) {
      tt.hideLoading();
      console.error('删除宠物数据时出错:', error);
      tt.showToast({
        title: '删除失败，请重试',
        icon: 'error'
      });
    }
  },

  // 显示删除成功提示
  showDeleteSuccess: function() {
    tt.showToast({
      title: '宠物数据已删除',
      icon: 'success',
      duration: 2000
    });

    // 延迟跳转到宠物选择页面
    setTimeout(() => {
      // 使用reLaunch确保清理页面栈，避免用户返回到已删除宠物的页面
      tt.reLaunch({
        url: '/pages/guide/guide'
      });
    }, 2000);
  },

  // 关于应用
  onAbout: function() {
    tt.navigateTo({
      url: '/pages/settings/info/info'
    });
  },

  // 位置权限
  onLocationToggle: function(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.enableLocation': enabled
    });
  },

  // 隐私政策
  onPrivacy: function() {
    tt.showModal({
      title: '隐私政策',
      content: '我们重视您的隐私保护。本应用仅在您同意的情况下收集必要的数据，用于改善用户体验。',
      showCancel: false
    });
  },

  // 用户协议
  onTerms: function() {
    tt.showModal({
      title: '用户协议',
      content: '使用本应用即表示您同意遵守相关条款和条件。',
      showCancel: false
    });
  },
  
  // 切换语音回复设置
  onVoiceReplyToggle: function(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.enableVoiceReply': enabled
    });
    
    // 立即保存语音设置
    const voiceSettings = {
      enableVoiceReply: enabled
    };
    tt.setStorageSync('voiceSettings', voiceSettings);
    
    const statusText = enabled ? '开启' : '关闭';
    tt.showToast({
      title: `宠物语音回复已${statusText}`,
      icon: 'none',
      duration: 2000
    });
    
    console.log('[Settings] 语音回复设置已更新:', enabled);
  }
});
