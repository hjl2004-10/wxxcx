// 首先引入polyfill
require('./utils/polyfill.js');

// app.js
App({
  onLaunch: function() {
    // 获取系统信息 - 使用异步方法代替同步
    wx.getSystemInfo({
      success: res => {
        this.globalData.platform = res.platform;
        this.globalData.isDevtools = res.platform === 'devtools';
        console.log('当前运行环境:', res.platform);
        
        // 真机环境额外初始化
        if (!this.globalData.isDevtools) {
          this.initRealDeviceEnv();
        }
      }
    });

    // 展示本地存储能力 - 改为异步
    wx.getStorage({
      key: 'logs',
      success: res => {
        const logs = res.data || [];
        logs.unshift(Date.now());
        wx.setStorage({
          key: 'logs',
          data: logs
        });
      }
    });
    
    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    });
  },
  
  // 真机环境初始化
  initRealDeviceEnv: function() {
    // 在这里可以添加专门针对真机的处理逻辑
    console.log('初始化真机环境');
    
    // 检查并报告浏览器环境
    this.checkAndReportEnvironment();
  },
  
  // 检查并报告当前运行环境
  checkAndReportEnvironment: function() {
    try {
      const info = {
        platform: this.globalData.platform,
        sdkVersion: wx.getSystemInfoSync().SDKVersion,
        hasInt8Array: typeof Int8Array !== 'undefined',
        hasDefine: typeof define !== 'undefined',
        hasPromise: typeof Promise !== 'undefined'
      };
      
      console.log('环境检查:', info);
    } catch (e) {
      console.error('环境检查失败:', e);
    }
  },

  globalData: {
    userInfo: null,
    studyThemes: [],  // 添加存储研学主题的全局变量
    platform: '',
    isDevtools: true
  }
})
