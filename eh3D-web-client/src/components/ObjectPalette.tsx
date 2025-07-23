import React, { useState, useEffect, useMemo } from 'react'
import { Package, Layers, Building, Search, ChevronDown } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'
import { indexedDBStorage, ModelData } from '../lib/storage/indexedDB'

interface ObjectCategory {
  id: string
  name: string
  icon: React.ReactNode
  items: ObjectItem[]
}

interface ObjectItem {
  id: string
  name: string
  model: string
  preview: string
  dimensions: [number, number, number] // 长宽高
  metadata?: {
    capacity?: number
    layers?: number
    description?: string
    isAdminModel?: boolean
    adminModelId?: string
    fileContent?: string // 新增：用于存储GLB文件内容
    originalFileName?: string // 新增：用于存储原始文件名
    previewImageUrl?: string | null // 新增：预览图片URL
    isCached?: boolean // 新增：是否已缓存
  }
}

// 使用IndexedDB的ModelData接口
type AdminModel = ModelData

const ObjectPalette: React.FC = () => {
  const { startPreview, previewMode, cancelPreview } = useProjectStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['cabinets'])
  const [draggedItem, setDraggedItem] = useState<ObjectItem | null>(null)
  const [adminModels, setAdminModels] = useState<AdminModel[]>([])
  const [modelUrlCache, setModelUrlCache] = useState<Map<string, string>>(new Map())
  const [previewImageUrls, setPreviewImageUrls] = useState<Map<string, string>>(new Map())
  const [open, setOpen] = useState(false)
  const [fixedOpen, setFixedOpen] = useState(false)

  // 从IndexedDB加载管理后台上传的模型
  useEffect(() => {
    const loadAdminModels = async () => {
      try {
        await indexedDBStorage.init()
        const models = await indexedDBStorage.getAllModels()
        setAdminModels(models)
        console.log('ObjectPalette加载了', models.length, '个管理后台模型')
        
        // 预加载常用模型的Blob URL到缓存
        const newCache = new Map<string, string>()
        for (const model of models.slice(0, 5)) { // 只预加载前5个模型
          try {
            const blob = new Blob([model.fileContent], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)
            newCache.set(model.id, url)
            console.log('预加载模型URL缓存:', model.id, url)
          } catch (error) {
            console.error('预加载模型失败:', model.id, error)
          }
        }
        setModelUrlCache(newCache)
      } catch (error) {
        console.error('加载管理后台模型失败:', error)
        setAdminModels([])
          }
    }
    
    loadAdminModels()
  }, [])

  // 生成预览图片URL的useEffect
  useEffect(() => {
    const generatePreviewUrls = () => {
      const newPreviewUrls = new Map<string, string>()
      
      adminModels.forEach(model => {
        if (model.previewImage && model.previewImageType) {
          try {
            const blob = new Blob([model.previewImage], { type: model.previewImageType })
            const url = URL.createObjectURL(blob)
            newPreviewUrls.set(model.id, url)
            console.log('生成预览图片URL:', model.id, url)
          } catch (error) {
            console.error('生成预览图片URL失败:', model.id, error)
          }
        }
      })
      
      setPreviewImageUrls(newPreviewUrls)
    }

    generatePreviewUrls()

    // 清理函数
    return () => {
      // 清理缓存的Blob URL
      modelUrlCache.forEach(url => URL.revokeObjectURL(url))
      previewImageUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [adminModels])

  // 监听IndexedDB变化，实时更新物品库
  useEffect(() => {
    // 定期检查IndexedDB中的数据更新
    const interval = setInterval(async () => {
      try {
        const models = await indexedDBStorage.getAllModels()
        // 简单比较模型数量，避免深度比较的性能问题
        if (models.length !== adminModels.length) {
          setAdminModels(models)
          console.log('检测到模型数据变化，已更新物品库')
        }
      } catch (error) {
        console.error('检查模型数据更新失败:', error)
      }
    }, 2000) // 每2秒检查一次

    return () => {
      clearInterval(interval)
          }
  }, [adminModels.length])

  // 将管理后台上传的模型转换为物品库格式
  const convertAdminModelToObjectItem = (adminModel: AdminModel): ObjectItem => {
    const isCached = modelUrlCache.has(adminModel.id)
    const previewImageUrl = previewImageUrls.get(adminModel.id) || null
    
    console.log('convertAdminModelToObjectItem:', {
      modelId: adminModel.id,
      modelName: adminModel.name,
      hasFileContent: !!adminModel.fileContent,
      fileContentType: typeof adminModel.fileContent,
      isArrayBuffer: adminModel.fileContent instanceof ArrayBuffer,
      fileSize: adminModel.fileContent instanceof ArrayBuffer ? adminModel.fileContent.byteLength : 'N/A',
      hasPreviewImage: !!adminModel.previewImage,
      previewImageType: adminModel.previewImageType,
      isCached,
      previewImageUrl
    })
    
    const objectItem = {
      id: `admin_${adminModel.id}`,
      name: adminModel.name,
      model: adminModel.fileName, // 使用文件名作为模型标识
      preview: previewImageUrl || (isCached ? '⚡' : '📦'), // 优先使用预览图片，否则使用图标
      dimensions: adminModel.dimensions || [1, 1, 1],
          metadata: {
        description: adminModel.description,
        isAdminModel: true,
        adminModelId: adminModel.id, // 存储模型ID而不是Blob URL
        originalFileName: adminModel.metadata?.originalFileName || adminModel.fileName,
        previewImageUrl, // 存储预览图片URL
        isCached // 标记是否已缓存
      }
    }
    
    console.log('convertAdminModelToObjectItem结果:', {
      itemId: objectItem.id,
      adminModelId: objectItem.metadata.adminModelId,
      hasPreviewImageUrl: !!previewImageUrl,
      isCached: objectItem.metadata.isCached
    })
    
    return objectItem
  }

  // 获取分类图标
  const getCategoryIcon = (categoryId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'cabinets': <Package size={16} />,
      'shelves': <Layers size={16} />,
      'buildings': <Building size={16} />
    }
    return iconMap[categoryId] || <Package size={16} />
  }

  // 获取分类显示名称
  const getCategoryDisplayName = (categoryId: string) => {
    const nameMap: Record<string, string> = {
      'cabinets': '快递柜',
      'shelves': '货架',
      'buildings': '建筑构件'
    }
    return nameMap[categoryId] || categoryId
  }

  // 使用useMemo缓存categories的计算
  const categories: ObjectCategory[] = useMemo(() => {
    return adminModels
      .reduce((acc, model) => {
        // 查找是否已有该分类
        let category = acc.find(cat => cat.id === model.category)
        
        if (!category) {
          // 创建新分类
          category = {
            id: model.category,
            name: getCategoryDisplayName(model.category),
            icon: getCategoryIcon(model.category),
            items: []
          }
          acc.push(category)
        }
        
        // 添加模型到分类
        category.items.push(convertAdminModelToObjectItem(model))
        
        return acc
      }, [] as ObjectCategory[])
  }, [adminModels, modelUrlCache, previewImageUrls])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleDragStart = (item: ObjectItem) => {
    setDraggedItem(item)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleStartPreview = (item: ObjectItem) => {
    // 所有物品都是管理后台上传的模型
    const isAdminModel = true
    
    console.log('ObjectPalette预览模型:', {
      item: item,
      isAdminModel: isAdminModel,
      hasFileContent: !!item.metadata?.fileContent,
      fileContentType: typeof item.metadata?.fileContent,
      fileContentValue: item.metadata?.fileContent ? item.metadata.fileContent.substring(0, 100) : 'null'
    })
    
    // 确定对象类型
    let objectType: 'cabinet' | 'shelf' | 'building' = 'building'
    const adminModel = adminModels.find(model => `admin_${model.id}` === item.id)
    if (adminModel) {
      if (adminModel.category === 'cabinets') {
        objectType = 'cabinet'
      } else if (adminModel.category === 'shelves') {
        objectType = 'shelf'
      } else {
        objectType = 'building'
      }
    }

    // 构建预览对象的metadata，包含管理后台模型名称
    const previewMetadata = {
      ...item.metadata, // 包含所有原始metadata，但不包含fileContent
      isAdminModel,
      adminModelId: item.id.replace('admin_', ''),
      adminModelName: adminModel?.name || item.name // 添加管理后台模型名称
    }

    console.log('预览对象metadata（不含fileContent）:', previewMetadata)

    // 进入预览模式，使用管理后台模型名称作为model标识
    startPreview({
      type: objectType,
      model: adminModel?.name || item.model, // 使用管理后台的模型名称
      metadata: previewMetadata
    })
  }

  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">物品库</h2>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索物品..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>
      {/* 分类与卡片 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {filteredCategories.map(category => (
          <div key={category.id}>
            <div className="text-xs text-gray-500 font-bold mb-2">{category.name}</div>
            <div className="grid grid-cols-2 gap-3">
              {category.items.map(item => (
                  <div
                    key={item.id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow flex flex-col items-center p-2 cursor-pointer"
                    onClick={() => handleStartPreview(item)}
                >
                  <div className="w-full flex justify-center items-center mb-1">
                    <img src={item.metadata?.previewImageUrl || undefined} alt={item.name} className="w-16 h-16 object-contain bg-gray-50 rounded" />
                        </div>
                  <div className="w-full text-center">
                    <div className="font-medium text-gray-900 truncate text-xs">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.dimensions.join('×')}m</div>
                        {item.metadata?.description && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{item.metadata.description}</div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ObjectPalette 