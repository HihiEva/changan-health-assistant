#!/bin/zsh
cd "$(dirname "$0")" || exit 1
CHANGAN_APP="../mac-live/mac-arm64/常安开发体验.app"
if [[ ! -d "$CHANGAN_APP" ]]; then
  echo "请先在此目录运行 npm run desktop:build:mac:live"
  read "?按回车退出"
  exit 1
fi
if curl -fsS --max-time 2 http://127.0.0.1:5178/ >/dev/null 2>&1; then
  open "$CHANGAN_APP"
  exit 0
fi
npm run desktop:dev:web &
CHANGAN_DEV_PID=$!
trap 'kill "$CHANGAN_DEV_PID" 2>/dev/null' EXIT
for CHANGAN_ATTEMPT in {1..40}; do
  if curl -fsS --max-time 1 http://127.0.0.1:5178/ >/dev/null 2>&1; then
    open "$CHANGAN_APP"
    break
  fi
  sleep 0.25
done
echo "Mac 实时开发版已启动；请保留此终端窗口，关闭会停止实时预览。"
wait "$CHANGAN_DEV_PID"
