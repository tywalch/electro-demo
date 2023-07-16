#!/usr/bin/env bash
cd ../electrodb
npm run build
cd ../
cp -nf ./electrodb/playground/bundle.js ./electro-demo/src/display/electrodb.js
cd electro-demo
git add src/display/electrodb.js
#git commit -m "new electrodb build"
#git push