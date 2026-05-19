Component({
  properties: {
    currentIndex: {
      type: Number,
      value: 0
    },
    editMode: {
      type: Boolean,
      value: false
    }
  },
  
  data: {
    selected: 0,
    tabList: [
      { id: 0, icon: 'wardrobe', text: '衣橱', path: '/pages/wardrobe/wardrobe' },
      { id: 1, icon: 'outfit', text: '穿搭', path: '/pages/outfit/outfit' },
      { id: 2, icon: 'stats', text: '统计', path: '/pages/statistics/statistics' },
      { id: 3, icon: 'profile', text: '我的', path: '/pages/profile/profile' }
    ]
  },
  
  lifetimes: {
    attached() {
      this.setData({ selected: this.properties.currentIndex })
    }
  },
  
  observers: {
    'currentIndex': function(index) {
      this.setData({ selected: index })
    }
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url = this.data.tabList[index].path
      wx.switchTab({ url })
    }
  }
})