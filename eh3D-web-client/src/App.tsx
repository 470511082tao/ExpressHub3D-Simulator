import { useState, useEffect } from 'react'
import ProjectList from './components/ProjectList'
import SceneEditor from './components/SceneEditor'
import AdminPanel from './components/AdminPanel'
import Login from './components/Login'
import { useProjectStore } from './lib/state/projectStore'

type AppView = 'login' | 'projectList' | 'sceneEditor' | 'adminPanel'

function App() {
  const { currentProject } = useProjectStore()
  const [currentView, setCurrentView] = useState<AppView>('login')
  const [showProjectList, setShowProjectList] = useState(false)
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)

  // 检查用户登录状态
  useEffect(() => {
    // 检查用户登录状态
    const userLoggedIn = localStorage.getItem('userLoggedIn')
    const userLoginTime = localStorage.getItem('userLoginTime')
    let userExpired = false
    
    if (userLoggedIn && userLoginTime) {
      // 检查用户登录是否过期（24小时）
      const loginTimestamp = parseInt(userLoginTime)
      const now = Date.now()
      userExpired = now - loginTimestamp > 24 * 60 * 60 * 1000
      
      if (userExpired) {
        localStorage.removeItem('userLoggedIn')
        localStorage.removeItem('userLoginTime')
        localStorage.removeItem('currentUser')
        setIsUserLoggedIn(false)
      } else {
        setIsUserLoggedIn(true)
      }
    }

    // 恢复页面状态 - 防止刷新后跳转
    const savedView = localStorage.getItem('currentView') as AppView
    const savedShowProjectList = localStorage.getItem('showProjectList') === 'true'
    
    if (savedView && userLoggedIn && !userExpired) {
      setCurrentView(savedView)
      setShowProjectList(savedShowProjectList)
    } else if (userLoggedIn && !userExpired) {
      // 用户已登录但没有保存的视图状态，默认到项目列表
      setCurrentView('projectList')
      setShowProjectList(true)
    }
  }, [])

  // 根据当前状态决定显示哪个视图（仅在用户已登录时）
  useEffect(() => {
    if (!isUserLoggedIn) {
      setCurrentView('login')
      return
    }

    if (showProjectList || !currentProject) {
      setCurrentView('projectList')
    } else {
      setCurrentView('sceneEditor')
    }
    
    // 保存当前状态到localStorage，防止刷新后丢失
    localStorage.setItem('currentView', showProjectList || !currentProject ? 'projectList' : 'sceneEditor')
    localStorage.setItem('showProjectList', String(showProjectList))
  }, [showProjectList, currentProject, isUserLoggedIn])

  const handleUserLogin = () => {
    setIsUserLoggedIn(true)
    setCurrentView('projectList')
    setShowProjectList(true)
    localStorage.setItem('currentView', 'projectList')
    localStorage.setItem('showProjectList', 'true')
  }

  const handleProjectSelect = () => {
    setShowProjectList(false)
  }

  const handleBackToProjects = () => {
    setShowProjectList(true)
  }

  const handleAdminPanel = () => {
    // 直接进入管理面板，不需要额外认证
    setCurrentView('adminPanel')
    localStorage.setItem('currentView', 'adminPanel')
  }

  const handleAdminBack = () => {
    setCurrentView('projectList')
    setShowProjectList(true)
    localStorage.setItem('currentView', 'projectList')
    localStorage.setItem('showProjectList', 'true')
  }

  const handleUserLogout = () => {
    localStorage.removeItem('userLoggedIn')
    localStorage.removeItem('userLoginTime')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('currentView')
    localStorage.removeItem('showProjectList')
    setIsUserLoggedIn(false)
    setCurrentView('login')
  }

  // 渲染当前视图
  switch (currentView) {
    case 'login':
      return <Login onLoginSuccess={handleUserLogin} />
    
    case 'adminPanel':
      return (
        <AdminPanel onBack={handleAdminBack} />
      )
    
    case 'sceneEditor':
      return (
        <div className="h-screen w-screen bg-gray-50 overflow-hidden">
          <SceneEditor onBackToProjects={handleBackToProjects} />
        </div>
      )
    
    case 'projectList':
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <ProjectList 
            onProjectSelect={handleProjectSelect}
            onAdminPanel={handleAdminPanel}
            onLogout={handleUserLogout}
          />
        </div>
      )
  }
}

export default App 