// 获取全局应用实例
const app = getApp()

Page({
  data: {
    isAuthorized: false,
    userName: '你好呀', // 用户名，默认值为"你好呀"
    showBlindBoxModal: false // 控制盲盒弹窗显示
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
          
          // 设置授权状态
          that.setData({
            isAuthorized: true
          })
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

  // 重试登录逻辑
  retryLogin: function(code) {
    const that = this
    console.log('开始重试登录...')
    
    setTimeout(() => {
      tt.request({
        url: app.globalData.API_BASE_URL + '/users/login',
        method: 'POST',
        data: {
          code: code
        },
        timeout: 20000,
        success: (response) => {
          console.log('重试登录成功:', response)
          if (response.data && response.data.douyin_id && response.data.user_id) {
            const userInfo = {
              id: response.data.user_id,
              douyin_id: response.data.douyin_id
            }
            app.setUserInfo(userInfo)
            that.setData({
              isAuthorized: true
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

  // 自定义按钮点击事件 - 跳转到pet页面
  onCustomClick: function() {
    console.log('点击自定义按钮')
    tt.navigateTo({
      url: '/pages/pet/pet'
    })
  },

  // 盲盒按钮点击事件 - 显示弹窗
  onBlindBoxClick: function() {
    console.log('点击盲盒按钮')
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

  // 领养按钮点击事件 - 跳转到systemPet页面
  onAdoptClick: function() {
    console.log('点击领养按钮')
    tt.navigateTo({
      url: '/pages/systemPet/systemPet'
    })
  }
})