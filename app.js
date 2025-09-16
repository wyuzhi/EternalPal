App({
  globalData: {
    userInfo: null,
    hasLogin: false,
    hasGetUserProfile: false, // 是否已获取用户详细信息
    API_BASE_URL: 'http://115.190.57.202:5001/api',
    // 新增请求配置
    requestConfig: {
      timeout: 120000, // 设置为120秒
      retryTimes: 3, // 重试次数
      retryDelay: 1000 // 重试间隔
    }
  },
  
  onLaunch: function () {
    console.log('Linki小程序启动')
    
    // 初始化全局错误处理
    this.initErrorHandler()
    
    // 检查运行环境
    this.checkEnvironment()
    
    // 恢复用户信息
    this.restoreUserInfo()
  },
  
  // 初始化全局错误处理
  initErrorHandler: function() {
    // 监听全局错误
    tt.onError((error) => {
      console.error('小程序全局错误:', error)
      // 可以在这里添加错误上报逻辑
    })
    
    // 监听未捕获的Promise错误
    tt.onUnhandledRejection((res) => {
      console.error('未处理的Promise错误:', res.reason)
      // 可以在这里添加错误上报逻辑
    })
  },
  
  // 检查运行环境
  checkEnvironment: function() {
    tt.getSystemInfo({
      success: (res) => {
        console.log('运行环境信息:', res)
        // 可以根据不同的环境做适配
      }
    })
  },

  // 恢复用户信息
  restoreUserInfo: function() {
    try {
      const userInfo = tt.getStorageSync('userInfo')
      const hasGetUserProfile = tt.getStorageSync('hasGetUserProfile')
      
      if (userInfo) {
        console.log('恢复用户信息:', userInfo)
        this.globalData.userInfo = userInfo
        this.globalData.hasLogin = true
      }
      
      // 将hasGetUserProfile状态存储到全局数据中，供页面使用
      this.globalData.hasGetUserProfile = hasGetUserProfile || false
      
    } catch (error) {
      console.error('恢复用户信息失败:', error)
    }
  },
  
  // 全局登录方法
  login: function() {
    return new Promise((resolve, reject) => {
      tt.login({
        force: false,
        success: (res) => {
          if (res.code) {
            resolve(res.code)
          } else {
            reject(new Error('获取登录凭证失败'))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  },
  
  // 获取用户信息
  getUserInfo: function() {
    return this.globalData.userInfo
  },
  
  // 设置用户信息
  setUserInfo: function(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.hasLogin = true
    tt.setStorageSync('userInfo', userInfo)
  }, 
  
  
  // 退出登录
  logout: function() {
    this.globalData.userInfo = null
    this.globalData.hasLogin = false
    this.globalData.hasGetUserProfile = false
    tt.removeStorageSync('userInfo')
    tt.removeStorageSync('hasGetUserProfile')
  },

  // 新增全局请求方法
  request: function(options) {
    const { url, method = 'GET', data = {}, header = {} } = options;
    const { timeout, retryTimes, retryDelay } = this.globalData.requestConfig;
    
    return new Promise((resolve, reject) => {
      const doRequest = (retryCount = 0) => {
        tt.request({
          url: this.globalData.API_BASE_URL + url,
          method,
          data,
          header,
          timeout,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data);
            } else {
              if (retryCount < retryTimes) {
                setTimeout(() => doRequest(retryCount + 1), retryDelay);
              } else {
                reject(new Error(`请求失败: ${res.statusCode}`));
              }
            }
          },
          fail: (error) => {
            if (retryCount < retryTimes) {
              setTimeout(() => doRequest(retryCount + 1), retryDelay);
            } else {
              reject(error);
            }
          }
        });
      };
      
      doRequest();
    });
  }
});
