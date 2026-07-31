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

## Atualizar produtos

Edite `products.json`. Estrutura de cada produto:

```json
{
  "id": "prod-003",
  "title": "Nome do produto",
  "category": "decor",
  "price": 99.90,
  "commissionPct": 15,
  "image": "assets/prod-003.jpg",
  "affiliateUrl": "https://shopee.com.br/SEU-LINK",
  "status": "ativo",
  "featured": false
}
```

- `status`: use `"ativo"` para aparecer na página, `"pausado"` para tirar sem apagar o registro.
- `category`: precisa bater com um dos `id` em `categories` (topo do JSON). Adicionar categoria nova = adicionar objeto em `categories` + usar o `id` nos produtos.
- `image`: coloque o arquivo em `assets/` e referencie o caminho relativo. Sem foto ainda → deixe `assets/placeholder.svg`.

Esse mesmo arquivo pode, no futuro, ser gerado automaticamente a partir da planilha de controle (export CSV → JSON) em vez de editado à mão — mas por enquanto edição manual é suficiente pro volume inicial.

## Por que esse formato

- **Catálogo em grid**: serve tanto para tráfego orgânico (link único na bio cobrindo todos os produtos) quanto para campanha de ads geral. Se depois for necessário uma landing de produto único para uma campanha específica, isso vira uma segunda página — não altera essa.
- **Evento `Lead` em vez de `Purchase`**: a compra acontece na Shopee, fora do nosso tracking. Reportar `Purchase` sem confirmação real violaria a política de eventos das plataformas de ads e comprometeria a otimização. `Lead`/`ClickButton` são honestos com o que a página realmente sabe: houve intenção de clique.
- **Sem framework/build step**: menos peça para quebrar, deploy instantâneo, zero dependência para manter.
