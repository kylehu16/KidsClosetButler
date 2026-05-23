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
      hotOutfitCombos,
      sleepyClothes,
      weekTrend,
      outfitsCountResult
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
      
      // 热门衣物TOP10
      getHotOutfits(openId),
      
      // 热门穿搭组合TOP10
      getHotOutfitCombos(openId),
      
      // 沉睡榜单（30天未穿）
      getSleepyClothes(openId),
      
      // 本周穿搭趋势
      getWeekTrend(openId),

      // 保存的穿搭组合总数
      db.collection('outfits')
        .where({ _openid: openId })
        .count()
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
        hotOutfitCombos: hotOutfitCombos,
        sleepyClothes: sleepyClothes,
        weekTrend: weekTrend,
        totalOutfits: outfitsCountResult.total  // 保存的穿搭组合总数
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
  const total = clothes.length
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
    name: getCategoryText(key),
    icon: getCategoryIcon(key),
    count: categoryMap[key],
    percent: total > 0 ? Math.round((categoryMap[key] / total) * 100) : 0
  }))
}

// 热门榜单TOP10（统计单件衣物的使用次数）
async function getHotOutfits(openId) {
  // 从 wear_logs 表查询所有穿着记录
  const wearLogsRes = await db.collection('wear_logs')
    .where({ _openid: openId })
    .get()

  const wearLogs = wearLogsRes.data

  // 统计每件衣物的穿着次数
  const clothesCount = {}

  for (const log of wearLogs) {
    // 单件衣物记录
    if (log.clothesId) {
      if (!clothesCount[log.clothesId]) {
        clothesCount[log.clothesId] = 0
      }
      clothesCount[log.clothesId]++
    }
    // 穿搭组合记录，需要展开其中的衣物
    if (log.outfitId) {
      try {
        const outfitRes = await db.collection('outfits')
          .doc(log.outfitId)
          .get()
        if (outfitRes.data[0] && outfitRes.data[0].items) {
          for (const clothesId of outfitRes.data[0].items) {
            if (!clothesCount[clothesId]) {
              clothesCount[clothesId] = 0
            }
            clothesCount[clothesId]++
          }
        }
      } catch (e) {
        // 穿搭可能已被删除，忽略
      }
    }
  }

  // 转换为数组并排序，取TOP10
  const sorted = Object.keys(clothesCount)
    .map(clothesId => ({
      clothesId,
      wearCount: clothesCount[clothesId]
    }))
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 10)

  // 获取每件衣物的详情
  const result = []
  for (const item of sorted) {
    try {
      const clothesRes = await db.collection('clothes')
        .doc(item.clothesId)
        .get()
      if (clothesRes.data[0]) {
        result.push({
          ...clothesRes.data[0],
          wearCount: item.wearCount
        })
      }
    } catch (e) {
      console.log(`衣物 ${item.clothesId} 查询失败，可能已被删除`)
    }
  }

  return result
}

// 热门穿搭组合TOP10（统计穿搭组合的使用次数）
async function getHotOutfitCombos(openId) {
  const wearLogsRes = await db.collection('wear_logs')
    .where({ _openid: openId })
    .get()

  const wearLogs = wearLogsRes.data

  // 统计每个穿搭组合的使用次数
  const outfitCount = {}
  for (const log of wearLogs) {
    if (log.outfitId) {
      if (!outfitCount[log.outfitId]) {
        outfitCount[log.outfitId] = 0
      }
      outfitCount[log.outfitId]++
    }
  }

  // 排序取TOP10
  const sorted = Object.keys(outfitCount)
    .map(outfitId => ({ outfitId, wearCount: outfitCount[outfitId] }))
    .sort((a, b) => b.wearCount - a.wearCount)
    .slice(0, 10)

  // 获取穿搭详情及其中衣物信息
  const result = []
  for (const item of sorted) {
    try {
      const outfitRes = await db.collection('outfits')
        .doc(item.outfitId)
        .get()
      if (outfitRes.data[0]) {
        const outfit = outfitRes.data[0]
        const itemIds = outfit.items || []
        const clothesDetails = []
        for (const clothesId of itemIds) {
          try {
            const clothesRes = await db.collection('clothes')
              .doc(clothesId)
              .get()
            if (clothesRes.data[0]) {
              clothesDetails.push(clothesRes.data[0])
            }
          } catch (e) {
            // 衣物可能已被删除
          }
        }
        result.push({
          ...outfit,
          items: clothesDetails,
          wearCount: item.wearCount
        })
      }
    } catch (e) {
      // 穿搭可能已被删除
    }
  }

  return result
}

// 沉睡榜单（最近一次穿着距今超过30天）
async function getSleepyClothes(openId) {
  // 获取所有衣物
  const clothesRes = await db.collection('clothes')
    .where({ _openid: openId })
    .get()
  
  const clothes = clothesRes.data

  // 获取所有穿着记录
  const allLogs = await db.collection('wear_logs')
    .where({ _openid: openId })
    .get()

  // 记录每件衣物最近一次穿着日期（取最大日期）
  const lastWornDate = {}

  for (const log of allLogs.data) {
    const date = log.date
    // 单件衣物记录
    if (log.clothesId) {
      if (!lastWornDate[log.clothesId] || date > lastWornDate[log.clothesId]) {
        lastWornDate[log.clothesId] = date
      }
    }
    // 穿搭组合记录，需要展开其中的衣物
    if (log.outfitId) {
      try {
        const outfitRes = await db.collection('outfits')
          .doc(log.outfitId)
          .get()
        if (outfitRes.data[0] && outfitRes.data[0].items) {
          for (const itemId of outfitRes.data[0].items) {
            if (!lastWornDate[itemId] || date > lastWornDate[itemId]) {
              lastWornDate[itemId] = date
            }
          }
        }
      } catch (e) {
        // 穿搭可能已被删除，忽略
      }
    }
  }

  // 计算距今间隔天数
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sleepy = clothes
    .map(c => {
      const lastDate = lastWornDate[c._id]
      if (lastDate) {
        const last = new Date(lastDate)
        const days = Math.floor((today - last) / (1000 * 60 * 60 * 24))
        return { ...c, days, neverWorn: false }
      } else {
        // 从未穿过
        let days
        if (c.createTime) {
          const created = new Date(c.createTime)
          days = Math.floor((today - created) / (1000 * 60 * 60 * 24))
        } else {
          days = 999
        }
        return { ...c, days, neverWorn: true }
      }
    })
    .filter(c => c.neverWorn || c.days > 30)  // 从未穿过或超过30天未穿
    .sort((a, b) => b.days - a.days)  // 间隔天数降序，越久越靠前

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

// 获取分类图标
function getCategoryIcon(category) {
  const map = {
    'top': '👕',
    'pants': '👖',
    'skirt': '👗',
    'jacket': '🧥',
    'shoes': '👟'
  }
  return map[category] || '👔'
}
