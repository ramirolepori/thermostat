#!/bin/bash

echo "🔄 Actualizando repositorio..."
git pull origin main

echo "🧱 Compilando backend..."
cd ../backend
npm install
npm run build

echo "🚀 Reiniciando backend con PM2..."
cd ../deploy
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "✅ Deploy completo."