Page({
  data: {
    modeTab: 0,
    isEditMode: false,
    editOutfitId: '',
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
    clothesList: [],
    selectedClothes: [],
    outfitName: '',
    savedOutfits: [],
    tagOptions: [
      { id: 'casual', name: '休闲' },
      { id: 'formal', name: '正式' },
      { id: 'sports', name: '运动' },
      { id: 'daily', name: '日常' },
      { id: 'party', name: '聚会' },
      { id: 'basic', name: '基础款' },
      { id: 'versatile', name: '百搭' }
    ],
    selectedTags: [],
    customTag: ''
  },
  
  onLoad(options) {
    // 检查是否是编辑模式
    const editOutfitId = wx.getStorageSync('editOutfitId')
    if (editOutfitId) {
      wx.removeStorageSync('editOutfitId')
      this.loadEditData(editOutfitId)
    } else {
      this.loadData()
    }
  },
  
  onShow() {
    this.loadData()
  },

  // 加载编辑数据
  loadEditData(outfitId) {
    const outfits = wx.getStorageSync('outfits') || []
    const outfit = outfits.find(o => o.id == outfitId)
    
    if (outfit) {
      this.setData({
        isEditMode: true,
        editOutfitId: outfitId,
        modeTab: 1,  // 切换到自选搭配模式
        outfitName: outfit.name || '',
        selectedTags: outfit.tags || [],
        selectedClothes: outfit.items || []
      })
      
      // 处理儿童选择
      if (outfit.childIds && outfit.childIds.length > 0) {
        this.setData({ selectedChildIds: outfit.childIds })
      } else if (outfit.childId) {
        this.setData({ selectedChildIds: [outfit.childId] })
      }
    }
    
    this.loadData()
  },

  loadData() {
    const children = wx.getStorageSync('children') || []
    if (children.length > 0) {
      children[0].avatar = '👧'
      if (children.length > 1) {
        children[1].avatar = '👦'
      }
    }
    
    if (children.length === 0) {
      children.push(
        { id: '1', name: '小宝贝', age: 5, height: 110, avatar: '👧' },
        { id: '2', name: '小淘气', age: 3, height: 95, avatar: '👦' }
      )
    }
    
    // 从 storage 加载自定义标签
    const customTags = wx.getStorageSync('customTags') || []
    
    this.setData({ children, customTags })
    
    // 默认选中第一个儿童
    if (this.data.selectedChildIds.length === 0 && children.length > 0) {
      this.setData({ 
        selectedChildIds: [children[0].id],
        selectedChildName: children[0].name
      })
    }
    
    this.generateWeekOutfits()
    this.generateRecommendation()
    this.loadClothes()
    this.loadSavedOutfits()
  },

  loadClothes() {
    const clothes = wx.getStorageSync('clothes') || []
    if (clothes.length === 0) {
      clothes.push(
        { id: '1', name: '红色连衣裙', type: 'dress', image: '' },
        { id: '2', name: '蓝色牛仔裤', type: 'pants', image: '' },
        { id: '3', name: '白色T恤', type: 'top', image: '' },
        { id: '4', name: '运动鞋', type: 'shoes', image: '' }
      )
      wx.setStorageSync('clothes', clothes)
    }
    this.setData({ clothesList: clothes })
  },

  loadSavedOutfits() {
    const outfits = wx.getStorageSync('outfits') || []
    const clothes = wx.getStorageSync('clothes') || []
    
    // 获取所有标签（包括预设和自定义）
    const customTags = wx.getStorageSync('customTags') || []
    const allTags = [
      { id: 'casual', name: '休闲' },
      { id: 'formal', name: '正式' },
      { id: 'sports', name: '运动' },
      { id: 'daily', name: '日常' },
      { id: 'party', name: '聚会' },
      { id: 'basic', name: '基础款' },
      { id: 'versatile', name: '百搭' },
      ...customTags
    ]
    
    const savedOutfits = outfits.map(outfit => {
      // 优先使用 itemDetails，否则从 clothes 列表查找
      let outfitClothes = []
      if (outfit.itemDetails && outfit.itemDetails.length > 0) {
        outfitClothes = outfit.itemDetails
      } else {
        outfitClothes = outfit.items.map(id => clothes.find(c => c.id === id) || {})
      }
      const date = new Date(outfit.date)
      
      // 将标签ID转换为中文名称
      const tagNames = (outfit.tags || []).map(tagId => {
        const tag = allTags.find(t => t.id === tagId)
        return tag ? tag.name : tagId
      })
      
      return {
        id: outfit.id,
        name: outfit.name || '未命名穿搭',
        childName: outfit.childName || '',
        tags: tagNames,  // 使用转换后的标签名称数组
        date: `${date.getMonth() + 1}月${date.getDate()}日`,
        items: outfitClothes
      }
    })
    
    this.setData({ savedOutfits })
  },

  toggleClothes(e) {
    const id = e.currentTarget.dataset.id
    const { selectedClothes } = this.data
    const index = selectedClothes.indexOf(id)
    
    if (index > -1) {
      selectedClothes.splice(index, 1)
    } else {
      selectedClothes.push(id)
    }
    
    this.setData({ selectedClothes })
  },

  onOutfitNameInput(e) {
    this.setData({ outfitName: e.detail.value })
  },

  // 切换预设标签
  toggleTag(e) {
    const tagId = e.currentTarget.dataset.id
    const { selectedTags } = this.data
    const index = selectedTags.indexOf(tagId)
    
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tagId)
    }
    
    this.setData({ selectedTags })
  },

  // 自定义标签输入
  onTagInput(e) {
    this.setData({ customTag: e.detail.value })
  },

  // 添加自定义标签
  addCustomTag() {
    const { customTag, customTags, tagOptions } = this.data
    if (!customTag.trim()) return
    
    const tagName = customTag.trim()
    
    // 检查是否与预设标签重复
    const existsInPreset = tagOptions.some(t => t.name === tagName || t.id === tagName)
    // 检查是否已添加过
    const existsInCustom = customTags.some(t => t.name === tagName || t.id === tagName)
    
    if (existsInPreset || existsInCustom) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    
    // 添加新标签到列表
    const newTag = { id: 'custom_' + Date.now(), name: tagName }
    customTags.push(newTag)
    
    // 同时选中该标签
    const { selectedTags } = this.data
    selectedTags.push(newTag.id)
    
    // 保存到 storage
    wx.setStorageSync('customTags', customTags)
    
    this.setData({ 
      customTags,
      selectedTags,
      customTag: ''
    })
  },

  // 切换自定义标签选中状态
  toggleCustomTag(e) {
    const tagId = e.currentTarget.dataset.id
    const { selectedTags } = this.data
    const index = selectedTags.indexOf(tagId)
    
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tagId)
    }
    
    this.setData({ selectedTags })
  },

  switchMode(e) {
    const mode = Number(e.currentTarget.dataset.mode)
    this.setData({ modeTab: mode })
  },

  // 查看已保存的穿搭
  viewOutfit(e) {
    const outfitId = e.currentTarget.dataset.id
    // 将 outfitId 存入缓存，跳转到查看页面
    wx.setStorageSync('viewOutfitId', outfitId)
    wx.navigateTo({ url: '/pages/outfit-detail/outfit-detail' })
  },

  // 取消编辑
  cancelEdit() {
    this.setData({
      isEditMode: false,
      editOutfitId: '',
      outfitName: '',
      selectedTags: [],
      selectedClothes: [],
      modeTab: 2
    })
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
    const { selectedChildIds } = this.data
    const index = selectedChildIds.indexOf(id)
    
    if (index > -1) {
      // 取消选中
      selectedChildIds.splice(index, 1)
    } else {
      // 选中
      selectedChildIds.push(id)
    }
    
    // 更新选中的儿童名称
    const selectedChildren = this.data.children.filter(c => selectedChildIds.includes(c.id))
    const selectedChildName = selectedChildren.map(c => c.name).join('、')
    
    this.setData({ 
      selectedChildIds,
      selectedChildName: selectedChildName || '小宝贝'
    })
    this.generateRecommendation()
  },

  generateRecommendation() {
    const clothes = wx.getStorageSync('clothes') || []
    if (clothes.length === 0) {
      this.setData({ recommendedOutfit: [] })
      return
    }
    
    this.setData({ recommendLoading: true })
    
    setTimeout(() => {
      const tops = clothes.filter(c => c.category === 'top')
      const pants = clothes.filter(c => c.category === 'pants' || c.category === 'skirt')
      
      const recommendation = []
      if (tops.length > 0) recommendation.push(tops[Math.floor(Math.random() * tops.length)])
      if (pants.length > 0) recommendation.push(pants[Math.floor(Math.random() * pants.length)])
      
      this.setData({ 
        recommendedOutfit: recommendation,
        recommendLoading: false 
      })
    }, 1500)
  },

  regenerate() {
    this.generateRecommendation()
  },

  saveOutfit() {
    if (this.data.recommendedOutfit.length === 0) return
    
    const outfit = {
      id: Date.now(),
      childId: this.data.selectedChildId,
      childName: this.data.selectedChildName,
      name: this.data.outfitName || '未命名穿搭',
      tags: this.data.selectedTags,
      items: this.data.recommendedOutfit.map(c => c.id),
      weather: this.data.selectedWeather,
      occasion: this.data.selectedOccasion,
      date: new Date().toISOString()
    }
    
    const outfits = wx.getStorageSync('outfits') || []
    outfits.push(outfit)
    wx.setStorageSync('outfits', outfits)
    
    wx.showToast({ title: '穿搭已保存', icon: 'success' })
    this.loadSavedOutfits()
  },

  saveCustomOutfit() {
    const { selectedClothes, outfitName, selectedTags, selectedChildIds, selectedChildName, clothesList, isEditMode, editOutfitId } = this.data
    
    if (selectedClothes.length === 0) {
      wx.showToast({ title: '请先选择衣物', icon: 'none' })
      return
    }
    
    const outfits = wx.getStorageSync('outfits') || []
    
    if (isEditMode && editOutfitId) {
      // 编辑模式：更新现有数据
      const index = outfits.findIndex(o => o.id === editOutfitId)
      if (index !== -1) {
        outfits[index] = {
          ...outfits[index],
          childIds: selectedChildIds,
          childName: selectedChildName,
          name: outfitName || '未命名穿搭',
          tags: selectedTags,
          items: selectedClothes,
          itemDetails: selectedClothes.map(id => clothesList.find(c => c.id === id) || {}),
          date: outfits[index].date  // 保留原创建日期
        }
        wx.setStorageSync('outfits', outfits)
        wx.showToast({ title: '穿搭已更新', icon: 'success' })
        
        // 重置编辑状态
        this.setData({
          isEditMode: false,
          editOutfitId: '',
          modeTab: 2
        })
        
        // 刷新已保存列表
        this.loadSavedOutfits()
      }
    } else {
      // 新增模式
      const outfit = {
        id: Date.now(),
        childIds: selectedChildIds,
        childName: selectedChildName,
        name: outfitName || '未命名穿搭',
        tags: selectedTags,
        items: selectedClothes,
        itemDetails: selectedClothes.map(id => clothesList.find(c => c.id === id) || {}),
        date: new Date().toISOString()
      }
      
      outfits.push(outfit)
      wx.setStorageSync('outfits', outfits)
      
      wx.showToast({ title: '穿搭已保存', icon: 'success' })
      
      // 刷新已保存列表并切换到已保存标签
      this.loadSavedOutfits()
      this.setData({ modeTab: 2 })
    }
  },

  generateWeekOutfits() {
    const today = new Date()
    const weekDays = ['今天', '明天', '后天', '周四', '周五', '周六', '周日']
    const weathers = [
      { icon: '☀️', name: '晴', temp: 22 },
      { icon: '⛅', name: '多云', temp: 18 },
      { icon: '🌧️', name: '小雨', temp: 15 },
      { icon: '☀️', name: '晴', temp: 25 },
      { icon: '⛅', name: '多云', temp: 20 },
      { icon: '🌧️', name: '阵雨', temp: 17 },
      { icon: '☀️', name: '晴', temp: 24 }
    ]
    const suggests = [
      '建议穿短袖+短裤',
      '建议穿长袖+长裤',
      '建议穿外套+长裤',
      '建议穿短袖+短裤',
      '建议穿长袖+薄外套',
      '建议穿外套+长裤',
      '建议穿短袖+长裤'
    ]
    
    const weekOutfits = weekDays.map((day, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const month = date.getMonth() + 1
      const dayNum = date.getDate()
      
      return {
        day,
        date: `${month}月${dayNum}日`,
        weatherIcon: weathers[i].icon,
        weather: weathers[i].name,
        temp: weathers[i].temp,
        suggest: suggests[i]
      }
    })
    
    this.setData({ weekOutfits })
  }
})
