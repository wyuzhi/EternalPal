const app = getApp();

Page({
  data: {
    // 陪伴天数
    companionDays: 0,
    daysDigits: [],
      // 宠物信息
      petName: '',
      petBirthday: '', // 宠物生日
      petCreateTime: '', // 宠物创建时间
    
    // 日历相关
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    
    // 纪念日相关
    anniversaries: [],
    showAnniversaryModal: false,
    newAnniversary: {
      title: '',
      date: '',
      emoji: '🎉'
    },
    emojiOptions: ['🎉', '❤️', '🎂', '💕', '🌟', '🎈', '🥳', '💖', '🎊', '🌈', '🍀', '💝'],
    
    // 记忆记录
    memoryRecords: [],
    
    // 系统信息
    safeAreaBottom: 0
  },

  onLoad: function(options) {
    console.log('[Memory] 记忆页面加载');
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 初始化数据
    this.initData();
    
    // 加载数据
    this.loadMemoryData();
    
    // 生成日历（在数据加载完成后）
    setTimeout(() => {
      this.generateCalendar();
    }, 100);
  },

  // 获取系统信息
  getSystemInfo: function() {
    const that = this;
    tt.getSystemInfo({
      success: function(res) {
        console.log('[Memory] 获取系统信息成功:', res);
        
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
        console.error('[Memory] 获取系统信息失败:', error);
        that.setData({
          safeAreaBottom: 0
        });
      }
    });
  },

  // 初始化数据
  initData: function() {
    console.log('[Memory] 初始化数据');
    
    // 获取宠物信息
    this.loadPetInfo();
    
    // 计算陪伴天数
    this.calculateCompanionDays();
    
    // 初始化数字显示
    this.initDaysDigits(this.data.companionDays);
  },

  // 加载宠物信息
  loadPetInfo: function() {
    console.log('[Memory] 加载宠物信息');
    
    // 从本地存储获取当前宠物信息
    const currentPet = tt.getStorageSync('currentPet') || {};
    
      if (currentPet.name) {
        this.setData({
          petName: currentPet.name,
          petBirthday: currentPet.birthday || '',
          petCreateTime: currentPet.createTime || ''
        });
        console.log('[Memory] 宠物名称:', currentPet.name);
        console.log('[Memory] 宠物生日:', currentPet.birthday);
        console.log('[Memory] 宠物创建时间:', currentPet.createTime);
      } else {
        console.log('[Memory] 未找到宠物信息');
      }
  },

  // 计算陪伴天数
  calculateCompanionDays: function() {
    // 从本地存储或全局数据获取宠物创建时间
    const userInfo = tt.getStorageSync('userInfo') || {};
    const currentPet = tt.getStorageSync('currentPet') || {};
    
    console.log('[Memory] 当前宠物数据:', currentPet);
    
    let startDate;
    if (currentPet.created_at) {
      startDate = new Date(currentPet.created_at);
      console.log('[Memory] 使用宠物创建时间:', currentPet.created_at);
    } else {
      // 如果没有宠物创建时间，尝试从服务器获取最新信息
      console.log('[Memory] 未找到创建时间，尝试从服务器获取最新宠物信息');
      this.fetchLatestPetInfo();
      return; // 等待服务器返回后再计算
    }
    
    const today = new Date();
    const timeDiff = today.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const newDays = Math.max(1, daysDiff); // 至少显示1天
    
    // 如果天数发生变化，触发翻页动画
    if (newDays !== this.data.companionDays) {
      this.animateDaysChange(this.data.companionDays, newDays);
    }
    
    this.setData({
      companionDays: newDays
    });
    
    console.log('[Memory] 陪伴天数计算 - 开始时间:', startDate, '今天:', today, '天数:', newDays);
  },

  // 从服务器获取最新宠物信息
  fetchLatestPetInfo: function() {
    const userInfo = tt.getStorageSync('userInfo') || {};
    if (!userInfo.id) {
      console.log('[Memory] 未找到用户信息，使用当前时间作为开始时间');
      this.calculateCompanionDaysWithCurrentTime();
      return;
    }

    const that = this;
    tt.request({
      url: app.globalData.API_BASE_URL + '/users/' + userInfo.id + '/latest_pet',
      method: 'GET',
      success: function(res) {
        console.log('[Memory] 获取最新宠物信息结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data) {
          const latestPet = res.data.data;
          
          // 更新本地存储的宠物信息
          tt.setStorageSync('currentPet', latestPet);
          
          // 重新计算陪伴天数
          that.calculateCompanionDays();
        } else {
          console.log('[Memory] 未获取到宠物信息，使用当前时间');
          that.calculateCompanionDaysWithCurrentTime();
        }
      },
      fail: function(error) {
        console.error('[Memory] 获取最新宠物信息失败:', error);
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
    
    // 如果天数发生变化，触发翻页动画
    if (newDays !== this.data.companionDays) {
      this.animateDaysChange(this.data.companionDays, newDays);
    }
    
    this.setData({
      companionDays: newDays
    });
    
    this.initDaysDigits(newDays);
    
    console.log('[Memory] 使用当前时间计算陪伴天数:', newDays);
  },

  // 初始化数字显示
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

  // 数字翻页动画
  animateDaysChange: function(oldDays, newDays) {
    const oldStr = oldDays.toString();
    const newStr = newDays.toString();
    
    // 确保两个数字字符串长度相同，不足的用0补齐
    const maxLength = Math.max(oldStr.length, newStr.length);
    const oldPadded = oldStr.padStart(maxLength, '0');
    const newPadded = newStr.padStart(maxLength, '0');
    
    const digits = [];
    
    // 初始化所有数字位
    for (let i = 0; i < maxLength; i++) {
      digits.push({
        current: oldPadded[i],
        next: newPadded[i],
        isAnimating: false
      });
    }
    
    this.setData({
      daysDigits: digits
    });
    
    // 逐位触发翻页动画
    for (let i = 0; i < maxLength; i++) {
      if (oldPadded[i] !== newPadded[i]) {
        setTimeout(() => {
          this.flipDigit(i);
        }, i * 100); // 每个数字位延迟100ms，创造波浪效果
      }
    }
  },

  // 单个数字位翻页
  flipDigit: function(index) {
    const digits = this.data.daysDigits;
    if (index >= digits.length) return;
    
    // 开始翻页动画
    digits[index].isAnimating = true;
    this.setData({
      daysDigits: digits
    });
    
    // 动画完成后更新数字
    setTimeout(() => {
      digits[index].current = digits[index].next;
      digits[index].isAnimating = false;
      this.setData({
        daysDigits: digits
      });
    }, 300); // 动画持续时间的一半
  },

  // 生成日历
  generateCalendar: function() {
    console.log('[Memory] 生成日历');
    
    const year = this.data.currentYear;
    const month = this.data.currentMonth;
    const today = new Date();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekDay = firstDay.getDay(); // 0 = 周日
    
    const calendarDays = [];
    
    // 填充上个月的日期
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();
    
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      calendarDays.push({
        day: day,
        date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false,
        hasRecord: false
      });
    }
    
    // 填充当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const currentDate = new Date(year, month - 1, day);
      const isToday = (
        today.getFullYear() === year &&
        today.getMonth() + 1 === month &&
        today.getDate() === day
      );
      const isPast = currentDate < today && !isToday;
      const isFuture = currentDate > today;
      const isPetBirthday = this.isPetBirthday(date);
      const isPetCreateTime = this.isPetCreateTime(date);
      
      // 确定显示的emoji，优先级：宠物生日 > 宠物创建时间 > 珍贵时刻
      let displayEmoji = null;
      if (isPetBirthday) {
        displayEmoji = '🎂'; // 生日蛋糕
      } else if (isPetCreateTime) {
        displayEmoji = '🎉'; // 庆祝
      }
      
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: true,
        isToday: isToday,
        isPast: isPast,
        isFuture: isFuture,
        hasRecord: this.checkHasRecord(date),
        isPetBirthday: isPetBirthday,
        isPetCreateTime: isPetCreateTime
      });
    }
    
    // 填充下个月的日期，只填充最后一行的空位
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    let nextDay = 1;
    
    // 计算最后一行需要补充的天数
    const totalDays = calendarDays.length;
    const remainingCells = totalDays % 7;
    
    // 如果最后一行不完整，则补充下个月的日期
    if (remainingCells !== 0) {
      const cellsToFill = 7 - remainingCells;
      for (let i = 0; i < cellsToFill; i++) {
        const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
        calendarDays.push({
          day: nextDay,
          date: date,
          isCurrentMonth: false,
          isToday: false,
          hasRecord: false
        });
        nextDay++;
      }
    }
    
    this.setData({
      calendarDays: calendarDays
    });
  },

  // 检查某日期是否有记录
  checkHasRecord: function(date) {
    // 检查记忆记录中是否有该日期的记录
    const memoryRecords = this.data.memoryRecords || [];
    return memoryRecords.some(record => record.date === date);
  },

  // 检查是否为宠物生日
  isPetBirthday: function(date) {
    const petBirthday = this.data.petBirthday;
    if (!petBirthday) return false;
    
    // 提取月日部分进行比较
    const birthdayMonthDay = petBirthday.substring(5); // 获取 MM-DD 部分
    const dateMonthDay = date.substring(5); // 获取 MM-DD 部分
    
    return birthdayMonthDay === dateMonthDay;
  },

  // 检查是否为宠物创建时间
  isPetCreateTime: function(date) {
    const petCreateTime = this.data.petCreateTime;
    if (!petCreateTime) return false;
    
    // 提取日期部分进行比较
    const createDate = petCreateTime.substring(0, 10); // 获取 YYYY-MM-DD 部分
    return createDate === date;
  },

  // 加载记忆数据
  loadMemoryData: function() {
    console.log('[Memory] 加载记忆数据');
    
    // 加载记忆记录
    this.loadMemoryRecords();
  },

  // 加载记忆记录
  loadMemoryRecords: function() {
    const that = this;
    const currentPet = tt.getStorageSync('currentPet') || {};
    const petId = currentPet.id;
    
    if (!petId) {
      console.error('[Memory] 没有宠物ID，无法加载记忆记录');
      // 设置空的记忆记录
      this.setData({
        memoryRecords: []
      });
      return;
    }
    
    console.log('[Memory] 开始加载记忆记录，宠物ID:', petId);
    
    // 显示加载提示
    tt.showLoading({
      title: '加载记忆中...',
      mask: true
    });
    
    // 获取聊天记录并生成真实日记
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + petId + '/chat_history',
      method: 'GET',
      success: function(res) {
        console.log('[Memory] 获取聊天记录结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data && res.data.data.length > 0) {
          // 处理聊天记录，生成日记内容
          that.generateDiaryFromChats(res.data.data, false);
        } else {
          console.log('[Memory] 没有聊天记录');
          that.setData({
            memoryRecords: []
          });
          tt.hideLoading();
          tt.showToast({
            title: '暂无记忆记录',
            icon: 'none',
            duration: 1500
          });
        }
      },
      fail: function(error) {
        console.error('[Memory] 获取聊天记录失败:', error);
        that.setData({
          memoryRecords: []
        });
        tt.hideLoading();
        tt.showToast({
          title: '加载记忆失败',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },
  
  // 从聊天记录生成日记
  generateDiaryFromChats: function(chatHistory) {
    const that = this;
    
    // 将聊天记录按日期分组
    const chatsByDate = that.groupChatsByDate(chatHistory);
    const diaryPromises = [];
    
    // 为每一天的聊天记录生成日记
    Object.keys(chatsByDate).forEach(date => {
      const dayChats = chatsByDate[date];
      const chatContent = that.formatChatsForAPI(dayChats);
      
      if (chatContent.trim()) {
        const promise = that.callDiaryAPI(chatContent, date);
        diaryPromises.push(promise);
      }
    });
    
    // 等待所有日记生成完成
    Promise.all(diaryPromises).then(diaryRecords => {
      // 过滤掉失败的记录
      const validRecords = diaryRecords.filter(record => record !== null);
      
      if (validRecords.length > 0) {
        // 按日期排序（最新的在前）
        validRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 更新数据
        that.setData({
          memoryRecords: validRecords
        });
        
        console.log('[Memory] 成功生成', validRecords.length, '条日记记录');
        
        // 隐藏加载提示
        tt.hideLoading();
        
        // 显示成功提示
        tt.showToast({
          title: '记忆加载完成',
          icon: 'success',
          duration: 1500
        });
      } else {
        console.log('[Memory] 没有生成有效的日记记录');
        that.setData({
          memoryRecords: []
        });
        tt.hideLoading();
        tt.showToast({
          title: '暂无记忆记录',
          icon: 'none',
          duration: 1500
        });
      }
    }).catch(error => {
      console.error('[Memory] 生成日记失败:', error);
      that.setData({
        memoryRecords: []
      });
      tt.hideLoading();
      tt.showToast({
        title: '生成记忆失败',
        icon: 'none',
        duration: 1500
      });
    });
  },
  
  // 按日期分组聊天记录
  groupChatsByDate: function(chatHistory) {
    const chatsByDate = {};
    
    chatHistory.forEach(chat => {
      const chatDate = new Date(chat.created_at || chat.timestamp * 1000);
      const dateKey = chatDate.toISOString().split('T')[0]; // YYYY-MM-DD格式
      
      if (!chatsByDate[dateKey]) {
        chatsByDate[dateKey] = [];
      }
      
      chatsByDate[dateKey].push(chat);
    });
    
    return chatsByDate;
  },
  
  // 格式化聊天记录为API所需格式
  formatChatsForAPI: function(dayChats) {
    const chatContent = dayChats.map(chat => {
      const speaker = chat.is_user || chat.isUser ? '主人' : '宠物';
      const content = chat.content || chat.text;
      return `${speaker}: ${content}`;
    }).join('\n');
    
    return chatContent;
  },
  
  // 调用日记生成API
  callDiaryAPI: function(chatContent, date) {
    return new Promise((resolve) => {
      tt.request({
        url: 'http://156.254.6.237:1666/api/process',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          content: chatContent,
          type: 'cp'
        },
        success: function(res) {
          console.log('[Memory] 日记API调用成功:', res);
          
          if (res.data && res.data.daily_feeling) {
            const diaryRecord = {
              id: Date.now() + Math.random(), // 生成唯一ID
              title: res.data.pet_perspective || '今日回忆',
              description: res.data.daily_feeling,
              date: date,
              time: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
              mood: res.data.emoji_icon || '😊',
              tags: res.data.tags || ['日常陪伴'],
              monthDay: `${new Date(date).getMonth() + 1}/${new Date(date).getDate()}`,
              year: new Date(date).getFullYear().toString()
            };
            
            resolve(diaryRecord);
          } else {
            console.error('[Memory] 日记API返回数据格式错误:', res.data);
            resolve(null);
          }
        },
        fail: function(error) {
          console.error('[Memory] 日记API调用失败:', error);
          resolve(null);
        }
      });
    });
  },
  

  // 添加纪念日按钮点击
  onAddAnniversary: function() {
    console.log('[Memory] 点击添加纪念日');
    this.setData({
      showAnniversaryModal: true,
      newAnniversary: {
        title: '',
        date: '',
        emoji: '🎉'
      }
    });
  },

  // 关闭纪念日弹窗
  onCloseAnniversaryModal: function() {
    this.setData({
      showAnniversaryModal: false
    });
  },

  // 纪念日名称输入
  onAnniversaryTitleInput: function(e) {
    this.setData({
      'newAnniversary.title': e.detail.value
    });
  },

  // 纪念日日期选择
  onAnniversaryDateChange: function(e) {
    this.setData({
      'newAnniversary.date': e.detail.value
    });
  },

  // 选择表情
  onSelectEmoji: function(e) {
    const emoji = e.currentTarget.dataset.emoji;
    this.setData({
      'newAnniversary.emoji': emoji
    });
  },

  // 保存纪念日
  onSaveAnniversary: function() {
    const newAnniversary = this.data.newAnniversary;
    
    // 验证输入
    if (!newAnniversary.title.trim()) {
      tt.showToast({
        title: '请输入时刻名称',
        icon: 'none'
      });
      return;
    }
    
    if (!newAnniversary.date) {
      tt.showToast({
        title: '请选择日期',
        icon: 'none'
      });
      return;
    }
    
    // 计算天数差
    const anniversaryDate = new Date(newAnniversary.date);
    const today = new Date();
    const timeDiff = today.getTime() - anniversaryDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    // 创建新纪念日对象
    const anniversary = {
      id: Date.now(),
      title: newAnniversary.title.trim(),
      date: newAnniversary.date,
      emoji: newAnniversary.emoji,
      daysCount: Math.max(0, daysDiff)
    };
    
    // 添加到列表
    const updatedAnniversaries = [...this.data.anniversaries, anniversary];
    
    // 按日期排序（最新的在前）
    updatedAnniversaries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    this.setData({
      anniversaries: updatedAnniversaries,
      showAnniversaryModal: false
    });
    
    // 保存到本地存储
    tt.setStorageSync('anniversaries', updatedAnniversaries);
    
    tt.showToast({
      title: '珍贵时刻记录成功',
      icon: 'success'
    });
    
    console.log('[Memory] 珍贵时刻记录成功:', anniversary);
  },

  // 页面显示时刷新数据
  onShow: function() {
    console.log('[Memory] 页面显示');
    // 可以在这里刷新数据，比如重新计算陪伴天数
    this.loadPetInfo();
    this.calculateCompanionDays();
  },

  // 测试翻页动画（长按陪伴天数区域触发）
  onDaysLongPress: function() {
    console.log('[Memory] 测试翻页动画');
    const currentDays = this.data.companionDays;
    const testDays = currentDays + Math.floor(Math.random() * 10) + 1;
    this.animateDaysChange(currentDays, testDays);
    this.setData({
      companionDays: testDays
    });
    
    tt.showToast({
      title: '翻页动画测试',
      icon: 'none',
      duration: 1000
    });
  },

  // 页面分享
  onShareAppMessage: function() {
    return {
      title: '我的情感记忆 - Linki',
      path: '/pages/guide/guide?from=share&isShare=true',
      templateId: "3h8i11h04d3g40njx3"
    };
  }
});