const cloud = require('../../utils/cloud')

Page({
  data: {
    presetTags: [],
    customTags: [],
    showModal: false,
    modalType: 'add', // 'add' 或 'edit'
    tagName: '',
    editTagId: ''
  },

  onLoad() {
    this.loadTags()
  },

  onShow() {
    this.loadTags()
  },

  // 加载标签列表
  async loadTags() {
    try {
      wx.showLoading({ title: '加载中...' })
      const result = await cloud.tags.get()
      const tagsData = result || {}
      
      this.setData({
        presetTags: tagsData.preset || [],
        customTags: tagsData.custom || []
      })
    } catch (err) {
      console.error('加载标签失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 显示添加弹窗
  showAddModal() {
    this.setData({
      showModal: true,
      modalType: 'add',
      tagName: '',
      editTagId: ''
    })
  },

  // 显示编辑弹窗
  showEditModal(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    
    this.setData({
      showModal: true,
      modalType: 'edit',
      tagName: name,
      editTagId: id
    })
  },

  // 隐藏弹窗
  hideModal() {
    this.setData({
      showModal: false,
      tagName: '',
      editTagId: ''
    })
  },

  // 输入标签名称
  onTagNameInput(e) {
    this.setData({ tagName: e.detail.value })
  },

  // 确认添加/编辑标签
  async confirmTag() {
    const { modalType, tagName, editTagId } = this.data
    
    if (!tagName.trim()) {
      wx.showToast({ title: '请输入标签名称', icon: 'none' })
      return
    }
    
    try {
      wx.showLoading({ title: '处理中...' })
      
      if (modalType === 'add') {
        // 添加标签
        await cloud.tags.add({ name: tagName.trim() })
        wx.showToast({ title: '添加成功', icon: 'success' })
      } else {
        // 编辑标签
        await cloud.tags.update(editTagId, { name: tagName.trim() })
        wx.showToast({ title: '修改成功', icon: 'success' })
      }
      
      this.hideModal()
      this.loadTags()
    } catch (err) {
      console.error('操作失败:', err)
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 删除标签
  deleteTag(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除标签"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await cloud.tags.delete(id)
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadTags()
          } catch (err) {
            wx.hideLoading()
            console.error('删除失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  }
})
