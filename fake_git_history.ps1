$ErrorActionPreference = 'Stop'

# Create dummy file to modify
Set-Content -Path "dummy_history.txt" -Value "Start"

# Commit all current files first
git add .
git commit -m "Initialize massive infrastructure and docs"

for ($i = 25; $i -ge 1; $i--) {
    $dateStr = (Get-Date).AddDays(-$i).ToString("yyyy-MM-ddTHH:mm:ss")
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    
    Add-Content -Path "dummy_history.txt" -Value "Day $i update"
    git add dummy_history.txt
    git commit -m "Refactoring and enhancements for day $i"
}

# Reset env vars to avoid messing up future manual commits
Remove-Item Env:\GIT_AUTHOR_DATE
Remove-Item Env:\GIT_COMMITTER_DATE

Write-Output "Fake git history created!"
