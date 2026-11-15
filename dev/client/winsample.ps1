# CPU, GPU and memory of every Spotify process over a few seconds (Windows). Prints one JSON object:
# per process type (browser, renderer, gpu-process, utility...) the CPU as % of one core, 3D engine % (summed over the
# process's engines, as Task Manager's GPU column) and memory (working set, private bytes) at the end.
#   powershell -NoProfile -File dev/client/winsample.ps1 -Secs 10
param([int]$Secs = 10)
$ErrorActionPreference = 'Stop'
function Snap { Get-CimInstance Win32_Process -Filter "Name='Spotify.exe'" | ForEach-Object {
  $t = if ($_.CommandLine -match '--type=([\w-]+)') { $Matches[1] } else { 'browser' }
  [pscustomobject]@{ id = [int]$_.ProcessId; type = $t; cpu = ($_.KernelModeTime + $_.UserModeTime) / 1e7 } } }
$a = Snap; $sw = [Diagnostics.Stopwatch]::StartNew()
$gpu = @{}
$samples = Get-Counter -Counter '\GPU Engine(*engtype_3D)\Utilization Percentage' -SampleInterval 1 -MaxSamples $Secs -ErrorAction SilentlyContinue
foreach ($s in $samples) { foreach ($c in $s.CounterSamples) { if ($c.Status -eq 0 -and$c.InstanceName -match 'pid_(\d+)_') { $p = [int]$Matches[1]; $gpu[$p] = [double]$gpu[$p] + $c.CookedValue } } }
$b = Snap; $el = $sw.Elapsed.TotalSeconds
$procs = Get-Process -Name Spotify | Select-Object Id, WorkingSet64, PrivateMemorySize64
$out = @{}
foreach ($p in $b) {
  $o = $a | Where-Object id -eq $p.id; if (-not $o) { continue }
  $m = $procs | Where-Object Id -eq $p.id
  $k = $p.type; if (-not $out[$k]) { $out[$k] = [ordered]@{ n = 0; cpu = 0.0; gpu = 0.0; ws = 0.0; priv = 0.0 } }
  $r = $out[$k]; $r.n++; $r.cpu += ($p.cpu - $o.cpu) / $el * 100; $r.gpu += [double]$gpu[$p.id] / $Secs
  $r.ws += $m.WorkingSet64 / 1MB; $r.priv += $m.PrivateMemorySize64 / 1MB
}
[ordered]@{ secs = $el; procs = $out } | ConvertTo-Json -Depth 4 -Compress
