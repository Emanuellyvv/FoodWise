// Garante o mapeamento das funções no escopo global para evitar falhas de clique
window.proximaEtapa = proximaEtapa;
window.etapaAnterior = etapaAnterior;
window.exibirToast = exibirToast;

let etapaAtual = 1;

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o formulário de cadastro se estiver na página de cadastro
    const formCadastro = document.getElementById("foodwiseCadastroForm");
    if (formCadastro) {
        formCadastro.addEventListener("submit", (e) => {
            e.preventDefault();
            exibirToast("seu cadastro foi concluído!", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
        });
        mostrarEtapa(etapaAtual);
    }

    // Inicializa o formulário de login se estiver na página de login
    const formLogin = document.getElementById("foodwiseLoginForm");
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            exibirToast("Como é bom te ter de Volta", "success");
            setTimeout(() => {
                window.location.href = "cardapio.html";
            }, 2000);
        });
    }

    // Inicializa o carrossel se existir na página
    inicializarCarrossel();
});

function mostrarEtapa(etapa) {
    const etapas = document.querySelectorAll(".form-step-fieldset");
    etapas.forEach((el, index) => {
        el.style.display = (index + 1 === etapa) ? "block" : "none";
    });
    
    // Atualiza visualmente a barra de progresso se ela existir
    const passos = document.querySelectorAll(".progress-step");
    passos.forEach((p, index) => {
        if (index < etapa) {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });
}

function proximaEtapa() {
    const camposEtapaAtual = document.querySelectorAll(`#step-${etapaAtual} [required]`);
    let tudoPreenchido = true;

    camposEtapaAtual.forEach(campo => {
        if (!campo.value.trim()) {
            tudoPreenchido = false;
            campo.classList.add("input-error");
        } else {
            campo.classList.remove("input-error");
        }
    });

    if (!tudoPreenchido) {
        exibirToast("para avançar é necessário preencher tudo", "error");
        return;
    }

    etapaAtual++;
    mostrarEtapa(etapaAtual);
}

function etapaAnterior() {
    if (etapaAtual > 1) {
        etapaAtual--;
        mostrarEtapa(etapaAtual);
    }
}

function finalizarPedidoFoodwise() {
    // Gatilho simulando o processamento do gateway de pagamento
    exibirToast("Seu pagamento foi processado com sucesso.", "success");
    const modal = document.getElementById("order-success-modal");
    if (modal) {
        setTimeout(() => {
            modal.style.display = "flex";
        }, 1500);
    }
}
window.finalizarPedidoFoodwise = finalizarPedidoFoodwise;

function exibirToast(mensagem, tipo = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    
    let icone = "ℹ️";
    if (tipo === "success") icone = "✅";
    if (tipo === "error") icone = "❌";

    toast.innerHTML = `
        <span class="toast-icon">${icone}</span>
        <p class="toast-message">${mensagem}</p>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("showing");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("showing");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function inicializarCarrossel() {
    const track = document.querySelector(".carousel-track");
    if (!track) return;

    const slides = Array.from(track.children);
    let indiceAtual = 0;

    setInterval(() => {
        indiceAtual = (indiceAtual + 1) % slides.length;
        const tamanhoSlide = slides[0].getBoundingClientRect().width;
        track.style.transform = `translateX(-${indiceAtual * tamanhoSlide}px)`;
    }, 4000); // Rotaciona a cada 4 segundos
}
