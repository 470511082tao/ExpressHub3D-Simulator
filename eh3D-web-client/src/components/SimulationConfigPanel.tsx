import React, { useState, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'

interface PackageFlowData {
  morningPackages: number // 上午到站件数
  afternoonPackages: number // 下午到站件数
  peakHourMultiplier: number // 高峰时段倍数
  averageRetentionHours: number // 平均滞留时长 (小时)
  smallPackageRatio: number // 小包裹比例 (%)
  largePackageRatio: number // 大包裹比例 (%)
}

interface CommunityData {
  totalUsers: number // 社区总用户数
  activeUserRate: number // 活跃用户比例 (%)
  pickupFrequency: number // 取件频率 (次/天)
  averagePickupTime: number // 平均取件时间 (分钟)
}

interface SimulationConfigPanelProps {
  configType: 'package-flow' | 'community'
  onClose: () => void
}

const SimulationConfigPanel: React.FC<SimulationConfigPanelProps> = ({ configType, onClose }) => {
  const [packageFlowData, setPackageFlowData] = useState<PackageFlowData>({
    morningPackages: 150,
    afternoonPackages: 100,
    peakHourMultiplier: 1.5,
    averageRetentionHours: 24,
    smallPackageRatio: 90,
    largePackageRatio: 10
  })

  const [communityData, setCommunityData] = useState<CommunityData>({
    totalUsers: 1200,
    activeUserRate: 60,
    pickupFrequency: 1.2,
    averagePickupTime: 3
  })

  const { currentProject, updateBusinessConfig } = useProjectStore()

  useEffect(() => {
    if (currentProject?.businessConfig) {
      const businessConfig = currentProject.businessConfig
      
      // 加载包裹流量配置
      if (businessConfig.packageFlow && configType === 'package-flow') {
        setPackageFlowData({
          morningPackages: businessConfig.packageFlow.morningPackages || 150,
          afternoonPackages: businessConfig.packageFlow.afternoonPackages || 100,
          peakHourMultiplier: businessConfig.packageFlow.peakHourMultiplier || 1.5,
          averageRetentionHours: businessConfig.packageFlow.averageRetentionHours || 24,
          smallPackageRatio: businessConfig.packageFlow.smallPackageRatio || 90,
          largePackageRatio: businessConfig.packageFlow.largePackageRatio || 10
        })
      }
      
      // 加载社区人数配置
      if (businessConfig.community && configType === 'community') {
        setCommunityData({
          totalUsers: businessConfig.community.totalUsers || 1200,
          activeUserRate: businessConfig.community.activeUserRate || 60,
          pickupFrequency: businessConfig.community.pickupFrequency || 1.2,
          averagePickupTime: businessConfig.community.averagePickupTime || 3
        })
      }
    }
  }, [currentProject, configType])

  const getConfigTitle = () => {
    switch (configType) {
      case 'package-flow':
        return '包裹流量配置'
      case 'community':
        return '社区人数配置'
      default:
        return '仿真配置'
    }
  }

  const handleSave = () => {
    switch (configType) {
      case 'package-flow':
        updateBusinessConfig('packageFlow', packageFlowData)
        break
      case 'community':
        updateBusinessConfig('community', communityData)
        break
    }
    onClose()
  }

  const renderPackageFlowConfig = () => {
    const dailyTotal = packageFlowData.morningPackages + packageFlowData.afternoonPackages
    
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
                value={packageFlowData.morningPackages}
                onChange={(e) => setPackageFlowData(prev => ({ ...prev, morningPackages: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">下午到站件数</label>
              <input
                type="number"
                min="0"
                value={packageFlowData.afternoonPackages}
                onChange={(e) => setPackageFlowData(prev => ({ ...prev, afternoonPackages: parseInt(e.target.value) || 0 }))}
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
                  value={packageFlowData.smallPackageRatio}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    const largeRatio = 100 - value
                    setPackageFlowData(prev => ({ 
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
                  value={packageFlowData.largePackageRatio}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    const smallRatio = 100 - value
                    setPackageFlowData(prev => ({ 
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
              value={packageFlowData.averageRetentionHours}
              onChange={(e) => setPackageFlowData(prev => ({ ...prev, averageRetentionHours: parseInt(e.target.value) || 1 }))}
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

  const renderCommunityConfig = () => {
    const activeUsers = Math.ceil(communityData.totalUsers * communityData.activeUserRate / 100)
    const dailyPickups = Math.ceil(activeUsers * communityData.pickupFrequency)
    const totalPickupTime = dailyPickups * communityData.averagePickupTime
    
    return (
      <div className="space-y-4">
        {/* 成本汇总 */}
        <div className="bg-green-50 rounded-lg p-3">
          <h3 className="text-xs font-medium text-gray-700 mb-2">社区汇总</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{activeUsers}</div>
              <div className="text-xs text-gray-600">活跃用户数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{dailyPickups}</div>
              <div className="text-xs text-gray-600">日均取件次数</div>
            </div>
          </div>
        </div>

        {/* 社区基础配置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">社区基础信息</label>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">社区总用户数</label>
              <input
                type="number"
                min="0"
                value={communityData.totalUsers}
                onChange={(e) => setCommunityData(prev => ({ ...prev, totalUsers: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">活跃用户比例 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={communityData.activeUserRate}
                onChange={(e) => setCommunityData(prev => ({ ...prev, activeUserRate: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* 取件行为配置 */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">取件行为配置</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">取件频率 (次/天)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={communityData.pickupFrequency}
                onChange={(e) => setCommunityData(prev => ({ ...prev, pickupFrequency: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">平均取件时间 (分钟)</label>
              <input
                type="number"
                min="1"
                value={communityData.averagePickupTime}
                onChange={(e) => setCommunityData(prev => ({ ...prev, averagePickupTime: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 
                         focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <p>计算公式：</p>
            <p>• 活跃用户数 = 总用户数 × 活跃比例</p>
            <p>• 日均取件次数 = 活跃用户数 × 取件频率</p>
            <p>• 日总取件时间 = 日均取件次数 × 平均取件时间 = {totalPickupTime} 分钟</p>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (configType) {
      case 'package-flow':
        return renderPackageFlowConfig()
      case 'community':
        return renderCommunityConfig()
      default:
        return renderPackageFlowConfig()
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