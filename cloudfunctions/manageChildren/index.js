const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  const { action, data, id } = event
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
        return await addChild(data, openId)
      case 'update':
        return await updateChild(id, data, openId)
      case 'delete':
        return await deleteChild(id, openId)
      case 'get':
        return await getChildren(openId)
      case 'getById':
        return await getChildById(id, openId)
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

// 添加宝贝
async function addChild(data, openId) {
  const childData = {
    ...data,
    _openid: openId,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  }
  
  const result = await db.collection('children').add(childData)
  
  return {
    code: 0,
    message: '添加成功',
    data: {
      id: result.id,
      ...childData
    }
  }
}

// 更新宝贝
async function updateChild(id, data, openId) {
  const updateData = {
    ...data,
    updateTime: new Date().toISOString()
  }
  
  // 移除不能更新的字段
  delete updateData._openid
  delete updateData.createTime
  
  await db.collection('children')
    .doc(id)
    .update(updateData)
  
  return {
    code: 0,
    message: '更新成功',
    data: null
  }
}

// 删除宝贝
async function deleteChild(id, openId) {
  // 检查是否有衣物关联此宝贝
  const clothesRes = await db.collection('clothes')
    .where({ childId: id, _openid: openId })
    .count()
  
  if (clothesRes.total > 0) {
    return {
      code: -1,
      message: '该宝贝有关联的衣物，无法删除',
      data: null
    }
  }
  
  await db.collection('children').doc(id).remove()
  
  return {
    code: 0,
    message: '删除成功',
    data: null
  }
}

// 获取所有宝贝
async function getChildren(openId) {
  const result = await db.collection('children')
    .where({ _openid: openId })
    .orderBy('createTime', 'desc')
    .get()
  
  return {
    code: 0,
    message: '获取成功',
    data: result.data
  }
}

// 根据ID获取宝贝
async function getChildById(id, openId) {
  const result = await db.collection('children')
    .doc(id)
    .get()
  
  if (result.data.length === 0) {
    return {
      code: -1,
      message: '宝贝不存在',
      data: null
    }
  }
  
  const child = result.data[0]
  
  // 验证权限
  if (child._openid !== openId) {
    return {
      code: 403,
      message: '无权限访问',
      data: null
    }
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: child
  }
}
