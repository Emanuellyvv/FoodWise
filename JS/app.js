/**
 * ==========================================================================
 * FOODWISE — SCRIPT CENTRAL (Menu, Responsividade, Cadastro, Checkout)
 * ==========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenuResponsivo();
  carregarEstadoNavbar();
  detectarPaginaAtual();
});

// 1. RESPONSIVIDADE DO MENU NAVBAR
function inicializarMenuResponsivo() {
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const isOpen = hamburger.classList.toggle("open");
      mobileMenu.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", isOpen);
      mobileMenu.setAttribute("aria-hidden", !isOpen);
    });
  }

  // Fecha menu mobile ao clicar em links âncoras
  document.querySelectorAll(".mobile-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      hamburger?.classList.remove("open");
      mobileMenu?.classList.remove("open");
    });
  });
}

// 2. ATUALIZA ESTADO DA NAVBAR (AUTENTICAÇÃO & CARRINHO)
function carregarEstadoNavbar() {
  const session = DB.getSession();
  const counterElement = document.getElementById("cart-counter");

  // Conta itens no carrinho
  if (counterElement) {
    counterElement.textContent = DB.cartCount();
  }

  // Verifica Sessão de Usuário
  const loginBtn = document.getElementById("nav-btn-login");
  const cadastroBtn = document.getElementById("nav-btn-cadastro");
  const badgeProfile = document.getElementById("user-profile-badge");
  const initialsSpan = document.getElementById("user-initials");

  // Mobile Elements
  const mLogin = document.getElementById("mobile-btn-login");
  const mCadastro = document.getElementById("mobile-btn-cadastro");
  const mLogout = document.getElementById("mobile-btn-logout");

  if (session) {
    if (loginBtn) loginBtn.style.display = "none";
    if (cadastroBtn) cadastroBtn.style.display = "none";
    if (badgeProfile) {
      badgeProfile.style.display = "flex";
      initialsSpan.textContent = session.nome ? session.nome.charAt(0).toUpperCase() : "U";
    }

    if (mLogin) mLogin.style.display = "none";
    if (mCadastro) mCadastro.style.display = "none";
    if (mLogout) mLogout.style.display = "block";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-flex";
    if (cadastroBtn) cadastroBtn.style.display = "inline-flex";
    if (badgeProfile) badgeProfile.style.display = "none";

    if (mLogin) mLogin.style.display = "block";
    if (mCadastro) mCadastro.style.display = "block";
    if (mLogout) mLogout.style.display = "none";
  }
}

function logoutUsuario() {
  DB.logout();
  exibirToast("Sua sessão foi encerrada.", "info");
  setTimeout(() => {
    window.location.href = window.location.pathname.includes("pages/") ? "../index.html" : "index.html";
  }, 1000);
}

// 3. SELETOR DE PÁGINAS E SUAS EXECUÇÕES ESPECÍFICAS
function detectarPaginaAtual() {
  const path = window.location.pathname;

  if (path.endsWith("index.html") || path === "/" || path.endsWith("FoodWise/") || path.endsWith("FoodWise/index.html")) {
    carregarDestaquesHome();
  } else if (path.includes("form.html")) {
    configurarCadastroMultiStep();
  } else if (path.includes("login.html")) {
    configurarLogin();
  } else if (path.includes("menu.html")) {
    carregarCardapioCompleto();
    // Abre carrinho se requisitado por parâmetro
    if (new URLSearchParams(window.location.search).get("cart") === "open") {
      setTimeout(toggleCarrinho, 300);
    }
  } else if (path.includes("checkout.html")) {
    carregarResumoCheckout();
  }
}

// 4. PÁGINA INICIAL - DESTAQUES DO DIA
function carregarDestaquesHome() {
  const container = document.getElementById("featured-items");
  if (!container) return;

  const destaques = DB.getFeatured();
  container.innerHTML = destaques.map(p => `
    <article class="product-card" role="listitem">
      <div class="product-card-img">
        ${p.tag ? `<span class="product-tag ${p.tag}">${p.tag === 'promo' ? 'Promoção' : 'Saudável'}</span>` : ''}
        <div style="font-size: 5rem; display: flex; align-items: center; justify-content: center; height:100%; background: var(--cream-dark);">${p.emoji}</div>
      </div>
      <div class="product-card-body">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <span class="product-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
          <a href="pages/menu.html" class="add-to-cart-btn">Ver Detalhes</a>
        </div>
      </div>
    </article>
  `).join('');
}

// 5. PÁGINA DE CADASTRO MULTI-STEP
let etapaAtual = 1;
function configurarCadastroMultiStep() {
  const form = document.getElementById("foodwiseForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dadosCadastro = {
      nome: document.getElementById("nome").value.trim(),
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value.trim(), // Salva local
      senha: document.getElementById("password").value.trim(),    // Salva Supabase
      idade: parseInt(document.getElementById("idade").value),
      data_nascimento: document.getElementById("dataNascimento").value,
      cpf: document.getElementById("cpf").value.trim(),
      telefone: document.getElementById("telefone").value.trim(),
      endereco: document.getElementById("endereco").value.trim(),
      renda: parseFloat(document.getElementById("renda").value),
      orcamento: parseFloat(document.getElementById("orcamentoAlimentacao").value),
      estilo_vida: document.getElementById("estiloVida").value
    };

    const res = await DB.cadastrarUsuario(dadosCadastro);
    if (res.ok) {
      exibirToast("Cadastro FoodWise realizado com sucesso!", "success");
      setTimeout(() => {
        window.location.href = "pages/menu.html";
      }, 1500);
    } else {
      exibirToast(res.msg, "error");
    }
  });
}

function proximaEtapa() {
  // Validação simples da Etapa 1
  const campos = ["nome", "email", "password", "idade", "dataNascimento", "cpf", "telefone", "endereco", "renda", "orcamentoAlimentacao"];
  let valid = true;

  campos.forEach(cId => {
    const el = document.getElementById(cId);
    if (el && !el.checkValidity()) {
      el.classList.add("error");
      valid = false;
    } else if (el) {
      el.classList.remove("error");
    }
  });

  if (!valid) {
    exibirToast("Por favor, preencha todos os campos obrigatórios corretamente.", "error");
    return;
  }

  document.getElementById("etapa1").style.display = "none";
  document.getElementById("etapa2").style.display = "block";

  document.getElementById("step-dot-2").classList.add("active");
  document.getElementById("step-line-1").classList.add("active");
  etapaAtual = 2;
}

function etapaAnterior() {
  document.getElementById("etapa1").style.display = "block";
  document.getElementById("etapa2").style.display = "none";

  document.getElementById("step-dot-2").classList.remove("active");
  document.getElementById("step-line-1").classList.remove("active");
  etapaAtual = 1;
}

// 6. PÁGINA DE LOGIN
function configurarLogin() {
  const form = document.getElementById("foodwiseLoginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const senha = document.getElementById("login-password").value.trim();

    if (!email || !senha) {
      exibirToast("Preencha o e-mail e a senha corretos.", "error");
      return;
    }

    const res = await DB.loginUsuario(email, senha);
    if (res.ok) {
      exibirToast(`Olá ${res.user.nome.split(" ")[0]}, seja bem-vindo!`, "success");
      setTimeout(() => {
        window.location.href = "menu.html";
      }, 1200);
    } else {
      exibirToast(res.msg, "error");
    }
  });
}

// 7. PÁGINA DE CARDÁPIO COMPLETO
let categoriaAtiva = 'todos';

function carregarCardapioCompleto() {
  const container = document.getElementById("menu-items-container");
  if (!container) return;

  const itens = DB.getProducts(categoriaAtiva);
  
  if (itens.length === 0) {
    container.innerHTML = `<p style="grid-column: span 4; text-align: center; color: var(--neutral-500); padding: 3rem;">Nenhum produto encontrado nesta categoria.</p>`;
    return;
  }

  container.innerHTML = itens.map(p => `
    <article class="product-card">
      <div class="product-card-img">
        ${p.tag ? `<span class="product-tag ${p.tag}">${p.tag === 'promo' ? 'Promoção' : 'Saudável'}</span>` : ''}
        <div style="font-size: 5rem; display: flex; align-items: center; justify-content: center; height:100%; background: var(--cream-dark);">${p.emoji}</div>
      </div>
      <div class="product-card-body">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <span class="product-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
          <button onclick="adicionarAoCarrinho('${p.id}')" class="add-to-cart-btn">
            Adicionar 🛒
          </button>
        </div>
      </div>
    </article>
  `).join('');

  atualizarBannerOrcamento();
}

function selecionarCategoria(cat) {
  categoriaAtiva = cat;
  
  // Atualiza botões
  const chips = document.querySelectorAll("#category-chips-list .chip");
  chips.forEach(chip => {
    chip.classList.remove("active");
    if (chip.textContent.toLowerCase().includes(cat === 'todos' ? 'todos' : cat.substring(0, 4))) {
      chip.classList.add("active");
    }
  });

  carregarCardapioCompleto();
}

function filtrarCardapio() {
  const query = document.getElementById("menu-search-input").value.toLowerCase().trim();
  const container = document.getElementById("menu-items-container");
  if (!container) return;

  const itens = DB.getProducts(categoriaAtiva).filter(p => 
    p.name.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query)
  );

  container.innerHTML = itens.map(p => `
    <article class="product-card">
      <div class="product-card-img">
        ${p.tag ? `<span class="product-tag ${p.tag}">${p.tag === 'promo' ? 'Promoção' : 'Saudável'}</span>` : ''}
        <div style="font-size: 5rem; display: flex; align-items: center; justify-content: center; height:100%; background: var(--cream-dark);">${p.emoji}</div>
      </div>
      <div class="product-card-body">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <span class="product-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
          <button onclick="adicionarAoCarrinho('${p.id}')" class="add-to-cart-btn">
            Adicionar 🛒
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// 8. CONTROLE DO CARRINHO INTERATIVO (SIDEBAR)
function toggleCarrinho() {
  const cart = document.getElementById("cart-sidebar");
  if (cart) {
    const isOpen = cart.classList.toggle("open");
    cart.setAttribute("aria-hidden", !isOpen);
    if (isOpen) renderizarItensCarrinho();
  }
}

function adicionarAoCarrinho(pid) {
  DB.addToCart(pid, 1);
  carregarEstadoNavbar();
  renderizarItensCarrinho();
  exibirToast("Item adicionado ao seu carrinho!", "success");
}

function alterarQuantidadeItem(pid, novaQty) {
  DB.updateQty(pid, novaQty);
  carregarEstadoNavbar();
  renderizarItensCarrinho();
}

function removerDoCarrinho(pid) {
  DB.removeFromCart(pid);
  carregarEstadoNavbar();
  renderizarItensCarrinho();
  exibirToast("Item removido do carrinho.", "info");
}

function renderizarItensCarrinho() {
  const container = document.getElementById("cart-items-scroller");
  if (!container) return;

  const items = DB.getCart();

  if (items.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding: 3rem 1rem; color:var(--neutral-500);">Seu carrinho está vazio.</p>`;
    document.getElementById("cart-subtotal-price").textContent = "R$ 0,00";
    document.getElementById("cart-total-price").textContent = "R$ 0,00";
    document.getElementById("discount-display-line").style.display = "none";
    document.getElementById("cart-budget-alert-box").style.display = "none";
    return;
  }

  container.innerHTML = items.map(item => {
    const p = DB.getProduct(item.pid);
    if (!p) return '';
    return `
      <div class="cart-item-row">
        <span class="cart-item-emoji">${p.emoji}</span>
        <div class="cart-item-details">
          <h4 class="cart-item-name">${p.name}</h4>
          <span class="cart-item-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="cart-item-controls">
          <button onclick="alterarQuantidadeItem('${p.id}', ${item.qty - 1})" class="cart-qty-btn">-</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button onclick="alterarQuantidadeItem('${p.id}', ${item.qty + 1})" class="cart-qty-btn">+</button>
        </div>
        <button onclick="removerDoCarrinho('${p.id}')" class="cart-remove-btn" title="Excluir">✕</button>
      </div>
    `;
  }).join('');

  // Calcula Totais
  const total = DB.cartTotal();
  document.getElementById("cart-subtotal-price").textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  // Desconto de Primeira Compra se Aplicável
  const session = DB.getSession();
  let totalComDesconto = total;
  if (session && session.firstOrderDiscount > 0) {
    document.getElementById("discount-display-line").style.display = "flex";
    totalComDesconto = Math.max(0, total - 10);
  } else {
    document.getElementById("discount-display-line").style.display = "none";
  }
  document.getElementById("cart-total-price").textContent = `R$ ${totalComDesconto.toFixed(2).replace('.', ',')}`;

  // Calcula impacto orçamentário no carrinho
  atualizarAlertaOrcamentarioCarrinho(totalComDesconto);
}

function atualizarAlertaOrcamentarioCarrinho(totalPedido) {
  const alertBox = document.getElementById("cart-budget-alert-box");
  const messageEl = document.getElementById("cart-budget-alert-message");
  const session = DB.getSession();

  if (!alertBox || !messageEl) return;

  if (!session || !session.orcamento) {
    alertBox.style.display = "none";
    return;
  }

  const percentual = ((totalPedido / session.orcamento) * 100).toFixed(0);
  alertBox.style.display = "flex";
  
  if (percentual > 100) {
    alertBox.style.background = "rgba(200, 41, 74, 0.15)";
    alertBox.style.borderColor = "var(--red)";
    messageEl.innerHTML = `<strong>Bloqueio de Gastos:</strong> Este pedido ultrapassa o seu limite de orçamento disponível em <strong>${percentual - 100}%</strong>! Reduza itens ou substitua refeições.`;
  } else if (percentual > 50) {
    alertBox.style.background = "rgba(240, 180, 41, 0.15)";
    alertBox.style.borderColor = "var(--amber)";
    messageEl.innerHTML = `<strong>Atenção Orçamentária:</strong> Este pedido consome <strong>${percentual}%</strong> de toda a sua verba mensal para delivery.`;
  } else {
    alertBox.style.background = "rgba(74, 124, 47, 0.15)";
    alertBox.style.borderColor = "var(--green-mid)";
    messageEl.innerHTML = `<strong>Compra Segura:</strong> Este pedido representa apenas <strong>${percentual}%</strong> da sua meta mensal.`;
  }
}

function atualizarBannerOrcamento() {
  const banner = document.getElementById("financial-limit-banner");
  const title = document.getElementById("budget-banner-title");
  const desc = document.getElementById("budget-banner-desc");
  const actionBtn = document.getElementById("budget-banner-action");
  const session = DB.getSession();

  if (!banner) return;

  if (!session) {
    banner.className = "budget-banner-bar info";
    title.textContent = "Planeje seus gastos alimentares:";
    desc.textContent = "Faça login no FoodWise para monitorar e manter suas refeições dentro da sua meta real de economia.";
    actionBtn.style.display = "inline-flex";
    actionBtn.textContent = "Fazer Login";
    actionBtn.href = "login.html";
    return;
  }

  // Com sessão ativa
  banner.className = "budget-banner-bar success";
  title.textContent = `Orçamento Mensal de ${session.nome.split(" ")[0]}:`;
  desc.textContent = `Seu limite estabelecido é de R$ ${session.orcamento.toFixed(2).replace('.', ',')}. Nós impediremos você de gastar por impulso.`;
  actionBtn.style.display = "none";
}

function irParaCheckout() {
  const session = DB.getSession();
  if (!session) {
    exibirToast("Por favor, acesse sua conta ou crie uma para finalizar a compra.", "info");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  const items = DB.getCart();
  if (items.length === 0) {
    exibirToast("Adicione itens ao seu carrinho primeiro.", "error");
    return;
  }

  // Verifica estouro
  const total = DB.cartTotal();
  const totalComDesconto = session.firstOrderDiscount > 0 ? Math.max(0, total - 10) : total;
  if (totalComDesconto > session.orcamento) {
    exibirToast("Pedido bloqueado! O total geral excede sua meta de orçamento configurada no cadastro.", "error");
    return;
  }

  window.location.href = "checkout.html";
}

// 9. PÁGINA DE CHECKOUT E FORMAS DE PAGAMENTO
let metodoPagamentoSelecionado = "pix";

function carregarResumoCheckout() {
  const session = DB.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const addressInput = document.getElementById("checkout-address");
  if (addressInput && session.endereco) {
    addressInput.value = session.endereco;
  }

  const containerList = document.getElementById("checkout-items-preview-list");
  if (!containerList) return;

  const items = DB.getCart();
  if (items.length === 0) {
    window.location.href = "menu.html";
    return;
  }

  containerList.innerHTML = items.map(item => {
    const p = DB.getProduct(item.pid);
    if (!p) return '';
    return `
      <div class="checkout-item-preview-row">
        <span>${item.qty}x ${p.name}</span>
        <strong>R$ ${(p.price * item.qty).toFixed(2).replace('.', ',')}</strong>
      </div>
    `;
  }).join('');

  const total = DB.cartTotal();
  document.getElementById("checkout-subtotal-price").textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

  let totalGeral = total;
  if (session.firstOrderDiscount > 0) {
    document.getElementById("checkout-discount-line").style.display = "flex";
    totalGeral = Math.max(0, total - 10);
  } else {
    document.getElementById("checkout-discount-line").style.display = "none";
  }

  document.getElementById("checkout-total-price").textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

function mudarMetodoPagamento(metodo) {
  metodoPagamentoSelecionado = metodo;
  
  const tabs = document.querySelectorAll(".payment-tab-btn");
  tabs.forEach(tab => {
    tab.classList.remove("active");
    if (tab.textContent.toLowerCase().includes(metodo)) tab.classList.add("active");
  });

  document.getElementById("payment-pix-content").classList.remove("active");
  document.getElementById("payment-cartao-content").classList.remove("active");

  if (metodo === 'pix') {
    document.getElementById("payment-pix-content").classList.add("active");
  } else {
    document.getElementById("payment-cartao-content").classList.add("active");
  }
}

function copiarPixChave() {
  const code = document.getElementById("pix-copy-paste-code");
  if (code) {
    code.select();
    document.execCommand('copy');
    exibirToast("Código Pix Copiado com Sucesso!", "success");
  }
}

async function finalizarPedidoFoodwise() {
  const session = DB.getSession();
  const address = document.getElementById("checkout-address").value.trim();

  if (!address) {
    exibirToast("Por favor, preencha o seu endereço para entrega em Curitiba.", "error");
    return;
  }

  if (metodoPagamentoSelecionado === 'cartao') {
    const number = document.getElementById("card-number").value.trim();
    const name = document.getElementById("card-name").value.trim();
    const expiry = document.getElementById("card-expiry").value.trim();
    const cvv = document.getElementById("card-cvv").value.trim();

    if (!number || !name || !expiry || !cvv) {
      exibirToast("Por favor, preencha todos os dados do cartão de crédito.", "error");
      return;
    }
  }

  const total = DB.cartTotal();
  const totalFinal = session.firstOrderDiscount > 0 ? Math.max(0, total - 10) : total;

  // Monta objeto do pedido
  const pedido = {
    usuario_id: session.id,
    userId: session.id, // Compatibilidade Supabase/Local
    itens: DB.getCart(),
    total: totalFinal,
    endereco_entrega: address,
    forma_pagamento: metodoPagamentoSelecionado,
    data_pedido: new Date().toISOString()
  };

  const res = await DB.salvarPedido(pedido);

  if (res) {
    // Reduz limite de orçamento do usuário localmente para controle inteligente
    const novoOrcamentoRestante = Math.max(0, session.orcamento - totalFinal);
    DB.updateSession({ orcamento: novoOrcamentoRestante });

    const modal = document.getElementById("order-success-modal");
    const budgetNotice = document.getElementById("modal-updated-budget");
    
    if (budgetNotice) {
      budgetNotice.textContent = `R$ ${novoOrcamentoRestante.toFixed(2).replace('.', ',')} restantes para este mês.`;
    }

    if (modal) {
      modal.style.display = "flex";
    } else {
      exibirToast("Pedido confirmado com sucesso!", "success");
      setTimeout(() => { window.location.href = "../index.html"; }, 2000);
    }
  } else {
    exibirToast("Ocorreu um problema ao salvar seu pedido. Tente novamente.", "error");
  }
}

function irParaInicio() {
  window.location.href = "../index.html";
}

// 10. UTILS: TOAST SYSTEM
function exibirToast(mensagem, tipo = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  
  let icon = "ℹ️";
  if (tipo === 'success') icon = "✅";
  if (tipo === 'error') icon = "❌";

  toast.innerHTML = `<span>${icon}</span><p>${mensagem}</p>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => { toast.remove(); }, 300);
  }, 3500);
}
