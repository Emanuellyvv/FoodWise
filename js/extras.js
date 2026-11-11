/* ==========================================================================
   FOODWISE — EXTRAS (js/extras.js)  — carregar DEPOIS do script.js

   MAPA DO ARQUIVO (cada bloco é independente):
   1. CONFIGURAÇÕES ........ valores que você pode ajustar
   2. UTILITÁRIOS .......... ler/gravar localStorage, avisos na tela, notificações, e-mail
   3. ESTILOS .............. CSS dos recursos novos (injetado pelo JS)
   4. LOGO ................. troca o ícone do cabeçalho pela logo SVG
   5. ALERTA DE GASTOS ..... limite semanal/mensal + avisos
   6. FRETE E ENTREGA ...... distância (CEP→mapa), moto/bicicleta, cashback
   7. TOTAIS DO PAGAMENTO .. substitui a função original para usar o frete novo
   8. FINALIZAR PEDIDO ..... complementa o pedido salvo pelo script.js
   9. ACOMPANHAMENTO ....... etapas por tempo, notificações e e-mails
  10. MODAL DO PRATO ....... imagem grande, tabela nutricional, indicação por objetivo
  11. INICIALIZAÇÃO ........ liga tudo quando a página carrega
   ========================================================================== */

/* ---------- 1. CONFIGURAÇÕES ---------- */
const FW = {
  restaurante: { lat: -25.4296, lng: -49.2713 }, // mesmo ponto do mapa
  frete: { base: 4.0, porKm: 1.5, maxKm: 15 },   // frete = base + (km × porKm)
  bicicleta: { maxKm: 8, cashback: 0.05 },       // bike até 8 km, 5% de cashback
  limiteAlerta: 0.8,                             // avisa ao chegar em 80% do limite
  msPorMinuto: 4000,    // DEMO: 1 min "simulado" = 4 s. Use 60000 para tempo real
  preparoMin: 8,        // minutos de preparo
  emailjs: { serviceId: '', templateId: '', publicKey: '' } // veja "Como ativar o e-mail"
};

const FRETE_ESTADO = { km: null, valor: null, modo: 'moto', fora: false };
const ETAPAS = ['Pedido confirmado', 'Pedido em preparo', 'Saiu para entrega', 'Pedido entregue'];
const MENSAGENS = [
  'Recebemos o seu pedido e o pagamento foi confirmado.',
  'A cozinha já está preparando o seu pedido.',
  'Seu pedido saiu para entrega! Fique atento.',
  'Pedido entregue. Bom apetite!'
];
const ROTULOS_OBJETIVO = {
  'emagrecimento': 'Emagrecimento',
  'ganho-de-massa': 'Ganho de massa',
  'alimentacao-equilibrada': 'Alimentação equilibrada',
  'performance': 'Performance esportiva'
};

/* ---------- 2. UTILITÁRIOS ---------- */
function qs(seletor, raiz) { return (raiz || document).querySelector(seletor); }

function lerJSON(chave, padrao) {
  try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; }
  catch (e) { return padrao; }
}
function gravarJSON(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {}
}
// chave de armazenamento própria de cada usuário logado
function chaveUsuario(prefixo) {
  const u = obterSessao();
  return u ? prefixo + '_' + u.id : prefixo + '_anonimo';
}

// aviso flutuante dentro do site (sempre funciona)
function mostrarToast(texto) {
  let c = qs('#fw-toasts');
  if (!c) { c = document.createElement('div'); c.id = 'fw-toasts'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'fw-toast';
  t.textContent = texto;
  c.appendChild(t);
  setTimeout(function () { t.remove(); }, 6000);
}

// toast + notificação do navegador (se o usuário permitiu)
function notificar(titulo, corpo) {
  mostrarToast(titulo + ' — ' + corpo);
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: corpo, icon: 'favicon.svg' });
    }
  } catch (e) {}
}
function pedirPermissaoNotificacao() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }
  catch (e) {}
}

// envia e-mail pelo serviço gratuito EmailJS (não precisa de servidor)
async function enviarEmail(assunto, mensagem, pedido) {
  const c = FW.emailjs, u = obterSessao();
  if (!c.serviceId || !c.templateId || !c.publicKey || !u) return;
  try {
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: c.serviceId, template_id: c.templateId, user_id: c.publicKey,
        template_params: {
          to_email: u.email, to_name: u.nome, assunto: assunto, mensagem: mensagem,
          pedido_numero: pedido.numero, total: pedido.total
        }
      })
    });
  } catch (e) { console.warn('Falha ao enviar e-mail', e); }
}

/* ---------- 3. ESTILOS ---------- */
function injetarEstilos() {
  const s = document.createElement('style');
  s.textContent = `
  .logo-icone{background:none!important}.logo-icone svg{width:100%;height:100%}
  .cartao-prato{cursor:pointer}
  .opcoes-entrega{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
  .opcao-entrega{border:1.5px solid var(--cinza-claro);border-radius:var(--raio-borda-sm);padding:1rem;text-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.3rem;transition:var(--transicao)}
  .opcao-entrega input{display:none}
  .opcao-entrega.selecionada{border-color:var(--rosa-forte);background:var(--creme)}
  .opcao-entrega.desativada{opacity:.45;cursor:not-allowed}
  .opcao-entrega .icone{font-size:1.6rem}
  .opcao-entrega small{color:var(--verde-oliva);font-weight:600}
  .fw-modal{position:fixed;inset:0;background:rgba(20,33,10,.65);display:none;align-items:center;justify-content:center;padding:1rem;z-index:2000}
  .fw-modal.aberto{display:flex}
  .fw-modal-caixa{background:#fff;border-radius:16px;max-width:760px;width:100%;max-height:90vh;overflow:auto;position:relative}
  .fw-modal-fechar{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;background:#fff;box-shadow:var(--sombra-suave);z-index:2}
  .fw-modal-img{width:100%;height:320px;object-fit:cover;display:block}
  .fw-modal-corpo{padding:1.5rem}
  .fw-tabela{width:100%;border-collapse:collapse;margin:.8rem 0}
  .fw-tabela td{padding:.5rem 0;border-bottom:1px solid var(--cinza-claro);font-size:.92rem}
  .fw-tabela td:last-child{text-align:right;font-weight:600;color:var(--verde-escuro)}
  .fw-tags{display:flex;flex-wrap:wrap;gap:.5rem;margin:.6rem 0 1rem}
  .fw-tags span{background:var(--rosa-claro);color:var(--verde-escuro);padding:.3rem .8rem;border-radius:50px;font-size:.8rem;font-weight:600}
  .fw-tags span.destaque{background:var(--verde-oliva);color:#fff}
  .fw-nota{font-size:.78rem;opacity:.75}
  #fw-toasts{position:fixed;top:90px;right:1rem;z-index:3000;display:flex;flex-direction:column;gap:.5rem;max-width:340px}
  .fw-toast{background:var(--verde-escuro);color:#fff;padding:.8rem 1rem;border-radius:8px;box-shadow:var(--sombra-forte);font-size:.9rem}
  .fw-aviso{padding:.8rem 1rem;border-radius:8px;margin:1rem 0;font-size:.88rem}
  .fw-aviso.perto{background:#fff3cd;color:#664d03}
  .fw-aviso.estourou{background:#fde2e8;color:#9b1c3f}
  @media(max-width:640px){.fw-modal-img{height:220px}.opcoes-entrega{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}

/* ---------- 4. LOGO ---------- */
const LOGO_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<circle cx="32" cy="32" r="32" fill="#1E3309"/>
<path d="M32 49C15 43 15 22 33 12c17 9 17 28-1 37Z" fill="#849A28"/>
<path d="M32 47c-1-11 0-21 3-29" stroke="#1E3309" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<circle cx="47" cy="47" r="7" fill="#E23260" stroke="#1E3309" stroke-width="3"/></svg>`;

function aplicarLogo() {
  document.querySelectorAll('.logo-icone').forEach(function (el) { el.innerHTML = LOGO_SVG; });
}

/* ---------- 5. ALERTA DE GASTOS ---------- */
// início da semana (segunda) ou do mês atual
function inicioPeriodo(periodo) {
  const d = new Date();
  if (periodo === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function statusLimite(valorExtra) {
  const lim = lerJSON(chaveUsuario('foodwise_limite'), null);
  if (!lim || !lim.valor) return null;
  const gasto = lerJSON(chaveUsuario('foodwise_gastos'), [])
    .filter(function (g) { return g.ts >= inicioPeriodo(lim.periodo); })
    .reduce(function (t, g) { return t + g.valor; }, 0);
  const projetado = gasto + (valorExtra || 0);
  return { lim: lim, gasto: gasto, projetado: projetado, pct: projetado / lim.valor };
}

// card "Alerta de gastos" dentro da página Minha conta
function montarConfigLimite() {
  const form = qs('#form-minha-conta');
  if (!form || !obterSessao()) return;
  const lim = lerJSON(chaveUsuario('foodwise_limite'), { periodo: 'mes', valor: '' });
  const caixa = document.createElement('div');
  caixa.innerHTML = `
    <h3 class="subtitulo-formulario">💰 Alerta de gastos</h3>
    <p class="dica-campo">Defina quanto quer gastar e avisamos quando você se aproximar do limite.</p>
    <div class="linha-formulario">
      <div class="campo"><label for="fw-periodo">Período</label>
        <select id="fw-periodo"><option value="mes">Mensal</option><option value="semana">Semanal</option></select></div>
      <div class="campo"><label for="fw-valor">Limite (R$)</label>
        <input type="number" id="fw-valor" min="0" step="1" placeholder="Ex.: 300" /></div>
    </div>
    <button type="button" class="botao botao-secundario" id="fw-salvar-limite">Salvar limite</button>
    <p class="dica-campo" id="fw-status-limite"></p>`;
  form.insertBefore(caixa, qs('.linha-acoes-conta', form));
  qs('#fw-periodo').value = lim.periodo;
  qs('#fw-valor').value = lim.valor;

  function mostrarStatus() {
    const st = statusLimite(0);
    const saldo = lerJSON(chaveUsuario('foodwise_cashback'), 0) || 0;
    qs('#fw-status-limite').textContent =
      (st ? 'Gasto ' + (st.lim.periodo === 'semana' ? 'nesta semana' : 'neste mês') + ': ' +
        paraMoeda(st.gasto) + ' de ' + paraMoeda(st.lim.valor) + ' (' + Math.round(st.pct * 100) + '%). '
        : 'Nenhum limite definido. ') + '🌱 Cashback acumulado: ' + paraMoeda(saldo);
  }
  qs('#fw-salvar-limite').addEventListener('click', function () {
    const valor = parseFloat(qs('#fw-valor').value);
    gravarJSON(chaveUsuario('foodwise_limite'), { periodo: qs('#fw-periodo').value, valor: valor > 0 ? valor : 0 });
    mostrarToast(valor > 0 ? 'Limite salvo!' : 'Limite removido.');
    mostrarStatus();
  });
  mostrarStatus();
}

// aviso em cima do botão "Confirmar pagamento"
function atualizarAvisoGastos(total) {
  const botao = qs('#botao-finalizar-pagamento');
  if (!botao) return;
  let aviso = qs('#fw-aviso-gastos');
  if (!aviso) { aviso = document.createElement('div'); aviso.id = 'fw-aviso-gastos'; botao.before(aviso); }
  const st = statusLimite(total);
  if (!st || st.pct < FW.limiteAlerta) { aviso.style.display = 'none'; return; }
  const per = st.lim.periodo === 'semana' ? 'semanal' : 'mensal';
  aviso.style.display = 'block';
  aviso.className = 'fw-aviso ' + (st.pct >= 1 ? 'estourou' : 'perto');
  aviso.textContent = st.pct >= 1
    ? '⚠️ Com este pedido você passa do seu limite ' + per + ' (' + paraMoeda(st.projetado) + ' de ' + paraMoeda(st.lim.valor) + ').'
    : '🔔 Atenção: com este pedido você chegará a ' + Math.round(st.pct * 100) + '% do seu limite ' + per +
      ' (' + paraMoeda(st.projetado) + ' de ' + paraMoeda(st.lim.valor) + ').';
}

/* ---------- 6. FRETE E FORMA DE ENTREGA ---------- */
function etaMin(modo, km) { return km == null ? 20 : Math.round(km * (modo === 'bicicleta' ? 5 : 3) + 5); }

// distância em linha reta entre dois pontos (fórmula de Haversine)
function distanciaKm(a, b) {
  const R = 6371, rad = function (x) { return x * Math.PI / 180; };
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// endereço (texto) -> coordenadas, usando o OpenStreetMap
async function geocodificar(consulta) {
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(consulta));
  const d = await r.json();
  return d.length ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) } : null;
}

function mostrarInfoFrete() {
  const info = qs('#fw-info-frete');
  if (!info || FRETE_ESTADO.km === null) return;
  info.textContent = FRETE_ESTADO.fora
    ? '❌ Endereço a ' + FRETE_ESTADO.km + ' km: fora da área de entrega (máx. ' + FW.frete.maxKm + ' km).'
    : '📍 Distância ≈ ' + FRETE_ESTADO.km + ' km • Frete ' + paraMoeda(FRETE_ESTADO.valor) +
      ' • Entrega em ~' + etaMin(FRETE_ESTADO.modo, FRETE_ESTADO.km) + ' min';
}

function selecionarModo(modo) {
  FRETE_ESTADO.modo = modo;
  document.querySelectorAll('.opcao-entrega').forEach(function (el) {
    el.classList.toggle('selecionada', el.dataset.modo === modo);
  });
  const radio = qs('.opcao-entrega input[value="' + modo + '"]');
  if (radio) radio.checked = true;
  mostrarInfoFrete();
  atualizarTotaisPagamento();
}

// CEP -> endereço (ViaCEP) -> coordenadas (OpenStreetMap) -> km -> frete
async function calcularFrete() {
  const info = qs('#fw-info-frete');
  if (!info) return;
  const cep = (qs('#cep').value || '').replace(/\D/g, '');
  const numero = (qs('#numero-casa').value || '').trim();
  if (cep.length !== 8) { info.textContent = 'Digite o CEP (8 números) para calcular o frete.'; return; }
  info.textContent = '⏳ Calculando frete...';
  try {
    const via = await (await fetch('https://viacep.com.br/ws/' + cep + '/json/')).json();
    if (via.erro) { info.textContent = 'CEP não encontrado.'; return; }
    const campoRua = qs('#endereco');
    if (!campoRua.value.trim()) campoRua.value = via.logradouro || '';
    const rua = campoRua.value.trim(), cidade = via.localidade + ', ' + via.uf;
    const ponto = await geocodificar([rua, numero, via.bairro, cidade].filter(Boolean).join(', '))
      || await geocodificar([rua, via.bairro, cidade].filter(Boolean).join(', '))
      || await geocodificar(cep + ', ' + cidade);
    if (!ponto) throw new Error('sem coordenadas');

    const km = parseFloat((distanciaKm(FW.restaurante, ponto) * 1.3).toFixed(1)); // 1.3 = curvas das ruas
    FRETE_ESTADO.km = km;
    FRETE_ESTADO.fora = km > FW.frete.maxKm;
    FRETE_ESTADO.valor = parseFloat((FW.frete.base + km * FW.frete.porKm).toFixed(2));

    const bike = qs('.opcao-entrega[data-modo="bicicleta"]'), longe = km > FW.bicicleta.maxKm;
    bike.classList.toggle('desativada', longe);
    bike.querySelector('input').disabled = longe;
    if (longe && FRETE_ESTADO.modo === 'bicicleta') selecionarModo('moto');
    mostrarInfoFrete();
  } catch (e) {
    FRETE_ESTADO.km = null; FRETE_ESTADO.valor = null; FRETE_ESTADO.fora = false;
    info.textContent = 'Não foi possível calcular a distância. Usando taxa fixa de ' + paraMoeda(TAXA_ENTREGA) + '.';
  }
  atualizarTotaisPagamento();
}

// cria o bloco "Forma de entrega" na página de pagamento
function montarBlocoEntrega() {
  const primeiro = qs('.coluna-formulario-pagamento .bloco-pagamento');
  if (!primeiro) return;
  const bloco = document.createElement('div');
  bloco.className = 'bloco-pagamento';
  bloco.innerHTML = `
    <h3><span class="numero-bloco">🚚</span> Forma de entrega</h3>
    <div class="opcoes-entrega">
      <label class="opcao-entrega selecionada" data-modo="moto">
        <input type="radio" name="modo-entrega" value="moto" checked />
        <span class="icone">🛵</span><strong>Moto</strong><small>Taxa normal</small></label>
      <label class="opcao-entrega" data-modo="bicicleta">
        <input type="radio" name="modo-entrega" value="bicicleta" />
        <span class="icone">🚲</span><strong>Bicicleta</strong><small>5% de cashback 🌱</small></label>
    </div>
    <button type="button" class="botao botao-secundario" id="fw-calcular-frete">📍 Calcular frete</button>
    <p class="dica-campo" id="fw-info-frete">Informe o CEP e o número para calcular o frete pela distância.</p>`;
  primeiro.after(bloco);

  bloco.querySelectorAll('input').forEach(function (i) {
    i.addEventListener('change', function () { selecionarModo(i.value); });
  });
  qs('#fw-calcular-frete').addEventListener('click', calcularFrete);
  ['#cep', '#numero-casa'].forEach(function (sel) {
    const el = qs(sel); if (el) el.addEventListener('change', calcularFrete);
  });

  // preenche com o endereço salvo na conta, se houver
  const u = obterSessao();
  if (u && u.endereco) {
    [['cep', 'cep'], ['numero-casa', 'numero'], ['endereco', 'rua'], ['complemento', 'complemento']].forEach(function (par) {
      const el = qs('#' + par[0]);
      if (el && !el.value) el.value = u.endereco[par[1]] || '';
    });
    if ((qs('#cep').value || '').replace(/\D/g, '').length === 8) calcularFrete();
  }
}

/* ---------- 7. TOTAIS DO PAGAMENTO ----------
   Esta função TEM O MESMO NOME da original do script.js e a substitui:
   agora usa o frete por distância e mostra o cashback da bicicleta. */
function atualizarTotaisPagamento() {
  const subtotal = subtotalCarrinho();
  const frete = subtotal > 0 ? (FRETE_ESTADO.valor !== null ? FRETE_ESTADO.valor : TAXA_ENTREGA) : 0;
  const desconto = (CUPOM_APLICADO && subtotal > 0) ? subtotal * 0.10 : 0;
  const total = Math.max(subtotal + frete - desconto, 0);
  const cashback = (FRETE_ESTADO.modo === 'bicicleta' && subtotal > 0) ? subtotal * FW.bicicleta.cashback : 0;

  const set = function (id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('valor-subtotal', paraMoeda(subtotal));
  set('valor-taxa', paraMoeda(frete));
  set('valor-total-final', paraMoeda(total));

  const linhaDesconto = document.getElementById('linha-desconto');
  if (linhaDesconto) {
    if (desconto > 0) {
      linhaDesconto.querySelector('span:last-child').textContent = '- ' + paraMoeda(desconto);
      linhaDesconto.style.display = 'flex';
    } else linhaDesconto.style.display = 'none';
  }

  // linha de cashback (criada na primeira vez)
  const final = qs('.total-final');
  if (final) {
    let l = qs('#fw-linha-cashback');
    if (!l) {
      l = document.createElement('div');
      l.id = 'fw-linha-cashback';
      l.className = 'linha-total';
      l.innerHTML = '<span>🌱 Cashback (bicicleta 5%)</span><span></span>';
      final.before(l);
    }
    l.style.display = cashback > 0 ? 'flex' : 'none';
    l.querySelector('span:last-child').textContent = '+ ' + paraMoeda(cashback);
  }
  atualizarAvisoGastos(total);
}

/* ---------- 8. FINALIZAR PEDIDO ----------
   O script.js salva o pedido. Aqui só COMPLEMENTAMOS com entrega, frete,
   cashback, gastos, notificação e e-mail. */
document.addEventListener('submit', function (ev) {
  if (ev.target.id !== 'form-pagamento' || subtotalCarrinho() <= 0) return;

  if (FRETE_ESTADO.fora) { // bloqueia endereço fora da área
    ev.preventDefault(); ev.stopPropagation();
    alert('Esse endereço está fora da nossa área de entrega.');
    return;
  }
  const totalAtual = paraNumero((qs('#valor-total-final') || {}).textContent);
  const st = statusLimite(totalAtual);
  if (st && st.pct > 1 && !confirm('Este pedido ultrapassa o seu limite de gastos. Deseja continuar mesmo assim?')) {
    ev.preventDefault(); ev.stopPropagation();
    return;
  }
  pedirPermissaoNotificacao();
  setTimeout(finalizarExtras, 50); // roda depois do script.js ter salvo o pedido
}, true);

function finalizarExtras() {
  const p = lerJSON(CHAVE_ULTIMO_PEDIDO, null);
  if (!p || p.entrega || Date.now() - new Date(p.dataHora).getTime() > 5000) return;

  const subtotal = p.itens.reduce(function (t, i) { return t + i.preco * i.quantidade; }, 0);
  p.entrega = {
    modo: FRETE_ESTADO.modo, km: FRETE_ESTADO.km,
    frete: FRETE_ESTADO.valor !== null ? FRETE_ESTADO.valor : TAXA_ENTREGA,
    etaMin: etaMin(FRETE_ESTADO.modo, FRETE_ESTADO.km)
  };
  p.cashback = FRETE_ESTADO.modo === 'bicicleta' ? parseFloat((subtotal * FW.bicicleta.cashback).toFixed(2)) : 0;
  p.valorTotal = paraNumero(p.total);
  p.etapaNotificada = 0;
  gravarJSON(CHAVE_ULTIMO_PEDIDO, p);

  const kg = chaveUsuario('foodwise_gastos'), hist = lerJSON(kg, []);
  hist.push({ ts: Date.now(), valor: p.valorTotal, numero: p.numero });
  gravarJSON(kg, hist);

  notificar(ETAPAS[0], 'Pedido #' + p.numero + ' • ' + p.total);
  enviarEmail('FoodWise • ' + ETAPAS[0] + ' (#' + p.numero + ')', textoEmail(p, 0), p);

  const lim = statusLimite(0);
  if (lim && lim.pct >= 1) notificar('Limite de gastos atingido', 'Você passou do seu limite ' + (lim.lim.periodo === 'semana' ? 'semanal' : 'mensal') + '.');
  else if (lim && lim.pct >= FW.limiteAlerta) notificar('Perto do limite', 'Você já usou ' + Math.round(lim.pct * 100) + '% do seu limite de gastos.');
}

function textoEmail(p, i) {
  const itens = p.itens.map(function (x) { return x.quantidade + 'x ' + x.nome; }).join(', ');
  return MENSAGENS[i] + '\n\nPedido #' + p.numero + '\nItens: ' + itens + '\nTotal: ' + p.total +
    '\nEntrega: ' + (p.entrega && p.entrega.modo === 'bicicleta' ? 'bicicleta' : 'moto');
}

/* ---------- 9. ACOMPANHAMENTO DO PEDIDO ----------
   A etapa é calculada pelo TEMPO decorrido desde a compra. Funciona em
   qualquer página enquanto o site estiver aberto. */
function etapaAtual(p) {
  const m = (Date.now() - new Date(p.dataHora).getTime()) / FW.msPorMinuto;
  if (m >= FW.preparoMin + p.entrega.etaMin) return 3;
  if (m >= FW.preparoMin) return 2;
  if (m >= 0.5) return 1;
  return 0;
}

function verificarPedido() {
  const p = lerJSON(CHAVE_ULTIMO_PEDIDO, null);
  if (!p || !p.entrega) return;
  const e = etapaAtual(p);
  if (e > (p.etapaNotificada || 0)) {
    p.etapaNotificada = e;
    notificar(ETAPAS[e], 'Pedido #' + p.numero);
    enviarEmail('FoodWise • ' + ETAPAS[e] + ' (#' + p.numero + ')', textoEmail(p, e), p);
    if (e === 3 && p.cashback > 0 && !p.cashbackCreditado) { // credita o cashback na entrega
      const kc = 'foodwise_cashback_' + p.usuarioId;
      gravarJSON(kc, (lerJSON(kc, 0) || 0) + p.cashback);
      p.cashbackCreditado = true;
      mostrarToast('🌱 Você ganhou ' + paraMoeda(p.cashback) + ' de cashback!');
    }
    gravarJSON(CHAVE_ULTIMO_PEDIDO, p);
  }
  atualizarTelaAcompanhamento(p, e);
}

function atualizarTelaAcompanhamento(p, e) {
  const linha = qs('.linha-do-tempo');
  if (!linha) return;
  const etapas = document.querySelectorAll('.etapa-pedido');
  const t0 = new Date(p.dataHora).getTime();
  const inicio = [0, 0.5, FW.preparoMin, FW.preparoMin + p.entrega.etaMin];
  const hora = function (i) {
    return new Date(t0 + inicio[i] * FW.msPorMinuto).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const icones = ['✅', '👨‍🍳', p.entrega.modo === 'bicicleta' ? '🚲' : '🛵', '🏠'];

  etapas.forEach(function (el, i) {
    const feita = i < e || (i === e && e === 3);
    el.classList.toggle('concluida', feita);
    el.classList.toggle('atual', i === e && e < 3);
    el.querySelector('.circulo').textContent = feita ? '✓' : icones[i];
    el.querySelector('span').textContent = i <= e ? hora(i) : 'Previsão ' + hora(i);
  });
  const barra = qs('.linha-do-tempo .progresso');
  if (barra) barra.style.width = (e / 3 * 100) + '%';

  const selo = qs('.selo-status');
  if (selo) selo.textContent = ['Pedido confirmado', 'Em preparo', 'Em rota de entrega', 'Entregue ✓'][e];
  const prev = qs('.status-pedido-topo p');
  if (prev) prev.textContent = e < 3 ? 'Previsão de entrega: hoje, às ' + hora(3) : 'Entregue hoje, às ' + hora(3);
  const info = qs('.cartao-entregador > div:nth-child(2) span');
  if (info) info.textContent = p.entrega.modo === 'bicicleta' ? 'Bicicleta • entrega sustentável 🌱' : 'Motocicleta • Placa FWX-2025';
}

// botão para ativar notificações + linhas de frete/cashback nos detalhes
function montarTelaAcompanhamento() {
  const topo = qs('.status-pedido-topo');
  if (topo && 'Notification' in window && Notification.permission !== 'granted') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'botao botao-secundario';
    b.style.marginBottom = '1.5rem';
    b.textContent = '🔔 Ativar notificações do pedido';
    b.addEventListener('click', function () {
      Notification.requestPermission().then(function () { b.remove(); });
    });
    topo.after(b);
  }
  const p = lerJSON(CHAVE_ULTIMO_PEDIDO, null);
  const det = qs('#detalhes-ultimo-pedido');
  if (!det || !p || !p.entrega) return;
  const final = qs('.total-final', det);
  const add = function (a, b) {
    const l = document.createElement('div');
    l.className = 'linha-total';
    l.innerHTML = '<span>' + a + '</span><span>' + b + '</span>';
    final ? det.insertBefore(l, final) : det.appendChild(l);
  };
  add('Entrega (' + (p.entrega.modo === 'bicicleta' ? 'bicicleta' : 'moto') + (p.entrega.km ? ', ' + p.entrega.km + ' km' : '') + ')', paraMoeda(p.entrega.frete));
  if (p.cashback > 0) add('🌱 Cashback a receber', paraMoeda(p.cashback));
}

/* ---------- 10. MODAL DO PRATO ---------- */
// Se o prato não tiver valores reais no banco, estima pelos kcal e pelo tipo.
// Para valores reais, adicione ao JSON: proteinas, carboidratos, gorduras, fibras, sodio.
function nutricao(p) {
  if (p.proteinas != null && p.carboidratos != null && p.gorduras != null) {
    return { estimado: false, prot: p.proteinas, carb: p.carboidratos, gord: p.gorduras, fibras: p.fibras, sodio: p.sodio };
  }
  const s = p.selo || '', k = p.calorias || 0;
  let r = [20, 50, 30]; // % das calorias: proteína, carboidrato, gordura
  if (/Alta prote/.test(s)) r = [35, 35, 30];
  else if (p.categoria === 'bebidas') r = [4, 90, 6];
  else if (p.categoria === 'fast-food') r = [15, 45, 40];
  else if (/Low carb/.test(s)) r = [30, 15, 55];
  else if (/Vegano|Vegetariano|Sem gl/.test(s)) r = [18, 52, 30];
  return { estimado: true, prot: Math.round(k * r[0] / 400), carb: Math.round(k * r[1] / 400), gord: Math.round(k * r[2] / 900) };
}

// para qual objetivo o prato é mais indicado (ou use o campo "indicado" no JSON)
function indicadoPara(p) {
  if (Array.isArray(p.indicado) && p.indicado.length) return p.indicado;
  if (p.categoria === 'fast-food') return [];
  const k = p.calorias || 0, s = p.selo || '', out = [];
  if (k <= 350 || /Low carb|Detox/.test(s)) out.push('emagrecimento');
  if (/Alta prote/.test(s) && k >= 300) out.push('ganho-de-massa');
  if (/Alta prote/.test(s) || p.categoria === 'fitness') out.push('performance');
  if (k <= 500) out.push('alimentacao-equilibrada');
  return out;
}

function abrirModalPrato(p) {
  const n = nutricao(p), ind = indicadoPara(p), u = obterSessao();
  const tags = ind.length
    ? ind.map(function (o) {
        return '<span' + (u && u.objetivo === o ? ' class="destaque"' : '') + '>' + (u && u.objetivo === o ? '⭐ ' : '') + (ROTULOS_OBJETIVO[o] || o) + '</span>';
      }).join('')
    : '<span>Consumo ocasional</span>';
  qs('#fw-modal-conteudo').innerHTML = `
    <img class="fw-modal-img" src="${p.imagem}" alt="${p.nome}" />
    <div class="fw-modal-corpo">
      <span class="selo-status">${p.selo}</span>
      <h2 style="margin:.6rem 0 .2rem">${p.nome}</h2>
      <p>${p.descricao}</p>
      <p><strong>${paraMoeda(p.preco)}</strong> • ★ ${p.avaliacao}</p>
      <h3 style="margin-top:1rem">Informações nutricionais</h3>
      <table class="fw-tabela">
        <tr><td>Calorias</td><td>${p.calorias} kcal</td></tr>
        <tr><td>Proteínas</td><td>${n.estimado ? '≈ ' : ''}${n.prot} g</td></tr>
        <tr><td>Carboidratos</td><td>${n.estimado ? '≈ ' : ''}${n.carb} g</td></tr>
        <tr><td>Gorduras</td><td>${n.estimado ? '≈ ' : ''}${n.gord} g</td></tr>
        ${n.fibras != null ? '<tr><td>Fibras</td><td>' + n.fibras + ' g</td></tr>' : ''}
        ${n.sodio != null ? '<tr><td>Sódio</td><td>' + n.sodio + ' mg</td></tr>' : ''}
      </table>
      ${n.estimado ? '<p class="fw-nota">Valores aproximados, estimados a partir das calorias.</p>' : ''}
      <h3>Mais indicado para</h3>
      <div class="fw-tags">${tags}</div>
      <button type="button" class="botao botao-primario botao-bloco" id="fw-modal-add">+ Adicionar ao carrinho</button>
    </div>`;
  qs('#fw-modal-add').addEventListener('click', function () {
    adicionarAoCarrinho(p);
    this.textContent = '✓ Adicionado!';
  });
  qs('#fw-modal').classList.add('aberto');
}

function montarModalPrato() {
  const grade = qs('#grade-cardapio');
  if (!grade) return;
  const modal = document.createElement('div');
  modal.id = 'fw-modal';
  modal.className = 'fw-modal';
  modal.innerHTML = '<div class="fw-modal-caixa" role="dialog" aria-modal="true"><button type="button" class="fw-modal-fechar" aria-label="Fechar">✕</button><div id="fw-modal-conteudo"></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal || e.target.closest('.fw-modal-fechar')) modal.classList.remove('aberto');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.classList.remove('aberto'); });
  // clique em qualquer cartão (menos no botão +) abre o modal
  grade.addEventListener('click', function (e) {
    if (e.target.closest('.botao-adicionar')) return;
    const card = e.target.closest('.cartao-prato');
    if (!card) return;
    const prato = CARDAPIO_COMPLETO.find(function (x) { return x.nome === card.dataset.nome; });
    if (prato) abrirModalPrato(prato);
  });
}

/* ---------- 11. INICIALIZAÇÃO ---------- */
document.addEventListener('DOMContentLoaded', function () {
  injetarEstilos();
  aplicarLogo();
  montarModalPrato();        // cardapio.html
  montarBlocoEntrega();      // pagamento.html
  montarConfigLimite();      // minha-conta.html
  montarTelaAcompanhamento();// acompanharpedido.html
  verificarPedido();
  setInterval(verificarPedido, 2000); // confere a etapa do pedido a cada 2 s
});
