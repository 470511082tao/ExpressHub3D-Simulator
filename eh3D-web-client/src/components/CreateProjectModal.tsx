import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '../lib/state/projectStore'

interface CreateProjectModalProps {
  onClose: () => void
  onProjectCreated: () => void
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ 
  onClose, 
  onProjectCreated 
}) => {
  const { createProject } = useProjectStore()
  const [formData, setFormData] = useState({
    name: '',
    width: 20,
    length: 15,
    height: 4,
    template: 'empty' // empty | standard
  })

  const templates = [
    {
      id: 'empty',
      name: '空场地',
      description: '从空白场地开始设计',
      preview: '📦'
    },
    {
      id: 'standard',
      name: '标准驿站',
      description: '包含基础设施的驿站模板',
      preview: '🏪'
    }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    createProject(
      formData.name.trim(),
      [formData.length, formData.width, formData.height]
    )
    
    onProjectCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">新建项目</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 项目名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              项目名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="请输入项目名称"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg 
                       text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          {/* 场地尺寸 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              场地尺寸 (米)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">长度</label>
                <input
                  type="number"
                  value={formData.length}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    length: Math.max(1, parseInt(e.target.value) || 1) 
                  }))}
                  min="1"
                  max="100"
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded 
                           text-gray-900 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">宽度</label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    width: Math.max(1, parseInt(e.target.value) || 1) 
                  }))}
                  min="1"
                  max="100"
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded 
                           text-gray-900 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">高度</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    height: Math.max(1, parseInt(e.target.value) || 1) 
                  }))}
                  min="1"
                  max="20"
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded 
                           text-gray-900 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* 模板选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择模板
            </label>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.template === template.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={formData.template === template.id}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      template: e.target.value 
                    }))}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-2">{template.preview}</div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {template.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 
                       rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       text-white rounded-lg transition-colors"
            >
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProjectModal 