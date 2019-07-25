@echo off
title electron test

taskkill /F /im electron.exe
set npm_config_arch=ia32
cls
call npm run electron:serve
taskkill /F /im electron.exe