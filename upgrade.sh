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
checkRepoIsReady
npm run build
cd ../
cp -nf ./electrodb/playground/bundle.js ./electro-demo/src/display/electrodb.js
cd electro-demo
git add src/display/electrodb.js
git commit -m "new electrodb build"
git push