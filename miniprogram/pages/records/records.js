const cloud = require('../../utils/cloud')
const app = getApp();

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    selectedChildId: null,
    children: [],
    stats: {
      days: 0,
      wears: 0,
      avgPerDay: 0
    },
    records: [],
    filteredRecords: []
  },

  async onLoad() {
    // 获取当前年月
    const now = new Date();
    try {
      // 获取宝贝列表
      const children = await cloud.children.get()
      this.setData({
        children: children || [],
        currentYear: now.getFullYear(),
        currentMonth: now.getMonth() + 1,
        filteredRecords: []
      })
    } catch (err) {
      console.error('获取宝贝列表失败:', err)
      this.setData({
        currentYear: now.getFullYear(),
        currentMonth: now.getMonth() + 1,
        filteredRecords: []
      })
    }
  },

  async selectChild(e) {
    const id = e.currentTarget.dataset.id;
    const newSelectedId = this.data.selectedChildId === id ? null : id;
    this.setData({
      selectedChildId: newSelectedId
    })
    this.loadRecords()
  },

  selectAll() {
    this.setData({
      selectedChildId: null
    })
    this.loadRecords()
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    this.setData({
      currentYear,
      currentMonth
    })
    this.loadRecords()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    this.setData({
      currentYear,
      currentMonth
    })
    this.loadRecords()
  },

  async loadRecords() {
    try {
      const { selectedChildId, currentYear, currentMonth } = this.data
      
      // 构建查询条件
      const query = {}
      if (selectedChildId) {
        query.childId = selectedChildId
      }
      
      // 获取穿衣记录
      const records = await cloud.wearLogs.get(query)
      
      // 过滤当前月份的记录
      const filtered = (records || []).filter(r => {
        if (!r.date) return false
        const d = new Date(r.date)
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
      })
      
      // 统计数据
      const uniqueDays = new Set(filtered.map(r => r.date))
      const stats = {
        days: uniqueDays.size,
        wears: filtered.length,
        avgPerDay: uniqueDays.size > 0 ? (filtered.length / uniqueDays.size).toFixed(1) : 0
      }
      
      this.setData({
        records: records || [],
        filteredRecords: filtered,
        stats
      })
    } catch (err) {
      console.error('加载穿衣记录失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
