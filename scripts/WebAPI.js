// ============================================================
// Fettuccíne — integração com a WebAPI e feedback das operações
// Os endpoints, métodos e nomes de propriedades originais são mantidos.
// ============================================================

const API_BASE_URL = 'https://localhost:7193';
const feedback = window.FettuccineFeedback;

function lerLocalStorageSeguro(chave) {
    try {
        const valor = localStorage.getItem(chave);
        return valor ? JSON.parse(valor) : null;
    } catch (erro) {
        console.warn(`Não foi possível interpretar ${chave}:`, erro);
        return null;
    }
}

async function lerCorpoResposta(resposta) {
    const texto = await resposta.text();
    if (!texto || !texto.trim()) return null;
    try { return JSON.parse(texto); }
    catch (_) { return texto; }
}

function mensagemDaResposta(corpo, fallback) {
    if (corpo && typeof corpo === 'object') {
        return corpo.message || corpo.mensagem || corpo.title || corpo.detail || fallback;
    }
    return typeof corpo === 'string' && corpo.trim() ? corpo : fallback;
}

async function requisitarAPI(url, opcoes = {}) {
    let resposta;
    try {
        resposta = await fetch(url, opcoes);
    } catch (erro) {
        const falha = new Error('Não foi possível estabelecer comunicação com a API. Verifique se a WebAPI está em execução.');
        falha.causa = erro;
        throw falha;
    }
    const corpo = await lerCorpoResposta(resposta);
    if (!resposta.ok) {
        const erro = new Error(mensagemDaResposta(corpo, `A operação não foi concluída (HTTP ${resposta.status}).`));
        erro.status = resposta.status;
        erro.corpo = corpo;
        throw erro;
    }
    return { resposta, corpo };
}

function avisarErroAPI(erro, fallback) {
    console.error(fallback, erro);
    feedback?.toast({
        tipo: 'erro',
        titulo: 'Não foi possível concluir',
        mensagem: erro?.message || fallback
    });
}

function atualizarBotao(botao, bloqueado) {
    if (!botao) return;
    if (bloqueado) {
        botao.dataset.textoOriginal = botao.textContent.trim();
        botao.disabled = true;
        botao.setAttribute('aria-busy', 'true');
    } else {
        botao.disabled = false;
        botao.removeAttribute('aria-busy');
        delete botao.dataset.textoOriginal;
    }
}

// Cadastro
let autenticacaoEmAndamento = false;

async function CadastrarUsuario() {
    if (autenticacaoEmAndamento) return;
    if (!feedback?.validarCadastro()) {
        feedback?.toast({ tipo: 'aviso', titulo: 'Revise seus dados', mensagem: 'Preencha os campos obrigatórios e corrija as informações destacadas.' });
        return;
    }

    const novoUsuario = {
        nome: document.getElementById('Nome').value.trim(),
        sobrenome: document.getElementById('Sobrenome').value.trim(),
        email: document.getElementById('Email').value.trim(),
        telefone: feedback.somenteDigitos(document.getElementById('Telefone').value),
        cpf: feedback.somenteDigitos(document.getElementById('CPF').value),
        senha: document.getElementById('Senha').value,
        notificacaoEmail: true,
        notificacaoSms: true,
        tipoUsuario: 'cliente',
        statusConta: 'ativa',
        contaDemonstrativa: false
    };

    const botao = document.getElementById('Principal');
    autenticacaoEmAndamento = true;
    atualizarBotao(botao, true);
    try {
        await requisitarAPI(`${API_BASE_URL}/Usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoUsuario)
        });
        feedback.toast({ tipo: 'sucesso', titulo: 'Cadastro realizado', mensagem: 'Sua conta foi cadastrada com sucesso.' });
        document.getElementById('CadastrarForms')?.reset();
        ['Nome', 'Sobrenome', 'CPF', 'Email', 'Telefone', 'Senha', 'ConfirmarSenha', 'Termos'].forEach((id) => {
            const campo = document.getElementById(id);
            if (campo) { campo.value = ''; campo.checked = false; campo.dispatchEvent(new Event('input', { bubbles: true })); }
        });
    } catch (erro) {
        avisarErroAPI(erro, 'Erro ao realizar cadastro:');
    } finally {
        autenticacaoEmAndamento = false;
        atualizarBotao(botao, false);
    }
}

// Login
async function EntrarUsuario() {
    if (autenticacaoEmAndamento) return;
    if (!feedback?.validarLogin()) {
        feedback?.toast({ tipo: 'aviso', titulo: 'Revise seus dados', mensagem: 'Informe um e-mail válido e sua senha para continuar.' });
        return;
    }

    const login = {
        email: document.getElementById('Login').value.trim(),
        senha: document.getElementById('LoginSenha').value
    };
    const botao = document.getElementById('Principal');
    autenticacaoEmAndamento = true;
    let loginConcluido = false;
    atualizarBotao(botao, true);
    try {
        const { corpo } = await requisitarAPI(`${API_BASE_URL}/Usuarios/Login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(login)
        });
        if (!corpo || typeof corpo !== 'object') {
            throw new Error('A API confirmou a requisição, mas não retornou os dados necessários para iniciar a sessão.');
        }
        localStorage.setItem('DadosUsuario', JSON.stringify(corpo));
        loginConcluido = true;
        feedback.toast({ tipo: 'sucesso', titulo: 'Login realizado', mensagem: 'Sua sessão foi iniciada com sucesso.' });
        window.setTimeout(() => { window.location.href = 'Produtos.html'; }, 900);
    } catch (erro) {
        if (erro.status === 400 || erro.status === 401 || erro.status === 403) {
            feedback?.toast({ tipo: 'erro', titulo: 'Não foi possível entrar', mensagem: 'E-mail ou senha incorretos. Confira os dados e tente novamente.' });
        } else {
            avisarErroAPI(erro, 'Erro ao realizar login:');
        }
    } finally {
        autenticacaoEmAndamento = false;
        // Se o login foi bem-sucedido, não reabilite o botão durante a navegação.
        if (!loginConcluido) atualizarBotao(botao, false);
    }
}

function iniciarAutenticacao() {
    const botaoPrincipal = document.getElementById('Principal');
    const formCadastro = document.getElementById('CadastrarForms');
    const formLogin = document.getElementById('EntrarForms');
    if (!botaoPrincipal || botaoPrincipal.dataset.autenticacaoLigada === 'true') return;
    botaoPrincipal.dataset.autenticacaoLigada = 'true';

    const executar = () => {
        const cadastroAtivo = formCadastro?.classList.contains('Active');
        if (cadastroAtivo) CadastrarUsuario();
        else EntrarUsuario();
    };
    botaoPrincipal.addEventListener('click', executar);
    [formCadastro, formLogin].filter(Boolean).forEach((formulario) => {
        formulario.addEventListener('submit', (evento) => {
            evento.preventDefault();
            executar();
        });
    });
}

function CarregarNomeUsuario() {
    const label = document.getElementById('LblUsuario');
    const dadosUsuario = lerLocalStorageSeguro('DadosUsuario');
    if (!dadosUsuario) return;
    if (label) label.textContent = dadosUsuario.nome || '';
    const idUsuario = document.getElementById('idUsuario');
    if (idUsuario) idUsuario.value = dadosUsuario.id ?? '';
}

function CarregarDadosConfiguracoes() {
    const paginaAtual = window.location.pathname.split('/').pop();
    if (paginaAtual !== 'Configuracoes.html') return;

    const dadosUsuario = lerLocalStorageSeguro('DadosUsuario');
    if (!dadosUsuario) return;

    const campos = {
        Nome: dadosUsuario.nome,
        Sobrenome: dadosUsuario.sobrenome,
        CPF: dadosUsuario.cpf,
        Email: dadosUsuario.email,
        Telefone: dadosUsuario.telefone
    };
    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        elemento.value = valor ?? '';
        if (id === 'Telefone' && feedback) elemento.value = feedback.mascararTelefone(elemento.value);
        if (id === 'CPF' && feedback) elemento.value = feedback.mascararCPF(elemento.value);
    });

    const notificacaoEmail = document.getElementById('NotficacoesEmail');
    const notificacaoSMS = document.getElementById('NotficacoesSMS');
    if (notificacaoEmail) notificacaoEmail.checked = Boolean(dadosUsuario.notificacaoEmail);
    if (notificacaoSMS) notificacaoSMS.checked = Boolean(dadosUsuario.notificacaoSms);

    if (dadosUsuario.dataNascimento && typeof window.preencherDataNascimento === 'function') {
        window.preencherDataNascimento(dadosUsuario.dataNascimento);
    }
}

async function CarregarEndereco() {
    if (window.location.pathname.split('/').pop() !== 'Configuracoes.html') return;
    const dadosUsuario = lerLocalStorageSeguro('DadosUsuario');
    if (!dadosUsuario?.id) return;

    try {
        const { corpo: endereco } = await requisitarAPI(`${API_BASE_URL}/Enderecos?idUsuario=${encodeURIComponent(dadosUsuario.id)}`, {
            method: 'GET', headers: { 'Content-Type': 'application/json' }
        });
        if (!endereco || typeof endereco !== 'object') return;
        localStorage.setItem('EnderecoUsuario', JSON.stringify(endereco));
        const campos = {
            idEndereco: endereco.id,
            Rua: endereco.logradouro,
            Num: endereco.numero,
            Bairro: endereco.bairro,
            CEP: endereco.cep,
            Cidade: endereco.cidade,
            Estado: endereco.estado
        };
        Object.entries(campos).forEach(([id, valor]) => {
            const campo = document.getElementById(id);
            if (campo) campo.value = valor ?? '';
        });
        const cep = document.getElementById('CEP');
        if (cep && feedback) cep.value = feedback.mascararCEP(cep.value);
    } catch (erro) {
        console.error('Não foi possível carregar o endereço:', erro);
        feedback?.toast({ tipo: 'aviso', titulo: 'Endereço indisponível', mensagem: 'Não foi possível carregar o endereço salvo. Confira os campos antes de salvar.' });
    }
}

// Atualização de usuário e endereço: cada cache só muda após sua respectiva resposta OK.
let salvamentoConfiguracoesEmAndamento = false;
async function SalvarALteracoesEnderecoUsuario() {
    if (salvamentoConfiguracoesEmAndamento) return;
    if (!feedback?.validarConfiguracoes()) {
        feedback?.toast({ tipo: 'aviso', titulo: 'Revise os campos', mensagem: 'Preencha os dados obrigatórios e corrija as informações destacadas.' });
        return;
    }

    const dadosAtuais = lerLocalStorageSeguro('DadosUsuario');
    if (!dadosAtuais?.id) {
        feedback?.toast({ tipo: 'aviso', titulo: 'Entre na sua conta', mensagem: 'É necessário estar autenticado para atualizar seus dados.' });
        return;
    }

    const dataNascimento = feedback.validarDataNascimento().valor;
    const usuario = {
        id: document.getElementById('idUsuario').value || dadosAtuais.id,
        nome: document.getElementById('Nome').value.trim(),
        sobrenome: document.getElementById('Sobrenome').value.trim(),
        telefone: feedback.somenteDigitos(document.getElementById('Telefone').value),
        dataNascimento,
        notificacaoEmail: document.getElementById('NotficacoesEmail').checked,
        notificacaoSms: document.getElementById('NotficacoesSMS').checked
    };

    const enderecoId = document.getElementById('idEndereco').value;
    const endereco = {
        id: enderecoId || 0,
        usuarioId: dadosAtuais.id,
        logradouro: document.getElementById('Rua').value.trim(),
        numero: document.getElementById('Num').value.trim(),
        bairro: document.getElementById('Bairro').value.trim(),
        cep: feedback.somenteDigitos(document.getElementById('CEP').value),
        cidade: document.getElementById('Cidade').value.trim(),
        estado: document.getElementById('Estado').value.trim()
    };

    const botao = document.getElementById('SalvarALteracoes');
    salvamentoConfiguracoesEmAndamento = true;
    atualizarBotao(botao, true);

    const resultados = await Promise.allSettled([
        requisitarAPI(`${API_BASE_URL}/Usuarios`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(usuario)
        }),
        requisitarAPI(`${API_BASE_URL}/Enderecos`, {
            method: enderecoId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(endereco)
        })
    ]);

    const usuarioSalvo = resultados[0].status === 'fulfilled';
    const enderecoSalvo = resultados[1].status === 'fulfilled';

    if (usuarioSalvo) {
        const cacheUsuario = { ...dadosAtuais, ...usuario };
        localStorage.setItem('DadosUsuario', JSON.stringify(cacheUsuario));
        CarregarNomeUsuario();
    } else {
        console.error('Falha ao atualizar dados pessoais:', resultados[0].reason);
    }

    if (enderecoSalvo) {
        let retornoEndereco = resultados[1].value.corpo;
        // Alguns endpoints POST respondem sem corpo (por exemplo, 204). Nesse caso,
        // consulta novamente o endereço para recuperar o identificador recém-criado.
        if (!enderecoId && (!retornoEndereco || typeof retornoEndereco !== 'object' || !retornoEndereco.id)) {
            try {
                const consultaEndereco = await requisitarAPI(`${API_BASE_URL}/Enderecos?idUsuario=${encodeURIComponent(dadosAtuais.id)}`, { method: 'GET' });
                if (consultaEndereco.corpo && typeof consultaEndereco.corpo === 'object') retornoEndereco = consultaEndereco.corpo;
            } catch (erroConsulta) {
                console.warn('O endereço foi criado, mas não foi possível recuperar seu identificador:', erroConsulta);
            }
        }
        const cacheEndereco = {
            ...(lerLocalStorageSeguro('EnderecoUsuario') || {}),
            ...endereco,
            ...(retornoEndereco && typeof retornoEndereco === 'object' ? retornoEndereco : {})
        };
        localStorage.setItem('EnderecoUsuario', JSON.stringify(cacheEndereco));
        if (cacheEndereco.id) document.getElementById('idEndereco').value = cacheEndereco.id;
    } else {
        console.error('Falha ao atualizar endereço:', resultados[1].reason);
    }

    if (usuarioSalvo && enderecoSalvo) {
        feedback?.toast({ tipo: 'sucesso', titulo: 'Alterações salvas', mensagem: 'Seus dados pessoais e endereço foram atualizados.' });
    } else if (usuarioSalvo || enderecoSalvo) {
        const salvo = usuarioSalvo ? 'Os dados pessoais foram salvos' : 'O endereço foi salvo';
        const falhou = usuarioSalvo ? 'o endereço' : 'os dados pessoais';
        feedback?.toast({ tipo: 'aviso', titulo: 'Salvamento parcial', mensagem: `${salvo}, mas não foi possível atualizar ${falhou}. Confira a conexão e tente novamente.` , duracao: 6500 });
    } else {
        const erro = resultados.find((resultado) => resultado.status === 'rejected')?.reason;
        feedback?.toast({ tipo: 'erro', titulo: 'Nenhuma alteração foi salva', mensagem: erro?.message || 'Não foi possível atualizar seus dados.' , duracao: 6500 });
    }

    salvamentoConfiguracoesEmAndamento = false;
    atualizarBotao(botao, false);
}

function iniciarAcoesDeConta() {
    const botaoSalvar = document.getElementById('SalvarALteracoes');
    if (botaoSalvar && botaoSalvar.dataset.feedbackLigado !== 'true') {
        botaoSalvar.dataset.feedbackLigado = 'true';
        botaoSalvar.addEventListener('click', SalvarALteracoesEnderecoUsuario);
    }

    document.querySelectorAll('#btnSair').forEach((botaoSair) => {
        if (botaoSair.dataset.feedbackLigado === 'true') return;
        botaoSair.dataset.feedbackLigado = 'true';
        botaoSair.addEventListener('click', async (evento) => {
            evento.preventDefault();
            const confirmou = await feedback.confirmar({
                titulo: 'Sair da sua conta?',
                mensagem: 'Sua sessão será encerrada neste dispositivo. Deseja continuar?',
                confirmarTexto: 'Sair da conta',
                cancelarTexto: 'Continuar conectado',
                perigoso: true
            });
            if (!confirmou) return;
            localStorage.removeItem('DadosUsuario');
            localStorage.removeItem('EnderecoUsuario');
            localStorage.removeItem('fettuccine-carrinho');
            window.location.href = 'CadastroLogin.html';
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    CarregarNomeUsuario();
    CarregarDadosConfiguracoes();
    CarregarEndereco();
    iniciarAutenticacao();
    iniciarAcoesDeConta();
});

let categoriaSelecionada = '0';

document.addEventListener('click', function (event) {
    const botao = event.target.closest('.CategoriaButtonFilter');
    if (!botao) return;

    // Lê diretamente o atributo data-categoria sem precisar cortar strings
    categoriaSelecionada = botao.dataset.categoria;

    // Atualiza o visual do botão ativo
    document.querySelectorAll('.CategoriaButtonFilter').forEach(btn => btn.classList.remove('Active'));
    botao.classList.add('Active');

    filtrarProdutos();
});

function filtrarProdutos() {
    const produtos = document.querySelectorAll('.productCard');

    produtos.forEach(produto => {
        const categoriaDoProduto = produto.dataset.categoria;

        // Se a categoria selecionada for '0' (Todos) OU bater com a do produto, mostra
        if (categoriaSelecionada === '0' || categoriaDoProduto === categoriaSelecionada) {
            produto.style.display = ''; // Restaura o display original (block, flex, grid, etc.)
        } else {
            produto.style.display = 'none'; // Esconde o item
        }
    });
}

// 1. Escuta digitação ou setas nos inputs numéricos
if (document.getElementById('input-min') && document.getElementById('input-max')) {
    document.getElementById('input-min').addEventListener('input', filtrarProdutos);
    document.getElementById('input-max').addEventListener('input', filtrarProdutos);

    // 2. Se estiver usando noUiSlider no #slider-preco:
    const sliderPreco = document.getElementById('slider-preco');
    if (sliderPreco && sliderPreco.noUiSlider) {
        sliderPreco.noUiSlider.on('update', function (values) {
            // Atualiza os inputs com os valores do slider (caso já não faça isso)
            document.getElementById('input-min').value = Math.round(values[0]);
            document.getElementById('input-max').value = Math.round(values[1]);

            // Executa o filtro
            filtrarProdutos();
        });
    }

    function filtrarProdutos() {
        const produtos = document.querySelectorAll('.productCard');

        // Lê os valores atuais dos inputs (usa 0 e Infinity caso estejam vazios)
        const inputMin = document.getElementById('input-min').value;
        const inputMax = document.getElementById('input-max').value;

        const precoMin = inputMin !== '' ? parseFloat(inputMin) : 0;
        const precoMax = inputMax !== '' ? parseFloat(inputMax) : 250;

        produtos.forEach(produto => {
            const categoriaDoProduto = produto.dataset.categoria;
            // Lê o preço do data-preco (ou faz fallback lendo o texto da div .preco)
            const precoDoProduto = parseFloat(
                produto.dataset.preco || produto.querySelector('.preco').textContent.replace(',', '.')
            );

            // Condição 1: Categoria bate (ou é '0' = Todos)
            const passouCategoria = (categoriaSelecionada === '0' || categoriaDoProduto === categoriaSelecionada);

            // Condição 2: Preço está dentro da faixa selecionada
            const passouPreco = (precoDoProduto >= precoMin && precoDoProduto <= precoMax);

            // Só exibe se passar nos DOIS filtros simultaneamente
            if (passouCategoria && passouPreco) {
                produto.style.display = '';
            } else {
                produto.style.display = 'none';
            }
        });
    }
}

// const btnFiltrarPratos = document.getElementById('btnFiltrarPratos');

// if (btnFiltrarPratos) {
//     btnFiltrarPratos.addEventListener('click', () => {
//         FiltrarPratos();
//     });
// }


// async function FiltrarPratos() {
//     const precoMin = document.getElementById('input-min').value;
//     const precoMax = document.getElementById('input-max').value;
//     const categoriaId = categoriaSelecionada;
// }

let todosProdutos = []; // Armazena a lista vinda da API para não precisar refazer a requisição a cada clique

// 1. Busca os dados do endpoint assim que a página carrega
async function carregarProdutos() {
    const paginaAtual = window.location.pathname.split('/').pop();
    if (paginaAtual !== 'Produtos.html') return;

    try {
        const { corpo: dados } = await requisitarAPI(`${API_BASE_URL}/Produtos`, { method: 'GET' });
        if (!Array.isArray(dados)) throw new Error('A API não retornou uma lista válida de produtos.');

        // Filtra apenas os produtos disponíveis (opcional, mas recomendado)
        todosProdutos = dados.filter(produto => produto.disponivel);

        // Renderiza todos os produtos inicialmente
        renderizarProdutos();
    } catch (erro) {
        console.error('Erro ao carregar os produtos:', erro);
        const container = document.getElementById('Pratos');
        if (container) container.textContent = 'Não foi possível carregar o cardápio.';
        feedback?.toast({ tipo: 'erro', titulo: 'Cardápio indisponível', mensagem: erro.message || 'Não foi possível carregar os produtos.' });
    }
}

carregarProdutos();

// 2. Gera o HTML dos cards com base na categoria selecionada
function renderizarProdutos() {
    const containerPratos = document.getElementById('Pratos');

    // Filtra os produtos pela categoria (converte categoriaId para String para comparar com data-categoria)
    const produtosFiltrados = categoriaSelecionada === '0'
        ? todosProdutos
        : todosProdutos.filter(p => String(p.categoriaId) === categoriaSelecionada);

    // Se não houver produtos naquela categoria
    if (produtosFiltrados.length === 0) {
        containerPratos.innerHTML = '<p>Nenhum prato encontrado nesta categoria.</p>';
        return;
    }

    // Mapeia cada objeto do JSON para a sua estrutura exata de HTML
    const htmlCards = produtosFiltrados.map(produto => {
        // Formata o preço para 2 casas decimais (ex: 45.90)
        const precoFormatado = Number(produto.preco).toFixed(2);
        // Usa imagem padrão caso imagemUrl venha vazio ou nulo
        const imagem = produto.imagemUrl || 'assets/Img_01.png';

        return `
            <div class="productCard" data-categoria="${produto.categoriaId}" data-preco="${produto.preco}" data-id="${produto.id}">
                <figure>
                    <img src="${imagem}" alt="${produto.nome}">
                    <div class="preco">
                        ${precoFormatado}
                    </div>
                </figure>
                <hgroup>
                    <h1>${produto.nome}</h1>
                    <h2>${produto.descricao}</h2>
                </hgroup>
            </div>
        `;
    }).join('');

    containerPratos.innerHTML = htmlCards;
}

// 3. Evento de clique nos botões de categoria
document.addEventListener('click', function (event) {
    const botao = event.target.closest('.CategoriaButtonFilter');
    if (!botao) return;

    categoriaSelecionada = botao.dataset.categoria;

    // Atualiza o visual do botão ativo
    document.querySelectorAll('.CategoriaButtonFilter').forEach(btn => btn.classList.remove('Active'));
    botao.classList.add('Active');

    // Re-renderiza a lista filtrada instantaneamente
    renderizarProdutos();
});

const API_URL = 'https://localhost:7193';

const CATEGORIAS = {
    1: 'Entradas', 2: 'Massas', 3: 'Risotos', 4: 'Pizzas',
    5: 'Carnes', 6: 'Acompanhamentos', 7: 'Sobremesas', 8: 'Bebidas'
};

let produtoAtual = null;
async function CarregarProduto() {
    const main = document.getElementById('PaginaProduto');
    if (!main) return; // não é a página de produto

    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;

    try {
        const { corpo: p } = await requisitarAPI(`${API_URL}/Produtos/${encodeURIComponent(id)}`, { method: 'GET' });
        if (!p || typeof p !== 'object') throw new Error('A API não retornou os dados do produto.');
        produtoAtual = p;

        // Textos (textContent evita injeção de HTML vindo da API)
        document.title = `${p.nome} | Fettuccíne`;
        main.querySelector('#Detalhes hgroup h1').textContent = p.nome;
        main.querySelector('#Detalhes hgroup h2').textContent = p.descricao;

        // Categoria e preço (as duas .CategoriaDetails)
        const tags = main.querySelectorAll('#Detalhes .CategoriaDetails');
        tags[0].textContent = CATEGORIAS[p.categoriaId] ?? '';
        tags[1].textContent = p.preco.toFixed(2).replace('.', ',');

        // Tempo de preparo (último h2 da segunda .Row)
        const tempo = main.querySelectorAll('#Detalhes .Row > div')[1].querySelector('h2');
        tempo.textContent = `${p.tempoPreparoMin} min`;

        // Imagem principal
        const img = main.querySelector('#Produto img');
        img.src = p.imagemUrl;
        img.alt = p.nome;

        // Botão de compra
        const botao = document.getElementById('PorCarrinho');
        if (botao) {
            botao.dataset.id = p.id;
            botao.disabled = !p.disponivel;
        }
        const botaoFavorito = document.querySelector('.FavoriteProduct');
        if (botaoFavorito) {
            feedback?.aplicarEstadoFavorito(botaoFavorito, p.id);
            botaoFavorito.disabled = false;
        }
        // ingredientes: p.ingredientes (a estrutura atual não tem um lugar para eles)
    } catch (erro) {
        console.error('Falha ao carregar o produto:', erro);
        feedback?.toast({ tipo: 'erro', titulo: 'Produto indisponível', mensagem: erro.message || 'Não foi possível carregar os dados deste produto.' });
    }
}

const botaoFavoritoProduto = document.querySelector('.FavoriteProduct');
if (botaoFavoritoProduto) {
    botaoFavoritoProduto.type = 'button';
    botaoFavoritoProduto.disabled = true;
    botaoFavoritoProduto.addEventListener('click', () => {
        if (!produtoAtual?.id) return;
        let adicionado;
        try { adicionado = feedback?.alternarFavorito(produtoAtual.id); }
        catch (_) { return; }
        feedback?.aplicarEstadoFavorito(botaoFavoritoProduto, produtoAtual.id);
        feedback?.toast({
            tipo: 'sucesso',
            titulo: adicionado ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
            mensagem: adicionado
                ? `${produtoAtual.nome} foi salvo na sua lista de favoritos neste navegador.`
                : `${produtoAtual.nome} foi removido da sua lista de favoritos.`
        });
    });
}

CarregarProduto();

const botaoCarrinho = document.getElementById('PorCarrinho');
if (botaoCarrinho) {
    botaoCarrinho.addEventListener('click', () => {
        if (!produtoAtual || !produtoAtual.disponivel) return;
        adicionarAoCarrinho(produtoAtual);
    });
}

// ===== Compras recentes (Configuracoes.html) =====
const cacheProdutos = new Map();

function buscarProduto(id) {
    if (!cacheProdutos.has(id)) {
        cacheProdutos.set(
            id,
            fetch(`${API_URL}/Produtos/${id}`)
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
        );
    }
    return cacheProdutos.get(id);
}

// Troca só o texto, preservando o SVG/img que está ao lado
function definirTexto(elemento, texto) {
    const no = [...elemento.childNodes]
        .find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim() !== '');
    if (no) no.nodeValue = ` ${texto} `;
    else elemento.prepend(document.createTextNode(`${texto} `));
}

function criarCompraRecente(item, produto) {
    const modelo = document.getElementById('ModeloCompraRecente');
    const compra = modelo.content.firstElementChild.cloneNode(true);
    compra.dataset.produtoId = item.produtoId;

    // textContent: evita injetar HTML vindo da API
    compra.querySelector('.Prato h1').textContent = item.nomeProduto;
    compra.querySelector('.Prato hgroup > h2').textContent = produto?.descricao ?? '';

    compra.querySelector('.Prato ul').replaceChildren(
        ...String(produto?.ingredientes ?? '')
            .split(/[,;]/)
            .map((t) => t.trim().replace(/\.$/, ''))
            .filter(Boolean)
            .map((t) => {
                const li = document.createElement('li');
                li.textContent = `- ${t}`;
                return li;
            })
    );

    const img = compra.querySelector('.Prato img');
    if (produto?.imagemUrl) {
        img.src = produto.imagemUrl;
        img.alt = item.nomeProduto;
    } else {
        img.remove(); // sem dados do produto, não mostra a imagem do molde
    }

    compra.querySelector('.Details .preco').textContent = item.subtotal.toFixed(2);

    // h2[0] = nota (fica como está), h2[1] = "N un", h2[2] = "65.00 / un"
    const [, quantidade, unitario] = compra.querySelectorAll('.Details hgroup > h2');
    definirTexto(quantidade, `${item.quantidade} un`);
    definirTexto(unitario, `${item.precoUnitario.toFixed(2)} / un`);

    return compra;
}

async function CarregarComprasRecentes() {
    const container = document.getElementById('ComprasRecentes');
    const modelo = document.getElementById('ModeloCompraRecente');
    if (!container || !modelo) return; // não é a tela de configurações

    const usuario = lerLocalStorageSeguro('DadosUsuario');
    if (!usuario?.id) return;

    try {
        const { corpo: pedidos } = await requisitarAPI(`${API_URL}/Pedidos?idUsuario=${encodeURIComponent(usuario.id)}`, { method: 'GET' });
        if (!Array.isArray(pedidos)) throw new Error('A API não retornou uma lista válida de pedidos.');

        if (pedidos.length === 0) {
            const vazio = document.createElement('h2');
            vazio.textContent = 'Você ainda não fez pedidos.';
            container.replaceChildren(vazio);
            return;
        }

        // Busca cada produto uma única vez
        const ids = [...new Set(pedidos.flatMap((p) => p.itensPedidos.map((i) => i.produtoId)))];
        const produtos = new Map(await Promise.all(ids.map(async (id) => [id, await buscarProduto(id)])));

        // Mais recentes primeiro
        pedidos.sort((a, b) => new Date(b.realizadoEm) - new Date(a.realizadoEm));

        // dd/MM/yyyy no fuso do navegador
        const formatarDataPedido = (iso) =>
            new Date(iso).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

        container.replaceChildren(
            ...pedidos.map((pedido, indice) => {
                const div = document.createElement('div');
                div.className = 'Pedidos';
                div.dataset.pedidoId = pedido.id;

                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'PedidoToggle';
                toggle.textContent = `Data do Pedido: ${formatarDataPedido(pedido.realizadoEm)}`;

                const itens = document.createElement('div');
                itens.className = 'PedidoItens';
                itens.append(
                    ...pedido.itensPedidos.map((item) =>
                        criarCompraRecente(item, produtos.get(item.produtoId)))
                );

                const aberto = indice === 0; // o pedido mais recente já abre aberto
                div.classList.toggle('aberto', aberto);
                toggle.setAttribute('aria-expanded', String(aberto));

                div.append(toggle, itens);
                return div;
            })
        );

        // Um único listener para todos os pedidos
        container.addEventListener('click', (event) => {
            const toggle = event.target.closest('.PedidoToggle');
            if (!toggle) return;
            const aberto = toggle.closest('.Pedidos').classList.toggle('aberto');
            toggle.setAttribute('aria-expanded', String(aberto));
        });
    } catch (erro) {
        console.error('Falha ao carregar as compras recentes:', erro);
        feedback?.toast({ tipo: 'erro', titulo: 'Pedidos indisponíveis', mensagem: erro.message || 'Não foi possível carregar suas compras recentes.' });
    }
}

CarregarComprasRecentes();