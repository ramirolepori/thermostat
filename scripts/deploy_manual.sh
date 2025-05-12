#!/bin/bash
# Script simple de despliegue manual para termostato
# Ejecutar en la Raspberry Pi: bash ./deploy_manual.sh

while true; do
  echo "\n¿Qué deseas hacer?"
  echo "1. Desplegar backend y frontend"
  echo "2. Desplegar solo backend"
  echo "3. Desplegar solo frontend"
  echo "4. Salir"
  read -p "Selecciona una opción [1-4]: " opcion

  case $opcion in
    1)
    # Actualiza el repositorio local con los cambios del remoto
      cd ../
      git pull || exit 1
      # Backend
      cd backend || exit 1
      sudo npm ci --no-optional || exit 1
      sudo pm2 stop thermostat-backend || true
      sudo rm -rf dist
      npm run build || exit 1
      sudo pm2 startOrRestart ecosystem.config.js || exit 1
      sudo pm2 save
      cd ..
      # Frontend
      cd frontend || exit 1
      npm ci || exit 1
      npm run build || exit 1
      sudo rm -rf /var/www/thermostat-frontend
      sudo cp -r dist /var/www/thermostat-frontend
      sudo systemctl restart nginx
      cd ..
      echo "Despliegue de backend y frontend completado."
      ;;
    2)
      # Actualiza el repositorio local con los cambios del remoto
      cd ../
      git pull || exit 1
      cd backend || exit 1
      sudo npm ci --no-optional || exit 1
      sudo pm2 stop thermostat-backend || true
      sudo rm -rf dist
      npm run build || exit 1
      sudo pm2 startOrRestart ecosystem.config.js || exit 1
      sudo pm2 save
      cd ..
      echo "Despliegue de backend completado."
      ;;
    3)
      # Actualiza el repositorio local con los cambios del remoto
      cd ../
      git pull || exit 1
      cd frontend || exit 1
      npm ci || exit 1
      npm run build || exit 1
      sudo rm -rf /var/www/thermostat-frontend
      sudo cp -r dist /var/www/thermostat-frontend
      sudo systemctl restart nginx
      cd ..
      echo "Despliegue de frontend completado."
      ;;
    4)
      echo "Saliendo..."
      exit 0
      ;;
    *)
      echo "Opción inválida. Intenta de nuevo."
      ;;
  esac
done