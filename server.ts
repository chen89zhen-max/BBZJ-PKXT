import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { AppState } from './src/types.ts';

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
    { id: 'dept-4', name: '城南工作部' },
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
    { id: 's-1', name: '语文', type: '公共课' },
    { id: 's-2', name: '数学', type: '公共课' },
    { id: 's-3', name: '英语', type: '公共课' },
    { id: 's-4', name: '物理', type: '公共课' },
    { id: 's-5', name: '历史', type: '公共课' },
    { id: 's-6', name: '公共艺术', type: '公共课' },
    { id: 's-7', name: '中国特色社会主义1', type: '公共课' },
    { id: 's-8', name: '心理健康与职业生涯2', type: '公共课' },
    { id: 's-9', name: '哲学与人生3', type: '公共课' },
    { id: 's-10', name: '职业道德与法治4', type: '公共课' },
    { id: 's-11', name: '信息技术', type: '公共课' },
    { id: 's-12', name: '艺术（音乐）', type: '公共课' },
    { id: 's-13', name: '体育与健康', type: '公共课' },
    { id: 's-14', name: '汽车文化', type: '专业课' },
    { id: 's-15', name: '汽车美容', type: '专业课' },
    { id: 's-16', name: '汽车机械基础', type: '专业课' },
    { id: 's-17', name: '汽车机械制图与CAD', type: '专业课' },
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
};

async function startServer() {
  const app = express();
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

    // Send initial state to the newly connected client
    socket.emit('state:sync', state);

    // Handle updates
    socket.on('state:update', (newState: AppState) => {
      state = newState;
      // Broadcast to all OTHER clients
      socket.broadcast.emit('state:sync', state);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/state', (req, res) => {
    res.json(state);
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
