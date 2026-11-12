/* ==========================================================================
   FOODWISE — UTILITÁRIOS (js/util.js)
   Funções pequenas usadas por todos os outros arquivos: armazenamento,
   moeda, avisos, notificações, e-mail, formulários, janelas e mapas.
   ========================================================================== */

/* ---------- 1. Atalhos para encontrar elementos ---------- */
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => Array.from(raiz.querySelectorAll(seletor));
const PAGINA_ATUAL = location.pathname.split('/').pop() || 'index.html';

/* ---------- 2. Nomes dos dados guardados no navegador ---------- */
const CHAVES = {
  carrinho: 'foodwise_carrinho',
  usuarios: 'foodwise_usuarios',
  sessao: 'foodwise_sessao',
  pedidos: 'foodwise_pedidos',
  cardapio: 'foodwise_cardapio_cache'
};

/* ---------- 3. Ler e gravar dados (localStorage) ---------- */
function lerJSON(chave, padrao) {
  try {
    const texto = localStorage.getItem(chave);
    return texto ? JSON.parse(texto) : padrao;
  } catch (erro) {
    return padrao;
  }
}

function gravarJSON(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (erro) {
    return false;
  }
}

/* ---------- 4. Moeda, texto seguro e pausas ---------- */
function paraMoeda(valor) {
  const numero = Number(valor);
  return (isNaN(numero) ? 0 : numero).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Impede que texto digitado pelo usuário vire código HTML
function esc(texto) {
  const trocas = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto ?? '').replace(/[&<>"']/g, (c) => trocas[c]);
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const arredondar = (n) => Math.round(n * 100) / 100;

/* ---------- 5. Imagem reserva (quando uma foto não carrega) ---------- */
const IMG_PADRAO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#EDEDE6"/><text x="200" y="170" font-size="64" text-anchor="middle">🥗</text></svg>'
);

function tratarImagens(raiz = document) {
  $$('img[data-fallback]', raiz).forEach((img) => {
    const trocar = () => { img.src = IMG_PADRAO; };
    img.addEventListener('error', trocar, { once: true });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) trocar();
  });
}

/* ---------- 6. Avisos na tela (toasts) ---------- */
function mostrarToast(texto, tipo = 'info') {
  let area = $('#toasts');
  if (!area) {
    area = document.createElement('div');
    area.id = 'toasts';
    area.setAttribute('aria-live', 'polite');
    document.body.appendChild(area);
  }
  const aviso = document.createElement('div');
  aviso.className = 'toast toast-' + tipo;
  aviso.textContent = texto;
  area.appendChild(aviso);
  setTimeout(() => aviso.classList.add('saindo'), 5200);
  setTimeout(() => aviso.remove(), 5700);
}

/* ---------- 7. Notificações do sistema ---------- */
async function pedirPermissaoNotificacao() {
  if (!('Notification' in window)) return 'indisponivel';
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission(); } catch (erro) { return 'default'; }
  }
  return Notification.permission;
}

// Mostra o aviso na tela e, se o usuário permitiu, também no sistema
async function notificar(titulo, corpo) {
  mostrarToast(titulo + ' — ' + corpo);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opcoes = { body: corpo, icon: 'icones/icone-192.png', badge: 'icones/icone-192.png' };
  try {
    const registro = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (registro) registro.showNotification(titulo, opcoes);
    else new Notification(titulo, opcoes);
  } catch (erro) { /* sem permissão ou suporte: o aviso na tela já foi mostrado */ }
}

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ---------- 8. E-mail para o cliente (EmailJS, opcional) ---------- */
async function enviarEmailPedido(usuario, assunto, mensagem, pedido) {
  const c = CONFIG.emailjs;
  if (!c.serviceId || !c.templateId || !c.publicKey || !usuario) return false;
  try {
    const resposta = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: c.serviceId,
        template_id: c.templateId,
        user_id: c.publicKey,
        template_params: {
          to_email: usuario.email,
          to_name: usuario.nome,
          assunto: assunto,
          mensagem: mensagem,
          pedido_numero: pedido.id,
          total: paraMoeda(pedido.total)
        }
      })
    });
    return resposta.ok;
  } catch (erro) {
    return false;
  }
}

/* ---------- 9. Validação e máscaras de formulários ---------- */
function mostrarErro(campo, mensagem) {
  const grupo = campo.closest('.campo');
  const alvo = grupo ? $('.mensagem-erro', grupo) : null;
  if (alvo) alvo.textContent = mensagem;
  campo.classList.toggle('invalido', Boolean(mensagem));
}

function validarFormulario(form) {
  let valido = true;
  $$('input[required], select[required], textarea[required]', form).forEach((campo) => {
    if (campo.disabled) return;
    if (campo.type === 'checkbox') {
      if (!campo.checked) valido = false;
      return;
    }
    const valor = campo.value.trim();
    let erro = '';
    if (!valor) erro = 'Este campo é obrigatório.';
    else if (campo.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) erro = 'Digite um e-mail válido.';
    else if (campo.type === 'password' && valor.length < 6) erro = 'A senha precisa ter ao menos 6 caracteres.';
    mostrarErro(campo, erro);
    if (erro) valido = false;
  });
  return valido;
}

const MASCARAS = {
  telefone: (texto) => {
    const v = texto.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    return v ? '(' + v : '';
  },
  cep: (texto) => texto.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{1,3})/, '$1-$2'),
  cartao: (texto) => texto.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '),
  validade: (texto) => {
    const v = texto.replace(/\D/g, '').slice(0, 4);
    return v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
  }
};

function aplicarMascara(campo, tipo) {
  if (!campo) return;
  campo.addEventListener('input', () => { campo.value = MASCARAS[tipo](campo.value); });
}

/* ---------- 10. Janelas (modais) ---------- */
function criarModal(id, classeExtra = '') {
  let modal = document.getElementById(id);
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = id;
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-caixa ${classeExtra}">
      <button type="button" class="modal-fechar" aria-label="Fechar">✕</button>
      <div class="modal-conteudo"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal || evento.target.closest('.modal-fechar')) fecharModal(modal);
  });
  return modal;
}

function abrirModal(modal, html) {
  $('.modal-conteudo', modal).innerHTML = html;
  modal.classList.add('aberto');
  document.body.classList.add('modal-aberto');
}

function fecharModal(modal) {
  modal.classList.remove('aberto');
  document.body.classList.remove('modal-aberto');
}

document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') $$('.modal.aberto').forEach(fecharModal);
});

/* ---------- 11. Mapas e distâncias ---------- */
// Distância em linha reta entre dois pontos (fórmula de Haversine)
function distanciaKm(a, b) {
  const R = 6371;
  const rad = (graus) => (graus * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// CEP -> endereço (serviço gratuito ViaCEP)
async function buscarCep(cep) {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const dados = await resposta.json();
  return dados.erro ? null : dados;
}

// Endereço (texto) -> coordenadas (OpenStreetMap / Nominatim)
async function geocodificar(consulta) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' + encodeURIComponent(consulta);
  const resposta = await fetch(url);
  const dados = await resposta.json();
  return dados.length ? { lat: parseFloat(dados[0].lat), lng: parseFloat(dados[0].lon) } : null;
}

// Rota real pelas ruas (OSRM). Se falhar, usa linha reta x 1,3
async function obterRota(origem, destino) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
  try {
    const resposta = await fetch(url);
    const dados = await resposta.json();
    if (dados.code === 'Ok' && dados.routes.length) {
      const rota = dados.routes[0];
      return { km: rota.distance / 1000, pontos: rota.geometry.coordinates.map(([lng, lat]) => [lat, lng]), real: true };
    }
  } catch (erro) { /* usa o plano B abaixo */ }
  return {
    km: distanciaKm(origem, destino) * 1.3,
    pontos: [[origem.lat, origem.lng], [destino.lat, destino.lng]],
    real: false
  };
}

// Reduz a quantidade de pontos da rota para caber no armazenamento
function simplificarRota(pontos, maximo = 120) {
  const arredondado = (p) => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))];
  if (pontos.length <= maximo) return pontos.map(arredondado);
  const passo = (pontos.length - 1) / (maximo - 1);
  const resultado = [];
  for (let i = 0; i < maximo; i++) resultado.push(arredondado(pontos[Math.round(i * passo)]));
  return resultado;
}

// Posição do entregador na rota. fracao vai de 0 (saída) a 1 (destino)
function posicaoNaRota(pontos, fracao) {
  if (!pontos || pontos.length === 0) return null;
  if (pontos.length === 1 || fracao <= 0) return { ponto: pontos[0], indice: 1 };
  if (fracao >= 1) return { ponto: pontos[pontos.length - 1], indice: pontos.length };
  const acumulado = [0];
  for (let i = 1; i < pontos.length; i++) {
    const trecho = distanciaKm({ lat: pontos[i - 1][0], lng: pontos[i - 1][1] }, { lat: pontos[i][0], lng: pontos[i][1] });
    acumulado.push(acumulado[i - 1] + trecho);
  }
  const alvo = acumulado[acumulado.length - 1] * fracao;
  let i = 1;
  while (i < acumulado.length - 1 && acumulado[i] < alvo) i++;
  const tamanho = acumulado[i] - acumulado[i - 1] || 1;
  const t = (alvo - acumulado[i - 1]) / tamanho;
  return {
    ponto: [
      pontos[i - 1][0] + (pontos[i][0] - pontos[i - 1][0]) * t,
      pontos[i - 1][1] + (pontos[i][1] - pontos[i - 1][1]) * t
    ],
    indice: i
  };
}
