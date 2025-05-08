Page({
  data: {
    title: '研学计划详情',
    planTitle: '',
    venue: '',
    duration: '',
    steps: [],
    studyCards: [],
    tasksTitle: '趣味研学任务节:',
    tasks: [
      {
        id: 1,
        title: '神秘的"文人墨韵"展览入口',
        taskDesc: '找到展览入口，并在入口处的海报上找到"文人墨韵"四个字的出处',
        hint: '仔细观察海报上的文字和图案，看看是否有隐藏的线索',
        winCondition: '正确找到出处，并在笔记本上记录下来'
      },
      {
        id: 2,
        title: '寻找"四君子"',
        taskDesc: '在展览中找到四幅分别描绘"梅、兰、竹、菊"的文人画，并观察它们的特点。',
        observations: [
          '梅花的枝干和花朵的形态',
          '兰花的叶子和花朵的布局',
          '竹子的笔法和姿态',
          '菊花的花瓣和整体构图'
        ],
        hint: '注意每幅画的题跋（画家的题字），可能会有重要线索'
      }
    ],
    fourPlants: [
      { name: '梅', image: '/images/mei.png' },
      { name: '兰', image: '/images/lan.png' },
      { name: '竹', image: '/images/zhu.png' },
      { name: '菊', image: '/images/ju.png' }
    ]
  },
  onLoad: function(options) {
    // 从本地存储中获取研学计划详情
    try {
      const planDetails = wx.getStorageSync('studyPlanDetails');
      if (planDetails) {
        this.setData({
          planTitle: planDetails.title || '研学活动计划',
          venue: planDetails.venue || '',
          duration: planDetails.duration || '',
          steps: planDetails.steps || [],
          studyCards: planDetails.studyCards || []
        });
      } else {
        wx.showToast({
          title: '未找到研学计划数据',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('获取研学计划详情失败:', error);
      wx.showToast({
        title: '加载详情失败',
        icon: 'none'
      });
    }
  },
  goBack: function() {
    // 返回研学方案页面
    wx.navigateBack();
  },
  goToStudyBefore: function() {
    // 跳转到研学前基础信息页面
    wx.navigateTo({
      url: '/pages/basicInfo/basicInfo'
    });
  },
  goToStudyDuring: function() {
    // 跳转到研学中页面
    wx.navigateTo({
      url: '/pages/studyPlan/studyPlan'
    });
  },
  goToStudyAfter: function() {
    // 跳转到研学后页面
    wx.navigateTo({
      url: '/pages/studyProcess/studyProcess'
    });
  }
}); 