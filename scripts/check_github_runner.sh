#!/bin/bash
# check_github_runner.sh - Script para diagnosticar problemas con GitHub Actions runner
# Ejecutar en la Raspberry Pi: bash ./check_github_runner.sh

# Color para mensajes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con formato
print_section() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

print_message() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica que este script se ejecute como el usuario que ejecuta el runner
check_user() {
    print_section "VERIFICANDO USUARIO"
    CURRENT_USER=$(whoami)
    echo "Usuario actual: $CURRENT_USER"
    
    # Verificar el directorio del runner
    RUNNER_DIR="$HOME/actions-runner"
    if [ -d "$RUNNER_DIR" ]; then
        print_message "Directorio de runner encontrado en $RUNNER_DIR"
        ls -la "$RUNNER_DIR"
    else
        print_error "No se encontró directorio de runner en $RUNNER_DIR"
        echo "Buscar directorio del runner:"
        find $HOME -name ".runner" -type f 2>/dev/null
    fi
}

# Verifica la conectividad con GitHub
check_github_connectivity() {
    print_section "VERIFICANDO CONECTIVIDAD CON GITHUB"
    
    echo "Probando conexión a github.com..."
    if ping -c 3 github.com &>/dev/null; then
        print_message "Conectividad a github.com: OK"
    else
        print_error "No se puede hacer ping a github.com"
    fi
    
    echo "Probando conexión a api.github.com..."
    if curl -s https://api.github.com >/dev/null; then
        print_message "Conectividad a api.github.com: OK"
    else
        print_error "No se puede conectar a api.github.com"
    fi
}

# Verifica los permisos del sistema
check_permissions() {
    print_section "VERIFICANDO PERMISOS"
    
    REPO_DIR="/home/ramirolepori/thermostat"
    if [ -d "$REPO_DIR" ]; then
        echo "Permisos del directorio del repositorio:"
        ls -la "$REPO_DIR"
        
        if [ -d "$REPO_DIR/.git" ]; then
            print_message "Directorio .git encontrado"
            echo "Permisos de .git:"
            ls -la "$REPO_DIR/.git"
        else
            print_error "No se encontró directorio .git en $REPO_DIR"
        fi
    else
        print_warning "No se encontró directorio del repositorio en $REPO_DIR"
        echo "El repositorio podría estar en otra ubicación"
    fi
}

# Verifica la configuración de git
check_git_config() {
    print_section "VERIFICANDO CONFIGURACIÓN DE GIT"
    
    if which git >/dev/null; then
        GIT_VERSION=$(git --version)
        print_message "Git instalado: $GIT_VERSION"
        
        echo "Configuración global de git:"
        git config --global --list
        
        echo -e "\nProtocolos habilitados:"
        git config --global --get-regexp url
        
        echo -e "\nCredenciales almacenadas:"
        if [ -f ~/.git-credentials ]; then
            echo "Archivo .git-credentials existe"
            # No mostrar el contenido para no exponer información sensible
        else
            echo "No hay archivo .git-credentials"
        fi
        
        # Verificar si git credential helper está configurado
        CREDENTIAL_HELPER=$(git config --global credential.helper)
        if [ -n "$CREDENTIAL_HELPER" ]; then
            print_message "Git credential helper configurado: $CREDENTIAL_HELPER"
        else
            print_warning "Git credential helper no configurado"
        fi
    else
        print_error "Git no está instalado"
    fi
}

# Verifica el estado del servicio de GitHub Actions runner
check_runner_service() {
    print_section "VERIFICANDO SERVICIO DE RUNNER"
    
    if systemctl list-units --all | grep -q actions.runner; then
        print_message "Servicio del runner encontrado"
        systemctl status actions.runner.* --no-pager
    else
        print_warning "No se encontró servicio del runner con systemd"
        
        echo "Buscando procesos de runner..."
        ps aux | grep actions-runner | grep -v grep
        
        echo -e "\nVerificando logs del runner..."
        RUNNER_LOGS="$HOME/actions-runner/_diag"
        if [ -d "$RUNNER_LOGS" ]; then
            ls -la "$RUNNER_LOGS"
            echo -e "\nÚltimas 10 líneas del log del runner:"
            find "$RUNNER_LOGS" -name "*.log" -type f -exec ls -la {} \; | head -1 | xargs tail -n 10
        else
            print_warning "Directorio de logs del runner no encontrado"
        fi
    fi
}

# Verifica si hay problemas comunes con el checkout
check_checkout_issues() {
    print_section "VERIFICANDO PROBLEMAS COMUNES DE CHECKOUT"
    
    # Verificar espacio en disco
    echo "Espacio en disco:"
    df -h /
    
    # Verificar memoria disponible
    echo -e "\nMemoria disponible:"
    free -h
    
    # Verificar permisos del directorio de trabajo
    RUNNER_WORK="$HOME/actions-runner/_work"
    if [ -d "$RUNNER_WORK" ]; then
        echo -e "\nPermisos del directorio de trabajo:"
        ls -la "$RUNNER_WORK"
    else
        print_warning "Directorio de trabajo del runner no encontrado en $RUNNER_WORK"
    fi
    
    # Verificar si hay archivos bloqueados por git
    if [ -d "$REPO_DIR" ]; then
        cd "$REPO_DIR"
        echo -e "\nVerificando archivos bloqueados por git:"
        find .git/objects -type f -name "*.lock" 2>/dev/null
    fi
}

# Función principal
main() {
    echo "Iniciando diagnóstico de GitHub Actions runner..."
    date
    
    check_user
    check_github_connectivity
    check_permissions
    check_git_config
    check_runner_service
    check_checkout_issues
    
    print_section "SUGERENCIAS"
    echo "Si el problema persiste, prueba las siguientes soluciones:"
    echo "1. Reinicia el servicio del runner: sudo systemctl restart actions.runner.*"
    echo "2. Verifica que el token del runner sea válido y no haya expirado"
    echo "3. Asegúrate que el usuario tiene permisos para clonar el repositorio"
    echo "4. Configura credential.helper en git: git config --global credential.helper store"
    echo "5. Si usas un token PAT, asegúrate que tiene los permisos correctos (repo, workflow)"
    echo "6. Reinstala el runner siguiendo las instrucciones de GitHub"
}

# Ejecuta el diagnóstico
main