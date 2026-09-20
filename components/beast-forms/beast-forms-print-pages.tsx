'use client'

import { BeastFormSheet } from './beast-form-sheet'
import type { BeastFormPage } from './page-layout'
import { useBeastFormPages, type BeastFormPagesState } from './use-beast-form-pages'
import { PageHeader } from '@/components/page-header'

export function BeastFormsStatus({ state }: { state: Exclude<BeastFormPagesState, { status: 'ready' }> }) {
  return <section className="a4-page beast-form-sheet beast-form-status print:hidden">
    <PageHeader /><h1 className="text-2xl font-bold mb-4">野兽形态</h1>
    {state.status === 'error'
      ? <div role="alert"><p>野兽形态内容读取失败，请检查卡牌内容后重试。</p><p className="mt-2 text-xs text-gray-600">{state.message}</p></div>
      : <p role="status">{state.status === 'loading' ? '正在加载野兽形态…' : '内置卡牌包已停用。启用内置卡牌包后，可在这里查阅野兽形态。'}</p>}
  </section>
}

export function BeastFormsPrintSheets({ pages }: { pages: readonly BeastFormPage[] }) {
  return <div className="beast-forms-print-sheets">{pages.map((page, index) =>
    <BeastFormSheet key={page.id} page={page} pageIndex={index} pageCount={pages.length} />)}</div>
}

export function BeastFormsPrintPages() {
  const state = useBeastFormPages()
  if (state.status === 'empty') return null
  if (state.status !== 'ready') return <BeastFormsStatus state={state} />
  return <BeastFormsPrintSheets pages={state.pages} />
}
