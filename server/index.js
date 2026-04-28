// ==================== 模块引入 ====================
// Express web框架
const express = require('express')
// CORS跨域资源共享
const cors = require('cors')
// 子进程管理，用于执行bat脚本
const { exec, spawn } = require('child_process')
// 文件系统操作
const fs = require('fs')
// 路径处理
const path = require('path')
// HTTP服务器创建
const http = require('http')
// Socket.IO实时通信
const { Server } = require('socket.io')
// HTTP请求库，用于检查webUrl可访问性
const axios = require('axios')

// ==================== 应用初始化 ====================
// 创建Express应用
const app = express()
// 创建HTTP服务器（Express需要包装在http.Server中以便Socket.IO使用）
const server = http.createServer(app)
// 初始化Socket.IO服务器，设置CORS允许所有来源
const io = new Server(server, {
  cors: {
    origin: '*',  // 允许所有跨域请求
    methods: ['GET', 'POST']
  }
})

// ==================== 中间件配置 ====================
// 启用CORS跨域
app.use(cors())
// 启用JSON请求体解析
app.use(express.json())

// ==================== 数据加载 ====================
// 从services.js加载项目和服务配置
const projects = require('./services.js')
// 存储运行中的子进程映射，用于管理服务生命周期
let runningProcesses = new Map()

// ==================== 辅助函数 ====================

/**
 * 根据服务ID查找对应的服务配置
 * @param {string} serviceId - 服务ID
 * @returns {{service: Object, project: Object}|null} - 找到时返回服务对象和所属项目，否者为null
 */
function findService(serviceId) {
  for (const project of projects) {
    const service = project.services.find(s => s.id === serviceId)
    if (service) {
      return { service, project }
    }
  }
  return null
}

/**
 * 获取所有服务列表（扁平化格式）
 * 为每个服务附加所属项目名称
 * @returns {Array} - 所有服务数组
 */
function getAllServices() {
  const allServices = []
  for (const project of projects) {
    for (const service of project.services) {
      allServices.push({ ...service, project: project.name })
    }
  }
  return allServices
}

/**
 * 检查端口是否被占用（服务是否运行）
 * 同时检查webUrl是否可访问
 * @param {number} port - 端口号
 * @param {string} [webUrl] - 可选的web访问地址
 * @returns {Promise<{running: boolean, canAccess: boolean}>}
 */
async function checkPortStatus(port, webUrl) {
  return new Promise((resolve) => {
    const net = require('net')
    const client = new net.Socket()
    client.setTimeout(2000)
    
    // 尝试连接本地端口
    client.connect(port, '127.0.0.1', () => {
      // 端口连接成功，服务正在运行
      if (webUrl) {
        // 如果提供了webUrl，验证是否可以访问
        axios.get(webUrl, { timeout: 3000 })
          .then(() => resolve({ running: true, canAccess: true }))
          .catch(() => resolve({ running: true, canAccess: false }))
          .finally(() => client.destroy())
      } else {
        resolve({ running: true, canAccess: false })
      }
    })
    
    // 连接错误（端口未开放）
    client.on('error', () => {
      resolve({ running: false, canAccess: false })
      client.destroy()
    })
    
    // 连接超时
    client.on('timeout', () => {
      resolve({ running: false, canAccess: false })
      client.destroy()
    })
  })
}

/**
 * 获取单个服务的完整状态信息
 * @param {Object} service - 服务配置对象
 * @returns {Promise<Object>} - 包含运行状态的服务对象
 */
async function getServiceStatus(service) {
  const status = await checkPortStatus(service.listen, service.webUrl)
  return {
    ...service,
    running: status.running,
    canAccess: status.canAccess
  }
}

// ==================== API端点 ====================
// 注意: 这里的API返回扁平化的服务数组，与projects结构不同

/**
 * GET /api/services
 * 获取所有服务的当前状态（扁平化数组）
 * 每个服务包含running和canAccess状态字段
 */
app.get('/api/services', async (req, res) => {
  try {
    const allServices = getAllServices()
    const statuses = await Promise.all(allServices.map(getServiceStatus))
    res.json(statuses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/projects
 * 获取所有项目的当前状态（保持项目结构）
 * 每个项目内的services数组包含running和canAccess状态
 */
app.get('/api/projects', async (req, res) => {
  try {
    const projectStatuses = await Promise.all(
      projects.map(async (project) => {
        const serviceStatuses = await Promise.all(
          project.services.map(getServiceStatus)
        )
        return {
          ...project,
          services: serviceStatuses
        }
      })
    )
    res.json(projectStatuses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/services/:id/start
 * 启动指定服务
 * 使用detached子进程运行start脚本，实现后台运行
 */
app.post('/api/services/:id/start', async (req, res) => {
  const { id } = req.params
  const found = findService(id)
  
  if (!found) {
    return res.status(404).json({ error: 'Service not found' })
  }
  
  const { service } = found
  
  if (runningProcesses.has(id)) {
    return res.status(400).json({ error: 'Service is already running' })
  }
  
  try {
    const batPath = path.resolve(service.start)
    if (!fs.existsSync(batPath)) {
      return res.status(404).json({ error: 'Start bat file not found' })
    }
    
    // 使用detached:true使子进程与父进程分离，实现后台运行
    const proc = spawn('cmd.exe', ['/c', batPath], {
      detached: true,  // 分离子进程，不等待退出
      stdio: 'ignore',  // 忽略子进程stdio输出
      cwd: path.dirname(batPath)
    })
    
    // unref()使子进程不阻塞父进程退出
    proc.unref()
    runningProcesses.set(id, proc)
    
    res.json({ success: true, message: 'Service starting...' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/services/:id/stop
 * 停止指定服务
 * 优先使用stop脚本，否则尝试杀死占用端口的进程
 */
app.post('/api/services/:id/stop', async (req, res) => {
  const { id } = req.params
  const found = findService(id)
  
  if (!found) {
    return res.status(404).json({ error: 'Service not found' })
  }
  
  const { service } = found
  
  try {
    if (service.stop) {
      // 优先使用专门的stop脚本
      const batPath = path.resolve(service.stop)
      if (!fs.existsSync(batPath)) {
        return res.status(404).json({ error: 'Stop bat file not found' })
      }
      
      spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(batPath)
      })
    } else {
      // 无stop脚本时，通过端口号查找并终止进程
      const port = service.listen
      const checkStatus = await checkPortStatus(port)
      
      if (checkStatus.running) {
        console.log(`Stopping service on port ${port}...`)
        // 使用netstat查找占用端口的进程PID并终止
        const killCmd = `for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do @taskkill /F /PID %a`
        exec(killCmd, (err, stdout, stderr) => {
          if (err) console.error('Stop error:', err)
          if (stdout) console.log('Stop stdout:', stdout)
          if (stderr) console.error('Stop stderr:', stderr)
        })
      } else {
        console.log(`Service on port ${port} is not running`)
      }
    }
    
    runningProcesses.delete(id)
    
    res.json({ success: true, message: 'Service stopping...' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/services/:id/restart
 * 重启指定服务
 * 先停止（可选等待2秒）再启动
 */
app.post('/api/services/:id/restart', async (req, res) => {
  const { id } = req.params
  const found = findService(id)
  
  if (!found) {
    return res.status(404).json({ error: 'Service not found' })
  }
  
  const { service } = found
  
  try {
    if (service.restart) {
      // 优先使用专门的restart脚本
      const batPath = path.resolve(service.restart)
      if (!fs.existsSync(batPath)) {
        return res.status(404).json({ error: 'Restart bat file not found' })
      }
      
      spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(batPath)
      })
    } else {
      // 无restart脚本时：先停止再启动（等待完成后再启动）
      const port = service.listen

      if (service.stop) {
        // 有stop脚本：使用stop脚本停止
        const stopBatPath = path.resolve(service.stop)
        spawn('cmd.exe', ['/c', stopBatPath], {
          detached: true,
          stdio: 'ignore',
          cwd: path.dirname(stopBatPath)
        })
      } else {
        // 无stop脚本：通过端口号查找并终止进程
        const checkStatus = await checkPortStatus(port)
        if (checkStatus.running) {
          console.log(`Restart: stopping service on port ${port}...`)
          const killCmd = `for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do @taskkill /F /PID %a`
          exec(killCmd, (err, stdout, stderr) => {
            if (err) console.error('Restart stop error:', err)
            if (stdout) console.log('Restart stop stdout:', stdout)
            if (stderr) console.error('Restart stop stderr:', stderr)
          })
        }
      }

      // 等待2秒让进程完全停止
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 启动服务
      const startBatPath = path.resolve(service.start)
      spawn('cmd.exe', ['/c', startBatPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(startBatPath)
      })
    }
    
    res.json({ success: true, message: 'Service restarting...' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ==================== 实时状态推送 ====================
// 每秒轮询所有服务状态并通过Socket.IO推送到前端

/**
 * 定时任务：每秒检查所有服务状态
 * 并通过Socket.IO广播到所有连接的客户端
 */
setInterval(async () => {
  try {
    // 获取所有服务的扁平化状态
    const allServices = getAllServices()
    const statuses = await Promise.all(allServices.map(getServiceStatus))
    io.emit('servicesStatus', statuses)
    
    // 同时推送项目结构的状态（用于某些视图）
    const projectStatuses = await Promise.all(
      projects.map(async (project) => {
        const serviceStatuses = await Promise.all(
          project.services.map(getServiceStatus)
        )
        return {
          ...project,
          services: serviceStatuses
        }
      })
    )
    io.emit('projectsStatus', projectStatuses)
  } catch (error) {
    console.error('Status check error:', error)
  }
}, 1000)

// ==================== Socket.IO连接处理 ====================

// 监听客户端连接
io.on('connection', (socket) => {
  console.log('Client connected')
  
  // 监听客户端断开
  socket.on('disconnect', () => {
    console.log('Client disconnected')
  })
})

// ==================== 服务器启动 ====================
const PORT = 13001
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})