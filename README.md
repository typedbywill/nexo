# Nexo

Runtime frontend declarativo e AI-native para landing pages e microsystems.

## Documentacao

- Especificacao completa: [docs/DOCUMENTATION.MD](docs/DOCUMENTATION.MD)
- Planejamento: [ROADMAP.md](ROADMAP.md)

## Instalacao

```bash
npm install
npm run build
npm link   # ou: npm install -g .
```

## Uso rapido

```bash
# Novo projeto
nexo init meu-site
cd meu-site

# Dev server com hot reload
nexo dev

# Export estatico (Declarative Shadow DOM)
nexo build
```

Flags uteis: `nexo dev --port 4000 --schema ./schema.json` · `nexo build --out ./dist`

## Desenvolvimento do runtime

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Exemplo end-to-end: [examples/pizza-landing](examples/pizza-landing)
