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
    clothes: []
  },
  
  onLoad() {
    this.loadData()
  },
  
  onShow() {
    this.loadData()
  },
  
  loadData() {
    let clothes = wx.getStorageSync('clothes') || []
    
    // 如果衣物为空，添加默认示例数据
    if (clothes.length === 0) {
      clothes = [
        { id: '1', name: '白色T恤', category: 'top', categoryText: '上衣', gender: 'boy', season: ['spring', 'summer'], size: '120', color: 'white', tags: ['casual', 'basic'], image: '', childId: '' },
        { id: '2', name: '蓝色牛仔裤', category: 'pants', categoryText: '裤子', gender: 'boy', season: ['spring', 'autumn'], size: '120', color: 'blue', tags: ['casual'], image: '', childId: '' },
        { id: '3', name: '粉色连衣裙', category: 'skirt', categoryText: '裙子', gender: 'girl', season: ['summer'], size: '120', color: 'pink', tags: ['party'], image: '', childId: '' },
        { id: '4', name: '运动鞋', category: 'shoes', categoryText: '鞋子', gender: 'unisex', season: ['spring', 'summer', 'autumn'], size: '120', color: 'white', tags: ['sports'], image: '', childId: '' },
        { id: '5', name: '牛仔外套', category: 'jacket', categoryText: '外套', gender: 'boy', season: ['spring', 'autumn'], size: '120', color: 'blue', tags: ['casual'], image: '', childId: '' }
      ]
      wx.setStorageSync('clothes', clothes)
    }
    
    const outfits = wx.getStorageSync('outfits') || []
    
    const weekClothes = new Set()
    outfits.forEach(o => {
      if (o.items) o.items.forEach(id => weekClothes.add(id))
    })
    
    this.setData({
      clothes,
      filteredClothes: clothes,
      totalCount: clothes.length,
      weekCount: weekClothes.size,
      selectedCategory: 'all'  // 重置分类为全部
    }, () => {
      // setData 完成后调用 filterByCategory
      this.filterByCategory()
    })
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
      url: `/pages/clothes-detail/clothes-detail?id=${id}`
    })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const app = getApp()
    console.log('wardrobe onEdit, id:', id)
    app.globalData.editClothesId = id
    console.log('globalData.editClothesId set to:', app.globalData.editClothesId)
    wx.switchTab({
      url: '/pages/add/add'
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件衣物吗？',
      success: (res) => {
        if (res.confirm) {
          const clothes = wx.getStorageSync('clothes') || []
          const filtered = clothes.filter(c => c.id !== id)
          wx.setStorageSync('clothes', filtered)
          
          // 刷新列表
          this.loadData()
          wx.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  }
})