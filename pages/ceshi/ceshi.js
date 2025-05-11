// pages/ceshi/ceshi.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    inputText: '', // 用户输入的文本
    serviceId: '1', // 默认选择的服务ID
    accessKey: 'hjl2004', // 访问密钥
    responseText: '', // 返回的文本
    isLoading: false, // 是否正在加载
    error: '', // 错误信息
    services: [
      { id: '1', name: '目的地咨询' },
      { id: '2', name: '研学技巧问答' },
      { id: '3', name: '第三个AI服务' }
    ],
    serverUrl: 'http://119.3.239.188:5000' // 服务器URL
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('页面加载完成');
    // 检查网络状态
    wx.getNetworkType({
      success: (res) => {
        console.log('当前网络类型:', res.networkType);
      }
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 输入框内容变化处理
  onInputChange: function(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 服务选择变化处理
  onServiceChange: function(e) {
    this.setData({
      serviceId: this.data.services[e.detail.value].id
    });
  },

  // 发送请求
  sendRequest: function() {
    const that = this;
    
    // 检查输入是否为空
    if (!this.data.inputText.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 设置加载状态
    this.setData({
      isLoading: true,
      responseText: ''
    });

    // 请求参数
    const requestData = {
      text: this.data.inputText,
      key: this.data.accessKey
    };

    // 服务URL
    const serviceUrl = `${this.data.serverUrl}/${this.data.serviceId}`;
    console.log('发送请求到:', serviceUrl);
    
    // 使用wx.request发送请求，启用分块传输
    const requestTask = wx.request({
      url: serviceUrl,
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey,
        'Accept': 'text/event-stream'
      },
      enableChunked: true,  // 启用分块传输
      responseType: 'arraybuffer',  // 需设置为arraybuffer以便正确处理二进制数据
      success: function(res) {
        console.log('请求成功状态:', res.statusCode);
      },
      fail: function(err) {
        console.error('请求失败:', err);
        that.setData({
          isLoading: false,
          responseText: '请求失败: ' + JSON.stringify(err)
        });
      }
    });

    // 处理分块接收的数据
    requestTask.onChunkReceived(function(response) {
      try {
        // 使用正确的编码转换方法
        const arrayBuffer = response.data;
        // 先转Base64
        const base64 = wx.arrayBufferToBase64(arrayBuffer);
        // 再从Base64转回UTF-8字符串
        const text = that.base64ToUtf8(base64);
        
        console.log('解码后数据:', text);
        
        // 处理SSE格式数据
        if (text) {
          const lines = text.split('\n');
          let newContent = '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data:')) {
              const data = line.substring(5).trim();
              if (data === '[DONE]') {
                // 流结束标记
                that.setData({
                  isLoading: false
                });
                console.log('数据流接收完毕');
              } else {
                // 累加内容
                newContent += data;
              }
            }
          }
          
          // 更新UI显示，只在有新内容时更新
          if (newContent) {
            that.setData({
              responseText: that.data.responseText + newContent
            });
          }
        }
      } catch (error) {
        console.error('处理数据块出错:', error);
        that.setData({
          responseText: that.data.responseText + '\n[处理错误]',
          isLoading: false
        });
      }
    });
  },

  // Base64转UTF-8
  base64ToUtf8: function(base64) {
    try {
      // 使用解码方法，兼容中文字符
      return decodeURIComponent(escape(this.base64Decode(base64)));
    } catch (e) {
      console.error('Base64解码错误:', e);
      // 降级处理，直接解码
      return this.base64Decode(base64);
    }
  },
  
  // Base64解码
  base64Decode: function(base64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    
    base64 = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    
    let i = 0;
    while (i < base64.length) {
      let enc1 = chars.indexOf(base64.charAt(i++));
      let enc2 = chars.indexOf(base64.charAt(i++));
      let enc3 = chars.indexOf(base64.charAt(i++));
      let enc4 = chars.indexOf(base64.charAt(i++));
      
      let chr1 = (enc1 << 2) | (enc2 >> 4);
      let chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      let chr3 = ((enc3 & 3) << 6) | enc4;
      
      output = output + String.fromCharCode(chr1);
      
      if (enc3 !== 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output = output + String.fromCharCode(chr3);
      }
    }
    
    return output;
  },

  // 清空输入和响应
  clearAll: function() {
    this.setData({
      inputText: '',
      responseText: ''
    });
  }
})