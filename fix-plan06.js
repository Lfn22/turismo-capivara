const fs = require('fs');
const path = 'C:/projetos/turismo-capivara/.planning/phases/05-painel-do-guia/05-06-PLAN.md';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Add GUIDE-04 to requirements frontmatter
const oldReqs = `requirements:
  - GUIDE-02
  - GUIDE-03`;
const newReqs = `requirements:
  - GUIDE-02
  - GUIDE-03
  - GUIDE-04`;
if (!content.includes(oldReqs)) { console.log('ERROR: Fix 1 (requirements) not found'); process.exit(1); }
content = content.replace(oldReqs, newReqs);
console.log('Fix 1: requirements updated');

// Fix 2: Add guides.routes.ts to files_modified
const oldFilesModified = `files_modified:
  - apps/web/app/[slug]/(painel)/painel/perfil/page.tsx
  - apps/web/app/[slug]/(admin)/admin/guias/page.tsx
  - apps/web/app/dashboard/page.tsx
  - apps/web/app/dashboard/reservas/page.tsx`;
const newFilesModified = `files_modified:
  - apps/web/app/[slug]/(painel)/painel/perfil/page.tsx
  - apps/web/app/[slug]/(admin)/admin/guias/page.tsx
  - apps/web/app/dashboard/page.tsx
  - apps/web/app/dashboard/reservas/page.tsx
  - apps/api/src/modules/guides/guides.routes.ts`;
if (!content.includes(oldFilesModified)) { console.log('ERROR: Fix 2 (files_modified) not found'); process.exit(1); }
content = content.replace(oldFilesModified, newFilesModified);
console.log('Fix 2: files_modified updated');

// Fix 3: Add must_haves truth + artifact + key_link for GUIDE-04
const oldMustHavesTruths = `  truths:
    - "Perfil renderiza formulário com campos Nome, Bio, Especialidades, Regiões, CPF/CNPJ (read-only)"
    - "Perfil exibe badge visual 'Guia Verificado' quando approvalStatus === APPROVED"
    - "Salvar perfil chama PATCH /tenants/:slug/guides/me/profile e exibe feedback de sucesso por 3 segundos"
    - "Admin Guias lista guias com status badge (Aguardando/Aprovado/Rejeitado)"
    - "Botão Aprovar Guia faz PATCH .../approve sem modal"
    - "Botão Rejeitar Guia abre modal com textarea obrigatória antes de confirmar"
    - "Páginas antigas app/dashboard/ são removidas após telas novas verificadas"`;
const newMustHavesTruths = `  truths:
    - "Perfil renderiza formulário com campos Nome, Bio, Especialidades, Regiões, CPF/CNPJ (read-only)"
    - "Perfil exibe badge visual 'Guia Verificado' quando approvalStatus === APPROVED"
    - "Salvar perfil chama PATCH /tenants/:slug/guides/me/profile e exibe feedback de sucesso por 3 segundos"
    - "Guia pode adicionar/remover URLs de fotos do portfólio na tela de perfil (GUIDE-04)"
    - "PATCH /guides/me/profile aceita campo portfolioPhotos String[] e persiste no banco"
    - "Admin Guias lista guias com status badge (Aguardando/Aprovado/Rejeitado)"
    - "Botão Aprovar Guia faz PATCH .../approve sem modal"
    - "Botão Rejeitar Guia abre modal com textarea obrigatória antes de confirmar"
    - "Páginas antigas app/dashboard/ são removidas após telas novas verificadas"`;
if (!content.includes(oldMustHavesTruths)) { console.log('ERROR: Fix 3 (truths) not found'); process.exit(1); }
content = content.replace(oldMustHavesTruths, newMustHavesTruths);
console.log('Fix 3: must_haves truths updated');

// Fix 4: Add artifact for portfolioPhotos in perfil/page.tsx
const oldArtifact = `    - path: "apps/web/app/[slug]/(painel)/painel/perfil/page.tsx"
      provides: "tela de perfil do guia com badge verificado"
      contains: "Guia Verificado"`;
const newArtifact = `    - path: "apps/web/app/[slug]/(painel)/painel/perfil/page.tsx"
      provides: "tela de perfil do guia com badge verificado e gestão de portfólio (GUIDE-04)"
      contains: "Guia Verificado"
    - path: "apps/api/src/modules/guides/guides.routes.ts"
      provides: "PATCH /guides/me/profile aceita portfolioPhotos"
      contains: "portfolioPhotos"`;
if (!content.includes(oldArtifact)) { console.log('ERROR: Fix 4 (artifact) not found'); process.exit(1); }
content = content.replace(oldArtifact, newArtifact);
console.log('Fix 4: artifacts updated');

// Fix 5: Add key_link for portfolioPhotos
const oldKeyLinks = `    - from: "perfil/page.tsx"
      to: "PATCH /tenants/:slug/guides/me/profile"
      via: "useSession → fetch com token"
      pattern: "guides/me/profile"`;
const newKeyLinks = `    - from: "perfil/page.tsx"
      to: "PATCH /tenants/:slug/guides/me/profile"
      via: "useSession → fetch com token"
      pattern: "guides/me/profile"
    - from: "perfil/page.tsx portfolioPhotos section"
      to: "PATCH /tenants/:slug/guides/me/profile { portfolioPhotos: string[] }"
      via: "addUrl/removeUrl handlers → save submit"
      pattern: "portfolioPhotos"`;
if (!content.includes(oldKeyLinks)) { console.log('ERROR: Fix 5 (key_links) not found'); process.exit(1); }
content = content.replace(oldKeyLinks, newKeyLinks);
console.log('Fix 5: key_links updated');

// Fix 6: Insert new Task 1.5 (portfolio photos) between </task> after Task 1 and <task type="auto"> of Task 2
// The separator between Task 1 and Task 2 is:
const taskBoundary = `  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Criar admin/guias/page.tsx e remover páginas legacy</name>`;

const newPortfolioTask = `  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 1.5: Adicionar gestão de portfólio de fotos (GUIDE-04)</name>
  <read_first>
    - apps/api/src/modules/guides/guides.routes.ts (confirmar updateProfileBodySchema e endpoint PATCH /guides/me/profile — criado em Plan 01)
    - apps/web/app/[slug]/(painel)/painel/perfil/page.tsx (já criado em Task 1 — adicionar seção de portfólio)
  </read_first>
  <files>
    apps/api/src/modules/guides/guides.routes.ts,
    apps/web/app/[slug]/(painel)/painel/perfil/page.tsx
  </files>
  <action>
**Parte 1 — Atualizar API (guides.routes.ts) para aceitar portfolioPhotos (per GUIDE-04):**

Localizar o schema `updateProfileBodySchema` no topo do arquivo (criado em Plan 01) e adicionar o campo:

```typescript
const updateProfileBodySchema = z.object({
  bio: z.string().optional(),
  photoUrl: z.string().url({ message: 'URL inválida' }).optional().nullable(),
  especialidades: z.array(z.string()).optional(),
  regioes: z.array(z.string()).optional(),
  portfolioPhotos: z.array(z.string().url({ message: 'URL inválida' })).optional(),  // GUIDE-04
})
```

Localizar o endpoint `PATCH /tenants/:slug/guides/me/profile` e atualizar o bloco `data` do `prisma.guideProfile.update`:

```typescript
data: {
  ...(body.bio !== undefined && { bio: body.bio }),
  ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
  ...(body.especialidades !== undefined && { especialidades: body.especialidades }),
  ...(body.regioes !== undefined && { regioes: body.regioes }),
  ...(body.portfolioPhotos !== undefined && { portfolioPhotos: body.portfolioPhotos }),  // GUIDE-04
},
```

Atualizar também o `select` do `prisma.guideProfile.update` para incluir `portfolioPhotos`:

```typescript
select: {
  id: true,
  bio: true,
  photoUrl: true,
  especialidades: true,
  regioes: true,
  portfolioPhotos: true,  // GUIDE-04
},
```

**Parte 2 — Atualizar perfil/page.tsx para gestão de portfólio (per GUIDE-04):**

Adicionar ao state do componente (logo após os campos existentes de bio/especialidades/regioes):

```typescript
const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([])
const [newPhotoUrl, setNewPhotoUrl] = useState("")
const [photoUrlError, setPhotoUrlError] = useState<string | null>(null)
```

Inicializar portfolioPhotos no useEffect onde o perfil é carregado (após setRegioes):
```typescript
setPortfolioPhotos(data.portfolioPhotos ?? [])
```

Incluir portfolioPhotos no corpo do PATCH ao salvar perfil (junto com bio, especialidades, regioes):
```typescript
body: JSON.stringify({
  bio,
  especialidades: especialidades.split(",").map((s) => s.trim()).filter(Boolean),
  regioes: regioes.split(",").map((s) => s.trim()).filter(Boolean),
  portfolioPhotos,  // GUIDE-04
}),
```

Adicionar seção de portfólio na UI (após a seção de Regiões, antes do botão Salvar):

```typescript
{/* Portfólio de Fotos — GUIDE-04 */}
<div style={{ marginBottom: "24px" }}>
  <label style={{ display: "block", fontSize: "14px", color: "var(--stone-700)", marginBottom: "8px", fontWeight: 600 }}>
    Portfólio de Fotos
  </label>

  {/* Lista de fotos existentes */}
  {portfolioPhotos.length > 0 && (
    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
      {portfolioPhotos.map((url, idx) => (
        <li
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "8px 12px",
            background: "var(--stone-50)",
            border: "1px solid var(--stone-200)",
            borderRadius: "4px",
          }}
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "13px", color: "var(--ochre)", wordBreak: "break-all", flex: 1 }}
          >
            {url}
          </a>
          <button
            type="button"
            onClick={() => setPortfolioPhotos((prev) => prev.filter((_, i) => i !== idx))}
            aria-label={`Remover foto ${idx + 1}`}
            style={{
              background: "transparent",
              border: "none",
              color: "#DC2626",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            Remover
          </button>
        </li>
      ))}
    </ul>
  )}

  {/* Input para adicionar nova URL */}
  <div style={{ display: "flex", gap: "8px" }}>
    <input
      type="url"
      value={newPhotoUrl}
      onChange={(e) => { setNewPhotoUrl(e.target.value); setPhotoUrlError(null) }}
      placeholder="https://exemplo.com/foto.jpg"
      aria-label="URL da foto"
      style={{
        flex: 1,
        padding: "8px 12px",
        border: \`1px solid \${photoUrlError ? "#DC2626" : "var(--stone-300)"}\`,
        borderRadius: "4px",
        fontSize: "16px",
        color: "var(--stone-800)",
        background: "white",
      }}
    />
    <button
      type="button"
      onClick={() => {
        if (!newPhotoUrl.trim()) { setPhotoUrlError("Informe uma URL."); return }
        try { new URL(newPhotoUrl) } catch { setPhotoUrlError("URL inválida."); return }
        setPortfolioPhotos((prev) => [...prev, newPhotoUrl.trim()])
        setNewPhotoUrl("")
        setPhotoUrlError(null)
      }}
      style={{
        background: "var(--ochre)",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        fontSize: "14px",
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Adicionar
    </button>
  </div>
  {photoUrlError && (
    <p style={{ fontSize: "14px", color: "#DC2626", marginTop: "4px" }}>{photoUrlError}</p>
  )}
  <p style={{ fontSize: "12px", color: "var(--stone-400)", marginTop: "4px" }}>
    Adicione URLs de fotos do seu portfólio. Máximo recomendado: 10 fotos.
  </p>
</div>
```

MVP: URL input list — sem upload de arquivo (upload em fase futura). Fotos são salvas como parte do PATCH perfil ao clicar "Salvar Alterações".
  </action>
  <verify>
    <automated>cd C:/projetos/turismo-capivara && grep "portfolioPhotos" "apps/api/src/modules/guides/guides.routes.ts" && grep "portfolioPhotos" "apps/web/app/[slug]/(painel)/painel/perfil/page.tsx" && pnpm --filter @turismo/api build 2>&1 | tail -3</automated>
  </verify>
  <done>
    - guides.routes.ts aceita portfolioPhotos no Zod schema e no Prisma update/select
    - perfil/page.tsx tem seção "Portfólio de Fotos" com lista de URLs + botão Adicionar/Remover
    - Salvar Alterações envia portfolioPhotos[] no corpo do PATCH
    - API build passa sem erros TypeScript
  </done>
  <acceptance_criteria>
    - grep "portfolioPhotos" "apps/api/src/modules/guides/guides.routes.ts" → retorna match (Zod schema + Prisma)
    - grep "portfolioPhotos" "apps/web/app/[slug]/(painel)/painel/perfil/page.tsx" → retorna match
    - grep "Portfólio de Fotos" "apps/web/app/[slug]/(painel)/painel/perfil/page.tsx" → retorna match
    - curl -X PATCH .../guides/me/profile -d '{"portfolioPhotos":["https://ex.com/a.jpg"]}' → 200 com portfolioPhotos no body
    - pnpm --filter @turismo/api build exits 0
    - pnpm --filter @turismo/web build exits 0
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: Criar admin/guias/page.tsx e remover páginas legacy</name>`;

if (!content.includes(taskBoundary)) { console.log('ERROR: Fix 6 (task boundary) not found'); process.exit(1); }
content = content.replace(taskBoundary, newPortfolioTask);
console.log('Fix 6: portfolio task inserted');

fs.writeFileSync(path, content, 'utf8');
console.log('Plan 06 updated successfully');
