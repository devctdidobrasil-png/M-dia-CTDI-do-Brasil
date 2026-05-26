export interface UserProfile {
  username: string;
  role: 'admin' | 'viewer' | 'uploader';
  createdAt: string;
  setor?: string;
  password?: string;
}

export interface FileRecord {
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

export interface AccessLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  details: string;
}

export interface AuthSession {
  username: string;
  role: 'admin' | 'viewer' | 'uploader';
  token: string;
  setor?: string;
}

export interface DashboardStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalViews: number;
  totalLogins: number;
}
