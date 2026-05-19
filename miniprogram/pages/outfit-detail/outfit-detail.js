const cloud = require('../../utils/cloud')

Page({
  data: {
    outfitId: '',
    outfit: {},
    displayTags: [],
    allTags: [],       // 所有标签（预设+自定义）
    tagMap: {},        // 标签映射 { matchId: name }
    fromPage: 'saved',
    // 穿搭记录弹窗相关数据
    showWearModal: false,
    wearSelectedChildId: '',
    wearDate: '',
    children: []
  },

  onLoad(options) {
    const outfitId = options.outfitId || ''
    const fromPage = options.fromPage || 'saved'

    console.log('[outfit-detail] onLoad, outfitId:', outfitId, 'fromPage:', fromPage)

    this.setData({ outfitId, fromPage })

    if (!outfitId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }

    this.loadTags()
    this.loadOutfit()
  },

  async loadOutfit() {
    try {
      const outfitId = this.data.outfitId
      console.log('[outfit-detail] loadOutfit, outfitId:', outfitId)
      if (!outfitId) {
        wx.showToast({ title: '参数错误', icon: 'none' })
        return
      }

      const outfit = await cloud.outfits.getById(outfitId)
      if (outfit) {
        // 为每件衣物添加 sizeUnit 字段
        if (outfit.itemDetails && outfit.itemDetails.length > 0) {
          outfit.itemDetails = outfit.itemDetails.map(item => {
            if (!item.sizeUnit) {
              item.sizeUnit = item.category === 'shoes' ? 'mm' : 'cm'
            }
            return item
          })
        }
        this.setData({ outfit })
        this.updateTagsDisplay(outfit.tags)
      }
    } catch (err) {
      console.error('加载穿搭详情失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 加载所有标签（预设+自定义）
  async loadTags() {
    try {
      const result = await cloud.tags.get()
      const preset = (result.preset || []).map(tag => ({
        ...tag,
        id: tag.id || tag._id,
        type: 'preset',
        matchId: tag.id || tag._id
      }))
      const custom = (result.custom || []).map(tag => ({
        ...tag,
        type: 'custom',
        matchId: tag._id
      }))
      const allTags = [...preset, ...custom]
      
      // 构建 tagMap: { matchId: name }
      const tagMap = {}
      allTags.forEach(tag => {
        tagMap[tag.matchId] = tag.name
      })
      
      this.setData({ allTags, tagMap })
      
      // 如果已经加载了穿搭数据，更新标签显示
      if (this.data.outfit && this.data.outfit.tags) {
        this.updateTagsDisplay(this.data.outfit.tags)
      }
    } catch (err) {
      console.error('获取标签失败:', err)
      this.setData({ allTags: [], tagMap: {} })
    }
  },

  updateTagsDisplay(tagIds) {
    const { tagMap } = this.data
    const displayTags = (tagIds || []).map(id => {
      return tagMap[id] || id
    })
    this.setData({ displayTags })
  },

  goBack() {
    wx.navigateBack()
  },

  async editOutfit() {
    const outfitId = this.data.outfitId
    wx.navigateTo({
      url: `/pages/add-outfit/add-outfit?id=${outfitId}`
    })
  },

  async deleteOutfit() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这套穿搭吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const outfitId = this.data.outfitId
            await cloud.outfits.delete(outfitId)

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
  },

  // 显示穿这套弹窗
  async wearThisOutfit() {
    try {
      // 加载儿童列表
      const children = await cloud.children.get()
      const today = new Date().toISOString().split('T')[0]
      
      this.setData({
        children: children || [],
        showWearModal: true,
        wearOutfitId: this.data.outfitId,
        wearDate: today,
        wearSelectedChildId: children && children.length > 0 ? children[0]._id || children[0].id : ''
      })
    } catch (err) {
      console.error('加载儿童列表失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 隐藏穿搭记录弹窗
  hideWearModal() {
    this.setData({
      showWearModal: false,
      wearOutfitId: '',
      wearDate: '',
      wearSelectedChildId: ''
    })
  },

  // 选择穿搭记录的儿童
  selectWearChild(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ wearSelectedChildId: id })
  },

  // 日期选择变化
  onWearDateChange(e) {
    this.setData({ wearDate: e.detail.value })
  },

  // 确认记录穿搭
  async confirmWear() {
    const { wearOutfitId, wearSelectedChildId, wearDate } = this.data
    
    if (!wearSelectedChildId) {
      wx.showToast({ title: '请选择儿童', icon: 'none' })
      return
    }
    
    if (!wearDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    
    try {
      // 获取穿搭详情
      const outfit = await cloud.outfits.getById(wearOutfitId)
      if (!outfit) {
        wx.showToast({ title: '穿搭不存在', icon: 'none' })
        return
      }
      
      // 记录穿衣日志
      await cloud.wearLogs.add({
        childId: wearSelectedChildId,
        outfitId: wearOutfitId,
        date: wearDate,
        items: outfit.items || []
      })
      
      // 更新衣物的穿着次数
      if (outfit.items && outfit.items.length > 0) {
        for (const itemId of outfit.items) {
          await cloud.clothes.updateWearCount(itemId)
        }
      }
      
      wx.showToast({ title: '记录成功', icon: 'success' })
      this.hideWearModal()
      
      // 保存成功后返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('记录穿搭失败:', err)
      wx.showToast({ title: err.message || '记录失败', icon: 'none' })
    }
  },

  // 阻止冒泡
  stopPropagation() {
    // 阻止事件冒泡
  }
})
