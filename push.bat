@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set REPO=https://github.com/enesboz-9/news.app.git
set BRANCH=main

where git >nul 2>nul
if errorlevel 1 (
  echo [HATA] Git bulunamadi. https://git-scm.com adresinden kurun.
  pause
  exit /b 1
)

REM Klasor bir git deposu degilse: baslat ve uzak depoya bagla (mevcut gecmisi korur)
if not exist ".git" (
  echo [BILGI] Git deposu bulunamadi, olusturuluyor...
  git init
  git branch -M %BRANCH%
  git remote add origin %REPO%
  git fetch origin
  if errorlevel 1 (
    echo [HATA] Depoya baglanilamadi. GitHub girisinizi kontrol edin.
    pause
    exit /b 1
  )
  REM Gecmis uzak depoyla eslenir, dosyalar oldugu gibi kalir
  git reset --soft origin/%BRANCH%
  REM Eski Streamlit surumu calismaya devam etsin diye dosyalari geri getir
  git checkout origin/%BRANCH% -- app.py requirements.txt >nul 2>nul
) else (
  git remote get-url origin >nul 2>nul || git remote add origin %REPO%
)

git add -A
git status --short

set MSG=haberAI: Next.js surumu (Vercel)
if not "%~1"=="" set MSG=%*

git commit -m "%MSG%"
if errorlevel 1 echo [BILGI] Yeni degisiklik yok ya da commit atlandi.

git push -u origin %BRANCH%
if errorlevel 1 (
  echo.
  echo [HATA] Push basarisiz. Uzakta yeni degisiklik varsa once: git pull --rebase origin %BRANCH%
  pause
  exit /b 1
)

echo.
echo [TAMAM] GitHub'a gonderildi: %REPO%
pause
