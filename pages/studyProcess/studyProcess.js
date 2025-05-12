var app = getApp();

Page({
  data: {
    currentStep: 1,  // 1-研学前, 2-研学中, 3-研学后
    subStep: 'info', // info-基本信息, suggestions-建议, suggestionDetail-建议详情, guideStory-指导故事
    showSuggestionsTab: false, // 是否显示分析建议选项卡
    showBackIcon: false,
    pageTitle: "亲子研学流程",
    stepsEnabled: false, // 控制研学中和研学后步骤是否可用
    selectedSuggestions: [], // 已选择的分析建议
    
    // 基本信息相关数据
    kidsInfo: [{
      id: 1,
      gender: '',
      age: ''
    }],
    venueType: '',
    specificVenue: '',
    duration: '2h',
    
    // 研学前分析建议相关数据
    suggestions: [], // 分析建议列表
    currentSuggestion: null, // 当前查看的分析建议详情
    
    // 研学中计划相关数据
    planTitle: '',
    steps: [],
    
    // 研学后相关数据
    tempFilePaths: [],
    reflectionText: '',
    
    // API相关
    conversationId: '',
    
    // 添加新属性
    specificVenueOptions: ['北京故宫', '上海科技馆', '长城', '黄山'], // 默认值
    guideStory: '', // 预研学指导故事
    studyTasks: [], // 研学阶段的详细任务
    studyCards: [], // 研学卡片
    planGenerated: false, // 标记研学计划是否已生成
    showCustomVenueInput: false,
    customVenue: '',

    // 语音播放相关
    isPlayingAudio: false, // 是否正在播放语音
    audioContext: null, // 音频上下文
    currentPlayingId: '', // 当前播放的文本ID
    playingText: '', // 当前播放的文本内容

    // 图片生成相关
    storyImageUrl: '', // 故事相关图片URL
    isLoadingImage: false, // 是否正在加载图片
  },
  
  onLoad: function (options) {
    // 如果有传入参数指定步骤
    if (options.step) {
      const step = parseInt(options.step);
      this.setData({
        currentStep: step,
        showBackIcon: step !== 1, // 只有研学前不显示返回按钮
        fromOtherStep: false // 标记是否从其他步骤返回
      });
      this.updatePageTitle();
    } else {
      // 初始状态
      this.setData({
        fromOtherStep: false // 初始加载不是从其他步骤返回
      });
    }
    
    // 加载缓存数据
    this.loadCachedData();
    
    // 创建播放和暂停图标
    this.createAudioIcons();
  },
  
  // 更新页面标题
  updatePageTitle: function() {
    let title = "";
    switch(this.data.currentStep) {
      case 1:
        if (this.data.subStep === 'info') {
          title = "研学前 - 基本信息";
        } else if (this.data.subStep === 'suggestions') {
          title = "研学前 - 分析建议";
        } else if (this.data.subStep === 'suggestionDetail') {
          title = "研学前 - 建议详情";
        } else if (this.data.subStep === 'guideStory') {
          title = "研学前 - 导读材料";
        }
        break;
      case 2:
        title = "研学中";
        break;
      case 3:
        title = "研学后";
        break;
    }
    this.setData({
      pageTitle: title
    });
  },
  
  // 切换主步骤
  switchToStep: function(e) {
    const step = parseInt(e.currentTarget.dataset.step);
    const currentStep = this.data.currentStep;
    
    // 避免重复点击当前步骤
    if (step === currentStep) {
      return;
    }
    
    // 检查是否允许切换到研学中或研学后
    if ((step === 2 || step === 3) && !this.data.stepsEnabled) {
      wx.showToast({
        title: '请先选择研学分析建议',
        icon: 'none'
      });
      return;
    }
    
    // 如果是切换到研学中，但计划还未生成，需要先生成计划
    if (step === 2 && !this.data.planGenerated) {
      wx.showToast({
        title: '请先生成研学计划',
        icon: 'none'
      });
      return;
    }
    
    // 保存当前步骤的数据
    this.saveCurrentStepData();
    
    // 保存导航栏高度状态
    const showBackBeforeSwitch = this.data.showBackIcon;
    
    // 设置新状态
    this.setData({
      currentStep: step,
      showSuggestionsTab: step == 1 && this.data.suggestions.length > 0,
      // 关键修改：保持一致的返回按钮状态
      showBackIcon: step != 1 || showBackBeforeSwitch,
      subStep: step == 1 ? (this.data.suggestions.length > 0 ? 'suggestions' : 'info') : ''
    });
    
    this.updatePageTitle();
  },
  
  // 切换子步骤
  switchSubStep: function(e) {
    const subStep = e.currentTarget.dataset.subStep;
    // 如果切换到导读材料但尚未生成，提示用户
    if (subStep === 'guideStory' && !this.data.guideStory && !this.data.guideStoryNodes) {
      wx.showToast({
        title: '请先生成导读材料',
        icon: 'none'
      });
      return;
    }
    this.setData({
      subStep: subStep
    });
    this.updatePageTitle();
  },
  
  // 保存当前步骤数据
  saveCurrentStepData: function() {
    const data = this.data;
    let cacheData = {};
    
    // 根据当前步骤保存不同数据
    switch(data.currentStep) {
      case 1:
        if (data.subStep === 'info') {
          cacheData = {
            kidsInfo: data.kidsInfo,
            venueType: data.venueType,
            specificVenue: data.specificVenue,
            duration: data.duration
          };
        } else if (data.subStep === 'suggestions' || data.subStep === 'suggestionDetail') {
          cacheData = {
            suggestions: data.suggestions,
            selectedSuggestions: data.selectedSuggestions
          };
        } else if (data.subStep === 'guideStory') {
          cacheData = {
            guideStory: data.guideStory,
            guideStoryNodes: data.guideStoryNodes
          };
          // 单独保存指导故事
          try {
            wx.setStorageSync('studyProcess_1_guideStory', cacheData);
          } catch (e) {
            console.error('保存指导故事数据失败:', e);
          }
        }
        break;
      case 2:
        cacheData = {
          planTitle: data.planTitle,
          steps: data.steps,
          studyCards: data.studyCards // 确保保存研学卡片
        };
        break;
      case 3:
        cacheData = {
          tempFilePaths: data.tempFilePaths,
          reflectionText: data.reflectionText
        };
        break;
    }
    
    // 保存到本地缓存
    try {
      wx.setStorageSync('studyProcess_' + data.currentStep + '_' + data.subStep, cacheData);
    } catch (e) {
      console.error('保存缓存数据失败:', e);
    }
  },
  
  // 加载缓存数据
  loadCachedData: function() {
    try {
      // 加载各个步骤的数据
      const infoData = wx.getStorageSync('studyProcess_1_info');
      if (infoData) {
        this.setData({
          kidsInfo: infoData.kidsInfo || this.data.kidsInfo,
          venueType: infoData.venueType || '',
          specificVenue: infoData.specificVenue || '',
          duration: infoData.duration || '2h'
        });
      }
      
      const suggestionsData = wx.getStorageSync('studyProcess_1_suggestions');
      if (suggestionsData) {
        let suggestions = suggestionsData.suggestions || [];
        let selectedSuggestions = suggestionsData.selectedSuggestions || [];
        
        // 重置所有建议的选中状态
        suggestions = suggestions.map(suggestion => ({
            ...suggestion,
          isSelected: false
        }));
        
        // 只标记真正被选中的建议
        for (let i = 0; i < suggestions.length; i++) {
          const isSelected = selectedSuggestions.some(item => item.id === suggestions[i].id);
          if (isSelected) {
            suggestions[i].isSelected = true;
          }
        }
        
        // 重建选中的建议列表，确保与 suggestions 中的选中状态一致
        selectedSuggestions = [];
        for (let i = 0; i < suggestions.length; i++) {
          if (suggestions[i].isSelected) {
            selectedSuggestions.push(suggestions[i]);
          }
        }
        
        console.log('从缓存加载的建议数量:', suggestions.length);
        console.log('从缓存加载的已选择建议数量:', selectedSuggestions.length);
        
        this.setData({
          suggestions: suggestions,
          selectedSuggestions: selectedSuggestions,
          stepsEnabled: (selectedSuggestions.length > 0)
        });
      }
      
      // 加载预研学指导故事
      const guideStoryData = wx.getStorageSync('studyProcess_1_guideStory');
      if (guideStoryData && guideStoryData.guideStory) {
        this.setData({
          guideStory: guideStoryData.guideStory,
          guideStoryNodes: guideStoryData.guideStoryNodes || this.parseStoryText(guideStoryData.guideStory),
          storyImageUrl: guideStoryData.imageUrl || ''  // 加载故事图片URL
        });
      }
      
      const planData = wx.getStorageSync('studyProcess_2_');
      if (planData) {
        this.setData({
          planTitle: planData.planTitle || '',
          steps: planData.steps || [],
          studyCards: planData.studyCards || [],
          planGenerated: true // 如果有缓存的计划数据，标记为已生成
        });
      }
      
      const postData = wx.getStorageSync('studyProcess_3_');
      if (postData) {
        this.setData({
          tempFilePaths: postData.tempFilePaths || [],
          reflectionText: postData.reflectionText || ''
        });
      }
    } catch (e) {
      console.error('加载缓存数据失败:', e);
    }
  },
  
  // 以下是从原页面迁移并整合的功能
  
  // 基本信息相关函数
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
  
  // 选择性别
  selectGender(e) {
    const { index, gender } = e.currentTarget.dataset;
    const kidsInfo = this.data.kidsInfo;
    kidsInfo[index].gender = gender;
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
    const venueTypeOptions = ['博物馆', '科技馆', '历史遗迹', '自然风光', '自定义'];
    const index = e.detail.value;
    
    // 判断是否自定义
    if (venueTypeOptions[index] === '自定义') {
      this.setData({
        venueType: '自定义',
        showCustomVenueInput: true,
        specificVenueOptions: []
      });
      return;
    }
    // 关闭自定义输入
    this.setData({ showCustomVenueInput: false });
    // 根据选择的场景类型更新相应的具体场所列表
    let specificVenueOptions = [];
    switch(venueTypeOptions[index]) {
      case '博物馆':
        specificVenueOptions = ['北京故宫', '上海博物馆', '南京博物院', '湖南省博物馆'];
        break;
      case '科技馆':
        specificVenueOptions = ['上海科技馆', '中国科技馆', '广东科学中心', '深圳科技馆'];
        break;
      case '历史遗迹':
        specificVenueOptions = ['长城', '兵马俑', '莫高窟', '三星堆'];
        break;
      case '自然风光':
        specificVenueOptions = ['黄山', '张家界', '九寨沟', '西双版纳'];
        break;
      default:
        specificVenueOptions = ['北京故宫', '上海科技馆', '长城', '黄山'];
    }
    
    this.setData({
      venueType: venueTypeOptions[index],
      specificVenueOptions: specificVenueOptions,
      specificVenue: '' // 重置具体场所
    });
  },
  
  // 自定义场所输入
  onCustomVenueInput: function(e) {
    const value = e.detail.value;
    this.setData({ customVenue: value, specificVenue: value });
  },
  
  selectSpecificVenue: function(e) {
    const index = e.detail.value;
    const venue = this.data.specificVenueOptions[index];
    this.setData({
      specificVenue: venue
    });
  },
  
  selectDuration: function(e) {
    this.setData({
      duration: e.currentTarget.dataset.time
    });
  },
  
  // API调用相关函数
  generateSuggestion: function() {
    const that = this;
    
    // 基本验证
    if (!this.validateBasicInfo()) {
      return;
    }
    
    // 立即清空现有数据并切换到suggestions子步骤
    this.setData({
      suggestions: [],
      jsonResponse: {},
      subStep: 'suggestions', // 确保立即切换
      showSuggestionsTab: true,
      isLoadingMore: true // 显示加载状态
    });
    
    // 显示加载提示
    wx.showLoading({
      title: '生成中...',
      mask: true
    });
    
    // 构建请求文本
    const kidsInfo = this.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    // 修改 AI1 提示词：返回 3~5 条建议
    const promptText = `请根据以下情况生成 3 到 5 条亲子研学活动分析建议，并仅以 JSON 格式返回，格式示例如下：
    {
      "suggestions": [
        {
          "title": "建议标题",
          "description": "建议描述",
          "ageRange": "适合年龄",
          "learningGoals": "学习目标",
          "readingMaterials": "导读材料",
          "wanfaLiucheng": "玩法流程",
          "gaojieThinking": "高阶思维带动点"
        }
      ]
    }
      参与者情况：${kidsInfo}
      目的地类型：${this.data.venueType || '未知场所类型'}
      具体场所：${this.data.specificVenue || '未知场所'}
      游览时长：${this.data.duration || '未知时长'}`;
    
    console.log('开始请求AI服务1，请求文本:', promptText);
    
    // 发送请求到第一个AI
    this.requestAIStream('1', promptText, 
      // 处理数据块
      null,
      // 完成回调
      function(result) {
        wx.hideLoading();
        console.log('AI建议生成完成');
        
        // 确保加载标志关闭
        that.setData({
          isLoadingMore: false
        });
        
        // 更新页面标题和保存数据
        that.updatePageTitle();
        that.saveCurrentStepData();
      }
    );
    
    // 设置一个安全定时器，确保即使回调失败，也能关闭加载状态
    setTimeout(function() {
      // 检查是否仍在加载
      if (that.data.isLoadingMore) {
        console.log('安全定时器触发，关闭加载状态');
        wx.hideLoading();
        that.setData({
          isLoadingMore: false
        });
        
        // 显示请求超时提示
        wx.showToast({
          title: '请求超时，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    }, 30000); // 30秒超时
  },
  
  // 查看建议详情
  viewSuggestionDetail: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (isNaN(index) || index < 0 || index >= this.data.suggestions.length) {
      wx.showToast({
        title: '无效的建议索引',
        icon: 'none'
      });
      return;
    }
    
    const suggestion = this.data.suggestions[index];
    console.log('查看建议详情:', index, suggestion);
    
    this.setData({
      currentSuggestion: suggestion,
      currentSuggestionIndex: index,
      subStep: 'suggestionDetail'
    });
    
    this.updatePageTitle();
  },
  
  // 返回到建议列表
  backToSuggestions: function() {
    this.setData({
      subStep: 'suggestions',
      currentSuggestion: null
    });
    
    this.updatePageTitle();
  },
  
  // 选择/取消选择建议
  toggleSelectSuggestion: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (isNaN(index) || index < 0 || index >= this.data.suggestions.length) {
      console.error('无效的建议索引:', index);
      return;
    }

    const suggestions = this.data.suggestions;
    // 清空已选择的建议数组，重建一个全新的数组，确保只包含用户选择的建议
    let selectedSuggestions = [];
    
    console.log('切换选择状态:', index, suggestions[index].title, '当前状态:', suggestions[index].isSelected);
    
    // 更新建议的选中状态
    suggestions[index].isSelected = !suggestions[index].isSelected;
    
    // 重建已选择的建议列表
    for (let i = 0; i < suggestions.length; i++) {
      if (suggestions[i].isSelected) {
        selectedSuggestions.push(suggestions[i]);
      }
    }
    
    // 打印诊断信息
    console.log('已选择建议数量:', selectedSuggestions.length);
    selectedSuggestions.forEach((suggestion, idx) => {
      console.log(`已选择建议 ${idx+1}:`, suggestion.title);
    });
    
    // 如果当前正在查看详情的建议，也要更新其状态
    let currentSuggestion = this.data.currentSuggestion;
    if (currentSuggestion && currentSuggestion.id === suggestions[index].id) {
      currentSuggestion = {...suggestions[index]};
    }
    
    this.setData({
      suggestions: suggestions,
      selectedSuggestions: selectedSuggestions,
      currentSuggestion: currentSuggestion,
      stepsEnabled: selectedSuggestions.length > 0 // 只要选择了至少一个建议就启用其他步骤
    });
    
    console.log('选择后状态:', '已选建议数:', selectedSuggestions.length, 'stepsEnabled:', this.data.stepsEnabled);
    
    this.saveCurrentStepData();
  },
  
  // 根据选择的建议生成研学计划
  generatePlan: function() {
    if (this.data.selectedSuggestions.length === 0) {
      wx.showToast({
        title: '请至少选择一个建议',
        icon: 'none'
      });
      return;
    }
    
    // 先生成预研学指导故事
    this.generateGuideStory()
      .then(() => {
        // 自动切换到指导故事页面
        this.switchSubStep({ currentTarget: { dataset: { subStep: 'guideStory' } } });
      })
      .catch(error => {
        console.error('生成预研学指导故事失败:', error);
        
        // 如果生成失败，仍然继续研学计划
        this.generateStudyPlan();
      });
  },
  
  // 生成预研学指导故事
  generateGuideStory: function() {
    const that = this;
    
    // 如果未选择任何研学建议，显示提示
    if (that.data.selectedSuggestions.length === 0) {
      wx.showToast({
        title: '请先选择研学建议',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 检查是否需要基本信息
    if (!that.data.specificVenue || !that.data.venueType) {
      wx.showToast({
        title: '请先完善基本信息',
        icon: 'none',
        duration: 2000
      });
      // 切换到信息页面
      that.setData({
        subStep: 'info'
      });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '正在生成导读材料...',
      mask: true
    });
    
    // 设置计划生成超时提示
    const storyTimeoutId = setTimeout(() => {
      wx.showToast({
        title: '导读材料生成中，请耐心等待',
        icon: 'none',
        duration: 3000
      });
    }, 30000); // 30秒后提示
    
    // 确保有指导故事的字段
    that.setData({
      guideStory: '',
      guideStoryNodes: null,
      storyImageUrl: '',
      isLoadingImage: false
    });
    
    // 构造AI提示
    const kidsInfo = that.data.kidsInfo.map(kid => 
      `孩子${kid.id}: ${kid.gender === 'male' ? '男' : '女'}, ${kid.age}岁`
    ).join('\n');
    
    const selectedSuggestions = that.data.selectedSuggestions.map(suggestion => 
      suggestion.title + ': ' + suggestion.description
    ).join('\n\n');
    
    // 构建简明提示文本
    const promptText = 
`你是一位经验丰富的研学导师，请为以下研学活动创作一篇导读材料。
研学场所类型: ${that.data.venueType}
具体场所: ${that.data.specificVenue}
参与者: ${kidsInfo}
研学建议: ${selectedSuggestions}

请创作一篇有教育意义的导读材料，向家长介绍如何指导孩子进行这次研学活动。内容包括:
1. 简要介绍研学场所的特点和教育价值
2. 针对该场所的研学要点和注意事项
3. 如何引导孩子观察和思考
4. 提供2-3个互动问题，帮助家长引导孩子
5. 总结这次研学可能获得的收获

格式要求：
- 分段清晰，每段都有明确的序号
- 使用简单直接的语言
- 内容约800-1000字
- 可使用"**加粗内容**"标记重点内容`;
    
    console.log('开始生成研学指导故事，请求内容:', promptText);
    
    // 请求第二个AI模型
    return new Promise((resolve, reject) => {
      that.requestAIStream('2', promptText, 
        null, // 不需要处理数据块
        function(storyText) {
          // 清除超时定时器
          clearTimeout(storyTimeoutId);
          
          // 将文本转换为富文本
          const storyNodes = that.parseStoryText(storyText);
          
          // 更新数据
          that.setData({
            guideStory: storyText,
            guideStoryNodes: storyNodes,
            stepsEnabled: true, // 生成故事后允许进入研学中和研学后步骤
          });
          
          wx.hideLoading();
          
          // 自动切换到导读材料页面
          that.setData({
            subStep: 'guideStory',
          });
          that.updatePageTitle();
          
          // 保存导读材料到缓存
          try {
            wx.setStorageSync('studyProcess_1_guideStory', {
              story: storyText,
              storyNodes: storyNodes
            });
          } catch (e) {
            console.error('保存指导故事失败:', e);
          }
          
          // 显示图片生成提示
          wx.showLoading({
            title: '正在生成插图...',
            mask: true
          });
          
          // 生成故事关联图片
          that.generateStoryImage(storyText)
            .then(() => {
              console.log('故事图片生成成功');
              wx.hideLoading();
            })
            .catch(err => {
              console.error('故事图片生成失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '图片生成失败，但导读材料已生成',
                icon: 'none',
                duration: 2000
              });
            })
            .finally(() => {
              that.saveCurrentStepData();
              that.setData({
                isLoadingImage: false
              });
              resolve();
            });
        }
      );
    });
  },
  
  // 生成故事配图 - 完全简化版本
  generateStoryImage: function(storyText) {
    const that = this;
    
    // 构建一个非常简短的图像生成提示
    const imagePromptText = `为"${this.data.specificVenue || '研学场所'}"的研学故事创建一张适合儿童的插图`;
    
    console.log('发送简化的图片生成请求:', imagePromptText);
    
    return new Promise((resolve, reject) => {
      // 显示加载状态
      that.setData({
        isLoadingImage: true
      });
      
      // 设置图片生成超时定时器
      const imageTimeoutId = setTimeout(() => {
        wx.showToast({
          title: '图片生成需要较长时间，请耐心等待',
          icon: 'none',
          duration: 3000
        });
      }, 30000); // 30秒后提示等待
      
      // 简化的图片生成请求
      wx.request({
        url: 'http://119.3.217.132:5000/pic/1',
        method: 'POST',
        data: {
          text: imagePromptText,
          key: 'hjl2004'
        },
        header: {
          'Content-Type': 'application/json',
          'X-Access-Key': 'hjl2004'
        },
        success: function(res) {
          clearTimeout(imageTimeoutId);
          console.log('图像生成响应:', res);
          
          // 最简单的响应处理 - 只检查最基本的条件
          if (res.statusCode === 200 && res.data && res.data.url) {
            console.log('成功获取图片URL:', res.data.url);
            
            // 保存图片URL
            that.setData({
              storyImageUrl: res.data.url,
              isLoadingImage: false
            });
            
            // 保存到缓存
            try {
              const storyData = wx.getStorageSync('studyProcess_1_guideStory') || {};
              storyData.imageUrl = res.data.url;
              wx.setStorageSync('studyProcess_1_guideStory', storyData);
            } catch(e) {
              console.error('保存图片URL失败:', e);
            }
            
            resolve(res.data.url);
          } else {
            console.error('获取图片URL失败:', res.data);
            that.setData({
              isLoadingImage: false
            });
            
            // 显示友好的错误提示
            wx.showToast({
              title: '图片生成失败，请稍后再试',
              icon: 'none',
              duration: 2000
            });
            
            reject(new Error('获取图片URL失败'));
          }
        },
        fail: function(err) {
          clearTimeout(imageTimeoutId);
          console.error('请求图像生成服务失败:', err);
          
          that.setData({
            isLoadingImage: false
          });
          
          // 显示友好的错误提示
          wx.showToast({
            title: '图片请求失败，网络异常',
            icon: 'none',
            duration: 2000
          });
          
          reject(err);
        }
      });
    });
  },
  
  // 辅助方法：将故事文本转换为 rich-text 节点，支持序号加粗和换行
  parseStoryText: function(text) {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map(line => {
      // 处理序号加粗
      let match = line.match(/^(\d+[\.、]|[一二三四五六七八九十]、)/);
      if (match) {
        return {
          name: 'div',
          attrs: { class: 'story-line' },
          children: [
            { name: 'strong', children: [{ type: 'text', text: match[0] }] },
            { type: 'text', text: line.slice(match[0].length) }
          ]
        };
      } 
      // 处理 **文本** 双星号加粗格式
      else if (line.includes('**')) {
        const parts = [];
        let lastIndex = 0;
        let boldStart = -1;
        
        // 查找所有 ** 标记位置
        for (let i = 0; i < line.length - 1; i++) {
          if (line[i] === '*' && line[i+1] === '*') {
            if (boldStart === -1) {
              // 开始加粗
              if (i > lastIndex) {
                parts.push({ type: 'text', text: line.substring(lastIndex, i) });
              }
              boldStart = i;
              i++; // 跳过第二个 *
            } else {
              // 结束加粗
              const boldText = line.substring(boldStart + 2, i);
              if (boldText) {
                parts.push({ 
                  name: 'strong', 
                  children: [{ type: 'text', text: boldText }] 
                });
              }
              boldStart = -1;
              lastIndex = i + 2;
              i++; // 跳过第二个 *
            }
          }
        }
        
        // 添加最后一部分文本
        if (lastIndex < line.length) {
          parts.push({ type: 'text', text: line.substring(lastIndex) });
        }
        
        return {
          name: 'div',
          attrs: { class: 'story-line' },
          children: parts
        };
      } else {
        return { name: 'div', attrs: { class: 'story-line' }, children: [{ type: 'text', text: line }] };
      }
    });
  },
  
  // 从导读材料页直接开始研学活动
  startStudyActivity: function() {
    this.generateStudyPlan();
  },
  
  // 生成研学计划(使用第三个AI)
  generateStudyPlan: function() {
    const that = this;
    
    // 显示加载状态
    wx.showLoading({
      title: '生成研学计划中...',
      mask: true // 添加遮罩防止用户触摸屏幕
    });
    
    // 使用所有选择的建议
    const selectedSuggestions = that.data.selectedSuggestions;
    if (selectedSuggestions.length === 0) {
      wx.hideLoading();
      wx.showToast({
        title: '请至少选择一个研学建议',
        icon: 'none'
      });
      return;
    }

    // 确保只包含用户实际选择的建议，且编号从1开始连续
    const suggestionsText = selectedSuggestions.map((suggestion, index) => {
      return `研学建议${index+1}：
      主题：${suggestion.title || ''}
      描述：${suggestion.description || ''}
      学习目标：${suggestion.learningGoals || ''}`;
    }).join('\n\n');

    const kidsInfo = that.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    // 设置超时定时器，提示用户
    const planTimeoutId = setTimeout(() => {
      wx.showToast({
        title: '研学计划生成中，请耐心等待',
        icon: 'none',
        duration: 3000
      });
    }, 30000); // 30秒后提示
    
    // 设计 JSON 输出格式的提示词，只返回 JSON 格式
    const promptText = `请根据以下信息生成研学计划，并仅以 JSON 格式返回，格式示例如下：
{
  "planTitle": "研学计划标题",
  "steps": [
    {"title": "步骤1", "content": "步骤1内容"}
  ],
  "studyCards": [
    {"title": "研学卡片1", "content": "卡片内容"}
  ]
}
      目的地类型：${that.data.venueType}
      具体场所：${that.data.specificVenue}
      时长：${that.data.duration}
      参与者：${kidsInfo}
用户选择的研学建议：${suggestionsText}
指导故事：${that.data.guideStory}`;
  
    console.log('向第三个AI服务发送请求，生成研学计划');
    console.log('AI3请求内容：', promptText);
    
    // 发送请求到第三个AI
    that.requestAIStream('3', promptText, 
      null, // 不需要处理数据块
      function(finalText) {
        // 清除超时定时器
        clearTimeout(planTimeoutId);
        
        wx.hideLoading();
        console.log('计划生成完成, 长度:', finalText.length);
        
        // 使用handlePlainTextPlan函数处理返回的文本
        that.handlePlainTextPlan(finalText);
      }
    );
  },
  
  // 提取计划数据的方法
  extractPlanData: function(text) {
    // 删除整个函数
  },
  
  // 添加一个空的兼容方法，防止之前的代码调用出错
  updatePlanWithData: function(parsedData, suggestedTitle) {
    // 删除整个函数
  },
  
  // 研学后相关函数
  chooseImage: function() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        that.setData({
          tempFilePaths: res.tempFilePaths
        });
      }
    });
  },
  
  onTextInput: function(e) {
    this.setData({
      reflectionText: e.detail.value
    });
  },
  
  shareResults: function() {
    if (!this.data.tempFilePaths.length && !this.data.reflectionText) {
      wx.showToast({
        title: '请添加图片或文字内容',
        icon: 'none'
      });
      return;
    }
    
    this.saveCurrentStepData();
    
    wx.navigateTo({
      url: '/pages/share/share'
    });
  },
  
  viewDetails: function() {
    const that = this;
    
    // 组织要传递的数据
    try {
      // 步骤详情
      const planDetails = {
        title: that.data.planTitle,
        venue: that.data.specificVenue,
        duration: that.data.duration,
        steps: that.data.steps,
        studyCards: that.data.studyCards
      };
      
      // 将数据存储到本地缓存中
      wx.setStorageSync('studyPlanDetails', planDetails);
      
      // 导航到详情页面
      wx.navigateTo({
        url: '/pages/studyDetail/studyDetail'
      });
    } catch (error) {
      console.error('保存研学详情数据失败:', error);
      wx.showToast({
        title: '加载详情失败',
        icon: 'none'
      });
    }
  },
  
  goBack: function() {
    // 如果是研学前的预研学指导故事页，切回建议列表页
    if (this.data.currentStep === 1 && this.data.subStep === 'guideStory') {
      this.setData({
        subStep: 'suggestions'
      });
      this.updatePageTitle();
      return;
    }
    
    // 如果是研学前的建议详情页，切回建议列表页
    if (this.data.currentStep === 1 && this.data.subStep === 'suggestionDetail') {
      this.setData({
        subStep: 'suggestions',
        currentSuggestion: null
      });
      this.updatePageTitle();
      return;
    }
    
    // 如果是研学前的建议列表页，切回信息填写页
    if (this.data.currentStep === 1 && this.data.subStep === 'suggestions') {
      this.setData({
        subStep: 'info'
      });
      this.updatePageTitle();
      return;
    }
    
    // 否则回到上一步
    const prevStep = this.data.currentStep - 1;
    if (prevStep >= 1) {
      this.saveCurrentStepData();
      
      // 关键修改：设置返回按钮状态
      // 只有当返回到首页(研学前)且是通过初始加载进入时才隐藏返回按钮
      const hideBackButton = prevStep === 1 && !this.data.fromOtherStep;
      
      this.setData({
        currentStep: prevStep,
        subStep: prevStep === 1 ? (this.data.suggestions.length > 0 ? 'suggestions' : 'info') : '',
        showBackIcon: !hideBackButton
      });
      this.updatePageTitle();
    } else {
      wx.navigateBack();
    }
  },
  
  // 添加一个函数，从研学中到研学后
  completeStudy: function() {
    this.saveCurrentStepData();
    this.setData({
      currentStep: 3,
      showBackIcon: true
    });
    this.updatePageTitle();
  },
  
  // 删除孩子信息
  deleteKid: function(e) {
    const index = e.currentTarget.dataset.index;
    let kidsInfo = this.data.kidsInfo;
    
    // 确保至少保留一个孩子
    if (kidsInfo.length > 1) {
      kidsInfo.splice(index, 1);
      
      // 重新分配ID
      for (let i = 0; i < kidsInfo.length; i++) {
        kidsInfo[i].id = i + 1;
      }
      
      this.setData({
        kidsInfo: kidsInfo
      });
    }
  },
  
  // 流式请求AI服务
  requestAIStream: function(serviceId, text, processChunk, onComplete) {
    const that = this;
    const serviceUrl = `http://119.3.217.132:5000/${serviceId}`;
    
    console.log(`向AI服务${serviceId}发送请求, URL:`, serviceUrl);
    
    // 设置请求参数
    const requestData = {
      text: text,
      key: 'hjl2004',
      stream: false
    };
    
    // 显示加载提示
    wx.showLoading({
      title: '正在思考中...',
      mask: true
    });
    
    // 设置状态为加载中
    this.setData({
      isLoadingMore: true
    });
    
    // 发送普通请求
    wx.request({
      url: serviceUrl,
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': 'hjl2004',
        'X-Stream': 'false'
      },
      timeout: 120000, // 增加超时时间到120秒
      success: function(res) {
        console.log('请求成功状态:', res.statusCode);
        wx.hideLoading();
        
        if (res.statusCode !== 200) {
          console.error('请求失败，状态码:', res.statusCode);
        wx.showToast({
            title: `请求失败: ${res.statusCode}`,
          icon: 'none'
        });
          that.setData({ isLoadingMore: false });
          if (onComplete) onComplete(`请求失败: ${res.statusCode}`);
          return;
        }
        
        const responseData = res.data;
        
        if (responseData.error) {
          console.error('AI服务返回错误:', responseData.error);
          wx.showToast({
            title: responseData.error,
            icon: 'none'
          });
          that.setData({ isLoadingMore: false });
          if (onComplete) onComplete(responseData.error);
          return;
        }
        
        // 直接使用content
        const content = responseData.content;
        if (!content) {
          wx.showToast({
            title: '获取AI回复失败',
            icon: 'none'
          });
          that.setData({ isLoadingMore: false });
          if (onComplete) onComplete("获取AI回复失败");
                return;
              }
              
        console.log(`AI${serviceId}返回内容开头:`, content.substring(0, 100) + '...');
        if (serviceId === '1') {
          console.log('AI1完整返回:', content);
        }
        
        // 根据不同服务ID处理内容
        if (serviceId === '1') {
          // 研学前 - 处理建议
          that.handlePlainTextSuggestions(content);
                  that.setData({
            isLoadingMore: false,
            showSuggestionsTab: true,
            subStep: 'suggestions'
          });
        } else if (serviceId === '2') {
          // 处理指导故事
          that.setData({
            guideStory: content,
                    isLoadingMore: false
                  });
          try {
            wx.setStorageSync('studyProcess_1_guideStory', {
              guideStory: content
            });
                  } catch (e) {
            console.error('保存指导故事失败:', e);
          }
        } else if (serviceId === '3') {
          // 处理研学计划
          that.handlePlainTextPlan(content);
          that.setData({ isLoadingMore: false });
        }
        
        if (onComplete) onComplete(content);
      },
      fail: function(err) {
        wx.hideLoading();
        console.error('AI请求失败:', err);
        wx.showToast({
          title: '请求超时或网络异常，请稍后重试',
          icon: 'none',
          duration: 3000
        });
        that.setData({ isLoadingMore: false });
        if (onComplete) onComplete("AI服务请求失败");
      },
      complete: function() {
        wx.hideLoading();
        that.setData({ isLoadingMore: false });
      }
    });
  },
  
  // 优化updatePlainTextSuggestions函数
  updatePlainTextSuggestions: function(text) {
    if (!text || text.trim().length < 30) return; // 确保有足够的文本
    
    console.log('正在从纯文本更新建议，长度:', text.length);
    
    // 尝试查找主题和描述
    const lines = text.split('\n');
    let currentSuggestions = [];
    let currentId = null;
    let currentTheme = null;
    let currentDesc = '';
    let currentAgeRange = '6-12岁';
    let currentGoals = '培养观察力，增强探索精神，提升动手能力';
    let currentProcess = '';
    let currentThinking = '';
    
    // 标记当前正在处理哪个部分
    let processingSection = 'desc'; // 可能的值: desc, age, goals, process, thinking
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过空行
      if (!line) continue;
      
      // 先查找是否包含数字序号，表示新的主题开始
      // 匹配 "1. 【主题】" 或 "1.【主题】" 或 "主题1："等格式
      const themeMatch = line.match(/^(\d+)[\.\、]?\s*【([^】]+)】/) || 
                          line.match(/^(\d+)[\.\、]?\s*\[\s*([^\]]+)\s*\]/) || 
                          line.match(/^主题\s*(\d+)\s*[:：]\s*.+/) ||
                          line.match(/^建议\s*(\d+)\s*[:：]\s*.+/) ||
                          line.match(/^(\d+)\.\s*([^：:]+)[：:]\s*([^\n]+)/);
      
      if (themeMatch) {
        // 如果有之前的主题，保存它
        if (currentTheme) {
          currentSuggestions.push({
            id: currentId || currentSuggestions.length + 1,
            title: currentTheme,
            description: currentDesc,
            ageRange: currentAgeRange,
            learningGoals: currentGoals,
            isSelected: false,
            wanfaLiucheng: currentProcess,
            gaojieThinking: currentThinking
          });
        }
        
        // 开始新主题
        currentId = parseInt(themeMatch[1]) || currentSuggestions.length + 1;
        currentTheme = themeMatch[2] || line.replace(/^\d+[\.\、]?\s*/, '');
        currentDesc = '';
        currentAgeRange = '6-12岁';
        currentGoals = '培养观察力，增强探索精神，提升动手能力';
        currentProcess = '';
        currentThinking = '';
        processingSection = 'desc';
        
        // 提取当前行中可能的描述部分
        const remainingText = line.replace(/^(\d+)[\.\、]?\s*【[^】]+】/, '')
                                 .replace(/^(\d+)[\.\、]?\s*\[\s*[^\]]+\s*\]/, '')
                                 .replace(/^主题\s*(\d+)\s*[:：]\s*.+/, '')
                                 .replace(/^建议\s*(\d+)\s*[:：]\s*.+/, '').trim();
        if (remainingText) {
          currentDesc = remainingText;
        }
      } else {
        // 检查是否是各个部分的标记行
        if (line.includes('年龄') || line.includes('适合') || line.includes('推荐阶段')) {
          processingSection = 'age';
          const ageMatch = line.match(/(\d+\s*-\s*\d+\s*岁)/) || 
                            line.match(/(\d+\s*岁以上)/) || 
                            line.match(/(\d+\s*岁以下)/);
          if (ageMatch) {
            currentAgeRange = ageMatch[1];
          }
          continue;
        } else if (line.includes('学习目标') || line.includes('能力目标') || line.includes('核心能力')) {
          processingSection = 'goals';
          const goalContent = line.split(/[:：]/)[1];
          if (goalContent) {
            currentGoals = goalContent.trim();
          }
          continue;
        } else if (line.includes('玩法流程') || line.includes('任务') || line.includes('活动流程')) {
          processingSection = 'process';
          const processContent = line.split(/[:：]/)[1];
          if (processContent) {
            currentProcess = processContent.trim();
          }
          continue;
        } else if (line.includes('高阶思维') || line.includes('高阶提示')) {
          processingSection = 'thinking';
          const thinkingContent = line.split(/[:：]/)[1];
          if (thinkingContent) {
            currentThinking = thinkingContent.trim();
          }
          continue;
        }
        
        // 根据当前处理的部分添加内容
        switch(processingSection) {
          case 'desc':
            if (currentDesc) currentDesc += ' ';
            currentDesc += line;
            break;
          case 'age':
            const ageMatch = line.match(/(\d+\s*-\s*\d+\s*岁)/) || 
                              line.match(/(\d+\s*岁以上)/) || 
                              line.match(/(\d+\s*岁以下)/);
            if (ageMatch) {
              currentAgeRange = ageMatch[1];
            }
            break;
          case 'goals':
            if (currentGoals) currentGoals += ' ';
            currentGoals += line;
            break;
          case 'process':
            if (currentProcess) currentProcess += ' ';
            currentProcess += line;
            break;
          case 'thinking':
            if (currentThinking) currentThinking += ' ';
            currentThinking += line;
            break;
        }
        
        // 没有明确的部分标识，但发现了主题标记，可能是内嵌在内容中
        if (!currentTheme && (line.includes('【') || line.includes('['))) {
          const titleMatch = line.match(/【([^】]+)】/) || line.match(/\[\s*([^\]]+)\s*\]/);
          if (titleMatch) {
            currentTheme = titleMatch[1];
            currentDesc = line.replace(/【[^】]+】/, '').replace(/\[\s*[^\]]+\s*\]/, '').trim();
            processingSection = 'desc';
          }
        }
      }
    }
    
    // 添加最后一个主题（如果有的话）
    if (currentTheme) {
      currentSuggestions.push({
        id: currentId || currentSuggestions.length + 1,
        title: currentTheme,
        description: currentDesc,
        ageRange: currentAgeRange,
        learningGoals: currentGoals,
        isSelected: false,
        wanfaLiucheng: currentProcess,
        gaojieThinking: currentThinking
      });
    }
    
    // 如果还是没有建议，尝试查找内容中的【】或[]包围的部分作为主题
    if (currentSuggestions.length === 0) {
      const fullText = text.trim();
      const titleMatches = fullText.match(/【([^】]+)】/g) || fullText.match(/\[\s*([^\]]+)\s*\]/g);
      
      if (titleMatches && titleMatches.length > 0) {
        for (let i = 0; i < Math.min(titleMatches.length, 5); i++) {
          const titleText = titleMatches[i].replace(/【|】|\[|\]/g, '').trim();
          let descriptionText = '';
          
          // 尝试提取描述，取标题后的一部分文本
          const titleIndex = fullText.indexOf(titleMatches[i]);
          if (titleIndex > -1) {
            const afterTitleText = fullText.substring(titleIndex + titleMatches[i].length);
            const nextTitleIndex = afterTitleText.search(/【[^】]+】|\[\s*[^\]]+\s*\]/);
            descriptionText = nextTitleIndex > -1 
              ? afterTitleText.substring(0, nextTitleIndex).trim() 
              : afterTitleText.substring(0, 150).trim();
          }
          
          currentSuggestions.push({
            id: i + 1,
            title: titleText,
            description: descriptionText,
            ageRange: '6-12岁',
            learningGoals: '培养观察力，增强探索精神，提升动手能力',
            isSelected: false,
            wanfaLiucheng: '',
            gaojieThinking: ''
          });
        }
      }
    }
    
    // 如果经过所有处理仍没有建议，则按段落拆分作为建议
    if (currentSuggestions.length === 0 && text.length > 100) {
      const paragraphs = text.split(/\n\s*\n/);
      for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
        if (paragraphs[i] && paragraphs[i].trim().length > 30) {
          const para = paragraphs[i].trim();
          let title = `研学主题${i+1}`;
          
          // 尝试从段落中提取标题
          const firstLine = para.split('\n')[0];
          if (firstLine && firstLine.length < 50) {
            title = firstLine.trim();
          }
          
          currentSuggestions.push({
            id: i + 1,
            title: title,
            description: para.replace(title, '').substring(0, 150).trim(),
            ageRange: '6-12岁',
            learningGoals: '培养观察力，增强探索精神，提升动手能力',
            isSelected: false,
            wanfaLiucheng: '',
            gaojieThinking: ''
          });
        }
      }
    }
    
    // 如果提取到了建议，更新UI
    if (currentSuggestions.length > 0) {
      console.log('从纯文本提取到建议数量: ', currentSuggestions.length);
      
      // 移除显示加载状态提示
      // wx.showLoading({
      //   title: `已提取${currentSuggestions.length}个建议`,
      // });
      
      // 确保标题不为空
      currentSuggestions = currentSuggestions.map(suggestion => {
        if (!suggestion.title || suggestion.title.trim().length === 0) {
          suggestion.title = '研学主题' + suggestion.id;
        }
        return suggestion;
      });
      
      this.setData({
        suggestions: currentSuggestions
      });
    }
  },
  
  // 处理完整的纯文本，生成最终建议
  handlePlainTextSuggestions: function(text) {
    if (!text || text.trim().length < 50) {
      // 没有足够的文本，不使用默认建议
      this.setData({
        suggestions: [],
        isLoadingMore: false,
        showSuggestionsTab: true,
        subStep: 'suggestions'
      });
      
      wx.showToast({
        title: '未能获取有效建议',
        icon: 'none'
      });
      return;
    }
    
    console.log('从完整纯文本生成建议');
    
    // 一次性提取所有可能的建议
    let suggestions = extractSuggestionsFromText(text);
    
    // 确保所有建议的 isSelected 属性为 false
    suggestions = suggestions.map(suggestion => ({
      ...suggestion,
      isSelected: false
    }));
    
    if (suggestions.length > 0) {
      console.log('成功提取建议数量:', suggestions.length);
      this.setData({
        suggestions: suggestions,
        selectedSuggestions: [], // 清空已选择的建议
        isLoadingMore: false,
        showSuggestionsTab: true,
        subStep: 'suggestions'
      });
      
      this.updatePageTitle();
      this.saveCurrentStepData();
    } else {
      // 如果提取失败，仍然不使用默认建议
      this.setData({
        suggestions: [],
        selectedSuggestions: [], // 清空已选择的建议
        isLoadingMore: false,
        showSuggestionsTab: true,
        subStep: 'suggestions'
      });
      
      wx.showToast({
        title: '解析建议失败',
        icon: 'none'
      });
    }
  },
  
  // 添加验证基本信息的方法
  validateBasicInfo: function() {
    // 验证孩子信息
    if (this.data.kidsInfo.length === 0) {
      wx.showToast({
        title: '请添加至少一个孩子信息',
        icon: 'none'
      });
      return false;
    }
    
    // 验证每个孩子的信息是否完整
    for (let i = 0; i < this.data.kidsInfo.length; i++) {
      const kid = this.data.kidsInfo[i];
      if (!kid.gender || !kid.age) {
        wx.showToast({
          title: `请完善孩子${kid.id}的信息`,
          icon: 'none'
        });
        return false;
      }
    }
    
    // 验证目的地信息
    if (!this.data.venueType) {
      wx.showToast({
        title: '请选择场景类型',
        icon: 'none'
      });
      return false;
    }
    
    if (!this.data.specificVenue) {
      wx.showToast({
        title: '请选择具体场所',
        icon: 'none'
      });
      return false;
    }
    
    // 验证时长
    if (!this.data.duration) {
      wx.showToast({
        title: '请选择游览时长',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },
  
  // 处理纯文本形式的研学计划
  handlePlainTextPlan: function(text) {
    // 使用 JSON 格式解析研学计划
    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('解析研学计划 JSON 失败，使用原始文本回退:', e);
      wx.showToast({ title: '解析研学计划失败，已回退到文本模式', icon: 'none' });
      // 回退：将原始文本作为单步计划展示
      const fallbackTitle = this.data.specificVenue ? `${this.data.specificVenue}研学计划` : '研学计划';
      this.setData({
        planTitle: fallbackTitle,
        steps: [{ id: 1, title: fallbackTitle, content: text.trim() }],
        studyCards: [],
        planGenerated: true,
        currentStep: 2
      });
      this.saveCurrentStepData();
      this.updatePageTitle();
      return;
    }
    const planTitle = data.planTitle || `${this.data.specificVenue || '研学目的地'}研学计划`;
    const steps = Array.isArray(data.steps)
      ? data.steps.map((item, idx) => ({ id: idx + 1, title: item.title || '', content: item.content || item.description || '' }))
      : [];
    
    // 确保研学卡片有正确的结构和样式
    const studyCards = Array.isArray(data.studyCards)
      ? data.studyCards.map((item, idx) => ({ 
          id: idx + 1, 
          title: item.title || '研学卡片 ' + (idx + 1), 
          content: item.content || '',
          // 为卡片随机分配一个颜色，确保样式生效
          borderColor: this.getCardColor(idx)
        }))
      : [];
    
    this.setData({
      planTitle: planTitle,
      steps: steps,
      studyCards: studyCards,
      planGenerated: true,
      currentStep: 2
    });
    
    // 确保研学卡片容器样式正确
    setTimeout(() => {
      // 在DOM渲染完成后，检查研学卡片是否正确渲染
      this.checkStudyCardsStyle();
    }, 500);
    
    this.saveCurrentStepData();
    this.updatePageTitle();
  },
  
  // 获取卡片边框颜色
  getCardColor: function(index) {
    // 几种不同的颜色
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63'];
    return colors[index % colors.length];
  },
  
  // 检查研学卡片样式渲染
  checkStudyCardsStyle: function() {
    console.log('检查研学卡片样式是否正确渲染');
    // 直接刷新一下数据，触发重新渲染
    if (this.data.studyCards && this.data.studyCards.length > 0) {
      const updatedCards = this.data.studyCards.map(card => {
        if (!card.borderColor) {
          return {
            ...card,
            borderColor: this.getCardColor(card.id - 1)
          };
        }
        return card;
      });
      
      this.setData({
        studyCards: updatedCards
      });
    }
  },
  
  // 处理纯文本形式的反思内容
  handlePlainTextReflection: function(text) {
    console.log('处理纯文本反思内容');
    
    if (!text || text.trim().length === 0) {
      wx.showToast({
        title: '未能生成有效的反思内容',
        icon: 'none'
      });
      return;
    }
    
    // 将AI生成的反思文本保存起来
    this.setData({
      reflectionText: text,
      currentStep: 3  // 自动切换到研学后步骤
    });
    
    // 保存数据
    this.saveCurrentStepData();
    this.updatePageTitle();
    
    // 显示成功提示
    wx.showToast({
      title: '已生成反思内容',
      icon: 'success'
    });
  },
  
  // 辅助函数：将文本分割成指定数量的段落
  splitTextIntoParagraphs: function(text, count) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const result = [];
    
    if (lines.length <= count) {
      return lines; // 如果行数少于或等于目标段落数，直接返回
    }
    
    const linesPerParagraph = Math.ceil(lines.length / count);
    
    for (let i = 0; i < count; i++) {
      const start = i * linesPerParagraph;
      const end = Math.min(start + linesPerParagraph, lines.length);
      if (start < lines.length) {
        result.push(lines.slice(start, end).join('\n'));
      }
    }
    
    return result;
  },
  
  // 根据步骤生成默认研学卡片
  generateDefaultCards: function(steps) {
    const cards = [];
    
    // 确保至少有一张研学卡片
    if (steps && steps.length > 0) {
      // 从每个步骤中提取关键信息
      for (let i = 0; i < Math.min(steps.length, 3); i++) {
        const step = steps[i];
        // 提取步骤描述的前50个字符作为卡片内容
        const content = step.description.substring(0, 50) + (step.description.length > 50 ? '...' : '');
        
        cards.push({
          title: `研学卡片 ${i + 1}`,
          content: content
        });
      }
    } else {
      // 如果没有步骤，创建一个默认卡片
      cards.push({
        title: '研学卡片 1',
        content: '记录研学过程中的重要发现和思考'
      });
    }
    
    return cards;
  },
  
  // 语音播放相关函数
  
  // 初始化音频上下文
  initAudioContext: function() {
    if (!this.data.audioContext) {
      const audioContext = wx.createInnerAudioContext();
      
      audioContext.onPlay(() => {
        console.log('音频开始播放');
      });
      
      audioContext.onError((res) => {
        console.error('音频播放错误:', res);
        wx.showToast({
          title: '音频播放失败',
          icon: 'none'
        });
        this.setData({
          isPlayingAudio: false,
          currentPlayingId: ''
        });
      });
      
      audioContext.onEnded(() => {
        console.log('音频播放结束');
        this.setData({
          isPlayingAudio: false,
          currentPlayingId: ''
        });
      });
      
      this.setData({
        audioContext: audioContext
      });
    }
  },
  
  // 播放或暂停文本语音
  togglePlayAudio: function(e) {
    // 初始化音频上下文
    this.initAudioContext();
    
    const textId = e.currentTarget.dataset.id;
    const text = e.currentTarget.dataset.text;
    
    // 如果已经在播放这段文本，则暂停
    if (this.data.isPlayingAudio && this.data.currentPlayingId === textId) {
      this.data.audioContext.pause();
      this.setData({
        isPlayingAudio: false,
        currentPlayingId: ''
      });
      return;
    }
    
    // 如果正在播放其他文本，先停止
    if (this.data.isPlayingAudio) {
      this.data.audioContext.stop();
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '加载语音中...',
      mask: true
    });
    
    // 设置当前播放状态
    this.setData({
      isPlayingAudio: true,
      currentPlayingId: textId,
      playingText: text
    });
    
    // 请求语音服务
    const that = this;
    const serviceUrl = 'http://119.3.217.132:5000/spk/1';
    
    wx.request({
      url: serviceUrl,
      method: 'POST',
      data: {
        text: text,
        key: 'hjl2004'
      },
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': 'hjl2004'
      },
      responseType: 'arraybuffer', // 重要：接收二进制数据
      success: function(res) {
        wx.hideLoading();
        
        if (res.statusCode !== 200) {
          console.error('语音请求失败，状态码:', res.statusCode);
          wx.showToast({
            title: `语音请求失败: ${res.statusCode}`,
            icon: 'none'
          });
          that.setData({
            isPlayingAudio: false,
            currentPlayingId: ''
          });
          return;
        }
        
        // 将二进制数据转换为临时文件
        const fsm = wx.getFileSystemManager();
        const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio_${Date.now()}.mp3`;
        
        try {
          fsm.writeFileSync(tempFilePath, res.data, 'binary');
          console.log('音频文件已保存:', tempFilePath);
          
          // 播放音频
          that.data.audioContext.src = tempFilePath;
          that.data.audioContext.play();
        } catch (error) {
          console.error('保存或播放音频文件失败:', error);
          wx.showToast({
            title: '语音播放失败',
            icon: 'none'
          });
          that.setData({
            isPlayingAudio: false,
            currentPlayingId: ''
          });
        }
      },
      fail: function(error) {
        wx.hideLoading();
        console.error('语音请求发送失败:', error);
        wx.showToast({
          title: '语音请求失败',
          icon: 'none'
        });
        that.setData({
          isPlayingAudio: false,
          currentPlayingId: ''
        });
      }
    });
  },
  
  // 清理音频资源
  onUnload: function() {
    if (this.data.audioContext) {
      this.data.audioContext.stop();
      this.data.audioContext.destroy();
    }
  },
  
  // base64转图片，用于生成所需图标
  base64ToImage: function(base64, callback) {
    if (!base64) return;
    
    // 去掉 data:image/png;base64, 前缀
    base64 = base64.replace(/^data:image\/\w+;base64,/, '');
    
    // 获取文件系统管理器
    const fsm = wx.getFileSystemManager();
    const fileName = new Date().getTime();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}.png`;
    
    // 写入文件
    fsm.writeFile({
      filePath: filePath,
      data: base64,
      encoding: 'base64',
      success: function() {
        if (callback) {
          callback(filePath);
        }
      },
      fail: function(err) {
        console.error('写入图片文件失败:', err);
      }
    });
  },
  
  // 创建音频播放和暂停图标
  createAudioIcons: function() {
    const playIconBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAArNJREFUaEPtmj1rFUEUhp+rUdBCjQZTKMFK0U4UNAYRRLQxKFiIjR8/QP0HNhYGbAIWgp2VnQgWRkUbaywULUXBzkIUFUVFfA/szGXv7Ozs3jRz71wzs3PmnWfOnJmZXaHlQ1rOTw2g7gzWGRhoBhasA8a2kJmtAyvAW0lf+s0vKwNm9h44CrySdDYHQC6Ay8Bd4LmkM9UgzewGcL/YX9KxZF9JXdvXHVTSwcx+A5uAG5KehP0bwIqk3TkAojYzs3XAPUmHyxuY2TBwzsyGJP0ws9vAHeBE05IIPEcl9QSQNB4BXQLOAP+AFZKmcgCU2vwBYKFY6IakR2Z2FngCHJa0lAsgAJ8GBoG3kg4WbcaBh8BhSR9zAsQs/AXGgAgqyJAVIDDxBTgF7AVmJY0UzE+AC8CkpLleHFvpU1YGzOwbsB3YJOlP0f5TcbL0I6HcAMGlfjc6ApSrUx0AvdJoZltKZfSzbwkts1RViOKi1RWgdR2wnoCZeVsQ/Z5YXB0+SorqSzILlb58SdLdsu2cfcw25ujzB2BUUT82NiwD84XI46PWLL9lAWGbeK2/A14v+JLdF48q8Ox99kq64mUgEDMrKSklyzM7uy8yNb3c3OAWitTUAUBLMuAlNK5E/wEaGUgF2Mi+0StdvGCDHzPS2lYGCE6lQzBtGiApiaQMND4DPuPW+gxUr0KNz0D1KtTE6/TqdHpMOm68Z/FxK/JZRZu2UKP6QM5nItE2aQvlrEINfCYSbau2UFINbnoVShJvawaSxPs20rQqVCXe1gwkibctAz2Jty0D3YgHW0mfswAEYnJ34t4O+Hs5dAJYkHQoC0AuoNRveQDO+wPGYGr1OYHU/SnHVwPodDJaBnrl/4qvhvbfbBteQlMBmpoP7/haC2X8Fy/wDzc/3jGwc6t0AAAAAElFTkSuQmCC";
    
    const pauseIconBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAJlJREFUaEPtlkEKwCAMBOO/+rJ+wByK0lKDNLCdW93NjNl1LH6Oxfrpgd0O2sAuoPzfBpQDLXOqNMpz8mDD+SSP1jIazCNSEwnoAdYErCZEizWBow0oE/ixu+OU+aZJWuOXCZ0AegKi/BIBnQJRgVaEVAfEsfoScwGUETVQRtRAGVEDZUQNlBE1UEbUQBlRA2VEDZQRf2PgAq3zUSEJYwhvAAAAAElFTkSuQmCC";
    
    // 生成播放图标
    this.base64ToImage(playIconBase64, (playIconPath) => {
      // 生成暂停图标
      this.base64ToImage(pauseIconBase64, (pauseIconPath) => {
        // 设置到全局数据
        wx.setStorageSync('play_icon_path', playIconPath);
        wx.setStorageSync('pause_icon_path', pauseIconPath);
        
        // 设置到数据中
        this.setData({
          playIconPath: playIconPath,
          pauseIconPath: pauseIconPath
        });
      });
    });
  },
  
  // 图片加载成功处理
  handleImageLoaded: function(e) {
    console.log('故事插图加载成功');
  },
  
  // 图片加载失败处理
  handleImageError: function(e) {
    console.error('故事插图加载失败', e);
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
    // 清除错误的图片URL
    this.setData({
      storyImageUrl: ''
    });
  }
});

// 重构 extractSuggestionsFromText，只解析 AI 返回的 JSON
function extractSuggestionsFromText(text) {
  let suggestions = [];
  try {
    console.log('尝试解析建议 JSON，内容开头:', text.substring(0, 100));
    
    // 清理文本，尝试找到有效的 JSON 字符串
    let cleanText = text.trim();
    
    // 查找 JSON 的起始位置和结束位置
    const startIdx = cleanText.indexOf('{');
    const endIdx = cleanText.lastIndexOf('}');
    
    if (startIdx >= 0 && endIdx > startIdx) {
      cleanText = cleanText.substring(startIdx, endIdx + 1);
      console.log('提取的 JSON 字符串开头:', cleanText.substring(0, 50));
    }
    
    const data = JSON.parse(cleanText);
    console.log('成功解析 JSON 数据:', Object.keys(data));
    
    if (Array.isArray(data.suggestions)) {
      console.log('找到建议数组，数量:', data.suggestions.length);
      suggestions = data.suggestions.map((item, index) => ({
            id: index + 1,
        title: item.title || `建议${index + 1}`,
        description: item.description || '',
        ageRange: item.ageRange || '',
        learningGoals: item.learningGoals || '',
        readingMaterials: item.readingMaterials || '',
        wanfaLiucheng: item.wanfaLiucheng || '',
        gaojieThinking: item.gaojieThinking || '',
        isSelected: false
      }));
    } else {
      console.warn('数据格式不包含建议数组');
    }
  } catch (e) {
    console.error('解析建议 JSON 失败:', e.message);
    console.error('原始文本开头:', text.substring(0, 200));
  }
  return suggestions;
}
