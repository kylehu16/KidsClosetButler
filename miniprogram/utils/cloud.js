/**
 * 云函数调用工具类
 * 封装所有云函数调用，统一错误处理
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 传递给云函数的参数
 * @returns {Promise<object>} - 云函数返回结果
 */
function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result || {}
        if (result.code === 0) {
          resolve(result.data)
        } else {
          reject(new Error(result.message || '调用失败'))
        }
      },
      fail: (err) => {
        console.error(`云函数 ${name} 调用失败:`, err)
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}

/**
 * 获取预设数据（字典、标签）
 * @param {string} type - 数据类型：all, dict, tags
 */
function getPresetData(type = 'all') {
  return callFunction('getPresetData', { type })
}

/**
 * 宝贝管理
 */
const children = {
  // 获取宝贝列表
  get() {
    return callFunction('manageChildren', { action: 'get' })
  },
  
  // 根据ID获取宝贝
  getById(id) {
    return callFunction('manageChildren', { action: 'getById', id })
  },
  
  // 添加宝贝
  add(data) {
    return callFunction('manageChildren', { action: 'add', data })
  },
  
  // 更新宝贝
  update(id, data) {
    return callFunction('manageChildren', { action: 'update', id, data })
  },
  
  // 删除宝贝
  delete(id) {
    return callFunction('manageChildren', { action: 'delete', id })
  }
}

/**
 * 衣物管理
 */
const clothes = {
  // 获取衣物列表
  get(query = {}) {
    return callFunction('manageClothes', { action: 'get', query })
  },
  
  // 根据ID获取衣物
  getById(id) {
    return callFunction('manageClothes', { action: 'getById', id })
  },
  
  // 添加衣物
  add(data) {
    return callFunction('manageClothes', { action: 'add', data })
  },
  
  // 更新衣物
  update(id, data) {
    return callFunction('manageClothes', { action: 'update', id, data })
  },
  
  // 删除衣物
  delete(id) {
    return callFunction('manageClothes', { action: 'delete', id })
  },
  
  // 更新穿着次数
  updateWearCount(id) {
    return callFunction('manageClothes', { action: 'updateWearCount', id })
  }
}

/**
 * 穿搭管理
 */
const outfits = {
  // 获取穿搭列表
  get(query = {}) {
    return callFunction('manageOutfits', { action: 'get', query })
  },
  
  // 根据ID获取穿搭
  getById(id) {
    return callFunction('manageOutfits', { action: 'getById', id })
  },
  
  // 添加穿搭
  add(data) {
    return callFunction('manageOutfits', { action: 'add', data })
  },
  
  // 更新穿搭
  update(id, data) {
    return callFunction('manageOutfits', { action: 'update', id, data })
  },
  
  // 删除穿搭
  delete(id) {
    return callFunction('manageOutfits', { action: 'delete', id })
  },

}

/**
 * 标签管理
 */
const tags = {
  // 获取标签列表
  get() {
    return callFunction('manageTags', { action: 'get' })
  },
  
  // 添加自定义标签
  add(data) {
    return callFunction('manageTags', { action: 'add', data })
  },
  
  // 更新标签
  update(id, data) {
    return callFunction('manageTags', { action: 'update', id, data })
  },
  
  // 删除标签
  delete(id) {
    return callFunction('manageTags', { action: 'delete', id })
  }
}

/**
 * 穿衣记录
 */
const wearLogs = {
  // 记录穿衣
  add(data) {
    return callFunction('recordWearLog', { action: 'add', data })
  },
  
  // 获取穿衣记录
  get(query = {}) {
    return callFunction('recordWearLog', { action: 'get', query })
  },
  
  // 根据衣物ID获取记录
  getByClothes(query) {
    return callFunction('recordWearLog', { action: 'getByClothes', query })
  },
  
  // 删除穿衣记录
  delete(id) {
    return callFunction('recordWearLog', { action: 'delete', id })
  }
}

/**
 * 统计数据
 */
const statistics = {
  // 获取所有统计数据
  get(query = {}) {
    return callFunction('getStatistics', { action: 'get', query })
  }
}

/**
 * 推荐记录管理
 */
const recommendations = {
  // 保存推荐记录
  add(data) {
    return callFunction('manageOutfits', { action: 'saveRecommendation', data })
  },
  
  // 获取推荐记录
  get(query = {}) {
    return callFunction('manageOutfits', { action: 'getRecommendations', query })
  }
}

/**
 * AI推荐次数限制管理
 */
const aiUsage = {
  // 检查并递增使用次数（事务原子操作）
  checkAndIncrement(date) {
    return callFunction('manageOutfits', { action: 'checkAndIncrementUsage', data: { date } })
  },

  // 同步本地计数到云端（取最大值）
  syncUsage(date, localCount) {
    return callFunction('manageOutfits', { action: 'syncUsage', data: { date, localCount } })
  },

  // 查询指定日期的使用次数
  getUsage(date) {
    return callFunction('manageOutfits', { action: 'getUsage', data: { date } })
  }
}

module.exports = {
  callFunction,
  getPresetData,
  children,
  clothes,
  outfits,
  tags,
  wearLogs,
  statistics,
  recommendations,
  aiUsage  // AI推荐次数限制
}
