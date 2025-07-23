import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group, Object3D, Box3, Vector3 } from 'three'
import * as THREE from 'three'

interface GLBModelProps {
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number]
  onClick?: (event: any) => void
  onPointerDown?: (event: any) => void
  onPointerUp?: (event: any) => void
  onPointerEnter?: (event: any) => void
  onPointerLeave?: (event: any) => void
  dragging?: boolean
  isPreview?: boolean
  opacity?: number
  forwardRef?: React.RefObject<Group>
  isSelected?: boolean
  isHovered?: boolean
}

// 内部组件，只在有效URL时渲染
const GLBModelInner: React.FC<GLBModelProps & { validModelUrl: string }> = ({
  validModelUrl,
  position,
  rotation,
  scale = [1, 1, 1],
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave,
  dragging = false,
  isPreview = false,
  opacity = 1,
  forwardRef,
  isSelected = false,
  isHovered = false
}) => {
  const groupRef = useRef<Group>(null)
  const [isModelReady, setIsModelReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [boundingBox, setBoundingBox] = useState<{
    size: Vector3
    center: Vector3
  } | null>(null)

  // 使用传入的ref或内部ref
  const ref = forwardRef || groupRef
  
  // 始终调用useGLTF hook，因为已经确保URL有效
  const gltf = useGLTF(validModelUrl)

  // 获取材质高亮效果
  const getEmissiveColor = () => {
    if (isSelected) return '#ff6600' // 选中时橙色发光
    if (isHovered) return '#ff8c00' // 悬停时使用橙色微光，避免白色闪烁
    return '#000000' // 默认无发光
  }

  const getEmissiveIntensity = () => {
    if (isSelected) return 0.4 // 选中时较强发光
    if (isHovered) return 0.08 // 悬停时极微弱发光，减少闪烁
    return 0 // 默认无发光
  }

  // 缓存材质引用，避免重复遍历
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([])
  const lastEffectState = useRef({ isSelected: false, isHovered: false })

  // 应用材质高亮效果 - 优化版本
  useEffect(() => {
    if (!gltf?.scene || !isModelReady) return

    // 首次加载时收集所有材质
    if (materialsRef.current.length === 0) {
      gltf.scene.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              materialsRef.current.push(material)
            }
          })
        }
      })
    }

    // 只在状态真正改变时更新材质
    if (lastEffectState.current.isSelected !== isSelected || 
        lastEffectState.current.isHovered !== isHovered) {
      
      const emissiveColor = getEmissiveColor()
      const emissiveIntensity = getEmissiveIntensity()
      
      // 批量更新材质，减少渲染次数
      materialsRef.current.forEach((material) => {
        material.emissive.setHex(parseInt(emissiveColor.replace('#', '0x')))
        material.emissiveIntensity = emissiveIntensity
        material.needsUpdate = true
      })

      // 更新状态缓存
      lastEffectState.current = { isSelected, isHovered }
    }
  }, [gltf?.scene, isModelReady, isSelected, isHovered])

  // 清理材质缓存
  useEffect(() => {
    return () => {
      materialsRef.current = []
    }
  }, [validModelUrl])

  // 监听URL变化，重置状态
  useEffect(() => {
    setIsModelReady(false)
    setLoadError(false)
    setBoundingBox(null)
  }, [validModelUrl])

  // 处理GLB加载结果
  useEffect(() => {
    if (!gltf || !gltf.scene) {
      return
    }

    const scene = gltf.scene

    try {
      // 如果场景存在但不可见，尝试修复
      if (scene && !scene.visible) {
        scene.visible = true
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.visible = true
          }
        })
      }
      
      // 计算模型的边界框
      const box = new Box3().setFromObject(scene)
      const size = box.getSize(new Vector3())
      const center = box.getCenter(new Vector3())
      
      // 设置阴影
      scene.traverse((child: Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      setBoundingBox({ size, center })
      setIsModelReady(true)
    } catch (error) {
      console.error('GLB模型处理失败:', error)
      setLoadError(true)
    }
  }, [gltf])

  // 如果有加载错误或没有场景，返回透明组件
  if (loadError || !gltf || !gltf.scene) {
    return (
      <group 
        ref={ref}
        position={position} 
        rotation={rotation}
        scale={scale}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    )
  }

  // 计算调整后的位置，让模型底部贴着地面
  const adjustedPosition: [number, number, number] = useMemo(() => {
    if (boundingBox) {
      // 计算模型边界框的最小Y值（底部）
      const modelBottomY = boundingBox.center.y - boundingBox.size.y / 2
      // 调整Y坐标，使模型底部位于指定的Y位置（通常为0，即地面）
      const adjustedY = position[1] - modelBottomY
      return [position[0], adjustedY, position[2]]
    }
    return position
  }, [position, boundingBox])
  
  return (
    <group 
      ref={ref}
      position={adjustedPosition} 
      rotation={rotation}
      scale={scale}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <primitive 
        object={gltf.scene.clone()} 
        dispose={null}
      />
    </group>
  )
}

// 主组件，负责条件渲染
const GLBModel: React.FC<GLBModelProps> = (props) => {
  const { modelUrl, position, rotation, scale = [1, 1, 1], onClick, onPointerDown, onPointerUp, onPointerEnter, onPointerLeave, forwardRef } = props
  const groupRef = useRef<Group>(null)
  const ref = forwardRef || groupRef

  // 检查modelUrl是否有效
  const isValidModelUrl = modelUrl && modelUrl.startsWith('blob:')
  
  // 如果没有有效的模型URL，返回空组
  if (!isValidModelUrl) {
    return (
      <group 
        ref={ref}
        position={position} 
        rotation={rotation}
        scale={scale}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    )
  }

  // 渲染有效的GLB模型，用Suspense包装以处理异步加载
  return (
    <Suspense fallback={
      <group 
        ref={ref}
        position={position} 
        rotation={rotation}
        scale={scale}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      />
    }>
      <GLBModelInner {...props} validModelUrl={modelUrl} />
    </Suspense>
  )
}

export default GLBModel 