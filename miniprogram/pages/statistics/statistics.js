const cloud = require('../../utils/cloud')

Page({
  data: {
    totalCount: 0,
    wornCount: 0,
    idleCount: 0,
    categoryStats: [],
    hotList: [],
    coldList: [],
    weekData: [],
    avgPerDay: 0,
    totalOutfits: 0
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
      
      const { total, worn, unused, categoryStats, hotOutfits, sleepyClothes, weekTrend } = result
      
      // 处理热门穿搭
      const hotList = (hotOutfits || []).map(item => ({
        ...item.clothesDetail,
        wearCount: item.count
      }))
      
      // 处理沉睡榜单
      const coldList = (sleepyClothes || []).map(c => ({
        ...c,
        days: 30
      }))
      
      // 处理本周趋势
      const weekData = (weekTrend || []).map(item => ({
        day: item.date,
        height: item.count * 20 // 按比例计算高度
      }))
      
      this.setData({
        totalCount: total || 0,
        wornCount: worn || 0,
        idleCount: unused || 0,
        categoryStats: categoryStats || [],
        hotList,
        coldList,
        weekData,
        avgPerDay: weekData.length > 0 ? (weekData.reduce((sum, d) => sum + d.height, 0) / 7).toFixed(1) : 0,
        totalOutfits: (hotOutfits || []).reduce((sum, item) => sum + item.count, 0)
      })
    } catch (err) {
      console.error('获取统计数据失败:', err)
      wx.showToast({ title: '获取失败', icon: 'none' })
    }
  }
})