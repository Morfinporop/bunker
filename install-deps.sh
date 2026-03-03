#!/bin/bash

echo "Installing system dependencies for GMod server..."

if [ -f /etc/debian_version ]; then
    apt-get update
    apt-get install -y lib32gcc-s1 lib32stdc++6 curl wget tar gzip
elif [ -f /etc/redhat-release ]; then
    yum install -y glibc.i686 libstdc++.i686 curl wget tar gzip
fi

echo "Installing SteamCMD..."
mkdir -p steamcmd
cd steamcmd
curl -sqL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" | tar zxvf -
chmod +x steamcmd.sh

echo "Dependencies installed successfully!"
