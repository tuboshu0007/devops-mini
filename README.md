# DevOps-Mini

A lightweight DevOps dashboard for monitoring and controlling services.

## Features

- Real-time service status monitoring via Socket.IO
- Start/Stop/Restart services with one click
- Port-based status checking
- Web URL accessibility detection
- Category-based service organization
- Search and filter services

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install server dependencies
cd server && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Running

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

## Configuration

Edit `server/services.js` to add your services:

```javascript
module.exports = [
  {
    id: 'my-project',
    name: 'My Project',
    description: 'Project description',
    webUrl: 'http://localhost:3000',
    services: [
      {
        id: 'my-service',
        name: 'My Service',
        category: 'web',
        listen: 3000,
        start: 'C:\\path\\to\\start.bat',
        stop: 'C:\\path\\to\\stop.bat',
        restart: 'C:\\path\\to\\restart.bat'
      }
    ]
  }
]
```

## Tech Stack

- **Backend:** Express, Socket.IO
- **Frontend:** Vue 3, Element Plus, Socket.IO Client

## Author

Marmotogo 2814721402@qq.com

## License

MIT License - see LICENSE file for details.