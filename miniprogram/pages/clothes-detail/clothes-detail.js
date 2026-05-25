const cloud = require('../../utils/cloud')

Page({
  data: {
    clothesId: '',
    clothes: null,
    childName: '',
    // 颜色映射
    colorMap: {
      'red': '#EF4444',
      'orange': '#F97316',
      'yellow': '#EAB308',
      'green': '#22C55E',
      'blue': '#3B82F6',
      'purple': '#8B5CF6',
      'pink': '#EC4899',
      'black': '#1F2937',
      'white': '#F9FAFB',
      'gray': '#9CA3AF'
    },
    // 类别映射
    categoryMap: {
      'top': '上衣',
      'pants': '裤子',
      'skirt': '裙子',
      'jacket': '外套',
      'shoes': '鞋子'
    },
    // 季节映射
    seasonMap: {
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    },
    // 标签映射（英文→中文）
    tagMap: {}
  },

  // 格式化时间函数：将时间转换为 yyyy-mm-dd hh:mm 格式
  formatDateTime(dateTime) {
    if (!dateTime) return ''
    
    try {
      const date = new Date(dateTime)
      
      // 获取年月日时分
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      
      // 返回格式化后的字符串
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch (err) {
      console.error('格式化时间失败:', err)
      return dateTime
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ clothesId: options.id })
      this.loadClothesDetail(options.id)
    }
  },

  // 加载衣物详情
  async loadClothesDetail(id) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // 并行获取衣物详情和标签数据
      const [clothes, tagsResult] = await Promise.all([
        cloud.clothes.getById(id),
        cloud.tags.get()
      ])
      const tagsData = tagsResult || {}
      
      if (!clothes) {
        wx.showToast({ title: '衣物不存在', icon: 'none' })
        setTimeout(() => { wx.navigateBack() }, 1500)
        return
      }

      // 创建标签映射（英文ID → 中文名称）
      const tagMap = {}
      const allTags = [...(tagsData.preset || []), ...(tagsData.custom || [])]
      allTags.forEach(tag => {
        tagMap[tag.id || tag._id] = tag.name
      })

      // 处理季节显示
      const seasonMap = this.data.seasonMap
      const seasons = clothes.season || []
      let seasonText = '未知'
      if (seasons.includes('all')) {
        seasonText = '四季'
      } else if (seasons.length > 0) {
        seasonText = seasons.map(s => seasonMap[s] || s).join('')
      }

      // 处理标签显示（转换为中文）
      const tagNames = (clothes.tags || []).map(tagId => tagMap[tagId] || tagId)

      // 处理尺码单位
      const sizeUnit = clothes.category === 'shoes' ? 'mm' : 'cm'

      // 格式化创建时间
      const createTimeFormatted = this.formatDateTime(clothes.createTime)

      this.setData({
        clothes: {
          ...clothes,
          seasonText,
          tagNames,
          sizeUnit,
          createTimeFormatted
        },
        tagMap
      })

    } catch (err) {
      console.error('加载衣物详情失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 点击修改按钮
  onEdit() {
    const app = getApp()
    console.log('clothes-detail onEdit, id:', this.data.clothesId)
    app.globalData.editClothesId = this.data.clothesId
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  // 点击删除按钮
  async onDelete() {
    const { clothesId, clothes } = this.data
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除"${clothes.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await cloud.clothes.delete(clothesId)
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (err) {
            wx.hideLoading()
            console.error('删除失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 预览图片
  previewImage() {
    const { clothes } = this.data
    if (clothes && clothes.image) {
      wx.previewImage({
        urls: [clothes.image],
        current: clothes.image
      })
    }
  },

  onShow() {
    // 从编辑页面返回时，重新加载数据
    if (this.data.clothesId) {
      this.loadClothesDetail(this.data.clothesId)
    }
  }
})
