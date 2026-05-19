const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

// 预设标签定义（与 add-outfit 原 tagOptions 对应）
const PRESET_TAGS = [
  { id: 'casual', name: '休闲', color: '#FF6B9D' },
  { id: 'formal', name: '正式', color: '#C27AFF' },
  { id: 'sports', name: '运动', color: '#4ECDC4' },
  { id: 'daily', name: '日常', color: '#45B7D1' },
  { id: 'party', name: '聚会', color: '#F7DC6F' },
  { id: 'basic', name: '基础款', color: '#BB8FCE' },
  { id: 'versatile', name: '百搭', color: '#85C1E9' }
]

exports.main = async (event, context) => {
  const { type } = event // type: 'all', 'dict', 'tags'

  try {
    let result = {}

    // 获取字典数据
    if (type === 'all' || type === 'dict' || !type) {
      const dictRes = await db.collection('dict')
        .where({ enabled: true })
        .orderBy('sort', 'asc')
        .get()
      result.dict = dictRes.data
    }

    // 获取预设标签（如数据库中不存在则自动初始化）
    if (type === 'all' || type === 'tags' || !type) {
      await initPresetTags()
      const tagsRes = await db.collection('tags')
        .where({
          type: 'preset',
          isDeleted: false
        })
        .get()
      // 确保返回的数据都有 id 字段
      result.tags = (tagsRes.data || []).map(tag => ({
        ...tag,
        id: tag.id || tag._id
      }))
    }

    return {
      code: 0,
      message: '获取成功',
      data: result
    }
  } catch (error) {
    console.error('获取预设数据失败:', error)
    return {
      code: -1,
      message: error.message || '获取失败',
      data: null
    }
  }
}

// 初始化预设标签（如数据库中不存在则写入）
async function initPresetTags() {
  for (const tag of PRESET_TAGS) {
    const existing = await db.collection('tags')
      .where({ type: 'preset', id: tag.id })
      .get()
    if (!existing.data || existing.data.length === 0) {
      await db.collection('tags').add({
        ...tag,
        type: 'preset',
        isDeleted: false,
        usageCount: 0,
        createTime: new Date().toISOString()
      })
    }
  }
}
