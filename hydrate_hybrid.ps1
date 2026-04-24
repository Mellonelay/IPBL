$master = "C:\All_work_project\Source\rebuild-project-master (1).sh"
$targetBase = "C:\All work project\IPBL"

if (-not (Test-Path $master)) {
    Write-Error "Master script not found at $master"
    exit 1
}

$content = [System.IO.File]::ReadAllText($master)
$pattern = 'cat << ''EOF'' > "(.*?)"\s*(.*?)\s*EOF'
$matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

Write-Output "🔍 Processing $($matches.Count) logic blocks..."

foreach ($m in $matches) {
    $rawPath = $m.Groups[1].Value
    $code = $m.Groups[2].Value
    
    # Standardize structure: remove "src/src/" or "src/"
    $cleanPath = $rawPath -replace '^src/src/', ''
    $cleanPath = $cleanPath -replace '^src/', ''
    
    $dest = Join-Path $targetBase $cleanPath
    $dir = Split-Path $dest -Parent
    if (-not (Test-Path $dir)) { mkdir $dir | Out-Null }
    
    # Forensic Cleanup: Remove line numbers
    $code = $code -replace '(?m)^\s*\d+\s*\|\s', ''
    
    # Write as UTF-8 (No BOM)
    [System.IO.File]::WriteAllText($dest, $code)
    Write-Output "✅ Hydrated: $cleanPath"
}
