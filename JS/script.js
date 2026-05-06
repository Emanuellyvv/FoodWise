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

    if (btnPlano) {
        btnPlano.addEventListener('click', (e) => {
            console.log("Montando seu plano...");
            // Aqui você pode adicionar a lógica para montar o plano ou redirecionar para outra página
            // window.location.href = "pagina-do-plano.html"; // exemplo de redirecionamento
        });
    }
});
