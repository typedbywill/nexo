import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SCHEMA = `{
  "config": {
    "name": "{{name}}",
    "port": 3000,
    "assets": ["tailwind"]
  },
  "pages": {
    "/": ["Hero", "Footer"]
  },
  "components": {
    "Hero": {
      "source": "./components/Hero",
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
        }
      }
    },
    "Footer": {
      "source": "./components/Footer",
      "props": {}
    }
  }
}
`;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{name}}</title>
</head>
<body>
  <nexo-component name="Hero" title="A melhor pizza"></nexo-component>
  <nexo-component name="Footer"></nexo-component>
</body>
</html>
`;

const HERO_FILES: Record<string, string> = {
  "component.html": `<section class="hero">
  <h1>{{ title }}</h1>
  <p>{{ subtitle }}</p>
</section>
`,
  "style.css": `:host {
  display: block;
}

.hero {
  padding: 4rem 2rem;
  background: #1a1a1a;
  color: white;
  text-align: center;
}

h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  margin: 0 0 1rem;
}
`,
  "script.js": `export default {
  mounted(ctx) {
    console.log("Hero montado:", ctx.props);
  },
};
`,
  "meta.json": `{
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
    }
  }
}
`,
};

const FOOTER_FILES: Record<string, string> = {
  "component.html": `<footer class="footer">
  <p>&copy; {{ year }} {{ brand }}. Todos os direitos reservados.</p>
</footer>
`,
  "style.css": `:host {
  display: block;
}

.footer {
  padding: 2rem;
  text-align: center;
  background: #0f0f0f;
  color: #888;
}
`,
  "script.js": `export default {};
`,
  "meta.json": `{
  "name": "Footer",
  "props": {
    "year": {
      "type": "string",
      "default": "2026",
      "required": false
    },
    "brand": {
      "type": "string",
      "default": "Nexo App",
      "required": false
    }
  }
}
`,
};

async function writeComponent(
  baseDir: string,
  files: Record<string, string>,
): Promise<void> {
  await mkdir(baseDir, { recursive: true });

  for (const [fileName, content] of Object.entries(files)) {
    await writeFile(join(baseDir, fileName), content, "utf-8");
  }
}

export async function initProject(name: string, targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });

  const schema = SCHEMA.replaceAll("{{name}}", name);
  const indexHtml = INDEX_HTML.replaceAll("{{name}}", name);

  await writeFile(join(targetDir, "schema.json"), schema, "utf-8");
  await writeFile(join(targetDir, "index.html"), indexHtml, "utf-8");
  await writeComponent(join(targetDir, "components", "Hero"), HERO_FILES);
  await writeComponent(join(targetDir, "components", "Footer"), FOOTER_FILES);
}
