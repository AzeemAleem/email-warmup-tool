module.exports = {
  apps: [
    {
      name: "email-warmup-worker",
      script: "./node_modules/ts-node/dist/bin.js",
      args: "--project tsconfig.worker.json src/worker/index.ts",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 5000,
      max_restarts: 50,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
