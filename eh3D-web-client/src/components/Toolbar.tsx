import React, { useState, useRef, useEffect } from 'react'
import { 
  ArrowLeft, 
  Save, 
  Undo, 
  Redo, 
  Camera, 
  Grid3X3, 
  Settings,
  Download,
  Ruler,
  Eye,
  Search,
  ChevronDown
} from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'

interface ToolbarProps {
  onBackToProjects: () => void
  onExportSnapshot: () => void
  showGrid: boolean
  onToggleGrid: (show: boolean) => void
  cameraMode: 'orbit' | 'fps'
  onChangeCameraMode: (mode: 'orbit' | 'fps') => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  onBackToProjects,
  onExportSnapshot,
  showGrid,
  onToggleGrid,
  cameraMode,
  onChangeCameraMode
}) => {
  const { 
    currentProject, 
    saveCurrentProject, 
    undo, 
    redo, 
    history, 
    historyIndex,
    selectObject,
    clearSelection
  } = useProjectStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // 获取所有场景对象
  const allObjects = currentProject?.objects || []

  // 过滤搜索结果
  const filteredObjects = allObjects.filter(obj => {
    if (!searchTerm.trim()) return true
    return (
      obj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.model.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 处理对象选择
  const handleObjectSelect = (objectId: string) => {
    selectObject(objectId)
    setShowDropdown(false)
    setSearchTerm('')
  }

  // 获取对象类型中文名称
  const getObjectTypeName = (obj: any): string => {
    // 如果是管理后台上传的模型，优先使用分类信息
    if (obj.metadata?.isAdminModel) {
      // 根据管理后台模型名称判断类型
      const modelName = obj.metadata?.adminModelName || obj.model || ''
      if (modelName.includes('柜') || modelName.includes('cabinet')) {
        return '快递柜'
      } else if (modelName.includes('架') || modelName.includes('shelf')) {
        return '货架'
      } else {
        return '建筑'
      }
    }
    
    // 传统模型的类型映射
    const typeMap: Record<string, string> = {
      'cabinet': '快递柜',
      'shelf': '货架', 
      'building': '建筑'
    }
    return typeMap[obj.type] || obj.type
  }

  const handleSave = () => {
    saveCurrentProject()
    // 显示保存成功提示
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
    toast.textContent = '项目已保存'
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 2000)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center shadow-sm">
      {/* 左侧：项目信息和导航 */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBackToProjects}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 
                   hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
          返回项目
        </button>
        
        <div className="border-l border-gray-300 pl-4">
          <h1 className="text-gray-900 font-medium">{currentProject?.name}</h1>
          <div className="text-sm text-gray-500">
            {currentProject?.dimensions.join('×')}m
          </div>
        </div>
      </div>

      {/* 中间：主要工具（居中） */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 -ml-8">
          {/* 全局搜索框 */}
          <div className="flex items-center mr-3">
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowDropdown(true)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="搜索场景对象..."
                  className="w-64 pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           bg-gray-50 hover:bg-white transition-colors"
                />
                <Search 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
                <ChevronDown 
                  size={16} 
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform ${
                    showDropdown ? 'rotate-180' : ''
                  }`} 
                />
              </div>

              {/* 下拉列表 */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 
                              rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {filteredObjects.length > 0 ? (
                    <div className="py-1">
                      {filteredObjects.map((obj) => (
                        <button
                          key={obj.id}
                          onClick={() => handleObjectSelect(obj.id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors
                                   border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {obj.name}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>ID: {obj.id}</span>
                                <span>•</span>
                                <span>{getObjectTypeName(obj)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      {searchTerm.trim() ? '未找到匹配的对象' : '场景中暂无对象'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 历史记录 */}
          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                       disabled:text-gray-400 disabled:hover:bg-transparent
                       rounded transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                       disabled:text-gray-400 disabled:hover:bg-transparent
                       rounded transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
          </div>

          {/* 视图工具 */}
          <div className="flex items-center gap-1 mr-4 border-l border-gray-300 pl-4">
            <button
              onClick={() => onToggleGrid(!showGrid)}
              className={`p-2 rounded transition-colors ${
                showGrid 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="网格显示"
            >
              <Grid3X3 size={16} />
            </button>

            <button
              onClick={() => onChangeCameraMode(cameraMode === 'orbit' ? 'fps' : 'orbit')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                       rounded transition-colors"
              title={`切换到${cameraMode === 'orbit' ? 'FPS' : '轨道'}视角`}
            >
              <Eye size={16} />
            </button>
          </div>

          {/* 测量工具 */}
          <div className="flex items-center gap-1 mr-4 border-l border-gray-300 pl-4">
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                       rounded transition-colors"
              title="测量工具"
            >
              <Ruler size={16} />
            </button>
          </div>

          {/* 导出工具 */}
          <div className="flex items-center gap-1 border-l border-gray-300 pl-4">
            <button
              onClick={onExportSnapshot}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                       rounded transition-colors"
              title="导出截图"
            >
              <Camera size={16} />
            </button>
            
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                       rounded transition-colors"
              title="导出项目"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>



      {/* 右侧：保存和设置 */}
      <div className="flex items-center gap-2 ml-6">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                   text-white rounded-lg transition-colors font-medium"
        >
          <Save size={16} />
          保存
        </button>
        
        <button
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 
                   rounded transition-colors"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}

export default Toolbar 