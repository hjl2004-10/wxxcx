// pages/ceshi/ceshi.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 'basic', // 当前显示的选项卡: basic, analysis, materials
    children: [{ gender: '男', age: '' }], // 孩子信息数组
    locationTypes: ['博物馆', '景区', '科技馆', '主题公园'],
    locationNames: [],
    selectedLocationType: '',
    selectedLocationName: '',
    duration: '2h', // 默认时长
    
    // AI选项相关
    aiOptions: [], // AI生成的参考选项
    materialsText: '', // 导读材料内容
    
    // 原有数据
    inputText: '', 
    serviceId: '1', 
    accessKey: 'hjl2004', 
    responseText: '', 
    isLoading: false, 
    error: '', 
    services: [
      { id: '1', name: '研学分析服务' },
      { id: '2', name: '导读材料服务' },
      { id: '3', name: '第三个AI服务' }
    ],
    serverUrl: 'http://119.3.217.132:5000'
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

  // 切换标签页
  switchTab: function(e) {
    this.setData({
      currentTab: e.currentTarget.dataset.tab
    });
  },

  // 添加孩子
  addChild: function() {
    let children = this.data.children;
    children.push({ gender: '男', age: '' });
    this.setData({
      children: children
    });
  },

  // 删除孩子
  deleteChild: function(e) {
    const index = e.currentTarget.dataset.index;
    let children = this.data.children;
    children.splice(index, 1);
    this.setData({
      children: children
    });
  },

  // 设置孩子性别
  setGender: function(e) {
    const index = e.currentTarget.dataset.index;
    const gender = e.currentTarget.dataset.gender;
    let children = this.data.children;
    children[index].gender = gender;
    this.setData({
      children: children
    });
  },

  // 设置孩子年龄
  setAge: function(e) {
    const index = e.currentTarget.dataset.index;
    const age = e.detail.value;
    let children = this.data.children;
    children[index].age = age;
    this.setData({
      children: children
    });
  },

  // 设置场景类型
  setLocationType: function(e) {
    const type = this.data.locationTypes[e.detail.value];
    let locationNames = [];
    
    // 根据选择的类型加载对应的场所
    if (type === '博物馆') {
      locationNames = ['国家博物馆', '自然博物馆', '历史博物馆', '科技博物馆'];
    } else if (type === '景区') {
      locationNames = ['长城', '故宫', '颐和园', '天坛公园'];
    } else if (type === '科技馆') {
      locationNames = ['中国科技馆', '天文馆', '地质博物馆'];
    } else if (type === '主题公园') {
      locationNames = ['欢乐谷', '环球影城', '野生动物园'];
    }
    
    this.setData({
      selectedLocationType: type,
      locationNames: locationNames,
      selectedLocationName: ''
    });
  },

  // 设置具体场所
  setLocationName: function(e) {
    this.setData({
      selectedLocationName: this.data.locationNames[e.detail.value]
    });
  },

  // 设置游览时长
  setDuration: function(e) {
    this.setData({
      duration: e.currentTarget.dataset.duration
    });
  },

  // 生成分析建议
  generateAnalysis: function() {
    // 检查必填信息
    if (!this.validateInputs()) {
      return;
    }
    
    // 构建请求内容
    const childrenInfo = this.data.children.map((child, index) => 
      `孩子${index + 1}：${child.gender}，${child.age}岁`
    ).join('\n');
    
    const requestText = 
      `请为以下情况提供适合的亲子研学规划方案：\n` +
      `${childrenInfo}\n` +
      `场景：${this.data.selectedLocationType || '未指定'}\n` +
      `场所：${this.data.selectedLocationName || '未指定'}\n` +
      `游览时长：${this.data.duration}\n` +
      `请提供详细规划，并在最后生成2-5个具体的研学主题或活动名称，作为参考选项。\n` +
      `必须在回复的最后使用JSON格式提供这些选项，格式如下：\n\n` +
      `{\"options\": [\n` +
      `  {\"id\": 1, \"title\": \"选项1标题\", \"description\": \"选项1的简短描述\"},\n` +
      `  {\"id\": 2, \"title\": \"选项2标题\", \"description\": \"选项2的简短描述\"},\n` +
      `  ...\n` +
      `]}`;
      
    this.setData({
      inputText: requestText,
      currentTab: 'analysis',
      serviceId: '1',
      responseText: '',
      aiOptions: [],
      isLoading: true
    });
    
    // 调用原有的发送请求方法
    this.sendRequest();
  },

  // 验证输入
  validateInputs: function() {
    // 检查孩子信息
    for (let i = 0; i < this.data.children.length; i++) {
      const child = this.data.children[i];
      if (!child.age) {
        wx.showToast({
          title: `请输入孩子${i+1}的年龄`,
          icon: 'none'
        });
        return false;
      }
    }
    
    // 检查场景和场所
    if (!this.data.selectedLocationType) {
      wx.showToast({
        title: '请选择场景类型',
        icon: 'none'
      });
      return false;
    }
    
    if (!this.data.selectedLocationName) {
      wx.showToast({
        title: '请选择具体场所',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 解析AI返回的内容，提取JSON选项
  parseAIOptions: function(responseText) {
    try {
      // 查找JSON部分 (通常在文本的最后)
      const jsonMatch = responseText.match(/\{[\s\S]*"options"[\s\S]*\}/g);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const jsonData = JSON.parse(jsonStr);
        
        if (jsonData && jsonData.options && Array.isArray(jsonData.options)) {
          // 为每个选项添加selected属性
          const options = jsonData.options.map(option => ({
            ...option,
            selected: false
          }));
          
          this.setData({
            aiOptions: options
          });
          
          console.log('解析到选项：', options);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('解析选项出错:', error);
      return false;
    }
  },

  // 切换选项选中状态
  toggleOption: function(e) {
    const index = e.currentTarget.dataset.index;
    let aiOptions = this.data.aiOptions;
    aiOptions[index].selected = !aiOptions[index].selected;
    
    this.setData({
      aiOptions: aiOptions
    });
  },

  // 生成导读材料
  generateMaterials: function() {
    // 检查是否有选中的选项
    const selectedOptions = this.data.aiOptions.filter(option => option.selected);
    
    if (selectedOptions.length === 0) {
      wx.showToast({
        title: '请至少选择一个参考项目',
        icon: 'none'
      });
      return;
    }
    
    // 构建导读材料请求内容
    const childrenInfo = this.data.children.map((child, index) => 
      `孩子${index + 1}：${child.gender}，${child.age}岁`
    ).join('\n');
    
    const selectedTitles = selectedOptions.map(option => 
      `- ${option.title}${option.description ? ': ' + option.description : ''}`
    ).join('\n');
    
    const requestText = 
      `请为以下亲子研学活动生成详细的导读材料：\n` +
      `${childrenInfo}\n` +
      `场景：${this.data.selectedLocationType}\n` +
      `场所：${this.data.selectedLocationName}\n` +
      `游览时长：${this.data.duration}\n\n` +
      `选定的研学主题：\n${selectedTitles}\n\n` +
      `请提供针对这些主题的导读材料，包括：\n` +
      `1. 相关背景知识介绍\n` +
      `2. 关键知识点和学习目标\n` +
      `3. 适合孩子年龄的解释方式\n` +
      `4. 互动问题和思考引导`;
      
    this.setData({
      inputText: requestText,
      currentTab: 'materials',
      serviceId: '2',
      materialsText: '',
      isLoading: true
    });
    
    // 调用原有的发送请求方法，结果会存储到materialsText中
    this.sendRequest();
  },

  // 重新生成导读材料
  regenerateMaterials: function() {
    // 直接重用生成导读材料的方法
    this.generateMaterials();
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
      isLoading: true
    });
    
    // 根据serviceId决定将结果放在哪个变量中
    if (this.data.serviceId === '1') {
      this.setData({ responseText: '' });
    } else if (this.data.serviceId === '2') {
      this.setData({ materialsText: '' });
    }

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
          isLoading: false
        });
        
        // 根据serviceId设置错误信息
        if (that.data.serviceId === '1') {
          that.setData({ responseText: '请求失败: ' + JSON.stringify(err) });
        } else if (that.data.serviceId === '2') {
          that.setData({ materialsText: '请求失败: ' + JSON.stringify(err) });
        }
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
          const lines = text.split('\n'); // 仍然按行分割，因为SSE是基于行的
          let newContentChunk = ''; // 用于收集当前数据块中的有效内容
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]; // 不再使用 .trim()，保留原始行内容
            if (line.startsWith('data:')) {
              // 只移除 "data:" 前缀，保留后面的所有内容，包括可能的空格
              let data = line.substring(5); 
              if (data.startsWith(' ')) { // 如果 "data: " 后面有空格，也移除这个空格
                data = data.substring(1);
              }

              if (data === '[DONE]') {
                // 流结束标记
                that.setData({
                  isLoading: false
                });
                console.log('数据流接收完毕');
                
                // 如果是第一个服务，尝试解析选项
                if (that.data.serviceId === '1') {
                  that.parseAIOptions(that.data.responseText);
                }
                // [DONE] 标记本身不应作为内容显示，所以这里直接跳过后续拼接
                continue; 
              }
              // 将有效数据和原始的换行符（通过在每行后添加\n）拼接到当前块
              newContentChunk += data + (lines.length > 1 && i < lines.length -1 ? '\n' : '');
            } else if (line === '' && i < lines.length - 1 && lines[i+1].startsWith('data:')) {
              // 处理SSE中可能的空行分隔符，如果它后面还有data:行，我们也加一个换行
              // 但如果已经是最后一行空行，就不加了
              // 或者，如果AI本身就想输出空行，下面的逻辑也会保留
            } else if (line !== '') {
                // 如果某行不是以 "data:" 开头，也不是[DONE]等控制字符，
                // 并且AI的原始输出可能包含不带 "data:" 的行（虽然不标准SSE，但为了兼容性）
                // 或者AI内容本身就需要换行，我们将其视为内容的一部分。
                // 重要的：如果AI返回的原始文本就包含多余的换行，这里也会保留。
                // 一般来说，AI返回的SSE流，内容都会在 "data:" 之后。
                // 此处主要确保如果原始文本中就有换行，它会被保留。
                 newContentChunk += line + (lines.length > 1 && i < lines.length -1 ? '\n' : '');
            }
          }
          
          // 更新UI显示，只在有新内容时更新
          if (newContentChunk) {
            if (that.data.serviceId === '1') {
              that.setData({
                responseText: that.data.responseText + newContentChunk
              });
            } else if (that.data.serviceId === '2') {
              that.setData({
                materialsText: that.data.materialsText + newContentChunk
              });
            }
          }
        }
      } catch (error) {
        console.error('处理数据块出错:', error);
        that.setData({
          isLoading: false
        });
        
        // 根据serviceId处理错误
        if (that.data.serviceId === '1') {
          that.setData({ 
            responseText: that.data.responseText + '\n[处理错误]'
          });
        } else if (that.data.serviceId === '2') {
          that.setData({ 
            materialsText: that.data.materialsText + '\n[处理错误]'
          });
        }
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
      responseText: '',
      materialsText: '',
      aiOptions: []
    });
  }
})