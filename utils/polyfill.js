/**
 * 微信小程序兼容性polyfill
 * 提供运行时兼容层，解决跨平台兼容问题
 */

// 确保globalThis存在
if (typeof globalThis === 'undefined') {
  globalThis = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this;
}

// 类型数组polyfill
if (typeof Int8Array === 'undefined') {
  console.log('[Polyfill] 添加类型数组支持');
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

// Promise polyfill
if (typeof Promise === 'undefined') {
  console.log('[Polyfill] 添加Promise支持');
  // 简单Promise实现
  globalThis.Promise = function(executor) {
    var callbacks = [];
    var state = 'pending';
    var value;
    
    function resolve(result) {
      if (state !== 'pending') return;
      state = 'fulfilled';
      value = result;
      callbacks.forEach(handleCallback);
    }
    
    function reject(error) {
      if (state !== 'pending') return;
      state = 'rejected';
      value = error;
      callbacks.forEach(handleCallback);
    }
    
    function handleCallback(callback) {
      setTimeout(function() {
        if (state === 'fulfilled') {
          callback.onFulfilled && callback.onFulfilled(value);
        } else if (state === 'rejected') {
          callback.onRejected && callback.onRejected(value);
        }
      }, 0);
    }
    
    this.then = function(onFulfilled, onRejected) {
      callbacks.push({
        onFulfilled: onFulfilled,
        onRejected: onRejected
      });
      return this;
    };
    
    this.catch = function(onRejected) {
      return this.then(null, onRejected);
    };
    
    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  };
}

// AMD/CMD兼容层
if (typeof define === 'undefined') {
  console.log('[Polyfill] 添加模块系统兼容支持');
  
  // 简单的define实现
  globalThis.define = function(deps, callback) {
    if (typeof callback === 'function') {
      try {
        const modules = [];
        if (Array.isArray(deps)) {
          for (let i = 0; i < deps.length; i++) {
            if (deps[i] === 'exports') {
              modules.push({});
            } else if (deps[i] === 'require') {
              modules.push(function() { return {}; });
            } else {
              modules.push({});
            }
          }
        }
        return callback.apply(null, modules);
      } catch (e) {
        console.error('[Polyfill] define回调执行错误:', e);
        return {};
      }
    }
    return deps; // 如果只有一个参数，假设它是factory
  };
  
  // AMD支持标志
  globalThis.define.amd = {};
}

// 导出用于模块引入
module.exports = {
  version: '1.0.0',
  name: 'wx-polyfill'
}; 