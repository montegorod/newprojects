[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = 'Сообщение коммита, например: docs: обновлён статус')]
    [string]$Message
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'git не найден в PATH.'
    }

    $remotes = @(git remote)
    if ($remotes -notcontains 'origin') {
        throw 'Не настроен remote origin. Добавь: git remote add origin <url>'
    }

    # 1. Коммит
    git add -A
    $staged = @(git diff --cached --name-only)
    if ($staged.Count -gt 0) {
        git commit -m $Message
        if ($LASTEXITCODE -ne 0) { throw "git commit завершился с кодом $LASTEXITCODE" }
        Write-Host "Закоммичено файлов: $($staged.Count)"
    }
    else {
        Write-Host 'Изменений для коммита нет — пушу уже закоммиченное.'
    }

    # 2. Токен из Git Credential Manager (без записи на диск)
    $gitExe = (Get-Command git).Source
    $gitHome = Split-Path -Parent (Split-Path -Parent $gitExe)
    $gcm = Join-Path $gitHome 'mingw64\bin\git-credential-manager.exe'
    if (-not (Test-Path -LiteralPath $gcm)) {
        throw "Git Credential Manager не найден: $gcm"
    }

    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('dsh-sync-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        $inFile = Join-Path $tmp 'in.txt'
        $outFile = Join-Path $tmp 'out.txt'
        $errFile = Join-Path $tmp 'err.txt'
        "protocol=https`nhost=github.com`n`n" | Set-Content -LiteralPath $inFile -NoNewline
        $proc = Start-Process -FilePath $gcm -ArgumentList 'get' `
            -RedirectStandardInput $inFile `
            -RedirectStandardOutput $outFile `
            -RedirectStandardError $errFile `
            -Wait -PassThru -NoNewWindow
        if ($proc.ExitCode -ne 0) {
            $errText = Get-Content -LiteralPath $errFile -Raw -ErrorAction SilentlyContinue
            throw "GCM get завершился с кодом $($proc.ExitCode): $errText"
        }
        $cred = Get-Content -LiteralPath $outFile
        $user = ($cred | Where-Object { $_ -like 'username=*' } | Select-Object -First 1) -replace '^username=', ''
        $token = ($cred | Where-Object { $_ -like 'password=*' } | Select-Object -First 1) -replace '^password=', ''
        if (-not $token) { throw 'GCM не вернул токен (password).' }
    }
    finally {
        Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
    }

    # 3. Push. schannel в этой среде не работает — принудительно OpenSSL;
    #    заголовок авторизации живёт только в этом процессе.
    $basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${user}:${token}"))
    $env:GIT_TERMINAL_PROMPT = '0'
    git -c http.sslBackend=openssl `
        -c credential.helper= `
        -c "http.https://github.com/.extraheader=Authorization: Basic $basic" `
        push -u origin HEAD
    if ($LASTEXITCODE -ne 0) { throw "git push завершился с кодом $LASTEXITCODE" }

    Write-Host 'Готово: изменения в origin/main.'
}
finally {
    Pop-Location
}
