<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { io } from 'socket.io-client'
import { ElMessage, ElIcon } from 'element-plus'
import { CopyDocument, Search } from '@element-plus/icons-vue'

defineOptions({ components: { ElIcon, CopyDocument, Search } })

const services = ref([])
const searchQuery = ref("")
const loading = ref(false)

const filteredServices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return services.value
  return services.value.filter(s => 
    s.name.toLowerCase().includes(query) || 
    s.id.toLowerCase().includes(query) ||
    s.category.toLowerCase().includes(query) ||
    String(s.listen).includes(query) ||
    (s.project && s.project.toLowerCase().includes(query))
  )
})

const groupedServices = computed(() => {
  const groups = {}
  for (const service of filteredServices.value) {
    const project = service.project || '未分类'
    if (!groups[project]) {
      groups[project] = []
    }
    groups[project].push(service)
  }
  return groups
})

const projectList = computed(() => {
  return Object.keys(groupedServices.value).sort()
})

const operationInProgress = ref(null)
let socket = null

const API_BASE = 'http://localhost:13001'

const projectColors = {
  '通侦系统': '#409eff',
  '未分类': '#909399'
}

function getProjectColor(project) {
  if (projectColors[project]) return projectColors[project]
  const hash = project.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#722ed1', '#13c2c2', '#eb2f96']
  return colors[hash % colors.length]
}

async function fetchServices() {
  try {
    const res = await fetch(`${API_BASE}/api/services`)
    services.value = await res.json()
  } catch (error) {
    console.error('Failed to fetch services:', error)
  }
}

async function startService(service) {
  if (operationInProgress.value) return
  operationInProgress.value = service.id
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/services/${service.id}/start`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('服务启动中...')
      await new Promise(r => setTimeout(r, 3500))
      await fetchServices()
      const updated = services.value.find(s => s.id === service.id)
      if (updated?.running) {
        ElMessage.success('服务启动成功')
      } else {
        ElMessage.warning('服务启动可能失败，请检查')
      }
    } else {
      ElMessage.error(data.error || '启动失败')
    }
  } catch (err) {
    ElMessage.error('启动请求失败')
  } finally {
    loading.value = false
    operationInProgress.value = null
  }
}

async function stopService(id) {
  if (operationInProgress.value) return
  operationInProgress.value = id
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/services/${id}/stop`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('服务停止中...')
      await new Promise(r => setTimeout(r, 2500))
      await fetchServices()
      const updated = services.value.find(s => s.id === id)
      if (!updated?.running) {
        ElMessage.success('服务已停止')
      } else {
        ElMessage.warning('服务停止失败，端口仍被占用')
      }
    } else {
      ElMessage.error(data.error || '停止失败')
    }
  } catch (err) {
    ElMessage.error('停止请求失败')
  } finally {
    loading.value = false
    operationInProgress.value = null
  }
}

async function restartService(id) {
  if (operationInProgress.value) return
  operationInProgress.value = id
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/services/${id}/restart`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      ElMessage.success('服务重启中...')
      await new Promise(r => setTimeout(r, 5000))
      await fetchServices()
      const updated = services.value.find(s => s.id === id)
      if (updated?.running) {
        ElMessage.success('服务重启成功')
      } else {
        ElMessage.warning('服务重启可能失败，请检查')
      }
    } else {
      ElMessage.error(data.error || '重启失败')
    }
  } catch (err) {
    ElMessage.error('重启请求失败')
  } finally {
    loading.value = false
    operationInProgress.value = null
  }
}

function getStatusClass(running) {
  return running ? 'status-running' : 'status-stopped'
}

function getStatusIcon(running) {
  return running ? '●' : '○'
}

function getStatusText(running) {
  return running ? '运行中' : '已停止'
}

function getCategoryLabel(category) {
  const labels = { web: 'Web', java: 'Java', go: 'Go', node: 'Node' }
  return labels[category] || category
}

function copyWebUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('已复制')
  }).catch(err => {
    console.error('复制失败:', err)
    ElMessage.error('复制失败')
  })
}

onMounted(() => {
  fetchServices()
  
  socket = io(API_BASE)
  socket.on('servicesStatus', (data) => {
    services.value = data
  })
  socket.on('serviceStatus', (data) => {
    const index = services.value.findIndex(s => s.id === data.id)
    if (index !== -1) {
      services.value[index] = data
    }
  })
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>DevOps-Mini</h1>
    </header>
    
    <main class="main">
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索服务名称、ID、类别、端口或项目..."
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        <span class="search-hint" v-if="searchQuery">
          找到 {{ filteredServices.length }} 个服务
        </span>
      </div>
      
      <div class="services-section" v-for="project in projectList" :key="project">
        <div class="project-header" :style="{ borderLeftColor: getProjectColor(project) }">
          <span class="project-title">{{ project }}</span>
          <span class="project-count">{{ groupedServices[project].length }} 个服务</span>
        </div>
        <div class="services-grid">
          <div 
            v-for="service in groupedServices[project]" 
            :key="service.id"
            class="service-card"
            :class="{ 'is-running': service.running }"
          >
            <div class="service-header">
              <div class="service-info">
                <span class="service-name">{{ service.name }}</span>
                <span class="service-meta">{{ service.id }} | {{ getCategoryLabel(service.category) }} | 端口: {{ service.listen }}</span>
                <a v-if="service.webUrl" @click="copyWebUrl(service.webUrl)" class="service-url">
                  {{ service.webUrl }}
                  <el-icon class="copy-icon" :size="14"><CopyDocument /></el-icon>
                </a>
              </div>
              <div class="service-status" :class="getStatusClass(service.running)">
                <span class="status-icon">{{ getStatusIcon(service.running) }}</span>
                {{ getStatusText(service.running) }}
              </div>
            </div>
            
            <div class="service-actions">
              <button 
                class="btn btn-start" 
                @click="startService(service)"
                :disabled="service.running || operationInProgress === service.id"
              >
                启动
              </button>
              <button 
                class="btn btn-stop" 
                @click="stopService(service.id)"
                :disabled="!service.running || operationInProgress === service.id"
              >
                停止
              </button>
              <button 
                class="btn btn-restart" 
                @click="restartService(service.id)"
                :disabled="operationInProgress === service.id"
              >
                重启
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="filteredServices.length === 0" class="empty-state">
        <span>暂无服务</span>
      </div>
    </main>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  background: #fff;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.main {
  flex: 1;
  padding: 0 24px 24px;
  overflow-y: auto;
}

.search-bar {
  flex-shrink: 0;
  padding: 16px 24px;
  background: #f5f7fa;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.search-input {
  max-width: 360px;
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 4px 16px;
  background: #fff;
}

.search-input :deep(.el-input__wrapper):hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.search-input :deep(.el-input__wrapper).is-focus {
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.search-hint {
  color: #909399;
  font-size: 14px;
}

.services-section {
  margin-bottom: 32px;
}

.project-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.project-count {
  font-size: 14px;
  color: #909399;
  background: #f0f2f5;
  padding: 4px 10px;
  border-radius: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
  font-size: 16px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.service-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.service-card.is-running {
  border-left: 4px solid #67c23a;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.service-meta {
  font-size: 13px;
  color: #909399;
}

.service-url {
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
}

.service-url:hover {
  text-decoration: underline;
}

.copy-icon {
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  border-radius: 3px;
  transition: background 0.2s;
  vertical-align: middle;
  margin-left: 4px;
}

.copy-icon:hover {
  background: #e4e7ed;
}

.service-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-running {
  background: #e6f7e6;
  color: #52c41a;
}

.status-stopped {
  background: #f5f7fa;
  color: #909399;
}

.status-icon {
  font-size: 10px;
}

.service-actions {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-start {
  background: #67c23a;
  color: #fff;
}

.btn-start:hover:not(:disabled) {
  background: #85ce61;
}

.btn-stop {
  background: #f56c6c;
  color: #fff;
}

.btn-stop:hover:not(:disabled) {
  background: #f78989;
}

.btn-restart {
  background: #e6a23c;
  color: #fff;
}

.btn-restart:hover:not(:disabled) {
  background: #ebb563;
}
</style>