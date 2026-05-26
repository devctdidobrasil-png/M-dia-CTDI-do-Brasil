import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";

const app = express();
const PORT = 3000;

// Enforce directory structures
const uploadsDir = path.join(process.cwd(), 'uploads');
const filesDir = path.join(uploadsDir, 'files');
const dbPath = path.join(uploadsDir, 'db.json');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir, { recursive: true });
}

// Database schema and interfaces
interface UserProfile {
  username: string;
  role: 'admin' | 'viewer' | 'uploader';
  createdAt: string;
  setor?: string;
  password?: string;
}

interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  views: number;
  setor?: string;
}

interface AccessLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  action: string; // 'login' | 'upload' | 'view' | 'delete' | 'user_created'
  details: string;
}

interface DatabaseSchema {
  users: UserProfile[];
  files: FileRecord[];
  logs: AccessLog[];
}

// Initial seed data
const initialDB: DatabaseSchema = {
  users: [
    { username: 'admin', role: 'admin', createdAt: new Date().toISOString(), setor: 'Administração' },
    { username: 'viewer', role: 'viewer', createdAt: new Date().toISOString(), setor: 'Geral/Visitantes' }
  ],
  files: [],
  logs: [
    {
      id: 'log-initial',
      timestamp: new Date().toISOString(),
      username: 'sistema',
      role: 'system',
      action: 'system_boot',
      details: 'Portal Multimídia iniciado com sucesso.'
    }
  ]
};

// Database local reading and writing helpers
function readDB(): DatabaseSchema {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2), 'utf-8');
      return initialDB;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro lendo banco de dados:", err);
    return initialDB;
  }
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Erro salvando banco de dados:", err);
  }
}

// Ensure database is initialized
readDB();

// Helper to log access/events
function addLog(username: string, role: string, action: string, details: string) {
  const db = readDB();
  const log: AccessLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    username,
    role,
    action,
    details
  };
  db.logs.unshift(log); // newest first
  writeDB(db);
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Enforce limits and correct mime-types (Images, Videos, PowerPoints)
const upload = multer({
  storage: storage,
  limits: { fileSize: 3 * 1024 * 1024 * 1024 }, // 3GB limit for videos/media
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|svg|webp|mp4|webm|ogg|mov|m4v|ppt|pptx|pps|ppsx|odp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.originalname.endsWith('.pptx') || file.originalname.endsWith('.ppt');
    
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error("Formato de arquivo não suportado. Carregue apenas imagens, vídeos ou arquivos PowerPoint."));
  }
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files under /uploads/files path with support for content range (Express static handles this!)
app.use('/uploads/files', express.static(filesDir));

// Authentication Endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  // To make it incredibly robust, we compare predefined passwords
  // 'admin' / 'admin123' -> Admin
  // 'viewer' / 'viewer123' -> Viewer
  // Or match from custom users created in the DB with user123-style passwords for simplicity/safety
  const db = readDB();
  const foundUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  let authorized = false;
  let detectedRole: 'admin' | 'viewer' | 'uploader' = 'viewer';

  if (username.toLowerCase() === 'admin' && password === 'admin123') {
    authorized = true;
    detectedRole = 'admin';
  } else if (username.toLowerCase() === 'viewer' && password === 'viewer123') {
    authorized = true;
    detectedRole = 'viewer';
  } else if (foundUser) {
    const hasCustomPassword = !!(foundUser.password && foundUser.password.trim());
    if (hasCustomPassword) {
      if (password === foundUser.password) {
        authorized = true;
        detectedRole = foundUser.role;
      }
    } else {
      if (password === foundUser.username + '123' || password === '123456' || password === foundUser.username) {
        authorized = true;
        detectedRole = foundUser.role;
      }
    }
  }

  if (authorized) {
    // Return a payload simulating user session/token
    const userPayload = {
      username: foundUser ? foundUser.username : username,
      role: detectedRole,
      token: `token_${detectedRole}_${Date.now()}`,
      setor: foundUser ? foundUser.setor : (detectedRole === 'admin' ? 'Administração' : 'Geral/Visitantes')
    };
    
    addLog(
      userPayload.username,
      userPayload.role,
      'login',
      `Login efetuado com sucesso via ${req.headers['user-agent']?.slice(0, 50) || 'dispositivo desconhecido'}`
    );

    return res.json(userPayload);
  }

  return res.status(401).json({ error: "Credenciais incorretas. Tente novamente." });
});

// User Management (Admin only)
app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

app.post('/api/users', (req, res) => {
  const { username, role, setor, password } = req.body;
  if (!username || !role) {
    return res.status(400).json({ error: "Usuário e perfil são obrigatórios." });
  }

  const db = readDB();
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Este usuário já está cadastrado." });
  }

  const cleanRole = role === 'admin' ? 'admin' : (role === 'uploader' ? 'uploader' : 'viewer');
  const userPassword = (password && password.trim()) ? password.trim() : `${username.trim()}123`;

  const newUser: UserProfile = {
    username: username.trim(),
    role: cleanRole,
    createdAt: new Date().toISOString(),
    setor: (setor && setor.trim()) ? setor.trim() : 'Geral',
    password: userPassword
  };

  db.users.push(newUser);
  writeDB(db);

  addLog('admin', 'admin', 'user_created', `Novo usuário adicionado: ${newUser.username} (Perfil: ${newUser.role}, Setor: ${newUser.setor})`);
  res.json(newUser);
});

app.delete('/api/users/:username', (req, res) => {
  const { username } = req.params;
  if (username.toLowerCase() === 'admin' || username.toLowerCase() === 'viewer') {
    return res.status(400).json({ error: "Não é possível apagar os usuários padrão do sistema." });
  }

  const db = readDB();
  const initialCount = db.users.length;
  db.users = db.users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  
  if (db.users.length === initialCount) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  writeDB(db);
  addLog('admin', 'admin', 'user_deleted', `Usuário removido: ${username}`);
  res.json({ success: true });
});

// File Management APIs
app.get('/api/files', (req, res) => {
  const db = readDB();
  res.json(db.files);
});

app.post('/api/files/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado ou formato incorreto." });
    }

    const { uploader, setor } = req.body; // user uploading
    const db = readDB();
    
    const newFile: FileRecord = {
      id: 'file_' + Date.now(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype || (req.file.originalname.endsWith('.pptx') ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/octet-stream'),
      sizeBytes: req.file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploader || 'admin',
      views: 0,
      setor: (setor && setor.trim()) ? setor.trim() : 'Geral'
    };

    db.files.unshift(newFile); // newest first
    writeDB(db);

    addLog(
      uploader || 'admin',
      'admin',
      'upload',
      `Arquivo enviado para setor ${newFile.setor}: ${newFile.originalName} (${(newFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`
    );

    res.json(newFile);
  });
});

app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;
  const { deletedBy } = req.query;

  const db = readDB();
  const fileIndex = db.files.findIndex(f => f.id === id);

  if (fileIndex === -1) {
    return res.status(404).json({ error: "Arquivo não encontrado no banco de dados." });
  }

  const fileToDel = db.files[fileIndex];
  const filePath = path.join(filesDir, fileToDel.filename);

  // Remove from filesystem
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (fsErr) {
      console.error("Erro ao apagar arquivo físico:", fsErr);
    }
  }

  // Remove from Database list
  db.files.splice(fileIndex, 1);
  writeDB(db);

  addLog(
    String(deletedBy || 'admin'),
    'admin',
    'delete',
    `Arquivo removido: ${fileToDel.originalName}`
  );

  res.json({ success: true });
});

// Logs API
app.get('/api/logs', (req, res) => {
  const db = readDB();
  res.json(db.logs);
});

// Track file visualizer click / accesses
app.post('/api/logs/view', (req, res) => {
  const { fileId, username, role } = req.body;
  if (!fileId || !username) {
    return res.status(400).json({ error: "Dados para log de visualização incompletos." });
  }

  const db = readDB();
  const fileIndex = db.files.findIndex(f => f.id === fileId);
  
  if (fileIndex !== -1) {
    db.files[fileIndex].views += 1;
    const fileObj = db.files[fileIndex];
    writeDB(db);

    addLog(
      username,
      role || 'viewer',
      'view',
      `Visualizou arquivo: ${fileObj.originalName} (Tipo: ${fileObj.mimetype})`
    );
    
    return res.json({ success: true, views: db.files[fileIndex].views });
  }

  return res.status(404).json({ error: "Arquivo não encontrado." });
});

// Metrics API
app.get('/api/dashboard/stats', (req, res) => {
  const db = readDB();
  
  const totalFiles = db.files.length;
  const totalSizeBytes = db.files.reduce((sum, f) => sum + f.sizeBytes, 0);
  const totalViews = db.files.reduce((sum, f) => sum + f.views, 0);
  const totalLogins = db.logs.filter(l => l.action === 'login').length;

  res.json({
    totalFiles,
    totalSizeBytes,
    totalViews,
    totalLogins
  });
});

// Vite Middleware for Hot App serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Porta 3000 inicializada no container. Servidor rodando.`);
  });
}

startServer();
