import React from 'react'

/**
 * Standard UI 3 (CD) - 고급 패턴
 * Progress, Toast, Loading, Empty State, Validation, File Upload, Data Display, Shortcuts
 */
export function StandardUICD3() {
  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', background: 'var(--panel)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Standard UI 3 (CD)
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        고급 패턴 - Progress, Toast, Loading, Empty State, Validation, File Upload, Data Display
      </p>

      {/* Progress Bar Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Progress Bar - 진행률 표시
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Basic Progress Bar */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Basic Progress Bar (기본 진행률)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              작업의 진행 상태를 시각적으로 표시합니다.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {/* 35% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>데이터 로딩</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>35%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '35%', height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              {/* 70% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>처리 중</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>70%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '70%', height: '100%', background: 'var(--primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              {/* 100% */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>완료</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>100%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--success)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>
            <pre style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
{`// Basic Progress Bar
<div className="progress-wrapper">
  <div className="progress-label">
    <span>데이터 로딩</span>
    <span>35%</span>
  </div>
  <div className="progress-track">
    <div className="progress-bar" style={{ width: '35%' }} />
  </div>
</div>`}
            </pre>
          </div>

          {/* Progress Bar Colors */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Progress Bar Colors (색상 변형)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Primary</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Success</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--success)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Warning</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '75%', height: '100%', background: 'var(--warning)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, minWidth: 60, color: 'var(--text-secondary)' }}>Error</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: '30%', height: '100%', background: 'var(--error)', borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Step Progress */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Step Progress (단계 진행률)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              프로세스의 단계별 진행 상태를 표시합니다.
            </p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 20px' }}>
                <div style={{ position: 'absolute', left: 60, right: 60, top: '50%', height: 2, background: 'var(--bg-secondary)', transform: 'translateY(-50%)' }}>
                  <div style={{ width: '66%', height: '100%', background: 'var(--primary)' }} />
                </div>
                {[
                  { label: '주문접수', status: 'completed' },
                  { label: '결제완료', status: 'completed' },
                  { label: '배송중', status: 'current' },
                  { label: '배송완료', status: 'pending' },
                ].map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600,
                      background: step.status === 'completed' ? 'var(--success)' : step.status === 'current' ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: step.status === 'pending' ? 'var(--text-secondary)' : 'var(--on-accent)',
                      border: step.status === 'current' ? '3px solid var(--primary)' : 'none', boxSizing: 'border-box'
                    }}>
                      {step.status === 'completed' ? '✓' : idx + 1}
                    </div>
                    <span style={{ fontSize: 12, color: step.status === 'pending' ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: step.status === 'current' ? 600 : 400 }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Circular Progress */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Circular Progress (원형 진행률)</h3>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { percent: 25, color: 'var(--error)', label: '미달' },
                { percent: 50, color: 'var(--warning)', label: '진행중' },
                { percent: 75, color: 'var(--primary)', label: '양호' },
                { percent: 100, color: 'var(--success)', label: '달성' },
              ].map((item, idx) => (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="40" cy="40" r="35" fill="none" stroke="var(--bg-secondary)" strokeWidth="6" />
                      <circle cx="40" cy="40" r="35" fill="none" stroke={item.color} strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 35 * item.percent / 100} ${2 * Math.PI * 35}`}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 16, fontWeight: 600 }}>{item.percent}%</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Toast / Notification Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Toast / Notification - 알림 메시지
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Toast Types (토스트 유형)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {/* Success Toast */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--success)', borderLeft: '4px solid var(--success)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>저장 완료</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>데이터가 성공적으로 저장되었습니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
              {/* Error Toast */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--error)', borderLeft: '4px solid var(--error)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>!</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>오류 발생</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>요청을 처리하는 중 오류가 발생했습니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
              {/* Warning Toast */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--warning)', borderLeft: '4px solid var(--warning)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>⚠</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>주의</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>세션이 10분 후 만료됩니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
              {/* Info Toast */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', fontSize: 14 }}>i</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>알림</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>새로운 업데이트가 있습니다.</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)' }}>✕</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>유형</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>사용 시점</th>
                  <th style={{ border: '1px solid var(--border)', padding: '10px 12px', textAlign: 'left' }}>지속 시간</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--success)' }}>Success</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>저장, 삭제, 전송 완료</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>3초</td></tr>
                <tr><td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--error)' }}>Error</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>API 오류, 유효성 검사 실패</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>수동 닫기</td></tr>
                <tr><td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--warning)' }}>Warning</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>세션 만료, 권한 경고</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>5초</td></tr>
                <tr><td style={{ border: '1px solid var(--border)', padding: '10px 12px', fontWeight: 500, color: 'var(--primary)' }}>Info</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>안내, 업데이트 알림</td><td style={{ border: '1px solid var(--border)', padding: '10px 12px' }}>3초</td></tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Loading / Skeleton Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Loading / Skeleton - 로딩 상태
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Spinner */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Spinner (스피너)</h3>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--bg-secondary)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Small</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 24, height: 24, border: '3px solid var(--bg-secondary)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Medium</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '4px solid var(--bg-secondary)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Large</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--panel)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13 }}>로딩 중...</span>
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          {/* Skeleton */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Skeleton (스켈레톤)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Card Skeleton</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-secondary)', animation: 'pulse 2s infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 14, width: '60%', background: 'var(--bg-secondary)', borderRadius: 4, marginBottom: 8, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '80%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                  </div>
                </div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Table Skeleton</p>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ height: 12, width: '20%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '30%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '25%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                    <div style={{ height: 12, width: '25%', background: 'var(--bg-secondary)', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                  </div>
                ))}
              </div>
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          </div>

        </div>
      </section>

      {/* Empty State Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Empty State - 빈 상태
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Empty State Types (빈 상태 유형)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 데이터가 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>새로운 항목을 등록해 주세요.</div>
                <button className="btn btn-primary">+ 신규 등록</button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🔍</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>검색 결과가 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>다른 검색어로 시도해 보세요.</div>
                <button className="btn btn-secondary">검색 조건 초기화</button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>⚠️</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--error)' }}>데이터를 불러올 수 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>네트워크 연결을 확인해 주세요.</div>
                <button className="btn btn-secondary">다시 시도</button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🔒</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>접근 권한이 없습니다</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>관리자에게 권한을 요청하세요.</div>
                <button className="btn btn-secondary">권한 요청</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Validation Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Form Validation - 폼 유효성 검사
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Validation States (유효성 검사 상태)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>기본 상태</label>
                <input type="text" className="input" placeholder="입력하세요" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>오류 상태</label>
                <input type="text" className="input" defaultValue="잘못된 입력" style={{ width: '100%', borderColor: 'var(--error)' }} />
                <span style={{ fontSize: 11, color: 'var(--error)', marginTop: 4, display: 'block' }}>올바른 형식으로 입력해주세요.</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>성공 상태</label>
                <input type="text" className="input" defaultValue="올바른 입력" style={{ width: '100%', borderColor: 'var(--success)' }} />
                <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 4, display: 'block' }}>✓ 사용 가능합니다.</span>
              </div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>필수 입력 표시</h4>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>이름 <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" className="input" placeholder="필수 입력" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>비고 <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>(선택)</span></label>
                <input type="text" className="input" placeholder="선택 입력" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Display Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Data Display - 데이터 표시
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>

          {/* Statistics Cards */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Statistics Cards (통계 카드)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>총 매출</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>₩12.5억</div>
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>▲ 12.5% vs 전월</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>신규 거래처</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>127건</div>
                <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>▼ 3.2% vs 전월</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>처리 대기</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning)' }}>23건</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>긴급 5건 포함</div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--panel)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>목표 달성률</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>87%</div>
                <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: '87%', height: '100%', background: 'var(--success)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Timeline (타임라인)</h3>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, maxWidth: 500 }}>
              {[
                { time: '2024-03-20 14:30', title: '주문 완료', desc: '주문번호: ORD-2024-0320', status: 'success' },
                { time: '2024-03-20 10:15', title: '결제 승인', desc: '신용카드 결제', status: 'success' },
                { time: '2024-03-19 16:45', title: '견적서 발송', desc: '이메일 발송 완료', status: 'info' },
                { time: '2024-03-18 09:00', title: '상담 접수', desc: '제품 문의', status: 'default' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 12, paddingBottom: idx < 3 ? 16 : 0, position: 'relative' }}>
                  {idx < 3 && <div style={{ position: 'absolute', left: 7, top: 20, width: 2, height: 'calc(100% - 8px)', background: 'var(--border)' }} />}
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    background: item.status === 'success' ? 'var(--success)' : item.status === 'info' ? 'var(--primary)' : 'var(--bg-secondary)',
                    border: item.status === 'default' ? '2px solid var(--border)' : 'none'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Keyboard Shortcuts Section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, borderBottom: '2px solid var(--primary)', paddingBottom: 8 }}>
          Keyboard Shortcuts - 키보드 단축키
        </h2>
        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Standard Shortcuts (표준 단축키)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600 }}>일반</div>
                <div style={{ padding: 12 }}>
                  {[
                    { key: 'Ctrl + S', action: '저장' },
                    { key: 'Ctrl + N', action: '신규 등록' },
                    { key: 'Ctrl + F', action: '검색' },
                    { key: 'Esc', action: '취소 / 닫기' },
                    { key: 'Enter', action: '확인 / 실행' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < 4 ? '1px solid var(--border)' : 'none' }}>
                      <kbd style={{ padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{item.key}</kbd>
                      <span style={{ fontSize: 13 }}>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontSize: 12, fontWeight: 600 }}>테이블/목록</div>
                <div style={{ padding: 12 }}>
                  {[
                    { key: '↑ / ↓', action: '행 이동' },
                    { key: 'Space', action: '행 선택' },
                    { key: 'Ctrl + A', action: '전체 선택' },
                    { key: 'Delete', action: '선택 삭제' },
                    { key: 'Ctrl + E', action: 'Excel 내보내기' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < 4 ? '1px solid var(--border)' : 'none' }}>
                      <kbd style={{ padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{item.key}</kbd>
                      <span style={{ fontSize: 13 }}>{item.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
