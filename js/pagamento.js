/* ==========================================================================
   FOODWISE — PAGAMENTO (js/pagamento.js)
   Endereço, frete por distância, forma de entrega (moto/bicicleta),
   cupom, cashback, confirmação de pagamento (simulada) e criação do pedido.
   ========================================================================== */

// Estado da tela de pagamento
const EST = {
  modo: 'moto',          // moto ou bicicleta
  km: null,              // distância pela rota
  valorFrete: null,      // frete calculado
  destino: null,         // coordenadas do endereço
  rota: null,            // pontos da rota (para o mapa)
  fora: false,           // fora da área de entrega?
  cupom: false,
  usarCashback: false,
  requisicao: 0          // evita que um cálculo antigo sobrescreva um novo
};

function formaSelecionada() {
  const el = $('.opcao-pagamento.selecionada');
  return el ? el.dataset.forma : 'pix';
}

/* ---------- 1. Totais ---------- */
function calcularTotais() {
  const subtotal = subtotalCarrinho();
  const frete = subtotal > 0 ? (EST.valorFrete !== null ? EST.valorFrete : CONFIG.frete.padrao) : 0;
  const descontoCupom = EST.cupom ? arredondar(subtotal * CONFIG.cupom.desconto) : 0;
  const usuario = obterSessao();
  const saldo = usuario ? obterSaldoCashback(usuario.id) : 0;
  const baseCashback = Math.max(subtotal + frete - descontoCupom, 0);
  const descontoCashback = EST.usarCashback ? arredondar(Math.min(saldo, baseCashback)) : 0;
  const total = arredondar(Math.max(baseCashback - descontoCashback, 0));
  const cashbackGanho = EST.modo === 'bicicleta' ? arredondar(subtotal * CONFIG.entrega.bicicleta.cashback) : 0;
  return { subtotal, frete, descontoCupom, descontoCashback, total, cashbackGanho, saldo };
}

function mostrarLinha(id, visivel, texto) {
  const linha = document.getElementById(id);
  if (!linha) return;
  linha.hidden = !visivel;
  const valor = $('.valor', linha);
  if (valor) valor.textContent = texto;
}

function renderizarTotais() {
  const t = calcularTotais();
  const definir = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
  definir('valor-subtotal', paraMoeda(t.subtotal));
  definir('valor-taxa', paraMoeda(t.frete) + (EST.valorFrete === null && t.subtotal > 0 ? ' (estimado)' : ''));
  definir('valor-total-final', paraMoeda(t.total));
  mostrarLinha('linha-cupom', t.descontoCupom > 0, '- ' + paraMoeda(t.descontoCupom));
  mostrarLinha('linha-cashback-usado', t.descontoCashback > 0, '- ' + paraMoeda(t.descontoCashback));
  mostrarLinha('linha-cashback-ganho', t.cashbackGanho > 0, '+ ' + paraMoeda(t.cashbackGanho));

  // Caixa de cashback disponível
  const bloco = $('#bloco-cashback');
  if (bloco) {
    bloco.hidden = t.saldo <= 0;
    definir('saldo-disponivel', paraMoeda(t.saldo));
  }

  // Aviso do limite de gastos (se der qualquer problema, apenas não mostra o aviso)
  const aviso = $('#aviso-gastos');
  if (aviso) {
    let texto = '';
    try {
      const usuario = obterSessao();
      texto = usuario ? textoAlertaGastos(statusGastos(usuario.id, t.total)) : '';
    } catch (erro) { texto = ''; }
    aviso.hidden = !texto;
    aviso.textContent = texto ? (texto.includes('ultrapassou') ? '⚠️ ' : '🔔 ') + texto : '';
    aviso.className = 'aviso ' + (texto.includes('ultrapassou') ? 'aviso-estourou' : 'aviso-perto');
  }
}

/* ---------- 2. Lista de itens do carrinho ---------- */
function renderizarResumo() {
  const lista = $('#lista-itens-resumo');
  const botao = $('#botao-finalizar-pagamento');
  const carrinho = obterCarrinho();

  if (!carrinho.length) {
    lista.innerHTML = `
      <div class="carrinho-vazio">
        <p>Seu carrinho está vazio.</p>
        <a href="cardapio.html" class="botao botao-primario">Ver cardápio</a>
      </div>`;
    botao.disabled = true;
  } else {
    botao.disabled = false;
    lista.innerHTML = carrinho.map((item) => `
      <div class="item-resumo">
        <div class="nome-item">
          <span>${esc(item.nome)}</span>
          <div class="controle-quantidade">
            <button type="button" class="botao-qtd" data-acao="menos" data-id="${esc(item.id)}" aria-label="Diminuir quantidade">−</button>
            <span class="qtd-item">${item.quantidade} un.</span>
            <button type="button" class="botao-qtd" data-acao="mais" data-id="${esc(item.id)}" aria-label="Aumentar quantidade">+</button>
            <button type="button" class="botao-remover" data-id="${esc(item.id)}" aria-label="Remover item">🗑</button>
          </div>
        </div>
        <span>${paraMoeda(item.preco * item.quantidade)}</span>
      </div>`).join('');
  }
  renderizarTotais();
}

/* ---------- 3. Frete pela distância ---------- */
function atualizarInfoFrete() {
  const info = $('#info-frete');
  if (!info || EST.km === null) return;
  if (EST.fora) {
    info.textContent = `❌ Endereço a ${EST.km.toLocaleString('pt-BR')} km: fora da área de entrega (máximo ${CONFIG.frete.maxKm} km).`;
    return;
  }
  const minutos = CONFIG.preparoMin + estimarEta(EST.modo, EST.km);
  info.textContent = `📍 Distância pela rota ≈ ${EST.km.toLocaleString('pt-BR')} km · Frete ${paraMoeda(EST.valorFrete)} · Entrega em cerca de ${minutos} min`;
}

async function calcularFrete() {
  const info = $('#info-frete');
  const cep = $('#cep').value.replace(/\D/g, '');
  const numero = $('#numero-casa').value.trim();
  if (cep.length !== 8) { info.textContent = 'Informe o CEP completo para calcular o frete.'; return; }

  const requisicao = ++EST.requisicao;
  info.textContent = '⏳ Calculando distância e frete...';
  try {
    const via = await buscarCep(cep);
    if (requisicao !== EST.requisicao) return;
    if (!via) { info.textContent = '❌ CEP não encontrado.'; return; }

    const campoRua = $('#endereco');
    if (!campoRua.value.trim() && via.logradouro) campoRua.value = via.logradouro;
    const cidade = `${via.localidade}, ${via.uf}`;
    const rua = campoRua.value.trim();

    // Tenta do endereço mais completo para o mais simples
    let destino = await geocodificar([rua, numero, via.bairro, cidade].filter(Boolean).join(', '));
    if (!destino) destino = await geocodificar([rua, via.bairro, cidade].filter(Boolean).join(', '));
    if (!destino) destino = await geocodificar(`${cep}, ${cidade}`);
    if (requisicao !== EST.requisicao) return;
    if (!destino) throw new Error('sem coordenadas');

    const rota = await obterRota(CONFIG.restaurante, destino);
    if (requisicao !== EST.requisicao) return;

    EST.km = Math.round(rota.km * 10) / 10;
    EST.destino = destino;
    EST.rota = simplificarRota(rota.pontos);
    EST.fora = EST.km > CONFIG.frete.maxKm;
    EST.valorFrete = arredondar(CONFIG.frete.base + EST.km * CONFIG.frete.porKm);

    // Bicicleta só até o alcance máximo
    const longe = EST.km > CONFIG.entrega.bicicleta.maxKm;
    $('.opcao-entrega[data-modo="bicicleta"]').classList.toggle('desativada', longe);
    $('input[value="bicicleta"]').disabled = longe;
    if (longe && EST.modo === 'bicicleta') selecionarModo('moto');
    atualizarInfoFrete();
  } catch (erro) {
    EST.km = null; EST.valorFrete = null; EST.destino = null; EST.rota = null; EST.fora = false;
    info.textContent = `Não foi possível calcular a distância agora. Usaremos a taxa fixa de ${paraMoeda(CONFIG.frete.padrao)}.`;
  }
  renderizarTotais();
}

function selecionarModo(modo) {
  EST.modo = modo;
  $$('.opcao-entrega').forEach((el) => el.classList.toggle('selecionada', el.dataset.modo === modo));
  $('input[value="' + modo + '"]').checked = true;
  atualizarInfoFrete();
  renderizarTotais();
}

/* ---------- 4. Validação do cartão ---------- */
function validarCartao() {
  let ok = true;
  const verificar = (campo, valido, mensagem) => { mostrarErro(campo, valido ? '' : mensagem); if (!valido) ok = false; };
  const numero = $('#numero-cartao');
  const nome = $('#nome-cartao');
  const validade = $('#validade-cartao');
  const cvv = $('#cvv-cartao');
  const partes = /^(\d{2})\/(\d{2})$/.exec(validade.value);
  const mes = partes ? Number(partes[1]) : 0;
  verificar(numero, numero.value.replace(/\D/g, '').length === 16, 'Digite os 16 números do cartão.');
  verificar(nome, nome.value.trim().length >= 3, 'Digite o nome impresso no cartão.');
  verificar(validade, Boolean(partes) && mes >= 1 && mes <= 12, 'Validade inválida (MM/AA).');
  verificar(cvv, /^\d{3}$/.test(cvv.value), 'CVV com 3 números.');
  return ok;
}

/* ---------- 5. Confirmação de pagamento (simulada) ---------- */
// QR Code de demonstração (desenho, não é um QR Code real)
function qrFalso(semente) {
  const n = 25;
  let s = 0;
  for (const c of semente) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const aleatorio = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const emCanto = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  let quadrados = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!emCanto(x, y) && aleatorio() > 0.52) quadrados += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  const canto = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" xmlns="http://www.w3.org/2000/svg" aria-label="QR Code de demonstração">
    <rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/>
    <g fill="#14210A">${quadrados}${canto(0, 0)}${canto(n - 7, 0)}${canto(0, n - 7)}</g></svg>`;
}

function htmlFormaPagamento(forma, total, pedidoId) {
  if (forma === 'pix') {
    return `
      <div class="qr-pix">${qrFalso(pedidoId)}</div>
      <p class="dica-campo">Código Pix (demonstração):</p>
      <div class="codigo-copia" id="codigo-pix">FOODWISE-DEMO-PIX-${pedidoId}-${total.toFixed(2)}</div>
      <button type="button" class="botao botao-secundario botao-bloco" id="botao-copiar-pix">Copiar código</button>`;
  }
  if (forma === 'cartao') {
    const final = $('#numero-cartao').value.replace(/\D/g, '').slice(-4);
    return `<p>💳 Cartão com final <strong>${esc(final)}</strong>. O pagamento será autorizado em ambiente de demonstração.</p>`;
  }
  return `
    <p class="dica-campo">Linha digitável (demonstração):</p>
    <div class="codigo-copia">00000.00000 00000.000000 00000.000000 0 00000000000000</div>
    <p class="nota-pequena">No ambiente real, o boleto seria enviado ao e-mail cadastrado.</p>`;
}

function abrirModalPagamento() {
  const t = calcularTotais();
  const forma = formaSelecionada();
  const usuario = obterSessao();
  const pedidoId = 'FW-' + Math.floor(10000 + Math.random() * 89999);
  const alerta = textoAlertaGastos(statusGastos(usuario.id, t.total));
  const nomes = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto' };

  const modal = criarModal('modal-pagamento', 'modal-pequeno');
  abrirModal(modal, `
    <div class="modal-corpo">
      <h2>Confirmar pagamento</h2>
      <p class="aviso aviso-info">🧪 Ambiente de demonstração: nenhum valor real é cobrado.</p>
      <div class="resumo-modal"><span>${nomes[forma]}</span><span>${paraMoeda(t.total)}</span></div>
      ${htmlFormaPagamento(forma, t.total, pedidoId)}
      ${alerta ? `<p class="aviso ${alerta.includes('ultrapassou') ? 'aviso-estourou' : 'aviso-perto'}">${alerta.includes('ultrapassou') ? '⚠️' : '🔔'} ${esc(alerta)}</p>` : ''}
      <button type="button" class="botao botao-primario botao-bloco" id="botao-simular-pagamento">Simular pagamento</button>
    </div>`);

  const copiar = $('#botao-copiar-pix', modal);
  if (copiar) {
    copiar.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#codigo-pix', modal).textContent); copiar.textContent = '✓ Código copiado'; }
      catch (erro) { copiar.textContent = 'Selecione e copie o código acima'; }
    });
  }
  $('#botao-simular-pagamento', modal).addEventListener('click', () => processarPagamento(modal, forma, pedidoId));
}

function criarPedido(forma, pedidoId) {
  const usuario = obterSessao();
  const t = calcularTotais();
  const destino = EST.destino || { lat: CONFIG.restaurante.lat + 0.008, lng: CONFIG.restaurante.lng + 0.008 };
  const rota = EST.rota || [[CONFIG.restaurante.lat, CONFIG.restaurante.lng], [destino.lat, destino.lng]];
  const enderecoTexto = [$('#endereco').value.trim(), $('#numero-casa').value.trim()].filter(Boolean).join(', ');

  return {
    id: pedidoId,
    usuarioId: usuario.id,
    itens: obterCarrinho(),
    subtotal: t.subtotal,
    frete: t.frete,
    descontoCupom: t.descontoCupom,
    descontoCashback: t.descontoCashback,
    total: t.total,
    cashbackGanho: t.cashbackGanho,
    cashbackCreditado: false,
    pagamento: { forma: forma, status: 'aprovado', em: new Date().toISOString() },
    entrega: {
      modo: EST.modo,
      km: EST.km,
      etaMin: estimarEta(EST.modo, EST.km),
      preparoMin: CONFIG.preparoMin,
      destino: destino,
      rota: rota,
      enderecoTexto: enderecoTexto
    },
    criadoEm: new Date().toISOString(),
    escalaMs: CONFIG.modoDemonstracao ? CONFIG.msPorMinutoDemo : CONFIG.msPorMinutoReal,
    etapaNotificada: -1, // o vigia (entrega.js) envia o aviso da etapa 0
    alertaGastos: ''
  };
}

async function processarPagamento(modal, forma, pedidoId) {
  pedirPermissaoNotificacao(); // precisa acontecer num clique do usuário
  abrirModal(modal, `
    <div class="processando">
      <div class="spinner"></div>
      <h3>Processando pagamento…</h3>
      <p>Aguarde, estamos confirmando (simulação).</p>
    </div>`);
  await esperar(1800);

  const usuario = obterSessao();
  const pedido = criarPedido(forma, pedidoId);
  salvarPedido(pedido);
  salvarCarrinho([]);
  atualizarContadores();
  if (pedido.descontoCashback > 0) gravarSaldoCashback(usuario.id, obterSaldoCashback(usuario.id) - pedido.descontoCashback);

  // Alerta de gastos considerando este pedido já salvo
  pedido.alertaGastos = textoAlertaGastos(statusGastos(usuario.id, 0));
  salvarPedido(pedido);

  abrirModal(modal, `
    <div class="processando">
      <div class="sucesso-icone">✓</div>
      <h3>Pagamento aprovado!</h3>
      <p>Pedido <strong>#${esc(pedido.id)}</strong> confirmado. Abrindo o acompanhamento…</p>
    </div>`);
  await esperar(1500);
  location.href = 'acompanharpedido.html?pedido=' + encodeURIComponent(pedido.id);
}

/* ---------- 6. Envio do formulário ---------- */
async function aoEnviarPagamento(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  if (!obterCarrinho().length) { mostrarToast('Seu carrinho está vazio.', 'erro'); return; }

  let ok = validarFormulario(form);
  if ($('#cep').value.replace(/\D/g, '').length !== 8) { mostrarErro($('#cep'), 'Digite o CEP completo.'); ok = false; }
  if (formaSelecionada() === 'cartao' && !validarCartao()) ok = false;
  if (!ok) return;

  if (!obterSessao()) { location.href = 'login.html?retorno=pagamento.html'; return; }
  if (EST.km === null) await calcularFrete(); // garante o frete antes de confirmar
  if (EST.fora) { mostrarToast(`Endereço fora da área de entrega (${CONFIG.frete.maxKm} km).`, 'erro'); return; }
  abrirModalPagamento();
}

/* ---------- 7. Início ---------- */
async function iniciarPagamento() {
  const form = $('#form-pagamento');
  if (!form) return;

  try {
    // 1º: desenha o carrinho (assim ele aparece mesmo se algo abaixo falhar)
    renderizarResumo();

    // Quantidade/remoção de itens
    $('#lista-itens-resumo').addEventListener('click', (evento) => {
      const qtd = evento.target.closest('.botao-qtd');
      const remover = evento.target.closest('.botao-remover');
      if (qtd) alterarQuantidade(Number(qtd.dataset.id), qtd.dataset.acao === 'mais' ? 1 : -1);
      else if (remover) removerDoCarrinho(Number(remover.dataset.id));
      else return;
      renderizarResumo();
    });

    // Endereço: máscaras, preenchimento automático e cálculo do frete
    aplicarMascara($('#cep'), 'cep');
    aplicarMascara($('#numero-cartao'), 'cartao');
    aplicarMascara($('#validade-cartao'), 'validade');
    const usuario = obterSessao();
    if (usuario && usuario.endereco) {
      const e = usuario.endereco;
      $('#cep').value = e.cep || '';
      $('#numero-casa').value = e.numero || '';
      $('#endereco').value = e.rua || '';
      $('#complemento').value = e.complemento || '';
    }
    $('#cep').addEventListener('change', calcularFrete);
    $('#numero-casa').addEventListener('change', calcularFrete);
    $('#botao-calcular-frete').addEventListener('click', calcularFrete);

    // Forma de entrega
    $$('input[name="modo-entrega"]').forEach((radio) => radio.addEventListener('change', () => selecionarModo(radio.value)));

    // Forma de pagamento
    $$('.opcao-pagamento').forEach((opcao) => opcao.addEventListener('click', () => {
      $$('.opcao-pagamento').forEach((o) => o.classList.remove('selecionada'));
      opcao.classList.add('selecionada');
      $$('.conteudo-pagamento-forma').forEach((c) => c.classList.toggle('ativo', c.dataset.forma === opcao.dataset.forma));
    }));

    // Cupom e cashback
    $('#botao-cupom').addEventListener('click', () => {
      const codigo = $('#campo-cupom').value.trim().toUpperCase();
      if (codigo !== CONFIG.cupom.codigo) { mostrarToast('Cupom inválido.', 'erro'); return; }
      if (EST.cupom) { mostrarToast('Este cupom já foi aplicado.'); return; }
      if (subtotalCarrinho() <= 0) { mostrarToast('Adicione itens antes de aplicar um cupom.', 'erro'); return; }
      EST.cupom = true;
      $('#campo-cupom').disabled = true;
      $('#botao-cupom').disabled = true;
      mostrarToast('Cupom aplicado! 10% de desconto nos itens.');
      renderizarTotais();
    });
    $('#usar-cashback').addEventListener('change', (evento) => { EST.usarCashback = evento.target.checked; renderizarTotais(); });

    form.addEventListener('submit', aoEnviarPagamento);

    if ($('#cep').value.replace(/\D/g, '').length === 8) calcularFrete();
  } catch (erro) {
    console.error('Erro na página de pagamento:', erro);
    $('#lista-itens-resumo').innerHTML = `<p class="mensagem-vazia">Erro ao carregar o pagamento.<br><small>${esc(erro.message)}</small></p>`;
    return;
  }

  // Confere se o cardápio do GitHub mudou preços/nomes (não trava a página se falhar)
  try {
    const cardapio = await carregarCardapio();
    if (sincronizarCarrinho(cardapio.itens)) {
      mostrarToast('O cardápio foi atualizado e seu carrinho foi ajustado.');
      renderizarResumo();
    }
  } catch (erro) { console.warn('Não foi possível sincronizar o carrinho:', erro); }
}

document.addEventListener('DOMContentLoaded', iniciarPagamento);
