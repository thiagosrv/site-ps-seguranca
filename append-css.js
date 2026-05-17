const fs = require('fs');
const css = `

/* Internal Linking Components */
.page-breadcrumb{display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.page-breadcrumb span{font-size:13px;color:rgba(255,255,255,.55)}
.page-breadcrumb a{color:rgba(255,255,255,.7);text-decoration:none}
.page-breadcrumb a:hover{color:var(--primary)}
.bc-sep{color:rgba(255,255,255,.3)}
.internal-links-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.internal-link-card{display:flex;flex-direction:column;gap:6px;padding:20px 16px;border:1px solid var(--hairline);background:var(--canvas);text-decoration:none;color:var(--ink);transition:border-color .2s,transform .2s,box-shadow .2s}
.internal-link-card:hover{border-color:var(--primary);transform:translateY(-3px);box-shadow:0 8px 20px rgba(0,0,0,.06)}
.ilc-icon{font-size:22px;line-height:1}
.ilc-text{font-size:14px;font-weight:600;color:var(--ink);line-height:1.3}
.ilc-city{font-size:12px;color:var(--ink-muted)}
.city-links-section{border-top:1px solid var(--hairline)}
.city-links-pills{display:flex;flex-wrap:wrap;gap:10px}
.city-link-pill{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border:1px solid var(--hairline);background:var(--canvas);color:var(--ink);text-decoration:none;font-size:14px;font-weight:500;transition:background .2s,border-color .2s,color .2s}
.city-link-pill:hover{background:var(--inverse-canvas);border-color:var(--inverse-canvas);color:white}
@media(max-width:1024px){.internal-links-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:768px){.internal-links-grid{grid-template-columns:repeat(2,1fr)}}
`;
fs.appendFileSync('css/style.css', css, 'utf8');
console.log('CSS adicionado com sucesso!');
