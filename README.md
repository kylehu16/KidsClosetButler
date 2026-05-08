# 儿童衣橱管家

智能管理宝贝的每一件衣物 - 微信小程序

## 项目结构

```
miniprogram/
├── app.js, app.json, app.wxss       # 小程序入口
├── project.config.json               # 项目配置
├── sitemap.json                      # SEO配置
├── components/                       # 组件
│   └── tab-bar/                      # 自定义底部导航栏
├── pages/                            # 页面
│   ├── wardrobe/                     # 衣橱页面
│   ├── outfit/                      # 穿搭推荐页面
│   ├── add/                         # 添加衣物页面
│   ├── statistics/                  # 统计页面
│   └── profile/                     # 个人中心页面
└── assets/                           # 资源
    └── icons/                        # 图标
```

## 功能特性

| 页面 | 功能 |
|------|------|
| 衣橱 | 分类筛选、统计卡片、衣物网格展示 |
| 穿搭 | AI推荐模式、天气/温度/场合选择、穿搭保存 |
| 添加 | 拍照上传、表单填写（类型/性别/季节/尺码/颜色/标签） |
| 统计 | 分类统计、热门/沉睡榜单、穿搭趋势图 |
| 我的 | 宝贝管理（添加/编辑/删除）、菜单设置 |

## 使用方式

1. 打开微信开发者工具
2. 点击"导入项目"
3. 选择 `miniprogram` 文件夹
4. 填写 AppID（测试号或正式ID）
5. 点击"导入"即可运行

## 设计规范

- **主题色渐变**：`#FB64B6` → `#C27AFF`（粉色到紫色）
- **成功/激活色**：`#00A63E`（绿色）
- **AI强调色**：`#AD46FF`（紫色）
- **字体**：系统默认字体

## 数据存储

使用微信本地存储（`wx.setStorageSync`）：
- `children` - 宝贝信息
- `clothes` - 衣物数据
- `outfits` - 穿搭记录

## 图标资源

TabBar 图标需放入 `assets/icons/` 目录：
- wardrobe.png / wardrobe_active.png
- outfit.png / outfit_active.png
- add.png / add_active.png
- stats.png / stats_active.png
- profile.png / profile_active.png

（图标尺寸：48x48px）