import React from 'react'
import { Settings, Clock, Users } from 'lucide-react'

const TrafficPanel: React.FC = () => {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">流量配置</h2>
        </div>
        <p className="text-sm text-gray-600">配置仿真场景的流量参数和行为模式</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* 功能卡片 */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">人流量设置</h3>
                  <p className="text-sm text-gray-600">配置场景中的人员流量参数</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">功能开发中...</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">时间配置</h3>
                  <p className="text-sm text-gray-600">设置仿真时间和速度参数</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">功能开发中...</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">高级配置</h3>
                  <p className="text-sm text-gray-600">自定义流量行为和模式</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">功能开发中...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrafficPanel 