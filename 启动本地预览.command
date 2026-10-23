#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 scripts/serve.py
else
  print '未找到 Python 3。请先安装 Python 3，然后再次双击此文件。'
  read -k 1
fi
