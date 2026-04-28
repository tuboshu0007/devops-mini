# DevOps-Mini Development Guide

DevOps dashboard for monitoring and controlling services. Node.js/Express backend + Vue 3 frontend.

---

## Quick Start

### Development
```bash
# Terminal 1 - Start server (port 13001)
cd server && npm start

# Terminal 2 - Start frontend (port 15173)
cd frontend && npm run dev
```

### Production Build
```bash
cd frontend && npm run build && npm run preview
```

---

## Build / Test / Lint Commands

| Command | Description |
|---------|-------------|
| `cd server && npm start` | Start Express server |
| `cd frontend && npm run dev` | Start Vite dev server |
| `cd frontend && npm run build` | Build for production |
| `cd frontend && npm run preview` | Preview production build |

**To add Jest (server):** `npm install --save-dev jest`  
**To add Vitest (frontend):** `npm install --save-dev vitest`

---

## Code Style Guidelines

### Language Standards
| Layer | Standard | Import Style |
|-------|----------|---------------|
| Server | CommonJS | require/module.exports |
| Frontend | ES Modules | import/export |
| Vue | Composition API | `<script setup>` |

### Import Conventions
**Server:** `const express = require('express')`  
**Frontend:** `import { ref } from 'vue'`

### Naming Conventions
| Type | Convention | Example |
|------|-------------|---------|
| Files (JS) | camelCase | index.js |
| Files (Vue) | PascalCase | App.vue |
| Variables | camelCase | services |
| Constants | UPPER_SNAKE_CASE | API_BASE |
| CSS Classes | kebab-case | .service-card |

### Formatting Rules
- **Indentation:** 2 spaces
- **Quotes:** Single quotes
- **Semicolons:** Always use
- **Line length:** Under 100 characters

### Vue Component Structure
```vue
<script setup>
import { ref, computed } from 'vue'
const services = ref([])
const filtered = computed(() => services.value.filter(s => s.running))
</script>
<template>
  <div v-for="service in filtered" :key="service.id">{{ service.name }}</div>
</template>
<style scoped>
.container { padding: 20px; }
</style>
```

### Error Handling
**Server:** `res.status(400).json({ error: 'Bad request' })`  
**Frontend:** `try { ... } catch (err) { ElMessage.error(err.message) }`

### CSS Guidelines
- Use scoped styles (`<style scoped>`)
- Prefer flexbox for layout, CSS grid for cards
- Use meaningful class names with kebab-case

---

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/services | Get all services status |
| POST | /api/services/:id/start | Start a service |
| POST | /api/services/:id/stop | Stop a service |
| POST | /api/services/:id/restart | Restart a service |

---

## Service Configuration

Edit `server/services.js`:
```javascript
module.exports = [
  {
    id: 'my-project',
    name: 'My Project',
    services: [
      {
        id: 'my-service',
        name: 'My Service',
        category: 'web',
        listen: 3000,
        start: 'C:\\path\\to\\start.bat'
      }
    ]
  }
]
```

**ProjectItem fields:** id, name, description?, webUrl?, services[]  
**ServiceItem required:** id, category, name, listen, start  
**ServiceItem optional:** webUrl, stop, restart?, description?

### Category Support
Add categories in frontend/App.vue:
1. `getCategoryIcon(category)` - icon mapping
2. `getCategoryLabel(category)` - label text

Icons: Use `programming-languages-logos` npm package or custom SVG in `assets/icons/`

---

## Socket.IO Events
| Event | Data | Description |
|-------|------|-------------|
| servicesStatus | ServiceItem[] | Full services list |
| projectsStatus | ProjectItem[] | Projects with status |

**Connection:** `http://localhost:13001`

---

## Development Notes
- Server polls status every 1 second via setInterval
- Real-time updates via Socket.IO
- Frontend uses Element Plus for UI components
- Category icons render inline with service title
- Buttons include icons from @element-plus/icons-vue