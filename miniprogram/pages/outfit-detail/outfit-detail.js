Page({
  data: {
    outfit: {},
    displayTags: [],
    tagOptions: []
  },

  onLoad() {
    this.loadTagOptions()
    this.loadOutfit()
  },

  loadOutfit() {
    const outfitId = wx.getStorageSync('viewOutfitId')
    const outfits = wx.getStorageSync('outfits') || []
    const outfit = outfits.find(o => o.id == outfitId)
    
    if (outfit) {
      // 处理日期格式
      const date = new Date(outfit.date)
      const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
      
      this.setData({
        outfit: {
          ...outfit,
          date: dateStr
        }
      })
      
      // 更新标签显示
      this.updateTagsDisplay(outfit.tags)
    }
  },

  loadTagOptions() {
    // 预设标签
    const presetTags = [
      { id: 'casual', name: '休闲' },
      { id: 'formal', name: '正式' },
      { id: 'sports', name: '运动' },
      { id: 'daily', name: '日常' },
      { id: 'party', name: '聚会' },
      { id: 'basic', name: '基础款' },
      { id: 'versatile', name: '百搭' }
    ]
    
    // 加载自定义标签
    const customTags = wx.getStorageSync('customTags') || []
    const allTags = [...presetTags, ...customTags]
    
    this.setData({ tagOptions: allTags })
  },

  updateTagsDisplay(tagIds) {
    const { tagOptions } = this.data
    const displayTags = tagIds.map(id => {
      const tag = tagOptions.find(t => t.id === id)
      return tag ? tag.name : id
    })
    this.setData({ displayTags })
  },

  goBack() {
    wx.navigateBack()
  },

  editOutfit() {
    const outfitId = this.data.outfit.id
    wx.setStorageSync('editOutfitId', outfitId)
    wx.navigateBack({
      success: () => {
        // 在返回前设置编辑模式
        wx.setStorageSync('editOutfitId', outfitId)
      }
    })
    // 使用 reLaunch 确保重新加载页面
    wx.reLaunch({ url: '/pages/outfit/outfit' })
  },

  deleteOutfit() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这套穿搭吗？',
      success: (res) => {
        if (res.confirm) {
          const outfitId = this.data.outfit.id
          let outfits = wx.getStorageSync('outfits') || []
          outfits = outfits.filter(o => o.id !== outfitId)
          wx.setStorageSync('outfits', outfits)
          
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  }
})
