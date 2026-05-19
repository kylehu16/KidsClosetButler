const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

exports.main = async (event, context) => {
  const { query } = event
  const openId = context.userInfo?.openId || event.userInfo?.openId
  
  if (!openId) {
    return {
      code: 401,
      message: '未登录',
      data: null
    }
  }
  
  try {
    // 获取各种统计数据
    const [
      totalResult,
      wornResult,
      unusedResult,
      categoryResult,
      hotOutfits,
      sleepyClothes,
      weekTrend
    ] = await Promise.all([
      // 衣橱总数
      db.collection('clothes')
        .where({ _openid: openId })
        .count(),
      
      // 已穿衣物数（wearCount > 0）
      db.collection('clothes')
        .where({ 
          _openid: openId,
          wearCount: _.gt(0)
        })
        .count(),
      
      // 闲置衣物数（wearCount = 0）
      db.collection('clothes')
        .where({ 
          _openid: openId,
          wearCount: 0
        })
        .count(),
      
      // 分类统计
      getCategoryStats(openId),
      
      // 热门穿搭TOP5
      getHotOutfits(openId),
      
      // 沉睡榜单（30天未穿）
      getSleepyClothes(openId),
      
      // 本周穿搭趋势
      getWeekTrend(openId)
    ])
    
    return {
      code: 0,
      message: '获取成功',
      data: {
        total: totalResult.total,
        worn: wornResult.total,
        unused: unusedResult.total,
        categoryStats: categoryResult,
        hotOutfits: hotOutfits,
        sleepyClothes: sleepyClothes,
        weekTrend: weekTrend
      }
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    return {
      code: -1,
      message: error.message || '获取失败',
      data: null
    }
  }
}

// 分类统计
async function getCategoryStats(openId) {
  const result = await db.collection('clothes')
    .where({ _openid: openId })
    .get()
  
  const clothes = result.data
  const categoryMap = {}
  
  clothes.forEach(c => {
    const cat = c.category || 'unknown'
    if (!categoryMap[cat]) {
      categoryMap[cat] = 0
    }
    categoryMap[cat]++
  })
  
  return Object.keys(categoryMap).map(key => ({
    category: key,
    categoryText: getCategoryText(key),
    count: categoryMap[key]
  }))
}

// 热门穿搭TOP5
async function getHotOutfits(openId) {
  const result = await db.collection('outfits')
    .where({ _openid: openId })
    .get()
  
  const outfits = result.data
  
  // 统计每件衣物的穿搭次数
  const clothesCount = {}
  outfits.forEach(outfit => {
    if (outfit.items && outfit.items.length > 0) {
      outfit.items.forEach(itemId => {
        if (!clothesCount[itemId]) {
          clothesCount[itemId] = 0
        }
        clothesCount[itemId]++
      })
    }
  })
  
  // 转换为数组并排序
  const sorted = Object.keys(clothesCount)
    .map(clothesId => ({
      clothesId,
      count: clothesCount[clothesId]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  // 获取衣物详情
  for (const item of sorted) {
    try {
      const clothesRes = await db.collection('clothes')
        .where({ _id: item.clothesId })
        .get()
      // where({ _id }).get() 始终返回 { data: [] }
      item.clothesDetail = (clothesRes.data && clothesRes.data[0]) || null
    } catch (e) {
      item.clothesDetail = null
    }
  }
  
  return sorted
}

// 沉睡榜单（30天未穿）
async function getSleepyClothes(openId) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0]
  
  // 获取所有衣物
  const clothesRes = await db.collection('clothes')
    .where({ _openid: openId })
    .get()
  
  const clothes = clothesRes.data
  
  // 获取30天内有穿搭记录的衣物ID
  const recentOutfits = await db.collection('outfits')
    .where({
      _openid: openId,
      date: _.gte(dateStr)
    })
    .get()
  
  const wornClothesIds = new Set()
  recentOutfits.data.forEach(outfit => {
    if (outfit.items && outfit.items.length > 0) {
      outfit.items.forEach(itemId => wornClothesIds.add(itemId))
    }
  })
  
  // 筛选出30天未穿的衣物
  const sleepy = clothes
    .filter(c => !wornClothesIds.has(c._id))
    .sort((a, b) => (a.wearCount || 0) - (b.wearCount || 0))
    .slice(0, 5)
  
  return sleepy
}

// 本周穿搭趋势
async function getWeekTrend(openId) {
  const today = new Date()
  const weekDays = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    weekDays.push(date.toISOString().split('T')[0])
  }
  
  const result = await db.collection('outfits')
    .where({
      _openid: openId,
      date: _.in(weekDays)
    })
    .get()
  
  const trendMap = {}
  weekDays.forEach(day => {
    trendMap[day] = 0
  })
  
  result.data.forEach(outfit => {
    if (trendMap[outfit.date] !== undefined) {
      trendMap[outfit.date] += (outfit.items ? outfit.items.length : 0)
    }
  })
  
  return weekDays.map(day => ({
    date: day,
    count: trendMap[day]
  }))
}

// 获取分类中文名
function getCategoryText(category) {
  const map = {
    'top': '上衣',
    'pants': '裤子',
    'skirt': '裙子',
    'jacket': '外套',
    'shoes': '鞋子'
  }
  return map[category] || category
}
