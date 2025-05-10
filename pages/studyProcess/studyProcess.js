var app = getApp();

Page({
  data: {
    currentStep: 1,  // 1-研学前, 2-研学中, 3-研学后
    subStep: 'info', // info-基本信息, suggestions-建议, suggestionDetail-建议详情, guideStory-指导故事, guideMaterial-导读材料
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
    preSuggestions: [], // 分析建议列表
    currentSuggestion: null, // 当前查看的分析建议详情
    
    // 研学中计划相关数据
    studyPlan: {
      planTitle: '',
      steps: [],
      studyCards: []
    },
    
    // 研学后相关数据
    postStudyData: {
      tempFilePaths: [],
      reflectionText: ''
    },
    
    // API相关
    conversationId: '',
    
    // 添加新属性
    specificVenueOptions: ['北京故宫', '上海科技馆', '长城', '黄山'], // 默认值
    guideStory: '', // 预研学指导故事
    studyTasks: [], // 研学阶段的详细任务
    studyCards: [], // 研学卡片
    planGenerated: false, // 标记研学计划是否已生成
    guideMaterial: '', // 存储导读材料内容
    
    // 在data中添加状态标记
    isGeneratingStory: false, // 是否正在生成指导故事
    isGeneratingPlan: false, // 是否正在生成研学计划
    currentGenerationStep: '' // 当前正在生成的步骤，可用于UI状态控制
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
          title = "研学前 - 预研学指导";
        } else if (this.data.subStep === 'guideMaterial') {
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
  
  // 添加统一的状态管理函数
  updateState: function(newState) {
    // 更新状态
    this.setData(newState);
    
    // 重新计算派生状态
    const currentStep = this.data.currentStep;
    const subStep = this.data.subStep;
    const suggestions = this.data.preSuggestions || [];
    const selectedSuggestions = this.data.selectedSuggestions || [];
    
    // 计算显示返回按钮
    const showBackIcon = currentStep !== 1 || 
                         (currentStep === 1 && (subStep === 'suggestionDetail' || subStep === 'guideStory' || subStep === 'guideMaterial'));
    
    // 计算是否显示分析建议选项卡
    const showSuggestionsTab = currentStep === 1 && suggestions.length > 0;
    
    // 计算后续步骤是否可用
    const stepsEnabled = selectedSuggestions.length > 0;
    
    this.setData({
      showBackIcon: showBackIcon,
      showSuggestionsTab: showSuggestionsTab,
      stepsEnabled: stepsEnabled
    });
    
    this.updatePageTitle();
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
    
    // 使用统一状态更新函数
    this.updateState({
      currentStep: step,
      subStep: step == 1 ? (this.data.preSuggestions.length > 0 ? 'suggestions' : 'info') : ''
    });
  },
  
  // 切换子步骤
  switchSubStep: function(e) {
    const subStep = e.currentTarget.dataset.subStep;
    this.updateState({
      subStep: subStep
    });
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
            preSuggestions: data.preSuggestions,
            selectedSuggestions: data.selectedSuggestions
          };
        } else if (data.subStep === 'guideStory') {
          cacheData = {
            guideStory: data.guideStory
          };
          // 单独保存指导故事
          try {
            wx.setStorageSync('studyProcess_1_guideStory', cacheData);
          } catch (e) {
            console.error('保存指导故事数据失败:', e);
          }
        } else if (data.subStep === 'guideMaterial') {
          cacheData = {
            guideMaterial: data.guideMaterial
          };
          // 单独保存导读材料
          try {
            wx.setStorageSync('studyProcess_1_guideMaterial', cacheData);
          } catch (e) {
            console.error('保存导读材料数据失败:', e);
          }
        }
        break;
      case 2:
        cacheData = {
          studyPlan: {
            planTitle: data.studyPlan.planTitle,
            steps: data.studyPlan.steps,
            studyCards: data.studyPlan.studyCards
          },
          postStudyData: {
            tempFilePaths: data.postStudyData.tempFilePaths,
            reflectionText: data.postStudyData.reflectionText
          }
        };
        break;
      case 3:
        cacheData = {
          postStudyData: {
            tempFilePaths: data.postStudyData.tempFilePaths,
            reflectionText: data.postStudyData.reflectionText
          }
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
        let suggestions = suggestionsData.preSuggestions || [];
        const selectedSuggestions = suggestionsData.selectedSuggestions || [];
        
        // 确保每个建议有正确的isSelected属性
        suggestions = suggestions.map(suggestion => {
          const isSelected = selectedSuggestions.some(item => item.id === suggestion.id);
          return {
            ...suggestion,
            isSelected: isSelected
          };
        });
        
        this.setData({
          preSuggestions: suggestions,
          selectedSuggestions: selectedSuggestions,
          showSuggestionsTab: (suggestions.length > 0),
          stepsEnabled: (selectedSuggestions.length > 0)
        });
      }
      
      // 加载预研学指导故事
      const guideStoryData = wx.getStorageSync('studyProcess_1_guideStory');
      if (guideStoryData && guideStoryData.guideStory) {
        this.setData({
          guideStory: guideStoryData.guideStory
        });
      }
      
      const planData = wx.getStorageSync('studyProcess_2_');
      if (planData) {
        this.setData({
          studyPlan: {
            planTitle: planData.studyPlan.planTitle || '',
            steps: planData.studyPlan.steps || [],
            studyCards: planData.studyPlan.studyCards || []
          },
          planGenerated: true // 如果有缓存的计划数据，标记为已生成
        });
      }
      
      const postData = wx.getStorageSync('studyProcess_3_');
      if (postData) {
        this.setData({
          postStudyData: {
            tempFilePaths: postData.postStudyData.tempFilePaths || [],
            reflectionText: postData.postStudyData.reflectionText || ''
          }
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
    const venueTypeOptions = ['博物馆', '科技馆', '历史遗迹', '自然风光'];
    const index = e.detail.value;
    
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
      preSuggestions: [],
      jsonResponse: {},
      subStep: 'suggestions', // 确保立即切换
      showSuggestionsTab: true,
      isLoadingMore: true // 显示加载状态
    });
    
    // 立即显示加载状态 - 移除遮挡视野的loading
    // wx.showLoading({
    //   title: '生成中...',
    //   mask: true // 防止用户点击其他区域
    // });
    
    // 设置正在加载状态，但不显示wx.showLoading
    this.setData({
      isLoadingMore: true
    });
    
    // 构建请求文本
    const kidsInfo = this.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    const promptText = `请根据皮亚杰儿童认知发展理论，为以下情况生成亲子研学活动的分析建议:
      参与者情况：${kidsInfo}
      目的地类型：${this.data.venueType || '未知场所类型'}
      具体场所：${this.data.specificVenue || '未知场所'}
      游览时长：${this.data.duration || '未知时长'}
      
      请根据儿童年龄段特点(前运算期/具体运算期/形式运算期)和目的地特性，提供3-5个适合的研学主题。
      每个主题需包含:
      1. 主题名称
      2. 主题描述
      3. 适合年龄范围
      4. 学习目标(认知/技能/情感)
      5. 与儿童发展阶段的匹配度分析
      
      回答格式要求为严格的JSON格式。`;
    
    console.log('开始请求AI服务1，请求文本:', promptText);
    
    // 发送流式请求到第一个AI
    this.requestAIStream('1', promptText, 
      // 处理数据块
      function(chunk, fullText) {
        console.log('接收到AI建议数据块:', chunk.length, '字符');
        // 这里不做太多处理，让requestAIStream内部更新UI
      },
      // 完成回调
      function(result) {
        // wx.hideLoading(); // 移除，避免影响界面
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
  },
  
  // 查看建议详情
  viewSuggestionDetail: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (isNaN(index) || index < 0 || index >= this.data.preSuggestions.length) {
      wx.showToast({
        title: '无效的建议索引',
        icon: 'none'
      });
      return;
    }
    
    const suggestion = this.data.preSuggestions[index];
    console.log('查看建议详情:', index, suggestion);
    
    this.updateState({
      currentSuggestion: suggestion,
      currentSuggestionIndex: index,
      subStep: 'suggestionDetail'
    });
  },
  
  // 返回到建议列表
  backToSuggestions: function() {
    this.updateState({
      subStep: 'suggestions',
      currentSuggestion: null
    });
  },
  
  // 选择/取消选择建议
  toggleSelectSuggestion: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (isNaN(index) || index < 0 || index >= this.data.preSuggestions.length) {
      console.error('无效的建议索引:', index);
      return;
    }

    const suggestions = this.data.preSuggestions;
    const selectedSuggestions = [...this.data.selectedSuggestions];
    
    console.log('切换选择状态:', index, suggestions[index].title, '当前状态:', suggestions[index].isSelected);
    
    // 更新建议的选中状态
    suggestions[index].isSelected = !suggestions[index].isSelected;
    
    // 更新已选择的建议列表
    if (suggestions[index].isSelected) {
      // 如果被选中，添加到已选择列表
      selectedSuggestions.push(suggestions[index]);
    } else {
      // 如果取消选中，从已选择列表中移除
      const removeIndex = selectedSuggestions.findIndex(item => item.id === suggestions[index].id);
      if (removeIndex > -1) {
        selectedSuggestions.splice(removeIndex, 1);
      }
    }
    
    // 如果当前正在查看详情的建议，也要更新其状态
    let currentSuggestion = this.data.currentSuggestion;
    if (currentSuggestion && currentSuggestion.id === suggestions[index].id) {
      currentSuggestion = {...suggestions[index]};
    }
    
    this.setData({
      preSuggestions: suggestions,
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
        // 切换到预研学指导故事页面
        this.setData({
          subStep: 'guideStory'
        });
        this.updatePageTitle();
        this.saveCurrentStepData();
        
        // 不同时生成研学中计划，等用户点击"开始研学活动"按钮时再生成
      })
      .catch(error => {
        console.error('生成预研学指导故事失败:', error);
        wx.showToast({
          title: '生成指导故事失败',
          icon: 'none'
        });
      });
  },
  
  // 生成预研学指导故事
  generateGuideStory: function() {
    const that = this;
    
    // 先切换到指导故事页面，再开始加载
    this.setData({
      subStep: 'guideStory', // 立即切换到指导故事子步骤
      guideStory: '正在为您生成导读材料，请稍候...' // 显示占位内容
    });
    
    this.updatePageTitle();
    
    // 显示加载状态，但不阻塞界面
    wx.showNavigationBarLoading();
    
    // 构建请求文本 (保持原有逻辑)
    const firstSuggestion = that.data.selectedSuggestions[0];
    const kidsInfo = that.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    const promptText = `根据以下研学课程信息为学生生成适合的导读材料，内容要具体详实：
      目的地类型：${that.data.venueType}
      具体场所：${that.data.specificVenue}
      时长：${that.data.duration}
      参与者：${kidsInfo}
      研学主题：${firstSuggestion.title}
      研学描述：${firstSuggestion.description}
      学习目标：${firstSuggestion.learningGoals}`;
    
    console.log('向第二个AI服务发送请求，生成指导故事');
    
    // 发送流式请求到第二个AI
    that.requestAIStream('2', promptText, 
      // 处理数据块，实时更新UI
      function(chunk, fullText) {
        that.setData({
          guideStory: fullText || '正在生成导读材料...'
        });
      },
      // 完成回调
      function(finalText) {
        wx.hideNavigationBarLoading();
        console.log('指导故事生成完成');
        
        that.setData({
          guideStory: finalText,
          isGeneratingStory: false
        });
        
        that.saveCurrentStepData();
      }
    );
  },
  
  // 开始研学活动 - 在点击"开始研学活动"按钮时调用
  startStudyActivity: function() {
    console.log('开始研学活动...');
    
    // 确保已选择建议
    if (this.data.selectedSuggestions.length === 0) {
      wx.showToast({
        title: '请先选择研学建议',
        icon: 'none'
      });
      return;
    }
    
    // 显示明确的加载提示
    wx.showLoading({
      title: '正在生成研学计划...',
      mask: true // 阻止用户操作
    });
    
    // 先切换页面，再生成内容
    this.setData({
      currentStep: 2,
      showBackIcon: true
    });
    this.updatePageTitle();
    
    // 生成研学计划
    this.generateStudyPlan();
  },
  
  // 生成研学计划(使用第三个AI)
  generateStudyPlan: function() {
    const that = this;
    
    // 先显示加载状态
    wx.showLoading({
      title: '生成研学计划中...',
    });
    
    // 在请求发送前，预先切换到研学中页面
    this.setData({
      currentStep: 2,
      showBackIcon: true
    });
    
    // 立即更新页面标题和状态
    this.updatePageTitle();
    
    // 在生成研学计划前记录状态
    console.log('生成研学计划前状态:', {
      currentStep: this.data.currentStep,
      subStep: this.data.subStep,
      selectedSuggestions: this.data.selectedSuggestions
    });
    
    // 构建请求文本 (保持原有逻辑)
    const firstSuggestion = that.data.selectedSuggestions[0];
    const kidsInfo = that.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    const promptText = `根据以下研学课程信息为教师生成研学中活动计划和指导建议：
      目的地类型：${that.data.venueType}
      具体场所：${that.data.specificVenue}
      时长：${that.data.duration}
      参与者：${kidsInfo}
      研学主题：${firstSuggestion.title}
      研学描述：${firstSuggestion.description}
      学习目标：${firstSuggestion.learningGoals}
      指导故事：${that.data.guideStory.substring(0, 100)}...
      
      请生成3-5个研学任务，每个任务包括任务标题和任务内容。同时，生成2-3个研学卡片，每个卡片包括卡片标题和卡片内容。回答格式为严格的JSON...`;
    
    // 发送请求到第三个AI
    that.requestAIStream('3', promptText, 
      // 处理数据块
      function(chunk, fullText) {
        // 实时处理逻辑...
      },
      // 完成回调 - 这里是关键修复点
      function(finalText) {
        wx.hideLoading();
        
        try {
          // 解析返回的JSON数据
          let parsedData = that.extractPlanData(finalText);
          console.log('解析到的研学计划数据:', parsedData);
          
          if (!parsedData || (!parsedData.tasks && !parsedData.cards)) {
            throw new Error('未能解析有效数据');
          }
          
          // ===== 关键修复 =====
          // 1. 明确指定这是研学中的数据，不是研学前的
          // 2. 确保数据直接保存到研学中相关的数据结构
          const studySteps = parsedData.tasks.map((task, index) => ({
            id: index + 1,
            title: task.title || `任务${index+1}`,
            content: task.content || '请完成此研学任务'
          }));
          
          // 重要：使用单独的setData调用，避免数据混淆
          that.setData({
            // 研学中数据
            'studyPlan.planTitle': that.data.selectedSuggestions[0].title || '研学活动计划',
            'studyPlan.steps': studySteps,
            'studyPlan.studyCards': parsedData.cards || [],
            planGenerated: true,
            // 切换到研学中步骤
            currentStep: 2
          });
          
          // 确保数据被正确保存
          wx.setStorageSync('studyProcess_2_', {
            'studyPlan.planTitle': that.data.studyPlan.planTitle,
            'studyPlan.steps': studySteps,
            'studyPlan.studyCards': parsedData.cards || []
          });
          
          // 更新UI状态
          that.updatePageTitle();
          
          // 在设置数据后记录
          console.log('设置研学计划数据后:', {
            currentStep: that.data.currentStep,
            planTitle: that.data.planTitle,
            steps: that.data.steps,
            studyCards: that.data.studyCards
          });
          
        } catch (error) {
          console.error('处理研学计划数据失败:', error);
          // 使用默认研学计划（保持原有逻辑）
          // ...
        }
      }
    );
  },
  
  // 添加一个方法用于更新计划数据
  updatePlanWithData: function(parsedData, suggestedTitle) {
    // 确保数据正确
    if (!parsedData) return;
    
    // 格式化任务数据
    const steps = (parsedData.tasks && parsedData.tasks.length > 0) 
      ? parsedData.tasks.map((task, index) => ({
          id: index + 1,
          title: task.title || `任务${index + 1}`,
          content: task.content || '完成此研学任务。'
        })) 
      : [];
    
    // 格式化卡片数据
    const cards = parsedData.cards || [];
    
    // 只在有数据时更新UI
    if (steps.length > 0 || cards.length > 0) {
      this.setData({
        'studyPlan.planTitle': suggestedTitle || '研学活动计划',
        'studyPlan.steps': steps.length > 0 ? steps : this.data.studyPlan.steps,
        'studyPlan.studyCards': cards.length > 0 ? cards : this.data.studyPlan.studyCards,
        stepsEnabled: true,
        planGenerated: true
      });
      
      // 保存研学中数据
      try {
        wx.setStorageSync('studyProcess_2_', {
          'studyPlan.planTitle': this.data.studyPlan.planTitle,
          'studyPlan.steps': this.data.studyPlan.steps,
          'studyPlan.studyCards': this.data.studyPlan.studyCards
        });
      } catch (e) {
        console.error('保存研学中计划数据失败:', e);
      }
    }
  },
  
  // 提取计划数据的方法
  extractPlanData: function(text) {
    let result = { tasks: [], cards: [] };
    
    try {
      // 首先尝试从文本中查找完整的JSON
      const jsonRegex = /```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/g;
      const jsonMatches = text.match(jsonRegex);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // 提取最后一个匹配的JSON
        let lastJsonMatch = jsonMatches[jsonMatches.length - 1];
        // 移除json标记
        lastJsonMatch = lastJsonMatch.replace(/```json|```/g, '').trim();
        
        try {
          const parsedData = JSON.parse(lastJsonMatch);
          console.log('成功解析JSON:', parsedData);
          
          // 实时更新UI
          that.updatePlanWithData(parsedData, firstSuggestion.title);
        } catch (e) {
          console.log('JSON解析尚未完成，继续等待数据');
        }
      }
    } catch (error) {
      console.error('解析计划数据出错:', error);
    }
    
    return result;
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
          postStudyData: {
            tempFilePaths: res.tempFilePaths
          }
        });
      }
    });
  },
  
  onTextInput: function(e) {
    this.setData({
      postStudyData: {
        reflectionText: e.detail.value
      }
    });
  },
  
  shareResults: function() {
    if (!this.data.postStudyData.tempFilePaths.length && !this.data.postStudyData.reflectionText) {
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
        title: that.data.studyPlan.planTitle,
        venue: that.data.specificVenue,
        duration: that.data.duration,
        steps: that.data.studyPlan.steps,
        studyCards: that.data.studyPlan.studyCards
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
      this.updateState({
        subStep: 'suggestions'
      });
      return;
    }
    
    // 如果是研学前的建议详情页，切回建议列表页
    if (this.data.currentStep === 1 && this.data.subStep === 'suggestionDetail') {
      this.updateState({
        subStep: 'suggestions',
        currentSuggestion: null
      });
      return;
    }
    
    // 如果是研学前的建议列表页，切回信息填写页
    if (this.data.currentStep === 1 && this.data.subStep === 'suggestions') {
      this.updateState({
        subStep: 'info'
      });
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
        subStep: prevStep === 1 ? (this.data.preSuggestions.length > 0 ? 'suggestions' : 'info') : '',
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
    
    console.log(`向AI服务${serviceId}发送流式请求, URL:`, serviceUrl);
    
    // 设置请求参数
    const requestData = {
      text: text,
      key: 'hjl2004'  // 使用固定的访问密钥
    };
    
    // 标记是否已完成
    let isDone = false;
    
    // 记录已收到的JSON串和纯文本
    let jsonString = '';
    let plainTextContent = '';
    // JSON开始标记
    let jsonStarted = false;
    
    // 设置临时建议列表，用于实时显示
    let temporarySuggestions = [];
    
    // 发送流式请求
    const requestTask = wx.request({
      url: serviceUrl,
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': 'hjl2004',
        'Accept': 'text/event-stream'
      },
      enableChunked: true,
      responseType: 'arraybuffer',
      success: function(res) {
        console.log('请求成功状态:', res.statusCode);
      },
      fail: function(err) {
        console.error('AI请求失败:', err);
        // wx.hideLoading(); // 移除，避免影响界面
        wx.showToast({
          title: 'AI服务请求失败',
          icon: 'none'
        });
        
        if (!isDone && onComplete) {
          isDone = true;
          onComplete("AI服务请求失败");
        }
      },
      complete: function() {
        console.log('请求完成');
        // wx.hideLoading(); // 移除，避免影响界面
        
        // 确保回调至少被执行一次
        if (!isDone && onComplete) {
          isDone = true;
          // 如果有JSON，返回JSON，否则返回纯文本
          if (that.data.jsonResponse && Object.keys(that.data.jsonResponse).length > 0) {
            onComplete(that.data.jsonResponse || {});
          } else {
            onComplete(plainTextContent || "未接收到有效内容");
          }
        }
      }
    });
    
    // 流式响应处理
    requestTask.onChunkReceived(function(response) {
      try {
        if (!response || !response.data) {
          console.log('收到空数据块');
          return;
        }
        
        // 转换二进制数据为文本
        const arrayBuffer = response.data;
        let text = '';
        
        // 尝试使用Base64解码
        try {
          const base64 = wx.arrayBufferToBase64(arrayBuffer);
          text = that.base64ToUtf8(base64);
        } catch (e) {
          console.error('Base64解码失败，尝试直接转换:', e);
          // 直接使用TextDecoder转换
          const uint8Array = new Uint8Array(arrayBuffer);
          text = String.fromCharCode.apply(null, uint8Array);
        }
        
        console.log('解码数据块:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
        
        // 处理SSE数据并查找JSON或处理纯文本
        if (text) {
          const lines = text.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检查数据行
            if (line.startsWith('data:')) {
              const data = line.substring(5).trim();
              
              // 检查是否是结束标记
              if (data === '[DONE]') {
                console.log('收到流结束标记');
                
                // 如果有JSON字符串，尝试解析它
                if (jsonString) {
                  try {
                    console.log("完整JSON串:", jsonString);
                    const jsonObj = JSON.parse(jsonString);
                    
                    // 更新UI
                    const suggestions = that.convertJsonToSuggestions(jsonObj);
                    
                    // 移除加载状态提示
                    // wx.showLoading({
                    //   title: `已获取${suggestions.length}个建议`,
                    // });
                    
                    that.setData({
                      preSuggestions: suggestions,
                      jsonResponse: jsonObj,
                      isLoadingMore: false
                    });
                    
                    that.updatePageTitle();
                    that.saveCurrentStepData();
                  } catch (e) {
                    console.error('最终JSON解析失败:', e);
                    // JSON解析失败，尝试使用纯文本建议
                    that.handlePlainTextSuggestions(plainTextContent);
                  }
                } else if (plainTextContent) {
                  // 没有JSON但有纯文本，使用纯文本生成建议
                  that.handlePlainTextSuggestions(plainTextContent);
                }
                
                // wx.hideLoading(); // 移除，避免影响界面
                
                if (!isDone && onComplete) {
                  isDone = true;
                  if (that.data.jsonResponse && Object.keys(that.data.jsonResponse).length > 0) {
                    onComplete(that.data.jsonResponse);
                  } else {
                    onComplete(plainTextContent);
                  }
                }
                
                return;
              }
              
              // 检查JSON开始标记
              if (data.includes('```json')) {
                jsonStarted = true;
                jsonString = '';
                console.log('检测到JSON开始标记');
                continue;
              }
              
              // 检查JSON结束标记
              if (jsonStarted && data.includes('```')) {
                jsonStarted = false;
                console.log('检测到JSON结束标记');
                
                // 尝试解析收集到的JSON
                try {
                  console.log("尝试解析JSON:", jsonString);
                  const jsonObj = JSON.parse(jsonString);
                  
                  // 更新UI
                  const suggestions = that.convertJsonToSuggestions(jsonObj);
                  
                  // 移除加载状态提示
                  // wx.showLoading({
                  //   title: `已获取${suggestions.length}个建议`,
                  // });
                  
                  that.setData({
                    preSuggestions: suggestions,
                    jsonResponse: jsonObj,
                    isLoadingMore: false
                  });
                  
                  that.updatePageTitle();
                } catch (e) {
                  console.error('JSON解析失败:', e);
                }
                
                continue;
              }
              
              // 收集JSON内容
              if (jsonStarted) {
                jsonString += data;
                console.log('正在收集JSON:', data.substring(0, 20) + (data.length > 20 ? '...' : ''));
                
                // 实时解析中间状态
                if (jsonString && jsonString.trim() && jsonString.includes('}')) {
                  try {
                    // 尝试补齐右括号（如果缺少的话）
                    let tempJson = jsonString;
                    const leftCount = (tempJson.match(/\{/g) || []).length;
                    const rightCount = (tempJson.match(/\}/g) || []).length;
                    
                    if (leftCount > rightCount) {
                      for (let j = 0; j < leftCount - rightCount; j++) {
                        tempJson += "}";
                      }
                    }
                    
                    const partialObj = JSON.parse(tempJson);
                    console.log("部分解析成功，键数量:", Object.keys(partialObj).length);
                    
                    // 更新部分内容
                    const suggestions = that.convertJsonToSuggestions(partialObj);
                    
                    if (suggestions.length > 0) {
                      // 移除加载状态提示
                      // wx.showLoading({
                      //   title: `已获取${suggestions.length}个建议`,
                      // });
                      
                      that.setData({
                        preSuggestions: suggestions,
                        jsonResponse: partialObj
                      });
                      
                      that.updatePageTitle();
                    }
                  } catch (e) {
                    // 忽略部分解析错误
                    console.log("部分解析失败，继续收集数据");
                  }
                }
              } else {
                // 处理普通数据行（非JSON格式）
                plainTextContent += data + '\n';
                console.log('收集普通文本:', data);
                
                // 每次收到新数据尝试生成临时建议
                that.updatePlainTextSuggestions(plainTextContent);
                
                // 如果有回调函数，调用它
                if (processChunk) {
                  processChunk(data, plainTextContent);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('处理流式数据出错:', error);
      }
    });
    
    return requestTask;
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
      // 匹配 "1. 【主题】" 或 "1.【主题】" 或 "1【主题】" 或 "主题1："等格式
      const themeMatch = line.match(/^(\d+)[\.\、]?\s*【([^】]+)】/) || 
                          line.match(/^(\d+)[\.\、]?\s*\[\s*([^\]]+)\s*\]/) || 
                          line.match(/^主题\s*(\d+)\s*[:：]\s*(.+)/) ||
                          line.match(/^建议\s*(\d+)\s*[:：]\s*(.+)/);
      
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
        preSuggestions: currentSuggestions
      });
    }
  },
  
  // 处理完整的纯文本，生成最终建议
  handlePlainTextSuggestions: function(text) {
    if (!text || text.trim().length < 50) {
      // 没有足够的文本，使用默认建议
      this.setData({
        preSuggestions: getDefaultSuggestions(this.data.venueType, this.data.specificVenue, 3),
        isLoadingMore: false
      });
      return;
    }
    
    console.log('从完整纯文本生成建议');
    
    // 一次性提取所有可能的建议
    const suggestions = this.extractSuggestionsFromText(text, this.data.venueType, this.data.specificVenue);
    
    if (suggestions.length > 0) {
      this.setData({
        preSuggestions: suggestions,
        isLoadingMore: false
      });
      
      this.updatePageTitle();
      this.saveCurrentStepData();
    } else {
      // 如果提取失败，使用默认建议
      this.setData({
        preSuggestions: getDefaultSuggestions(this.data.venueType, this.data.specificVenue, 3),
        isLoadingMore: false
      });
    }
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
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      
      base64 = String(base64).replace(/[^A-Za-z0-9\+\/\=]/g, '');
      
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
    } catch (e) {
      console.error('Base64Decode错误:', e);
      return '';
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
  
  // 将特定JSON格式转换为应用需要的建议格式
  convertJsonToSuggestions: function(jsonObj) {
    const suggestions = [];
    
    try {
      // 遍历JSON中的每个键值对
      for (const key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
          const content = jsonObj[key];
          const id = parseInt(key);
          
          if (isNaN(id)) continue; // 跳过非数字键
          
          // 尝试提取标题，使用【】或"**"之间的内容
          let title = '研学主题';
          const titleMatch = content.match(/【([^】]+)】/) || content.match(/\*\*([^*]+)\*\*/);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }
          
          // 提取描述 - 使用第一段或前150个字符
          let description = content.split('\n\n')[0].replace(/【[^】]+】/, '').trim();
          if (!description || description.length < 10) {
            description = content.substring(0, 150).replace(/【[^】]+】/, '').trim();
          }
          
          // 提取年龄范围
          let ageRange = '6-12岁';
          const ageMatch = content.match(/推荐阶段[：:]\s*([^，\n]+)/) || 
                            content.match(/年龄[：:]\s*([^，\n]+)/) || 
                            content.match(/(\d+-\d+岁)/);
          if (ageMatch) {
            ageRange = ageMatch[1].trim();
          }
          
          // 提取学习目标
          let learningGoals = '培养观察力，增强探索精神，提升动手能力';
          const goalsMatch = content.match(/核心能力[：:]\s*([^\n]+)/) || 
                             content.match(/学习目标[：:]\s*([^\n]+)/) || 
                             content.match(/能力目标[：:]\s*([^\n]+)/);
          if (goalsMatch) {
            learningGoals = goalsMatch[1].trim();
          }
          
          // 提取玩法流程
          let wanfaLiucheng = '';
          const flowMatch = content.match(/玩法[\/\/]任务[：:]\s*([^\n]+)/) || 
                            content.match(/简要玩法[：:]\s*([^\n]+)/) || 
                            content.match(/流程[：:]\s*([^\n]+)/);
          if (flowMatch) {
            wanfaLiucheng = flowMatch[1].trim();
          }
          
          // 提取高阶思维
          let gaojieThinking = '';
          const advancedMatch = content.match(/高阶提示[：:]\s*([^\n]+)/) || 
                                content.match(/高阶思维[：:]\s*([^\n]+)/);
          if (advancedMatch) {
            gaojieThinking = advancedMatch[1].trim();
          }
          
          // 构建建议对象
          suggestions.push({
            id: id,
            title: title,
            description: description,
            ageRange: ageRange,
            learningGoals: learningGoals,
            isSelected: false,
            wanfaLiucheng: wanfaLiucheng,
            gaojieThinking: gaojieThinking
          });
        }
      }
      
      // 按ID排序
      suggestions.sort((a, b) => a.id - b.id);
      
    } catch (error) {
      console.error('转换JSON到建议格式出错:', error);
    }
    
    return suggestions;
  },
  
  // 生成导读材料的函数
  generateGuideMaterial: function() {
    const that = this;
    
    wx.showLoading({
      title: '生成导读材料中...',
    });
    
    const selectedTheme = that.data.selectedSuggestions[0];
    const kidsInfo = that.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    const promptText = `请为以下研学活动创作一个有趣的导读故事:
      目的地: ${that.data.specificVenue}
      时长: ${that.data.duration}
      参与者: ${kidsInfo}
      研学主题: ${selectedTheme.title}
      适合年龄: ${selectedTheme.ageRange}
      
      请包含以下内容:
      1. 一个吸引孩子的故事开头
      2. ${that.data.specificVenue}的简单介绍(融入故事中)
      3. 研学活动中将会体验的有趣内容
      4. 3-5个家长可以与孩子互动的问题或提示
      
      故事风格要生动有趣，适合${selectedTheme.ageRange}的孩子阅读，长度控制在1000字左右。`;
    
    that.requestAIStream('2', promptText, 
      function(chunk, fullText) {
        // 实时更新显示内容
        that.setData({
          guideMaterial: fullText
        });
      },
      function(result) {
        wx.hideLoading();
        // 设置UI状态
        that.setData({
          subStep: 'guideMaterial',
          guideMaterial: result
        });
        that.updatePageTitle();
        that.saveCurrentStepData();
      }
    );
  },
  
  // 选择建议后的处理
  confirmSuggestionSelection: function() {
    if (this.data.selectedSuggestions.length === 0) {
      wx.showToast({
        title: '请至少选择一个建议',
        icon: 'none'
      });
      return;
    }
    
    // 先生成导读材料，然后再生成研学中计划
    this.generateGuideMaterial();
  },
  
  // 添加重新生成指导故事函数
  regenerateGuideStory: function() {
    wx.showModal({
      title: '重新生成',
      content: '确定要重新生成导读材料吗？',
      success: res => {
        if (res.confirm) {
          this.setData({
            isGeneratingStory: true,
            guideStory: '正在重新生成导读材料...'
          });
          this.generateGuideStory();
        }
      }
    });
  },
  
  // 添加重新生成研学计划函数
  regenerateStudyPlan: function() {
    wx.showModal({
      title: '重新生成',
      content: '确定要重新生成研学计划吗？',
      success: res => {
        if (res.confirm) {
          this.setData({
            isGeneratingPlan: true,
            'studyPlan.planTitle': '正在重新生成研学计划...',
            'studyPlan.steps': [],
            'studyPlan.studyCards': []
          });
          this.generateStudyPlan();
        }
      }
    });
  },
  
  // 从研学中返回导读材料
  backToGuideStory: function() {
    this.setData({
      currentStep: 1,
      subStep: 'guideStory'
    });
    this.updatePageTitle();
  },
  
  // 从指导故事返回分析建议
  backToSuggestions: function() {
    this.setData({
      subStep: 'suggestions'
    });
    this.updatePageTitle();
  },
  
  // 优化研学流程状态管理
  processStudyFlow: function() {
    // 根据当前步骤和子步骤决定下一步动作
    const currentStep = this.data.currentStep;
    const subStep = this.data.subStep;
    
    if (currentStep === 1) {
      if (subStep === 'info') {
        // 从基本信息到分析建议
        this.generateSuggestion();
      } else if (subStep === 'suggestions') {
        // 从分析建议到指导故事
        this.generateGuideStory();
      } else if (subStep === 'guideStory') {
        // 从指导故事到研学中
        this.generateStudyPlan();
      }
    } else if (currentStep === 2) {
      // 从研学中到研学后
      this.setData({
        currentStep: 3,
        showBackIcon: true
      });
      this.updatePageTitle();
    }
  }
});

// 生成默认建议的辅助函数
function getDefaultSuggestions(venueType, specificVenue, count) {
  const venueInfo = specificVenue || venueType || '未知场所';
  const defaultSuggestions = [
    {
      id: 1,
      title: `探索${venueInfo}的历史之旅`,
      description: `深入了解${venueInfo}的悠久历史和文化背景，通过互动展览和讲解，让孩子们在游览中学习历史知识，培养历史意识。`,
      ageRange: '6-12岁',
      learningGoals: '了解历史知识，培养观察能力，提升文化素养',
      isSelected: false,
      wanfaLiucheng: `1. 研学前准备：收集${venueInfo}的基本历史资料，了解时间线；2. 现场观察：带孩子们寻找历史痕迹和文物，记录发现；3. 导览员互动：鼓励孩子向导览员提问；4. 分享讨论：每人分享一个最感兴趣的历史故事或文物。`,
      gaojieThinking: '通过比较不同历史时期的差异，培养孩子的时间概念和历史变迁的认知能力，引导孩子思考历史事件与当下生活的关联。'
    },
    {
      id: 2,
      title: `${venueInfo}科学发现之旅`,
      description: `探索${venueInfo}中的科学奥秘，通过实验和观察，培养孩子的科学思维和探究精神，激发对自然科学的兴趣。`,
      ageRange: '7-14岁',
      learningGoals: '培养科学思维，提高动手能力，锻炼解决问题的能力',
      isSelected: false,
      wanfaLiucheng: `1. 提出问题：参观前列出3-5个科学问题；2. 现场探索：带着问题在展区中寻找答案；3. 动手实验：参与互动展项，记录实验过程；4. 科学笔记：绘制观察图表，记录新发现。`,
      gaojieThinking: '引导孩子从"知道是什么"到"理解为什么"的思维跃升，培养实证思维和批判性思考能力，探究科学原理背后的逻辑关系。'
    },
    {
      id: 3,
      title: `${venueInfo}艺术体验`,
      description: `欣赏${venueInfo}的艺术之美，参与创作活动，提升孩子的艺术鉴赏能力和创造力，感受艺术的魅力。`,
      ageRange: '5-15岁',
      learningGoals: '培养艺术鉴赏能力，激发创造力，提高审美素养',
      isSelected: false,
      wanfaLiucheng: `1. 艺术观察：引导孩子仔细观察展品的色彩、形状和材质；2. 感受表达：用形容词描述作品给自己的感受；3. 创意模仿：选择一个喜欢的作品尝试临摹或改编；4. 创作分享：完成一件受启发的艺术创作并讲述灵感来源。`,
      gaojieThinking: '通过艺术作品中的视觉元素，培养孩子的审美判断力，引导其理解艺术表达与情感传递的关系，提升艺术语言的解读能力。'
    },
    {
      id: 4,
      title: `${venueInfo}自然探索`,
      description: `在${venueInfo}中探索大自然的奥秘，观察动植物，了解生态环境，培养孩子的环保意识和对自然的热爱。`,
      ageRange: '6-16岁',
      learningGoals: '增强环保意识，培养观察能力，了解生态知识',
      isSelected: false,
      wanfaLiucheng: `1. 生态寻宝：寻找并记录不同种类的植物和动物；2. 环境观察：注意不同区域的环境特点和生物多样性；3. 自然笔记：用文字和绘画记录观察发现；4. 环保行动：讨论保护环境的方法，并在日常生活中实践。`,
      gaojieThinking: '引导孩子理解生态系统的平衡和相互依存关系，建立人与自然和谐共生的生态观念，培养可持续发展的环保思维。'
    },
    {
      id: 5,
      title: `${venueInfo}亲子互动体验`,
      description: `通过在${venueInfo}的亲子互动活动，增进家庭成员间的感情，共同完成任务和挑战，享受亲子时光。`,
      ageRange: '3-12岁',
      learningGoals: '增进亲子关系，培养团队合作精神，锻炼沟通能力',
      isSelected: false,
      wanfaLiucheng: `1. 角色互换：让孩子担任向导，带领父母参观；2. 任务挑战：共同完成研学任务单上的挑战；3. 分享时刻：设置"发现分享站"，每人分享新发现；4. 合作创作：共同创作一个与研学主题相关的作品。`,
      gaojieThinking: '通过共同体验和互动，促进家庭成员间的有效沟通，培养孩子的表达能力和自信心，建立更深层次的亲子连接和信任关系。'
    }
  ];
  
  // 返回指定数量的建议，最多5个
  return defaultSuggestions.slice(0, Math.min(count, 5));
}

// 增加一个从文本中提取建议的辅助函数
function extractSuggestionsFromText(text, venueType, specificVenue) {
  const suggestions = [];
  const venueInfo = specificVenue || venueType || '未知场所';
  
  try {
    // 尝试从完整回答中提取更多信息
    console.log('尝试从文本中提取建议:', text);
    
    // 尝试匹配类似 "主题"或"建议"的段落模式
    const mainThemeMatch = text.match(/##\s*亲子研学主题建议/i);
    if (mainThemeMatch) {
      // 如果找到主题建议部分，尝试提取更完整的信息
      const themeSection = text.slice(mainThemeMatch.index);
      
      // 尝试匹配"主题"或"标题"的模式
      const themeMatches = themeSection.match(/["「】\[]*([^"「】\[:\n]{3,30})["」【\]]*[：:]/g);
      if (themeMatches && themeMatches.length > 0) {
        themeMatches.forEach((themeMatch, index) => {
          if (index >= 8) return; // 限制最多8个建议
          
          const title = themeMatch.replace(/["「】\[\]」【:：]/g, '').trim();
          const descriptionMatch = themeSection.slice(themeSection.indexOf(themeMatch) + themeMatch.length)
            .match(/([^\n.。!！?？]{10,200})/);
          const description = descriptionMatch ? descriptionMatch[1].trim() : `关于${title}的探索活动`;
          
          // 尝试提取玩法流程
          const flowProcessMatch = themeSection.slice(themeSection.indexOf(themeMatch))
            .match(/玩法流程[：:]\s*([^\n]{10,500})/);
          const flowProcess = flowProcessMatch ? flowProcessMatch[1].trim() : '';
          
          // 尝试提取高阶思维带动点
          const advancedThinkingMatch = themeSection.slice(themeSection.indexOf(themeMatch))
            .match(/高阶思维带动点[：:]\s*([^\n]{10,500})/);
          const advancedThinking = advancedThinkingMatch ? advancedThinkingMatch[1].trim() : '';
          
          suggestions.push({
            id: index + 1,
            title: title,
            description: description,
            ageRange: '6-12岁', // 默认年龄范围
            learningGoals: '提升观察能力，增长知识，培养兴趣', // 默认学习目标
            isSelected: false,
            wanfaLiucheng: flowProcess, // 使用拼音属性名
            gaojieThinking: advancedThinking // 使用拼音属性名
          });
        });
      }
    }
    
    // 如果上面的方法没有找到建议，尝试简单的数字列表匹配
    if (suggestions.length === 0) {
      // 尝试匹配类似 "1. 主题名称：描述" 的模式
      const suggestionRegex = /(\d+)\.\s*([^：:]+)[：:]\s*([^\n]+)/g;
      let match;
      let count = 0;
      
      while ((match = suggestionRegex.exec(text)) !== null && count < 8) {
        suggestions.push({
          id: count + 1,
          title: match[2].trim(),
          description: match[3].trim(),
          ageRange: '6-12岁', // 默认年龄范围
          learningGoals: '提升观察能力，增长知识，培养兴趣', // 默认学习目标
          isSelected: false,
          wanfaLiucheng: '', // 空的玩法流程
          gaojieThinking: '' // 空的高阶思维带动点
        });
        count++;
      }
    }
    
    console.log('从文本中提取到的建议数量:', suggestions.length);
  } catch (e) {
    console.error('从文本提取建议失败:', e);
  }
  
  // 如果没有提取到任何建议，返回至少一个默认建议
  if (suggestions.length === 0) {
    suggestions.push({
      id: 1,
      title: `${venueInfo}探索之旅`,
      description: `在${venueInfo}中进行富有教育意义的探索活动，通过观察、互动和体验，增长知识，培养观察能力和探索精神。`,
      ageRange: '6-12岁',
      learningGoals: '提升观察能力，增长知识，培养探索精神',
      isSelected: false,
      wanfaLiucheng: '', // 空的玩法流程
      gaojieThinking: '' // 空的高阶思维带动点
    });
  }
  
  return suggestions;
}
