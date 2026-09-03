// Gera index.html a partir dos SVGs em svg/.
//
// Os dois SVGs do cardapio saem do Illustrator com as MESMAS classes (.cls-1,
// .cls-2, ...) e os mesmos ids. Inline os dois na mesma pagina e o segundo
// repinta o primeiro. Aqui cada um ganha um escopo proprio: o <style> interno
// vira CSS da pagina com todo seletor prefixado por #<escopo>, e os ids ganham
// o prefixo tambem.
//
// Uso: node build.mjs   (depois de trocar qualquer coisa em svg/)

import { readFileSync, writeFileSync } from 'node:fs';

const PAGES = [
  { scope: 'capa', file: 'svg/Capa.svg' },
  { scope: 'verso', file: 'svg/Verso.svg' },
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
const [capa, verso] = built;

// A assinatura (3 estrelas + MAPOLI) e a mesma marca embutida na capa, mas em
// vetor. Vem com vermelho fixo; currentColor deixa o CSS pintar cada camada do
// preloader. Largura/altura fixas sairiam na frente do clamp() do CSS.
const wordmark = readFileSync('svg/assinatura.svg', 'utf8')
  .replace(/<\?xml[^>]*\?>\s*/, '')
  .replace(/fill="#E73439"/gi, 'fill="currentColor"')
  .replace(/<svg\s+width="\d+"\s+height="\d+"/, '<svg width="100%" height="auto"')
  .replace(/\sid="([^"]*)"/g, ' id="wm-$1"')
  .trim();

const indent = (text, pad) =>
  text
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Mápoli — Cardápio de Bebidas</title>
<meta name="description" content="Cardápio de bebidas do Mápoli: refrigerantes, águas, sucos, cervejas, vinhos e drinks. Segunda a sábado, almoço 11h30 às 14h e jantar 19h às 23h." />
<meta name="theme-color" content="#442924" />
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
    --red: #e73439;
    --page-ratio: 283.46 / 623.62;
    --flip: .95s cubic-bezier(.66, .01, .28, 1);
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

  /* ===================== PRELOADER ===================== */

  .preloader {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: var(--card);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: transform 1s cubic-bezier(.76, 0, .24, 1);
  }
  .preloader.is-done {
    transform: translateY(-100%);
    pointer-events: none;
  }

  .preloader__center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(16px, 2.4vw, 30px);
    padding: 0 24px;
  }

  .preloader__logo {
    position: relative;
    width: clamp(190px, 34vw, 400px);
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 1s ease, transform 1.1s cubic-bezier(.22, 1, .36, 1);
  }
  .preloader__logo svg { display: block; height: auto; aspect-ratio: 780 / 252; }

  /* A camada fantasma segura o tamanho da caixa; a solida preenche
     de baixo pra cima conforme --fill vai de 0% a 100%. */
  .preloader__ghost { color: rgba(247, 238, 235, .15); }
  .preloader__fill {
    position: absolute;
    inset: 0;
    color: var(--red);
    clip-path: inset(calc(100% - var(--fill, 0%)) 0 0 0);
    transition: clip-path .35s cubic-bezier(.22, 1, .36, 1);
  }

  .preloader__tagline {
    margin: 0;
    color: var(--tan);
    font-size: clamp(11px, 1.5vw, 17px);
    letter-spacing: .34em;
    text-transform: lowercase;
    text-align: center;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 1s ease .18s, transform 1.1s cubic-bezier(.22, 1, .36, 1) .18s;
  }

  .preloader__count {
    position: absolute;
    right: clamp(20px, 4vw, 52px);
    bottom: clamp(16px, 3.4vw, 40px);
    display: flex;
    align-items: baseline;
    color: var(--ink);
    line-height: .9;
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 1s ease .1s, transform 1.1s cubic-bezier(.22, 1, .36, 1) .1s;
  }
  .preloader__num { font-size: clamp(56px, 10vw, 150px); font-variant-numeric: tabular-nums; }
  .preloader__pct { font-size: clamp(24px, 4vw, 60px); margin-left: .06em; }

  .preloader.is-in .preloader__logo,
  .preloader.is-in .preloader__tagline,
  .preloader.is-in .preloader__count {
    opacity: 1;
    transform: none;
  }

  /* ===================== CARTAO ===================== */

  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px max(20px, env(safe-area-inset-left)) 12px;
  }

  /* O deck guarda a proporcao exata da arte (100 x 220 mm) e cresce ate onde a
     altura permitir. A perspectiva mora aqui pra so o flipper girar. */
  .deck {
    aspect-ratio: var(--page-ratio);
    height: 100%;
    max-width: 100%;
    perspective: 1900px;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity .9s ease, transform 1s cubic-bezier(.22, 1, .36, 1);
  }
  .deck.is-in { opacity: 1; transform: none; }

  .flipper {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform var(--flip);
    cursor: pointer;
  }
  .flipper.is-flipped { transform: rotateY(-180deg); }

  .face {
    position: absolute;
    inset: 0;
    border-radius: 10px;
    overflow: hidden;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow: 0 18px 50px rgba(0, 0, 0, .45);
    line-height: 0;
  }
  .face svg { display: block; }
  .face--front { background: var(--card); }
  .face--back { background: var(--tan); transform: rotateY(180deg); }

  /* ===================== BOTAO ===================== */

  .bar {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
    opacity: 0;
    transition: opacity .9s ease .15s;
  }
  .bar.is-in { opacity: 1; }

  .bar button {
    appearance: none;
    border: 1px solid rgba(215, 192, 173, .32);
    background: transparent;
    color: var(--tan);
    font: 600 13px/1 'IBM Plex Serif', Georgia, serif;
    letter-spacing: .16em;
    text-transform: uppercase;
    padding: 12px 30px;
    border-radius: 999px;
    cursor: pointer;
    transition: background .22s ease, color .22s ease, border-color .22s ease;
  }
  .bar button:hover {
    background: var(--tan);
    border-color: var(--tan);
    color: var(--card);
  }
  .bar button:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* Sem animacao: a virada e instantanea e a cortina some sem deslizar. */
  @media (prefers-reduced-motion: reduce) {
    .flipper, .deck, .bar, .preloader, .preloader__logo,
    .preloader__tagline, .preloader__count, .preloader__fill,
    .bar button { transition: none; }
    .preloader.is-done { transform: none; opacity: 0; visibility: hidden; }
  }

${built.map((p) => `  /* ===== ${p.scope} ===== */\n${indent(p.css, '  ')}`).join('\n')}
</style>
</head>
<body>

<div class="preloader" id="preloader" role="status" aria-label="Carregando o cardápio">
  <div class="preloader__center">
    <div class="preloader__logo">
      <div class="preloader__ghost" aria-hidden="true">
${indent(wordmark, '        ')}
      </div>
      <div class="preloader__fill" id="fill" aria-hidden="true">
${indent(wordmark.replace(/\sid="wm-([^"]*)"/g, ' id="wmf-$1"'), '        ')}
      </div>
    </div>
    <p class="preloader__tagline">comer bem, todo dia</p>
  </div>
  <div class="preloader__count" aria-hidden="true">
    <span class="preloader__num" id="num">0</span><span class="preloader__pct">%</span>
  </div>
</div>

<main class="stage">
  <div class="deck" id="deck">
    <div class="flipper" id="flipper">
      <div class="face face--front" id="capa" aria-label="Capa">
${indent(capa.svg, '        ')}
      </div>
      <div class="face face--back" id="verso" aria-label="Cardápio de bebidas" aria-hidden="true">
${indent(verso.svg, '        ')}
      </div>
    </div>
  </div>
</main>

<div class="bar" id="bar">
  <button type="button" id="flipBtn" aria-controls="flipper">Verso</button>
</div>

<script>
(function () {
  var preloader = document.getElementById('preloader');
  var fill = document.getElementById('fill');
  var num = document.getElementById('num');
  var deck = document.getElementById('deck');
  var bar = document.getElementById('bar');
  var flipper = document.getElementById('flipper');
  var btn = document.getElementById('flipBtn');
  var capa = document.getElementById('capa');
  var verso = document.getElementById('verso');

  // ---- virar ----

  var flipped = false;

  function flip() {
    flipped = !flipped;
    flipper.classList.toggle('is-flipped', flipped);
    btn.textContent = flipped ? 'Capa' : 'Verso';
    // A face escondida sai da arvore de acessibilidade e do alcance do leitor.
    capa.setAttribute('aria-hidden', flipped ? 'true' : 'false');
    verso.setAttribute('aria-hidden', flipped ? 'false' : 'true');
  }

  btn.addEventListener('click', flip);
  flipper.addEventListener('click', flip);

  // ---- preloader ----

  // Nao ha imagem externa pra esperar: os SVGs sao inline e a unica carga de
  // rede e a fonte. O contador anda sozinho ate 92% e so fecha quando a fonte
  // resolve, com um piso de tempo pra barra nao dar um flash e sumir.
  var MIN_MS = 1100;
  var MAX_MS = 3500;
  var SPEED = 150;            // pontos de porcentagem por segundo
  var started = performance.now();
  var last = started;
  var progress = 0;
  var ready = false;
  var finished = false;

  var fontsReady = document.fonts && document.fonts.ready
    ? document.fonts.ready
    : Promise.resolve();

  var windowReady = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise(function (r) { window.addEventListener('load', r, { once: true }); });

  Promise.all([fontsReady, windowReady]).then(function () { ready = true; });

  function paint() {
    var pct = Math.round(progress);
    num.textContent = pct;
    fill.style.setProperty('--fill', pct + '%');
  }

  function tick(now) {
    if (finished) return;

    var elapsed = now - started;
    // O avanco e por tempo decorrido, nao por quadro: com requestAnimationFrame
    // estrangulado (aba em segundo plano, aparelho fraco) o contador continua
    // levando o mesmo tempo em vez de arrastar.
    var step = (now - last) / 1000 * SPEED;
    last = now;

    // Sem sinal de pronto o contador para em 92; com sinal, corre pro fim.
    var target = (ready || elapsed > MAX_MS) ? 100 : 92;
    progress = Math.min(target, progress + step);
    paint();

    if (progress >= 100 && elapsed >= MIN_MS) {
      done();
      return;
    }
    requestAnimationFrame(tick);
  }

  function done() {
    if (finished) return;
    finished = true;
    progress = 100;
    paint();

    // Deixa o 100% respirar antes da cortina subir.
    setTimeout(function () {
      preloader.classList.add('is-done');
      deck.classList.add('is-in');
      bar.classList.add('is-in');
      setTimeout(function () { preloader.remove(); }, 1200);
    }, 260);
  }

  // Trava de seguranca: um cardapio de mesa nao pode ficar preso atras da
  // cortina se o rAF nunca rodar ou a fonte nunca resolver.
  setTimeout(done, MAX_MS + 600);

  requestAnimationFrame(function () {
    preloader.classList.add('is-in');
    last = performance.now();
    requestAnimationFrame(tick);
  });
})();
</script>

</body>
</html>
`;

writeFileSync('index.html', html);
console.log('index.html gerado —', (html.length / 1024).toFixed(0) + ' KB');
for (const p of built) {
  console.log(`  ${p.scope.padEnd(6)} svg ${(p.svg.length / 1024).toFixed(0)} KB · css ${p.css.split('\n').filter(Boolean).length} regras`);
}
console.log(`  wordmark ${(wordmark.length / 1024).toFixed(1)} KB (x2 no preloader)`);
