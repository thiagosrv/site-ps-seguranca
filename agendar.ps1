# ═══════════════════════════════════════════════════════════
# agendar.ps1 — Cria tarefa no Windows Task Scheduler
# Executa automatizar.js todo dia às 08:00
#
# Como usar:
#   1. Defina sua OPENAI_API_KEY no sistema (veja passo abaixo)
#   2. Execute este script como Administrador no PowerShell:
#      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#      .\agendar.ps1
# ═══════════════════════════════════════════════════════════

# ─── CONFIGURAÇÃO ──────────────────────────────────────────
$taskName    = "PSProtecao-AutoDiario"
$projectDir  = "C:\Users\thste\OneDrive\Área de Trabalho\Site\lp-psprotecao"
$horario     = "08:00"

# Localiza o executável node.js instalado no sistema
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    Write-Error "❌ Node.js não encontrado. Instale em https://nodejs.org antes de continuar."
    exit 1
}

Write-Host "✅ Node.js encontrado: $nodePath"

# ─── PASSO 1: OPENAI_API_KEY ───────────────────────────────
Write-Host ""
Write-Host "────────────────────────────────────────────────"
Write-Host "  Configure sua OPENAI_API_KEY como variável de"
Write-Host "  ambiente do SISTEMA (necessário para a tarefa"
Write-Host "  agendada ter acesso à chave)."
Write-Host ""
Write-Host "  Execute este comando no PowerShell como Admin:"
Write-Host '  [System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY","sk-SUA-CHAVE","Machine")'
Write-Host "────────────────────────────────────────────────"
Write-Host ""

$chave = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Machine")
if (-not $chave) {
    Write-Warning "⚠️  OPENAI_API_KEY não encontrada nas variáveis de sistema."
    Write-Warning "    Configure antes de executar a tarefa agendada."
} else {
    Write-Host "✅ OPENAI_API_KEY detectada nas variáveis de sistema."
}

# ─── PASSO 2: CRIA A TAREFA ────────────────────────────────
Write-Host ""
Write-Host "📅 Criando tarefa '$taskName' para rodar às $horario diariamente..."

# Remove tarefa anterior se existir
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
    -Execute    $nodePath `
    -Argument   "automatizar.js" `
    -WorkingDirectory $projectDir

$trigger = New-ScheduledTaskTrigger -Daily -At $horario

$settings = New-ScheduledTaskSettingsSet `
    -RunOnlyIfNetworkAvailable `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances  IgnoreNew

# Roda como o usuário atual (necessário para acesso ao OneDrive e credenciais git)
$principal = New-ScheduledTaskPrincipal `
    -UserId   $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName   $taskName `
    -Action     $action `
    -Trigger    $trigger `
    -Settings   $settings `
    -Principal  $principal `
    -Description "PS Proteção: 1 blog post + 2 páginas SEO + deploy no Vercel — todo dia às $horario" `
    -Force

Write-Host ""
Write-Host "✅ Tarefa '$taskName' criada com sucesso!"
Write-Host ""
Write-Host "📋 Resumo:"
Write-Host "   Executa : todo dia às $horario"
Write-Host "   Script  : $projectDir\automatizar.js"
Write-Host "   Node    : $nodePath"
Write-Host ""
Write-Host "🔧 Outros comandos úteis:"
Write-Host "   Verificar : Get-ScheduledTask -TaskName '$taskName'"
Write-Host "   Testar    : Start-ScheduledTask -TaskName '$taskName'"
Write-Host "   Remover   : Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
Write-Host "   Histórico : Get-ScheduledTaskInfo -TaskName '$taskName'"
Write-Host ""
