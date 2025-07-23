import React, { useState, useEffect } from 'react'
import { ThreeEvent } from '@react-three/fiber'
// import { useBox } from '@react-three/cannon' // 已禁用物理引擎但保留导入以备后用
import { Box, Text } from '@react-three/drei'
import { useProjectStore } from '../lib/state/projectStore'
import SceneObject from './SceneObject'
import GLBModel from './GLBModel'
import { indexedDBStorage, ModelData } from '../lib/storage/indexedDB'

const Scene3D: React.FC = () => {
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
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

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
      setIsLoadingPreview(true)
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
        } finally {
          setIsLoadingPreview(false)
        }
      }
      
      loadPreviewModelFromIndexedDB()
    } else {
      console.log('不是admin预览模型或没有adminModelId')
      setPreviewModelUrl(null)
      setIsLoadingPreview(false)
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

  // 处理场景点击事件
  const handleSceneClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    
    if (previewMode && previewObject) {
      // 预览模式：放置对象
    const clickPosition = event.point
    const [previewWidth, previewHeight, previewDepth] = getPreviewDimensions()
      const isAdminModel = previewObject.metadata?.isAdminModel
    
      // 确保对象在场地范围内 - 区分GLB模型和Box模型的Y坐标
    const clampedPosition: [number, number, number] = [
      Math.max(previewWidth / 2, Math.min(length - previewWidth / 2, clickPosition.x)),
        // GLB模型使用Y=0让底部贴地，Box模型使用height/2让中心点位于地面之上
        isAdminModel ? 0 : previewHeight / 2,
      Math.max(previewDepth / 2, Math.min(width - previewDepth / 2, clickPosition.z))
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
    
    // 更新预览位置 - 区分GLB模型和Box模型的Y坐标
    const clampedPosition: [number, number, number] = [
      Math.max(previewWidth / 2, Math.min(length - previewWidth / 2, movePosition.x)),
      // GLB模型使用Y=0让底部贴地，Box模型使用height/2让中心点位于地面之上
      isAdminModel ? 0 : previewHeight / 2,
      Math.max(previewDepth / 2, Math.min(width - previewDepth / 2, movePosition.z))
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
        onClick={handleSceneClick}
        onPointerMove={handlePointerMove}
      >
        <meshStandardMaterial color="#e5e7eb" />
      </Box>

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
                  rotation={[0, 0, 0]}
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