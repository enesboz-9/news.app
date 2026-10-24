@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set REPO=https://github.com/enesboz-9/news.app.git
set BRANCH=main
set TAG=streamlit-son-surum

where git >nul 2>nul
if errorlevel 1 (
  echo [HATA] Git bulunamadi. https://git-scm.com adresinden kurun.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Bu islem GitHub deposunu bu klasorle AYNI hale getirir:
echo  - Klasorde olmayan eski dosyalar depodan silinir
echo  - Streamlit dosyalari ^(app.py, requirements.txt^) silinir
echo  - Eski Streamlit surumu "%TAG%" etiketiyle yedeklenir
echo ============================================================
set /p ONAY=Devam edilsin mi? [E/H]: 
if /i not "%ONAY%"=="E" (
  echo [BILGI] Iptal edildi, hicbir sey degismedi.
  pause
  exit /b 0
)

REM Klasor bir git deposu degilse: baslat ve uzak depoya bagla
if not exist ".git" (
  echo [BILGI] Git deposu bulunamadi, olusturuluyor...
  git init
  git branch -M %BRANCH%
  git remote add origin %REPO%
) else (
  git remote get-url origin >nul 2>nul || git remote add origin %REPO%
)

git fetch origin
if errorlevel 1 (
  echo [HATA] Depoya baglanilamadi. GitHub girisinizi kontrol edin.
  pause
  exit /b 1
)

REM Eski Streamlit surumunu yedekle ^(etiket, Vercel dagitimi tetiklemez^)
git cat-file -e origin/%BRANCH%:app.py >nul 2>nul && (
  git rev-parse -q --verify refs/tags/%TAG% >nul 2>nul || git tag %TAG% origin/%BRANCH%
  git push origin %TAG%
)

REM Gecmis uzak depoyla eslenir; klasorde olmayan dosyalar silinmis sayilir
git rev-parse -q --verify refs/remotes/origin/%BRANCH% >nul 2>nul && git reset --soft origin/%BRANCH%

REM Streamlit kalintilarini temizle
if exist "app.py" del /f /q "app.py"
if exist "requirements.txt" del /f /q "requirements.txt"
if exist "__pycache__" rmdir /s /q "__pycache__"

git add -A
echo.
echo [BILGI] Gonderilecek degisiklikler:
git status --short

set MSG=haberAI: Next.js surumu ^(Vercel^), eski dosyalar temizlendi
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
echo [BILGI] Eski Streamlit surumu gerekirse "%TAG%" etiketinde duruyor.
pause
