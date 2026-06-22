#!/usr/bin/env bash
# 將 dowaterlightout 的報得過程式推到 Quote1.0 main
set -euo pipefail

SOURCE_BRANCH="cursor/baodeguo-quote1-bd62"
TARGET_REPO="https://github.com/AndyKao-commits/Quote1.0.git"

echo "=== 報得過 → Quote1.0 推送 ==="

if [ ! -d .git ]; then
  echo "請在 git 專案目錄執行"
  exit 1
fi

git fetch origin "$SOURCE_BRANCH"
git checkout "$SOURCE_BRANCH" 2>/dev/null || git checkout -b "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH"
git pull origin "$SOURCE_BRANCH"

if git remote | grep -q '^quote1$'; then
  git remote set-url quote1 "$TARGET_REPO"
else
  git remote add quote1 "$TARGET_REPO"
fi

git push quote1 "${SOURCE_BRANCH}:main"

echo ""
echo "完成！請到 Vercel 對 Quote1.0 專案按 Redeploy。"
