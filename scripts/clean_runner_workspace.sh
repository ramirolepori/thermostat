#!/bin/bash
# clean_runner_workspace.sh - Script para limpiar directorios del runner con problemas de permisos
# Ejecutar como usuario root o con sudo: sudo bash clean_runner_workspace.sh

# Colores para mensajes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si se está ejecutando como root
if [ "$EUID" -ne 0 ]; then
  print_error "Este script debe ejecutarse como root o con sudo"
  exit 1
fi

# Directorio del runner
RUNNER_WORK_DIR="/home/ramirolepori/actions-runner/_work"

print_warning "Este script eliminará completamente los directorios de trabajo del runner."
print_warning "Esto solucionará los problemas de permisos pero eliminará cualquier caché o estado."
echo ""
read -p "¿Estás seguro que deseas continuar? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_message "Operación cancelada"
    exit 0
fi

# Detener el servicio del runner
print_message "Deteniendo el servicio del runner..."
if systemctl is-active --quiet actions.runner.*; then
    systemctl stop actions.runner.*
    print_message "Servicio del runner detenido"
else
    print_warning "No se encontró servicio del runner activo en systemd"
    
    # Intentar matar procesos del runner manualmente
    RUNNER_PIDS=$(pgrep -f actions-runner)
    if [ -n "$RUNNER_PIDS" ]; then
        echo "Deteniendo procesos del runner (PIDs: $RUNNER_PIDS)..."
        kill -9 $RUNNER_PIDS
        print_message "Procesos del runner detenidos"
    else
        print_message "No se encontraron procesos del runner en ejecución"
    fi
fi

# Mover a un directorio de backup por seguridad antes de eliminar
BACKUP_DIR="/home/ramirolepori/actions-runner-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
print_message "Creando backup en $BACKUP_DIR"

if [ -d "$RUNNER_WORK_DIR" ]; then
    # Mover el directorio existente al backup en vez de copiarlo (más rápido)
    mv "$RUNNER_WORK_DIR" "$BACKUP_DIR/"
    print_message "Directorio de trabajo movido a backup"
    
    # Crear un directorio de trabajo nuevo con permisos adecuados
    mkdir -p "$RUNNER_WORK_DIR"
    chown -R ramirolepori:ramirolepori "$RUNNER_WORK_DIR"
    chmod -R 755 "$RUNNER_WORK_DIR"
    print_message "Nuevo directorio de trabajo creado con permisos correctos"
else
    print_warning "No se encontró el directorio de trabajo $RUNNER_WORK_DIR"
fi

# Limpiar otros directorios temporales que podrían tener problemas de permisos
TEMP_DIRS=(
    "/home/ramirolepori/actions-runner/_work/_temp"
    "/home/ramirolepori/actions-runner/_work/_tool"
    "/home/ramirolepori/actions-runner/_work/_actions"
)

for dir in "${TEMP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        mv "$dir" "$BACKUP_DIR/" 2>/dev/null || true
        mkdir -p "$dir"
        chown -R ramirolepori:ramirolepori "$dir"
        chmod -R 755 "$dir"
        print_message "Directorio $dir recreado con permisos correctos"
    fi
done

# Reiniciar el servicio del runner
print_message "Reiniciando el servicio del runner..."
if systemctl list-units --all | grep -q actions.runner; then
    systemctl start actions.runner.*
    print_message "Servicio del runner reiniciado"
    systemctl status actions.runner.* --no-pager
else
    print_warning "No se pudo reiniciar el servicio del runner automáticamente"
    print_message "Reinicia el runner manualmente con: cd ~/actions-runner && ./run.sh &"
fi

print_message "Limpieza completada. El próximo workflow debería ejecutarse correctamente."
echo ""
print_warning "Nota: Si sigues teniendo problemas, considera reinstalar el runner por completo."
echo "Instrucciones: https://docs.github.com/es/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners"