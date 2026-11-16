/* ============================================================
   Fettuccíne — validação, máscaras, notificações e confirmações
   JavaScript puro; compatível com os tokens dos temas do style.css.
   ============================================================ */
(function () {
    'use strict';

    const CHAVE_FAVORITOS = 'fettuccine-favoritos';

    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }

    function obterContainerToasts() {
        let container = document.getElementById('FettuccineToasts');
        if (!container) {
            container = criarElemento('div', 'FettuccineToasts');
            container.id = 'FettuccineToasts';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-relevant', 'additions text');
            container.setAttribute('aria-atomic', 'false');
            document.body.appendChild(container);
        }
        return container;
    }

    function toast({ tipo = 'aviso', titulo = '', mensagem = '', duracao = 4500 } = {}) {
        const container = obterContainerToasts();
        const item = criarElemento('section', `FettuccineToast ${tipo}`);
        item.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');

        const conteudo = criarElemento('div', 'FettuccineToastConteudo');
        if (titulo) conteudo.appendChild(criarElemento('strong', 'FettuccineToastTitulo', titulo));
        conteudo.appendChild(criarElemento('p', 'FettuccineToastMensagem', mensagem));

        const fechar = criarElemento('button', 'FettuccineToastFechar', '×');
        fechar.type = 'button';
        fechar.setAttribute('aria-label', 'Fechar notificação');
        fechar.addEventListener('click', () => removerToast(item));

        item.append(conteudo, fechar);
        container.appendChild(item);
        requestAnimationFrame(() => item.classList.add('visivel'));

        const temporizador = window.setTimeout(() => removerToast(item), duracao);
        item._temporizador = temporizador;
        return item;
    }

    function removerToast(item) {
        if (!item || item.classList.contains('saindo')) return;
        window.clearTimeout(item._temporizador);
        item.classList.add('saindo');
        item.classList.remove('visivel');
        item.addEventListener('transitionend', () => item.remove(), { once: true });
        window.setTimeout(() => item.remove(), 350);
    }

    function confirmar({
        titulo = 'Confirme esta ação',
        mensagem = '',
        confirmarTexto = 'Confirmar',
        cancelarTexto = 'Cancelar',
        perigoso = false
    } = {}) {
        return new Promise((resolve) => {
            const anterior = document.getElementById('FettuccineModalOverlay');
            if (anterior) anterior.remove();

            const overlay = criarElemento('div', 'FettuccineModalOverlay');
            overlay.id = 'FettuccineModalOverlay';
            const dialogo = criarElemento('section', 'FettuccineModal');
            dialogo.setAttribute('role', 'dialog');
            dialogo.setAttribute('aria-modal', 'true');
            dialogo.setAttribute('aria-labelledby', 'FettuccineModalTitulo');
            dialogo.setAttribute('aria-describedby', 'FettuccineModalMensagem');

            const cabecalho = criarElemento('div', 'FettuccineModalCabecalho');
            const tituloElemento = criarElemento('h2', '', titulo);
            tituloElemento.id = 'FettuccineModalTitulo';
            cabecalho.appendChild(tituloElemento);

            const texto = criarElemento('p', 'FettuccineModalMensagem', mensagem);
            texto.id = 'FettuccineModalMensagem';

            const acoes = criarElemento('div', 'FettuccineModalAcoes');
            const cancelar = criarElemento('button', 'FettuccineModalCancelar', cancelarTexto);
            cancelar.type = 'button';
            const aceitar = criarElemento('button', `FettuccineModalConfirmar${perigoso ? ' perigoso' : ''}`, confirmarTexto);
            aceitar.type = 'button';
            acoes.append(cancelar, aceitar);
            dialogo.append(cabecalho, texto, acoes);
            overlay.appendChild(dialogo);
            document.body.appendChild(overlay);

            let finalizado = false;
            const concluir = (valor) => {
                if (finalizado) return;
                finalizado = true;
                document.removeEventListener('keydown', tratarTecla);
                overlay.classList.remove('visivel');
                window.setTimeout(() => overlay.remove(), 220);
                resolve(valor);
            };
            const tratarTecla = (evento) => {
                if (evento.key === 'Escape') concluir(false);
                if (evento.key === 'Tab') {
                    const focaveis = [...dialogo.querySelectorAll('button:not(:disabled)')];
                    if (evento.shiftKey && document.activeElement === focaveis[0]) {
                        evento.preventDefault(); focaveis[focaveis.length - 1].focus();
                    } else if (!evento.shiftKey && document.activeElement === focaveis[focaveis.length - 1]) {
                        evento.preventDefault(); focaveis[0].focus();
                    }
                }
            };

            cancelar.addEventListener('click', () => concluir(false));
            aceitar.addEventListener('click', () => concluir(true));
            overlay.addEventListener('click', (evento) => {
                if (evento.target === overlay) concluir(false);
            });
            document.addEventListener('keydown', tratarTecla);
            requestAnimationFrame(() => {
                overlay.classList.add('visivel');
                cancelar.focus();
            });
        });
    }

    function somenteDigitos(valor) {
        return String(valor ?? '').replace(/\D/g, '');
    }

    function mascararCPF(valor) {
        const d = somenteDigitos(valor).slice(0, 11);
        if (d.length <= 3) return d;
        if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
        if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
        return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    }

    function mascararCEP(valor) {
        const d = somenteDigitos(valor).slice(0, 8);
        return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    }

    function mascararTelefone(valor) {
        const d = somenteDigitos(valor).slice(0, 11);
        if (!d) return '';
        if (d.length <= 2) return `(${d}`;
        const ddd = d.slice(0, 2);
        const numero = d.slice(2);
        if (numero.length <= 4) return `(${ddd}) ${numero}`;
        if (d.length <= 10) return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
        return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
    }

    function aplicarMascara(campo, formatador) {
        if (!campo || campo.dataset.mascaraAplicada === 'true') return;
        campo.dataset.mascaraAplicada = 'true';
        campo.addEventListener('input', () => {
            const inicio = campo.selectionStart ?? campo.value.length;
            const digitosAntes = somenteDigitos(campo.value.slice(0, inicio)).length;
            const formatado = formatador(campo.value);
            if (campo.value === formatado) return;
            campo.value = formatado;
            let posicao = 0;
            let contagem = 0;
            while (posicao < formatado.length && contagem < digitosAntes) {
                if (/\d/.test(formatado[posicao])) contagem++;
                posicao++;
            }
            campo.setSelectionRange(posicao, posicao);
        });
        campo.value = formatador(campo.value);
    }

    function cpfValido(valor) {
        const cpf = somenteDigitos(valor);
        if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;
        const calcular = (base, pesoInicial) => {
            let soma = 0;
            for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
            const resto = (soma * 10) % 11;
            return resto === 10 ? 0 : resto;
        };
        return calcular(cpf.slice(0, 9), 10) === Number(cpf[9])
            && calcular(cpf.slice(0, 10), 11) === Number(cpf[10]);
    }

    function emailValido(valor) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor ?? '').trim());
    }

    function telefoneValido(valor) {
        const d = somenteDigitos(valor);
        if (d.length === 10) return d.slice(0, 2) !== '00' && /^[2-5]\d{7}$/.test(d.slice(2));
        if (d.length === 11) return d.slice(0, 2) !== '00' && /^9\d{8}$/.test(d.slice(2));
        return false;
    }

    function obterMensagemErro(campo) {
        const valor = campo.type === 'checkbox' ? campo.checked : String(campo.value ?? '').trim();
        if (campo.required && (campo.type === 'checkbox' ? !valor : !valor)) {
            return campo.id === 'Termos'
                ? 'Aceite os termos de uso para continuar.'
                : 'Este campo é obrigatório.';
        }
        if (!valor) return '';

        if (campo.id === 'CPF' && !cpfValido(campo.value)) return 'Digite um CPF válido.';
        if (campo.id === 'Email' || campo.id === 'Login') {
            if (!emailValido(campo.value)) return 'Digite um endereço de e-mail válido.';
        }
        if (campo.id === 'Telefone' && !telefoneValido(campo.value)) {
            return 'Informe um telefone válido com DDD (10 ou 11 números).';
        }
        if (campo.id === 'CEP' && somenteDigitos(campo.value).length !== 8) return 'Informe um CEP válido com 8 números.';
        if (campo.type === 'email' && !emailValido(campo.value)) return 'Digite um endereço de e-mail válido.';
        if (!campo.checkValidity()) return campo.validationMessage || 'Verifique este campo.';
        return '';
    }

    function campoDaMensagem(campo) {
        const id = campo.id || `campo-${Math.random().toString(36).slice(2)}`;
        let mensagem = campo.parentElement?.querySelector(`.FettuccineErroCampo[data-campo="${id}"]`);
        if (!mensagem) {
            mensagem = criarElemento('small', 'FettuccineErroCampo');
            mensagem.dataset.campo = id;
            mensagem.id = `${id}-erro`;
            mensagem.setAttribute('role', 'alert');
            mensagem.setAttribute('aria-live', 'polite');
            const wrapper = campo.closest('.InputWrapper, .RowWrapper') || campo.parentElement;
            wrapper?.appendChild(mensagem);
        }
        campo.setAttribute('aria-describedby', mensagem.id);
        return mensagem;
    }

    function limparErro(campo) {
        if (!campo) return;
        campo.classList.remove('FettuccineCampoInvalido');
        campo.removeAttribute('aria-invalid');
        const mensagem = campo.parentElement?.querySelector(`.FettuccineErroCampo[data-campo="${campo.id}"]`)
            || campo.closest('.InputWrapper, .RowWrapper')?.querySelector(`.FettuccineErroCampo[data-campo="${campo.id}"]`);
        if (mensagem) mensagem.remove();
        campo.removeAttribute('aria-describedby');
    }

    function validarCampos(ids) {
        let primeiroInvalido = null;
        let valido = true;
        ids.forEach((id) => {
            const campo = document.getElementById(id);
            if (!campo || campo.readOnly || campo.disabled) return;
            const mensagemErro = obterMensagemErro(campo);
            if (mensagemErro) {
                valido = false;
                campo.classList.add('FettuccineCampoInvalido');
                campo.setAttribute('aria-invalid', 'true');
                campoDaMensagem(campo).textContent = mensagemErro;
                if (!primeiroInvalido) primeiroInvalido = campo;
            } else {
                limparErro(campo);
            }
        });
        if (primeiroInvalido) {
            primeiroInvalido.focus({ preventScroll: false });
            primeiroInvalido.closest('.InputWrapper, .RowWrapper')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return valido;
    }

    function validarCadastro() {
        const valido = validarCampos(['Nome', 'Sobrenome', 'CPF', 'Email', 'Telefone', 'Senha', 'ConfirmarSenha', 'Termos']);
        const senha = document.getElementById('Senha');
        const confirmarSenha = document.getElementById('ConfirmarSenha');
        if (senha && confirmarSenha && senha.value !== confirmarSenha.value) {
            confirmarSenha.classList.add('FettuccineCampoInvalido');
            confirmarSenha.setAttribute('aria-invalid', 'true');
            campoDaMensagem(confirmarSenha).textContent = 'As senhas não coincidem.';
            confirmarSenha.focus();
            return false;
        }
        return valido;
    }

    function validarLogin() {
        return validarCampos(['Login', 'LoginSenha']);
    }

    function validarDataNascimento() {
        const dia = document.getElementById('DayInputNativo')?.value ?? '';
        const mes = document.getElementById('MonthInputNativo')?.value ?? '';
        const ano = document.getElementById('YearInputNativo')?.value ?? '';
        const preenchidos = [dia, mes, ano].filter(Boolean).length;
        if (preenchidos === 0) return { valida: true, valor: null };
        if (preenchidos !== 3) return { valida: false, valor: null };

        const d = Number(dia), m = Number(mes), a = Number(ano);
        const data = new Date(a, m - 1, d);
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        const valida = data.getFullYear() === a && data.getMonth() === m - 1
            && data.getDate() === d && data <= hoje;
        return { valida, valor: valida ? `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null };
    }

    function validarConfiguracoes() {
        const camposValidos = validarCampos(['Nome', 'Sobrenome', 'Telefone', 'Rua', 'Num', 'Bairro', 'CEP', 'Cidade', 'Estado']);
        const data = validarDataNascimento();
        const containerData = document.getElementById('BirthDate');
        let dataValida = true;
        if (!data.valida && containerData) {
            dataValida = false;
            let erro = containerData.querySelector('.FettuccineErroCampo[data-campo="BirthDate"]');
            if (!erro) {
                erro = criarElemento('small', 'FettuccineErroCampo');
                erro.dataset.campo = 'BirthDate';
                erro.setAttribute('role', 'alert');
                erro.setAttribute('aria-live', 'polite');
                containerData.appendChild(erro);
            }
            erro.textContent = 'Informe dia, mês e ano corretamente ou deixe a data em branco.';
            containerData.setAttribute('aria-invalid', 'true');
        } else if (containerData) {
            containerData.removeAttribute('aria-invalid');
            containerData.querySelector('.FettuccineErroCampo[data-campo="BirthDate"]')?.remove();
        }
        return camposValidos && dataValida;
    }

    function iniciarValidacoes() {
        const campos = {
            CPF: { formatador: mascararCPF, tipo: 'text', maxLength: 14 },
            CEP: { formatador: mascararCEP, tipo: 'text', maxLength: 9 },
            Telefone: { formatador: mascararTelefone, tipo: 'tel', maxLength: 15 }
        };
        Object.entries(campos).forEach(([id, config]) => {
            const campo = document.getElementById(id);
            if (!campo) return;
            campo.type = config.tipo;
            campo.inputMode = 'numeric';
            campo.maxLength = config.maxLength;
            campo.autocomplete = id === 'Telefone' ? 'tel' : 'off';
            aplicarMascara(campo, config.formatador);
        });

        const emailCadastro = document.getElementById('Email');
        if (emailCadastro) {
            emailCadastro.type = 'email';
            emailCadastro.inputMode = 'email';
            emailCadastro.autocomplete = 'email';
        }
        const login = document.getElementById('Login');
        if (login) { login.type = 'email'; login.autocomplete = 'username'; }
        ['Senha', 'ConfirmarSenha', 'LoginSenha'].forEach((id) => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.type = 'password';
                campo.autocomplete = id === 'LoginSenha' ? 'current-password' : 'new-password';
            }
        });

        const obrigatorios = [
            'Nome', 'Sobrenome', 'CPF', 'Email', 'Telefone', 'Senha', 'ConfirmarSenha', 'Termos',
            'Login', 'LoginSenha', 'Rua', 'Num', 'Bairro', 'CEP', 'Cidade', 'Estado'
        ];
        obrigatorios.forEach((id) => {
            const campo = document.getElementById(id);
            if (campo && !campo.readOnly && !campo.disabled) campo.required = true;
        });
        ['Nome', 'Sobrenome', 'Rua', 'Bairro', 'Cidade', 'Estado'].forEach((id) => {
            const campo = document.getElementById(id);
            if (campo) campo.autocomplete = 'on';
        });
        const numero = document.getElementById('Num');
        if (numero) { numero.inputMode = 'numeric'; numero.maxLength = 10; }

        document.addEventListener('input', (evento) => {
            const campo = evento.target;
            if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement)) return;
            if (campo.id) limparErro(campo);
            if (campo.id === 'Senha') limparErro(document.getElementById('ConfirmarSenha'));
            if (campo.id === 'ConfirmarSenha' || campo.id === 'Senha') {
                const senha = document.getElementById('Senha');
                const confirmarSenha = document.getElementById('ConfirmarSenha');
                if (senha && confirmarSenha && senha.value === confirmarSenha.value) limparErro(confirmarSenha);
            }
        });
        document.addEventListener('change', (evento) => {
            const campo = evento.target;
            if (campo?.id) limparErro(campo);
            if (campo?.id?.endsWith('InputNativo')) {
                const nascimento = document.getElementById('BirthDate');
                nascimento?.querySelector('.FettuccineErroCampo[data-campo="BirthDate"]')?.remove();
                nascimento?.removeAttribute('aria-invalid');
            }
        });
    }

    function lerFavoritos() {
        try {
            const valor = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS) || '[]');
            return Array.isArray(valor) ? valor.map(String) : [];
        } catch (_) { return []; }
    }

    function alternarFavorito(id) {
        const chave = String(id);
        const favoritos = lerFavoritos();
        const indice = favoritos.indexOf(chave);
        const adicionado = indice === -1;
        if (adicionado) favoritos.push(chave);
        else favoritos.splice(indice, 1);
        try { localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos)); }
        catch (erro) { toast({ tipo: 'erro', titulo: 'Favoritos indisponíveis', mensagem: 'O navegador não permitiu salvar sua lista de favoritos.' }); throw erro; }
        return adicionado;
    }

    function aplicarEstadoFavorito(botao, id) {
        const ativo = lerFavoritos().includes(String(id));
        botao.classList.toggle('FavoritoAtivo', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
        botao.setAttribute('aria-label', ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
        return ativo;
    }

    const API = {
        toast,
        confirmar,
        somenteDigitos,
        mascararCPF,
        mascararCEP,
        mascararTelefone,
        cpfValido,
        emailValido,
        telefoneValido,
        validarCampos,
        validarCadastro,
        validarLogin,
        validarConfiguracoes,
        validarDataNascimento,
        lerFavoritos,
        alternarFavorito,
        aplicarEstadoFavorito
    };

    window.FettuccineFeedback = API;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarValidacoes, { once: true });
    else iniciarValidacoes();
})();
