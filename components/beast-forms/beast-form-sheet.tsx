import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { CardMarkdown } from '@/components/ui/card-markdown'
import type { BeastFormPage } from './page-layout'
import './beast-forms.css'

const TIER_LEVELS = { 1: '等级 1', 2: '等级 2–4', 3: '等级 5–7', 4: '等级 8–10' }

export function BeastFormSheet({ page, pageIndex, pageCount, navigation }: {
  page: BeastFormPage
  pageIndex: number
  pageCount: number
  navigation?: ReactNode
}) {
  return (
    <section className="a4-page beast-form-sheet" aria-label={`野兽形态第 ${pageIndex + 1} 页，共 ${pageCount} 页`}>
      <PageHeader />
      <div className="beast-form-heading">
        <div><h1>野兽形态</h1><p>德鲁伊形态参考表</p></div>
        <div className="beast-form-tier-heading">位阶 {page.tier}<span>{TIER_LEVELS[page.tier]} · {page.forms.length} 种形态</span></div>
      </div>
      {navigation ?? <div className="beast-form-pagination-spacer" aria-hidden="true" />}
      <p className="beast-form-rule"><strong>变形：</strong>标记 1 压力点，变为位阶不高于你的野兽形态；你可以随时解除形态。完整变形规则见德鲁伊职业卡。</p>
      <div className="beast-form-table-heading" aria-hidden="true"><span>形态 / 属性 / 攻击 / 优势</span><span>形态特性</span></div>
      <div className="beast-form-entries">
        {page.forms.map(form => <article key={form.id} className="beast-form-entry" data-form-id={form.id}>
          <div className="beast-form-identity">
            <h2>{form.name}</h2><div className="beast-form-examples">{form.examples}</div>
            <dl className="beast-form-stats">
              {([['attributes', '属性'], ['attack', '攻击'], ['advantages', '优势']] as const).map(([key, label]) => form[key] !== undefined &&
                <div key={key}><dt>{label}</dt><dd><CardMarkdown>{form[key] || '—'}</CardMarkdown></dd></div>)}
            </dl>
          </div>
          <CardMarkdown className="beast-form-traits">{form.traits}</CardMarkdown>
        </article>)}
      </div>
      <div className="beast-form-sheet-gap" />
      <footer className="beast-form-footer"><span>德鲁伊 · 位阶 {page.tier}</span><span>野兽形态 {pageIndex + 1} / {pageCount}</span></footer>
    </section>
  )
}
