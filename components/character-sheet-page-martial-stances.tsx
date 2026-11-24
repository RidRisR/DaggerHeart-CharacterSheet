'use client'

import type { KeyboardEvent } from 'react'
import { PageHeader } from '@/components/page-header'
import { CardMarkdown } from '@/components/ui/card-markdown'
import { useSheetStore } from '@/lib/sheet-store'
import { showFadeNotification } from '@/components/ui/fade-notification'
import { getCharacterTier, parseCharacterLevel } from '@/character/progression/tiers'
import { MARTIAL_STANCES, MARTIAL_STANCE_TIERS, MARTIAL_STANCE_RULES, MAX_FOCUS } from '@/character/martial-stances/catalog'
import { hasBattleFlow, nextAvailableStressSlot, type MartialStanceAction } from '@/character/martial-stances/actions'
import { MARTIAL_STANCE_STYLES } from './martial-stances/styles'

export default function CharacterSheetPageMartialStances() {
  const sheet = useSheetStore(state => state.sheetData)
  const update = useSheetStore(state => state.updateMartialStances)
  const state = sheet.martialStances
  const level = parseCharacterLevel(sheet.level)
  const tier = Number(getCharacterTier(sheet.level) ?? 0)
  const capacity = level === undefined ? 0 : level + 1
  const battleFlow = hasBattleFlow(sheet)
  const canMarkStress = battleFlow && nextAvailableStressSlot(sheet) >= 0
  const active = MARTIAL_STANCES.find(stance => stance.id === state.active)
  const act = (action: MartialStanceAction) => {
    const result = update(action)
    if (!result.ok) showFadeNotification({ message: result.error, type: 'error' })
  }
  const onMarkKey = (event: KeyboardEvent<HTMLDivElement>, action: MartialStanceAction) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      act(action)
    }
  }

  return (
    <section className="a4-page martial-stance-sheet" aria-label="武术架势记录表">
      <style>{MARTIAL_STANCE_STYLES}</style>
      <PageHeader />
      <header className="martial-stance-heading">
        <div><h1>武术架势 <span>MARTIAL STANCES</span></h1><p>武艺达人 · 架势与专注记录表</p></div>
        <div className="martial-stance-character"><strong>{sheet.name || '我的角色'}</strong><span>等级 {sheet.level || '—'} · 位阶 {tier || '—'}</span></div>
      </header>

      <div className="martial-stance-tracker">
        <div>
          <div className="martial-stance-tracker-label"><h2>专注点 <span>FOCUS</span></h2><strong aria-live="polite">{state.focus} / {MAX_FOCUS}</strong></div>
          <div className="martial-stance-focus" role="group" aria-label="专注点">
            {Array.from({ length: MAX_FOCUS }, (_, index) => {
              const action = { type: 'focus' as const, value: state.focus === index + 1 ? 0 : index + 1 }
              return <div key={index} role="checkbox" aria-label={`专注第${index + 1}点`} aria-checked={index < state.focus} data-state={index < state.focus ? 'checked' : 'unchecked'} tabIndex={0}
                onClick={() => act(action)} onKeyDown={event => onMarkKey(event, action)}>{index < state.focus ? '●' : ''}</div>
            })}
            <button type="button" className="print:hidden" onClick={() => act({ type: 'focus', value: 0 })}>清空专注</button>
          </div>
        </div>
        <div className="martial-stance-current">
          <div className="martial-stance-tracker-label"><h2>当前架势</h2><button type="button" className="print:hidden" disabled={!active} onClick={() => act({ type: 'drop' })}>退出架势</button></div>
          <strong aria-live="polite">{active ? `${active.name} · ${active.english}` : '无激活架势'}</strong>
          <span className="martial-stance-write-in" aria-hidden="true" />
          <span>{battleFlow ? '转入花费 1 专注点，或用战斗心流标记 1 压力点' : '转入花费 1 专注点'} · 同时仅可激活一种</span>
        </div>
      </div>

      <div className="martial-stance-learning"><span>圆圈标记已掌握的架势</span><strong>已掌握 {state.known.length} / {capacity || '—'}</strong><span>首次位阶 1 选两种，之后每升一级再选一种</span></div>
      <div className="martial-stance-tiers">
        {MARTIAL_STANCE_TIERS.map(stanceTier => (
          <section key={stanceTier} className="martial-stance-tier" aria-label={`位阶 ${stanceTier} 架势`}>
            <h2>位阶 {stanceTier}<span>{['等级 1', '等级 2–4', '等级 5–7', '等级 8–10'][stanceTier - 1]}</span></h2>
            {MARTIAL_STANCES.filter(stance => stance.tier === stanceTier).map(stance => {
              const known = state.known.includes(stance.id)
              const selected = state.active === stance.id
              return <article key={stance.id} className={selected ? 'martial-stance-entry is-active' : 'martial-stance-entry'} data-stance-id={stance.id}>
                <div className="martial-stance-entry-heading">
                  <div role="checkbox" aria-label={`掌握${stance.name}`} aria-checked={known} data-state={known ? 'checked' : 'unchecked'} tabIndex={0} className="martial-stance-known"
                    onClick={() => act({ type: 'learn', id: stance.id })} onKeyDown={event => onMarkKey(event, { type: 'learn', id: stance.id })}>{known ? '●' : ''}</div>
                  <h3>{stance.name}<span>{stance.english}</span></h3>
                  {selected && <span className="martial-stance-active-label">当前激活</span>}
                  {!selected && <button type="button" className="print:hidden" aria-label={`激活${stance.name}，花费1专注点`} disabled={!known || state.focus < 1 || stance.tier > tier}
                    onClick={() => act({ type: 'activate', id: stance.id })}>激活 · 1 专注</button>}
                  {battleFlow && known && !selected && <button type="button" className="print:hidden" aria-label={`激活${stance.name}，标记1压力点`} disabled={!canMarkStress || stance.tier > tier}
                    onClick={() => act({ type: 'activate', id: stance.id, payment: 'stress' })}>标记 1 压力</button>}
                </div>
                <CardMarkdown className="martial-stance-effect">{stance.effect}</CardMarkdown>
              </article>
            })}
          </section>
        ))}
      </div>
      <div className="martial-stance-rules">
        {MARTIAL_STANCE_RULES.map(rule => <section key={rule.title}><h2>{rule.title}</h2><p>{rule.text}</p></section>)}
      </div>
      <div className="martial-stance-sheet-gap" />
      <footer className="martial-stance-footer"><span>武艺达人 · 武术架势</span><span>16 种架势 · 1 / 1</span></footer>
    </section>
  )
}
