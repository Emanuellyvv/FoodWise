/* ==========================================================================
   FOODWISE — CONFIGURAÇÕES (js/config.js)
   Tudo o que você pode querer ajustar fica neste arquivo.
   ========================================================================== */
const CONFIG = {
  /* Banco de dados do cardápio (repositório foodwise-db no GitHub) */
  urlCardapio: 'https://raw.githubusercontent.com/Emanuellyvv/foodwise-db/main/cardapio-dados.json',
  atualizarCardapioACadaMs: 60000,

  /* Ponto de saída das entregas (Curitiba). Troque pelas coordenadas da sua cozinha */
  restaurante: { lat:-25.4565, lng:-49.1880 },

  /* Frete = base + (quilômetros × valor por km). "padrao" é usado se o cálculo falhar */
  frete: { base: 4.0, porKm: 1.5, maxKm: 15, padrao: 6.9 },

  /* Formas de entrega. A bicicleta tem alcance menor e dá cashback */
  entrega: {
    moto: { rotulo: 'Moto', velocidadeKmH: 30 },
    bicicleta: { rotulo: 'Bicicleta', velocidadeKmH: 15, maxKm: 8, cashback: 0.05 }
  },
  preparoMin: 8,

  /* Tempo do pedido. true = acelerado (bom para apresentar). false = tempo real */
  modoDemonstracao: true,
  msPorMinutoDemo: 4000,
  msPorMinutoReal: 60000,

  cupom: { codigo: 'FOODWISE10', desconto: 0.1 },
  limiteAlerta: 0.8, // avisa quando chegar a 80% do limite de gastos

  /* SAC: e-mail que recebe as mensagens do formulário de contato */
  emailSac: 'vitoriaemanuelly1611@gmail.com',

  /* E-mail automático para o cliente (opcional, veja as instruções do EmailJS) */
  emailjs: { serviceId: '', templateId: '', publicKey: '' }
};
