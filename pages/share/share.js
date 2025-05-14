// pages/share/share.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    username: '小研学家',
    shareTime: '2023-05-20',
    shareText: '今天参观了中国美术馆的"文人墨韵"展览，收获满满！我最喜欢的是那幅《墨竹图》，竹子的姿态表现得非常生动...',
    shareImages: ['/images/share_img1.jpg', '/images/share_img2.jpg'],
    likeCount: 23,
    commentCount: 5,
    studyResults: [] // 研学成果列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadStudyResults();
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadStudyResults(); // 每次显示页面时刷新数据
  },

  /**
   * 加载研学成果数据
   */
  loadStudyResults: function () {
    try {
      // 从本地存储中读取研学成果
      const studyResultsStorage = wx.getStorageSync('study_results');
      let studyResults = [];
      
      if (studyResultsStorage) {
        studyResults = JSON.parse(studyResultsStorage);
        
        // 按时间倒序排列
        studyResults.sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });
      }
      
      this.setData({
        studyResults: studyResults
      });
      
      console.log('已加载研学成果数量：', studyResults.length);
    } catch (error) {
      console.error('加载研学成果失败：', error);
      wx.showToast({
        title: '加载研学成果失败',
        icon: 'none'
      });
    }
  },

  /**
   * 分享给好友
   */
  shareToFriends: function (e) {
    const id = e.currentTarget.dataset.id;
    console.log('分享研学成果：', id);
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  /**
   * 删除研学成果
   */
  deleteStudy: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条研学成果吗？',
      success (res) {
        if (res.confirm) {
          try {
            // 从本地存储中读取研学成果
            const studyResultsStorage = wx.getStorageSync('study_results');
            
            if (studyResultsStorage) {
              let studyResults = JSON.parse(studyResultsStorage);
              
              // 过滤掉要删除的成果
              studyResults = studyResults.filter(item => item.id !== id);
              
              // 更新本地存储
              wx.setStorageSync('study_results', JSON.stringify(studyResults));
              
              // 更新页面数据
              that.setData({
                studyResults: studyResults
              });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            }
          } catch (error) {
            console.error('删除研学成果失败：', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '我的研学成果',
      path: '/pages/share/share',
      imageUrl: '/images/study_theme.png'
    };
  },
  
  /**
   * 分享到朋友圈
   */
  onShareTimeline: function () {
    return {
      title: '我的研学成果',
      imageUrl: '/images/study_theme.png'
    };
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