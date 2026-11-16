// Tema claro / escuro — lógica centralizada.
// Carregado de forma síncrona no <head> de TODAS as páginas, antes da renderização,
// para aplicar o tema salvo sem "flash" do tema errado.
//   - Escuro (padrão): nenhum atributo é necessário no <html>.
//   - Claro: <html data-tema="claro">; as cores vêm das variáveis semânticas em style.css.
(function () {
    'use strict';

    var CHAVE = 'fettuccine-tema';
    var raiz = document.documentElement;

    function lerPreferencia() {
        try {
            return localStorage.getItem(CHAVE) === 'claro' ? 'claro' : 'escuro';
        } catch (e) {
            return 'escuro'; // localStorage indisponível (modo privado, bloqueio etc.)
        }
    }

    function aplicar(tema) {
        if (tema === 'claro') {
            raiz.setAttribute('data-tema', 'claro');
        } else {
            raiz.removeAttribute('data-tema');
        }
    }

    function salvar(tema) {
        try {
            if (tema === 'claro') {
                localStorage.setItem(CHAVE, 'claro');
            } else {
                localStorage.removeItem(CHAVE); // sem preferência salva = escuro (padrão)
            }
        } catch (e) { /* sem persistência, mas o tema continua aplicado nesta página */ }
    }

    // 1) Aplica imediatamente, antes de qualquer pintura.
    aplicar(lerPreferencia());

    // 2) Sincroniza o checkbox de Configuracoes.html (se existir na página).
    function sincronizarCheckbox() {
        var caixa = document.getElementById('Darkmode');
        if (!caixa) return;
        caixa.checked = raiz.getAttribute('data-tema') === 'claro';
        if (caixa.dataset.temaLigado) return;
        caixa.dataset.temaLigado = 'true';
        caixa.addEventListener('change', function () {
            var tema = caixa.checked ? 'claro' : 'escuro';
            aplicar(tema);
            salvar(tema);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sincronizarCheckbox);
    } else {
        sincronizarCheckbox();
    }

    // 3) Mantém tudo coerente ao voltar pelo histórico (bfcache) e entre abas abertas.
    window.addEventListener('pageshow', function () {
        aplicar(lerPreferencia());
        sincronizarCheckbox();
    });
    window.addEventListener('storage', function (evento) {
        if (evento.key === CHAVE || evento.key === null) {
            aplicar(lerPreferencia());
            sincronizarCheckbox();
        }
    });
})();
