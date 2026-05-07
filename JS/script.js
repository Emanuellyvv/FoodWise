function showExperiencePage(event) {
    event.preventDefault(); // Impede que o formulário seja enviado normalmente

    const nome = document.getElementById("nome").value;
    const nascimento = document.getElementById("nascimento").value;
    const telefone = document.getElementById("telefone").value;
    const endereco = document.getElementById("endereco").value;
    const email = document.getElementById("email").value;

    // Validação simples
    if (nome.length < 3) {
        alert("Por favor, digite seu nome completo.");
        return;
    }

    // Se tudo estiver certo, redireciona para a página de experiência
    window.location.href = "pagina2.html"; // Redireciona para a página de experiência
}

function submitForm(event) {
    event.preventDefault(); // Previne o envio do formulário

    // Aqui você pode processar os dados do formulário e salvá-los conforme necessário
    const objetivo = document.getElementById("objetivo").value;
    alert("Formulário enviado com sucesso! Seu objetivo é: " + objetivo);
}
