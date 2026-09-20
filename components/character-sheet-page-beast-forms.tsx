'use client'

import { BeastFormSheet } from './beast-forms/beast-form-sheet'
import { BeastFormPagination } from './beast-forms/beast-form-pagination'
import { BeastFormsPrintSheets, BeastFormsStatus } from './beast-forms/beast-forms-print-pages'
import { useBeastFormPages } from './beast-forms/use-beast-form-pages'
import { useBeastFormsNavigation } from './beast-forms/beast-forms-navigation'

export default function CharacterSheetPageBeastForms() {
  const state = useBeastFormPages()
  const { pageIndex, setPageIndex } = useBeastFormsNavigation()
  if (state.status !== 'ready') return <BeastFormsStatus state={state} />
  const { pages } = state
  const index = Math.min(pageIndex, pages.length - 1)
  return <>
    <div className="beast-forms-reader print:hidden">
      <BeastFormSheet page={pages[index]} pageIndex={index} pageCount={pages.length}
        navigation={<BeastFormPagination pages={pages} pageIndex={index} onPageChange={setPageIndex} />} />
    </div>
    <div className="hidden print:block beast-forms-direct-print"><BeastFormsPrintSheets pages={pages} /></div>
  </>
}
