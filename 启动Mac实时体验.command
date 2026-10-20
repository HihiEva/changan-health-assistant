#!/bin/zsh
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
CHANGAN_SOURCE="../mac-live/mac-arm64/常安开发体验.app"
CHANGAN_APP="$HOME/Applications/常安开发体验.app"
CHANGAN_LOG="${TMPDIR:-/tmp/}changan-live-preview.log"
if [[ ! -d "$CHANGAN_SOURCE" ]]; then
  echo "找不到 Mac 应用，请重新生成 Mac 实时体验版。"
  read "?按回车退出"
  exit 1
fi
# Keep the runnable bundle outside the synced Documents folder. Future rebuilds
# are copied only when their packaged source changes.
if ! cmp -s "$CHANGAN_SOURCE/Contents/Resources/app.asar" "$CHANGAN_APP/Contents/Resources/app.asar" || ! codesign --verify --deep --strict "$CHANGAN_APP" >/dev/null 2>&1; then
  mkdir -p "$HOME/Applications"
  if ! ditto --noextattr --norsrc "$CHANGAN_SOURCE" "$CHANGAN_APP" || ! codesign --force --deep --sign - "$CHANGAN_APP" || ! codesign --verify --deep --strict "$CHANGAN_APP"; then
    echo "本机应用安装失败，请把上面的错误发给我。"
    read "?按回车退出"
    exit 1
  fi
fi
if ! curl -fsS --max-time 2 http://127.0.0.1:5178/ >/dev/null 2>&1; then
  if ! command -v npm >/dev/null; then
    echo "找不到 Node.js / npm，无法启动实时预览。"
    read "?按回车退出"
    exit 1
  fi
  # launchd keeps preview alive after Terminal or the calling session closes.
  launchctl remove cn.changan.live-preview >/dev/null 2>&1
  if ! launchctl submit -l cn.changan.live-preview -o "$CHANGAN_LOG" -e "$CHANGAN_LOG" -- "$(command -v node)" "$PWD/node_modules/vite/bin/vite.js" "$PWD" --host 127.0.0.1 --port 5178 --strictPort; then
    echo "无法启动本机预览服务。"
    read "?按回车退出"
    exit 1
  fi
fi
for CHANGAN_ATTEMPT in {1..80}; do
  if curl -fsS --max-time 1 http://127.0.0.1:5178/ >/dev/null 2>&1; then
    if open "$CHANGAN_APP"; then
      echo "常安已打开，可以关闭此终端窗口。"
      exit 0
    fi
    echo "macOS 未能打开应用，请把上面的报错发给我。"
    read "?按回车退出"
    exit 1
  fi
  sleep 0.25
done
echo "实时预览启动失败。日志：$CHANGAN_LOG"
tail -n 12 "$CHANGAN_LOG"
read "?按回车退出"
exit 1
