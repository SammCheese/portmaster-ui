#!/bin/sh
# source dir can not contains () or other special chars
cd app-electron
sudo sh ./pack-container.sh npm run pack
cd ..
sudo sh ./pack

echo 'Output will be in:

./dist/all/ui/modules/assets_v0-2-2.zip
./dist/all/ui/modules/portmaster_v0-1-14.zip
./dist/linux_amd64/app/portmaster-app_v0-2-2.zip
./dist/linux_amd64/notifier/portmaster-notifier_v0-2-3'