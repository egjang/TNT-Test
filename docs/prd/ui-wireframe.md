# 📐 UI Wireframe — 연체채권 관리 & 매출통제 해제 시스템

**참조 UI**: 유통기한재고 (`ExpiryStockView.tsx`)

---

## 1. AR Aging Dashboard (연체채권 대시보드)

### 1.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│ Header: "연체채권 현황"                                    │
├─────────────────────────────────────────────────────────┤
│ [Summary Cards - 4개 그리드]                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                     │
│ │총채권 │ │만기도과│ │30일이내│ │60일이내│                │
│ │100M  │ │ 25M  │ │ 35M  │ │ 20M  │                     │
│ └──────┘ └──────┘ └──────┘ └──────┘                     │
├─────────────────────────────────────────────────────────┤
│ [필터 카드]                                               │
│ 영업사원: [___] 부서: [___] 거래처명: [___] [조회]        │
│ 위험도: [전체▼] Aging구간: [전체▼]                        │
├─────────────────────────────────────────────────────────┤
│ [데이터 테이블]                                           │
│ #│상태│거래처명│영업사원│총채권│만기도과│30일│60일│90일│... │
│ 1│🔴 │ABC상사│홍길동 │50M │10M   │20M│15M│5M │    │
│ 2│🟡 │XYZ마트│김철수 │30M │0    │15M│10M│5M │    │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Summary Cards 상세

**참조**: `ExpiryStockView.tsx` 라인 141-158

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
  {/* Card 1: 총채권액 */}
  <div className="card" style={{ padding: 12 }}>
    <div style={{ fontSize: 12, color: 'var(--muted)' }}>총채권액</div>
    <div style={{ fontSize: 20, fontWeight: 600 }}>₩125,450,000</div>
  </div>

  {/* Card 2: 만기도과 (빨강) */}
  <div className="card" style={{ padding: 12, borderLeft: '3px solid #ef4444' }}>
    <div style={{ fontSize: 12, color: 'var(--muted)' }}>만기도과 (15건)</div>
    <div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>₩35,200,000</div>
  </div>

  {/* Card 3: 30일 이내 (주황) */}
  <div className="card" style={{ padding: 12, borderLeft: '3px solid #f59e0b' }}>
    <div style={{ fontSize: 12, color: 'var(--muted)' }}>30일 이내 (22건)</div>
    <div style={{ fontSize: 20, fontWeight: 600, color: '#f59e0b' }}>₩48,500,000</div>
  </div>

  {/* Card 4: 정상채권 (초록) */}
  <div className="card" style={{ padding: 12, borderLeft: '3px solid #10b981' }}>
    <div style={{ fontSize: 12, color: 'var(--muted)' }}>정상채권</div>
    <div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }}>₩41,750,000</div>
  </div>
</div>
```

### 1.3 필터 영역

**참조**: `ExpiryStockView.tsx` 라인 161-232

```tsx
<div className="card" style={{ padding: 16 }}>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>회사</label>
      <select className="input" value={company} onChange={(e) => setCompany(e.target.value)}>
        <option value="all">전체</option>
        <option value="TNT">TNT</option>
        <option value="DYS">DYS</option>
      </select>
    </div>

    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>영업사원</label>
      <input
        type="text"
        className="input"
        placeholder="영업사원명 검색"
        value={salesRep}
        onChange={(e) => setSalesRep(e.target.value)}
      />
    </div>

    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>거래처명</label>
      <input
        type="text"
        className="input"
        placeholder="거래처명 검색"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />
    </div>

    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>위험도</label>
      <select className="input" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
        <option value="all">전체</option>
        <option value="high">고위험</option>
        <option value="medium">중위험</option>
        <option value="low">저위험</option>
      </select>
    </div>

    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Aging 구간</label>
      <select className="input" value={agingBucket} onChange={(e) => setAgingBucket(e.target.value)}>
        <option value="all">전체</option>
        <option value="overdue">만기도과</option>
        <option value="30">30일 이내</option>
        <option value="60">60일 이내</option>
        <option value="90">90일 이내</option>
      </select>
    </div>

    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
      <button className="button primary" onClick={fetchData} style={{ width: '100%' }}>
        조회
      </button>
    </div>
  </div>
</div>
```

### 1.4 데이터 테이블

**참조**: `ExpiryStockView.tsx` 라인 242-286

```tsx
<div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
  <div style={{ overflow: 'auto', flex: 1 }}>
    <table className="table" style={{ fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ width: 40, textAlign: 'center' }}>#</th>
          <th style={{ width: 80 }}>위험도</th>
          <th style={{ minWidth: 120 }}>거래처코드</th>
          <th style={{ minWidth: 180 }}>거래처명</th>
          <th style={{ minWidth: 100 }}>영업사원</th>
          <th style={{ minWidth: 100, textAlign: 'right' }}>총채권액</th>
          <th style={{ minWidth: 100, textAlign: 'right' }}>만기도과</th>
          <th style={{ minWidth: 80, textAlign: 'right' }}>1개월</th>
          <th style={{ minWidth: 80, textAlign: 'right' }}>2개월</th>
          <th style={{ minWidth: 80, textAlign: 'right' }}>3개월</th>
          <th style={{ minWidth: 80, textAlign: 'right' }}>6개월</th>
          <th style={{ minWidth: 80, textAlign: 'right' }}>12개월</th>
          <th style={{ minWidth: 100 }}>최근수금일</th>
          <th style={{ minWidth: 100, textAlign: 'center' }}>액션</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => openDetailPanel(item)}>
            <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{idx + 1}</td>
            <td>{getRiskBadge(item.riskLevel)}</td>
            <td>{item.customerCode}</td>
            <td>{item.customerName}</td>
            <td>{item.salesRep}</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>₩{formatNumber(item.totalAr)}</td>
            <td style={{ textAlign: 'right', color: '#ef4444' }}>₩{formatNumber(item.overdue)}</td>
            <td style={{ textAlign: 'right' }}>₩{formatNumber(item.aging30)}</td>
            <td style={{ textAlign: 'right' }}>₩{formatNumber(item.aging60)}</td>
            <td style={{ textAlign: 'right' }}>₩{formatNumber(item.aging90)}</td>
            <td style={{ textAlign: 'right' }}>₩{formatNumber(item.aging180)}</td>
            <td style={{ textAlign: 'right' }}>₩{formatNumber(item.aging365)}</td>
            <td>{formatDate(item.lastCollectionDate)}</td>
            <td style={{ textAlign: 'center' }}>
              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(item) }}>
                상세
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### 1.5 위험도 Badge 컴포넌트

**참조**: `ExpiryStockView.tsx` 라인 125-134

```tsx
const getRiskBadge = (riskLevel: string) => {
  if (riskLevel === 'high') {
    return <span style={{ padding: '2px 8px', background: '#ef4444', color: 'white', borderRadius: 4, fontSize: 11 }}>고위험</span>
  } else if (riskLevel === 'medium') {
    return <span style={{ padding: '2px 8px', background: '#f59e0b', color: 'white', borderRadius: 4, fontSize: 11 }}>중위험</span>
  } else if (riskLevel === 'low') {
    return <span style={{ padding: '2px 8px', background: '#10b981', color: 'white', borderRadius: 4, fontSize: 11 }}>저위험</span>
  }
  return <span style={{ padding: '2px 8px', background: '#6b7280', color: 'white', borderRadius: 4, fontSize: 11 }}>-</span>
}
```

---

## 2. Credit Meeting List (채권회의 목록)

### 2.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│ Header: "채권회의 목록"              [+ 새 회의 생성]      │
├─────────────────────────────────────────────────────────┤
│ [회의 카드 리스트]                                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 📅 2025년 1월 채권회의                              │  │
│ │ 일시: 2025-01-15 14:00                             │  │
│ │ 대상 거래처: 45개 | 고위험: 12개 | 중위험: 18개      │  │
│ │ 상태: ✅ 완료                         [회의록 보기]  │  │
│ └────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ 📅 2024년 12월 채권회의                             │  │
│ │ 일시: 2024-12-18 14:00                             │  │
│ │ 대상 거래처: 52개 | 고위험: 15개 | 중위험: 22개      │  │
│ │ 상태: ✅ 완료                         [회의록 보기]  │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 회의 카드 컴포넌트

```tsx
<div className="card" style={{ padding: 16, marginBottom: 12 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
        📅 {meeting.title}
      </h3>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
        일시: {formatDateTime(meeting.meetingDate)}
      </div>
      <div style={{ fontSize: 13, marginTop: 8, display: 'flex', gap: 16 }}>
        <span>대상 거래처: <strong>{meeting.customerCount}</strong>개</span>
        <span style={{ color: '#ef4444' }}>고위험: <strong>{meeting.highRiskCount}</strong>개</span>
        <span style={{ color: '#f59e0b' }}>중위험: <strong>{meeting.mediumRiskCount}</strong>개</span>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span className={`badge ${meeting.status === 'completed' ? 'success' : 'warning'}`}>
        {meeting.status === 'completed' ? '완료' : '진행중'}
      </span>
      <button className="button primary" onClick={() => openMeeting(meeting.id)}>
        회의록 보기
      </button>
    </div>
  </div>
</div>
```

---

## 3. Credit Meeting Detail (채권회의 상세)

### 3.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│ Header: "2025년 1월 채권회의"         [회의 종료] [저장] │
├─────────────────────────────────────────────────────────┤
│ [회의 정보 Summary]                                      │
│ 일시: 2025-01-15 14:00 | 참석자: 5명 | 대상: 45개사      │
├─────────────────────────────────────────────────────────┤
│ [필터]                                                   │
│ 위험도: [전체▼] 영업사원: [전체▼] 의견상태: [전체▼]      │
├─────────────────────────────────────────────────────────┤
│ [거래처 목록 테이블]                                      │
│ #│위험│거래처명│영업사원│총채권│만기도과│의견상태│액션    │
│ 1│🔴 │ABC상사│홍길동 │50M │10M   │✅완료 │[의견]    │
│ 2│🟡 │XYZ마트│김철수 │30M │5M    │📝작성중│[의견]    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 거래처 행 클릭 시 → 영업의견 입력 패널 (슬라이드)

```
┌─────────────────────────────────────────────────────────┐
│ [← 뒤로] ABC 상사 - 영업의견 입력                         │
├─────────────────────────────────────────────────────────┤
│ [채권 현황 요약]                                          │
│ 총채권: 50M | 만기도과: 10M | 30일: 20M | 60일: 15M      │
│ 최근 3회 수금: 2024-12-15 (5M), 2024-11-20 (3M), ...   │
├─────────────────────────────────────────────────────────┤
│ [영업의견 입력 폼]                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📝 수금 약속 내용                                    │ │
│ │ [텍스트 에리어 - 필수]                               │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💬 고객 반응 및 신용상태                             │ │
│ │ [텍스트 에리어 - 필수]                               │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📊 직전 대비 개선/악화 사유                           │ │
│ │ [텍스트 에리어]                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ 매출 중단 여부 영향                               │ │
│ │ ○ 영향 없음  ● 일부 영향  ○ 심각한 영향             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                      [취소] [저장]      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Unblocking Request Form (매출통제 해제 요청서)

### 4.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│ Header: "매출통제 해제 요청"                              │
├─────────────────────────────────────────────────────────┤
│ [거래처 선택]                                             │
│ 거래처: [ABC 상사 ▼]                                     │
├─────────────────────────────────────────────────────────┤
│ [자동 생성 데이터 - 읽기 전용]                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📊 채권 현황 (2025-01-20 기준)                       │ │
│ │ • 총채권액: ₩50,000,000                             │ │
│ │ • 총채권연령: 45일 (Weighted Average)                │ │
│ │ • 만기도과: ₩10,000,000 (20%)                       │ │
│ │ • Aging 구간:                                       │ │
│ │   - 1개월: ₩20,000,000                             │ │
│ │   - 2개월: ₩15,000,000                             │ │
│ │   - 3개월: ₩5,000,000                              │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💰 최근 3회 수금 내역                                │ │
│ │ • 2024-12-15: ₩5,000,000                           │ │
│ │ • 2024-11-20: ₩3,000,000                           │ │
│ │ • 2024-10-18: ₩4,000,000                           │ │
│ │ 합계: ₩12,000,000                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📈 최근 3개월 평균 매출                              │ │
│ │ ₩25,000,000 / 월                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🗒️ 직전 채권회의 의견 (2024-12-18)                  │ │
│ │ "고객사 자금 사정 어려움. 1월 중순 입금 약속."        │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [영업사원 작성 영역]                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📝 해제 요청 사유 (필수)                             │ │
│ │ [텍스트 에리어]                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💵 수금 계획 (필수)                                  │ │
│ │ 예상 수금일: [2025-01-25]                           │ │
│ │ 예상 금액: [₩10,000,000]                            │ │
│ │ 근거: [텍스트 에리어]                                │ │
│ └─────────────────────────────────────────────────────┘ │
│                                      [취소] [제출]      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Unblocking Approval Screen (해제 승인 화면 - 본부장/CEO)

### 5.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│ Header: "매출통제 해제 승인"                              │
├─────────────────────────────────────────────────────────┤
│ [대기중인 요청 목록]                                      │
│ #│거래처 │영업사원│총채권│요청일   │상태    │액션         │
│ 1│ABC상사│홍길동 │50M │2025-01-20│대기중  │[검토]       │
│ 2│XYZ마트│김철수 │30M │2025-01-19│본부장승인│[최종승인]  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 검토 패널 (모달 또는 슬라이드)

```
┌─────────────────────────────────────────────────────────┐
│ [← 뒤로] ABC 상사 - 해제 요청 검토                        │
├─────────────────────────────────────────────────────────┤
│ [요청 정보]                                               │
│ 요청자: 홍길동 (영업1팀)                                  │
│ 요청일시: 2025-01-20 15:30                               │
├─────────────────────────────────────────────────────────┤
│ [채권 현황 스냅샷] (요청 시점 기준)                        │
│ • 총채권액: ₩50,000,000                                  │
│ • 총채권연령: 45일                                        │
│ • Aging 분포: [그래프 또는 표]                            │
├─────────────────────────────────────────────────────────┤
│ [영업사원 의견]                                           │
│ 해제 사유: [내용 표시]                                    │
│ 수금 계획: 2025-01-25 / ₩10,000,000                     │
│ 근거: [내용 표시]                                         │
├─────────────────────────────────────────────────────────┤
│ [승인자 의견 입력]                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 검토 의견:                                           │ │
│ │ [텍스트 에리어]                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                         [반려] [보완요청] [승인]         │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Customer Credit Detail Panel (거래처 크레딧 상세 패널)

**활용**: AR Dashboard에서 거래처 클릭 시 우측 슬라이드 패널 또는 모달

### 6.1 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│ [← 닫기] ABC 상사 (거래처코드: C12345)                    │
├─────────────────────────────────────────────────────────┤
│ [섹션 1] 연체현황 Summary                                 │
│ • 총채권액: ₩50,000,000                                  │
│ • 총채권연령: 45일 (Weighted)                             │
│ • 위험도: 🔴 고위험                                       │
├─────────────────────────────────────────────────────────┤
│ [섹션 2] Aging Bucket 그래프                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │      [막대 그래프]                                   │ │
│ │ 만기도과: ████ 10M                                   │ │
│ │ 1개월: ████████ 20M                                 │ │
│ │ 2개월: ██████ 15M                                   │ │
│ │ 3개월: ██ 5M                                        │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [섹션 3] 최근 3회 수금                                    │
│ • 2024-12-15: ₩5,000,000                                │
│ • 2024-11-20: ₩3,000,000                                │
│ • 2024-10-18: ₩4,000,000                                │
│ 합계: ₩12,000,000                                       │
├─────────────────────────────────────────────────────────┤
│ [섹션 4] 최근 12개월 수금 그래프                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [라인 차트 또는 막대 차트]                            │ │
│ │ 2024-01: 3M | 2024-02: 5M | ... | 2024-12: 5M      │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [섹션 5] 최근 3개월 평균 매출                             │
│ ₩25,000,000 / 월                                        │
├─────────────────────────────────────────────────────────┤
│ [섹션 6] 최근 거래내역 (최근 5건)                          │
│ 날짜      │품목명     │수량 │단가     │금액              │
│ 2025-01-15│제품A     │100 │50,000  │5,000,000        │
│ 2025-01-10│제품B     │50  │100,000 │5,000,000        │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│ [섹션 7] 직전 회의 의견 (2024-12-18)                      │
│ 영업사원: "고객사 자금 사정 어려움. 1월 중순 입금 약속."    │
│ 본부장: "수금 모니터링 강화 필요"                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. UI 공통 스타일 가이드

### 7.1 색상 체계

**참조**: 유통기한재고와 동일한 색상 시스템 사용

```css
/* 위험도 레벨 */
--high-risk: #ef4444;    /* 빨강 - 고위험 */
--medium-risk: #f59e0b;  /* 주황 - 중위험 */
--low-risk: #10b981;     /* 초록 - 저위험 */
--neutral: #6b7280;      /* 회색 - 정보 없음 */

/* 상태 */
--pending: #f59e0b;      /* 대기중 */
--approved: #10b981;     /* 승인 */
--rejected: #ef4444;     /* 반려 */
--completed: #10b981;    /* 완료 */
```

### 7.2 Badge 컴포넌트

```tsx
// 위험도 Badge
<span style={{
  padding: '2px 8px',
  background: '#ef4444',
  color: 'white',
  borderRadius: 4,
  fontSize: 11
}}>
  고위험
</span>

// 상태 Badge
<span style={{
  padding: '2px 8px',
  background: '#f59e0b',
  color: 'white',
  borderRadius: 4,
  fontSize: 11
}}>
  대기중
</span>
```

### 7.3 Summary Card 스타일

```tsx
<div className="card" style={{
  padding: 12,
  borderLeft: '3px solid #ef4444' // 위험도에 따라 색상 변경
}}>
  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
    타이틀 (건수)
  </div>
  <div style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>
    ₩금액
  </div>
</div>
```

### 7.4 반응형 그리드

```css
/* 4개 그리드 - Summary Cards */
gridTemplateColumns: 'repeat(4, 1fr)'

/* 3개 그리드 - 필터 */
gridTemplateColumns: 'repeat(3, 1fr)'

/* 2개 그리드 - 모바일 */
@media (max-width: 768px) {
  gridTemplateColumns: 'repeat(2, 1fr)'
}
```

---

## 8. 인터랙션 플로우

### 8.1 AR Dashboard → 거래처 상세

```
사용자가 테이블 행 클릭
  → 우측에서 슬라이드 패널 등장 (Customer Credit Detail Panel)
  → 7개 섹션 표시 (연체현황, Aging, 수금내역, 그래프 등)
  → [닫기] 버튼 클릭 시 패널 사라짐
```

### 8.2 채권회의 → 영업의견 입력

```
회의 상세 화면에서 거래처 행 클릭
  → 영업의견 입력 패널 슬라이드 (또는 모달)
  → 4가지 필수 입력 항목 작성
  → [저장] 클릭 → 의견 상태 "완료"로 변경
```

### 8.3 해제 요청 → 승인 프로세스

```
영업사원: 해제 요청서 작성 → 제출
  → 본부장: 승인 화면에서 "대기중" 표시
  → 본부장: [검토] 클릭 → 검토 패널
  → 본부장: [승인] → 상태 "본부장 승인"
  → CEO: 최종 승인 화면에서 확인
  → CEO: [최종승인] → 상태 "해제완료"
  → 시스템: 매출통제 자동 해제 처리
```

---

## 9. 구현 우선순위

### Phase 1 (MVP)
1. ✅ AR Aging Dashboard (Summary Cards + 필터 + 테이블)
2. ✅ Customer Credit Detail Panel (7개 섹션)
3. ✅ Credit Meeting List

### Phase 2
4. ✅ Credit Meeting Detail + 영업의견 입력
5. ✅ Unblocking Request Form

### Phase 3
6. ✅ Unblocking Approval Screen (본부장/CEO)
7. ✅ 히스토리 조회 기능

---

## 10. 참조 코드 매핑

| 화면 | 참조 컴포넌트 | 라인 |
|------|--------------|------|
| Summary Cards | `ExpiryStockView.tsx` | 141-158 |
| 필터 영역 | `ExpiryStockView.tsx` | 161-232 |
| 데이터 테이블 | `ExpiryStockView.tsx` | 242-286 |
| Badge 컴포넌트 | `ExpiryStockView.tsx` | 125-134 |
| 포맷 함수 | `ExpiryStockView.tsx` | 110-123 |

---

**작성일**: 2025-01-22
**작성자**: Claude Code
**버전**: v1.0
