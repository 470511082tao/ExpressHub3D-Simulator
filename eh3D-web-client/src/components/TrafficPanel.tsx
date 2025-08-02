import React from 'react'
import { Settings, Monitor, Package, Cog } from 'lucide-react'

interface TrafficPanelProps {
  onConfigClick?: (configType: 'operation' | 'staff' | 'package' | 'items') => void
  selectedConfig?: 'operation' | 'staff' | 'package' | 'items' | null
}

const TrafficPanel: React.FC<TrafficPanelProps> = ({ onConfigClick, selectedConfig }) => {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">成本计算</h2>
        </div>
        <p className="text-sm text-gray-600">通过配置模拟统计运营成本</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {/* 运营配置卡片 */}
          <div 
            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedConfig === 'operation'
                ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-20'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onConfigClick?.('operation')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                <Settings size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">运营配置</h3>
                <p className="text-sm text-gray-600">配置运营和管理成本</p>
              </div>
            </div>
          </div>

          {/* 物品成本计算卡片 - 移到第二位 */}
          <div 
            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedConfig === 'items'
                ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-20'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onConfigClick?.('items')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-100">
                <Cog size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">物品成本</h3>
                <p className="text-sm text-gray-600">查看场景中所有物品的成本统计</p>
              </div>
            </div>
          </div>

          {/* 软件系统卡片 - 移到第三位 */}
          <div 
            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedConfig === 'staff'
                ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-20'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onConfigClick?.('staff')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100">
                <Monitor size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">软件系统</h3>
                <p className="text-sm text-gray-600">配置软件系统使用成本</p>
              </div>
            </div>
          </div>

          {/* 包裹成本计算卡片 - 移到第四位 */}
          <div 
            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedConfig === 'package'
                ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-20'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onConfigClick?.('package')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-100">
                <Package size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">包裹成本</h3>
                <p className="text-sm text-gray-600">配置包裹管理成本和处理策略</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrafficPanel 