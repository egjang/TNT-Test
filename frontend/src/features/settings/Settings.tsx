import React, { useEffect, useMemo, useState } from 'react'
import { getMenuVisibility, isMenuEnabled, setMenuEnabled, onMenuVisibilityChange } from '../../config/menuVisibility'
import { getAllMenuItems } from '../menu/items'

type Item = { key: string; label: string; children?: Item[] }

export function Settings() {
  const [allItems, setAllItems] = useState<Item[]>(() => getAllMenuItems() as Item[])
  const [visibility, setVisibility] = useState(getMenuVisibility())

  useEffect(() => {
    const off = onMenuVisibilityChange(() => setVisibility(getMenuVisibility()))
    return off
  }, [])

  function toggleKey(key: string) {
    const next = !isMenuEnabled(key)
    setMenuEnabled(key, next)
    setVisibility(getMenuVisibility())
  }

  return (
    <section>
      <h1>설정</h1>
      <p className="muted">좌측 메뉴(1, 2 레벨)를 표시/숨김으로 제어합니다. 모든 사용자에게 동일하게 적용됩니다(임시: 로컬 저장소 기반).</p>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: '12px 0' }}>메뉴 표시 설정</h3>
            <button className="btn" onClick={() => setAllItems(getAllMenuItems() as Item[])}>메뉴 다시 읽기</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {allItems.map((it) => (
              <li key={it.key} style={{ marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={isMenuEnabled(it.key)}
                    onChange={() => toggleKey(it.key)}
                  />
                  <strong>{it.label}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>({it.key})</span>
                </label>
                {it.children?.length ? (
                  <ul style={{ listStyle: 'none', padding: '6px 0 0 22px', margin: 0 }}>
                    {it.children.map((c) => (
                      <li key={c.key} style={{ marginBottom: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={isMenuEnabled(c.key)}
                            onChange={() => toggleKey(c.key)}
                          />
                          <span>{c.label}</span>
                          <span className="muted" style={{ fontSize: 12 }}>({c.key})</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
