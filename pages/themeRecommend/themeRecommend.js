var app = getApp();

Page({
  data: {
    recommended: [
      {
        id: 1,
        title: '文人墨韵',
        image: '/images/study_theme.png',
        date: '2025.5.1',
        selected: false
      },
      {
        id: 2,
        title: '科技创新',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 3,
        title: '历史探索',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 4,
        title: '艺术鉴赏',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 5,
        title: '自然探秘',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 6,
        title: '生物世界',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 7,
        title: '地理发现',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 8,
        title: '航天探索',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      },
      {
        id: 9,
        title: '文化体验',
        image: '/images/study_theme.png',
        date: '',
        selected: false
      }
    ]
  },
  onLoad: function (options) {
    // 尝试从全局数据获取API生成的主题
    try {
      const apiThemes = app.globalData.studyThemes;
      if (apiThemes && apiThemes.length > 0) {
        // 将API生成的主题转换为页面所需格式
        const formattedThemes = apiThemes.map((theme, index) => {
          return {
            id: index + 1,
            title: theme.title || `主题${index + 1}`,
            description: theme.description || '',
            date: theme.date || '',
            image: '/images/study_theme.png',
            selected: false
          };
        });
        
        // 只获取前9个主题
        const themeList = formattedThemes.slice(0, 9);
        this.setData({
          recommended: themeList
        });
      }
    } catch (e) {
      console.error('加载主题数据失败:', e);
    }
  },
  selectTheme: function(e) {
    const id = e.currentTarget.dataset.id;
    let recommended = this.data.recommended;
    recommended.forEach(item => {
      if (item.id === id) {
        item.selected = !item.selected;
      }
    });
    
    this.setData({
      recommended: recommended
    });
  },
  generateStory: function() {
    // 跳转到研学前导读故事页面
    wx.navigateTo({
      url: '/pages/preStudyStory/preStudyStory'
    });
  },
  goToStudyBefore: function() {
    // 跳转到研学前基础信息页面
    wx.redirectTo({
      url: '/pages/basicInfo/basicInfo'
    });
  },
  goToStudyDuring: function() {
    // 跳转到研学中页面
    wx.redirectTo({
      url: '/pages/studyPlan/studyPlan'
    });
  },
  goToStudyAfter: function() {
    // 跳转到研学后页面
    wx.redirectTo({
      url: '/pages/studyProcess/studyProcess'
    });
  },
  goBack: function() {
    wx.navigateBack();
  }
}); 