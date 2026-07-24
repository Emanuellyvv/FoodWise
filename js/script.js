/* ==========================================================================
   FOODWISE — SCRIPT PRINCIPAL
   Projeto de TCC — JavaScript separado do HTML e do CSS
   ========================================================================== */

/* ------------------------------------------------------------------
   CONFIGURAÇÃO DO BANCO DE DADOS (GITHUB)
   ------------------------------------------------------------------
   Troque a URL abaixo pelo link "raw" do arquivo cardapio-dados.json
   no seu repositório do GitHub. Veja o passo a passo completo em
   README-BANCO-DE-DADOS.md.

   Exemplo de URL válida:
   https://raw.githubusercontent.com/seu-usuario/foodwise-db/main/cardapio-dados.json

   Enquanto a URL não for configurada (ou se o GitHub estiver
   inacessível), o site usa automaticamente o banco de dados local
   embutido em dados-cardapio.js, então tudo continua funcionando.
   ------------------------------------------------------------------ */
const URL_BANCO_DE_DADOS_GITHUB = "https://raw.githubusercontent.com/Emanuellyvv/foodwise-db/refs/heads/main/cardapio-dados.json";

const CHAVE_CARRINHO = "foodwise_carrinho";
const CHAVE_ULTIMO_PEDIDO = "foodwise_ultimo_pedido";
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
  const contador = document.querySelector('.carrinho-flutuante .contador');
  if (contador) contador.textContent = totalItensCarrinho();
}

/* ==========================================================================
   CARREGAMENTO DO BANCO DE DADOS DO CARDÁPIO
   Tenta buscar o banco de dados hospedado no GitHub. Se a URL ainda
   não foi configurada, ou se a busca falhar (sem internet, CORS,
   link errado, etc.), usa o banco de dados local como reserva —
   assim o cardápio nunca fica vazio.
   ========================================================================== */
async function carregarCardapio() {
  const urlConfigurada = URL_BANCO_DE_DADOS_GITHUB.indexOf('SEU-USUARIO') === -1;

  if (urlConfigurada) {
    try {
      const controlador = new AbortController();
      const tempoLimite = setTimeout(function () { controlador.abort(); }, 4000);

      const resposta = await fetch(URL_BANCO_DE_DADOS_GITHUB, { signal: controlador.signal });
      clearTimeout(tempoLimite);

      if (resposta.ok) {
        const dadosRemotos = await resposta.json();
        if (Array.isArray(dadosRemotos) && dadosRemotos.length > 0) {
          console.info('Cardápio carregado do banco de dados no GitHub.');
          return dadosRemotos;
        }
      }
    } catch (erro) {
      console.warn('Não foi possível acessar o banco de dados no GitHub. Usando dados locais.', erro);
    }
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
    const combinaBusca = prato.nome.toLowerCase().includes(termoBusca);
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
   INICIALIZAÇÃO GERAL
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {

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

  function validarEmail(valor) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(valor);
  }

  function validarFormularioGenerico(form) {
    let valido = true;
    const campos = form.querySelectorAll('input[required], select[required], textarea[required]');

    campos.forEach(function (campo) {
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

  /* ------------------------------------------------------------------
     5. FORMULÁRIO DE CADASTRO
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

      if (valido) {
        alert('Cadastro realizado com sucesso! Bem-vindo(a) ao FoodWise.');
        formCadastro.reset();
        barrasForca.forEach(function (barra) { barra.style.backgroundColor = '#EDEDE6'; });
        window.location.href = 'login.html';
      }
    });
  }

  /* ------------------------------------------------------------------
     6. FORMULÁRIO DE LOGIN
     ------------------------------------------------------------------ */
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', function (evento) {
      evento.preventDefault();
      const valido = validarFormularioGenerico(formLogin);

      if (valido) {
        alert('Login realizado com sucesso! Redirecionando para o cardápio...');
        window.location.href = 'cardapio.html';
      }
    });
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
        alert('Mensagem enviada com sucesso! Em breve entraremos em contato.');
        formContato.reset();
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
     13. FINALIZAR PEDIDO (PÁGINA DE PAGAMENTO)
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

      // Guarda uma cópia do pedido para exibir na página de acompanhamento
      const totalFinalTexto = document.getElementById('valor-total-final');
      const pedidoFinalizado = {
        numero: 'FW-' + Math.floor(10000 + Math.random() * 89999),
        itens: carrinho,
        total: totalFinalTexto ? totalFinalTexto.textContent : paraMoeda(subtotalCarrinho() + TAXA_ENTREGA),
        dataHora: new Date().toISOString()
      };

      try {
        localStorage.setItem(CHAVE_ULTIMO_PEDIDO, JSON.stringify(pedidoFinalizado));
      } catch (erro) {
        console.error('Erro ao salvar o pedido:', erro);
      }

      salvarCarrinho([]);

      alert('Pagamento confirmado! Seu pedido já está sendo preparado.');
      window.location.href = 'acompanhar-pedido.html';
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
  if (containerDetalhesPedido) {
    try {
      const dados = localStorage.getItem(CHAVE_ULTIMO_PEDIDO);
      const pedido = dados ? JSON.parse(dados) : null;

      const numeroPedidoEl = document.getElementById('numero-pedido');
      if (pedido && numeroPedidoEl) numeroPedidoEl.textContent = '#' + pedido.numero;

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

});
