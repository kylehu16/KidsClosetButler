# 儿童衣橱管家

智能管理宝贝的每一件衣物 - 微信小程序

## 项目简介

儿童衣橱管家是一款帮助家长智能管理儿童衣物的微信小程序。支持衣物添加、分类管理、穿搭推荐、使用统计等功能。

## 项目结构

```
KidsClosetButler/
├── miniprogram/                          # 小程序前端
│   ├── app.js, app.json, app.wxss      # 小程序入口
│   ├── project.config.json               # 项目配置
│   ├── sitemap.json                      # SEO配置
│   ├── components/                       # 组件
│   │   └── tab-bar/                      # 自定义底部导航栏
│   ├── pages/                            # 页面
│   │   ├── wardrobe/                     # 衣橱页面
│   │   ├── outfit/                      # 穿搭推荐页面
│   │   ├── outfit-detail/               # 穿搭详情页面
│   │   ├── add/                         # 添加衣物页面
│   │   ├── add-outfit/                  # 添加穿搭页面
│   │   ├── clothes-detail/              # 衣物详情页面
│   │   ├── statistics/                  # 统计页面
│   │   ├── profile/                     # 个人中心页面
│   │   ├── records/                     # 穿衣记录页面
│   │   ├── child-edit/                  # 宝贝编辑页面
│   │   └── tag-manage/                 # 标签管理页面
│   └── assets/                           # 资源
│       └── icons/                        # 图标
│
└── cloudfunctions/                       # 云函数后端
    ├── getPresetData/                    # 获取预设数据
    ├── getStatistics/                    # 获取统计数据
    ├── getWeather/                      # 获取天气信息
    ├── manageChildren/                   # 管理宝贝信息
    ├── manageClothes/                   # 管理衣物数据
    ├── manageOutfits/                   # 管理穿搭记录
    ├── manageTags/                      # 管理标签
    └── recordWearLog/                   # 记录穿衣日志
```

## 技术栈

- **前端**：原生微信小程序（WXML + WXSS + JavaScript）
- **后端**：CloudBase 云开发（云函数 + 云数据库）
- **数据存储**：CloudBase 数据库 + 本地缓存

## 功能特性

### 衣橱管理
- 衣物分类筛选（全部/上衣/裤子/裙子/外套/鞋子）
- 衣物搜索功能
- 衣物网格展示
- 衣物详情查看
- 衣物添加/编辑/删除
- 记录穿衣功能

### 穿搭推荐
- AI智能推荐模式
- 天气选择（晴天/多云/雨天/大风/下雪/雾霾）
- 温度调节滑块
- 场合选择（休闲/正式/运动/日常/聚会）
- 宝贝选择器
- 穿搭保存与查看

### 统计功能
- 衣橱总览（总数/已穿/闲置）
- 分类统计图表
- 热门穿搭 TOP5 榜单（点击跳转详情）
- 沉睡榜单（30天未穿，点击跳转详情）
- 本周穿搭趋势图

### 个人中心
- 用户信息管理（头像/昵称）
- 宝贝管理（添加/编辑/删除）
- 标签管理（自定义标签的增删改）
- 穿衣记录查看
- 分享功能（分享给朋友/分享到朋友圈）
- 版本号自动获取

## 云函数说明

| 函数名 | 功能描述 |
|--------|----------|
| getPresetData | 获取预设数据（字典、标签） |
| getStatistics | 获取统计数据 |
| getWeather | 获取天气信息 |
| manageChildren | 管理宝贝信息（增删改查） |
| manageClothes | 管理衣物数据（增删改查、更新穿着次数） |
| manageOutfits | 管理穿搭记录（增删改查） |
| manageTags | 管理标签（增删改查、使用次数统计） |
| recordWearLog | 记录穿衣日志 |

## 数据模型

### 宝贝 (Child)
存储集合：`children`
```javascript
{
  _id: string,           // 文档ID（系统自动生成）
  name: string,          // 宝贝名称
  birthDate: string,     // 出生日期（YYYY-MM-DD）
  height: number,        // 身高（厘米，纯数字）
  gender: number,        // 性别（1-男，0-女）
  footLength: number,    // 脚长（毫米，纯数字，可选）
  _openid: string       // 用户OpenID（系统自动添加）
}
```

### 衣物 (Clothes)
存储集合：`clothes`
```javascript
{
  _id: string,           // 文档ID（系统自动生成）
  name: string,          // 衣物名称
  category: string,      // 分类（top/pants/skirt/jacket/shoes）
  gender: string,        // 适用性别（boy/girl）
  season: string[],      // 适合季节（['spring'/'summer'/'autumn'/'winter'/'all']）
  size: string,          // 尺码（如："110"）
  sizeUnit: string,      // 尺码单位（'cm'/'mm'）
  color: string[],       // 颜色ID数组（如：['red', 'blue']）
  tags: string[],        // 标签ID数组
  image: string,         // 图片地址（cloud:// 或 https://）
  childId: string,      // 所属宝贝ID
  wearCount: number,     // 穿着次数
  _openid: string,      // 用户OpenID
  createTime: string,    // 创建时间（ISO格式）
  updateTime: string     // 更新时间（ISO格式）
}
```

### 穿搭 (Outfit)
存储集合：`outfits`
```javascript
{
  _id: string,           // 文档ID（系统自动生成）
  name: string,          // 穿搭名称（可选）
  childId: string[],    // 宝贝ID数组（支持多个宝贝）
  items: string[],      // 衣物ID数组
  weather: string,      // 天气（sunny/cloudy/rainy/windy/snowy/foggy）
  occasion: string,     // 场合（casual/formal/sports/daily/party）
  tags: string[],       // 标签ID数组
  _openid: string,      // 用户OpenID
  createTime: string,    // 创建时间（ISO格式）
  updateTime: string     // 更新时间（ISO格式）
}
```

### 标签 (Tag)
存储集合：`tags`
```javascript
{
  _id: string,           // 文档ID（系统自动生成）
  name: string,          // 标签名称
  type: string,         // 类型（preset/custom）
  color: string,         // 标签颜色（十六进制，如："#FF5733"）
  isDeleted: boolean,   // 是否删除（软删除标记）
  _openid: string       // 用户OpenID（仅自定义标签）
}
```

**注意**：`usageCount`（使用次数）是在查询时动态计算的，不存储在数据库中。

## 安装部署

### 前置条件
- 微信开发者工具
- CloudBase 账号
- 小程序 AppID

### 部署步骤

1. **导入项目**
   - 打开微信开发者工具
   - 点击"导入项目"
   - 选择 `miniprogram` 文件夹
   - 填写 AppID
   - 点击"导入"

2. **配置云开发**
   - 在微信开发者工具中开通云开发
   - 创建 CloudBase 环境
   - 记录环境 ID

3. **部署云函数**
   - 右键点击每个云函数文件夹
   - 选择"上传并部署：云端安装依赖"
   - 等待部署完成

4. **配置项目**
   - 修改 `miniprogram/project.config.json` 中的云开发环境 ID
   - 修改 `cloudfunctions/` 中各云函数的环境配置

5. **运行项目**
   - 编译运行
   - 预览或真机调试

## 设计规范

### 颜色规范
- **主题色渐变**：`#FB64B6` → `#C27AFF`（粉色到紫色）
- **成功/激活色**：`#00A63E`（绿色）
- **AI强调色**：`#AD46FF`（紫色）
- **文字主色**：`#1F2937`
- **文字辅色**：`#6A7282`
- **边框颜色**：`#F3F4F6`

### 样式规范
- **卡片圆角**：`24rpx`
- **按钮圆角**：`44rpx`
- **卡片阴影**：`0 4rpx 20rpx rgba(0, 0, 0, 0.05)`
- **字体**：系统默认字体

### 图标资源
TabBar 图标需放入 `miniprogram/assets/icons/` 目录：
- wardrobe.png / wardrobe_active.png
- outfit.png / outfit_active.png
- add.png / add_active.png
- stats.png / stats_active.png
- profile.png / profile_active.png

（图标尺寸：48x48px PNG格式）

## 版本历史

### v1.0.0 (2026-05)
- ✅ 初始版本发布
- ✅ 基础衣物管理功能
- ✅ 穿搭推荐功能
- ✅ 统计功能
- ✅ 标签管理功能
- ✅ 分享功能
- ✅ 版本号自动获取

## 注意事项

1. **隐私保护**
   - 本项目中不包含任何私密信息
   - 部署时请自行配置 AppID 和环境 ID
   - 不要将敏感信息提交到代码仓库

2. **云函数部署**
   - 部署云函数前请确保已安装依赖
   - 部分云函数需要配置环境变量

3. **数据存储**
   - 项目使用 CloudBase 云数据库
   - 本地缓存仅用于临时存储

4. **分享功能**
   - 分享功能位于衣橱页面
   - 分享给朋友和分享到朋友圈均通过右上角菜单实现

## 开源协议

MIT License

## 联系方式

如有问题或建议，欢迎反馈。