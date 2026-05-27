$outlook = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Outlook.Application")
$ns = $outlook.GetNamespace("MAPI")

$baseDir = "C:\Users\USER\desktop\project-command-center\99_reference\electrical-design\originals\attachments"

$targets = @(
    @{ kw = "250530"; cat = "elec" },
    @{ kw = "250620"; cat = "elec" },
    @{ kw = "250725"; cat = "elec" },
    @{ kw = "250814"; cat = "elec" },
    @{ kw = "250806"; cat = "elec" },
    @{ kw = "250905"; cat = "elec" },
    @{ kw = "250918"; cat = "elec" },
    @{ kw = "251023"; cat = "elec" },
    @{ kw = "251219"; cat = "elec" },
    @{ kw = "251217"; cat = "elec" },
    @{ kw = "260105"; cat = "elec" },
    @{ kw = "260115"; cat = "elec" },
    @{ kw = "260414"; cat = "elec" },
    @{ kw = "251107"; cat = "bom" },
    @{ kw = "251210"; cat = "bom" },
    @{ kw = "251216"; cat = "bom" },
    @{ kw = "260114"; cat = "bom" },
    @{ kw = "260213"; cat = "bom" },
    @{ kw = "250807"; cat = "pid" },
    @{ kw = "251031"; cat = "pid" },
    @{ kw = "251110"; cat = "pid" },
    @{ kw = "251208"; cat = "pid" },
    @{ kw = "260128"; cat = "pid" },
    @{ kw = "260319"; cat = "pid" },
    @{ kw = "260325"; cat = "pid" }
)

$catMap = @{ elec = "elec"; bom = "bom"; pid = "pid" }

function Get-MailFolders { param($p); $r=@(); foreach($f in $p.Folders){$r+=$f; $r+=Get-MailFolders $f}; return $r }

Write-Host "폴더 수집 중..."
$allFolders = @()
foreach($store in $ns.Stores){ try{ $allFolders += Get-MailFolders $store }catch{} }
Write-Host "총 $($allFolders.Count) 폴더"

$log = @(); $cnt = 0; $seen = @{}

foreach($t in $targets){
    $kw = $t.kw; $cat = $t.cat
    $outDir = Join-Path $baseDir $cat
    if(-not(Test-Path $outDir)){ New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

    Write-Host "검색: $kw"
    foreach($folder in $allFolders){
        try{
            $filter = "@SQL=""urn:schemas:httpmail:subject"" LIKE '%" + $kw + "%'"
            $items = $folder.Items.Restrict($filter)
            foreach($item in $items){
                if($item.Class -ne 43){ continue }
                if($item.Attachments.Count -eq 0){ continue }
                $dateStr = try{ $item.ReceivedTime.ToString("yyyyMMdd") }catch{ "00000000" }
                foreach($att in $item.Attachments){
                    $fn = $att.FileName
                    if($fn -match '\.(png|jpg|jpeg|gif|bmp|ico)$'){ continue }
                    if($att.Size -lt 1024){ continue }
                    $key = "$($item.Subject)|$fn"
                    if($seen.ContainsKey($key)){ continue }
                    $seen[$key] = $true
                    $safe = "${dateStr}_${fn}" -replace '[\\/:*?"<>|]','_'
                    $path = Join-Path $outDir $safe
                    $i=1; while(Test-Path $path){ $e=[IO.Path]::GetExtension($fn); $b=[IO.Path]::GetFileNameWithoutExtension($fn); $path=Join-Path $outDir "${dateStr}_${b}_${i}${e}"; $i++ }
                    try{ $att.SaveAsFile($path); $log+="$cat|$dateStr|$($item.Subject)|$fn"; Write-Host "  저장: $fn"; $cnt++ }catch{ Write-Host "  실패: $fn" }
                }
            }
        }catch{}
    }
}

$log | Out-File (Join-Path $baseDir "attachment-log.txt") -Encoding utf8
Write-Host "=== 완료: $cnt 개 저장 ==="
$log | ForEach-Object { Write-Host $_ }