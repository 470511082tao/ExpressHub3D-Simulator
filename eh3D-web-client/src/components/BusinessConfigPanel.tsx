import React, { useState, useEffect } from 'react'
import { Settings, X, ExternalLink } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'
import { indexedDBStorage } from '../lib/storage/indexedDB'

interface BusinessConfigData {
  storeAddress: string
  managerCount: number
  employeeCount: number
  managerSalary: number
  employeeSalary: number
  monthlyRent: number
  monthlyUtilities: number
  // 软件系统配置
  systemUsageFee: number // 系统使用费/月
}

interface PackageFlowData {
  smsNotificationFee: number // 短信通知费/件
  consumableCost: number // 耗材成本/件
}

interface ItemCostSummary {
  modelName: string
  category: string
  count: number
  unitCost: number
  totalCost: number
}

interface BusinessConfigPanelProps {
  configType: 'operation' | 'staff' | 'package' | 'items'
  onClose: () => void
  onNavigateToSimulation?: (configType: 'package-flow' | 'community') => void
}

const BusinessConfigPanel: React.FC<BusinessConfigPanelProps> = ({ configType, onClose, onNavigateToSimulation }) => {
  const [formData, setFormData] = useState<BusinessConfigData>({
    storeAddress: '',
    managerCount: 1,
    employeeCount: 3,
    managerSalary: 8000,
    employeeSalary: 4500,
    monthlyRent: 15000,
    monthlyUtilities: 1200,
    // 软件系统配置默认值
    systemUsageFee: 500
  })

  const [packageFlowData, setPackageFlowData] = useState<PackageFlowData>({
    smsNotificationFee: 0.1,
    consumableCost: 0.5
  })

  const [itemCostSummary, setItemCostSummary] = useState<ItemCostSummary[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  const { currentProject, updateBusinessConfig } = useProjectStore()

  // 加载物品成本统计
  const loadItemCostSummary = async () => {
    if (!currentProject || configType !== 'items') return
    
    setIsLoadingItems(true)
    try {
      await indexedDBStorage.init()
      
      // 统计场景中的所有物品
      const itemStats = new Map<string, {
        modelName: string
        category: string
        count: number
        unitCost: number
      }>()
      
      // 遍历项目中的所有对象
      for (const obj of currentProject.objects) {
        if (obj.metadata?.isAdminModel && obj.metadata?.adminModelId) {
          // 获取模型数据
          const modelData = await indexedDBStorage.getModelById(obj.metadata.adminModelId)
          if (modelData) {
            const key = modelData.id
            if (itemStats.has(key)) {
              itemStats.get(key)!.count++
            } else {
              itemStats.set(key, {
                modelName: modelData.name,
                category: modelData.category,
                count: 1,
                unitCost: modelData.cost || 0
              })
            }
          }
        }
      }
      
      // 转换为数组并计算总成本
      const summary: ItemCostSummary[] = Array.from(itemStats.values()).map(item => ({
        modelName: item.modelName,
        category: item.category,
        count: item.count,
        unitCost: item.unitCost,
        totalCost: item.count * item.unitCost
      }))
      
      setItemCostSummary(summary)
    } catch (error) {
      console.error('加载物品成本统计失败:', error)
      setItemCostSummary([])
    } finally {
      setIsLoadingItems(false)
    }
  }

  useEffect(() => {
    if (currentProject?.businessConfig) {
      const businessConfig = currentProject.businessConfig
      
      // 加载运营配置
      if (businessConfig.operation && configType === 'operation') {
        const operationConfig = businessConfig.operation
        setFormData({
          storeAddress: operationConfig.storeAddress || '',
          managerCount: operationConfig.managerCount || 1,
          employeeCount: operationConfig.employeeCount || 3,
          managerSalary: operationConfig.managerSalary || 8000,
          employeeSalary: operationConfig.employeeSalary || 4500,
          monthlyRent: operationConfig.monthlyRent || 15000,
          monthlyUtilities: operationConfig.monthlyUtilities || 1200,
          systemUsageFee: 500,
        })
      }
      
      // 加载软件系统配置
      if (businessConfig.staff && configType === 'staff') {
        setFormData(prev => ({
          ...prev,
          systemUsageFee: businessConfig.staff.systemUsageFee || 500
        }))
      }
      
      // 加载包裹成本计算
      if (businessConfig.package && configType === 'package') {
        setPackageFlowData({
          smsNotificationFee: businessConfig.package.smsNotificationFee || 0.1,
          consumableCost: businessConfig.package.consumableCost || 0.5
        })
      }
      
      // 加载物品成本统计
      if (configType === 'items') {
        loadItemCostSummary()
      }
    }
  }, [currentProject, configType])

  const handleInputChange = (field: keyof BusinessConfigData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getConfigTitle = () => {
    switch (configType) {
      case 'operation':
        return '运营配置'
      case 'staff':
        return '软件系统'
      case 'package':
        return '包裹成本'
      case 'items':
        return '物品成本'
      default:
        return '成本计算'
    }
  }

  const handleSave = () => {
    switch (configType) {
      case 'operation':
        updateBusinessConfig('operation', {
          storeAddress: formData.storeAddress,
          managerCount: formData.managerCount,
          employeeCount: formData.employeeCount,
          managerSalary: formData.managerSalary,
          employeeSalary: formData.employeeSalary,
          monthlyRent: formData.monthlyRent,
          monthlyUtilities: formData.monthlyUtilities
        })
        break
      case 'staff':
        updateBusinessConfig('staff', {
          systemUsageFee: formData.systemUsageFee
        })
        break
      case 'package':
        updateBusinessConfig('package', {
          smsNotificationFee: packageFlowData.smsNotificationFee,
          consumableCost: packageFlowData.consumableCost
        })
        break
    }
    onClose()
  }

  const renderOperationConfig = () => {
    const totalOperationCost = formData.managerCount * formData.managerSalary + formData.employeeCount * formData.employeeSalary + formData.monthlyRent + formData.monthlyUtilities
    
    return (
      <div className="space-y-4">
        {/* 成本汇总 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h3 className="text-xs font-medium text-gray-700 mb-2">成本汇总</h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">¥{totalOperationCost.toLocaleString()}</div>
              <div className="text-xs text-gray-600">月度运营成本</div>
            </div>
          </div>
        </div>

        {/* 门店地址 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          门店地址
        </label>
        <input
          type="text"
          value={formData.storeAddress}
          onChange={(e) => handleInputChange('storeAddress', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 
                   focus:ring-primary-500 focus:border-primary-500"
          placeholder="请输入门店详细地址"
        />
      </div>

      {/* 人员配置 */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">门店人员配置</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">店长人数</label>
            <input
              type="number"
              min="0"
              value={formData.managerCount}
              onChange={(e) => handleInputChange('managerCount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">店员人数</label>
            <input
              type="number"
              min="0"
              value={formData.employeeCount}
              onChange={(e) => handleInputChange('employeeCount', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* 工资成本 */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">人工成本（月）</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">店长月薪（元）</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.managerSalary}
              onChange={(e) => handleInputChange('managerSalary', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">店员月薪（元）</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.employeeSalary}
              onChange={(e) => handleInputChange('employeeSalary', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            总人工成本：<span className="font-medium text-gray-900">
              ¥{(formData.managerCount * formData.managerSalary + formData.employeeCount * formData.employeeSalary).toLocaleString()}/月
            </span>
          </div>
        </div>
      </div>

      {/* 运营成本 */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">运营成本（月）</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">门店租金（元）</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.monthlyRent}
              onChange={(e) => handleInputChange('monthlyRent', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">水电费（元）</label>
            <input
              type="number"
              min="0"
              step="50"
              value={formData.monthlyUtilities}
              onChange={(e) => handleInputChange('monthlyUtilities', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
      </div>
    </div>
  )
}

  const renderStaffConfig = () => (
    <div className="space-y-4">
      {/* 成本汇总 */}
      <div className="bg-green-50 rounded-lg p-3">
        <h3 className="text-xs font-medium text-gray-700 mb-2">成本汇总</h3>
        <div className="grid grid-cols-1 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">¥{formData.systemUsageFee.toLocaleString()}</div>
            <div className="text-xs text-gray-600">月度系统成本</div>
          </div>
        </div>
      </div>

      {/* 系统使用费 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">软件系统配置</label>
        
        <div>
          <label className="block text-sm text-gray-600 mb-1">系统使用费（元/月）</label>
          <input
            type="number"
            min="0"
            step="10"
            value={formData.systemUsageFee}
            onChange={(e) => handleInputChange('systemUsageFee', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                     focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

      </div>
    </div>
  )

  const renderPackageConfig = () => {
    // 从包裹流量配置中获取日均包裹量
    const packageFlowConfig = currentProject?.businessConfig?.packageFlow
    const dailyTotal = packageFlowConfig ? (packageFlowConfig.morningPackages + packageFlowConfig.afternoonPackages) : 0
    
    const monthlyPackageCost = (packageFlowData.smsNotificationFee + packageFlowData.consumableCost) * dailyTotal * 30
    
    return (
      <div className="space-y-4">
        {/* 成本汇总 */}
        <div className="bg-purple-50 rounded-lg p-3">
          <h3 className="text-xs font-medium text-gray-700 mb-2">成本汇总</h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">¥{monthlyPackageCost.toFixed(0)}</div>
              <div className="text-xs text-gray-600">月度包裹成本</div>
            </div>
          </div>
        </div>

        {/* 包裹处理成本 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">包裹处理成本</label>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">短信通知费（元/件）</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={packageFlowData.smsNotificationFee}
              onChange={(e) => setPackageFlowData(prev => ({ ...prev, smsNotificationFee: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">耗材成本（元/件）</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={packageFlowData.consumableCost}
              onChange={(e) => setPackageFlowData(prev => ({ ...prev, consumableCost: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        

      </div>

      {/* 处理量配置 */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">处理量配置</h4>
        
        <div>
          <label className="block text-sm text-gray-600 mb-1">日均包裹处理量（件/天）</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-gray-700">
              {dailyTotal} 件/天
            </div>
            <button
              onClick={() => onNavigateToSimulation?.('package-flow')}
              className="px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 
                       rounded border border-primary-200 hover:border-primary-300 transition-colors
                       flex items-center gap-1"
              title="点击修改包裹流量"
            >
              <ExternalLink size={14} />
              修改
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            数据来源于包裹流量配置，如需修改请点击"修改"按钮
          </p>
        </div>
      </div>
    </div>
  )
}

  const renderItemsConfig = () => {
    const totalCost = itemCostSummary.reduce((sum, item) => sum + item.totalCost, 0)
    const totalCount = itemCostSummary.reduce((sum, item) => sum + item.count, 0)
    
    return (
      <div className="space-y-4">
        {isLoadingItems ? (
          <div className="text-center py-8">
            <div className="text-gray-500">正在加载物品成本统计...</div>
          </div>
        ) : (
          <>
            {/* 成本汇总 */}
            <div className="bg-orange-50 rounded-lg p-3">
              <h3 className="text-xs font-medium text-gray-700 mb-2">成本汇总</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{totalCount}</div>
                  <div className="text-xs text-gray-600">物品总数</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">¥{totalCost.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">物品总成本</div>
                </div>
              </div>
            </div>

            {/* 物品明细 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">物品明细</h3>
              {itemCostSummary.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  场景中暂无物品
                </div>
              ) : (
                <div className="space-y-3">
                  {itemCostSummary.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{item.modelName}</div>
                          <div className="text-sm text-gray-500">{item.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">¥{item.totalCost.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">总计</div>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>数量: {item.count}个</span>
                        <span>单价: ¥{item.unitCost.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 刷新按钮 */}
            <div className="pt-4">
              <button
                onClick={loadItemCostSummary}
                disabled={isLoadingItems}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingItems ? '加载中...' : '刷新统计'}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (configType) {
      case 'operation':
        return renderOperationConfig()
      case 'staff':
        return renderStaffConfig()
      case 'package':
        return renderPackageConfig()
      case 'items':
        return renderItemsConfig()
      default:
        return renderOperationConfig()
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-gray-900 font-medium flex items-center gap-2">
            <Settings size={16} />
            {getConfigTitle()}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <X size={16} />
          </button>
        </div>
        
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {renderContent()}
      </div>

      {/* 底部操作按钮 */}
      {configType !== 'items' && (
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      )}
      
      {/* 物品成本计算只显示关闭按钮 */}
      {configType === 'items' && (
        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  )
}

export default BusinessConfigPanel 