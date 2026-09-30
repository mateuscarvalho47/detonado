# Refactor Plan — Frontend Detonado

Histórico de padronização de tokens. O produto se chama Detonado. Este arquivo não descreve o estado atual da interface.

Plano de refatoração focado em padronização de design tokens, substituição de componentes nativos por shadcn/ui e remoção de valores arbitrários espalhados pelo código.

**Estimativa total:** ~6-7h de trabalho focado.

---

## Ordem de execução

Executar na sequência abaixo. Cada etapa é independente e pode ser commitada separadamente.

- [x] **Etapa 1** — `fontFamily` global no `index.css` (10min)
- [x] **Etapa 2** — Definir `@theme` tokens para text sizes e radius (20min)
- [x] **Etapa 3** — Instalar `Select` + substituir `<select>` nativos (1h)
- [x] **Etapa 4** — Instalar `DropdownMenu` + substituir sort dropdown (30min)
- [x] **Etapa 5** — Instalar `Checkbox` + `RadioGroup`/`ToggleGroup` (30min)
- [x] **Etapa 6** — Instalar `AlertDialog` + substituir `ConfirmRemoveModal` (20min)
- [x] **Etapa 7** — Substituir arbitrary text sizes (80+ casos) (2h)
- [x] **Etapa 8** — Substituir arbitrary `rounded` (20+ casos) (1h)
- [x] **Etapa 9** — Mover OKLCH hardcoded para utilities (30min)
- [x] **Etapa 10** — (opcional) Padronizar spacing inconsistente

---

## Etapa 1 — `fontFamily` global

**Prioridade:** MEDIUM
**Risco:** zero

### Problema

Hack `style={{ fontFamily: "inherit" }}` repetido em 30+ lugares para forçar fonte em `button`, `input`, `select`, `textarea`. Encontrado em `DetailEditForm.tsx`, `SearchModal.tsx`, forms de auth, etc.

### Ação

Adicionar em `apps/frontend/src/index.css`:

```css
@layer base {
  button, input, select, textarea {
    font-family: inherit;
  }
}
```

### Pós-ação

Buscar e remover todas as ocorrências de `style={{ fontFamily: "inherit" }}` e `fontFamily: "inherit"` inline:

```bash
rg 'fontFamily:\s*"inherit"' apps/frontend/src
```

---

## Etapa 2 — Design tokens no `@theme`

**Prioridade:** HIGH
**Risco:** baixo (só adiciona tokens, não muda nada ainda)

### Problema

Arbitrary values espalhados: `text-[14px]`, `text-[13.5px]`, `text-[23px]`, `text-[29px]`, `rounded-[8px]`, `rounded-[7px]`, `rounded-[5px]`.

### Ação

Adicionar no `index.css` dentro de `@theme`:

```css
@theme {
  /* Font sizes */
  --font-size-2xs: 0.6875rem;   /* 11px */
  --font-size-xs:  0.8125rem;   /* 13px — substitui text-[13.5px] */
  --font-size-sm:  0.875rem;    /* 14px — substitui text-[14px] */
  --font-size-md:  1rem;        /* 16px */
  --font-size-xl:  1.4375rem;   /* 23px — substitui text-[23px] */
  --font-size-2xl: 1.8125rem;   /* 29px — substitui text-[29px] */
}
```

> Tokens `--radius-sm`, `--radius-md`, `--radius-lg` já existem — verificar e ajustar se necessário.

---

## Etapa 3 — shadcn `Select`

**Prioridade:** HIGH

### Problema

`<select>` nativo em `DetailEditForm.tsx` e `AddToLibraryModal.tsx` — inacessível, sem estilo consistente.

### Ação

```bash
cd apps/frontend
pnpm dlx shadcn@latest add select
```

Substituir nos arquivos:
- `DetailEditForm.tsx`
- `AddToLibraryModal.tsx`

### Padrão de substituição

```tsx
// Antes
<select value={status} onChange={(e) => setStatus(e.target.value)}>
  <option value="PLAYING">Jogando</option>
  ...
</select>

// Depois
<Select value={status} onValueChange={setStatus}>
  <SelectTrigger>
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="PLAYING">Jogando</SelectItem>
    ...
  </SelectContent>
</Select>
```

---

## Etapa 4 — shadcn `DropdownMenu`

**Prioridade:** HIGH

### Problema

Sort dropdown manual em `LibraryScreen.tsx` — `useState` + `<div>` posicionado com `absolute`.

### Ação

```bash
pnpm dlx shadcn@latest add dropdown-menu
```

Substituir em `LibraryScreen.tsx`. Avaliar se `Popover` faz mais sentido caso o conteúdo não seja apenas itens clicáveis.

---

## Etapa 5 — shadcn `Checkbox` + `RadioGroup`/`ToggleGroup`

**Prioridade:** HIGH

### Problema

- `<input type="checkbox">` HTML nativo com styling custom em `RegisterForm.tsx`.
- Button group manual para status em `DetailEditForm.tsx` com estado local controlando seleção visual.

### Ação

```bash
pnpm dlx shadcn@latest add checkbox radio-group toggle-group
```

- `RegisterForm.tsx` → trocar `<input type="checkbox">` por `<Checkbox>`.
- `DetailEditForm.tsx` (status):
  - `RadioGroup` se for seleção única lógica (status do playthrough).
  - `ToggleGroup` se for mais visual/tátil (recomendado, já que são "botões de status").

---

## Etapa 6 — shadcn `AlertDialog`

**Prioridade:** HIGH

### Problema

`ConfirmRemoveModal.tsx` usa `Dialog` genérico para ação destrutiva. `AlertDialog` é semanticamente correto e tem foco automático no botão de cancelar.

### Ação

```bash
pnpm dlx shadcn@latest add alert-dialog
```

Refatorar `ConfirmRemoveModal.tsx`:

```tsx
<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remover da biblioteca?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm}>Remover</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Etapa 7 — Substituir arbitrary text sizes

**Prioridade:** HIGH
**Pré-requisito:** Etapa 2 concluída

### Mapeamento

| Arbitrário        | Substituir por |
| ----------------- | -------------- |
| `text-[11px]`     | `text-2xs`     |
| `text-[13px]`     | `text-xs`      |
| `text-[13.5px]`   | `text-xs`      |
| `text-[14px]`     | `text-sm`      |
| `text-[16px]`     | `text-md`      |
| `text-[23px]`     | `text-xl`      |
| `text-[29px]`     | `text-2xl`     |

### Busca

```bash
rg 'text-\[\d+(\.\d+)?px\]' apps/frontend/src
```

Substituir caso a caso — ler o contexto antes de aplicar, alguns tamanhos podem ser intencionalmente únicos.

---

## Etapa 8 — Substituir arbitrary `rounded`

**Prioridade:** MEDIUM

### Mapeamento

| Arbitrário      | Substituir por |
| --------------- | -------------- |
| `rounded-[5px]` | `rounded-sm`   |
| `rounded-[7px]` | `rounded-md`   |
| `rounded-[8px]` | `rounded-lg`   |

### Busca

```bash
rg 'rounded-\[\d+px\]' apps/frontend/src
```

---

## Etapa 9 — OKLCH hardcoded para utilities

**Prioridade:** MEDIUM

### Problema

Valores OKLCH repetidos em `style={{}}` de `SearchModal.tsx`, `ConsentModal.tsx`:

```tsx
style={{ boxShadow: "0 8px 32px oklch(0.5 0.18 17 / 0.12)" }}
```

### Ação

Adicionar em `index.css`:

```css
@layer utilities {
  .shadow-modal   { box-shadow: 0 8px 32px oklch(0.5 0.18 17 / 0.12); }
  .shadow-consent { box-shadow: 0 8px 32px oklch(1 0 0 / 0.06); }
}
```

Substituir os `style={{ boxShadow: ... }}` por `className="shadow-modal"` / `shadow-consent`.

### Busca

```bash
rg 'oklch\(' apps/frontend/src --type tsx
```

---

## Etapa 10 — (opcional) Spacing inconsistente

**Prioridade:** LOW

### Problema

Mistura de escala base 4px com incrementos de 2px: `h-9.5`, `gap-4.5`, `px-2.5`, `py-1.5`.

### Opções

**A)** Padronizar para escala base — arredondar para `h-9`/`h-10`, `gap-4`/`gap-5`. Decisão de design.

**B)** Manter incrementos e formalizar no `@theme`:

```css
@theme {
  --spacing-4_5: 1.125rem;  /* h-4.5, gap-4.5 */
  --spacing-9_5: 2.375rem;  /* h-9.5 */
}
```

> Recomendação: discutir com o time antes de aplicar. Se for refactor solo, **opção A** é mais limpa.

---

## Checklist final

Antes de fechar PR:

- [ ] `pnpm typecheck` passa
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
- [ ] Smoke test manual nos fluxos afetados: login/registro, biblioteca, detalhe de jogo, modal de remoção, busca
- [ ] Nenhum `style={{ fontFamily: "inherit" }}` restante
- [ ] Nenhum `text-[\d+px]` restante (exceto casos justificados em comentário)
- [ ] Nenhum `rounded-[\dpx]` restante
