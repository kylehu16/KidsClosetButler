const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, data, id, query } = event
  const openId = context.userInfo?.openId || event.userInfo?.openId
  
  if (!openId) {
    return {
      code: 401,
      message: '未登录',
      data: null
    }
  }
  
  try {
    switch (action) {
      case 'add':
        return await addOutfit(data, openId)
      case 'update':
        return await updateOutfit(id, data, openId)
      case 'delete':
        return await deleteOutfit(id, openId)
      case 'get':
        return await getOutfits(query, openId)
      case 'getById':
        return await getOutfitById(id, openId)
      case 'recommend':
        return await recommendOutfit(data, openId)
      case 'saveRecommendation':
        return await saveRecommendation(data, openId)
      case 'getRecommendations':
        return await getRecommendations(query, openId)
      case 'checkAndIncrementUsage':
        return await checkAndIncrementUsage(data, openId)
      case 'syncUsage':
        return await syncUsage(data, openId)
      case 'getUsage':
        return await getUsage(data, openId)
      default:
        return {
          code: -1,
          message: '未知操作',
          data: null
        }
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      code: -1,
      message: error.message || '操作失败',
      data: null
    }
  }
}

// 添加穿搭
async function addOutfit(data, openId) {
  const outfitData = {
    ...data,
    _openid: openId,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  }
  
  const result = await db.collection('outfits').add(outfitData)
  
  // 同时更新衣物的穿着次数
  if (data.items && data.items.length > 0) {
    for (const clothesId of data.items) {
      try {
        await db.collection('clothes')
          .doc(clothesId)
          .update({
            wearCount: _.inc(1),
            updateTime: new Date().toISOString()
          })
      } catch (e) {
        console.error('更新穿着次数失败:', e)
      }
    }
  }
  
  return {
    code: 0,
    message: '添加成功',
    data: {
      id: result.id,
      ...outfitData
    }
  }
}

// 更新穿搭
async function updateOutfit(id, data, openId) {
  const updateData = {
    ...data,
    updateTime: new Date().toISOString()
  }
  
  // 移除不能更新的字段
  delete updateData._openid
  delete updateData.createTime
  
  await db.collection('outfits')
    .doc(id)
    .update(updateData)
  
  return {
    code: 0,
    message: '更新成功',
    data: null
  }
}

// 删除穿搭
async function deleteOutfit(id, openId) {
  // 先删除与该穿搭相关的穿搭记录
  try {
    const wearLogsRes = await db.collection('wear_logs')
      .where({ outfitId: id })
      .get()
    
    // 批量删除相关的穿搭记录
    if (wearLogsRes.data && wearLogsRes.data.length > 0) {
      for (const log of wearLogsRes.data) {
        try {
          await db.collection('wear_logs').doc(log._id).remove()
        } catch (e) {
          console.error('删除穿搭记录失败:', e)
        }
      }
    }
  } catch (e) {
    // 如果 wear_logs 集合不存在，记录错误但继续删除穿搭本身
    console.error('删除穿搭记录时出错:', e)
  }
  
  // 再删除穿搭本身
  await db.collection('outfits').doc(id).remove()
  
  return {
    code: 0,
    message: '删除成功',
    data: null
  }
}

// 获取穿搭列表
async function getOutfits(query = {}, openId) {
  let dbQuery = db.collection('outfits').where({ _openid: openId })
  
  // 宝贝筛选
  if (query.childId) {
    dbQuery = dbQuery.where({ childId: query.childId })
  }
  
  // 天气筛选
  if (query.weather) {
    dbQuery = dbQuery.where({ weather: query.weather })
  }
  
  // 场合筛选
  if (query.occasion) {
    dbQuery = dbQuery.where({ occasion: query.occasion })
  }
  
  const result = await dbQuery
    .orderBy('_id', 'asc')
    .orderBy('date', 'desc')
    .get()
  
  // 获取关联的衣物详情
  const outfits = result.data
  for (const outfit of outfits) {
    if (outfit.items && outfit.items.length > 0) {
      const clothesRes = await db.collection('clothes')
        .where({
          _openid: openId,
          _id: _.in(outfit.items)
        })
        .get()
      outfit.itemDetails = clothesRes.data
    } else {
      outfit.itemDetails = []
    }
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: outfits
  }
}

// 根据ID获取穿搭
async function getOutfitById(id, openId) {
  // 使用 where({ _id: id }).get() 而不是 doc(id).get()
  // 前者始终返回 { data: [] }，更可靠
  const result = await db.collection('outfits')
    .where({ _id: id })
    .get()

  if (!result.data || result.data.length === 0) {
    return {
      code: -1,
      message: '穿搭不存在',
      data: null
    }
  }

  const outfit = result.data[0]

  // 验证权限
  if (outfit._openid !== openId) {
    return {
      code: 403,
      message: '无权限访问',
      data: null
    }
  }

  // 获取关联的衣物详情
  if (outfit.items && outfit.items.length > 0) {
    const clothesRes = await db.collection('clothes')
      .where({
        _openid: openId,
        _id: _.in(outfit.items)
      })
      .get()
    outfit.itemDetails = clothesRes.data
  }

  return {
    code: 0,
    message: '获取成功',
    data: outfit
  }
}

// AI推荐穿搭（简化版，基于规则）
async function recommendOutfit(data, openId) {
  const { childId, weather, temperature, occasion } = data
  
  // 获取该宝贝的衣物
  let clothesQuery = db.collection('clothes').where({ 
    _openid: openId,
    childId: childId 
  })
  
  // 根据天气和温度筛选合适的衣物
  if (weather === 'rainy' || weather === 'snowy') {
    // 雨天/雪天推荐外套
    clothesQuery = clothesQuery.where({ category: 'jacket' })
  }
  
  const clothesRes = await clothesQuery.get()
  const clothes = clothesRes.data
  
  // 简单推荐逻辑：根据类别分组，每组随机选择一件
  const categorized = {
    top: clothes.filter(c => c.category === 'top'),
    pants: clothes.filter(c => c.category === 'pants' || c.category === 'skirt'),
    jacket: clothes.filter(c => c.category === 'jacket'),
    shoes: clothes.filter(c => c.category === 'shoes')
  }
  
  const recommendation = []
  if (categorized.top.length > 0) {
    recommendation.push(categorized.top[Math.floor(Math.random() * categorized.top.length)])
  }
  if (categorized.pants.length > 0) {
    recommendation.push(categorized.pants[Math.floor(Math.random() * categorized.pants.length)])
  }
  if (categorized.shoes.length > 0) {
    recommendation.push(categorized.shoes[Math.floor(Math.random() * categorized.shoes.length)])
  }
  
  // 根据天气决定是否推荐外套
  if ((weather === 'rainy' || weather === 'snowy' || weather === 'windy') && categorized.jacket.length > 0) {
    recommendation.push(categorized.jacket[Math.floor(Math.random() * categorized.jacket.length)])
  }
  
  return {
    code: 0,
    message: '推荐成功',
    data: recommendation
  }
}

// 保存推荐结果
async function saveRecommendation(data, openId) {
  const recommendationData = {
    ...data,
    _openid: openId,
    createTime: new Date().toISOString()
  }
  
  const result = await db.collection('recommendations').add(recommendationData)  
  return {
    code: 0,
    message: '保存成功',
    data: {
      id: result.id,
      ...recommendationData
    }
  }
}

// 获取推荐记录
async function getRecommendations(query, openId) {
  let dbQuery = db.collection('recommendations').where({ _openid: openId })
  
  if (query.queryHash) {
    dbQuery = dbQuery.where({ queryHash: query.queryHash })
  }
  
  const result = await dbQuery.get()
  
  return {
    code: 0,
    message: '获取成功',
    data: result.data
  }
}

// 检查并递增AI推荐次数（事务原子操作）
async function checkAndIncrementUsage(data, openId) {
  const { date } = data
  const maxCount = 10

  try {
    const result = await db.runTransaction(async (transaction) => {
      const res = await transaction.collection('ai_usage').where({
        _openid: openId,
        date: date
      }).get()

      if (res.data.length === 0) {
        // 今日无记录，创建新记录
        await transaction.collection('ai_usage').add({
          _openid: openId,
          date: date,
          count: 1,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        })
        return { allowed: true, count: 1 }
      } else {
        // 今日有记录，检查是否超限
        const doc = res.data[0]
        if (doc.count >= maxCount) {
          return { allowed: false, count: doc.count }
        }
        // 未超限，递增
        await transaction.collection('ai_usage').doc(doc._id).update({
          count: doc.count + 1,
          updateTime: new Date().toISOString()
        })
        return { allowed: true, count: doc.count + 1 }
      }
    })

    // 确保返回标准格式 { code: 0, data: {...} }
    return {
      code: 0,
      data: result
    }
  } catch (error) {
    console.error('检查并递增使用次数失败:', error)
    return {
      code: -1,
      message: error.message || '操作失败',
      data: null
    }
  }
}

// 同步本地计数到云端（取最大值）
async function syncUsage(data, openId) {
  const { date, localCount } = data

  try {
    const result = await db.runTransaction(async (transaction) => {
      const res = await transaction.collection('ai_usage').where({
        _openid: openId,
        date: date
      }).get()

      if (res.data.length === 0) {
        // 云端无记录，直接用本地计数创建
        await transaction.collection('ai_usage').add({
          _openid: openId,
          date: date,
          count: localCount,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        })
        return { count: localCount }
      } else {
        // 云端有记录，取最大值
        const doc = res.data[0]
        const maxCount = Math.max(doc.count, localCount)
        await transaction.collection('ai_usage').doc(doc._id).update({
          count: maxCount,
          updateTime: new Date().toISOString()
        })
        return { count: maxCount }
      }
    })

    return {
      code: 0,
      data: result
    }
  } catch (error) {
    console.error('同步使用次数失败:', error)
    return {
      code: -1,
      message: error.message || '操作失败',
      data: null
    }
  }
}

// 查询指定日期的AI推荐次数
async function getUsage(data, openId) {
  const { date } = data

  try {
    const res = await db.collection('ai_usage').where({
      _openid: openId,
      date: date
    }).get()

    if (res.data.length === 0) {
      return {
        code: 0,
        data: { count: 0 }
      }
    }

    return {
      code: 0,
      data: { count: res.data[0].count }
    }
  } catch (error) {
    console.error('查询使用次数失败:', error)
    return {
      code: -1,
      message: error.message || '操作失败',
      data: null
    }
  }
}
