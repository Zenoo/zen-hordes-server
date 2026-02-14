declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_APPKEY: string;
      DATABASE_URL: string;
      WEBHOOK_LOGS?: string;
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
