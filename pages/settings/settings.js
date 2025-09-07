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
    if (savedSettings) {
      this.setData({
        settings: { ...this.data.settings, ...savedSettings }
      });
    }
  },

  // 保存设置
  saveSettings: function() {
    tt.setStorageSync('userSettings', this.data.settings);
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
      const keysToRemove = [
        'currentPet',
        'petProfile_' + petId,
        'chatHistory_' + petId,
        'intimacyData_' + petId,
        'petSettings_' + petId
      ];

      keysToRemove.forEach(key => {
        tt.removeStorageSync(key);
      });

      // 如果有宠物ID，尝试从服务器删除
      if (petId) {
        tt.request({
          url: app.globalData.API_BASE_URL + '/pets/' + petId,
          method: 'DELETE',
          success: (res) => {
            tt.hideLoading();
            console.log('服务器删除结果:', res);
            this.showDeleteSuccess();
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
      icon: 'success'
    });

    // 延迟跳转到宠物选择页面
    setTimeout(() => {
      tt.reLaunch({
        url: '/pages/pet/pet'
      });
    }, 1500);
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
  }
});
