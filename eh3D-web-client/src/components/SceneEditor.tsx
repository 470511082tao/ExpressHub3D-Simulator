import React, { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Sky } from '@react-three/drei'
// import { Physics } from '@react-three/cannon' // 已禁用物理引擎但保留导入以备后用
import Toolbar from './Toolbar'
import ObjectPalette from './ObjectPalette'
import SideMenu from './SideMenu'
import TrafficPanel from './TrafficPanel'
import StatisticsPanel from './StatisticsPanel'
import Scene3D from './Scene3D'
import PropertiesPanel from './PropertiesPanel'
import FPSControls from './FPSControls'
import { useProjectStore } from '../lib/state/projectStore'

interface SceneEditorProps {
  onBackToProjects: () => void
}

const SceneEditor: React.FC<SceneEditorProps> = ({ onBackToProjects }) => {
  const { currentProject, selectedObjects, previewMode, cancelPreview, clearSelection } = useProjectStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fps'>('orbit')
  const [activeMenu, setActiveMenu] = useState<'objects' | 'traffic' | 'statistics'>('objects')

  // 渲染左侧面板内容
  const renderLeftPanel = () => {
    switch (activeMenu) {
      case 'objects':
        return <ObjectPalette />
      case 'traffic':
        return <TrafficPanel />
      case 'statistics':
        return <StatisticsPanel />
      default:
        return <ObjectPalette />
    }
  }

  // ESC键取消预览模式和选中 + Delete键删除选中对象
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (previewMode) {
        cancelPreview()
        } else if (selectedObjects.length > 0) {
          clearSelection()
        }
      }
      // Delete键删除选中对象
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedObjects.length > 0) {
        import('../lib/state/projectStore').then(({ useProjectStore }) => {
          const { deleteObject } = useProjectStore.getState()
          deleteObject(selectedObjects[0])
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewMode, cancelPreview, selectedObjects, clearSelection])

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl text-gray-900 mb-4">未选择项目</h2>
          <button
            onClick={onBackToProjects}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          >
            返回项目列表
          </button>
        </div>
      </div>
    )
  }

  const [length, width, height] = currentProject.dimensions

  const exportSnapshot = () => {
    if (!canvasRef.current) return
    
    // 生成高质量截图
    const canvas = canvasRef.current
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${currentProject.name}-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    }, 'image/png', 1.0)
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <Toolbar
        onBackToProjects={onBackToProjects}
        onExportSnapshot={exportSnapshot}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        cameraMode={cameraMode}
        onChangeCameraMode={setCameraMode}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧菜单系统 */}
        <div className="flex h-full">
          {/* 父级菜单 */}
          <SideMenu activeMenu={activeMenu} onMenuChange={setActiveMenu} />
          
          {/* 内容面板 */}
          <div className="w-56 h-full bg-white border-r border-gray-200 flex flex-col">
            {renderLeftPanel()}
          </div>
        </div>

        {/* 3D场景区域 */}
        <div className="flex-1 relative min-w-0">
          {/* 预览模式提示 - 移到视图上方 */}
          {previewMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 
                          bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
              <div className="text-center">
                <div className="text-sm font-medium mb-1">预览模式</div>
                <div className="text-xs">点击场景放置对象，按ESC取消</div>
              </div>
            </div>
          )}

          {/* 右侧属性面板 - 绝对定位覆盖 */}
          {selectedObjects.length > 0 && (
            <div className="absolute top-0 right-0 h-full z-20">
              <PropertiesPanel />
            </div>
          )}

          <Canvas
            ref={canvasRef}
            shadows
            dpr={[1, 2]}
            camera={{
              position: [length / 2 + 10, height + 5, width / 2 + 10],
              fov: 50,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
              preserveDrawingBuffer: false,
              failIfMajorPerformanceCaveat: false
            }}
            onCreated={({ gl }) => {
              // 设置WebGL错误处理
              
              // 监听WebGL错误
              gl.getContext()?.getExtension('WEBGL_debug_renderer_info')
            }}
            onError={(error) => {
              console.error('Canvas渲染错误:', error)
            }}
            className="bg-gradient-to-b from-sky-400 to-sky-100"
          >
            <Suspense fallback={null}>
              {/* 照明系统 */}
              <ambientLight intensity={0.4} />
              <directionalLight
                position={[length / 2, height * 2, width / 2]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={100}
                shadow-camera-left={-length}
                shadow-camera-right={length}
                shadow-camera-top={width}
                shadow-camera-bottom={-width}
              />
              
              {/* 天空盒 */}
              <Sky
                distance={450000}
                sunPosition={[length / 2, height * 3, width / 2]}
                inclination={0}
                azimuth={0.25}
              />

              {/* 物理引擎 - 已禁用但保留代码以备后用 */}
              {/* <Physics
                gravity={[0, -9.81, 0]}
                defaultContactMaterial={{
                  restitution: 0.1,
                  friction: 0.8
                }}
              > */}
                {/* 主场景 */}
                <Scene3D />
              {/* </Physics> */}

              {/* 网格辅助线 */}
              {showGrid && (
                <Grid
                  position={[length / 2, 0, width / 2]}
                  args={[Math.max(length, width), Math.max(length, width)]}
                  cellSize={1}
                  cellThickness={0.5}
                  cellColor="rgba(255,255,255,0.1)"
                  sectionSize={5}
                  sectionThickness={1}
                  sectionColor="rgba(255,255,255,0.2)"
                  fadeDistance={200}
                  fadeStrength={1}
                  infiniteGrid
                />
              )}

              {/* 相机控制 - 根据模式切换 */}
              {cameraMode === 'orbit' ? (
                <OrbitControls
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  dampingFactor={0.05}
                  target={[length / 2, height / 2, width / 2]}
                  maxPolarAngle={Math.PI / 2}
                  minDistance={5}
                  maxDistance={200}
                  autoRotate={false}
                  enableDamping={true}
                />
              ) : (
                <FPSControls
                  position={[length / 2, height + 2, width / 2 + 5]}
                  target={[length / 2, height / 2, width / 2]}
                />
              )}


            </Suspense>
          </Canvas>
        </div>
      </div>
    </div>
  )
}

export default SceneEditor 