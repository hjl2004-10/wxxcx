var app = getApp();

Page({
  data: {
    currentStep: 1,
    showBackIcon: false,
    pageTitle: "亲子研学流程",
    stepsEnabled: false,
    selectedSuggestions: [],
    
    // 新增：对话相关数据
    chatMessages: [],
    inputText: '',
    isLoadingSuggestions: false,
    showDetailModal: false,
    
    // 新增：AI4接口相关配置
    serviceId: '6', // AI4接口ID
    accessKey: 'hjl2004', // 访问密钥
    serverUrl: 'https://tanlv.top', // 服务器URL
    isAIResponding: false, // AI是否正在回复
    
    // 新增：强制开始相关
    showForceStartBtn: false, // 是否显示强制开始按钮
    conversationCount: 0, // 对话轮次计数
    
    // 新增：并发生成状态
    showGenerationArea: false,
    guideStoryStatus: 'waiting',
    studyPlanStatus: 'waiting',
    guideStoryStatusText: '等待开始',
    studyPlanStatusText: '等待开始',
    
    // 新增：插图相关状态
    storyImageUrl: '',
    isGeneratingImage: false,
    imageError: '',
    
    // 基本信息相关数据
    kidsInfo: [{
      id: 1,
      gender: '',
      age: ''
    }],
    venueType: '',
    specificVenue: '',
    duration: '2h',
    
    // 分析建议相关数据
    suggestions: [],
    currentSuggestion: null,
    
    // 研学中计划相关数据
    planTitle: '',
    steps: [],
    studyCards: [],
    
    // 研学后相关数据
    tempFilePaths: [],
    reflectionText: '',
    
    // API相关
    conversationId: '',
    guideStory: '',
    guideStoryNodes: '',

    // 语音播放相关
    isPlayingAudio: false,
    audioContext: null,
    currentPlayingId: '',
    playingText: '',
    playIconPath: "/images/1.png",
    pauseIconPath: "/images/2.png",
    
    // 新增：兴趣分类相关数据
    interestCategories: [
      {
        id: 'nature',
        name: '自然风光',
        icon: '🌿',
        subcategories: [
          { id: 'plants', name: '植物生态', description: '了解各种植物、生态系统' },
          { id: 'animals', name: '动物世界', description: '观察动物习性、生活环境' },
          { id: 'geology', name: '地质地貌', description: '学习地质结构、自然景观形成' },
          { id: 'weather', name: '气象天文', description: '认识天气现象、天体运行' },
          { id: 'environment', name: '环境保护', description: '培养环保意识、生态保护' }
        ]
      },
      {
        id: 'technology',
        name: '科技创新',
        icon: '🔬',
        subcategories: [
          { id: 'physics', name: '物理原理', description: '体验物理现象、科学实验' },
          { id: 'engineering', name: '工程技术', description: '了解机械结构、工程设计' },
          { id: 'digital', name: '数字科技', description: '接触编程、人工智能、虚拟现实' },
          { id: 'medicine', name: '生命科学', description: '学习人体结构、医学知识' },
          { id: 'space', name: '航空航天', description: '探索太空科技、航天器原理' }
        ]
      },
      {
        id: 'history',
        name: '历史文化',
        icon: '🏛️',
        subcategories: [
          { id: 'architecture', name: '古建筑艺术', description: '欣赏古代建筑、建造工艺' },
          { id: 'costume', name: '服饰文化', description: '了解传统服装、时代特色' },
          { id: 'customs', name: '民俗习惯', description: '体验传统习俗、节庆文化' },
          { id: 'literature', name: '文学艺术', description: '接触古典文学、书法绘画' },
          { id: 'philosophy', name: '思想文化', description: '学习传统思想、哲学理念' }
        ]
      },
      {
        id: 'art',
        name: '艺术创作',
        icon: '🎨',
        subcategories: [
          { id: 'painting', name: '绘画艺术', description: '学习绘画技巧、艺术欣赏' },
          { id: 'music', name: '音乐表演', description: '了解音乐理论、乐器演奏' },
          { id: 'handicraft', name: '手工制作', description: '动手制作、创意设计' },
          { id: 'drama', name: '戏剧表演', description: '体验角色扮演、舞台表演' },
          { id: 'photography', name: '摄影艺术', description: '学习摄影技巧、美学构图' }
        ]
      }
    ],
    selectedInterestCategories: [], // 用户选择的大类
    selectedSubcategories: [], // 用户选择的细分类别
    showInterestSelection: false, // 是否显示兴趣选择界面
    currentInterestStep: 'category', // 当前步骤：category(大类选择) / subcategory(细分选择) / complete(完成)
    
    // 新增：信息收集阶段标识
    collectionPhase: 'basic', // basic(基本信息) / interest(兴趣选择) / complete(完成)
  },
  
  onLoad: function (options) {
    if (options.step) {
      const step = parseInt(options.step);
      this.setData({
        currentStep: step,
        showBackIcon: step !== 1
      });
      this.updatePageTitle();
    }
    
    this.loadCachedData();
    this.createAudioIcons();
    this.initChat();
  },
  
  // 新增：页面卸载时清理资源
  onUnload: function() {
    // 停止音频播放
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
  },
  
  // 新增：初始化对话
  initChat: function() {
    const welcomeMessage = {
      id: Date.now(),
      role: 'assistant',
      content: '您好！我是您的研学规划助手🤖\n\n为了给您制定最合适的研学方案，我需要了解一些基本信息：\n\n1. 参与研学的孩子情况（年龄、性别）\n2. 您想去的研学场所\n3. 计划的研学时长\n\n请告诉我一些孩子的基本情况吧！'
    };
    
    this.setData({
      chatMessages: [welcomeMessage]
    });
  },
  
  // 新增：处理聊天输入
  onChatInput: function(e) {
    this.setData({
      inputText: e.detail.value
    });
  },
  
  // 新增：发送消息
  sendMessage: function() {
    const inputText = this.data.inputText.trim();
    if (!inputText || this.data.isAIResponding) return;
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputText
    };
    
    const newMessages = [...this.data.chatMessages, userMessage];
    const newConversationCount = this.data.conversationCount + 1;
    
    this.setData({
      chatMessages: newMessages,
      inputText: '',
      isAIResponding: true,
      currentAIResponse: '',
      conversationCount: newConversationCount,
      // 对话超过6轮且还没生成建议时才显示强制开始按钮
      showForceStartBtn: newConversationCount >= 6 && !this.data.isLoadingSuggestions && this.data.suggestions.length === 0
    });
    
    this.callAI4Interface(inputText);
  },
  
  // 新增：强制开始生成
  forceStartGeneration: function() {
    // 【关键修复】强制开始时也要提取对话信息
    const messages = this.data.chatMessages;
    const conversationText = messages.map(msg => msg.content).join(' ');
    
    // 智能提取基本信息
    const extractedInfo = this.extractInfoWithDefaults(conversationText);
    
    console.log('🔧 强制开始时提取的信息:', extractedInfo);
    
    // 设置基本信息到data中
    this.setData({
      kidsInfo: extractedInfo.kidsInfo,
      venueType: extractedInfo.venueType,
      specificVenue: extractedInfo.specificVenue,
      duration: extractedInfo.duration
    });
    
    // 检查当前所在阶段
    if (this.data.collectionPhase === 'basic') {
      // 基本信息阶段的强制开始
      wx.showModal({
        title: '确认开始',
        content: `确定要基于当前信息进入兴趣选择阶段吗？\n\n当前信息：\n👶 ${extractedInfo.kidsInfo[0].age}岁${extractedInfo.kidsInfo[0].gender}孩\n📍 ${extractedInfo.specificVenue}\n⏰ ${extractedInfo.duration}\n\n缺失的信息将使用合理的默认值。`,
        confirmText: '确定开始',
        cancelText: '继续对话',
        success: (res) => {
          if (res.confirm) {
            this.triggerInterestSelection();
          }
        }
      });
    } else if (this.data.collectionPhase === 'interest') {
      // 兴趣选择阶段的强制开始
      wx.showModal({
        title: '跳过兴趣选择',
        content: '您确定要跳过兴趣选择，直接生成通用建议吗？',
        confirmText: '跳过选择',
        cancelText: '继续选择',
        success: (res) => {
          if (res.confirm) {
            this.skipInterestSelection();
          }
        }
      });
    }
  },
  
  // 新增：调用AI4接口
  callAI4Interface: function(userInput) {
    const that = this;
    
    // 构建对话历史上下文
    const conversationHistory = this.buildConversationContext();
    
    // 全新设计：让AI4具备智能判断和推荐能力的提示词
    const fullPrompt = `${conversationHistory}

用户最新输入: ${userInput}

【你是专业的研学规划助手，具备智能判断和推荐能力】

核心任务：收集研学基本信息并智能决策下一步行动
必需信息：孩子年龄、性别、研学场所、研学时长

【智能判断三层逻辑】

🔍 第一层：用户回答意愿判断
- 用户直接提供信息 → 继续收集剩余信息
- 用户回避/模糊/不耐烦 → 转入推荐模式
- 判断标准：看用户是否积极配合回答

💡 第二层：智能推荐能力
- 当用户不愿详细回答时，基于常见研学场景主动推荐
- 推荐模板："基于常见情况，我为您推荐：X岁Y孩，Z场所，W时长的研学活动"
- 观察用户对推荐的反应

✅ 第三层：流程决策
- 用户认可推荐 → 开始生成流程
- 用户修正推荐 → 基于修正信息开始生成
- 用户拒绝推荐 → 继续耐心对话
- 信息足够完整 → 直接开始生成

【开始生成的判断标准】
满足以下任一条件时，返回特殊JSON格式：
1. 收集到4项完整信息（年龄、性别、场所、时长）
2. 用户认可你的推荐信息
3. 用户表达开始意愿且有基础信息支撑
4. 多轮对话后用户显示配合但信息略有缺失（可推荐补充）

【特殊输出格式】
当决定开始生成时，必须严格按以下JSON格式输出：

\`\`\`json
{
  "response": "好的！基于我们的对话，我了解您的需求。[总结信息]，现在开始为您生成个性化研学方案...",
  "action": "START_GENERATION",
  "data": {
    "age": "提取或推荐的年龄",
    "gender": "提取或推荐的性别", 
    "venue": "提取或推荐的场所",
    "duration": "提取或推荐的时长"
  }
}
\`\`\`

【语气控制要求】
- 继续对话时：保持询问和引导语气
- 提供推荐时：使用建议和征求意见的语气  
- 开始生成时：使用确认总结的语气，不再询问新信息

【智能推荐数据库】
年龄推荐：3-6岁(幼儿)、7-9岁(小学低年级)、10-12岁(小学高年级)、13-15岁(中学)
场所推荐：科技馆、博物馆、自然公园、历史景点、艺术馆
时长推荐：2小时、半天、全天

当前对话轮次：${this.data.conversationCount}轮

请根据用户输入，运用三层判断逻辑，决定继续对话还是开始生成。记住：你有完全的主动权和决策权！`;
    
    // 请求参数 - 使用非流式
    const requestData = {
      text: fullPrompt,
      key: this.data.accessKey,
      stream: false
    };

    // 服务URL
    const serviceUrl = `${this.data.serverUrl}/${this.data.serviceId}`;
    console.log('🤖 调用AI4智能判断接口:', serviceUrl);
    
    // 使用普通的wx.request发送请求
    wx.request({
      url: serviceUrl,
      method: 'POST',
      data: requestData,
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey
      },
      success: function(res) {
        console.log('🤖 AI4智能判断响应:', res);
        if (res.statusCode === 200) {
          let aiContent = '';
          
          // 处理响应数据
          if (res.data && res.data.content) {
            aiContent = res.data.content;
          } else if (res.data && typeof res.data === 'string') {
            aiContent = res.data;
          } else {
            aiContent = '抱歉，我暂时无法理解您的问题，请重新描述一下。';
          }
          
          // 检查是否包含JSON格式的开始指令
          const jsonMatch = aiContent.match(/```json\s*\n([\s\S]*?)\n\s*```/);
          let shouldStart = false;
          let extractedData = null;
          let responseText = aiContent;
          
          if (jsonMatch) {
            try {
              const jsonData = JSON.parse(jsonMatch[1]);
              if (jsonData.action === 'START_GENERATION' && jsonData.data) {
                shouldStart = true;
                extractedData = jsonData.data;
                responseText = jsonData.response || responseText;
                console.log('✅ AI4决定开始生成，提取数据:', extractedData);
              }
            } catch (parseError) {
              console.error('❌ JSON解析失败:', parseError);
            }
          }
          
          // 清理JSON标记，只显示回复内容
          responseText = responseText.replace(/```json[\s\S]*?```/g, '').trim();
          
          // 添加AI回复消息
          const aiMessage = {
            id: Date.now(),
            role: 'assistant',
            content: responseText
          };
          
          const newMessages = [...that.data.chatMessages, aiMessage];
          that.setData({
            chatMessages: newMessages,
            isAIResponding: false
          });
          
          // 根据AI决策执行相应行动
          if (shouldStart && extractedData) {
            console.log('🚀 AI4智能决策：开始生成流程');
            setTimeout(() => {
              that.startGenerationWithAIData(extractedData);
            }, 1500);
          } else {
            console.log('💬 AI4智能决策：继续对话收集信息');
            
            // 轻量级兜底机制：对话过多时提供手动选择
            const conversationCount = that.data.conversationCount;
            if (conversationCount >= 15 && !that.data.showForceStartBtn) {
              that.setData({
                showForceStartBtn: true
              });
              
              const hintMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: '如果您希望快速开始，也可以点击"直接开始"按钮。'
              };
              
              const updatedMessages = [...that.data.chatMessages, hintMessage];
              that.setData({
                chatMessages: updatedMessages
              });
            }
          }
          
        } else {
          that.handleAIError('服务器返回状态码 ' + res.statusCode);
        }
      },
      fail: function(err) {
        console.error('❌ AI4请求失败:', err);
        that.handleAIError('网络请求失败，请检查网络连接');
      }
    });
  },
  
  // 新增：根据AI提取的数据开始生成
  startGenerationWithAIData: function(extractedData) {
    console.log('🔧 根据AI提取数据开始生成:', extractedData);
    
    // 转换AI提取的数据为系统格式
    const processedData = {
      kidsInfo: [{
        id: 1,
        gender: extractedData.gender || '男',
        age: extractedData.age ? extractedData.age.replace(/岁|年级/, '') : '8'
      }],
      venueType: this.inferVenueType(extractedData.venue),
      specificVenue: extractedData.venue || '科技馆',
      duration: extractedData.duration || '半天'
    };
    
    console.log('📋 转换后的数据:', processedData);
    
    // 设置基本信息到data中
    this.setData({
      kidsInfo: processedData.kidsInfo,
      venueType: processedData.venueType,
      specificVenue: processedData.specificVenue,
      duration: processedData.duration
    });
    
    // 直接进入兴趣选择阶段
    this.triggerInterestSelection();
  },
  
  // 新增：根据场所名称推断场所类型
  inferVenueType: function(venueName) {
    if (!venueName) return '博物馆';
    
    const venueTypeMap = {
      '科技馆': '科技馆',
      '博物馆': '博物馆', 
      '美术馆': '美术馆',
      '艺术馆': '美术馆',
      '公园': '公园',
      '动物园': '公园',
      '植物园': '公园',
      '海洋馆': '海洋馆',
      '水族馆': '海洋馆',
      '故宫': '历史景点',
      '长城': '历史景点'
    };
    
    for (let keyword in venueTypeMap) {
      if (venueName.includes(keyword)) {
        return venueTypeMap[keyword];
      }
    }
    
    return '博物馆'; // 默认类型
  },
  
  // 新增：构建对话上下文
  buildConversationContext: function() {
    const messages = this.data.chatMessages;
    let context = "【你是专业的研学规划助手】\n";
    context += "你的任务是收集研学基本信息并智能决策何时开始生成。\n\n";
    
    context += "对话历史：\n";
    
    // 保留最近的10条消息作为上下文
    const recentMessages = messages.slice(-10);
    recentMessages.forEach(msg => {
      const role = msg.role === 'assistant' ? '助手' : '用户';
      context += `${role}: ${msg.content}\n`;
    });
    
    return context;
  },
  
  // 新增：处理AI错误
  handleAIError: function(errorMsg) {
    const errorMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `抱歉，我遇到了一些问题：${errorMsg}\n\n请重新发送您的消息，我会继续为您服务。`
    };
    
    const newMessages = [...this.data.chatMessages, errorMessage];
    this.setData({
      chatMessages: newMessages,
      isAIResponding: false
    });
    
    wx.showToast({
      title: 'AI服务暂时不可用',
      icon: 'none'
    });
  },
  
  // 新增：检查信息是否收集完整
  checkInfoComplete: function() {
    const messages = this.data.chatMessages;
    const conversationText = messages.map(msg => msg.content).join(' ');
    
    // 智能分析对话内容，检查是否包含必要信息
    const hasAgeInfo = this.extractAgeInfo(conversationText);
    const hasGenderInfo = this.extractGenderInfo(conversationText);
    const hasVenueInfo = this.extractVenueInfo(conversationText);
    const hasDurationInfo = this.extractDurationInfo(conversationText);
    
    console.log('信息收集状态:', {
      hasAgeInfo,
      hasGenderInfo, 
      hasVenueInfo,
      hasDurationInfo
    });
    
    // 如果所有必要信息都收集到了，触发建议生成
    if (hasAgeInfo && hasGenderInfo && hasVenueInfo && hasDurationInfo) {
      setTimeout(() => {
        this.triggerSuggestionGeneration();
      }, 2000);
    }
  },
  
  // 新增：检查用户开始意愿
  checkStartIntent: function(text) {
    const startPatterns = [
      /开始|开始吧|可以开始/,
      /就这样|够了|行了/,
      /直接开始|马上开始/,
      /可以了|OK|ok/,
      /不用了|算了|跳过/,
      /快点|着急|赶时间/
    ];
    
    return startPatterns.some(pattern => pattern.test(text));
  },
  
  // 新增：AI4智能触发建议生成
  triggerSuggestionFromAI4: function() {
    const messages = this.data.chatMessages;
    const conversationText = messages.map(msg => msg.content).join(' ');
    
    // 智能提取可用信息，对缺失信息使用合理默认值
    const extractedInfo = this.extractInfoWithDefaults(conversationText);
    
    console.log('AI4触发，提取的信息:', extractedInfo);
    
    // 更新数据
    this.setData(extractedInfo);
    
    // 添加AI提示消息
    const aiMessage = {
      id: Date.now(),
      role: 'assistant',
      content: '好的！基于您提供的信息，我现在为您生成个性化的研学建议。对于未明确的部分，我将使用合适的默认设置...'
    };
    
    const newMessages = [...this.data.chatMessages, aiMessage];
    this.setData({
      chatMessages: newMessages,
      isLoadingSuggestions: true
    });
    
    // 延迟生成，让用户看到提示
    setTimeout(() => {
      this.generateSuggestion();
    }, 1000);
  },
  
  // 新增：智能提取信息并使用默认值
  extractInfoWithDefaults: function(text) {
    console.log('🔍 开始提取对话信息，文本长度:', text.length);
    
    // 增强年龄提取逻辑
    let age = '8'; // 默认年龄
    const agePatterns = [
      /(\d+)\s*岁/g,
      /(\d+)\s*年级/g,
      /年龄.*?(\d+)/g,
      /(\d+)\s*周岁/g,
      /今年\s*(\d+)/g
    ];
    
    for (let pattern of agePatterns) {
      const matches = text.matchAll(pattern);
      for (let match of matches) {
        const extractedAge = parseInt(match[1]);
        if (extractedAge >= 3 && extractedAge <= 18) {
          age = extractedAge.toString();
          console.log('✅ 提取到年龄:', age);
          break;
        }
      }
      if (age !== '8') break;
    }
    
    // 根据学段推断年龄
    if (age === '8') {
      if (/幼儿园|学前|小班|中班|大班/.test(text)) {
        age = '5';
        console.log('📚 根据学段推断年龄:', age, '(幼儿园)');
      } else if (/小学|小学生|一年级|二年级|三年级|四年级|五年级|六年级/.test(text)) {
        age = '8';
        console.log('📚 根据学段推断年龄:', age, '(小学)');
      } else if (/中学|初中|中学生|七年级|八年级|九年级/.test(text)) {
        age = '12';
        console.log('📚 根据学段推断年龄:', age, '(中学)');
      }
    }
    
    // 增强性别提取逻辑
    let gender = '男'; // 默认性别
    const genderPatterns = [
      { pattern: /女孩|女生|女儿|女娃|女童|小女孩|女宝|女宝宝/, gender: '女' },
      { pattern: /男孩|男生|儿子|男娃|男童|小男孩|男宝|男宝宝/, gender: '男' }
    ];
    
    for (let { pattern, gender: g } of genderPatterns) {
      if (pattern.test(text)) {
        gender = g;
        console.log('✅ 提取到性别:', gender);
        break;
      }
    }
    
    // 增强场所提取逻辑
    let venueType = '其他场所';
    let specificVenue = '';
    
    // 更灵活的场所提取 - 识别各种场所表达
    const venuePatterns = [
      // 教育场所
      /去(?:到)?([^，。！？\s]*(?:大学|学院|学校|图书馆|实验室|教室))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:大学|学院|学校|图书馆|实验室|教室))/g,
      /参观([^，。！？\s]*(?:大学|学院|学校|图书馆|实验室|教室))/g,
      
      // 博物馆类
      /去(?:到)?([^，。！？\s]*(?:博物馆|纪念馆|展览馆|文物馆))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:博物馆|纪念馆|展览馆|文物馆))/g,
      /参观([^，。！？\s]*(?:博物馆|纪念馆|展览馆|文物馆))/g,
      
      // 科技场所
      /去(?:到)?([^，。！？\s]*(?:科技馆|科学馆|天文馆|海洋馆|水族馆))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:科技馆|科学馆|天文馆|海洋馆|水族馆))/g,
      /参观([^，。！？\s]*(?:科技馆|科学馆|天文馆|海洋馆|水族馆))/g,
      
      // 文化艺术场所
      /去(?:到)?([^，。！？\s]*(?:美术馆|艺术馆|画廊|文化中心|艺术中心))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:美术馆|艺术馆|画廊|文化中心|艺术中心))/g,
      /参观([^，。！？\s]*(?:美术馆|艺术馆|画廊|文化中心|艺术中心))/g,
      
      // 公园景点
      /去(?:到)?([^，。！？\s]*(?:公园|动物园|植物园|游乐园|主题公园))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:公园|动物园|植物园|游乐园|主题公园))/g,
      /参观([^，。！？\s]*(?:公园|动物园|植物园|游乐园|主题公园))/g,
      
      // 历史建筑
      /去(?:到)?([^，。！？\s]*(?:故宫|长城|寺庙|古镇|遗址|古建筑))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:故宫|长城|寺庙|古镇|遗址|古建筑))/g,
      /参观([^，。！？\s]*(?:故宫|长城|寺庙|古镇|遗址|古建筑))/g,
      
      // 其他场所
      /去(?:到)?([^，。！？\s]*(?:中心|基地|场馆|会馆|厅|院|所))/g,
      /(?:想去|要去|计划去)([^，。！？\s]*(?:中心|基地|场馆|会馆|厅|院|所))/g,
      /参观([^，。！？\s]*(?:中心|基地|场馆|会馆|厅|院|所))/g
    ];
    
    // 从所有匹配中找到最长最具体的场所名称
    let extractedVenues = [];
    for (let pattern of venuePatterns) {
      const matches = text.matchAll(pattern);
      for (let match of matches) {
        if (match[1] && match[1].trim()) {
          extractedVenues.push(match[1].trim());
        }
      }
    }
    
    if (extractedVenues.length > 0) {
      // 选择最长的场所名称（通常最具体）
      specificVenue = extractedVenues.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
      
      // 根据场所名称推断类型
      if (/大学|学院|学校|图书馆|实验室|教室/.test(specificVenue)) {
        venueType = '教育场所';
      } else if (/博物馆|纪念馆|展览馆|文物馆/.test(specificVenue)) {
        venueType = '博物馆';
      } else if (/科技馆|科学馆|天文馆/.test(specificVenue)) {
        venueType = '科技馆';
      } else if (/海洋馆|水族馆/.test(specificVenue)) {
        venueType = '海洋馆';
      } else if (/美术馆|艺术馆|画廊/.test(specificVenue)) {
        venueType = '美术馆';
      } else if (/公园|动物园|植物园|游乐园/.test(specificVenue)) {
        venueType = '公园';
      } else if (/故宫|长城|寺庙|古镇|遗址/.test(specificVenue)) {
        venueType = '历史景点';
      } else if (/中心|基地|场馆/.test(specificVenue)) {
        venueType = '文化场所';
      } else {
        venueType = '其他场所';
      }
      
      console.log('✅ 提取到具体场所:', specificVenue, '类型:', venueType);
    } else {
      // 如果没有提取到具体场所，尝试识别场所类型
      const venueTypePatterns = [
        { pattern: /大学|学院|学校|图书馆/, type: '教育场所', venue: '大学图书馆' },
        { pattern: /科技馆|科学馆/, type: '科技馆', venue: '科技馆' },
        { pattern: /美术馆|艺术馆/, type: '美术馆', venue: '美术馆' },
        { pattern: /博物馆|历史馆/, type: '博物馆', venue: '博物馆' },
        { pattern: /动物园|植物园|公园/, type: '公园', venue: '公园' },
        { pattern: /海洋馆|水族馆/, type: '海洋馆', venue: '海洋馆' }
      ];
      
      for (let { pattern, type, venue } of venueTypePatterns) {
        if (pattern.test(text)) {
          venueType = type;
          specificVenue = venue;
          console.log('✅ 根据类型推断场所:', specificVenue, '类型:', venueType);
          break;
        }
      }
      
      // 如果还是没有，使用默认值
      if (!specificVenue) {
        venueType = '博物馆';
        specificVenue = '博物馆';
        console.log('🔄 使用默认场所:', specificVenue);
      }
    }
    
    // 增强时长提取逻辑
    let duration = '半天'; // 默认时长
    const durationPatterns = [
      { pattern: /2\s*小时|2\s*h|两\s*小时/, duration: '2h' },
      { pattern: /4\s*小时|4\s*h|四\s*小时/, duration: '4h' },
      { pattern: /全天|一天|整天|一整天/, duration: '全天' },
      { pattern: /半天|上午|下午|半日/, duration: '半天' }
    ];
    
    for (let { pattern, duration: d } of durationPatterns) {
      if (pattern.test(text)) {
        duration = d;
        console.log('✅ 提取到时长:', duration);
        break;
      }
    }
    
    const result = {
      kidsInfo: [{
        id: 1,
        gender: gender,
        age: age
      }],
      venueType: venueType,
      specificVenue: specificVenue,
      duration: duration
    };
    
    console.log('📋 信息提取完成:', result);
    return result;
  },
  
  // 新增：提取年龄信息
  extractAgeInfo: function(text) {
    const agePatterns = [
      /(\d+)\s*岁/,
      /(\d+)\s*年级/,
      /年龄.*?(\d+)/,
      /(\d+)\s*周岁/
    ];
    
    for (let pattern of agePatterns) {
      const match = text.match(pattern);
      if (match) {
        const age = parseInt(match[1]);
        if (age >= 3 && age <= 18) {
          return true;
        }
      }
    }
    return false;
  },
  
  // 新增：提取性别信息
  extractGenderInfo: function(text) {
    const genderPatterns = [
      /男孩|男生|儿子|男娃|男童/,
      /女孩|女生|女儿|女娃|女童/
    ];
    
    return genderPatterns.some(pattern => pattern.test(text));
  },
  
  // 新增：提取场所信息
  extractVenueInfo: function(text) {
    const venuePatterns = [
      /博物馆|科技馆|美术馆|历史馆/,
      /故宫|长城|天安门|颐和园/,
      /公园|动物园|植物园|海洋馆/,
      /科学中心|文化中心|展览馆/,
      /古镇|古城|遗址|景区/
    ];
    
    return venuePatterns.some(pattern => pattern.test(text));
  },
  
  // 新增：提取时长信息
  extractDurationInfo: function(text) {
    const durationPatterns = [
      /\d+\s*小时/,
      /半天|全天|一天/,
      /上午|下午|整天/,
      /\d+\s*h/
    ];
    
    return durationPatterns.some(pattern => pattern.test(text));
  },
  
  // 新增：触发建议生成
  triggerSuggestionGeneration: function() {
    // 添加AI提示消息
    const aiMessage = {
      id: Date.now(),
      role: 'assistant',
      content: '太好了！我已经收集到了所有必要信息。现在正在为您生成个性化的研学分析建议，请稍等片刻...'
    };
    
    const newMessages = [...this.data.chatMessages, aiMessage];
    this.setData({
      chatMessages: newMessages,
      isLoadingSuggestions: true
    });
    
    this.generateSuggestion();
  },
  
  // 新增：从对话中提取信息并生成建议
  generateSuggestionFromChat: function() {
    const messages = this.data.chatMessages;
    const conversationText = messages.map(msg => msg.content).join(' ');
    
    // 智能提取具体信息
    const extractedInfo = {
      kidsInfo: this.extractKidsInfo(conversationText),
      venueType: this.extractVenueType(conversationText),
      specificVenue: this.extractSpecificVenue(conversationText),
      duration: this.extractDuration(conversationText)
    };
    
    console.log('提取的信息:', extractedInfo);
    
    this.setData(extractedInfo);
    this.generateSuggestion();
  },
  
  // 新增：提取孩子信息
  extractKidsInfo: function(text) {
    const ageMatch = text.match(/(\d+)\s*岁/);
    const age = ageMatch ? ageMatch[1] : '8';
    
    const isMale = /男孩|男生|儿子|男娃|男童/.test(text);
    const gender = isMale ? '男' : '女';
    
    return [{
      id: 1,
      gender: gender,
      age: age
    }];
  },
  
  // 新增：提取场所类型
  extractVenueType: function(text) {
    if (/博物馆/.test(text)) return '博物馆';
    if (/科技馆/.test(text)) return '科技馆';
    if (/美术馆/.test(text)) return '美术馆';
    if (/公园|动物园|植物园/.test(text)) return '公园';
    if (/海洋馆/.test(text)) return '海洋馆';
    return '博物馆'; // 默认值
  },
  
  // 新增：提取具体场所
  extractSpecificVenue: function(text) {
    const venues = [
      '北京故宫', '上海科技馆', '中国国家博物馆', 
      '北京动物园', '上海海洋水族馆', '西安兵马俑'
    ];
    
    for (let venue of venues) {
      if (text.includes(venue) || text.includes(venue.slice(2))) {
        return venue;
      }
    }
    
    // 根据场所类型返回默认值
    const venueType = this.extractVenueType(text);
    const defaultVenues = {
      '博物馆': '北京故宫',
      '科技馆': '上海科技馆',
      '美术馆': '中国美术馆',
      '公园': '北京动物园',
      '海洋馆': '上海海洋水族馆'
    };
    
    return defaultVenues[venueType] || '北京故宫';
  },
  
  // 新增：提取时长
  extractDuration: function(text) {
    if (/2\s*小时|2\s*h/.test(text)) return '2h';
    if (/4\s*小时|4\s*h/.test(text)) return '4h';
    if (/半天/.test(text)) return '半天';
    if (/全天|一天|整天/.test(text)) return '全天';
    return '半天'; // 默认值
  },
  
  // 新增：开始并发生成
  startGeneration: function() {
    if (this.data.selectedSuggestions.length === 0) {
      wx.showToast({
        title: '请至少选择一个建议',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      showGenerationArea: true,
      guideStoryStatus: 'loading',
      studyPlanStatus: 'loading',
      guideStoryStatusText: '生成中...',
      studyPlanStatusText: '生成中...'
    });
    
    this.generateConcurrently();
  },
  
  // 新增：并发生成
  generateConcurrently: function() {
    const that = this;
    
    Promise.allSettled([
      this.generateGuideStoryAsync(),
      this.generateStudyPlanAsync()
    ]).then(results => {
      let allCompleted = true;
      
      results.forEach((result, index) => {
        if (index === 0) {
          if (result.status === 'fulfilled') {
            that.setData({
              guideStoryStatus: 'completed',
              guideStoryStatusText: '生成完成'
            });
          } else {
            that.setData({
              guideStoryStatus: 'error',
              guideStoryStatusText: '生成失败'
            });
            allCompleted = false;
          }
        } else {
          if (result.status === 'fulfilled') {
            that.setData({
              studyPlanStatus: 'completed',
              studyPlanStatusText: '生成完成'
            });
          } else {
            that.setData({
              studyPlanStatus: 'error',
              studyPlanStatusText: '生成失败'
            });
            allCompleted = false;
          }
        }
      });
      
      // 检查是否所有内容都已成功生成
      if (allCompleted && that.data.guideStory && that.data.planTitle && that.data.studyCards.length > 0) {
        console.log('✅ 所有AI内容生成完成，完成研学按钮已激活');
      } else {
        console.log('⚠️ 部分AI内容生成失败或未完成');
      }
    });
  },
  
  // 新增：异步生成导读材料
  generateGuideStoryAsync: function() {
    const that = this;
    return new Promise((resolve, reject) => {
      // 构建AI2的提示词
      const kidsInfo = this.data.kidsInfo[0];
      const selectedTitles = this.data.selectedSuggestions.map(s => s.title).join('、');
      
      const prompt = `请为以下研学活动生成一个有趣的导读故事：

研学信息：
- 孩子年龄：${kidsInfo.age}岁
- 研学场所：${this.data.specificVenue}
- 选择的建议：${selectedTitles}
- 研学时长：${this.data.duration}

请生成一个适合${kidsInfo.age}岁孩子的导读故事，包含：
1. 引人入胜的开头
2. 与场所相关的历史或文化背景
3. 激发孩子探索兴趣的内容
4. 适合的语言风格和长度

故事长度控制在300-500字。`;

      // 调用AI2接口
      wx.request({
        url: `${that.data.serverUrl}/2`,
        method: 'POST',
        data: {
          text: prompt,
          key: that.data.accessKey,
          stream: false
        },
        header: {
          'Content-Type': 'application/json',
          'X-Access-Key': that.data.accessKey
        },
        success: function(res) {
          console.log('AI2导读生成成功:', res);
          if (res.statusCode === 200) {
            let storyContent = '';
            
            // 处理响应数据
            if (res.data && res.data.content) {
              storyContent = res.data.content;
            } else if (res.data && typeof res.data === 'string') {
              storyContent = res.data;
            } else {
              storyContent = that.getDefaultGuideStory();
            }
            
            // 🔧 优化：立即设置文字内容和状态，触发按钮显示
            that.setData({
              guideStory: storyContent,
              guideStoryNodes: storyContent,
              guideStoryStatusText: '文字内容已完成'
            });
            
            console.log('📖 导读文字内容生成完成，进入研学流程按钮已显示');
            
            // 🎨 异步生成故事插图（不阻塞用户体验）
            setTimeout(() => {
              that.generateStoryImageAsync(storyContent);
            }, 500);
            
            resolve(storyContent);
          } else {
            console.error('AI2服务返回错误:', res.statusCode);
            const defaultStory = that.getDefaultGuideStory();
            that.setData({
              guideStory: defaultStory,
              guideStoryNodes: defaultStory,
              guideStoryStatusText: '使用默认内容'
            });
            console.log('📖 使用默认导读内容，进入研学流程按钮已显示');
            reject(err);
          }
        },
        fail: function(err) {
          console.error('AI2导读生成失败:', err);
          const defaultStory = that.getDefaultGuideStory();
          that.setData({
            guideStory: defaultStory,
            guideStoryNodes: defaultStory,
            guideStoryStatusText: '使用默认内容'
          });
          console.log('📖 使用默认导读内容，进入研学流程按钮已显示');
          reject(err);
        }
      });
    });
  },
  
  // 新增：异步生成故事插图（独立方法）
  generateStoryImageAsync: function(storyContent) {
    const that = this;
    
    // 设置图片生成状态
    this.setData({
      isGeneratingImage: true,
      guideStoryStatusText: '正在生成插图...'
    });
    
    // 从故事内容中提取关键信息作为图像提示
    const imagePrompt = this.extractImagePrompt(storyContent);
    
    console.log('🎨 开始生成故事插图，提示词:', imagePrompt);
    
    // 调用图像生成接口
    wx.request({
      url: `${this.data.serverUrl}/pic/1`,
      method: 'POST',
      data: {
        text: imagePrompt,
        key: this.data.accessKey
      },
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey
      },
      timeout: 60000, // 图像生成可能需要较长时间
      success: function(res) {
        console.log('🖼️ 插图生成响应:', res);
        if (res.statusCode === 200 && res.data && res.data.url) {
          that.setData({
            storyImageUrl: res.data.url,
            isGeneratingImage: false,
            guideStoryStatusText: '完全生成完成'
          });
          console.log('✅ 故事插图生成成功:', res.data.url);
        } else {
          that.setData({
            isGeneratingImage: false,
            imageError: '插图生成失败',
            guideStoryStatusText: '文字内容已完成'
          });
          console.error('❌ 插图生成失败:', res);
        }
      },
      fail: function(err) {
        console.error('❌ 插图生成请求失败:', err);
        that.setData({
          isGeneratingImage: false,
          imageError: '网络错误，插图生成失败',
          guideStoryStatusText: '文字内容已完成'
        });
      }
    });
  },
  
  // 新增：异步生成研学方案
  generateStudyPlanAsync: function() {
    const that = this;
    return new Promise((resolve, reject) => {
      // 构建AI3的提示词
      const kidsInfo = this.data.kidsInfo[0];
      const selectedSuggestions = this.data.selectedSuggestions;
      const suggestionsText = selectedSuggestions.map(s => `${s.title}: ${s.description}`).join('\n');
      
      const prompt = `请为以下研学活动生成详细的研学方案：

研学信息：
- 孩子年龄：${kidsInfo.age}岁
- 性别：${kidsInfo.gender}
- 研学场所：${this.data.specificVenue}
- 研学时长：${this.data.duration}

选择的建议：
${suggestionsText}

请生成JSON格式的研学方案，包含：
- planTitle: 方案标题
- steps: 研学步骤数组，每个步骤包含id、title、content
- studyCards: 研学卡片数组，每个卡片包含title、content

返回格式：
{
  "planTitle": "方案标题",
  "steps": [
    {"id": 1, "title": "步骤标题", "content": "步骤内容"}
  ],
  "studyCards": [
    {"title": "卡片标题", "content": "卡片内容"}
  ]
}

请确保内容适合${kidsInfo.age}岁的孩子，步骤清晰易懂。`;

      // 调用AI3接口
      wx.request({
        url: `${that.data.serverUrl}/3`,
        method: 'POST',
        data: {
          text: prompt,
          key: that.data.accessKey,
          stream: false
        },
        header: {
          'Content-Type': 'application/json',
          'X-Access-Key': that.data.accessKey
        },
        success: function(res) {
          console.log('AI3方案生成成功:', res);
          if (res.statusCode === 200) {
            try {
              let planData = null;
              let responseContent = '';
              
              // 处理响应数据
              if (res.data && res.data.content) {
                responseContent = res.data.content;
              } else if (res.data && typeof res.data === 'string') {
                responseContent = res.data;
              }
              
              // 尝试解析JSON
              try {
                const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  planData = JSON.parse(jsonMatch[0]);
                }
              } catch (parseError) {
                console.log('JSON解析失败，使用文本解析:', parseError);
                planData = that.parseTextPlan(responseContent);
              }
              
              // 如果解析失败，使用默认方案
              if (!planData) {
                planData = that.getDefaultStudyPlan();
              }
              
              that.setData({
                planTitle: planData.planTitle || '研学方案',
                steps: planData.steps || [],
                studyCards: planData.studyCards || []
              });
              
              resolve(planData);
              
            } catch (error) {
              console.error('处理方案数据失败:', error);
              const defaultPlan = that.getDefaultStudyPlan();
        that.setData({
                planTitle: defaultPlan.planTitle,
                steps: defaultPlan.steps,
                studyCards: defaultPlan.studyCards
              });
              resolve(defaultPlan);
            }
          } else {
            console.error('AI3服务返回错误:', res.statusCode);
            const defaultPlan = that.getDefaultStudyPlan();
            that.setData({
              planTitle: defaultPlan.planTitle,
              steps: defaultPlan.steps,
              studyCards: defaultPlan.studyCards
            });
            reject(err);
          }
        },
        fail: function(err) {
          console.error('AI3方案生成失败:', err);
          const defaultPlan = that.getDefaultStudyPlan();
          that.setData({
            planTitle: defaultPlan.planTitle,
            steps: defaultPlan.steps,
            studyCards: defaultPlan.studyCards
          });
          reject(err);
        }
      });
    });
  },
  
  // 新增：获取默认导读故事
  getDefaultGuideStory: function() {
    const venue = this.data.specificVenue;
    return `欢迎来到${venue}！这里有着悠久的历史和丰富的文化内涵。在这次研学之旅中，我们将一起探索这里的奥秘，发现历史的足迹，感受文化的魅力。让我们带着好奇心和求知欲，开始这段精彩的学习之旅吧！`;
  },
  
  // 新增：解析文本格式的研学方案
  parseTextPlan: function(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const plan = {
      planTitle: `${this.data.specificVenue}研学方案`,
      steps: [],
      studyCards: []
    };
    
    let currentSection = '';
    let stepCounter = 1;
    
    for (let line of lines) {
      line = line.trim();
      
      // 检测标题
      if (line.includes('方案') || line.includes('计划')) {
        plan.planTitle = line;
      }
      // 检测步骤
      else if (/^\d+[\.、]/.test(line) || /^[一二三四五六七八九十][、.]/.test(line)) {
        const title = line.replace(/^\d+[\.、]/, '').replace(/^[一二三四五六七八九十][、.]/, '').trim();
        plan.steps.push({
          id: stepCounter++,
          title: title,
          content: '详细内容请参考具体安排'
        });
      }
      // 检测卡片内容
      else if (line.length > 15 && !line.includes('：') && plan.studyCards.length < 3) {
        plan.studyCards.push({
          title: `学习要点${plan.studyCards.length + 1}`,
          content: line
        });
      }
    }
    
    return plan;
  },
  
  // 新增：获取默认研学方案
  getDefaultStudyPlan: function() {
    const venue = this.data.specificVenue;
    const age = this.data.kidsInfo[0].age;
    
    return {
      planTitle: `${venue}研学方案`,
      steps: [
        {id: 1, title: "入场准备", content: "了解参观规则，准备学习用品"},
        {id: 2, title: "主要参观", content: "按照路线参观主要展区"},
        {id: 3, title: "互动体验", content: "参与互动项目，加深理解"},
        {id: 4, title: "总结分享", content: "分享学习心得和感受"}
      ],
      studyCards: [
        {title: "观察技巧", content: "仔细观察展品的细节特征"},
        {title: "记录方法", content: "用文字或图画记录重要发现"},
        {title: "思考问题", content: "思考展品背后的历史故事"}
      ]
    };
  },
  
  // 新增：查看建议详情
  viewSuggestionDetail: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (isNaN(index) || index < 0 || index >= this.data.suggestions.length) {
      return;
    }
    
    const suggestion = this.data.suggestions[index];
      this.setData({
      currentSuggestion: suggestion,
      currentSuggestionIndex: index,
      showDetailModal: true
      });
  },
    
  // 新增：关闭详情弹窗
  closeDetailModal: function() {
      this.setData({
      showDetailModal: false,
        currentSuggestion: null
      });
  },
  
  // 新增：查看导读材料
  viewGuideStory: function() {
    if (!this.data.guideStory) {
      wx.showToast({
        title: '导读材料还未生成',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '导读材料',
      content: this.data.guideStory,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#E6A23C'
    });
  },
  
  // 新增：查看研学方案
  viewStudyPlan: function() {
      this.setData({
      currentStep: 2,
      stepsEnabled: true
      });
      this.updatePageTitle();
  },
  
  // 占位方法 - 后续补充完整功能
  updatePageTitle: function() {
    const titles = {
      1: "研学前",
      2: "研学中", 
      3: "研学后"
    };
    this.setData({
      pageTitle: titles[this.data.currentStep] || "亲子研学流程"
    });
  },
  
  loadCachedData: function() {
    // 占位方法
  },
  
  createAudioIcons: function() {
    // 占位方法
  },
  
  generateSuggestion: function() {
    const that = this;
    
    // 构建AI1的提示词
    const kidsInfo = this.data.kidsInfo[0];
    const prompt = `请为以下研学需求生成3-4个个性化的分析建议：

孩子信息：
- 年龄：${kidsInfo.age}岁
- 性别：${kidsInfo.gender}
- 研学场所：${this.data.specificVenue}
- 研学时长：${this.data.duration}

请生成JSON格式的建议列表，每个建议包含：
- title: 建议标题
- description: 详细描述
- ageRange: 适合年龄范围
- learningGoals: 学习目标

返回格式：
{
  "suggestions": [
    {
      "title": "建议标题",
      "description": "详细描述",
      "ageRange": "年龄范围",
      "learningGoals": "学习目标"
    }
  ]
}`;

    // 调用AI1接口
    wx.request({
      url: `${this.data.serverUrl}/1`,
      method: 'POST',
      data: {
        text: prompt,
        key: this.data.accessKey,
        stream: false
      },
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey
      },
      success: function(res) {
        console.log('AI1建议生成成功:', res);
        if (res.statusCode === 200) {
          try {
            let suggestions = [];
            let responseContent = '';
            
            // 处理响应数据
            if (res.data && res.data.content) {
              responseContent = res.data.content;
            } else if (res.data && typeof res.data === 'string') {
              responseContent = res.data;
            }
            
            // 尝试解析JSON
            try {
              const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsedData = JSON.parse(jsonMatch[0]);
                if (parsedData.suggestions && Array.isArray(parsedData.suggestions)) {
                  suggestions = parsedData.suggestions.map((item, index) => ({
                    id: index + 1,
                    title: item.title || `建议${index + 1}`,
                    description: item.description || '暂无描述',
                    ageRange: item.ageRange || `${kidsInfo.age}岁适合`,
                    learningGoals: item.learningGoals || '提升综合能力',
                    isSelected: false
                  }));
                }
              }
            } catch (parseError) {
              console.log('JSON解析失败，使用文本解析:', parseError);
              // 如果JSON解析失败，尝试文本解析
              suggestions = that.parseTextSuggestions(responseContent, kidsInfo.age);
            }
            
            // 如果仍然没有建议，使用默认建议
            if (suggestions.length === 0) {
              suggestions = that.getDefaultSuggestions(kidsInfo.age);
            }
            
                  that.setData({
              suggestions: suggestions,
              isLoadingSuggestions: false
          });
            
          } catch (error) {
            console.error('处理建议数据失败:', error);
          that.setData({
              suggestions: that.getDefaultSuggestions(kidsInfo.age),
              isLoadingSuggestions: false
            });
          }
        } else {
          that.handleSuggestionError('AI1服务返回错误');
        }
      },
      fail: function(err) {
        console.error('AI1建议生成失败:', err);
        that.handleSuggestionError('网络请求失败');
      }
    });
  },
  
  // 新增：解析文本格式的建议
  parseTextSuggestions: function(text, age) {
    const suggestions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSuggestion = null;
    for (let line of lines) {
      line = line.trim();
      
      // 检测标题行（通常包含数字或特殊标记）
      if (/^\d+[\.、]/.test(line) || /^[一二三四五六七八九十][、.]/.test(line)) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = {
          id: suggestions.length + 1,
          title: line.replace(/^\d+[\.、]/, '').replace(/^[一二三四五六七八九十][、.]/, '').trim(),
          description: '',
          ageRange: `${age}岁适合`,
          learningGoals: '提升综合能力',
          isSelected: false
        };
      } else if (currentSuggestion && line.length > 10) {
        // 将较长的行作为描述
        if (!currentSuggestion.description) {
          currentSuggestion.description = line;
      } else {
          currentSuggestion.description += ' ' + line;
        }
      }
    }
    
    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }
    
    return suggestions.slice(0, 4); // 最多返回4个建议
  },
  
  // 新增：获取默认建议
  getDefaultSuggestions: function(age) {
    return [
      {
        id: 1,
        title: "历史文化探索",
        description: "深入了解场所的历史文化背景，培养历史意识",
        ageRange: `${age}岁适合`,
        learningGoals: "培养历史意识和文化认知",
        isSelected: false
      },
      {
        id: 2,
        title: "互动体验学习",
        description: "通过互动体验的方式，增强学习的趣味性",
        ageRange: `${age}岁适合`,
        learningGoals: "提升学习兴趣和参与度",
        isSelected: false
      },
      {
        id: 3,
        title: "观察记录活动",
        description: "培养观察能力，记录学习过程和感受",
        ageRange: `${age}岁适合`,
        learningGoals: "提升观察力和表达能力",
        isSelected: false
      }
    ];
  },
  
  // 新增：处理建议生成错误
  handleSuggestionError: function(errorMsg) {
    console.error('建议生成错误:', errorMsg);
    this.setData({
      suggestions: this.getDefaultSuggestions(this.data.kidsInfo[0].age),
      isLoadingSuggestions: false
    });
    
    wx.showToast({
      title: '使用默认建议',
      icon: 'none'
    });
  },
  
  toggleSelectSuggestion: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const suggestions = [...this.data.suggestions];
    suggestions[index].isSelected = !suggestions[index].isSelected;
    
    const selectedSuggestions = suggestions.filter(item => item.isSelected);
    
    this.setData({
      suggestions: suggestions,
      selectedSuggestions: selectedSuggestions
    });
  },
  
  togglePlayAudio: function(e) {
    const audioId = e.currentTarget.dataset.id;
    const audioText = e.currentTarget.dataset.text;
    const that = this;
    
    console.log('音频播放请求:', {audioId, audioText});
    
    // 如果当前正在播放同一个音频，则停止播放
    if (this.data.isPlayingAudio && this.data.currentPlayingId === audioId) {
      this.stopAudio();
      return;
    }
    
    // 如果正在播放其他音频，先停止
    if (this.data.isPlayingAudio) {
      this.stopAudio();
    }
    
    // 开始播放新音频
      this.setData({
      isPlayingAudio: true,
      currentPlayingId: audioId,
      playingText: audioText
    });
    
    // 调用语音合成接口
    wx.request({
      url: `${this.data.serverUrl}/spk/1`,
      method: 'POST',
      data: {
        text: audioText,
        key: this.data.accessKey
      },
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey
      },
      responseType: 'arraybuffer',
      success: function(res) {
        console.log('语音合成成功:', res.statusCode);
        if (res.statusCode === 200) {
          // 将音频数据转换为临时文件
          const fs = wx.getFileSystemManager();
          const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio_${Date.now()}.mp3`;
          
          fs.writeFile({
            filePath: tempFilePath,
            data: res.data,
            success: function() {
              console.log('音频文件写入成功:', tempFilePath);
              
              // 创建音频上下文并播放
              that.createAudioContext();
              that.data.audioContext.src = tempFilePath;
              that.data.audioContext.play();
              
              // 监听播放结束
              that.data.audioContext.onEnded(() => {
                console.log('音频播放结束');
                that.setData({
                  isPlayingAudio: false,
                  currentPlayingId: '',
                  playingText: ''
                });
                
                // 清理临时文件
                fs.unlink({
                  filePath: tempFilePath,
                  success: () => console.log('临时音频文件已清理'),
                  fail: (err) => console.log('清理临时文件失败:', err)
                });
              });
              
              // 监听播放错误
              that.data.audioContext.onError((err) => {
                console.error('音频播放错误:', err);
                that.setData({
                  isPlayingAudio: false,
                  currentPlayingId: '',
                  playingText: ''
                });
      wx.showToast({
                  title: '音频播放失败',
        icon: 'none'
      });
                
                // 清理临时文件
                fs.unlink({
                  filePath: tempFilePath,
                  success: () => console.log('临时音频文件已清理'),
                  fail: (err) => console.log('清理临时文件失败:', err)
                });
              });
            },
            fail: function(err) {
              console.error('音频文件写入失败:', err);
              that.setData({
                isPlayingAudio: false,
                currentPlayingId: '',
                playingText: ''
              });
      wx.showToast({
                title: '音频处理失败',
        icon: 'none'
      });
            }
          });
        } else {
          that.handleAudioError('语音合成服务返回错误');
        }
      },
      fail: function(err) {
        console.error('语音合成请求失败:', err);
        that.handleAudioError('网络请求失败');
      }
    });
  },
  
  // 新增：创建音频上下文
  createAudioContext: function() {
    if (!this.data.audioContext) {
      this.setData({
        audioContext: wx.createInnerAudioContext()
      });
    }
  },
  
  // 新增：停止音频播放
  stopAudio: function() {
    if (this.data.audioContext) {
      this.data.audioContext.stop();
    }
    this.setData({
      isPlayingAudio: false,
      currentPlayingId: '',
      playingText: ''
    });
  },
  
  // 新增：处理音频错误
  handleAudioError: function(errorMsg) {
    console.error('音频播放错误:', errorMsg);
    this.setData({
      isPlayingAudio: false,
      currentPlayingId: '',
      playingText: ''
    });
      wx.showToast({
      title: '语音播放失败',
        icon: 'none'
      });
  },
  
  // 完善：创建音频图标
  createAudioIcons: function() {
    // 初始化音频相关资源
      this.setData({
      playIconPath: "/images/1.png",
      pauseIconPath: "/images/2.png"
    });
  },
  
  switchToStep: function(e) {
    const step = parseInt(e.currentTarget.dataset.step);
    if (step === 2 && !this.data.stepsEnabled) {
      wx.showToast({
        title: '请先完成研学前准备',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      currentStep: step
    });
    this.updatePageTitle();
  },
  
  completeStudy: function() {
    // 检查所有必要内容是否已生成
    if (!this.data.guideStory) {
      wx.showToast({
        title: '导读材料还未生成完成',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.planTitle) {
      wx.showToast({
        title: '研学方案还未生成完成',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.studyCards || this.data.studyCards.length === 0) {
      wx.showToast({
        title: '研学卡片还未生成完成',
        icon: 'none'
      });
      return;
    }
    
    // 所有内容都已生成，可以进入下一步
    this.setData({
      currentStep: 3
    });
    this.updatePageTitle();
  },
  
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
        wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },
  
  showInDevelopment: function() {
      wx.showToast({
      title: '功能开发中，敬请期待',
      icon: 'none',
      duration: 2000
    });
  },
  
  // 新增：生成故事插图
  generateStoryImage: function(storyContent) {
    const that = this;
    
    // 设置生成状态
    this.setData({
      isGeneratingImage: true,
      imageError: ''
    });
    
    // 从故事内容中提取关键信息作为图像提示
    const imagePrompt = this.extractImagePrompt(storyContent);
    
    console.log('开始生成故事插图，提示词:', imagePrompt);
    
    // 调用图像生成接口
    wx.request({
      url: `${this.data.serverUrl}/pic/1`,
      method: 'POST',
      data: {
        text: imagePrompt,
        key: this.data.accessKey
      },
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey
      },
      timeout: 60000, // 图像生成可能需要较长时间
      success: function(res) {
        console.log('插图生成响应:', res);
        if (res.statusCode === 200 && res.data && res.data.url) {
          that.setData({
            storyImageUrl: res.data.url,
            isGeneratingImage: false
          });
          console.log('故事插图生成成功:', res.data.url);
        } else {
          that.setData({
            isGeneratingImage: false,
            imageError: '插图生成失败，请重试'
          });
          console.error('插图生成失败:', res);
        }
      },
      fail: function(err) {
        console.error('插图生成请求失败:', err);
        that.setData({
          isGeneratingImage: false,
          imageError: '网络错误，插图生成失败'
        });
      }
    });
  },
  
  // 新增：从故事内容提取图像提示词
  extractImagePrompt: function(storyContent) {
    const venue = this.data.specificVenue;
    const age = this.data.kidsInfo[0].age;
    
    // 构建基础提示词
    let prompt = `为${age}岁儿童研学活动创作插图，场景：${venue}`;
    
    // 从故事内容中提取关键词
    const keywords = [];
    
    // 检测场所相关关键词
    if (storyContent.includes('古代') || storyContent.includes('历史')) {
      keywords.push('古代历史场景');
    }
    if (storyContent.includes('皇宫') || storyContent.includes('宫殿')) {
      keywords.push('宫殿建筑');
    }
    if (storyContent.includes('博物馆') || storyContent.includes('展品')) {
      keywords.push('博物馆展览');
    }
    if (storyContent.includes('科技') || storyContent.includes('实验')) {
      keywords.push('科技展示');
    }
    if (storyContent.includes('自然') || storyContent.includes('动物')) {
      keywords.push('自然动物');
    }
    
    // 添加儿童友好的风格描述
    keywords.push('卡通风格', '明亮色彩', '儿童友好');
    
    if (keywords.length > 0) {
      prompt += '，包含：' + keywords.join('、');
    }
    
    // 限制长度
    if (prompt.length > 150) {
      prompt = prompt.substring(0, 150);
    }
    
    return prompt;
  },
  
  // 新增：重新生成插图
  regenerateImage: function() {
    if (this.data.guideStory) {
      this.generateStoryImageAsync(this.data.guideStory);
    } else {
      wx.showToast({
        title: '请先生成导读故事',
        icon: 'none'
      });
    }
  },
  
  // 新增：预览插图
  previewImage: function(e) {
    const imageUrl = e.currentTarget.dataset.url;
    if (imageUrl) {
      wx.previewImage({
        urls: [imageUrl],
        current: imageUrl
      });
    }
  },
  
  // 新增：触发兴趣选择
  triggerInterestSelection: function() {
    // 【关键修复】从对话中提取基本信息并设置到data中
    const messages = this.data.chatMessages;
    const conversationText = messages.map(msg => msg.content).join(' ');
    
    // 智能提取并设置基本信息
    const extractedInfo = this.extractInfoWithDefaults(conversationText);
    
    console.log('🔧 AI4触发时提取的信息:', extractedInfo);
    
    // 重要：将提取的信息设置到data中，供AI1使用
    this.setData({
      kidsInfo: extractedInfo.kidsInfo,
      venueType: extractedInfo.venueType,
      specificVenue: extractedInfo.specificVenue,
      duration: extractedInfo.duration
    });
    
    // 添加过渡消息
    const transitionMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `太好了！基本信息已经收集完成：\n\n👶 孩子信息：${extractedInfo.kidsInfo[0].age}岁${extractedInfo.kidsInfo[0].gender}孩\n📍 研学场所：${extractedInfo.specificVenue}\n⏰ 研学时长：${extractedInfo.duration}\n\n接下来，让我了解一下您希望通过这次研学重点培养孩子哪些方面的兴趣。这将帮助我为您制定更精准的研学方案。`
    };
    
    const newMessages = [...this.data.chatMessages, transitionMessage];
    this.setData({
      chatMessages: newMessages,
      showInterestSelection: true,
      currentInterestStep: 'category',
      collectionPhase: 'interest'
    });
  },
  
  // 新增：选择兴趣大类
  selectInterestCategory: function(e) {
    const categoryId = e.currentTarget.dataset.categoryId;
    const selectedCategories = [...this.data.selectedInterestCategories];
    
    const index = selectedCategories.indexOf(categoryId);
    if (index > -1) {
      selectedCategories.splice(index, 1);
    } else {
      selectedCategories.push(categoryId);
    }
    
    this.setData({
      selectedInterestCategories: selectedCategories
    });
  },
  
  // 新增：确认大类选择，进入细分选择
  confirmCategorySelection: function() {
    // 检查禁用状态，防止重复点击
    if (this.data.selectedInterestCategories.length === 0) {
      wx.showToast({
        title: '请至少选择一个兴趣方向',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      currentInterestStep: 'subcategory'
    });
  },
  
  // 新增：选择兴趣细分类别
  selectSubcategory: function(e) {
    const subcategoryId = e.currentTarget.dataset.subcategoryId;
    const selectedSubcategories = [...this.data.selectedSubcategories];
    
    const index = selectedSubcategories.indexOf(subcategoryId);
    if (index > -1) {
      selectedSubcategories.splice(index, 1);
    } else {
      selectedSubcategories.push(subcategoryId);
    }
    
    this.setData({
      selectedSubcategories: selectedSubcategories
    });
  },
  
  // 新增：确认细分选择，完成兴趣选择
  confirmSubcategorySelection: function() {
    // 检查禁用状态，防止重复点击
    if (this.data.selectedSubcategories.length === 0) {
      wx.showToast({
        title: '请至少选择一个具体兴趣',
        icon: 'none'
      });
      return;
    }
    
    // 生成兴趣总结
    const selectedCategoryNames = this.data.selectedInterestCategories.map(id => {
      const category = this.data.interestCategories.find(cat => cat.id === id);
      return category ? category.name : '';
    }).filter(Boolean);
    
    const selectedSubcategoryNames = this.data.selectedSubcategories.map(id => {
      for (let category of this.data.interestCategories) {
        const subcategory = category.subcategories.find(sub => sub.id === id);
        if (subcategory) return subcategory.name;
      }
      return '';
    }).filter(Boolean);
    
    const summaryMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `兴趣选择完成！✨\n\n您希望重点培养孩子在以下方面的兴趣：\n\n🎯 主要方向：${selectedCategoryNames.join('、')}\n\n📋 具体兴趣：${selectedSubcategoryNames.join('、')}\n\n现在我将基于这些信息为您生成个性化的研学建议...`
    };
    
    const newMessages = [...this.data.chatMessages, summaryMessage];
      this.setData({
      chatMessages: newMessages,
      showInterestSelection: false,
      currentInterestStep: 'complete',
      collectionPhase: 'complete',
      isLoadingSuggestions: true
    });
    
    // 延迟生成建议
    setTimeout(() => {
      this.generateEnhancedSuggestion();
    }, 2000);
  },
  
  // 新增：返回大类选择
  backToCategorySelection: function() {
    this.setData({
      currentInterestStep: 'category',
      selectedSubcategories: []
    });
  },
  
  // 新增：跳过兴趣选择
  skipInterestSelection: function() {
    // 【关键修复】确保跳过时也提取基本信息
    const messages = this.data.chatMessages;
    const conversationText = messages.map(msg => msg.content).join(' ');
    
    // 智能提取并设置基本信息
    const extractedInfo = this.extractInfoWithDefaults(conversationText);
    
    console.log('🔧 跳过兴趣选择时提取的信息:', extractedInfo);
    
    // 重要：将提取的信息设置到data中，供AI1使用
    this.setData({
      kidsInfo: extractedInfo.kidsInfo,
      venueType: extractedInfo.venueType,
      specificVenue: extractedInfo.specificVenue,
      duration: extractedInfo.duration
    });
    
    const skipMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `好的，我将基于基本信息为您生成通用的研学建议：\n\n👶 孩子信息：${extractedInfo.kidsInfo[0].age}岁${extractedInfo.kidsInfo[0].gender}孩\n📍 研学场所：${extractedInfo.specificVenue}\n⏰ 研学时长：${extractedInfo.duration}`
    };
    
    const newMessages = [...this.data.chatMessages, skipMessage];
    this.setData({
      chatMessages: newMessages,
      showInterestSelection: false,
      collectionPhase: 'complete',
      isLoadingSuggestions: true
    });
    
    setTimeout(() => {
      this.generateSuggestion();
    }, 1000);
  },
  
  // 新增：增强版建议生成（考虑兴趣选择）
  generateEnhancedSuggestion: function() {
    const that = this;
    
    // 构建增强版AI1的提示词
    const kidsInfo = this.data.kidsInfo[0];
    
    // 获取选择的兴趣信息
    const selectedCategoryInfo = this.data.selectedInterestCategories.map(id => {
      const category = this.data.interestCategories.find(cat => cat.id === id);
      return category ? `${category.icon} ${category.name}` : '';
    }).filter(Boolean);
    
    const selectedSubcategoryInfo = this.data.selectedSubcategories.map(id => {
      for (let category of this.data.interestCategories) {
        const subcategory = category.subcategories.find(sub => sub.id === id);
        if (subcategory) return `${subcategory.name}：${subcategory.description}`;
      }
      return '';
    }).filter(Boolean);
    
    const prompt = `请为以下个性化研学需求生成3-4个精准的分析建议：

基本信息：
- 孩子年龄：${kidsInfo.age}岁
- 性别：${kidsInfo.gender}
- 研学场所：${this.data.specificVenue}
- 研学时长：${this.data.duration}

兴趣培养重点：
主要方向：${selectedCategoryInfo.join('、')}
具体兴趣：
${selectedSubcategoryInfo.map(info => `• ${info}`).join('\n')}

请生成JSON格式的建议列表，每个建议要：
1. 紧密结合用户选择的兴趣方向
2. 针对${kidsInfo.age}岁孩子的认知特点
3. 充分利用${this.data.specificVenue}的特色资源
4. 体现所选兴趣类别的核心要素

返回格式：
{
  "suggestions": [
    {
      "title": "建议标题",
      "description": "详细描述，重点体现兴趣培养",
      "ageRange": "年龄范围",
      "learningGoals": "具体学习目标",
      "interestFocus": "主要培养的兴趣方向",
      "activities": "推荐的具体活动"
    }
  ]
}

请确保建议内容与用户选择的兴趣高度匹配，具有很强的针对性和实用性。`;

    // 调用AI1接口
    wx.request({
      url: `${this.data.serverUrl}/1`,
      method: 'POST',
      data: {
        text: prompt,
        key: this.data.accessKey,
        stream: false
      },
      header: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.data.accessKey
      },
      success: function(res) {
        console.log('增强版AI1建议生成成功:', res);
        if (res.statusCode === 200) {
          try {
            let suggestions = [];
            let responseContent = '';
            
            // 处理响应数据
            if (res.data && res.data.content) {
              responseContent = res.data.content;
            } else if (res.data && typeof res.data === 'string') {
              responseContent = res.data;
            }
            
            // 尝试解析JSON
            try {
              const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsedData = JSON.parse(jsonMatch[0]);
                if (parsedData.suggestions && Array.isArray(parsedData.suggestions)) {
                  suggestions = parsedData.suggestions.map((item, index) => ({
                    id: index + 1,
                    title: item.title || `建议${index + 1}`,
                    description: item.description || '暂无描述',
                    ageRange: item.ageRange || `${kidsInfo.age}岁适合`,
                    learningGoals: item.learningGoals || '提升综合能力',
                    interestFocus: item.interestFocus || '综合发展',
                    activities: item.activities || '多样化活动',
                    isSelected: false
                  }));
                }
              }
            } catch (parseError) {
              console.log('JSON解析失败，使用文本解析:', parseError);
              suggestions = that.parseEnhancedTextSuggestions(responseContent, kidsInfo.age);
            }
            
            // 如果仍然没有建议，使用增强版默认建议
            if (suggestions.length === 0) {
              suggestions = that.getEnhancedDefaultSuggestions(kidsInfo.age);
            }
            
          that.setData({
              suggestions: suggestions,
              isLoadingSuggestions: false
            });
            
          } catch (error) {
            console.error('处理增强建议数据失败:', error);
        that.setData({
              suggestions: that.getEnhancedDefaultSuggestions(kidsInfo.age),
              isLoadingSuggestions: false
            });
          }
        } else {
          that.handleSuggestionError('增强版AI1服务返回错误');
        }
      },
      fail: function(err) {
        console.error('增强版AI1建议生成失败:', err);
        that.handleSuggestionError('网络请求失败');
      }
    });
  },
  
  // 新增：解析增强版文本建议
  parseEnhancedTextSuggestions: function(text, age) {
    const suggestions = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSuggestion = null;
    for (let line of lines) {
      line = line.trim();
      
      if (/^\d+[\.、]/.test(line) || /^[一二三四五六七八九十][、.]/.test(line)) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = {
          id: suggestions.length + 1,
          title: line.replace(/^\d+[\.、]/, '').replace(/^[一二三四五六七八九十][、.]/, '').trim(),
          description: '',
          ageRange: `${age}岁适合`,
          learningGoals: '兴趣培养和能力提升',
          interestFocus: '个性化发展',
          activities: '针对性活动',
          isSelected: false
        };
      } else if (currentSuggestion && line.length > 10) {
        if (!currentSuggestion.description) {
          currentSuggestion.description = line;
        } else {
          currentSuggestion.description += ' ' + line;
        }
      }
    }
    
    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }
    
    return suggestions.slice(0, 4);
  },
  
  // 新增：获取增强版默认建议
  getEnhancedDefaultSuggestions: function(age) {
    const selectedCategories = this.data.selectedInterestCategories;
    const venue = this.data.specificVenue;
    
    const baseSuggestions = [
      {
        id: 1,
        title: "个性化探索体验",
        description: `基于您选择的兴趣方向，在${venue}进行深度探索`,
        ageRange: `${age}岁适合`,
        learningGoals: "培养专项兴趣和探索精神",
        interestFocus: "个性化发展",
        activities: "定制化参观和互动体验",
        isSelected: false
      },
      {
        id: 2,
        title: "兴趣导向学习",
        description: "结合孩子兴趣特点，设计针对性学习活动",
        ageRange: `${age}岁适合`,
        learningGoals: "提升学习兴趣和主动性",
        interestFocus: "兴趣驱动",
        activities: "兴趣主题探究和实践",
        isSelected: false
      },
      {
        id: 3,
        title: "综合能力培养",
        description: "在兴趣基础上全面提升各项能力",
        ageRange: `${age}岁适合`,
        learningGoals: "综合素质提升",
        interestFocus: "全面发展",
        activities: "多元化能力训练",
        isSelected: false
      }
    ];
    
    return baseSuggestions;
  },
}); 