Page({
  data: {
    // 帮助问题列表及答案，每个问题有问题文本和答案内容
    helpItems: [
      {
        title: "如何生成研学方案？",
        content: "1. 在主页点击\"开始创建\"按钮\n2. 选择目的地、孩子年龄等基本信息\n3. 输入您的需求偏好和兴趣点\n4. 点击\"生成方案\"并耐心等待\n5. 生成后可以查看完整方案内容并保存",
        isExpanded: false
      },
      {
        title: "等待时间为什么较长？",
        content: "由于系统需要整合大量数据并进行智能规划，生成一份完整的研学方案通常需要30秒到2分钟不等。请耐心等待，勿频繁刷新页面，以免影响生成进度。",
        isExpanded: false
      },
      {
        title: "如何收藏和分享研学方案？",
        content: "在研学方案详情页，点击右上角的\"收藏\"按钮可将方案添加到我的收藏中；点击\"分享\"按钮可以将方案分享给好友或分享到群聊中。",
        isExpanded: false
      },
      {
        title: "系统未来会有哪些新功能？",
        content: "我们正在开发以下功能：\n1. 建立多维度用户画像进行动态个性化推荐 \n2. 生成可交互的日程地图（集成腾讯地图SDK） \n3. 支持方案导出为PDF/日历格式 \n4. 社区模块进行AI化改造 UGC内容增强 加入用户评价和推荐系统 \n 5. AI Agent模型和提示词优化",
        isExpanded: false
      },
      {
        title: "遇到问题如何反馈？",
        content: "如您在使用过程中遇到任何问题，可以通过以下方式联系我们：\n1. 发送邮件至：support@example.com\n2. 添加客服微信：wxid_example\n3. 工作时间拨打：400-123-4567",
        isExpanded: false
      }
    ]
  },
  
  // 点击展开/收起面板
  togglePanel: function(e) {
    const index = e.currentTarget.dataset.index;
    const key = `helpItems[${index}].isExpanded`;
    this.setData({
      [key]: !this.data.helpItems[index].isExpanded
    });
  },
  
  // 拨打客服电话
  callService: function() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      success: function() {
        console.log("拨打电话成功");
      },
      fail: function() {
        console.log("拨打电话失败");
      }
    });
  }
}) 