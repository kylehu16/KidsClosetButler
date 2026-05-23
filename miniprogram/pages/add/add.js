const cloud = require('../../utils/cloud')

Page({
  data: {
    isEdit: false,
    editId: '',
    oldImageId: '',      // 编辑前的旧图片ID，用于删除
    uploadedImageId: '', // 新增时上传的图片ID，提交成功前取消需删除
    formData: {
      name: '',
      category: '',
      gender: '',
      season: [],
      size: '',
      color: [],  // 改为数组，支持多选
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
      { id: 'spring', name: '春' },
      { id: 'summer', name: '夏' },
      { id: 'autumn', name: '秋' },
      { id: 'winter', name: '冬' },
      { id: 'all', name: '四季' }
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
    allTags: [],       // 所有标签（预设+自定义），统一格式 { id, name, type, matchId }
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
        this.loadTags().then(() => {
          this.loadEditData(editId)
          app.globalData.editClothesId = null
        })
      })
    } else {
      // 正常加载
      this.loadChildren()
      this.loadTags()
    }
  },

  onShow() {
    // 每次显示页面时检查是否有编辑ID
    const app = getApp()
    const editId = app.globalData.editClothesId
    
    // 如果正在编辑中（已有编辑数据），不再重复加载
    if (this.data.isEdit) {
      return
    }
    
    if (editId) {
      console.log('add page onShow, editId from global:', editId)
      // 有编辑ID时，加载编辑数据
      this.loadChildren(() => {
        this.loadTags().then(() => {
          this.loadEditData(editId)
          app.globalData.editClothesId = null
        })
      })
    } else {
      this.loadChildren()
      this.loadTags()
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
      this.setData({ allTags: [...preset, ...custom] })
    } catch (err) {
      console.error('获取标签失败:', err)
      // 失败时使用空数组
      this.setData({ allTags: [] })
    }
  },

  async loadEditData(id) {
    try {
      const item = await cloud.clothes.getById(id)
      console.log('loadEditData called, id:', id)
      console.log('loaded item:', item)
      
      if (item) {
        // 从已加载的宝贝列表中找到对应的宝贝名称
        const children = this.data.children || []
        const child = children.find(c => 
          String(c.id) === String(item.childId) || 
          String(c._id) === String(item.childId)
        )
        // 处理颜色（可能是字符串或数组）
        let colors = item.color || []
        if (typeof colors === 'string') {
          colors = [colors]  // 兼容旧数据
        }
        const firstColorItem = colors.length > 0 ? this.data.colorOptions.find(c => c.id === colors[0]) : null
        
        // 根据衣物类别设置尺码选项和单位
        const isShoes = item.category === 'shoes'
        const targetSizeOptions = isShoes ? this.data.shoesSizeOptions : this.data.sizeOptions
        const sizeUnit = isShoes ? 'mm' : 'cm'
        
        // 先找到选中尺码对应的索引
        const sizeIndex = targetSizeOptions.indexOf(String(item.size))
        const validIndex = sizeIndex !== -1 ? sizeIndex : 0
        
        // 将标签 id 转换为 matchId
        const allTags = this.data.allTags || []
        const tagIds = item.tags || []
        const matchIds = tagIds.map(tid => {
          const tag = allTags.find(t => t.id === tid || t._id === tid || t.matchId === tid)
          return tag ? tag.matchId : tid
        })
        
        // 同时设置 currentSizeOptions 和 selectedSizeIndex
        this.setData({
          isEdit: true,
          editId: item._id || item.id,
          oldImageId: item.image || '',  // 保存旧图片ID
          formData: {
            name: item.name || '',
            category: item.category || '',
            gender: item.gender || '',
            season: item.season || [],
            size: item.size || '',
            color: colors,  // 使用处理过的颜色数组
            tags: matchIds,
            image: item.image || '',
            childId: item.childId || ''
          },
          selectedChildName: child ? child.name : '',
          selectedColorHex: firstColorItem ? firstColorItem.hex : '',
          currentSizeOptions: targetSizeOptions,
          sizeUnit: sizeUnit,
          selectedSizeIndex: validIndex
        })
      } else {
        console.log('未找到衣物数据')
      }
    } catch (err) {
      console.error('加载衣物数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadChildren(callback) {
    try {
      const children = await cloud.children.get()
      this.setData({ children }, () => {
        if (children && children.length > 0 && !this.data.formData.childId && !this.data.isEdit) {
          this.setData({
            'formData.childId': children[0]._id,
            selectedChildName: children[0].name
          })
        }
        if (callback) callback()
      })
    } catch (err) {
      console.error('获取宝贝列表失败:', err)
      if (callback) callback()
    }
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
        this.uploadToCloud(tempFilePath)
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
        this.uploadToCloud(tempFilePath)
      }
    })
  },

  // 上传图片到云存储
  uploadToCloud(filePath) {
    wx.showLoading({ title: '上传中...' })
    
    // 生成云存储路径：clothes/{openid}/{timestamp}.jpg
    const timestamp = Date.now()
    const cloudPath = `clothes/${timestamp}.jpg`
    
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        wx.hideLoading()
        // 保存云文件 ID
        this.setData({ 'formData.image': res.fileID })
        wx.showToast({ title: '上传成功', icon: 'success' })
        
        // 编辑模式下，删除旧图片（只删除云存储文件，不删除临时路径）
        const oldImageId = this.data.oldImageId
        if (oldImageId && oldImageId.startsWith('cloud://') && oldImageId !== res.fileID) {
          wx.cloud.deleteFile({
            fileList: [oldImageId],
            success: () => {
              console.log('旧图片已删除:', oldImageId)
            },
            fail: (err) => {
              console.error('删除旧图片失败:', err)
            }
          })
          // 清空旧图片ID
          this.setData({ oldImageId: '' })
        }
        
        // 新增模式下，保存上传的图片ID（提交前取消需删除）
        if (!this.data.isEdit) {
          this.setData({ uploadedImageId: res.fileID })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('上传失败:', err)
        wx.showToast({ title: '上传失败', icon: 'none' })
        // 上传失败时，不使用临时路径（临时路径无效）
        // 用户需要重新上传
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
      'formData.childId': child._id || child.id,
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
    let currentSeason = this.data.formData.season || []
    
    // 如果点击的是"四季"
    if (seasonId === 'all') {
      // 如果已经选中"四季"，则取消，变为空
      if (currentSeason.length === 1 && currentSeason[0] === 'all') {
        this.setData({ 'formData.season': [] })
      } else {
        // 否则选中"四季"，取消其他
        this.setData({ 'formData.season': ['all'] })
      }
      return
    }
    
    // 如果当前是 ['all']，先展开为四个季节
    if (currentSeason.length === 1 && currentSeason[0] === 'all') {
      currentSeason = []
    }
    
    // 检查是否已选中
    let found = false
    let newSeason = []
    for (let i = 0; i < currentSeason.length; i++) {
      if (currentSeason[i] === seasonId) {
        found = true  // 找到就标记（不添加到newSeason，相当于删除）
      } else {
        newSeason.push(currentSeason[i])  // 没找到就保留
      }
    }
    
    // 如果没找到就添加
    if (!found) {
      newSeason.push(seasonId)
    }
    
    // 如果四个季节都选中了，存储为 ['all']
    const allSeasons = ['spring', 'summer', 'autumn', 'winter']
    const hasAllSeasons = allSeasons.every(s => newSeason.includes(s))
    if (hasAllSeasons) {
      newSeason = ['all']
    }
    
    this.setData({ 'formData.season': newSeason })
  },

  selectColor(e) {
    const colorId = e.currentTarget.dataset.id
    const currentColors = this.data.formData.color || []
    const colorItem = this.data.colorOptions.find(c => c.id === colorId)
    
    // 检查是否已选中
    let found = false
    let newColors = []
    for (let i = 0; i < currentColors.length; i++) {
      if (currentColors[i] === colorId) {
        found = true  // 找到就标记（不添加到newColors，相当于删除）
      } else {
        newColors.push(currentColors[i])  // 没找到就保留
      }
    }
    
    // 如果没找到就添加
    if (!found) {
      newColors.push(colorId)
    }
    
    // 更新选中的颜色十六进制值（显示第一个选中的）
    const firstColorItem = newColors.length > 0 ? this.data.colorOptions.find(c => c.id === newColors[0]) : null
    
    this.setData({ 
      'formData.color': newColors,
      selectedColorHex: firstColorItem ? firstColorItem.hex : ''
    })
  },

  toggleTag(e) {
    const matchId = e.currentTarget.dataset.id
    const currentTags = this.data.formData.tags
    let newTags = []
    
    // 检查是否已选中
    let found = false
    for (let i = 0; i < currentTags.length; i++) {
      if (currentTags[i] === matchId) {
        found = true
      } else {
        newTags.push(currentTags[i])
      }
    }
    
    // 如果没找到就添加
    if (!found) {
      newTags.push(matchId)
    }
    
    this.setData({ 'formData.tags': newTags })
  },

  onTagInput(e) {
    this.setData({ customTag: e.detail.value })
  },

  async addCustomTag() {
    const customTag = this.data.customTag.trim()
    if (!customTag) {
      wx.showToast({ title: '请输入标签', icon: 'none' })
      return
    }
    
    try {
      const result = await cloud.tags.add({
        name: customTag,
        color: '#' + Math.random().toString(16).slice(2, 8)
      })
      
      // 新标签添加 matchId（自定义标签用 _id 即 result.id）
      const newTag = {
        ...result,
        type: 'custom',
        matchId: result.id
      }
      const tags = [...this.data.formData.tags, newTag.matchId]
      
      this.setData({
        allTags: [...this.data.allTags, newTag],
        'formData.tags': tags,
        customTag: ''
      })
    } catch (err) {
      wx.showToast({ title: err.message || '添加失败', icon: 'none' })
    }
  },

  onCancel() {
    this.goBack()
  },

  goBack() {
    // 清理编辑状态
    wx.removeStorageSync('editClothesId')
    
    const { isEdit, oldImageId, uploadedImageId, formData } = this.data
    const currentImage = formData.image
    
    // 编辑模式下：删除未使用的新图片
    if (isEdit && oldImageId && currentImage && 
        currentImage.startsWith('cloud://') && currentImage !== oldImageId) {
      wx.cloud.deleteFile({
        fileList: [currentImage],
        success: () => {
          console.log('未使用的新图片已删除:', currentImage)
        },
        fail: (err) => {
          console.error('删除未使用图片失败:', err)
        }
      })
    }
    
    // 新增模式下：删除上传但未使用的图片
    if (!isEdit && uploadedImageId && currentImage === uploadedImageId) {
      wx.cloud.deleteFile({
        fileList: [uploadedImageId],
        success: () => {
          console.log('新增未使用的图片已删除:', uploadedImageId)
        },
        fail: (err) => {
          console.error('删除未使用图片失败:', err)
        }
      })
    }
    
    wx.navigateBack()
  },

  async submitForm() {
    const { formData, isEdit, editId } = this.data
    
    // 必填项检查
    if (!formData.image) {
      wx.showToast({ title: '请上传照片', icon: 'none' })
      return
    }
    if (!formData.name) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    if (!formData.category) {
      wx.showToast({ title: '请选择衣服类型', icon: 'none' })
      return
    }
    if (!formData.gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' })
      return
    }
    if (!formData.season || formData.season.length === 0) {
      wx.showToast({ title: '请选择适合季节', icon: 'none' })
      return
    }
    if (!formData.size) {
      wx.showToast({ title: '请选择尺码', icon: 'none' })
      return
    }
    try {
      if (isEdit) {
        // 编辑模式：更新现有数据
        await cloud.clothes.update(editId, {
          ...formData,
          sizeUnit: this.data.sizeUnit,
          categoryText: this.getCategoryText(formData.category),
          genderText: this.getGenderText(formData.gender)
        })
        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        // 新增模式
        await cloud.clothes.add({
          ...formData,
          sizeUnit: this.data.sizeUnit,
          categoryText: this.getCategoryText(formData.category),
          genderText: this.getGenderText(formData.gender)
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }
      
      // 保存成功后重置表单状态
      const firstChild = this.data.children[0]
      this.setData({
        isEdit: false,
        editId: '',
        oldImageId: '',
        uploadedImageId: '',
        customTag: '',
        sizeUnit: 'cm',
        formData: {
          name: '',
          category: '',
          gender: '',
          season: [],
          size: '',
          color: [],  // 改为空数组
          tags: [],
          image: '',
          childId: firstChild ? (firstChild._id || firstChild.id) : ''
        },
        selectedChildName: firstChild ? firstChild.name : '',
        selectedColorHex: ''
      })
      
      setTimeout(() => {
        // 返回衣橱页面
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
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
