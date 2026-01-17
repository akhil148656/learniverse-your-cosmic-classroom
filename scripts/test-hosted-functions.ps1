$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env'
if (-not (Test-Path $envFile)) {
  throw "Missing .env at $envFile"
}

function Get-EnvValue([string]$name) {
  $line = Get-Content $envFile | Where-Object { $_ -match ("^" + [regex]::Escape($name) + "=") } | Select-Object -First 1
  if (-not $line) { return $null }
  $parts = $line -split '=', 2
  if ($parts.Count -lt 2) { return $null }
  return $parts[1].Trim().Trim('"')
}

$supabaseUrl = Get-EnvValue 'VITE_SUPABASE_URL'
$anonKey = Get-EnvValue 'VITE_SUPABASE_PUBLISHABLE_KEY'

if (-not $supabaseUrl) { throw 'Missing VITE_SUPABASE_URL in .env' }
if (-not $anonKey) { throw 'Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env' }

$headers = @{ apikey = $anonKey; Authorization = "Bearer $anonKey" }

Write-Host "SUPABASE_URL=$supabaseUrl"

Write-Host "--- env-check ---"
try {
  $envCheck = Invoke-RestMethod -Method Get -Uri "$supabaseUrl/functions/v1/env-check" -Headers $headers
  $envCheck | ConvertTo-Json -Depth 10
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP=$status"
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $sr.ReadToEnd()
}

Write-Host "--- generate-quiz ---"

function Get-QuizQuestionHash($quiz) {
  try {
    $joined = ($quiz.questions | ConvertTo-Json -Depth 25 -Compress)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($joined)
    $hash = $sha.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
  } catch {
    return $null
  }
}

$quizStudentId = $env:QUIZ_STUDENT_ID
$requestedDifficulty = if ($quizStudentId) { 'auto' } else { 'easy' }

$payload = @{ topic = 'Photosynthesis'; difficulty = $requestedDifficulty; questionCount = 3; gradeLevel = 8; studentId = $quizStudentId } | ConvertTo-Json -Compress
try {
  $quiz1 = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/functions/v1/generate-quiz" -Headers $headers -ContentType 'application/json' -Body $payload
  $quiz2 = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/functions/v1/generate-quiz" -Headers $headers -ContentType 'application/json' -Body $payload

  $hash1 = Get-QuizQuestionHash $quiz1
  $hash2 = Get-QuizQuestionHash $quiz2

  # Avoid dumping huge question payload; show high-signal fields
  $summary = [ordered]@{
    requestedDifficulty = $requestedDifficulty
    usedStudentId = [bool]$quizStudentId
    quiz1 = [ordered]@{
      quizId = $quiz1.quizId
      topic = $quiz1.topic
      difficulty = $quiz1.difficulty
      questionCount = ($quiz1.questions | Measure-Object).Count
      provider = $quiz1.provider
      model = $quiz1.model
      questionHash = $hash1
    }
    quiz2 = [ordered]@{
      quizId = $quiz2.quizId
      difficulty = $quiz2.difficulty
      questionCount = ($quiz2.questions | Measure-Object).Count
      provider = $quiz2.provider
      model = $quiz2.model
      questionHash = $hash2
    }
    questionsDiffer = if ($hash1 -and $hash2) { $hash1 -ne $hash2 } else { $null }
  }
  $summary | ConvertTo-Json -Depth 10
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP=$status"
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $sr.ReadToEnd()
}

Write-Host "--- ai-mentor (notes probe) ---"
$chatPayload = @{ messages = @(@{ role = 'user'; content = 'Say OK.' }); type = 'notes' } | ConvertTo-Json -Compress
try {
  $resp = Invoke-WebRequest -Method Post -Uri "$supabaseUrl/functions/v1/ai-mentor" -Headers $headers -ContentType 'application/json' -Body $chatPayload -UseBasicParsing
  $providerHeader = $resp.Headers['X-AI-Provider']
  $modelHeader = $resp.Headers['X-AI-Model']
  $deployHeader = $resp.Headers['X-Deploy-Mark']

  # First SSE line should be JSON metadata (data: {...})
  $firstLine = ($resp.Content -split "`n" | Select-Object -First 5 | Where-Object { $_ -match '^data: ' } | Select-Object -First 1)
  $providerFromSse = $null
  if ($firstLine) {
    $json = $firstLine -replace '^data:\s*', ''
    try { $providerFromSse = (ConvertFrom-Json $json).provider } catch { }
  }

  [ordered]@{
    xAiProvider = $providerHeader
    xAiModel = $modelHeader
    xDeployMark = $deployHeader
    providerFromSse = $providerFromSse
    httpStatus = $resp.StatusCode
  } | ConvertTo-Json -Depth 10
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP=$status"
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $sr.ReadToEnd()
}

Write-Host "--- generate-feedback (provider probe) ---"
try {
  # Intentionally omit studentId. We only want to confirm provider/model selection.
  $resp = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/functions/v1/generate-feedback" -Headers $headers -ContentType 'application/json' -Body '{}' 
  $resp | ConvertTo-Json -Depth 10
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP=$status"
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $sr.ReadToEnd()
}

Write-Host "--- youtube-search ---"
try {
  $ytGrade = $null
  if ($env:YOUTUBE_GRADE_LEVEL) {
    try { $ytGrade = [int]$env:YOUTUBE_GRADE_LEVEL } catch { $ytGrade = $null }
  }
  $ytLang = $null
  if ($env:YOUTUBE_LANG) {
    $ytLang = [string]$env:YOUTUBE_LANG
  }
  $ytPayload = @{ query = 'lcm and hcf'; maxResults = 3; gradeLevel = $ytGrade; preferredLanguage = $ytLang } | ConvertTo-Json -Compress
  $yt = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/functions/v1/youtube-search" -Headers $headers -ContentType 'application/json' -Body $ytPayload
  $ytSummary = [ordered]@{
    videoCount = ($yt.videos | Measure-Object).Count
    requiresSetup = [bool]$yt.requiresSetup
    gradeLevelEcho = $yt.gradeLevel
    preferredLanguageEcho = $yt.preferredLanguage
    error = $yt.error
    firstVideoTitle = ($yt.videos | Select-Object -First 1).title
  }
  $ytSummary | ConvertTo-Json -Depth 10
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP=$status"
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $sr.ReadToEnd()
}

Write-Host "--- smart-learning-suggestions ---"
try {
  $payload = @{
    gradeLevel = 8
    upcomingAssignments = @(
      @{ title = 'Science lab report'; due_date = '2026-01-18' }
      @{ title = 'Algebra worksheet'; due_date = '2026-01-20' }
    )
    recentTopics = @('Photosynthesis', 'Linear equations')
  } | ConvertTo-Json -Compress

  $resp = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/functions/v1/smart-learning-suggestions" -Headers $headers -ContentType 'application/json' -Body $payload
  $resp | ConvertTo-Json -Depth 10
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Host "HTTP=$status"
  $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $sr.ReadToEnd()
}
