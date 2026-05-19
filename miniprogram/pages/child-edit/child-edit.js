const cloud = require('../../utils/cloud')

Page({
  data: {
    isEdit: false,
    childId: '',
    childForm: {
      name: '',
      birthDate: '',
      height: '',
      footLength: '',
      gender: 1  // 1=男, 0=女
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

  async loadChildData(id) {
    try {
      const child = await cloud.children.getById(id)
      if (child) {
        // 身高：兼容 number 类型 和 旧数据带'cm'的字符串
        let height = child.height
        if (height === undefined || height === null) {
          height = ''
        } else if (typeof height === 'string') {
          height = height.replace(/cm/gi, '').trim()
        } else if (typeof height === 'number') {
          height = String(height)
        }
        // 脚长：兼容 number 类型 和 旧数据带'mm'的字符串
        let footLength = child.footLength
        if (footLength === undefined || footLength === null) {
          footLength = ''
        } else if (typeof footLength === 'string') {
          footLength = footLength.replace(/mm/gi, '').trim()
        } else if (typeof footLength === 'number') {
          footLength = String(footLength)
        }
        this.setData({
          childForm: {
            name: child.name || '',
            birthDate: child.birthDate || '',
            height: height,
            footLength: footLength,
            gender: child.gender || 1  // 1=男, 0=女
          }
        })
      }
    } catch (err) {
      console.error('获取宝贝数据失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    let value = e.detail.value
    // 身高只允许输入数字
    if (field === 'height') {
      value = value.replace(/[^\d]/g, '')
    }
    // 脚长只允许输入数字
    if (field === 'footLength') {
      value = value.replace(/[^\d]/g, '')
    }
    this.setData({ [`childForm.${field}`]: value })
  },

  onBirthDateChange(e) {
    this.setData({ 'childForm.birthDate': e.detail.value })
  },

  selectGender(e) {
    this.setData({ 'childForm.gender': e.currentTarget.dataset.gender })
  },

  goBack() {
    wx.navigateBack()
  },

  async saveChild() {
    const { childForm, isEdit, childId } = this.data
    
    if (!childForm.name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!childForm.birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }
    
    // 转换为 number 类型保存，空值存 null
    const formData = { ...childForm }
    formData.height = formData.height ? Number(formData.height) : null
    formData.footLength = formData.footLength ? Number(formData.footLength) : null
    
    try {
      if (isEdit) {
        await cloud.children.update(childId, formData)
      } else {
        await cloud.children.add(formData)
      }
      wx.showToast({ title: '保存成功', icon: 'success' })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  },

  async deleteChild() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个宝贝吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cloud.children.delete(this.data.childId)
            wx.showToast({ title: '已删除', icon: 'success' })
            
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})