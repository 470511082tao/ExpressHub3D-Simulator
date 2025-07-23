# ExpressHub3D-Simulator

无人驿站3D仿真系统 - 快递驿站3D建模与仿真平台

## 项目结构

```
ExpressHub3D-Simulator/
├── eh3D-web-client/        # Web前端客户端
│   ├── src/               # 源代码
│   │   ├── components/    # React组件
│   │   ├── lib/          # 工具库和状态管理
│   │   └── main.tsx      # 入口文件
│   ├── package.json      # 前端依赖配置
│   └── vite.config.ts    # Vite构建配置
└── eh3D-manager-service/   # 后端管理服务
```

## 功能特性

### 3D场景编辑器
- 🎯 **直观的3D建模**：拖拽式快递柜、货架等设备摆放
- 🎮 **多视角控制**：支持轨道控制和第一人称视角
- 📐 **精确定位**：网格对齐、坐标显示、尺寸控制
- 🎨 **实时预览**：所见即所得的3D场景设计

### 智能对象管理
- 🔍 **全局搜索**：快速查找和定位场景中的任意对象
- 📋 **属性面板**：详细的对象属性编辑和格口可视化
- 🏷️ **格口模板**：快递柜和货架的格口布局可视化
- 📊 **统计分析**：设备利用率和空间分析

### 资产管理系统
- 📦 **模型库管理**：支持GLB格式3D模型上传和管理
- 🗂️ **分类管理**：快递柜、货架、建筑等分类管理
- 🎛️ **格口配置**：可视化格口模板配置和禁用管理
- 💾 **本地存储**：基于IndexedDB的离线数据存储

### 项目管理
- 💼 **多项目支持**：创建、编辑、复制、删除项目
- 💾 **自动保存**：实时保存编辑状态
- ↩️ **历史记录**：支持撤销/重做操作
- 📸 **快照导出**：生成场景截图和项目缩略图

## 技术栈

### 前端技术
- **React 18** - 现代化UI框架
- **TypeScript** - 类型安全的JavaScript
- **Three.js + React Three Fiber** - 3D渲染引擎
- **React Three Drei** - Three.js辅助工具库
- **Zustand** - 轻量级状态管理
- **Tailwind CSS** - 原子化CSS框架
- **Vite** - 快速构建工具

### 存储方案
- **IndexedDB** - 浏览器本地数据库
- **LocalStorage** - 项目配置持久化

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
cd eh3D-web-client
npm install
```

### 开发模式
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 预览构建
```bash
npm run preview
```

## 使用指南

### 1. 创建项目
1. 点击"新建项目"按钮
2. 输入项目名称和场地尺寸
3. 选择项目模板（空场地/标准驿站）

### 2. 添加设备
1. 从左侧物品库选择设备类型
2. 点击设备进入预览模式
3. 在3D场景中点击确定位置

### 3. 编辑对象
1. 点击选中场景中的对象
2. 在右侧属性面板编辑参数
3. 快递柜/货架可查看格口可视化

### 4. 全局搜索
1. 使用顶部搜索框查找对象
2. 支持按名称、ID、类型搜索
3. 点击搜索结果快速定位

### 5. 视角控制
- **轨道控制**：鼠标拖拽旋转，滚轮缩放
- **FPS模式**：WASD移动，鼠标控制视角
- **网格显示**：辅助对象对齐和定位

## 项目特色

### 格口可视化系统
- 🎯 **智能识别**：自动识别快递柜和货架类型
- 🎨 **可视化布局**：直观显示格口数量和分布
- ❌ **禁用支持**：灰色半透明显示禁用格口
- 📊 **统计信息**：显示总格口数、可用数、禁用数

### 资产管理集成
- 📂 **分类管理**：支持自定义设备分类
- 🏷️ **模板配置**：可视化格口模板编辑
- 💾 **离线存储**：完全本地化的数据管理
- 🔄 **实时同步**：前端与资产管理数据同步

## 开发文档

### 项目结构说明
```
eh3D-web-client/src/
├── components/
│   ├── SceneEditor.tsx      # 主场景编辑器
│   ├── Scene3D.tsx          # 3D场景容器
│   ├── SceneObject.tsx      # 3D对象组件
│   ├── Toolbar.tsx          # 顶部工具栏
│   ├── ObjectPalette.tsx    # 左侧物品库
│   ├── PropertiesPanel.tsx  # 右侧属性面板
│   ├── AdminPanel.tsx       # 资产管理面板
│   └── ...
├── lib/
│   ├── state/
│   │   └── projectStore.ts  # 项目状态管理
│   └── storage/
│       └── indexedDB.ts     # 数据存储
└── main.tsx                 # 应用入口
```

### 状态管理
- 使用Zustand进行全局状态管理
- 支持项目持久化存储
- 历史记录和撤销/重做功能

### 3D渲染
- 基于Three.js的高性能3D渲染
- 支持GLB模型加载和显示
- 实时阴影和光照效果

## 贡献指南

1. Fork本仓库
2. 创建功能分支：`git checkout -b feature/新功能`
3. 提交更改：`git commit -m '添加新功能'`
4. 推送分支：`git push origin feature/新功能`
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 项目地址：[https://github.com/470511082tao/ExpressHub3D-Simulator](https://github.com/470511082tao/ExpressHub3D-Simulator)
- 问题反馈：[Issues](https://github.com/470511082tao/ExpressHub3D-Simulator/issues)

---

**ExpressHub3D-Simulator** - 让快递驿站3D建模变得简单高效！ 🚀 