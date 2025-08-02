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

  // 缓存材质引用，支持所有材质类型
  const materialsRef = useRef<THREE.Material[]>([])
  const lastEffectState = useRef({ isSelected: false, isHovered: false })

  // 材质修复和调试 - 专门针对GLB黑色显示问题
  useEffect(() => {
    if (!gltf?.scene || !isModelReady) {
      console.log('⏸️ GLB材质检查跳过:', { hasGltf: !!gltf?.scene, isModelReady })
      return
    }

    console.log('🚀 开始GLB材质全面修复...')

    // 收集所有材质并进行全面修复
    const materials: THREE.Material[] = []
    let meshCount = 0
    
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++
        const mesh = child as THREE.Mesh
        console.log(`🔧 网格 ${meshCount}:`, { 
          name: child.name, 
          materialType: Array.isArray(mesh.material) ? 'Array' : mesh.material.type,
          materialCount: Array.isArray(mesh.material) ? mesh.material.length : 1
        })
        
        const materialArray = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materialArray.forEach((material, index) => {
          materials.push(material)
          
          console.log(`🎨 处理材质 ${index} (${material.type}):`)
          
          // 修复材质可见性
          material.visible = true
          
          // 针对所有材质类型的基本修复
          if ('color' in material) {
            if (!material.color || ((material.color as any).r === 0 && (material.color as any).g === 0 && (material.color as any).b === 0)) {
              (material as any).color = new THREE.Color(0xffffff)
              console.log('  ✅ 修复了黑色/缺失颜色')
            }
          }
          
          if ('opacity' in material && (material as any).opacity === 0) {
            (material as any).opacity = 1.0
            console.log('  ✅ 修复了零透明度')
          }

          // MeshPhysicalMaterial 特殊处理
          if (material.type === 'MeshPhysicalMaterial') {
            const physicalMat = material as any
            
            // 重置PBR属性，避免过度金属感
            if (physicalMat.metalness > 0.5) {
              physicalMat.metalness = 0.0
              console.log('  ✅ 降低了金属度')
            }
            
            if (physicalMat.roughness < 0.5) {
              physicalMat.roughness = 0.8
              console.log('  ✅ 增加了粗糙度')
            }
            
            // 清除过度的清漆效果
            if (physicalMat.clearcoat > 0) {
              physicalMat.clearcoat = 0.0
              console.log('  ✅ 移除了清漆效果')
            }
            
            // 重置反射率
            if (physicalMat.reflectivity > 0.5) {
              physicalMat.reflectivity = 0.1
              console.log('  ✅ 降低了反射率')
            }
          }

          // MeshStandardMaterial 特殊处理
          if (material.type === 'MeshStandardMaterial') {
            const standardMat = material as any
            
            if (standardMat.metalness > 0.3) {
              standardMat.metalness = 0.0
              console.log('  ✅ 重置了金属度')
            }
            
            if (standardMat.roughness < 0.5) {
              standardMat.roughness = 0.8
              console.log('  ✅ 增加了粗糙度')
            }
          }

          // 纹理修复 - 关键的颜色空间修复
          const textureMapTypes = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']
          textureMapTypes.forEach(mapType => {
            if (mapType in material && (material as any)[mapType]) {
              const texture = (material as any)[mapType]
              
              // 强制设置正确的颜色空间
              if (mapType === 'map' || mapType === 'emissiveMap') {
                if (texture.colorSpace !== THREE.SRGBColorSpace) {
                  texture.colorSpace = THREE.SRGBColorSpace
                  console.log(`  🎨 修复了${mapType}颜色空间`)
                }
              }
              
              // 强制纹理更新
              texture.needsUpdate = true
              
              // 确保纹理完全加载
              if (texture.image && !texture.image.complete) {
                texture.image.onload = () => {
                  texture.needsUpdate = true
                  console.log(`  📷 ${mapType}纹理加载完成`)
                }
              }
            }
          })

          // 强制材质更新
          material.needsUpdate = true
          
          // 详细的材质信息输出
          const materialInfo: any = {
            type: material.type,
            name: material.name,
            visible: material.visible,
            needsUpdate: material.needsUpdate
          }
          
          if ('color' in material) {
            materialInfo.color = `rgb(${Math.round(((material as any).color.r || 0) * 255)}, ${Math.round(((material as any).color.g || 0) * 255)}, ${Math.round(((material as any).color.b || 0) * 255)})`
          }
          
          if ('metalness' in material) {
            materialInfo.metalness = (material as any).metalness
          }
          
          if ('roughness' in material) {
            materialInfo.roughness = (material as any).roughness
          }
          
          if ('map' in material && (material as any).map) {
            const map = (material as any).map
            materialInfo.texture = {
              hasTexture: true,
              size: map.image ? `${map.image.width}x${map.image.height}` : 'unknown',
              colorSpace: map.colorSpace,
              format: map.format
            }
          }
          
          console.log(`  📊 修复后材质信息:`, materialInfo)
        })
      }
    })

    console.log(`🎯 完成材质修复: ${meshCount} 个网格，${materials.length} 个材质`)

    // 缓存材质引用
    materialsRef.current = materials

  }, [gltf?.scene, isModelReady, validModelUrl])

  // 应用材质高亮效果 - 支持所有材质类型
  useEffect(() => {
    if (!gltf?.scene || !isModelReady) return

    // 只在状态真正改变时更新材质
    if (lastEffectState.current.isSelected !== isSelected || 
        lastEffectState.current.isHovered !== isHovered) {
      
      const emissiveColor = getEmissiveColor()
      const emissiveIntensity = getEmissiveIntensity()
      
      // 批量更新材质，支持不同类型的材质
      materialsRef.current.forEach((material) => {
        if ('emissive' in material && 'emissiveIntensity' in material) {
          const emissiveMaterial = material as any
          emissiveMaterial.emissive.setHex(parseInt(emissiveColor.replace('#', '0x')))
          emissiveMaterial.emissiveIntensity = emissiveIntensity
        material.needsUpdate = true
        }
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