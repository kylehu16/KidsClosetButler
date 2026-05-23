const cloudbase = require('@cloudbase/node-sdk')

// 初始化 CloudBase
const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
})

const db = app.database()

exports.main = async (event, context) => {
  const { type } = event // type: 'all', 'dict', 'units', 'tags'
  
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
    
    // 获取单位数据
    if (type === 'all' || type === 'units' || !type) {
      const unitsRes = await db.collection('units')
        .where({ enabled: true })
        .get()
      result.units = unitsRes.data
    }
    
    // 获取预设标签
    if (type === 'all' || type === 'tags' || !type) {
      const tagsRes = await db.collection('tags')
        .where({ 
          type: 'preset',
          isDeleted: false 
        })
        .get()
      result.tags = tagsRes.data
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
