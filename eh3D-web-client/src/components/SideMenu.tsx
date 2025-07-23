import React from 'react'
import { Package, TrendingUp, BarChart3 } from 'lucide-react'

interface SideMenuProps {
  activeMenu: 'objects' | 'traffic' | 'statistics'
  onMenuChange: (menu: 'objects' | 'traffic' | 'statistics') => void
}

const SideMenu: React.FC<SideMenuProps> = ({ activeMenu, onMenuChange }) => {
  const menuItems = [
    {
      id: 'objects' as const,
      icon: Package,
      label: '物品库',
      description: '管理3D模型和对象'
    },
    {
      id: 'traffic' as const,
      icon: TrendingUp,
      label: '流量配置',
      description: '配置流量参数'
    },
    {
      id: 'statistics' as const,
      icon: BarChart3,
      label: '数据统计',
      description: '查看统计数据'
    }
  ]

  return (
    <div className="w-16 h-full bg-gray-100 flex flex-col items-center py-4 border-r border-gray-200">
      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`
                w-12 h-12 rounded-lg flex items-center justify-center
                transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-primary-600 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              `}
              title={item.label}
            >
              <Icon size={20} />
              
              {/* 工具提示 */}
              <div className="absolute left-16 bg-gray-800 text-white text-xs px-2 py-1 
                            rounded opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none whitespace-nowrap z-50 ml-2">
                <div className="font-medium">{item.label}</div>
                <div className="text-gray-300 text-xs">{item.description}</div>
                {/* 箭头 */}
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1
                              w-0 h-0 border-r-4 border-r-gray-800 
                              border-t-2 border-t-transparent 
                              border-b-2 border-b-transparent"></div>
              </div>
            </button>
          )
        })}
      </div>
      
      {/* 激活指示器 */}
      <div className="absolute left-0 w-1 bg-primary-600 rounded-r transition-all duration-300"
           style={{
             height: '48px',
             top: `${16 + menuItems.findIndex(item => item.id === activeMenu) * 56}px`
           }}>
      </div>
    </div>
  )
}

export default SideMenu 