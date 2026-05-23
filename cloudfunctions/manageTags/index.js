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
      case 'get':
        return await getTags(openId)
      case 'add':
        return await addTag(data, openId)
      case 'update':
        return await updateTag(id, data, openId)
      case 'delete':
        return await deleteTag(id, openId)
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

// 获取标签列表（预设 + 用户自定义）
async function getTags(openId) {
  // 获取预设标签
  const presetRes = await db.collection('tags')
    .where({ 
      type: 'preset',
      isDeleted: false 
    })
    .get()
  
  // 获取用户自定义标签
  const customRes = await db.collection('tags')
    .where({ 
      _openid: openId,
      type: 'custom',
      isDeleted: false 
    })
    .get()
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      preset: presetRes.data,
      custom: customRes.data
    }
  }
}

// 添加自定义标签
async function addTag(data, openId) {
  // 检查是否已存在同名标签
  const existingRes = await db.collection('tags')
    .where({
      $or: [
        { name: data.name, type: 'preset' },
        { name: data.name, _openid: openId, type: 'custom' }
      ]
    })
    .get()
  
  if (existingRes.data.length > 0) {
    return {
      code: -1,
      message: '标签已存在',
      data: null
    }
  }
  
  const tagData = {
    ...data,
    _openid: openId,
    type: 'custom',
    isDeleted: false,
    usageCount: 0,
    createTime: new Date().toISOString()
  }
  
  const result = await db.collection('tags').add(tagData)
  
  return {
    code: 0,
    message: '添加成功',
    data: {
      id: result.id,
      ...tagData
    }
  }
}

// 更新标签
async function updateTag(id, data, openId) {
  // 检查是否是预设标签
  const result = await db.collection('tags').doc(id).get()
  
  if (result.data.length === 0) {
    return {
      code: -1,
      message: '标签不存在',
      data: null
    }
  }
  
  const tag = result.data[0]
  
  // 预设标签不允许修改
  if (tag.type === 'preset') {
    return {
      code: -1,
      message: '预设标签不能修改',
      data: null
    }
  }
  
  // 验证权限
  if (tag._openid !== openId) {
    return {
      code: 403,
      message: '无权限修改',
      data: null
    }
  }
  
  await db.collection('tags')
    .doc(id)
    .update({
      ...data,
      updateTime: new Date().toISOString()
    })
  
  return {
    code: 0,
    message: '更新成功',
    data: null
  }
}

// 删除标签（软删除）
async function deleteTag(id, openId) {
  // 检查是否是预设标签
  const result = await db.collection('tags').doc(id).get()
  
  if (result.data.length === 0) {
    return {
      code: -1,
      message: '标签不存在',
      data: null
    }
  }
  
  const tag = result.data[0]
  
  // 预设标签不允许删除
  if (tag.type === 'preset') {
    return {
      code: -1,
      message: '预设标签不能删除',
      data: null
    }
  }
  
  // 验证权限
  if (tag._openid !== openId) {
    return {
      code: 403,
      message: '无权限删除',
      data: null
    }
  }
  
  // 软删除
  await db.collection('tags')
    .doc(id)
    .update({ 
      isDeleted: true,
      updateTime: new Date().toISOString()
    })
  
  return {
    code: 0,
    message: '删除成功',
    data: null
  }
}
