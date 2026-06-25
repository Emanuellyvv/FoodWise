// Função para avançar da Etapa 1 para a Etapa 2 no Cadastro
function proximaEtapa() {
    const nome = document.getElementById('nome').value;
    const idade = document.getElementById('idade').value;
    const orcamento = document.getElementById('orcamento').value;

    // Validação estrita manual para impedir avançar em branco
    if (!nome || !idade || !orcamento) {
        alert("Por favor, preencha todos os campos da primeira etapa.");
        return;
    }

    // Alternar visualização dos blocos
    document.getElementById('etapa1').style.display = 'none';
    document.getElementById('etapa2').style.display = 'block';

    // Atualizar os círculos indicadores de progresso
    document.getElementById('step-dot-1').classList.remove('active');
    document.getElementById('step-dot-2').classList.add('active');
}

// Função para retornar para a Etapa 1
function etapaAnterior() {
    document.getElementById('etapa1').style.display = 'block';
    document.getElementById('etapa2').style.display = 'none';

    document.getElementById('step-dot-1').classList.add('active');
    document.getElementById('step-dot-2').classList.remove('active');
}

// Manipulação do Envio do Formulário (Submissão)
function salvarCadastro(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const estilo = document.getElementById('estiloVida').value;

    if (!email || senha.length < 6) {
        alert("Introduza um e-mail válido e uma senha com pelo menos 6 caracteres.");
        return;
    }

    // Armazenamento local simulando persistência de dados para o protótipo do TCC
    localStorage.setItem('user_estilo', estilo);
    localStorage.setItem('user_orcamento', document.getElementById('orcamento').value);
    
    alert('Conta criada com sucesso! Redirecionando para o seu cardápio personalizado...');
    window.location.href = 'cardapio.html';
}

// Menu sanduíche responsivo global
function toggleMenu() {
    const links = document.querySelector('.nav-links');
    if (links.style.display === 'flex') {
        links.style.display = 'none';
    } else {
        links.style.display = 'flex';
        links.style.flexDirection = 'column';
    }
}
