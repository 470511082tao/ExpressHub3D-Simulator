import React, { useState, useEffect } from 'react'
import { Settings, Move, RotateCw, Grid3X3 } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'
import { indexedDBStorage } from '../lib/storage/indexedDB'

// 格口模板配置接口
interface GridTemplate {
  rows: number
  columns: number
  enabled: boolean
  disabledCells?: number[]
}

// 模型数据接口
interface ModelData {
  id: string
  name: string
  category: string
  gridTemplate?: GridTemplate
}

// 生成格口编号的函数（与资产管理保持一致的纵向分布）
const generateCellCode = (index: number, rows: number, columns: number, isCabinet: boolean): string => {
  if (isCabinet) {
    // 快递柜：按列优先的纵向编号
    const displayRow = Math.floor(index / columns)
    const displayCol = index % columns
    const cellNumber = displayCol * rows + displayRow + 1
    return cellNumber.toString()
  } else {
    // 货架：字母+数字编号，按列优先
    const displayRow = Math.floor(index / columns)
    const displayCol = index % columns
    const rowLetter = String.fromCharCode(65 + displayRow) // A, B, C, ...
    const colNumber = displayCol + 1
    return `${rowLetter}${colNumber}`
  }
}

// 判断是否为快递柜类型（使用编号类型显示）
const isCabinetCategory = (category: string): boolean => {
  return category === '快递柜' || category.toLowerCase().includes('cabinet')
}

// 格口可视化组件
const SlotVisualization: React.FC<{ template: GridTemplate; modelData: ModelData | null }> = ({ template, modelData }) => {
  if (!template.enabled) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Grid3X3 size={48} className="mx-auto mb-4 opacity-50" />
        <p>该模型未启用格口布局</p>
      </div>
    )
  }

  const totalSlots = template.rows * template.columns
  const disabledCount = template.disabledCells?.length || 0
  const activeCount = totalSlots - disabledCount
  const isCabinet = modelData ? isCabinetCategory(modelData.category) : false

  return (
    <div className="space-y-4">
      {/* 格口统计信息 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <div className="text-gray-600">总格口数</div>
            <div className="font-bold text-lg text-blue-600">{totalSlots}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">可用格口</div>
            <div className="font-bold text-lg text-green-600">{activeCount}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600">禁用格口</div>
            <div className="font-bold text-lg text-red-600">{disabledCount}</div>
          </div>
        </div>
      </div>



      {/* 格口布局可视化 */}
      <div>
        <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
          <Grid3X3 size={14} />
          格口布局图
        </div>
        <div className="border border-gray-300 rounded-lg p-3 bg-white">
          <div 
            className="grid gap-1 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${template.columns}, 1fr)`,
              maxWidth: `${Math.min(template.columns * 32, 400)}px`
            }}
          >
                         {Array.from({ length: totalSlots }, (_, index) => {
               const isDisabled = template.disabledCells?.includes(index) || false
               const cellCode = generateCellCode(index, template.rows, template.columns, isCabinet)
              
              return (
                <div
                  key={index}
                  className={`
                    w-8 h-6 rounded flex items-center justify-center text-xs font-medium border transition-all
                    ${isDisabled 
                      ? 'bg-gray-300 text-gray-500 border-gray-400 opacity-50' // 禁用格口：灰色半透明
                      : isCabinet
                        ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' // 快递柜：蓝色系
                        : 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' // 货架：绿色系
                    }
                  `}
                  title={`格口 ${cellCode} ${isDisabled ? '(已禁用)' : '(可用)'}`}
                >
                  {cellCode}
                </div>
              )
            })}
          </div>
        </div>
      </div>


    </div>
  )
}

const PropertiesPanel: React.FC = () => {
  const { 
    currentProject, 
    selectedObjects, 
    updateObject, 
    clearSelection 
  } = useProjectStore()

  const [gridTemplate, setGridTemplate] = useState<GridTemplate | null>(null)
  const [modelData, setModelData] = useState<ModelData | null>(null)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)

  if (!currentProject || selectedObjects.length === 0) {
    return null
  }

  // 获取选中的对象（现在只支持单选）
  const obj = currentProject.objects.find(obj => 
    selectedObjects.includes(obj.id)
  )

  if (!obj) return null

  // 判断是否为管理后台上传的模型
  const isAdminModel = obj.metadata?.isAdminModel || false

  // 从IndexedDB加载真实的格口模板数据
  useEffect(() => {
    const loadGridTemplate = async () => {
      if (!isAdminModel || !obj.metadata?.adminModelId) {
        setGridTemplate(null)
        setModelData(null)
        return
      }

      setIsLoadingTemplate(true)
      try {
        await indexedDBStorage.init()
        const adminModelData = await indexedDBStorage.getModelById(obj.metadata.adminModelId)
        
        if (adminModelData && adminModelData.gridTemplate) {
          console.log('加载格口模板数据:', {
            modelId: adminModelData.id,
            modelName: adminModelData.name,
            category: adminModelData.category,
            gridTemplate: adminModelData.gridTemplate
          })
          
          setGridTemplate(adminModelData.gridTemplate)
          setModelData({
            id: adminModelData.id,
            name: adminModelData.name,
            category: adminModelData.category,
            gridTemplate: adminModelData.gridTemplate
          })
        } else {
          console.log('模型未配置格口模板或模型不存在:', {
            hasModel: !!adminModelData,
            hasGridTemplate: !!(adminModelData?.gridTemplate),
            modelId: obj.metadata.adminModelId
          })
          setGridTemplate(null)
          setModelData(null)
        }
      } catch (error) {
        console.error('加载格口模板失败:', error)
        setGridTemplate(null)
        setModelData(null)
      } finally {
        setIsLoadingTemplate(false)
      }
    }

    loadGridTemplate()
  }, [isAdminModel, obj.metadata?.adminModelId])

  // 判断是否应该显示格口可视化
  const shouldShowGridVisualization = isAdminModel && gridTemplate && gridTemplate.enabled
    
    const handlePositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
      const newPosition = [...obj.position] as [number, number, number]
      const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
      newPosition[axisIndex] = value
      updateObject(obj.id, { position: newPosition })
    }

    const handleRotationChange = (rotation: number) => {
      updateObject(obj.id, { rotation: rotation % 360 })
    }

    const handleMetadataChange = (key: string, value: any) => {
      updateObject(obj.id, {
        metadata: { ...obj.metadata, [key]: value }
      })
    }

    return (
      <div className="w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gray-900 font-medium flex items-center gap-2">
              <Settings size={16} />
              属性面板
            </h2>
            <button
              onClick={clearSelection}
              className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              ×
            </button>
          </div>
          
          {/* 对象信息 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="text-sm text-gray-600 mb-1">对象ID</div>
          <div className="text-gray-900 font-medium mb-2">{obj.id}</div>
          
          <div className="text-sm text-gray-600 mb-1">名称</div>
          <input
            type="text"
            value={obj.name}
            onChange={(e) => updateObject(obj.id, { name: e.target.value })}
            className="w-full px-2 py-1 bg-white border border-gray-300 rounded 
                     text-gray-900 text-sm focus:outline-none focus:border-primary-500"
            placeholder="输入模型名称"
          />
          
          <div className="text-sm text-gray-600 mb-1 mt-2">对象类型</div>
          <div className="text-gray-900 font-medium">
            {modelData?.name || obj.metadata?.adminModelName || obj.model}
          </div>
          </div>
        </div>

        {/* 属性编辑区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {/* 位置控制 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Move size={16} className="text-gray-500" />
              <h3 className="text-gray-900 font-medium">位置</h3>
            </div>
            <div className="space-y-2">
              {(['x', 'y', 'z'] as const).map((axis, index) => (
                <div key={axis} className="flex items-center gap-2">
                  <label className="w-4 text-xs text-gray-500 uppercase">
                    {axis}
                  </label>
                  <input
                    type="number"
                    value={obj.position[index].toFixed(2)}
                    onChange={(e) => handlePositionChange(axis, parseFloat(e.target.value) || 0)}
                    step="0.1"
                    className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 rounded 
                             text-gray-900 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <span className="text-xs text-gray-500">m</span>
                </div>
              ))}
            </div>
          </div>

          {/* 旋转控制 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <RotateCw size={16} className="text-gray-500" />
              <h3 className="text-gray-900 font-medium">旋转</h3>
            </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={obj.rotation}
              onChange={(e) => handleRotationChange(parseFloat(e.target.value) || 0)}
              step="1"
                  min="0"
              max="359"
              className="flex-1 px-2 py-1 bg-gray-50 border border-gray-300 rounded 
                           text-gray-900 text-sm focus:outline-none focus:border-primary-500"
                />
                <span className="text-xs text-gray-500">°</span>
            </div>
          </div>

          {/* 根据对象类型显示不同内容 */}
          {shouldShowGridVisualization ? (
            /* 格口可视化 - 仅对配置了格口模板的管理后台模型显示 */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Grid3X3 size={16} className="text-gray-500" />
                <h3 className="text-gray-900 font-medium">格口可视化</h3>
                {isLoadingTemplate && (
                  <div className="text-xs text-gray-500">加载中...</div>
                )}
              </div>
              {isLoadingTemplate ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">正在加载格口模板...</p>
                </div>
              ) : (
                <SlotVisualization template={gridTemplate!} modelData={modelData} />
              )}
            </div>
          ) : (
            /* 元数据编辑 - 对其他对象或未配置格口模板的对象显示传统属性面板 */
            obj.metadata && (
              <div>
              <h3 className="text-gray-900 font-medium mb-3">属性</h3>
                <div className="space-y-3">
                {obj.metadata.capacity && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        容量
                      </label>
                      <input
                        type="number"
                        value={obj.metadata.capacity}
                        onChange={(e) => handleMetadataChange('capacity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded 
                                 text-gray-900 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}
                  
                {obj.metadata.layers && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        层数
                      </label>
                      <input
                        type="number"
                        value={obj.metadata.layers}
                        onChange={(e) => handleMetadataChange('layers', parseInt(e.target.value) || 1)}
                        min="1"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded 
                               text-gray-900 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                )}

                {obj.metadata.width && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      宽度 (m)
                    </label>
                    <input
                      type="number"
                      value={obj.metadata.width}
                      onChange={(e) => handleMetadataChange('width', parseFloat(e.target.value) || 1)}
                      step="0.1"
                      min="0.1"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded 
                               text-gray-900 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                )}

                {obj.metadata.height && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      高度 (m)
                    </label>
                    <input
                      type="number"
                      value={obj.metadata.height}
                      onChange={(e) => handleMetadataChange('height', parseFloat(e.target.value) || 1)}
                      step="0.1"
                      min="0.1"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded 
                               text-gray-900 focus:outline-none focus:border-primary-500"
                    />
                  </div>
                )}

                {obj.metadata.depth && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      深度 (m)
                    </label>
                    <input
                      type="number"
                      value={obj.metadata.depth}
                      onChange={(e) => handleMetadataChange('depth', parseFloat(e.target.value) || 1)}
                      step="0.1"
                      min="0.1"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded 
                                 text-gray-900 focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}

                  {(obj.metadata as any)?.description && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        描述
                      </label>
                      <textarea
                        value={(obj.metadata as any).description}
                        onChange={(e) => handleMetadataChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded 
                                 text-gray-900 resize-none focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          )}
      </div>
    </div>
  )
}

export default PropertiesPanel 