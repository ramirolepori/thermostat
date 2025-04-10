module.exports = {
    apps: [{
      name: "thermostat-backend",
      script: "dist/index.js",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }]
  }
  