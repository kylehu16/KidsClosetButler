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
    searchKeyword: '',
    totalCount: 0,
    categoryCount: 5,
    weekCount: 0,
    clothes: [],
    displayClothes: [],    // 当前页展示的衣物
    filteredClothes: [],   // 筛选后的全部衣物（搜索+分类）
    currentPage: 1,
    pageSize: 6,
    hasMore: false,
    // 季节映射
    seasonMap: {
      'all': '四季',
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    },
    // 穿这件弹窗相关数据
    children: [],
    showWearModal: false,
    wearSelectedChildId: '',
    wearDate: '',
    wearClothesId: ''
  },
  
  onLoad() {
    this.loadData()
    this.loadChildren()
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
        searchKeyword: '',
        currentPage: 1,
        selectedCategory: 'all'  // 重置分类为全部
      }, () => {
        this.applyFilterAndPaginate()
        this.loadImageUrls(processedClothes)
      })

      this.setData({
        totalCount: processedClothes.length,
        weekCount: weekClothes.size
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 获取图片临时URL（解决 cloud:// 协议图片不显示的问题）
  async loadImageUrls(clothesList) {
    try {
      // 筛选出有图片且是云文件ID的衣物
      const fileIdMap = {}  // { fileID: index }
      const fileIds = []
      
      clothesList.forEach((item, index) => {
        if (item.image && item.image.startsWith('cloud://')) {
          fileIds.push(item.image)
          fileIdMap[item.image] = index
        }
      })
      
      if (fileIds.length === 0) return
      
      // 批量获取临时URL（每次最多100个）
      const result = await wx.cloud.getTempFileURL({
        fileList: fileIds
      })
      
      // 更新图片URL
      const updatedClothes = this.data.clothes.map(item => ({ ...item }))
      result.fileList.forEach(file => {
        if (file.status === 'ok' && file.tempFileURL) {
          const index = fileIdMap[file.fileID]
          if (index !== undefined) {
            updatedClothes[index].image = file.tempFileURL
          }
        }
      })
      
      // 更新数据
      this.setData({
        clothes: updatedClothes,
        filteredClothes: this.data.selectedCategory === 'all' 
          ? updatedClothes 
          : updatedClothes.filter(c => c.category === this.data.selectedCategory)
      })
    } catch (err) {
      console.error('获取图片临时URL失败:', err)
    }
  },
  
  selectCategory(e) {
    const category = e.currentTarget.dataset.id
    this.setData({ 
      selectedCategory: category,
      currentPage: 1
    })
    this.applyFilterAndPaginate()
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value,
      currentPage: 1
    })
    this.applyFilterAndPaginate()
  },

  // 清除搜索
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      currentPage: 1
    })
    this.applyFilterAndPaginate()
  },

  // 筛选 + 分页（核心方法）
  applyFilterAndPaginate() {
    const { clothes, selectedCategory, searchKeyword, pageSize } = this.data
    let filtered = clothes

    // 按分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory)
    }

    // 按名称搜索（模糊匹配）
    if (searchKeyword && searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      filtered = filtered.filter(c => 
        c.name && c.name.toLowerCase().includes(keyword)
      )
    }

    // 分页
    const total = filtered.length
    const currentPage = this.data.currentPage
    const displayCount = currentPage * pageSize
    const displayClothes = filtered.slice(0, displayCount)
    const hasMore = displayCount < total

    this.setData({
      filteredClothes: filtered,
      displayClothes: displayClothes,
      hasMore: hasMore
    })
  },

  // 加载更多
  loadMore() {
    const { currentPage, pageSize, filteredClothes } = this.data
    const nextPage = currentPage + 1
    const displayCount = nextPage * pageSize
    const displayClothes = filteredClothes.slice(0, displayCount)
    const hasMore = displayCount < filteredClothes.length

    this.setData({
      currentPage: nextPage,
      displayClothes: displayClothes,
      hasMore: hasMore
    })
  },
  
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/clothes-detail/clothes-detail?id=${id}`
    })
  },

  goToAdd() {
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
  },

  // 加载儿童列表
  async loadChildren() {
    try {
      const children = await cloud.children.get()
      const processedChildren = (children || []).map((child, index) => {
        const avatar = index === 0 ? '👧' : '👦'
        return {
          ...child,
          id: child._id,
          avatar
        }
      })
      
      this.setData({ 
        children: processedChildren,
        wearSelectedChildId: processedChildren.length > 0 ? processedChildren[0].id : ''
      })
    } catch (err) {
      console.error('加载儿童列表失败:', err)
      this.setData({ children: [] })
    }
  },

  // 显示穿这件弹窗
  showWearModal(e) {
    const clothesId = e.currentTarget.dataset.id
    const today = new Date().toISOString().split('T')[0]
    
    // 显示弹窗，设置基本信息
    this.setData({
      showWearModal: true,
      wearClothesId: clothesId,
      wearDate: today
    })
  },

  // 隐藏穿这件弹窗
  hideWearModal() {
    this.setData({
      showWearModal: false,
      wearClothesId: '',
      wearDate: '',
      wearSelectedChildId: this.data.children.length > 0 ? this.data.children[0].id : ''
    })
  },

  // 选择穿这件记录的儿童
  selectWearChild(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ wearSelectedChildId: id })
  },

  // 穿这件日期选择变化
  onWearDateChange(e) {
    this.setData({ wearDate: e.detail.value })
  },

  // 确认记录穿这件
  async confirmWear() {
    const { wearClothesId, wearSelectedChildId, wearDate } = this.data
    
    if (!wearSelectedChildId) {
      wx.showToast({ title: '请选择儿童', icon: 'none' })
      return
    }
    
    if (!wearDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    
    try {
      // 记录穿衣日志（单件衣物，不包含outfitId）
      await cloud.wearLogs.add({
        childId: wearSelectedChildId,
        date: wearDate,
        items: [wearClothesId]
      })
      
      // 更新衣物的穿着次数
      await cloud.clothes.updateWearCount(wearClothesId)
      
      wx.showToast({ title: '记录成功', icon: 'success' })
      this.hideWearModal()
    } catch (err) {
      console.error('记录穿这件失败:', err)
      wx.showToast({ title: err.message || '记录失败', icon: 'none' })
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  }
})