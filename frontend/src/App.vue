<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { io } from 'socket.io-client'
import { ElMessage, ElIcon } from 'element-plus'
import { CopyDocument, Search, VideoPlay, VideoPause, Refresh } from '@element-plus/icons-vue'
import javaIcon from 'programming-languages-logos/src/java/java.svg'
import goIcon from 'programming-languages-logos/src/go/go.svg'
import pythonIcon from 'programming-languages-logos/src/python/python.svg'
import dotnetIcon from 'programming-languages-logos/src/csharp/csharp.svg'
import phpIcon from 'programming-languages-logos/src/php/php.svg'
import htmlIcon from 'programming-languages-logos/src/html/html.svg'
import nodeIcon from './assets/icons/node.svg'
import rustIcon from './assets/icons/rust.svg'
import cppIcon from './assets/icons/cpp.svg'
import vmIcon from './assets/icons/vm.svg'

function getCategoryIcon(category) {
  const icons = {
    web: htmlIcon,
    java: javaIcon,
    go: goIcon,
    node: nodeIcon,
    python: pythonIcon,
    dotnet: dotnetIcon,
    rust: rustIcon,
    php: phpIcon,
    'c++': cppIcon,
    '虚拟机': vmIcon
  }
  return icons[category] || icons.web
}

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

const projectWebUrls = computed(() => {
  const urls = {}
  for (const project of projectList.value) {
    if (projectInfo.value[project]?.webUrl) {
      urls[project] = projectInfo.value[project].webUrl
    }
  }
  return urls
})

const operationInProgress = ref(null)
let socket = null

const API_BASE = 'http://localhost:13001'

const PROJECT_COLORS = [
  '#409eff', '#67c23a', '#e6a23c', '#f56c6c',
  '#909399', '#722ed1', '#13c2c2', '#eb2f96',
  '#1890ff', '#52c41a', '#faad14', '#fa541c',
  '#2f54eb', '#14a8a8', '#f5222d', '#eb2f96',
  '#52c41a', '#1890ff', '#722ed1', '#13c2c2',
  '#e6a23c', '#409eff', '#f56c6c', '#909399',
  '#722ed1', '#fa541c', '#2f54eb', '#faad14',
  '#14a8a8', '#52c41a', '#f5222d', '#eb2f96'
]

const CATEGORY_COLORS = {
  web: { bg: '#409eff', text: '#fff' },
  java: { bg: '#e6a23c', text: '#fff' },
  go: { bg: '#67c23a', text: '#fff' },
  node: { bg: '#52c41a', text: '#fff' },
  python: { bg: '#722ed1', text: '#fff' },
  dotnet: { bg: '#f56c6c', text: '#fff' },
  rust: { bg: '#fa541c', text: '#fff' },
  php: { bg: '#13c2c2', text: '#fff' },
  'c++': { bg: '#0050b3', text: '#fff' },
  '虚拟机': { bg: '#722ed1', text: '#fff' }
}

function getProjectColor(project) {
  const hash = project.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || { bg: '#909399', text: '#fff' }
}

async function fetchServices() {
  try {
    const [servicesRes, projectsRes] = await Promise.all([
      fetch(`${API_BASE}/api/services`),
      fetch(`${API_BASE}/api/projects`)
    ])
    services.value = await servicesRes.json()
    projects.value = await projectsRes.json()
  } catch (error) {
    console.error('Failed to fetch data:', error)
  }
}

const projects = ref([])

const projectInfo = computed(() => {
  const info = {}
  for (const p of projects.value) {
    info[p.name] = { webUrl: p.webUrl || null, description: p.description || '' }
  }
  return info
})

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

function getCategoryLabel(category) {
  const labels = { web: 'Web', java: 'Java', go: 'Go', node: 'Node', 'c++': 'C++', '虚拟机': '虚拟机' }
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

function getServiceWebUrl(service) {
  return service.webUrl || null
}

onMounted(() => {
  fetchServices()
  
  socket = io(API_BASE)
  socket.on('servicesStatus', (data) => {
    services.value = data
  })
  socket.on('projectsStatus', (data) => {
    projects.value = data
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
      <div class="header-search">
        <el-input
          v-model="searchQuery"
          placeholder="搜索项目、服务名称、ID、类别、端口..."
          prefix-icon="Search"
          clearable
          class="search-input"
        />
        <span class="search-hint" v-if="searchQuery">
          {{ filteredServices.length }} 个服务
        </span>
      </div>
    </header>
    
    <main class="main">
      <!-- 搜索框已移至header -->
      
      <div class="services-section" v-for="project in projectList" :key="project">
        <div class="project-header" :style="{ borderLeftColor: getProjectColor(project) }">
          <div class="project-main">
            <div class="project-info">
              <span class="project-title">{{ project }}</span>
              <span class="project-count">{{ groupedServices[project].length }} 个服务</span>
              <span v-if="projectInfo[project]?.description" class="project-description-badge">
                <span class="desc-dot"></span>
                {{ projectInfo[project].description }}
              </span>
            </div>
          </div>
          <div class="project-actions">
            <div 
              v-if="projectWebUrls[project]" 
              @click="copyWebUrl(projectWebUrls[project])" 
              class="project-url"
            >
              <span class="url-text">{{ projectWebUrls[project] }}</span>
              <el-icon class="copy-icon" :size="14"><CopyDocument /></el-icon>
            </div>
          </div>
        </div>
        <div class="services-grid">
          <div class="service-card"
            v-for="service in groupedServices[project]"
            :key="service.id"
            :class="{ 'is-running': service.running }"
          >
            <div class="card-body">
              <div class="card-top">
                <div class="service-name-row">
                  <img :src="getCategoryIcon(service.category)" class="category-icon" />
                  <span class="service-name">{{ service.name }}</span>
                  <span class="status-badge" :class="service.running ? 'running' : 'stopped'">
                    <span class="status-dot"></span>
                    {{ service.running ? '运行中' : '已停止' }}
                  </span>
                </div>
                <div class="service-meta-row">
                  <!-- 类别已移至角标 -->
                  <span class="meta-tag category-tag">{{ getCategoryLabel(service.category) }}</span>
                  <span class="meta-tag port-tag">端口: {{ service.listen }}</span>
                  <span class="meta-tag id-tag">{{ service.id }}</span>
                </div>
                <div v-if="service.description" class="service-description">
                  {{ service.description }}
                </div>
                <div v-if="service.webUrl" @click="copyWebUrl(service.webUrl)" class="service-url">
                  <div class="url-text">{{ service.webUrl }}</div>
                  <div style="flex: 1;"></div>
                  <el-icon class="copy-icon" :size="14"><CopyDocument /></el-icon>
                </div>
              </div>
            </div>
            
            <div class="card-footer">
              <button 
                class="btn btn-start" 
                @click="startService(service)"
                :disabled="service.running || operationInProgress === service.id"
              >
                <el-icon><VideoPlay /></el-icon>
                启动
              </button>
              <button 
                class="btn btn-stop" 
                @click="stopService(service.id)"
                :disabled="!service.running || operationInProgress === service.id"
              >
                <el-icon><VideoPause /></el-icon>
                停止
              </button>
              <button 
                class="btn btn-restart" 
                @click="restartService(service.id)"
                :disabled="operationInProgress === service.id"
              >
                <el-icon><Refresh /></el-icon>
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

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
  gap: 24px;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.header-search {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  justify-content: flex-end;
}

.main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
}

.search-input {
  max-width: 400px;
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
  white-space: nowrap;
}

.services-section {
  margin-bottom: 32px;
}

.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.project-header:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.project-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-description {
  font-size: 13px;
  color: #7c7c8c;
  background: #f8f9fb;
  padding: 4px 10px;
  border-radius: 4px;
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-left: 2px solid #dcdfe6;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-url {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #409eff;
  font-size: 13px;
  padding: 6px 12px;
  background: #ecf5ff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.project-url:hover {
  background: #d9ecff;
  text-decoration: none;
}

.project-url .url-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-url .copy-icon {
  flex-shrink: 0;
}

.project-url .copy-icon:hover {
  transform: scale(1.15);
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

.project-description-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #5c5c6c;
  background: #f0f2f5;
  padding: 4px 10px;
  border-radius: 4px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-left: 2px solid #c0c4cc;
}

.desc-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #909399;
  flex-shrink: 0;
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
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.service-card .category-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
  margin: 8px 0;
  display: block;
}

.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.service-card.is-running {
  border: 1px solid #b7eb8f;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.15);
}

.service-card.is-running .card-body {
  background: linear-gradient(135deg, #f6ffed 0%, #ffffff 50%, #f0f9ff 100%);
}

.card-body {
  padding: 16px;
  flex: 1;
}

.card-top {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.service-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.running {
  background: #e6f7e6;
  color: #52c41a;
}

.status-badge.stopped {
  background: #f5f7fa;
  color: #909399;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge.running .status-dot {
  background: #52c41a;
  animation: pulse 2s infinite;
}

.status-badge.stopped .status-dot {
  background: #c0c4cc;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.service-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  background: #f4f4f5;
}

.category-tag {
  background: #ecf5ff;
  color: #409eff;
}

.port-tag {
  background: #fdf6ec;
  color: #e6a23c;
}

.id-tag {
  background: #f4f4f5;
  color: #909399;
}

.service-description {
  font-size: 12px;
  color: #909399;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 4px;
  border-left: 2px solid #e4e7ed;
  line-height: 1.4;
}

.service-url {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #409eff;
  text-decoration: none;
  font-size: 13px;
  padding: 6px 10px;
  background: #f0f9ff;
  border-radius: 4px;
  transition: all 0.2s;
}

.service-url:hover {
  background: #e6f7ff;
  text-decoration: none;
}

.url-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-icon {
  cursor: pointer;
  transition: transform 0.2s;
}

.copy-icon:hover {
  transform: scale(1.1);
}

.card-footer {
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
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