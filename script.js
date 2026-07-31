let allProducts = [];
let categories = [];
let activeCategory = "all";

async function init() {
  try {
    const res = await fetch("products.json");
    const data = await res.json();
    allProducts = data.products || [];
    categories = data.categories || [{ id: "all", label: "Todos" }];
    renderTabs();
    renderGrid();
  } catch (err) {
    document.getElementById("grid").innerHTML =
      '<div class="empty">Não foi possível carregar o catálogo. Verifique se products.json está no mesmo diretório.</div>';
    console.error(err);
  }
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
    card.innerHTML = `
      <div class="card-img-wrap">
        ${product.featured ? '<span class="badge">Destaque</span>' : ""}
        <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(product.title)}</div>
        ${product.description ? `<div class="card-desc">${escapeHtml(product.description)}</div>` : ""}
        <div class="card-price">R$ ${formatPrice(product.price)}</div>
        <div class="card-cta">Ver oferta</div>
      </div>
    `;
    card.addEventListener("click", () => handleProductClick(product));
    gridEl.appendChild(card);
  });
}

function handleProductClick(product) {
  // --- Meta Pixel ---
  // 'Lead' é o evento padrão mais adequado aqui: a conversão real (compra)
  // acontece dentro da Shopee, fora do nosso controle/tracking. 'Lead' sinaliza
  // ao algoritmo de otimização que esse clique tem intenção comercial.
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

  // Pequeno delay para garantir que o evento saia antes do redirect.
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
