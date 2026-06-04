// gerar-sitemap.js — node gerar-sitemap.js
const fs=require('fs'),path=require('path');
const SITE='https://protecaoamericana.com.br';
const HOJE=new Date().toISOString().split('T')[0];
const CIDADES=JSON.parse(fs.readFileSync(path.join(__dirname,'conteudo','cidades.json'),'utf8'));
const SVC_DIR=path.join(__dirname,'conteudo','servicos');
function fm(raw){const m=raw.match(/^---\n([\s\S]*?)\n---/),o={};if(m)m[1].split('\n').forEach(l=>{const[k,...v]=l.split(':');if(k)o[k.trim()]=v.join(':').trim();});return o;}
function u(loc,pri='0.7',cf='monthly'){return`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${HOJE}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pri}</priority>\n  </url>`;}
const urls=[];
urls.push(u(`${SITE}/`,'1.0','weekly'));
urls.push(u(`${SITE}/quem-somos/`,'0.8'));
urls.push(u(`${SITE}/contato/`,'0.8'));
urls.push(u(`${SITE}/blog/`,'0.9','daily'));
const blogDir=path.join(__dirname,'blog');
if(fs.existsSync(blogDir)){
  fs.readdirSync(blogDir).filter(f=>f.endsWith('.html')&&f!=='index.html').forEach(f=>urls.push(u(`${SITE}/blog/${f.replace('.html','')}` )));
  fs.readdirSync(blogDir,{withFileTypes:true}).filter(d=>d.isDirectory()).forEach(d=>urls.push(u(`${SITE}/blog/${d.name}/`)));
}
fs.readdirSync(SVC_DIR).filter(f=>f.endsWith('.md')).forEach(mdFile=>{
  const raw=fs.readFileSync(path.join(SVC_DIR,mdFile),'utf8');
  const slug=fm(raw).slug||mdFile.replace('.md','');
  urls.push(u(`${SITE}/servicos/${slug}/`,'0.8'));
  CIDADES.forEach(c=>urls.push(u(`${SITE}/servicos/${slug}/${c.slug}/`)));
});
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
fs.writeFileSync(path.join(__dirname,'sitemap.xml'),xml,'utf8');
console.log('sitemap.xml gerado com '+urls.length+' URLs');
