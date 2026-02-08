export interface ServerStatus {
  online: boolean;
  uptime: number;
  playersOnline: number;
  version: string;
  timestamp: string;
}

export interface ServerMetrics {
  database: {
    items: number;
    characters: number;
    online: number;
  };
  server: {
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
  timestamp: string;
}
