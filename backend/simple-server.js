const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// 中間件設置
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置文件上傳
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// 模擬數據
const mockUsers = [
  {
    id: 'user-1',
    username: 'admin',
    displayName: 'Administrator',
    email: 'admin@example.com',
    role: 'admin',
    avatar: '',
    isOnline: true,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'user-2',
    username: 'analyst',
    displayName: 'Data Analyst',
    email: 'analyst@example.com',
    role: 'user',
    avatar: '',
    isOnline: false,
    lastActive: new Date(Date.now() - 3600000).toISOString(),
  }
];

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 用戶端點
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: mockUsers });
});

app.get('/api/users/current/:userId?', (req, res) => {
  const userId = req.params.userId || 'user-1';
  const user = mockUsers.find(u => u.id === userId) || mockUsers[0];
  res.json({ success: true, data: user });
});

app.post('/api/users/:userId/current', (req, res) => {
  const userId = req.params.userId;
  const user = mockUsers.find(u => u.id === userId) || mockUsers[0];
  user.isOnline = true;
  user.lastActive = new Date().toISOString();
  res.json({ success: true, data: user });
});

app.put('/api/users/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = mockUsers.find(u => u.id === userId);
  if (user) {
    Object.assign(user, req.body);
    res.json({ success: true, data: user });
  } else {
    res.status(404).json({ success: false, error: 'User not found' });
  }
});

// 文件上傳端點
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  // 模擬處理CSV數據
  const mockData = [];
  for (let i = 1; i <= 100; i++) {
    mockData.push({
      Point_ID: `P${i}`,
      Location_X: Math.random() * 100,
      Location_Y: Math.random() * 100,
      Voltage: (Math.random() * 5 + 3).toFixed(2),
      Current: (Math.random() * 2 + 0.5).toFixed(3),
      Temperature: (Math.random() * 40 + 20).toFixed(1),
      Resistance: (Math.random() * 1000 + 100).toFixed(0),
      Test_Time: new Date().toISOString(),
      Operator: 'TestUser',
      Equipment_ID: 'EQ001',
      Batch_No: 'B001',
      Test_Result: Math.random() > 0.1 ? 'PASS' : 'Fail'
    });
  }

  res.json({
    success: true,
    data: {
      fileId: `file_${Date.now()}`,
      data: mockData
    }
  });
});

// 數據處理端點
app.post('/api/data/process', (req, res) => {
  const { fileId, cleaningRules } = req.body;

  // 模擬數據清理
  res.json({
    success: true,
    data: [] // 返回清理後的數據
  });
});

app.post('/api/data/preview-cleaning', (req, res) => {
  const { data, rules } = req.body;

  // 模擬清理預覽
  const cleanedData = data.map(row => ({
    ...row,
    // 模擬一些清理操作
    Voltage: parseFloat(row.Voltage) || 0,
    Current: parseFloat(row.Current) || 0
  }));

  res.json({
    success: true,
    data: {
      cleanedData,
      removedCount: Math.floor(Math.random() * 5),
      statistics: {
        totalRows: data.length,
        cleanedRows: cleanedData.length
      }
    }
  });
});

app.post('/api/data/statistics', (req, res) => {
  const { data, fields } = req.body;

  res.json({
    success: true,
    data: {
      count: data.length,
      fields: fields || Object.keys(data[0] || {})
    }
  });
});

app.post('/api/data/validate', (req, res) => {
  const { data, rules } = req.body;

  res.json({
    success: true,
    data: {
      isValid: true,
      errors: []
    }
  });
});

// 圖表端點
app.post('/api/charts/generate', (req, res) => {
  const { data, config } = req.body;

  res.json({
    success: true,
    data: {
      chartData: data,
      chartConfig: config
    }
  });
});

// 項目端點
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'project-1',
        name: 'Demo Project',
        description: 'A demo project for testing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: 'user-1',
        collaborators: ['user-2'],
        dataFiles: [],
        charts: []
      }
    ]
  });
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: `project_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.json({ success: true, data: project });
});

app.put('/api/projects/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  });
});

app.delete('/api/projects/:id', (req, res) => {
  res.json({ success: true, data: null });
});

// 導出端點
app.post('/api/export/data', (req, res) => {
  const { data, format } = req.body;

  res.json({
    success: true,
    data: {
      downloadUrl: `/api/download/data_export_${Date.now()}.${format}`
    }
  });
});

app.post('/api/export/chart', (req, res) => {
  const { chartData, format } = req.body;

  res.json({
    success: true,
    data: {
      downloadUrl: `/api/download/chart_export_${Date.now()}.${format}`
    }
  });
});

// Socket.IO 處理
io.on('connection', (socket) => {
  console.log('用戶連接:', socket.id);

  socket.on('join-project', (data) => {
    socket.join(data.projectId);
    socket.emit('project-joined', { projectId: data.projectId });
  });

  socket.on('chart-change', (data) => {
    socket.to(data.projectId).emit('chart-changed', data);
  });

  socket.on('disconnect', () => {
    console.log('用戶斷開連接:', socket.id);
  });
});

// 啟動服務器
server.listen(PORT, () => {
  console.log(`🚀 服務器運行在 http://localhost:${PORT}`);
  console.log(`📡 Socket.IO 連接可用`);
  console.log(`✅ API 端點可用於測試`);
});