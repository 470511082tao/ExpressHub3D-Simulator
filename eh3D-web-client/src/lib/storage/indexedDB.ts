// IndexedDB 存储管理器
interface ModelData {
  id: string
  name: string
  category: string
  fileName: string
  fileSize: number
  uploadTime: string
  description?: string
  dimensions?: [number, number, number]
  fileContent: ArrayBuffer // 直接存储二进制数据
  previewImage?: ArrayBuffer // 新增：预览图片的二进制数据
  previewImageType?: string // 新增：预览图片的MIME类型（如image/png, image/jpeg）
  gridTemplate?: {
    rows: number
    columns: number
    enabled: boolean
    disabledCells?: number[] // 禁用的格口索引数组
  } // 格口模板配置
  metadata?: Record<string, any>
}



class IndexedDBStorage {
  private dbName = 'GLBModelStorage'
  private dbVersion = 2 // 升级版本以支持新的图片字段
  private db: IDBDatabase | null = null

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('IndexedDB初始化失败:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB初始化成功')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建模型存储
        if (!db.objectStoreNames.contains('models')) {
          const modelStore = db.createObjectStore('models', { keyPath: 'id' })
          modelStore.createIndex('category', 'category', { unique: false })
          modelStore.createIndex('name', 'name', { unique: false })
        }

        // 创建分类存储
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }

        console.log('数据库升级至版本', this.dbVersion, '，已支持预览图片字段')
      }
    })
  }

  // 保存模型
  async saveModel(model: ModelData): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models'], 'readwrite')
      const store = transaction.objectStore('models')
      const request = store.put(model)

      request.onsuccess = () => {
        console.log('模型保存成功:', model.name)
        resolve()
      }

      request.onerror = () => {
        console.error('模型保存失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 获取所有模型
  async getAllModels(): Promise<ModelData[]> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models'], 'readonly')
      const store = transaction.objectStore('models')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('获取模型失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 根据ID获取单个模型
  async getModelById(id: string): Promise<ModelData | null> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models'], 'readonly')
      const store = transaction.objectStore('models')
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('获取模型失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 删除模型
  async deleteModel(id: string): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models'], 'readwrite')
      const store = transaction.objectStore('models')
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('模型删除成功:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('模型删除失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 保存分类
  async saveCategories(categories: string[] | any[]): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readwrite')
      const store = transaction.objectStore('categories')
      const request = store.put({ id: 'main', categories })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取分类
  async getCategories(): Promise<string[] | any[]> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['categories'], 'readonly')
      const store = transaction.objectStore('categories')
      const request = store.get('main')

      request.onsuccess = () => {
        const result = request.result?.categories
        // 向后兼容：如果存储的是旧格式的字符串数组，转换为新格式
        if (result && Array.isArray(result)) {
          if (typeof result[0] === 'string') {
            // 旧格式：字符串数组，转换为Category对象数组
            const defaultCategoryMap: Record<string, string> = {
              'cabinets': '快递柜',
              'shelves': '货架', 
              'buildings': '建筑'
            }
            const convertedCategories = result.map((id: string) => ({
              id,
              name: defaultCategoryMap[id] || id,
              description: ''
            }))
            resolve(convertedCategories)
          } else {
            // 新格式：已经是Category对象数组
            resolve(result)
          }
        } else {
          // 默认分类
          resolve([
            { id: 'cabinets', name: '快递柜', description: '各种类型的快递柜设备' },
            { id: 'shelves', name: '货架', description: '仓储货架和展示架' },
            { id: 'buildings', name: '建筑', description: '建筑物和构筑物模型' }
          ])
        }
      }

      request.onerror = () => {
        console.error('获取分类失败:', request.error)
        reject(request.error)
      }
    })
  }

  // 获取存储使用情况
  async getStorageInfo(): Promise<{
    used: number
    quota: number
    available: number
    usedPercent: number
  }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const quota = estimate.quota || 0
        const used = estimate.usage || 0
        const available = quota - used

        return {
          used,
          quota,
          available,
          usedPercent: quota > 0 ? (used / quota) * 100 : 0
        }
      }
    } catch (error) {
      console.error('获取存储信息失败:', error)
    }

    // 降级方案
    return {
      used: 0,
      quota: 100 * 1024 * 1024, // 假设100MB
      available: 100 * 1024 * 1024,
      usedPercent: 0
    }
  }

  // 清理所有数据
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('数据库未初始化')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['models', 'categories'], 'readwrite')
      const modelsStore = transaction.objectStore('models')
      const categoriesStore = transaction.objectStore('categories')

      modelsStore.clear()
      categoriesStore.clear()

      transaction.oncomplete = () => {
        console.log('所有数据已清理')
        resolve()
      }

      transaction.onerror = () => {
        console.error('清理数据失败:', transaction.error)
        reject(transaction.error)
      }
    })
  }

  // 将File转换为ArrayBuffer
  static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  // 将ArrayBuffer转换为Blob URL
  static arrayBufferToBlobURL(buffer: ArrayBuffer, mimeType: string = 'application/octet-stream'): string {
    const blob = new Blob([buffer], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  // 将图片File转换为ArrayBuffer
  static imageToArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  // 将图片ArrayBuffer转换为Data URL（用于显示）
  static arrayBufferToImageDataURL(buffer: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([buffer], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  // 压缩图片到指定尺寸
  static compressImage(file: File, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        // 绘制并压缩图片
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              reject(new Error('图片压缩失败'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = URL.createObjectURL(file)
    })
  }
}

// 创建全局实例
export const indexedDBStorage = new IndexedDBStorage()
export { IndexedDBStorage }
export type { ModelData } 