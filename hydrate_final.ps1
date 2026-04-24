$master = "C:\All work project\Source\rebuild-project-master (1).sh"
$targetBase = "C:\All work project\IPBL"
$content = [System.IO.File]::ReadAllText($master)

# Use Regex to extract all file blocks
$pattern = 'cat << ''EOF'' > "(.*?)"\s*(.*?)\s*EOF'
$matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

Write-Output "🔍 Found $($matches.Count) logic blocks in master script."

foreach ($m in $matches) {
    $rawPath = $m.Groups[1].Value
    $code = $m.Groups[2].Value
    
    # Normalize paths: remove "src/" or "src/src/"
    $cleanPath = $rawPath -replace '^src/src/', ''
    $cleanPath = $cleanPath -replace '^src/', ''
    
    $dest = Join-Path $targetBase $cleanPath
    $dir = Split-Path $dest -Parent
    if (-not (Test-Path $dir)) { mkdir $dir | Out-Null }
    
    # Forensic cleaning: Strip leading line numbers and strange artifacts
    $code = $code -replace '(?m)^\s*\d+\s*\|\s', ''
    
    # Write UTF-8 No BOM for Vercel Linux compatibility
    [System.IO.File]::WriteAllText($dest, $code)
    Write-Output "✅ Hydrated: $cleanPath"
}
