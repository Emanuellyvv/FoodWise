document.addEventListener('DOMContentLoaded', function() {
    const btnCadastrar = document.querySelector('.btn-cadastro');
    const btnPlano = document.querySelector('.btn-plano');

    if (btnCadastrar) {
        btnCadastrar.addEventListener('click', (e) => {
            console.log("Navegando para a página de cadastro...");
            // Aqui, você pode redirecionar ou realizar outras ações referentes ao cadastro.
            window.location.href = "form.html"; // exemplo de redirecionamento
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
    // Seleciona o formulário de cadastro
    const formulario = document.getElementById('meuFormulario');

    if (formulario) {
        formulario.addEventListener('submit', function(event) {
            // 1. Impede o comportamento padrão (recarregar a página)
            event.preventDefault();

            // 2. Captura os valores dos campos
            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email').value;
            const telefone = document.getElementById('telefone').value;

            // 3. Validação simples
            if (nome.length < 3) {
                alert("Por favor, digite seu nome completo.");
                return;
            }

            if (email === "") {
                alert("O campo e-mail é obrigatório.");
                return;
            }

            // 4. Feedback para o usuário
            console.log("Dados capturados:", { nome, email, telefone });
            alert("Sucesso! Vamos para a próxima etapa, " + nome);

            // 5. Redirecionamento (Simulando o "Próximo")
            // window.location.href = "menu.html"; // Descomente e coloque o caminho correto aqui.
        });
    }

    // Lógica para formatar a data automaticamente (Opcional, mas profissional)
    const campoData = document.getElementById('nascimento');
    if (campoData) {
        campoData.addEventListener('keypress', () => {
            let inputLength = campoData.value.length;
            if (inputLength === 2 || inputLength === 5) {
                campoData.value += '/'; // Adiciona as barras da data automaticamente
            }
        });
    }
});
