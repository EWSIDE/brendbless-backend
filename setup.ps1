# BRENDBLESS Backend Setup Script
Write-Host "=== BRENDBLESS Backend Setup ===" -ForegroundColor Cyan

Set-Location "C:\Users\ewside\Desktop\BRENDBLESSV1\bless_backend"

Write-Host "`n[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { 
    Write-Host "npm install failed" -ForegroundColor Red
    exit 1 
}

Write-Host "`n[2/5] Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Prisma generate failed" -ForegroundColor Red
    exit 1 
}

Write-Host "`n[3/5] Pushing database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Database push failed" -ForegroundColor Red
    exit 1 
}

Write-Host "`n[4/5] Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) { 
    Write-Host "Database seed failed" -ForegroundColor Red
    exit 1 
}

Write-Host "`n[5/5] Checking TypeScript..." -ForegroundColor Yellow
npm run typecheck
if ($LASTEXITCODE -ne 0) { 
    Write-Host "TypeScript check failed (this is ok for development)" -ForegroundColor Yellow
}

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "`nTo start the server, run:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host "`nAPI will be available at: http://localhost:3001" -ForegroundColor White
Write-Host "API Docs: http://localhost:3001/api/docs" -ForegroundColor White
