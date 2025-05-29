Page({

  /**
   * 页面的初始数据
   */
  data: {
    inputText: '', // 用户输入的文本
    serviceId: '4', // 默认选择的服务ID
    accessKey: 'hjl2004', // 访问密钥
    responseText: '', // 返回的文本
    isLoading: false, // 是否正在加载
    error: '', // 错误信息
    services: [
      { id: '4', name: '目的地咨询' },
      { id: '5', name: '研学技巧问答' },
      { id: '6', name: '更多AI服务待开发' }
    ],
    serverUrl: 'https://tanlv.top', // 服务器URL
    isInputFocused: false, // 输入框是否获得焦点
    isPickerActive: false, // 选择器是否激活
    scrollToView: '', // 滚动位置
    shouldScroll: false, // 是否应该滚动
    selectedServiceIndex: 0, // 当前选中的服务索引
    messages: [], // 存储所有对话记录
    currentInput: '', // 当前输入框的内容
    currentResponse: '', // 当前AI回复的内容
    placeholderText: '请输入您的问题...' // 默认输入提示
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
      currentInput: e.detail.value
    });
  },

  // 输入框获得焦点
  onInputFocus: function() {
    this.setData({
      isInputFocused: true,
      shouldScroll: true
    });
  },

  // 输入框失去焦点
  onInputBlur: function() {
    this.setData({
      isInputFocused: false,
      shouldScroll: false
    });
  },

  // 服务选择变化处理
  onServiceChange: function(e) {
    const index = parseInt(e.detail.value);
    const serviceId = this.data.services[index].id;
    
    // 根据服务ID设置不同的输入提示
    const placeholderText = serviceId === '5' ? 
      '请先将生成的方案发送，再提出问题' : 
      '请输入您的问题...';

    this.setData({
      serviceId: serviceId,
      selectedServiceIndex: index,
      isPickerActive: false,
      placeholderText: placeholderText
    });
  },

  // 选择器开始选择
  onPickerStart: function() {
    this.setData({
      isPickerActive: true
    });
  },

  // 选择器结束选择
  onPickerEnd: function() {
    this.setData({
      isPickerActive: false
    });
  },

  // 处理分块接收的数据
  processChunkData: function(text) {
    try {
      const lines = text.split('\n');
      let newContent = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data:')) {
          const data = line.substring(5).trim();
          if (data === '[DONE]') {
            return null; // 表示数据流结束
          } else {
            // 处理换行符，确保格式正确
            let formattedData = data
              .replace(/\\n/g, '\n') // 处理显式的换行符
              .replace(/\n{3,}/g, '\n\n') // 将3个以上的连续换行替换为2个
              .trim(); // 移除首尾空白
            
            newContent += formattedData;
          }
        }
      }
      
      return newContent;
    } catch (error) {
      console.error('处理数据块出错:', error);
      return null;
    }
  },

  // 发送请求
  sendRequest: function() {
    console.log('发送按钮被点击');
    const that = this;
    
    // 检查输入是否为空
    if (!this.data.currentInput || this.data.isLoading) {
      console.log('输入为空或正在加载中');
      return;
    }

    console.log('准备发送消息:', this.data.currentInput);

    // 添加用户消息到对话记录
    const userMessage = {
      type: 'user',
      content: this.data.currentInput,
      timestamp: new Date().getTime()
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      isLoading: true,
      shouldScroll: true,
      scrollToView: 'chat-bottom',
      currentInput: '' // 清空输入框
    }, () => {
      console.log('用户消息已添加到对话记录');
      
      // 请求参数
      const requestData = {
        text: userMessage.content,
        key: this.data.accessKey
      };

      // 服务URL
      const serviceUrl = `${this.data.serverUrl}/${this.data.serviceId}`;
      console.log('发送请求到:', serviceUrl, '服务ID:', this.data.serviceId);
      
      // 使用wx.request发送请求
      const requestTask = wx.request({
        url: serviceUrl,
        method: 'POST',
        data: requestData,
        header: {
          'Content-Type': 'application/json',
          'X-Access-Key': this.data.accessKey,
          'Accept': 'text/event-stream'
        },
        enableChunked: true,
        responseType: 'arraybuffer',
        success: function(res) {
          console.log('请求成功状态:', res.statusCode);
          if (res.statusCode !== 200) {
            that.setData({
              isLoading: false,
              messages: [...that.data.messages, {
                type: 'ai',
                content: '请求失败: 服务器返回状态码 ' + res.statusCode,
                timestamp: new Date().getTime()
              }]
            });
            wx.showToast({
              title: '请求失败',
              icon: 'error'
            });
          }
        },
        fail: function(err) {
          console.error('请求失败:', err);
          that.setData({
            isLoading: false,
            messages: [...that.data.messages, {
              type: 'ai',
              content: '请求失败: ' + JSON.stringify(err),
              timestamp: new Date().getTime()
            }]
          });
          wx.showToast({
            title: '请求失败',
            icon: 'error'
          });
        }
      });

      // 处理分块接收的数据
      requestTask.onChunkReceived((response) => {
        try {
          const arrayBuffer = response.data;
          const base64 = wx.arrayBufferToBase64(arrayBuffer);
          const text = that.base64ToUtf8(base64);
          
          if (text) {
            const newContent = that.processChunkData(text);
            
            if (newContent === null) {
              // 数据流结束，添加完整的AI回复
              const aiMessage = {
                type: 'ai',
                content: that.data.currentResponse,
                timestamp: new Date().getTime()
              };
              
              that.setData({
                messages: [...that.data.messages, aiMessage],
                isLoading: false,
                currentResponse: '',
                shouldScroll: true,
                scrollToView: 'chat-bottom'
              });
              console.log('数据流接收完毕');
            } else if (newContent) {
              // 更新当前响应
              that.setData({
                currentResponse: (that.data.currentResponse || '') + newContent
              });
            }
          }
        } catch (error) {
          console.error('处理数据块出错:', error);
          const errorMessage = {
            type: 'ai',
            content: '处理响应出错，请重试',
            timestamp: new Date().getTime()
          };
          that.setData({
            messages: [...that.data.messages, errorMessage],
            isLoading: false,
            currentResponse: ''
          });
          wx.showToast({
            title: '处理响应出错',
            icon: 'error'
          });
        }
      });
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

  // 清空对话
  clearAll: function() {
    console.log('清空按钮被点击');
    if (this.data.messages.length === 0) {
      console.log('没有消息需要清空');
      return;
    }

    wx.showModal({
      title: '确认清空',
      content: '确定清空当前问答吗？',
      success: (res) => {
        console.log('清空确认框结果:', res);
        if (res.confirm) {
          this.setData({
            messages: [],
            currentInput: '',
            currentResponse: '',
            shouldScroll: false
          }, () => {
            console.log('对话已清空');
          });
        }
      }
    });
  }
}) 