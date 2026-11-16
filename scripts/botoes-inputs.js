// Input Filtro Preço
const slider = document.getElementById('slider-preco');
const inputMin = document.getElementById('input-min');
const inputMax = document.getElementById('input-max');

if (slider) {
    noUiSlider.create(slider, {
        start: [0, 250],
        connect: true,
        range: { 'min': 0, 'max': 250 },
        format: { to: value => Math.round(value), from: value => Number(value) }
    });

    slider.noUiSlider.on('update', function (values, handle) {
        if (handle === 0) {
            inputMin.value = values[0];
        } else {
            inputMax.value = values[1];
        }
    });

    inputMin.addEventListener('change', function () {
        slider.noUiSlider.set([this.value, null]);
    });

    inputMax.addEventListener('change', function () {
        slider.noUiSlider.set([null, this.value]);
    });
}

// Card de Produtos
// const botoes = document.querySelectorAll('.productCard');

// botoes.forEach((botao) => {
//     botao.addEventListener('click', () => {
//         window.location.href = 'PaginaProduto.html';
//     });
// });

// Escuta cliques no container #Pratos (que já existe no HTML desde o início)
if(document.getElementById('Pratos'))
document.getElementById('Pratos').addEventListener('click', (event) => {
    // Verifica se o clique foi em um .productCard ou em qualquer elemento dentro dele (img, h1, h2, etc.)
    const card = event.target.closest('.productCard');

    // Se não clicou em um card, ignora
    if (!card) return;

    // Pega o ID do produto que já salvamos no data-id do card
    const produtoId = card.dataset.id;

    // Redireciona passando o ID na URL (opcional, mas essencial para a próxima página saber qual prato abrir)
    window.location.href = `PaginaProduto.html?id=${produtoId}`;
});

// Modal Header
const modalButton = document.getElementById('HeaderModalButton');
const modal = document.getElementById('HeaderModal');

if (modalButton && modal) {
    modalButton.addEventListener('click', (event) => {
        event.stopPropagation();
        modal.classList.add('Active');
    });

    document.addEventListener('click', (event) => {
        if (modal.classList.contains('Active') && !modal.contains(event.target)) {
            modal.classList.remove('Active');
        }
    });
}

//Dropdown Genero
const dropdownContainer = document.getElementById('GeneroDropdown');
const selectNativo = document.getElementById('GeneroInputNativo');

if (dropdownContainer && selectNativo) {
    const trigger = dropdownContainer.querySelector('.SelectTrigger');
    const textoTrigger = dropdownContainer.querySelector('.SelectTexto');
    const opcoes = dropdownContainer.querySelectorAll('.Opcao');

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownContainer.classList.toggle('aberto');
    });

    opcoes.forEach(opcao => {
        opcao.addEventListener('click', function () {
            const valor = this.getAttribute('data-value');
            const texto = this.textContent;

            textoTrigger.textContent = texto;

            selectNativo.value = valor;

            opcoes.forEach(opt => opt.classList.remove('selecionado'));
            this.classList.add('selecionado');

            dropdownContainer.classList.remove('aberto');
        });
    });

    document.addEventListener('click', (event) => {
        if (dropdownContainer.classList.contains('aberto') && !dropdownContainer.contains(event.target)) {
            dropdownContainer.classList.remove('aberto');
        }
    });
}

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const intervalo = (inicio, fim) =>
    Array.from({ length: Math.max(0, fim - inicio + 1) }, (_, i) => inicio + i);

function criarCampo(idDropdown, idNativo) {
    const dropdown = document.getElementById(idDropdown);
    const nativo = document.getElementById(idNativo);
    if (!dropdown || !nativo) return null;

    const texto = dropdown.querySelector('.SelectTexto');
    return {
        dropdown,
        nativo,
        texto,
        trigger: dropdown.querySelector('.SelectTrigger'),
        lista: dropdown.querySelector('.SelectOpcoes'),
        textoPadrao: texto.textContent.trim(),
        valor: null
    };
}

function aplicarSelecao(campo) {
    const valorTexto = campo.valor === null ? '' : String(campo.valor);
    let texto = campo.textoPadrao;

    campo.lista.querySelectorAll('.Opcao').forEach((li) => {
        const ativo = li.dataset.value === valorTexto;
        li.classList.toggle('selecionado', ativo);
        if (ativo) texto = li.textContent;
    });

    campo.texto.textContent = texto;
    campo.nativo.value = valorTexto;
}

function renderizarOpcoes(campo, opcoes) {
    campo.lista.replaceChildren();
    campo.nativo.replaceChildren(new Option('', ''));

    opcoes.forEach(({ valor, texto }) => {
        const li = document.createElement('li');
        li.className = 'Opcao';
        li.dataset.value = valor;
        li.textContent = texto;
        campo.lista.appendChild(li);
        campo.nativo.appendChild(new Option(texto, valor));
    });

    if (!opcoes.some((opcao) => opcao.valor === campo.valor)) campo.valor = null;
    aplicarSelecao(campo);
}

function registrarEventos(campos, atualizar) {
    const lista = Object.values(campos);

    lista.forEach((campo) => {
        campo.trigger.addEventListener('click', () => {
            campo.dropdown.classList.toggle('aberto');
        });

        // Delegação: funciona mesmo com as opções sendo recriadas
        campo.lista.addEventListener('click', (event) => {
            const opcao = event.target.closest('.Opcao');
            if (!opcao) return;

            campo.valor = Number(opcao.dataset.value);
            campo.dropdown.classList.remove('aberto');
            atualizar();
            campo.nativo.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    document.addEventListener('click', (event) => {
        lista.forEach((campo) => {
            if (!campo.dropdown.contains(event.target)) campo.dropdown.classList.remove('aberto');
        });
    }, true);
}

// Data de Nascimento (Dia / Mês / Ano)
function iniciarDataNascimento() {
    const containerData = document.getElementById('BirthDate');
    if (!containerData) return;

    const ANOS_RETROCEDER = 150;

    const ehBissexto = (ano) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

    const diasNoMes = (ano, mes) => {
        if (mes === 2) return ehBissexto(ano) ? 29 : 28;
        return [4, 6, 9, 11].includes(mes) ? 30 : 31;
    };

    function obterLimites() {
        const hoje = new Date();
        const max = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1, dia: hoje.getDate() };
        const anoMin = max.ano - ANOS_RETROCEDER;
        const min = { ano: anoMin, mes: max.mes, dia: Math.min(max.dia, diasNoMes(anoMin, max.mes)) };
        return { min, max };
    }

    function anosDisponiveis({ min, max }) {
        return intervalo(min.ano, max.ano).reverse()
            .map((ano) => ({ valor: ano, texto: String(ano) }));
    }

    function mesesDisponiveis(ano, { min, max }) {
        let inicio = 1;
        let fim = 12;
        if (ano === max.ano) fim = max.mes;
        if (ano === min.ano) inicio = min.mes;
        return intervalo(inicio, fim).map((mes) => ({ valor: mes, texto: NOMES_MESES[mes - 1] }));
    }

    function diasDisponiveis(ano, mes, { min, max }) {
        let inicio = 1;
        let fim = 31;
        if (mes) {
            fim = diasNoMes(ano ?? 2000, mes);
            if (ano === max.ano && mes === max.mes) fim = Math.min(fim, max.dia);
            if (ano === min.ano && mes === min.mes) inicio = min.dia;
        }
        return intervalo(inicio, fim).map((dia) => ({ valor: dia, texto: String(dia) }));
    }

    const campos = {
        dia: criarCampo('DayDropdown', 'DayInputNativo'),
        mes: criarCampo('MonthDropdown', 'MonthInputNativo'),
        ano: criarCampo('YearDropdown', 'YearInputNativo')
    };

    if (Object.values(campos).some((campo) => !campo)) {
        console.warn('Data de nascimento: dropdown ou select nativo não encontrado.');
        return;
    }

    function atualizar() {
        const limites = obterLimites();
        renderizarOpcoes(campos.ano, anosDisponiveis(limites));
        renderizarOpcoes(campos.mes, mesesDisponiveis(campos.ano.valor, limites));
        renderizarOpcoes(campos.dia, diasDisponiveis(campos.ano.valor, campos.mes.valor, limites));
    }

    registrarEventos(campos, atualizar);
    atualizar();

    // Preencher data de nascimento recebida pela WebAPI
    window.preencherDataNascimento = function (dataISO) {
        if (!dataISO) return false;

        // Extrai ano, mês e dia da data ISO
        const correspondencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataISO);

        if (!correspondencia) return false;

        const ano = Number(correspondencia[1]);
        const mes = Number(correspondencia[2]);
        const dia = Number(correspondencia[3]);

        const limites = obterLimites();

        // Verifica se a data é válida para os dropdowns
        const anoValido = anosDisponiveis(limites)
            .some(opcao => opcao.valor === ano);

        const mesValido = mesesDisponiveis(ano, limites)
            .some(opcao => opcao.valor === mes);

        const diaValido = diasDisponiveis(ano, mes, limites)
            .some(opcao => opcao.valor === dia);

        if (!anoValido || !mesValido || !diaValido) {
            console.warn('Data de nascimento inválida ou fora dos limites.');
            return false;
        }

        // Seleciona o ano e atualiza as opções
        campos.ano.valor = ano;
        atualizar();

        // Seleciona o mês e atualiza as opções
        campos.mes.valor = mes;
        atualizar();

        // Seleciona o dia e atualiza as opções
        campos.dia.valor = dia;
        atualizar();

        // Notifica possíveis eventos vinculados aos selects nativos
        Object.values(campos).forEach(campo => {
            campo.nativo.dispatchEvent(
                new Event('change', { bubbles: true })
            );
        });

        return true;
    };
}

// Validade Cartão (Mês / Ano)
function iniciarValidadeCartao() {
    const campos = {
        mes: criarCampo('CardMonthDropdown', 'CardMonthInputNativo'),
        ano: criarCampo('CardYearDropdown', 'CardYearInputNativo')
    };
    if (Object.values(campos).some((campo) => !campo)) return;

    const ANOS_NO_FUTURO = 20;

    function atualizar() {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;

        renderizarOpcoes(campos.ano,
            intervalo(anoAtual, anoAtual + ANOS_NO_FUTURO)
                .map((ano) => ({ valor: ano, texto: String(ano) })));

        const inicio = campos.ano.valor === anoAtual ? mesAtual : 1;
        renderizarOpcoes(campos.mes,
            intervalo(inicio, 12)
                .map((mes) => ({ valor: mes, texto: NOMES_MESES[mes - 1] })));
    }

    registrarEventos(campos, atualizar);
    atualizar();
}

// Inicialização automática ao carregar a página
function iniciarDropdownsDeData() {
    iniciarDataNascimento();
    iniciarValidadeCartao();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarDropdownsDeData);
} else {
    iniciarDropdownsDeData();
}

function iniciarMenuConfiguracoes() {
    const menu = document.getElementById('MenudeConfiguracoes');
    const compras = document.getElementById('ComprasRecentes');
    if (!menu || !compras) return;

    const ZONA_MORTA_SUPERIOR_VH = 10;
    const ZONA_MORTA_INFERIOR_VH = 25;
    const ATRASO_FIM_NAVEGACAO_MS = 200;

    const telas = { MenudeConfiguracoes: menu, ComprasRecentes: compras };

    const botoes = [...document.querySelectorAll('#Configuracoes nav button[data-tela]')];
    const itens = botoes
        .filter((botao) => botao.dataset.alvo)
        .map((botao) => ({ botao, alvo: document.getElementById(botao.dataset.alvo) }))
        .filter((item) => item.alvo && menu.contains(item.alvo));
    if (!itens.length) return;

    const vh = () => window.innerHeight / 100;

    function mostrarTela(nome) {
        if (!telas[nome]) return;
        Object.entries(telas).forEach(([chave, tela]) => tela.classList.toggle('Active', chave === nome));
    }

    function marcarBotoes(botaoAtivo) {
        botoes.forEach((botao) => botao.classList.toggle('Active', botao === botaoAtivo));
    }

    function obterZonaViva() {
        const caixa = menu.getBoundingClientRect();
        return {
            topo: caixa.top + ZONA_MORTA_SUPERIOR_VH * vh(),
            base: caixa.bottom - ZONA_MORTA_INFERIOR_VH * vh()
        };
    }

    function escolherItemAtivo() {
        if (menu.scrollTop <= 0) return itens[0];
        if (menu.scrollTop + menu.clientHeight >= menu.scrollHeight - 1) return itens[itens.length - 1];

        const { topo, base } = obterZonaViva();
        let melhor = itens[0];
        let maiorSobreposicao = -Infinity;

        itens.forEach((item) => {
            const caixa = item.alvo.getBoundingClientRect();
            const sobreposicao = Math.min(caixa.bottom, base) - Math.max(caixa.top, topo);
            if (sobreposicao > maiorSobreposicao) {
                melhor = item;
                maiorSobreposicao = sobreposicao;
            }
        });
        return melhor;
    }

    function atualizar() {
        if (menu.classList.contains('Active')) {
            marcarBotoes(escolherItemAtivo().botao);
        } else {
            marcarBotoes(botoes.find((botao) => botao.dataset.tela === 'ComprasRecentes'));
        }
    }

    let navegando = false;
    let temporizador = null;

    function agendarFimDaNavegacao() {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
            navegando = false;
            atualizar();
        }, ATRASO_FIM_NAVEGACAO_MS);
    }

    let frameAgendado = false;
    menu.addEventListener('scroll', () => {
        if (navegando) {
            agendarFimDaNavegacao();
            return;
        }
        if (frameAgendado) return;
        frameAgendado = true;
        requestAnimationFrame(() => {
            frameAgendado = false;
            atualizar();
        });
    }, { passive: true });

    window.addEventListener('resize', atualizar);

    botoes.forEach((botao) => {
        botao.addEventListener('click', () => {
            const item = itens.find((i) => i.botao === botao);
            const jaVisivel = menu.classList.contains('Active');

            mostrarTela(botao.dataset.tela);

            if (!item) {
                marcarBotoes(botao);
                return;
            }

            const { topo } = obterZonaViva();
            const destino = menu.scrollTop + item.alvo.getBoundingClientRect().top - topo;
            const reduzirMovimento = window.matchMedia
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            navegando = true;
            marcarBotoes(botao);
            agendarFimDaNavegacao();
            menu.scrollTo({
                top: Math.max(0, destino),
                behavior: jaVisivel && !reduzirMovimento ? 'smooth' : 'auto'
            });
        });
    });

    mostrarTela('MenudeConfiguracoes');
    atualizar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarMenuConfiguracoes);
} else {
    iniciarMenuConfiguracoes();
}

// Modal de Avaliação
const botoesAbrirAvaliacao = document.querySelectorAll('.AbrirAvaliacaoBtn');

botoesAbrirAvaliacao.forEach(botao => {
    botao.addEventListener('click', function (event) {
        event.preventDefault();

        const containerDetails = this.closest('.Details');
        if (containerDetails) {
            const formAvaliacao = containerDetails.querySelector('.AvaliacoesPedidoFeito');
            if (formAvaliacao) {
                formAvaliacao.classList.add('Active');
            }
        }
    });
});

const botoesFecharAvaliacao = document.querySelectorAll('.FecharAvaliacaoBtn');

botoesFecharAvaliacao.forEach(botaoFechar => {
    botaoFechar.addEventListener('click', function (event) {
        event.preventDefault();

        const formAvaliacao = this.closest('.AvaliacoesPedidoFeito');
        if (formAvaliacao) {
            formAvaliacao.classList.remove('Active');
        }
    });
});

// Controles de Quantidade
const containersQuantidade = document.querySelectorAll('.InputQuantidade');

containersQuantidade.forEach(container => {
    const input = container.querySelector('.QuantidadePratos');
    const btnMais = container.querySelector('.SetaMais');
    const btnMenos = container.querySelector('.SetaMenos');

    if (input && btnMais && btnMenos) {
        const min = parseInt(input.getAttribute('min')) || 0;

        // Avisa quem estiver ouvindo o input (ex.: o carrinho) que a quantidade mudou.
        // É o mesmo evento disparado quando o usuário digita, então há um único caminho de atualização.
        const avisarAlteracao = () => input.dispatchEvent(new Event('input', { bubbles: true }));

        btnMais.addEventListener('click', () => {
            const valorAtual = Math.max(parseInt(input.value) || 0, min);
            input.value = valorAtual + 1;
            avisarAlteracao();
        });

        btnMenos.addEventListener('click', () => {
            const valorAtual = Math.max(parseInt(input.value) || 0, min);
            input.value = Math.max(valorAtual - 1, min);
            avisarAlteracao();
        });
    }
});

// ============================================================
// Carrinho (Carrinho.html)
// ------------------------------------------------------------
// Camadas, de baixo para cima:
//   1. Utilitários monetários (valores em CENTAVOS, sempre inteiros)
//   2. Estado provisório do pedido (substituível por dados da API)
//   3. Acesso a dados: consultar / obter / validar / definir
//   4. Cálculos puros (não conhecem DOM nem a origem dos dados)
//   5. Renderização
//   6. Eventos e inicialização
//
// ATENÇÃO: tudo o que é calculado aqui serve apenas para EXIBIÇÃO.
// O backend (C#) deve revalidar preços, quantidades, descontos e taxa
// de entrega antes de registrar o pedido ou cobrar qualquer valor.
// ============================================================

// ---------- 1. Utilitários monetários ----------
const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// 6500 -> "R$ 65,00"
const formatarMoeda = (centavos) => formatadorMoeda.format(centavos / 100);

// "65.00" ou "65,00" -> 6500. Lê o texto sem usar float, evitando imprecisão. Inválido -> null.
function textoParaCentavos(texto) {
    const partes = /^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(String(texto ?? ''));
    if (!partes) return null;

    const total = Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
    return Number.isSafeInteger(total) ? total : null;
}

// Quantidade válida = inteiro não negativo. Vazio, inválido ou negativo -> 0.
function normalizarQuantidade(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) return 0;

    const inteiro = Math.trunc(numero);
    return Number.isSafeInteger(inteiro) ? inteiro : 0;
}

// ---------- 2. Estado provisório do pedido ----------
// Modalidades de desconto aceitas:
//   { tipo: 'nenhum',     valor: 0 }
//   { tipo: 'valor_fixo', valor: <centavos> }
//   { tipo: 'percentual', valor: <0 a 100> }
// FUTURO: ao integrar com a API, adapte a resposta para este formato em UM só lugar
// (dentro de validarCupom) e o restante do código continua igual.
const DESCONTO_NENHUM = Object.freeze({ tipo: 'nenhum', valor: 0 });
const TIPOS_DESCONTO = ['nenhum', 'valor_fixo', 'percentual'];
const TAXA_ENTREGA_INICIAL_CENTAVOS = 0; // provisório: R$ 0,00

const estadoPedido = {
    precosUnitarios: new WeakMap(), // elemento .Compra -> centavos
    taxaEntregaCentavos: TAXA_ENTREGA_INICIAL_CENTAVOS,
    desconto: DESCONTO_NENHUM
};

// ---------- 3. Acesso a dados ----------
const listarCompras = () => [...document.querySelectorAll('#MeuCarrinho .Compra')];

// PREÇOS UNITÁRIOS
// Provisório: lê o atributo data-preco-unitario já presente no HTML.
// FUTURO: enviar à API quais produtos estão no carrinho e devolver a resposta no mesmo formato.
async function consultarPrecosUnitarios(compras) {
    return compras.map((compra) => {
        const centavos = textoParaCentavos(compra.dataset.precoUnitario);
        if (centavos === null) {
            console.warn('Carrinho: preço unitário ausente ou inválido em', compra);
        }
        return { compra, centavos };
    });
}

function definirPrecoUnitario(compra, centavos) {
    estadoPedido.precosUnitarios.set(compra, centavos);
    atualizarTextoPrecoUnitario(compra, centavos ?? 0);
}

async function atualizarPrecosUnitarios() {
    const precos = await consultarPrecosUnitarios(listarCompras());
    precos.forEach(({ compra, centavos }) => definirPrecoUnitario(compra, centavos));
    atualizarCarrinho();
}

// TAXA DE ENTREGA
// Provisório: R$ 0,00. O parâmetro "endereco" ainda não é usado.
// FUTURO: enviar o endereço à API e devolver a taxa em centavos.
async function obterTaxaEntrega(endereco) {
    return TAXA_ENTREGA_INICIAL_CENTAVOS;
}

function definirTaxaEntrega(centavos) {
    estadoPedido.taxaEntregaCentavos =
        Number.isSafeInteger(centavos) && centavos >= 0 ? centavos : 0;
}

async function atualizarTaxaEntrega(endereco) {
    definirTaxaEntrega(await obterTaxaEntrega(endereco));
    atualizarCarrinho();
}

// CUPONS
// Provisório: nenhum cupom está cadastrado, então nenhum código é válido.
// FUTURO: consultar a API e devolver { valido, desconto } no formato descrito acima.
async function validarCupom(codigo) {
    return { valido: false, desconto: DESCONTO_NENHUM };
}

function definirDesconto(desconto) {
    const valido = desconto
        && TIPOS_DESCONTO.includes(desconto.tipo)
        && Number.isFinite(desconto.valor)
        && desconto.valor >= 0;
    estadoPedido.desconto = valido ? desconto : DESCONTO_NENHUM;
}

let consultaCupomAtual = 0; // descarta respostas antigas caso o usuário troque o código rapidamente

async function aplicarCupom(codigo) {
    const consulta = ++consultaCupomAtual;
    const texto = String(codigo ?? '').trim();

    if (!texto) {
        definirDesconto(DESCONTO_NENHUM);
        atualizarCarrinho();
        return; // Cupom opcional: campo em branco não bloqueia o pedido.
    }

    try {
        const resposta = await validarCupom(texto);
        if (consulta !== consultaCupomAtual) return;
        definirDesconto(resposta.valido ? resposta.desconto : DESCONTO_NENHUM);
        atualizarCarrinho();

        if (resposta.valido) {
            window.FettuccineFeedback?.toast({ tipo: 'sucesso', titulo: 'Cupom aplicado', mensagem: 'O desconto foi aplicado ao resumo do pedido.' });
        } else {
            window.FettuccineFeedback?.toast({
                tipo: 'aviso', titulo: 'Cupom indisponível',
                mensagem: 'Não foi possível validar esse código. A integração de cupons com a API ainda não está implementada. Você pode finalizar o pedido sem cupom.'
            });
        }
    } catch (erro) {
        if (consulta !== consultaCupomAtual) return;
        definirDesconto(DESCONTO_NENHUM);
        atualizarCarrinho();
        window.FettuccineFeedback?.toast({ tipo: 'erro', titulo: 'Falha ao validar cupom', mensagem: 'Não foi possível validar o cupom agora. Você pode continuar sem utilizá-lo.' });
        console.error('Falha ao validar cupom:', erro);
    }
}

// ---------- 4. Cálculos puros ----------
const calcularPrecoProduto = (precoUnitario, quantidade) => precoUnitario * quantidade;

const calcularSubtotal = (precosProdutos) =>
    precosProdutos.reduce((soma, preco) => soma + preco, 0);

// O desconto incide sobre o subtotal dos produtos e nunca passa dele.
// (Regra de base de cálculo a confirmar com o backend.)
function calcularDesconto(subtotal, desconto) {
    switch (desconto.tipo) {
        case 'valor_fixo':
            return Math.min(desconto.valor, subtotal);
        case 'percentual':
            return Math.round(subtotal * Math.min(desconto.valor, 100) / 100);
        default:
            return 0;
    }
}

// Total = Subtotal + Taxa de entrega - Desconto (nunca negativo)
const calcularTotal = (subtotal, taxaEntrega, desconto) =>
    Math.max(0, subtotal + taxaEntrega - desconto);

// ---------- 5. Renderização ----------
function escreverValor(id, centavos) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = formatarMoeda(centavos);
}

// Troca só o texto "65.00 / un", preservando o SVG ao lado.
function atualizarTextoPrecoUnitario(compra, centavos) {
    const elemento = compra.querySelector('.PrecoUnitario');
    if (!elemento) return;

    const texto = [...elemento.childNodes]
        .find((no) => no.nodeType === Node.TEXT_NODE && no.nodeValue.trim() !== '');
    if (texto) texto.nodeValue = ` ${formatarMoeda(centavos)} / un `;
}

function atualizarCarrinho() {
    const precosProdutos = listarCompras().map((compra) => {
        const precoUnitario = estadoPedido.precosUnitarios.get(compra) ?? 0;
        const campo = compra.querySelector('.QuantidadePratos');
        const quantidade = normalizarQuantidade(campo ? campo.value : 0);

        const preco = calcularPrecoProduto(precoUnitario, quantidade);
        const elementoPreco = compra.querySelector('.preco');
        if (elementoPreco) elementoPreco.textContent = formatarMoeda(preco);
        return preco;
    });

    const subtotal = calcularSubtotal(precosProdutos);
    const taxaEntrega = estadoPedido.taxaEntregaCentavos;
    const desconto = calcularDesconto(subtotal, estadoPedido.desconto);

    escreverValor('ResumoSubtotal', subtotal);
    escreverValor('ResumoTaxaEntrega', taxaEntrega);
    escreverValor('ResumoDesconto', desconto);
    escreverValor('ResumoTotal', calcularTotal(subtotal, taxaEntrega, desconto));
}

// ---------- 6. Eventos e inicialização ----------
function iniciarCarrinho() {
    const lista = document.getElementById('MeuCarrinho');
    if (!lista) return;

    // Delegação: vale para qualquer quantidade de produtos e para digitação, setas nativas,
    // botões .SetaMais/.SetaMenos (que disparam "input") e valores colados.
    lista.addEventListener('input', (event) => {
        if (event.target.matches('.QuantidadePratos')) atualizarCarrinho();
    });

    // Ao sair do campo, corrige o texto exibido (vazio, negativo, decimal...).
    // Só recalcula se corrigiu algo, para não repetir a atualização já feita no "input".
    lista.addEventListener('change', (event) => {
        const campo = event.target;
        if (!campo.matches('.QuantidadePratos')) return;

        const corrigido = String(normalizarQuantidade(campo.value));
        if (campo.value !== corrigido) {
            campo.value = corrigido;
            atualizarCarrinho();
        }
    });

    // Cupom: valida ao confirmar (Enter ou sair do campo), não a cada tecla.
    const campoCupom = document.getElementById('DescInput');
    if (campoCupom) {
        campoCupom.addEventListener('change', () => aplicarCupom(campoCupom.value));
    }

    atualizarPrecosUnitarios().catch(console.error);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarCarrinho);
} else {
    iniciarCarrinho();
}

// Alternância Cadastro / Login (CadastroLogin.html)
function iniciarAlternanciaCadastroLogin() {
    const formCadastrar = document.getElementById('CadastrarForms');
    const formEntrar = document.getElementById('EntrarForms');
    const btnSecundario = document.getElementById('Secundario');
    const btnPrincipal = document.getElementById('Principal');

    if (!formCadastrar || !formEntrar || !btnSecundario || !btnPrincipal) return;

    function sincronizarBotoes() {
        const cadastroAtivo = formCadastrar.classList.contains('Active');

        btnSecundario.textContent = cadastroAtivo ? 'Entrar na conta' : 'Cadastrar';
        btnPrincipal.textContent = cadastroAtivo ? 'Criar conta' : 'Entrar na conta';
    }

    btnSecundario.addEventListener('click', () => {
        const cadastroAtivo = formCadastrar.classList.contains('Active');

        formCadastrar.classList.toggle('Active', !cadastroAtivo);
        formEntrar.classList.toggle('Active', cadastroAtivo);

        sincronizarBotoes();
    });

    sincronizarBotoes();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarAlternanciaCadastroLogin);
} else {
    iniciarAlternanciaCadastroLogin();
}