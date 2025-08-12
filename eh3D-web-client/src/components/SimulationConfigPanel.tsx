import React, { useState, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'

interface DeliveryData {
  morningPackages: number // 上午到站件数
  afternoonPackages: number // 下午到站件数
  peakHourMultiplier: number // 高峰时段倍数
  averageRetentionHours: number // 平均滞留时长 (小时)
  smallPackageRatio: number // 小包裹比例 (%)
  largePackageRatio: number // 大包裹比例 (%)
}

interface PickupData {
  pickupFrequency: number // 取件频率 (次/天)
  averagePickupTime: number // 平均取件时间 (分钟)
}

interface SimulationConfigPanelProps {
  configType: 'package-flow' | 'community'
  onClose: () => void
}

const SimulationConfigPanel: React.FC<SimulationConfigPanelProps> = ({ configType, onClose }) => {
  const [deliveryData, setDeliveryData] = useState<DeliveryData>({
    morningPackages: 150,
    afternoonPackages: 100,
    peakHourMultiplier: 1.5,
    averageRetentionHours: 24,
    smallPackageRatio: 90,
    largePackageRatio: 10
  })

  const [pickupData, setPickupData] = useState<PickupData>({
    pickupFrequency: 1.2,
    averagePickupTime: 3
  })

  const { currentProject, updateBusinessConfig } = useProjectStore()

  useEffect(() => {
    if (currentProject?.businessConfig) {
      const businessConfig = currentProject.businessConfig
      
      // 加载派件设置配置
      if (businessConfig.packageFlow && configType === 'package-flow') {
        setDeliveryData({
          morningPackages: businessConfig.packageFlow.morningPackages || 150,
          afternoonPackages: businessConfig.packageFlow.afternoonPackages || 100,
          peakHourMultiplier: businessConfig.packageFlow.peakHourMultiplier || 1.5,
          averageRetentionHours: businessConfig.packageFlow.averageRetentionHours || 24,
          smallPackageRatio: businessConfig.packageFlow.smallPackageRatio || 90,
          largePackageRatio: businessConfig.packageFlow.largePackageRatio || 10
        })
      }
      
      // 加载取件设置配置
      if (businessConfig.community && configType === 'community') {
        setPickupData({
          pickupFrequency: businessConfig.community.pickupFrequency || 1.2,
          averagePickupTime: businessConfig.community.averagePickupTime || 3
        })
      }
    }
  }, [currentProject, configType])

  const getConfigTitle = () => {
    switch (configType) {
      case 'package-flow':
        return '派件设置'
      case 'community':
        return '取件设置'
      default:
        return '仿真配置'
    }
  }

  const handleSave = () => {
    switch (configType) {
      case 'package-flow':
        updateBusinessConfig('packageFlow', deliveryData)
        break
      case 'community':
        updateBusinessConfig('community', pickupData)
        break
    }
    onClose()
  }

  const renderDeliveryConfig = () => {
    const dailyTotal = deliveryData.morningPackages + deliveryData.afternoonPackages
    
    return (
      <div className="space-y-4">
        {/* 成本汇总 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h3 className="text-xs font-medium text-gray-700 mb-2">流量汇总</h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{dailyTotal}</div>
              <div className="text-xs text-gray-600">日均包裹量</div>
            </div>
            {/* <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{peakHourPackages}</div>
              <div className="text-xs text-gray-600">高峰小时量</div>
            </div> */}
          </div>
        </div>

        {/* 流量配置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">每日到站包裹数量</label>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">上午到站件数</label>
              <input
                type="number"
                min="0"
                value={deliveryData.morningPackages}
                onChange={(e) => setDeliveryData(prev => ({ ...prev, morningPackages: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">下午到站件数</label>
              <input
                type="number"
                min="0"
                value={deliveryData.afternoonPackages}
                onChange={(e) => setDeliveryData(prev => ({ ...prev, afternoonPackages: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* 包裹尺寸比例配置 */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">包裹尺寸比例</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">小包裹 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={deliveryData.smallPackageRatio}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    const largeRatio = 100 - value
                    setDeliveryData(prev => ({ 
                      ...prev, 
                      smallPackageRatio: value,
                      largePackageRatio: largeRatio
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                           focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">大包裹 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={deliveryData.largePackageRatio}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    const smallRatio = 100 - value
                    setDeliveryData(prev => ({ 
                      ...prev, 
                      smallPackageRatio: smallRatio,
                      largePackageRatio: value
                    }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                           focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 高峰时段配置 */}
        {/* <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">高峰时段配置</h4>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">高峰时段倍数</label>
            <input
              type="number"
              min="1"
              max="3"
              step="0.1"
              value={packageFlowData.peakHourMultiplier}
              onChange={(e) => setPackageFlowData(prev => ({ ...prev, peakHourMultiplier: parseFloat(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              高峰小时包裹量 = 上午件数 × 倍数
            </p>
          </div>
        </div> */}

        {/* 滞留时长配置 */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">滞留时长配置</h4>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">平均滞留时长 (小时)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={deliveryData.averageRetentionHours}
              onChange={(e) => setDeliveryData(prev => ({ ...prev, averageRetentionHours: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                       focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              包裹在快递柜中的平均停留时间
            </p>
          </div>
        </div>


      </div>
    )
  }

  const renderPickupConfig = () => {
    return (
      <div className="space-y-4">
        {/* 取件行为配置 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">取件行为配置</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">取件频率 (次/天)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={pickupData.pickupFrequency}
                onChange={(e) => setPickupData(prev => ({ ...prev, pickupFrequency: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                每个用户平均每天取件的次数
              </p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">平均取件时间 (分钟)</label>
              <input
                type="number"
                min="1"
                value={pickupData.averagePickupTime}
                onChange={(e) => setPickupData(prev => ({ ...prev, averagePickupTime: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                单次取件操作所需的平均时间
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (configType) {
      case 'package-flow':
        return renderDeliveryConfig()
      case 'community':
        return renderPickupConfig()
      default:
        return renderDeliveryConfig()
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
    </div>
  )
}

export default SimulationConfigPanel 