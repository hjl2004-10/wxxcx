Page({
  data: {
    kidsInfo: [{
      id: 1,
      gender: '',
      age: ''
    }],
    venueType: '',
    specificVenue: '',
    duration: '2h',
    conversationId: ''
  },
  onLoad: function (options) {
    // 页面加载时执行
  },
  addKid: function() {
    let kidsInfo = this.data.kidsInfo;
    kidsInfo.push({
      id: kidsInfo.length + 1,
      gender: '',
      age: ''
    });
    this.setData({
      kidsInfo: kidsInfo
    });
  },
  inputGender: function(e) {
    const index = e.currentTarget.dataset.index;
    let kidsInfo = this.data.kidsInfo;
    kidsInfo[index].gender = e.detail.value;
    this.setData({
      kidsInfo: kidsInfo
    });
  },
  inputAge: function(e) {
    const index = e.currentTarget.dataset.index;
    let kidsInfo = this.data.kidsInfo;
    kidsInfo[index].age = e.detail.value;
    this.setData({
      kidsInfo: kidsInfo
    });
  },
  selectVenueType: function(e) {
    this.setData({
      venueType: e.detail.value
    });
  },
  selectSpecificVenue: function(e) {
    this.setData({
      specificVenue: e.detail.value
    });
  },
  selectDuration: function(e) {
    this.setData({
      duration: e.currentTarget.dataset.time
    });
  },
  generateSuggestion: function() {
    const that = this;
    
    // 验证必填字段
    if (!this.data.venueType || !this.data.specificVenue || !this.data.duration) {
      wx.showToast({
        title: '请完成所有信息填写',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载状态
    wx.showLoading({
      title: '生成研学方案中...',
    });
    
    // 首先创建对话
    this.createConversation()
      .then(conversationId => {
        // 使用创建的对话ID发送问题生成研学方案
        return this.generateThemeWithAPI(conversationId);
      })
      .then(result => {
        wx.hideLoading();
        // 将生成的建议存储到全局变量
        app.globalData.studyThemes = result.themes || [];
        // 跳转到主题推荐页面
        wx.redirectTo({
          url: '/pages/themeRecommend/themeRecommend'
        });
      })
      .catch(error => {
        wx.hideLoading();
        wx.showToast({
          title: '生成失败，请重试',
          icon: 'none'
        });
        console.error('API调用失败:', error);
      });
  },
  
  // 创建对话的函数
  createConversation: function() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://qianfan.baidubce.com/v2/app/conversation',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer bce-v3/ALTAK-w3MXrEFZ1OhNY5jY0CnD4/18a96d20109a8753224caf0bbb4f74fe16811204' // 这里需要替换为实际的令牌
        },
        data: {
          app_id: 'bbe0c24a-f3a0-486e-b3c0-a334c4439fb2
' // 替换为您的APPID
        },
        success: function(res) {
          if (res.statusCode === 200 && res.data && res.data.conversation_id) {
            resolve(res.data.conversation_id);
          } else {
            reject(new Error('创建对话失败: ' + JSON.stringify(res)));
          }
        },
        fail: function(err) {
          reject(err);
        }
      });
    });
  },
  
  // 使用API生成研学主题
  generateThemeWithAPI: function(conversationId) {
    // 构建提示词
    const kidsInfo = this.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    const prompt = `我需要为以下情况生成研学主题建议：
    目的地类型：${this.data.venueType}
    具体场所：${this.data.specificVenue}
    时长：${this.data.duration}
    参与者：${kidsInfo}
    请生成3个适合的研学主题，包括主题名称和简短描述，以及适合的日期。格式为JSON数组。`;
    
    const that = this; // 保存this引用

    return new Promise((resolve, reject) => {
      try {
        wx.request({
          url: 'https://qianfan.baidubce.com/v2/app/conversation/runs',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer bce-v3/ALTAK-w3MXrEFZ1OhNY5jY0CnD4/18a96d20109a8753224caf0bbb4f74fe16811204' // 这里需要替换为实际的令牌
          },
          data: {
            app_id: 'bbe0c24a-f3a0-486e-b3c0-a334c4439fb2
',
            conversation_id: conversationId,
            query: prompt,
            stream: false
          },
          success: function(res) {
            if (res.statusCode === 200 && res.data) {
              try {
                // 解析API返回的回答，提取JSON格式的主题数据
                const answer = res.data.result || '';
                // 尝试从回答中提取JSON部分
                const jsonMatch = answer.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                  const themes = JSON.parse(jsonMatch[0]);
                  resolve({ themes: themes });
                } else {
                  // 如果无法解析为JSON，创建一个简单格式的主题列表
                  console.log('无法从回答中提取JSON，使用默认主题');
                  resolve({
                    themes: getDefaultThemes(that.data.venueType, that.data.specificVenue)
                  });
                }
              } catch (e) {
                console.error('解析API返回数据失败:', e);
                resolve({
                  themes: getDefaultThemes(that.data.venueType, that.data.specificVenue)
                });
              }
            } else {
              console.error('API返回错误:', res);
              resolve({
                themes: getDefaultThemes(that.data.venueType, that.data.specificVenue)
              });
            }
          },
          fail: function(err) {
            console.error('API请求失败:', err);
            resolve({
              themes: getDefaultThemes(that.data.venueType, that.data.specificVenue)
            });
          }
        });
      } catch (e) {
        console.error('发起API请求时出错:', e);
        resolve({
          themes: getDefaultThemes(that.data.venueType, that.data.specificVenue)
        });
      }
    });
  },
  goToStudyDuring: function() {
    // 直接跳转到研学中页面
    wx.redirectTo({
      url: '/pages/studyPlan/studyPlan'
    });
  },
  goToStudyAfter: function() {
    // 直接跳转到研学后页面
    wx.redirectTo({
      url: '/pages/studyProcess/studyProcess'
    });
  },
  goBack: function() {
    wx.navigateBack();
  }
});

// 生成默认主题的辅助函数
function getDefaultThemes(venueType, specificVenue) {
  const venueInfo = specificVenue || venueType || '未知场所';
  return [
    {
      id: 1,
      title: `探索${venueInfo}的历史`,
      description: `深入了解${venueInfo}的悠久历史和文化背景，通过互动展览和讲解，让孩子们在游览中学习`,
      date: '周末或假期',
      image: '/images/study_theme.png'
    },
    {
      id: 2,
      title: `${venueInfo}科学发现之旅`,
      description: `探索${venueInfo}中的科学奥秘，通过实验和观察，培养孩子的科学思维和探究精神`,
      date: '周末或假期',
      image: '/images/study_theme.png'
    },
    {
      id: 3,
      title: `${venueInfo}艺术体验`,
      description: `欣赏${venueInfo}的艺术之美，参与创作活动，提升孩子的艺术鉴赏能力和创造力`,
      date: '周末或假期',
      image: '/images/study_theme.png'
    }
  ];
} 