import { buildApp } from './app';
import { loadEnvConfig } from './config/env.config';

async function main() {
  const config = loadEnvConfig();
  const app = await buildApp({ logger: { level: config.LOG_LEVEL } });

  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`🚀 GlossaHub 固件服务底座已启动，监听地址: ${address}`);
  } catch (err) {
    app.log.fatal(err, '服务启动失败，进程退出');
    process.exit(1);
  }

  // 优雅停机信号捕获 (Graceful Shutdown)
  const shutdown = async (signal: string) => {
    app.log.info(`收到 ${signal} 信号，正在执行优雅停机 (Graceful Shutdown)...`);
    try {
      await app.close();
      app.log.info('Server shutdown gracefully. 进程安全退出。');
      process.exit(0);
    } catch (err) {
      app.log.error(err, '优雅停机过程中发生错误，强制退出');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
