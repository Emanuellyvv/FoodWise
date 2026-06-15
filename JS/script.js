/**
 * FoodWise — Banco de Dados (localStorage)
 */
// Inicializando a conexão com os seus dados do painel do Supabase
const SUPABASE_URL = "sb_secret_b6ZbPXnoBYC9d4SSsNKXzA_WY2CD6jQ";
const SUPABASE_KEY = "sb_publishable_DkoFibjxu6n2OkiWBTCwwA_OfdBwRdG";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// 1. Mapear o formulário do HTML pelo ID dele (certifique-se de colocar id="meuFormulario" na tag <form> do HTML)
const formulario = document.getElementById('meuFormulario');

// 2. Ouvir o momento em que o usuário clica no botão de enviar
formulario.addEventListener('submit', async (evento) => {
    // Evita que a página recarregue e limpe os dados inseridos
    evento.preventDefault();

    // 3. Capturar os valores digitados nos campos de input do HTML
    // (Ajuste os IDs abaixo conforme o que você escreveu no seu HTML)
    const nomeItem = document.getElementById('inputNome').value;
    const valorItem = document.getElementById('inputValor').value;

    try {
        // 4. Inserir os dados na tabela do seu Banco de Dados no Supabase
        // Substitua 'nome_da_sua_tabela' pelo nome real criado no seu arquivo .sql (ex: 'gastos' ou 'produtos')
        const { data, error } = await supabase
            .from('nome_da_sua_tabela')
            .insert([
                { nome: nomeItem, valor: parseFloat(valorItem) } // As colunas devem ter o mesmo nome do banco
            ]);

        if (error) {
            throw error;
        }

        // Mensagem de sucesso caso grave corretamente na nuvem
        alert('Dados salvos com sucesso no FoodWise!');
        formulario.reset(); // Limpa os campos do formulário para um novo uso

    } catch (erro) {
        console.error('Erro ao salvar os dados:', erro.message);
        alert('Ocorreu um erro ao tentar salvar as informações.');
    }
});

const DB = {
  init() {
    if (!this.get('fw_initialized')) { this.seed(); this.set('fw_initialized', true); }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  get(k)     { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  seed() {
    const P = [
      {id:'p1', cat:'marmitas', name:'Marmita Fit Frango Grelhado',  desc:'Frango grelhado, arroz integral, brócolis e cenoura no vapor.',    price:28.90,  emoji:'🍱', tag:'saudavel', rating:4.8, sold:320},
      {id:'p2', cat:'marmitas', name:'Marmita Carne Assada',          desc:'Carne assada ao molho, arroz, feijão e vinagrete.',                price:32.90,  emoji:'🍱', tag:null,       rating:4.6, sold:210},
      {id:'p3', cat:'marmitas', name:'Marmita Vegana',                desc:'Grão-de-bico, couve refogada, arroz integral e tomate.',           price:26.90,  emoji:'🍱', tag:'saudavel', rating:4.5, sold:145},
      {id:'p4', cat:'marmitas', name:'Marmita Peixe Grelhado',        desc:'Tilápia grelhada com limão, arroz e legumes.',                     price:34.90,  emoji:'🍱', tag:'saudavel', rating:4.7, sold:178},
      {id:'p5', cat:'marmitas', name:'Marmita Frango ao Curry',       desc:'Frango ao curry com leite de coco, arroz e legumes.',              price:30.90,  emoji:'🍱', tag:null,       rating:4.9, sold:289},
      {id:'p6', cat:'marmitas', name:'Marmita Executiva',             desc:'Proteína do dia + 2 acompanhamentos + sobremesa.',                 price:38.90,  emoji:'🍱', tag:'promo',    rating:4.7, sold:195},
      {id:'p7', cat:'saudavel', name:'Salada Premium Frango',         desc:'Mix verde, frango grelhado, tomate cereja, crouton e molho.',      price:24.90,  emoji:'🥗', tag:'saudavel', rating:4.9, sold:412},
      {id:'p8', cat:'saudavel', name:'Bowl Açaí Proteico',            desc:'Açaí, banana, granola, mel e proteína em pó.',                     price:22.90,  emoji:'🥗', tag:'saudavel', rating:4.8, sold:356},
      {id:'p9', cat:'saudavel', name:'Wrap Integral Atum',            desc:'Atum, alface, tomate, cream cheese em tortilla integral.',          price:21.90,  emoji:'🥗', tag:'saudavel', rating:4.6, sold:201},
      {id:'p10',cat:'saudavel', name:'Salada Caesar Clássica',        desc:'Alface romana, crouton, parmesão e molho caesar.',                 price:20.90,  emoji:'🥗', tag:'saudavel', rating:4.5, sold:167},
      {id:'p11',cat:'saudavel', name:'Tigela de Quinoa',              desc:'Quinoa, vegetais assados, abacate e vinagrete de limão.',          price:26.90,  emoji:'🥗', tag:'saudavel', rating:4.7, sold:134},
      {id:'p12',cat:'saudavel', name:'Sanduíche Low Carb',            desc:'Pão low carb, peito de peru, queijo branco e rúcula.',             price:19.90,  emoji:'🥗', tag:'saudavel', rating:4.4, sold:189},
      {id:'p13',cat:'lanches',  name:'FoodBurger Clássico',           desc:'Blend 180g, queijo cheddar, alface, tomate e maionese especial.',  price:29.90,  emoji:'🥪', tag:null,       rating:4.8, sold:501},
      {id:'p14',cat:'lanches',  name:'FoodBurger Duplo',              desc:'Dois blends 120g, bacon, queijo, cebola caramelizada.',            price:38.90,  emoji:'🥪', tag:null,       rating:4.9, sold:443},
      {id:'p15',cat:'lanches',  name:'Chicken Crispy',                desc:'Frango crocante, coleslaw e molho honey mustard.',                 price:27.90,  emoji:'🥪', tag:null,       rating:4.7, sold:322},
      {id:'p16',cat:'lanches',  name:'Hot Dog Especial',              desc:'Salsicha artesanal, purê de batata, milho e batata palha.',        price:18.90,  emoji:'🥪', tag:'promo',    rating:4.5, sold:278},
      {id:'p17',cat:'lanches',  name:'Veggie Burger',                 desc:'Hambúrguer de grão-de-bico, alface, tomate e molho de ervas.',    price:26.90,  emoji:'🥪', tag:'saudavel', rating:4.6, sold:189},
      {id:'p18',cat:'lanches',  name:'Club Sandwich',                 desc:'Frango, bacon, ovo, alface, tomate em pão de forma.',             price:24.90,  emoji:'🥪', tag:null,       rating:4.7, sold:213},
      {id:'p19',cat:'carnes',   name:'Picanha na Chapa',              desc:'Picanha 300g, acompanha arroz, farofa e vinagrete.',               price:59.90,  emoji:'🥩', tag:null,       rating:4.9, sold:187},
      {id:'p20',cat:'carnes',   name:'Frango no Bafo',                desc:'Frango inteiro temperado na lenha, acompanha farofa.',             price:49.90,  emoji:'🥩', tag:null,       rating:4.8, sold:154},
      {id:'p21',cat:'carnes',   name:'Costela Bovina',                desc:'Costela bovina assada lentamente com molho barbecue.',             price:64.90,  emoji:'🥩', tag:null,       rating:4.9, sold:132},
      {id:'p22',cat:'carnes',   name:'Alcatra Grelhada',              desc:'Alcatra 250g grelhada, molho chimichurri e batata frita.',         price:52.90,  emoji:'🥩', tag:null,       rating:4.7, sold:98},
      {id:'p23',cat:'carnes',   name:'Frango Grelhado Simples',       desc:'Peito de frango grelhado 200g com legumes.',                       price:32.90,  emoji:'🥩', tag:'saudavel', rating:4.6, sold:210},
      {id:'p24',cat:'sushi',    name:'Combo Sushi 16 peças',          desc:'Salmão, atum e pepino. Acompanha missoshiru.',                     price:54.90,  emoji:'🍣', tag:null,       rating:4.8, sold:289},
      {id:'p25',cat:'sushi',    name:'Combo Premium 30 peças',        desc:'Mix completo com hossomaki, uramaki e temaki.',                    price:89.90,  emoji:'🍣', tag:null,       rating:4.9, sold:201},
      {id:'p26',cat:'sushi',    name:'Temaki Salmão',                 desc:'Cone gigante de salmão, cream cheese e cebolette.',               price:22.90,  emoji:'🍣', tag:null,       rating:4.7, sold:345},
      {id:'p27',cat:'sushi',    name:'Hossomaki 8 peças',             desc:'Rolinhos finos de salmão ou pepino.',                              price:18.90,  emoji:'🍣', tag:'saudavel', rating:4.5, sold:178},
      {id:'p28',cat:'sushi',    name:'Uramaki 8 peças',               desc:'Philadelphia, salmão e manga gratinado.',                          price:24.90,  emoji:'🍣', tag:null,       rating:4.8, sold:312},
      {id:'p29',cat:'sushi',    name:'Gunkan Variado 6 peças',        desc:'Barquinhos de ovas, atum e kani.',                                 price:29.90,  emoji:'🍣', tag:null,       rating:4.6, sold:134},
      {id:'p30',cat:'sushi',    name:'Combo Família 50 peças',        desc:'Mix completo para família. Acompanha 4 missoshiru.',               price:139.90, emoji:'🍣', tag:'promo',    rating:4.9, sold:89},
      {id:'p31',cat:'sobremesa',name:'Pudim de Leite',                desc:'Pudim artesanal com calda de caramelo.',                           price:12.90,  emoji:'🍮', tag:null,       rating:4.7, sold:412},
      {id:'p32',cat:'sobremesa',name:'Mousse de Chocolate',           desc:'Mousse cremoso com raspas de chocolate belga.',                    price:14.90,  emoji:'🍫', tag:null,       rating:4.8, sold:356},
      {id:'p33',cat:'sobremesa',name:'Açaí 500ml',                    desc:'Açaí puro com banana e granola.',                                  price:18.90,  emoji:'🍓', tag:'saudavel', rating:4.9, sold:489},
      {id:'p34',cat:'sobremesa',name:'Brownie Artesanal',             desc:'Brownie com recheio de nutella e sorvete.',                        price:16.90,  emoji:'🍫', tag:null,       rating:4.8, sold:298},
      {id:'p35',cat:'sobremesa',name:'Cheesecake de Morango',         desc:'Cheesecake cremoso com cobertura de morango fresco.',              price:19.90,  emoji:'🍰', tag:null,       rating:4.7, sold:213},
      {id:'p36',cat:'sobremesa',name:'Sorvete 3 Bolas',               desc:'Escolha 3 sabores. Casquinha ou copo.',                            price:13.90,  emoji:'🍦', tag:'promo',    rating:4.6, sold:321},
      {id:'p37',cat:'bebidas',  name:'Suco Natural 500ml',            desc:'Laranja, limão, abacaxi ou maracujá. Sem açúcar.',                price:10.90,  emoji:'🥤', tag:'saudavel', rating:4.7, sold:543},
      {id:'p38',cat:'bebidas',  name:'Refrigerante Lata',             desc:'Coca-Cola, Guaraná, Sprite ou Fanta. 350ml.',                     price:6.90,   emoji:'🥤', tag:null,       rating:4.5, sold:612},
      {id:'p39',cat:'bebidas',  name:'Água Mineral 500ml',            desc:'Com ou sem gás.',                                                  price:4.90,   emoji:'💧', tag:'saudavel', rating:4.8, sold:432},
      {id:'p40',cat:'bebidas',  name:'Vitamina de Frutas',            desc:'Mamão, banana e leite. 400ml.',                                    price:12.90,  emoji:'🥛', tag:'saudavel', rating:4.6, sold:234},
      {id:'p41',cat:'bebidas',  name:'Chá Gelado',                    desc:'Chá de limão, pêssego ou maçã. 500ml.',                           price:9.90,   emoji:'🍵', tag:'saudavel', rating:4.5, sold:178},
      {id:'p42',cat:'bebidas',  name:'Milk Shake',                    desc:'Chocolate, morango ou baunilha. 400ml.',                           price:16.90,  emoji:'🥛', tag:'promo',    rating:4.9, sold:378},
      {id:'p43',cat:'bebidas',  name:'Café Especial',                 desc:'Espresso, cappuccino ou café com leite. 200ml.',                   price:8.90,   emoji:'☕', tag:null,       rating:4.7, sold:298},
      {id:'p44',cat:'bebidas',  name:'Kombucha 300ml',                desc:'Fermentada artesanal. Gengibre, frutas vermelhas ou maçã.',       price:14.90,  emoji:'🍶', tag:'saudavel', rating:4.6, sold:145},
    ];
    this.set('fw_products', P);
    this.set('fw_users',   []);
    this.set('fw_orders',  []);
    this.set('fw_session', null);
    this.set('fw_cart',    []);
  },

  // USUÁRIOS
  getUsers()     { return this.get('fw_users') || []; },
  createUser(d)  {
    const us = this.getUsers();
    if (us.find(u=>u.email===d.email)) return {ok:false,msg:'E-mail já cadastrado.'};
    const u = {id:'u'+Date.now(),...d,createdAt:new Date().toISOString(),firstOrderDiscount:10};
    us.push(u); this.set('fw_users',us); return {ok:true,user:u};
  },
  loginUser(email,pwd) {
    const u = this.getUsers().find(u=>u.email===email&&u.password===pwd);
    if (!u) return {ok:false,msg:'E-mail ou senha incorretos.'};
    this.set('fw_session',u); return {ok:true,user:u};
  },
  logout()       { this.set('fw_session',null); },
  getSession()   { return this.get('fw_session'); },
  updateSession(d) {
    const s=this.getSession(); if(!s)return;
    const upd={...s,...d}; this.set('fw_session',upd);
    const us=this.getUsers(); const i=us.findIndex(u=>u.id===s.id);
    if(i>=0){us[i]=upd;this.set('fw_users',us);}
  },

  // PRODUTOS
  getProducts(cat) {
    const all=this.get('fw_products')||[];
    if(!cat||cat==='todos') return all;
    if(cat==='promocoes') return all.filter(p=>p.tag==='promo');
    return all.filter(p=>p.cat===cat);
  },
  getProduct(id) { return (this.get('fw_products')||[]).find(p=>p.id===id); },
  getFeatured()  { return (this.get('fw_products')||[]).sort((a,b)=>b.sold-a.sold).slice(0,4); },

  // CARRINHO
  getCart()      { return this.get('fw_cart')||[]; },
  addToCart(pid,qty=1) {
    const c=this.getCart(); const i=c.findIndex(x=>x.pid===pid);
    if(i>=0)c[i].qty+=qty; else c.push({pid,qty});
    this.set('fw_cart',c); return c;
  },
  removeFromCart(pid) { const c=this.getCart().filter(x=>x.pid!==pid); this.set('fw_cart',c); return c; },
  updateQty(pid,qty)  {
    if(qty<=0) return this.removeFromCart(pid);
    const c=this.getCart(); const i=c.findIndex(x=>x.pid===pid);
    if(i>=0)c[i].qty=qty; this.set('fw_cart',c); return c;
  },
  clearCart()    { this.set('fw_cart',[]); },
  cartTotal()    { return this.getCart().reduce((s,i)=>{const p=this.getProduct(i.pid);return s+(p?p.price*i.qty:0);},0); },
  cartCount()    { return this.getCart().reduce((s,i)=>s+i.qty,0); },

  // PEDIDOS
  getOrders()    { return this.get('fw_orders')||[]; },
  createOrder(d) {
    const os=this.getOrders();
    const o={id:'PED'+String(os.length+1).padStart(4,'0'),...d,
      status:'confirmado',createdAt:new Date().toISOString(),
      estimatedDelivery:new Date(Date.now()+30*60*1000).toISOString()};
    os.push(o); this.set('fw_orders',os);
    const s=this.getSession();
    if(s&&s.firstOrderDiscount) this.updateSession({firstOrderDiscount:0});
    this.clearCart(); return o;
  },
  getUserOrders() { const s=this.getSession(); if(!s)return[]; return this.getOrders().filter(o=>o.userId===s.id); },
};
DB.init();
