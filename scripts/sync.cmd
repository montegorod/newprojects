@echo off
rem Обёртка для sync.ps1: обходит Restricted Execution Policy.
rem Использование: scripts\sync.cmd -Message "docs: что изменилось"
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync.ps1" %*
