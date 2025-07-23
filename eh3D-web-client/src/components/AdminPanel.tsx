import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  FileText,
  FolderOpen,
  Tag,
  Database
} from 'lucide-react'
import { indexedDBStorage, IndexedDBStorage, ModelData } from '../lib/storage/indexedDB'

// 分类接口定义
interface Category {
  id: string // 英文标识符，用于数据存储
  name: string // 中文显示名称
  description?: string // 可选的描述信息
}

// 格口模板接口
interface GridTemplate {
  rows: number // 行数
  columns: number // 列数
  enabled: boolean // 是否启用格口模板
  disabledCells?: number[] // 禁用的格口索引数组
}

// 检查分类是否支持格口模板
const supportGridTemplate = (categoryName: string): boolean => {
  return categoryName === '快递柜' || categoryName === '货架'
}

// 生成格口编码（从上到下，从左到右）
const generateCellCode = (index: number, rows: number, columns: number): string => {
  // 将数组索引转换为行列坐标（按行排列的索引）
  const displayRow = Math.floor(index / columns)  // 显示的行号（0开始）
  const displayCol = index % columns              // 显示的列号（0开始）
  
  // 按列编号：第1列是1-rows，第2列是(rows+1)-(2*rows)
  const cellNumber = displayCol * rows + displayRow + 1
  return cellNumber.toString()
}

// 默认分类配置
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cabinets', name: '快递柜', description: '各种类型的快递柜设备' },
  { id: 'shelves', name: '货架', description: '仓储货架和展示架' },
  { id: 'buildings', name: '建筑', description: '建筑物和构筑物模型' }
]

// 受保护的默认分类ID（不能编辑、修改、删除）
const PROTECTED_CATEGORY_IDS = ['cabinets', 'shelves', 'buildings']

// 检查是否为受保护的分类
const isProtectedCategory = (categoryId: string): boolean => {
  return PROTECTED_CATEGORY_IDS.includes(categoryId)
}

// 分类工具函数
const getCategoryById = (categories: Category[], id: string): Category | undefined => {
  return categories.find(cat => cat.id === id)
}

const getCategoryName = (categories: Category[], id: string): string => {
  const category = getCategoryById(categories, id)
  return category ? category.name : id // 如果找不到分类，返回ID本身
}

// 静态方法访问的工具函数
const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

// 使用IndexedDB的ModelData接口
type ModelItem = ModelData

interface AdminPanelProps {
  onBack: () => void
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'models' | 'categories'>('models')
  const [models, setModels] = useState<ModelItem[]>([])
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingModel, setEditingModel] = useState<ModelItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    quota: 0,
    available: 0,
    usedPercent: 0
  })



  // 从IndexedDB加载数据
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await indexedDBStorage.init()
        
        // 加载模型数据
        const savedModels = await indexedDBStorage.getAllModels()
        setModels(savedModels)
        console.log('从IndexedDB加载了', savedModels.length, '个模型')
        
        // 加载分类数据
        const savedCategories = await indexedDBStorage.getCategories()
        // 确保分类数据是Category[]格式
        const categoriesData = Array.isArray(savedCategories) && savedCategories.length > 0 && 
                              typeof savedCategories[0] === 'object' && 'id' in savedCategories[0]
                              ? savedCategories as Category[]
                              : DEFAULT_CATEGORIES
        setCategories(categoriesData)
        console.log('从IndexedDB加载了分类:', categoriesData)
        
        // 获取存储信息
        const info = await indexedDBStorage.getStorageInfo()
        setStorageInfo(info)
        console.log('存储信息:', info)
        
      } catch (error) {
        console.error('初始化IndexedDB失败:', error)
        // 降级到默认值
        setModels([])
        setCategories(DEFAULT_CATEGORIES)
      }
    }
    
    initializeStorage()
  }, [])

  // 保存数据到IndexedDB
  const saveData = async (newModels: ModelItem[], newCategories: Category[]) => {
    try {
      // 保存分类
      await indexedDBStorage.saveCategories(newCategories)
      
      // 更新状态
      setModels(newModels)
      setCategories(newCategories)
      
      // 更新存储信息
      const info = await indexedDBStorage.getStorageInfo()
      setStorageInfo(info)
      
      console.log('数据保存成功 - 模型:', newModels.length, '个，分类:', newCategories.length, '个')
    } catch (error) {
      console.error('保存数据到IndexedDB失败:', error)
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteModel = async (modelId: string) => {
    if (deleteConfirm === modelId) {
      try {
        await indexedDBStorage.deleteModel(modelId)
        const newModels = models.filter(model => model.id !== modelId)
        await saveData(newModels, categories)
        setDeleteConfirm(null)
      } catch (error) {
        console.error('删除模型失败:', error)
        alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'))
      }
    } else {
      setDeleteConfirm(modelId)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const handleAddCategory = (categoryNameOrObj: string | Category) => {
    let newCategory: Category
    
    if (typeof categoryNameOrObj === 'string') {
      // 旧的方式：只传入名称
      const categoryName = categoryNameOrObj
      if (categoryName && !categories.some(cat => cat.name === categoryName)) {
        newCategory = { 
          id: Date.now().toString(), 
          name: categoryName, 
          description: '' 
        }
      } else {
        return
      }
    } else {
      // 新的方式：传入完整的Category对象
      newCategory = categoryNameOrObj
      if (!newCategory.name || categories.some(cat => cat.name === newCategory.name)) {
        return
      }
    }

    const newCategories = [...categories, newCategory]
    setCategories(newCategories)
    saveData(models, newCategories)
  }

  const handleDeleteCategory = async (categoryName: string) => {
    // 找到对应的分类对象
    const category = categories.find(cat => cat.name === categoryName)
    if (!category) return

    // 检查是否为受保护的分类
    if (isProtectedCategory(category.id)) {
      alert('默认分类（快递柜、货架、建筑）不能删除')
      return
    }

    // 检查是否有模型使用此分类
    const hasModels = models.some(model => model.category === categoryName)
    if (hasModels) {
      alert('该分类下还有模型，无法删除')
      return
    }
    
    try {
      const newCategories = categories.filter(cat => cat.name !== categoryName)
      await saveData(models, newCategories)
    } catch (error) {
      console.error('删除分类失败:', error)
      alert('删除分类失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleClearStorage = async () => {
    if (window.confirm('确定要清除所有模型数据吗？此操作不可恢复！')) {
      try {
        await indexedDBStorage.clearAll()
        setModels([])
        setCategories(DEFAULT_CATEGORIES)
        
        // 重新保存默认分类
        await indexedDBStorage.saveCategories(DEFAULT_CATEGORIES)
        
        // 更新存储信息
        const info = await indexedDBStorage.getStorageInfo()
        setStorageInfo(info)
        
        alert('存储空间已清理')
      } catch (error) {
        console.error('清理存储失败:', error)
        alert('清理失败：' + (error instanceof Error ? error.message : '未知错误'))
      }
    }
  }

  const getStorageInfo = () => {
    return storageInfo
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Settings size={20} className="text-primary-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  资产管理
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页导航 */}
        <div className="flex space-x-8 mb-8">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'models'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Package size={16} />
            物品库管理
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <FolderOpen size={16} />
            分类管理
          </button>
        </div>

        {/* 物品库管理 */}
        {activeTab === 'models' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">物品库管理</h2>
                <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <Database size={14} className="text-blue-500" />
                  {(() => {
                    const info = getStorageInfo()
                    return `IndexedDB存储：已用 ${(info.used / 1024 / 1024).toFixed(2)}MB / 总配额 ${(info.quota / 1024 / 1024).toFixed(0)}MB (${info.usedPercent.toFixed(1)}%)`
                  })()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClearStorage}
                  className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 
                           hover:bg-red-50 rounded-lg transition-colors text-sm"
                >
                  清理存储
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                           text-white rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  上传模型
                </button>
              </div>
            </div>

            {models.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <Package size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  暂无模型文件
                </h3>
                <p className="text-gray-600 mb-6">
                  上传GLB模型文件来丰富物品库
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 
                           text-white rounded-lg transition-colors"
                >
                  上传第一个模型
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {model.previewImage && model.previewImageType ? (
                        <ModelPreviewImage 
                          previewImage={model.previewImage} 
                          previewImageType={model.previewImageType}
                          modelName={model.name}
                        />
                      ) : (
                        <Package size={32} className="text-gray-400" />
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 truncate flex-1">
                          {model.name}
                        </h3>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => setEditingModel(model)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="编辑"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className={`p-1 transition-colors ${
                              deleteConfirm === model.id
                                ? 'text-red-600 hover:text-red-700'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            title={deleteConfirm === model.id ? '再次点击确认删除' : '删除'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Tag size={12} />
                          {model.category}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText size={12} />
                          {model.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(model.fileSize)} • {formatDate(model.uploadTime)}
                        </div>
                      </div>
                      
                      {model.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {model.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 分类管理 */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">分类管理</h2>
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                         text-white rounded-lg transition-colors"
              >
                <Plus size={16} />
                添加分类
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const modelCount = models.filter(model => model.category === category.name).length
                const isProtected = isProtectedCategory(category.id)
                
                return (
                  <div
                    key={category.id}
                    className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${
                      isProtected ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{category.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded font-mono ${
                              isProtected ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {category.id}
                            </span>
                            {isProtected && (
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                                默认
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{modelCount} 个模型</p>
                          {category.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{category.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => isProtected ? null : setEditingCategory(category)}
                            disabled={isProtected}
                            className={`p-1 transition-colors ${
                              isProtected 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                            title={isProtected ? '默认分类不可编辑' : '编辑分类'}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => isProtected ? null : handleDeleteCategory(category.name)}
                            disabled={isProtected}
                            className={`p-1 transition-colors ${
                              isProtected 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-red-600'
                            }`}
                            title={isProtected ? '默认分类不可删除' : '删除分类'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 上传模型模态框 */}
      {showUploadModal && (
        <ModelUploadModal
          categories={categories}
          onClose={() => setShowUploadModal(false)}
          onUpload={async (newModel) => {
            try {
              // 保存到IndexedDB
              await indexedDBStorage.saveModel(newModel)
              const newModels = [...models, newModel]
              await saveData(newModels, categories)
              setShowUploadModal(false)
            } catch (error) {
              console.error('上传模型失败:', error)
              alert('上传失败：' + (error instanceof Error ? error.message : '未知错误'))
            }
          }}
          storageInfo={storageInfo}
        />
      )}

      {/* 编辑模型模态框 */}
      {editingModel && (
        <ModelEditModal
          model={editingModel}
          categories={categories}
          onClose={() => setEditingModel(null)}
          onSave={(updatedModel) => {
            const newModels = models.map(model => 
              model.id === updatedModel.id ? updatedModel : model
            )
            setModels(newModels)
            saveData(newModels, categories)
            setEditingModel(null)
          }}
        />
      )}

      {/* 编辑分类模态框 */}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          categories={categories}
          models={models}
          onClose={() => setEditingCategory(null)}
          onSave={(updatedCategory) => {
            const newCategories = categories.map(cat => 
              cat.id === updatedCategory.id ? updatedCategory : cat
            )
            setCategories(newCategories)
            saveData(models, newCategories)
            setEditingCategory(null)
          }}
        />
      )}

      {/* 添加分类模态框 */}
      {showAddCategoryModal && (
        <CategoryAddModal
          categories={categories}
          onClose={() => setShowAddCategoryModal(false)}
          onSave={(newCategory) => {
            const newCategories = [...categories, newCategory]
            setCategories(newCategories)
            saveData(models, newCategories)
            setShowAddCategoryModal(false)
          }}
        />
      )}
    </div>
  )
}

// 模型上传模态框组件
interface ModelUploadModalProps {
  categories: Category[]
  onClose: () => void
  onUpload: (model: ModelItem) => Promise<void>
  storageInfo: {
    used: number
    quota: number
    available: number
    usedPercent: number
  }
}

const ModelUploadModal: React.FC<ModelUploadModalProps> = ({ 
  categories, 
  onClose, 
  onUpload, 
  storageInfo 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: categories[0]?.name || '',
    description: '',
    file: null as File | null,
    previewImage: null as File | null,
    dimensions: [1, 1, 1] as [number, number, number],
    gridTemplate: {
      rows: 3,
      columns: 4,
      enabled: false,
      disabledCells: []
    } as GridTemplate
  })
  const [isUploading, setIsUploading] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // 处理预览图片变化
  const handlePreviewImageChange = (file: File | null) => {
    setFormData({ ...formData, previewImage: file })
    
    // 清理旧的预览URL
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl)
    }
    
    // 创建新的预览URL
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewImageUrl(url)
    } else {
      setPreviewImageUrl(null)
    }
  }

  // 组件卸载时清理预览URL
  React.useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
    }
  }, [previewImageUrl])

  // 处理分类变化
  const handleCategoryChange = (categoryName: string) => {
    const supportsGrid = supportGridTemplate(categoryName)
    setFormData(prev => ({
      ...prev,
      category: categoryName,
      gridTemplate: {
        ...prev.gridTemplate,
        enabled: supportsGrid ? prev.gridTemplate.enabled : false
      }
    }))
  }

  // 处理格口点击（切换禁用状态）
  const handleCellClick = (cellIndex: number) => {
    setFormData(prev => {
      const disabledCells = prev.gridTemplate.disabledCells || []
      const isDisabled = disabledCells.includes(cellIndex)
      
      return {
        ...prev,
        gridTemplate: {
          ...prev.gridTemplate,
          disabledCells: isDisabled 
            ? disabledCells.filter(index => index !== cellIndex) // 取消禁用
            : [...disabledCells, cellIndex] // 添加禁用
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.file) return

    // 检查文件大小（大幅提高限制到100MB，因为IndexedDB容量更大）
    const maxFileSize = 100 * 1024 * 1024 // 100MB
    if (formData.file.size > maxFileSize) {
      alert(`文件大小超出限制！请选择小于 ${maxFileSize / 1024 / 1024}MB 的文件`)
      return
    }

    // 检查文件类型
    if (!formData.file.name.toLowerCase().endsWith('.glb')) {
      alert('请选择GLB格式的文件')
      return
    }

    setIsUploading(true)
    console.log('开始上传文件:', formData.file.name, '大小:', formData.file.size)
    
    try {
      // 检查IndexedDB存储空间
      const availableSpace = storageInfo.available
      const estimatedNewSize = formData.file.size // ArrayBuffer直接存储，无需编码转换
      console.log('可用存储空间:', (availableSpace / 1024 / 1024).toFixed(2), 'MB，需要:', (estimatedNewSize / 1024 / 1024).toFixed(2), 'MB')
      
      if (estimatedNewSize > availableSpace) {
        throw new Error(`存储空间不足！需要 ${(estimatedNewSize / 1024 / 1024).toFixed(2)}MB，可用 ${(availableSpace / 1024 / 1024).toFixed(2)}MB`)
      }

      // 处理文件用于存储（直接转换为ArrayBuffer）
      const fileArrayBuffer = await fileToArrayBuffer(formData.file)
      console.log('文件处理完成，开始保存到IndexedDB')
      
      // 处理预览图片
      let previewImageBuffer: ArrayBuffer | undefined
      let previewImageType: string | undefined
      
      if (formData.previewImage) {
        console.log('开始处理预览图片:', formData.previewImage.name)
        // 压缩图片到200x200，质量0.8
        const compressedImage = await IndexedDBStorage.compressImage(formData.previewImage, 200, 200, 0.8)
        previewImageBuffer = await IndexedDBStorage.imageToArrayBuffer(compressedImage)
        previewImageType = compressedImage.type
        console.log('预览图片处理完成，大小:', previewImageBuffer.byteLength, '字节')
      }
      
      const newModel: ModelItem = {
        id: Date.now().toString(),
        name: formData.name,
        category: formData.category,
        fileName: formData.file.name,
        fileSize: formData.file.size,
        uploadTime: new Date().toISOString(),
        description: formData.description || undefined,
        dimensions: supportGridTemplate(formData.category) ? undefined : formData.dimensions, // 非格口模板类型使用尺寸
        fileContent: fileArrayBuffer, // 直接存储ArrayBuffer
        previewImage: previewImageBuffer || undefined, // 存储压缩后的预览图片
        previewImageType: previewImageType || undefined, // 存储图片类型
        gridTemplate: supportGridTemplate(formData.category) ? formData.gridTemplate : undefined, // 格口模板配置
        metadata: {
          originalFileName: formData.file.name,
          storageFormat: 'arrayBuffer' // 标记存储格式
        }
      }
      
      // 上传到IndexedDB
      await onUpload(newModel)
      console.log('模型上传成功:', newModel.name)
      
    } catch (error) {
      console.error('Error uploading file:', error)
      const errorMessage = error instanceof Error ? error.message : '文件上传失败，请重试'
      alert(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 mb-2">上传模型</h2>
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <div className="text-blue-700 flex items-center gap-2">
              <Database size={14} />
              IndexedDB存储：可用 {(storageInfo.available / 1024 / 1024).toFixed(2)}MB / 总配额 {(storageInfo.quota / 1024 / 1024).toFixed(0)}MB
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述（可选）
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
            </div>

            {/* 尺寸信息或格口模板配置 */}
            {supportGridTemplate(formData.category) ? (
              // 格口模板配置（用于快递柜和货架）
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    格口模板
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.gridTemplate.enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        gridTemplate: { ...prev.gridTemplate, enabled: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">启用格口布局</span>
                  </label>
                </div>
                
                {formData.gridTemplate.enabled && (
                  <div className="space-y-4">
                    {/* 行列配置 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          行数
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.gridTemplate.rows}
                          onChange={(e) => setFormData(prev => {
                            const newRows = parseInt(e.target.value) || 1
                            const newTotalCells = newRows * prev.gridTemplate.columns
                            return {
                              ...prev,
                              gridTemplate: { 
                                ...prev.gridTemplate, 
                                rows: newRows,
                                disabledCells: (prev.gridTemplate.disabledCells || []).filter(index => index < newTotalCells)
                              }
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 
                                   focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          列数
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.gridTemplate.columns}
                          onChange={(e) => setFormData(prev => {
                            const newColumns = parseInt(e.target.value) || 1
                            const newTotalCells = prev.gridTemplate.rows * newColumns
                            return {
                              ...prev,
                              gridTemplate: { 
                                ...prev.gridTemplate, 
                                columns: newColumns,
                                disabledCells: (prev.gridTemplate.disabledCells || []).filter(index => index < newTotalCells)
                              }
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 
                                   focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* 可视化预览 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-600">
                          格口布局 ({formData.gridTemplate.rows}×{formData.gridTemplate.columns})
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              gridTemplate: { ...prev.gridTemplate, disabledCells: [] }
                            }))}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            title="启用所有格口"
                          >
                            全启用
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              gridTemplate: { 
                                ...prev.gridTemplate, 
                                disabledCells: Array.from({ length: prev.gridTemplate.rows * prev.gridTemplate.columns }, (_, i) => i)
                              }
                            }))}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            title="禁用所有格口"
                          >
                            全禁用
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <div 
                          className="grid gap-1 max-w-xs mx-auto"
                          style={{
                            gridTemplateColumns: `repeat(${formData.gridTemplate.columns}, 1fr)`,
                            gridTemplateRows: `repeat(${formData.gridTemplate.rows}, 1fr)`
                          }}
                        >
                          {Array.from({ length: formData.gridTemplate.rows * formData.gridTemplate.columns }, (_, index) => {
                            const isDisabled = formData.gridTemplate.disabledCells?.includes(index) || false
                            const cellCode = generateCellCode(index, formData.gridTemplate.rows, formData.gridTemplate.columns)
                            return (
                              <div
                                key={index}
                                onClick={() => handleCellClick(index)}
                                className={`w-7 h-7 border border-gray-300 rounded flex items-center justify-center text-xs cursor-pointer transition-colors font-mono ${
                                  isDisabled 
                                    ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100'
                                }`}
                                title={`格口${cellCode}号 - ${isDisabled ? '点击启用此格口' : '点击禁用此格口'}`}
                              >
                                {cellCode}
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 text-xs text-center">
                          <span className="text-gray-600">
                            已禁用 {formData.gridTemplate.disabledCells?.length || 0} 个格口 / 
                            可用 {formData.gridTemplate.rows * formData.gridTemplate.columns - (formData.gridTemplate.disabledCells?.length || 0)} 个格口
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              // 传统尺寸配置（用于建筑等其他类型）
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模型尺寸 (长×宽×高，单位：米)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.dimensions[0]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dimensions: [parseFloat(e.target.value) || 1, formData.dimensions[1], formData.dimensions[2]]
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                               focus:ring-primary-500 focus:border-primary-500 text-center"
                      placeholder="长"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">长</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.dimensions[1]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dimensions: [formData.dimensions[0], parseFloat(e.target.value) || 1, formData.dimensions[2]]
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                               focus:ring-primary-500 focus:border-primary-500 text-center"
                      placeholder="宽"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">宽</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.dimensions[2]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dimensions: [formData.dimensions[0], formData.dimensions[1], parseFloat(e.target.value) || 1]
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                               focus:ring-primary-500 focus:border-primary-500 text-center"
                      placeholder="高"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">高</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预览图片（推荐）
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePreviewImageChange(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                选择一张图片作为物品库中的预览图，建议尺寸正方形，将自动压缩至200×200
              </p>
              {previewImageUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={previewImageUrl}
                    alt="预览图片"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                  />
                  <div className="text-sm text-gray-600">
                    <div>预览图片已选择</div>
                    <button
                      type="button"
                      onClick={() => handlePreviewImageChange(null)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      移除图片
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GLB文件
              </label>
              <input
                type="file"
                accept=".glb"
                onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                required
              />
              {formData.file && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">文件名：</span>
                    <span className="font-medium">{formData.file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">文件大小：</span>
                    <span className={`font-medium ${
                      formData.file.size > 100 * 1024 * 1024 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">文件类型：</span>
                    <span className={`font-medium ${
                      formData.file.name.toLowerCase().endsWith('.glb') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formData.file.type || '未知'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">存储需求：</span>
                    <span className="font-medium text-blue-600">
                      {(formData.file.size / 1024 / 1024).toFixed(2)} MB (直接存储)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">剩余空间：</span>
                    <span className={`font-medium ${
                      formData.file.size > storageInfo.available ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(storageInfo.available / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  {formData.file.size > 100 * 1024 * 1024 && (
                    <div className="mt-2 text-red-600 text-xs">
                      ⚠️ 文件大小超过100MB限制
                    </div>
                  )}
                  {formData.file.size > storageInfo.available && (
                    <div className="mt-2 text-red-600 text-xs">
                      ⚠️ 存储空间不足
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                       rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                handleSubmit(e)
              }}
              disabled={isUploading || !formData.file}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                       disabled:bg-primary-400 text-white rounded-lg transition-colors"
            >
              {isUploading ? '上传中...' : '上传'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 模型编辑模态框组件
interface ModelEditModalProps {
  model: ModelItem
  categories: Category[]
  onClose: () => void
  onSave: (model: ModelItem) => void
}

const ModelEditModal: React.FC<ModelEditModalProps> = ({ model, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: model.name,
    category: model.category,
    description: model.description || '',
    dimensions: (model.dimensions ? [...model.dimensions] : [1, 1, 1]) as [number, number, number],
    previewImage: null as File | null,
    newGlbFile: null as File | null,
    gridTemplate: {
      rows: model.gridTemplate?.rows || 3,
      columns: model.gridTemplate?.columns || 4,
      enabled: model.gridTemplate?.enabled || false,
      disabledCells: model.gridTemplate?.disabledCells || []
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | null>(null)
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null)
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    quota: 0,
    available: 0,
    usedPercent: 0
  })

  // 加载当前预览图片
  React.useEffect(() => {
    const loadCurrentPreview = async () => {
      if (model.previewImage && model.previewImageType) {
        try {
          const url = await IndexedDBStorage.arrayBufferToImageDataURL(model.previewImage, model.previewImageType)
          setCurrentPreviewUrl(url)
        } catch (error) {
          console.error('加载当前预览图片失败:', error)
        }
      }
    }
    loadCurrentPreview()

    // 加载存储信息
    const loadStorageInfo = async () => {
      try {
        const info = await indexedDBStorage.getStorageInfo()
        setStorageInfo(info)
      } catch (error) {
        console.error('加载存储信息失败:', error)
      }
    }
    loadStorageInfo()

    // 清理函数
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl)
      }
      if (newPreviewUrl) {
        URL.revokeObjectURL(newPreviewUrl)
      }
    }
  }, [model.previewImage, model.previewImageType])

  // 处理新预览图片变化
  const handlePreviewImageChange = (file: File | null) => {
    setFormData({ ...formData, previewImage: file })
    
    // 清理旧的新预览URL
    if (newPreviewUrl) {
      URL.revokeObjectURL(newPreviewUrl)
    }
    
    // 创建新的预览URL
    if (file) {
      const url = URL.createObjectURL(file)
      setNewPreviewUrl(url)
    } else {
      setNewPreviewUrl(null)
    }
  }

  // 处理格口点击（切换禁用状态）
  const handleCellClick = (cellIndex: number) => {
    setFormData(prev => {
      const disabledCells = prev.gridTemplate.disabledCells || []
      const isDisabled = disabledCells.includes(cellIndex)
      
      return {
        ...prev,
        gridTemplate: {
          ...prev.gridTemplate,
          disabledCells: isDisabled 
            ? disabledCells.filter(index => index !== cellIndex) // 取消禁用
            : [...disabledCells, cellIndex] // 添加禁用
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let updatedModel = {
        ...model,
        name: formData.name,
        category: formData.category,
        description: formData.description || undefined,
        dimensions: supportGridTemplate(formData.category) ? undefined : formData.dimensions,
        gridTemplate: supportGridTemplate(formData.category) ? formData.gridTemplate : undefined
      }

      // 如果用户选择了新的预览图片，处理它
      if (formData.previewImage) {
        console.log('开始处理新预览图片:', formData.previewImage.name)
        // 压缩图片到200x200，质量0.8
        const compressedImage = await IndexedDBStorage.compressImage(formData.previewImage, 200, 200, 0.8)
        const previewImageBuffer = await IndexedDBStorage.imageToArrayBuffer(compressedImage)
        console.log('新预览图片处理完成，大小:', previewImageBuffer.byteLength, '字节')
        
        updatedModel.previewImage = previewImageBuffer
        updatedModel.previewImageType = compressedImage.type
      }

      // 如果用户选择了新的GLB文件，处理它
      if (formData.newGlbFile) {
        console.log('开始处理新GLB文件:', formData.newGlbFile.name)
        // 检查文件大小（大幅提高限制到100MB，因为IndexedDB容量更大）
        const maxFileSize = 100 * 1024 * 1024 // 100MB
        if (formData.newGlbFile.size > maxFileSize) {
          throw new Error(`文件大小超出限制！请选择小于 ${maxFileSize / 1024 / 1024}MB 的文件`)
        }

        // 检查文件类型
        if (!formData.newGlbFile.name.toLowerCase().endsWith('.glb')) {
          throw new Error('请选择GLB格式的文件')
        }

        // 检查存储空间
        const availableSpace = storageInfo.available
        const estimatedNewSize = formData.newGlbFile.size // ArrayBuffer直接存储，无需编码转换
        console.log('可用存储空间:', (availableSpace / 1024 / 1024).toFixed(2), 'MB，需要:', (estimatedNewSize / 1024 / 1024).toFixed(2), 'MB')
        
        if (estimatedNewSize > availableSpace) {
          throw new Error(`存储空间不足！需要 ${(estimatedNewSize / 1024 / 1024).toFixed(2)}MB，可用 ${(availableSpace / 1024 / 1024).toFixed(2)}MB`)
        }

        // 处理文件用于存储（直接转换为ArrayBuffer）
        const newGlbArrayBuffer = await fileToArrayBuffer(formData.newGlbFile)
        console.log('新GLB文件处理完成，开始保存到IndexedDB')
        
        updatedModel.fileContent = newGlbArrayBuffer
        updatedModel.fileName = formData.newGlbFile.name
        updatedModel.fileSize = formData.newGlbFile.size
        updatedModel.uploadTime = new Date().toISOString()
        updatedModel.metadata = {
          ...updatedModel.metadata,
          originalFileName: formData.newGlbFile.name,
          storageFormat: 'arrayBuffer'
        }
      }

      // 更新IndexedDB
      await indexedDBStorage.saveModel(updatedModel)
      onSave(updatedModel)
    } catch (error) {
      console.error('保存模型失败:', error)
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsSaving(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 mb-4">编辑模型</h2>

          {/* 模型文件信息 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">文件信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">文件名：</span>
                <span className="font-medium">{model.fileName}</span>
              </div>
              <div>
                <span className="text-gray-600">文件大小：</span>
                <span className="font-medium">{formatFileSize(model.fileSize)}</span>
              </div>
              <div>
                <span className="text-gray-600">上传时间：</span>
                <span className="font-medium">{formatDate(model.uploadTime)}</span>
              </div>
              <div>
                <span className="text-gray-600">模型ID：</span>
                <span className="font-medium text-xs text-gray-500">{model.id}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="为这个模型添加描述信息..."
              />
            </div>

            {/* 尺寸信息或格口模板配置 */}
            {supportGridTemplate(formData.category) ? (
              // 格口模板配置（用于快递柜和货架）
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    格口模板
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.gridTemplate.enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        gridTemplate: { ...prev.gridTemplate, enabled: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">启用格口布局</span>
                  </label>
                </div>
                
                {formData.gridTemplate.enabled && (
                  <div className="space-y-4">
                    {/* 行列配置 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          行数
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.gridTemplate.rows}
                          onChange={(e) => setFormData(prev => {
                            const newRows = parseInt(e.target.value) || 1
                            const newTotalCells = newRows * prev.gridTemplate.columns
                            return {
                              ...prev,
                              gridTemplate: { 
                                ...prev.gridTemplate, 
                                rows: newRows,
                                disabledCells: (prev.gridTemplate.disabledCells || []).filter(index => index < newTotalCells)
                              }
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 
                                   focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          列数
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.gridTemplate.columns}
                          onChange={(e) => setFormData(prev => {
                            const newColumns = parseInt(e.target.value) || 1
                            const newTotalCells = prev.gridTemplate.rows * newColumns
                            return {
                              ...prev,
                              gridTemplate: { 
                                ...prev.gridTemplate, 
                                columns: newColumns,
                                disabledCells: (prev.gridTemplate.disabledCells || []).filter(index => index < newTotalCells)
                              }
                            }
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 
                                   focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* 可视化预览 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-600">
                          格口布局 ({formData.gridTemplate.rows}×{formData.gridTemplate.columns})
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              gridTemplate: { ...prev.gridTemplate, disabledCells: [] }
                            }))}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            title="启用所有格口"
                          >
                            全启用
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              gridTemplate: { 
                                ...prev.gridTemplate, 
                                disabledCells: Array.from({ length: prev.gridTemplate.rows * prev.gridTemplate.columns }, (_, i) => i)
                              }
                            }))}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            title="禁用所有格口"
                          >
                            全禁用
                          </button>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        <div 
                          className="grid gap-1 max-w-xs mx-auto"
                          style={{
                            gridTemplateColumns: `repeat(${formData.gridTemplate.columns}, 1fr)`,
                            gridTemplateRows: `repeat(${formData.gridTemplate.rows}, 1fr)`
                          }}
                        >
                          {Array.from({ length: formData.gridTemplate.rows * formData.gridTemplate.columns }, (_, index) => {
                            const isDisabled = formData.gridTemplate.disabledCells?.includes(index) || false
                            const cellCode = generateCellCode(index, formData.gridTemplate.rows, formData.gridTemplate.columns)
                            return (
                              <div
                                key={index}
                                onClick={() => handleCellClick(index)}
                                className={`w-7 h-7 border border-gray-300 rounded flex items-center justify-center text-xs cursor-pointer transition-colors font-mono ${
                                  isDisabled 
                                    ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100'
                                }`}
                                title={`格口${cellCode}号 - ${isDisabled ? '点击启用此格口' : '点击禁用此格口'}`}
                              >
                                {cellCode}
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-2 text-xs text-center">
                          <span className="text-gray-600">
                            已禁用 {formData.gridTemplate.disabledCells?.length || 0} 个格口 / 
                            可用 {formData.gridTemplate.rows * formData.gridTemplate.columns - (formData.gridTemplate.disabledCells?.length || 0)} 个格口
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              // 传统尺寸配置（用于建筑等其他类型）
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模型尺寸 (长×宽×高，单位：米)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.dimensions[0]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dimensions: [parseFloat(e.target.value) || 1, formData.dimensions[1], formData.dimensions[2]]
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                               focus:ring-primary-500 focus:border-primary-500 text-center"
                      placeholder="长"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">长</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.dimensions[1]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dimensions: [formData.dimensions[0], parseFloat(e.target.value) || 1, formData.dimensions[2]]
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                               focus:ring-primary-500 focus:border-primary-500 text-center"
                      placeholder="宽"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">宽</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.dimensions[2]}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        dimensions: [formData.dimensions[0], formData.dimensions[1], parseFloat(e.target.value) || 1]
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                               focus:ring-primary-500 focus:border-primary-500 text-center"
                      placeholder="高"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">高</p>
                  </div>
                </div>
              </div>
            )}

            {/* 预览图片编辑 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                预览图片
              </label>
              
              {/* 当前预览图片 */}
              {currentPreviewUrl && !newPreviewUrl && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">当前预览图片：</p>
                  <img
                    src={currentPreviewUrl}
                    alt="当前预览图片"
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}

              {/* 新预览图片 */}
              {newPreviewUrl && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">新预览图片：</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={newPreviewUrl}
                      alt="新预览图片"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => handlePreviewImageChange(null)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      移除新图片
                    </button>
                  </div>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePreviewImageChange(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                选择新的预览图片来替换当前图片，建议尺寸正方形，将自动压缩至200×200
              </p>
            </div>

            {/* GLB文件替换 */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                替换GLB文件（可选）
              </label>
              
              {/* 当前文件信息 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">当前文件：</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">文件名：</span>
                    <span className="font-medium">{model.fileName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">大小：</span>
                    <span className="font-medium">{formatFileSize(model.fileSize)}</span>
                  </div>
                </div>
              </div>

              {/* 新文件选择 */}
              <input
                type="file"
                accept=".glb"
                onChange={(e) => setFormData({ ...formData, newGlbFile: e.target.files?.[0] || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
              />
              
              {/* 新文件信息预览 */}
              {formData.newGlbFile && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">新文件信息：</h4>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-blue-600">文件名：</span>
                        <span className="font-medium">{formData.newGlbFile.name}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">大小：</span>
                        <span className={`font-medium ${
                          formData.newGlbFile.size > 100 * 1024 * 1024 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatFileSize(formData.newGlbFile.size)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-blue-600">文件类型：</span>
                      <span className={`font-medium ${
                        formData.newGlbFile.name.toLowerCase().endsWith('.glb') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formData.newGlbFile.type || 'GLB模型文件'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-blue-600">存储需求：</span>
                      <span className="font-medium text-blue-600">
                        {formatFileSize(formData.newGlbFile.size)} (直接存储)
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-blue-600">剩余空间：</span>
                      <span className={`font-medium ${
                        formData.newGlbFile.size > storageInfo.available ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatFileSize(storageInfo.available)}
                      </span>
                    </div>
                    
                    {/* 大小对比 */}
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex justify-between">
                        <span className="text-blue-600">大小变化：</span>
                        <span className={`font-medium ${
                          formData.newGlbFile.size > model.fileSize ? 'text-orange-600' : 
                          formData.newGlbFile.size < model.fileSize ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {formData.newGlbFile.size > model.fileSize ? '+' : ''}
                          {formatFileSize(formData.newGlbFile.size - model.fileSize)}
                        </span>
                      </div>
                    </div>
                    
                    {/* 警告信息 */}
                    {formData.newGlbFile.size > 100 * 1024 * 1024 && (
                      <div className="mt-2 text-red-600 text-xs bg-red-50 p-2 rounded">
                        ⚠️ 文件大小超过100MB限制
                      </div>
                    )}
                    {formData.newGlbFile.size > storageInfo.available && (
                      <div className="mt-2 text-red-600 text-xs bg-red-50 p-2 rounded">
                        ⚠️ 存储空间不足
                      </div>
                    )}
                    {!formData.newGlbFile.name.toLowerCase().endsWith('.glb') && (
                      <div className="mt-2 text-red-600 text-xs bg-red-50 p-2 rounded">
                        ⚠️ 请选择GLB格式的文件
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-blue-200">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, newGlbFile: null })}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      移除新文件
                    </button>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ <strong>注意：</strong>替换文件将完全覆盖原有模型，建议同时更新预览图片和尺寸信息。
                替换后文件名、大小、上传时间等信息也会更新。
              </p>
            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                       rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                handleSubmit(e)
              }}
              disabled={isSaving || (!!formData.newGlbFile && (
                formData.newGlbFile.size > 100 * 1024 * 1024 ||
                formData.newGlbFile.size > storageInfo.available ||
                !formData.newGlbFile.name.toLowerCase().endsWith('.glb')
              ))}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                       disabled:bg-primary-400 text-white rounded-lg transition-colors"
            >
              {isSaving ? '保存中...' : formData.newGlbFile ? '保存并替换文件' : '保存更改'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 模型预览图片组件
interface ModelPreviewImageProps {
  previewImage: ArrayBuffer
  previewImageType: string
  modelName: string
}

const ModelPreviewImage: React.FC<ModelPreviewImageProps> = ({ previewImage, previewImageType, modelName }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await IndexedDBStorage.arrayBufferToImageDataURL(previewImage, previewImageType)
        setImageUrl(url)
      } catch (error) {
        console.error('加载预览图片失败:', error)
        setImageUrl(null)
      }
    }
    loadImage()
  }, [previewImage, previewImageType])

  if (!imageUrl) {
    return <Package size={32} className="text-gray-400" />
  }

  return (
    <img
      src={imageUrl}
      alt={`预览图片 - ${modelName}`}
      className="w-full h-full object-contain rounded-lg"
    />
  )
}

// 分类编辑模态框组件
interface CategoryEditModalProps {
  category: Category
  categories: Category[]
  models: ModelItem[]
  onClose: () => void
  onSave: (category: Category) => void
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ 
  category, 
  categories, 
  models, 
  onClose, 
  onSave 
}) => {
  // 检查是否为受保护的分类
  const isProtected = isProtectedCategory(category.id)
  
  const [formData, setFormData] = useState({
    id: category.id,
    name: category.name,
    description: category.description || ''
  })
  const [isSaving, setIsSaving] = useState(false)

  const modelCount = models.filter(model => model.category === category.name).length

  // 如果是受保护的分类，直接显示信息页面
  if (isProtected) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">查看默认分类</h2>

            {/* 分类基本信息 */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-medium text-blue-700 mb-2">系统默认分类</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-blue-600">分类标识符：</span>
                  <span className="font-mono font-medium bg-blue-200 px-2 py-1 rounded text-xs">
                    {category.id}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">分类名称：</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <div>
                  <span className="text-blue-600">包含模型：</span>
                  <span className="font-medium">{modelCount} 个</span>
                </div>
                {category.description && (
                  <div>
                    <span className="text-blue-600">描述：</span>
                    <span className="font-medium">{category.description}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 text-lg">🛡️</span>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">系统保护说明</h4>
                  <p className="text-xs text-yellow-700">
                    快递柜、货架、建筑是系统预设的基础分类，为保证系统稳定性和数据一致性，
                    这些分类不允许修改名称、描述或删除。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // 检查是否有重复的分类名称（排除自己）
      const isDuplicateName = categories.some(cat => 
        cat.id !== category.id && cat.name === formData.name.trim()
      )
      
      if (isDuplicateName) {
        alert('该分类名称已存在，请选择其他名称')
        return
      }

      const updatedCategory: Category = {
        id: formData.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      }

      onSave(updatedCategory)
    } catch (error) {
      console.error('保存分类失败:', error)
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">编辑分类</h2>

          {/* 分类基本信息 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">基本信息</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">分类标识符：</span>
                <span className="font-mono font-medium bg-gray-200 px-2 py-1 rounded text-xs">
                  {category.id}
                </span>
                <span className="text-red-500 text-xs ml-2">（不可修改）</span>
              </div>
              <div>
                <span className="text-gray-600">包含模型：</span>
                <span className="font-medium">{modelCount} 个</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ℹ️ 分类标识符在创建后无法修改，以确保数据一致性和系统稳定性
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                required
                placeholder="请输入分类的中文名称"
              />
              <p className="text-xs text-gray-500 mt-1">
                这是显示给用户看的中文名称
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="为这个分类添加描述信息..."
              />
              <p className="text-xs text-gray-500 mt-1">
                可选的详细描述，帮助用户理解此分类的用途
              </p>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                         rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                         disabled:bg-primary-400 text-white rounded-lg transition-colors"
              >
                {isSaving ? '保存中...' : '保存更改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 添加分类模态框组件
interface CategoryAddModalProps {
  categories: Category[]
  onClose: () => void
  onSave: (category: Category) => void
}

const CategoryAddModal: React.FC<CategoryAddModalProps> = ({ categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: ''
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // 检查是否有重复的分类名称
      const isDuplicateName = categories.some(cat => 
        cat.name === formData.name.trim()
      )
      
      if (isDuplicateName) {
        alert('该分类名称已存在，请选择其他名称')
        return
      }

      // 检查是否有重复的分类标识符
      const isDuplicateId = categories.some(cat => 
        cat.id === formData.id.trim()
      )
      
      if (isDuplicateId) {
        alert('该分类标识符已存在，请选择其他标识符')
        return
      }

      // 检查是否与受保护的分类ID冲突
      if (isProtectedCategory(formData.id.trim())) {
        alert('该标识符与系统默认分类冲突，请选择其他标识符')
        return
      }

      // 验证标识符格式（只允许字母、数字、下划线、连字符）
      const idPattern = /^[a-zA-Z0-9_-]+$/
      if (!idPattern.test(formData.id.trim())) {
        alert('分类标识符只能包含字母、数字、下划线和连字符')
        return
      }

      const newCategory: Category = {
        id: formData.id.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined
      }

      onSave(newCategory)
    } catch (error) {
      console.error('保存分类失败:', error)
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setIsSaving(false)
    }
  }

  // 自动生成标识符建议
  const generateIdSuggestion = (name: string) => {
    if (!name) return ''
    
    // 简单的中文转拼音映射（常用词）
    const pinyinMap: Record<string, string> = {
      '快递': 'kuaidi',
      '柜': 'gui',
      '快递柜': 'cabinet',
      '货架': 'shelf',
      '建筑': 'building',
      '仓储': 'storage',
      '展示': 'display',
      '设备': 'equipment',
      '家具': 'furniture',
      '办公': 'office',
      '桌子': 'desk',
      '椅子': 'chair',
      '沙发': 'sofa',
      '床': 'bed',
      '书架': 'bookshelf',
      '衣柜': 'wardrobe',
      '装饰': 'decoration',
      '灯具': 'lighting',
      '电器': 'appliance'
    }
    
    // 尝试匹配常用词转换
    let suggestion = pinyinMap[name.trim()] || ''
    
    // 如果没有匹配，生成基础建议
    if (!suggestion) {
      suggestion = name.toLowerCase()
        .replace(/[^\w\s-]/g, '') // 移除特殊字符
        .replace(/\s+/g, '_') // 空格转下划线
        .substring(0, 20) // 限制长度
    }
    
    // 确保唯一性
    let counter = 1
    let finalSuggestion = suggestion
    while (categories.some(cat => cat.id === finalSuggestion)) {
      finalSuggestion = `${suggestion}_${counter}`
      counter++
    }
    
    return finalSuggestion
  }

  // 当名称改变时自动建议标识符
  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name })
    
    // 如果标识符为空，自动生成建议
    if (!formData.id) {
      const suggestion = generateIdSuggestion(name)
      setFormData(prev => ({ ...prev, name, id: suggestion }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">添加分类</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                required
                placeholder="请输入分类的中文名称"
              />
              <p className="text-xs text-gray-500 mt-1">
                这是显示给用户看的中文名称
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类标识符 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500 font-mono"
                required
                placeholder="请输入英文标识符，如：cabinet, shelf"
                pattern="[a-zA-Z0-9_-]+"
              />
              <p className="text-xs text-gray-500 mt-1">
                用于程序识别的英文标识符，只能包含字母、数字、下划线和连字符。
                <strong>添加后无法修改！</strong>
              </p>
              {formData.id && !/^[a-zA-Z0-9_-]+$/.test(formData.id) && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ 标识符格式不正确，只能包含字母、数字、下划线和连字符
                </p>
              )}
              {formData.id && categories.some(cat => cat.id === formData.id.trim()) && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ 该标识符已存在，请选择其他标识符
                </p>
              )}
              {formData.id && isProtectedCategory(formData.id.trim()) && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ 该标识符与系统默认分类冲突，请选择其他标识符
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                placeholder="为这个分类添加描述信息..."
              />
              <p className="text-xs text-gray-500 mt-1">
                可选的详细描述，帮助用户理解此分类的用途
              </p>
            </div>

            {/* 预览区域 */}
            {formData.name && formData.id && (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">预览效果：</h4>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{formData.name}</span>
                  <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded font-mono">
                    {formData.id}
                  </span>
                </div>
                {formData.description && (
                  <p className="text-xs text-gray-500 mt-1">{formData.description}</p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                         rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || !formData.name.trim() || !formData.id.trim() || 
                         !/^[a-zA-Z0-9_-]+$/.test(formData.id) ||
                         categories.some(cat => cat.id === formData.id.trim() || cat.name === formData.name.trim()) ||
                         isProtectedCategory(formData.id.trim())}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                         disabled:bg-primary-400 text-white rounded-lg transition-colors"
              >
                {isSaving ? '保存中...' : '添加分类'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel 