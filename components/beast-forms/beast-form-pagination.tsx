'use client'

import { Button } from '@/components/ui/button'
import type { BeastFormPage } from './page-layout'

export function BeastFormPagination({ pages, pageIndex, onPageChange }: {
  pages: readonly BeastFormPage[]
  pageIndex: number
  onPageChange: (index: number) => void
}) {
  const tiers = [...new Set(pages.map(page => page.tier))]
  return (
    <nav className="beast-form-pagination" aria-label="野兽形态内部分页"
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) event.stopPropagation() }}>
      <div className="beast-form-tier-buttons">
        {tiers.map(tier => <Button key={tier} type="button" variant="outline"
          aria-current={pages[pageIndex].tier === tier ? 'page' : undefined}
          onClick={() => onPageChange(pages.findIndex(page => page.tier === tier))}>位阶 {tier}</Button>)}
      </div>
      <div className="beast-form-step-buttons">
        <Button type="button" variant="outline" disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)}>‹ 上一页</Button>
        <span className="beast-form-counter" role="status" aria-live="polite" aria-label={`第 ${pageIndex + 1} 页，共 ${pages.length} 页`}>{pageIndex + 1} / {pages.length}</span>
        <Button type="button" variant="outline" disabled={pageIndex === pages.length - 1} onClick={() => onPageChange(pageIndex + 1)}>下一页 ›</Button>
      </div>
    </nav>
  )
}
