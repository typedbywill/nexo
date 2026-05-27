# Nexo — Runtime Documentation

> Runtime frontend declarativo e AI-native para landing pages e microsystems.
> Toda a aplicação é descrita por um único `schema.json`. O runtime cuida do resto.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Filosofia de Design](#2-filosofia-de-design)
3. [Estrutura de Projeto](#3-estrutura-de-projeto)
4. [schema.json — Spec Completa](#4-schemajson--spec-completa)
5. [Componentes](#5-componentes)
6. [Sistema de Props](#6-sistema-de-props)
7. [Asset System](#7-asset-system)
8. [Runtime — Arquitetura Interna](#8-runtime--arquitetura-interna)
9. [Dev Server](#9-dev-server)
10. [Static Export](#10-static-export)
11. [TypeScript — Tipos e Interfaces](#11-typescript--tipos-e-interfaces)
12. [CLI](#12-cli)
13. [Ordem de Implementação do MVP](#13-ordem-de-implementação-do-mvp)
14. [Decisões Técnicas Registradas](#14-decisões-técnicas-registradas)

---

## 1. Visão Geral

Nexo é um runtime frontend focado em um problema específico: **interfaces geradas ou mantidas por IA degradam rapidamente em ecossistemas modernos** por excesso de abstração, dependências implícitas e tooling complexo.

Nexo resolve isso sendo:

- **Declarativo** — a estrutura inteira vive em `schema.json`
- **Determinístico** — dado o mesmo schema, o output é sempre o mesmo
- **Isolado** — cada componente é encapsulado via Shadow DOM
- **Serializável** — a IA lê um arquivo e entende toda a aplicação
- **Restrito intencionalmente** — menos superfície = menos entropia

### O que Nexo **não é**

Nexo não é um framework generalista. Não compete com React, Vue ou Next.js.
O escopo é deliberadamente limitado: **landing pages, microsystems e interfaces geradas por IA.**

---

## 2. Filosofia de Design

### Fonte única de verdade

Todo o estado estrutural da aplicação vive em `schema.json`. Não existe configuração espalhada em múltiplos arquivos. Uma IA (ou um dev) lê um arquivo e entende tudo.

### A IA não escreve apps — ela orquestra componentes

O modelo de trabalho esperado é:

```
IA lê schema.json
  → entende componentes registrados
  → modifica pages[]
  → adiciona props
  → runtime remonta a interface
```

### Restrição como feature

Ambientes restritos produzem outputs mais previsíveis de LLMs. As limitações do Nexo são intencionais.

### Sem virtual DOM, sem reconciliação

O runtime monta componentes diretamente no DOM via Web Components e Shadow DOM. Sem camada de abstração intermediária.

---

## 3. Estrutura de Projeto

```
/meu-projeto
├── schema.json              # fonte única de verdade
├── index.html               # entry point da rota "/"
│
└── components/
    ├── Hero/
    │   ├── component.html   # template com interpolação
    │   ├── style.css        # CSS isolado (Shadow DOM)
    │   ├── script.js        # lifecycle hooks
    │   └── meta.json        # props contract
    │
    ├── Features/
    │   ├── component.html
    │   ├── style.css
    │   ├── script.js
    │   └── meta.json
    │
    └── Footer/
        ├── component.html
        ├── style.css
        ├── script.js
        └── meta.json
```

### `index.html`

Ponto de entrada da rota `/`. Contém apenas os placeholders que o runtime resolve.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexo App</title>
</head>
<body>
  <nexo-component name="Hero" title="A melhor pizza" dark="true"></nexo-component>
  <nexo-component name="Features"></nexo-component>
  <nexo-component name="Footer"></nexo-component>
</body>
</html>
```

> **Nota:** Em modo schema-driven, o `index.html` pode ser gerado automaticamente a partir do array de páginas. O `index.html` manual é opcional — útil para controle fino de ordem e props inline.

---

## 4. `schema.json` — Spec Completa

O `schema.json` é o único arquivo de configuração do projeto. Ele substitui qualquer `.yaml`, `.env` de build ou config de framework.

### Estrutura completa

```json
{
  "config": {
    "name": "meu-projeto",
    "port": 3000,
    "assets": ["tailwind", "gsap", "lucide"]
  },

  "pages": {
    "/": ["Hero", "Features", "Pricing", "CTA", "Footer"],
    "/sobre": ["AboutHero", "Team", "Footer"]
  },

  "components": {
    "Hero": {
      "source": "./components/Hero",
      "assets": {
        "js": ["gsap"]
      },
      "props": {
        "title": {
          "type": "string",
          "default": "Bem-vindo",
          "required": true
        },
        "subtitle": {
          "type": "string",
          "default": "",
          "required": false
        },
        "dark": {
          "type": "boolean",
          "default": false,
          "required": false
        }
      }
    },

    "Features": {
      "source": "./components/Features",
      "props": {
        "columns": {
          "type": "number",
          "default": 3,
          "required": false
        }
      }
    },

    "Footer": {
      "source": "./components/Footer",
      "props": {}
    }
  }
}
```

### `config`

| Campo    | Tipo       | Descrição                                               |
|----------|------------|---------------------------------------------------------|
| `name`   | `string`   | Nome do projeto                                         |
| `port`   | `number`   | Porta do dev server (default: `3000`)                   |
| `assets` | `string[]` | Assets globais injetados em todas as páginas            |

### `pages`

Objeto onde cada chave é uma rota e o valor é um **array ordenado de nomes de componentes**.

```json
"pages": {
  "/":       ["Hero", "Features", "CTA", "Footer"],
  "/contato": ["ContactHero", "ContactForm", "Footer"]
}
```

A ordem do array define a ordem de renderização na página. O runtime monta os componentes nessa sequência.

### `components`

Registro de todos os componentes disponíveis na aplicação.

| Campo    | Tipo     | Descrição                                             |
|----------|----------|-------------------------------------------------------|
| `source` | `string` | Caminho para a pasta do componente                    |
| `assets` | `object` | Assets específicos do componente (além dos globais)   |
| `props`  | `object` | Contrato de props — ver seção [Sistema de Props](#6-sistema-de-props) |

---

## 5. Componentes

Cada componente é uma pasta com quatro arquivos.

### `component.html`

Template HTML com suporte a interpolação de props via `{{ }}`.

```html
<section class="hero">
  <h1>{{ title }}</h1>
  <p>{{ subtitle }}</p>
</section>
```

Regras de interpolação:

- `{{ propName }}` — injeta o valor da prop como texto puro
- `{{ propName | html }}` — injeta como HTML (sem escape)
- Props não encontradas são substituídas por string vazia, nunca por `undefined`

### `style.css`

CSS do componente. É injetado dentro do Shadow DOM — **não vaza para fora** e não recebe estilos externos por padrão.

```css
:host {
  display: block;
}

.hero {
  padding: 4rem 2rem;
  background: #0f0f0f;
}

h1 {
  font-size: clamp(2rem, 5vw, 4rem);
  color: white;
}
```

Use `:host` para estilizar o elemento raiz do componente.

### `script.js`

Lifecycle hooks do componente. Exporta um objeto default com os hooks disponíveis.

```js
export default {
  mounted(ctx) {
    // ctx.element — referência ao Shadow Root
    // ctx.props   — props resolvidas e validadas
    // ctx.emit    — função para emitir eventos (futuro)
    console.log('Hero montado com props:', ctx.props)
  },

  destroy(ctx) {
    // limpeza: remover event listeners, cancelar timers, etc.
  }
}
```

#### Contexto (`ctx`)

| Propriedade | Tipo                          | Descrição                             |
|-------------|-------------------------------|---------------------------------------|
| `element`   | `ShadowRoot`                  | Shadow root do componente             |
| `props`     | `Record<string, PropValue>`   | Props resolvidas com defaults aplicados |
| `emit`      | `(event: string, data?) => void` | Emite evento customizado (MVP+)    |

### `meta.json`

Define o contrato de props do componente. É a fonte de verdade para validação em runtime.

```json
{
  "name": "Hero",
  "props": {
    "title": {
      "type": "string",
      "default": "Bem-vindo",
      "required": true
    },
    "subtitle": {
      "type": "string",
      "default": "",
      "required": false
    },
    "dark": {
      "type": "boolean",
      "default": false,
      "required": false
    }
  }
}
```

---

## 6. Sistema de Props

### Tipos suportados

| Tipo      | Exemplo de valor         | Comportamento no atributo HTML          |
|-----------|--------------------------|-----------------------------------------|
| `string`  | `"Olá mundo"`            | Valor literal do atributo               |
| `number`  | `42`                     | Parseado via `Number()`                 |
| `boolean` | `true` / `false`         | `"true"` → `true`, ausência → `false`  |
| `json`    | `[1, 2, 3]`              | Parseado via `JSON.parse()`             |

### Resolução de props — ordem de precedência

```
1. Atributo HTML no <nexo-component>       (maior prioridade)
2. Props definidas no schema.json do componente
3. Default definido no meta.json           (menor prioridade)
```

### Passagem via atributo HTML

```html
<!-- string -->
<nexo-component name="Hero" title="Pizza Artesanal"></nexo-component>

<!-- boolean — presença do atributo = true -->
<nexo-component name="Hero" dark></nexo-component>

<!-- número -->
<nexo-component name="Features" columns="4"></nexo-component>

<!-- json -->
<nexo-component name="Nav" items='["Home","Sobre","Contato"]'></nexo-component>
```

### Validação em runtime

O runtime valida as props na montagem do componente:

- Props `required: true` sem valor → **warning no console** em dev, sem quebrar a app
- Tipo incompatível → tenta conversão, fallback para o `default`
- Prop desconhecida (não declarada no `meta.json`) → ignorada silenciosamente

---

## 7. Asset System

Assets são bibliotecas externas (CSS ou JS) injetadas automaticamente pelo runtime.

### Assets globais

Declarados em `config.assets` no `schema.json`. São injetados em **todas as páginas**.

```json
"config": {
  "assets": ["tailwind", "gsap", "lucide"]
}
```

### Assets por componente

Declarados em `components.<Nome>.assets`. São injetados **apenas quando o componente está presente na página**.

```json
"Hero": {
  "assets": {
    "js": ["gsap"],
    "css": []
  }
}
```

### Registry de assets

O runtime mantém um registry interno que mapeia nomes de assets para suas URLs de CDN.

```typescript
// Exemplo do registry interno
const ASSET_REGISTRY: Record<string, AssetDefinition> = {
  tailwind: {
    type: 'css',
    url: 'https://cdn.tailwindcss.com'
  },
  gsap: {
    type: 'js',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
  },
  lucide: {
    type: 'js',
    url: 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js'
  }
}
```

Assets são injetados uma única vez por página, mesmo que múltiplos componentes declarem o mesmo asset. O runtime deduplica automaticamente.

---

## 8. Runtime — Arquitetura Interna

O runtime é composto por módulos independentes e testáveis. Cada módulo tem responsabilidade única.

```
NexoRuntime
├── SchemaParser       — lê e valida o schema.json
├── ComponentResolver  — localiza arquivos de componentes
├── PropResolver       — valida e resolve props
├── Interpolator       — substitui {{ }} no template
├── AssetInjector      — injeta CSS/JS na página
├── MountEngine        — cria Web Components + Shadow DOM
└── LifecycleRunner    — executa hooks mounted/destroy
```

### Fluxo de execução

```
1. SchemaParser.parse(schemaPath)
        ↓
2. AssetInjector.injectGlobals(config.assets)
        ↓
3. Para cada <nexo-component> na página:
        ↓
4.   ComponentResolver.resolve(name, schema)
        ↓
5.   PropResolver.resolve(element.attributes, meta.props)
        ↓
6.   Interpolator.interpolate(component.html, resolvedProps)
        ↓
7.   AssetInjector.injectComponent(component.assets)
        ↓
8.   MountEngine.mount(element, interpolatedHtml, style.css)
        ↓
9.   LifecycleRunner.run('mounted', ctx)
```

### `SchemaParser`

Responsável por ler, parsear e validar o `schema.json`.

**Responsabilidades:**
- Ler o arquivo do disco
- Validar estrutura contra o tipo `NexoSchema`
- Retornar o schema tipado ou lançar erros descritivos
- Não faz side effects — apenas parse e validação

### `ComponentResolver`

Dado o nome de um componente, localiza e carrega seus arquivos.

**Responsabilidades:**
- Resolver o `source` path relativo ao root do projeto
- Carregar `component.html`, `style.css`, `script.js`, `meta.json`
- Cachear componentes já carregados para evitar I/O repetido
- Retornar erro claro se componente não encontrado

### `PropResolver`

Recebe os atributos HTML do `<nexo-component>` e o `meta.json` do componente. Retorna as props resolvidas e tipadas.

**Responsabilidades:**
- Aplicar defaults para props não fornecidas
- Converter tipos (string → number, "true" → boolean, etc.)
- Validar required props
- Logar warnings sem quebrar a execução

### `Interpolator`

Processa o template `component.html` substituindo `{{ propName }}` pelos valores resolvidos.

**Responsabilidades:**
- Substituição simples de `{{ prop }}`
- Suporte a `{{ prop | html }}` para HTML não-escaped
- Props ausentes resultam em string vazia, nunca em `undefined` ou erro

### `AssetInjector`

Injeta `<script>` e `<link>` tags na página, consultando o registry interno.

**Responsabilidades:**
- Injetar assets globais no `<head>` uma vez por página
- Injetar assets de componente quando o componente é montado
- Deduplicar assets já injetados (por URL)
- Respeitar ordem de injeção (CSS antes de JS)

### `MountEngine`

Cria o Web Component customizado e monta o conteúdo no Shadow DOM.

**Responsabilidades:**
- Registrar `customElements.define('nexo-component', ...)`
- Criar Shadow Root para cada instância
- Injetar HTML interpolado + CSS isolado no Shadow Root
- Expor referência ao Shadow Root no contexto do lifecycle

### `LifecycleRunner`

Carrega e executa os hooks do `script.js` do componente.

**Responsabilidades:**
- Importar o módulo `script.js` dinamicamente
- Construir o `ctx` (element, props, emit)
- Chamar `mounted(ctx)` após montagem
- Chamar `destroy(ctx)` quando componente é removido do DOM (via `MutationObserver` ou `disconnectedCallback`)

---

## 9. Dev Server

O dev server é iniciado via CLI (`nexo dev`) e serve a aplicação localmente com hot reload.

### Comportamento

- Serve arquivos estáticos do projeto
- Observa mudanças em `schema.json` e em qualquer arquivo de componente
- Em mudança: recarrega apenas os componentes afetados (partial reload)
- Injeta um script de live reload no HTML servido (apenas em dev)
- Porta configurável via `config.port` no `schema.json` (default: `3000`)

### Live reload script (injetado em dev)

```html
<!-- injetado automaticamente pelo dev server, não aparece no export -->
<script>
  const ws = new WebSocket('ws://localhost:3001')
  ws.onmessage = (e) => {
    const { type, component } = JSON.parse(e.data)
    if (type === 'full-reload') location.reload()
    if (type === 'component-reload') nexo.remount(component)
  }
</script>
```

### Estrutura interna do dev server

```
DevServer
├── HTTPServer    — serve arquivos estáticos + index.html gerado
├── FileWatcher   — observa schema.json e components/**/*
├── WSServer      — WebSocket para comunicação com o browser
└── HMRHandler    — decide entre full-reload e component-reload
```

**Regras de reload:**

| Arquivo alterado              | Ação                        |
|-------------------------------|-----------------------------|
| `schema.json`                 | Full reload                 |
| `components/X/component.html` | Remonta componente X        |
| `components/X/style.css`      | Remonta componente X        |
| `components/X/script.js`      | Remonta componente X        |
| `components/X/meta.json`      | Full reload                 |

---

## 10. Static Export

O static export gera HTML puro pronto para deploy em qualquer CDN ou hosting estático.

### Comando

```bash
nexo build
```

### Output

```
/dist
├── index.html          # página "/" com componentes inlined
├── sobre.html          # página "/sobre" (se existir)
└── assets/
    └── (assets locais copiados, se houver)
```

### Comportamento do export

- Resolve todos os componentes de cada página
- Interpola todas as props com seus defaults
- Inline do HTML + CSS de cada componente no documento final
- Injeta assets externos como `<link>` e `<script>` no `<head>`
- **Não** injeta o script de live reload
- Shadow DOM é mantido para isolamento em runtime no browser

### Estratégia de inlining

O HTML exportado é auto-suficiente. Cada componente é embutido como um Web Component com seu template e CSS dentro do próprio HTML:

```html
<!-- output gerado pelo nexo build -->
<nexo-component name="Hero" title="Pizza Artesanal" dark="true">
  <template shadowrootmode="open">
    <style>/* style.css do Hero */</style>
    <section class="hero">
      <h1>Pizza Artesanal</h1>
    </section>
  </template>
</nexo-component>
```

Isso usa **Declarative Shadow DOM** — suportado nativamente nos browsers modernos, sem necessidade de JavaScript para hidratação inicial.

---

## 11. TypeScript — Tipos e Interfaces

Toda a base de código do runtime deve ser escrita em TypeScript. Abaixo estão os tipos centrais.

### `NexoSchema`

```typescript
export interface NexoSchema {
  config: NexoConfig
  pages:  NexoPages
  components: Record<string, NexoComponentSchema>
}

export interface NexoConfig {
  name:   string
  port?:  number
  assets: AssetName[]
}

export type NexoPages = Record<string, string[]>
// ex: { "/": ["Hero", "Features", "Footer"] }
```

### `NexoComponentSchema`

```typescript
export interface NexoComponentSchema {
  source: string
  assets?: {
    css?: AssetName[]
    js?:  AssetName[]
  }
  props?: Record<string, PropDefinition>
}

export interface PropDefinition {
  type:      PropType
  default?:  PropValue
  required:  boolean
}

export type PropType  = 'string' | 'number' | 'boolean' | 'json'
export type PropValue = string | number | boolean | unknown[]
export type AssetName = string
```

### `ResolvedComponent`

```typescript
export interface ResolvedComponent {
  name:   string
  html:   string           // conteúdo de component.html
  css:    string           // conteúdo de style.css
  script: ComponentScript  // módulo exportado de script.js
  meta:   ComponentMeta    // conteúdo de meta.json
}

export interface ComponentMeta {
  name:  string
  props: Record<string, PropDefinition>
}

export interface ComponentScript {
  mounted?: (ctx: ComponentContext) => void | Promise<void>
  destroy?: (ctx: ComponentContext) => void | Promise<void>
}
```

### `ComponentContext`

```typescript
export interface ComponentContext {
  element: ShadowRoot
  props:   ResolvedProps
  emit:    (event: string, data?: unknown) => void
}

export type ResolvedProps = Record<string, PropValue>
```

### `AssetDefinition`

```typescript
export type AssetType = 'css' | 'js'

export interface AssetDefinition {
  type: AssetType
  url:  string
}

export type AssetRegistry = Record<AssetName, AssetDefinition>
```

### `MountContext`

```typescript
export interface MountContext {
  schema:    NexoSchema
  component: ResolvedComponent
  props:     ResolvedProps
  element:   HTMLElement
}
```

### `NexoRuntime` — interface principal

```typescript
export interface NexoRuntime {
  // inicializa o runtime com o schema
  init(schemaPath: string): Promise<void>

  // monta um componente em um elemento
  mount(name: string, element: HTMLElement, props?: ResolvedProps): Promise<void>

  // desmonta e limpa um componente
  unmount(element: HTMLElement): void

  // remonta (usado pelo HMR)
  remount(name: string): Promise<void>
}
```

---

## 12. CLI

O Nexo expõe uma CLI mínima com três comandos.

### Comandos

```bash
# Inicia o dev server com hot reload
nexo dev

# Gera o build estático para produção em /dist
nexo build

# Cria um novo projeto com estrutura base
nexo init <nome-do-projeto>
```

### `nexo init`

Cria a estrutura base do projeto:

```bash
nexo init pizza-landing
```

Gera:

```
pizza-landing/
├── schema.json         # schema de exemplo com Hero + Footer
├── index.html          # entry point de exemplo
└── components/
    ├── Hero/
    │   ├── component.html
    │   ├── style.css
    │   ├── script.js
    │   └── meta.json
    └── Footer/
        ├── component.html
        ├── style.css
        ├── script.js
        └── meta.json
```

### `nexo dev`

```bash
nexo dev
# → Nexo dev server running at http://localhost:3000
# → Watching schema.json and components/**/*
```

Flags:

| Flag         | Descrição                          | Default |
|--------------|------------------------------------|---------|
| `--port`     | Porta do servidor                  | `3000`  |
| `--schema`   | Caminho para o schema.json         | `./schema.json` |

### `nexo build`

```bash
nexo build
# → Building...
# → ✓ / → dist/index.html
# → ✓ /sobre → dist/sobre.html
# → Build complete in 120ms
```

Flags:

| Flag       | Descrição                   | Default  |
|------------|-----------------------------|----------|
| `--out`    | Diretório de output         | `./dist` |
| `--schema` | Caminho para o schema.json  | `./schema.json` |

---

## 13. Ordem de Implementação do MVP

Seguir esta sequência garante que cada módulo seja testável de forma independente antes do próximo.

### Etapa 1 — SchemaParser

- Ler `schema.json` do disco
- Validar estrutura com Zod (recomendado) ou verificação manual
- Retornar `NexoSchema` tipado
- Lançar erros descritivos para campos obrigatórios ausentes

**Entregável:** função `parseSchema(path: string): Promise<NexoSchema>`

---

### Etapa 2 — ComponentResolver

- Dado nome + schema, resolver o path do componente
- Carregar os 4 arquivos (`component.html`, `style.css`, `script.js`, `meta.json`)
- Implementar cache em memória (Map)
- Retornar `ResolvedComponent`

**Entregável:** função `resolveComponent(name: string, schema: NexoSchema): Promise<ResolvedComponent>`

---

### Etapa 3 — PropResolver

- Receber atributos do elemento HTML + meta.json do componente
- Aplicar defaults
- Converter tipos
- Validar required
- Retornar `ResolvedProps`

**Entregável:** função `resolveProps(attributes: NamedNodeMap, meta: ComponentMeta): ResolvedProps`

---

### Etapa 4 — Interpolator

- Receber HTML template + props resolvidas
- Substituir `{{ prop }}` por valores
- Suporte a `{{ prop | html }}`
- Nunca lançar erro — prop ausente = string vazia

**Entregável:** função `interpolate(template: string, props: ResolvedProps): string`

---

### Etapa 5 — AssetInjector

- Manter registry de assets conhecidos
- Injetar `<link>` ou `<script>` no documento
- Deduplicar por URL
- Respeitar ordem CSS → JS

**Entregável:** classe `AssetInjector` com métodos `injectGlobal(names)` e `injectComponent(assets)`

---

### Etapa 6 — MountEngine

- Registrar `<nexo-component>` como Custom Element
- Criar Shadow Root
- Injetar HTML interpolado + CSS
- Expor referência ao Shadow Root

**Entregável:** classe `MountEngine` com método `mount(context: MountContext)`

---

### Etapa 7 — LifecycleRunner

- Importar `script.js` dinamicamente
- Construir `ComponentContext`
- Chamar `mounted(ctx)`
- Observar remoção do DOM para chamar `destroy(ctx)`

**Entregável:** classe `LifecycleRunner` com métodos `run(hook, ctx)` e `observe(element)`

---

### Etapa 8 — Dev Server

- HTTP server servindo arquivos estáticos
- WebSocket server para live reload
- FileWatcher em `schema.json` e `components/**/*`
- Lógica de full-reload vs component-reload

**Entregável:** comando `nexo dev` funcional

---

### Etapa 9 — Static Export

- Iterar sobre `schema.pages`
- Para cada página, resolver e montar todos os componentes
- Serializar para HTML com Declarative Shadow DOM
- Escrever arquivos em `/dist`

**Entregável:** comando `nexo build` funcional

---

### Etapa 10 — CLI

- Registrar os três comandos (`init`, `dev`, `build`)
- Wiring de flags e argumentos
- Help text

**Entregável:** binário `nexo` publicável

---

## 14. Decisões Técnicas Registradas

Registro de decisões arquiteturais tomadas e seus motivos. Útil para não revisitar discussões encerradas.

| # | Decisão | Motivo |
|---|---------|--------|
| 1 | Um único `schema.json` em vez de `schema.json` + `nexo.yaml` | Fonte única de verdade, IA lê um arquivo e entende tudo |
| 2 | Props com `type + default + required` apenas (sem enum/validation no MVP) | Suficiente para o MVP, menos custo de escrever meta.json |
| 3 | Props passadas via atributos HTML | Natural para devs, compatível com Web Components padrão |
| 4 | Dev server + static export (sem SSR) | Landing pages não precisam de SSR; static é mais simples e mais rápido |
| 5 | Páginas como array ordenado no schema | Landing pages são sequências lineares; array é legível e editável por IA |
| 6 | Shadow DOM para isolamento | Sem CSS leakage, sem conflitos globais, padrão web nativo |
| 7 | Sem virtual DOM, sem reconciliação | Menor complexidade, runtime menor, comportamento previsível |
| 8 | Declarative Shadow DOM no static export | Sem necessidade de JS para hidratação inicial, SEO-friendly |
| 9 | TypeScript em toda a base de código | Tipos como documentação viva, autocomplete para contribuidores e para IA |
| 10 | Zod para validação do schema | Parse seguro com erros descritivos, inferência de tipos gratuita |

---

*Nexo — runtime declarativo, AI-native, focado em previsibilidade.*