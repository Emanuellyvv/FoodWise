document.addEventListener('DOMContentLoaded', function() {
    const btnCadastrar = document.querySelector('.btn-cadastro');
    
    if (btnCadastrar) {
        btnCadastrar.addEventListener('click', (e) => {
            console.log("Navegando para a página de cadastro...");
            // Faça o que precisar aqui (ex: navegação, validações, etc.)
        });
    }
});
