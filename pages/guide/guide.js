// 获取全局应用实例
const app = getApp()

Page({
  data: {
    isAuthorized: false,
    userName: '你好呀', // 用户名，默认值为"你好呀"
    showBlindBoxModal: false, // 控制盲盒弹窗显示
    hasGetUserProfile: false // 标记是否已经获取过用户信息
  },

  onLoad: function (options) {
    console.log('Choice页面加载')
    console.log('Choice页面参数:', options);
    
    // 检查是否来自分享链接
    if (options && options.isShare === 'true') {
      console.log('Choice页面: 来自分享链接，来源:', options.from);
      tt.showToast({
        title: '欢迎来到灵伴 EternalPal！',
        icon: 'none',
        duration: 3000
      });
    }
    
    // 页面加载时自动尝试登录
    this.loginAndCheckUser()
  },

  // 抖音登录并检查用户状态 - 复用guide页面的登录逻辑
  loginAndCheckUser: function() {
    const that = this
    
    // 使用全局登录方法
    app.login().then(code => {
      console.log('获取登录凭证成功，code:', code)
      // 先进行基础登录，不获取用户详细信息
      that.sendCodeToBackend(code, null, null)
    }).catch(error => {
      console.error('获取登录凭证失败:', error)
      that.handleLoginFailure()
    })
  },
  
  // 在用户点击时获取用户信息并更新（只获取一次）
  getUserProfileAndUpdate: function() {
    const that = this
    
    // 如果已经获取过用户信息，直接返回
    if (this.data.hasGetUserProfile) {
      console.log('已获取过用户信息，跳过')
      return
    }
    
    // 使用tt.getUserProfile获取用户信息（必须在点击事件中调用）
    tt.getUserProfile({
      success: (userProfileRes) => {
        console.log('获取用户信息成功:', userProfileRes)
        const userInfo = userProfileRes.userInfo
        
        // 标记已获取用户信息
        that.setData({
          hasGetUserProfile: true
        })
        
        // 更新后端用户信息
        that.updateUserProfile(userInfo.nickName, userInfo.avatarUrl)
      },
      fail: (error) => {
        console.log('获取用户信息失败:', error)
        // 即使获取失败也标记为已尝试获取，避免重复弹窗
        that.setData({
          hasGetUserProfile: true
        })
      }
    })
  },
  
  // 更新用户信息到后端
  updateUserProfile: function(nickName, avatarUrl) {
    const that = this
    const userInfo = app.getUserInfo()
    
    if (!userInfo || !userInfo.id) {
      console.log('用户未登录，无法更新信息')
      return
    }
    
    tt.request({
      url: app.globalData.API_BASE_URL + '/users/update-profile',
      method: 'POST',
      data: {
        user_id: userInfo.id,
        name: nickName,
        headp: avatarUrl
      },
      success: (response) => {
        console.log('用户信息更新成功:', response)
        // 更新本地用户信息
        const updatedUserInfo = {
          ...userInfo,
          name: nickName,
          headp: avatarUrl
        }
        app.setUserInfo(updatedUserInfo)
        that.setData({
          userName: nickName
        })
      },
      fail: (error) => {
        console.log('用户信息更新失败:', error)
      }
    })
  },
  
  // 发送code到后端并处理响应
  sendCodeToBackend: function(code, userName, userAvatar) {
    const that = this
    const apiUrl = app.globalData.API_BASE_URL + '/users/login'
    
    const requestData = {
      code: code
    }
    
    // 如果有用户信息，添加到请求数据中
    if (userName) {
      requestData.name = userName
    }
    if (userAvatar) {
      requestData.headp = userAvatar
    }
    
    tt.request({
      url: apiUrl,
      method: 'POST',
      data: requestData,
      timeout: 15000, // 延长超时时间至15秒
      success: (loginResponse) => {
        console.log('后端登录响应:', loginResponse)
        if (loginResponse.data && loginResponse.data.douyin_id && loginResponse.data.user_id) {
          const douyinId = loginResponse.data.douyin_id
          const userId = loginResponse.data.user_id
          const userName = loginResponse.data.name || '你好呀'
          const userAvatar = loginResponse.data.headp
          
          const userInfo = {
            id: userId,
            douyin_id: douyinId,
            name: userName,
            headp: userAvatar
          }
          
          // 更新全局用户信息
          app.setUserInfo(userInfo)
          
          console.log('用户登录成功，ID:', userId, '抖音ID:', douyinId, '昵称:', userName)
          
          // 设置授权状态和用户名
          that.setData({
            isAuthorized: true,
            userName: userName
          })
        } else {
          console.error('登录失败，未获取到用户标识', loginResponse.data)
          that.handleLoginFailure()
        }
      },
      fail: (error) => {
        console.error('登录请求失败:', error)
        // 添加重试逻辑
        that.retryLogin(code, userName, userAvatar)
      }
    })
  },

  // 重试登录逻辑
  retryLogin: function(code, userName, userAvatar) {
    const that = this
    console.log('开始重试登录...')
    
    const requestData = {
      code: code
    }
    
    // 如果有用户信息，添加到请求数据中
    if (userName) {
      requestData.name = userName
    }
    if (userAvatar) {
      requestData.headp = userAvatar
    }
    
    setTimeout(() => {
      tt.request({
        url: app.globalData.API_BASE_URL + '/users/login',
        method: 'POST',
        data: requestData,
        timeout: 20000,
        success: (response) => {
          console.log('重试登录成功:', response)
          if (response.data && response.data.douyin_id && response.data.user_id) {
            const userName = response.data.name || '你好呀'
            const userAvatar = response.data.headp
            
            const userInfo = {
              id: response.data.user_id,
              douyin_id: response.data.douyin_id,
              name: userName,
              headp: userAvatar
            }
            app.setUserInfo(userInfo)
            that.setData({
              isAuthorized: true,
              userName: userName
            })
          } else {
            that.handleLoginFailure()
          }
        },
        fail: (error) => {
          console.error('重试登录失败:', error)
          that.handleLoginFailure()
        }
      })
    }, 2000) // 2秒后重试
  },

  // 处理登录失败
  handleLoginFailure: function() {
    console.error('登录失败，显示错误提示')
    tt.showModal({
      title: '登录失败',
      content: '网络连接异常，请检查网络后重试',
      showCancel: true,
      cancelText: '退出',
      confirmText: '重试',
      success: (res) => {
        if (res.confirm) {
          // 用户点击重试，重新执行登录
          this.loginAndCheckUser()
        } else {
          // 用户点击退出，可以跳转到其他页面或关闭小程序
          console.log('用户选择退出')
        }
      }
    })
  },

  // 自定义宠物按钮点击事件
  onCustomClick: function() {
    console.log('点击自定义按钮')
    // 先尝试获取用户信息
    this.getUserProfileAndUpdate()
    
    tt.navigateTo({
      url: '/pages/pet/pet'
    })
  },

  // 盲盒按钮点击事件
  onBlindBoxClick: function() {
    console.log('点击盲盒按钮')
    // 先尝试获取用户信息
    this.getUserProfileAndUpdate()
    
    this.setData({
      showBlindBoxModal: true
    })
  },

  // 关闭盲盒弹窗
  closeBlindBoxModal: function() {
    this.setData({
      showBlindBoxModal: false
    })
  },

  // 领养按钮点击事件
  onAdoptClick: function() {
    console.log('点击领养按钮')
    // 先尝试获取用户信息
    this.getUserProfileAndUpdate()
    
    tt.navigateTo({
      url: '/pages/presetPet/presetPet'
    })
  }
})