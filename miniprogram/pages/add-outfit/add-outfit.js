const cloud = require('../../utils/cloud')
const app = getApp()

Page({
  data: {
    isEdit: false,
    editId: '',
    outfitName: '',
    selectedTags: [],
    selectedClothes: [],
    children: [],
    selectedChildIds: [],
    selectedChildName: '',
    allTags: [],       // 所有标签（预设+自定义），统一格式 { _id, id, name, type }
    clothesList: [],
    filteredClothes: [],
    searchKey: '',
    categoryFilter: 'all',
    categoryOptions: [
      { id: 'all', name: '全部' },
      { id: 'top', name: '上衣' },
      { id: 'pants', name: '裤子' },
      { id: 'skirt', name: '裙子' },
      { id: 'jacket', name: '外套' },
      { id: 'shoes', name: '鞋子' }
    ],
    customTag: ''
  },

  onLoad(options) {
    // 读取全局变量中的预选衣物和儿童信息
    const preselectedClothes = app.globalData.preselectedClothes || []
    const preselectedChildIds = app.globalData.preselectedChildIds || []
    const preselectedChildName = app.globalData.preselectedChildName || ''
    
    // 清空全局变量，避免重复加载
    app.globalData.preselectedClothes = null
    app.globalData.preselectedChildIds = null
    app.globalData.preselectedChildName = null
    
    this.preselectedClothes = preselectedClothes
    this.preselectedChildIds = preselectedChildIds
    this.preselectedChildName = preselectedChildName
    
    this.loadChildren(() => {
      // 如果预选儿童信息不存在，使用默认逻辑（选中第一个儿童）
      if (preselectedChildIds.length === 0 && this.data.children.length > 0) {
        this.setData({
          selectedChildIds: [this.data.children[0].id],
          selectedChildName: this.data.children[0].name
        })
      } else if (preselectedChildIds.length > 0) {
        // 使用预选的儿童信息
        this.setData({
          selectedChildIds: preselectedChildIds,
          selectedChildName: preselectedChildName
        })
      }
      this.loadClothes()
      this.loadTags()
      if (options.id) {
        this.loadEditData(options.id)
      }
    })
  },

  async loadChildren(callback) {
    try {
      const children = await cloud.children.get()
      
      // 处理儿童数据：计算年龄，格式化身高和脚长
      const now = new Date()
      const processedChildren = (children || []).map(child => {
        const avatar = child.gender === 1 ? '👦' : '👧'
        
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
          id: child._id || child.id,
          avatar,
          age,
          heightText,
          footLengthText
        }
      })
      
      this.setData({ children: processedChildren }, () => {
        if (processedChildren && processedChildren.length > 0 && !this.data.isEdit) {
          this.setData({
            selectedChildIds: [processedChildren[0].id],
            selectedChildName: processedChildren[0].name
          })
        }
        if (callback) callback()
      })
    } catch (err) {
      console.error('获取宝贝列表失败:', err)
    }
  },

  async loadClothes() {
    try {
      const clothes = await cloud.clothes.get()
      const categoryTextMap = {
        top: '上衣',
        pants: '裤子',
        skirt: '裙子',
        jacket: '外套',
        shoes: '鞋子'
      }
      const processed = (clothes || []).map(item => ({
        ...item,
        id: item._id || item.id,
        categoryText: item.categoryText || categoryTextMap[item.category] || item.category,
        sizeUnit: item.category === 'shoes' ? 'mm' : 'cm'
      }))
      
      // 如果有预选衣物，过滤掉无效的ID
      if (this.preselectedClothes && this.preselectedClothes.length > 0) {
        const validClothesIds = processed.map(c => c.id)
        const validPreselected = this.preselectedClothes.filter(id => validClothesIds.includes(id))
        this.setData({ 
          clothesList: processed,
          filteredClothes: processed,
          selectedClothes: validPreselected
        }, () => {
          this.applyFilter()
          this.preselectedClothes = null // 清空临时变量
        })
      } else {
        this.setData({ 
          clothesList: processed,
          filteredClothes: processed
        })
      }
    } catch (err) {
      console.error('获取衣物列表失败:', err)
    }
  },

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
      console.error('获取标签列表失败:', err)
    }
  },

  async loadEditData(id) {
    try {
      const outfit = await cloud.outfits.getById(id)
      if (outfit) {
        const children = this.data.children
        const child = children.find(c => 
          String(c.id) === String(outfit.childId) || 
          String(c._id) === String(outfit.childId)
        )
        
        this.setData({
          isEdit: true,
          editId: id,
          outfitName: outfit.name || '',
          selectedTags: outfit.tags || [],
          selectedClothes: outfit.items || [],
          selectedChildIds: outfit.childIds || (child ? [child._id || child.id] : []),
          selectedChildName: outfit.childName || (child ? child.name : '')
        })
      }
    } catch (err) {
      console.error('加载穿搭数据失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  selectChild(e) {
    const id = e.currentTarget.dataset.id
    const { selectedChildIds, children } = this.data
    const idx = selectedChildIds.indexOf(id)
    let newIds = [...selectedChildIds]
    
    // 当只有一个儿童时，必须选中
    if (children.length === 1 && idx > -1) {
      wx.showToast({ title: '至少需要选择一个儿童', icon: 'none' })
      return
    }
    
    if (idx > -1) {
      newIds.splice(idx, 1)
    } else {
      newIds.push(id)
    }
    // 多选时显示所有选中儿童的名称
    const selectedChildren = this.data.children.filter(c => newIds.includes(c.id))
    const selectedChildName = selectedChildren.map(c => c.name).join('、')
    this.setData({
      selectedChildIds: newIds,
      selectedChildName: selectedChildName || ''
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKey: e.detail.value })
    this.applyFilter()
  },

  // 选择分类
  selectCategory(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ categoryFilter: id })
    this.applyFilter()
  },

  // 应用筛选
  applyFilter() {
    const { clothesList, searchKey, categoryFilter, selectedClothes } = this.data
    let filtered = [...clothesList]

    // 按分类筛选
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }

    // 按搜索关键词筛选
    if (searchKey.trim()) {
      const key = searchKey.trim().toLowerCase()
      filtered = filtered.filter(item => 
        item.name && item.name.toLowerCase().includes(key)
      )
    }

    // 被选中的衣物排在前面
    filtered.sort((a, b) => {
      const aSelected = selectedClothes.includes(a.id) ? 1 : 0
      const bSelected = selectedClothes.includes(b.id) ? 1 : 0
      return bSelected - aSelected
    })

    this.setData({ filteredClothes: filtered })
  },

  onOutfitNameInput(e) {
    this.setData({ outfitName: e.detail.value })
  },

  toggleTag(e) {
    const id = e.currentTarget.dataset.id
    let tags = [...this.data.selectedTags]
    const idx = tags.indexOf(id)
    if (idx > -1) {
      tags.splice(idx, 1)
    } else {
      tags.push(id)
    }
    this.setData({ selectedTags: tags })
  },

  onTagInput(e) {
    this.setData({ customTag: e.detail.value })
  },

  async addCustomTag() {
    const name = this.data.customTag.trim()
    if (!name) return
    try {
      const result = await cloud.tags.add({ name, color: '#' + Math.random().toString(16).slice(2, 8) })
      const newTag = result.data
      const tagWithMatchId = {
        ...newTag,
        type: 'custom',
        matchId: newTag.id  // 自定义标签用 _id（即 newTag.id）作为 matchId
      }
      this.setData({
        allTags: [...this.data.allTags, tagWithMatchId],
        selectedTags: [...this.data.selectedTags, tagWithMatchId.matchId],
        customTag: ''
      })
    } catch (err) {
      wx.showToast({ title: err.message || '添加失败', icon: 'none' })
    }
  },

  toggleClothes(e) {
    const id = e.currentTarget.dataset.id
    let selected = [...this.data.selectedClothes]
    const idx = selected.indexOf(id)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(id)
    }
    this.setData({ selectedClothes: selected }, () => {
      this.applyFilter() // 重新排序，选中的排在前面
    })
  },

  goBack() {
    wx.navigateBack()
  },

  async saveOutfit() {
    const { isEdit, editId, outfitName, selectedTags, selectedClothes, selectedChildIds, selectedChildName } = this.data

    if (selectedClothes.length === 0) {
      wx.showToast({ title: '请选择衣物', icon: 'none' })
      return
    }

    // 检查是否有儿童选中
    if (selectedChildIds.length === 0) {
      wx.showToast({ title: '请选择儿童', icon: 'none' })
      return
    }

    try {
      if (isEdit) {
        await cloud.outfits.update(editId, {
          childIds: selectedChildIds,
          childName: selectedChildName,
          name: outfitName || '未命名穿搭',
          tags: selectedTags,
          items: selectedClothes
        })
        wx.showToast({ title: '穿搭已更新', icon: 'success' })
      } else {
        await cloud.outfits.add({
          childIds: selectedChildIds,
          childName: selectedChildName,
          name: outfitName || '未命名穿搭',
          tags: selectedTags,
          items: selectedClothes
        })
        wx.showToast({ title: '穿搭已保存', icon: 'success' })
      }

      setTimeout(() => { wx.navigateBack() }, 1500)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  }
})
