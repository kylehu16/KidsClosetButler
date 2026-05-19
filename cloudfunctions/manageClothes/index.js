const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

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
        return await addClothes(data, openId)
      case 'update':
        return await updateClothes(id, data, openId)
      case 'delete':
        return await deleteClothes(id, openId)
      case 'get':
        return await getClothes(query, openId)
      case 'getById':
        return await getClothesById(id, openId)
      case 'updateWearCount':
        return await updateWearCount(id, openId)
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

// 添加衣物
async function addClothes(data, openId) {
  const clothesData = {
    ...data,
    _openid: openId,
    wearCount: 0,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  }
  
  const result = await db.collection('clothes').add(clothesData)
  
  return {
    code: 0,
    message: '添加成功',
    data: {
      id: result.id,
      ...clothesData
    }
  }
}

// 更新衣物
async function updateClothes(id, data, openId) {
  // 先获取旧数据，检查图片是否更换
  const oldRes = await db.collection('clothes').where({ _id: id }).get()
  const oldClothes = oldRes.data[0] || null
  
  const updateData = {
    ...data,
    updateTime: new Date().toISOString()
  }
  
  // 移除不能更新的字段
  delete updateData._openid
  delete updateData.createTime
  delete updateData.wearCount
  
  await db.collection('clothes')
    .doc(id)
    .update(updateData)
  
  // 如果图片已更换，删除旧图片
  if (oldClothes && oldClothes.image && data.image && 
      oldClothes.image !== data.image && 
      oldClothes.image.startsWith('cloud://')) {
    try {
      await app.deleteFile({
        fileList: [oldClothes.image]
      })
      console.log('旧图片已删除:', oldClothes.image)
    } catch (err) {
      console.error('删除旧图片失败:', err)
    }
  }
  
  return {
    code: 0,
    message: '更新成功',
    data: null
  }
}

// 删除衣物
async function deleteClothes(id, openId) {
  // 先获取衣物信息，拿到图片 fileID
  const clothesRes = await db.collection('clothes').where({ _id: id }).get()
  const clothes = (clothesRes.data && clothesRes.data[0]) || null
  
  // 删除云存储中的图片
  if (clothes && clothes.image && clothes.image.startsWith('cloud://')) {
    try {
      await app.deleteFile({
        fileList: [clothes.image]
      })
      console.log('云存储图片已删除:', clothes.image)
    } catch (err) {
      console.error('删除云存储图片失败:', err)
      // 图片删除失败不阻断流程，继续删除数据库记录
    }
  }
  
  // 删除数据库记录
  await db.collection('clothes').doc(id).remove()
  
  // 同时删除穿搭中引用此衣物的记录
  const outfitsRes = await db.collection('outfits')
    .where({ 
      _openid: openId,
      items: db.command.in([id])
    })
    .get()
  
  for (const outfit of outfitsRes.data) {
    const newItems = outfit.items.filter(itemId => itemId !== id)
    await db.collection('outfits')
      .doc(outfit._id)
      .update({ items: newItems })
  }
  
  return {
    code: 0,
    message: '删除成功',
    data: null
  }
}

// 获取衣物列表
async function getClothes(query = {}, openId) {
  let dbQuery = db.collection('clothes').where({ _openid: openId })
  
  // 分类筛选
  if (query.category && query.category !== 'all') {
    dbQuery = dbQuery.where({ category: query.category })
  }
  
  // 宝贝筛选
  if (query.childId) {
    dbQuery = dbQuery.where({ childId: query.childId })
  }
  
  // 性别筛选
  if (query.gender) {
    dbQuery = dbQuery.where({ 
      gender: db.command.in([query.gender, 'unisex'])
    })
  }
  
  // 季节筛选
  if (query.season) {
    dbQuery = dbQuery.where({ 
      season: db.command.all([query.season])
    })
  }
  
  const result = await dbQuery
    .orderBy('createTime', 'desc')
    .get()
  
  // 将 _id 映射为 id，保持兼容性
  const clothes = result.data.map(item => ({
    ...item,
    id: item._id
  }))
  
  return {
    code: 0,
    message: '获取成功',
    data: clothes
  }
}

// 根据ID获取衣物
async function getClothesById(id, openId) {
  const result = await db.collection('clothes')
    .where({ _id: id })
    .get()

  if (!result.data || result.data.length === 0) {
    return {
      code: -1,
      message: '衣物不存在',
      data: null
    }
  }

  const clothes = result.data[0]
  
  // 验证权限
  if (clothes._openid !== openId) {
    return {
      code: 403,
      message: '无权限访问',
      data: null
    }
  }
  
  // 将 _id 映射为 id，保持兼容性
  const clothesData = {
    ...clothes,
    id: clothes._id
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: clothesData
  }
}

// 更新穿着次数
async function updateWearCount(id, openId) {
  const result = await db.collection('clothes')
    .where({ _id: id })
    .get()

  if (!result.data || result.data.length === 0) {
    return {
      code: -1,
      message: '衣物不存在',
      data: null
    }
  }

  const clothes = result.data[0]
  const newWearCount = (clothes.wearCount || 0) + 1
  
  await db.collection('clothes')
    .doc(id)
    .update({ 
      wearCount: newWearCount,
      updateTime: new Date().toISOString()
    })
  
  return {
    code: 0,
    message: '更新成功',
    data: { wearCount: newWearCount }
  }
}
