import React from 'react'
import { BarChart3, PieChart, Activity, TrendingUp } from 'lucide-react'

const StatisticsPanel: React.FC = () => {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold text-gray-900">数据统计</h2>
        </div>
        <p className="text-sm text-gray-600">查看仿真数据和性能统计信息</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* 统计卡片网格 */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">流量统计</h3>
                  <p className="text-sm text-gray-600">查看人流量和使用率数据</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">功能开发中...</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <PieChart size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">效率分析</h3>
                  <p className="text-sm text-gray-600">分析场景运行效率和瓶颈</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">功能开发中...</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Activity size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">实时监控</h3>
                  <p className="text-sm text-gray-600">监控当前仿真状态和指标</p>
                </div>
              </div>
              <div className="text-center py-8 text-gray-500">
                <div className="text-sm">功能开发中...</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">趋势分析</h3>
                  <p className="text-sm text-gray-600">查看历史趋势和预测数据</p>
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

export default StatisticsPanel 