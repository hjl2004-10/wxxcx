// pages/share/share.js
Page({
  data: {
    username: '小研学家',
    shareTime: '2023-05-20',
    shareText: '今天参观了中国美术馆的"文人墨韵"展览，收获满满！我最喜欢的是那幅《墨竹图》，竹子的姿态表现得非常生动...',
    shareImages: ['/images/share_img1.jpg', '/images/share_img2.jpg'],
    likeCount: 23,
    commentCount: 5
  },
  onLoad: function(options) {
    // 页面加载时执行
  },
  likePost: function() {
    this.setData({
      likeCount: this.data.likeCount + 1
    });
    wx.showToast({
      title: '点赞成功',
      icon: 'success'
    });
  },
  commentPost: function() {
    wx.showToast({
      title: '评论功能开发中',
      icon: 'none'
    });
  },
  onShareAppMessage: function() {
    return {
      title: '我的研学成果分享',
      path: '/pages/share/share'
    };
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
  goBack: function() {
    wx.redirectTo({
      url: '/pages/studyProcess/studyProcess'
    });
  }
}); 