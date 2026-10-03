@echo off
rem Sefarim Reader — instance locale (PC) : sert le dernier dist sur le LAN.
rem Reconstruire au prealable avec `npm run build` pour rafraichir.
cd /d "D:\7-App-Perso\torah-reader-app"
npx vite preview --host 0.0.0.0 --port 4173 --strictPort
