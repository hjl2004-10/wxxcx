// app.js
App({
  onLaunch: function() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.platform = systemInfo.platform;
    this.globalData.isDevtools = systemInfo.platform === 'devtools';
    
    console.log('当前运行环境:', systemInfo.platform);
    
    // 真机环境额外初始化
    if (!this.globalData.isDevtools) {
      // 进行真机环境的特殊处理
      this.initRealDeviceEnv();
    }

    // 兼容性处理：添加类型数组polyfill
    if (typeof Int8Array === 'undefined') {
      console.log('检测到Int8Array不存在，正在添加兼容支持');
      globalThis.Int8Array = Array;
      globalThis.Uint8Array = Array;
      globalThis.Uint8ClampedArray = Array;
      globalThis.Int16Array = Array;
      globalThis.Uint16Array = Array;
      globalThis.Int32Array = Array;
      globalThis.Uint32Array = Array;
      globalThis.Float32Array = Array;
      globalThis.Float64Array = Array;
    }

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
  
  // 真机环境初始化
  initRealDeviceEnv: function() {
    // 在这里可以添加专门针对真机的处理逻辑
    console.log('初始化真机环境');
  },

  globalData: {
    userInfo: null,
    studyThemes: [],  // 添加存储研学主题的全局变量
    platform: '',
    isDevtools: true
  }
})

const defineCache = {};

// AMD/CMD兼容层
if (typeof define === 'undefined') {
  globalThis.define = function(deps, callback) {
    const modules = [];
    if (deps && deps.length) {
      for (let i = 0; i < deps.length; i++) {
        const path = deps[i];
        if (path === 'require') {
          modules.push(function(path) { return require(path); });
        } else if (path === 'exports') {
          modules.push({});
        } else {
          try {
            modules.push(require(path));
          } catch (e) {
            console.error('模块加载失败:', path, e);
            modules.push({});
          }
        }
      }
    }
    
    const result = callback ? callback.apply(null, modules) : undefined;
    return result;
  };
  
  // 添加AMD支持标志
  globalThis.define.amd = {};
}
