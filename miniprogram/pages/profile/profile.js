const cloud = require('../../utils/cloud')

Page({
  data: {
    children: [],
    userInfo: null,
    hasUserInfo: false,
    version: '1.0.0'
  },
  
  onLoad() {
    this.checkUserInfo()
    this.loadChildren()
    this.getVersion()
  },
  
  onShow() {
    this.loadChildren()
  },
  
  // 检查并获取用户信息
  async checkUserInfo() {
    try {
      // 优先从云端获取用户信息
      const result = await cloud.user.get()
      if (result) {
        const userInfo = {
          avatarUrl: result.avatarUrl || '',
          nickName: result.nickName || ''
        }
        wx.setStorageSync('userInfo', userInfo)
        this.setData({ userInfo, hasUserInfo: true })
        return
      }
    } catch (err) {
      console.log('云端获取用户信息失败，尝试从本地缓存读取', err)
    }
    
    // 云端无数据，从本地缓存读取（兼容旧版本）
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
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    
    // 显示加载提示
    wx.showLoading({ title: '上传中...' })
    
    try {
      // 上传头像到云存储
      const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl
      })
      
      // 获取云文件 ID
      const fileID = uploadResult.fileID
      
      // 更新用户信息
      const userInfo = this.data.userInfo || {}
      userInfo.avatarUrl = fileID
      this.saveUserInfo(userInfo)
      
      wx.hideLoading()
    } catch (err) {
      console.error('上传头像失败:', err)
      wx.hideLoading()
      
      // 如果上传失败，仍然使用临时文件路径（兼容处理）
      const userInfo = this.data.userInfo || {}
      userInfo.avatarUrl = avatarUrl
      this.saveUserInfo(userInfo)
    }
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
  async saveUserInfo(userInfo) {
    // 保存到本地缓存
    wx.setStorageSync('userInfo', userInfo)
    this.setData({ userInfo, hasUserInfo: true })
    
    // 保存到云端
    try {
      await cloud.user.update({
        avatarUrl: userInfo.avatarUrl || '',
        nickName: userInfo.nickName || ''
      })
      console.log('用户信息已保存到云端')
    } catch (err) {
      console.error('保存到云端失败:', err)
      // 云端保存失败不影响本地使用
    }
    
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

  goToTagManage() {
    wx.navigateTo({ url: '/pages/tag-manage/tag-manage' })
  },

  // 获取版本号
  getVersion() {
    try {
      const accountInfo = wx.getAccountInfoSync()
      const version = accountInfo.miniProgram.version || '1.0.0'
      const envVersion = accountInfo.miniProgram.envVersion
      
      // 根据环境添加后缀
      let versionText = `V${version}`
      if (envVersion === 'develop') {
        versionText += ' (开发版)'
      } else if (envVersion === 'trial') {
        versionText += ' (体验版)'
      }
      
      this.setData({ version: versionText })
    } catch (err) {
      console.error('获取版本号失败:', err)
      // 使用默认版本号
      this.setData({ version: 'V1.0.0' })
    }
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