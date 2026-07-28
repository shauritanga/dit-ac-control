module.exports = {
  apps: [
    {
      name: 'dit-ac-api',
      script: 'dist/src/main.js',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
