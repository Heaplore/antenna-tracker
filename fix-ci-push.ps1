$token = 'process.env.GITHUB_TOKEN or "YOUR_GITHUB_TOKEN_HERE"'
$repo = 'Heaplore/antenna-tracker'
$basePath = 'E:\OH-workspace\antenna-tracker'
$remoteHead = '3cedeaef9ace62463c5c975e83fa0ec9d451f46f'

# Upload all changed files since remote HEAD
$files = @(
    'app/page.tsx',
    'components/Navbar.tsx',
    '.github/workflows/deploy-pages.yml'
)

function Post-Blob {
    param([string]$filePath)
    $content = [System.IO.File]::ReadAllBytes($filePath)
    $encoded = [Convert]::ToBase64String($content)
    $body = '{"content":"' + $encoded + '","encoding":"base64"}'
    $resp = Invoke-WebRequest -Uri ('https://api.github.com/repos/' + $repo + '/git/blobs') -Method Post -Headers @{Authorization='Bearer '+$token; Accept='application/vnd.github+json'; 'Content-Type'='application/json'} -Body $body
    return $resp.Content | ConvertFrom-Json
}

function Get-Json {
    param([string]$uri)
    $req = @{ Authorization='Bearer '+$token; Accept='application/vnd.github+json' }
    $resp = Invoke-WebRequest -Uri $uri -Headers $req
    return $resp.Content | ConvertFrom-Json
}

function Post-Json {
    param([string]$uri, [string]$body)
    $resp = Invoke-WebRequest -Uri $uri -Method Post -Headers @{Authorization='Bearer '+$token; Accept='application/vnd.github+json'; 'Content-Type'='application/json'} -Body $body
    return $resp.Content | ConvertFrom-Json
}

function Patch-Json {
    param([string]$uri, [string]$body)
    $resp = Invoke-WebRequest -Uri $uri -Method Patch -Headers @{Authorization='Bearer '+$token; Accept='application/vnd.github+json'; 'Content-Type'='application/json'} -Body $body
    return $resp.Content | ConvertFrom-Json
}

# Upload changed files
$blobShas = @{}
foreach ($f in $files) {
    $fullPath = Join-Path $basePath $f
    if (Test-Path $fullPath) {
        $blob = Post-Blob -filePath $fullPath
        $blobShas[$f] = $blob.sha
        Write-Host ('Uploaded: ' + $f + ' -> ' + $blob.sha.Substring(0,8))
    }
}

# Get base tree
$base = Get-Json -uri ('https://api.github.com/repos/' + $repo + '/git/trees/' + $remoteHead)

# Build new tree - merge with existing entries
$newTreeEntries = @()
foreach ($entry in $base.tree) {
    $found = $false
    foreach ($f in $files) {
        if ($entry.path -eq $f -and $blobShas.ContainsKey($f)) {
            $newTreeEntries += @{path=$entry.path; sha=$blobShas[$f]; mode=$entry.mode; type=$entry.type}
            $found = $true
            break
        }
    }
    if (-not $found) {
        $newTreeEntries += @{path=$entry.path; sha=$entry.sha; mode=$entry.mode; type=$entry.type}
    }
}

$treeBody = @{tree=$newTreeEntries} | ConvertTo-Json -Depth 10
$newTree = Post-Json -uri ('https://api.github.com/repos/' + $repo + '/git/trees') -body $treeBody
Write-Host ('New tree: ' + $newTree.sha)

$commitBody = '{"message":"fix: add Python analysis to CI workflow","tree":"' + $newTree.sha + '","parents":["3cedeaef9ace62463c5c975e83fa0ec9d451f46f"]}'
$newCommit = Post-Json -uri ('https://api.github.com/repos/' + $repo + '/git/commits') -body $commitBody
Write-Host ('New commit: ' + $newCommit.sha)

$refBody = '{"sha":"' + $newCommit.sha + '","force":true}'
$updatedRef = Patch-Json -uri ('https://api.github.com/repos/' + $repo + '/git/refs/heads/main') -body $refBody
Write-Host ('Main updated to: ' + $updatedRef.object.sha)
Write-Host 'Done!'
