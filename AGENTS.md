# DevOps-Mini Development Guide

A DevOps dashboard for monitoring and controlling services. Built with Node.js/Express backend and Vue 3 frontend.

## Build Commands

### Server (port 13001)
```bash
cd server && npm start    # node index.js
```

### Frontend (port 15173)
```bash
cd frontend && npm run dev      # Start dev server
npm run build                  # Production build
npm run preview                # Preview production
```

### Running Both
Start server first, then frontend in separate terminals.

### Linting & Type Checking
No linting or type checking tools are currently configured.

To add ESLint for the frontend:
```bash
cd frontend && npm install --save-dev eslint @eslint/js eslint-plugin-vue
npx eslint src/ --ext .vue,.js
```

To add JSHint for the server:
```bash
cd server && npm install --save-dev jshint
npx jshint server/index.js
```

### Running a Single Test
No test framework configured. To add:

**Server (Jest):**
```bash
cd server && npm install --save-dev jest
# Add to package.json: "test": "jest"
npm test -- --testPathPattern=filename
```

**Frontend (Vitest):**
```bash
cd frontend && npm install --save-dev vitest
# Add to package.json: "test": "vitest"
npm test run filename
```

## Project Structure

```
devops-mini/
├── AGENTS.md              # This file
├── server/
│   ├── package.json      # Server dependencies
│   ├── index.js          # Main server (Express + Socket.IO)
│   └── services.json     # Service configurations
└── frontend/
    ├── package.json      # Frontend dependencies
    ├── vite.config.js  # Vite configuration
    └── src/
        ├── main.js      # Vue entry point
        ├── App.vue      # Main component
        └── style.css   # Global styles
```

## Code Style Guidelines

### Language Standards

- **Server**: CommonJS (require/module.exports)
- **Frontend**: ES Modules (import/export)
- **No TypeScript** - Plain JavaScript and Vue 3 Composition API

### Import Conventions

**Server (CommonJS):**
```javascript
const express = require("express")
const { exec, spawn } = require("child_process")
const fs = require("fs")
```

**Frontend (ES Modules):**
```javascript
import { ref, onMounted, computed } from "vue"
import { io } from "socket.io-client"
import { CopyDocument } from "@element-plus/icons-vue"
import App from "./App.vue"
```

### Naming Conventions

- **Files**: camelCase for JS (`index.js`), PascalCase for Vue (`App.vue`)
- **Variables**: camelCase (`services`, `runningProcesses`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE`, `CONFIG_FILE`)
- **Components**: PascalCase (`ServiceCard`, `SearchBar`)
- **CSS Classes**: kebab-case (`.service-card`, `.btn-start`)

### Formatting

- **Indentation**: 2 spaces
- **No semicolons**: Omit at end of statements
- **Quotes**: Double quotes preferred
- **Trailing commas**: Include in multiline objects/arrays
- **Line length**: Keep under 100 characters

### Vue Component Structure

```vue
<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue"
import { io } from "socket.io-client"

const services = ref([])
const searchQuery = ref("")
let socket = null

const filteredServices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return services.value
  return services.value.filter(s => s.name.toLowerCase().includes(query))
})

async function fetchServices() {
  try {
    const res = await fetch("http://localhost:13001/api/services")
    services.value = await res.json()
  } catch (err) {
    console.error("Failed to fetch services:", err)
  }
}

onMounted(() => {
  fetchServices()
  socket = io("http://localhost:13001")
  socket.on("services:update", (data) => { services.value = data })
})

onUnmounted(() => { if (socket) socket.disconnect() })
</script>

<template>
  <div class="container">
    <h1>Services</h1>
    <div v-for="service in filteredServices" :key="service.id">
      {{ service.name }}
    </div>
  </div>
</template>

<style scoped>
.container { padding: 20px; }
</style>
```

### Error Handling

- **Server**: Return JSON errors with appropriate HTTP status codes
  - 400: Bad request / validation error
  - 404: Service not found
  - 409: Conflict (service already running/stopped)
  - 500: Internal server error

- **Frontend**: Use try/catch with meaningful console.error messages
  - Display user-friendly messages via ElMessage
  - Graceful degradation for API failures

### CSS Guidelines

- Use scoped styles in Vue components (`<style scoped>`)
- Prefer flexbox for layout, grid for card layouts
- Use CSS variables for colors when possible
- Keep selectors simple and specific

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/services | Get all services status |
| POST | /api/services/:id/start | Start a service |
| POST | /api/services/:id/stop | Stop a service |
| POST | /api/services/:id/restart | Restart a service |

## Service Configuration

Edit `server/services.json` to add new services:

```json
[
  {
    "id": "my-service",
    "name": "My Service",
    "category": "web",
    "listen": 3000,
    "webUrl": "http://localhost:3000",
    "start": "C:\\path\\to\\start.bat",
    "stop": "C:\\path\\to\\stop.bat",
    "restart": "C:\\path\\to\\restart.bat"
  }
]
```

**Fields:**
- `id`: Unique identifier (required)
- `name`: Display name (required)
- `category`: Type (web/java/go/node)
- `listen`: Port number (required)
- `webUrl`: Health check URL (optional)
- `start`: Start script path (required)
- `stop`: Stop script path (optional)
- `restart`: Restart script path (optional)

## Socket.IO Events

- `servicesStatus`: Full services list update
- `serviceStatus`: Single service update
- Connection URL: `http://localhost:13001`

## Development Notes

- Server polls service statuses every 5 seconds via `setInterval`
- Real-time updates pushed to clients via Socket.IO
- Frontend uses minimal CSS (no frameworks like Tailwind)
- Server state is in-memory (no database)
- Element Plus used for UI components