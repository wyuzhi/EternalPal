const app = getApp();

Page({
  data: {
    systemPets: [], // 系统预设宠物列表
    loading: true,
    showAdoptModal: false, // 领养确认弹窗
    selectedPet: null, // 选中的宠物
    currentUserId: null // 当前用户ID
  },

  onLoad: function(options) {
    this.getCurrentUser();
    this.fetchSystemPets();
  },

  // 获取当前用户信息
  getCurrentUser: function() {
    const userInfo = tt.getStorageSync('userInfo');
    if (userInfo && userInfo.id) {
      this.setData({
        currentUserId: userInfo.id
      });
    } else {
      // 如果没有用户信息，跳转到登录页面
      tt.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        tt.navigateBack();
      }, 1500);
    }
  },

  // 获取系统预设宠物列表
  fetchSystemPets: function() {
    const that = this;
    
    tt.showLoading({
      title: '加载中...'
    });

    tt.request({
      url: app.globalData.API_BASE_URL + '/system-pets',
      method: 'GET',
      success: function(res) {
        tt.hideLoading();
        console.log('获取系统宠物列表结果:', res);
        
        if (res.data && res.data.status === 'success') {
          that.setData({
            systemPets: res.data.data || [],
            loading: false
          });
        } else {
          console.error('获取系统宠物列表失败:', res.data.message || '未知错误');
          tt.showToast({
            title: '获取宠物列表失败',
            icon: 'none'
          });
          that.setData({
            loading: false
          });
        }
      },
      fail: function(error) {
        tt.hideLoading();
        console.error('获取系统宠物列表网络失败:', error);
        tt.showToast({
          title: '网络错误',
          icon: 'none'
        });
        that.setData({
          loading: false
        });
      }
    });
  },

  // 点击宠物卡片
  onPetCardTap: function(e) {
    const petId = e.currentTarget.dataset.petId;
    const pet = this.data.systemPets.find(p => p.id === petId);
    
    if (pet) {
      this.setData({
        selectedPet: pet,
        showAdoptModal: true
      });
    }
  },

  // 关闭领养弹窗
  closeAdoptModal: function() {
    this.setData({
      showAdoptModal: false,
      selectedPet: null
    });
  },

  // 确认领养
  confirmAdopt: function() {
    const that = this;
    const { selectedPet, currentUserId } = this.data;
    
    if (!selectedPet || !currentUserId) {
      tt.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }

    tt.showLoading({
      title: '领养中...'
    });

    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + selectedPet.id + '/adopt',
      method: 'POST',
      data: {
        user_id: currentUserId
      },
      success: function(res) {
        tt.hideLoading();
        console.log('领养宠物结果:', res);
        
        if (res.data && res.data.status === 'success') {
          tt.showToast({
            title: '领养成功！',
            icon: 'success'
          });
          
          // 关闭弹窗
          that.closeAdoptModal();
          
          // 延迟跳转到companion页面
          setTimeout(() => {
            tt.navigateTo({
              url: '/pages/companion/companion?petId=' + selectedPet.id
            });
          }, 1500);
        } else {
          console.error('领养宠物失败:', res.data.message || '未知错误');
          tt.showToast({
            title: res.data.message || '领养失败',
            icon: 'none'
          });
        }
      },
      fail: function(error) {
        tt.hideLoading();
        console.error('领养宠物网络失败:', error);
        tt.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 返回上一页
  onBackTap: function() {
    tt.navigateBack();
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '来看看这些可爱的宠物！',
      path: '/pages/systemPet/systemPet'
    };
  }
});