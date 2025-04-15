#!/bin/bash
# deploy_manual.sh - Script de despliegue manual para termostato
# Usar cuando el GitHub Actions runner no funciona
# Ejecutar directo en la Raspberry Pi: bash ./deploy_manual.sh

# Color para mensajes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con formato
print_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para verificar errores
check_error() {
    if [ $? -ne 0 ]; then
        print_error "$1"
        exit 1
    fi
}

# Directorio del proyecto
PROJECT_DIR="/home/pi/thermostat-mvp"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${PROJECT_DIR}_backup_${TIMESTAMP}"

# 1. Verificar si el directorio del proyecto existe
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "El directorio del proyecto $PROJECT_DIR no existe"
    print_message "Ejecuta: git clone <tu-repositorio> $PROJECT_DIR"
    exit 1
fi

# 2. Crear respaldo antes de actualizar (opcional)
print_message "Creando respaldo del proyecto actual..."
cp -r "$PROJECT_DIR" "$BACKUP_DIR"
check_error "Error al crear respaldo"

# 3. Entrar al directorio del proyecto y actualizarlo
cd "$PROJECT_DIR"
check_error "Error al entrar en el directorio del proyecto"

print_message "Actualizando desde el repositorio Git..."
git pull
check_error "Error al actualizar desde Git"

# 4. Instalar dependencias del backend
print_message "Instalando dependencias del backend..."
cd "$PROJECT_DIR/backend"
check_error "Error al acceder al directorio backend"

npm ci
check_error "Error al instalar dependencias del backend"

# 5. Compilar el backend
print_message "Compilando el backend..."
npm run build
check_error "Error al compilar el backend"

# 6. Instalar y configurar pigpio
print_message "Configurando pigpio..."

# Instalar pigpio a nivel de sistema si no está instalado
if ! dpkg -l | grep -q pigpio; then
    print_message "Instalando pigpio..."
    sudo apt-get update
    sudo apt-get install -y pigpio
    check_error "Error al instalar pigpio"
fi

# Detener cualquier instancia existente del daemon de pigpio
sudo killall pigpiod || true

# Iniciar el daemon de pigpio con permisos adecuados
sudo pigpiod -l -m -n 200

# Esperar a que el daemon inicie completamente
sleep 2

# Comprobar que el daemon está funcionando
if pgrep pigpiod > /dev/null; then
    print_message "Daemon pigpio iniciado correctamente"
else
    print_error "El daemon pigpio no pudo iniciarse"
    exit 1
fi

# Instalar pigpio para el usuario root (usado por sudo pm2)
if ! sudo npm list -g pigpio &> /dev/null; then
    sudo npm install -g pigpio
    check_error "Error al instalar pigpio globalmente"
fi

# También instalar localmente en la aplicación
cd "$PROJECT_DIR/backend"
sudo npm install --no-save pigpio
check_error "Error al instalar pigpio localmente"

# 7. Configurar los permisos para GPIO y 1-Wire
print_message "Configurando permisos para GPIO y 1-Wire..."

# Configurar permisos para GPIO
if [ -d "/sys/class/gpio" ]; then
    sudo chown -R root:root /sys/class/gpio || true
    sudo chmod -R 777 /sys/class/gpio || true
    print_message "Permisos GPIO configurados correctamente"
else
    print_warning "Directorio GPIO no encontrado - usando modo simulación"
fi

# Configurar permisos para 1-Wire (sensores de temperatura)
if [ -d "/sys/bus/w1/devices" ]; then
    sudo chown -R root:root /sys/bus/w1/devices || true
    sudo chmod -R 777 /sys/bus/w1/devices || true
    print_message "Permisos 1-Wire configurados correctamente"
else
    print_warning "Directorio 1-Wire no encontrado - usando modo simulación"
fi

# 8. Restablecer la dependencia de rpi-gpio (según las modificaciones previas)
print_message "Instalando la dependencia rpi-gpio..."
cd "$PROJECT_DIR/backend"
npm install --save rpi-gpio
check_error "Error al instalar rpi-gpio"

# 9. Reiniciar el backend con PM2
print_message "Reiniciando backend con PM2..."
cd "$PROJECT_DIR/backend"

# Detener la aplicación anterior si está en ejecución
sudo pm2 stop thermostat-backend || true
sudo pm2 stop thermost || true  # Por si usa el nombre abreviado

# Iniciar o reiniciar con la configuración actualizada
sudo pm2 startOrRestart ecosystem.config.js
check_error "Error al iniciar el backend con PM2"

# Guardar la configuración para que sobreviva a reinicios
sudo pm2 save
check_error "Error al guardar configuración de PM2"

# 10. Instalar dependencias del frontend
print_message "Instalando dependencias del frontend..."
cd "$PROJECT_DIR/frontend"
check_error "Error al acceder al directorio frontend"

npm ci
check_error "Error al instalar dependencias del frontend"

# 11. Compilar el frontend
print_message "Compilando el frontend..."
npm run build
check_error "Error al compilar el frontend"

# 12. Desplegar el frontend a la carpeta de Nginx
print_message "Desplegando frontend en Nginx..."
sudo rm -rf /var/www/thermostat-frontend
sudo cp -r "$PROJECT_DIR/frontend/dist" /var/www/thermostat-frontend
check_error "Error al copiar archivos del frontend"

# Reiniciar Nginx
sudo systemctl restart nginx
check_error "Error al reiniciar Nginx"

# 13. Verificar que todo está funcionando
print_message "Verificando estado del servicio..."
if sudo pm2 status | grep -q "thermostat-backend\|thermost"; then
    print_message "El servicio de backend está activo"
else
    print_error "El servicio de backend no se está ejecutando"
fi

if curl -s http://localhost:3001/api/health | grep -q "status"; then
    print_message "El API del backend responde correctamente"
else
    print_warning "El API del backend no responde correctamente"
fi

# 14. Mostrar información útil al final
BACKEND_IP=$(hostname -I | awk '{print $1}')
print_message "Despliegue completado exitosamente!"
echo -e "${GREEN}-------------------------------------------------------------${NC}"
echo -e "Backend disponible en: ${GREEN}http://$BACKEND_IP:3001/api${NC}"
echo -e "Frontend disponible en: ${GREEN}http://$BACKEND_IP${NC}"
echo -e "${GREEN}-------------------------------------------------------------${NC}"
echo -e "Para ver los logs del backend: ${YELLOW}sudo pm2 logs thermostat-backend${NC}"
echo -e "Para reiniciar solo el backend: ${YELLOW}sudo pm2 restart thermostat-backend${NC}"
echo -e "${GREEN}-------------------------------------------------------------${NC}"