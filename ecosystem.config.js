module.exports = {
  apps: [{
    name: 'imgpressor',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      MAX_FILE_SIZE: 104857600,
      UPLOAD_LIMIT: 10,
      QUALITY_DEFAULT: 80,
      RESIZE_FACTOR: 1.5
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'public/optimized'],
    env_restart: 'NODE_ENV'
  }]
};
