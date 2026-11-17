// ==========================================
// BASE DE DADOS DOS PRODUTOS (EXTRAÍDOS DOS CATÁLOGOS)
//
// Cada linha: p(número, nome, categoria, capacidade, qtdMínima, descrição, medidas?)
// - Para adicionar um produto: copie uma linha e mude os dados (use o próximo número).
// - Para colocar fotos reais: salve na pasta "fotos/" e registre no FOTOS lá embaixo.
// ==========================================

const p = (n, nome, categoria, capacidade, min, desc, dim) => {
    const codigo = "SB-" + String(n).padStart(3, "0");
    const produto = { id: codigo, codigo, nome, categoria, capacidade, preco: "Sob consulta", min, desc, imagem: "" };
    if (dim) produto.dim = dim;
    return produto;
};

const PRODUTOS = [
    // ---------- Garrafas Térmicas ----------
    p(1, "Garrafa Térmica Munique", "Garrafas Térmicas", "750 ml", 30, "Garrafa térmica de alta performance com bocal flip-top, corpo em inox e isolamento a vácuo."),
    p(2, "Garrafa Térmica Koalla", "Garrafas Térmicas", "700 ml", 30, "Design ergonômico, ótima retenção térmica para líquidos quentes e gelados."),
    p(3, "Garrafa Térmica Sommer", "Garrafas Térmicas", "550 ml", 30, "Tampa emborrachada com alça superior e acabamento soft touch com tampa de bambu."),
    p(4, "Garrafa Térmica Nature", "Garrafas Térmicas", "500 ml", 30, "Modelo ecológico com detalhes amadeirados e excelente área para gravação de logo."),
    p(5, "Garrafa Térmica Nebraska", "Garrafas Térmicas", "520 ml", 30, "Tampa com bocal esportivo e trava de segurança antirrespingos."),
    p(6, "Garrafa Térmica Alabama", "Garrafas Térmicas", "550 ml", 30, "Inox de parede dupla com revestimento externo fosco e cores pastéis."),
    p(7, "Garrafa Térmica Temper", "Garrafas Térmicas", "400 ml", 30, "Compacta e elegante, ideal para o dia a dia no escritório."),
    p(8, "Garrafa Térmica Toulouse", "Garrafas Térmicas", "750 ml", 30, "Acabamento metálico polido espelhado de alto padrão."),
    p(9, "Garrafa Térmica Country Plus", "Garrafas Térmicas", "500 ml", 30, "Acompanha corda de transporte integrada e tampa superior emborrachada."),
    p(10, "Garrafa Térmica Country", "Garrafas Térmicas", "420 ml", 30, "Estilo rústico-moderno com alça de corda lateral."),
    p(11, "Garrafa Térmica Firenze Premium", "Garrafas Térmicas", "450 ml", 30, "Sistema de abertura rápida com um toque e trava de segurança."),
    p(12, "Garrafa Térmica Firenze", "Garrafas Térmicas", "400 ml", 30, "Compacta, cores vibrantes metálicas com sistema antivazamento."),
    p(13, "Garrafa Térmica Trilha", "Garrafas Térmicas", "600 ml", 30, "Robusta para aventuras, trilhas e viagens corporativas."),
    p(14, "Garrafa Térmica Alpes Inox", "Garrafas Térmicas", "420 ml", 30, "Tampa caneca multiuso com alça lateral articulada."),
    p(15, "Garrafa Térmica Alpes Collor", "Garrafas Térmicas", "420 ml", 30, "Versão colorida da linha Alpes com tampa isolante."),
    p(16, "Garrafa Térmica Luxor", "Garrafas Térmicas", "500 ml", 30, "Design clássico abaulado com excelente retenção térmica."),
    p(17, "Garrafa Térmica Luxor Eco", "Garrafas Térmicas", "500 ml", 30, "Base revestida em cortiça natural sustentável."),
    p(18, "Garrafa Térmica Melissa", "Garrafas Térmicas", "500 ml", 30, "Tampa com alça de aço robusta para transporte."),
    p(19, "Garrafa Térmica Azaléia", "Garrafas Térmicas", "500 ml", 30, "Cores fúcsia, azul e branco com acabamento acetinado."),
    p(20, "Garrafa Térmica Itália", "Garrafas Térmicas", "850 ml", 30, "Grande capacidade para o dia a dia e atividades físicas."),
    p(21, "Garrafa Metal Ventura", "Garrafas", "700 ml", 50, "Garrafa de metal com mosquetão para fixação em mochilas."),

    // ---------- Copos e Canecas ----------
    p(22, "Copo Térmico Stanford", "Copos Térmicos", "700 ml", 30, "Ideal para cerveja e bebidas geladas por horas, com tampa acrílica."),
    p(23, "Copo Térmico Jully Vip Slim", "Copos Térmicos", "240 ml", 30, "Versão compacta e elegante para doses e café."),
    p(24, "Caneca Térmica Inox", "Copos Térmicos", "450 ml", 30, "Caneca térmica com alça ergonômica robusta."),
    p(25, "Copo Térmico Londres", "Copos Térmicos", "1200 ml", 20, "O gigante térmico com alça lateral e canudo."),
    p(26, "Copo Térmico Colúmbia", "Copos Térmicos", "890 ml", 25, "Grande capacidade com tampa vedada."),
    p(27, "Copo Térmico Cheyenne com Alça", "Copos Térmicos", "350 ml", 30, "Copo com alça ergonômica para café e bebidas quentes."),
    p(28, "Copo Térmico Cheyenne", "Copos Térmicos", "320 ml", 30, "Design clean sem alça com parede dupla isolada a vácuo."),
    p(29, "Copo Térmico Cromus", "Copos Térmicos", "380 ml", 30, "Formato anatômico que se encaixa perfeitamente nas mãos."),
    p(30, "Copo Térmico Marrocos", "Copos Térmicos", "500 ml", 30, "Tampa com abridor de garrafas integrado embutido."),
    p(31, "Caneca Térmica Chimarrão", "Copos Térmicos", "300 ml", 30, "Formato especial para chimarrão e tereré."),
    p(32, "Copo Térmico Vancouver", "Copos Térmicos", "236 ml", 30, "Mini copo térmico com tampa deslizante."),
    p(33, "Copo Inox Coffee", "Copos", "80 ml", 50, "Copo espresso de parede dupla em inox."),
    p(34, "Copo Inox Verona", "Copos", "250 ml", 40, "Copo inox com base emborrachada/amadeirada e canudo."),
    p(35, "Kit Garrafa e Canecas Coffe Jully", "Kits", "450 ml", 20, "Acompanha garrafa térmica 450ml e 2 xícaras em maleta elegante."),
    p(36, "Copo Vidro Duplo Clean", "Vidros e Cristais", "80 ml", 50, "Vidro borossilicato de parede dupla para café."),
    p(37, "Caneca Vidro Duplo Cristalle", "Vidros e Cristais", "350 ml", 40, "Elegância em vidro duplo que não queima as mãos."),

    // ---------- Bolsas e Mochilas ----------
    p(38, "Bolsa Térmica Hawaii", "Bolsas e Mochilas", "14 Litros", 20, "Bolsa térmica espaçosa com bolsos laterais em redinha.", "24 x 30 x 20 cm"),
    p(39, "Bolsa Térmica Ventura Top", "Bolsas e Mochilas", "11 Litros", 20, "Alça de ombro ajustável e revestimento térmico premium.", "24 x 27 x 19 cm"),
    p(40, "Bolsa Térmica Arezzo", "Bolsas e Mochilas", "14 Litros", 20, "Design executivo com bolso frontal com zíper.", "24 x 30 x 20 cm"),
    p(41, "Bolsa Térmica Ventura", "Bolsas e Mochilas", "10 Litros", 20, "Compacta para marmitas e lanches diários.", "24 x 26 x 17 cm"),
    p(42, "Bolsa Térmica Oxford", "Bolsas e Mochilas", "5 Litros", 30, "Pequena e prática para uso individual.", "18 x 22,5 x 14 cm"),
    p(43, "Bolsa Térmica Charme", "Bolsas e Mochilas", "19 Litros", 15, "Grande capacidade estilo bolsa de mão.", "37 x 29 x 18 cm"),
    p(44, "Bolsa Térmica Dakota", "Bolsas e Mochilas", "7 Litros", 30, "Formato horizontal com abertura superior prática.", "20 x 25 x 14 cm"),
    p(45, "Bolsa Térmica Styllo", "Bolsas e Mochilas", "16 Litros", 20, "Ampla capacidade com acabamento mescla elegante.", "33,1 x 44 x 15 cm"),
    p(46, "Bolsa Esportiva Olympique", "Bolsas e Mochilas", "18 Litros", 15, "Bolsa de viagem e academia com compartimento para calçados.", "27 x 47 x 21 cm"),
    p(47, "Mochila Esportiva Sporting", "Bolsas e Mochilas", "20 Litros", 15, "Mochila térmica vertical com cordas elásticas frontais."),
    p(48, "Bolsa Esportiva Blue", "Bolsas e Mochilas", "26 Litros", 15, "Alças reforçadas e amplo espaço interno.", "26 x 45 x 23 cm"),
    p(49, "Bolsa Esportiva Lousane", "Bolsas e Mochilas", "44 Litros", 10, "Extra grande para viagens longas e equipamentos.", "28 x 49,5 x 33 cm"),
    p(50, "Camping Cooler", "Bolsas e Mochilas", "26 Litros", 15, "Cooler estruturado para camping e eventos ao ar livre."),
    p(51, "Bolsa Trecking", "Bolsas e Mochilas", "Variada", 20, "Bolsa tiracolo multiuso com vários compartimentos."),
    p(52, "Bolsa Messenger", "Bolsas e Mochilas", "Variada", 20, "Estilo executivo para documentos e notebooks."),
    p(53, "Mochila Essency Due", "Bolsas e Mochilas", "Variada", 15, "Mochila executiva com bolsinho acessório removível."),
    p(54, "Mochila Detroit", "Bolsas e Mochilas", "Variada", 15, "Design minimalista e resistente em couro sintético."),
    p(55, "Mochila Diamond", "Bolsas e Mochilas", "Variada", 15, "Com entrada USB externa para carregador portátil."),
    p(56, "Mochila Village", "Bolsas e Mochilas", "Variada", 15, "Tecido impermeável e compartimento para notebook."),
    p(57, "Mochila Gran Siena", "Bolsas e Mochilas", "Variada", 15, "Alta durabilidade e design corporativo moderno."),
    p(58, "Mochila Londres", "Bolsas e Mochilas", "Variada", 15, "Linha premium da Sanes Brindes."),

    // ---------- Escritório e Tecnologia ----------
    p(59, "Caderno Sidney", "Escritório e Tecnologia", "80 Folhas", 50, "Capa com detalhes em cortiça/bambu e marcador de página.", "21,3 x 14,5 cm"),
    p(60, "Caderno Nápolis", "Escritório e Tecnologia", "80 Folhas", 50, "Caderno executivo com fecho magnético em bambu.", "21 x 16 cm"),
    p(61, "Bloco Post It Cadenza", "Escritório e Tecnologia", "50 Folhas + Marcadores", 50, "Kit completo com bloquinhos autoadesivos coloridos e bloco pautado.", "22,8 x 16,6 cm"),
    p(62, "Cabo Multimix 3x1", "Escritório e Tecnologia", "Conector Universal", 100, "Cabo carregador 3 em 1 (Lightning, Tipo-C e Micro USB)."),
    p(63, "Fone de Ouvido Paris", "Escritório e Tecnologia", "Bluetooth", 30, "Fone sem fio com estojo carregador e alta fidelidade sonora."),
    p(64, "Fone de Ouvido Londres", "Escritório e Tecnologia", "Bluetooth", 30, "Ergonômico e confortável para chamadas e reuniões."),
    p(65, "Porta Celular Soft", "Escritório e Tecnologia", "Universal", 100, "Suporte dobrável para mesa em material emborrachado."),
    p(66, "Caixa de Som Bluetooth", "Escritório e Tecnologia", "Portátil", 30, "Mini caixa de som Bluetooth com excelente graves.", "9,1 x 7 cm"),
    p(67, "Calendário Permanente", "Escritório e Tecnologia", "Permanente", 40, "Calendário de mesa em blocos deslizantes reutilizáveis."),
    p(68, "Agenda Permanente Marine", "Escritório e Tecnologia", "Permanente", 30, "Agenda executiva com capa em tecido cinza, preta ou azul."),

    // ---------- Churrasco e Lazer ----------
    p(69, "Cortador de Pizza Bike Flower", "Churrasco e Lazer", "Inox", 50, "Cortador de pizza em formato de bicicleta estilizada com suporte."),
    p(70, "Chapéu Texas", "Churrasco e Lazer", "Unissex", 30, "Chapéu estilo country com faixa em couro sintético personalizada."),
    p(71, "Chapéu Country Suede", "Churrasco e Lazer", "Unissex", 30, "Chapéu aveludado estilo country premium."),
    p(72, "Tábua de Corte Churrasco", "Churrasco e Lazer", "Bambu", 30, "Tábua em bambu natural com tratamento antibacteriano.", "24 x 34 x 0,8 cm"),
    p(73, "Kit Churrasco 2 Peças", "Churrasco e Lazer", "Faca e Garfo", 30, "Acompanha faca e garfo com cabo de madeira em estojo."),
    p(74, "Kit Churrasco 3 Peças", "Churrasco e Lazer", "Faca, Pinça e Garfo", 25, "Kit essencial para o churrasco perfeito."),
    p(75, "Kit Churrasco Split", "Churrasco e Lazer", "4 Peças", 20, "Faca, pinça, garfo e espátula em maleta metálica executiva."),
    p(76, "Kit Churrasco Split Bag", "Churrasco e Lazer", "4 Peças", 20, "Mesmo kit Split em estojo de nylon compactado."),
    p(77, "Kit Churrasco 8 Peças com Avental", "Churrasco e Lazer", "8 Peças", 15, "Inclui avental, luva, saleiro, paliteiro e utensílios em inox."),
    p(78, "Kit Facas 6 Peças Sublime", "Churrasco e Lazer", "6 Peças", 15, "Conjunto profissional de facas para churrasco e cozinha."),
    p(79, "Kit 4 Peças Valença", "Churrasco e Lazer", "4 Peças", 20, "Utensílios de churrasco em estojo zíper premium."),
    p(80, "Kit 4 Peças Carrara Leap", "Churrasco e Lazer", "4 Peças", 20, "Design moderno com acabamento inox escovado."),
    p(81, "Kit 3 Peças Artesanale", "Churrasco e Lazer", "3 Peças com Caixa", 20, "Cabos em madeira tratada com caixa presenteável inclusa."),
    p(82, "Canivete Buck", "Churrasco e Lazer", "Lâmina 8.5 cm", 30, "Canivete tático/esportivo com cabo em madeira e trava de segurança.", "20 cm aberto"),
    p(83, "Kit Frios Wood", "Churrasco e Lazer", "4 Peças com Caixa", 25, "Tábua oval em bambu com 3 talheres específicos para frios."),
    p(84, "Kit Frios Cheese", "Churrasco e Lazer", "4 Peças com Caixa", 25, "Conjunto elegante para degustação de queijos."),
    p(85, "Kit Frios Firenze", "Churrasco e Lazer", "3 Peças", 25, "Utensílios para frios em acabamento inox."),

    // ---------- Acessórios e Casa ----------
    p(86, "Necessaire Make", "Bolsas e Acessórios", "Portátil", 50, "Necessaire feminina para maquiagem e higiene pessoal."),
    p(87, "Lixeira Premium Executive", "Casa e Escritório", "Automotiva / Mesa", 50, "Lixeirinha compacta para carros ou escrivaninhas."),
    p(88, "Carteira Premium", "Bolsas e Acessórios", "Couro Sintético", 40, "Carteira executiva com porta cartões."),
    p(89, "Chaveiro Triumph Silver / Jeep", "Acessórios", "Metal", 100, "Chaveiros metálicos personalizados para brindes automotivos."),

    // ---------- Canetas e Escrever ----------
    p(90, "Caneta Plástica Alliance", "Canetas", "Esferográfica", 200, "Caneta plástica promocional com excelente custo-benefício."),
    p(91, "Caneta Fumê Dual Park", "Canetas", "Esferográfica", 200, "Corpo fumê translúcido com detalhes coloridos."),
    p(92, "Caneta 3 em 1 Touch Senna", "Canetas", "Esferográfica + Touch + Lanterna", 100, "Multiuso com ponteira touch para smartphones."),
    p(93, "Caneta Slim Touch Dual", "Canetas", "Esferográfica + Touch", 150, "Design fino e elegante com touch screen."),
    p(94, "Caneta Metal Executiva", "Canetas", "Metal", 50, "Caneta metálica pesada com gravação a laser perfeita."),
    p(95, "Lapiseira Silver", "Canetas", "Grafite 0.7mm", 50, "Lapiseira executiva em metal eborrachado."),
    p(96, "Lapiseira Metal Casablanca", "Canetas", "Grafite 0.7mm", 50, "Acabamento prateado fosco."),
    p(97, "Lapiseira Metal Prata", "Canetas", "Grafite 0.7mm", 50, "Design clássico em alumínio anodizado."),
    p(98, "Caneta Executiva Memphis", "Canetas", "Esferográfica", 100, "Cores vibrantes para campanhas promocionais de massa."),
    p(99, "Caneta Metal Roller Verde", "Canetas", "Rollerball", 50, "Escrita macia e tinta em gel preta."),
    p(100, "Caneta Metal Blue", "Canetas", "Esferográfica", 50, "Detalhes emborrachados ranhurados na empunhadura."),
    p(101, "Caneta Metal Vintage", "Canetas", "Esferográfica + Touch", 50, "Textura diamantada em alto relevo e cores sofisticadas."),
    p(102, "Caneta Metal Paris", "Canetas", "Pedras Strass", 50, "Corpo preenchido com cristais brilhantes e ponteira touch."),
    p(103, "Caneta Metal Diamante", "Canetas", "Topo Diamante Acrílico", 50, "Topo com gema sintética lapidada em formato de diamante."),
];

// ==========================================
// FOTOS DOS PRODUTOS
// Salve a foto em "fotos/" e adicione uma linha aqui. Exemplo:
//   "SB-001": "fotos/SB-001.jpg",
// Produtos sem foto continuam mostrando o ícone padrão.
// ==========================================
const FOTOS = {
    // "SB-001": "fotos/SB-001.jpg",
};

PRODUTOS.forEach(prod => {
    if (FOTOS[prod.id]) prod.imagem = FOTOS[prod.id];
});

export default PRODUTOS;
