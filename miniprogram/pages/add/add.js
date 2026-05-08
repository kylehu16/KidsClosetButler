Page({
  data: {
    isEdit: false,
    editId: '',
    customTag: '',
    formData: {
      name: '',
      category: '',
      gender: '',
      season: [],
      size: '',
      color: '',
      tags: [],
      image: '',
      childId: ''
    },
    children: [],
    selectedChildName: '',
    categoryOptions: [
      { id: 'top', name: '上衣', icon: '👔' },
      { id: 'pants', name: '裤子', icon: '👖' },
      { id: 'skirt', name: '裙子', icon: '👗' },
      { id: 'jacket', name: '外套', icon: '🧥' },
      { id: 'shoes', name: '鞋子', icon: '👟' }
    ],
    seasonOptions: [
      { id: 'all', name: '四季' },
      { id: 'spring', name: '春季' },
      { id: 'summer', name: '夏季' },
      { id: 'autumn', name: '秋季' },
      { id: 'winter', name: '冬季' }
    ],
    colorOptions: [
      { id: 'red', value: '#EF4444', hex: 'EF4444' },
      { id: 'orange', value: '#F97316', hex: 'F97316' },
      { id: 'yellow', value: '#EAB308', hex: 'EAB308' },
      { id: 'green', value: '#22C55E', hex: '22C55E' },
      { id: 'blue', value: '#3B82F6', hex: '3B82F6' },
      { id: 'purple', value: '#8B5CF6', hex: '8B5CF6' },
      { id: 'pink', value: '#EC4899', hex: 'EC4899' },
      { id: 'black', value: '#1F2937', hex: '1F2937' },
      { id: 'white', value: '#F9FAFB', hex: 'F9FAFB' },
      { id: 'gray', value: '#9CA3AF', hex: '9CA3AF' }
    ],
    tagOptions: [
      { id: 'casual', name: '休闲' },
      { id: 'formal', name: '正式' },
      { id: 'sports', name: '运动' },
      { id: 'daily', name: '日常' },
      { id: 'party', name: '聚会' },
      { id: 'basic', name: '基础款' },
      { id: 'versatile', name: '百搭' }
    ],
    selectedColorHex: '',
    // 尺码相关（衣服按10递进，鞋子按5递进）
    sizeOptions: ['50', '60', '70', '80', '90', '100', '110', '120', '130', '140', '150', '160', '170'],
    shoesSizeOptions: ['30', '35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90', '95', '100', '105', '110', '115', '120', '125', '130', '135', '140', '145', '150', '155', '160', '165', '170', '175', '180', '185', '190', '195', '200', '205', '210', '215', '220', '225', '230', '235', '240', '245', '250', '255', '260'],
    sizeUnit: 'cm',
    currentSizeOptions: [],
    selectedSizeIndex: 0
  },

  onLoad(options) {
    // 初始化默认尺码选项（衣服用 cm）
    this.setData({ 
      currentSizeOptions: this.data.sizeOptions,
      sizeUnit: 'cm',
      selectedSizeIndex: 0
    })
    
    // 检查全局变量中是否有 editId
    const app = getApp()
    const editId = app.globalData.editClothesId
    console.log('add page onLoad, editId:', editId)
    
    if (editId) {
      // 有编辑ID时，先加载数据再设置编辑状态
      this.loadChildren(() => {
        this.loadCustomTags()
        this.loadEditData(editId)
        app.globalData.editClothesId = null
      })
    } else {
      // 正常加载
      this.loadChildren()
      this.loadCustomTags()
    }
  },

  onShow() {
    // 每次显示页面时检查是否有编辑ID
    const app = getApp()
    const editId = app.globalData.editClothesId
    
    if (editId) {
      console.log('add page onShow, editId from global:', editId)
      // 有编辑ID时，加载编辑数据
      this.loadChildren(() => {
        this.loadCustomTags()
        this.loadEditData(editId)
        app.globalData.editClothesId = null
      })
    } else {
      this.loadChildren()
      this.loadCustomTags()
    }
  },
  
  // 加载自定义标签
  loadCustomTags() {
    const customTags = wx.getStorageSync('customTags') || []
    const tagOptions = [
      { id: 'casual', name: '休闲' },
      { id: 'formal', name: '正式' },
      { id: 'sports', name: '运动' },
      { id: 'daily', name: '日常' },
      { id: 'party', name: '聚会' },
      { id: 'basic', name: '基础款' },
      { id: 'versatile', name: '百搭' }
    ]
    // 合并预设标签和自定义标签
    const allTags = [...tagOptions, ...customTags]
    this.setData({ tagOptions: allTags })
  },

  loadEditData(id) {
    const clothes = wx.getStorageSync('clothes') || []
    console.log('loadEditData called, id:', id)
    console.log('clothes:', clothes)
    
    // 统一转换为字符串比较
    const idStr = String(id)
    const item = clothes.find(c => String(c.id) === idStr)
    
    if (item) {
      console.log('found item:', item)
      // 找到对应的宝贝名称
      const children = wx.getStorageSync('children') || []
      const child = children.find(c => String(c.id) === String(item.childId))
      const colorItem = this.data.colorOptions.find(c => c.id === item.color)
      
      // 根据衣物类别设置尺码选项和单位
      const isShoes = item.category === 'shoes'
      const targetSizeOptions = isShoes ? this.data.shoesSizeOptions : this.data.sizeOptions
      const sizeUnit = isShoes ? 'mm' : 'cm'
      
      // 先找到选中尺码对应的索引
      const sizeIndex = targetSizeOptions.indexOf(String(item.size))
      const validIndex = sizeIndex !== -1 ? sizeIndex : 0
      
      // 同时设置 currentSizeOptions 和 selectedSizeIndex
      this.setData({
        isEdit: true,
        editId: item.id,
        formData: {
          name: item.name || '',
          category: item.category || '',
          gender: item.gender || '',
          season: item.season || [],
          size: item.size || '',
          color: item.color || '',
          tags: item.tags || [],
          image: item.image || '',
          childId: item.childId || ''
        },
        selectedChildName: child ? child.name : '',
        selectedColorHex: colorItem ? colorItem.hex : '',
        currentSizeOptions: targetSizeOptions,
        sizeUnit: sizeUnit,
        selectedSizeIndex: validIndex
      })
    } else {
      console.log('未找到衣物数据')
    }
  },

  loadChildren(callback) {
    const children = wx.getStorageSync('children') || []
    this.setData({ children }, () => {
      if (children.length > 0 && !this.data.formData.childId && !this.data.isEdit) {
        this.setData({
          'formData.childId': children[0].id,
          selectedChildName: children[0].name
        })
      }
      if (callback) callback()
    })
  },

  chooseImage() {
    // 选择照片方式
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto()
        } else {
          this.chooseFromAlbum()
        }
      }
    })
  },

  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ 'formData.image': tempFilePath })
      }
    })
  },

  chooseFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({ 'formData.image': tempFilePath })
      }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`formData.${field}`]: e.detail.value })
  },

  onPickerChange(e) {
    const index = e.detail.value
    const child = this.data.children[index]
    this.setData({
      'formData.childId': child.id,
      selectedChildName: child.name
    })
  },

  onSizeChange(e) {
    const index = e.detail.value
    const size = this.data.currentSizeOptions[index]
    this.setData({ 
      'formData.size': size,
      selectedSizeIndex: index
    })
  },

  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id
    // 根据类别更新尺码选项和单位
    if (categoryId === 'shoes') {
      this.setData({
        'formData.category': categoryId,
        'formData.size': '',
        currentSizeOptions: this.data.shoesSizeOptions,
        sizeUnit: 'mm',
        selectedSizeIndex: 0
      })
    } else {
      this.setData({
        'formData.category': categoryId,
        'formData.size': '',
        currentSizeOptions: this.data.sizeOptions,
        sizeUnit: 'cm',
        selectedSizeIndex: 0
      })
    }
  },

  selectGender(e) {
    this.setData({ 'formData.gender': e.currentTarget.dataset.gender })
  },

  selectSeason(e) {
    const seasonId = e.currentTarget.dataset.id
    const currentSeason = this.data.formData.season
    let newSeason = []
    
    // 检查是否已选中
    let found = false
    for (let i = 0; i < currentSeason.length; i++) {
      if (currentSeason[i] === seasonId) {
        found = true
      } else {
        newSeason.push(currentSeason[i])
      }
    }
    
    // 如果没找到就添加
    if (!found) {
      newSeason.push(seasonId)
    }
    
    this.setData({ 'formData.season': newSeason })
  },

  selectColor(e) {
    const colorId = e.currentTarget.dataset.id
    const colorItem = this.data.colorOptions.find(c => c.id === colorId)
    this.setData({ 
      'formData.color': colorId,
      selectedColorHex: colorItem ? colorItem.hex : ''
    })
  },

  toggleTag(e) {
    const tagId = e.currentTarget.dataset.id
    const currentTags = this.data.formData.tags
    let newTags = []
    
    // 检查是否已选中
    let found = false
    for (let i = 0; i < currentTags.length; i++) {
      if (currentTags[i] === tagId) {
        found = true
      } else {
        newTags.push(currentTags[i])
      }
    }
    
    // 如果没找到就添加
    if (!found) {
      newTags.push(tagId)
    }
    
    this.setData({ 'formData.tags': newTags })
  },

  onTagInput(e) {
    this.setData({ customTag: e.detail.value })
  },

  addCustomTag() {
    const customTag = this.data.customTag.trim()
    if (!customTag) {
      wx.showToast({ title: '请输入标签', icon: 'none' })
      return
    }
    
    const tagId = 'custom_' + Date.now()
    const newTag = { id: tagId, name: customTag }
    
    // 保存到 storage
    const customTags = wx.getStorageSync('customTags') || []
    customTags.push(newTag)
    wx.setStorageSync('customTags', customTags)
    
    // 更新 tagOptions 并选中
    const tagOptions = [...this.data.tagOptions, newTag]
    const tags = [...this.data.formData.tags, tagId]
    
    this.setData({
      tagOptions,
      'formData.tags': tags,
      customTag: ''
    })
  },

  onCancel() {
    // 清理编辑状态
    wx.removeStorageSync('editClothesId')
    
    // 重置表单
    const firstChild = this.data.children[0]
    this.setData({
      isEdit: false,
      editId: '',
      customTag: '',
      formData: {
        name: '',
        category: '',
        gender: '',
        season: [],
        size: '',
        color: '',
        tags: [],
        image: '',
        childId: firstChild ? firstChild.id : ''
      },
      selectedChildName: firstChild ? firstChild.name : '',
      selectedColorHex: ''
    })
    // 返回衣橱页面
    wx.switchTab({ url: '/pages/wardrobe/wardrobe' })
  },

  submitForm() {
    const { formData, isEdit, editId } = this.data
    
    if (!formData.name) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    if (!formData.category) {
      wx.showToast({ title: '请选择类型', icon: 'none' })
      return
    }
    if (!formData.gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' })
      return
    }
    
    const clothes = wx.getStorageSync('clothes') || []
    
    if (isEdit) {
      // 编辑模式：更新现有数据
      const index = clothes.findIndex(c => c.id === editId)
      if (index !== -1) {
        clothes[index] = {
          ...clothes[index],
          ...formData,
          categoryText: this.getCategoryText(formData.category),
          genderText: this.getGenderText(formData.gender)
        }
        wx.setStorageSync('clothes', clothes)
        wx.showToast({ title: '修改成功', icon: 'success' })
        
        setTimeout(() => {
          // 返回衣橱页面
          wx.switchTab({ url: '/pages/wardrobe/wardrobe' })
        }, 1500)
      }
    } else {
      // 新增模式
      const newClothes = {
        id: Date.now(),
        ...formData,
        categoryText: this.getCategoryText(formData.category),
        genderText: this.getGenderText(formData.gender),
        wearCount: 0,
        createTime: new Date().toISOString()
      }
      
      clothes.push(newClothes)
      wx.setStorageSync('clothes', clothes)
      
      wx.showToast({ title: '添加成功', icon: 'success' })
      
      setTimeout(() => {
        wx.switchTab({ url: '/pages/wardrobe/wardrobe' })
      }, 1500)
    }
  },

  getCategoryText(categoryId) {
    const categories = {
      top: '上衣',
      pants: '裤子',
      skirt: '裙子',
      jacket: '外套',
      shoes: '鞋子'
    }
    return categories[categoryId] || categoryId
  },

  getGenderText(genderId) {
    const genders = {
      boy: '男孩',
      girl: '女孩',
      unisex: '通用'
    }
    return genders[genderId] || genderId
  }
})
