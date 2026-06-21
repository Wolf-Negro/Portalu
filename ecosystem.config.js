module.exports = {
  apps: [
    {
      name: "portalu-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/home/ubuntu/portalu",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
    },
    {
      name: "portalu-bot",
      script: "node_modules/.bin/tsx",
      args: "scripts/start-bot.ts",
      cwd: "/home/ubuntu/portalu",
      env: { NODE_ENV: "production" },
      max_memory_restart: "300M",
    },
  ],
};
