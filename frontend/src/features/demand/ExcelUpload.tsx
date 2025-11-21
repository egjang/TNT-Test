import React, { useMemo, useRef, useState } from 'react'

export function ExcelUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const [rows, setRows] = useState<any[][]>([])
  const [fullRows, setFullRows] = useState<any[][]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [progressText, setProgressText] = useState<string>("")

  const onClick = () => inputRef.current?.click()
  const onChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    setError(null)
    const f = e.target.files?.[0]
    setFileName(f ? f.name : null)
    setRows([])
    setSheetNames([])
    setActiveSheet(null)
    if (!f) return
    try {
      const XLSX: any = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const names = wb.SheetNames || []
      setSheetNames(names)
      const sheetName = names[0]
      setActiveSheet(sheetName || null)
      if (sheetName) {
        const ws = wb.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
        setFullRows(data)
        setRows(data)
      }
    } catch (err: any) {
      setError('엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.')
      console.error(err)
    }
  }

  const hasData = rows && rows.length > 0

  const table = useMemo(() => {
    if (!hasData) return null
    const maxCols = rows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0)
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {Array.from({ length: maxCols }).map((_, ci) => (
                <th key={ci}>C{ci + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {Array.from({ length: maxCols }).map((_, ci) => (
                  <td key={ci}>{Array.isArray(r) && r[ci] != null ? String(r[ci]) : ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [rows, hasData])

  const onChangeSheet: React.ChangeEventHandler<HTMLSelectElement> = async (e) => {
    const name = e.target.value
    setActiveSheet(name)
    // Re-read current file with a different sheet selection
    const f = inputRef.current?.files?.[0]
    if (!f) return
    try {
      const XLSX: any = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[name]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
      setFullRows(data)
      setRows(data)
    } catch (err: any) {
      setError('시트를 전환하는 중 오류가 발생했습니다.')
      console.error(err)
    }
  }

  return (
    <section>
      <div className="page-title" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Excel Upload</h2>
        <div className="muted count-text" />
      </div>
      <p>로컬 PC에서 엑셀 파일(.xlsx, .xls)만 선택할 수 있습니다.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={onChange}
          style={{ display: 'none' }}
        />
        <button className="btn" onClick={onClick}>엑셀 파일 선택</button>
        {fileName && <span className="muted">선택됨: {fileName}</span>}
      </div>
      {sheetNames.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <label>
            시트 선택:&nbsp;
            <select value={activeSheet ?? ''} onChange={onChangeSheet}>
              {sheetNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {table}
      {hasData && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="btn" disabled={uploading} onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setUploadResult(null)
            setError(null)
          try {
            setUploading(true)
            setProgress(0); setProgressText('데이터 준비 중...')
            const payload = buildUploadPayload(fullRows)
            if (!payload.length) {
              throw new Error('업로드할 데이터가 없습니다. 엑셀 내용을 확인해 주세요.')
            }
              const batchSize = 250
              const chunks = chunk(payload, batchSize)
              let sent = 0
              let totalUpdated = 0
              let totalInserted = 0
              for (let i = 0; i < chunks.length; i++) {
                const chunkItems = chunks[i]
                setProgressText(`업로드 중... (${i + 1}/${chunks.length})`)
                const res = await fetch('/api/v1/demand/upload', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ items: chunkItems })
                })
                if (!res.ok) {
                  const text = await res.text()
                  try {
                    const j = JSON.parse(text)
                    const msg = j?.error || text || `Upload failed: ${res.status}`
                    throw new Error(msg)
                  } catch {
                    throw new Error(`Upload failed: ${res.status} ${text}`)
                  }
                }
                const data = await res.json()
                totalUpdated += Number(data.updated || 0)
                totalInserted += Number(data.inserted || 0)
                sent += chunkItems.length
                setProgress(Math.min(100, Math.round((sent / payload.length) * 100)))
              }
              setProgressText('완료')
              setUploadResult(`성공: 총 ${totalUpdated + totalInserted}건 (업데이트 ${totalUpdated}, 신규 ${totalInserted})`)
            } catch (e: any) {
              setError(e.message || '업로드 중 오류가 발생했습니다')
            } finally {
              setUploading(false)
              setTimeout(() => { setProgress(0); setProgressText('') }, 1200)
            }
          }}>업로드</button>
          {uploadResult && <span className="muted">{uploadResult}</span>}
        </div>
      )}
      {uploading && (
        <div style={{ marginTop: 10, width: '100%' }}>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="muted" style={{ marginTop: 6 }}>{progressText} {progress > 0 ? `${progress}%` : ''}</div>
        </div>
      )}
    </section>
  )
}

// Build upload payload from preview rows
function buildUploadPayload(rows: any[][]) {
  if (!rows || rows.length === 0) return [];
  const header = rows[0].map((v: any) => String(v || '').trim());
  const body = rows.slice(1);

  // 모든 공급사/영업관리단위/점유율 컬럼 인덱스 추출 (동일명 반복 지원)
  function allIdx(cands: string[]) {
    return header
      .map((h, i) => (cands.some(c => eq(h, c)) ? i : -1))
      .filter(i => i >= 0);
  }
  const salesRepIdx = header.findIndex(h => ['영업담당자', '영업사원', 'sales_owner', 'sales_rep', 'sales_rep_name'].some(c => eq(h, c)));
  const customerIdx = header.findIndex(h => ['거래처', '고객', 'customer'].some(c => eq(h, c)));
  const subcatIdx = header.findIndex(h => ['중분류', '품목중분류', '종분류', 'category_mid', 'item_subcategory'].some(c => eq(h, c)));

  // 반복 컬럼 인덱스 배열 (ex: [5, 9, 13, ...])
  const supIdxArr = allIdx(['공급사(tnt)', '공급사 tnt', 'tnt', '공급사', '공급자', 'supplier']);
  const unitIdxArr = allIdx(['영업관리단위', '관리단위', 'mgmt_unit', 'sales_mgmt_unit']);
  const shareIdxArr = allIdx(['점유율(%)', '점유율', 'share', 'share_rate']);
  const maxGroups = Math.max(supIdxArr.length, unitIdxArr.length, shareIdxArr.length);

  const out: any[] = [];
  let lastSalesOwner: string | null = null;
  let lastCustomer: string | null = null;
  let lastCategoryMid: string | null = null;
  for (const r of body) {
    let salesOwner = at(r, salesRepIdx).trim();
    let customer = at(r, customerIdx).trim();
    let categoryMid = at(r, subcatIdx).trim();
    if (!salesOwner) salesOwner = lastSalesOwner || '';
    if (!customer) customer = lastCustomer || '';
    if (!categoryMid) categoryMid = lastCategoryMid || '';
    if (!salesOwner || !customer || !categoryMid) {
      if (salesOwner) lastSalesOwner = salesOwner;
      if (customer) lastCustomer = customer;
      if (categoryMid) lastCategoryMid = categoryMid;
      continue;
    }
    lastSalesOwner = salesOwner;
    lastCustomer = customer;
    lastCategoryMid = categoryMid;
    for (let k = 0; k < maxGroups; k++) {
      const sup = at(r, supIdxArr[k]).trim();
      const unit = at(r, unitIdxArr[k]).trim();
      const rawShare = toNum(at(r, shareIdxArr[k]));
      const hasShare = rawShare != null && rawShare !== 0;
      // Create a record if any of supplier/unit/share present (share=0 is considered missing)
      if (!(sup || unit || hasShare)) continue;
      const share = hasShare ? rawShare : null;
      out.push({
        salesRepName: salesOwner,
        customerName: customer,
        itemSubcategory: categoryMid,
        supplierName: sup,
        salesMgmtUnit: unit,
        shareRate: share,
        priority: k + 1,
      });
    }
  }
  return out;
}

// Debug helper functions were removed.

function at(arr: any[], i: number) { return i >= 0 ? (arr[i] ?? '') : '' }
function normalizeHeader(h: string) {
  return String(h || '')
    .replace(/[\s\-_%()\[\]{}]/g, '')
    .replace(/tnt/gi, '')
    .toLowerCase();
}
function eq(a: string, b: string) {
  return normalizeHeader(a) === normalizeHeader(b);
}
  function toNum(v: any) {
    if (v == null) return null;
    const n = Number(String(v).replace(/[,\s%]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
