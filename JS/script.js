// script.js

// Espera o DOM estar completamente carregado
document.addEventListener("DOMContentLoaded", function() {
    // Logica para a página de cadastro
    const formulario = document.getElementById("meuFormulario");

    // Verifica se estamos na página de cadastro:
    if (formulario) {
        formulario.addEventListener("submit", function(event) {
            // Impede o comportamento padrão do formulário (recarregamento da página)
            event.preventDefault();

            // Captura os valores dos campos
            const nome = document.getElementById("nome").value;
            const nascimento = document.getElementById("nascimento").value;
            const telefone = document.getElementById("telefone").value;
            const endereco = document.getElementById("endereco").value;
            const email = document.getElementById("email").value;

            // Valida se o nome tem pelo menos 3 caracteres
            if (nome.length < 3) {
                alert("Por favor, digite seu nome completo.");
                return;
            }

            // Opcional: Adicione outras validações conforme necessário

            // Feedback ao usuário
            alert("Cadastro realizado com sucesso, " + nome + "!");
            // Aqui você pode redirecionar para outra página, se necessário
            window.location.href = "entrar.html"; // Exemplo de redirecionamento
        });
    }
});

function showExperienceSection(event) {
    event.preventDefault(); // Impede o envio do formulário
    document.getElementById('cadastro-section').classList.add('hidden'); // Oculta a seção de cadastro
    document.getElementById('experiencia-section').classList.remove('hidden'); // Exibe a seção de experiência
}

function showCadastroSection() {
    document.getElementById('experiencia-section').classList.add('hidden'); // Oculta a seção de experiência
    document.getElementById('cadastro-section').classList.remove('hidden'); // Exibe a seção de cadastro
}

function submitForm(event) {
    event.preventDefault(); // Previne o envio do formulário
    alert("Formulário enviado!"); // Aqui você pode adicionar a lógica para processar os dados do formulário
    // Redirecione ou processe conforme necessário
}
