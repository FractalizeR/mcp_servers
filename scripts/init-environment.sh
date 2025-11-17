#!/bin/bash
set -euo pipefail

# ============================================================================
# Claude Code Web Environment Initialization Script
# ============================================================================
# Автоматически устанавливает инструменты и зависимости для работы ИИ агента
# с TypeScript monorepo проектом.
#
# Выполняется автоматически при старте сессии в Claude Code on the Web
# через SessionStart hook (.claude/settings.json).
# ============================================================================

# Цвета для логирования
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Логирование
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# ============================================================================
# 1. Проверка окружения
# ============================================================================

# Работать ТОЛЬКО в удалённом окружении (Claude Code on the Web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    log_info "Скрипт запущен локально. Пропускаем инициализацию."
    exit 0
fi

log_info "🚀 Инициализация окружения для Claude Code on the Web..."

# ============================================================================
# 2. Установка системных утилит
# ============================================================================

log_info "📦 Проверка системных утилит..."

# Список необходимых пакетов
REQUIRED_TOOLS=(
    "apt-utils"     # Утилиты APT (устраняет предупреждения debconf)
    "tree"          # Визуализация структуры директорий
    "shellcheck"    # Линтер bash скриптов
    "gh"            # GitHub CLI
    "bat"           # cat с syntax highlighting
    "fd-find"       # Быстрый поиск файлов
    "git-delta"     # Улучшенный git diff
)

# Проверка какие пакеты нужно установить
MISSING_TOOLS=()
for tool in "${REQUIRED_TOOLS[@]}"; do
    # apt-utils не предоставляет команду, проверяем через dpkg
    if [ "$tool" = "apt-utils" ]; then
        if ! dpkg -l | grep -q "^ii  apt-utils"; then
            MISSING_TOOLS+=("$tool")
        fi
        continue
    fi

    # Некоторые пакеты в Debian/Ubuntu имеют команды с другими именами
    CMD_NAME="$tool"
    if [ "$tool" = "fd-find" ]; then
        CMD_NAME="fdfind"
    elif [ "$tool" = "bat" ]; then
        CMD_NAME="batcat"
    elif [ "$tool" = "git-delta" ]; then
        CMD_NAME="delta"
    fi

    if ! command -v "$CMD_NAME" &> /dev/null; then
        MISSING_TOOLS+=("$tool")
    fi
done

# Установка недостающих пакетов
if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    log_info "Установка: ${MISSING_TOOLS[*]}"

    # Создаём временную директорию с правильными правами для apt
    # Это необходимо из-за нестандартных прав на /tmp в контейнере
    APT_TMP_DIR=$(mktemp -d)
    chmod 1777 "$APT_TMP_DIR"  # Устанавливаем sticky bit как у стандартной /tmp

    # Обновление списка пакетов (тихо) с использованием своей TMPDIR
    TMPDIR="$APT_TMP_DIR" apt-get update -qq || {
        log_error "Не удалось обновить список пакетов"
        rm -rf "$APT_TMP_DIR"
        exit 1
    }

    # Установка apt-utils в первую очередь (чтобы избежать предупреждений debconf)
    APT_UTILS_IN_LIST=false
    for tool in "${MISSING_TOOLS[@]}"; do
        if [ "$tool" = "apt-utils" ]; then
            APT_UTILS_IN_LIST=true
            break
        fi
    done

    if [ "$APT_UTILS_IN_LIST" = true ]; then
        log_info "Установка apt-utils (предотвращение предупреждений debconf)..."
        TMPDIR="$APT_TMP_DIR" DEBIAN_FRONTEND=noninteractive apt-get install -y -qq apt-utils || {
            log_error "Не удалось установить apt-utils"
            rm -rf "$APT_TMP_DIR"
            exit 1
        }
        # Удаляем apt-utils из списка для установки
        REMAINING_TOOLS=()
        for tool in "${MISSING_TOOLS[@]}"; do
            if [ "$tool" != "apt-utils" ]; then
                REMAINING_TOOLS+=("$tool")
            fi
        done
        MISSING_TOOLS=("${REMAINING_TOOLS[@]}")
    fi

    # Установка остальных пакетов (если есть)
    if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
        TMPDIR="$APT_TMP_DIR" DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${MISSING_TOOLS[@]}" || {
            log_error "Не удалось установить пакеты: ${MISSING_TOOLS[*]}"
            rm -rf "$APT_TMP_DIR"
            exit 1
        }
    fi

    # Очистка временной директории
    rm -rf "$APT_TMP_DIR"

    log_success "Все необходимые пакеты установлены"
else
    log_success "Все системные утилиты уже установлены"
fi

# ============================================================================
# 3. Настройка git для использования delta
# ============================================================================

if command -v delta &> /dev/null; then
    log_info "⚙️  Настройка git для использования delta..."

    git config --global core.pager delta 2>/dev/null || true
    git config --global interactive.diffFilter "delta --color-only" 2>/dev/null || true
    git config --global delta.navigate true 2>/dev/null || true
    git config --global delta.light false 2>/dev/null || true
    git config --global delta.line-numbers true 2>/dev/null || true

    log_success "Git настроен для использования delta"
fi

# ============================================================================
# 4. Установка npm зависимостей
# ============================================================================

log_info "📚 Проверка npm зависимостей..."

# Проверка наличия node_modules в корне monorepo
if [ ! -d "node_modules" ]; then
    log_info "Установка npm зависимостей для всех workspaces..."

    npm install || {
        log_error "Не удалось установить npm зависимости"
        exit 1
    }

    log_success "NPM зависимости установлены"
else
    log_success "NPM зависимости уже установлены"
fi

# ============================================================================
# 5. Проверка критических файлов
# ============================================================================

log_info "🔍 Проверка структуры проекта..."

CRITICAL_DIRS=(
    "packages/infrastructure"
    "packages/core"
    "packages/search"
    "packages/yandex-tracker"
)

for dir in "${CRITICAL_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        log_warning "Директория $dir не найдена"
    fi
done

# ============================================================================
# 6. Финализация
# ============================================================================

log_success "✅ Окружение готово к работе!"

# Вывод версий установленных инструментов
log_info ""
log_info "📊 Установленные инструменты:"
log_info "  Node.js: $(node --version)"
log_info "  npm: $(npm --version)"
log_info "  Git: $(git --version | cut -d' ' -f3)"
log_info "  tree: $(tree --version | head -n1)"
log_info "  shellcheck: $(shellcheck --version | grep version | cut -d' ' -f2)"
log_info "  gh: $(gh --version | head -n1 | cut -d' ' -f3)"
log_info "  bat: $(batcat --version 2>/dev/null | cut -d' ' -f2 || bat --version 2>/dev/null | cut -d' ' -f2 || echo 'N/A')"
log_info "  fd: $(fdfind --version | cut -d' ' -f2)"
log_info "  delta: $(delta --version | cut -d' ' -f2)"
log_info ""

exit 0
