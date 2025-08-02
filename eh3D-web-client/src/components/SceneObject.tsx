import React, { useRef, useState, useEffect } from 'react'
import { ThreeEvent } from '@react-three/fiber'
// import { useBox } from '@react-three/cannon' // 已禁用物理引擎但保留导入以备后用
import { Box, Text } from '@react-three/drei'
import { Mesh } from 'three'
import { useProjectStore, ObjectConfig } from '../lib/state/projectStore'
import GLBModel from './GLBModel'
import { indexedDBStorage } from '../lib/storage/indexedDB'

interface SceneObjectProps {
  object: ObjectConfig
}

const SceneObject: React.FC<SceneObjectProps> = ({ object }) => {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [lastClickTime, setLastClickTime] = useState(0)
  const hoverTimeoutRef = useRef<number | null>(null)
  
  const { 
    selectedObjects, 
    selectObject, 
    
    deleteObject,
    // updateObject, // 已禁用物理引擎相关功能但保留以备后用
    currentProject,
    previewMode // 新增previewMode状态
  } = useProjectStore()

  if (!currentProject) return null

  const isSelected = selectedObjects.includes(object.id)
  const [projLength, projWidth] = currentProject.dimensions

  // 判断是否为建筑构件
  const isBuildingComponent = object.type === 'building'

  // 判断是否为管理后台上传的模型
  const isAdminModel = object.metadata?.isAdminModel || false

  // 防抖的悬停处理
  const handlePointerEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(true)
    }, 50) // 50ms延迟，减少频繁切换
  }

  const handlePointerLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setHovered(false)
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // 获取GLB文件URL - 优化版本
  React.useEffect(() => {
    console.log('SceneObject GLB处理:', {
      objectId: object.id,
      isAdminModel,
      adminModelId: object.metadata?.adminModelId,
      hasAdminModelId: !!object.metadata?.adminModelId
    })

    if (isAdminModel && object.metadata?.adminModelId) {
      console.log('开始从IndexedDB加载GLB模型:', object.metadata.adminModelId)
      
      // 从IndexedDB动态读取模型数据 - 优化版本
      const loadModelFromIndexedDB = async () => {
        try {
          // 确保IndexedDB已初始化
          await indexedDBStorage.init()
          
          // 直接通过ID获取模型，避免获取所有模型
          const modelData = await indexedDBStorage.getModelById(object.metadata?.adminModelId!)
          
          if (modelData && modelData.fileContent) {
            console.log('从IndexedDB成功获取模型数据:', {
              modelId: modelData.id,
              fileName: modelData.fileName,
              fileSize: modelData.fileSize,
              fileContentType: modelData.fileContent.constructor.name,
              fileContentByteLength: modelData.fileContent.byteLength,
              isValidArrayBuffer: modelData.fileContent instanceof ArrayBuffer
            })
            
            // 验证ArrayBuffer数据
            if (modelData.fileContent.byteLength === 0) {
              console.error('ArrayBuffer为空，无法创建Blob')
              setModelUrl(null)
              return
            }
            
            // 将ArrayBuffer转换为Blob URL
            const blob = new Blob([modelData.fileContent], { type: 'model/gltf-binary' })
            console.log('Blob创建详情:', {
              blobSize: blob.size,
              blobType: blob.type,
              originalFileSize: modelData.fileSize,
              sizesMatch: blob.size === modelData.fileSize
            })
            
            const url = URL.createObjectURL(blob)
            console.log('GLB对象URL创建成功:', url)
            
            // 验证ArrayBuffer数据完整性（不验证Blob URL，因为不支持HEAD请求）
            if (blob.size !== modelData.fileSize) {
              console.error('Blob大小与原始文件大小不匹配:', {
                blobSize: blob.size,
                originalSize: modelData.fileSize
              })
              setModelUrl(null)
              return
            }
            
            console.log('数据完整性验证通过，设置modelUrl')
            setModelUrl(url)
          } else {
            console.error('IndexedDB中未找到模型数据或文件内容为空', {
              hasModelData: !!modelData,
              hasFileContent: !!(modelData?.fileContent),
              modelDataKeys: modelData ? Object.keys(modelData) : []
            })
            setModelUrl(null)
          }
        } catch (error) {
          console.error('从IndexedDB加载模型失败:', error)
          setModelUrl(null)
        } finally {
          // setIsLoadingModel(false) // 移除此行
        }
      }
      
      // 立即执行加载，不延迟
      loadModelFromIndexedDB()
    } else {
      console.log('不是admin模型或没有adminModelId')
      setModelUrl(null)
      // setIsLoadingModel(false) // 移除此行
    }
    
    // 清理函数：释放之前创建的Blob URL
    return () => {
      if (modelUrl && modelUrl.startsWith('blob:')) {
        URL.revokeObjectURL(modelUrl)
      }
    }
  }, [isAdminModel, object.metadata?.adminModelId])

  // 根据对象类型和模型获取尺寸
  const getObjectDimensions = (): [number, number, number] => {
    if (object.metadata?.width && object.metadata?.height && object.metadata?.depth) {
      return [object.metadata.width, object.metadata.height, object.metadata.depth]
    }

    // 默认尺寸配置
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

    return defaultDimensions[object.model] || [1, 1, 1]
  }

  const [width, height, depth] = getObjectDimensions()

  // 确保对象在扩展地板范围内 - 包含3米外围区域
  const clampPosition = (pos: [number, number, number]): [number, number, number] => {
    const [x, y, z] = pos
    
    // 扩展边界计算 - 与Scene3D中的逻辑保持一致
    const extendedMinX = -3 + width / 2
    const extendedMaxX = projLength + 3 - width / 2
    const extendedMinZ = -3 + depth / 2
    const extendedMaxZ = projWidth + 3 - depth / 2
    
    return [
      Math.max(extendedMinX, Math.min(extendedMaxX, x)),
      // GLB模型使用Y=0让底部贴地，Box模型使用height/2让中心点位于地面之上
      isAdminModel ? Math.max(0, y) : Math.max(height / 2, y),
      Math.max(extendedMinZ, Math.min(extendedMaxZ, z))
    ]
  }

  const position = clampPosition(object.position)

  // 物理体（仅用于非建筑构件）- 已禁用但保留代码以备后用
  /* const [physicsRef, api] = useBox(() => 
    isBuildingComponent 
      ? {
          position,
          args: [width, height, depth],
          type: 'Static', // 建筑构件设为静态（不受重力影响但仍有碰撞体积）
          material: {
            friction: 0.8,
            restitution: 0.1
          }
        }
      : {
          position,
          args: [width, height, depth],
          mass: 1, // 只有非建筑构件有质量
          material: {
            friction: 0.8,
            restitution: 0.1
          }
        }
  ) */

  // 对于建筑构件，使用静态引用；对于其他对象，使用物理引用 - 现在都使用普通引用
  // const ref = isBuildingComponent ? meshRef : (physicsRef as any)
  const ref = meshRef

  // 同步物理体位置到状态（仅用于可移动对象）- 已禁用但保留代码以备后用
  /* useFrame(() => {
    if (!isBuildingComponent && physicsRef.current && !dragging) {
      const pos = physicsRef.current.position
      const newPos = clampPosition([pos.x, pos.y, pos.z])
      
      // 如果位置变化，更新状态
      if (
        Math.abs(newPos[0] - object.position[0]) > 0.01 ||
        Math.abs(newPos[1] - object.position[1]) > 0.01 ||
        Math.abs(newPos[2] - object.position[2]) > 0.01
      ) {
        updateObject(object.id, { position: newPos })
      }
    }
  }) */

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    
    // 更新全局对象点击时间戳，防止地面点击误触发
    ;(window as any).lastObjectClickTime = Date.now()
    
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime
    
    // 双击检测（250ms内的两次点击，缩短时间提高响应性）
    if (timeDiff < 250 && timeDiff > 50) {
      handleDoubleClick()
      return // 双击时不执行选择逻辑
    }
    
    // 如果当前处于预览模式，先取消预览模式，避免多选显示
    if (previewMode) {
      // 直接导入store来处理异步操作
      import('../lib/state/projectStore').then(({ useProjectStore }) => {
        const store = useProjectStore.getState()
        store.cancelPreview()
        
        // 短暂延迟确保状态更新完成
        setTimeout(() => {
          const currentStore = useProjectStore.getState()
          currentStore.selectObject(object.id)
        }, 100)
      })
    } else {
      // 立即选中对象，提高响应性
      selectObject(object.id)
    }
    
    setLastClickTime(currentTime)
  }

  const handleDoubleClick = async () => {
    // 检查是否已经在预览模式，如果是，先取消之前的预览
    if (previewMode) {
      import('../lib/state/projectStore').then(({ useProjectStore }) => {
        const { cancelPreview } = useProjectStore.getState()
        cancelPreview()
      })
      // 等待一小段时间让状态更新
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    try {
      let modelName = object.model
      
      // 如果是管理后台模型，先获取真实的模型名称
      if (object.metadata?.isAdminModel && object.metadata?.adminModelId) {
        try {
          const modelData = await indexedDBStorage.getModelById(object.metadata.adminModelId)
          if (modelData) {
            modelName = modelData.name // 使用管理后台的模型名称
          }
        } catch (error) {
          console.error('获取模型名称失败:', error)
          // 失败时使用原始名称，不影响后续操作
        }
      }
      
      // 创建预览对象，进入重新摆放模式
      const previewObject = {
        type: object.type,
        model: modelName, // 使用正确的模型名称
        initialPosition: object.position, // 保存当前位置
        initialRotation: object.rotation, // 保存当前旋转角度
        metadata: {
          ...object.metadata,
          adminModelName: modelName // 确保包含模型名称
        }
      }
      
      // 使用更可靠的方式：先删除对象，监听state变化后再开始预览
      const objectIdToDelete = object.id
      
      // 先删除对象
      deleteObject(objectIdToDelete)
      
      // 使用更长的延迟确保删除操作完全完成
      setTimeout(() => {
        // 再次检查对象是否已被删除
        import('../lib/state/projectStore').then(({ useProjectStore }) => {
          const currentState = useProjectStore.getState()
          const objectStillExists = currentState.currentProject?.objects.some(obj => obj.id === objectIdToDelete)
          
          if (!objectStillExists) {
            currentState.startPreview(previewObject)
          } else {
            // 如果还没删除完成，再延迟一点
            setTimeout(() => {
              const retryState = useProjectStore.getState()
              retryState.startPreview(previewObject)
            }, 100)
          }
        })
      }, 150) // 优化延迟时间
      
    } catch (error) {
      console.error('双击重新摆放失败:', error)
      // 发生错误时不执行任何操作，保持现状
    }
  }

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setDragging(true)
    // 移除这里的selectObject调用，避免重复选中
    // selectObject(object.id)
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  // 获取材质的发光颜色
  const getEmissiveColor = () => {
    if (isSelected) return '#ff6600' // 选中时橙色发光
    if (hovered) return '#ff8c00' // 悬停时使用橙色微光，避免白色闪烁
    return '#000000' // 默认无发光
  }

  // 获取发光强度
  const getEmissiveIntensity = () => {
    if (isSelected) return 0.3 // 选中时较强发光
    if (hovered) return 0.05 // 悬停时极微弱发光，减少闪烁
    return 0 // 默认无发光
  }

  // 获取对象颜色
  const getObjectColor = () => {
    if (isSelected) return '#ff8c00' // 选中时使用橙色
    if (hovered) return '#ff8c00' // 悬停时也使用橙色，保持一致性
    
    const colorMap: Record<string, string> = {
      'cabinet_small': '#10b981',
      'cabinet_medium': '#059669', 
      'cabinet_large': '#047857',
      'cabinet_combined': '#065f46',
      'shelf_single': '#f59e0b',
      'shelf_double': '#d97706',
      'shelf_corner': '#b45309',
      'shelf_heavy': '#92400e',
      'wall_basic': '#6b7280',
      'door_single': '#8b5cf6',
      'window_standard': '#06b6d4'
    }
    
    return colorMap[object.model] || '#6b7280'
  }





  return (
    <group>
      {/* 主体网格 - 根据是否为管理后台上传的模型选择渲染方式 */}
      {isAdminModel && modelUrl ? (
        // admin模型且modelUrl已就绪，显示GLB模型
        <GLBModel
          modelUrl={modelUrl}
          position={position}
          rotation={[0, (object.rotation * Math.PI) / 180, 0]}
          scale={[1, 1, 1]}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          dragging={dragging}
          forwardRef={ref as any}
          isSelected={isSelected}
          isHovered={hovered}
        />
      ) : !isAdminModel ? (
        // 非admin模型，显示默认Box
      <Box
        ref={ref}
        args={[width, height, depth]}
        position={position}
        rotation={[0, (object.rotation * Math.PI) / 180, 0]}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          color={getObjectColor()}
          transparent={false}
          roughness={isBuildingComponent ? 0.8 : 0.4}
          metalness={isBuildingComponent ? 0.0 : 0.1}
          emissive={getEmissiveColor()}
          emissiveIntensity={getEmissiveIntensity()}
        />
      </Box>
      ) : null}

      {/* 对象标签 - 只对非admin模型显示，选中时更加突出 */}
      {!isAdminModel && (
        <Text
          position={[position[0], position[1] + height/2 + 0.3, position[2]]}
          fontSize={isSelected ? 0.25 : 0.2}
          color={isSelected ? "#ff6600" : "#374151"}
          fontWeight={isSelected ? "bold" : "normal"}
          anchorX="center"
          anchorY="middle"
            >
          {object.name}
        </Text>
      )}
    </group>
  )
}

export default SceneObject 