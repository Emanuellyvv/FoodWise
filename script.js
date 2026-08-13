/* ==========================================================================
   FOODWISE — SCRIPT PRINCIPAL
   Projeto de TCC — JavaScript separado do HTML e do CSS

   Este arquivo é 100% front-end (não existe servidor/backend no projeto).
   O "cadastro" e "login" funcionam de verdade — as contas são criadas e
   persistidas no localStorage do navegador, e o login realmente confere
   e-mail/senha contra essas contas. Isso é suficiente para demonstrar o
   fluxo completo de autenticação em um projeto estático (GitHub Pages),
   mas não substitui um backend real com banco de dados server-side: por
   isso a senha aqui passa só por uma ofuscação simples (não é
   criptografia forte). Se um dia vocês adicionarem um backend de verdade
   (Node, Firebase, Supabase etc.), essas mesmas funções podem ser
   trocadas por chamadas de API sem mudar o resto do site.
   ========================================================================== */

/* ------------------------------------------------------------------
   CONFIGURAÇÃO DO BANCO DE DADOS (GITHUB)
   ------------------------------------------------------------------
   URL "raw" do arquivo cardapio-dados.json no repositório foodwise-db.
   Enquanto a URL não for configurada (ou se o GitHub estiver
   inacessível), o site usa automaticamente o banco de dados local
   embutido em js/dados-cardapio.js, então o cardápio nunca fica vazio.
   ------------------------------------------------------------------ */
const URL_BANCO_DE_DADOS_GITHUB = "https://raw.githubusercontent.com/Emanuellyvv/foodwise-db/main/cardapio-dados.json";

const CHAVE_CARRINHO = "foodwise_carrinho";
const CHAVE_ULTIMO_PEDIDO = "foodwise_ultimo_pedido";
const CHAVE_USUARIOS = "foodwise_usuarios";
const CHAVE_SESSAO = "foodwise_sessao";
const TAXA_ENTREGA = 6.90;

/* ==========================================================================
   FUNÇÕES UTILITÁRIAS DE MOEDA
   ========================================================================== */
function paraNumero(textoMoeda) {
  return parseFloat(
    String(textoMoeda).replace('R$', '').trim().replace(/\./g, '').replace(',', '.')
  );
}

function paraMoeda(valorNumerico) {
  const valor = isNaN(valorNumerico) ? 0 : valorNumerico;
  return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

function validarEmail(valor) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(String(valor || '').trim());
}

/* ==========================================================================
   CARRINHO DE COMPRAS (PERSISTENTE VIA localStorage)
   Isso permite que os itens adicionados no cardápio apareçam
   corretamente na página de pagamento, mesmo mudando de página.
   ========================================================================== */
function obterCarrinho() {
  try {
    const dados = localStorage.getItem(CHAVE_CARRINHO);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.error('Erro ao ler o carrinho:', erro);
    return [];
  }
}

function salvarCarrinho(carrinho) {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  } catch (erro) {
    console.error('Erro ao salvar o carrinho:', erro);
  }
}

function adicionarAoCarrinho(prato) {
  const carrinho = obterCarrinho();
  const existente = carrinho.find(function (item) { return item.id === prato.id; });

  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({
      id: prato.id,
      nome: prato.nome,
      preco: prato.preco,
      imagem: prato.imagem,
      quantidade: 1
    });
  }

  salvarCarrinho(carrinho);
  atualizarContadorCarrinho();
}

function alterarQuantidade(id, delta) {
  const carrinho = obterCarrinho();
  const item = carrinho.find(function (i) { return i.id === id; });
  if (!item) return;

  item.quantidade += delta;

  const carrinhoAtualizado = item.quantidade > 0
    ? carrinho
    : carrinho.filter(function (i) { return i.id !== id; });

  salvarCarrinho(carrinhoAtualizado);
  atualizarContadorCarrinho();
  renderizarResumoPagamento();
}

function removerDoCarrinho(id) {
  const carrinho = obterCarrinho().filter(function (i) { return i.id !== id; });
  salvarCarrinho(carrinho);
  atualizarContadorCarrinho();
  renderizarResumoPagamento();
}

function totalItensCarrinho() {
  return obterCarrinho().reduce(function (total, item) { return total + item.quantidade; }, 0);
}

function subtotalCarrinho() {
  return obterCarrinho().reduce(function (total, item) { return total + (item.preco * item.quantidade); }, 0);
}

function atualizarContadorCarrinho() {
  const total = totalItensCarrinho();
  const contador = document.querySelector('.carrinho-flutuante .contador');
  if (contador) contador.textContent = total;

  const contadorMobile = document.querySelector('.contador-mobile');
  if (contadorMobile) {
    contadorMobile.textContent = total;
    contadorMobile.style.display = total > 0 ? 'flex' : 'none';
  }
}

/* ==========================================================================
   CARREGAMENTO DO BANCO DE DADOS DO CARDÁPIO
   Tenta buscar o banco de dados hospedado no GitHub. Se a busca falhar
   (sem internet, CORS, link errado etc.), usa o banco de dados local
   como reserva — assim o cardápio nunca fica vazio.
   ========================================================================== */
async function carregarCardapio() {
  try {
    const controlador = new AbortController();
    const tempoLimite = setTimeout(function () { controlador.abort(); }, 4000);

    const resposta = await fetch(URL_BANCO_DE_DADOS_GITHUB, { signal: controlador.signal, cache: 'no-store' });
    clearTimeout(tempoLimite);

    if (resposta.ok) {
      const dadosRemotos = await resposta.json();
      if (Array.isArray(dadosRemotos) && dadosRemotos.length > 0) {
        console.info('Cardápio carregado do banco de dados no GitHub (foodwise-db).');
        return dadosRemotos;
      }
    }
  } catch (erro) {
    console.warn('Não foi possível acessar o banco de dados no GitHub. Usando dados locais.', erro);
  }

  return (typeof window !== 'undefined' && Array.isArray(window.DADOS_CARDAPIO_LOCAL))
    ? window.DADOS_CARDAPIO_LOCAL
    : [];
}

/* ==========================================================================
   RENDERIZAÇÃO DOS CARTÕES DE PRATO (CARDÁPIO)
   ========================================================================== */
function criarCartaoPrato(prato) {
  const artigo = document.createElement('article');
  artigo.className = 'cartao-prato';
  artigo.dataset.categoria = prato.categoria;
  artigo.dataset.nome = prato.nome;

  artigo.innerHTML = `
    <div class="imagem-prato">
      <span class="selo-prato">${prato.selo}</span>
      <span class="info-nutri">${prato.calorias} kcal</span>
      <img src="${prato.imagem}" alt="${prato.nome}" loading="lazy" />
    </div>
    <div class="conteudo-prato">
      <div class="topo-prato">
        <h3>${prato.nome}</h3>
        <span class="preco-prato">${paraMoeda(prato.preco)}</span>
      </div>
      <p class="descricao">${prato.descricao}</p>
      <div class="rodape-prato">
        <span class="avaliacao-prato"><span class="estrela">★</span> ${prato.avaliacao}</span>
        <button type="button" class="botao-adicionar" aria-label="Adicionar ${prato.nome} ao carrinho" data-id="${prato.id}">+</button>
      </div>
    </div>
  `;

  return artigo;
}

let CARDAPIO_COMPLETO = [];
let CUPOM_APLICADO = false;

function aplicarFiltrosCardapio() {
  const gradeCardapio = document.getElementById('grade-cardapio');
  if (!gradeCardapio) return;

  const categoriaAtivaEl = document.querySelector('.filtro-tag.ativo');
  const categoria = categoriaAtivaEl ? categoriaAtivaEl.dataset.categoria : 'todos';
  const campoBusca = document.getElementById('busca-prato');
  const termoBusca = campoBusca ? campoBusca.value.trim().toLowerCase() : '';

  const filtrados = CARDAPIO_COMPLETO.filter(function (prato) {
    const combinaCategoria = categoria === 'todos' || prato.categoria === categoria;
    const combinaBusca = prato.nome.toLowerCase().includes(termoBusca) ||
      (prato.descricao || '').toLowerCase().includes(termoBusca);
    return combinaCategoria && combinaBusca;
  });

  gradeCardapio.innerHTML = '';

  if (filtrados.length === 0) {
    gradeCardapio.innerHTML = '<p class="mensagem-vazia">Nenhum prato encontrado para essa busca.</p>';
    return;
  }

  const fragmento = document.createDocumentFragment();
  filtrados.forEach(function (prato) {
    fragmento.appendChild(criarCartaoPrato(prato));
  });
  gradeCardapio.appendChild(fragmento);

  // Vincula o evento de "adicionar ao carrinho" nos botões recém-criados
  gradeCardapio.querySelectorAll('.botao-adicionar').forEach(function (botao) {
    botao.addEventListener('click', function () {
      const id = Number(botao.dataset.id);
      const prato = CARDAPIO_COMPLETO.find(function (p) { return p.id === id; });
      if (!prato) return;

      adicionarAoCarrinho(prato);

      botao.textContent = '✓';
      botao.classList.add('adicionado');
      setTimeout(function () {
        botao.textContent = '+';
        botao.classList.remove('adicionado');
      }, 700);
    });
  });
}

async function inicializarCardapio() {
  const gradeCardapio = document.getElementById('grade-cardapio');
  if (!gradeCardapio) return;

  gradeCardapio.innerHTML = '<p class="mensagem-vazia">Carregando cardápio...</p>';

  CARDAPIO_COMPLETO = await carregarCardapio();
  aplicarFiltrosCardapio();
  atualizarContadorCarrinho();

  const filtros = document.querySelectorAll('.filtro-tag');
  filtros.forEach(function (filtro) {
    filtro.addEventListener('click', function () {
      filtros.forEach(function (f) { f.classList.remove('ativo'); });
      filtro.classList.add('ativo');
      aplicarFiltrosCardapio();
    });
  });

  const campoBusca = document.getElementById('busca-prato');
  if (campoBusca) {
    campoBusca.addEventListener('input', aplicarFiltrosCardapio);
  }
}

/* ==========================================================================
   RENDERIZAÇÃO DO RESUMO DE PAGAMENTO (DINÂMICO, A PARTIR DO CARRINHO)
   ========================================================================== */
function renderizarResumoPagamento() {
  const listaResumo = document.getElementById('lista-itens-resumo');
  if (!listaResumo) return;

  const carrinho = obterCarrinho();
  const botaoFinalizar = document.getElementById('botao-finalizar-pagamento');
  const linhaDesconto = document.getElementById('linha-desconto');

  if (carrinho.length === 0) {
    listaResumo.innerHTML = `
      <div class="carrinho-vazio">
        <p>Seu carrinho está vazio.</p>
        <a href="cardapio.html" class="botao botao-primario">Ver cardápio</a>
      </div>
    `;
    CUPOM_APLICADO = false;
    const campoCupomEl = document.getElementById('campo-cupom');
    const botaoCupomEl = document.getElementById('botao-cupom');
    if (campoCupomEl) { campoCupomEl.disabled = false; campoCupomEl.value = ''; }
    if (botaoCupomEl) botaoCupomEl.disabled = false;

    const valorSubtotalEl = document.getElementById('valor-subtotal');
    const valorTaxaEl = document.getElementById('valor-taxa');
    const valorTotalEl = document.getElementById('valor-total-final');
    if (valorSubtotalEl) valorSubtotalEl.textContent = paraMoeda(0);
    if (valorTaxaEl) valorTaxaEl.textContent = paraMoeda(0);
    if (valorTotalEl) valorTotalEl.textContent = paraMoeda(0);
    if (linhaDesconto) linhaDesconto.style.display = 'none';
    if (botaoFinalizar) botaoFinalizar.disabled = true;
    return;
  }

  if (botaoFinalizar) botaoFinalizar.disabled = false;

  listaResumo.innerHTML = '';
  carrinho.forEach(function (item) {
    const linha = document.createElement('div');
    linha.className = 'item-resumo';
    linha.innerHTML = `
      <div class="nome-item">
        <span>${item.nome}</span>
        <div class="controle-quantidade">
          <button type="button" class="botao-qtd" data-acao="diminuir" data-id="${item.id}" aria-label="Diminuir quantidade">−</button>
          <span class="qtd-item">${item.quantidade} un.</span>
          <button type="button" class="botao-qtd" data-acao="aumentar" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
          <button type="button" class="botao-remover" data-id="${item.id}" aria-label="Remover item">🗑</button>
        </div>
      </div>
      <span>${paraMoeda(item.preco * item.quantidade)}</span>
    `;
    listaResumo.appendChild(linha);
  });

  listaResumo.querySelectorAll('.botao-qtd').forEach(function (botao) {
    botao.addEventListener('click', function () {
      const id = Number(botao.dataset.id);
      const delta = botao.dataset.acao === 'aumentar' ? 1 : -1;
      alterarQuantidade(id, delta);
    });
  });

  listaResumo.querySelectorAll('.botao-remover').forEach(function (botao) {
    botao.addEventListener('click', function () {
      removerDoCarrinho(Number(botao.dataset.id));
    });
  });

  atualizarTotaisPagamento();
}

function atualizarTotaisPagamento() {
  const subtotal = subtotalCarrinho();
  const taxa = subtotal > 0 ? TAXA_ENTREGA : 0;
  const desconto = (CUPOM_APLICADO && subtotal > 0) ? subtotal * 0.10 : 0;
  const total = Math.max(subtotal + taxa - desconto, 0);

  const valorSubtotalEl = document.getElementById('valor-subtotal');
  const valorTaxaEl = document.getElementById('valor-taxa');
  const valorTotalEl = document.getElementById('valor-total-final');
  const linhaDesconto = document.getElementById('linha-desconto');

  if (valorSubtotalEl) valorSubtotalEl.textContent = paraMoeda(subtotal);
  if (valorTaxaEl) valorTaxaEl.textContent = paraMoeda(taxa);
  if (valorTotalEl) valorTotalEl.textContent = paraMoeda(total);

  if (linhaDesconto) {
    if (desconto > 0) {
      const valorDescontoSpan = linhaDesconto.querySelector('span:last-child');
      if (valorDescontoSpan) valorDescontoSpan.textContent = '- ' + paraMoeda(desconto);
      linhaDesconto.style.display = 'flex';
    } else {
      linhaDesconto.style.display = 'none';
    }
  }
}

/* ==========================================================================
   AUTENTICAÇÃO — CONTAS DE USUÁRIO REAIS, PERSISTIDAS NO NAVEGADOR
   ========================================================================== */
function ofuscarSenha(senha) {
  // Não é criptografia de verdade — apenas evita salvar a senha em texto
  // puro no localStorage. Ver aviso no topo do arquivo.
  let hash = 0;
  const texto = String(senha) + '::foodwise-salt';
  for (let i = 0; i < texto.length; i++) {
    hash = ((hash << 5) - hash) + texto.charCodeAt(i);
    hash |= 0;
  }
  return 'fw_' + Math.abs(hash).toString(36) + '_' + texto.length;
}

function obterUsuarios() {
  try {
    const dados = localStorage.getItem(CHAVE_USUARIOS);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.error('Erro ao ler usuários:', erro);
    return [];
  }
}

function salvarUsuarios(usuarios) {
  try {
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
  } catch (erro) {
    console.error('Erro ao salvar usuários:', erro);
  }
}

function obterUsuarioPorEmail(email) {
  const alvo = String(email || '').trim().toLowerCase();
  return obterUsuarios().find(function (u) { return u.email.toLowerCase() === alvo; }) || null;
}

function definirSessao(usuarioId) {
  try {
    localStorage.setItem(CHAVE_SESSAO, String(usuarioId));
  } catch (erro) {
    console.error('Erro ao salvar sessão:', erro);
  }
}

function encerrarSessao() {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch (erro) {
    console.error('Erro ao encerrar sessão:', erro);
  }
}

function obterSessao() {
  try {
    const id = localStorage.getItem(CHAVE_SESSAO);
    if (!id) return null;
    return obterUsuarios().find(function (u) { return String(u.id) === String(id); }) || null;
  } catch (erro) {
    console.error('Erro ao ler sessão:', erro);
    return null;
  }
}

function registrarUsuario(dados) {
  const usuarios = obterUsuarios();
  const novoUsuario = {
    id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    nome: dados.nome,
    email: dados.email.trim().toLowerCase(),
    senha: ofuscarSenha(dados.senha),
    telefone: dados.telefone || '',
    dataNascimento: dados.dataNascimento || '',
    objetivo: dados.objetivo || '',
    restricao: dados.restricao || 'nenhuma',
    avatar: dados.avatar || '🥑',
    endereco: dados.endereco || { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '' },
    criadoEm: new Date().toISOString()
  };
  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);
  return novoUsuario;
}

function atualizarUsuario(id, novosDados) {
  const usuarios = obterUsuarios();
  const indice = usuarios.findIndex(function (u) { return String(u.id) === String(id); });
  if (indice === -1) return null;
  usuarios[indice] = Object.assign({}, usuarios[indice], novosDados);
  salvarUsuarios(usuarios);
  return usuarios[indice];
}

function autenticarUsuario(email, senha) {
  const usuario = obterUsuarioPorEmail(email);
  if (!usuario) return { ok: false, motivo: 'nao-encontrado' };
  if (usuario.senha !== ofuscarSenha(senha)) return { ok: false, motivo: 'senha-incorreta' };
  return { ok: true, usuario: usuario };
}

/* ------------------------------------------------------------------
   ÁREA DE SESSÃO NO CABEÇALHO (mostra "Entrar/Criar conta" OU o
   usuário logado com um menu de "Minha conta" / "Sair")
   ------------------------------------------------------------------ */
function primeiroNome(nomeCompleto) {
  return String(nomeCompleto || '').trim().split(' ')[0] || 'Você';
}

function renderizarAreaSessao() {
  const areaAcoes = document.querySelector('.nav-acoes');
  if (!areaAcoes) return;

  const sessao = obterSessao();

  if (!sessao) {
    areaAcoes.innerHTML = `
      <a href="login.html" class="botao botao-secundario">Entrar</a>
      <a href="cadastro.html" class="botao botao-primario">Criar conta</a>
    `;
    return;
  }

  areaAcoes.innerHTML = `
    <div class="usuario-sessao">
      <button type="button" class="botao-usuario" id="botao-usuario-logado" aria-haspopup="true" aria-expanded="false">
        <span class="avatar-usuario">${sessao.avatar || '🥑'}</span>
        <span class="nome-usuario">${primeiroNome(sessao.nome)}</span>
        <span class="seta-usuario">▾</span>
      </button>
      <div class="menu-usuario" id="menu-usuario-logado">
        <a href="minha-conta.html">👤 Minha conta</a>
        <a href="acompanharpedido.html">🛵 Meu último pedido</a>
        <button type="button" id="botao-sair">🚪 Sair</button>
      </div>
    </div>
  `;

  const botaoUsuario = document.getElementById('botao-usuario-logado');
  const menuUsuario = document.getElementById('menu-usuario-logado');

  if (botaoUsuario && menuUsuario) {
    botaoUsuario.addEventListener('click', function (evento) {
      evento.stopPropagation();
      const aberto = menuUsuario.classList.toggle('aberto');
      botaoUsuario.setAttribute('aria-expanded', String(aberto));
    });

    document.addEventListener('click', function (evento) {
      if (!menuUsuario.contains(evento.target) && evento.target !== botaoUsuario) {
        menuUsuario.classList.remove('aberto');
        botaoUsuario.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const botaoSair = document.getElementById('botao-sair');
  if (botaoSair) {
    botaoSair.addEventListener('click', function () {
      encerrarSessao();
      window.location.href = 'index.html';
    });
  }
}

/* ------------------------------------------------------------------
   NAVEGAÇÃO INFERIOR ESTILO APP (mobile) — destaca a página atual e
   ajusta o item "Conta" conforme o usuário está logado ou não.
   ------------------------------------------------------------------ */
function renderizarNavMobile() {
  const navMobile = document.querySelector('.nav-mobile-inferior');
  if (!navMobile) return;

  const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
  const sessao = obterSessao();
  const paginasDeConta = ['login.html', 'cadastro.html', 'minha-conta.html'];

  const linkConta = document.getElementById('link-conta-mobile');
  if (linkConta) {
    linkConta.href = sessao ? 'minha-conta.html' : 'login.html';
    const iconeConta = linkConta.querySelector('.icone-nav-mobile');
    if (iconeConta) iconeConta.textContent = sessao ? (sessao.avatar || '👤') : '👤';
  }

  navMobile.querySelectorAll('a').forEach(function (link) {
    const alvo = link.dataset.pagina;
    const ativo = alvo === 'conta'
      ? paginasDeConta.includes(paginaAtual)
      : alvo === paginaAtual;
    link.classList.toggle('ativo', ativo);
  });
}

/* ------------------------------------------------------------------
   MOSTRAR/OCULTAR SENHA — aplica em qualquer input[type="password"]
   ------------------------------------------------------------------ */
function habilitarToggleSenha() {
  document.querySelectorAll('input[type="password"]').forEach(function (campoSenha) {
    if (campoSenha.dataset.toggleAplicado) return;
    campoSenha.dataset.toggleAplicado = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'campo-senha-wrapper';
    campoSenha.parentNode.insertBefore(wrapper, campoSenha);
    wrapper.appendChild(campoSenha);

    const botaoToggle = document.createElement('button');
    botaoToggle.type = 'button';
    botaoToggle.className = 'botao-mostrar-senha';
    botaoToggle.setAttribute('aria-label', 'Mostrar senha');
    botaoToggle.textContent = '👁';
    wrapper.appendChild(botaoToggle);

    botaoToggle.addEventListener('click', function () {
      const visivel = campoSenha.type === 'text';
      campoSenha.type = visivel ? 'password' : 'text';
      botaoToggle.textContent = visivel ? '👁' : '🙈';
      botaoToggle.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
    });
  });
}

/* ==========================================================================
   MÁSCARAS SIMPLES DE CAMPOS (telefone e CEP)
   ========================================================================== */
function aplicarMascaraTelefone(campo) {
  if (!campo) return;
  campo.addEventListener('input', function () {
    let valor = campo.value.replace(/\D/g, '').slice(0, 11);
    if (valor.length > 10) {
      valor = valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (valor.length > 5) {
      valor = valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (valor.length > 2) {
      valor = valor.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    } else if (valor.length > 0) {
      valor = valor.replace(/(\d{0,2})/, '($1');
    }
    campo.value = valor;
  });
}

function aplicarMascaraCep(campo) {
  if (!campo) return;
  campo.addEventListener('input', function () {
    let valor = campo.value.replace(/\D/g, '').slice(0, 8);
    if (valor.length > 5) valor = valor.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    campo.value = valor;
  });
}

/* ==========================================================================
   MAPA SIMULADO DE ACOMPANHAMENTO DE PEDIDO (Leaflet + OpenStreetMap)
   Simula o trajeto do entregador até o endereço informado no pedido.
   Não usa geolocalização real — as coordenadas são fictícias, apenas
   para ilustrar visualmente o percurso em um mapa de verdade.
   ========================================================================== */
function inicializarMapaSimulado() {
  const elementoMapa = document.getElementById('mapa-pedido');
  if (!elementoMapa || typeof L === 'undefined') return;

  // Ponto fictício do "restaurante" e do "endereço de entrega"
  const pontoRestaurante = [-25.4296, -49.2713];
  const pontoEntrega = [-25.4210, -49.2635];

  // Alguns pontos intermediários para o trajeto não ser uma linha reta
  const rota = [
    pontoRestaurante,
    [-25.4278, -49.2690],
    [-25.4255, -49.2670],
    [-25.4230, -49.2650],
    pontoEntrega
  ];

  const mapa = L.map(elementoMapa, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false
  }).fitBounds(rota, { padding: [30, 30] });

  L.control.zoom({ position: 'bottomright' }).addTo(mapa);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; colaboradores do OpenStreetMap',
    maxZoom: 19
  }).addTo(mapa);

  const iconeRestaurante = L.divIcon({
    className: 'icone-mapa icone-restaurante',
    html: '🍽️',
    iconSize: [34, 34]
  });

  const iconeCasa = L.divIcon({
    className: 'icone-mapa icone-casa',
    html: '🏠',
    iconSize: [34, 34]
  });

  const iconeMoto = L.divIcon({
    className: 'icone-mapa icone-moto',
    html: '🛵',
    iconSize: [38, 38]
  });

  L.marker(pontoRestaurante, { icon: iconeRestaurante }).addTo(mapa)
    .bindPopup('FoodWise — restaurante');

  L.marker(pontoEntrega, { icon: iconeCasa }).addTo(mapa)
    .bindPopup('Endereço de entrega');

  L.polyline(rota, { color: '#E23260', weight: 4, opacity: 0.85, dashArray: '1, 10', lineCap: 'round' }).addTo(mapa);

  const marcadorMoto = L.marker(pontoRestaurante, { icon: iconeMoto, zIndexOffset: 1000 }).addTo(mapa);

  // Gera pontos intermediários ao longo da rota para a animação
  function gerarPontosAnimacao(pontos, quantidadePorTrecho) {
    const resultado = [];
    for (let i = 0; i < pontos.length - 1; i++) {
      const [latA, lngA] = pontos[i];
      const [latB, lngB] = pontos[i + 1];
      for (let passo = 0; passo <= quantidadePorTrecho; passo++) {
        const fracao = passo / quantidadePorTrecho;
        resultado.push([
          latA + (latB - latA) * fracao,
          lngA + (lngB - lngA) * fracao
        ]);
      }
    }
    return resultado;
  }

  const pontosAnimacao = gerarPontosAnimacao(rota, 24);
  let indiceAtual = 0;
  let intervaloAnimacao = null;

  // Sincroniza a posição inicial com a etapa atual do pedido
  const etapaAtualEl = document.querySelector('.etapa-pedido.atual');
  const etapaTexto = etapaAtualEl ? etapaAtualEl.querySelector('strong').textContent.trim() : '';
  const jaEntregue = document.querySelector('.etapa-pedido.concluida:last-child') &&
    !document.querySelector('.etapa-pedido.atual') && !document.querySelector('.etapa-pedido:not(.concluida)');

  function moverPara(indice) {
    const ponto = pontosAnimacao[Math.min(indice, pontosAnimacao.length - 1)];
    marcadorMoto.setLatLng(ponto);
  }

  function pararAnimacao() {
    if (intervaloAnimacao) {
      clearInterval(intervaloAnimacao);
      intervaloAnimacao = null;
    }
  }

  function iniciarAnimacao() {
    pararAnimacao();
    indiceAtual = 0;
    moverPara(0);
    intervaloAnimacao = setInterval(function () {
      indiceAtual++;
      moverPara(indiceAtual);
      if (indiceAtual >= pontosAnimacao.length - 1) {
        pararAnimacao();
      }
    }, 220);
  }

  if (etapaTexto === 'Confirmado') {
    moverPara(0);
  } else if (etapaTexto === 'Em preparo') {
    moverPara(0);
  } else if (jaEntregue) {
    moverPara(pontosAnimacao.length - 1);
  } else {
    // "Em rota" (ou padrão): anima o trajeto inteiro
    iniciarAnimacao();
  }

  const botaoReiniciar = document.getElementById('botao-reiniciar-simulacao');
  if (botaoReiniciar) {
    botaoReiniciar.addEventListener('click', iniciarAnimacao);
  }

  // Corrige o tamanho do mapa se o container mudar (ex.: ao redimensionar a tela)
  window.addEventListener('resize', function () {
    mapa.invalidateSize();
  });
  setTimeout(function () { mapa.invalidateSize(); }, 300);
}

/* ==========================================================================
   PROMPT DE INSTALAÇÃO DO APP (PWA) — Chrome/Android
   Em navegadores que não suportam (ex.: Safari/iOS), esse banner simplesmente
   nunca aparece — o site continua funcionando normalmente como site comum.
   ========================================================================== */
let eventoInstalacaoApp = null;

window.addEventListener('beforeinstallprompt', function (evento) {
  evento.preventDefault();
  eventoInstalacaoApp = evento;
  mostrarBannerInstalacao();
});

function mostrarBannerInstalacao() {
  if (document.getElementById('banner-instalar-app')) return;
  if (localStorage.getItem('foodwise_banner_instalar_dispensado') === 'true') return;

  const banner = document.createElement('div');
  banner.id = 'banner-instalar-app';
  banner.className = 'banner-instalar-app';
  banner.innerHTML = `
    <span class="icone-banner-instalar">🌿</span>
    <div class="texto-banner-instalar">
      <strong>Instale o FoodWise</strong>
      <span>Acesse mais rápido, direto da tela inicial do celular.</span>
    </div>
    <button type="button" id="botao-instalar-app" class="botao botao-primario">Instalar</button>
    <button type="button" id="botao-fechar-banner-instalar" aria-label="Fechar aviso">✕</button>
  `;
  document.body.appendChild(banner);

  const botaoInstalar = document.getElementById('botao-instalar-app');
  const botaoFechar = document.getElementById('botao-fechar-banner-instalar');

  if (botaoInstalar) {
    botaoInstalar.addEventListener('click', async function () {
      banner.remove();
      if (!eventoInstalacaoApp) return;
      eventoInstalacaoApp.prompt();
      await eventoInstalacaoApp.userChoice;
      eventoInstalacaoApp = null;
    });
  }

  if (botaoFechar) {
    botaoFechar.addEventListener('click', function () {
      banner.remove();
      try { localStorage.setItem('foodwise_banner_instalar_dispensado', 'true'); } catch (e) {}
    });
  }
}

/* ==========================================================================
   INICIALIZAÇÃO GERAL
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {

  /* ------------------------------------------------------------------
     0. SESSÃO DO USUÁRIO — renderiza cabeçalho e aplica redirecionamentos
     ------------------------------------------------------------------ */
  renderizarAreaSessao();
  renderizarNavMobile();

  const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
  const sessaoAtual = obterSessao();

  // Quem já está logado não precisa ver as telas de login/cadastro de novo
  if (sessaoAtual && (paginaAtual === 'login.html' || paginaAtual === 'cadastro.html')) {
    window.location.href = 'cardapio.html';
    return;
  }

  // A página "Minha conta" exige login
  if (!sessaoAtual && paginaAtual === 'minha-conta.html') {
    window.location.href = 'login.html?retorno=minha-conta.html';
    return;
  }

  /* ------------------------------------------------------------------
     1. MENU MOBILE (HAMBÚRGUER)
     ------------------------------------------------------------------ */
  const menuToggle = document.querySelector('.menu-toggle');
  const navPrincipal = document.querySelector('.nav-principal');

  if (menuToggle && navPrincipal) {
    menuToggle.addEventListener('click', function () {
      menuToggle.classList.toggle('aberto');
      navPrincipal.classList.toggle('aberto');
    });

    const linksMenu = navPrincipal.querySelectorAll('.nav-links a');
    linksMenu.forEach(function (link) {
      link.addEventListener('click', function () {
        menuToggle.classList.remove('aberto');
        navPrincipal.classList.remove('aberto');
      });
    });
  }

  /* ------------------------------------------------------------------
     2. CABEÇALHO COM SOMBRA AO ROLAR A PÁGINA
     ------------------------------------------------------------------ */
  const cabecalho = document.querySelector('.cabecalho');
  if (cabecalho) {
    window.addEventListener('scroll', function () {
      cabecalho.style.boxShadow = window.scrollY > 20
        ? '0 8px 20px rgba(30, 51, 9, 0.1)'
        : 'none';
    });
  }

  /* ------------------------------------------------------------------
     3. ACORDEÃO DE PERGUNTAS FREQUENTES (FAQ)
     ------------------------------------------------------------------ */
  const itensFaq = document.querySelectorAll('.item-faq');
  itensFaq.forEach(function (item) {
    const pergunta = item.querySelector('.pergunta-faq');
    if (!pergunta) return;

    pergunta.addEventListener('click', function () {
      const jaAberto = item.classList.contains('aberto');
      itensFaq.forEach(function (outro) { outro.classList.remove('aberto'); });
      if (!jaAberto) item.classList.add('aberto');
    });
  });

  /* ------------------------------------------------------------------
     4. VALIDAÇÃO GENÉRICA DE FORMULÁRIOS
     ------------------------------------------------------------------ */
  function mostrarErro(campo, mensagem) {
    const grupo = campo.closest('.campo');
    if (!grupo) return;
    const erro = grupo.querySelector('.mensagem-erro');
    if (erro) erro.textContent = mensagem;
    campo.style.borderColor = mensagem ? '#E23260' : '';
  }

  function validarFormularioGenerico(form) {
    let valido = true;
    const campos = form.querySelectorAll('input[required], select[required], textarea[required]');

    campos.forEach(function (campo) {
      if (campo.type === 'checkbox') {
        if (!campo.checked) { valido = false; }
        return;
      }
      if (!campo.value.trim()) {
        mostrarErro(campo, 'Este campo é obrigatório.');
        valido = false;
      } else if (campo.type === 'email' && !validarEmail(campo.value)) {
        mostrarErro(campo, 'Digite um e-mail válido.');
        valido = false;
      } else if (campo.type === 'password' && campo.value.length < 6) {
        mostrarErro(campo, 'A senha precisa ter ao menos 6 caracteres.');
        valido = false;
      } else {
        mostrarErro(campo, '');
      }
    });

    return valido;
  }

  habilitarToggleSenha();
  aplicarMascaraTelefone(document.getElementById('telefone'));
  aplicarMascaraTelefone(document.getElementById('telefone-conta'));
  aplicarMascaraCep(document.getElementById('cep'));
  aplicarMascaraCep(document.getElementById('cep-cadastro'));
  aplicarMascaraCep(document.getElementById('cep-conta'));

  /* ------------------------------------------------------------------
     4b. SELETOR DE AVATAR (personalização do perfil)
     ------------------------------------------------------------------ */
  let avatarSelecionado = null;
  const opcoesAvatar = document.querySelectorAll('.opcao-avatar');
  if (opcoesAvatar.length) {
    opcoesAvatar.forEach(function (opcao) {
      opcao.addEventListener('click', function () {
        opcoesAvatar.forEach(function (o) { o.classList.remove('selecionado'); });
        opcao.classList.add('selecionado');
        avatarSelecionado = opcao.dataset.avatar;
      });
    });
    // Marca o primeiro como padrão se nenhum estiver selecionado
    if (!document.querySelector('.opcao-avatar.selecionado') && opcoesAvatar[0]) {
      opcoesAvatar[0].classList.add('selecionado');
      avatarSelecionado = opcoesAvatar[0].dataset.avatar;
    }
  }

  /* ------------------------------------------------------------------
     5. FORMULÁRIO DE CADASTRO (cria conta real, salva no navegador)
     ------------------------------------------------------------------ */
  const formCadastro = document.getElementById('form-cadastro');
  if (formCadastro) {
    const campoSenha = document.getElementById('senha');
    const campoConfirmar = document.getElementById('confirmar-senha');
    const barrasForca = document.querySelectorAll('.forca-senha span');

    if (campoSenha && barrasForca.length) {
      campoSenha.addEventListener('input', function () {
        const valor = campoSenha.value;
        let forca = 0;

        if (valor.length >= 6) forca++;
        if (valor.length >= 10) forca++;
        if (/[A-Z]/.test(valor) && /[0-9]/.test(valor)) forca++;
        if (/[^A-Za-z0-9]/.test(valor)) forca++;

        const cores = ['#EDEDE6', '#E23260', '#F2678E', '#849A28'];
        barrasForca.forEach(function (barra, indice) {
          barra.style.backgroundColor = indice < forca ? cores[forca - 1] : '#EDEDE6';
        });
      });
    }

    formCadastro.addEventListener('submit', function (evento) {
      evento.preventDefault();
      let valido = validarFormularioGenerico(formCadastro);

      if (campoSenha && campoConfirmar && campoSenha.value !== campoConfirmar.value) {
        mostrarErro(campoConfirmar, 'As senhas não coincidem.');
        valido = false;
      }

      const campoEmail = document.getElementById('email-cadastro');
      if (campoEmail && valido && obterUsuarioPorEmail(campoEmail.value)) {
        mostrarErro(campoEmail, 'Já existe uma conta com este e-mail.');
        valido = false;
      }

      if (!valido) return;

      const dadosFormulario = new FormData(formCadastro);
      const novoUsuario = registrarUsuario({
        nome: dadosFormulario.get('nome'),
        email: dadosFormulario.get('email'),
        senha: campoSenha.value,
        telefone: dadosFormulario.get('telefone'),
        dataNascimento: dadosFormulario.get('data-nascimento'),
        objetivo: dadosFormulario.get('objetivo'),
        restricao: dadosFormulario.get('restricao'),
        avatar: avatarSelecionado || '🥑',
        endereco: {
          cep: dadosFormulario.get('cep-cadastro') || '',
          rua: dadosFormulario.get('endereco-cadastro') || '',
          numero: dadosFormulario.get('numero-cadastro') || '',
          complemento: dadosFormulario.get('complemento-cadastro') || '',
          bairro: dadosFormulario.get('bairro-cadastro') || '',
          cidade: dadosFormulario.get('cidade-cadastro') || ''
        }
      });

      definirSessao(novoUsuario.id);

      const parametros = new URLSearchParams(window.location.search);
      const retorno = parametros.get('retorno');
      window.location.href = retorno ? retorno : 'cardapio.html';
    });
  }

  /* ------------------------------------------------------------------
     6. FORMULÁRIO DE LOGIN (autentica de verdade contra as contas salvas)
     ------------------------------------------------------------------ */
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    const campoEmailLogin = document.getElementById('email-login');
    const campoSenhaLogin = document.getElementById('senha-login');

    formLogin.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const valido = validarFormularioGenerico(formLogin);
      if (!valido) return;

      const resultado = autenticarUsuario(campoEmailLogin.value, campoSenhaLogin.value);

      if (!resultado.ok) {
        if (resultado.motivo === 'nao-encontrado') {
          mostrarErro(campoEmailLogin, 'Não encontramos uma conta com este e-mail.');
        } else {
          mostrarErro(campoSenhaLogin, 'Senha incorreta. Tente novamente.');
        }
        return;
      }

      definirSessao(resultado.usuario.id);

      const parametros = new URLSearchParams(window.location.search);
      const retorno = parametros.get('retorno');
      window.location.href = retorno ? retorno : 'cardapio.html';
    });
  }

  /* ------------------------------------------------------------------
     6a. RECUPERAÇÃO DE SENHA (redefine de verdade, sem servidor de e-mail)
     ------------------------------------------------------------------ */
  const botaoAbrirRecuperacao = document.getElementById('botao-abrir-recuperacao');
  const painelRecuperarSenha = document.getElementById('painel-recuperar-senha');
  if (botaoAbrirRecuperacao && painelRecuperarSenha) {
    botaoAbrirRecuperacao.addEventListener('click', function () {
      painelRecuperarSenha.classList.toggle('aberto');
    });
  }

  const formRecuperarSenha = document.getElementById('form-recuperar-senha');
  if (formRecuperarSenha) {
    formRecuperarSenha.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const valido = validarFormularioGenerico(formRecuperarSenha);
      if (!valido) return;

      const campoEmailRecuperar = document.getElementById('email-recuperar');
      const campoNovaSenha = document.getElementById('nova-senha');
      const usuario = obterUsuarioPorEmail(campoEmailRecuperar.value);

      if (!usuario) {
        mostrarErro(campoEmailRecuperar, 'Não encontramos uma conta com este e-mail.');
        return;
      }

      atualizarUsuario(usuario.id, { senha: ofuscarSenha(campoNovaSenha.value) });

      formRecuperarSenha.reset();
      const botaoSubmitRecuperar = formRecuperarSenha.querySelector('button[type="submit"]');
      if (botaoSubmitRecuperar) {
        const textoOriginal = botaoSubmitRecuperar.textContent;
        botaoSubmitRecuperar.textContent = 'Senha redefinida ✓';
        setTimeout(function () {
          botaoSubmitRecuperar.textContent = textoOriginal;
          if (painelRecuperarSenha) painelRecuperarSenha.classList.remove('aberto');
        }, 1800);
      }
    });
  }

  /* ------------------------------------------------------------------
     6b. FORMULÁRIO "MINHA CONTA" (editar perfil já cadastrado)
     ------------------------------------------------------------------ */
  const formMinhaConta = document.getElementById('form-minha-conta');
  if (formMinhaConta && sessaoAtual) {
    const preencher = function (id, valor) {
      const campo = document.getElementById(id);
      if (campo) campo.value = valor || '';
    };

    preencher('nome-conta', sessaoAtual.nome);
    preencher('email-conta', sessaoAtual.email);
    preencher('telefone-conta', sessaoAtual.telefone);
    preencher('data-nascimento-conta', sessaoAtual.dataNascimento);
    preencher('objetivo-conta', sessaoAtual.objetivo);
    preencher('restricao-conta', sessaoAtual.restricao);
    preencher('cep-conta', sessaoAtual.endereco ? sessaoAtual.endereco.cep : '');
    preencher('endereco-conta', sessaoAtual.endereco ? sessaoAtual.endereco.rua : '');
    preencher('numero-conta', sessaoAtual.endereco ? sessaoAtual.endereco.numero : '');
    preencher('complemento-conta', sessaoAtual.endereco ? sessaoAtual.endereco.complemento : '');
    preencher('bairro-conta', sessaoAtual.endereco ? sessaoAtual.endereco.bairro : '');
    preencher('cidade-conta', sessaoAtual.endereco ? sessaoAtual.endereco.cidade : '');

    const avatarAtualBotao = document.querySelector('.opcao-avatar[data-avatar="' + (sessaoAtual.avatar || '🥑') + '"]');
    if (avatarAtualBotao) {
      opcoesAvatar.forEach(function (o) { o.classList.remove('selecionado'); });
      avatarAtualBotao.classList.add('selecionado');
      avatarSelecionado = sessaoAtual.avatar;
    }

    formMinhaConta.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const valido = validarFormularioGenerico(formMinhaConta);
      if (!valido) return;

      const dadosFormulario = new FormData(formMinhaConta);
      const atualizado = atualizarUsuario(sessaoAtual.id, {
        nome: dadosFormulario.get('nome'),
        telefone: dadosFormulario.get('telefone'),
        dataNascimento: dadosFormulario.get('data-nascimento'),
        objetivo: dadosFormulario.get('objetivo'),
        restricao: dadosFormulario.get('restricao'),
        avatar: avatarSelecionado || sessaoAtual.avatar,
        endereco: {
          cep: dadosFormulario.get('cep') || '',
          rua: dadosFormulario.get('endereco') || '',
          numero: dadosFormulario.get('numero') || '',
          complemento: dadosFormulario.get('complemento') || '',
          bairro: dadosFormulario.get('bairro') || '',
          cidade: dadosFormulario.get('cidade') || ''
        }
      });

      if (atualizado) {
        renderizarAreaSessao();
        renderizarNavMobile();
        const avisoSucesso = document.getElementById('aviso-conta-salva');
        if (avisoSucesso) {
          avisoSucesso.classList.add('visivel');
          setTimeout(function () { avisoSucesso.classList.remove('visivel'); }, 3000);
        }
      }
    });

    const botaoSairConta = document.getElementById('botao-sair-conta');
    if (botaoSairConta) {
      botaoSairConta.addEventListener('click', function () {
        encerrarSessao();
        window.location.href = 'index.html';
      });
    }
  }

  /* ------------------------------------------------------------------
     7. FORMULÁRIO DE CONTATO (HOME)
     ------------------------------------------------------------------ */
  const formContato = document.getElementById('form-contato');
  if (formContato) {
    formContato.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const valido = validarFormularioGenerico(formContato);

      if (valido) {
        const botao = formContato.querySelector('button[type="submit"]');
        const textoOriginal = botao ? botao.textContent : '';
        if (botao) { botao.textContent = 'Mensagem enviada ✓'; botao.disabled = true; }
        setTimeout(function () {
          formContato.reset();
          if (botao) { botao.textContent = textoOriginal; botao.disabled = false; }
        }, 2200);
      }
    });
  }

  /* ------------------------------------------------------------------
     8. CARDÁPIO — CARREGAMENTO, FILTROS E BUSCA
     ------------------------------------------------------------------ */
  inicializarCardapio();

  /* ------------------------------------------------------------------
     9. CONTADOR DO CARRINHO (em qualquer página que tenha o ícone)
     ------------------------------------------------------------------ */
  atualizarContadorCarrinho();

  const carrinhoFlutuante = document.querySelector('.carrinho-flutuante');
  if (carrinhoFlutuante) {
    carrinhoFlutuante.addEventListener('click', function () {
      window.location.href = 'pagamento.html';
    });
  }

  /* ------------------------------------------------------------------
     10. PAGAMENTO — ALTERNÂNCIA ENTRE FORMAS DE PAGAMENTO
     ------------------------------------------------------------------ */
  const opcoesPagamento = document.querySelectorAll('.opcao-pagamento');
  const conteudosPagamento = document.querySelectorAll('.conteudo-pagamento-forma');

  if (opcoesPagamento.length) {
    opcoesPagamento.forEach(function (opcao) {
      opcao.addEventListener('click', function () {
        opcoesPagamento.forEach(function (o) { o.classList.remove('selecionada'); });
        opcao.classList.add('selecionada');

        const alvo = opcao.dataset.forma;
        conteudosPagamento.forEach(function (conteudo) {
          conteudo.classList.toggle('ativo', conteudo.dataset.forma === alvo);
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     11. PAGAMENTO — MÁSCARA SIMPLES PARA CARTÃO E VALIDADE
     ------------------------------------------------------------------ */
  const campoCartao = document.getElementById('numero-cartao');
  if (campoCartao) {
    campoCartao.addEventListener('input', function () {
      let valor = campoCartao.value.replace(/\D/g, '').slice(0, 16);
      campoCartao.value = valor.replace(/(.{4})/g, '$1 ').trim();
    });
  }

  const campoValidade = document.getElementById('validade-cartao');
  if (campoValidade) {
    campoValidade.addEventListener('input', function () {
      let valor = campoValidade.value.replace(/\D/g, '').slice(0, 4);
      if (valor.length > 2) valor = valor.slice(0, 2) + '/' + valor.slice(2);
      campoValidade.value = valor;
    });
  }

  /* ------------------------------------------------------------------
     12. PAGAMENTO — RENDERIZA RESUMO E CUPOM DE DESCONTO
     ------------------------------------------------------------------ */
  renderizarResumoPagamento();

  const botaoCupom = document.getElementById('botao-cupom');
  const campoCupom = document.getElementById('campo-cupom');
  const linhaDesconto = document.getElementById('linha-desconto');

  if (botaoCupom && campoCupom && linhaDesconto) {
    botaoCupom.addEventListener('click', function () {
      const codigo = campoCupom.value.trim().toUpperCase();

      if (codigo !== 'FOODWISE10') {
        alert('Cupom inválido. Tente novamente.');
        return;
      }

      if (CUPOM_APLICADO) {
        alert('Este cupom já foi aplicado ao pedido.');
        return;
      }

      if (subtotalCarrinho() <= 0) {
        alert('Adicione itens ao carrinho antes de aplicar um cupom.');
        return;
      }

      CUPOM_APLICADO = true;
      atualizarTotaisPagamento();

      campoCupom.disabled = true;
      botaoCupom.disabled = true;

      alert('Cupom aplicado! Você ganhou 10% de desconto.');
    });
  }

  /* ------------------------------------------------------------------
     13. FINALIZAR PEDIDO (PÁGINA DE PAGAMENTO) — exige estar logado
     ------------------------------------------------------------------ */
  const formPagamento = document.getElementById('form-pagamento');
  if (formPagamento) {
    formPagamento.addEventListener('submit', function (evento) {
      evento.preventDefault();

      const carrinho = obterCarrinho();
      if (carrinho.length === 0) {
        alert('Seu carrinho está vazio. Adicione itens no cardápio antes de finalizar.');
        return;
      }

      if (!validarFormularioGenerico(formPagamento)) return;

      // Exige login real antes de confirmar o pedido
      if (!obterSessao()) {
        window.location.href = 'login.html?retorno=pagamento.html';
        return;
      }

      const dadosFormulario = new FormData(formPagamento);
      const usuarioAtual = obterSessao();

      // Guarda uma cópia do pedido para exibir na página de acompanhamento
      const totalFinalTexto = document.getElementById('valor-total-final');
      const pedidoFinalizado = {
        numero: 'FW-' + Math.floor(10000 + Math.random() * 89999),
        itens: carrinho,
        total: totalFinalTexto ? totalFinalTexto.textContent : paraMoeda(subtotalCarrinho() + TAXA_ENTREGA),
        dataHora: new Date().toISOString(),
        usuarioId: usuarioAtual ? usuarioAtual.id : null,
        endereco: {
          cep: dadosFormulario.get('cep') || '',
          rua: dadosFormulario.get('endereco') || '',
          numero: dadosFormulario.get('numero') || '',
          complemento: dadosFormulario.get('complemento') || ''
        }
      };

      try {
        localStorage.setItem(CHAVE_ULTIMO_PEDIDO, JSON.stringify(pedidoFinalizado));
      } catch (erro) {
        console.error('Erro ao salvar o pedido:', erro);
      }

      salvarCarrinho([]);

      const botaoFinalizarSubmit = document.getElementById('botao-finalizar-pagamento');
      if (botaoFinalizarSubmit) {
        botaoFinalizarSubmit.textContent = 'Pagamento confirmado ✓';
        botaoFinalizarSubmit.disabled = true;
      }

      setTimeout(function () {
        window.location.href = 'acompanharpedido.html';
      }, 900);
    });
  }

  /* ------------------------------------------------------------------
     14. ACOMPANHAR PEDIDO — SIMULAÇÃO DE PROGRESSO E DADOS REAIS
     ------------------------------------------------------------------ */
  const barraProgresso = document.querySelector('.linha-do-tempo .progresso');
  const etapas = document.querySelectorAll('.etapa-pedido');

  if (barraProgresso && etapas.length) {
    const etapaAtualIndice = Array.from(etapas).findIndex(function (etapa) {
      return etapa.classList.contains('atual');
    });

    const percentual = etapaAtualIndice >= 0
      ? (etapaAtualIndice / (etapas.length - 1)) * 100
      : 0;

    barraProgresso.style.width = percentual + '%';
  }

  const containerDetalhesPedido = document.getElementById('detalhes-ultimo-pedido');
  let pedidoAtualParaEndereco = null;
  if (containerDetalhesPedido) {
    try {
      const dados = localStorage.getItem(CHAVE_ULTIMO_PEDIDO);
      const pedido = dados ? JSON.parse(dados) : null;
      pedidoAtualParaEndereco = pedido;

      const numeroPedidoEl = document.getElementById('numero-pedido');
      if (pedido && numeroPedidoEl) numeroPedidoEl.textContent = '#' + pedido.numero;

      const enderecoEntregaEl = document.getElementById('endereco-entrega-atual');
      if (pedido && pedido.endereco && enderecoEntregaEl) {
        const e = pedido.endereco;
        enderecoEntregaEl.textContent = [e.rua, e.numero].filter(Boolean).join(', ') +
          (e.complemento ? ' — ' + e.complemento : '');
      }

      if (pedido && Array.isArray(pedido.itens) && pedido.itens.length > 0) {
        containerDetalhesPedido.innerHTML = '';
        pedido.itens.forEach(function (item) {
          const linha = document.createElement('div');
          linha.className = 'item-resumo';
          linha.innerHTML = `
            <div class="nome-item">
              <span>${item.nome}</span>
              <span class="qtd-item">${item.quantidade} unidade(s)</span>
            </div>
            <span>${paraMoeda(item.preco * item.quantidade)}</span>
          `;
          containerDetalhesPedido.appendChild(linha);
        });

        const linhaTotal = document.createElement('div');
        linhaTotal.className = 'linha-total total-final';
        linhaTotal.innerHTML = `<span>Total pago</span><span>${pedido.total}</span>`;
        containerDetalhesPedido.appendChild(linhaTotal);
      }
    } catch (erro) {
      console.error('Erro ao carregar detalhes do pedido:', erro);
    }
  }

  inicializarMapaSimulado();

});
