// 获取全局应用实例
const app = getApp()

Page({
  data: {
    showWelcome: true,
    welcomeImages: [
      '/images/index_1.png',
      '/images/index_2.png',
      '/images/index_3.png',
      '/images/index_4.png'
    ],
    stepsImages: [
      '/images/index_4.png',
      '/images/index_5.png',
      '/images/index_6.png',
      '/images/index_7.png'
    ],
    isAuthorized: false
  },
  onLoad: function () {
    console.log('AI萌宠应用启动')
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
        }
      },
      fail: (error) => {
        console.error('检查宠物状态失败:', error)
        that.setData({ isAuthorized: true })
      }
    })
  },

  // 显示步骤界面
  showSteps: function() {
    this.setData({
      showWelcome: false
    })
  },

  // 进入萌宠页面
  enterPetPage: function() {
    tt.navigateTo({
      url: '/pages/pet/pet'
    })
  }
})
