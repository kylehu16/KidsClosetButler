App({
  globalData: {
    userInfo: null,
    editClothesId: null,
    preselectedClothes: null,
    preselectedChildIds: null,
    preselectedChildName: null
  },
  
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.0.0 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'kidsclosetbutler-d8efnq2d58ac58a',
        traceUser: true
      })
    }
  }
})