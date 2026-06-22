const SUPABASE_URL = "https://jjkwehtfocrdibbjoylg.supabase.co/rest/v1/"; 
const SUPABASE_KEY = "sa-east-1";                        

let supabaseClient = null;
let useLocalStorageFallback = true;

// Previne falhas catastróficas caso o navegador ou o iframe bloqueie o LocalStorage
const SafeStorage = {
  _memoryDb: {},
  get(k) {
    try {
      const val = localStorage.getItem(k);
      return val ? JSON.parse(val) : (this._memoryDb[k] || null);
    } catch (e) {
      console.warn("FoodWise DB: LocalStorage read blocked. Using memory fallback.", e);
      return this._memoryDb[k] || null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      console.warn("FoodWise DB: LocalStorage write blocked. Saving to memory.", e);
      this._memoryDb[k] = v;
    }
  }
};

const PRODUTOS_SEED = [
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

const DB = {
  init() {
    try {
      if (!SafeStorage.get('fw_initialized')) {
        SafeStorage.set('fw_initialized', true);
        SafeStorage.set('fw_products', PRODUTOS_SEED);
        SafeStorage.set('fw_users', []);
        SafeStorage.set('fw_perfis', []);
        SafeStorage.set('fw_orders', []);
        SafeStorage.set('fw_items', []);
        SafeStorage.set('fw_session', null);
        SafeStorage.set('fw_cart', []);
      }
    } catch (e) {
      console.error("FoodWise DB: Failed to initialize sandbox schema", e);
    }
  },
  
  set(k, v) { SafeStorage.set(k, v); },
  get(k)     { return SafeStorage.get(k); },

  async cadastrarUsuario(dados) {
    if (!useLocalStorageFallback && supabaseClient) {
      try {
        const { data: userCreated, error: userError } = await supabaseClient
          .from('usuarios')
          .insert([{
            nome: dados.nome,
            email: dados.email,
            senha: dados.senha,
            idade: dados.idade,
            data_nascimento: dados.data_nascimento,
            cpf: dados.cpf,
            telefone: dados.telefone,
            endereco_padrao: dados.endereco
          }])
          .select();

        if (userError) throw userError;
        const newUser = userCreated[0];

        const { error: profileError } = await supabaseClient
          .from('perfis_financeiros')
          .insert([{
            usuario_id: newUser.id,
            renda_mensal: dados.renda,
            limite_mensal_delivery: dados.orcamento,
            saldo_disponivel_mes: dados.orcamento,
            estilo_vida_alimentar: dados.estilo_vida
          }]);

        if (profileError) throw profileError;

        const sessionData = {
          id: newUser.id,
          nome: newUser.nome,
          email: newUser.email,
          endereco: newUser.endereco_padrao,
          renda: dados.renda,
          orcamento: dados.orcamento,
          estilo_vida: dados.estilo_vida,
          firstOrderDiscount: 10
        };

        this.set('fw_session', sessionData);
        return { ok: true, user: sessionData };
      } catch (e) {
        console.error("Erro no Supabase ao cadastrar. Migrando para fallback local.", e.message);
      }
    }

    const users = this.get('fw_users') || [];
    if (users.find(u => u.email === dados.email)) {
      return { ok: false, msg: 'Este e-mail já está cadastrado no FoodWise.' };
    }

    const localUserId = 'u_' + Date.now();
    const novoUsuario = {
      id: localUserId,
      nome: dados.nome,
      email: dados.email,
      password: dados.password,
      idade: dados.idade,
      data_nascimento: dados.data_nascimento,
      cpf: dados.cpf,
      telefone: dados.telefone,
      endereco_padrao: dados.endereco
    };

    const novoPerfil = {
      id: 'prof_' + Date.now(),
      usuario_id: localUserId,
      renda_mensal: dados.renda,
      limite_mensal_delivery: dados.orcamento,
      saldo_disponivel_mes: dados.orcamento,
      estilo_vida_alimentar: dados.estilo_vida
    };

    users.push(novoUsuario);
    const perfis = this.get('fw_perfis') || [];
    perfis.push(novoPerfil);

    this.set('fw_users', users);
    this.set('fw_perfis', perfis);

    const sessionData = {
      id: localUserId,
      nome: novoUsuario.nome,
      email: novoUsuario.email,
      endereco: novoUsuario.endereco_padrao,
      renda: novoPerfil.renda_mensal,
      orcamento: novoPerfil.saldo_disponivel_mes,
      estilo_vida: novoPerfil.estilo_vida_alimentar,
      firstOrderDiscount: 10
    };

    this.set('fw_session', sessionData);
    return { ok: true, user: sessionData };
  },

  async loginUsuario(email, senha) {
    if (!useLocalStorageFallback && supabaseClient) {
      try {
        const { data: users, error: userError } = await supabaseClient
          .from('usuarios')
          .select('*')
          .eq('email', email)
          .eq('senha', senha);

        if (userError) throw userError;

        if (users.length > 0) {
          const user = users[0];
          const { data: profiles, error: profileError } = await supabaseClient
            .from('perfis_financeiros')
            .select('*')
            .eq('usuario_id', user.id);

          if (profileError) throw profileError;

          const profile = profiles[0] || { renda_mensal: 0, saldo_disponivel_mes: 0, estilo_vida_alimentar: 'tradicional' };

          const sessionData = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            endereco: user.endereco_padrao,
            renda: parseFloat(profile.renda_mensal),
            orcamento: parseFloat(profile.saldo_disponivel_mes),
            estilo_vida: profile.estilo_vida_alimentar,
            firstOrderDiscount: 10
          };

          this.set('fw_session', sessionData);
          return { ok: true, user: sessionData };
        }
      } catch (e) {
        console.error("Erro ao autenticar no Supabase:", e.message);
      }
    }

    const users = this.get('fw_users') || [];
    const userFound = users.find(u => u.email === email && u.password === senha);

    if (!userFound) return { ok: false, msg: 'E-mail ou senha incorretos.' };

    const perfis = this.get('fw_perfis') || [];
    const profileFound = perfis.find(p => p.usuario_id === userFound.id) || { renda_mensal: 2500, saldo_disponivel_mes: 600, estilo_vida_alimentar: 'tradicional' };

    const sessionData = {
      id: userFound.id,
      nome: userFound.nome,
      email: userFound.email,
      endereco: userFound.endereco_padrao,
      renda: parseFloat(profileFound.renda_mensal),
      orcamento: parseFloat(profileFound.saldo_disponivel_mes),
      estilo_vida: profileFound.estilo_vida_alimentar,
      firstOrderDiscount: 10
    };

    this.set('fw_session', sessionData);
    return { ok: true, user: sessionData };
  },

  logout() {
    this.set('fw_session', null);
    this.set('fw_cart', []);
  },

  getSession() {
    return this.get('fw_session');
  },

  updateSession(novosDados) {
    const s = this.getSession();
    if (!s) return;
    const sAtualizado = { ...s, ...novosDados };
    this.set('fw_session', sAtualizado);

    const perfis = this.get('fw_perfis') || [];
    const index = perfis.findIndex(p => p.usuario_id === s.id);
    if (index >= 0) {
      perfis[index].saldo_disponivel_mes = sAtualizado.orcamento;
      this.set('fw_perfis', perfis);
    }
  },

  getProducts(cat) {
    const all = this.get('fw_products') || PRODUTOS_SEED;
    if (!cat || cat === 'todos') return all;
    if (cat === 'promocoes') return all.filter(p => p.tag === 'promo');
    return all.filter(p => p.cat === cat);
  },

  getProduct(id) {
    return (this.get('fw_products') || PRODUTOS_SEED).find(p => p.id === id);
  },

  getFeatured() {
    return (this.get('fw_products') || PRODUTOS_SEED).sort((a, b) => b.sold - a.sold).slice(0, 4);
  },

  getCart() {
    return this.get('fw_cart') || [];
  },

  addToCart(pid, qty = 1) {
    const cart = this.getCart();
    const index = cart.findIndex(x => x.pid === pid);
    if (index >= 0) {
      cart[index].qty += qty;
    } else {
      cart.push({ pid, qty });
    }
    this.set('fw_cart', cart);
    return cart;
  },

  removeFromCart(pid) {
    const cart = this.getCart().filter(x => x.pid !== pid);
    this.set('fw_cart', cart);
    return cart;
  },

  updateQty(pid, qty) {
    if (qty <= 0) return this.removeFromCart(pid);
    const cart = this.getCart();
    const index = cart.findIndex(x => x.pid === pid);
    if (index >= 0) cart[index].qty = qty;
    this.set('fw_cart', cart);
    return cart;
  },

  clearCart() {
    this.set('fw_cart', []);
  },

  cartTotal() {
    return this.getCart().reduce((sum, item) => {
      const p = this.getProduct(item.pid);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
  },

  cartCount() {
    return this.getCart().reduce((sum, item) => sum + item.qty, 0);
  },

  async salvarPedido(dadosPedido) {
    if (!useLocalStorageFallback && supabaseClient) {
      try {
        const { data: orderCreated, error: orderError } = await supabaseClient
          .from('pedidos')
          .insert([{
            usuario_id: dadosPedido.usuario_id,
            subtotal: this.cartTotal(),
            desconto: dadosPedido.total < this.cartTotal() ? 10.00 : 0.00,
            total_pago: dadosPedido.total,
            endereco_entrega: dadosPedido.endereco_entrega,
            forma_pagamento: dadosPedido.forma_pagamento,
            status: 'confirmado'
          }])
          .select();

        if (orderError) throw orderError;
        const newOrder = orderCreated[0];

        const insertsItens = dadosPedido.itens.map(item => {
          const p = this.getProduct(item.pid);
          return {
            pedido_id: newOrder.id,
            produto_id: item.pid,
            quantidade: item.qty,
            preco_unitario: p ? p.price : 0
          };
        });

        const { error: itemsError } = await supabaseClient
          .from('itens_pedido')
          .insert(insertsItens);

        if (itemsError) throw itemsError;

        const novoSaldo = Math.max(0, this.getSession().orcamento - dadosPedido.total);
        await supabaseClient
          .from('perfis_financeiros')
          .update({ saldo_disponivel_mes: novoSaldo })
          .eq('usuario_id', dadosPedido.usuario_id);

        this.clearCart();
        return newOrder;
      } catch (e) {
        console.error("Transação no Supabase falhou. Usando LocalStorage local:", e.message);
      }
    }

    const orders = this.get('fw_orders') || [];
    const localOrderId = 'o_' + Date.now();

    const novoPedido = {
      id: localOrderId,
      usuario_id: dadosPedido.usuario_id,
      subtotal: this.cartTotal(),
      desconto: dadosPedido.total < this.cartTotal() ? 10.00 : 0.00,
      total_pago: dadosPedido.total,
      endereco_entrega: dadosPedido.endereco_entrega,
      forma_pagamento: dadosPedido.forma_pagamento,
      status: 'confirmado',
      created_at: new Date().toISOString()
    };

    orders.push(novoPedido);
    this.set('fw_orders', orders);

    const itemsTable = this.get('fw_items') || [];
    dadosPedido.itens.forEach(item => {
      const p = this.getProduct(item.pid);
      itemsTable.push({
        id: 'det_' + Math.random(),
        pedido_id: localOrderId,
        produto_id: item.pid,
        quantidade: item.qty,
        preco_unitario: p ? p.price : 0
      });
    });
    this.set('fw_items', itemsTable);

    this.clearCart();
    return novoPedido;
  }
};

// Auto-inicialização de schemas
DB.init();
