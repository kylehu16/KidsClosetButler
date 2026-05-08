Page({
  data: {
    children: []
  },
  
  onLoad() {
    this.loadChildren()
  },
  
  onShow() {
    this.loadChildren()
  },
  
  loadChildren() {
    const children = wx.getStorageSync('children') || []
    this.setData({ children })
  },
  
  goToAddChild() {
    wx.navigateTo({ url: '/pages/child-edit/child-edit' })
  },
  
  goToEditChild(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/child-edit/child-edit?id=${id}` })
  },
  
  goToRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },
  
  goToSettings() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },
  
  goToHelp() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  },
  
  goToAbout() {
    wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})