# Guia de uso — Nexo

Este guia mostra como usar o framework Nexo do zero até publicar HTML estático. Para detalhes de cada campo e regra, consulte a [especificação](./DOCUMENTATION.MD).

## O que é o Nexo?

Nexo é um framework para montar páginas a partir de:

1. **`schema.json`** — define rotas, componentes, props e assets globais.
2. **Pastas de componente** — HTML, CSS, JS e metadados por componente.
3. **`<nexo-component>`** — custom element que monta cada bloco em Shadow DOM.

Não há virtual DOM nem reconciliação: o HTML do componente é interpolado uma vez no mount (ou pré-renderizado no build).

## Instalação

```bash
npm install -g @typedbywill/nexo
```

Para contribuir ou desenvolver o próprio pacote:

```bash
git clone <repo>
cd nexo
npm install && npm run build && npm link
```

## Criar um projeto

```bash
nexo init meu-site
cd meu-site
```

Isso gera:

```
meu-site/
├── schema.json
├── index.html
└── components/
    ├── Hero/
    │   ├── component.html
    │   ├── style.css
    │   ├── script.js
    │   └── meta.json
    └── Footer/
        └── …
```

## Desenvolvimento local

```bash
nexo dev
```

- Servidor HTTP na porta do `schema.json` (`config.port`, padrão **3000**).
- WebSocket de hot reload na porta **HTTP + 1**.
- Rotas definidas em `schema.pages` são servidas como HTML gerado automaticamente.
- Arquivos estáticos (CSS local, imagens em `assets/`, etc.) são servidos da raiz do projeto.

Flags:

```bash
nexo dev --port 4000 --schema ./schema.json
```

### Hot reload

| Arquivo alterado                             | Comportamento                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `schema.json`                                | Recarrega a página inteira                                             |
| `components/Nome/meta.json`                  | Recarrega a página inteira                                             |
| `component.html`, `style.css` ou `script.js` | Recarrega só o componente `Nome` (se `window.nexo` estiver disponível) |

## Export estático

```bash
nexo build
# saída padrão: ./dist
nexo build --out ./public --schema ./schema.json
```

O build gera HTML com **Declarative Shadow DOM** (`<template shadowrootmode="open">`), ou seja, a página renderiza em navegadores modernos **sem JavaScript de montagem**.

Mapeamento de rotas → arquivos:

| Rota no schema | Arquivo gerado        |
| -------------- | --------------------- |
| `/`            | `dist/index.html`     |
| `/sobre`       | `dist/sobre.html`     |
| `/blog/post`   | `dist/blog-post.html` |

A pasta `assets/` do projeto (se existir) é copiada para `dist/assets/`.

## Definir páginas no schema

Exemplo mínimo:

```json
{
  "config": {
    "name": "meu-site",
    "port": 3000,
    "assets": ["tailwind"]
  },
  "pages": {
    "/": ["Hero", "Footer"],
    "/sobre": ["Hero", "Footer"]
  },
  "components": {
    "Hero": {
      "source": "./components/Hero",
      "props": {
        "title": {
          "type": "string",
          "default": "Bem-vindo",
          "required": true
        }
      }
    },
    "Footer": {
      "source": "./components/Footer"
    }
  }
}
```

- **`pages`**: cada chave é uma rota; o valor é a **ordem** dos componentes na página.
- **`components`**: registro de todos os componentes usados nas páginas.
- **`source`**: caminho relativo à pasta do componente (sem URL absoluta).

## Criar um componente

Cada componente vive em sua pasta com quatro arquivos:

### `component.html`

Template com placeholders `{{ nomeDaProp }}`:

```html
<section class="hero">
  <h1>{{ title }}</h1>
  <p>{{ subtitle }}</p>
</section>
```

Use `{{ conteudo | html }}` apenas quando o valor for HTML confiável (sem escape).

### `style.css`

Estilos escopados ao Shadow DOM. Use `:host` para o elemento customizado:

```css
:host {
  display: block;
}

.hero {
  padding: 4rem 2rem;
}
```

### `script.js`

Hooks de ciclo de vida (opcional):

```javascript
export default {
  mounted(ctx) {
    console.log("Montado:", ctx.props);
    ctx.emit("ready", { id: ctx.props.title });
  },
  destroy(ctx) {
    // limpeza (listeners, timers, etc.)
  },
};
```

`ctx` expõe:

- `element` — `ShadowRoot` do componente
- `props` — props já resolvidas
- `emit(event, data?)` — dispara `CustomEvent` com `bubbles` e `composed`

### `meta.json`

Contrato das props (fonte de verdade para validação em runtime):

```json
{
  "name": "Hero",
  "props": {
    "title": {
      "type": "string",
      "default": "Bem-vindo",
      "required": true
    },
    "dark": {
      "type": "boolean",
      "default": false,
      "required": false
    }
  }
}
```

Tipos suportados: `string`, `number`, `boolean`, `json`.

## Usar componentes no HTML

No `index.html` (ou em páginas manuais), declare instâncias:

```html
<nexo-component name="Hero" title="Pizza Artesanal" dark></nexo-component>
<nexo-component name="Footer" year="2026"></nexo-component>
```

Regras de atributos:

- Props `boolean`: presença do atributo (`dark`) = `true`; `dark="false"` = `false`.
- Props `number` e `json`: valor serializado no atributo.
- Atributos não declarados em `meta.json` são ignorados.

Precedência de valor: **atributo HTML** → **default no `schema.json`** → **default no `meta.json`**.

## Assets de CDN

No `config.assets` e opcionalmente por componente:

```json
{
  "config": {
    "assets": ["tailwind", "gsap", "lucide"]
  },
  "components": {
    "Hero": {
      "source": "./components/Hero",
      "assets": {
        "js": ["gsap"]
      }
    }
  }
}
```

Registry embutido:

| Nome       | Tipo | Uso              |
| ---------- | ---- | ---------------- |
| `tailwind` | CSS  | Tailwind via CDN |
| `gsap`     | JS   | GSAP 3.x         |
| `lucide`   | JS   | Ícones Lucide    |

## API programática (pacote npm)

Para integrar o framework em outra ferramenta ou página customizada:

```typescript
import { createRuntime } from "@typedbywill/nexo";

const nexo = createRuntime();
await nexo.init("./schema.json");

// expor no browser para HMR de componente
window.nexo = nexo;

document.querySelectorAll("nexo-component").forEach((el) => {
  const name = el.getAttribute("name");
  if (name) void nexo.mount(name, el as HTMLElement);
});
```

Exports principais: `parseSchema`, `resolveComponent`, `resolveProps`, `interpolate`, `buildStatic`, `startDevServer`, tipos em `src/types/`.

## Exemplo de referência

O projeto [examples/pizza-landing](../examples/pizza-landing) demonstra vários componentes, props tipadas e `nexo build` com DSD.

## Próximos passos

- [Especificação completa](./DOCUMENTATION.MD) — contrato formal do schema, HMR, export e tipos TypeScript.
- [ROADMAP.md](../ROADMAP.md) — status de implementação do framework.
