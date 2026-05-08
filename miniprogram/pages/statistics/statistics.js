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
  
  loadStatistics() {
    const clothes = wx.getStorageSync('clothes') || []
    const outfits = wx.getStorageSync('outfits') || []
    
    const totalCount = clothes.length
    const totalOutfits = outfits.length
    
    const wornClothes = new Set()
    outfits.forEach(o => {
      if (o.items) o.items.forEach(id => wornClothes.add(id))
    })
    const wornCount = wornClothes.size
    const idleCount = totalCount - wornCount
    
    const categoryMap = {
      top: { id: 'top', name: '上衣', icon: '👕', count: 0 },
      pants: { id: 'pants', name: '裤子', icon: '👖', count: 0 },
      skirt: { id: 'skirt', name: '裙子', icon: '👗', count: 0 },
      jacket: { id: 'jacket', name: '外套', icon: '🧥', count: 0 },
      shoes: { id: 'shoes', name: '鞋子', icon: '👟', count: 0 }
    }
    
    clothes.forEach(c => {
      if (categoryMap[c.category]) {
        categoryMap[c.category].count++
      }
    })
    
    const categoryStats = Object.values(categoryMap).map(cat => ({
      ...cat,
      percent: totalCount > 0 ? Math.round((cat.count / totalCount) * 100) : 0
    }))
    
    const hotList = [...clothes]
      .filter(c => c.wearCount > 0)
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, 5)
    
    const coldList = [...clothes]
      .filter(c => !c.wearCount || c.wearCount === 0)
      .slice(0, 5)
      .map(c => ({ ...c, days: 30 }))
    
    const days = ['今天', '昨天', '周三', '周四', '周五', '周六', '周日']
    const heights = [120, 80, 140, 100, 60, 90, 110]
    const weekData = days.map((day, i) => ({
      day,
      height: heights[i]
    }))
    
    this.setData({
      totalCount,
      wornCount,
      idleCount,
      categoryStats,
      hotList,
      coldList,
      weekData,
      avgPerDay: (totalOutfits / 7).toFixed(1),
      totalOutfits
    })
  }
})