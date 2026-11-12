/* ==========================================================================
   FOODWISE — CARDÁPIO E CARRINHO (js/cardapio.js)
   O cardápio vem do GitHub (foodwise-db). Se você editar o JSON lá, o site
   se atualiza sozinho. Se algo falhar, a página mostra o MOTIVO na tela.
   ========================================================================== */

const ROTULOS_CATEGORIA = {
  fitness: 'Fitness', 'fast-food': 'Fast food', saladas: 'Saladas',
  'pratos-quentes': 'Pratos quentes', sobremesas: 'Sobremesas', bebidas: 'Bebidas'
};
const ROTULOS_OBJETIVO = {
  emagrecimento: 'Emagrecimento', 'ganho-de-massa': 'Ganho de massa',
  'alimentacao-equilibrada': 'Alimentação equilibrada', performance: 'Performance esportiva'
};

let CARDAPIO = [];               // lista completa de pratos
let ASSINATURA_CARDAPIO = '';    // texto usado para perceber se o cardápio mudou
let CARDAPIO_CARREGADO = false;  // vira true depois da primeira tentativa de carregar
let ULTIMO_ERRO = '';            // motivo da última falha (aparece na tela)
const FILTRO = { categoria: 'todos', busca: '' };

/* ---------- 1. Banco de dados (GitHub) ---------- */
async function carregarCardapio() {
  try {
    const controle = new AbortController();
    const limite = setTimeout(() => controle.abort(), 12000);
    // O "?t=" evita que o navegador/GitHub entreguem uma cópia antiga
    const resposta = await fetch(CONFIG.urlCardapio + '?t=' + Date.now(), { signal: controle.signal });
    clearTimeout(limite);
    if (!resposta.ok) {
      throw new Error('o GitHub respondeu HTTP ' + resposta.status + ' (confira o nome do arquivo e a branch em js/config.js)');
    }

    const texto = await resposta.text();
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch (erroJson) {
      throw new Error('o arquivo cardapio-dados.json tem erro de sintaxe: ' + erroJson.message);
    }
    if (!Array.isArray(dados) || !dados.length) throw new Error('o arquivo JSON está vazio ou não é uma lista de pratos');

    ULTIMO_ERRO = '';
    gravarJSON(CHAVES.cardapio, { salvoEm: Date.now(), itens: dados });
    return { itens: dados, origem: 'github' };
  } catch (erro) {
    ULTIMO_ERRO = erro.name === 'AbortError' ? 'o GitHub demorou demais para responder' : erro.message;
    console.warn('Não foi possível ler o cardápio do GitHub:', ULTIMO_ERRO);

    // Plano B: última cópia boa guardada neste aparelho
    const copia = lerJSON(CHAVES.cardapio, null);
    if (copia && Array.isArray(copia.itens) && copia.itens.length) return { itens: copia.itens, origem: 'copia' };
    // Plano C (opcional): arquivo local, caso você ainda mantenha js/dados-cardapio.js
    if (Array.isArray(window.DADOS_CARDAPIO_LOCAL) && window.DADOS_CARDAPIO_LOCAL.length) {
      return { itens: window.DADOS_CARDAPIO_LOCAL, origem: 'local' };
    }
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
        <button type="button" class="botao-adicionar" aria-label="Adicionar ${esc(p.nome)} ao carrinho" data-id="${esc(p.id)}">+</button>
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
  if (!grade || !CARDAPIO_CARREGADO) return;

  // Sem dados: mostra o motivo real na tela
  if (!CARDAPIO.length) {
    grade.innerHTML = `
      <p class="mensagem-vazia">Não foi possível carregar o cardápio.<br>
        <small>${esc(ULTIMO_ERRO || 'Verifique sua conexão com a internet.')}</small><br>
        <button type="button" class="link-como-botao" id="tentar-novamente">Tentar novamente</button>
      </p>`;
    return;
  }

  const termo = FILTRO.busca.trim().toLowerCase();
  const lista = CARDAPIO.filter((p) =>
    (FILTRO.categoria === 'todos' || p.categoria === FILTRO.categoria) &&
    (String(p.nome || '').toLowerCase().includes(termo) || String(p.descricao || '').toLowerCase().includes(termo)));

  grade.innerHTML = '';
  if (!lista.length) { grade.innerHTML = '<p class="mensagem-vazia">Nenhum prato encontrado para essa busca.</p>'; return; }

  const fragmento = document.createDocumentFragment();
  lista.forEach((p) => {
    // Se um prato do JSON estiver malformado, só ele é ignorado (o resto aparece)
    try { fragmento.appendChild(criarCartaoPrato(p)); } catch (erro) { console.warn('Prato inválido no JSON:', p, erro); }
  });
  grade.appendChild(fragmento);
  tratarImagens(grade);
}

async function atualizarCardapio() {
  const resultado = await carregarCardapio();
  CARDAPIO_CARREGADO = true;

  // Se a atualização falhou mas já havia pratos na tela, mantém os que estão
  if (!(resultado.itens.length === 0 && CARDAPIO.length > 0)) {
    const assinatura = JSON.stringify(resultado.itens);
    if (assinatura !== ASSINATURA_CARDAPIO) {
      CARDAPIO = resultado.itens;
      ASSINATURA_CARDAPIO = assinatura;
      renderizarCardapio();
      if (sincronizarCarrinho(CARDAPIO)) mostrarToast('O cardápio foi atualizado e seu carrinho foi ajustado.');
    }
  }

  const status = $('#status-cardapio');
  if (status) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const origens = { github: 'GitHub (ao vivo)', copia: 'cópia salva neste aparelho', local: 'arquivo local', erro: 'indisponível' };
    status.textContent = `${CARDAPIO.length} pratos · atualizado às ${hora} · fonte: ${origens[resultado.origem]}` +
      (resultado.origem !== 'github' && ULTIMO_ERRO ? ' · motivo: ' + ULTIMO_ERRO : '');
  }
}

// Mostra na tela qualquer erro inesperado (em vez de ficar parado em "Carregando...")
function mostrarErroCardapio(erro) {
  console.error('Erro no cardápio:', erro);
  const grade = $('#grade-cardapio');
  if (grade) grade.innerHTML = `<p class="mensagem-vazia">Erro ao exibir o cardápio.<br><small>${esc(erro && erro.message ? erro.message : erro)}</small></p>`;
}

function iniciarCardapio() {
  atualizarContadores();
  const grade = $('#grade-cardapio');
  if (!grade) return;

  // Clique em um cartão: botão "+" adiciona; o resto abre os detalhes
  const aoClicar = (evento) => {
    if (evento.target.closest('#tentar-novamente')) { atualizarCardapio().catch(mostrarErroCardapio); return; }
    const botao = evento.target.closest('.botao-adicionar');
    const cartao = evento.target.closest('.cartao-prato');
    if (!cartao) return;
    const prato = CARDAPIO.find((p) => String(p.id) === cartao.dataset.id);
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
  const busca = $('#busca-prato');
  if (busca) busca.addEventListener('input', (evento) => { FILTRO.busca = evento.target.value; renderizarCardapio(); });

  const flutuante = $('.carrinho-flutuante');
  if (flutuante) flutuante.addEventListener('click', () => { location.href = 'pagamento.html'; });

  atualizarCardapio().catch(mostrarErroCardapio);
  setInterval(() => atualizarCardapio().catch((e) => console.warn(e)), CONFIG.atualizarCardapioACadaMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) atualizarCardapio().catch((e) => console.warn(e));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try { iniciarCardapio(); } catch (erro) { mostrarErroCardapio(erro); }
});
