@echo off
title electron build

cls
set WIN_CSC_KEY_PASSWORD=iwilab$7
set CSC_KEY_PASSWORD=iwilab$7

set npm_config_arch=ia32

npm run electron:build
