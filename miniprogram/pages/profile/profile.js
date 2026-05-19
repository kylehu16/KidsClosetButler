const cloud = require('../../utils/cloud')

Page({
  data: {
    children: [],
    userInfo: null,
    hasUserInfo: false
  },
  
  onLoad() {
    this.checkUserInfo()
    this.loadChildren()
  },
  
  onShow() {
    this.loadChildren()
  },
  
  // 检查并获取用户信息
  checkUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo, hasUserInfo: true })
    }
  },
  
  // 根据出生日期计算年龄
  calcAge(birthDate) {
    if (!birthDate) return ''
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? String(age) : ''
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const userInfo = this.data.userInfo || {}
    userInfo.avatarUrl = avatarUrl
    this.saveUserInfo(userInfo)
  },

  // 输入昵称
  onInputNickname(e) {
    const nickName = e.detail.value
    if (!nickName) return
    
    const userInfo = this.data.userInfo || {}
    userInfo.nickName = nickName
    this.saveUserInfo(userInfo)
  },

  // 保存用户信息
  saveUserInfo(userInfo) {
    userInfo.openid = wx.getStorageSync('openid') || this.data.userInfo?.openid
    wx.setStorageSync('userInfo', userInfo)
    this.setData({ userInfo, hasUserInfo: true })
    wx.showToast({ title: '保存成功', icon: 'success' })
  },
  
  async loadChildren() {
    try {
      const result = await cloud.children.get()
      const children = (result || []).map(child => {
        child.age = child.birthDate ? this.calcAge(child.birthDate) : ''
        return child
      })
      this.setData({ children })
    } catch (err) {
      console.error('获取宝贝列表失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    }
  },
  
  goToAddChild() {
    wx.navigateTo({ url: '/pages/child-edit/child-edit' })
  },
  
  goToEditChild(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/child-edit/child-edit?id=${id}` })
  },
  
  async deleteChild(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个宝贝吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cloud.children.delete(id)
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadChildren()
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
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