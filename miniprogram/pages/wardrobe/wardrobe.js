const cloud = require('../../utils/cloud')

Page({
  data: {
    categories: [
      { id: 'all', name: '全部' },
      { id: 'top', name: '上衣' },
      { id: 'pants', name: '裤子' },
      { id: 'skirt', name: '裙子' },
      { id: 'jacket', name: '外套' },
      { id: 'shoes', name: '鞋子' }
    ],
    selectedCategory: 'all',
    totalCount: 0,
    categoryCount: 5,
    weekCount: 0,
    filteredClothes: [],
    clothes: [],
    // 季节映射
    seasonMap: {
      'all': '四季',
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    }
  },
  
  onLoad() {
    this.loadData()
  },
  
  onShow() {
    this.loadData()
  },
  
  async loadData() {
    try {
      const clothes = await cloud.clothes.get()
      const outfits = await cloud.outfits.get()
      const seasonMap = this.data.seasonMap
      
      // 处理季节显示和尺码单位
      const processedClothes = (clothes || []).map(item => {
        const seasons = item.season || []
        let seasonText = '未知'
        if (seasons.includes('all')) {
          seasonText = '四季'
        } else if (seasons.length > 0) {
          seasonText = seasons.map(s => seasonMap[s] || s).join('')
        }
        // 使用存储的单位，兼容旧数据
        const sizeUnit = item.sizeUnit || (item.category === 'shoes' ? 'mm' : 'cm')
        return { ...item, seasonText, sizeUnit }
      })
      
      const weekClothes = new Set()
      outfits.forEach(o => {
        if (o.items) o.items.forEach(id => weekClothes.add(id))
      })
      
      this.setData({
        clothes: processedClothes,
        filteredClothes: processedClothes,
        totalCount: processedClothes.length,
        weekCount: weekClothes.size,
        selectedCategory: 'all'  // 重置分类为全部
      }, () => {
        // setData 完成后调用 filterByCategory
        this.filterByCategory()
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },
  
  selectCategory(e) {
    const category = e.currentTarget.dataset.id
    this.setData({ selectedCategory: category })
    this.filterByCategory()
  },
  
  filterByCategory() {
    const { clothes, selectedCategory } = this.data
    
    if (selectedCategory === 'all') {
      this.setData({ filteredClothes: clothes })
    } else {
      const filtered = clothes.filter(c => c.category === selectedCategory)
      this.setData({ filteredClothes: filtered })
    }
  },
  
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add/add?id=${id}`
    })
  },

  goToAdd() {
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const app = getApp()
    console.log('wardrobe onEdit, id:', id)
    app.globalData.editClothesId = id
    console.log('globalData.editClothesId set to:', app.globalData.editClothesId)
    wx.navigateTo({
      url: '/pages/add/add'
    })
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件衣物吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await cloud.clothes.delete(id)
            // 刷新列表
            this.loadData()
            wx.showToast({ title: '删除成功', icon: 'success' })
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})