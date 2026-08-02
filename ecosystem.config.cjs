/**
 * @file PM2 进程配置 —— 阿里云轻量应用服务器部署用
 * @description 声明「解忧杂货店」Web 服务的进程名、入口、运行环境。
 *              代码内部已 `import "dotenv/config"`，会自动读取项目根目录 .env。
 *              用法：pm2 start ecosystem.config.cjs
 *              环境变量值请在同目录 .env 文件填写，不要硬编码进本文件。
 */
module.exports = {
  apps: [
    {
      name: "jieyou-grocery-store", // 进程名（pm2 list / logs 用）
      script: "dist/boot.js", // 入口：esbuild 打包后的后端 bundle
      cwd: __dirname, // 工作目录，确保 dotenv 能读到根目录 .env
      instances: 1, // 单实例（Hono 自托管静态资源，无需集群）
      autorestart: true, // 崩溃自动重启
      max_restarts: 10, // 最大重启次数
      env: {
        NODE_ENV: "production", // 触发 boot.ts 里的生产启动分支（serve 静态文件）
      },
    },
  ],
};