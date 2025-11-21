export const tone = {
  // Generic labels
  loading: '불러오는 중…',
  refreshing: '새로 고치는 중…',
  fetching: '조회 중…',
  empty: '표시할 데이터가 없습니다',
  errorGeneric: '문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
  loginRequired: '로그인이 필요합니다',

  // Actions
  action: {
    refresh: '새로고침',
    search: '조회',
    save: '저장',
    register: '등록',
    addToPlan: '방문일정수립',
    cancelVisit: '방문취소',
    simulate: 'Simulation',
    sendKakao: '카카오톡 전송',
    login: '로그인',
    logout: '로그아웃',
  },

  // Area titles
  title: {
    work: '업무',
    rightPanel: '우측 패널',
    demandTargets: '내 거래처 수요 미수립 목록',
    demandCharts: '중분류별 경쟁사·관리단위 점유율',
    visitTargets: '방문 일정 대상',
    missingTx: '거래미발생 · 내 거래처',
  },

  // Hints & notifications
  hint: {
    shareInput: '예: 0.25 또는 25',
    sharePreview: (p: number) => `입력값: ${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`,
  },
}

