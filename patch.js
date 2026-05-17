const fs = require('fs');
let html = fs.readFileSync('template.html', 'utf8');

// Assets
html = html.replace(/href="css\/style\.css\?v=3"/g, 'href="{{base_path}}css/style.css?v=3"');
html = html.replace(/href="logoprotecao\.png"/g, 'href="{{base_path}}logoprotecao.png"');
html = html.replace(/src="logoprotecao\.png"/g, 'src="{{base_path}}logoprotecao.png"');
html = html.replace(/src="fachada\.png"/g, 'src="{{base_path}}fachada.png"');
html = html.replace(/src="fundador\.png"/g, 'src="{{base_path}}fundador.png"');
html = html.replace(/src="js\/main\.js"/g, 'src="{{base_path}}js/main.js"');

// SEO & Texts
html = html.replace(/<title>.*?<\/title>/, '<title>{{servico_capitalized}} em {{cidade_capitalized}} | PS Proteção</title>');
html = html.replace(/<meta name="description" content=".*?"/, '<meta name="description" content="Especialistas em {{servico_capitalized}} em {{cidade_capitalized}}. A PS Proteção oferece excelência corporativa há 27 anos."');

html = html.replace(/<h1 class="display-mega">Portaria e segurança com método, supervisão e <span class="text-primary">zero preocupações\.<\/span><\/h1>/, '<h1 class="display-mega">Serviços de {{servico_capitalized}} em {{cidade_capitalized}} com método, supervisão e <span class="text-primary">zero preocupações.</span></h1>');

html = html.replace(/<p class="body-lg hero-subtitle">Há 27 anos protegendo condomínios e empresas na Região Metropolitana de Campinas/, '<p class="body-lg hero-subtitle">Há 27 anos protegendo condomínios e empresas em {{cidade_capitalized}}');

html = html.replace(/<h2 class="display-md">Nossas Soluções em Segurança e Facilities<\/h2>/, '<h2 class="display-md">A melhor escolha de {{servico_capitalized}} em {{cidade_capitalized}}</h2>');

html = html.replace(/aria-label="Fale conosco no WhatsApp"/, 'aria-label="Fale conosco no WhatsApp sobre {{servico_capitalized}} em {{cidade_capitalized}}"');

fs.writeFileSync('template.html', html, 'utf8');
console.log("Template patched successfully.");
