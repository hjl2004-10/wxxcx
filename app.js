// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    try {
      const logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
    } catch (e) {
      console.error('存储日志失败:', e)
    }

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null,
    studyThemes: []  // 添加存储研学主题的全局变量
  }
})
