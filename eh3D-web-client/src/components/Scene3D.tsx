import React, { useState, useEffect } from 'react'
import { ThreeEvent } from '@react-three/fiber'
// import { useBox } from '@react-three/cannon' // 已禁用物理引擎但保留导入以备后用
import { Box, Text, Plane } from '@react-three/drei'
import { useProjectStore } from '../lib/state/projectStore'
import SceneObject from './SceneObject'
import GLBModel from './GLBModel'
import { indexedDBStorage, ModelData } from '../lib/storage/indexedDB'

interface Scene3DProps {
  showWalls?: boolean
  wallOpacity?: number
}

const Scene3D: React.FC<Scene3DProps> = ({ showWalls = false, wallOpacity = 0.7 }) => {
  const { 
    currentProject, 
    previewMode, 
    previewObject, 
    previewPosition,
    updatePreviewPosition,
    placePreviewObject,
    // cancelPreview // 保留以备后用
  } = useProjectStore()

  const [previewModelUrl, setPreviewModelUrl] = useState<string | null>(null)


  if (!currentProject) return null

  const [length, width, height] = currentProject.dimensions

  // 地面物理体 - 已禁用但保留代码以备后用
  /* const [groundRef] = useBox(() => ({
    position: [length / 2, -0.1, width / 2],
    args: [length, 0.2, width],
    type: 'Static',
    material: {
      friction: 0.8,
      restitution: 0.1
    }
  })) */

  // 处理预览对象的GLB模型URL - 优化版本
  useEffect(() => {
    console.log('Scene3D预览状态useEffect触发:', {
      previewMode,
      previewObject: !!previewObject,
      previewObjectId: previewObject?.type,
      isAdminModel: !!previewObject?.metadata?.isAdminModel,
      adminModelId: previewObject?.metadata?.adminModelId,
      hasAdminModelId: !!previewObject?.metadata?.adminModelId,
      currentPreviewModelUrl: previewModelUrl
    })

    if (previewMode && previewObject && previewObject.metadata?.isAdminModel && previewObject.metadata?.adminModelId) {
      console.log('Scene3D开始从IndexedDB加载预览GLB模型:', previewObject.metadata.adminModelId)
      
      // 从IndexedDB动态读取模型数据 - 优化版本
      const loadPreviewModelFromIndexedDB = async () => {
        try {
          // 确保IndexedDB已初始化
          await indexedDBStorage.init()
          
          const allModels = await indexedDBStorage.getAllModels()
          const modelData = allModels.find((model: ModelData) => model.id === previewObject.metadata?.adminModelId)
          
          if (modelData && modelData.fileContent) {
            console.log('从IndexedDB成功获取预览模型数据:', {
              modelId: modelData.id,
              fileName: modelData.fileName,
              fileSize: modelData.fileSize
            })
            
            // 将ArrayBuffer转换为Blob URL
            const blob = new Blob([modelData.fileContent], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)
            console.log('GLB预览URL创建成功:', url)
            setPreviewModelUrl(url)
          } else {
            console.error('IndexedDB中未找到预览模型数据或文件内容为空')
            setPreviewModelUrl(null)
          }
        } catch (error) {
          console.error('从IndexedDB加载预览模型失败:', error)
          setPreviewModelUrl(null)
        }
      }
      
      loadPreviewModelFromIndexedDB()
    } else {
      console.log('不是admin预览模型或没有adminModelId')
      setPreviewModelUrl(null)

    }
    
    // 清理函数：释放之前创建的Blob URL
    return () => {
      if (previewModelUrl && previewModelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewModelUrl)
      }
    }
  }, [previewMode, previewObject?.metadata?.isAdminModel, previewObject?.metadata?.adminModelId])

  // 预览对象的尺寸计算
  const getPreviewDimensions = (): [number, number, number] => {
    if (!previewObject) return [1, 1, 1]
    
    const defaultDimensions: Record<string, [number, number, number]> = {
      'cabinet_small': [0.6, 1.8, 0.5],
      'cabinet_medium': [1.2, 1.8, 0.6],
      'cabinet_large': [1.8, 1.8, 0.8],
      'cabinet_combined': [2.4, 1.8, 0.6],
      'shelf_single': [1.0, 2.0, 0.4],
      'shelf_double': [1.0, 2.0, 0.8],
      'shelf_corner': [1.0, 2.0, 1.0],
      'shelf_heavy': [1.5, 2.5, 0.6],
      'wall_basic': [2.0, 3.0, 0.2],
      'door_single': [1.0, 2.1, 0.1],
      'window_standard': [1.5, 1.2, 0.1]
    }
    
    return defaultDimensions[previewObject.model] || [1, 1, 1]
  }

  // 处理主地板点击事件 - 只处理主地板范围内的点击
  const handleMainFloorClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    
    if (previewMode && previewObject) {
      const clickPosition = event.point
      
      // 检查是否在主地板范围内
      if (clickPosition.x >= 0 && clickPosition.x <= length && 
          clickPosition.z >= 0 && clickPosition.z <= width) {
        handleSceneClick(event)
      }
    } else {
      handleSceneClick(event)
    }
  }

  // 处理场景点击事件
  const handleSceneClick = (event: ThreeEvent<MouseEvent>) => {
    if (previewMode && previewObject) {
      // 预览模式：放置对象
    const clickPosition = event.point
    const [previewWidth, previewHeight, previewDepth] = getPreviewDimensions()
      const isAdminModel = previewObject.metadata?.isAdminModel
    
      // 确保对象在扩展地板范围内 - 包含3米外围区域
    const extendedMinX = -3 + previewWidth / 2
    const extendedMaxX = length + 3 - previewWidth / 2
    const extendedMinZ = -3 + previewDepth / 2
    const extendedMaxZ = width + 3 - previewDepth / 2
    
    const clampedPosition: [number, number, number] = [
      Math.max(extendedMinX, Math.min(extendedMaxX, clickPosition.x)),
        // GLB模型使用Y=0让底部贴地，Box模型使用height/2让中心点位于地面之上
        isAdminModel ? 0 : previewHeight / 2,
      Math.max(extendedMinZ, Math.min(extendedMaxZ, clickPosition.z))
    ]
    
    placePreviewObject(clampedPosition)
    } else {
      // 非预览模式：检查是否需要取消选中
      const now = Date.now()
      const lastObjectClickTime = (window as any).lastObjectClickTime || 0
      
      // 如果刚刚点击过对象（50ms内），忽略
      if (now - lastObjectClickTime < 50) {
        return
      }
      
      // 取消选中（通过引入store来调用clearSelection）
      import('../lib/state/projectStore').then(({ useProjectStore }) => {
        const { clearSelection, selectedObjects } = useProjectStore.getState()
        if (selectedObjects.length > 0) {
          clearSelection()
        }
      })
    }
  }

  // 处理鼠标移动事件
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!previewMode || !previewObject) return
    
    const movePosition = event.point
    const [previewWidth, previewHeight, previewDepth] = getPreviewDimensions()
    const isAdminModel = previewObject.metadata?.isAdminModel
    
    // 更新预览位置 - 包含3米外围扩展区域
    const extendedMinX = -3 + previewWidth / 2
    const extendedMaxX = length + 3 - previewWidth / 2
    const extendedMinZ = -3 + previewDepth / 2
    const extendedMaxZ = width + 3 - previewDepth / 2
    
    const clampedPosition: [number, number, number] = [
      Math.max(extendedMinX, Math.min(extendedMaxX, movePosition.x)),
      // GLB模型使用Y=0让底部贴地，Box模型使用height/2让中心点位于地面之上
      isAdminModel ? 0 : previewHeight / 2,
      Math.max(extendedMinZ, Math.min(extendedMaxZ, movePosition.z))
    ]
    
    updatePreviewPosition(clampedPosition)
  }

  return (
    <>
      {/* 地面 */}
      <Box 
        args={[length, 0.2, width]} 
        position={[length / 2, -0.1, width / 2]}
        receiveShadow
        onClick={handleMainFloorClick}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial color="#e5e7eb" />
      </Box>

      {/* 扩展透明地板区域 - 驿站外围3米区域，使用正方形网格 */}
      <group>
        {/* 扩展区域的点击平面 - 分别处理4个扩展区域 */}
        {/* 前方扩展点击区域 */}
        <Plane 
          args={[length + 6, 3]} 
          position={[length / 2, -0.05, -1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSceneClick}
          onPointerMove={handlePointerMove}
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0}
            visible={true}
          />
        </Plane>
        
        {/* 后方扩展点击区域 */}
        <Plane 
          args={[length + 6, 3]} 
          position={[length / 2, -0.05, width + 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSceneClick}
          onPointerMove={handlePointerMove}
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0}
            visible={true}
          />
        </Plane>
        
        {/* 左侧扩展点击区域 */}
        <Plane 
          args={[3, width]} 
          position={[-1.5, -0.05, width / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSceneClick}
          onPointerMove={handlePointerMove}
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0}
            visible={true}
          />
        </Plane>
        
        {/* 右侧扩展点击区域 */}
        <Plane 
          args={[3, width]} 
          position={[length + 1.5, -0.05, width / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleSceneClick}
          onPointerMove={handlePointerMove}
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0}
            visible={true}
          />
        </Plane>
        
        {/* 视觉网格平面 - 分成4个区域避免与主地板重叠 */}
        {/* 前方扩展区域 */}
        <Plane 
          args={[length + 6, 3]} 
          position={[length / 2, 0.001, -1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0.4}
          />
        </Plane>
        
        {/* 后方扩展区域 */}
        <Plane 
          args={[length + 6, 3]} 
          position={[length / 2, 0.001, width + 1.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0.4}
          />
        </Plane>
        
        {/* 左侧扩展区域 */}
        <Plane 
          args={[3, width]} 
          position={[-1.5, 0.001, width / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0.4}
          />
        </Plane>
        
        {/* 右侧扩展区域 */}
        <Plane 
          args={[3, width]} 
          position={[length + 1.5, 0.001, width / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial 
            color="#f3f4f6" 
            transparent 
            opacity={0.4}
          />
        </Plane>
        
        {/* 网格线 - 垂直线（覆盖整个扩展区域）*/}
        {Array.from({ length: Math.floor((length + 6) / 1) + 1 }, (_, i) => {
          const x = -3 + i * 1
          return (
            <Box
              key={`vertical-${i}`}
              args={[0.02, 0.01, width + 6]}
              position={[x, 0.002, width / 2]}
            >
              <meshStandardMaterial 
                color="#d1d5db" 
                transparent 
                opacity={0.6}
              />
            </Box>
          )
        })}
        
        {/* 网格线 - 水平线（覆盖整个扩展区域）*/}
        {Array.from({ length: Math.floor((width + 6) / 1) + 1 }, (_, i) => {
          const z = -3 + i * 1
          return (
            <Box
              key={`horizontal-${i}`}
              args={[length + 6, 0.01, 0.02]}
              position={[length / 2, 0.002, z]}
            >
              <meshStandardMaterial 
                color="#d1d5db" 
                transparent 
                opacity={0.6}
              />
            </Box>
          )
        })}
        
        {/* 驿站区域边界标识 - 更明显的边框 */}
        <group>
          {/* 四个边界 */}
          <Box args={[length, 0.02, 0.08]} position={[length / 2, 0.003, 0]}>
            <meshStandardMaterial color="#9ca3af" />
          </Box>
          <Box args={[length, 0.02, 0.08]} position={[length / 2, 0.003, width]}>
            <meshStandardMaterial color="#9ca3af" />
          </Box>
          <Box args={[0.08, 0.02, width]} position={[0, 0.003, width / 2]}>
            <meshStandardMaterial color="#9ca3af" />
          </Box>
          <Box args={[0.08, 0.02, width]} position={[length, 0.003, width / 2]}>
            <meshStandardMaterial color="#9ca3af" />
          </Box>
        </group>
      </group>

      {/* 场地边界线 */}
      <group>
        {/* 四个边界 */}
        <Box args={[length, 0.1, 0.05]} position={[length / 2, 0, 0]}>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[length, 0.1, 0.05]} position={[length / 2, 0, width]}>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[0.05, 0.1, width]} position={[0, 0, width / 2]}>
          <meshStandardMaterial color="#6b7280" />
        </Box>
        <Box args={[0.05, 0.1, width]} position={[length, 0, width / 2]}>
          <meshStandardMaterial color="#6b7280" />
        </Box>
      </group>

      {/* 场地墙壁 - 四面半透明墙壁 */}
      {showWalls && (
        <group>
          {[
            /* 前墙 */ { args: [length, height, 0.1], position: [length / 2, height / 2, -0.05] },
            /* 后墙 */ { args: [length, height, 0.1], position: [length / 2, height / 2, width + 0.05] },
            /* 左墙 */ { args: [0.1, height, width], position: [-0.05, height / 2, width / 2] },
            /* 右墙 */ { args: [0.1, height, width], position: [length + 0.05, height / 2, width / 2] }
          ].map((wall, index) => (
            <Box 
              key={index}
              args={wall.args as [number, number, number]} 
              position={wall.position as [number, number, number]}
            >
              <meshStandardMaterial 
                color="#e5e7eb" 
                transparent 
                opacity={wallOpacity}
                roughness={0.7}
              />
            </Box>
          ))}
        </group>
      )}

      {/* 场地标注 */}
      <Text
        position={[length / 2, 0.2, -1]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#374151"
        anchorX="center"
        anchorY="middle"
      >
        {length}m × {width}m × {height}m
      </Text>

      {/* 渲染所有场景对象 */}
      {currentProject.objects.map((object) => (
        <SceneObject
          key={object.id}
          object={object}
        />
      ))}

      {/* 预览对象 - 根据是否为管理后台上传的模型选择渲染方式 */}
      {previewMode && previewObject && previewPosition && (
        <React.Fragment key="preview-object-container">
          {(() => {
            const isAdminModel = previewObject.metadata?.isAdminModel
            const hasModelUrl = !!previewModelUrl
            
            // 使用GLB模型的条件：是管理员模型 && 有模型URL
            if (isAdminModel && hasModelUrl) {
              return (
                <GLBModel
                  key="preview-glb-model"
                  modelUrl={previewModelUrl}
                  position={previewPosition}
                  rotation={[0, ((previewObject.initialRotation || 0) * Math.PI) / 180, 0]}
                  scale={[1, 1, 1]}
                  dragging={false}
                  isPreview={true}
                />
              )
            } else if (!isAdminModel) {
              // 只有非admin模型才显示默认Box预览
              return (
        <Box
            key="preview-box-model"
          args={getPreviewDimensions()}
          position={previewPosition}
          rotation={[0, ((previewObject.initialRotation || 0) * Math.PI) / 180, 0]}
          castShadow
        >
          <meshStandardMaterial 
            color="#3b82f6"
            transparent
            opacity={0.6}
            roughness={0.4}
            metalness={0.1}
          />
        </Box>
              )
            } else {
              // admin模型但没有URL或加载中，不显示任何内容
              return null
            }
          })()}
        </React.Fragment>
      )}
    </>
  )
}

export default Scene3D 