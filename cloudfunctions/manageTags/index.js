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
  
  // 计算标签使用次数
  const allTags = [...presetRes.data, ...customRes.data]
  const tagIds = allTags.map(tag => tag._id)
  
  // 查询衣物中使用这些标签的数量
  const clothesRes = await db.collection('clothes')
    .where({
      tags: db.command.in(tagIds)
    })
    .get()
  
  // 查询穿搭中使用这些标签的数量
  const outfitsRes = await db.collection('outfits')
    .where({
      tags: db.command.in(tagIds)
    })
    .get()
  
  // 统计每个标签的使用次数
  const usageCountMap = {}
  
  // 初始化所有标签的使用次数为 0
  tagIds.forEach(id => {
    usageCountMap[id] = 0
  })
  
  // 统计衣物中的使用次数（每个衣物算一次使用）
  clothesRes.data.forEach(clothes => {
    if (clothes.tags && Array.isArray(clothes.tags)) {
      clothes.tags.forEach(tagId => {
        if (usageCountMap[tagId] !== undefined) {
          usageCountMap[tagId]++
        }
      })
    }
  })
  
  // 统计穿搭中的使用次数（每个穿搭算一次使用）
  outfitsRes.data.forEach(outfit => {
    if (outfit.tags && Array.isArray(outfit.tags)) {
      outfit.tags.forEach(tagId => {
        if (usageCountMap[tagId] !== undefined) {
          usageCountMap[tagId]++
        }
      })
    }
  })
  
  // 为标签添加使用次数
  const presetTags = presetRes.data.map(tag => ({
    ...tag,
    usageCount: usageCountMap[tag._id] || 0
  }))
  
  const customTags = customRes.data.map(tag => ({
    ...tag,
    usageCount: usageCountMap[tag._id] || 0
  }))
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      preset: presetTags,
      custom: customTags
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

// 删除标签（硬删除 + 清理关联）
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
  
  // 清理衣物中的标签引用
  const clothesRes = await db.collection('clothes')
    .where({
      tags: id  // 查找包含该标签的衣物
    })
    .get()
  
  for (const clothes of clothesRes.data) {
    const newTags = (clothes.tags || []).filter(tagId => tagId !== id)
    await db.collection('clothes').doc(clothes._id).update({
      tags: newTags
    })
  }
  
  // 清理穿搭中的标签引用
  const outfitsRes = await db.collection('outfits')
    .where({
      tags: id  // 查找包含该标签的穿搭
    })
    .get()
  
  for (const outfit of outfitsRes.data) {
    const newTags = (outfit.tags || []).filter(tagId => tagId !== id)
    await db.collection('outfits').doc(outfit._id).update({
      tags: newTags
    })
  }
  
  // 硬删除标签
  await db.collection('tags').doc(id).remove()
  
  return {
    code: 0,
    message: '删除成功',
    data: null
  }
}
