const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  const { action, data, query } = event
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
        return await addWearLog(data, openId)
      case 'get':
        return await getWearLogs(query, openId)
      case 'getByClothes':
        return await getWearLogsByClothes(query, openId)
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

// 记录穿衣日志
async function addWearLog(data, openId) {
  const logData = {
    ...data,
    _openid: openId,
    createTime: new Date().toISOString()
  }
  
  const result = await db.collection('wear_logs').add(logData)
  
  // 同时更新衣物的穿着次数
  if (data.clothesId) {
    try {
      await db.collection('clothes')
        .doc(data.clothesId)
        .update({
          wearCount: db.command.inc(1),
          updateTime: new Date().toISOString()
        })
    } catch (e) {
      console.error('更新穿着次数失败:', e)
    }
  }
  
  return {
    code: 0,
    message: '记录成功',
    data: {
      id: result.id,
      ...logData
    }
  }
}

// 获取穿衣记录列表
async function getWearLogs(query = {}, openId) {
  let dbQuery = db.collection('wear_logs').where({ _openid: openId })
  
  // 宝贝筛选
  if (query.childId) {
    dbQuery = dbQuery.where({ childId: query.childId })
  }
  
  // 衣物筛选
  if (query.clothesId) {
    dbQuery = dbQuery.where({ clothesId: query.clothesId })
  }
  
  // 日期范围筛选
  if (query.startDate && query.endDate) {
    dbQuery = dbQuery.where({
      date: db.command.and([
        db.command.gte(query.startDate),
        db.command.lte(query.endDate)
      ])
    })
  }
  
  const result = await dbQuery
    .orderBy('date', 'desc')
    .get()
  
  // 获取关联的衣物详情
  const logs = result.data
  for (const log of logs) {
    if (log.clothesId) {
      try {
        const clothesRes = await db.collection('clothes')
          .doc(log.clothesId)
          .get()
        log.clothesDetail = clothesRes.data[0] || null
      } catch (e) {
        log.clothesDetail = null
      }
    }
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: logs
  }
}

// 根据衣物ID获取穿衣记录
async function getWearLogsByClothes(query = {}, openId) {
  if (!query.clothesId) {
    return {
      code: -1,
      message: '缺少衣物ID',
      data: null
    }
  }
  
  const result = await db.collection('wear_logs')
    .where({ 
      _openid: openId,
      clothesId: query.clothesId 
    })
    .orderBy('date', 'desc')
    .get()
  
  return {
    code: 0,
    message: '获取成功',
    data: result.data
  }
}
