#!/bin/sh
# has to be posix, so bash, dash, zsh etc no fish!
sudo pacman -Syy
sudo pacman -S --needed jq npm docker  yay  base-devel libnetfilter_queue --noconfirm
sudo systemctl start docker
# but  sudo usermod -aG  docker user needs to be executed or run docker as sudo
# since $(who) does not give a nice output
#sudo usermod -aG  docker $(ls /home)
yay -S --noconfirm media-control-indicator-git
#its the appindicator3

sudo npm install -g @angular/cli@latest

mkdir ./app-electron/dist
echo '$version: 0.2.2' > ./app-electron/dist/latest-linux.yml

cd ./modules/base
npm install
cd ..
cd ./console
npm install
cd ..
cd ./monitor
npm install
cd ..
cd ./portmaster
npm install
cd ..
cd ..