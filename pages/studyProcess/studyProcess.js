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
            guideStory: data.guideStory
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
          suggestions: suggestions,
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
      title: '生成分析建议中...',
    });
    
    // 首先创建对话
    this.createConversation()
      .then(conversationId => {
        // 使用创建的对话ID发送问题生成研学分析建议
        return this.generateSuggestionsWithAPI(conversationId);
      })
      .then(result => {
        wx.hideLoading();
        
        // 将生成的建议存储到页面数据
        const suggestions = result.suggestions || [];
        
        // 确保有至少2个建议
        let finalSuggestions = suggestions.length >= 2 ? 
          suggestions : [...suggestions, ...getDefaultSuggestions(this.data.venueType, this.data.specificVenue, 5 - suggestions.length)];
        
        // 确保每个建议都有isSelected属性
        finalSuggestions = finalSuggestions.map(item => {
          return {
            ...item,
            isSelected: false
          };
        });
        
        this.setData({
          suggestions: finalSuggestions,
          showSuggestionsTab: true,
          subStep: 'suggestions',  // 切换到分析建议页
          selectedSuggestions: []  // 清空已选择的建议
        });
        
        this.updatePageTitle();
        this.saveCurrentStepData();
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
          'Authorization': 'Bearer bce-v3/ALTAK-w3MXrEFZ1OhNY5jY0CnD4/18a96d20109a8753224caf0bbb4f74fe16811204'
        },
        data: {
          app_id: 'bbe0c24a-f3a0-486e-b3c0-a334c4439fb2'
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
  
  // 使用API生成研学分析建议
  generateSuggestionsWithAPI: function(conversationId) {
    // 构建提示词
    const kidsInfo = this.data.kidsInfo.map(kid => 
      `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
    ).join('；');
    
    const prompt = `我需要为以下情况生成研学分析建议：
    目的地类型：${this.data.venueType}
    具体场所：${this.data.specificVenue}
    时长：${this.data.duration}
    参与者：${kidsInfo}
    请生成4-6个研学分析建议，包括建议标题、建议描述、适合年龄段和学习目标。格式为JSON数组。`;
    
    const that = this;
    
    return new Promise((resolve, reject) => {
      try {
        wx.request({
          url: 'https://qianfan.baidubce.com/v2/app/conversation/runs',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer bce-v3/ALTAK-w3MXrEFZ1OhNY5jY0CnD4/18a96d20109a8753224caf0bbb4f74fe16811204'
          },
          data: {
            app_id: 'bbe0c24a-f3a0-486e-b3c0-a334c4439fb2',
            conversation_id: conversationId,
            query: prompt,
            stream: false
          },
          success: function(res) {
            if (res.statusCode === 200 && res.data) {
              try {
                // 保存完整的API返回内容，用于调试
                console.log('API返回完整内容:', JSON.stringify(res.data));
                
                // 尝试从不同字段中获取API的返回内容
                let answer = '';
                if (res.data.result) {
                  answer = res.data.result;
                } else if (res.data.answer) {
                  answer = res.data.answer;
                } else if (res.data.content && Array.isArray(res.data.content)) {
                  for (let item of res.data.content) {
                    if (item.content_type === 'text' && item.outputs && item.outputs.text) {
                      answer = item.outputs.text;
                      break;
                    }
                  }
                }
                
                console.log('从API提取的回答内容:', answer);
                
                // 尝试从回答中提取JSON数组
                const jsonMatch = answer.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                  try {
                    const suggestions = JSON.parse(jsonMatch[0]);
                    console.log('成功解析JSON建议:', suggestions.length, '条建议');
                    
                    // 为每个建议添加id和isSelected属性
                    suggestions.forEach((item, index) => {
                      item.id = index + 1;
                      item.isSelected = false;
                      
                      // 确保每个建议都有必要的字段
                      item.title = item.title || item.主题 || `建议${index + 1}`;
                      item.description = item.description || item.选题理由 || item.描述 || '';
                      item.ageRange = item.ageRange || item.适合认知阶段 || item.适合年龄段 || '6-12岁';
                      item.learningGoals = item.learningGoals || item.能力锻炼方向 || item.学习目标 || '提升观察能力和探索精神';
                      
                      // 添加玩法流程和高阶思维带动点的映射
                      item.wanfaLiucheng = item.玩法流程 || item.flowProcess;
                      item.gaojieThinking = item.高阶思维带动点 || item.advancedThinking;
                    });
                    
                    resolve({ suggestions: suggestions });
                  } catch (parseErr) {
                    console.error('解析JSON字符串失败:', parseErr);
                    const extractedSuggestions = extractSuggestionsFromText(answer, that.data.venueType, that.data.specificVenue);
                    if (extractedSuggestions.length > 0) {
                      resolve({ suggestions: extractedSuggestions });
                    } else {
                      resolve({
                        suggestions: getDefaultSuggestions(that.data.venueType, that.data.specificVenue, 5)
                      });
                    }
                  }
                } else {
                  // 尝试提取JSON格式的数据
                  const extractedSuggestions = extractSuggestionsFromText(answer, that.data.venueType, that.data.specificVenue);
                  if (extractedSuggestions.length > 0) {
                    resolve({ suggestions: extractedSuggestions });
                  } else {
                    console.log('无法从回答中提取建议数据，使用默认建议');
                    resolve({
                      suggestions: getDefaultSuggestions(that.data.venueType, that.data.specificVenue, 5)
                    });
                  }
                }
              } catch (e) {
                console.error('解析API返回数据失败:', e);
                resolve({
                  suggestions: getDefaultSuggestions(that.data.venueType, that.data.specificVenue, 5)
                });
              }
            } else {
              console.error('API返回错误:', res);
              resolve({
                suggestions: getDefaultSuggestions(that.data.venueType, that.data.specificVenue, 5)
              });
            }
          },
          fail: function(err) {
            console.error('API请求失败:', err);
            resolve({
              suggestions: getDefaultSuggestions(that.data.venueType, that.data.specificVenue, 5)
            });
          }
        });
      } catch (e) {
        console.error('发起API请求时出错:', e);
        resolve({
          suggestions: getDefaultSuggestions(that.data.venueType, that.data.specificVenue, 5)
        });
      }
    });
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
        // 切换到预研学指导故事页面
        this.setData({
          subStep: 'guideStory'
        });
        this.updatePageTitle();
        this.saveCurrentStepData();
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
    
    // 显示加载状态
    wx.showLoading({
      title: '生成预研学指导中...',
    });
    
    // 先检查是否已有缓存的指导故事
    if (that.data.guideStory) {
      wx.hideLoading();
      // 已有故事，直接切换到故事页面
      that.setData({
        subStep: 'guideStory'
      });
      that.updatePageTitle();
      that.saveCurrentStepData();
      return Promise.resolve();
    }
    
    // 使用第二个AI (ID: f3dd556e-5b86-414e-9ab0-ad068dbc82e4) 生成预研学指导故事
    return new Promise((resolve, reject) => {
      // 创建新对话
      that.createConversationWithAI('f3dd556e-5b86-414e-9ab0-ad068dbc82e4')
        .then(conversationId => {
          // 构建提示词
          const firstSuggestion = that.data.selectedSuggestions[0];
          const kidsInfo = that.data.kidsInfo.map(kid => 
            `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
          ).join('；');
          
          const prompt = `请根据以下情况，为孩子生成一个有趣的预研学指导故事，帮助他们更好地理解即将进行的研学活动：
          目的地类型：${that.data.venueType}
          具体场所：${that.data.specificVenue}
          时长：${that.data.duration}
          参与者：${kidsInfo}
          研学主题：${firstSuggestion.title}
          研学描述：${firstSuggestion.description}
          学习目标：${firstSuggestion.learningGoals}
          
          故事应该富有教育意义和趣味性，适合${firstSuggestion.ageRange}的孩子阅读，长度在300-500字之间。`;
          
          // 发送请求生成故事
          return that.sendRequestToAI(conversationId, 'f3dd556e-5b86-414e-9ab0-ad068dbc82e4', prompt);
        })
        .then(result => {
          wx.hideLoading();
          
          // 确保结果是字符串类型
          const storyContent = typeof result === 'string' ? result : JSON.stringify(result);
          
          // 保存生成的故事
          that.setData({
            guideStory: storyContent || '很抱歉，无法生成预研学指导故事，但您仍然可以继续进行研学活动。',
            stepsEnabled: true // 确保下一步可用
          });
          
          // 特别保存指导故事到Storage
          try {
            wx.setStorageSync('studyProcess_1_guideStory', {
              guideStory: storyContent || '很抱歉，无法生成预研学指导故事，但您仍然可以继续进行研学活动。'
            });
          } catch (e) {
            console.error('保存指导故事失败:', e);
          }
          
          resolve();
        })
        .catch(error => {
          wx.hideLoading();
          console.error('生成预研学指导故事失败:', error);
          
          // 设置默认故事
          const defaultStory = `欢迎来到${that.data.specificVenue}！这里有许多精彩的知识等着你们去探索和发现。在接下来的${that.data.duration}里，你们将踏上一段奇妙的学习之旅，发现这里的独特魅力和丰富知识。记得保持好奇心和观察力，这将是一次难忘的体验！`;
          
          that.setData({
            guideStory: defaultStory,
            stepsEnabled: true // 即使失败也确保下一步可用
          });
          
          // 特别保存指导故事到Storage
          try {
            wx.setStorageSync('studyProcess_1_guideStory', {
              guideStory: defaultStory
            });
          } catch (e) {
            console.error('保存指导故事失败:', e);
          }
          
          resolve(); // 修改为resolve而不是reject，以便流程能继续
        });
    });
  },
  
  // 开始研学活动
  startStudyActivity: function() {
    // 使用第一个建议生成研学计划
    this.generateStudyPlan();
  },
  
  // 生成研学计划(使用第三个AI)
  generateStudyPlan: function() {
    const that = this;
    
    // 显示加载状态
    wx.showLoading({
      title: '生成研学计划中...',
    });
    
    // 使用第三个AI (ID: 79793060-0ac1-4325-a92b-cb4422673daf) 生成研学任务和卡片
    that.createConversationWithAI('79793060-0ac1-4325-a92b-cb4422673daf')
      .then(conversationId => {
        // 使用第一个选择的建议
        const firstSuggestion = that.data.selectedSuggestions[0];
        const kidsInfo = that.data.kidsInfo.map(kid => 
          `孩子${kid.id}：${kid.gender || '未知'}性别，${kid.age || '未知'}岁`
        ).join('；');
        
        const prompt = `请根据以下情况，生成详细的研学任务和研学卡片，帮助孩子们更好地进行研学活动：
        目的地类型：${that.data.venueType}
        具体场所：${that.data.specificVenue}
        时长：${that.data.duration}
        参与者：${kidsInfo}
        研学主题：${firstSuggestion.title}
        研学描述：${firstSuggestion.description}
        学习目标：${firstSuggestion.learningGoals}
        
        请生成3-5个研学任务，每个任务包括任务标题和任务内容。同时，生成2-3个研学卡片，每个卡片包括卡片标题和卡片内容。回答格式为JSON。`;
        
        return that.sendRequestToAI(conversationId, '79793060-0ac1-4325-a92b-cb4422673daf', prompt);
      })
      .then(result => {
        wx.hideLoading();
        
        try {
          // 尝试从返回结果中提取JSON数据
          let parsedData = { tasks: [], cards: [] };
          const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          
          // 尝试匹配JSON对象
          const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsedData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error('解析JSON失败:', e);
            }
          }
          
          // 如果没有找到任务数据，尝试从文本中提取
          if (!parsedData.tasks || parsedData.tasks.length === 0) {
            // 尝试从文本中提取任务
            const tasksMatch = resultStr.match(/任务[^：]*[:：]([^]*?)(?=卡片|$)/);
            if (tasksMatch) {
              const taskLines = tasksMatch[1].split(/\d+\.\s*/);
              parsedData.tasks = taskLines.filter(line => line.trim().length > 0)
                .map((line, index) => {
                  const titleMatch = line.match(/[**「」\[\]【】]*([^:：]+)[**「」\[\]【】]*[：:]/);
                  const title = titleMatch ? titleMatch[1].trim() : `任务${index + 1}`;
                  const content = line.replace(/[**「」\[\]【】]*([^:：]+)[**「」\[\]【】]*[：:]/, '').trim();
                  return { title, content };
                });
            }
          }
          
          // 如果没有找到卡片数据，尝试从文本中提取
          if (!parsedData.cards || parsedData.cards.length === 0) {
            // 尝试从文本中提取卡片
            const cardsMatch = resultStr.match(/卡片[^：]*[:：]([^]*)/);
            if (cardsMatch) {
              const cardLines = cardsMatch[1].split(/\d+\.\s*/);
              parsedData.cards = cardLines.filter(line => line.trim().length > 0)
                .map((line, index) => {
                  const titleMatch = line.match(/[**「」\[\]【】]*([^:：]+)[**「」\[\]【】]*[：:]/);
                  const title = titleMatch ? titleMatch[1].trim() : `卡片${index + 1}`;
                  const content = line.replace(/[**「」\[\]【】]*([^:：]+)[**「」\[\]【】]*[：:]/, '').trim();
                  return { title, content };
                });
            }
          }
          
          // 设置研学计划
          const firstSuggestion = that.data.selectedSuggestions[0];
          that.setData({
            planTitle: firstSuggestion.title || '研学活动计划',
            steps: parsedData.tasks && parsedData.tasks.length > 0 ? 
              parsedData.tasks.map((task, index) => ({
                id: index + 1,
                title: task.title || `任务${index + 1}`,
                content: task.content || '完成此研学任务。'
              })) : [
                {
                  id: 1,
                  title: '了解背景知识',
                  content: '在出发前，先了解' + that.data.specificVenue + '的基本背景知识，阅读相关资料，观看视频介绍。'
                },
                {
                  id: 2,
                  title: '准备研学工具',
                  content: '根据研学内容准备相应的工具，如笔记本、相机、放大镜等，便于记录和探索。'
                },
                {
                  id: 3,
                  title: '现场研学活动',
                  content: '在' + that.data.specificVenue + '进行实地考察，按照研学路线深入探索，完成预设的任务和挑战。'
                }
              ],
            studyCards: parsedData.cards || [],
            currentStep: 2,
            showBackIcon: true,
            stepsEnabled: true, // 确保步骤已启用
            planGenerated: true // 标记研学计划已生成
          });
          
          that.updatePageTitle();
          that.saveCurrentStepData();
        } catch (error) {
          console.error('处理研学计划数据失败:', error);
          
          // 使用默认研学计划
          const firstSuggestion = that.data.selectedSuggestions[0];
          that.setData({
            planTitle: firstSuggestion.title || '研学活动计划',
            steps: [
              {
                id: 1,
                title: '了解背景知识',
                content: '在出发前，先了解' + that.data.specificVenue + '的基本背景知识，阅读相关资料，观看视频介绍。'
              },
              {
                id: 2,
                title: '准备研学工具',
                content: '根据研学内容准备相应的工具，如笔记本、相机、放大镜等，便于记录和探索。'
              },
              {
                id: 3,
                title: '现场研学活动',
                content: '在' + that.data.specificVenue + '进行实地考察，按照研学路线深入探索，完成预设的任务和挑战。'
              }
            ],
            studyCards: [],
            currentStep: 2,
            showBackIcon: true,
            stepsEnabled: true, // 确保步骤已启用
            planGenerated: true // 标记研学计划已生成
          });
          
          that.updatePageTitle();
          that.saveCurrentStepData();
        }
      })
      .catch(error => {
        wx.hideLoading();
        console.error('生成研学计划失败:', error);
        
        // 使用默认研学计划
        const firstSuggestion = that.data.selectedSuggestions[0];
        that.setData({
          planTitle: firstSuggestion.title || '研学活动计划',
          steps: [
            {
              id: 1,
              title: '了解背景知识',
              content: '在出发前，先了解' + that.data.specificVenue + '的基本背景知识，阅读相关资料，观看视频介绍。'
            },
            {
              id: 2,
              title: '准备研学工具',
              content: '根据研学内容准备相应的工具，如笔记本、相机、放大镜等，便于记录和探索。'
            },
            {
              id: 3,
              title: '现场研学活动',
              content: '在' + that.data.specificVenue + '进行实地考察，按照研学路线深入探索，完成预设的任务和挑战。'
            }
          ],
          currentStep: 2,
          showBackIcon: true,
          stepsEnabled: true, // 确保步骤已启用
          planGenerated: true // 标记研学计划已生成
        });
        
        that.updatePageTitle();
        that.saveCurrentStepData();
      });
  },
  
  // 创建与指定AI的对话
  createConversationWithAI: function(appId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://qianfan.baidubce.com/v2/app/conversation',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer bce-v3/ALTAK-w3MXrEFZ1OhNY5jY0CnD4/18a96d20109a8753224caf0bbb4f74fe16811204'
        },
        data: {
          app_id: appId
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
  
  // 向指定AI发送请求
  sendRequestToAI: function(conversationId, appId, prompt) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://qianfan.baidubce.com/v2/app/conversation/runs',
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer bce-v3/ALTAK-w3MXrEFZ1OhNY5jY0CnD4/18a96d20109a8753224caf0bbb4f74fe16811204'
        },
        data: {
          app_id: appId,
          conversation_id: conversationId,
          query: prompt,
          stream: false
        },
        success: function(res) {
          // 修改: 检查状态码和data，允许从answer字段提取结果
          if (res.statusCode === 200 && res.data) {
            if (res.data.result) {
              resolve(res.data.result);
            } else if (res.data.answer) {
              // 如果没有result字段但有answer字段，使用answer
              resolve(res.data.answer);
            } else {
              // 尝试从返回的content中提取文本内容
              try {
                if (res.data.content && Array.isArray(res.data.content)) {
                  for (let item of res.data.content) {
                    if (item.content_type === 'text' && item.outputs && item.outputs.text) {
                      resolve(item.outputs.text);
                      return;
                    }
                  }
                }
                // 如果没有找到文本内容，返回整个响应内容
                resolve(JSON.stringify(res.data));
              } catch (error) {
                reject(new Error('解析API返回内容失败: ' + error));
              }
            }
          } else {
            reject(new Error('API请求失败: ' + JSON.stringify(res)));
          }
        },
        fail: function(err) {
          reject(err);
        }
      });
    });
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
