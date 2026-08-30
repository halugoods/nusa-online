# Test sync_products edge function (post-deploy).
$anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNha2V1aGNiY251ZXBsemtsdG0iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5NTUxOTU3MywiZXhwIjoxNzAwOTAzMTczfQ.gIRuy6zd4UVmcQ4PY39Z7Bh2tFa6F4iUVRl4OEZKMfk"

$body = '{"action":"sync_products","store_id":"keuanganku96-test-store-id","products":[{"product_id":1,"name":"Produk A","category":"Lainnya","price":10000,"stock":5,"image":"https://nusa-images.example/produk-a.jpg","description":"Tes","is_published":true},{"product_id":2,"name":"","price":0,"stock":0}]}'

try {
    $resp = Invoke-RestMethod `
        -Uri "https://sakeuhcbcnueplzlkltm.supabase.co/functions/v1/online-store" `
        -Method Post `
        -Headers @{ "apikey" = $anon; "Authorization" = "Bearer $anon"; "Content-Type" = "application/json" } `
        -Body $body
    Write-Host "=== SUCCESS ==="
    $resp | ConvertTo-Json
} catch {
    $ex = $_.Exception.Response
    Write-Host "=== ERROR ==="
    Write-Host "StatusCode: $($ex.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($ex.GetResponseStream())
    $reader.ReadToEnd()
}