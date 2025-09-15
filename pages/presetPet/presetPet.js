const app = getApp();

Page({
  data: {
    systemPets: [], // 系统预设宠物列表
    leftColumnPets: [], // 左列宠物
    rightColumnPets: [], // 右列宠物
    loading: true,
    showAdoptModal: false, // 领养确认弹窗
    selectedPet: null, // 选中的宠物
    currentUserId: null, // 当前用户ID
    currentTab: 'all', // 当前选中的标签
    searchKeyword: '', // 搜索关键词
    showSuggestions: false, // 显示搜索建议
    searchSuggestions: [], // 搜索建议列表
    searchHistory: [], // 搜索历史
    // 抽卡效果相关状态
    showCardDraw: false, // 显示抽卡动画
    cardFlipped: false, // 卡牌翻转状态
    cardRevealed: false, // 卡牌揭示状态
    cardDrawText: '正在召唤神秘伙伴...', // 抽卡文字
    tabs: [            // TODO 获取数据库中的宠物类型，构建动态标签列表
      { key: 'all', name: '全部' },
      { key: 'popular', name: '热门' },
      { key: 'new', name: '最新' },
      { key: 'cat', name: '猫咪' },
      { key: 'dog', name: '狗狗' },
      { key: 'duck', name: '鸭鸭' },
    ]
  },

  onLoad: function(options) {
    this.getCurrentUser();
    this.fetchSystemPets();
    this.loadSearchHistory();
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
    
    // 模拟数据（已注释）
    // setTimeout(() => {
    //   // 模拟数据
    //   const mockPets = [
    //     {
    //       id: 1,
    //       name: '小橘',
    //       type: '橘猫',
    //       personality: '活泼开朗',
    //         hobbies: '晒太阳,玩毛线球',
    //         preview_url: '/sample/1.jpg',
    //       user_id: null,
    //       popularity: 128
    //     },
    //     {
    //       id: 2,
    //       name: '金毛',
    //       type: '金毛寻回犬',
    //       personality: '温顺友善',
    //       hobbies: '游泳,捡球',
    //       preview_url: '/sample/2.jpg', 
    //       user_id: null,
    //       popularity: 256
    //     },
    //     {
    //       id: 3,
    //       name: '小黄',
    //       type: '柯尔鸭',
    //       personality: '聪明机灵',
    //       hobbies: '游泳,散步',
    //       preview_url: '/sample/3.jpg',
    //       user_id: null,
    //       popularity: 89
    //     },
    //     {
    //       id: 4,
    //       name: '雪球',
    //       type: '波斯猫',
    //       personality: '优雅安静',
    //       hobbies: '睡觉,梳毛',
    //       preview_url: '/sample/4.jpg',
    //       user_id: 123, // 已被领养
    //       popularity: 312
    //     },
    //     {
    //       id: 5,
    //       name: '哈士奇',
    //       type: '西伯利亚雪橇犬',
    //       personality: '精力充沛',
    //       hobbies: '跑步,拆家',
    //       preview_url: '/sample/5.jpg',
    //       user_id: null,
    //       popularity: 445
    //     },
    //     {
    //       id: 6,
    //       name: '小白',
    //       type: '白鸭',
    //       personality: '活泼好动',
    //       hobbies: '游泳,觅食',
    //       preview_url: '/sample/6.jpg',
    //       user_id: null,
    //       popularity: 67
    //     }
    //   ];

    //   that.setData({
    //     systemPets: mockPets,
    //     loading: false
    //   });
      
    //   // 分配瀑布流数据
    //   that.distributeWaterfallData(mockPets);
    // }, 1000); // 模拟1秒加载时间
    

    // 使用原有API调用
    // tt.showLoading({
    //   title: '加载中...'
    // });

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
          
          // 分配瀑布流数据
          that.distributeWaterfallData(res.data.data || []);
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

  // 分配瀑布流数据
  distributeWaterfallData: function(pets) {
    const leftColumnPets = [];
    const rightColumnPets = [];
    
    pets.forEach((pet, index) => {
      if (index % 2 === 0) {
        leftColumnPets.push(pet);
      } else {
        rightColumnPets.push(pet);
      }
    });
    
    this.setData({
      leftColumnPets: leftColumnPets,
      rightColumnPets: rightColumnPets
    });
  },

  // 标签切换
  onTabChange: function(e) {
    const tabKey = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tabKey
    });
    
    // 根据标签过滤宠物
    this.filterPetsByTab(tabKey);
  },

  // 根据标签过滤宠物
  filterPetsByTab: function(tabKey) {
    let filteredPets = [...this.data.systemPets];
    
    switch (tabKey) {
      case 'cat':
        filteredPets = filteredPets.filter(pet => 
          pet.type && (pet.type.includes('猫') || pet.type.includes('橘猫') || pet.type.includes('波斯猫'))
        );
        break;
      case 'dog':
        filteredPets = filteredPets.filter(pet => 
          pet.type && (pet.type.includes('犬') || pet.type.includes('狗') || pet.type.includes('金毛') || pet.type.includes('哈士奇'))
        );
        break;
      case 'duck':
        filteredPets = filteredPets.filter(pet => 
          pet.type && (pet.type.includes('鸭') || pet.type.includes('柯尔鸭') || pet.type.includes('白鸭'))
        );
        break;
      case 'popular':
        filteredPets = filteredPets.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'new':
        // 按ID倒序排列，模拟最新
        filteredPets = filteredPets.sort((a, b) => b.id - a.id);
        break;
      case 'all':
      default:
        // 显示全部，不进行过滤
        break;
    }
    
    // 重新分配瀑布流数据
    this.distributeWaterfallData(filteredPets);
  },

  // 点击宠物卡片
  onPetCardTap: function(e) {
    const petId = e.currentTarget.dataset.petId;
    const pet = this.data.systemPets.find(p => p.id === petId);
    
    if (pet) {
      // 直接显示领养弹窗
      this.setData({
        selectedPet: pet,
        showAdoptModal: true
      });
    }
  },

  // 关闭领养弹窗
  closeAdoptModal: function() {
    console.log('closeAdoptModal called, current showAdoptModal:', this.data.showAdoptModal);
    this.setData({
      showAdoptModal: false,
      selectedPet: null
    });
    console.log('showAdoptModal set to false');
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
      title: '快来领养你的Linki吧！',
      path: '/pages/presetPet/presetPet'
    };
  },

  // 搜索输入处理
  onSearchInput: function(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    
    if (keyword.trim()) {
      this.generateSearchSuggestions(keyword);
    } else {
      this.setData({
        showSuggestions: false,
        searchSuggestions: []
      });
    }
  },

  // 搜索框获得焦点
  onSearchFocus: function() {
    if (this.data.searchKeyword.trim()) {
      this.generateSearchSuggestions(this.data.searchKeyword);
    } else if (this.data.searchHistory.length > 0) {
      this.setData({
        showSuggestions: true,
        searchSuggestions: this.data.searchHistory.slice(0, 5)
      });
    }
  },

  // 搜索框失去焦点
  onSearchBlur: function() {
    // 延迟隐藏建议，让用户有时间点击建议项
    setTimeout(() => {
      this.setData({
        showSuggestions: false
      });
    }, 200);
  },

  // 搜索确认
  onSearchConfirm: function() {
    this.performSearch(this.data.searchKeyword);
  },

  // 生成搜索建议
  generateSearchSuggestions: function(keyword) {
    const suggestions = [];
    const allPets = this.data.systemPets;
    
    // 从宠物数据中提取可能的搜索词
    const searchTerms = new Set();
    
    allPets.forEach(pet => {
      if (pet.name && pet.name.includes(keyword)) {
        searchTerms.add(pet.name);
      }
      if (pet.type && pet.type.includes(keyword)) {
        searchTerms.add(pet.type);
      }
      if (pet.personality && pet.personality.includes(keyword)) {
        searchTerms.add(pet.personality);
      }
      if (pet.hobbies && pet.hobbies.includes(keyword)) {
        const hobbies = pet.hobbies.split(',');
        hobbies.forEach(hobby => {
          if (hobby.trim().includes(keyword)) {
            searchTerms.add(hobby.trim());
          }
        });
      }
    });
    
    // 添加搜索历史中匹配的词
    this.data.searchHistory.forEach(historyItem => {
      if (historyItem.includes(keyword) && !searchTerms.has(historyItem)) {
        searchTerms.add(historyItem);
      }
    });
    
    // 转换为数组并限制数量
    const suggestionArray = Array.from(searchTerms).slice(0, 8);
    
    this.setData({
      showSuggestions: true,
      searchSuggestions: suggestionArray
    });
  },

  // 选择搜索建议
  selectSuggestion: function(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword,
      showSuggestions: false
    });
    this.performSearch(keyword);
  },

  // 执行搜索
  performSearch: function(keyword) {
    if (!keyword.trim()) {
      // 如果搜索词为空，显示所有宠物
      this.filterPetsByTab(this.data.currentTab);
      return;
    }
    
    // 保存搜索历史
    this.saveSearchHistory(keyword);
    
    // 隐藏建议
    this.setData({
      showSuggestions: false
    });
    
    // 执行搜索过滤
    const filteredPets = this.data.systemPets.filter(pet => {
      const searchLower = keyword.toLowerCase();
      return (
        (pet.name && pet.name.toLowerCase().includes(searchLower)) ||
        (pet.type && pet.type.toLowerCase().includes(searchLower)) ||
        (pet.personality && pet.personality.toLowerCase().includes(searchLower)) ||
        (pet.hobbies && pet.hobbies.toLowerCase().includes(searchLower))
      );
    });
    
    // 重新分配瀑布流数据
    this.distributeWaterfallData(filteredPets);
  },

  // 清除搜索
  clearSearch: function() {
    this.setData({
      searchKeyword: '',
      showSuggestions: false,
      searchSuggestions: []
    });
    
    // 恢复显示所有宠物
    this.filterPetsByTab(this.data.currentTab);
  },

  // 保存搜索历史
  saveSearchHistory: function(keyword) {
    let history = [...this.data.searchHistory];
    
    // 移除重复项
    history = history.filter(item => item !== keyword);
    
    // 添加到开头
    history.unshift(keyword);
    
    // 限制历史记录数量
    history = history.slice(0, 10);
    
    this.setData({
      searchHistory: history
    });
    
    // 保存到本地存储
    tt.setStorageSync('petSearchHistory', history);
  },

  // 加载搜索历史
  loadSearchHistory: function() {
    const history = tt.getStorageSync('petSearchHistory') || [];
    this.setData({
      searchHistory: history
    });
  },

  // 随机选择宠物 - 启动抽卡效果
  onRandomSelect: function() {
    const availablePets = this.data.systemPets;
    
    if (!availablePets || availablePets.length === 0) {
      tt.showToast({
        title: '暂无可选择的宠物',
        icon: 'none'
      });
      return;
    }

    // 随机选择一个宠物
    const randomIndex = Math.floor(Math.random() * availablePets.length);
    const randomPet = availablePets[randomIndex];
    
    // 开始抽卡动画
    this.startCardDrawAnimation(randomPet);
  },

  // 开始抽卡动画
  startCardDrawAnimation: function(selectedPet) {
    const that = this;
    
    // 重置抽卡状态
    this.setData({
      selectedPet: selectedPet,
      showCardDraw: true,
      cardFlipped: false,
      cardRevealed: false,
      cardDrawText: '正在召唤神秘伙伴...'
    });

    // 第一阶段：显示卡牌背面并开始浮动
    setTimeout(() => {
      that.setData({
        cardDrawText: '命运的齿轮正在转动...'
      });
    }, 1500);

    // 第二阶段：翻转卡牌
    setTimeout(() => {
      that.setData({
        cardFlipped: true,
        cardDrawText: '即将揭晓你的专属伙伴！'
      });
    }, 3000);

    // 第三阶段：显示卡牌正面
    setTimeout(() => {
      that.setData({
        cardRevealed: true
      });
    }, 4000);

    // 第四阶段：自动关闭抽卡界面并显示领养弹窗
    setTimeout(() => {
      that.closeCardDrawAnimation();
    }, 7000);
  },

  // 跳过抽卡动画
  skipCardAnimation: function() {
    if (this.data.cardRevealed) {
      this.closeCardDrawAnimation();
    } else {
      // 快速完成动画
      this.setData({
        cardFlipped: true,
        cardRevealed: true,
        cardDrawText: '恭喜获得新伙伴！'
      });
      
      setTimeout(() => {
        this.closeCardDrawAnimation();
      }, 1000);
    }
  },

  // 关闭抽卡动画
  closeCardDrawAnimation: function() {
    this.setData({
      showCardDraw: false,
      cardFlipped: false,
      cardRevealed: false
    });
    
    // 显示领养确认弹窗
    setTimeout(() => {
      this.setData({
        showAdoptModal: true
      });
    }, 300);
  }
});