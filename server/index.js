const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const projects = require('./services.js');
let runningProcesses = new Map();

function findService(serviceId) {
  for (const project of projects) {
    const service = project.services.find(s => s.id === serviceId);
    if (service) {
      return { service, project };
    }
  }
  return null;
}

function getAllServices() {
  const allServices = [];
  for (const project of projects) {
    for (const service of project.services) {
      allServices.push({ ...service, project: project.name });
    }
  }
  return allServices;
}

async function checkPortStatus(port, webUrl) {
  return new Promise((resolve) => {
    const net = require('net');
    const client = new net.Socket();
    client.setTimeout(2000);
    
    client.connect(port, '127.0.0.1', () => {
      if (webUrl) {
        axios.get(webUrl, { timeout: 3000 })
          .then(() => resolve({ running: true, canAccess: true }))
          .catch(() => resolve({ running: true, canAccess: false }))
          .finally(() => client.destroy());
      } else {
        resolve({ running: true, canAccess: false });
      }
    });
    
    client.on('error', () => {
      resolve({ running: false, canAccess: false });
      client.destroy();
    });
    
    client.on('timeout', () => {
      resolve({ running: false, canAccess: false });
      client.destroy();
    });
  });
}

async function getServiceStatus(service) {
  const status = await checkPortStatus(service.listen, service.webUrl);
  return {
    ...service,
    running: status.running,
    canAccess: status.canAccess
  };
}

app.get('/api/services', async (req, res) => {
  try {
    const allServices = getAllServices();
    const statuses = await Promise.all(allServices.map(getServiceStatus));
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projectStatuses = await Promise.all(
      projects.map(async (project) => {
        const serviceStatuses = await Promise.all(
          project.services.map(getServiceStatus)
        );
        return {
          ...project,
          services: serviceStatuses
        };
      })
    );
    res.json(projectStatuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services/:id/start', async (req, res) => {
  const { id } = req.params;
  const found = findService(id);
  
  if (!found) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  const { service } = found;
  
  if (runningProcesses.has(id)) {
    return res.status(400).json({ error: 'Service is already running' });
  }
  
  try {
    const batPath = path.resolve(service.start);
    if (!fs.existsSync(batPath)) {
      return res.status(404).json({ error: 'Start bat file not found' });
    }
    
    const proc = spawn('cmd.exe', ['/c', batPath], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(batPath)
    });
    
    proc.unref();
    runningProcesses.set(id, proc);
    
    res.json({ success: true, message: 'Service starting...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services/:id/stop', async (req, res) => {
  const { id } = req.params;
  const found = findService(id);
  
  if (!found) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  const { service } = found;
  
  try {
    if (service.stop) {
      const batPath = path.resolve(service.stop);
      if (!fs.existsSync(batPath)) {
        return res.status(404).json({ error: 'Stop bat file not found' });
      }
      
      spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(batPath)
      });
    } else {
      const port = service.listen;
      const checkStatus = await checkPortStatus(port);
      
      if (checkStatus.running) {
        console.log(`Stopping service on port ${port}...`);
        const killCmd = `for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do @taskkill /F /PID %a`;
        exec(killCmd, (err, stdout, stderr) => {
          if (err) console.error('Stop error:', err);
          if (stdout) console.log('Stop stdout:', stdout);
          if (stderr) console.error('Stop stderr:', stderr);
        });
      } else {
        console.log(`Service on port ${port} is not running`);
      }
    }
    
    runningProcesses.delete(id);
    
    res.json({ success: true, message: 'Service stopping...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services/:id/restart', async (req, res) => {
  const { id } = req.params;
  const found = findService(id);
  
  if (!found) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  const { service } = found;
  
  try {
    if (service.restart) {
      const batPath = path.resolve(service.restart);
      if (!fs.existsSync(batPath)) {
        return res.status(404).json({ error: 'Restart bat file not found' });
      }
      
      spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(batPath)
      });
    } else {
      if (service.stop) {
        const stopBatPath = path.resolve(service.stop);
        spawn('cmd.exe', ['/c', stopBatPath], { detached: true, stdio: 'ignore' });
      } else {
        const port = service.listen;
        spawn('cmd.exe', ['/c', `for /f "tokens=5" %a in ('netstat -ano ^| find ":${port}" ^| find "LISTENING"') do taskkill /F /PID %a`], {
          shell: true
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const startBatPath = path.resolve(service.start);
      spawn('cmd.exe', ['/c', startBatPath], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(startBatPath)
      });
    }
    
    res.json({ success: true, message: 'Service restarting...' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

setInterval(async () => {
  try {
    const allServices = getAllServices();
    const statuses = await Promise.all(allServices.map(getServiceStatus));
    io.emit('servicesStatus', statuses);
    
    const projectStatuses = await Promise.all(
      projects.map(async (project) => {
        const serviceStatuses = await Promise.all(
          project.services.map(getServiceStatus)
        );
        return {
          ...project,
          services: serviceStatuses
        };
      })
    );
    io.emit('projectsStatus', projectStatuses);
  } catch (error) {
    console.error('Status check error:', error);
  }
}, 1000);

io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 13001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});