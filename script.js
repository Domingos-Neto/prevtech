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

// =================================================================================
//  CONFIGURAÇÕES GLOBAIS E CONSTANTES LEGAIS
// =================================================================================
const SALARIO_MINIMO = 1518.00; 

const AppState = {
    usuarioAtual: null,
    salarioChart: null,
    tiposBeneficioChart: null,
    simulacaoResultados: {},
    dashboardViewMode: 'meus_registros',
    currentStep: 1,
    configuracoes: { nomePrefeito: '', nomePresidente: '' }
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
        const views = ['dashboard', 'simulacao', 'geradorCTC', 'telaLegislacao', 'telaConfiguracoes', 'telaCadastro', 'telaProcessos', 'telaFinanceiro', 'telaRelatorios', 'telaUsuarios'];
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
    carregarConfiguracoes();
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
    document.querySelectorAll(".accordion-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            toggle.classList.toggle("active");
            const content = toggle.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
    const cpfInput = document.getElementById('cpfServidor');
    if (cpfInput) cpfInput.addEventListener('input', (e) => validaCPF(e.target, document.getElementById('cpf-status')));
    
    const ctcCpfInput = document.getElementById('ctc-cpf');
    if(ctcCpfInput) ctcCpfInput.addEventListener('input', (e) => validaCPF(e.target, document.getElementById('ctc-cpf-status')));

    const btnCalcTempo = document.getElementById('btn-calcular-tempo');
    if (btnCalcTempo) {
        btnCalcTempo.addEventListener('click', calcularTempoEntreDatas);
    }
    const btnLimparTempo = document.getElementById('btn-limpar-tempo');
    if (btnLimparTempo) {
        btnLimparTempo.addEventListener('click', limparCalculoTempo);
    }
}

function handleNavClick(event, targetView) {
    if (event) event.preventDefault();
    ui.updateActiveNav(targetView);
    ui.showView(targetView);

    switch (targetView) {
        case 'dashboard':
            listarHistorico();
            listarCTCsSalvas();
            atualizarIndicadoresDashboard();
            break;
        case 'simulacao':
            limparFormularioCompleto();
            irParaPasso(1);
            break;
        case 'geradorCTC':
            limparFormularioCTC();
            break;
        case 'telaConfiguracoes':
            popularCamposConfiguracoes();
            break;
    }
}

function atualizarIndicadoresDashboard() {
    if (!AppState.usuarioAtual) return;

    const canvas = document.getElementById('graficoTiposBeneficio');
    if (!canvas) {
        return; 
    }

    const historicoKey = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const ctcsKey = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const historico = JSON.parse(localStorage.getItem(historicoKey) || "[]");
    const ctcs = JSON.parse(localStorage.getItem(ctcsKey) || "[]");

    // --- Cálculos de KPIs ---
    const totalSimulacoes = historico.length;
    const totalCtcs = ctcs.length;
    
    let somaValores = 0;
    historico.forEach(item => {
        const valor = item.dados?.resultados?.valorBeneficioFinal || 0;
        somaValores += parseFloat(valor);
    });
    const valorMedio = totalSimulacoes > 0 ? somaValores / totalSimulacoes : 0;
    
    // CÁLCULO PARA O NOVO KPI: Total de dias certificados
    let totalDiasCertificados = 0;
    ctcs.forEach(ctc => {
        if (ctc.dados && ctc.dados.periodos) {
            ctc.dados.periodos.forEach(periodo => {
                if (periodo.inicio && periodo.fim) {
                    const inicio = new Date(periodo.inicio + 'T00:00:00');
                    const fim = new Date(periodo.fim + 'T00:00:00');
                    if (fim >= inicio) {
                        const diffTime = Math.abs(fim - inicio);
                        const diasBrutos = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        const deducoes = parseInt(periodo.deducoes) || 0;
                        totalDiasCertificados += (diasBrutos - deducoes);
                    }
                }
            });
        }
    });

    // --- Atualização dos Elementos HTML ---
    document.getElementById('kpi-total-simulacoes').innerText = totalSimulacoes;
    document.getElementById('kpi-total-ctcs').innerText = totalCtcs;
    document.getElementById('kpi-valor-medio').innerText = formatarDinheiro(valorMedio);
    document.getElementById('kpi-total-dias-ctc').innerText = totalDiasCertificados.toLocaleString('pt-BR'); // Atualiza o novo card

    // --- Preparação dos Dados para o Gráfico ---
    const contagemTipos = {};
    historico.forEach(item => {
        const tipo = item.dados?.resultados?.tipo || "Não definido";
        contagemTipos[tipo] = (contagemTipos[tipo] || 0) + 1;
    });

    const labelsGrafico = Object.keys(contagemTipos);
    const dadosGrafico = Object.values(contagemTipos);
    
    // --- Renderização do Gráfico ---
    const ctx = canvas.getContext('2d');
    const isDarkMode = document.body.classList.contains('dark-mode');
    const fontColor = isDarkMode ? '#eee' : '#333';

    if (AppState.tiposBeneficioChart) {
        AppState.tiposBeneficioChart.destroy();
    }
    
    if (labelsGrafico.length > 0) {
        AppState.tiposBeneficioChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labelsGrafico,
                datasets: [{
                    label: 'Quantidade',
                    data: dadosGrafico,
                    backgroundColor: ['#0d47a1', '#1e88e5', '#64b5f6', '#ffc107', '#dc3545', '#6f42c1'],
                    borderColor: isDarkMode ? '#1e1e1e' : '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: fontColor, boxWidth: 20, padding: 15 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label || ''}: ${context.parsed || 0}`
                        }
                    }
                }
            }
        });
    } else {
         ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
         ctx.save();
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillStyle = fontColor;
         ctx.font = "16px 'Segoe UI'";
         ctx.fillText("Nenhuma simulação salva para exibir o gráfico.", ctx.canvas.width / 2, ctx.canvas.height / 2);
         ctx.restore();
    }
}

// O restante do arquivo continua idêntico à versão anterior...

function atualizarDashboardView() {
    AppState.dashboardViewMode = document.getElementById('view-selector').value;
    listarHistorico();
    listarCTCsSalvas();
}

function formatarDinheiro(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function formatarDataBR(dataString, plusDay = true) {
    if (!dataString) return "";
    try {
        const date = new Date(dataString);
        if (plusDay) date.setUTCDate(date.getUTCDate() + 1);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) { return dataString; }
}

function formatarDataPorExtenso(data) {
    if (!data) return '';
    const date = new Date(data);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toLocaleString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function atualizarDataHora() {
    const container = document.getElementById('datetime-container');
    if (container) {
        const agora = new Date();
        const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(agora);
        const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(agora);
        const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(agora);
        const diaSemanaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
        container.innerHTML = `<span><i class="ri-calendar-2-line"></i> ${diaSemanaCapitalized}, ${data}</span> <span style="opacity: 0.5">|</span> <span><i class="ri-time-line"></i> ${hora}</span>`;
    }
}

function validaCPF(inputElement, statusElement) {
    const cpf = inputElement.value.replace(/[^\d]/g, '');
    const setInvalid = () => {
        inputElement.style.borderColor = 'var(--danger-color)';
        statusElement.textContent = 'CPF Inválido';
        statusElement.style.color = 'var(--danger-color)';
        return false;
    };
    if (cpf.length === 0) {
        inputElement.style.borderColor = 'var(--border-color)';
        statusElement.textContent = '';
        return;
    }
    let soma = 0, resto;
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return setInvalid();
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return setInvalid();
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return setInvalid();
    inputElement.style.borderColor = 'var(--success-color)';
    statusElement.textContent = 'CPF Válido';
    statusElement.style.color = 'var(--success-color)';
    return true;
}

function valorPorExtenso(valor) {
    if (typeof valor !== 'string') {
        valor = valor.toFixed(2);
    }
    valor = valor.replace('.', ',');
    let [inteiros, centavos] = valor.split(',');

    if (inteiros === '0' && centavos === '00') {
        return "zero reais";
    }

    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
    const milharClasses = ["", "mil", "milhão", "bilhão", "trilhão"];

    function numeroParaExtenso(n) {
        if (n == 0) return "";
        let nStr = String(n).padStart(3, '0');
        if (nStr === '100') return "cem";
        let extenso = [];
        if (nStr[0] !== '0') extenso.push(centenas[parseInt(nStr[0])]);
        
        let dezenaUnidade = parseInt(nStr.substring(1));
        if (dezenaUnidade > 0) {
            if (dezenaUnidade < 20) {
                extenso.push(unidades[dezenaUnidade]);
            } else {
                if (nStr[1] !== '0') extenso.push(dezenas[parseInt(nStr[1])]);
                if (nStr[2] !== '0') extenso.push(unidades[parseInt(nStr[2])]);
            }
        }
        return extenso.join(" e ");
    }

    let extensoReais = [];
    if (parseInt(inteiros) !== 0) {
        let grupos = [];
        let tempInteiros = inteiros;
        while (tempInteiros.length > 0) {
            grupos.push(tempInteiros.slice(-3));
            tempInteiros = tempInteiros.slice(0, -3);
        }

        for (let i = grupos.length - 1; i >= 0; i--) {
            let grupoInt = parseInt(grupos[i]);
            if (grupoInt > 0) {
                let extensoGrupo = numeroParaExtenso(grupoInt);
                if (i > 0) {
                    extensoGrupo += " " + milharClasses[i] + ((grupoInt > 1 && i > 1) ? 'ões' : '');
                }
                extensoReais.push(extensoGrupo);
            }
        }
    }
    
    let parteReais = extensoReais.join(" e ");
    if (parseInt(inteiros) > 1) {
        parteReais += " reais";
    } else if (parseInt(inteiros) === 1) {
        parteReais += " real";
    }

    let parteCentavos = "";
    if (parseInt(centavos) > 0) {
        parteCentavos = numeroParaExtenso(parseInt(centavos));
        if (parseInt(centavos) > 1) {
            parteCentavos += " centavos";
        } else {
            parteCentavos += " centavo";
        }
    }

    if (parteReais && parteCentavos) {
        return `${parteReais} e ${parteCentavos}`;
    } else if (parteReais) {
        if (parteReais.endsWith("milhão")) return parteReais.replace("milhão", "de reais");
        return parteReais;
    } else if (parteCentavos) {
        return parteCentavos;
    }
    
    return "zero reais";
}

function irParaPasso(passo) {
    if (passo > AppState.currentStep && AppState.currentStep === 1) {
        if (!document.getElementById('dataAdmissao').value || !document.getElementById('dataNascimento').value) {
            return ui.showToast('Preencha a Data de Admissão e Nascimento para continuar.', false);
        }
    }
    const tipo = document.getElementById('tipoBeneficio').value;
    if (passo === 2 && tipo === 'pensao_aposentado') {
        calcularBeneficio(true, null);
        return;
    }
    AppState.currentStep = passo;
    document.querySelectorAll('.wizard-step').forEach(step => step.style.display = 'none');
    document.getElementById('passo' + passo).style.display = 'block';
    window.scrollTo(0, 0);
}

function alternarCamposBeneficio() {
    const tipo = document.getElementById('tipoBeneficio').value;
    const isAposentadoria = tipo === 'voluntaria' || tipo === 'incapacidade' || tipo === 'compulsoria';
    const isPensao = tipo === 'pensao_ativo' || tipo === 'pensao_aposentado';
    
    document.getElementById('camposIncapacidade').style.display = tipo === 'incapacidade' ? 'grid' : 'none';
    document.getElementById('camposPensaoAtivo').style.display = tipo === 'pensao_ativo' ? 'block' : 'none';
    document.getElementById('camposPensaoAposentado').style.display = tipo === 'pensao_aposentado' ? 'grid' : 'none';
    document.getElementById('containerGestaoDependentes').style.display = isPensao ? 'block' : 'none';
    
    const containerDependentes = document.getElementById('containerGestaoDependentes');
    if (tipo === 'pensao_ativo') document.getElementById('camposPensaoAtivo').appendChild(containerDependentes);
    else if (tipo === 'pensao_aposentado') document.getElementById('camposPensaoAposentado').appendChild(containerDependentes);
    
    document.getElementById('camposAtoAposentadoria').style.display = isAposentadoria ? 'block' : 'none';
    document.getElementById('camposAtoPensao').style.display = isPensao ? 'block' : 'none';
    document.getElementById('containerDetalhamentoProventos').style.display = isAposentadoria ? 'block' : 'none';
    
    const passo2 = document.getElementById('passo2');
    if (passo2) passo2.style.display = tipo === 'pensao_aposentado' ? 'none' : AppState.currentStep === 2 ? 'block' : 'none';
}

function limparFormularioCompleto() {
    document.querySelectorAll('#simulacao input[type="text"],#simulacao input[type="date"],#simulacao input[type="number"], #simulacao textarea, #simulacao select').forEach(i => i.value = '');
    
    document.getElementById('corpo-tabela').innerHTML = '';
    document.getElementById('resultado').innerHTML = '';
    document.getElementById('resultadoProjecao').innerHTML = '';
    document.getElementById('resultadoAbono').innerHTML = '';
    document.getElementById('resultadoLiquido').innerHTML = '';
    AppState.simulacaoResultados = {};
    if (AppState.salarioChart) AppState.salarioChart.destroy();
    
    document.getElementById("tempoExterno").value = "0";
    document.getElementById("tempoEspecial").value = "0";
    
    document.getElementById('corpo-tabela-proventos-ato').innerHTML = '';
    calculateTotalProventos();
    
    document.getElementById('corpo-tabela-dependentes').innerHTML = '';
    
    document.getElementById('fundamentoLegalPersonalizado').value = 'com fundamento no art. 40 §3º da CF/88 (redação dada pela EC n.º 103/19), e nas Leis Municipais n.º 205/94, em seu art. 67; Lei n.º 080/17 que altera a Lei n.º 066/17; Decreto Municipal nº. 113/2022, art. 21, §4º, incisos I, II, III, §5º, §6º, I, “b”, art. 4º, inciso I, da Lei 035/2022, bem como, EC 103/2019';
    
    adicionarLinhaProvento('Salário Base', '');
    adicionarLinhaProvento('Anuênio 25%', '');
    adicionarLinhaProvento('Indenização 20% Lei n.º 066/2017', '');
    adicionarLinhaProvento('Especialização L.033/07-A.26', '');
    adicionarLinhaProvento('Vantagem Pessoal Nominalmente Identificada - VPNI', '');
    
    const accToggle = document.querySelector('#passo2 .accordion-toggle'),
        accContent = document.querySelector('#passo2 .accordion-content');
    if (accToggle && accContent) {
        accToggle.classList.remove('active');
        accContent.style.maxHeight = null;
    }
}

function alternarTema() {
    const isDarkMode = document.body.classList.toggle("dark-mode");
    document.querySelector("#toggleTheme i").className = isDarkMode ? 'ri-sun-line' : 'ri-moon-line';
    localStorage.setItem("temaEscuro", isDarkMode ? "sim" : "nao");
    if (AppState.salarioChart && AppState.simulacaoResultados.salariosParaGrafico) {
        desenharGrafico(AppState.simulacaoResultados.salariosParaGrafico, AppState.simulacaoResultados.mediaSalarial);
    }
    atualizarIndicadoresDashboard();
}

function adicionarLinha(mes = '', fator = '', salario = '') {
    const tbody = document.getElementById("corpo-tabela"),
        linha = document.createElement("tr");
    const vF = parseFloat(fator) || 0,
        vS = parseFloat(salario) || 0,
        vA = vF * vS > 0 ? (vF * vS).toFixed(2) : '';
    linha.innerHTML = `<td>${tbody.rows.length + 1}</td><td><input type="text" placeholder="MM/AAAA" value="${mes}"/></td><td><input type="number" step="0.000001" class="fator" value="${fator}" oninput="atualizarSalarioLinha(this)"/></td><td><input type="number" step="0.01" class="salario" value="${salario}" oninput="atualizarSalarioLinha(this)"/></td><td><input type="number" class="atualizado" value="${vA}" readonly/></td><td><button class="danger" style="margin:0;padding:5px;" onclick="excluirLinha(this)">Excluir</button></td>`;
    tbody.appendChild(linha);
    const aC = document.querySelector('#passo2 .accordion-content');
    if (aC && aC.style.maxHeight) aC.style.maxHeight = aC.scrollHeight + "px";
}

function limparTabela() {
    if (confirm("Tem certeza que deseja limpar todos os salários?")) document.getElementById("corpo-tabela").innerHTML = "";
}

function excluirLinha(b) {
    b.closest('tr').remove();
    renumerarLinhasTabela();
}

function renumerarLinhasTabela() {
    document.querySelectorAll("#corpo-tabela tr").forEach((l, i) => l.cells[0].textContent = i + 1);
}

function atualizarSalarioLinha(i) {
    const l = i.closest('tr'),
        f = l.querySelector('.fator'),
        s = l.querySelector('.salario'),
        a = l.querySelector('.atualizado'),
        F = parseFloat(f.value) || 0,
        S = parseFloat(s.value) || 0;
    a.value = F > 0 && S > 0 ? (F * S).toFixed(2) : '';
}

function adicionarLinhaProvento(d = '', v = '') {
    const t = document.getElementById("corpo-tabela-proventos-ato"),
        l = document.createElement("tr");
    l.innerHTML = `<td><input type="text" class="provento-descricao" placeholder="Descrição" value="${d}"/></td><td><input type="number" step="0.01" class="provento-valor" placeholder="0.00" value="${v}" oninput="calculateTotalProventos()"/></td><td><button class="danger" style="margin:0;padding:5px;" onclick="excluirLinhaProvento(this)">Excluir</button></td>`;
    t.appendChild(l);
}

function excluirLinhaProvento(b) {
    b.closest('tr').remove();
    calculateTotalProventos();
}

function calculateTotalProventos() {
    const v = document.querySelectorAll("#corpo-tabela-proventos-ato .provento-valor");
    let t = 0;
    v.forEach(i => t += parseFloat(i.value) || 0);
    document.getElementById('total-proventos-ato').innerText = formatarDinheiro(t);
    AppState.simulacaoResultados.valorBeneficioFinal = t;
    return t;
}

function adicionarLinhaDependente(n = '', d = '', p = '', inv = 'Nao') {
    const t = document.getElementById('corpo-tabela-dependentes'),
        l = document.createElement('tr');
    l.innerHTML = `<td><input type="text" class="dependente-nome" value="${n}"></td><td><input type="date" class="dependente-dataNasc" value="${d}"></td><td><select class="dependente-parentesco"><option ${p==='Cônjuge'?'selected':''}>Cônjuge</option><option ${p==='Companheiro(a)'?'selected':''}>Companheiro(a)</option><option ${p==='Filho(a)'?'selected':''}>Filho(a)</option><option ${p==='Filho(a) Inválido(a)'?'selected':''}>Filho(a) Inválido(a)</option><option ${p==='Mãe'?'selected':''}>Mãe</option><option ${p==='Pai'?'selected':''}>Pai</option></select></td><td><select class="dependente-invalido"><option value="Nao" ${inv==='Nao'?'selected':''}>Não</option><option value="Sim" ${inv==='Sim'?'selected':''}>Sim</option></select></td><td><button class="danger" style="margin:0;padding:5px;" onclick="removerLinhaDependente(this)">Remover</button></td>`;
    t.appendChild(l);
}

function removerLinhaDependente(b) {
    b.closest('tr').remove();
}

function calcularMediaSalarial() {
    const sI = document.querySelectorAll("#corpo-tabela .salario"),
        fI = document.querySelectorAll("#corpo-tabela .fator"),
        aO = document.querySelectorAll("#corpo-tabela .atualizado");
    let sM = [];
    for (let i = 0; i < sI.length; i++) {
        const s = parseFloat(sI[i].value),
            f = parseFloat(fI[i].value),
            m = document.querySelectorAll("#corpo-tabela tr")[i].querySelectorAll("input[type='text']")[0].value;
        if (f > 0 && s > 0 && /^\d{2}\/\d{4}$/.test(m)) {
            const a = s * f;
            aO[i].value = a.toFixed(2);
            sM.push({ label: m, value: a });
        } else aO[i].value = '';
    }
    if (sM.length === 0) return { media: 0, salarios: [] };
    const med = sM.reduce((a, s) => a + s.value, 0) / sM.length;
    return { media: med, salarios: sM };
}


function calcularBeneficio(n = true, b = null) {
    const t = document.getElementById('tipoBeneficio').value;
    if ((t === 'voluntaria' || t === 'incapacidade' || t === 'compulsoria') && (!document.getElementById('dataNascimento').value || !document.getElementById('dataAdmissao').value)) {
        return ui.showToast("Data de Nascimento e Admissão são obrigatórias.", false);
    }
    
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const rD = document.getElementById('resultado');
            let vB = 0, dC = '', m = 0, s = [];
            AppState.simulacaoResultados = {};

            if (t !== 'pensao_aposentado') {
                const mR = calcularMediaSalarial();
                m = mR.media;
                s = mR.salarios;
                AppState.simulacaoResultados.salariosParaGrafico = s;
            }

            const isA = t === 'voluntaria' || t === 'incapacidade' || t === 'compulsoria';
            const isP = t === 'pensao_ativo' || t === 'pensao_aposentado';

            if (isA) {
                 const dataCalculo = document.getElementById('dataCalculo').value ? new Date(document.getElementById('dataCalculo').value + 'T00:00:00') : new Date();
                 const dataAdmissao = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00');
                 const tempoServicoPublico = (dataCalculo - dataAdmissao) / 31557600000;
                 const tempoExternoAnos = (parseInt(document.getElementById('tempoExterno').value) || 0) / 365.25;
                 const tempoEspecialAnos = (parseInt(document.getElementById('tempoEspecial').value) || 0) / 365.25;
                 const tempoContribTotalAnos = tempoServicoPublico + tempoExternoAnos + tempoEspecialAnos;

                if (t === 'voluntaria') {
                    vB = calculateTotalProventos();
                    dC = `O valor do benefício é composto pelo somatório dos proventos detalhados, que tem como base a média salarial. A elegibilidade e o valor final podem variar conforme a regra de transição aplicável.`;
                    projetarAposentadoria(m);
                    verificarAbonoPermanencia();

                } else if (t === 'incapacidade') {
                    const isGrave = document.getElementById('incapacidadeGrave').value === 'sim';

                    if (isGrave) {
                        vB = m;
                        dC = `Cálculo com base no Art. 7º, §3º do Decreto 113/2022. O valor corresponde a 100% da média salarial, por se tratar de incapacidade decorrente de acidente de trabalho, doença profissional ou do trabalho.`;
                    } else {
                        const anosExcedentes = Math.max(0, Math.floor(tempoContribTotalAnos) - 20);
                        const percentual = Math.min(1, 0.60 + (anosExcedentes * 0.02));
                        vB = m * percentual;
                        dC = `Cálculo com base no Art. 7º, §2º do Decreto 113/2022. O valor corresponde a ${ (percentual * 100).toFixed(0) }% da média salarial (60% + 2% por ano de contribuição que exceder 20 anos).`;
                    }
                     document.querySelectorAll("#corpo-tabela-proventos-ato .provento-valor").forEach(i => i.value = '');
                     const baseProventoInput = document.querySelector("#corpo-tabela-proventos-ato .provento-descricao[value='Salário Base']");
                     if(baseProventoInput) {
                        baseProventoInput.closest('tr').querySelector('.provento-valor').value = vB.toFixed(2);
                     } else {
                        adicionarLinhaProvento('Provento Calculado por Incapacidade', vB.toFixed(2));
                     }
                     calculateTotalProventos();

                } else if (t === 'compulsoria') {
                    const anosContrib = Math.floor(tempoContribTotalAnos);
                    const fatorProporcionalidade = Math.min(1, anosContrib / 20); 
                    
                    const anosExcedentes = Math.max(0, anosContrib - 20);
                    const percentualBase = 0.60 + (anosExcedentes * 0.02);
                    const mediaComRegraGeral = m * Math.min(1, percentualBase);

                    vB = mediaComRegraGeral * fatorProporcionalidade;
                    
                    dC = `Cálculo conforme Art. 8º do Decreto 113/2022. O benefício é proporcional ao tempo de contribuição. <br><b>Fator de Proporcionalidade:</b> ${fatorProporcionalidade.toFixed(4)} (${anosContrib} anos / 20). <br><b>Valor Base (Regra Geral):</b> ${formatarDinheiro(mediaComRegraGeral)}.`;

                    if (vB < SALARIO_MINIMO) {
                        vB = SALARIO_MINIMO;
                        dC += `<br><b>Ajuste:</b> O valor foi elevado para o salário mínimo vigente.`;
                    }

                    document.querySelectorAll("#corpo-tabela-proventos-ato .provento-valor").forEach(i => i.value = '');
                    adicionarLinhaProvento('Provento Calculado (Compulsória)', vB.toFixed(2));
                    calculateTotalProventos();
                }

            } else { // Pensões
                const nD = document.getElementById('corpo-tabela-dependentes').rows.length;
                const percentualCota = Math.min(1.0, 0.5 + nD * 0.1);
                
                if (t === 'pensao_ativo') {
                    vB = m * percentualCota;
                    dC = `Cálculo conforme Art. 23 da EC 103/19. Cota de ${ (percentualCota * 100).toFixed(0) }% (50% base + ${ nD * 10 }% por dependente) sobre a média salarial do servidor ativo.`;
                } else if (t === 'pensao_aposentado') {
                    const proventoBrutoAposentado = parseFloat(document.getElementById('proventoAposentado').value) || 0;
                    vB = proventoBrutoAposentado * percentualCota;
                    dC = `Cálculo conforme Art. 23 da EC 103/19. Cota de ${ (percentualCota * 100).toFixed(0) }% (50% base + ${ nD * 10 }% por dependente) sobre o provento bruto de ${formatarDinheiro(proventoBrutoAposentado)} que o servidor recebia.`;
                }
            }

            AppState.simulacaoResultados = { ...AppState.simulacaoResultados, mediaSalarial: m, valorBeneficioFinal: vB, tipo: document.querySelector("#tipoBeneficio option:checked").text, descricao: dC };
            rD.innerHTML = `<h3>Resultado do Cálculo (Bruto)</h3><p><b>Tipo:</b> ${AppState.simulacaoResultados.tipo}</p>${m>0?`<p><b>Média Salarial de Contribuição:</b> ${formatarDinheiro(AppState.simulacaoResultados.mediaSalarial)}</p>`:''}<p><b>Fundamento do Cálculo:</b> ${AppState.simulacaoResultados.descricao}</p><p style="font-size:1.2em;font-weight:bold;">💰 Valor Bruto do Benefício: ${formatarDinheiro(AppState.simulacaoResultados.valorBeneficioFinal)}</p>`;
            calculateValorLiquido(vB);

            document.getElementById('containerAtoAposentadoriaBtn').style.display = isA ? 'block' : 'none';
            document.getElementById('containerAtoPensaoBtn').style.display = isP ? 'block' : 'none';

            if (s.length > 0) desenharGrafico(s, m);

            if (n) irParaPasso(3);
        } finally {
            ui.toggleSpinner(b, false);
        }
    }, 50);
}

function salvarSimulacaoHistorico(nF) {
    let n = typeof nF === "string" ? nF : document.getElementById("nomeSimulacao").value.trim();
    if (!n) return ui.showToast("Digite um nome para a simulação.", false);
    if (!AppState.usuarioAtual) return ui.showToast("Você precisa estar logado.", false);
    const d = { id: crypto.randomUUID(), nome: n, dados: coletarDadosSimulacao(), data: new Date().toISOString() };
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const h = JSON.parse(localStorage.getItem(c) || "[]");
    h.unshift(d);
    localStorage.setItem(c, JSON.stringify(h));
    ui.showToast("Simulação salva no histórico!", true);
    listarHistorico();
    atualizarIndicadoresDashboard(); // ATUALIZA O PAINEL
}

function excluirDoHistorico(id) {
    if (!AppState.usuarioAtual) return;
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const h = JSON.parse(localStorage.getItem(c) || "[]");
    const nDR = h.find(r => r.id === id)?.nome || "Simulação";
    if (confirm(`Excluir "${nDR}"?`)) {
        const nH = h.filter(r => r.id !== id);
        localStorage.setItem(c, JSON.stringify(nH));
        listarHistorico();
        ui.showToast("Simulação excluída.", true);
        atualizarIndicadoresDashboard(); // ATUALIZA O PAINEL
    }
}

function salvarCTC() {
    const n = prompt("Nome para salvar esta CTC:");
    if (!n) return;
    if (!AppState.usuarioAtual) return ui.showToast("Você precisa estar logado.", false);
    const ctc = {
        id: crypto.randomUUID(),
        nome: n,
        data: new Date().toISOString(),
        dados: {
            nomeServidor: document.getElementById('ctc-nomeServidor').value,
            matricula: document.getElementById('ctc-matricula').value,
            cpf: document.getElementById('ctc-cpf').value,
            rg: document.getElementById('ctc-rg').value,
            dataNascimento: document.getElementById('ctc-dataNascimento').value,
            sexo: document.getElementById('ctc-sexo').value,
            cargo: document.getElementById('ctc-cargo').value,
            lotacao: document.getElementById('ctc-lotacao').value,
            dataAdmissao: document.getElementById('ctc-dataAdmissao').value,
            dataExoneracao: document.getElementById('ctc-dataExoneracao').value,
            processo: document.getElementById('ctc-processo').value,
            periodos: Array.from(document.querySelectorAll("#corpo-tabela-periodos-ctc tr")).map(l => ({ inicio: l.querySelector('.ctc-inicio').value, fim: l.querySelector('.ctc-fim').value, deducoes: l.querySelector('.ctc-deducoes').value, fonte: l.querySelector('.ctc-fonte').value }))
        }
    };
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const cs = JSON.parse(localStorage.getItem(ch) || "[]");
    cs.unshift(ctc);
    localStorage.setItem(ch, JSON.stringify(cs));
    listarCTCsSalvas();
    ui.showToast("CTC salva!", true);
    atualizarIndicadoresDashboard(); // ATUALIZA O PAINEL
}

function excluirCTC(id) {
    if (!AppState.usuarioAtual) return;
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const cs = JSON.parse(localStorage.getItem(ch) || "[]");
    const nDC = cs.find(c => c.id === id)?.nome || "CTC";
    if (!confirm(`Excluir CTC "${nDC}"?`)) return;
    const nC = cs.filter(c => c.id !== id);
    localStorage.setItem(ch, JSON.stringify(nC));
    listarCTCsSalvas();
    ui.showToast("CTC excluída.", true);
    atualizarIndicadoresDashboard(); // ATUALIZA O PAINEL
}

// O restante das funções (listarHistorico, carregarDoHistorico, etc.) permanecem as mesmas.

// ... (todas as outras funções do script.js que você já tem) ...

Object.assign(window, {
    auth, ui, handleNavClick, atualizarDashboardView, irParaPasso, alternarCamposBeneficio,
    adicionarLinha, limparTabela, exportarExcel, importarExcel, atualizarSalarioLinha, excluirLinha,
    calcularBeneficio, adicionarLinhaProvento, calculateTotalProventos, excluirLinhaProvento,
    adicionarLinhaDependente, removerLinhaDependente, salvarSimulacaoHistorico, imprimirSimulacao,
    exportarTudoZIP, gerarAtoDeAposentadoria, gerarAtoDePensao, carregarDoHistorico, excluirDoHistorico,
    adicionarLinhaPeriodoCTC, calcularTempoPeriodosCTC, removerLinhaPeriodoCTC, salvarCTC, gerarDocumentoCTC,
    carregarCTC, excluirCTC, alternarTema,
    salvarConfiguracoes,
    calcularTempoEntreDatas, limparCalculoTempo
});
