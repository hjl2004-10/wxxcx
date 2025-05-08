// index.js
var app = getApp()

Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName')
  },
  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '展示用户信息',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  goToBasicInfo: function() {
    wx.navigateTo({
      url: '/pages/studyProcess/studyProcess?step=1'
    })
  },
  goToThemeRecommend: function() {
    wx.switchTab({
      url: '/pages/studyProcess/studyProcess'
    })
  },
  goToMyProfile: function() {
    wx.navigateTo({
      url: '/pages/myProfile/myProfile'
    })
  }
}) 