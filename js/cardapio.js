/* ==========================================================================
   FOODWISE — CARDÁPIO E CARRINHO (js/cardapio.js)
   O cardápio vem do GitHub (foodwise-db). Se você editar o JSON lá, o site
   se atualiza sozinho. O carrinho acompanha as mudanças de preço e nome.
   ========================================================================== */

const ROTULOS_CATEGORIA = {
  fitness: 'Fitness', 'fast-food': 'Fast food', saladas: 'Saladas',
  'pratos-quentes': 'Pratos quentes', sobremesas: 'Sobremesas', bebidas: 'Bebidas'
};
const ROTULOS_OBJETIVO = {
  emagrecimento: 'Emagrecimento', 'ganho-de-massa': 'Ganho de massa',
  'alimentacao-equilibrada': 'Alimentação equilibrada', performance: 'Performance esportiva'
};

let CARDAPIO = [foodwise-db];             // lista completa de pratos
let ASSINATURA_CARDAPIO = '';  // texto usado para perceber se o cardápio mudou
const FILTRO = { categoria: 'todos', busca: '' };

/* ---------- 1. Banco de dados (GitHub) ---------- */
async function carregarCardapio() {
  try {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 8000);
    // O "?t=" evita que o navegador/GitHub entreguem uma cópia antiga
    const resposta = await fetch(CONFIG.urlCardapio + '?t=' + Date.now(), { signal: controle.signal, cache: 'no-store' });
    clearTimeout(limite);
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    const dados = await resposta.json();
    if (!Array.isArray(dados) || !dados.length) throw new Error('JSON vazio');
    gravarJSON(CHAVES.cardapio, { salvoEm: Date.now(), itens: dados });
    return { itens: dados, origem: 'github' };
  } catch (erro) {
    console.warn('Não foi possível ler o cardápio do GitHub:', erro);
    const copia = lerJSON(CHAVES.cardapio, null);
    if (copia && Array.isArray(copia.itens)) return { itens: copia.itens, origem: 'copia' };
    return { itens: [], origem: 'erro' };
  }
}

/* ---------- 2. Carrinho ---------- */
function obterCarrinho() { return lerJSON(CHAVES.carrinho, []); }
function salvarCarrinho(carrinho) { gravarJSON(CHAVES.carrinho, carrinho); }
function totalItensCarrinho() { return obterCarrinho().reduce((t, i) => t + i.quantidade, 0); }
function subtotalCarrinho() { return arredondar(obterCarrinho().reduce((t, i) => t + i.preco * i.quantidade, 0)); }

function atualizarContadores() {
  const total = totalItensCarrinho();
  const contador = $('.carrinho-flutuante .contador');
  if (contador) contador.textContent = total;
  const mobile = $('.contador-mobile');
  if (mobile) { mobile.textContent = total; mobile.style.display = total > 0 ? 'flex' : 'none'; }
}

function adicionarAoCarrinho(prato) {
  const carrinho = obterCarrinho();
  const existente = carrinho.find((i) => i.id === prato.id);
  if (existente) existente.quantidade += 1;
  else carrinho.push({ id: prato.id, nome: prato.nome, preco: prato.preco, imagem: prato.imagem, quantidade: 1 });
  salvarCarrinho(carrinho);
  atualizarContadores();
}

function alterarQuantidade(id, delta) {
  const carrinho = obterCarrinho();
  const item = carrinho.find((i) => i.id === id);
  if (!item) return;
  item.quantidade += delta;
  salvarCarrinho(item.quantidade > 0 ? carrinho : carrinho.filter((i) => i.id !== id));
  atualizarContadores();
}

function removerDoCarrinho(id) {
  salvarCarrinho(obterCarrinho().filter((i) => i.id !== id));
  atualizarContadores();
}

// Ajusta o carrinho ao cardápio atual (preço, nome, foto; remove pratos que saíram)
function sincronizarCarrinho(itens) {
  if (!itens.length) return false;
  let mudou = false;
  const atualizado = [];
  obterCarrinho().forEach((item) => {
    const prato = itens.find((p) => p.id === item.id);
    if (!prato) { mudou = true; return; }
    if (prato.preco !== item.preco || prato.nome !== item.nome || prato.imagem !== item.imagem) mudou = true;
    atualizado.push(Object.assign({}, item, { nome: prato.nome, preco: prato.preco, imagem: prato.imagem }));
  });
  if (mudou) { salvarCarrinho(atualizado); atualizarContadores(); }
  return mudou;
}

/* ---------- 3. Informações nutricionais e indicação por objetivo ---------- */
// Usa valores do JSON (proteinas, carboidratos, gorduras, fibras, sodio). Se não houver, estima.
function nutricaoDoPrato(p) {
  if (p.proteinas != null && p.carboidratos != null && p.gorduras != null) {
    return { estimado: false, prot: p.proteinas, carb: p.carboidratos, gord: p.gorduras, fibras: p.fibras, sodio: p.sodio };
  }
  const selo = p.selo || '';
  const kcal = p.calorias || 0;
  let r = [20, 50, 30]; // % das calorias: proteína, carboidrato, gordura
  if (/Alta prote/.test(selo)) r = [35, 35, 30];
  else if (p.categoria === 'bebidas') r = [4, 90, 6];
  else if (p.categoria === 'fast-food') r = [15, 45, 40];
  else if (/Low carb/.test(selo)) r = [30, 15, 55];
  return { estimado: true, prot: Math.round(kcal * r[0] / 400), carb: Math.round(kcal * r[1] / 400), gord: Math.round(kcal * r[2] / 900) };
}

// Use o campo "indicado" no JSON para escolher manualmente. Se não houver, o site calcula.
function indicadoPara(p) {
  if (Array.isArray(p.indicado) && p.indicado.length) return p.indicado;
  if (p.categoria === 'fast-food') return [];
  const kcal = p.calorias || 0;
  const selo = p.selo || '';
  const objetivos = [];
  if (kcal <= 350 || /Low carb|Detox/.test(selo)) objetivos.push('emagrecimento');
  if (/Alta prote/.test(selo) && kcal >= 300) objetivos.push('ganho-de-massa');
  if (/Alta prote/.test(selo) || p.categoria === 'fitness') objetivos.push('performance');
  if (kcal <= 500) objetivos.push('alimentacao-equilibrada');
  return objetivos;
}

/* ---------- 4. Cartões e janela de detalhes ---------- */
function criarCartaoPrato(p) {
  const cartao = document.createElement('article');
  cartao.className = 'cartao-prato';
  cartao.dataset.categoria = p.categoria;
  cartao.dataset.id = p.id;
  cartao.tabIndex = 0;
  cartao.setAttribute('role', 'button');
  cartao.setAttribute('aria-label', 'Ver detalhes de ' + p.nome);
  cartao.innerHTML = `
    <div class="imagem-prato">
      <span class="selo-prato">${esc(p.selo)}</span>
      <span class="info-nutri">${esc(p.calorias)} kcal</span>
      <img src="${esc(p.imagem)}" alt="${esc(p.nome)}" loading="lazy" data-fallback />
    </div>
    <div class="conteudo-prato">
      <div class="topo-prato"><h3>${esc(p.nome)}</h3><span class="preco-prato">${paraMoeda(p.preco)}</span></div>
      <p class="descricao">${esc(p.descricao)}</p>
      <div class="rodape-prato">
        <span class="avaliacao-prato"><span class="estrela">★</span> ${esc(p.avaliacao)}</span>
        <button type="button" class="botao-adicionar" aria-label="Adicionar ${esc(p.nome)} ao carrinho" data-id="${p.id}">+</button>
      </div>
    </div>`;
  return cartao;
}

function abrirDetalhesPrato(p) {
  const n = nutricaoDoPrato(p);
  const usuario = obterSessao();
  const aprox = n.estimado ? '≈ ' : '';
  const indicados = indicadoPara(p);
  const tags = indicados.length
    ? indicados.map((o) => {
        const meu = usuario && usuario.objetivo === o;
        return `<span${meu ? ' class="destaque"' : ''}>${meu ? '⭐ ' : ''}${ROTULOS_OBJETIVO[o] || esc(o)}</span>`;
      }).join('')
    : '<span>Consumo ocasional</span>';

  const modal = criarModal('modal-prato');
  abrirModal(modal, `
    <img class="modal-imagem" src="${esc(p.imagem)}" alt="${esc(p.nome)}" data-fallback />
    <div class="modal-corpo">
      <span class="selo-status">${esc(p.selo)}</span>
      <h2>${esc(p.nome)}</h2>
      <p>${esc(p.descricao)}</p>
      <p><strong>${paraMoeda(p.preco)}</strong> · ★ ${esc(p.avaliacao)} · ${ROTULOS_CATEGORIA[p.categoria] || ''}</p>
      <h3>Informações nutricionais</h3>
      <table class="tabela-nutri">
        <tr><td>Calorias</td><td>${esc(p.calorias)} kcal</td></tr>
        <tr><td>Proteínas</td><td>${aprox}${n.prot} g</td></tr>
        <tr><td>Carboidratos</td><td>${aprox}${n.carb} g</td></tr>
        <tr><td>Gorduras</td><td>${aprox}${n.gord} g</td></tr>
        ${n.fibras != null ? `<tr><td>Fibras</td><td>${n.fibras} g</td></tr>` : ''}
        ${n.sodio != null ? `<tr><td>Sódio</td><td>${n.sodio} mg</td></tr>` : ''}
      </table>
      ${n.estimado ? '<p class="nota-pequena">Valores aproximados, estimados a partir das calorias.</p>' : ''}
      <h3>Mais indicado para</h3>
      <div class="tags-objetivo">${tags}</div>
      <button type="button" class="botao botao-primario botao-bloco" id="botao-modal-adicionar">+ Adicionar ao carrinho</button>
    </div>`);
  tratarImagens(modal);
  $('#botao-modal-adicionar').addEventListener('click', function () {
    adicionarAoCarrinho(p);
    this.textContent = '✓ Adicionado!';
  });
}

/* ---------- 5. Lista, filtros e atualização automática ---------- */
function renderizarCardapio() {
  const grade = $('#grade-cardapio');
  if (!grade) return;

  if (!CARDAPIO.length) {
    grade.innerHTML = '<p class="mensagem-vazia">Não foi possível carregar o cardápio. <button type="button" class="link-como-botao" id="tentar-novamente">Tentar novamente</button></p>';
    return;
  }
  const termo = FILTRO.busca.trim().toLowerCase();
  const lista = CARDAPIO.filter((p) =>
    (FILTRO.categoria === 'todos' || p.categoria === FILTRO.categoria) &&
    (p.nome.toLowerCase().includes(termo) || (p.descricao || '').toLowerCase().includes(termo)));

  grade.innerHTML = '';
  if (!lista.length) { grade.innerHTML = '<p class="mensagem-vazia">Nenhum prato encontrado para essa busca.</p>'; return; }
  const fragmento = document.createDocumentFragment();
  lista.forEach((p) => fragmento.appendChild(criarCartaoPrato(p)));
  grade.appendChild(fragmento);
  tratarImagens(grade);
}

async function atualizarCardapio() {
  const resultado = await carregarCardapio();
  const status = $('#status-cardapio');
  const assinatura = JSON.stringify(resultado.itens);

  if (assinatura !== ASSINATURA_CARDAPIO) {
    CARDAPIO = resultado.itens;
    ASSINATURA_CARDAPIO = assinatura;
    renderizarCardapio();
    if (sincronizarCarrinho(CARDAPIO)) mostrarToast('O cardápio foi atualizado e seu carrinho foi ajustado.');
  }
  if (status) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const origem = { github: 'GitHub (ao vivo)', copia: 'cópia salva no aparelho', erro: 'indisponível' }[resultado.origem];
    status.textContent = `${CARDAPIO.length} pratos · atualizado às ${hora} · fonte: ${origem}`;
  }
}

function iniciarCardapio() {
  atualizarContadores();
  const grade = $('#grade-cardapio');
  if (!grade) return;

  // Clique em um cartão: botão "+" adiciona; resto abre os detalhes
  const aoClicar = (evento) => {
    if (evento.target.closest('#tentar-novamente')) { atualizarCardapio(); return; }
    const botao = evento.target.closest('.botao-adicionar');
    const cartao = evento.target.closest('.cartao-prato');
    if (!cartao) return;
    const prato = CARDAPIO.find((p) => p.id === Number(cartao.dataset.id));
    if (!prato) return;
    if (botao) {
      adicionarAoCarrinho(prato);
      botao.textContent = '✓';
      botao.classList.add('adicionado');
      setTimeout(() => { botao.textContent = '+'; botao.classList.remove('adicionado'); }, 700);
    } else {
      abrirDetalhesPrato(prato);
    }
  };
  grade.addEventListener('click', aoClicar);
  grade.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && evento.target.classList.contains('cartao-prato')) aoClicar(evento);
  });

  const filtros = $$('.filtro-tag');
  filtros.forEach((filtro) => filtro.addEventListener('click', () => {
    filtros.forEach((f) => f.classList.remove('ativo'));
    filtro.classList.add('ativo');
    FILTRO.categoria = filtro.dataset.categoria;
    renderizarCardapio();
  }));
  $('#busca-prato').addEventListener('input', (evento) => { FILTRO.busca = evento.target.value; renderizarCardapio(); });

  const flutuante = $('.carrinho-flutuante');
  if (flutuante) flutuante.addEventListener('click', () => { location.href = 'pagamento.html'; });

  atualizarCardapio();
  setInterval(atualizarCardapio, CONFIG.atualizarCardapioACadaMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) atualizarCardapio(); });
}

document.addEventListener('DOMContentLoaded', iniciarCardapio);
