$master = "C:\All work project\Source\rebuild-project-master (1).sh"
$targetBase = "C:\All work project\IPBL"

if (-not (Test-Path $master)) {
    Write-Error "Master script not found at $master"
    return
}

$content = [System.IO.File]::ReadAllText($master)
$pattern = 'cat << ''EOF'' > "(.*?)"\s*(.*?)\s*EOF'
$matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

Write-Output "🔍 Found $($matches.Count) logic blocks."

foreach ($m in $matches) {
    $rawPath = $m.Groups[1].Value
    $code = $m.Groups[2].Value
    
    # Standardize paths to root
    $cleanPath = $rawPath -replace '^src/src/', ''
    $cleanPath = $cleanPath -replace '^src/', ''
    
    $dest = Join-Path $targetBase $cleanPath
    $dir = Split-Path $dest -Parent
    if (-not (Test-Path $dir)) { mkdir $dir | Out-Null }
    
    # Forensic Cleanup
    $code = $code -replace '(?m)^\s*\d+\s*\|\s', ''
    
    # Write safe UTF-8
    [System.IO.File]::WriteAllText($dest, $code)
    Write-Output "✅ Hydrated: $cleanPath"
}
