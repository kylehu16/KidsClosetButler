const cloud = require('../../utils/cloud')

Page({
  data: {
    totalCount: 0,
    wornCount: 0,
    idleCount: 0,
    categoryStats: [],
    hotList: [],
    pagedHotList: [],
    coldList: [],
    pagedColdList: [],
    outfitHotList: [],
    pagedOutfitHotList: [],
    weekData: [],
    avgPerDay: 0,
    totalOutfits: 0,
    // 热门榜单分页
    currentPage: 1,
    pageSize: 5,
    totalPages: 0,
    // 沉睡榜单分页
    coldCurrentPage: 1,
    coldPageSize: 6,
    coldTotalPages: 0,
    // 热门穿搭分页
    outfitCurrentPage: 1,
    outfitPageSize: 5,
    outfitTotalPages: 0
  },
  
  onLoad() {
    this.loadStatistics()
  },
  
  onShow() {
    this.loadStatistics()
  },
  
  async loadStatistics() {
    try {
      const result = await cloud.statistics.get()
      
      const { total, worn, unused, categoryStats, hotOutfits, hotOutfitCombos, sleepyClothes, weekTrend, totalOutfits } = result
      
      // 处理热门榜单（单件衣物TOP10）
      const hotList = (hotOutfits || []).map(item => ({
        ...item,
        wearCount: item.wearCount || 0
      }))
      
      // 处理沉睡榜单（days 由云函数计算返回）
      const coldList = sleepyClothes || []

      // 处理热门穿搭组合TOP10
      const outfitHotList = (hotOutfitCombos || []).map(item => ({
        ...item,
        items: item.items || [],
        itemCount: (item.items || []).length
      }))
      
      // 处理本周趋势
      const weekData = (weekTrend || []).map(item => ({
        day: item.date,
        height: item.count * 20 // 按比例计算高度
      }))
      
      // 计算穿得最多的衣物次数
      const topClothesCount = hotList.length > 0 ? hotList[0].wearCount : 0
      
      const pageSize = 5
      const totalPages = Math.ceil(hotList.length / pageSize)
      const currentPage = 1
      
      // 获取当前页的数据
      const pagedHotList = hotList.slice(0, pageSize).map((item, index) => ({
        ...item,
        rankIndex: index + 1
      }))
      
      // 沉睡榜单分页（每页6个）
      const coldPageSize = 6
      const coldTotalPages = Math.ceil(coldList.length / coldPageSize)
      const coldCurrentPage = 1
      const pagedColdList = coldList.slice(0, coldPageSize)

      // 热门穿搭分页（每页5个）
      const outfitPageSize = 5
      const outfitTotalPages = Math.ceil(outfitHotList.length / outfitPageSize)
      const outfitCurrentPage = 1
      const pagedOutfitHotList = outfitHotList.slice(0, outfitPageSize).map((item, index) => ({
        ...item,
        rankIndex: index + 1
      }))
      
      this.setData({
        totalCount: total || 0,
        wornCount: worn || 0,
        idleCount: unused || 0,
        categoryStats: categoryStats || [],
        hotList,
        pagedHotList,
        coldList,
        pagedColdList,
        outfitHotList,
        pagedOutfitHotList,
        weekData,
        avgPerDay: weekData.length > 0 ? (weekData.reduce((sum, d) => sum + d.height, 0) / 7).toFixed(1) : 0,
        totalOutfits: totalOutfits || 0,
        topOutfitCount: topClothesCount,
        currentPage,
        pageSize,
        totalPages,
        coldCurrentPage,
        coldPageSize,
        coldTotalPages,
        outfitCurrentPage,
        outfitPageSize,
        outfitTotalPages
      })
    } catch (err) {
      console.error('获取统计数据失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    }
  },

  // 热门榜单 - 上一页
  prevPage() {
    const { hotList, currentPage, pageSize } = this.data
    if (currentPage <= 1) return
    
    const newPage = currentPage - 1
    const start = (newPage - 1) * pageSize
    const end = newPage * pageSize
    
    const pagedHotList = hotList.slice(start, end).map((item, index) => ({
      ...item,
      rankIndex: start + index + 1
    }))
    
    this.setData({
      currentPage: newPage,
      pagedHotList
    })
  },

  // 热门榜单 - 下一页
  nextPage() {
    const { hotList, currentPage, pageSize, totalPages } = this.data
    if (currentPage >= totalPages) return
    
    const newPage = currentPage + 1
    const start = (newPage - 1) * pageSize
    const end = newPage * pageSize
    
    const pagedHotList = hotList.slice(start, end).map((item, index) => ({
      ...item,
      rankIndex: start + index + 1
    }))
    
    this.setData({
      currentPage: newPage,
      pagedHotList
    })
  },

  // 沉睡榜单 - 上一页
  prevColdPage() {
    const { coldList, coldCurrentPage, coldPageSize } = this.data
    if (coldCurrentPage <= 1) return
    
    const newPage = coldCurrentPage - 1
    const start = (newPage - 1) * coldPageSize
    const end = newPage * coldPageSize
    
    const pagedColdList = coldList.slice(start, end)
    
    this.setData({
      coldCurrentPage: newPage,
      pagedColdList
    })
  },

  // 沉睡榜单 - 下一页
  nextColdPage() {
    const { coldList, coldCurrentPage, coldPageSize, coldTotalPages } = this.data
    if (coldCurrentPage >= coldTotalPages) return
    
    const newPage = coldCurrentPage + 1
    const start = (newPage - 1) * coldPageSize
    const end = newPage * coldPageSize
    
    const pagedColdList = coldList.slice(start, end)
    
    this.setData({
      coldCurrentPage: newPage,
      pagedColdList
    })
  },

  // 热门穿搭 - 上一页
  prevOutfitPage() {
    const { outfitHotList, outfitCurrentPage, outfitPageSize } = this.data
    if (outfitCurrentPage <= 1) return

    const newPage = outfitCurrentPage - 1
    const start = (newPage - 1) * outfitPageSize
    const end = newPage * outfitPageSize

    const pagedOutfitHotList = outfitHotList.slice(start, end).map((item, index) => ({
      ...item,
      rankIndex: start + index + 1
    }))

    this.setData({
      outfitCurrentPage: newPage,
      pagedOutfitHotList
    })
  },

  // 热门穿搭 - 下一页
  nextOutfitPage() {
    const { outfitHotList, outfitCurrentPage, outfitPageSize, outfitTotalPages } = this.data
    if (outfitCurrentPage >= outfitTotalPages) return

    const newPage = outfitCurrentPage + 1
    const start = (newPage - 1) * outfitPageSize
    const end = newPage * outfitPageSize

    const pagedOutfitHotList = outfitHotList.slice(start, end).map((item, index) => ({
      ...item,
      rankIndex: start + index + 1
    }))

    this.setData({
      outfitCurrentPage: newPage,
      pagedOutfitHotList
    })
  },

  // 跳转到衣物详情页
  goToClothesDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/clothes-detail/clothes-detail?id=${id}`
    })
  },

  // 跳转到穿搭详情页
  goToOutfitDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/outfit-detail/outfit-detail?outfitId=${id}`
    })
  }
})