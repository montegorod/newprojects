@echo off
rem Wrapper for sync.ps1: bypasses Restricted Execution Policy.
rem Usage: scripts\sync.cmd -Message "docs: what changed"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync.ps1" %*
