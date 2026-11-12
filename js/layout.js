/* ==========================================================================
   FOODWISE — LAYOUT COMUM (js/layout.js)
   Monta cabeçalho, rodapé e menu inferior em TODAS as páginas e cuida do
   que é comum a elas: menu mobile, FAQ, fotos da equipe e SAC (e-mail).
   ========================================================================== */

/* ---------- Logo: prato visto de cima com um broto no centro ---------- */
const LOGO_SVG = `
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="FoodWise">
    <circle cx="24" cy="24" r="23" fill="#1E3309"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="#FFF8F6" stroke-width="1.6"/>
    <path d="M24 35V23" stroke="#FFF8F6" stroke-width="2" stroke-linecap="round"/>
    <path d="M24 24C24 17 19 13 12.5 13.5C12.5 20 17 24.5 24 24Z" fill="#849A28"/>
    <path d="M24 28C24 21.5 28.5 17.5 35 18C35 24.5 30.5 29 24 28Z" fill="#E23260"/>
  </svg>`;

const HTML_LOGO = `
  <a href="index.html" class="logo" aria-label="FoodWise — página inicial">
    ${LOGO_SVG}<strong class="logo-texto">Food<em>Wise</em></strong>
  </a>`;

/* ---------- Cabeçalho ---------- */
function htmlCabecalho() {
  const ativo = (pagina) => (PAGINA_ATUAL === pagina ? ' class="ativo"' : '');
  return `
  <header class="cabecalho">
    <div class="container">
      ${HTML_LOGO}
      <nav class="nav-principal" aria-label="Menu principal">
        <ul class="nav-links">
          <li><a href="index.html#diferenciais">Diferenciais</a></li>
          <li><a href="index.html#sobre">Sobre</a></li>
          <li><a href="index.html#equipe">Equipe</a></li>
          <li><a href="index.html#como-funciona">Como funciona</a></li>
          <li><a href="index.html#faq">FAQ</a></li>
          <li><a href="index.html#contato">Contato</a></li>
          <li><a href="cardapio.html"${ativo('cardapio.html')}>Cardápio</a></li>
        </ul>
        <div class="nav-acoes"></div>
      </nav>
      <button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;
}

/* ---------- Rodapé ---------- */
function htmlRodape() {
  return `
  <footer class="rodape">
    <div class="container">
      <div class="grade-rodape">
        <div class="rodape-marca">
          ${HTML_LOGO}
          <p>Alimentação saudável, entrega sustentável e consumo consciente em um só lugar.</p>
        </div>
        <div class="rodape-coluna">
          <h4>Plataforma</h4>
          <ul>
            <li><a href="cardapio.html">Cardápio</a></li>
            <li><a href="cadastro.html">Criar conta</a></li>
            <li><a href="login.html">Entrar</a></li>
            <li><a href="acompanharpedido.html">Acompanhar pedido</a></li>
          </ul>
        </div>
        <div class="rodape-coluna">
          <h4>Institucional</h4>
          <ul>
            <li><a href="index.html#sobre">Sobre nós</a></li>
            <li><a href="index.html#equipe">Nossa equipe</a></li>
            <li><a href="index.html#como-funciona">Como funciona</a></li>
            <li><a href="index.html#faq">FAQ</a></li>
          </ul>
        </div>
        <div class="rodape-coluna">
          <h4>Contato</h4>
          <ul>
            <li><a href="mailto:${CONFIG.emailSac}">${CONFIG.emailSac}</a></li>
            <li><a href="index.html#contato">Fale conosco (SAC)</a></li>
          </ul>
        </div>
      </div>
      <div class="rodape-base">
        <span>&copy; 2026 FoodWise. Projeto de Trabalho de Conclusão de Curso.</span>
        <span>Promovendo a sustentabilidade e um consumo mais consciente.</span>
      </div>
    </div>
  </footer>`;
}

/* ---------- Menu inferior (estilo aplicativo, só no celular) ---------- */
function htmlNavMobile() {
  return `
  <nav class="nav-mobile-inferior" aria-label="Navegação principal">
    <a href="index.html" data-pagina="index.html"><span class="icone-nav-mobile">🏠</span><span>Início</span></a>
    <a href="cardapio.html" data-pagina="cardapio.html"><span class="icone-nav-mobile">🍽️</span><span>Cardápio</span></a>
    <a href="pagamento.html" data-pagina="pagamento.html"><span class="icone-nav-mobile">🛒<span class="contador-mobile">0</span></span><span>Carrinho</span></a>
    <a href="login.html" data-pagina="conta" id="link-conta-mobile"><span class="icone-nav-mobile">👤</span><span>Conta</span></a>
  </nav>`;
}

function montarLayout() {
  const cabecalho = $('#layout-cabecalho');
  const rodape = $('#layout-rodape');
  const navMobile = $('#layout-nav-mobile');
  if (cabecalho) cabecalho.innerHTML = htmlCabecalho();
  if (rodape) rodape.innerHTML = htmlRodape();
  if (navMobile) navMobile.innerHTML = htmlNavMobile();
}

/* ---------- Menu hambúrguer e sombra do cabeçalho ---------- */
function iniciarMenu() {
  const botao = $('.menu-toggle');
  const menu = $('.nav-principal');
  const cabecalho = $('.cabecalho');

  if (botao && menu) {
    const alternar = (aberto) => {
      botao.classList.toggle('aberto', aberto);
      menu.classList.toggle('aberto', aberto);
      botao.setAttribute('aria-expanded', String(aberto));
    };
    botao.addEventListener('click', () => alternar(!menu.classList.contains('aberto')));
    $$('.nav-links a', menu).forEach((link) => link.addEventListener('click', () => alternar(false)));
  }
  if (cabecalho) {
    window.addEventListener('scroll', () => cabecalho.classList.toggle('rolou', window.scrollY > 20));
  }
}

/* ---------- Perguntas frequentes (acordeão) ---------- */
function iniciarFaq() {
  const itens = $$('.item-faq');
  itens.forEach((item) => {
    $('.pergunta-faq', item).addEventListener('click', () => {
      const estavaAberto = item.classList.contains('aberto');
      itens.forEach((outro) => outro.classList.remove('aberto'));
      if (!estavaAberto) item.classList.add('aberto');
    });
  });
}

/* ---------- Fotos da equipe: se a foto não existir, mostra o espaço reservado ---------- */
function tratarFotosEquipe() {
  $$('.foto-moldura img').forEach((img) => {
    const marcar = () => img.closest('.foto-moldura').classList.add('sem-foto');
    img.addEventListener('error', marcar, { once: true });
    if (img.complete && img.naturalWidth === 0) marcar();
  });
}

/* ---------- SAC: envia a mensagem por e-mail (FormSubmit) ---------- */
function iniciarFormularioSac() {
  const form = $('#form-contato');
  if (!form) return;
  const status = $('#status-contato');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!validarFormulario(form)) return;
    const botao = $('button[type="submit"]', form);
    botao.disabled = true;
    status.className = 'status-form';
    status.textContent = 'Enviando sua mensagem...';

    const dados = {
      name: $('#nome-contato').value.trim(),
      email: $('#email-contato').value.trim(),
      message: $('#mensagem-contato').value.trim(),
      _subject: 'FoodWise SAC — ' + $('#assunto-contato').value.trim(),
      _template: 'table',
      _captcha: 'false'
    };

    try {
      const resposta = await fetch('https://formsubmit.co/ajax/' + CONFIG.emailSac, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(dados)
      });
      if (!resposta.ok) throw new Error('Falha no envio');
      form.reset();
      status.className = 'status-form ok';
      status.textContent = '✓ Mensagem enviada! Responderemos em breve.';
    } catch (erro) {
      status.className = 'status-form erro';
      status.textContent = 'Não foi possível enviar agora. Escreva para ' + CONFIG.emailSac + '.';
    } finally {
      botao.disabled = false;
    }
  });
}

/* ---------- Início (roda assim que o arquivo é carregado) ---------- */
montarLayout();
iniciarMenu();
iniciarFaq();
tratarFotosEquipe();
iniciarFormularioSac();
registrarServiceWorker();
