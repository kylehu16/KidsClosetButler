const app = getApp();

Page({
  data: {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    selectedChildId: null,
    children: [
      { id: 1, name: '小宝贝' },
      { id: 2, name: '小淘气' }
    ],
    stats: {
      days: 4,
      wears: 10,
      avgPerDay: 2.5
    },
    records: [
      {
        date: '2026-05-27',
        day: 27,
        weekday: '周一',
        dateStr: '4月27日',
        weather: '晴天',
        temp: 22,
        childId: 1,
        childName: '小宝贝',
        items: [
          { id: 1, name: '白色T恤', category: '上衣', image: '/assets/images/clothing-1.png' },
          { id: 2, name: '蓝色牛仔裤', category: '裤子', image: '/assets/images/clothing-2.png' },
          { id: 3, name: '运动鞋', category: '鞋子', image: '/assets/images/clothing-3.png' }
        ]
      },
      {
        date: '2026-05-26',
        day: 26,
        weekday: '周日',
        dateStr: '4月26日',
        weather: '多云',
        temp: 20,
        childId: 1,
        childName: '小宝贝',
        items: [
          { id: 4, name: '红色连衣裙', category: '裙子', image: '/assets/images/clothing-4.png' },
          { id: 5, name: '小白鞋', category: '鞋子', image: '/assets/images/clothing-5.png' }
        ]
      },
      {
        date: '2026-05-25',
        day: 25,
        weekday: '周六',
        dateStr: '4月25日',
        weather: '晴天',
        temp: 24,
        childId: 2,
        childName: '小淘气',
        items: [
          { id: 6, name: '粉色卫衣', category: '上衣', image: '/assets/images/clothing-6.png' },
          { id: 7, name: '黑色短裤', category: '裤子', image: '/assets/images/clothing-7.png' },
          { id: 8, name: '运动鞋', category: '鞋子', image: '/assets/images/clothing-8.png' }
        ]
      },
      {
        date: '2026-05-24',
        day: 24,
        weekday: '周五',
        dateStr: '4月24日',
        weather: '雨天',
        temp: 18,
        childId: 1,
        childName: '小宝贝',
        items: [
          { id: 9, name: '白色T恤', category: '上衣', image: '/assets/images/clothing-1.png' },
          { id: 10, name: '运动裤', category: '裤子', image: '/assets/images/clothing-9.png' }
        ]
      }
    ],
    filteredRecords: []
  },

  onLoad() {
    // 获取当前年月
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      filteredRecords: this.data.records
    });
  },

  selectChild(e) {
    const id = e.currentTarget.dataset.id;
    const newSelectedId = this.data.selectedChildId === id ? null : id;
    const filteredRecords = newSelectedId 
      ? this.data.records.filter(r => r.childId === newSelectedId)
      : this.data.records;
    this.setData({
      selectedChildId: newSelectedId,
      filteredRecords
    });
  },

  selectAll() {
    this.setData({
      selectedChildId: null,
      filteredRecords: this.data.records
    });
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
    });
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
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
