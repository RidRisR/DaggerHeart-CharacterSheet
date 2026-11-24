// Inline in reading and print trees so file-based standalone exports retain the full page layout.
export const MARTIAL_STANCE_STYLES = `
.martial-stance-sheet { box-sizing:border-box; width:210mm; height:297mm; padding:8px; background:#fff; color:#292929; border-radius:6px; box-shadow:0 10px 22px #00000016; display:flex; flex-direction:column; flex-shrink:0; }
.martial-stance-sheet > * { flex-shrink:0; }
.martial-stance-heading { display:flex; justify-content:space-between; align-items:flex-end; padding:0 6px 10px; border-bottom:2px solid #3D3D3D; }
.martial-stance-heading h1 { font-size:24px; font-weight:700; line-height:1.3; margin-bottom:4px; }
.martial-stance-heading p { font-size:12px; color:#616161; }
.martial-stance-character { display:flex; flex-direction:column; gap:4px; text-align:right; font-size:12px; max-width:32%; overflow-wrap:anywhere; }
.martial-stance-character strong { font-size:15px; }
.martial-stance-tracker { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:10px 6px; }
.martial-stance-tracker-label { display:flex; justify-content:space-between; align-items:center; min-height:24px; font-size:12px; }
.martial-stance-tracker h2 { font-size:14px; font-weight:700; }
.martial-stance-sheet button { border:1px solid #858585; border-radius:4px; background:#fff; color:#292929; font-size:10px; line-height:18px; padding:2px 7px; cursor:pointer; }
.martial-stance-sheet button:hover:not(:disabled) { background:#efefef; }
.martial-stance-sheet button:disabled { color:#858585; border-color:#d4d4d4; cursor:not-allowed; }
.martial-stance-sheet :is(button,[role=checkbox]):focus-visible { outline:2px solid #292929; outline-offset:3px; }
.martial-stance-focus { display:flex; gap:8px; align-items:center; margin-top:4px; }
.martial-stance-focus [role=checkbox] { width:26px; height:26px; flex-shrink:0; border:2px solid #858585; border-radius:50%; font-size:21px; line-height:21px; text-align:center; cursor:pointer; user-select:none; }
.martial-stance-current > strong { display:block; font-size:16px; line-height:26px; margin-top:4px; }
.martial-stance-current > span { font-size:10px; color:#616161; }
.martial-stance-write-in { display:none; height:26px; margin-top:4px; border-bottom:1px solid currentColor; }
.martial-stance-learning { display:flex; align-items:center; gap:12px; margin:0 6px 8px; font-size:11px; color:#616161; }
.martial-stance-learning strong { color:#292929; }
.martial-stance-tiers { display:grid; grid-template-columns:1fr 1fr; grid-auto-rows:1fr; gap:10px; }
.martial-stance-tier { display:grid; grid-template-rows:auto repeat(4, 1fr); border:1px solid #858585; border-radius:4px; overflow:hidden; }
.martial-stance-tier > h2 { display:flex; justify-content:space-between; align-items:center; background:#3D3D3D; color:#fff; font-size:14px; font-weight:700; padding:5px 9px; }
.martial-stance-tier > h2 span { font-size:10px; font-weight:400; }
.martial-stance-entry { border-top:1px solid #aaa; padding:3px 9px; break-inside:avoid; }
.martial-stance-entry.is-active { box-shadow:inset 3px 0 0 #3D3D3D; }
.martial-stance-entry-heading { display:flex; align-items:center; gap:6px; min-height:24px; margin-bottom:2px; }
.martial-stance-known { width:18px; height:18px; flex-shrink:0; border:1.5px solid #858585; border-radius:50%; font-size:15px; line-height:15px; text-align:center; cursor:pointer; user-select:none; }
.martial-stance-entry h3 { font-size:14px; font-weight:700; flex:1; }
.martial-stance-active-label { font-size:10px; font-weight:700; border-bottom:2px solid #3D3D3D; white-space:nowrap; }
.martial-stance-effect { font-size:12px; line-height:1.55; overflow-wrap:anywhere; }
.martial-stance-effect p { margin:0; }
.martial-stance-rules { margin:10px 0; display:grid; grid-template-columns:1fr 1fr; grid-auto-flow:column; grid-template-rows:auto auto; gap:8px 16px; padding:8px 9px; background:#fafafa; border-top:1px solid #858585; }
.martial-stance-rules h2 { font-size:11px; font-weight:700; margin:0 0 3px; }
.martial-stance-rules p { font-size:11px; line-height:1.5; margin:0; }
.martial-stance-sheet-gap { min-height:6px; flex:1; }
.martial-stance-footer { display:flex; justify-content:space-between; font-size:11px; color:#616161; border-top:1px solid #aaa; padding:8px 4px 3px; margin-top:auto; }
.print-all-pages .page-martial-stances { display:block; padding:20px 0; }
.page-martial-stances .martial-stance-current > strong,
.page-martial-stances .martial-stance-learning > strong,
.page-martial-stances .martial-stance-active-label,
.page-martial-stances .martial-stance-sheet button { display:none; }
.page-martial-stances .martial-stance-write-in { display:block; }
.page-martial-stances .martial-stance-entry.is-active { box-shadow:none; }
@media print {
 .martial-stance-sheet { width:200mm; height:286mm; padding:0; margin:0 auto; box-shadow:none; border-radius:0; background:#fff!important; color:#292929!important; }
 .martial-stance-tier > h2 { background:#fff!important; color:#292929!important; border-bottom:1px solid #858585; }
 .martial-stance-rules { background:#fff!important; }
 .martial-stance-heading { padding-bottom:7px; }
 .martial-stance-tracker { margin:7px 6px; }
 .martial-stance-entry-heading { min-height:20px; }
 .martial-stance-rules { margin:7px 0; gap:6px 16px; padding:6px 9px; }
 .martial-stance-footer { padding-top:6px; }
 .martial-stance-current > strong, .martial-stance-learning > strong, .martial-stance-active-label { display:none; }
 .martial-stance-write-in { display:block; }
 .martial-stance-entry.is-active { box-shadow:none; }
 .martial-stance-focus [role=checkbox], .martial-stance-known { background:#fff!important; color:#292929!important; }
 .print-all-pages .page-martial-stances { padding:0; break-after:page; }
 .print-all-pages .page-martial-stances.last-printed-page { break-after:auto; }
}
`
