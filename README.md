# Mápoli — Cardápio de Bebidas

Cardápio de bebidas do Mápoli publicado como página estática. A arte é a mesma
do impresso (100 × 220 mm), em SVG, então o texto continua vetor: amplia sem
borrar e é selecionável.

A página abre com um preloader de cortina (a assinatura da marca preenchendo de
baixo pra cima, no mesmo espírito do site institucional), revela a **capa** e
tem um botão que **vira o cartão em 3D** pro verso e de volta. Clicar no próprio
cartão também vira.

## Arquivos em `svg/`

| arquivo | o que é |
|---|---|
| `Capa.svg` | frente do cardápio |
| `Verso.svg` | verso, com os itens e preços |
| `assinatura.svg` | marca (3 estrelas + MAPOLI) usada no preloader |

`assinatura.svg` é a versão vetorial da mesma marca que está embutida como PNG
dentro da `Capa.svg`. O logotipo não tem acento no "A" — é assim mesmo.

## Ligar e desligar o cardápio

No topo do `build.mjs` existe uma chave:

```js
const ATIVO = false;
```

- `true` — a URL serve o cardápio
- `false` — a URL serve uma página de "indisponível no momento"

Depois de trocar, rode `node build.mjs` e publique com `vercel --prod`.

**A URL nunca muda nos dois casos.** É o que permite desligar o cardápio sem
invalidar o QR code impresso. A página de indisponível toma o lugar do
`index.html` em vez de ficar ao lado dele, então o cardápio também não fica
acessível por outro caminho enquanto está desligado.

## Como atualizar o cardápio

1. Exporte a nova arte do Illustrator em SVG e substitua `svg/Capa.svg` e/ou
   `svg/Verso.svg`.
2. Rode o build:

   ```
   node build.mjs
   ```

3. Commit e push. O Vercel publica sozinho.

Não edite `index.html` na mão — ele é gerado e qualquer mudança é sobrescrita
no próximo build.

## Por que existe um build

Os dois SVGs saem do Illustrator usando os mesmos nomes de classe (`.cls-1`,
`.cls-2`, …) e os mesmos ids. Inline os dois na mesma página e o CSS do segundo
repinta o primeiro. O `build.mjs` tira o `<style>` de dentro de cada SVG,
prefixa todo seletor com o escopo da página (`#capa`, `#verso`) e renomeia os
ids, aí os dois convivem no mesmo documento.

O build não tem dependência nenhuma — é Node puro, sem `npm install`.

## Exportando do Illustrator

Para a arte continuar leve e nítida:

- **Fontes: Glifos convertidos em SVG** (não "Converter em contornos") — mantém
  o texto como texto.
- **Imagens: Incorporar.**
- **CSS: Elementos de estilo** (é o que gera o bloco `<style>` que o build espera).
- Não marque "Responsivo" — o build controla o tamanho.

A tipografia é IBM Plex Serif (400/600/700), carregada do Google Fonts pela
página. Se a arte passar a usar outro peso, acrescente ele no `<link>` das
fontes dentro do `build.mjs`.
