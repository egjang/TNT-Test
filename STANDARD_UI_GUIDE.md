# TNT Sales 표준 UI 개발 가이드

> **신규 UI 개발 시 반드시 참조할 표준 컴포넌트 파일들**

## 빠른 참조 테이블

| 메뉴명 | 파일 경로 | 용도 |
|--------|----------|------|
| **Standard UI 1 (CD)** | `src/features/lab/StandardUICD1.tsx` | Atoms, Molecules, Colors, Typography |
| **Standard UI 2 (CD)** | `src/features/lab/StandardUICD2.tsx` | Modal, List View, Form View 패턴 |
| **Standard UI 3 (CD)** | `src/features/lab/StandardUICD3.tsx` | Progress, Toast, Loading, Validation |
| **Standard Navigation 1** | `src/features/lab/StandardNavigation1.tsx` | State Machine, 화면 전환 패턴 |
| **Standard Navigation 2** | `src/features/lab/StandardNavigation2.tsx` | LIST/VIEW/EDIT/ANALYSIS 레이아웃 |
| **Standard Navigation 3** | `src/features/lab/StandardNavigation3.tsx` | UX 원칙, 반응형, 키보드 단축키 |

---

## 1. Standard UI 1 (CD) - 기초 컴포넌트

### Atoms (원자)
- **Button**: `btn-primary`, `btn-secondary`, `btn-ghost`, `disabled`
- **Input**: text, disabled, number
- **Card**: `card-header`, `card-body` 구조
- **Badge**: default, `badge-primary`, `badge-success`, `badge-warning`, `badge-error`

### Molecules (분자)
- **Select - Dropdown**: 5개 이상 옵션
- **Select - Radio**: 2~5개 옵션 (세로/가로)
- **Select - Button Group**: 연결형, 분리형, 캡슐형
- **Select - Checkbox**: 다중 선택
- **Search Input**: 아이콘 포함

### CSS 변수 (테마)
```css
--primary          /* 주요 버튼, 링크, 강조 */
--secondary        /* 보조 버튼, 텍스트 */
--success          /* 성공 상태 */
--warning          /* 경고 상태 */
--error            /* 에러 상태 */
--bg-primary       /* 메인 배경 */
--bg-secondary     /* 섹션 배경 */
--text-primary     /* 주요 텍스트 */
--text-secondary   /* 보조 텍스트 */
--border           /* 테두리 */
```

### Typography

#### 표준 폰트: Pretendard
```css
/* 폰트 설정 */
font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* CDN 로드 (index.html) */
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
```

#### 폰트 크기 및 두께
| 레벨 | 크기 | 두께 | 용도 |
|------|------|------|------|
| Heading 1 | 32px | 700 | 페이지 제목 |
| Heading 2 | 24px | 700 | 섹션 제목 |
| Heading 3 | 20px | 600 | 카드 제목 |
| Heading 4 | 16px | 600 | 폼 섹션 제목 |
| Body | 14px | 400 | 본문, 입력 필드 |
| Small | 12px | 400 | 보조 텍스트, 라벨 |
| Caption | 11px | 400 | 힌트, 타임스탬프 |

#### 숫자/코드용 폰트
```css
/* 견적번호, 금액 등 숫자 데이터 */
font-family: 'Pretendard', monospace;
font-variant-numeric: tabular-nums;  /* 고정폭 숫자 */
```

---

## 2. Standard UI 2 (CD) - 화면 패턴

### Modal 패턴
```jsx
<div className="modal-overlay">
  <div className="modal">
    <div className="modal-header">제목</div>
    <div className="modal-body">내용</div>
    <div className="modal-footer">
      <button className="btn btn-secondary">취소</button>
      <button className="btn btn-primary">확인</button>
    </div>
  </div>
</div>
```

### List View 구조
```
┌─────────────────────────────────────┐
│ 검색 조건 영역 (4열 그리드)           │
│ background: var(--bg-secondary)     │
├─────────────────────────────────────┤
│ 툴바: [건수 N건] [Excel] [신규등록]   │
├─────────────────────────────────────┤
│ □ | 컬럼1 | 컬럼2 | 컬럼3 | ...      │
│ ☑ | 데이터 | 데이터 | 데이터 | ...    │
├─────────────────────────────────────┤
│      [<<] [<] [1] [2] [3] [>] [>>]   │
└─────────────────────────────────────┘
```

### Form View
- 2열 레이아웃
- Label + Input 구조
- 검증 메시지 표시

---

## 3. Standard UI 3 (CD) - 고급 패턴

- **Progress Bar**: Basic, Success, Warning, Error 색상
- **Toast Notification**: 성공/정보/경고/에러 타입, 자동 닫힘
- **Loading State**: Spinner, Skeleton, Overlay
- **Empty State**: 데이터 없음, 검색 결과 없음, 에러 상태
- **Validation**: Input 검증 메시지, 필드 에러 표시
- **File Upload**: 드래그 & 드롭, 파일 목록, 진행률

---

## 4. Standard Navigation 1 - State Machine

### 화면 상태 (States)
```typescript
type ScreenState = 'list' | 'view' | 'edit' | 'analysis' | 'insight'
```

### 레이아웃 패턴
| 패턴 | 설명 | 용도 |
|------|------|------|
| Master-Detail | 목록 → 상세 | 기본 CRUD |
| Split Panel | 좌우 분할 | 목록 + 상세 동시 |
| Inline Edit | 표 내 편집 | 빠른 수정 |
| Modal Dialog | 팝업 편집 | 복잡한 폼 |

---

## 5. Standard Navigation 2 - 화면별 레이아웃

### LIST (목록)
- 검색 조건: 4열 그리드
- 테이블 툴바: 좌측 건수, 우측 버튼
- 페이지네이션: 중앙 정렬

### VIEW (상세)
- Split Panel: 좌측 목록 + 우측 상세
- 2열 readonly 레이아웃

### EDIT (편집)
- 폼 필드 + 검증 메시지
- 저장/취소 버튼

### ANALYSIS (분석)
- 필터 + 차트 영역 + 지표

### INSIGHT (AI)
- 슬라이드 패널 + AI 분석 결과

---

## 6. Standard Navigation 3 - UX 원칙

### 핵심 원칙
1. **Context Preservation**: 스크롤/필터 상태 유지, 뒤로가기
2. **Progressive Disclosure**: 기본 정보 먼저, 상세는 요청 시
3. **Consistency**: 같은 기능 = 같은 UI
4. **Feedback**: 로딩/성공/실패 표시

### 반응형
| 기기 | 너비 | 레이아웃 |
|------|------|----------|
| Desktop | 1200px+ | 3컬럼 |
| Tablet | 768~1199px | 2컬럼 |
| Mobile | <768px | 1컬럼 |

### 키보드 단축키
```
Ctrl+K    → 검색
Ctrl+S    → 저장
Ctrl+N    → 신규 등록
Esc       → 닫기/취소
Tab       → 포커스 이동
Enter     → 확인
Delete    → 삭제
```

---

## 7. 신규 UI 개발 체크리스트

### 1단계: 기초 (StandardUICD1 참조)
- [ ] Button 스타일 결정
- [ ] Input 타입 결정
- [ ] Color 변수 사용
- [ ] Typography 레벨 결정

### 2단계: 패턴 (StandardUICD2 참조)
- [ ] 화면 타입 결정 (List/Form/Modal)
- [ ] 검색 조건 구성
- [ ] 테이블 컬럼 설계
- [ ] 모달 vs 인라인 편집 결정

### 3단계: 고급 (StandardUICD3 참조)
- [ ] 로딩 상태 표시
- [ ] 에러/성공 Toast
- [ ] Validation 메시지
- [ ] Empty State 처리

### 4단계: UX (Navigation 1~3 참조)
- [ ] State Machine 설계
- [ ] 키보드 단축키
- [ ] 반응형 레이아웃
- [ ] 접근성 (ARIA)

---

## 8. 코드 예제

### List View 기본 구조
```tsx
export function MyListView() {
  const [searchParams, setSearchParams] = useState({
    name: '',
    status: 'all',
  })
  const [data, setData] = useState([])
  const [page, setPage] = useState(1)

  return (
    <div style={{ padding: 24 }}>
      {/* 검색 영역 */}
      <div style={{
        padding: 16,
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        marginBottom: 24
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <input className="input" placeholder="이름" />
          <select className="input">...</select>
          <input className="input" type="date" />
          <button className="btn btn-primary">검색</button>
        </div>
      </div>

      {/* 테이블 툴바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span>총 {data.length}건</span>
        <div>
          <button className="btn btn-secondary">Excel</button>
          <button className="btn btn-primary">신규등록</button>
        </div>
      </div>

      {/* 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)' }}>
            <th><input type="checkbox" /></th>
            <th>컬럼1</th>
            <th>컬럼2</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td><input type="checkbox" /></td>
              <td>{item.col1}</td>
              <td>{item.col2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button className="btn btn-ghost">{'<<'}</button>
        <button className="btn btn-ghost">{'<'}</button>
        <button className="btn btn-primary">1</button>
        <button className="btn btn-ghost">2</button>
        <button className="btn btn-ghost">{'>'}</button>
        <button className="btn btn-ghost">{'>>'}</button>
      </div>
    </div>
  )
}
```

---

## Claude Code 개발 지침

신규 UI 개발 요청 시 "표준 UI 적용해서 개발해줘"라고 하면:

1. 위 6개 표준 파일을 먼저 읽어서 패턴 파악
2. 해당 화면에 맞는 패턴 선택 (List/Form/Modal 등)
3. CSS 변수 기반 스타일 적용
4. State Machine 기반 상태 관리
5. 키보드 단축키 및 반응형 고려
