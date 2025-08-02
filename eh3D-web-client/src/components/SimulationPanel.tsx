import React from 'react'
import { Package, Users } from 'lucide-react'

interface SimulationPanelProps {
  onConfigClick?: (configType: 'package-flow' | 'community') => void
  selectedConfig?: 'package-flow' | 'community' | null
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ onConfigClick, selectedConfig }) => {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">仿真配置</h2>
        </div>
        <p className="text-sm text-gray-600">配置仿真运行的关键参数</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {/* 包裹流量配置卡片 */}
          <div 
            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedConfig === 'package-flow'
                ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-20'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onConfigClick?.('package-flow')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100">
                <Package size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">包裹流量</h3>
                <p className="text-sm text-gray-600">设置每日上午和下午到站件数</p>
              </div>
            </div>
          </div>

          {/* 社区人数配置卡片 */}
          <div 
            className={`rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedConfig === 'community'
                ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500 ring-opacity-20'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onConfigClick?.('community')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100">
                <Users size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">社区人数</h3>
                <p className="text-sm text-gray-600">设置取走包裹的频率和用户数</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimulationPanel 