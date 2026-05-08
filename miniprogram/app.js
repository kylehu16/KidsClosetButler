App({
  globalData: {
    userInfo: null,
    editClothesId: null
  },
  
  onLaunch() {
    this.initData()
  },
  
  initData() {
    const children = wx.getStorageSync('children') || []
    const clothes = wx.getStorageSync('clothes') || []
    
    if (children.length === 0) {
      wx.setStorageSync('children', [
        { id: '1', name: '小宝贝', age: 5, height: '110cm', gender: 'girl' },
        { id: '2', name: '小淘气', age: 3, height: '95cm', gender: 'boy' }
      ])
    }
    
    if (clothes.length === 0) {
      wx.setStorageSync('clothes', [
        { id: '1', name: '白色T恤', category: 'top', categoryText: '上衣', gender: 'girl', season: ['spring', 'summer'], size: '110', color: 'white', tags: ['basic', 'versatile'], wearCount: 28, image: '' },
        { id: '2', name: '蓝色牛仔裤', category: 'pants', categoryText: '裤子', gender: 'girl', season: ['spring', 'autumn'], size: '110', color: 'blue', tags: ['casual'], wearCount: 25, image: '' },
        { id: '3', name: '运动鞋', category: 'shoes', categoryText: '鞋子', gender: 'girl', season: ['spring', 'summer', 'autumn'], size: '30', color: 'white', tags: ['sports'], wearCount: 22, image: '' },
        { id: '4', name: '红色连衣裙', category: 'skirt', categoryText: '裙子', gender: 'girl', season: ['spring', 'summer'], size: '110', color: 'red', tags: ['formal', 'party'], wearCount: 18, image: '' }
      ])
    }
  }
})