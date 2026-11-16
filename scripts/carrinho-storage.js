const CHAVE_CARRINHO = 'fettuccine-carrinho';
let pedidoEmAndamento = false;

function lerCarrinho() {
    try {
        const itens = JSON.parse(localStorage.getItem(CHAVE_CARRINHO));
        return Array.isArray(itens) ? itens : [];
    } catch (_) {
        return [];
    }
}

function salvarCarrinho(itens) {
    try {
        localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
        return true;
    } catch (erro) {
        console.error('Não foi possível salvar o carrinho:', erro);
        window.FettuccineFeedback?.toast({
            tipo: 'erro', titulo: 'Carrinho não atualizado',
            mensagem: 'O navegador não permitiu salvar essa alteração.'
        });
        return false;
    }
}

// produto = objeto devolvido por GET /Produtos/{id}
function adicionarAoCarrinho(produto, quantidade = 1) {
    if (!produto?.id || !produto.disponivel) return false;
    const itens = lerCarrinho();
    const existente = itens.find((item) => String(item.id) === String(produto.id));
    const quantidadeAdicionar = Math.max(1, Math.trunc(Number(quantidade)) || 1);

    if (existente) {
        existente.quantidade = Math.max(1, Number(existente.quantidade) || 1) + quantidadeAdicionar;
    } else {
        itens.push({
            id: produto.id,
            nome: produto.nome,
            descricao: produto.descricao,
            ingredientes: produto.ingredientes,
            imagemUrl: produto.imagemUrl,
            precoCentavos: Math.round(Number(produto.preco) * 100),
            quantidade: quantidadeAdicionar
        });
    }

    const salvo = salvarCarrinho(itens);
    if (salvo) {
        window.FettuccineFeedback?.toast({
            tipo: 'sucesso', titulo: 'Adicionado ao carrinho',
            mensagem: `${produto.nome} foi adicionado ao seu pedido.`
        });
    }
    return salvo;
}

function definirQuantidadeNoCarrinho(id, quantidade) {
    const itens = lerCarrinho();
    const item = itens.find((i) => String(i.id) === String(id));
    if (!item) return;
    item.quantidade = Math.max(0, Math.trunc(Number(quantidade)) || 0);
    salvarCarrinho(itens);
}

function removerDoCarrinho(id) {
    return salvarCarrinho(lerCarrinho().filter((item) => String(item.id) !== String(id)));
}

// ===== Renderização (Carrinho.html) =====
function criarCompra(item) {
    const modelo = document.getElementById('ModeloCompra');
    if (!modelo?.content?.firstElementChild) return null;
    const compra = modelo.content.firstElementChild.cloneNode(true);

    compra.dataset.id = item.id;
    compra.dataset.precoUnitario = (Number(item.precoCentavos) / 100).toFixed(2);
    compra.querySelector('.Prato h1').textContent = item.nome ?? 'Produto';
    compra.querySelector('.Prato hgroup > h2').textContent = item.descricao ?? '';

    const lista = compra.querySelector('.Prato ul');
    lista.replaceChildren(
        ...String(item.ingredientes ?? '')
            .split(/[,;]/)
            .map((texto) => texto.trim().replace(/\.$/, ''))
            .filter(Boolean)
            .map((texto) => {
                const li = document.createElement('li');
                li.textContent = `- ${texto}`;
                return li;
            })
    );

    const imagem = compra.querySelector('.Prato img');
    if (imagem) {
        imagem.src = item.imagemUrl || 'assets/Img_01.png';
        imagem.alt = item.nome ?? 'Produto';
    }

    const quantidade = compra.querySelector('.QuantidadePratos');
    if (quantidade) quantidade.value = Math.max(0, Number(item.quantidade) || 0);
    return compra;
}

function renderizarCarrinho() {
    const lista = document.getElementById('MeuCarrinho');
    const modelo = document.getElementById('ModeloCompra');
    if (!lista || !modelo) return;

    const itens = lerCarrinho();
    if (itens.length === 0) {
        const vazio = document.createElement('h2');
        vazio.className = 'CarrinhoVazio';
        vazio.textContent = 'Seu carrinho está vazio.';
        lista.replaceChildren(vazio);
    } else {
        const compras = itens.map(criarCompra).filter(Boolean);
        lista.replaceChildren(...compras);
    }

    if (lista.dataset.eventosLigados === 'true') return;
    lista.dataset.eventosLigados = 'true';

    lista.addEventListener('input', (evento) => {
        if (!evento.target.matches('.QuantidadePratos')) return;
        const compra = evento.target.closest('.Compra');
        if (!compra) return;
        definirQuantidadeNoCarrinho(compra.dataset.id, evento.target.value);
    });

    lista.addEventListener('click', async (evento) => {
        const botao = evento.target.closest('.DeleteFromCart');
        if (!botao) return;
        const compra = botao.closest('.Compra');
        if (!compra || botao.disabled) return;

        botao.disabled = true;
        const nome = compra.querySelector('.Prato h1')?.textContent || 'este produto';
        const confirmou = await window.FettuccineFeedback?.confirmar({
            titulo: 'Remover produto?',
            mensagem: `Deseja remover ${nome} do seu carrinho?`,
            confirmarTexto: 'Remover produto',
            cancelarTexto: 'Manter no carrinho',
            perigoso: true
        });
        if (!confirmou) {
            botao.disabled = false;
            return;
        }

        const removido = removerDoCarrinho(compra.dataset.id);
        if (!removido) {
            botao.disabled = false;
            return;
        }
        compra.remove();
        if (!lista.querySelector('.Compra')) renderizarCarrinho();
        if (typeof atualizarCarrinho === 'function') atualizarCarrinho();
        window.FettuccineFeedback?.toast({
            tipo: 'sucesso', titulo: 'Produto removido', mensagem: `${nome} foi removido do carrinho.`
        });
    });
}

function montarItensPedido() {
    return lerCarrinho()
        .filter((item) => Number(item.quantidade) > 0)
        .map((item) => ({
            produtoId: item.id,
            nomeProduto: item.nome,
            precoUnitario: Number(item.precoCentavos) / 100,
            quantidade: Math.trunc(Number(item.quantidade)),
            subtotal: (Number(item.precoCentavos) * Math.trunc(Number(item.quantidade))) / 100
        }));
}

function formatarTotalPedido(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

async function FinalizarPedido() {
    const botao = document.getElementById('btnFinalizarPedido');
    if (pedidoEmAndamento || botao?.disabled) return;

    let dadosUsuario;
    try { dadosUsuario = JSON.parse(localStorage.getItem('DadosUsuario') || 'null'); }
    catch (_) { dadosUsuario = null; }
    if (!dadosUsuario?.id) {
        window.FettuccineFeedback?.toast({
            tipo: 'aviso', titulo: 'Entre na sua conta',
            mensagem: 'Você precisa entrar para finalizar seu pedido.'
        });
        window.setTimeout(() => { window.location.href = 'CadastroLogin.html'; }, 1000);
        return;
    }

    const itens = montarItensPedido();
    if (itens.length === 0) {
        window.FettuccineFeedback?.toast({
            tipo: 'aviso', titulo: 'Carrinho vazio',
            mensagem: 'Adicione ao menos um produto antes de finalizar o pedido.'
        });
        return;
    }

    const subtotal = itens.reduce((soma, item) => soma + Math.round(item.subtotal * 100), 0);
    const taxaEntrega = Number(estadoPedido?.taxaEntregaCentavos) || 0;
    const desconto = typeof calcularDesconto === 'function'
        ? calcularDesconto(subtotal, estadoPedido?.desconto || DESCONTO_NENHUM)
        : 0;
    const total = typeof calcularTotal === 'function'
        ? calcularTotal(subtotal, taxaEntrega, desconto)
        : Math.max(0, subtotal + taxaEntrega - desconto);
    const quantidadeTotal = itens.reduce((soma, item) => soma + item.quantidade, 0);

    pedidoEmAndamento = true;
    if (botao) botao.disabled = true;
    const confirmou = await window.FettuccineFeedback?.confirmar({
        titulo: 'Confirmar seu pedido?',
        mensagem: `${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'} no pedido\nSubtotal: ${formatarTotalPedido(subtotal / 100)}\nTaxa de entrega: ${formatarTotalPedido(taxaEntrega / 100)}\nDesconto: ${formatarTotalPedido(desconto / 100)}\nTotal: ${formatarTotalPedido(total / 100)}`,
        confirmarTexto: 'Enviar pedido',
        cancelarTexto: 'Revisar carrinho'
    });
    if (!confirmou) {
        pedidoEmAndamento = false;
        if (botao) botao.disabled = false;
        return;
    }

    const pedido = {
        cupomId: null,
        usuarioId: dadosUsuario.id,
        tipoEntrega: 'delivery',
        status: 'confirmado',
        formaPagamento: 'cartao_credito',
        statusPagamento: 'aprovado',
        subtotal: subtotal / 100,
        taxaEntrega: taxaEntrega / 100,
        desconto: desconto / 100,
        total: total / 100,
        observacoes: '',
        itensPedidos: itens
    };

    try {
        const resposta = await fetch('https://localhost:7193/Pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });
        const textoResposta = await resposta.text();
        let corpo = null;
        if (textoResposta.trim()) {
            try { corpo = JSON.parse(textoResposta); }
            catch (_) { corpo = textoResposta; }
        }
        if (!resposta.ok) {
            const mensagem = corpo && typeof corpo === 'object'
                ? (corpo.message || corpo.mensagem || corpo.title)
                : null;
            throw new Error(mensagem || `A API recusou o pedido (HTTP ${resposta.status}).`);
        }

        const carrinhoLimpo = salvarCarrinho([]);
        renderizarCarrinho();
        if (typeof atualizarCarrinho === 'function') atualizarCarrinho();
        window.FettuccineFeedback?.toast({
            tipo: carrinhoLimpo ? 'sucesso' : 'aviso',
            titulo: 'Pedido enviado com sucesso',
            mensagem: carrinhoLimpo
                ? 'A API confirmou o recebimento do pedido. Seu carrinho foi limpo.'
                : 'A API confirmou o pedido, mas o navegador não conseguiu limpar o carrinho. Não envie o mesmo pedido novamente.',
            duracao: 7000
        });
        if (botao) {
            botao.disabled = true;
            botao.textContent = 'Pedido enviado';
        }
    } catch (erro) {
        console.error('Erro ao finalizar pedido:', erro);
        window.FettuccineFeedback?.toast({
            tipo: 'erro', titulo: 'Não foi possível finalizar',
            mensagem: erro.message || 'Ocorreu um erro ao enviar o pedido. Tente novamente.' , duracao: 6500
        });
        pedidoEmAndamento = false;
        if (botao) botao.disabled = false;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        renderizarCarrinho();
        const botao = document.getElementById('btnFinalizarPedido');
        if (botao && botao.dataset.finalizacaoLigada !== 'true') {
            botao.dataset.finalizacaoLigada = 'true';
            botao.addEventListener('click', FinalizarPedido);
        }
    }, { once: true });
} else {
    renderizarCarrinho();
    const botao = document.getElementById('btnFinalizarPedido');
    if (botao && botao.dataset.finalizacaoLigada !== 'true') {
        botao.dataset.finalizacaoLigada = 'true';
        botao.addEventListener('click', FinalizarPedido);
    }
}
