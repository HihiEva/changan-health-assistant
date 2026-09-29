#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '需要先安装 Node.js 22 或更新版本。安装后再次打开本文件。'
  read -r '?按回车退出…'
  exit 1
fi
if [ ! -d node_modules ]; then
  npm ci || exit 1
fi
npm run build || exit 1
echo '启动后请点击下面的 Local 地址。关闭此终端窗口即停止预览。'
npm run preview -- --port 4173
