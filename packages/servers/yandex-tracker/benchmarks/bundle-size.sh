#!/bin/bash

# CLI Bundle Size Benchmarks
#
# Измеряет размеры сборки:
# - framework/cli (threshold: ≤200 KB)
# - yandex-tracker (мониторинг изменений)
#
# Exit codes:
# 0 - все в пределах нормы
# 1 - превышены пороги

set -e

echo "📦 Measuring bundle sizes..."
echo "============================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Пороги
MAX_CLI_BYTES=$((200 * 1024))  # 200 KB для framework/cli
MAX_YT_INCREASE_PERCENT=10     # 10% для yandex-tracker

exit_code=0

# ===== Framework CLI =====
echo "=== @mcp-framework/cli ==="

CLI_PATH="../../../packages/framework/cli/dist"

if [ ! -d "$CLI_PATH" ]; then
  echo -e "${RED}❌ FAIL: $CLI_PATH not found. Run: npm run build${NC}"
  exit 1
fi

CLI_BYTES=$(du -sb "$CLI_PATH" | cut -f1)
CLI_KB=$((CLI_BYTES / 1024))

echo "Bundle size: ${CLI_KB} KB"

if [ $CLI_BYTES -gt $MAX_CLI_BYTES ]; then
  echo -e "${RED}❌ FAIL: Bundle size exceeds 200KB (${CLI_KB} KB)${NC}"
  exit_code=1
else
  echo -e "${GREEN}✅ OK: Bundle size within limit (threshold: 200 KB)${NC}"
fi

echo ""

# ===== Yandex Tracker =====
echo "=== @mcp-server/yandex-tracker ==="

YT_PATH="dist"

if [ ! -d "$YT_PATH" ]; then
  echo -e "${RED}❌ FAIL: $YT_PATH not found. Run: npm run build${NC}"
  exit 1
fi

YT_BYTES=$(du -sb "$YT_PATH" | cut -f1)
YT_KB=$((YT_BYTES / 1024))

echo "Bundle size: ${YT_KB} KB"

# Для yandex-tracker мы просто показываем размер
# В будущем можно сравнивать с baseline (например, из git tag)
echo -e "${GREEN}✅ OK: Bundle measured${NC}"

echo ""
echo "============================="
echo "📊 Summary:"
echo "  framework/cli:    ${CLI_KB} KB / 200 KB"
echo "  yandex-tracker:   ${YT_KB} KB"

if [ $exit_code -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ All bundle size checks passed!${NC}"
else
  echo ""
  echo -e "${RED}❌ Some bundle size checks failed!${NC}"
fi

exit $exit_code
