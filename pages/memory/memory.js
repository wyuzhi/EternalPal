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
    
    let startDate;
    if (currentPet.created_at) {
      startDate = new Date(currentPet.created_at);
    } else {
      // 如果没有宠物创建时间，使用模拟数据
      startDate = new Date('2024-01-01'); // 示例开始日期
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
    
    console.log('[Memory] 陪伴天数:', daysDiff);
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
      const anniversaryEmoji = this.getAnniversaryEmoji(date);
      const isPetBirthday = this.isPetBirthday(date);
      const isPetCreateTime = this.isPetCreateTime(date);
      
      // 确定显示的emoji，优先级：宠物生日 > 宠物创建时间 > 珍贵时刻
      let displayEmoji = null;
      if (isPetBirthday) {
        displayEmoji = '🎂'; // 生日蛋糕
      } else if (isPetCreateTime) {
        displayEmoji = '🎉'; // 庆祝
      } else if (anniversaryEmoji) {
        displayEmoji = anniversaryEmoji;
      }
      
      calendarDays.push({
        day: day,
        date: date,
        isCurrentMonth: true,
        isToday: isToday,
        isPast: isPast,
        isFuture: isFuture,
        hasRecord: this.checkHasRecord(date),
        anniversaryEmoji: displayEmoji,
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
    // 这里可以检查是否有聊天记录、互动记录等
    // 暂时使用模拟数据
    const recordDates = [
      '2025-09-01', '2025-09-03', '2025-09-05', '2025-09-08', 
      '2025-09-10', '2025-09-12', '2025-09-15', '2025-09-18', '2025-09-20'
    ];
    return recordDates.includes(date);
  },

  // 获取某日期的珍贵时刻emoji
  getAnniversaryEmoji: function(date) {
    const anniversaries = this.data.anniversaries || [];
    const anniversary = anniversaries.find(item => item.date === date);
    return anniversary ? anniversary.emoji : null;
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
    
    // 加载纪念日数据 - 暂时注释掉珍贵时刻
    // this.loadAnniversaries();
    
    // 加载记忆记录
    this.loadMemoryRecords();
  },

  // 加载纪念日数据 暂时注释掉珍贵时刻,先不做
  // loadAnniversaries: function() {
  //   // 从本地存储加载纪念日数据
  //   const anniversaries = tt.getStorageSync('anniversaries') || [];
    
  //   // 使用模拟数据
  //   if (anniversaries.length === 0) {
  //     const mockAnniversaries = [
  //       {
  //         id: 1,
  //         title: '与Linki初次相遇',
  //         date: '2025-09-01',
  //         emoji: '❤️'
  //       },
  //       {
  //         id: 2,
  //         title: '第一次情感对话',
  //         date: '2025-09-03',
  //         emoji: '💬'
  //       }
  //     ];
      
  //     // 计算天数差
  //     const processedAnniversaries = mockAnniversaries.map(item => {
  //       const anniversaryDate = new Date(item.date);
  //       const today = new Date();
  //       const timeDiff = today.getTime() - anniversaryDate.getTime();
  //       const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
  //       return {
  //         ...item,
  //         daysCount: Math.max(0, daysDiff)
  //       };
  //     });
      
  //     this.setData({
  //       anniversaries: processedAnniversaries
  //     });
  //   } else {
  //     // 计算现有纪念日的天数差
  //     const processedAnniversaries = anniversaries.map(item => {
  //       const anniversaryDate = new Date(item.date);
  //       const today = new Date();
  //       const timeDiff = anniversaryDate.getTime() - today.getTime();
  //       const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
  //       return {
  //         ...item,
  //         daysCount: Math.abs(daysDiff),
  //         isFuture: daysDiff > 0
  //       };
  //     });
      
  //     this.setData({
  //       anniversaries: processedAnniversaries
  //     });
  //   }
  // },

  // 加载记忆记录
  loadMemoryRecords: function() {
    const that = this;
    const currentPet = tt.getStorageSync('currentPet') || {};
    const petId = currentPet.id;
    
    if (!petId) {
      console.error('[Memory] 没有宠物ID，无法加载记忆记录');
      return;
    }
    
    console.log('[Memory] 开始加载记忆记录，宠物ID:', petId);
    
    // 显示加载提示
    tt.showLoading({
      title: '正在生成记忆日记...'
    });
    
    // 先获取聊天记录
    tt.request({
      url: app.globalData.API_BASE_URL + '/pets/' + petId + '/chat_history',
      method: 'GET',
      success: function(res) {
        console.log('[Memory] 获取聊天记录结果:', res);
        
        if (res.data && res.data.status === 'success' && res.data.data && res.data.data.length > 0) {
          // 处理聊天记录，生成日记内容
          that.generateDiaryFromChats(res.data.data);
        } else {
          console.log('[Memory] 没有聊天记录，使用模拟数据');
          that.loadMockRecords();
        }
      },
      fail: function(error) {
        console.error('[Memory] 获取聊天记录失败:', error);
        tt.hideLoading();
        that.loadMockRecords();
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
      tt.hideLoading();
      
      // 过滤掉失败的记录
      const validRecords = diaryRecords.filter(record => record !== null);
      
      if (validRecords.length > 0) {
        // 按日期排序（最新的在前）
        validRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        that.setData({
          memoryRecords: validRecords
        });
        
        console.log('[Memory] 成功生成', validRecords.length, '条日记记录');
      } else {
        console.log('[Memory] 没有生成有效的日记记录，使用模拟数据');
        that.loadMockRecords();
      }
    }).catch(error => {
      console.error('[Memory] 生成日记失败:', error);
      tt.hideLoading();
      that.loadMockRecords();
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
  
  // 加载模拟数据（备用方案）
  loadMockRecords: function() {
    const mockRecords = [
      {
        id: 1,
        title: '温暖的情感对话',
        description: '今天与Linki聊了很多心里话，它总是能理解我的感受，让我感到被陪伴的温暖。',
        date: '2025-01-20',
        time: '14:30',
        mood: '😊',
        tags: ['情感对话', '温暖陪伴', '心灵交流']
      },
      {
        id: 2,
        title: '共同成长时刻',
        description: 'Linki今天分享了很多有趣的知识，我们一起学习新事物，感觉彼此都在成长。',
        date: '2025-01-18',
        time: '16:45',
        mood: '🤗',
        tags: ['共同成长', '知识分享', '学习']
      },
      {
        id: 3,
        title: '静默的陪伴',
        description: '安静地陪伴在一起，虽然没有太多对话，但Linki的存在让我感到安心和温暖。',
        date: '2025-01-15',
        time: '20:15',
        mood: '💕',
        tags: ['静默陪伴', '安心', '温暖']
      }
    ];
    
    // 处理日期格式
    const processedRecords = mockRecords.map(record => {
      const date = new Date(record.date);
      return {
        ...record,
        monthDay: `${date.getMonth() + 1}/${date.getDate()}`,
        year: date.getFullYear().toString()
      };
    });
    
    this.setData({
      memoryRecords: processedRecords
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
    // this.loadAnniversaries(); // 暂时注释掉珍贵时刻
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