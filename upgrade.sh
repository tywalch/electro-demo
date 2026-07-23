#!/usr/bin/env bash

set -e

checkRepoIsReady() {\
  git branch --show-current | grep -q '^master$'
  if [ $? -eq 0 ]; then
    echo "Repository is on the master branch"
    exit 1
  fi

  git status --porcelain | grep -q '^'
  if [ $? -eq 0 ]; then
    echo "Repository has uncommitted changes"
    exit 1
  fi

  git diff --exit-code
  if [ $? -eq 0 ]; then
    echo "Repository has unpushed changes"
    exit 1
  fi

  git diff --exit-code --cached
  if [ $? -eq 0 ]; then
    echo "Repository has unstaged changes"
    exit 1
  fi

  git diff --exit-code --staged
  if [ $? -eq 0 ]; then
    echo "Repository is not ready"
    exit 1
  fi

  git diff --exit-code --unmerged
  if [ $? -eq 0 ]; then
    echo "Repository is not ready"
    exit 1
  fi

  echo "Repository is ready"
}

cd ../electrodb
# checkRepoIsReady
npm run build
cd ../
cp -f ./electrodb/playground/bundle.js ./electro-demo/public/vendor/electrodb-playground.js
cp -f ./electrodb/index.d.ts ./electro-demo/src/assets/electrodb.d.ts
cd electro-demo
git add public/vendor/electrodb-playground.js src/assets/electrodb.d.ts
git commit -m "new electrodb build"
git push