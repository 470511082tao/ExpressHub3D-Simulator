import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ObjectConfig {
  id: string
  name: string // 模型实例名称
  type: 'cabinet' | 'shelf' | 'building'
  model: string
  position: [number, number, number]
  rotation: number
  metadata?: {
    capacity?: number
    layers?: number
    width?: number
    height?: number
    depth?: number
    description?: string
    isAdminModel?: boolean
    adminModelId?: string
    fileContent?: string
    originalFileName?: string
    adminModelName?: string // 管理后台模型名称
  }
}

export interface PreviewObject {
  type: 'cabinet' | 'shelf' | 'building'
  model: string
  initialPosition?: [number, number, number] // 初始位置（用于双击移动）
  initialRotation?: number // 初始旋转角度（用于双击移动）
  metadata?: {
    capacity?: number
    layers?: number
    width?: number
    height?: number
    depth?: number
    description?: string
    isAdminModel?: boolean
    adminModelId?: string
    fileContent?: string
    originalFileName?: string
    adminModelName?: string // 管理后台模型名称
  }
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  dimensions: [number, number, number] // 长宽高(米)
  objects: ObjectConfig[]
  thumbnail?: string
  businessConfig?: {
    operation?: {
      storeAddress: string
      managerCount: number
      employeeCount: number
      managerSalary: number
      employeeSalary: number
      monthlyRent: number
      monthlyUtilities: number
    }
    staff?: any // 暂时保留
    package?: any // 暂时保留
    packageFlow?: {
      morningPackages: number
      afternoonPackages: number
      peakHourMultiplier: number
      averageRetentionHours: number
      smallPackageRatio: number
      largePackageRatio: number
    }
    community?: {
      totalUsers: number
      activeUserRate: number
      pickupFrequency: number
      averagePickupTime: number
    }
  }
}

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  selectedObjects: string[]
  history: Project[]
  historyIndex: number
  
  // 预览模式状态
  previewMode: boolean
  previewObject: PreviewObject | null
  previewPosition: [number, number, number] | null
  
  // 项目管理
  createProject: (name: string, dimensions: [number, number, number]) => void
  loadProject: (id: string) => void
  saveCurrentProject: () => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => void
  
  // 对象管理
  addObject: (object: Omit<ObjectConfig, 'id' | 'name'> & { name?: string }) => void
  updateObject: (id: string, updates: Partial<ObjectConfig>) => void
  deleteObject: (id: string) => void
  selectObject: (id: string) => void
  clearSelection: () => void
  
  // 成本计算管理
  updateBusinessConfig: (configType: 'operation' | 'staff' | 'package' | 'packageFlow' | 'community', data: any) => void
  
  // 预览模式管理
  startPreview: (object: PreviewObject) => void
  updatePreviewPosition: (position: [number, number, number]) => void
  placePreviewObject: (position: [number, number, number]) => void
  cancelPreview: () => void
  
  // 历史记录
  undo: () => void
  redo: () => void
  addToHistory: () => void
  
  // 工具功能
  exportSnapshot: () => void
  generateThumbnail: (dataUrl: string) => void
}



export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      selectedObjects: [],
      history: [],
      historyIndex: -1,
      
      // 预览模式状态
      previewMode: false,
      previewObject: null,
      previewPosition: null,
      
      createProject: (name, dimensions) => {
        const newProject: Project = {
          id: `project_${Date.now()}`,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dimensions,
          objects: []
        }
        
        set(state => ({
          projects: [...state.projects, newProject],
          currentProject: newProject,
          history: [newProject],
          historyIndex: 0
        }))
      },
      
      loadProject: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({
            currentProject: project,
            selectedObjects: [],
            history: [project],
            historyIndex: 0
          })
        }
      },
      
      saveCurrentProject: () => {
        const { currentProject, projects } = get()
        if (!currentProject) return
        
        const updatedProject = {
          ...currentProject,
          updatedAt: new Date().toISOString()
        }
        
        set({
          currentProject: updatedProject,
          projects: projects.map(p => 
            p.id === currentProject.id ? updatedProject : p
          )
        })
      },
      
      deleteProject: (id) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
      },
      
      duplicateProject: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (!project) return
        
        const duplicated: Project = {
          ...project,
          id: `project_${Date.now()}`,
          name: `${project.name} - 副本`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        set(state => ({
          projects: [...state.projects, duplicated]
        }))
      },
      
      addObject: (objectData) => {
        set(state => {
          if (!state.currentProject) return state
          
          // 获取模型类型名称，优先使用管理后台的模型名称
          let modelTypeName = ''
          let idPrefix = ''
          
          if (objectData.metadata?.isAdminModel) {
            // 对于管理后台上传的模型，使用传递的模型名称
            modelTypeName = objectData.metadata?.adminModelName || objectData.model || '模型'
            // 根据模型名称生成英文ID前缀
            if (modelTypeName.includes('柜')) {
              idPrefix = 'cab'
            } else if (modelTypeName.includes('架')) {
              idPrefix = 'shelf'
            } else if (modelTypeName.includes('建筑') || modelTypeName.includes('构件')) {
              idPrefix = 'bld'
            } else {
              idPrefix = 'obj' // 默认前缀
            }
          } else {
            // 传统模型的类型名称映射
            const typeNames: Record<string, string> = {
              'cabinet': '快递柜',
              'shelf': '货架',
              'building': '建筑构件'
            }
            modelTypeName = typeNames[objectData.type] || objectData.type
            
            // 传统ID前缀映射
            const categoryPrefixes: Record<string, string> = {
              'cabinet': 'cab',
              'shelf': 'shelf', 
              'building': 'bld'
            }
            idPrefix = categoryPrefixes[objectData.type] || 'obj'
          }
          
          // 获取当前项目中所有对象，查找真正的下一个可用序号
          const allObjects = state.currentProject.objects
          const existingIds = allObjects.map(obj => obj.id)
          
          // 查找下一个可用的序号
          let nextNumber = 1
          let smartId = `${idPrefix}-${String(nextNumber).padStart(4, '0')}`
          while (existingIds.includes(smartId)) {
            nextNumber++
            smartId = `${idPrefix}-${String(nextNumber).padStart(4, '0')}`
          }
          
          // 生成默认名称：模型名称-序号
          const defaultName = `${modelTypeName}-${nextNumber}`
          
          const newObject: ObjectConfig = {
            ...objectData,
            id: smartId,
            name: objectData.name || defaultName // 如果没有提供名称，使用默认名称
          }
          
          const updatedProject = {
            ...state.currentProject,
            objects: [...state.currentProject.objects, newObject],
            updatedAt: new Date().toISOString()
          }
          
          return {
            currentProject: updatedProject,
            projects: state.projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            )
          }
        })
        
        get().addToHistory()
      },
      
      updateObject: (id, updates) => {
        set(state => {
          if (!state.currentProject) return state
          
          const updatedProject = {
            ...state.currentProject,
            objects: state.currentProject.objects.map(obj =>
              obj.id === id ? { ...obj, ...updates } : obj
            ),
            updatedAt: new Date().toISOString()
          }
          
          return {
            currentProject: updatedProject,
            projects: state.projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            )
          }
        })
        
        get().addToHistory()
      },
      
      deleteObject: (id) => {
        set(state => {
          if (!state.currentProject) return state
          
          const updatedProject = {
            ...state.currentProject,
            objects: state.currentProject.objects.filter(obj => obj.id !== id),
            updatedAt: new Date().toISOString()
          }
          
          return {
            currentProject: updatedProject,
            projects: state.projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            ),
            selectedObjects: state.selectedObjects.filter(objId => objId !== id)
          }
        })
        
        get().addToHistory()
      },
      
      selectObject: (id) => {
        set(state => {
          // 如果点击的是当前已选中的对象，保持选中状态
          if (state.selectedObjects.includes(id)) {
            return state // 不做任何改变，保持选中
          } else {
            // 如果点击的是不同的对象，切换到新选中的对象
            return {
              selectedObjects: [id]
            }
          }
        })
      },
      
      clearSelection: () => {
        set({ selectedObjects: [] })
      },
      
      updateBusinessConfig: (configType, data) => {
        set(state => {
          if (!state.currentProject) return state
          
          const updatedProject = {
            ...state.currentProject,
            businessConfig: {
              ...state.currentProject.businessConfig,
              [configType]: data
            },
            updatedAt: new Date().toISOString()
          }
          
          // 更新项目列表中的项目
          const updatedProjects = state.projects.map(p => 
            p.id === updatedProject.id ? updatedProject : p
          )
          
          return {
            ...state,
            currentProject: updatedProject,
            projects: updatedProjects
          }
        })
      },
      
      startPreview: (object) => {
        set({
          previewMode: true,
          previewObject: object,
          previewPosition: object.initialPosition || null,
          selectedObjects: []
        })
      },
      
      updatePreviewPosition: (position) => {
        set({ previewPosition: position })
      },
      
      placePreviewObject: (position) => {
        const { previewObject } = get()
        if (!previewObject) return
        
        const objectData: Omit<ObjectConfig, 'id' | 'name'> & { name?: string } = {
          type: previewObject.type,
          model: previewObject.model,
          position,
          rotation: previewObject.initialRotation || 0,
          metadata: previewObject.metadata
          // name字段会由addObject自动生成
        }
        
        get().addObject(objectData)
        get().cancelPreview()
      },
      
      cancelPreview: () => {
        set({
          previewMode: false,
          previewObject: null,
          previewPosition: null
        })
      },
      
      addToHistory: () => {
        const { currentProject, history, historyIndex } = get()
        if (!currentProject) return
        
        // 删除当前索引之后的历史记录（如果用户在撤销后做了新操作）
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push({ ...currentProject })
        
        // 限制历史记录数量（最多10级）
        const limitedHistory = newHistory.length > 10 
          ? newHistory.slice(-10) 
          : newHistory
        
        set({
          history: limitedHistory,
          historyIndex: limitedHistory.length - 1
        })
      },
      
      undo: () => {
        const { history, historyIndex } = get()
        if (historyIndex > 0) {
          const previousProject = history[historyIndex - 1]
          set(state => ({
            currentProject: previousProject,
            projects: state.projects.map(p => 
              p.id === previousProject.id ? previousProject : p
            ),
            historyIndex: historyIndex - 1,
            selectedObjects: []
          }))
        }
      },
      
      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex < history.length - 1) {
          const nextProject = history[historyIndex + 1]
          set(state => ({
            currentProject: nextProject,
            projects: state.projects.map(p => 
              p.id === nextProject.id ? nextProject : p
            ),
            historyIndex: historyIndex + 1,
            selectedObjects: []
          }))
        }
      },
      
      exportSnapshot: () => {
        // 这个功能会在SceneEditor组件中实现
        console.log('导出快照功能')
      },
      
      generateThumbnail: (dataUrl) => {
        set(state => {
          if (!state.currentProject) return state
          
          const updatedProject = {
            ...state.currentProject,
            thumbnail: dataUrl,
            updatedAt: new Date().toISOString()
          }
          
          return {
            currentProject: updatedProject,
            projects: state.projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            )
          }
        })
      }
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({ 
        projects: state.projects,
        currentProject: state.currentProject 
      })
    }
  )
) 