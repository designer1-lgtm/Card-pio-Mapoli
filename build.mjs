// Gera index.html a partir dos SVGs em svg/.
//
// Os dois SVGs saem do Illustrator com as MESMAS classes (.cls-1, .cls-2, ...)
// e os mesmos ids. Inline os dois na mesma pagina e o segundo repinta o primeiro.
// Aqui cada SVG ganha um escopo proprio: o <style> interno vira CSS da pagina
// com todo seletor prefixado por #<escopo>, e os ids ganham o prefixo tambem.
//
// Uso: node build.mjs   (depois de trocar qualquer coisa em svg/)

import { readFileSync, writeFileSync } from 'node:fs';

const PAGES = [
  { scope: 'capa', file: 'svg/Capa.svg', label: 'Capa' },
  { scope: 'verso', file: 'svg/Verso.svg', label: 'Cardápio' },
];

function scopeSvg(raw, scope) {
  let svg = raw.replace(/<\?xml[^>]*\?>\s*/, '').trim();

  // Puxa o <style> interno pra fora e prefixa cada seletor.
  let css = '';
  svg = svg.replace(/<style>([\s\S]*?)<\/style>/g, (_, body) => {
    css += body;
    return '';
  });

  if (/@/.test(css)) {
    throw new Error(`${scope}: o <style> tem at-rule (@media/@font-face); o parser simples nao cobre isso`);
  }

  const scoped = css.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectors, decls) => {
    const list = selectors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `#${scope} ${s}`)
      .join(', ');
    return `${list} {${decls.replace(/\s+/g, ' ').trim()}}\n`;
  });

  // <defs> vazio depois de tirar o style nao faz mal, mas suja o DOM.
  svg = svg.replace(/<defs>\s*<\/defs>/g, '');

  // Ids duplicados entre os dois SVGs. Nenhum e referenciado internamente
  // (nao ha url(#) nem href="#" nos arquivos), mas id repetido no DOM e invalido.
  svg = svg.replace(/\sid="([^"]*)"/g, (_, id) => ` id="${scope}-${id}"`);

  // A pagina controla o tamanho; largura/altura fixas no svg atrapalham.
  svg = svg.replace(/<svg\b/, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet"');

  return { svg, css: scoped };
}

const built = PAGES.map((p) => ({ ...p, ...scopeSvg(readFileSync(p.file, 'utf8'), p.scope) }));

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Mápoli — Cardápio de Bebidas</title>
<meta name="description" content="Cardápio de bebidas do Mápoli: refrigerantes, águas, sucos, cervejas, vinhos e drinks. Segunda a sábado, almoço 11h30 às 14h e jantar 19h às 23h." />
<meta name="theme-color" content="#2a1813" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Mápoli — Cardápio de Bebidas" />
<meta property="og:description" content="Comer bem, todo dia. Almoço 11h30 às 14h, jantar 19h às 23h." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&display=swap" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='16' fill='%23442924'/%3E%3Ctext x='50' y='73' font-family='serif' font-size='68' font-weight='700' text-anchor='middle' fill='%23f7eeeb'%3EM%3C/text%3E%3C/svg%3E" />
<style>
  :root {
    --bg: #2a1813;
    --card: #442924;
    --ink: #f7eeeb;
    --tan: #d7c0ad;
    --page-ratio: 283.46 / 623.62;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    height: 100%;
    background: var(--bg);
    color: var(--ink);
    font-family: 'IBM Plex Serif', Georgia, serif;
    -webkit-text-size-adjust: 100%;
  }

  body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ---- palco ---- */

  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 32px;
    padding: 24px max(20px, env(safe-area-inset-left)) 16px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .stage::-webkit-scrollbar { display: none; }

  .page {
    flex: 0 0 100%;
    height: 100%;
    scroll-snap-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* O cartao guarda a proporcao exata da arte (100 x 220 mm) e cresce
     ate onde a altura permitir, sem nunca estourar a largura da coluna. */
  .card {
    aspect-ratio: var(--page-ratio);
    height: 100%;
    max-width: 100%;
    border-radius: 10px;
    overflow: hidden;
    background: var(--card);
    box-shadow: 0 18px 50px rgba(0, 0, 0, .45);
    line-height: 0;
  }
  .card svg { display: block; }

  /* ---- barra ---- */

  .bar {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px calc(14px + env(safe-area-inset-bottom));
  }

  .bar button {
    appearance: none;
    border: 1px solid rgba(215, 192, 173, .3);
    background: transparent;
    color: var(--tan);
    font: 600 13px/1 'IBM Plex Serif', Georgia, serif;
    letter-spacing: .09em;
    padding: 9px 18px;
    border-radius: 999px;
    cursor: pointer;
    transition: background .18s, color .18s, border-color .18s;
  }
  .bar button:hover { border-color: var(--tan); }
  .bar button[aria-current='true'] {
    background: var(--tan);
    border-color: var(--tan);
    color: var(--card);
  }
  .bar button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* ---- desktop: as duas paginas lado a lado ---- */

  @media (min-width: 760px) {
    .stage {
      justify-content: center;
      overflow-x: hidden;
      scroll-snap-type: none;
      padding: 32px 24px 20px;
    }
    .page { flex: 0 1 auto; }
    .bar { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .stage { scroll-behavior: auto; }
    .bar button { transition: none; }
  }

${built.map((p) => `  /* ===== ${p.label} ===== */\n${p.css.split('\n').map((l) => (l ? '  ' + l : l)).join('\n')}`).join('\n')}
</style>
</head>
<body>

<main class="stage" id="stage">
${built
  .map(
    (p) => `  <section class="page" id="page-${p.scope}" aria-label="${p.label}">
    <div class="card" id="${p.scope}">
${p.svg
  .split('\n')
  .map((l) => (l ? '      ' + l : l))
  .join('\n')}
    </div>
  </section>`
  )
  .join('\n')}
</main>

<nav class="bar" aria-label="Páginas do cardápio">
${built.map((p, i) => `  <button type="button" data-target="page-${p.scope}"${i === 0 ? ' aria-current="true"' : ''}>${p.label}</button>`).join('\n')}
</nav>

<script>
  // A barra so existe no layout de coluna unica; no desktop as duas paginas
  // ja aparecem juntas e o CSS esconde a nav.
  (function () {
    var stage = document.getElementById('stage');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.bar button'));
    if (!stage || !buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });

    // Marca o botao da pagina que esta em cena. Guardo a fracao visivel de cada
    // pagina e escolho a maior: reagir a cada entrada isolada erra na carga, em
    // que as duas paginas aparecem e a ultima do lote venceria.
    var pages = buttons.map(function (b) { return document.getElementById(b.dataset.target); });
    if (!('IntersectionObserver' in window)) return;

    var ratios = pages.map(function () { return 0; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var i = pages.indexOf(entry.target);
        if (i > -1) ratios[i] = entry.intersectionRatio;
      });

      var best = 0;
      for (var k = 1; k < ratios.length; k++) {
        if (ratios[k] > ratios[best]) best = k;
      }

      buttons.forEach(function (b, j) {
        if (j === best) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }, { root: stage, threshold: [0, .25, .5, .75, 1] });

    pages.forEach(function (p) { if (p) io.observe(p); });
  })();
</script>

</body>
</html>
`;

writeFileSync('index.html', html);
console.log('index.html gerado —', (html.length / 1024).toFixed(0) + ' KB');
for (const p of built) {
  console.log(`  ${p.label.padEnd(10)} svg ${(p.svg.length / 1024).toFixed(0)} KB · css ${p.css.split('\n').filter(Boolean).length} regras`);
}
