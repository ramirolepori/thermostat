#!/bin/bash
# restart_backend.sh - Script para actualizar y reiniciar solo el backend
# Útil para aplicar cambios rápidos sin desplegar todo el sistema
# Ejecutar en la Raspberry Pi: bash ./restart_backend.sh

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

# 1. Verificar si el directorio del proyecto existe
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "El directorio del proyecto $PROJECT_DIR no existe"
    exit 1
fi

# 2. Entrar al directorio del proyecto y actualizarlo
cd "$PROJECT_DIR"
check_error "Error al entrar en el directorio del proyecto"

print_message "Actualizando desde el repositorio Git..."
git pull
check_error "Error al actualizar desde Git"

# 3. Instalar dependencias del backend
print_message "Instalando dependencias del backend..."
cd "$PROJECT_DIR/backend"
check_error "Error al acceder al directorio backend"

npm install
check_error "Error al instalar dependencias del backend"

# 4. Compilar el backend
print_message "Compilando el backend..."
npm run build
check_error "Error al compilar el backend"

# 5. Configurar los permisos para GPIO y 1-Wire (en cada reinicio por seguridad)
print_message "Verificando permisos para GPIO y 1-Wire..."

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

# 6. Reiniciar el backend con PM2
print_message "Reiniciando backend con PM2..."
cd "$PROJECT_DIR/backend"

# Intenta reiniciar usando ambos nombres posibles
sudo pm2 restart thermostat-backend || sudo pm2 restart thermost || (
    print_warning "No se encontró proceso existente, iniciando nuevo proceso..."
    sudo pm2 startOrRestart ecosystem.config.js
)

check_error "Error al iniciar el backend con PM2"

# Guardar la configuración para que sobreviva a reinicios
sudo pm2 save
check_error "Error al guardar configuración de PM2"

# 7. Verificar que todo está funcionando
print_message "Verificando estado del servicio..."
if sudo pm2 status | grep -q "thermostat-backend\|thermost"; then
    print_message "El servicio de backend está activo"
else
    print_error "El servicio de backend no se está ejecutando"
fi

# Mostrar información útil al final
BACKEND_IP=$(hostname -I | awk '{print $1}')
print_message "Actualización de backend completada exitosamente!"
echo -e "${GREEN}-------------------------------------------------------------${NC}"
echo -e "Backend disponible en: ${GREEN}http://$BACKEND_IP:3001/api${NC}"
echo -e "${GREEN}-------------------------------------------------------------${NC}"
echo -e "Para ver los logs del backend: ${YELLOW}sudo pm2 logs${NC}"
echo -e "Status del backend: ${YELLOW}sudo pm2 status${NC}"
echo -e "${GREEN}-------------------------------------------------------------${NC}"