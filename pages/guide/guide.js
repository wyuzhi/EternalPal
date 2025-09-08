// 获取全局应用实例
const app = getApp()

Page({
  data: {
    currentSlide: 0, // 当前滑块索引
    welcomeImages: [
      '/images/index_1.png',
      '/images/index_2.png',
      '/images/index_3.png'
    ],
    stepsImages: [
      '/images/guide/steps/step_1.svg',
      '/images/guide/steps/step_2.svg',
      '/images/guide/steps/step_3.svg',
      '/images/guide/steps/step_4.svg'
    ],
    stepsLabels: [
      '选择宠物类型',
      '行为特征收集', 
      '上传照片',
      '声音采集'
    ],
    isAuthorized: false,
    userName: '你好呀', // 用户名，默认值为"你好呀"
    showWelcomeAnimation: false // 控制欢迎图片动画显示
  },
  onLoad: function (options) {
    console.log('应用启动')
    console.log('Guide页面参数:', options);
    
    // 检查是否来自分享链接
    if (options && options.isShare === 'true') {
      console.log('Guide页面: 来自分享链接，来源:', options.from);
      tt.showToast({
        title: '欢迎来到灵伴 EternalPal！',
        icon: 'none',
        duration: 3000
      });
    }
    
    // 页面加载时自动尝试登录
    this.loginAndCheckUser()
  },


  // 抖音登录并检查用户状态 - 基于抖音小程序登录文档实现
  loginAndCheckUser: function() {
    const that = this
    

    
    // 使用全局登录方法
    app.login().then(code => {
      console.log('获取登录凭证成功，code:', code)
      // 将code发送到后端换取openid/douyin_id并创建用户记录
      that.sendCodeToBackend(code)
    }).catch(error => {
      console.error('获取登录凭证失败:', error)
      that.handleLoginFailure()
    })
  },
  
  // 发送code到后端并处理响应
  sendCodeToBackend: function(code) {
    const that = this
    const apiUrl = app.globalData.API_BASE_URL + '/users/login'
    
    tt.request({
      url: apiUrl,
      method: 'POST',
      data: {
        code: code
      },
      timeout: 15000, // 延长超时时间至15秒
      success: (loginResponse) => {
        console.log('后端登录响应:', loginResponse)
        if (loginResponse.data && loginResponse.data.douyin_id && loginResponse.data.user_id) {
          const douyinId = loginResponse.data.douyin_id
          const userId = loginResponse.data.user_id
          
          const userInfo = {
            id: userId,
            douyin_id: douyinId
          }
          
          // 更新全局用户信息
          app.setUserInfo(userInfo)
          
          console.log('用户登录成功，ID:', userId, '抖音ID:', douyinId)
          
          // 3. 检查用户是否有宠物
          that.checkUserHasPets(userId)
        } else {
          console.error('登录失败，未获取到用户标识', loginResponse.data)
          that.handleLoginFailure()
        }
      },
      fail: (error) => {
        console.error('登录请求失败:', error)
        // 添加重试逻辑
        that.retryLogin(code)
      }
    })
  },
  
  // 重试登录
  retryLogin: function(code) {
    const that = this
    
    setTimeout(() => {
      console.log('尝试重试登录')
      const apiUrl = app.globalData.API_BASE_URL + '/users/login'
      
      tt.request({
        url: apiUrl,
        method: 'POST',
        data: {
          code: code
        },
        timeout: 15000,
        success: (retryResponse) => {
          if (retryResponse.data && retryResponse.data.douyin_id && retryResponse.data.user_id) {
            const userInfo = {
              id: retryResponse.data.user_id,
              douyin_id: retryResponse.data.douyin_id
            }
            // 更新全局用户信息
            app.setUserInfo(userInfo)
            that.checkUserHasPets(retryResponse.data.user_id)
          } else {
            console.error('重试登录失败，未获取到用户标识')
            that.handleLoginFailure()
          }
        },
        fail: (retryError) => {
          console.error('重试登录请求失败:', retryError)
          that.handleLoginFailure()
        }
      })
    }, 2000) // 2秒后重试
  },
  
  // 处理登录失败
  handleLoginFailure: function() {
    const that = this
    
    // 显示错误提示
    tt.showToast({
      title: '登录失败，请检查网络连接',
      icon: 'none',
      duration: 2000
    })
    
    // 设置授权状态为true，允许用户继续使用基础功能
    that.setData({ isAuthorized: true })
    
    // 触发欢迎图片动画
    that.triggerWelcomeAnimation()
    
    // 清除可能存在的无效用户信息
    app.logout()
  },

  // 检查用户是否有宠物
  checkUserHasPets: function(userId) {
    const that = this
    const apiUrl = app.globalData.API_BASE_URL + '/users/' + userId + '/has_pets'
    
    tt.request({
      url: apiUrl,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.has_pets) {
          // 用户有宠物，跳转到陪伴页面
          tt.navigateTo({
            url: '/pages/companion/companion'
          })
        } else {
          // 用户没有宠物，停留在当前页面
          that.setData({ isAuthorized: true })
          // 触发欢迎图片动画
          that.triggerWelcomeAnimation()
        }
      },
      fail: (error) => {
        console.error('检查宠物状态失败:', error)
        that.setData({ isAuthorized: true })
        // 触发欢迎图片动画
        that.triggerWelcomeAnimation()
      }
    })
  },

  // 触发欢迎图片滑入动画
  triggerWelcomeAnimation: function() {
    const that = this
    // 延迟一点时间确保页面渲染完成
    setTimeout(() => {
      that.setData({
        showWelcomeAnimation: true
      })
    }, 300)
  },

  // 滑动切换事件处理
  onSlideChange: function(e) {
    const currentIndex = e.detail.current
    this.setData({
      currentSlide: currentIndex
    })
  },

  // 分页指示器点击事件
  onDotTap: function(e) {
    const targetIndex = e.currentTarget.dataset.index
    console.log('点击分页指示器，跳转到第', targetIndex + 1, '页')
    this.setData({
      currentSlide: targetIndex
    })
  },

  // 继续按钮点击事件
  onContinueClick: function() {
    const currentSlide = this.data.currentSlide
    
    if (currentSlide === 0) {
      // 切换到下一滑块
      this.setData({
        currentSlide: 1
      })
    } else if (currentSlide === 1) {
      // Slide2: 跳转至后续业务流程
      this.enterPetPage()
    }
  },

  // 进入萌宠页面
  enterPetPage: function() {
    tt.navigateTo({
      url: '/pages/pet/pet'
    })
  }
})
