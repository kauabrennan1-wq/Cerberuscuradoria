# Cerberus Finds — Bridge Page

Página estática (sem framework) para servir como landing de campanhas de ads e destino do link na bio. Catálogo puxado de `products.json`, pixels instalados em `index.html`, tracking de clique em `script.js`.

## Deploy no Vercel

1. Crie um repositório no GitHub com esses arquivos (ou arraste a pasta direto no dashboard do Vercel — "Add New Project" > "Deploy" sem precisar de Git, funciona pra projeto estático).
2. Framework preset: **Other** (não é Next.js, não precisa de build step).
3. Deploy. URL gerada: `cerberus-finds.vercel.app` (ou o nome que você escolher).
4. Domínio próprio depois: Vercel > Settings > Domains > adicionar domínio e apontar DNS.

## Antes de colocar tráfego pago

1. **Trocar os IDs de pixel** em `index.html`:
   - `SEU_PIXEL_ID_META` → ID do Meta Pixel (Events Manager).
   - `SEU_PIXEL_ID_TIKTOK` → ID do TikTok Pixel (Ads Manager > Assets > Events).
2. **Testar os pixels antes de rodar campanha**:
   - Meta: instale a extensão "Meta Pixel Helper" no Chrome, abra a página, clique num produto, confirme que o evento `Lead` disparou.
   - TikTok: use o "TikTok Pixel Helper" (extensão equivalente).
3. **Criar evento de conversão personalizado** no Ads Manager de cada plataforma baseado no evento `Lead` (Meta) / `ClickButton` (TikTok) — é isso que você vai otimizar a campanha para, já que a conversão real acontece dentro da Shopee.

## Atualizar produtos (via Google Sheets)

O catálogo não é mais editado direto no código. Uma planilha do Google Sheets é a fonte de verdade; o site lê ela sozinho a cada carregamento. Adicionar produto novo = adicionar linha na planilha pelo celular, sem abrir o GitHub.

### 1. Criar a planilha

Crie uma planilha nova com uma aba chamada `produtos` e esta linha de cabeçalho exata na primeira linha (copie e cole):

```
id	title	category	price	commissionPct	description	image1	image2	image3	image4	affiliateUrl	status	featured
```

| Coluna | O que colocar |
|---|---|
| `id` | Identificador único e curto, ex.: `prod-003`. Nunca repita um `id`. |
| `title` | Nome do produto como vai aparecer no card. |
| `category` | Uma palavra, ex.: `espelhos`, `decor`, `setup`. Categoria nova = escrever uma palavra nova aqui; a aba de filtro aparece sozinha no site. |
| `price` | Só o número, ex.: `99.90` ou `99,90` (os dois formatos funcionam). |
| `commissionPct` | Número da comissão, ex.: `15` (uso interno, não aparece pro visitante). |
| `description` | Frase curta (1–2 linhas; o card corta automaticamente se passar disso). |
| `image1` | URL da imagem principal. **Obrigatória.** |
| `image2`, `image3`, `image4` | URLs adicionais, opcionais. Se preenchidas, o card ganha setas/bolinhas de navegação entre fotos. Pode deixar em branco. |
| `affiliateUrl` | Link gerado no app da Shopee/Mercado Livre. |
| `status` | `ativo` (aparece no site) ou `pausado` (some do site sem apagar a linha — útil pra produto esgotado). |
| `featured` | `TRUE` ou `FALSE` (marque via checkbox se transformar a coluna em checkbox no Sheets, ou digite `sim`/`nao`). |

Preencha as linhas seguintes com um produto por linha, usando o app do Google Sheets no celular.

### 2. Publicar a planilha como CSV

1. No Sheets: **Arquivo > Compartilhar > Publicar na Web**.
2. No primeiro menu, selecione a aba `produtos` (não "Documento inteiro").
3. No segundo menu, selecione **"Valores separados por vírgula (.csv)"**.
4. Clique em **Publicar**, confirme, e copie o link gerado.

Nota: "Publicar na web" é diferente de "Compartilhar/Restringir acesso" — a planilha pode continuar com edição restrita à sua conta; só o link CSV publicado fica acessível para o site ler. Se algum dia quiser derrubar o site, é só ir em Publicar na Web novamente e clicar em "Parar publicação".

### 3. Conectar o site à planilha

Abra `script.js` e cole o link copiado na primeira linha do arquivo:

```js
const SHEET_CSV_URL = "https://docs.google.com/.../pub?output=csv";
```

Salve, faça commit/push (ou reenvie a pasta no Vercel). A partir daí, qualquer edição na planilha aparece no site no próximo carregamento de página — sem precisar mexer em código de novo.

### Se `SHEET_CSV_URL` ficar vazio

O site usa `products.json` como catálogo (modo offline/dev). Isso também funciona como rede de segurança automática: se o link da planilha cair ou for despublicado por engano, o site usa esse arquivo local em vez de mostrar uma página quebrada.

## Notas desta atualização

- **Fonte de dados**: migrada de edição manual de `products.json` no GitHub para planilha Google Sheets publicada como CSV. Motivo: edição manual de JSON pelo celular é frágil (erro de sintaxe quebra o site inteiro) e não escala para 100–200 produtos. `products.json` continua existindo como fallback offline, não como fonte principal.
- **Múltiplas imagens por produto**: adicionadas colunas `image2`, `image3`, `image4` (opcionais). Card com mais de uma imagem ganha setas e indicador de bolinhas para navegar sem sair do grid.
- **Card com tamanho inconsistente**: correção aplicada foi truncar título (2 linhas) e descrição (2 linhas) via CSS, e trocar `align-items: stretch` (padrão do grid) por `align-items: start`, para que um produto com texto mais longo não force os cards vizinhos na mesma linha a crescerem junto. **Suposição**: essa era a causa mais provável do "card grande" descrito, mas não foi confirmada visualmente (o fetch da URL só retornou o HTML estático antes do JavaScript rodar). Se o problema persistir após o deploy, descreva ou mande print do card específico que ainda está errado.

## Por que esse formato

- **Catálogo em grid**: serve tanto para tráfego orgânico (link único na bio cobrindo todos os produtos) quanto para campanha de ads geral. Se depois for necessário uma landing de produto único para uma campanha específica, isso vira uma segunda página — não altera essa.
- **Evento `Lead` em vez de `Purchase`**: a compra acontece na Shopee, fora do nosso tracking. Reportar `Purchase` sem confirmação real violaria a política de eventos das plataformas de ads e comprometeria a otimização. `Lead`/`ClickButton` são honestos com o que a página realmente sabe: houve intenção de clique.
- **Sem framework/build step**: menos peça para quebrar, deploy instantâneo, zero dependência para manter.
