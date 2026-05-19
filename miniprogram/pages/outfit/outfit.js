const cloud = require('../../utils/cloud')
const app = getApp()

Page({
  data: {
    modeTab: 0,
    weatherList: [
      { id: 'sunny', name: '晴天', icon: '☀️' },
      { id: 'cloudy', name: '多云', icon: '⛅' },
      { id: 'rainy', name: '雨天', icon: '🌧️' },
      { id: 'windy', name: '大风', icon: '💨' },
      { id: 'snowy', name: '下雪', icon: '❄️' },
      { id: 'foggy', name: '雾霾', icon: '🌫️' }
    ],
    tempList: [
      { id: 'cold', name: '<0°C' },
      { id: 'cool', name: '0-10°C' },
      { id: 'mild', name: '10-20°C' },
      { id: 'warm', name: '20-25°C' },
      { id: 'hot', name: '25-30°C' },
      { id: 'very-hot', name: '>30°C' }
    ],
    occasions: [
      { id: 'daily', name: '日常', icon: '🏠' },
      { id: 'casual', name: '休闲', icon: '🛋️' },
      { id: 'formal', name: '正式', icon: '🎩' },
      { id: 'sports', name: '运动', icon: '⚽' }
    ],
    selectedWeather: 'sunny',
    selectedTemp: 'warm',
    selectedOccasion: 'daily',
    selectedWeatherName: '晴天',
    selectedTempName: '20-25°C',
    selectedOccasionName: '日常',
    children: [],
    selectedChildIds: [],
    selectedChildName: '小宝贝',
    recommendedOutfit: [],
    recommendLoading: false,
    weekOutfits: [],
    savedOutfits: [],
    filteredSavedOutfits: [],
    selectedSavedChildId: '',
    // 标签相关数据
    allTags: [],       // 所有标签（预设+自定义）
    tagMap: {},        // 标签映射 { matchId: name }
    // 穿搭记录弹窗相关数据
    showWearModal: false,
    wearSelectedChildId: '',
    wearDate: '',
    wearOutfitId: '',
    customTags: [],
    // 穿搭记录相关数据
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    selectedChildId: null,
    stats: {
      days: 0,
      wears: 0,
      avgPerDay: 0
    },
    records: [],
    filteredRecords: []
  },

  onLoad(options) {
    // 如果URL中有tab参数，切换到指定的tab
    if (options.tab) {
      const tab = Number(options.tab)
      if ([0, 2, 3].includes(tab)) {
        this.setData({ modeTab: tab })
      }
    }
    this.loadData()
    this.loadTags()
  },

  // 加载所有标签（预设+自定义）
  async loadTags() {
    try {
      const result = await cloud.tags.get()
      const preset = (result.preset || []).map(tag => ({
        ...tag,
        id: tag.id || tag._id,
        type: 'preset',
        matchId: tag.id || tag._id
      }))
      const custom = (result.custom || []).map(tag => ({
        ...tag,
        type: 'custom',
        matchId: tag._id
      }))
      const allTags = [...preset, ...custom]
      
      // 构建 tagMap: { matchId: name }
      const tagMap = {}
      allTags.forEach(tag => {
        tagMap[tag.matchId] = tag.name
      })
      
      this.setData({ allTags, tagMap })
    } catch (err) {
      console.error('获取标签失败:', err)
      this.setData({ allTags: [], tagMap: {} })
    }
  },

  onShow() {
    this.loadData()
  },

  // 跳转到添加搭配页面
  goToAddOutfit() {
    wx.navigateTo({ url: '/pages/add-outfit/add-outfit' })
  },

  // 加载编辑数据（跳转到添加搭配页面编辑）
  async loadEditData(outfitId) {
    try {
      const outfit = await cloud.outfits.getById(outfitId)
      if (outfit) {
        wx.navigateTo({
          url: '/pages/add-outfit/add-outfit?id=' + outfitId
        })
      }
    } catch (err) {
      console.error('加载编辑数据失败:', err)
    }
  },

  async loadData() {
    try {
      // 获取宝贝列表
      const children = await cloud.children.get()
      
      // 处理儿童数据：计算年龄，格式化身高和脚长
      const now = new Date()
      const processedChildren = (children || []).map((child, index) => {
        const avatar = index === 0 ? '👧' : '👦'
        
        // 计算年龄
        let age = ''
        if (child.birthDate) {
          const birth = new Date(child.birthDate)
          age = now.getFullYear() - birth.getFullYear()
        }
        
        // 格式化身高
        const heightText = child.height ? `${child.height}cm` : ''
        
        // 格式化脚长
        const footLengthText = child.footLength ? `${child.footLength}mm` : ''
        
        return {
          ...child,
          id: child._id,
          avatar,
          age,
          heightText,
          footLengthText
        }
      })
      
      // 初始化年月
      const currentDate = new Date()
      
      this.setData({ 
        children: processedChildren,
        currentYear: currentDate.getFullYear(),
        currentMonth: currentDate.getMonth() + 1
      })
      
      // 默认选中第一个儿童
      if (this.data.selectedChildIds.length === 0 && processedChildren.length > 0) {
        this.setData({ 
          selectedChildIds: [processedChildren[0].id],
          selectedChildName: processedChildren[0].name
        })
      }
      
      // 获取已保存的穿搭
      this.loadSavedOutfits()
      
      // 生成推荐
      this.generateRecommendation()
    } catch (err) {
      console.error('加载数据失败:', err)
    }
  },

  async loadSavedOutfits() {
    try {
      const outfits = await cloud.outfits.get()
      const clothes = await cloud.clothes.get()
      
      const savedOutfits = (outfits || []).map(outfit => {
        let outfitClothes = []
        if (outfit.itemDetails && outfit.itemDetails.length > 0) {
          outfitClothes = outfit.itemDetails
        } else {
          outfitClothes = (outfit.items || []).map(id => {
            const clothesItem = clothes.find(c => c._id === id) || {}
            // 确保有 sizeUnit 字段
            if (!clothesItem.sizeUnit) {
              clothesItem.sizeUnit = clothesItem.category === 'shoes' ? 'mm' : 'cm'
            }
            return clothesItem
          })
        }
        
        // 将 tag ID 转换为标签名称
        const tagNames = (outfit.tags || []).map(tagId => {
          return this.data.tagMap[tagId] || tagId
        })
        
        return {
          id: outfit._id,
          name: outfit.name || '未命名穿搭',
          childName: outfit.childName || '',
          childId: outfit.childId || (outfit.childIds && outfit.childIds[0]) || '',
          tags: outfit.tags || [],
          tagNames: tagNames,  // 添加标签名称数组
          items: outfitClothes
        }
      })
      
      this.setData({ savedOutfits }, () => {
        this.filterSavedOutfits()
      })
    } catch (err) {
      console.error('获取穿搭列表失败:', err)
      this.setData({ savedOutfits: [], filteredSavedOutfits: [] })
    }
  },

  // 筛选已保存的穿搭
  filterSavedOutfits() {
    const { savedOutfits, selectedSavedChildId } = this.data
    let filtered = [...savedOutfits]

    if (selectedSavedChildId) {
      filtered = filtered.filter(item => 
        item.childId === selectedSavedChildId || 
        (item.childIds && item.childIds.includes(selectedSavedChildId))
      )
    }

    this.setData({ filteredSavedOutfits: filtered })
  },

  // 选择儿童筛选（已保存穿搭）
  selectSavedChild(e) {
    const id = e.currentTarget.dataset.id
    const newId = this.data.selectedSavedChildId === id ? '' : id
    this.setData({ selectedSavedChildId: newId }, () => {
      this.filterSavedOutfits()
    })
  },

  // 查看已保存的穿搭详情
  viewSavedOutfit(e) {
    const outfitId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/outfit-detail/outfit-detail?outfitId=${outfitId}&fromPage=saved`
    })
  },


  switchMode(e) {
    const mode = Number(e.currentTarget.dataset.mode)
    this.setData({ modeTab: mode })
    
    // 如果切换到记录模式，加载记录数据
    if (mode === 3) {
      this.loadRecords()
    }
  },

  // 穿搭记录相关方法
  async selectRecordChild(e) {
    const id = e.currentTarget.dataset.id
    // 单选模式：只能选中或切换，不能取消
    this.setData({ selectedChildId: id })
    this.loadRecords()
  },

  selectAll() {
    this.setData({ selectedChildId: null })
    this.loadRecords()
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }
    this.setData({ currentYear, currentMonth })
    this.loadRecords()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ currentYear, currentMonth })
    this.loadRecords()
  },

  async loadRecords() {
    try {
      const { selectedChildId, currentYear, currentMonth, children } = this.data
      
      const query = {}
      if (selectedChildId) {
        query.childId = selectedChildId
      }
      
      const records = await cloud.wearLogs.get(query)
      
      const filtered = (records || []).filter(r => {
        if (!r.date) return false
        const d = new Date(r.date)
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
      })
      
      // 获取所有穿搭信息和衣物信息
      const outfits = await cloud.outfits.get()
      const clothes = await cloud.clothes.get()
      
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const filteredRecords = filtered.map(r => {
        const d = new Date(r.date)
        const child = children.find(c => c._id === r.childId)
        
        // 获取穿搭信息
        let outfitName = '未命名穿搭'
        let outfitTags = []
        let outfitTagNames = []  // 添加标签名称数组
        let outfitItems = []
        if (r.outfitId) {
          const outfit = outfits.find(o => o._id === r.outfitId)
          if (outfit) {
            outfitName = outfit.name || '未命名穿搭'
            outfitTags = outfit.tags || []
            
            // 将 tag ID 转换为标签名称
            outfitTagNames = outfitTags.map(tagId => {
              return this.data.tagMap[tagId] || tagId
            })
            
            // 获取穿搭中的衣物详情
            if (outfit.itemDetails && outfit.itemDetails.length > 0) {
              // 为每个衣物添加 sizeUnit 字段
              outfitItems = outfit.itemDetails.map(item => {
                if (!item.sizeUnit) {
                  item.sizeUnit = item.category === 'shoes' ? 'mm' : 'cm'
                }
                return item
              })
            } else if (outfit.items && outfit.items.length > 0) {
              outfitItems = outfit.items.map(id => {
                const clothesItem = clothes.find(c => c._id === id) || {}
                // 确保有 sizeUnit 字段
                if (!clothesItem.sizeUnit) {
                  clothesItem.sizeUnit = clothesItem.category === 'shoes' ? 'mm' : 'cm'
                }
                return clothesItem
              })
            }
          }
        } else if (r.items && r.items.length > 0) {
          // 如果记录中直接包含衣物ID，也加载衣物详情
          outfitItems = r.items.map(id => {
            const clothesItem = clothes.find(c => c._id === id) || {}
            // 确保有 sizeUnit 字段
            if (!clothesItem.sizeUnit) {
              clothesItem.sizeUnit = clothesItem.category === 'shoes' ? 'mm' : 'cm'
            }
            return clothesItem
          })
        }
        
        return {
          ...r,
          day: d.getDate(),
          weekday: weekdays[d.getDay()],
          dateStr: `${d.getMonth() + 1}月${d.getDate()}日`,
          childName: child ? child.name : '未知',
          outfitName: outfitName,
          tags: outfitTags,
          tagNames: outfitTagNames,  // 添加标签名称数组
          items: outfitItems
        }
      })
      
      const uniqueDays = new Set(filtered.map(r => r.date))
      const stats = {
        days: uniqueDays.size,
        wears: filtered.length,
        avgPerDay: uniqueDays.size > 0 ? (filtered.length / uniqueDays.size).toFixed(1) : 0
      }
      
      this.setData({
        records: records || [],
        filteredRecords,
        stats
      })
    } catch (err) {
      console.error('加载穿衣记录失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 查看已保存的穿搭
  viewSavedOutfit(e) {
    const outfitId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/outfit-detail/outfit-detail?outfitId=${outfitId}&fromPage=saved`
    })
  },

  // 显示穿搭记录弹窗
  async showWearModal(e) {
    const outfitId = e.currentTarget.dataset.id
    const today = new Date().toISOString().split('T')[0]
    
    // 显示弹窗，设置基本信息
    this.setData({
      showWearModal: true,
      wearOutfitId: outfitId,
      wearDate: today,
      wearSelectedChildId: this.data.children.length > 0 ? this.data.children[0].id : ''
    })
  },

  // 隐藏穿搭记录弹窗
  hideWearModal() {
    this.setData({
      showWearModal: false,
      wearOutfitId: '',
      wearDate: '',
      wearSelectedChildId: ''
    })
  },

  // 选择穿搭记录的儿童
  selectWearChild(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ wearSelectedChildId: id })
  },

  // 日期选择变化
  onWearDateChange(e) {
    this.setData({ wearDate: e.detail.value })
  },

  // 确认记录穿搭
  async confirmWear() {
    const { wearOutfitId, wearSelectedChildId, wearDate } = this.data
    
    if (!wearSelectedChildId) {
      wx.showToast({ title: '请选择儿童', icon: 'none' })
      return
    }
    
    if (!wearDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    
    try {
      // 获取穿搭详情
      const outfit = await cloud.outfits.getById(wearOutfitId)
      if (!outfit) {
        wx.showToast({ title: '穿搭不存在', icon: 'none' })
        return
      }
      
      // 使用弹窗中显示的天气信息
      // 记录穿衣日志
      await cloud.wearLogs.add({
        childId: wearSelectedChildId,
        outfitId: wearOutfitId,
        date: wearDate,
        items: outfit.items || []
      })
      
      // 更新衣物的穿着次数
      if (outfit.items && outfit.items.length > 0) {
        for (const itemId of outfit.items) {
          await cloud.clothes.updateWearCount(itemId)
        }
      }
      
      wx.showToast({ title: '记录成功', icon: 'success' })
      this.hideWearModal()
      
      // 刷新记录列表
      if (this.data.modeTab === 3) {
        this.loadRecords()
      }
    } catch (err) {
      console.error('记录穿搭失败:', err)
      wx.showToast({ title: err.message || '记录失败', icon: 'none' })
    }
  },

  // 查看穿搭记录详情
  viewRecord(e) {
    const recordId = e.currentTarget.dataset.id
    const outfitId = e.currentTarget.dataset.outfitId
    
    if (outfitId) {
      // 如果有穿搭ID，跳转到穿搭明细，并传递来源页面参数
      wx.navigateTo({
        url: `/pages/outfit-detail/outfit-detail?outfitId=${outfitId}&recordId=${recordId || ''}&fromPage=records`
      })
    } else {
      wx.showToast({ title: '该记录没有关联的穿搭', icon: 'none' })
    }
  },

  // 删除穿搭记录
  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    
    const that = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条穿搭记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await cloud.wearLogs.delete(id)
            if (result.code === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              // 重新加载记录列表
              that.loadRecords()
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' })
            }
          } catch (err) {
            console.error('删除记录失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 获取当前位置（封装成Promise）
  getLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude
          })
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 获取当前位置天气
  getCurrentWeather() {
    const that = this
    that.setData({ locationLoading: true })
    
    // 先检查授权状态
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.userLocation']) {
          // 未授权，先请求授权
          wx.authorize({
            scope: 'scope.userLocation',
            success() {
              // 授权成功，获取位置
              that.getLocationAndWeather()
            },
            fail() {
              that.setData({ locationLoading: false })
              // 用户拒绝，引导去设置
              wx.showModal({
                title: '提示',
                content: '需要获取您的位置信息来获取当地天气',
                confirmText: '去设置',
                success(res) {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            }
          })
        } else {
          // 已授权，直接获取位置
          that.getLocationAndWeather()
        }
      },
      fail() {
        that.setData({ locationLoading: false })
        wx.showToast({ title: '获取设置失败', icon: 'none' })
      }
    })
  },

  // 获取位置并调用天气API
  getLocationAndWeather() {
    const that = this
    
    wx.getLocation({
      type: 'gcj02',
      success: (locationRes) => {
        const { latitude, longitude } = locationRes
        
        wx.cloud.callFunction({
          name: 'getWeather',
          data: {
            latitude,
            longitude
          },
          success: (weatherRes) => {
            that.setData({ locationLoading: false })
            
            if (weatherRes.result && weatherRes.result.code === 0) {
              const weatherData = weatherRes.result.result
              // 直接使用云函数返回的weatherId，如果没有则转换
              const weatherId = weatherData.weatherId || that.convertToWeatherId(weatherData.weather)
              
              // 使用当前温度来判断温度区间
              const tempId = that.convertToTempId(weatherData.temperature)
              const weatherItem = that.data.weatherList.find(w => w.id === weatherId)
              const tempItem = that.data.tempList.find(t => t.id === tempId)
              
              // 更新未来天气与穿搭提醒
              const weekOutfits = that.generateWeekOutfits(weatherData.dailyForecast)
              
              that.setData({
                selectedWeather: weatherId,
                selectedWeatherName: weatherItem ? weatherItem.name : (weatherData.weather || '晴天'),
                selectedTemp: tempId,
                selectedTempName: tempItem ? tempItem.name : '20-25°C',
                weekOutfits: weekOutfits
              })
              
              wx.showToast({
                title: `${weatherItem ? weatherItem.name : weatherData.weather} ${weatherData.minTemp}-${weatherData.maxTemp}°C`,
                icon: 'success',
                duration: 2000
              })
              
              that.generateRecommendation()
            } else {
              that.setData({ locationLoading: false })
              wx.showToast({ title: '获取天气失败', icon: 'none' })
            }
          },
          fail: (err) => {
            that.setData({ locationLoading: false })
            console.error('获取天气失败:', err)
            wx.showToast({ title: '获取天气失败', icon: 'none' })
          }
        })
      },
      fail: (err) => {
        that.setData({ locationLoading: false })
        console.error('获取位置失败:', err)
        wx.showToast({ title: '获取位置失败', icon: 'none' })
      }
    })
  },

  // 将天气文字转换为天气ID
  convertToWeatherId(weather) {
    if (!weather) return 'sunny'
    const w = weather.toLowerCase()
    if (w.includes('晴') && !w.includes('多云')) return 'sunny'
    if (w.includes('多云') || w.includes('阴')) return 'cloudy'
    if (w.includes('雨')) return 'rainy'
    if (w.includes('雪')) return 'snowy'
    if (w.includes('雾') || w.includes('霾')) return 'foggy'
    if (w.includes('风') || w.includes('大风')) return 'windy'
    return 'sunny'
  },

  // 将温度转换为温度ID
  convertToTempId(temperature) {
    if (!temperature) return 'warm'
    const t = parseFloat(temperature)
    if (isNaN(t)) return 'warm'
    if (t < 0) return 'cold'
    if (t < 10) return 'cool'
    if (t < 20) return 'mild'
    if (t < 25) return 'warm'
    if (t < 30) return 'hot'
    return 'very-hot'
  },

  selectWeather(e) {
    const id = e.currentTarget.dataset.id
    const weather = this.data.weatherList.find(w => w.id === id)
    this.setData({ 
      selectedWeather: id,
      selectedWeatherName: weather.name
    })
    this.generateRecommendation()
  },

  selectTemp(e) {
    const id = e.currentTarget.dataset.id
    const temp = this.data.tempList.find(t => t.id === id)
    this.setData({ 
      selectedTemp: id,
      selectedTempName: temp.name
    })
    this.generateRecommendation()
  },

  selectOccasion(e) {
    const id = e.currentTarget.dataset.id
    const occasion = this.data.occasions.find(o => o.id === id)
    this.setData({ 
      selectedOccasion: id,
      selectedOccasionName: occasion.name
    })
    this.generateRecommendation()
  },

  selectChild(e) {
    const id = e.currentTarget.dataset.id
    const { selectedChildIds, children } = this.data
    const index = selectedChildIds.indexOf(id)
    
    // 当只有一个儿童时，必须选中
    if (children.length === 1 && index > -1) {
      wx.showToast({ title: '至少需要选择一个儿童', icon: 'none' })
      return
    }
    
    if (index > -1) {
      selectedChildIds.splice(index, 1)
    } else {
      selectedChildIds.push(id)
    }
    
    const selectedChildren = this.data.children.filter(c => selectedChildIds.includes(c.id))
    const selectedChildName = selectedChildren.map(c => c.name).join('、')
    
    this.setData({ 
      selectedChildIds,
      selectedChildName: selectedChildName || '小宝贝'
    })
    this.generateRecommendation()
  },

  async generateRecommendation() {
    const { selectedChildIds } = this.data
    if (selectedChildIds.length === 0) {
      this.setData({ recommendedOutfit: [] })
      return
    }
    
    this.setData({ recommendLoading: true })
    
    try {
      const result = await cloud.outfits.recommend({
        childId: selectedChildIds[0],
        weather: this.data.selectedWeather,
        temperature: this.data.selectedTemp
      })
      
      this.setData({ 
        recommendedOutfit: result || [],
        recommendLoading: false 
      })
    } catch (err) {
      console.error('推荐失败:', err)
      this.setData({ recommendLoading: false })
      
      // 降级方案：从本地列表随机选择
      const clothes = this.data.clothesList || []
      const tops = clothes.filter(c => c.category === 'top')
      const pants = clothes.filter(c => c.category === 'pants' || c.category === 'skirt')
      
      const recommendation = []
      if (tops.length > 0) recommendation.push(tops[Math.floor(Math.random() * tops.length)])
      if (pants.length > 0) recommendation.push(pants[Math.floor(Math.random() * pants.length)])
      
      this.setData({ 
        recommendedOutfit: recommendation,
        recommendLoading: false 
      })
    }
  },

  regenerate() {
    this.generateRecommendation()
  },

  async saveOutfit() {
    if (this.data.recommendedOutfit.length === 0) return
    
    const { recommendedOutfit, selectedChildIds, selectedChildName } = this.data
    
    // 检查是否有儿童选中
    if (selectedChildIds.length === 0) {
      wx.showToast({ title: '请选择儿童', icon: 'none' })
      return
    }
    
    try {
      // 将推荐衣物ID、选中儿童信息存到全局变量
      app.globalData.preselectedClothes = recommendedOutfit.map(c => c._id)
      app.globalData.preselectedChildIds = selectedChildIds
      app.globalData.preselectedChildName = selectedChildName
      
      // 跳转到添加穿搭页面
      wx.navigateTo({
        url: '/pages/add-outfit/add-outfit'
      })
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  // 生成未来天气与穿搭提醒
  generateWeekOutfits(dailyForecast) {
    const weekDays = ['今天', '明天', '后天']
    const weatherIconMap = {
      '晴天': '☀️',
      '多云': '⛅',
      '小雨': '🌧️',
      '中雨': '🌧️',
      '大雨': '⛈️',
      '小雪': '❄️',
      '中雪': '❄️',
      '大雪': '❄️',
      '雷阵雨': '⛈️',
      '雾霾': '🌫️',
      '雨夹雪': '🌧️'
    }
    
    if (dailyForecast && dailyForecast.length > 0) {
      // 使用真实的天气数据
      return dailyForecast.map((dayData, i) => {
        const date = new Date(dayData.date)
        const month = date.getMonth() + 1
        const dayNum = date.getDate()
        // 使用最高温来判断温度区间（偏热考量）
        const temp = dayData.maxTemp
        // 温度范围显示（最低温-最高温）
        const tempRange = `${dayData.minTemp}-${dayData.maxTemp}°C`
        
        // 根据温度生成穿衣建议
        let suggest = '建议穿适合天气的衣物'
        if (temp < 10) suggest = '建议穿厚外套+长裤'
        else if (temp < 20) suggest = '建议穿长袖+长裤'
        else if (temp < 25) suggest = '建议穿长袖或短袖+长裤'
        else suggest = '建议穿短袖+短裤'
        
        return {
          day: weekDays[i] || `${month}月${dayNum}日`,
          date: `${month}月${dayNum}日`,
          weatherIcon: weatherIconMap[dayData.weather] || '☀️',
          weather: dayData.weather,
          temp: temp,
          tempRange: tempRange,
          maxTemp: dayData.maxTemp,
          minTemp: dayData.minTemp,
          suggest: suggest
        }
      })
    } else {
      // 没有天气数据，使用默认数据
      const defaultWeather = [
        { icon: '☀️', name: '晴', maxTemp: 25, minTemp: 18 },
        { icon: '⛅', name: '多云', maxTemp: 22, minTemp: 16 },
        { icon: '⛅', name: '多云', maxTemp: 20, minTemp: 15 }
      ]
      
      return defaultWeather.map((w, i) => {
        const today = new Date()
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        const month = date.getMonth() + 1
        const dayNum = date.getDate()
        // 使用最高温来判断温度区间
        const temp = w.maxTemp
        // 温度范围显示（最低温-最高温）
        const tempRange = `${w.minTemp}-${w.maxTemp}°C`
        
        return {
          day: weekDays[i],
          date: `${month}月${dayNum}日`,
          weatherIcon: w.icon,
          weather: w.name,
          temp: temp,
          tempRange: tempRange,
          maxTemp: w.maxTemp,
          minTemp: w.minTemp,
          suggest: i === 0 ? '建议穿短袖+短裤' : (i === 1 ? '建议穿长袖+长裤' : '建议穿外套+长裤')
        }
      })
    }
  }
})
