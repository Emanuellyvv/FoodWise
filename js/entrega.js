/* ==========================================================================
   FOODWISE — PEDIDOS, ENTREGA E NOTIFICAÇÕES (js/entrega.js)
   - Guarda pedidos, cashback e limite de gastos
   - Vigia as etapas do pedido e avisa o cliente (tela, sistema e e-mail)
   - Página de acompanhamento: mapa com a rota real e o entregador andando
   ========================================================================== */

const ETAPAS = [
  { titulo: 'Pedido confirmado', icone: '✅', mensagem: 'Recebemos o seu pedido e o pagamento foi aprovado.' },
  { titulo: 'Pedido em preparo', icone: '👩‍🍳', mensagem: 'A cozinha já está preparando o seu pedido.' },
  { titulo: 'Saiu para entrega', icone: '🛵', mensagem: 'O entregador saiu com o seu pedido. Acompanhe pelo mapa!' },
  { titulo: 'Pedido entregue', icone: '🏠', mensagem: 'Pedido entregue. Bom apetite!' }
];

/* ---------- 1. Pedidos, cashback e limite de gastos ---------- */
function obterPedidos() { return lerJSON(CHAVES.pedidos, []); }

function obterPedidosDoUsuario(usuarioId) {
  return obterPedidos()
    .filter((p) => String(p.usuarioId) === String(usuarioId))
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function salvarPedido(pedido) {
  const lista = obterPedidos();
  const indice = lista.findIndex((p) => p.id === pedido.id);
  if (indice >= 0) lista[indice] = pedido; else lista.push(pedido);
  gravarJSON(CHAVES.pedidos, lista);
}

function obterSaldoCashback(usuarioId) { return Number(lerJSON('foodwise_cashback_' + usuarioId, 0)) || 0; }
function gravarSaldoCashback(usuarioId, valor) { gravarJSON('foodwise_cashback_' + usuarioId, arredondar(Math.max(valor, 0))); }

function obterLimite(usuarioId) { return lerJSON('foodwise_limite_' + usuarioId, null); }
function gravarLimite(usuarioId, limite) { gravarJSON('foodwise_limite_' + usuarioId, limite); }

function inicioDoPeriodo(periodo) {
  const d = new Date();
  if (periodo === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
  else d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Quanto o usuário já gastou no período em relação ao limite (extra = pedido que ainda vai fazer)
function statusGastos(usuarioId, extra = 0) {
  const limite = obterLimite(usuarioId);
  if (!limite || !(limite.valor > 0)) return null;
  const inicio = inicioDoPeriodo(limite.periodo);
  const gasto = obterPedidosDoUsuario(usuarioId)
    .filter((p) => new Date(p.criadoEm).getTime() >= inicio)
    .reduce((soma, p) => soma + p.total, 0);
  const projetado = gasto + extra;
  return { limite: limite, gasto: gasto, projetado: projetado, pct: projetado / limite.valor };
}

function textoAlertaGastos(st) {
  if (!st || st.pct < CONFIG.limiteAlerta) return '';
  const periodo = st.limite.periodo === 'semana' ? 'semanal' : 'mensal';
  const valores = `(${paraMoeda(st.projetado)} de ${paraMoeda(st.limite.valor)})`;
  return st.pct >= 1
    ? `Você ultrapassou o seu limite ${periodo} ${valores}.`
    : `Você já usou ${Math.round(st.pct * 100)}% do seu limite ${periodo} ${valores}.`;
}

/* ---------- 2. Tempo e etapas do pedido ---------- */
function estimarEta(modo, km) {
  if (km === null || km === undefined) return 15;
  return Math.max(3, Math.round((km / CONFIG.entrega[modo].velocidadeKmH) * 60) + 2);
}

// Minutos "simulados" desde que o pedido foi feito (no modo demonstração passam mais rápido)
function minutosDecorridos(p) { return (Date.now() - new Date(p.criadoEm).getTime()) / p.escalaMs; }

function etapaDoPedido(p) {
  const m = minutosDecorridos(p);
  if (m >= p.entrega.preparoMin + p.entrega.etaMin) return 3;
  if (m >= p.entrega.preparoMin) return 2;
  if (m >= 0.5) return 1;
  return 0;
}

// Quanto do trajeto já foi percorrido (0 a 1)
function progressoEntrega(p) {
  const m = minutosDecorridos(p) - p.entrega.preparoMin;
  return Math.min(Math.max(m / p.entrega.etaMin, 0), 1);
}

function rotaDoPedido(p) {
  if (p.entrega.rota && p.entrega.rota.length > 1) return p.entrega.rota;
  const d = p.entrega.destino || { lat: CONFIG.restaurante.lat + 0.008, lng: CONFIG.restaurante.lng + 0.008 };
  return [[CONFIG.restaurante.lat, CONFIG.restaurante.lng], [d.lat, d.lng]];
}

/* ---------- 3. Vigia dos pedidos: avisa a cada nova etapa ---------- */
function montarTextoEmail(p, etapa) {
  const itens = p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', ');
  return `${ETAPAS[etapa].mensagem}\n\nPedido #${p.id}\nItens: ${itens}\nTotal: ${paraMoeda(p.total)}\nEntrega: ${CONFIG.entrega[p.entrega.modo].rotulo}`;
}

function verificarPedidos() {
  const usuario = obterSessao();
  if (!usuario) return;

  obterPedidosDoUsuario(usuario.id).forEach((p) => {
    if (p.etapaNotificada >= 3) return;
    const etapa = etapaDoPedido(p);
    if (etapa <= p.etapaNotificada) return;

    for (let i = p.etapaNotificada + 1; i <= etapa; i++) {
      notificar(ETAPAS[i].titulo, 'Pedido #' + p.id);
      enviarEmailPedido(usuario, `FoodWise • ${ETAPAS[i].titulo} (#${p.id})`, montarTextoEmail(p, i), p);
      if (i === 0 && p.alertaGastos) notificar('Alerta de gastos', p.alertaGastos);
    }
    p.etapaNotificada = etapa;

    // Ao entregar, libera o cashback da bicicleta
    if (etapa === 3 && p.cashbackGanho > 0 && !p.cashbackCreditado) {
      gravarSaldoCashback(usuario.id, obterSaldoCashback(usuario.id) + p.cashbackGanho);
      p.cashbackCreditado = true;
      mostrarToast('🌱 Você ganhou ' + paraMoeda(p.cashbackGanho) + ' de cashback!');
    }
    salvarPedido(p);
  });
}

/* ---------- 4. Página de acompanhamento ---------- */
let MAPA = null;
const CAMADAS = {};
let ID_PEDIDO_ATUAL = null;

function montarMapa(p) {
  const elemento = $('#mapa-pedido');
  if (typeof L === 'undefined') {
    elemento.innerHTML = '<p class="mensagem-vazia">Não foi possível carregar o mapa.</p>';
    return;
  }
  if (MAPA) { MAPA.remove(); MAPA = null; }

  const rota = rotaDoPedido(p);
  MAPA = L.map(elemento, { zoomControl: false, scrollWheelZoom: false }).fitBounds(rota, { padding: [30, 30] });
  L.control.zoom({ position: 'bottomright' }).addTo(MAPA);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; colaboradores do OpenStreetMap', maxZoom: 19
  }).addTo(MAPA);

  const icone = (emoji, classe) => L.divIcon({ className: 'icone-mapa ' + classe, html: emoji, iconSize: [38, 38], iconAnchor: [19, 19] });
  L.marker(rota[0], { icon: icone('🍽️', '') }).addTo(MAPA).bindPopup('FoodWise — cozinha');
  L.marker(rota[rota.length - 1], { icon: icone('🏠', '') }).addTo(MAPA).bindPopup('Endereço de entrega');

  // Linha tracejada = caminho que falta; linha rosa = caminho já percorrido
  CAMADAS.restante = L.polyline(rota, { color: '#849A28', weight: 5, opacity: 0.65, dashArray: '2 10', lineCap: 'round' }).addTo(MAPA);
  CAMADAS.feito = L.polyline([rota[0]], { color: '#E23260', weight: 5 }).addTo(MAPA);
  const emoji = p.entrega.modo === 'bicicleta' ? '🚲' : '🛵';
  CAMADAS.entregador = L.marker(rota[0], { icon: icone(emoji, 'icone-moto'), zIndexOffset: 1000 }).addTo(MAPA);
  setTimeout(() => MAPA && MAPA.invalidateSize(), 300);
}

function renderizarDetalhes(p) {
  const caixa = $('#detalhes-ultimo-pedido');
  const formas = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto' };
  const linha = (rotulo, valor) => `<div class="linha-total"><span>${rotulo}</span><span>${valor}</span></div>`;
  caixa.innerHTML = p.itens.map((i) => `
    <div class="item-resumo">
      <div class="nome-item"><span>${esc(i.nome)}</span><span class="qtd-item">${i.quantidade} unidade(s)</span></div>
      <span>${paraMoeda(i.preco * i.quantidade)}</span>
    </div>`).join('') +
    linha('Subtotal', paraMoeda(p.subtotal)) +
    linha(`Entrega (${CONFIG.entrega[p.entrega.modo].rotulo}${p.entrega.km ? ', ' + p.entrega.km.toLocaleString('pt-BR') + ' km' : ''})`, paraMoeda(p.frete)) +
    (p.descontoCupom > 0 ? linha('Cupom', '- ' + paraMoeda(p.descontoCupom)) : '') +
    (p.descontoCashback > 0 ? linha('Cashback usado', '- ' + paraMoeda(p.descontoCashback)) : '') +
    (p.cashbackGanho > 0 ? linha('🌱 Cashback a receber', paraMoeda(p.cashbackGanho)) : '') +
    linha('Pagamento', (formas[p.pagamento.forma] || '') + ' · aprovado') +
    `<div class="linha-total total-final"><span>Total pago</span><span>${paraMoeda(p.total)}</span></div>`;
  $('#endereco-entrega-atual').textContent = p.entrega.enderecoTexto || 'Endereço informado no pedido';
}

// Atualiza etapas, barra, mapa e textos (chamada várias vezes por segundo)
function atualizarTela(p) {
  const etapa = etapaDoPedido(p);
  const fracao = progressoEntrega(p);
  const modo = p.entrega.modo;
  const marcos = [0, 0.5, p.entrega.preparoMin, p.entrega.preparoMin + p.entrega.etaMin];
  const hora = (min) => new Date(new Date(p.criadoEm).getTime() + min * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const icones = ['✅', '👩‍🍳', modo === 'bicicleta' ? '🚲' : '🛵', '🏠'];

  $$('.etapa-pedido').forEach((el, i) => {
    const feita = i < etapa || (i === 3 && etapa === 3);
    el.classList.toggle('concluida', feita);
    el.classList.toggle('atual', i === etapa && etapa < 3);
    $('.circulo', el).textContent = feita ? '✓' : icones[i];
    $('span', el).textContent = i <= etapa ? hora(marcos[i]) : 'Previsão ' + hora(marcos[i]);
  });

  const progresso = etapa < 2 ? (etapa / 3) * 100 : etapa === 2 ? ((2 + fracao) / 3) * 100 : 100;
  $('.linha-do-tempo .progresso').style.width = progresso + '%';

  $('#numero-pedido').textContent = '#' + p.id;
  $('#selo-status').textContent = ['Pedido confirmado', 'Em preparo', 'Em rota de entrega', 'Entregue ✓'][etapa];
  $('#previsao-entrega').textContent = (etapa < 3 ? 'Previsão de entrega: hoje, às ' : 'Entregue hoje, às ') + hora(marcos[3]);
  const restante = Math.max(0, Math.ceil(marcos[3] - minutosDecorridos(p)));
  $('#tempo-restante').textContent = etapa < 3 ? `Chega em cerca de ${restante} min` : '';
  $('#entregador-nome').textContent = modo === 'bicicleta' ? 'Rafael Costa' : 'Carlos Mendes';
  $('#entregador-info').textContent = modo === 'bicicleta' ? 'Bicicleta · entrega sustentável 🌱' : 'Motocicleta · Placa FWX-2025';

  // Move o entregador pela rota
  if (MAPA && CAMADAS.entregador) {
    const rota = rotaDoPedido(p);
    const posicao = posicaoNaRota(rota, etapa >= 3 ? 1 : etapa === 2 ? fracao : 0);
    if (posicao) {
      CAMADAS.entregador.setLatLng(posicao.ponto);
      CAMADAS.feito.setLatLngs(rota.slice(0, posicao.indice).concat([posicao.ponto]));
    }
  }
}

function selecionarPedido(p) {
  ID_PEDIDO_ATUAL = p.id;
  renderizarDetalhes(p);
  montarMapa(p);
  atualizarTela(p);
}

function iniciarAcompanhamento() {
  if (!$('#mapa-pedido')) return;
  const usuario = obterSessao();
  if (!usuario) { location.replace('login.html?retorno=acompanharpedido.html'); return; }

  const lista = obterPedidosDoUsuario(usuario.id);
  if (!lista.length) { $('#estado-sem-pedido').hidden = false; $('#conteudo-acompanhamento').hidden = true; return; }

  // Seletor de pedido (se houver mais de um)
  const seletor = $('#seletor-pedido');
  seletor.innerHTML = lista.map((p) => `<option value="${esc(p.id)}">#${esc(p.id)} · ${new Date(p.criadoEm).toLocaleDateString('pt-BR')}</option>`).join('');
  seletor.hidden = lista.length < 2;
  const idUrl = new URLSearchParams(location.search).get('pedido');
  const inicial = lista.find((p) => p.id === idUrl) || lista[0];
  seletor.value = inicial.id;
  seletor.addEventListener('change', () => {
    const escolhido = obterPedidos().find((p) => p.id === seletor.value);
    if (escolhido) selecionarPedido(escolhido);
  });

  // Botão de notificações (aparece só se ainda não foi decidido)
  const botaoNotificar = $('#botao-ativar-notificacoes');
  if ('Notification' in window && Notification.permission === 'default') {
    botaoNotificar.hidden = false;
    botaoNotificar.addEventListener('click', async () => {
      await pedirPermissaoNotificacao();
      botaoNotificar.hidden = true;
    });
  }

  // Reinicia a demonstração do mesmo pedido
  $('#botao-reiniciar-simulacao').addEventListener('click', () => {
    const p = obterPedidos().find((x) => x.id === ID_PEDIDO_ATUAL);
    if (!p) return;
    p.criadoEm = new Date().toISOString();
    p.etapaNotificada = -1;
    salvarPedido(p);
    selecionarPedido(p);
  });

  selecionarPedido(inicial);
  setInterval(() => {
    const p = obterPedidos().find((x) => x.id === ID_PEDIDO_ATUAL);
    if (p) atualizarTela(p);
  }, 500);
}

/* ---------- 5. Início ---------- */
document.addEventListener('DOMContentLoaded', () => {
  verificarPedidos();
  setInterval(verificarPedidos, 2000);
  iniciarAcompanhamento();
});
