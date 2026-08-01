/* ==========================================================================
   FONTE DE DADOS
   ==========================================================================
   Cole aqui o link CSV publicado da planilha (Google Sheets):
   Arquivo > Compartilhar > Publicar na web > escolha a aba "produtos" >
   formato "Valores separados por vírgula (.csv)" > Publicar > copie o link.

   Deixe vazio ("") para usar products.json local (modo offline/dev).
   Se o link estiver preenchido mas o fetch falhar (planilha despublicada,
   sem internet, etc.), o site cai automaticamente para products.json —
   nunca fica com a página em branco.
   ========================================================================== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vThrqwiWE-ZCFRSbXgJtY5ZSfVq-d9wtvG45udHeXRDUvO7Ly_TCW1FjZEzfj2dYQHiTOtTTpogBoUD/pub?gid=134983700&single=true&output=csv";

/* Colunas esperadas na planilha (nomes da primeira linha, sem acento):
   id | title | category | price | commissionPct | description |
   image1 | image2 | image3 | image4 | affiliateUrl | status | featured

   - status: "ativo" ou "pausado" (qualquer outra coisa some do site, não apaga a linha).
   - featured: TRUE/FALSE (checkbox do Sheets) ou "sim"/"nao".
   - category: escreva qualquer palavra (ex.: espelhos, decor, setup). Categoria
     nova = escrever uma palavra nova nessa coluna, o site cria a aba sozinho.
   - image1..image4: cole a URL da imagem. Só image1 é obrigatória.
*/

// Rótulos bonitos pra categorias conhecidas. Categoria que não estiver aqui
// aparece com a primeira letra maiúscula, automaticamente.
const CATEGORY_LABELS = {
  espelhos: "Espelhos",
  decor: "Objetos",
  setup: "Setup",
  acessorios: "Acessórios",
};

let allProducts = [];
let categories = [];
let activeCategory = "all";

async function init() {
  try {
    const products = await loadProducts();
    allProducts = products;
    categories = buildCategories(products);
    renderTabs();
    renderGrid();
  } catch (err) {
    document.getElementById("grid").innerHTML =
      '<div class="empty">Não foi possível carregar o catálogo. Verifique o link da planilha ou o arquivo products.json.</div>';
    console.error(err);
  }
}

async function loadProducts() {
  if (SHEET_CSV_URL) {
    try {
      return await loadFromSheet(SHEET_CSV_URL);
    } catch (err) {
      console.warn("Falha ao carregar da planilha, usando products.json local.", err);
    }
  }
  return await loadFromLocalJson();
}

async function loadFromLocalJson() {
  const res = await fetch("products.json");
  const data = await res.json();
  return (data.products || []).map(normalizeProduct).filter(Boolean);
}

async function loadFromSheet(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("CSV fetch falhou: " + res.status);
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("Planilha sem linhas de produto.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const records = rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== ""));

  return records
    .map((row) => {
      const obj = {};
      header.forEach((key, i) => (obj[key] = (row[i] || "").trim()));
      return normalizeProduct(obj);
    })
    .filter(Boolean);
}

// Parser CSV simples que respeita campos entre aspas (com vírgula ou quebra
// de linha dentro), como o export "Publicar na web" do Google Sheets gera.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (char === "\r") {
        // ignora, o \n seguinte fecha a linha
      } else {
        field += char;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeProduct(raw) {
  const id = String(raw.id || "").trim();
  const title = String(raw.title || "").trim();
  if (!id || !title) return null; // linha incompleta, ignora sem quebrar o site

  const rawImages = raw.image1 || raw.image
    ? [raw.image1 || raw.image, raw.image2, raw.image3, raw.image4]
    : [raw.image]; // compatibilidade com products.json antigo (campo "image" único)

  const images = rawImages
    .map((v) => (v || "").trim())
    .filter((v) => v && v !== "");

  return {
    id,
    title,
    category: String(raw.category || "outros").trim().toLowerCase(),
    price: parsePrice(raw.price),
    commissionPct: parsePercent(raw.commissionpct ?? raw.commissionPct),
    description: String(raw.description || "").trim(),
    images: images.length ? images : ["assets/placeholder.svg"],
    affiliateUrl: String(raw.affiliateurl ?? raw.affiliateUrl ?? "").trim(),
    status: String(raw.status || "ativo").trim().toLowerCase(),
    featured: parseBool(raw.featured),
  };
}

function parsePrice(v) {
  if (v === undefined || v === null || v === "") return 0;
  const cleaned = String(v).replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parsePercent(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace("%", "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseBool(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "true" || s === "sim" || s === "1" || s === "x";
}

function buildCategories(products) {
  const seen = new Map();
  products.forEach((p) => {
    if (!seen.has(p.category)) {
      seen.set(p.category, CATEGORY_LABELS[p.category] || capitalize(p.category));
    }
  });
  const dynamic = Array.from(seen, ([id, label]) => ({ id, label }));
  return [{ id: "all", label: "Todos" }, ...dynamic];
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function renderTabs() {
  const tabsEl = document.getElementById("tabs");
  tabsEl.innerHTML = "";
  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "tab" + (cat.id === activeCategory ? " active" : "");
    btn.textContent = cat.label;
    btn.addEventListener("click", () => {
      activeCategory = cat.id;
      renderTabs();
      renderGrid();
    });
    tabsEl.appendChild(btn);
  });
}

function renderGrid() {
  const gridEl = document.getElementById("grid");
  const filtered =
    activeCategory === "all"
      ? allProducts
      : allProducts.filter((p) => p.category === activeCategory);

  const active = filtered.filter((p) => p.status === "ativo");

  if (active.length === 0) {
    gridEl.innerHTML = '<div class="empty">Nenhum produto nessa categoria ainda.</div>';
    return;
  }

  gridEl.innerHTML = "";
  active.forEach((product) => {
    const card = document.createElement("div");
    card.className = "card";

    const dots = product.images
      .map((_, i) => `<span class="dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`)
      .join("");
    const hasMulti = product.images.length > 1;

    card.innerHTML = `
      <div class="card-img-wrap">
        ${product.featured ? '<span class="badge">Destaque</span>' : ""}
        <img src="${product.images[0]}" alt="${escapeHtml(product.title)}" loading="lazy">
        ${hasMulti ? `
          <button type="button" class="img-nav prev" aria-label="Imagem anterior">‹</button>
          <button type="button" class="img-nav next" aria-label="Próxima imagem">›</button>
          <div class="dots">${dots}</div>
        ` : ""}
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(product.title)}</div>
        ${product.description ? `<div class="card-desc">${escapeHtml(product.description)}</div>` : ""}
        <div class="card-price">R$ ${formatPrice(product.price)}</div>
        <div class="card-cta">Ver oferta</div>
      </div>
    `;

    if (hasMulti) {
      const imgEl = card.querySelector("img");
      const dotEls = Array.from(card.querySelectorAll(".dot"));
      let idx = 0;
      const setIdx = (n) => {
        idx = (n + product.images.length) % product.images.length;
        imgEl.src = product.images[idx];
        dotEls.forEach((d, i) => d.classList.toggle("active", i === idx));
      };
      card.querySelector(".prev").addEventListener("click", (e) => {
        e.stopPropagation();
        setIdx(idx - 1);
      });
      card.querySelector(".next").addEventListener("click", (e) => {
        e.stopPropagation();
        setIdx(idx + 1);
      });
      dotEls.forEach((d) =>
        d.addEventListener("click", (e) => {
          e.stopPropagation();
          setIdx(Number(d.dataset.i));
        })
      );
    }

    card.addEventListener("click", () => handleProductClick(product));
    gridEl.appendChild(card);
  });
}

function handleProductClick(product) {
  if (!product.affiliateUrl || product.affiliateUrl.startsWith("COLE_AQUI")) {
    console.warn("Produto sem link de afiliado configurado:", product.id);
    return;
  }

  // --- Meta Pixel ---
  // 'Lead' é o evento padrão mais adequado aqui: a conversão real (compra)
  // acontece dentro da Shopee/Mercado Livre, fora do nosso controle/tracking.
  if (typeof fbq === "function") {
    fbq("track", "Lead", {
      content_name: product.title,
      content_category: product.category,
      value: product.price,
      currency: "BRL",
    });
  }

  // --- TikTok Pixel ---
  if (typeof ttq !== "undefined") {
    ttq.track("ClickButton", {
      content_name: product.title,
      content_category: product.category,
      value: product.price,
      currency: "BRL",
    });
  }

  setTimeout(() => {
    window.open(product.affiliateUrl, "_blank", "noopener");
  }, 150);
}

function formatPrice(value) {
  return Number(value).toFixed(2).replace(".", ",");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
