import React, { useState, useRef, useEffect } from 'react'
import { Plus, Copy, Trash2, FolderOpen, Calendar, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'
import CreateProjectModal from './CreateProjectModal'
import { indexedDBStorage } from '../lib/storage/indexedDB'

interface ProjectListProps {
  onProjectSelect: () => void
  onAdminPanel: () => void
  onLogout?: () => void
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect, onAdminPanel, onLogout }) => {
  const { projects, loadProject, deleteProject, duplicateProject } = useProjectStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 获取当前用户信息
  const currentUser = localStorage.getItem('currentUser') || 'admin'

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOpenProject = (projectId: string) => {
    loadProject(projectId)
    onProjectSelect()
  }

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirm === projectId) {
      deleteProject(projectId)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(projectId)
      setTimeout(() => setDeleteConfirm(null), 3000) // 3秒后自动取消确认
    }
  }

  const handleDuplicateProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateProject(projectId)
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
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              快递驿站3D仿真器
            </h1>
            <p className="text-gray-600">
              创建和编辑您的3D驿站场景设计
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  // 调试：显示IndexedDB中的数据
                  await indexedDBStorage.init()
                  const adminModels = await indexedDBStorage.getAllModels()
                  const adminCategories = await indexedDBStorage.getCategories()
                  const storageInfo = await indexedDBStorage.getStorageInfo()
                  
                  console.log('管理后台数据调试:')
                  console.log('adminModels:', adminModels)
                  console.log('adminCategories:', adminCategories)
                  console.log('storageInfo:', storageInfo)
                  
                  const modelInfo = adminModels.map(m => 
                    `- ${m.name} (${m.fileName}, ${(m.fileSize / 1024 / 1024).toFixed(2)}MB)`
                  ).join('\n')
                  
                  const debugInfo = [
                    `📊 IndexedDB存储信息:`,
                    `已用: ${(storageInfo.used / 1024 / 1024).toFixed(2)}MB`,
                    `配额: ${(storageInfo.quota / 1024 / 1024).toFixed(0)}MB`,
                    `使用率: ${storageInfo.usedPercent.toFixed(1)}%`,
                    ``,
                    `📦 发现 ${adminModels.length} 个上传的模型:`,
                    modelInfo || '（无模型）',
                    ``,
                    `📁 分类 (${adminCategories.length}个):`,
                    adminCategories.join(', ')
                  ].join('\n')
                  
                  alert(debugInfo)
                } catch (error) {
                  console.error('调试数据获取失败:', error)
                  alert('调试数据获取失败: ' + (error instanceof Error ? error.message : '未知错误'))
                }
              }}
              className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 
                       text-white rounded-lg transition-colors text-sm"
            >
              调试数据
            </button>
            <button
              onClick={onAdminPanel}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 
                       text-white rounded-lg transition-colors font-medium"
            >
              <Settings size={20} />
              资产管理
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 
                       text-white rounded-lg transition-colors font-medium"
            >
              <Plus size={20} />
              新建项目
            </button>
            
            {/* 用户头像下拉菜单 */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 
                         rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 
                              rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {currentUser.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-700 font-medium">{currentUser}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* 下拉菜单 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  {/* 用户信息 */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 
                                    rounded-full flex items-center justify-center text-white font-medium text-lg">
                        {currentUser.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{currentUser}</div>
                        <div className="text-sm text-gray-500">系统管理员</div>
                      </div>
                    </div>
                  </div>

                  {/* 菜单项 */}
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500">
                      登录时间：{new Date(parseInt(localStorage.getItem('userLoginTime') || '0')).toLocaleString('zh-CN')}
                    </div>
                  </div>

                  {/* 退出登录 */}
                  {onLogout && (
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          onLogout()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 
                                 transition-colors text-left"
                      >
                        <LogOut size={16} />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <FolderOpen size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              暂无项目
            </h3>
            <p className="text-gray-600 mb-6">
              创建您的第一个3D驿站设计项目
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 
                       text-white rounded-lg transition-colors"
            >
              开始创建
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpenProject(project.id)}
                className="bg-white rounded-lg overflow-hidden cursor-pointer border border-gray-200
                         hover:bg-gray-50 transition-colors group shadow-sm hover:shadow-md"
              >
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-400">
                        <div className="w-8 h-8 border-2 border-current rounded mb-2 mx-auto"></div>
                        <div className="text-xs">无预览图</div>
                      </div>
                    </div>
                  )}
                  
                  {/* 操作按钮 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
                                transition-opacity flex gap-1">
                    <button
                      onClick={(e) => handleDuplicateProject(project.id, e)}
                      className="p-1.5 bg-black bg-opacity-50 hover:bg-opacity-70 
                               text-white rounded transition-colors"
                      title="复制项目"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className={`p-1.5 rounded transition-colors ${
                        deleteConfirm === project.id
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-black bg-opacity-50 hover:bg-opacity-70 text-white'
                      }`}
                      title={deleteConfirm === project.id ? '再次点击确认删除' : '删除项目'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-gray-900 font-medium mb-2 truncate">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(project.updatedAt)}
                    </div>
                    <div className="text-xs">
                      {project.dimensions[0]}×{project.dimensions[1]}×{project.dimensions[2]}m
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {project.objects.length} 个对象
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={onProjectSelect}
        />
      )}
    </div>
  )
}

export default ProjectList 