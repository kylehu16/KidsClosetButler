const cloud = require('../../utils/cloud')
const app = getApp()

// 穿搭去重开关：启用后同服饰类型只保留一件（如两件短袖T恤只会留一件）
const ENABLE_OUTFIT_DEDUP = false

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
    filteredRecords: [],
    // 天气获取弹窗相关数据
    showWeatherModal: false,
    showCityInputSection: false,
    cityName: '',
    weatherCity: ''  // 存储获取天气后的城市名称
  },

  onUnload() {
    // 注销网络状态监听
    if (this._networkCallback) {
      wx.offNetworkStatusChange(this._networkCallback)
    }
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
      // 确保标签已加载（避免异步竞争导致 tagMap 为空）
      if (Object.keys(this.data.tagMap || {}).length === 0) {
        await this.loadTags()
      }
      
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

  // 获取当前模糊位置（封装成Promise）
  getFuzzyLocation() {
    return new Promise((resolve, reject) => {
      wx.getFuzzyLocation({
        success: (res) => {
          resolve({
            city: res.city
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

  // 显示天气获取方式选择弹窗
  showWeatherModal() {
    this.setData({
      showWeatherModal: true,
      showCityInputSection: false,
      cityName: ''
    })
  },

  // 隐藏天气获取方式选择弹窗
  hideWeatherModal() {
    this.setData({
      showWeatherModal: false,
      showCityInputSection: false
    })
  },

  // 根据当前位置获取天气
  getWeatherByLocation() {
    this.hideWeatherModal()
    const that = this
    that.setData({ locationLoading: true })
    
    // 先检查授权状态
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.userFuzzyLocation']) {
          // 未授权，先请求授权
          wx.authorize({
            scope: 'scope.userFuzzyLocation',
            success() {
              // 授权成功，获取位置
              that.getFuzzyLocation()
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
          that.getFuzzyLocation()
        }
      },
      fail() {
        that.setData({ locationLoading: false })
        wx.showToast({ title: '获取设置失败', icon: 'none' })
      }
    })
  },

  // 显示城市输入区域
  showCityInput() {
    this.setData({
      showCityInputSection: true
    })
  },

  // 城市名称输入
  onCityNameInput(e) {
    this.setData({
      cityName: e.detail.value
    })
  },

  // 根据城市名称获取天气
  async getWeatherByCity() {
    const city = this.data.cityName
    if (!city) {
      wx.showToast({ title: '请输入城市名称', icon: 'none' })
      return
    }
    
    this.hideWeatherModal()
    this.setData({ locationLoading: true })
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getWeather',
        data: { city: city }
      })
      
      if (res.result && res.result.code === 0) {
        const weatherData = res.result.result
        const weatherId = weatherData.weatherId || this.convertToWeatherId(weatherData.weather)
        const tempId = this.convertToTempId(weatherData.temperature)
        const weatherItem = this.data.weatherList.find(w => w.id === weatherId)
        const tempItem = this.data.tempList.find(t => t.id === tempId)
        const weekOutfits = this.generateWeekOutfits(weatherData.dailyForecast)
        
        this.setData({
          selectedWeather: weatherId,
          selectedWeatherName: weatherItem ? weatherItem.name : (weatherData.weather || '晴天'),
          selectedTemp: tempId,
          selectedTempName: tempItem ? tempItem.name : '20-25°C',
          weekOutfits: weekOutfits,
          locationLoading: false,
          weatherCity: city  // 存储城市名称
        })
        
        wx.showToast({
          title: `${weatherItem ? weatherItem.name : weatherData.weather} ${weatherData.minTemp}-${weatherData.maxTemp}°C`,
          icon: 'success',
          duration: 2000
        })
      } else {
        this.setData({ locationLoading: false })
        wx.showToast({ title: '获取天气失败', icon: 'none' })
      }
    } catch (err) {
      console.error('根据城市获取天气失败:', err)
      this.setData({ locationLoading: false })
      wx.showToast({ title: '获取天气失败', icon: 'none' })
    }
  },

  // 调用 getFuzzyLocation API
  getFuzzyLocation() {
    const that = this
    
    wx.getFuzzyLocation({
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
              const weatherId = weatherData.weatherId || that.convertToWeatherId(weatherData.weather)
              const tempId = that.convertToTempId(weatherData.temperature)
              const weatherItem = that.data.weatherList.find(w => w.id === weatherId)
              const tempItem = that.data.tempList.find(t => t.id === tempId)
              const weekOutfits = that.generateWeekOutfits(weatherData.dailyForecast)
              
              that.setData({
                selectedWeather: weatherId,
                selectedWeatherName: weatherItem ? weatherItem.name : (weatherData.weather || '晴天'),
                selectedTemp: tempId,
                selectedTempName: tempItem ? tempItem.name : '20-25°C',
                weekOutfits: weekOutfits,
                weatherCity: weatherData.city || '当前位置'
              })
              
              wx.showToast({
                title: `${weatherItem ? weatherItem.name : weatherData.weather} ${weatherData.minTemp}-${weatherData.maxTemp}°C`,
                icon: 'success',
                duration: 2000
              })
              
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
        console.error('getFuzzyLocation 失败:', err)
        
        // 检查是否是权限问题
        if (err.errMsg && err.errMsg.includes('no permission')) {
          wx.showModal({
            title: '权限未开通',
            content: '请在微信公众平台后台开通 getFuzzyLocation 权限',
            showCancel: false
          })
        } else {
          wx.showToast({ title: '获取位置失败', icon: 'none' })
        }
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
  },

  selectTemp(e) {
    const id = e.currentTarget.dataset.id
    const temp = this.data.tempList.find(t => t.id === id)
    this.setData({ 
      selectedTemp: id,
      selectedTempName: temp.name
    })
  },

  selectOccasion(e) {
    const id = e.currentTarget.dataset.id
    const occasion = this.data.occasions.find(o => o.id === id)
    this.setData({ 
      selectedOccasion: id,
      selectedOccasionName: occasion.name
    })
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
  },

  // 上一个推荐（左方向键）
  onPrevRecommendation() {
    const { cachedRecommendations, currentRank } = this.data
    
    if (!cachedRecommendations || cachedRecommendations.length === 0) {
      wx.showToast({ title: '没有更多推荐', icon: 'none' })
      return
    }
    
    // 计算上一顺位的rank（循环展示）
    let prevRank = currentRank - 1
    if (prevRank < 1) {
      prevRank = Math.min(20, cachedRecommendations.length)  // 如果rank=1，则跳到最后一个
    }
    
    // 根据prevRank获取对应推荐
    const prevRecommendation = cachedRecommendations.find(item => item.rank === prevRank)
    
    if (!prevRecommendation) {
      wx.showToast({ title: '没有更多推荐', icon: 'none' })
      return
    }
    
    // 处理推荐结果（更新UI）
    this.processRecommendation(prevRecommendation, prevRank)
  },

  // 下一个推荐（右方向键）
  onNextRecommendation() {
    const { cachedRecommendations, currentRank } = this.data
    
    if (!cachedRecommendations || cachedRecommendations.length === 0) {
      wx.showToast({ title: '没有更多推荐', icon: 'none' })
      return
    }
    
    // 计算下一顺位的rank（循环展示）
    let nextRank = currentRank + 1
    if (nextRank > 20 || nextRank > cachedRecommendations.length) {
      nextRank = 1  // 超过20或超过实际推荐数量，回到第1个
    }
    
    // 根据nextRank获取对应推荐
    const nextRecommendation = cachedRecommendations.find(item => item.rank === nextRank)
    
    if (!nextRecommendation) {
      wx.showToast({ title: '没有更多推荐', icon: 'none' })
      return
    }
    
    // 处理推荐结果（更新UI）
    this.processRecommendation(nextRecommendation, nextRank)
  },

  // 处理推荐结果（更新UI）
  processRecommendation(recommendation, rank) {
    const clothes = this.data.clothesList || []
    const savedOutfits = this.data.savedOutfits || []
    
    if (recommendation.outfitId && recommendation.outfitId !== "") {
      // 如果使用已保存的穿搭
      const savedOutfit = savedOutfits.find(o => o.id === recommendation.outfitId)
      if (savedOutfit) {
        this.setData({ 
          recommendedOutfit: savedOutfit.items,
          isSavedOutfit: true,
          currentOutfitId: recommendation.outfitId,
          currentRank: rank
        })
      }
    } else if (recommendation.items && recommendation.items.length > 0) {
      // 如果使用新配置的穿搭
      const recommendedClothes = []
      for (const clothesId of recommendation.items) {
        const clothesItem = clothes.find(c => c._id === clothesId)
        if (clothesItem) {
          recommendedClothes.push(clothesItem)
        }
      }
      
      this.setData({ 
        recommendedOutfit: recommendedClothes,
        isSavedOutfit: false,
        currentOutfitItems: recommendation.items,
        currentRank: rank
      })
    }
  },

  // 从衣物名称中提取服饰类型（如"米灰拼布马短袖t恤" → "短袖t恤"）
  extractGarmentType(name) {
    const typePatterns = [
      '短袖t恤', '长袖t恤', '短袖T恤', '长袖T恤',
      'polo衫', 'POLO衫', 'Polo衫',
      '衬衫', '卫衣', '毛衣', '背心', '马甲', '棉衣', '羽绒服',
      '运动衫', '打底衫', '针织衫', '开衫',
      '短裤', '长裤', '牛仔裤', '运动裤', '打底裤', '棉毛裤', '休闲裤',
      '连衣裙', '半身裙', '短裙', '长裙', '百褶裙',
      '外套', '夹克', '风衣', '大衣',
      '运动鞋', '皮鞋', '凉鞋', '靴子', '帆布鞋',
      't恤', 'T恤'
    ]
    const lower = name.toLowerCase()
    for (const pattern of typePatterns) {
      if (lower.includes(pattern.toLowerCase())) return pattern.toLowerCase()
    }
    return name
  },


  // 去重：同套穿搭中，同服饰类型只保留一件
  deduplicateRecommendations(recommendations, clothes) {
    if (!ENABLE_OUTFIT_DEDUP) return
    if (!recommendations || !clothes || !clothes.length) return
    recommendations.forEach(rec => {
      if (!rec.items || rec.items.length <= 1) return
      const seenTypes = {}
      rec.items = rec.items.filter(clothesId => {
        const item = clothes.find(c => c._id === clothesId)
        if (!item) return false
        const type = this.extractGarmentType(item.name)
        if (seenTypes[type]) {
          console.warn(`[去重] rank=${rec.rank} 移除重复类型"${type}": ${item.name}`)
          return false
        }
        seenTypes[type] = true
        return true
      })
    })
  },

  async loadClothesData() {
    const { selectedChildIds } = this.data
    if (selectedChildIds.length === 0) return []
    
    try {
      const clothes = await cloud.clothes.get({
        childId: selectedChildIds[0]
      })
      return clothes || []
    } catch (err) {
      console.error('加载衣物数据失败:', err)
      return []
    }
  },

  async loadWearRecords(childId) {
    try {
      const now = new Date()
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      // 去年同日前后15天
      const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() - 15)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 15)
      
      // 查询最近一个月的记录
      const recentRecords = await cloud.outfits.get({
        childId: childId,
        date: { $gte: oneMonthAgo.toISOString().split('T')[0] }
      })
      
      // 查询去年同期记录
      const lastYearRecords = await cloud.outfits.get({
        childId: childId,
        date: { 
          $gte: lastYearStart.toISOString().split('T')[0],
          $lte: lastYearEnd.toISOString().split('T')[0]
        }
      })
      
      // 合并记录
      return [...(recentRecords || []), ...(lastYearRecords || [])]
    } catch (err) {
      console.error('加载穿搭记录失败:', err)
      return []
    }
  },

  // 生成版本号（使用哈希值）
  generateVersion(clothes, savedOutfits) {
    // 简单哈希函数
    function simpleHash(str) {
      let hash = 5381
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xFFFFFFFF
      }
      return Math.abs(hash).toString(36)
    }
    
    // 衣物的版本：所有衣物的ID+更新时间拼接后的哈希值
    const clothesStr = clothes
      .map(c => `${c._id}_${c.updateTime || c.createTime}`)
      .sort()  // 排序，确保顺序一致
      .join('|')
    const clothesHash = simpleHash(clothesStr)
    
    // 穿搭的版本：所有穿搭的ID+更新时间拼接后的哈希值
    const outfitsStr = savedOutfits
      .map(o => `${o._id}_${o.updateTime || o.createTime}`)
      .sort()  // 排序，确保顺序一致
      .join('|')
    const outfitsHash = simpleHash(outfitsStr)
    
    // 版本号格式：衣物数量_衣物哈希_穿搭数量_穿搭哈希
    return `${clothes.length}_${clothesHash}_${savedOutfits.length}_${outfitsHash}`
  },

  async checkRecommendationCache(queryHash) {
    try {
      const result = await cloud.recommendations.get({
        queryHash: queryHash
      })
      
      if (result && result.length > 0) {
        // 返回最新的缓存结果
        return result[0]
      }
      return null
    } catch (err) {
      console.error('查询缓存失败:', err)
      return null
    }
  },

  // 调用混元大模型
  async callHunyuanAI(prompt) {
    try {
      const systemPrompt = `你是儿童穿搭顾问。输出前必须先思考：①分析天气温度→判断适合季节 ②分析场合→确定风格 ③从库存筛选合适衣物 ④按规则组合方案 ⑤检查是否违反规则 ⑥输出JSON。

【规则】
1. 优先用已保存穿搭(outfitId不为空)，否则用items组新穿搭
2. 分析穿搭记录了解用户偏好
3. rank=1最推荐，rank唯一不重复，最多20套
4. 每套搭配衣物约束：
   - 上衣(top)：1-2件，可叠穿，但禁止同类型（如两件短袖T恤）
   - 下装：1-2条裤子(pants)，或1条裙子(skirt)；裤子与裙子不能同时出现；裤子可叠穿但禁止同类型
   - 外套(jacket)：0-1件
   - 鞋子(shoes)：0-1件
5. 不同rank的衣物组合必须实质不同（仅换顺序或换rank视为重复）
6. 尺码匹配身高(±10cm)/脚长(±10mm)
7. 天气适配：晴天→春夏装；雨天/下雪→秋冬装+外套；大风→必须配外套
8. 场合适配：正式→避免运动标签；运动→避免裙子
9. 仅输出纯JSON，不要任何额外文字

【建议搭配参考（仅展示衣物名称，实际输出请用衣物ID）】
春季15-20°C：长袖T恤、薄外套、牛仔裤、运动鞋
夏季25-35°C：短袖T恤、短裤、凉鞋
秋季15-25°C：长袖衬衫、休闲裤、帆布鞋
冬季0-10°C：打底衫、毛衣、棉毛裤、外裤、羽绒服、靴子

【错误示例（严禁输出）】
❌ 短袖T恤A、短袖T恤B、牛仔裤 ← 两件同类型上衣
✅ 短袖T恤A、牛仔裤
❌ 长裤A、长裤B、上衣 ← 两件同类型裤子
✅ 棉毛裤、外裤、上衣 ← 不同类型可叠穿

【输出格式】
{"recommendation":[{"rank":1,"outfitId":"已有穿搭ID","items":[]},{"rank":2,"outfitId":"","items":["衣物ID1","衣物ID2"]}]}
注意：outfitId不为空时items必须为空，outfitId为空时items必须有衣物ID}`
      const provider = wx.cloud.extend.AI.createModel("hunyuan-v3")
      const res = await provider.generateText({
        model: "hy3-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
      
      return {
        content: res.choices[0].message.content,
        usage: res.usage || {}
      }
    } catch (err) {
      console.error('AI调用失败:', err)
      throw err
    }
  },

  // 构造AI调用的prompt
  buildPrompt(child, clothes, savedOutfits, weather, occasion, wearRecords) {
    let prompt = ""

    // 任务指令（引导模型先思考）
    prompt += "请根据以下信息，为儿童生成穿搭推荐。输出前请先思考：①当前温度对应什么季节，应该选什么厚薄的衣物 ②场合需要什么风格 ③从库存中筛选尺码合适的衣物 ④组合成完整搭配（至少2件，含上装+下装） ⑤检查是否违反规则。\n\n"

    // 儿童信息
    prompt += "【儿童信息】\n"
    prompt += "性别：" + (child.gender === 1 || child.gender === 'boy' ? '男' : '女')
    prompt += "，身高：" + (child.height || '未知') + "cm"
    prompt += "，脚长：" + (child.footLength || '未知') + "mm\n\n"

    // 天气和场合
    const weatherMap = { 'sunny': '晴天', 'cloudy': '多云', 'rainy': '雨天', 'snowy': '下雪', 'windy': '大风', 'foggy': '雾霾' }
    const occasionMap = { 'daily': '日常', 'casual': '休闲', 'formal': '正式', 'sports': '运动' }
    prompt += "【当前条件】\n"
    prompt += "天气：" + (weatherMap[weather] || '晴天') + "，" + (this.data.selectedTempName || '20-25°C') + "\n"
    prompt += "场合：" + (occasionMap[occasion] || '日常') + "\n\n"

    // 已保存的穿搭方案（简洁展示）
    if (savedOutfits && savedOutfits.length > 0) {
      prompt += "【已保存穿搭（优先推荐）】\n"
      savedOutfits.forEach((outfit, index) => {
        const itemIds = outfit.items ? outfit.items.map(i => i._id).join(', ') : '无'
        prompt += (index + 1) + ". ID:" + outfit.id + "，衣物ID:[" + itemIds + "]\n"
      })
      prompt += "\n"
    }

    // 最近穿搭记录（只取5条，节省token）
    if (wearRecords && wearRecords.length > 0) {
      prompt += "【最近穿搭记录（参考偏好）】\n"
      wearRecords.slice(0, 5).forEach(record => {
        const itemNames = record.itemDetails ? record.itemDetails.map(i => i.name).join(' + ') : '未知'
        prompt += "- " + record.date + "：" + itemNames + "\n"
      })
      prompt += "\n"
    }

    // 衣物库存（精简：去掉颜色、性别等冗余信息）
    if (clothes && clothes.length > 0) {
      prompt += "【衣物库存，共" + clothes.length + "件】\n"
      clothes.forEach((c, index) => {
        const sizeInfo = c.category === 'shoes' ? `尺码:${c.size}` : `尺码:${c.size}`
        const tags = c.tags && c.tags.length ? ` [${c.tags.join('/')}]` : ''
        prompt += (index + 1) + ". ID:" + c._id + "，" + c.name + "，" + this.getSeasonName(c.season) + "，" + sizeInfo + tags + "\n"
      })
      prompt += "\n"
    }

    return prompt
  },

  // 获取衣物类别名称
  getCategoryName(category) {
    const map = {
      'top': '上衣',
      'pants': '裤子',
      'skirt': '裙子',
      'jacket': '外套',
      'shoes': '鞋子'
    }
    return map[category] || category
  },

  // 获取性别名称
  getGenderName(gender) {
    if (gender === 1 || gender === 'boy') return '男'
    if (gender === 0 || gender === 'girl') return '女'
    return '通用'
  },

  // 获取季节名称
  getSeasonName(season) {
    if (!season) return '未知'
    const map = {
      'spring': '春',
      'summer': '夏',
      'autumn': '秋',
      'winter': '冬'
    }
    const allSeasons = ['spring', 'summer', 'autumn', 'winter']
    // 处理数组情况
    if (Array.isArray(season)) {
      if (season.length === 0) return '未知'
      // 四季全选 → 四季通用
      if (allSeasons.every(s => season.includes(s))) return '四季通用'
      return season.map(s => map[s] || s).join('/')
    }
    // 处理字符串情况
    if (typeof season === 'string') {
      const parts = season.split('/')
      if (parts.length === 0 || parts[0] === '') return '未知'
      if (allSeasons.every(s => parts.includes(s))) return '四季通用'
      return parts.map(s => map[s] || s).join('/')
    }
    return '未知'
  },

  async onAiRecommend() {
    const { selectedChildIds, selectedWeather, selectedTemp, selectedOccasion, recommendLoading } = this.data
    
    // 防止重复点击
    if (recommendLoading) return
    
    if (selectedChildIds.length === 0) {
      wx.showToast({ title: '请选择儿童', icon: 'none' })
      return
    }
    
    // 先检查每日次数限制（async函数，需要await）
    const canRecommend = await this.checkDailyLimit()
    if (!canRecommend) {
      return
    }
    
    this.setData({ recommendLoading: true })
      
    try {
      // 生成缓存key（queryHash）
      const clothes = await this.loadClothesData()
      // 保存衣物列表到data，供processRecommendation使用
      this.setData({ clothesList: clothes })
      
      const savedOutfits = this.data.savedOutfits || []
      const version = this.generateVersion(clothes, savedOutfits)
      const queryHash = `${selectedChildIds[0]}_${selectedWeather}_${selectedOccasion}_${selectedTemp}_${version}`
      
      // 先检查缓存
      const cachedResult = await this.checkRecommendationCache(queryHash)
      if (cachedResult) {
        console.log('使用缓存的推荐结果')
        // 使用缓存结果
        const recommendation = cachedResult.recommendations || []
        
        // 缓存结果也去重
        this.deduplicateRecommendations(recommendation, clothes)
        
        // 处理推荐结果（显示排名第一的推荐）
        const topRecommendation = recommendation.find(item => item.rank === 1)
        if (topRecommendation) {
          this.processRecommendation(topRecommendation, 1)
        }
        this.setData({ recommendLoading: false })
        wx.showToast({ title: '推荐成功', icon: 'success' })
        return
      }

      // 缓存未命中，加载数据并调用AI
      const wearRecords = await this.loadWearRecords(selectedChildIds[0])
      const child = this.data.children.find(c => c.id === selectedChildIds[0])
        
      // 构造prompt
      const prompt = this.buildPrompt(child, clothes, savedOutfits, selectedWeather, selectedOccasion, wearRecords)
        
      // 调用AI
      const aiResponse = await this.callHunyuanAI(prompt)
      const aiResult = aiResponse.content
      const inputTokens = aiResponse.usage.prompt_tokens || aiResponse.usage.input_tokens || 0
      const outputTokens = aiResponse.usage.completion_tokens || aiResponse.usage.output_tokens || 0
        
      // 解析AI返回结果
      const result = JSON.parse(aiResult)
      const recommendation = result.recommendation || []
        
      // 按rank排序
      recommendation.sort((a, b) => (a.rank || 999) - (b.rank || 999))
      
      // 去重：同套穿搭中，同服饰类型只保留一件
      this.deduplicateRecommendations(recommendation, clothes)
      
      // 处理推荐结果（显示排名第一的推荐）
      const topRecommendation = recommendation.find(item => item.rank === 1)
      let recommendedOutfit = []
      
      if (topRecommendation) {
        if (topRecommendation.outfitId && topRecommendation.outfitId !== "") {
          // 如果使用已保存的穿搭
          const savedOutfit = savedOutfits.find(o => o.id === topRecommendation.outfitId)
          if (savedOutfit) {
            recommendedOutfit = savedOutfit.items
            this.setData({ 
              isSavedOutfit: true,
              currentOutfitId: topRecommendation.outfitId,
              currentRank: 1,  // 重置为rank=1
              cachedRecommendations: recommendation  // 保存所有推荐结果
            })
          }
        } else if (topRecommendation.items && topRecommendation.items.length > 0) {
          // 如果使用新配置的穿搭
          for (const clothesId of topRecommendation.items) {
            const clothesItem = clothes.find(c => c._id === clothesId)
            if (clothesItem) {
              recommendedOutfit.push(clothesItem)
            }
          }
          
          this.setData({ 
            isSavedOutfit: false,
            currentOutfitItems: topRecommendation.items,
            currentRank: 1,  // 重置为rank=1
            cachedRecommendations: recommendation  // 保存所有推荐结果
          })
        }
      }
        
      // 保存推荐结果到数据库（带queryHash、prompt、token用量）
      await this.saveRecommendation(recommendation, queryHash, version, prompt, inputTokens, outputTokens)
        
      // 更新UI
      this.setData({ 
        recommendedOutfit: recommendedOutfit,
        recommendLoading: false 
      })
      wx.showToast({ title: '推荐成功', icon: 'success' })
    } catch (err) {
      console.error('AI推荐失败:', err)
      this.setData({ recommendLoading: false })
      wx.showToast({ title: 'AI推荐失败', icon: 'none' })
    }
  },

  // 保存推荐结果到数据库
  async saveRecommendation(recommendationDetails, queryHash, version, userPrompt, inputTokens, outputTokens) {
    try {
      const { selectedChildIds, selectedWeather, selectedTemp, selectedOccasion } = this.data
      
      await cloud.recommendations.add({
        queryHash: queryHash,
        version: version,
        childId: selectedChildIds[0],
        recommendations: recommendationDetails,
        weather: selectedWeather,
        occasion: selectedOccasion,
        temp: selectedTemp,
        date: new Date().toISOString().split('T')[0],
        createTime: new Date().toISOString(),
        userPrompt: userPrompt || '',
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0
      })
    } catch (err) {
      console.error('保存推荐结果失败:', err)
    }
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

  // 生成未来天气（明天、后天）
  generateWeekOutfits(dailyForecast) {
    const weekDays = ['明天', '后天']
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
      // 使用真实的天气数据，跳过今天（索引0），只取明天和后天（索引1和2）
      const futureDays = dailyForecast.slice(1, 3)
      return futureDays.map((dayData, i) => {
        const date = new Date(dayData.date)
        const month = date.getMonth() + 1
        const dayNum = date.getDate()
        // 温度范围显示（最低温-最高温）
        const tempRange = `${dayData.minTemp}-${dayData.maxTemp}°C`
        
        return {
          day: weekDays[i] || `${month}月${dayNum}日`,
          date: `${month}月${dayNum}日`,
          weatherIcon: weatherIconMap[dayData.weather] || '☀️',
          weather: dayData.weather,
          tempRange: tempRange
        }
      })
    } else {
      // 没有天气数据，使用默认数据（明天和后天）
      const defaultWeather = [
        { icon: '⛅', name: '多云', maxTemp: 22, minTemp: 16 },
        { icon: '⛅', name: '多云', maxTemp: 20, minTemp: 15 }
      ]
      
      return defaultWeather.map((w, i) => {
        const today = new Date()
        const date = new Date(today)
        date.setDate(date.getDate() + i + 1) // +1 跳过今天
        const month = date.getMonth() + 1
        const dayNum = date.getDate()
        // 温度范围显示（最低温-最高温）
        const tempRange = `${w.minTemp}-${w.maxTemp}°C`
        
        return {
          day: weekDays[i],
          date: `${month}月${dayNum}日`,
          weatherIcon: w.icon,
          weather: w.name,
          tempRange: tempRange
        }
      })
    }
  },

  // 获取今天日期字符串（本地时区）
  getTodayDateKey() {
    const today = new Date()
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
  },

  // 检查并递增AI推荐次数（云端为主，本地兜底）
  async checkDailyLimit() {
    const dateKey = this.getTodayDateKey()

    // 先尝试云端（原子操作：检查+递增）
    try {
      const res = await cloud.aiUsage.checkAndIncrement(dateKey)
      
      // 兼容两种返回格式：
      // 格式1（标准）: { code: 0, data: { allowed: true/false, count: N } }
      // 格式2（直接返回）: { allowed: true/false, count: N }
      const data = res.data || res  // 如果有 res.data 用 res.data，否则用 res 本身
      
      if (data && data.allowed) {
        // 云端检查通过，计数已递增
        return true
      } else if (data && !data.allowed) {
        // 云端已达上限，显示正确次数
        const usedCount = data.count || 0
        wx.showModal({
          title: '今日已达上限',
          content: `AI推荐每日限制10次，今日已使用${usedCount}次，请明天再来～`,
          showCancel: false
        })
        return false
      } else {
        // 云函数报错，降级到本地
        console.error('云函数checkAndIncrement返回错误:', res)
        return this._checkDailyLimitLocal(dateKey)
      }
    } catch (err) {
      console.log('云端检查失败，降级到本地:', err.message)
      // 云端失败，降级到本地
      return this._checkDailyLimitLocal(dateKey)
    }
  },

  // 本地检查并递增（兜底方案，无弹提示）
  _checkDailyLimitLocal(dateKey) {
    const storageKey = `ai_recommend_count_${dateKey}`

    // 清理非今日的旧记录
    const { keys } = wx.getStorageInfoSync()
    keys.forEach(k => {
      if (k.startsWith('ai_recommend_count_') && k !== storageKey) {
        wx.removeStorageSync(k)
      }
    })

    const count = wx.getStorageSync(storageKey) || 0
    if (count >= 10) {
      wx.showModal({
        title: '今日已达上限',
        content: `AI推荐每日限制10次，今日已使用${count}次，请明天再来～`,
        showCancel: false
      })
      return false
    }

    // 本地递增计数
    wx.setStorageSync(storageKey, count + 1)

    // 标记待同步
    wx.setStorageSync('ai_usage_pending_sync', 'true')

    // 记录待同步的日期
    let pendingDates = wx.getStorageSync('ai_usage_pending_dates') || []
    if (!pendingDates.includes(dateKey)) {
      pendingDates.push(dateKey)
      wx.setStorageSync('ai_usage_pending_dates', pendingDates)
    }

    return true
  },

  // 同步本地计数到云端（取最大值）
  async syncPendingUsage() {
    const pendingSync = wx.getStorageSync('ai_usage_pending_sync')
    if (pendingSync !== 'true') return

    const pendingDates = wx.getStorageSync('ai_usage_pending_dates') || []
    if (pendingDates.length === 0) {
      wx.removeStorageSync('ai_usage_pending_sync')
      return
    }

    for (const dateKey of pendingDates) {
      try {
        const localCount = wx.getStorageSync(`ai_recommend_count_${dateKey}`) || 0
        await cloud.aiUsage.syncUsage(dateKey, localCount)
        console.log(`同步 ${dateKey} 成功，本地计数: ${localCount}`)
      } catch (err) {
        console.error(`同步 ${dateKey} 失败:`, err.message)
        return  // 有一个失败就停止，下次再试
      }
    }

    // 全部同步成功，清除标记
    wx.removeStorageSync('ai_usage_pending_sync')
    wx.removeStorageSync('ai_usage_pending_dates')
  },

  // 网络状态变化处理
  onNetworkStatusChange(res) {
    if (res.isConnected) {
      console.log('网络恢复，开始同步待同步数据')
      this.syncPendingUsage()
    }
  }
})
