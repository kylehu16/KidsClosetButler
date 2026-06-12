const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  const { action, data } = event
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
      case 'get':
        return await getUser(openId)
      case 'update':
        return await updateUser(openId, data)
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

// 获取用户信息
async function getUser(openId) {
  const result = await db.collection('users')
    .where({ _openid: openId })
    .get()
  
  if (result.data.length === 0) {
    return {
      code: 0,
      message: '用户不存在',
      data: null
    }
  }
  
  return {
    code: 0,
    message: '获取成功',
    data: result.data[0]
  }
}

// 更新用户信息（存在则更新，不存在则创建）
async function updateUser(openId, data) {
  const result = await db.collection('users')
    .where({ _openid: openId })
    .get()
  
  const userData = {
    ...data,
    updateTime: new Date().toISOString()
  }
  
  if (result.data.length === 0) {
    // 用户不存在，创建新用户
    userData._openid = openId
    userData.createTime = new Date().toISOString()
    
    const addResult = await db.collection('users').add(userData)
    
    return {
      code: 0,
      message: '保存成功',
      data: {
        id: addResult.id,
        ...userData
      }
    }
  } else {
    // 用户已存在，更新信息
    const userId = result.data[0]._id
    
    // 移除不能更新的字段
    delete userData._openid
    delete userData.createTime
    
    await db.collection('users').doc(userId).update(userData)
    
    return {
      code: 0,
      message: '保存成功',
      data: null
    }
  }
}
