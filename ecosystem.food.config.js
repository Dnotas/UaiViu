/**
 * PM2 config do módulo UaiViu Food
 * Uso: pm2 start ecosystem.food.config.js
 */
module.exports = {
  apps: [
    {
      name: "uaiviu-food-backend",
      script: "./dist/server.js",
      cwd: "./backend-food",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3003,
      },
      error_file: "./logs/food-backend-error.log",
      out_file: "./logs/food-backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "uaiviu-food-frontend",
      script: "./frontend-food/node_modules/.bin/serve",
      args: "-s build -l 3002",
      cwd: "./frontend-food",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        REACT_APP_BACKEND_FOOD_URL: "https://seudominio.com.br",
        REACT_APP_PUBLIC_MENU_URL: "https://seudominio.com.br/cardapio",
      },
      error_file: "./logs/food-frontend-error.log",
      out_file: "./logs/food-frontend-out.log",
    },
  ],
};
