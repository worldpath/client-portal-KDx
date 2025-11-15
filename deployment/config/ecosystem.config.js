module.exports = {
  apps: [
    {
      name: 'kdx-portal',
      script: 'server/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx',
      cwd: '/var/www/kdx-portal',
      instances: 2, // Run 2 instances for load balancing
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Logging
      error_file: '/var/log/kdx-portal/pm2-error.log',
      out_file: '/var/log/kdx-portal/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory management
      max_memory_restart: '500M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Watch and reload (disabled in production)
      watch: false,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
    }
  ],
  
  // Deployment configuration (optional - for PM2 deploy)
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_DROPLET_IP',
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPOSITORY_URL',
      path: '/var/www/kdx-portal',
      'post-deploy': 'pnpm install && cd client && pnpm build && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
