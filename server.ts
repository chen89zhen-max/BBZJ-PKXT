import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { AppState } from './src/types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Initial State
let state: AppState = {
  classCategories: [
    { id: 'cat-1', name: '普通班' },
    { id: 'cat-2', name: '培优班' },
    { id: 'cat-3', name: '3+2' },
    { id: 'cat-4', name: '3+4' },
    { id: 'cat-5', name: '五年制' },
    { id: 'cat-6', name: '中职云班' },
    { id: 'cat-7', name: '综合高中普通' },
    { id: 'cat-8', name: '综合高中艺体' },
    { id: 'cat-9', name: '综合高中云班' },
  ],
  departments: [
    { id: 'dept-1', name: '智能制造产业部' },
    { id: 'dept-2', name: '信息技术产业部' },
    { id: 'dept-3', name: '旅游服务产业部' },
    { id: 'dept-4', name: '城南工作部（中职）' },
    { id: 'dept-5', name: '城南工作部（综合高中）' },
  ],
  majors: [
    { id: 'major-1', departmentId: 'dept-1', name: '汽修' },
    { id: 'major-2', departmentId: 'dept-1', name: '新能源' },
    { id: 'major-3', departmentId: 'dept-1', name: '机电' },
    { id: 'major-4', departmentId: 'dept-2', name: '计算机应用' },
  ],
  grades: [
    { id: 'grade-1', name: '2023级' },
    { id: 'grade-2', name: '2024级' },
    { id: 'grade-3', name: '2025级' },
    { id: 'grade-4', name: '2026级' },
  ],
  teachers: [
    { id: 't-1', name: '李中利' },
    { id: 't-2', name: '顾小妃' },
    { id: 't-3', name: '鲜佳' },
    { id: 't-4', name: '胡华敏' },
    { id: 't-5', name: '陈建梅' },
    { id: 't-6', name: '蒋帅' },
    { id: 't-7', name: '王萍萍' },
    { id: 't-8', name: '刘丹小' },
    { id: 't-9', name: '刘丹大' },
    { id: 't-10', name: '刘勇君' },
    { id: 't-11', name: '曾影祝' },
    { id: 't-12', name: '米娟' },
    { id: 't-13', name: '刘雷雷' },
    { id: 't-14', name: '唐洁艺' },
    { id: 't-15', name: '黄泳龙' },
    { id: 't-16', name: '朱倩' },
    { id: 't-17', name: '靖开泉' },
    { id: 't-18', name: '刘星女' },
  ],
  classes: [
    { id: 'c-1', majorId: 'major-1', gradeId: 'grade-1', name: '2023级汽修1班', type: '普通班', classroom: '勤301', studentCount: 38, headTeacherId: 't-15' },
    { id: 'c-2', majorId: 'major-2', gradeId: 'grade-1', name: '2023级新能源4班', type: '培优班', classroom: '勤506', studentCount: 35, headTeacherId: 't-16' },
    { id: 'c-3', majorId: 'major-2', gradeId: 'grade-1', name: '2023级新能源3班', type: '3+2', classroom: '勤208', studentCount: 34, headTeacherId: 't-8' },
    { id: 'c-4', majorId: 'major-2', gradeId: 'grade-1', name: '2023级新能源1班', type: '普通班', classroom: '勤402', studentCount: 45, headTeacherId: 't-17' },
    { id: 'c-5', majorId: 'major-2', gradeId: 'grade-1', name: '2023级新能源2班', type: '普通班', classroom: '勤206', studentCount: 36, headTeacherId: 't-18' },
    { id: 'c-6', majorId: 'major-3', gradeId: 'grade-1', name: '2023级机电1班', type: '普通班', classroom: '勤201', studentCount: 39, headTeacherId: 't-14' },
  ],
  subjects: [
    { id: 's-1', name: '语文', type: '中职公共基础课' as any },
    { id: 's-2', name: '数学', type: '中职公共基础课' as any },
    { id: 's-3', name: '英语', type: '中职公共基础课' as any },
    { id: 's-4', name: '物理', type: '中职公共基础课' as any },
    { id: 's-5', name: '历史', type: '中职公共基础课' as any },
    { id: 's-6', name: '公共艺术', type: '中职公共基础课' as any },
    { id: 's-7', name: '中国特色社会主义1', type: '中职公共基础课' as any },
    { id: 's-8', name: '心理健康与职业生涯2', type: '中职公共基础课' as any },
    { id: 's-9', name: '哲学与人生3', type: '中职公共基础课' as any },
    { id: 's-10', name: '职业道德与法治4', type: '中职公共基础课' as any },
    { id: 's-11', name: '信息技术', type: '中职公共基础课' as any },
    { id: 's-12', name: '艺术（音乐）', type: '中职公共基础课' as any },
    { id: 's-13', name: '体育与健康', type: '中职公共基础课' as any },
    { id: 's-14', name: '汽车文化', type: '中职专业课' as any, departmentId: 'dept-1', majorId: 'major-1' },
    { id: 's-15', name: '汽车美容', type: '中职专业课' as any, departmentId: 'dept-1', majorId: 'major-1' },
    { id: 's-16', name: '汽车机械基础', type: '中职专业课' as any, departmentId: 'dept-1', majorId: 'major-2' },
    { id: 's-17', name: '汽车机械制图与CAD', type: '中职专业课' as any, departmentId: 'dept-1', majorId: 'major-3' },
  ],
  schedules: [
    { id: 'sch-1', classId: 'c-1', subjectId: 's-1', teacherId: 't-1', hours: 5 },
    { id: 'sch-2', classId: 'c-1', subjectId: 's-2', teacherId: 't-2', hours: 5 },
    { id: 'sch-3', classId: 'c-1', subjectId: 's-3', teacherId: 't-3', hours: 5 },
    { id: 'sch-4', classId: 'c-1', subjectId: 's-13', teacherId: 't-4', hours: 2 },
    
    { id: 'sch-5', classId: 'c-2', subjectId: 's-1', teacherId: 't-5', hours: 5 },
    { id: 'sch-6', classId: 'c-2', subjectId: 's-2', teacherId: 't-6', hours: 5 },
    { id: 'sch-7', classId: 'c-2', subjectId: 's-3', teacherId: 't-7', hours: 5 },
    { id: 'sch-8', classId: 'c-2', subjectId: 's-13', teacherId: 't-4', hours: 2 },
    
    { id: 'sch-9', classId: 'c-3', subjectId: 's-1', teacherId: 't-8', hours: 3 },
    { id: 'sch-10', classId: 'c-3', subjectId: 's-2', teacherId: 't-9', hours: 3 },
    { id: 'sch-11', classId: 'c-3', subjectId: 's-3', teacherId: 't-3', hours: 3 },
    { id: 'sch-12', classId: 'c-3', subjectId: 's-13', teacherId: 't-10', hours: 2 },
    
    { id: 'sch-13', classId: 'c-4', subjectId: 's-1', teacherId: 't-1', hours: 5 },
    { id: 'sch-14', classId: 'c-4', subjectId: 's-2', teacherId: 't-11', hours: 5 },
    { id: 'sch-15', classId: 'c-4', subjectId: 's-3', teacherId: 't-12', hours: 5 },
    { id: 'sch-16', classId: 'c-4', subjectId: 's-13', teacherId: 't-10', hours: 2 },
    
    { id: 'sch-17', classId: 'c-5', subjectId: 's-1', teacherId: 't-8', hours: 5 },
    { id: 'sch-18', classId: 'c-5', subjectId: 's-2', teacherId: 't-13', hours: 5 },
    { id: 'sch-19', classId: 'c-5', subjectId: 's-3', teacherId: 't-3', hours: 5 },
    { id: 'sch-20', classId: 'c-5', subjectId: 's-13', teacherId: 't-10', hours: 2 },
    
    { id: 'sch-21', classId: 'c-6', subjectId: 's-1', teacherId: 't-1', hours: 5 },
    { id: 'sch-22', classId: 'c-6', subjectId: 's-2', teacherId: 't-13', hours: 5 },
    { id: 'sch-23', classId: 'c-6', subjectId: 's-3', teacherId: 't-3', hours: 5 },
    { id: 'sch-24', classId: 'c-6', subjectId: 's-13', teacherId: 't-14', hours: 2 },
  ],
  archives: [],
  users: [],
};

function loadState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const loadedState = JSON.parse(data);
      state = { ...state, ...loadedState };
      // Ensure users array exists
      if (!state.users) state.users = [];
      console.log('Loaded state from disk.');
    } else {
      saveState(); // Save initial default state
      console.log('Created new state file with default data.');
    }
  } catch (err) {
    console.error('Error loading state:', err);
  }
}

function saveState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

async function setupAdmin() {
  const adminExists = state.users.find(u => u.username === 'chenzhen');
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('Chen@890312', 10);
    state.users.push({
      id: 'admin-1',
      username: 'chenzhen',
      passwordHash,
      role: 'SUPER_ADMIN'
    });
    saveState();
    console.log('Admin user created.');
  }
}

async function startServer() {
  loadState();
  await setupAdmin();
  const app = express();
  app.set('trust proxy', 1);
  app.use(cookieParser());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    path: '/socket.io/',
    cors: {
      origin: '*',
      methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    destroyUpgrade: false,
  });

  const PORT = 3000;

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state to the newly connected client (filter out sensitive data)
    const filteredState = {
      ...state,
      users: state.users.map(({ passwordHash, ...u }) => u)
    };
    socket.emit('state:sync', filteredState);

    // Handle updates
    socket.on('state:update', (newState: AppState) => {
      // Merge updates but keep server-side users (users managed via REST)
      state = { ...newState, users: state.users };
      saveState();
      
      const filteredState = {
        ...state,
        users: state.users.map(({ passwordHash, ...u }) => u)
      };
      // Broadcast to all OTHER clients
      socket.broadcast.emit('state:sync', filteredState);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API routes FIRST
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  function authorize(roles: string[]) {
    return (req: any, res: any, next: any) => {
      console.log(`[Auth] ${req.method} ${req.path} - Cookies:`, req.cookies ? 'Present' : 'Missing', req.cookies);
      const token = req.cookies?.token;
      if (!token) {
        console.log(`[Auth] No token found for ${req.method} ${req.path}`);
        return res.status(401).json({ error: 'Not authenticated' });
      }
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!roles.includes(decoded.role)) {
          console.log(`[Auth] Forbidden for role ${decoded.role}`);
          return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decoded;
        next();
      } catch (err) {
        console.log(`[Auth] Invalid token:`, err);
        res.status(401).json({ error: 'Invalid token' });
      }
    };
  }

  // User Management API (SUPER_ADMIN only)
  app.get('/api/users', authorize(['SUPER_ADMIN']), (req, res) => {
    const filteredUsers = state.users.map(({ passwordHash, ...u }) => u);
    res.json(filteredUsers);
  });

  app.post('/api/users', authorize(['SUPER_ADMIN']), async (req, res) => {
    const { username, password, role, departmentIds } = req.body;
    if (state.users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: `u-${Date.now()}`,
      username,
      passwordHash,
      role,
      departmentIds
    };
    state.users.push(newUser);
    saveState();
    
    // Notify all clients about the change (filtered)
    const filteredState = {
      ...state,
      users: state.users.map(({ passwordHash, ...u }) => u)
    };
    io.emit('state:sync', filteredState);
    
    res.json({ message: 'User created' });
  });

  app.put('/api/users/:id', authorize(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { username, password, role, departmentIds } = req.body;
    const userIndex = state.users.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    const user = state.users[userIndex];
    if (username) user.username = username;
    if (role) user.role = role;
    if (departmentIds !== undefined) user.departmentIds = departmentIds;
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    saveState();
    
    const filteredState = {
      ...state,
      users: state.users.map(({ passwordHash, ...u }) => u)
    };
    io.emit('state:sync', filteredState);
    
    res.json({ message: 'User updated' });
  });

  app.delete('/api/users/:id', authorize(['SUPER_ADMIN']), (req: any, res) => {
    const { id } = req.params;
    // Prevent deleting self
    if (req.user.id === id) return res.status(400).json({ error: 'Cannot delete yourself' });

    const initialCount = state.users.length;
    state.users = state.users.filter(u => u.id !== id);
    
    if (state.users.length === initialCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    saveState();
    
    const filteredState = {
      ...state,
      users: state.users.map(({ passwordHash, ...u }) => u)
    };
    io.emit('state:sync', filteredState);
    
    res.json({ message: 'User deleted' });
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = state.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isSecure, 
      sameSite: isSecure ? 'none' : 'lax' 
    });
    res.json({ user: { id: user.id, username: user.username, role: user.role, departmentIds: user.departmentIds } });
  });

  app.post('/api/logout', (req, res) => {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out' });
  });

  app.get('/api/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = state.users.find(u => u.id === decoded.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      res.json({ user: { id: user.id, username: user.username, role: user.role, departmentIds: user.departmentIds } });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/state', (req, res) => {
    res.json(state);
  });

  app.post('/api/state/import', authorize(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const newState = req.body;
    // Basic validation
    if (!newState.departments || !newState.teachers || !newState.schedules) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    
    state = { ...newState, users: state.users }; // Keep current users for safety
    saveState();
    
    const filteredState = {
      ...state,
      users: state.users.map(({ passwordHash, ...u }) => u)
    };
    io.emit('state:sync', filteredState);
    res.json({ message: 'State restored successfully' });
  });

  // Dummy favicon route to prevent 404 errors
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // Prevent caching of index.html to avoid blank screens after updates
  app.use((req, res, next) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Fallback for cached development index.html
    // If the browser requests /src/* or /@vite/client, it means it has a cached dev index.html.
    // We return a script that redirects to a cache-busting URL to clear the cache.
    app.get(['/src/*', '/@vite/client'], (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(`
        if (!window.location.search.includes('clearcache')) {
          window.location.href = window.location.pathname + '?clearcache=' + Date.now();
        } else {
          console.error('Failed to clear cache. Please manually clear your browser cache (Ctrl+F5).');
        }
      `);
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
