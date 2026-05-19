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
      case 'delete':
        return await deleteWearLog(event.id, openId)
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
  
  // 同时更新衣物的穿着次数（支持多个衣物）
  if (data.items && data.items.length > 0) {
    for (const itemId of data.items) {
      try {
        await db.collection('clothes')
          .doc(itemId)
          .update({
            wearCount: db.command.inc(1),
            updateTime: new Date().toISOString()
          })
      } catch (e) {
        console.error('更新穿着次数失败:', e)
      }
    }
  } else if (data.clothesId) {
    // 兼容旧逻辑（单个衣物）
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
          .where({ _id: log.clothesId })
          .get()
        // where({ _id }).get() 始终返回 { data: [] }
        log.clothesDetail = (clothesRes.data && clothesRes.data[0]) || null
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

// 删除穿衣记录
async function deleteWearLog(id, openId) {
  if (!id) {
    return {
      code: -1,
      message: '缺少记录ID',
      data: null
    }
  }
  
  try {
    // 先查询记录是否存在且属于当前用户
    const result = await db.collection('wear_logs')
      .where({ _id: id })
      .get()

    if (!result.data || result.data.length === 0) {
      return {
        code: -1,
        message: '记录不存在',
        data: null
      }
    }

    const log = result.data[0]
    
    // 验证权限（只能删除自己的记录）
    if (log._openid !== openId) {
      return {
        code: 403,
        message: '无权限删除此记录',
        data: null
      }
    }
    
    // 删除记录
    await db.collection('wear_logs').doc(id).remove()
    
    // 可选：减少衣物的穿着次数
    if (log.items && log.items.length > 0) {
      for (const itemId of log.items) {
        try {
          await db.collection('clothes')
            .doc(itemId)
            .update({
              wearCount: db.command.inc(-1),
              updateTime: new Date().toISOString()
            })
        } catch (e) {
          console.error('减少穿着次数失败:', e)
        }
      }
    }
    
    return {
      code: 0,
      message: '删除成功',
      data: null
    }
  } catch (error) {
    console.error('删除记录失败:', error)
    return {
      code: -1,
      message: error.message || '删除失败',
      data: null
    }
  }
}
