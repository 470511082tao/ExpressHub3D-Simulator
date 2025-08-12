import React, { useState, useEffect, useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'
// import { useBox } from '@react-three/cannon' // 已禁用物理引擎但保留导入以备后用
import { Box, Text, Plane, Line, Html } from '@react-three/drei'
import { useProjectStore } from '../lib/state/projectStore'
import SceneObject from './SceneObject'
import GLBModel from './GLBModel'
import { indexedDBStorage, ModelData } from '../lib/storage/indexedDB'

interface Scene3DProps {
  showWalls?: boolean
  wallOpacity?: number
  showInfo?: boolean
}

const Scene3D: React.FC<Scene3DProps> = ({ showWalls = false, wallOpacity = 0.7, showInfo = false }) => {
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
  const [adminModelsMap, setAdminModelsMap] = useState<Map<string, ModelData>>(new Map())

  // 加载管理后台模型，用于验证对象的有效性
  useEffect(() => {
    const loadAdminModels = async () => {
      try {
        await indexedDBStorage.init()
        const models = await indexedDBStorage.getAllModels()
        const modelsMap = new Map<string, ModelData>()
        models.forEach(model => {
          modelsMap.set(model.id, model)
        })
        setAdminModelsMap(modelsMap)
        console.log('Scene3D加载了', models.length, '个管理后台模型用于验证')
      } catch (error) {
        console.error('加载管理后台模型失败:', error)
      }
    }
    
    loadAdminModels()
  }, [])

  // 计算对象统计信息
  const objectStats = useMemo(() => {
    if (!currentProject?.objects || currentProject.objects.length === 0) {
      console.log('没有项目或对象数据')
      return []
    }
    
    console.log('当前项目对象总数:', currentProject.objects.length)
    console.log('当前项目对象列表:', currentProject.objects)
    console.log('管理后台模型数量:', adminModelsMap.size)
    
    const stats: { [key: string]: { 
      count: number; 
      representativeObject: any; 
      displayName: string;
      height: number;
    } } = {}
    
    // 只统计当前实际存在的对象 - 更严格的验证
    const existingObjects = currentProject.objects.filter(obj => {
      const isValid = obj && 
                     typeof obj === 'object' && 
                     obj.id && 
                     obj.position && 
                     Array.isArray(obj.position) && 
                     obj.position.length === 3 &&
                     typeof obj.position[0] === 'number' &&
                     typeof obj.position[1] === 'number' &&
                     typeof obj.position[2] === 'number'
      
      if (!isValid) {
        console.warn('过滤掉无效对象:', obj)
      }
      return isValid
    })
    
    console.log('有效对象数量:', existingObjects.length)
    
    existingObjects.forEach(obj => {
      // 获取对象的显示名称
      let displayName = ''
      
      if (obj.metadata?.isAdminModel) {
        // 对于管理后台上传的模型，必须验证模型是否仍然存在于IndexedDB中
        const adminModelId = obj.metadata?.adminModelId
        if (adminModelId && adminModelsMap.has(adminModelId)) {
          // 使用IndexedDB中的最新模型名称
          const latestModel = adminModelsMap.get(adminModelId)!
          displayName = latestModel.name
        } else {
          // 如果模型不存在于IndexedDB中，跳过此对象（这是脏数据）
          console.warn('跳过已删除的管理后台模型对象:', {
            objectId: obj.id,
            adminModelId: adminModelId,
            oldModelName: obj.model,
            oldAdminModelName: obj.metadata?.adminModelName
          })
          return
        }
      } else {
        // 传统模型的类型映射
        const typeMap: Record<string, string> = {
          'cabinet': '快递柜',
          'shelf': '货架',
          'building': '建筑构件'
        }
        displayName = typeMap[obj.type] || obj.type
      }
      
      // 过滤掉空的显示名称
      if (!displayName || displayName.trim() === '') {
        console.warn('对象缺少有效的显示名称:', obj)
        return
      }
      
      // 计算对象高度（估算值）
      let objectHeight = 2 // 默认高度
      if (obj.metadata?.height) {
        objectHeight = obj.metadata.height
      } else if (obj.metadata?.isAdminModel) {
        objectHeight = 1.8 // 管理后台模型默认高度，降低一些
      } else {
        // 传统模型高度
        const heightMap: Record<string, number> = {
          'cabinet': 1.8,
          'shelf': 1.6,
          'building': 2.2
        }
        objectHeight = heightMap[obj.type] || 1.8
      }
      
      if (!stats[displayName]) {
        stats[displayName] = {
          count: 1, // 修复：第一个对象也要计数
          representativeObject: obj,
          displayName,
          height: objectHeight
        }
      } else {
        stats[displayName].count++
        // 不在这里更新代表对象，在后面统一处理
      }
    })
    
    // 计算距离函数
    const calculateDistance = (pos1: [number, number, number], pos2: [number, number, number]) => {
      return Math.sqrt(
        Math.pow(pos1[0] - pos2[0], 2) + 
        Math.pow(pos1[2] - pos2[2], 2)  // 只考虑X和Z轴距离，忽略Y轴高度
      )
    }
    
    // 优化代表对象选择：确保不同类型的代表对象之间有足够距离
    const MIN_DISTANCE = 2.5 // 最小距离阈值（米）- 调整为更合理的值
    const selectedRepresentatives: any[] = []
    const processedStats: any[] = [] // 记录成功处理的stats
    
    // 按计数排序，优先处理数量多的类型（确保重要的资产类型优先选择好位置）
    const sortedStats = Object.values(stats).sort((a, b) => b.count - a.count)
    
    for (const stat of sortedStats) {
      console.log(`处理资产类型: ${stat.displayName}, 数量: ${stat.count}`)
      
      const candidates = existingObjects.filter(obj => {
        // 获取候选对象的显示名称
        let candidateDisplayName = ''
        if (obj.metadata?.isAdminModel) {
          const adminModelId = obj.metadata?.adminModelId
          if (adminModelId && adminModelsMap.has(adminModelId)) {
            const latestModel = adminModelsMap.get(adminModelId)!
            candidateDisplayName = latestModel.name
          } else {
            return false
          }
        } else {
          const typeMap: Record<string, string> = {
            'cabinet': '快递柜',
            'shelf': '货架',
            'building': '建筑构件'
          }
          candidateDisplayName = typeMap[obj.type] || obj.type
        }
        return candidateDisplayName === stat.displayName
      })
      
      console.log(`${stat.displayName} 找到 ${candidates.length} 个候选对象`)
      
      // 检查是否找到候选对象
      if (candidates.length === 0) {
        console.warn(`${stat.displayName} 没有找到有效的候选对象，跳过`)
        continue
      }
      
      // 为当前类型选择最佳代表对象
      let bestCandidate = candidates[0]
      let bestCandidateDistance = 0
      
      if (candidates.length > 1 && selectedRepresentatives.length > 0) {
        // 选择与已选代表对象距离最远的候选者
        for (const candidate of candidates) {
          let minDistanceToExisting = Infinity
          
          // 计算与所有已选代表对象的最小距离
          for (const existing of selectedRepresentatives) {
            const distance = calculateDistance(candidate.position, existing.position)
            minDistanceToExisting = Math.min(minDistanceToExisting, distance)
          }
          
          // 选择距离已有代表对象最远的候选者
          if (minDistanceToExisting > bestCandidateDistance) {
            bestCandidate = candidate
            bestCandidateDistance = minDistanceToExisting
          }
        }
        
        // 如果没有找到满足最小距离要求的候选者，警告但仍然选择距离最远的
        if (bestCandidateDistance < MIN_DISTANCE) {
          console.warn(`${stat.displayName} 的代表对象距离其他气泡较近:`, {
            最小距离: bestCandidateDistance.toFixed(2),
            要求距离: MIN_DISTANCE,
            位置: bestCandidate.position
          })
        }
      } else if (candidates.length > 1) {
        // 如果是第一个类型，选择离场景中心最近的
        for (const candidate of candidates) {
          const candidateCenterDist = Math.sqrt(
            Math.pow(candidate.position[0], 2) + 
            Math.pow(candidate.position[2], 2)
          )
          const bestCenterDist = Math.sqrt(
            Math.pow(bestCandidate.position[0], 2) + 
            Math.pow(bestCandidate.position[2], 2)
          )
          
          if (candidateCenterDist < bestCenterDist) {
            bestCandidate = candidate
          }
        }
      }
      
      // 更新stats中的代表对象
      stat.representativeObject = bestCandidate
      selectedRepresentatives.push(bestCandidate)
      processedStats.push(stat) // 记录成功处理的stat
      
      console.log(`选择了 ${stat.displayName} 的代表对象:`, {
        objectId: bestCandidate.id,
        position: bestCandidate.position,
        与其他代表对象的最小距离: selectedRepresentatives.length > 1 ? 
          Math.min(...selectedRepresentatives.slice(0, -1).map(rep => 
            calculateDistance(bestCandidate.position, rep.position)
          )) : '无其他对象'
      })
    }
    
    // 智能高度分配：基于代表对象之间的距离来分配气泡高度
    const assignBubbleHeights = (processedStats: any[]) => {
      const CLOSE_DISTANCE = 3.0 // 近距离阈值
      const BASE_HEIGHT = 0.8     // 基础高度偏移
      const HEIGHT_INCREMENT = 0.5 // 近距离时的高度递增
      
      console.log('开始高度分配，处理', processedStats.length, '个资产类型')
      
      // 为每个stat分配高度索引
      const statsWithHeights: any[] = []
      
      for (let index = 0; index < processedStats.length; index++) {
        const stat = processedStats[index]
        let heightLevel = 0 // 默认高度级别
        
        console.log(`处理第${index}个资产类型: ${stat.displayName}`)
        
        // 检查与之前所有已处理代表对象的距离
        for (let i = 0; i < index; i++) {
          const prevStatWithHeight = statsWithHeights[i]
          if (!prevStatWithHeight || !prevStatWithHeight.representativeObject) {
            console.warn(`第${i}个资产类型数据异常，跳过距离检查`)
            continue
          }
          
          const distance = calculateDistance(
            stat.representativeObject.position,
            prevStatWithHeight.representativeObject.position
          )
          
          console.log(`${stat.displayName} 与 ${prevStatWithHeight.displayName} 距离: ${distance.toFixed(2)}米`)
          
          // 如果距离较近，需要使用不同的高度级别
          if (distance < CLOSE_DISTANCE) {
            heightLevel = Math.max(heightLevel, prevStatWithHeight.heightLevel + 1)
            console.log(`距离较近，调整 ${stat.displayName} 高度级别到: ${heightLevel}`)
          }
        }
        
        // 计算实际气泡高度
        const bubbleHeight = stat.height + BASE_HEIGHT + heightLevel * HEIGHT_INCREMENT
        
        const statWithHeight = {
          ...stat,
          heightLevel,
          bubbleHeight
        }
        
        statsWithHeights.push(statWithHeight)
        
        console.log(`${stat.displayName} 高度分配完成:`, {
          heightLevel,
          bubbleHeight: bubbleHeight.toFixed(2),
          modelHeight: stat.height
        })
      }
      
      console.log('高度分配完成，返回', statsWithHeights.length, '个资产类型')
      return statsWithHeights
    }
    
    // 应用智能高度分配
    console.log('调用高度分配前，processedStats数量:', processedStats.length)
    const statsWithHeights = assignBubbleHeights(processedStats)
    console.log('高度分配后，statsWithHeights数量:', statsWithHeights.length)
    
    // 使用带有智能高度分配的stats，进行最终验证
    const result = statsWithHeights.filter(stat => {
      const isValid = stat.count > 0 && 
                     stat.representativeObject && 
                     stat.displayName && 
                     stat.displayName.trim() !== '' &&
                     typeof stat.bubbleHeight === 'number'
      
      if (!isValid) {
        console.warn('过滤掉无效的stat:', stat)
      }
      
      return isValid
    })
    
    console.log('最终统计结果数量:', result.length)
    console.log('最终统计结果详情:', result.map(r => ({
      name: r.displayName,
      count: r.count,
      bubbleHeight: r.bubbleHeight,
      hasRepresentativeObject: !!r.representativeObject
    })))
    
    return result
  }, [currentProject?.objects, adminModelsMap])

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

  // 单个资产类型信息气泡组件
    const AssetInfoBubble: React.FC<{
    position: [number, number, number]
    assetType: string
    count: number
    bubbleHeight: number
    objectHeight: number
  }> = ({ position, assetType, count, bubbleHeight, objectHeight }) => {
    // 使用传入的智能分配高度
    const anchorY = objectHeight + 0.05 // 锚点在模型顶部
    
    return (
      <group position={position}>
        {/* 垂直连接线 - 从锚点直接向上到面板 */}
        <Line
          points={[
            [0, anchorY, 0], 
            [0, bubbleHeight, 0]
          ]}
          color="#3b82f6"
          lineWidth={2}
        />
        
        {/* 连接点（在模型顶部）- 更小的正方体 */}
        <Box
          position={[0, anchorY, 0]}
          args={[0.1, 0.1, 0.1]}
        >
          <meshStandardMaterial
            color="#3b82f6"
            transparent
            opacity={0.9}
          />
        </Box>
        
        {/* HTML UI面板 - 垂直对齐在锚点正上方 */}
        <Html
          position={[0, bubbleHeight, 0]}
          center
          distanceFactor={10}
          occlude={false}
          style={{
            transition: 'all 0.2s',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          <div
            className="bg-white/60 backdrop-blur-sm border border-blue-200 rounded-lg px-3 py-2 shadow-lg"
            style={{
              minWidth: '100px'
            }}
          >
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-1">
                {assetType}
              </div>
              <div className="text-lg font-bold text-blue-600">
                {count}个
              </div>
            </div>
            {/* 小箭头 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-200"></div>
            </div>
          </div>
        </Html>
      </group>
    )
  }

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

      {/* 资产类型信息气泡 - 为每种资产类型显示独立的气泡 */}
      {showInfo && objectStats.length > 0 && objectStats.map((stat, index) => {
        const obj = stat.representativeObject
        
        // 确保对象存在且有效
        if (!obj || !obj.position || obj.position.length !== 3) {
          console.warn('无效的代表对象:', obj)
          return null
        }
        
        // 检查stat数据的完整性
        if (!stat.bubbleHeight || typeof stat.bubbleHeight !== 'number') {
          console.warn('stat缺少bubbleHeight:', stat)
          return null
        }
        
        if (!stat.height || typeof stat.height !== 'number') {
          console.warn('stat缺少height:', stat)
          return null
        }
        
        console.log(`渲染气泡: ${stat.displayName}, bubbleHeight: ${stat.bubbleHeight}, objectHeight: ${stat.height}`)
        
        return (
          <AssetInfoBubble
            key={`asset-info-${stat.displayName}-${obj.id}-${index}`}
            position={[
              obj.position[0], // 锚点保持在模型正中心，不添加偏移
              obj.position[1],
              obj.position[2]
            ]}
            assetType={stat.displayName}
            count={stat.count}
            bubbleHeight={stat.bubbleHeight}
            objectHeight={stat.height}
          />
        )
      }).filter(Boolean)}
    </>
  )
}

export default Scene3D 