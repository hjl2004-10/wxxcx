Page({
  data: {
    userInfo: {
      name: '小明',
      avatar: '/images/avatar.png',
      points: 120
    },
    myStudyPlans: [
      {
        id: 1,
        title: '文人墨韵',
        date: '2025.5.1',
        image: '/images/study_theme.png'
      },
      {
        id: 2,
        title: '科技创新',
        date: '2025.6.15',
        image: '/images/study_theme.png'
      }
    ]
  },
  onLoad: function (options) {
    // 页面加载时执行
  },
  viewStudyPlan: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/studyPlan/studyPlan?id=' + id
    });
  }
}); 