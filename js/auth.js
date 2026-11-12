/* ==========================================================================
   FOODWISE — CONTAS DE USUÁRIO (js/auth.js)
   Cadastro, login, recuperação de senha e página "Minha conta".
   Os dados ficam no navegador do usuário (projeto sem servidor).
   ========================================================================== */

/* ---------- 1. Banco de usuários (localStorage) ---------- */
// Embaralha a senha para não guardá-la em texto puro (não é criptografia forte)
function ofuscarSenha(senha) {
  let hash = 0;
  const texto = String(senha) + '::foodwise-salt';
  for (let i = 0; i < texto.length; i++) {
    hash = ((hash << 5) - hash) + texto.charCodeAt(i);
    hash |= 0;
  }
  return 'fw_' + Math.abs(hash).toString(36) + '_' + texto.length;
}

function obterUsuarios() { return lerJSON(CHAVES.usuarios, []); }
function salvarUsuarios(lista) { gravarJSON(CHAVES.usuarios, lista); }

function obterUsuarioPorEmail(email) {
  const alvo = String(email || '').trim().toLowerCase();
  return obterUsuarios().find((u) => u.email.toLowerCase() === alvo) || null;
}

function definirSessao(id) { try { localStorage.setItem(CHAVES.sessao, String(id)); } catch (e) { /* ignora */ } }
function encerrarSessao() { try { localStorage.removeItem(CHAVES.sessao); } catch (e) { /* ignora */ } }

function obterSessao() {
  try {
    const id = localStorage.getItem(CHAVES.sessao);
    return id ? obterUsuarios().find((u) => String(u.id) === String(id)) || null : null;
  } catch (erro) {
    return null;
  }
}

function registrarUsuario(dados) {
  const usuarios = obterUsuarios();
  const novo = {
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
  usuarios.push(novo);
  salvarUsuarios(usuarios);
  return novo;
}

function atualizarUsuario(id, novosDados) {
  const usuarios = obterUsuarios();
  const indice = usuarios.findIndex((u) => String(u.id) === String(id));
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

// Só aceita voltar para páginas do próprio site (evita redirecionamento malicioso)
function destinoSeguro(retorno) {
  return /^[a-z0-9-]+\.html(\?[\w=&%-]*)?$/i.test(retorno || '') ? retorno : 'cardapio.html';
}

/* ---------- 2. Cabeçalho (entrar / usuário logado) e menu inferior ---------- */
function renderizarAreaSessao() {
  const area = $('.nav-acoes');
  if (!area) return;
  const usuario = obterSessao();

  if (!usuario) {
    area.innerHTML = `
      <a href="login.html" class="botao botao-secundario">Entrar</a>
      <a href="cadastro.html" class="botao botao-primario">Criar conta</a>`;
    return;
  }

  const primeiroNome = String(usuario.nome || '').trim().split(' ')[0] || 'Você';
  area.innerHTML = `
    <div class="usuario-sessao">
      <button type="button" class="botao-usuario" id="botao-usuario-logado" aria-haspopup="true" aria-expanded="false">
        <span class="avatar-usuario">${esc(usuario.avatar || '🥑')}</span>
        <span class="nome-usuario">${esc(primeiroNome)}</span>
        <span class="seta-usuario">▾</span>
      </button>
      <div class="menu-usuario" id="menu-usuario-logado">
        <a href="minha-conta.html">👤 Minha conta</a>
        <a href="acompanharpedido.html">🛵 Meus pedidos</a>
        <button type="button" id="botao-sair">🚪 Sair</button>
      </div>
    </div>`;

  const botao = $('#botao-usuario-logado');
  const menu = $('#menu-usuario-logado');
  botao.addEventListener('click', (evento) => {
    evento.stopPropagation();
    botao.setAttribute('aria-expanded', String(menu.classList.toggle('aberto')));
  });
  document.addEventListener('click', (evento) => {
    if (!menu.contains(evento.target)) {
      menu.classList.remove('aberto');
      botao.setAttribute('aria-expanded', 'false');
    }
  });
  $('#botao-sair').addEventListener('click', () => {
    encerrarSessao();
    location.href = 'index.html';
  });
}

function renderizarNavMobile() {
  const nav = $('.nav-mobile-inferior');
  if (!nav) return;
  const usuario = obterSessao();
  const paginasConta = ['login.html', 'cadastro.html', 'minha-conta.html'];

  const linkConta = $('#link-conta-mobile');
  if (linkConta) {
    linkConta.href = usuario ? 'minha-conta.html' : 'login.html';
    $('.icone-nav-mobile', linkConta).textContent = usuario ? (usuario.avatar || '👤') : '👤';
  }
  $$('a', nav).forEach((link) => {
    const alvo = link.dataset.pagina;
    link.classList.toggle('ativo', alvo === 'conta' ? paginasConta.includes(PAGINA_ATUAL) : alvo === PAGINA_ATUAL);
  });
}

/* ---------- 3. Recursos de formulário: olhinho da senha e avatar ---------- */
function habilitarToggleSenha() {
  $$('input[type="password"]').forEach((campo) => {
    if (campo.dataset.toggle) return;
    campo.dataset.toggle = 'sim';
    const envelope = document.createElement('div');
    envelope.className = 'campo-senha-wrapper';
    campo.parentNode.insertBefore(envelope, campo);
    envelope.appendChild(campo);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-mostrar-senha';
    botao.setAttribute('aria-label', 'Mostrar senha');
    botao.textContent = '👁';
    envelope.appendChild(botao);
    botao.addEventListener('click', () => {
      const visivel = campo.type === 'text';
      campo.type = visivel ? 'password' : 'text';
      botao.textContent = visivel ? '👁' : '🙈';
    });
  });
}

let avatarEscolhido = '🥑';

function marcarAvatar(avatar) {
  avatarEscolhido = avatar;
  $$('.opcao-avatar').forEach((o) => o.classList.toggle('selecionado', o.dataset.avatar === avatar));
}

function iniciarAvatar() {
  $$('.opcao-avatar').forEach((opcao) => opcao.addEventListener('click', () => marcarAvatar(opcao.dataset.avatar)));
}

/* ---------- 4. Cadastro ---------- */
function iniciarCadastro() {
  const form = $('#form-cadastro');
  if (!form) return;
  const senha = $('#senha');
  const confirmar = $('#confirmar-senha');
  const barras = $$('.forca-senha span');

  // Barrinha de força da senha
  senha.addEventListener('input', () => {
    const v = senha.value;
    let forca = 0;
    if (v.length >= 6) forca++;
    if (v.length >= 10) forca++;
    if (/[A-Z]/.test(v) && /[0-9]/.test(v)) forca++;
    if (/[^A-Za-z0-9]/.test(v)) forca++;
    const cores = ['#E23260', '#F2678E', '#FCA9AA', '#849A28'];
    barras.forEach((barra, i) => { barra.style.backgroundColor = i < forca ? cores[forca - 1] : '#EDEDE6'; });
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    let valido = validarFormulario(form);
    if (senha.value !== confirmar.value) { mostrarErro(confirmar, 'As senhas não coincidem.'); valido = false; }
    const email = $('#email-cadastro');
    if (valido && obterUsuarioPorEmail(email.value)) { mostrarErro(email, 'Já existe uma conta com este e-mail.'); valido = false; }
    if (!valido) return;

    const usuario = registrarUsuario({
      nome: $('#nome').value.trim(),
      email: email.value,
      senha: senha.value,
      telefone: $('#telefone').value,
      dataNascimento: $('#data-nascimento').value,
      objetivo: $('#objetivo').value,
      restricao: $('#restricao').value,
      avatar: avatarEscolhido,
      endereco: {
        cep: $('#cep-cadastro').value,
        rua: $('#endereco-cadastro').value.trim(),
        numero: $('#numero-cadastro').value.trim(),
        complemento: $('#complemento-cadastro').value.trim(),
        bairro: $('#bairro-cadastro').value.trim(),
        cidade: $('#cidade-cadastro').value.trim()
      }
    });
    definirSessao(usuario.id);
    location.href = destinoSeguro(new URLSearchParams(location.search).get('retorno'));
  });
}

/* ---------- 5. Login e recuperação de senha ---------- */
function iniciarLogin() {
  const form = $('#form-login');
  if (!form) return;
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!validarFormulario(form)) return;
    const email = $('#email-login');
    const senha = $('#senha-login');
    const resultado = autenticarUsuario(email.value, senha.value);
    if (!resultado.ok) {
      if (resultado.motivo === 'nao-encontrado') mostrarErro(email, 'Não encontramos uma conta com este e-mail.');
      else mostrarErro(senha, 'Senha incorreta. Tente novamente.');
      return;
    }
    definirSessao(resultado.usuario.id);
    location.href = destinoSeguro(new URLSearchParams(location.search).get('retorno'));
  });
}

function iniciarRecuperacao() {
  const botao = $('#botao-abrir-recuperacao');
  const painel = $('#painel-recuperar-senha');
  const form = $('#form-recuperar-senha');
  if (!botao || !painel || !form) return;

  botao.addEventListener('click', () => painel.classList.toggle('aberto'));
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!validarFormulario(form)) return;
    const email = $('#email-recuperar');
    const usuario = obterUsuarioPorEmail(email.value);
    if (!usuario) { mostrarErro(email, 'Não encontramos uma conta com este e-mail.'); return; }
    atualizarUsuario(usuario.id, { senha: ofuscarSenha($('#nova-senha').value) });
    form.reset();
    mostrarToast('Senha redefinida! Já pode entrar com a nova senha.');
    painel.classList.remove('aberto');
  });
}

/* ---------- 6. Minha conta ---------- */
function atualizarPainelGastos(usuario) {
  const texto = $('#status-gastos');
  const barra = $('#barra-gastos');
  if (!texto || !barra) return;
  const st = statusGastos(usuario.id, 0);
  if (!st) {
    texto.textContent = 'Nenhum limite definido.';
    barra.style.width = '0%';
    barra.className = 'barra-gastos-preench';
    return;
  }
  const periodo = st.limite.periodo === 'semana' ? 'nesta semana' : 'neste mês';
  texto.textContent = `Você gastou ${paraMoeda(st.gasto)} de ${paraMoeda(st.limite.valor)} ${periodo} (${Math.round(st.pct * 100)}%).`;
  barra.style.width = Math.min(st.pct * 100, 100) + '%';
  barra.className = 'barra-gastos-preench' + (st.pct >= 1 ? ' estourou' : st.pct >= CONFIG.limiteAlerta ? ' perto' : '');
}

function renderizarListaPedidos(usuario) {
  const lista = $('#lista-pedidos');
  if (!lista) return;
  const pedidos = obterPedidosDoUsuario(usuario.id).slice(0, 5);
  if (!pedidos.length) { lista.innerHTML = '<p class="dica-campo">Você ainda não fez pedidos.</p>'; return; }
  lista.innerHTML = pedidos.map((p) => `
    <div class="linha-pedido">
      <span>#${esc(p.id)} · ${new Date(p.criadoEm).toLocaleDateString('pt-BR')} · ${paraMoeda(p.total)}</span>
      <a href="acompanharpedido.html?pedido=${encodeURIComponent(p.id)}">${ETAPAS[etapaDoPedido(p)].titulo} →</a>
    </div>`).join('');
}

function iniciarMinhaConta() {
  const form = $('#form-minha-conta');
  const usuario = obterSessao();
  if (!form || !usuario) return;
  const e = usuario.endereco || {};
  const preencher = (id, valor) => { const campo = document.getElementById(id); if (campo) campo.value = valor || ''; };

  preencher('nome-conta', usuario.nome);
  preencher('email-conta', usuario.email);
  preencher('telefone-conta', usuario.telefone);
  preencher('data-nascimento-conta', usuario.dataNascimento);
  preencher('objetivo-conta', usuario.objetivo);
  preencher('restricao-conta', usuario.restricao);
  preencher('cep-conta', e.cep);
  preencher('numero-conta', e.numero);
  preencher('endereco-conta', e.rua);
  preencher('bairro-conta', e.bairro);
  preencher('cidade-conta', e.cidade);
  preencher('complemento-conta', e.complemento);
  marcarAvatar(usuario.avatar || '🥑');

  const limite = obterLimite(usuario.id) || { periodo: 'mes', valor: '' };
  preencher('limite-periodo', limite.periodo);
  preencher('limite-valor', limite.valor || '');
  $('#saldo-cashback').textContent = paraMoeda(obterSaldoCashback(usuario.id));
  atualizarPainelGastos(usuario);
  renderizarListaPedidos(usuario);

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!validarFormulario(form)) return;
    atualizarUsuario(usuario.id, {
      nome: $('#nome-conta').value.trim(),
      telefone: $('#telefone-conta').value,
      dataNascimento: $('#data-nascimento-conta').value,
      objetivo: $('#objetivo-conta').value,
      restricao: $('#restricao-conta').value,
      avatar: avatarEscolhido,
      endereco: {
        cep: $('#cep-conta').value,
        rua: $('#endereco-conta').value.trim(),
        numero: $('#numero-conta').value.trim(),
        complemento: $('#complemento-conta').value.trim(),
        bairro: $('#bairro-conta').value.trim(),
        cidade: $('#cidade-conta').value.trim()
      }
    });
    const valor = parseFloat($('#limite-valor').value);
    gravarLimite(usuario.id, { periodo: $('#limite-periodo').value, valor: valor > 0 ? valor : 0 });

    renderizarAreaSessao();
    renderizarNavMobile();
    atualizarPainelGastos(usuario);
    const aviso = $('#aviso-conta-salva');
    aviso.classList.add('visivel');
    setTimeout(() => aviso.classList.remove('visivel'), 3000);
  });

  $('#botao-sair-conta').addEventListener('click', () => {
    encerrarSessao();
    location.href = 'index.html';
  });
}

/* ---------- 7. Início ---------- */
function iniciarAuth() {
  renderizarAreaSessao();
  renderizarNavMobile();
  const usuario = obterSessao();

  // Quem já entrou não precisa ver login/cadastro; "Minha conta" exige login
  if (usuario && (PAGINA_ATUAL === 'login.html' || PAGINA_ATUAL === 'cadastro.html')) {
    location.replace(destinoSeguro(new URLSearchParams(location.search).get('retorno')));
    return;
  }
  if (!usuario && PAGINA_ATUAL === 'minha-conta.html') {
    location.replace('login.html?retorno=minha-conta.html');
    return;
  }

  habilitarToggleSenha();
  iniciarAvatar();
  aplicarMascara($('#telefone'), 'telefone');
  aplicarMascara($('#telefone-conta'), 'telefone');
  aplicarMascara($('#cep-cadastro'), 'cep');
  aplicarMascara($('#cep-conta'), 'cep');
  iniciarCadastro();
  iniciarLogin();
  iniciarRecuperacao();
  iniciarMinhaConta();
}

document.addEventListener('DOMContentLoaded', iniciarAuth);
