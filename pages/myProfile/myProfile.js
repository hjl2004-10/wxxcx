Page({
  data: {
    userInfo: {
      name: '小明',
      avatar: '/images/avatar.png',
      points: 120
    }
  },

  // 添加导航到各个设置项的方法
  navigateToSetting: function(e) {
    const type = e.currentTarget.dataset.type;
    
    switch(type) {
      case 'account':
        // 账号信息页面
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
        break;
      case 'notification':
        // 通知设置页面
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
        break;
      case 'about':
        // 关于我们页面
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
        break;
      case 'help':
        // 帮助与反馈页面
        wx.navigateTo({
          url: '/pages/help/help'
        });
        break;
    }
  }
}); 