import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Vector3 } from 'three'

interface FPSControlsProps {
  position?: [number, number, number]
  target?: [number, number, number]
}

const FPSControls: React.FC<FPSControlsProps> = ({ 
  position = [0, 2, 5], 
  target = [0, 0, 0] 
}) => {
  const controlsRef = useRef<any>(null)
  const { camera, gl } = useThree()
  
  // 移动状态
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
  })

  // 移动向量
  const velocity = useRef(new Vector3())
  const direction = useRef(new Vector3())

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果鼠标没有锁定，忽略移动键
      if (!controlsRef.current?.isLocked) {
        // 只允许ESC键
        if (event.code === 'Escape') {
          controlsRef.current?.unlock()
        }
        return
      }

      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveState.current.forward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          moveState.current.backward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveState.current.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          moveState.current.right = true
          break
        case 'Space':
          event.preventDefault()
          moveState.current.up = true
          break
        case 'ShiftLeft':
        case 'ControlLeft':
          moveState.current.down = true
          break
        case 'Escape':
          // ESC键解锁鼠标
          controlsRef.current?.unlock()
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveState.current.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          moveState.current.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveState.current.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          moveState.current.right = false
          break
        case 'Space':
          moveState.current.up = false
          break
        case 'ShiftLeft':
        case 'ControlLeft':
          moveState.current.down = false
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 每帧更新移动
  useFrame((_state, delta) => {
    if (!controlsRef.current?.isLocked) return

    const moveSpeed = 8.0 // 移动速度 m/s
    
    // 重置速度
    velocity.current.x = 0
    velocity.current.z = 0
    velocity.current.y = 0

    // 获取相机方向
    direction.current.set(0, 0, -1)
    direction.current.applyQuaternion(camera.quaternion)
    direction.current.y = 0 // 忽略Y轴，保持水平移动
    direction.current.normalize()

    // 计算右方向
    const right = new Vector3()
    right.crossVectors(direction.current, camera.up).normalize()

    // 处理移动输入
    if (moveState.current.forward) {
      velocity.current.add(direction.current.clone().multiplyScalar(moveSpeed * delta))
    }
    if (moveState.current.backward) {
      velocity.current.add(direction.current.clone().multiplyScalar(-moveSpeed * delta))
    }
    if (moveState.current.left) {
      velocity.current.add(right.clone().multiplyScalar(-moveSpeed * delta))
    }
    if (moveState.current.right) {
      velocity.current.add(right.clone().multiplyScalar(moveSpeed * delta))
    }
    if (moveState.current.up) {
      velocity.current.y += moveSpeed * delta
    }
    if (moveState.current.down) {
      velocity.current.y -= moveSpeed * delta
    }

    // 应用移动
    if (velocity.current.length() > 0) {
      const newPosition = camera.position.clone().add(velocity.current)
      
      // 限制Y轴范围（防止相机穿越地面或飞得太高）
      newPosition.y = Math.max(0.5, Math.min(20, newPosition.y))
      
      camera.position.copy(newPosition)
    }
  })

  // 初始化相机位置
  useEffect(() => {
    camera.position.set(...position)
    camera.lookAt(...target)
  }, [camera, position, target])

  return (
    <PointerLockControls 
      ref={controlsRef}
      camera={camera}
      domElement={gl.domElement}
    />
  )
}

export default FPSControls 