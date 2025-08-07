// =================================================================================
// MÓDULO DE AUTENTICAÇÃO E CONFIGURAÇÃO (Firebase)
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ALERTA DE SEGURANÇA !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// SUAS CHAVES NUNCA DEVEM SER EXPOSTAS DIRETAMENTE NO CÓDIGO.
// 1. No Console do Google Cloud, restrinja o uso desta API Key para o domínio do seu site.
// 2. No Console do Firebase, ative o App Check para proteger contra abuso.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const firebaseConfig = {
    apiKey: "AIzaSyCkzX_5GuNjizbbgzWNgYx3hvEhj2Hr3pM",
    authDomain: "prevtech-ca050.firebaseapp.com",
    projectId: "prevtech-ca050",
    storageBucket: "prevtech-ca050.firebasestorage.app",
    messagingSenderId: "847747677288",
    appId: "1:847747677288:web:f1efa50e9e8b93e60bcfdd"
};

const app = initializeApp(firebaseConfig);
const _auth = getAuth(app);
const provider = new GoogleAuthProvider();

const EMAILS_AUTORIZADOS = ["domingosbarroson@gmail.com", "setordebeneficiositaprev@gmail.com"].map(e => e.toLowerCase());
const ADMIN_EMAILS = ["domingosbarroson@gmail.com"].map(e => e.toLowerCase());

const AppState = {
    usuarioAtual: null,
    salarioChart: null,
    simulacaoResultados: {},
    dashboardViewMode: 'meus_registros',
    currentStep: 1,
    loadTimeoutId: null // NOVO: Para controlar carregamentos em segundo plano
};

const auth = {
    loginGoogle: async () => {
        try {
            await signInWithPopup(_auth, provider);
        } catch (err) {
            console.error("Erro no popup de login Google:", err);
            const msg = err.code === 'auth/popup-closed-by-user' ? 'A janela de login foi fechada.' : 'Erro ao autenticar com Google.';
            ui.showToast(msg, false);
        }
    },
    logout: async () => {
        try {
            await signOut(_auth);
            window.location.reload();
        } catch (err) {
            console.error("Erro ao fazer logout:", err);
            ui.showToast("Erro ao tentar sair.", false);
        }
    },
    init: () => {
        onAuthStateChanged(_auth, (user) => {
            if (user) {
                const email = (user.email || "").toLowerCase();
                if (!EMAILS_AUTORIZADOS.includes(email)) {
                    ui.showToast("⚠️ E-mail não autorizado para acessar o sistema.", false);
                    signOut(_auth);
                    return;
                }
                AppState.usuarioAtual = {
                    uid: user.uid,
                    email: email,
                    displayName: user.displayName || email,
                    tipo: ADMIN_EMAILS.includes(email) ? "admin" : "comum",
                };
                ui.showApp();
                initSistemaPosLogin();
            } else {
                AppState.usuarioAtual = null;
                ui.showLogin();
            }
        });
    }
};

const ui = {
    showToast: (text, isSuccess = true) => {
        Toastify({ text, duration: 3500, close: true, gravity: "top", position: "right", stopOnFocus: true, style: { background: isSuccess ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)", }}).showToast();
    },
    toggleSpinner: (button, show) => {
        if (button) {
            button.disabled = show;
            button.classList.toggle('button-loading', show);
        }
    },
    updateUserInfo: () => {
        if (!AppState.usuarioAtual) return;
        const { displayName, tipo } = AppState.usuarioAtual;
        const userInitial = displayName.substring(0, 2).toUpperCase();
        document.getElementById("usuarioLogado").innerText = displayName;
        document.getElementById("usuarioLogadoSidebar").innerText = displayName;
        document.getElementById("usuarioTipoSidebar").innerText = tipo === "admin" ? "Administrador" : "Usuário Comum";
        document.getElementById("user-avatar").innerText = userInitial;
    },
    showLogin: () => {
        document.getElementById("telaLogin").style.display = "flex";
        document.querySelector(".app-container").style.display = "none";
        document.getElementById("floating-buttons-container").style.display = "none";
    },
    showApp: () => {
        document.getElementById("telaLogin").style.display = "none";
        document.querySelector(".app-container").style.display = "flex";
        document.getElementById("floating-buttons-container").style.display = "flex";
    },
    showView: (viewId) => {
        const views = ['dashboard', 'calculadora', 'geradorCTC', 'telaLegislacao', 'telaCadastro', 'telaProcessos', 'telaFinanceiro', 'telaRelatorios', 'telaUsuarios'];
        views.forEach(id => {
            const viewElement = document.getElementById(id);
            if (viewElement) viewElement.style.display = 'none';
        });
        const viewToShow = document.getElementById(viewId);
        if (viewToShow) viewToShow.style.display = 'block';
    },
    updateActiveNav: (targetView) => {
        document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
        const activeLink = document.querySelector(`#main-nav a[onclick*="'${targetView}'"]`);
        if (activeLink) activeLink.classList.add('active');
    }
};

const EXPECTATIVA_SOBREVIDA_IBGE = { M: { 55: 25.5, 56: 24.7, 57: 23.9, 58: 23.1, 59: 22.3, 60: 21.6, 61: 20.8, 62: 20.1, 63: 19.4, 64: 18.7, 65: 18.0 }, F: { 52: 30.1, 53: 29.2, 54: 28.4, 55: 27.5, 56: 26.7, 57: 25.8, 58: 25.0, 59: 24.1, 60: 23.3, 61: 22.5, 62: 21.7 } };

document.addEventListener("DOMContentLoaded", auth.init);

function initSistemaPosLogin() {
    ui.updateUserInfo();
    setupEventListeners();
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000 * 60);
    const isAdmin = AppState.usuarioAtual.tipo === 'admin';
    document.getElementById('admin-section-title').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-nav-item').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-dashboard-controls').style.display = isAdmin ? 'flex' : 'none';
    if (localStorage.getItem("temaEscuro") === "sim") {
        document.body.classList.add('dark-mode');
        document.querySelector("#toggleTheme i").className = 'ri-sun-line';
    }
    handleNavClick(null, 'dashboard');
}

function setupEventListeners() {
    const accToggle = document.querySelector("#passo2 .accordion-toggle");
    if (accToggle) accToggle.addEventListener("click", () => {
        accToggle.classList.toggle("active");
        const content = accToggle.nextElementSibling;
        content.style.maxHeight = content.style.maxHeight ? null : `${content.scrollHeight}px`;
    });
    const cpfInput = document.getElementById('cpfServidor');
    if (cpfInput) cpfInput.addEventListener('input', (e) => validaCPF(e.target, document.getElementById('cpf-status')));
    const ctcCpfInput = document.getElementById('ctc-cpf');
    if(ctcCpfInput) ctcCpfInput.addEventListener('input', (e) => validaCPF(e.target, document.getElementById('ctc-cpf-status')));

    // Eventos para a calculadora de tempo no dashboard
    const btnCalcTempo = document.getElementById('btn-calcular-tempo');
    if (btnCalcTempo) btnCalcTempo.addEventListener('click', calcularTempoEntreDatas);
    const btnLimparTempo = document.getElementById('btn-limpar-tempo');
    if (btnLimparTempo) btnLimparTempo.addEventListener('click', limparCalculoTempo);
}

function handleNavClick(event, targetView) {
    if (event) event.preventDefault();
    // CORREÇÃO 1: Cancela carregamentos pendentes para evitar inconsistência de tela
    if (AppState.loadTimeoutId) {
        clearTimeout(AppState.loadTimeoutId);
        AppState.loadTimeoutId = null;
    }
    ui.updateActiveNav(targetView);
    ui.showView(targetView);
    switch (targetView) {
        case 'dashboard':
            listarHistorico();
            listarCTCsSalvas();
            break;
        case 'calculadora': // Renomeado para 'calculadora' para corresponder ao HTML
            limparFormularioCompleto();
            irParaPasso(1);
            break;
        case 'geradorCTC': // Renomeado para corresponder ao HTML
            limparFormularioCTC();
            break;
    }
}

// ... (O restante das funções permanece aqui, com as modificações aplicadas abaixo)

// ========================================================================
// CORREÇÃO 3: Lógica de Cálculo da Média (EC 103/2019 - 100% dos salários)
// ========================================================================
function calcularMediaSalarial() {
    const salariosValidos = [];
    document.querySelectorAll("#corpo-tabela tr").forEach(tr => {
        const mesAnoInput = tr.querySelector("input[type='text']");
        const salarioAtualizadoInput = tr.querySelector(".atualizado");
        const mesAno = mesAnoInput ? mesAnoInput.value : '';
        const valorAtualizado = salarioAtualizadoInput ? parseFloat(salarioAtualizadoInput.value) : 0;
        if (valorAtualizado > 0 && /^\d{2}\/\d{4}$/.test(mesAno)) {
            salariosValidos.push({ label: mesAno, value: valorAtualizado });
        }
    });

    if (salariosValidos.length === 0) {
        return { media: 0, soma: 0, totalSalarios: 0, salarios: [] };
    }

    // REGRA DE 100% (EC 103/2019): Soma todos os salários válidos
    const somaTotal = salariosValidos.reduce((acc, s) => acc + s.value, 0);
    const media = somaTotal / salariosValidos.length;
    
    return { 
        media: media, 
        soma: somaTotal,
        totalSalarios: salariosValidos.length,
        salarios: salariosValidos // Retorna todos para o gráfico
    };
}


// ========================================================================
// CORREÇÃO 2: Lógica de Cálculo de Benefício Unificada e Corrigida
// ========================================================================
function calcularBeneficio(navegar = true, botao = null) {
    const tipoBeneficio = document.getElementById('tipoBeneficio').value;
    if (tipoBeneficio === 'voluntaria') {
        if (!document.getElementById('dataNascimento').value || !document.getElementById('dataAdmissao').value) {
            return ui.showToast("Preencha Data de Nascimento e Admissão.", false);
        }
    }

    ui.toggleSpinner(botao, true);
    
    setTimeout(() => {
        try {
            const resultadoDiv = document.getElementById('resultado');
            const resumoMediaDiv = document.getElementById('resultado-resumo-media');
            const resumoTempoDiv = document.getElementById('resultado-resumo-tempo');
            
            let valorBeneficioFinal = 0;
            let descricaoCalculo = '';
            let mediaResultados = { media: 0 };
            
            AppState.simulacaoResultados = {};
            resultadoDiv.innerHTML = '';
            resumoMediaDiv.innerHTML = '';
            resumoTempoDiv.innerHTML = '';

            // 1. CALCULAR MÉDIA SALARIAL (AGORA USANDO A REGRA DE 100%)
            if (tipoBeneficio !== 'pensao_aposentado') {
                mediaResultados = calcularMediaSalarial();
                AppState.simulacaoResultados.salariosParaGrafico = mediaResultados.salarios;
                resumoMediaDiv.innerHTML = `
                    <h4>Resumo do Cálculo da Média (100% dos Salários)</h4>
                    <p>Total de salários de contribuição: <strong>${mediaResultados.totalSalarios}</strong></p>
                    <p>Soma de todos os salários: <strong>${formatarDinheiro(mediaResultados.soma)}</strong></p>
                    <p style="font-weight:bold;">Média Apurada (EC 103/2019): ${formatarDinheiro(mediaResultados.media)}</p>
                `;
            }

            const isAposentadoria = tipoBeneficio === 'voluntaria' || tipoBeneficio === 'incapacidade';
            const isPensao = tipoBeneficio === 'pensao_ativo' || tipoBeneficio === 'pensao_aposentado';

            // 2. APLICAR LÓGICA ESPECÍFICA DO BENEFÍCIO
            if (isAposentadoria) {
                // Para aposentadorias, sempre projetamos as regras
                const regrasElegibilidade = projetarAposentadoria(mediaResultados.media);
                
                // Exibe o resumo de tempo e as regras
                resumoTempoDiv.innerHTML = regrasElegibilidade.html;
                AppState.simulacaoResultados.fundamentoLegal = regrasElegibilidade.fundamentoLegal;
                
                if (tipoBeneficio === 'voluntaria') {
                    // O valor do benefício é determinado pela melhor regra CUMPRIDA
                    valorBeneficioFinal = regrasElegibilidade.valorBeneficio;
                    descricaoCalculo = `Benefício calculado com base na regra de elegibilidade aplicável: <strong>${regrasElegibilidade.regraAplicada || 'Nenhuma regra cumprida'}</strong>.`;
                    verificarAbonoPermanencia();
                } else { // Incapacidade
                    valorBeneficioFinal = calculateTotalProventos(); // Usa a tabela de proventos para incapacidade
                    descricaoCalculo = `O valor do benefício por incapacidade é composto pelo somatório dos proventos detalhados.`;
                }

            } else { // Lógica de Pensão
                const numDependentes = document.getElementById('corpo-tabela-dependentes').rows.length;
                const cotaPensao = Math.min(0.5 + numDependentes * 0.1, 1.0);

                if (tipoBeneficio === 'pensao_ativo') {
                    valorBeneficioFinal = mediaResultados.media * cotaPensao;
                    descricaoCalculo = `Cota de ${(cotaPensao * 100).toFixed(0)}% sobre a média salarial de ${formatarDinheiro(mediaResultados.media)}.`;
                } else if (tipoBeneficio === 'pensao_aposentado') {
                    const proventoBruto = parseFloat(document.getElementById('proventoAposentado').value) || 0;
                    valorBeneficioFinal = proventoBruto * cotaPensao;
                    descricaoCalculo = `Cota de ${(cotaPensao * 100).toFixed(0)}% sobre o provento de ${formatarDinheiro(proventoBruto)}.`;
                }
            }

            // 3. ATUALIZAR ESTADO E INTERFACE
            AppState.simulacaoResultados = {
                ...AppState.simulacaoResultados,
                mediaSalarial: mediaResultados.media,
                valorBeneficioFinal: valorBeneficioFinal,
                tipo: document.querySelector("#tipoBeneficio option:checked").text,
                descricao: descricaoCalculo
            };
            
            resultadoDiv.innerHTML = `
                <h3>Resultado do Cálculo (Bruto)</h3>
                <p><b>Tipo de Benefício:</b> ${AppState.simulacaoResultados.tipo}</p>
                <p><b>Descrição do Cálculo:</b> ${AppState.simulacaoResultados.descricao}</p>
                <p style="font-size:1.2em;font-weight:bold;">💰 Valor Bruto do Benefício: ${formatarDinheiro(AppState.simulacaoResultados.valorBeneficioFinal)}</p>
            `;

            calculateValorLiquido(valorBeneficioFinal);
            document.getElementById('containerAtoAposentadoriaBtn').style.display = isAposentadoria ? 'block' : 'none';
            document.getElementById('containerAtoPensaoBtn').style.display = isPensao ? 'block' : 'none';
            if (mediaResultados.salarios && mediaResultados.salarios.length > 0) {
                desenharGrafico(mediaResultados.salarios, mediaResultados.media);
            }
            if (navegar) irParaPasso(3);
        } catch (error) {
            console.error("Erro ao calcular benefício:", error);
            ui.showToast("Ocorreu um erro inesperado durante o cálculo.", false);
        } finally {
            ui.toggleSpinner(botao, false);
        }
    }, 50);
}


// A função projetarAposentadoria agora retorna um objeto com os resultados
function projetarAposentadoria(mS) {
    const dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00');
    const dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00');
    const sexo = document.getElementById('sexo').value;
    const tED = parseInt(document.getElementById('tempoExterno').value) || 0;
    const tSD = parseInt(document.getElementById('tempoEspecial').value) || 0;
    const isProfessor = document.getElementById('isProfessor').checked;
    
    const h = new Date();
    const dR = new Date('2019-11-13T00:00:00');
    
    const idadeAnos = (h - dN) / 31557600000;
    const tempoServicoAnos = (h - dA) / 31557600000;
    const tempoTotalContribuicaoAnos = tempoServicoAnos + (tED / 365.25) + (tSD / 365.25);
    const tempoContribuicaoPreReformaAnos = ((dR - dA) > 0 ? (dR - dA) / 31557600000 : 0) + (tED / 365.25) + (tSD / 365.25);

    let regras = {};
    let melhorRegraCumprida = null;

    // --- Regras de Transição e Permanente ---
    const redutorTempo = isProfessor ? 5 : 0;
    const redutorIdade = isProfessor ? 5 : 0;
    
    // Regra: Pedágio 50%
    const tempoNecessarioPed50 = (sexo === 'M' ? 35 : 30) - redutorTempo;
    const tempoPreReformaFaltante = Math.max(0, tempoNecessarioPed50 - tempoContribuicaoPreReformaAnos);
    if (tempoContribuicaoPreReformaAnos >= tempoNecessarioPed50 - 2) { // Só se aplica se faltava menos de 2 anos
        const tempoComPedagio = tempoNecessarioPed50 + (tempoPreReformaFaltante * 0.5);
        if (tempoTotalContribuicaoAnos >= tempoComPedagio) {
            const fatorPrev = calcularFatorPrevidenciario(idadeAnos, tempoTotalContribuicaoAnos, sexo);
            regras['Pedágio 50%'] = { data: 'Já cumpriu!', valor: mS * fatorPrev, obs: `100% da média c/ Fator Prev. (${fatorPrev.toFixed(4)})`, legal: "Art. 17 EC 103/19", cumprida: true };
            if (!melhorRegraCumprida) melhorRegraCumprida = regras['Pedágio 50%'];
        }
    }

    // Regra: Pedágio 100%
    const idadeMinimaPed100 = (sexo === 'M' ? 60 : 57) - redutorIdade;
    const tempoMinimoPed100 = (sexo === 'M' ? 35 : 30) - redutorTempo;
    if (idadeAnos >= idadeMinimaPed100 && tempoTotalContribuicaoAnos >= tempoMinimoPed100) {
        regras['Pedágio 100%'] = { data: 'Já cumpriu!', valor: mS, obs: '100% da média', legal: "Art. 20 EC 103/19", cumprida: true };
        if (!melhorRegraCumprida || regras['Pedágio 100%'].valor > melhorRegraCumprida.valor) melhorRegraCumprida = regras['Pedágio 100%'];
    }

    // Regra: Pontos
    const pontosNecessarios = ((sexo === 'M' ? 96 : 86) - (isProfessor ? 5 : 0)) + (h.getFullYear() - 2019);
    const pontosAtuais = idadeAnos + tempoTotalContribuicaoAnos;
    const tempoMinimoPontos = (sexo === 'M' ? 35 : 30) - redutorTempo;
    if (pontosAtuais >= pontosNecessarios && tempoTotalContribuicaoAnos >= tempoMinimoPontos) {
        const valorBeneficioPontos = mS * Math.min(1, 0.6 + (Math.max(0, Math.floor(tempoTotalContribuicaoAnos) - (sexo === 'M' ? 20 : 15)) * 0.02));
        regras['Pontos'] = { data: 'Já cumpriu!', valor: valorBeneficioPontos, obs: '60% + 2% por ano acima de 20/15', legal: "Art. 4º EC 103/19", cumprida: true };
        if (!melhorRegraCumprida || regras['Pontos'].valor > melhorRegraCumprida.valor) melhorRegraCumprida = regras['Pontos'];
    }

    // Regra: Idade Mínima Progressiva
    const idadeMinimaProgressiva = ((sexo === 'M' ? 61 : 56) - redutorIdade) + Math.floor((h.getFullYear() - 2019) / 2);
    const tempoMinimoIdadeProg = (sexo === 'M' ? 35 : 30) - redutorTempo;
     if (idadeAnos >= idadeMinimaProgressiva && tempoTotalContribuicaoAnos >= tempoMinimoIdadeProg) {
        const valorBeneficioIdadeProg = mS * Math.min(1, 0.6 + (Math.max(0, Math.floor(tempoTotalContribuicaoAnos) - (sexo === 'M' ? 20 : 15)) * 0.02));
        regras['Idade Progressiva'] = { data: 'Já cumpriu!', valor: valorBeneficioIdadeProg, obs: '60% + 2% por ano acima de 20/15', legal: "Art. 4º EC 103/19", cumprida: true };
        if (!melhorRegraCumprida || regras['Idade Progressiva'].valor > melhorRegraCumprida.valor) melhorRegraCumprida = regras['Idade Progressiva'];
    }

    // Monta o HTML do resultado da projeção
    let html = `<h3>📅 Análise de Elegibilidade (Regras de Aposentadoria)</h3><p>Idade: <b>${idadeAnos.toFixed(1)} anos</b> | Tempo de Contribuição: <b>${tempoTotalContribuicaoAnos.toFixed(1)} anos</b></p><table><thead><tr><th>Regra de Transição</th><th>Status</th><th>Valor Estimado</th><th>Observação</th></tr></thead><tbody>`;
    const regrasOrdenadas = ['Pedágio 50%', 'Pedágio 100%', 'Pontos', 'Idade Progressiva'];
    regrasOrdenadas.forEach(key => {
        if (regras[key]) {
            html += `<tr><td>${key}</td><td style="color:var(--success-color);font-weight:bold;">${regras[key].data}</td><td>${formatarDinheiro(regras[key].valor)}</td><td>${regras[key].obs}</td></tr>`;
        } else {
            html += `<tr><td>${key}</td><td style="color:var(--danger-color);">Não Cumprida</td><td>-</td><td>-</td></tr>`;
        }
    });
    html += '</tbody></table><small>Nota: Projeções são estimativas baseadas nos dados fornecidos.</small>';

    return {
        html: html,
        fundamentoLegal: melhorRegraCumprida ? melhorRegraCumprida.legal : 'N/A',
        regraAplicada: melhorRegraCumprida ? regrasOrdenadas.find(key => regras[key] === melhorRegraCumprida) : null,
        valorBeneficio: melhorRegraCumprida ? melhorRegraCumprida.valor : 0
    };
}


// =================================================================================
// FUNÇÕES DA CALCULADORA DE TEMPO NO DASHBOARD
// =================================================================================
function calcularTempoEntreDatas() {
    const dataInicioStr = document.getElementById('calc-data-inicio').value;
    const dataFimStr = document.getElementById('calc-data-fim').value;
    const resultadoContainer = document.getElementById('resultado-calculo-tempo');

    if (!dataInicioStr || !dataFimStr) {
        resultadoContainer.innerHTML = `<p style="color: var(--danger-color); margin: auto;">Preencha ambas as datas.</p>`;
        return;
    }

    const dataInicio = new Date(dataInicioStr + 'T00:00:00Z'); // Usar Z para UTC
    const dataFim = new Date(dataFimStr + 'T00:00:00Z');

    if (dataFim < dataInicio) {
        resultadoContainer.innerHTML = `<p style="color: var(--danger-color); margin: auto;">A data final deve ser maior ou igual à data inicial.</p>`;
        return;
    }

    const diffTime = dataFim.getTime() - dataInicio.getTime();
    const totalDias = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para ser inclusivo
    const { anos, meses, dias } = diasParaAnosMesesDias(totalDias);

    resultadoContainer.innerHTML = `
        <p style="margin:0; font-weight:bold; color: var(--primary-dark);">Resultado do Cálculo:</p>
        <p style="margin:5px 0 0 0;"><strong>Período:</strong> ${anos} anos, ${meses} meses e ${dias} dias.</p>
        <p style="margin:5px 0 0 0;"><strong>Total em dias:</strong> ${totalDias.toLocaleString('pt-BR')} dias.</p>
    `;
}

function limparCalculoTempo() {
    document.getElementById('calc-data-inicio').value = '';
    document.getElementById('calc-data-fim').value = '';
    document.getElementById('resultado-calculo-tempo').innerHTML = '';
}


// =================================================================================
// O RESTANTE DAS FUNÇÕES (sem modificações críticas)
// ... (copie o restante das funções a partir daqui)
// =================================================================================
// ... As funções como `gerarAtoDePensao`, `salvarSimulacaoHistorico`, `listarHistorico`, 
// `carregarDoHistorico` (com a correção do timeout já aplicada), etc. permanecem aqui ...
// A função carregarDoHistorico já estava correta na versão anterior, mas a incluirei aqui
// para garantir a integridade.

function carregarDoHistorico(id) {
    // CORREÇÃO 1 já implícita aqui pelo handleNavClick
    if (!AppState.usuarioAtual) return;
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const h = JSON.parse(localStorage.getItem(c) || "[]");
    const rE = h.find(r => r.id === id);
    if (!rE) return ui.showToast("Erro: Simulação não encontrada.", false);
    
    const d = rE.dados;
    handleNavClick(null, 'calculadora'); 
    
    AppState.loadTimeoutId = setTimeout(() => {
        for (const k in d.passo1) {
            const e = document.getElementById(k);
            if (e) e.value = d.passo1[k];
        }
        document.getElementById('corpo-tabela').innerHTML = '';
        if (d.tabela) d.tabela.forEach(l => adicionarLinha(...l));
        
        document.getElementById('corpo-tabela-proventos-ato').innerHTML = '';
        if (d.proventosAto) {
            d.proventosAto.forEach(p => adicionarLinhaProvento(p.descricao, p.valor));
        } else { // Fallback para versões antigas
            adicionarLinhaProvento('Salário Base', ''); 
            adicionarLinhaProvento('Anuênio 25%', '');
        }
        calculateTotalProventos();

        document.getElementById('corpo-tabela-dependentes').innerHTML = '';
        if (d.dependentes) d.dependentes.forEach(dep => adicionarLinhaDependente(dep.nome, dep.dataNasc, dep.parentesco, dep.invalido));
        
        AppState.simulacaoResultados = d.resultados || {};
        alternarCamposBeneficio();
        ui.showToast(`Simulação "${rE.nome}" carregada.`, true);
        
        const t = document.getElementById('tipoBeneficio').value;
        if (t !== 'pensao_aposentado') irParaPasso(2);
        else irParaPasso(1);
        
        calcularBeneficio(true);
        AppState.loadTimeoutId = null;
    }, 150); // Aumentado ligeiramente para garantir que a UI tenha tempo de renderizar
}


// Todas as outras funções (excluir, salvar, ctc, etc.) permanecem aqui.
// Elas já estão na sua versão anterior e não precisam de mudanças críticas.
// Para garantir, você pode copiar todo o bloco de código a partir daqui
// da última versão funcional que te enviei.

// ... (cole o restante das funções aqui)

// Apenas certifique-se de que a última linha do seu arquivo seja a de exposição global
Object.assign(window, {
    auth, ui, handleNavClick, atualizarDashboardView, irParaPasso, alternarCamposBeneficio,
    adicionarLinha, limparTabela, exportarExcel, importarExcel, atualizarSalarioLinha, excluirLinha,
    calcularBeneficio, adicionarLinhaProvento, calculateTotalProventos, excluirLinhaProvento,
    adicionarLinhaDependente, removerLinhaDependente, salvarSimulacaoHistorico, imprimirSimulacao,
    exportarTudoZIP, gerarAtoDeAposentadoria, gerarAtoDePensao, carregarDoHistorico, excluirDoHistorico,
    adicionarLinhaPeriodoCTC, calcularTempoPeriodosCTC, removerLinhaPeriodoCTC, salvarCTC, gerarDocumentoCTC,
    carregarCTC, excluirCTC, alternarTema,
    // Adicionadas para a calculadora do painel, embora não chamadas por onclick
    calcularTempoEntreDatas, limparCalculoTempo
});
