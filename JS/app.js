// Avançar no Cadastro
function proximaEtapa() {
    const idade = document.getElementById('idade').value;
    const cpf = document.getElementById('cpf').value;
    const tel = document.getElementById('telefone').value;

    if (!idade || !cpf || !tel) {
        alert("Por favor, preencha os dados obrigatórios da Etapa 1.");
        return;
    }

    document.getElementById('etapa1').style.display = 'none';
    document.getElementById('etapa2').style.display = 'block';

    document.getElementById('step-dot-1').classList.remove('active');
    document.getElementById('step-dot-2').classList.add('active');
}

// Voltar no Cadastro
function etapaAnterior() {
    document.getElementById('etapa1').style.display = 'block';
    document.getElementById('etapa2').style.display = 'none';

    document.getElementById('step-dot-1').classList.add('active');
    document.getElementById('step-dot-2').classList.remove('active');
}

// Submeter o Formulário Unificado
function salvarCadastro(event) {
    event.preventDefault();
    const estilo = document.getElementById('estiloVida').value;
    const email = document.getElementById('email').value;

    if (!estilo || !email) {
        alert("Preencha as informações do seu perfil alimentar.");
        return;
    }

    alert("Cadastro processado com sucesso!");
    window.location.href = "cardapio.html";
}

// Alternar Menu Mobile (Sanduíche)
function toggleMenu() {
    const menu = document.getElementById('mobile-menu');
    if(menu) {
        const isHidden = menu.getAttribute('aria-hidden') === 'true';
        menu.setAttribute('aria-hidden', !isHidden);
        menu.style.display = isHidden ? 'block' : 'none';
    }
}
