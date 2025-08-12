import React, { useState, useRef, useEffect } from 'react'
import { 
  ArrowLeft, 
  Undo, 
  Redo, 
  Camera, 
  Grid3X3, 
  Settings,
  Download,
  Building2,
  Eye,
  Search,
  ChevronDown,
  Edit2,
  Check,
  X,
  Play,
  Info
} from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'

interface ToolbarProps {
  onBackToProjects: () => void
  onExportSnapshot: () => void
  showGrid: boolean
  onToggleGrid: (show: boolean) => void
  cameraMode: 'orbit' | 'fps'
  onChangeCameraMode: (mode: 'orbit' | 'fps') => void
  showWalls: boolean
  onToggleWalls: (show: boolean) => void
  showInfo: boolean
  onToggleInfo: (show: boolean) => void
}

const Toolbar: React.FC<ToolbarProps> = ({
  onBackToProjects,
  onExportSnapshot,
  showGrid,
  onToggleGrid,
  cameraMode,
  onChangeCameraMode,
  showWalls,
  onToggleWalls,
  showInfo,
  onToggleInfo
}) => {
  const { 
    currentProject, 
    updateProjectName,
    undo, 
    redo, 
    history, 
    historyIndex,
    selectObject,

  } = useProjectStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [editingProjectName, setEditingProjectName] = useState(false)
  const [projectNameInput, setProjectNameInput] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const projectNameInputRef = useRef<HTMLInputElement>(null)

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
        return '设备'
      }
    }
    
    // 传统模型的类型映射
    const typeMap: Record<string, string> = {
      'cabinet': '快递柜',
      'shelf': '货架', 
      'building': '设备'
    }
    return typeMap[obj.type] || '设备'
  }

  const handleRun = () => {
    // TODO: 实现仿真运行逻辑
    console.log('开始运行仿真...')
    
    // 显示运行提示
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
    toast.textContent = '仿真运行中...'
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 2000)
  }

  // 项目名称编辑相关函数
  const handleStartEditProjectName = () => {
    if (currentProject) {
      setProjectNameInput(currentProject.name)
      setEditingProjectName(true)
      // 延迟聚焦以确保输入框已渲染
      setTimeout(() => {
        projectNameInputRef.current?.focus()
        projectNameInputRef.current?.select()
      }, 0)
    }
  }

  const handleSaveProjectName = () => {
    const trimmedName = projectNameInput.trim()
    if (trimmedName && trimmedName !== currentProject?.name) {
      updateProjectName(trimmedName)
    }
    setEditingProjectName(false)
  }

  const handleCancelEditProjectName = () => {
    setEditingProjectName(false)
    setProjectNameInput('')
  }

  // 防止失焦和按钮点击冲突
  const handleInputBlur = (e: React.FocusEvent) => {
    // 如果焦点移动到保存或取消按钮，不执行失焦保存
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && (relatedTarget.dataset.action === 'save' || relatedTarget.dataset.action === 'cancel')) {
      return
    }
    handleSaveProjectName()
  }

  const handleProjectNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveProjectName()
    } else if (e.key === 'Escape') {
      handleCancelEditProjectName()
    }
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
          {editingProjectName ? (
            <div className="flex items-center gap-2">
              <input
                ref={projectNameInputRef}
                type="text"
                value={projectNameInput}
                onChange={(e) => setProjectNameInput(e.target.value)}
                onKeyDown={handleProjectNameKeyDown}
                onBlur={handleInputBlur}
                maxLength={50}
                placeholder="请输入项目名称"
                className="text-gray-900 font-medium bg-white border border-primary-300 rounded px-2 py-1 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-0"
                style={{ width: Math.max(projectNameInput.length * 8 + 20, 120) + 'px' }}
              />
              <button
                data-action="save"
                onClick={handleSaveProjectName}
                disabled={!projectNameInput.trim()}
                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors
                         disabled:text-gray-400 disabled:hover:bg-transparent"
                title="保存"
              >
                <Check size={14} />
              </button>
              <button
                data-action="cancel"
                onClick={handleCancelEditProjectName}
                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="取消"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors"
              onClick={handleStartEditProjectName}
              title="点击编辑项目名称"
            >
              <h1 className="text-gray-900 font-medium">{currentProject?.name}</h1>
              <Edit2 size={14} className="text-gray-400 hover:text-gray-600" />
            </div>
          )}
          <div className="text-sm text-gray-500 ml-2">
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

          {/* 显示墙壁 */}
        <div className="flex items-center gap-1 mr-4 border-l border-gray-300 pl-4">
          <button
              onClick={() => onToggleWalls(!showWalls)}
              className={`p-2 rounded transition-colors ${
                showWalls 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="显示墙壁"
          >
              <Building2 size={16} />
          </button>

          <button
              onClick={() => onToggleInfo(!showInfo)}
              className={`p-2 rounded transition-colors ${
                showInfo 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="显示信息"
          >
              <Info size={16} />
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



      {/* 右侧：运行和设置 */}
      <div className="flex items-center gap-2 ml-6">
        <button
          onClick={handleRun}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 
                   text-white rounded-lg transition-colors font-medium"
        >
          <Play size={16} />
          运行
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