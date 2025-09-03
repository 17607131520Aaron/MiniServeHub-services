module.exports = {
  apps: [
    {
      name: `allinone-backend-serve-${process.env.NODE_ENV || 'production'}`, // 动态设置服务名称
      script: 'dist/main.js',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production', // 动态设置环境变量
        SERVICE_PORT: process.env.SERVICE_PORT || 9000, // 确保这里使用了正确的端口
      },
      log_file: '/app/logs/app.log',
      out_file: '/app/logs/out.log',
      error_file: '/app/logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
    },
  ],
};
