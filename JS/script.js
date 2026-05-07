// script.js

// Espera o DOM estar completamente carregado
document.addEventListener("DOMContentLoaded", function() {
    // Logica para a página de cadastro
    const formulario = document.getElementById("meuFormulario");

 function showExperiencePage(event) {
    event.preventDefault(); // Impede o envio do formulário
    const form = document.getElementById("meuFormulario");

    // Verifica os dados do formulário e redireciona
    const nome = document.getElementById("nome").value;
    if (nome.length < 3) {
        alert("Por favor, digite seu nome completo.");
        return;
    }

    // Se tudo está certo, redireciona para a página de experiência
    window.location.href = "pagina2.html"; // Redireciona para a página de experiência
}

function submitForm(event) {
    event.preventDefault(); // Previne o envio do formulário

    // Aqui você pode realizar outras ações como validação e envio de dados
    alert("Formulário enviado com sucesso!"); 
    // Redirecione ou processe conforme necessário
}
}
