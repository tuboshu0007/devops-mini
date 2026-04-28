# DevOps-Mini Development Guide

DevOps dashboard for monitoring and controlling services. Node.js/Express backend + Vue 3 frontend.

## Build Commands

### Server (port 13001)
```bash
cd server && npm start
```

### Frontend (port 15173)
```bash
cd frontend && npm run dev      # Dev server
npm run build                # Production build
npm run preview             # Preview production build
```

### Running Both
Start server first, then frontend in separate terminals.

## Testing

No test framework configured. To add and run tests:

**Server (Jest):**
```bash
cd server && npm install --save-dev jest
# Run all tests
npm test
# Run single test file
npm test -- --testPathPattern=filename
# Run with coverage
npm test -- --coverage
```

**Frontend (Vitest):**
```bash
cd frontend && npm install --save-dev vitest
# Run all tests
npm test
# Run single test file
npm test run filename.test.js
# Run with coverage
npm test run --coverage
```

## Linting

**ESLint (frontend):**
```bash
cd frontend && npm install --save-dev eslint @eslint/js eslint-plugin-vue
npx eslint src/ --ext .vue,.js
```

## Project Structure

```
devops-mini/
├── AGENTS.md              # This file
├── server/
│   ├── package.json
│   ├── index.js          # Express + Socket.IO server
│   ├── services.js       # Project configurations (JS module)
│   └── interface.d.ts    # TypeScript type definitions
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.js
        ├── App.vue
        └── style.css
```

## Code Style Guidelines

### Language Standards
- **Server**: CommonJS (require/module.exports)
- **Frontend**: ES Modules (import/export)
- **No TypeScript** - Plain JavaScript + Vue 3 Composition API

### Import Conventions
**Server:**
```javascript
const express = require("express")
const { exec, spawn } = require("child_process")
```

**Frontend:**
```javascript
import { ref, onMounted, computed } from "vue"
import { io } from "socket.io-client"
import { CopyDocument } from "@element-plus/icons-vue"
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Files (JS) | camelCase | index.js |
| Files (Vue) | PascalCase | App.vue |
| Variables | camelCase | services, runningProcesses |
| Constants | UPPER_SNAKE_CASE | API_BASE, CONFIG_FILE |
| Components | PascalCase | ServiceCard |
| CSS Classes | kebab-case | .service-card |

### Formatting
- Indentation: 2 spaces
- Use semicolons consistently (match existing codebase)
- Single quotes for strings (match existing codebase)
- Trailing commas in multiline objects/arrays
- Line length: under 100 characters

### Vue Component Structure
```vue
<script setup>
import { ref, computed } from "vue"

const services = ref([])
const filtered = computed(() => services.value.filter(s => s.running))

function fetchData() {
  // async fetch with try/catch
}
</script>

<template>
  <div class="container">{{ filtered.length }}</div>
</template>

<style scoped>
.container { padding: 20px; }
</style>
```

### Error Handling
**Server**: Return JSON with HTTP status codes
| Code | Meaning |
|------|---------|
| 400 | Bad request |
| 404 | Not found |
| 409 | Conflict |
| 500 | Internal error |

**Frontend**: try/catch + ElMessage for errors

### CSS Guidelines
- Use scoped styles (`<style scoped>`)
- Prefer flexbox for layout, grid for cards
- Keep selectors simple and specific
- Use meaningful class names with kebab-case

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/services | Get all services status (flat array) |
| GET | /api/projects | Get all projects with services status |
| POST | /api/services/:id/start | Start a service |
| POST | /api/services/:id/stop | Stop a service |
| POST | /api/services/:id/restart | Restart a service |

## Service Configuration

Type definitions are declared in `server/interface.d.ts`:
- `ServiceItem`: id, category, name, listen, start, webUrl?, stop?, restart?, description?
- `ProjectItem`: id, name, description, webUrl?, services: ServiceItem[]

Edit `server/services.js`:

```javascript
module.exports = [
  {
    id: "my-project",
    name: "My Project",
    description: "Project description",
    webUrl: "http://localhost:3000",
    services: [
      {
        id: "my-service",
        name: "My Service",
        category: "web",
        listen: 3000,
        start: "C:\\path\\to\\start.bat",
        stop: "C:\\path\\to\\stop.bat",
        restart: "C:\\path\\to\\restart.bat",
        description: "Service description"
      }
    ]
  }
]
```

**ProjectItem fields:** id, name, description, webUrl?, services[]
**ServiceItem required:** id, category, name, listen, start
**ServiceItem optional:** webUrl, stop, restart, description

## Socket.IO Events

- `servicesStatus`: Full services list update (flat array)
- `projectsStatus`: Projects with services status update
- Connection: `http://localhost:13001`

## Development Notes

- Server polls statuses every 1 second (setInterval)
- Real-time updates via Socket.IO
- Frontend: minimal CSS, Element Plus for UI
- Server state is in-memory (no database)