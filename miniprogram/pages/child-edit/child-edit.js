Page({
  data: {
    isEdit: false,
    childId: '',
    childForm: {
      name: '',
      age: '',
      height: '',
      gender: 'boy'
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        isEdit: true,
        childId: options.id
      })
      this.loadChildData(options.id)
    }
  },

  loadChildData(id) {
    const children = wx.getStorageSync('children') || []
    const child = children.find(c => c.id == id)
    
    if (child) {
      // 去除身高数据中的cm单位
      let height = child.height || ''
      if (typeof height === 'string' && height.includes('cm')) {
        height = height.replace(/cm/gi, '').trim()
      }
      this.setData({
        childForm: {
          name: child.name || '',
          age: child.age || '',
          height: height,
          gender: child.gender || 'boy'
        }
      })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value
    // 身高只允许输入数字
    if (field === 'height') {
      value = value.replace(/[^\d]/g, '')
    }
    // 年龄只允许输入数字
    if (field === 'age') {
      value = value.replace(/[^\d]/g, '')
    }
    this.setData({ [`childForm.${field}`]: value })
  },

  selectGender(e) {
    this.setData({ 'childForm.gender': e.currentTarget.dataset.gender })
  },

  goBack() {
    wx.navigateBack()
  },

  saveChild() {
    const { childForm, isEdit, childId } = this.data
    
    if (!childForm.name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    
    let children = wx.getStorageSync('children') || []
    
    if (isEdit) {
      const index = children.findIndex(c => c.id == childId)
      if (index > -1) {
        children[index] = { ...children[index], ...childForm }
      }
    } else {
      children.push({
        id: Date.now(),
        ...childForm,
        createTime: new Date().toISOString()
      })
    }
    
    wx.setStorageSync('children', children)
    wx.showToast({ title: '保存成功', icon: 'success' })
    
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  deleteChild() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个宝贝吗？',
      success: (res) => {
        if (res.confirm) {
          let children = wx.getStorageSync('children') || []
          children = children.filter(c => c.id != this.data.childId)
          wx.setStorageSync('children', children)
          
          wx.showToast({ title: '已删除', icon: 'success' })
          
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  }
})