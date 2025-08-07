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
    loadTimeoutId: null
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

    const btnCalcTempo = document.getElementById('btn-calcular-tempo');
    if (btnCalcTempo) btnCalcTempo.addEventListener('click', calcularTempoEntreDatas);

    const btnLimparTempo = document.getElementById('btn-limpar-tempo');
    if (btnLimparTempo) btnLimparTempo.addEventListener('click', limparCalculoTempo);
}

function handleNavClick(event, targetView) {
    if (event) event.preventDefault();
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
        case 'calculadora':
            limparFormularioCompleto();
            irParaPasso(1);
            break;
        case 'geradorCTC':
            limparFormularioCTC();
            break;
    }
}

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
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        container.innerHTML = `🗓️ ${agora.toLocaleDateString('pt-BR', options)} | ⏰ ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
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
    if (typeof valor === 'number') valor = String(valor.toFixed(2));
    valor = valor.replace('.', ',');
    if (valor.indexOf(',') === -1) valor += ',00';
    let inteiros = valor.split(',')[0];
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
    const milharClasses = ["", "mil", "milhão", "bilhão", "trilhão"];
    function numeroParaExtenso(n) {
        if (n == 0) return "";
        let nStr = String(n).padStart(3, '0');
        if (nStr == '100') return "cem";
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
    let extensoFinal = [];
    if (inteiros == '0') { return "zero"; }
    let grupos = [];
    while (inteiros.length > 0) {
        grupos.push(inteiros.slice(-3));
        inteiros = inteiros.slice(0, -3);
    }
    for (let i = grupos.length - 1; i >= 0; i--) {
        let grupoInt = parseInt(grupos[i]);
        if (grupoInt > 0) {
            let extensoGrupo = numeroParaExtenso(grupoInt);
            if (i > 0) {
                extensoGrupo += " " + milharClasses[i] + (grupoInt > 1 ? (i === 1 ? '' : (i === 2 ? 'ões' : 's')) : '');
            }
            extensoFinal.push(extensoGrupo);
        }
    }
    return extensoFinal.join(" e ");
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
    const isAposentadoria = tipo === 'voluntaria' || tipo === 'incapacidade';
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
    document.querySelectorAll('#calculadora input[type="text"],#calculadora input[type="date"],#calculadora input[type="number"], #calculadora textarea, #calculadora input[type="checkbox"]').forEach(i => {
        if (i.type === 'checkbox') {
            i.checked = false;
        } else {
            i.value = '';
        }
    });
    document.getElementById('corpo-tabela').innerHTML = '';
    document.getElementById('resultado').innerHTML = '';
    document.getElementById('resultadoProjecao').innerHTML = '';
    document.getElementById('resultadoAbono').innerHTML = '';
    document.getElementById('resultadoLiquido').innerHTML = '';
    document.getElementById('resultado-resumo-media').innerHTML = '';
    document.getElementById('resultado-resumo-tempo').innerHTML = '';
    AppState.simulacaoResultados = {};
    if (AppState.salarioChart) AppState.salarioChart.destroy();
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById("dataCalculo").value = hoje;
    document.getElementById("dataRequerimento").value = hoje;
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
}

function adicionarLinha(mes = '', fator = '', salario = '') {
    const tbody = document.getElementById("corpo-tabela");
    const linha = document.createElement("tr");
    const vF = parseFloat(fator) || 0;
    const vS = parseFloat(salario) || 0;
    const vA = vF * vS > 0 ? (vF * vS).toFixed(2) : '';
    linha.innerHTML = `<td>${tbody.rows.length + 1}</td><td><input type="text" placeholder="MM/AAAA" value="${mes}"/></td><td><input type="number" step="0.000001" class="fator" value="${fator}" oninput="atualizarSalarioLinha(this)"/></td><td><input type="number" step="0.01" class="salario" value="${salario}" oninput="atualizarSalarioLinha(this)"/></td><td><input type="number" class="atualizado" value="${vA}" readonly/></td><td><button class="danger" style="margin:0;padding:5px;" onclick="excluirLinha(this)">Excluir</button></td>`;
    tbody.appendChild(linha);
    const aC = document.querySelector('#passo2 .accordion-content');
    if (aC && aC.style.maxHeight) {
        aC.style.maxHeight = aC.scrollHeight + "px";
    }
}

function limparTabela() {
    if (confirm("Tem certeza que deseja limpar todos os salários?")) {
        document.getElementById("corpo-tabela").innerHTML = "";
    }
}

function excluirLinha(b) {
    b.closest('tr').remove();
    renumerarLinhasTabela();
}

function renumerarLinhasTabela() {
    document.querySelectorAll("#corpo-tabela tr").forEach((l, i) => {
        l.cells[0].textContent = i + 1;
    });
}

function atualizarSalarioLinha(i) {
    const l = i.closest('tr');
    const f = l.querySelector('.fator');
    const s = l.querySelector('.salario');
    const a = l.querySelector('.atualizado');
    const F = parseFloat(f.value) || 0;
    const S = parseFloat(s.value) || 0;
    a.value = F > 0 && S > 0 ? (F * S).toFixed(2) : '';
}

function adicionarLinhaProvento(d = '', v = '') {
    const t = document.getElementById("corpo-tabela-proventos-ato");
    const l = document.createElement("tr");
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
    v.forEach(i => {
        t += parseFloat(i.value) || 0;
    });
    document.getElementById('total-proventos-ato').innerText = formatarDinheiro(t);
    AppState.simulacaoResultados.valorBeneficioFinal = t;
    return t;
}

function adicionarLinhaDependente(n = '', d = '', p = '', inv = 'Nao') {
    const t = document.getElementById('corpo-tabela-dependentes');
    const l = document.createElement('tr');
    l.innerHTML = `<td><input type="text" class="dependente-nome" value="${n}"></td><td><input type="date" class="dependente-dataNasc" value="${d}"></td><td><select class="dependente-parentesco"><option ${p === 'Cônjuge' ? 'selected' : ''}>Cônjuge</option><option ${p === 'Companheiro(a)' ? 'selected' : ''}>Companheiro(a)</option><option ${p === 'Filho(a)' ? 'selected' : ''}>Filho(a)</option><option ${p === 'Filho(a) Inválido(a)' ? 'selected' : ''}>Filho(a) Inválido(a)</option><option ${p === 'Mãe' ? 'selected' : ''}>Mãe</option><option ${p === 'Pai' ? 'selected' : ''}>Pai</option></select></td><td><select class="dependente-invalido"><option value="Nao" ${inv === 'Nao' ? 'selected' : ''}>Não</option><option value="Sim" ${inv === 'Sim' ? 'selected' : ''}>Sim</option></select></td><td><button class="danger" style="margin:0;padding:5px;" onclick="removerLinhaDependente(this)">Remover</button></td>`;
    t.appendChild(l);
}

function removerLinhaDependente(b) {
    b.closest('tr').remove();
}

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

    const somaTotal = salariosValidos.reduce((acc, s) => acc + s.value, 0);
    const media = somaTotal / salariosValidos.length;
    
    return { 
        media: media, 
        soma: somaTotal,
        totalSalarios: salariosValidos.length,
        salarios: salariosValidos
    };
}

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

            if (isAposentadoria) {
                const regrasElegibilidade = projetarAposentadoria(mediaResultados.media);
                
                resumoTempoDiv.innerHTML = regrasElegibilidade.html;
                AppState.simulacaoResultados.fundamentoLegal = regrasElegibilidade.fundamentoLegal;
                
                if (tipoBeneficio === 'voluntaria') {
                    valorBeneficioFinal = regrasElegibilidade.valorBeneficio;
                    descricaoCalculo = `Benefício calculado com base na regra de elegibilidade aplicável: <strong>${regrasElegibilidade.regraAplicada || 'Nenhuma regra cumprida'}</strong>.`;
                    verificarAbonoPermanencia();
                } else {
                    valorBeneficioFinal = calculateTotalProventos();
                    descricaoCalculo = `O valor do benefício por incapacidade é composto pelo somatório dos proventos detalhados.`;
                }

            } else {
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

function projetarAposentadoria(mS) {
    const dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00Z');
    const dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00Z');
    const sexo = document.getElementById('sexo').value;
    const tED = parseInt(document.getElementById('tempoExterno').value) || 0;
    const tSD = parseInt(document.getElementById('tempoEspecial').value) || 0;
    const isProfessor = document.getElementById('isProfessor').checked;
    
    const h = new Date();
    const dR = new Date('2019-11-13T00:00:00Z');
    
    const idadeAnos = (h - dN) / (1000 * 60 * 60 * 24 * 365.25);
    const tempoServicoAnos = (h - dA) / (1000 * 60 * 60 * 24 * 365.25);
    const tempoTotalContribuicaoAnos = tempoServicoAnos + (tED / 365.25) + (tSD / 365.25);
    const tempoContribuicaoPreReformaAnos = ((dR - dA) > 0 ? (dR - dA) / (1000 * 60 * 60 * 24 * 365.25) : 0) + (tED / 365.25) + (tSD / 365.25);

    let regras = {};
    let melhorRegraCumprida = null;

    const redutorTempo = isProfessor ? 5 : 0;
    const redutorIdade = isProfessor ? 5 : 0;
    
    const tempoNecessarioPed50 = (sexo === 'M' ? 35 : 30) - redutorTempo;
    if (tempoContribuicaoPreReformaAnos >= tempoNecessarioPed50 - 2) {
        const tempoPreReformaFaltante = Math.max(0, tempoNecessarioPed50 - tempoContribuicaoPreReformaAnos);
        const tempoComPedagio = tempoNecessarioPed50 + (tempoPreReformaFaltante * 0.5);
        if (tempoTotalContribuicaoAnos >= tempoComPedagio) {
            const fatorPrev = calcularFatorPrevidenciario(idadeAnos, tempoTotalContribuicaoAnos, sexo);
            regras['Pedágio 50%'] = { data: 'Já cumpriu!', valor: mS * fatorPrev, obs: `100% da média c/ Fator Prev. (${fatorPrev.toFixed(4)})`, legal: "Art. 17 EC 103/19", cumprida: true };
            if (!melhorRegraCumprida) melhorRegraCumprida = regras['Pedágio 50%'];
        }
    }

    const idadeMinimaPed100 = (sexo === 'M' ? 60 : 57) - redutorIdade;
    const tempoMinimoPed100 = (sexo === 'M' ? 35 : 30) - redutorTempo;
    if (idadeAnos >= idadeMinimaPed100 && tempoTotalContribuicaoAnos >= tempoMinimoPed100) {
        regras['Pedágio 100%'] = { data: 'Já cumpriu!', valor: mS, obs: '100% da média', legal: "Art. 20 EC 103/19", cumprida: true };
        if (!melhorRegraCumprida || regras['Pedágio 100%'].valor > melhorRegraCumprida.valor) melhorRegraCumprida = regras['Pedágio 100%'];
    }

    const pontosNecessarios = ((sexo === 'M' ? 96 : 86) - (isProfessor ? 5 : 0)) + (h.getFullYear() - 2019);
    const pontosAtuais = idadeAnos + tempoTotalContribuicaoAnos;
    const tempoMinimoPontos = (sexo === 'M' ? 35 : 30) - redutorTempo;
    if (pontosAtuais >= pontosNecessarios && tempoTotalContribuicaoAnos >= tempoMinimoPontos) {
        const valorBeneficioPontos = mS * Math.min(1, 0.6 + (Math.max(0, Math.floor(tempoTotalContribuicaoAnos) - (sexo === 'M' ? 20 : 15)) * 0.02));
        regras['Pontos'] = { data: 'Já cumpriu!', valor: valorBeneficioPontos, obs: '60% + 2% por ano acima de 20/15', legal: "Art. 4º EC 103/19", cumprida: true };
        if (!melhorRegraCumprida || regras['Pontos'].valor > melhorRegraCumprida.valor) melhorRegraCumprida = regras['Pontos'];
    }

    const idadeMinimaProgressiva = ((sexo === 'M' ? 61 : 56) - redutorIdade) + Math.floor((h.getFullYear() - 2019) / 2);
    const tempoMinimoIdadeProg = (sexo === 'M' ? 35 : 30) - redutorTempo;
     if (idadeAnos >= idadeMinimaProgressiva && tempoTotalContribuicaoAnos >= tempoMinimoIdadeProg) {
        const valorBeneficioIdadeProg = mS * Math.min(1, 0.6 + (Math.max(0, Math.floor(tempoTotalContribuicaoAnos) - (sexo === 'M' ? 20 : 15)) * 0.02));
        regras['Idade Progressiva'] = { data: 'Já cumpriu!', valor: valorBeneficioIdadeProg, obs: '60% + 2% por ano acima de 20/15', legal: "Art. 4º EC 103/19", cumprida: true };
        if (!melhorRegraCumprida || regras['Idade Progressiva'].valor > melhorRegraCumprida.valor) melhorRegraCumprida = regras['Idade Progressiva'];
    }

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

function calcularFatorPrevidenciario(i, t, s) {
    const iI = Math.floor(i);
    const eS = EXPECTATIVA_SOBREVIDA_IBGE[s][iI] || (s === 'M' ? 18.0 : 21.7);
    const a = 0.31;
    const f = t * a / eS * (1 + (i + t * a) / 100);
    return f < 0 ? 0 : f;
}

function verificarAbonoPermanencia() {
    const rAD = document.getElementById('resultadoAbono');
    const dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00Z');
    const dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00Z');
    const s = document.getElementById('sexo').value;
    const h = new Date();
    const i = (h - dN) / (1000 * 60 * 60 * 24 * 365.25);
    const tC = (h - dA) / (1000 * 60 * 60 * 24 * 365.25) + parseInt(document.getElementById('tempoExterno').value) / 365.25 + parseInt(document.getElementById('tempoEspecial').value) / 365.25;
    const iM = s === 'M' ? 62 : 57;
    const tM = s === 'M' ? 35 : 30;
    rAD.innerHTML = i >= iM && tC >= tM ? `<h3>✅ Abono de Permanência</h3><p>O servidor <b>cumpriu os requisitos</b> e, ao permanecer em atividade, tem direito ao Abono de Permanência.</p>` : '';
}

function desenharGrafico(s, m) {
    const ctx = document.getElementById("graficoSalarios").getContext("2d");
    if (AppState.salarioChart) AppState.salarioChart.destroy();
    const iDM = document.body.classList.contains('dark-mode');
    const bC = iDM ? '#90caf9' : '#0d47a1';
    const gC = iDM ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const fC = iDM ? '#eee' : '#333';
    AppState.salarioChart = new Chart(ctx, {
        type: "bar",
        data: { labels: s.map(i => i.label), datasets: [{ label: "Salário Atualizado (R$)", data: s.map(i => i.value.toFixed(2)), backgroundColor: bC }] },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Evolução dos Salários Atualizados', color: fC, font: { size: 16 } }, annotation: { annotations: { line1: { type: 'line', yMin: m, yMax: m, borderColor: 'red', borderWidth: 2, borderDash: [6, 6], label: { content: `Média: ${formatarDinheiro(m)}`, enabled: true, position: 'end', backgroundColor: 'rgba(255,0,0,0.7)' } } } } },
            scales: { y: { beginAtZero: true, ticks: { color: fC }, grid: { color: gC } }, x: { ticks: { color: fC }, grid: { color: gC } } }
        }
    });
}

function exportarExcel(b) {
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const d = [
                ["Info Servidor"],
                ["Nome", document.getElementById("nomeServidor").value],
                ["Matrícula", document.getElementById("matriculaServidor").value],
                ["CPF", document.getElementById("cpfServidor").value],
                [],
                ["Resumo"],
                ["Tipo", AppState.simulacaoResultados.tipo || ""],
                ["Média (R$)", AppState.simulacaoResultados.mediaSalarial ? AppState.simulacaoResultados.mediaSalarial.toFixed(2) : "N/A"],
                ["Valor Final (R$)", AppState.simulacaoResultados.valorBeneficioFinal ? AppState.simulacaoResultados.valorBeneficioFinal.toFixed(2) : "N/A"],
                [],
                ['Salários de Contribuição'],
                ['Nº', 'MÊS/ANO', 'FATOR', 'SALÁRIO', 'ATUALIZADO']
            ];
            document.querySelectorAll("#corpo-tabela tr").forEach((l, i) => d.push([i + 1, ...Array.from(l.querySelectorAll("input"), inp => inp.value)]));
            const ws = XLSX.utils.aoa_to_sheet(d);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Simulação");
            XLSX.writeFile(wb, "simulacao-previdencia.xlsx");
            ui.showToast("Exportado para Excel!", true);
        } catch (e) {
            ui.showToast("Erro ao exportar.", false);
            console.error(e);
        } finally {
            ui.toggleSpinner(b, false);
        }
    }, 50);
}

function importarExcel() {
    const f = document.getElementById('arquivoExcel').files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            const d = new Uint8Array(e.target.result);
            const wb = XLSX.read(d, { type: "array" });
            const s = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
            limparTabela();
            let sI = rows.findIndex(r => r.some(c => /(mês\/ano|mes\/ano)/i.test(String(c)))) + 1;
            if (sI === 0) sI = 1;
            for (let i = sI; i < rows.length; i++) {
                let [mA, f, s] = rows[i];
                if (!mA && !f && !s) continue;
                if (typeof mA === "number" && mA > 1) {
                    const date = XLSX.SSF.parse_date_code(mA);
                    if (date) mA = String(date.m).padStart(2, "0") + "/" + date.y;
                } else mA = String(mA);
                const fN = parseFloat(String(f).replace(",", "."));
                const sN = parseFloat(String(s).replace(",", "."));
                if (mA && !isNaN(fN) && !isNaN(sN)) adicionarLinha(mA, fN, sN);
            }
            ui.showToast("Planilha importada!", true);
        } catch (err) {
            ui.showToast("Erro ao processar Excel.", false);
            console.error(err);
        } finally {
            document.getElementById('arquivoExcel').value = '';
        }
    };
    r.readAsArrayBuffer(f);
}

function getPrintableHTML() {
    const n = document.getElementById("nomeServidor").value || "Servidor";
    const iV = document.getElementById('tipoBeneficio').value === 'voluntaria';
    return `<style>body{font-family:Arial,sans-serif;font-size:10px;color:#333}h2,h3{color:#0d47a1;border-bottom:1px solid #ccc;padding-bottom:4px}table{border-collapse:collapse;width:100%;margin-top:10px;font-size:9px}th,td{border:1px solid #ccc;padding:5px;text-align:left}th{background-color:#f2f2f2}.header{text-align:center;margin-bottom:20px}.header h1{margin:0;color:#0d47a1}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 15px}.info-grid p{margin:0}</style><div class="header"><h1>Relatório Previdenciário</h1><p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p></div><h2>Dados do Servidor</h2><div class="info-grid"><p><strong>Nome:</strong> ${n}</p><p><strong>Matrícula:</strong> ${document.getElementById("matriculaServidor").value}</p><p><strong>CPF:</strong> ${document.getElementById("cpfServidor").value}</p><p><strong>Cargo:</strong> ${document.getElementById("cargoServidor").value}</p><p><strong>Admissão:</strong> ${formatarDataBR(document.getElementById('dataAdmissao').value)}</p><p><strong>Nascimento:</strong> ${formatarDataBR(document.getElementById('dataNascimento').value)}</p></div>${document.getElementById("resultado").innerHTML}${document.getElementById("resultadoLiquido").innerHTML}${iV?document.getElementById("resultadoProjecao").innerHTML:''}${iV?document.getElementById("resultadoAbono").innerHTML:''}`;
}

function imprimirSimulacao() {
    document.getElementById("printableArea").innerHTML = getPrintableHTML();
    window.print();
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
}

function coletarDadosSimulacao() {
    const d = { passo1: {}, tabela: [], proventosAto: [], dependentes: [], resultados: AppState.simulacaoResultados };
    document.querySelectorAll('#passo1 input, #passo1 select, #passo1 textarea').forEach(e => {
        if (e.id) {
            if (e.type === 'checkbox') {
                d.passo1[e.id] = e.checked;
            } else {
                d.passo1[e.id] = e.value;
            }
        }
    });
    document.querySelectorAll("#corpo-tabela tr").forEach(l => {
        const i = l.querySelectorAll("input");
        d.tabela.push([i[0].value, i[1].value, i[2].value, i[3].value]);
    });
    document.querySelectorAll("#corpo-tabela-proventos-ato tr").forEach(l => d.proventosAto.push({ descricao: l.querySelector(".provento-descricao").value, valor: l.querySelector(".provento-valor").value }));
    document.querySelectorAll("#corpo-tabela-dependentes tr").forEach(l => d.dependentes.push({ nome: l.querySelector('.dependente-nome').value, dataNasc: l.querySelector('.dependente-dataNasc').value, parentesco: l.querySelector('.dependente-parentesco').value, invalido: l.querySelector('.dependente-invalido').value }));
    return d;
}

function listarHistorico() {
    const l = document.getElementById("listaHistorico");
    if (!l) return;
    l.innerHTML = "";
    if (!AppState.usuarioAtual) {
        l.innerHTML = "<li>Faça login para ver seu histórico.</li>";
        return;
    }
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const tR = JSON.parse(localStorage.getItem(c) || "[]");
    tR.sort((a, b) => new Date(b.data) - new Date(a.data));
    if (tR.length === 0) {
        l.innerHTML = "<li>Nenhuma simulação encontrada.</li>";
        return;
    }
    tR.forEach(r => {
        const i = document.createElement("li");
        const dF = new Date(r.data || Date.now()).toLocaleString('pt-BR');
        i.innerHTML = `<div class="item-info"><span>${r.nome}</span><small>${dF}</small></div><div class="item-actions"><button onclick="carregarDoHistorico('${r.id}')" title="Carregar"><i class="ri-folder-open-line"></i></button><button class="danger" onclick="excluirDoHistorico('${r.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        l.appendChild(i);
    });
}

function carregarDoHistorico(id) {
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
            if (e) {
                if (e.type === 'checkbox') {
                    e.checked = d.passo1[k];
                } else {
                    e.value = d.passo1[k];
                }
            }
        }
        document.getElementById('corpo-tabela').innerHTML = '';
        if (d.tabela) d.tabela.forEach(l => adicionarLinha(l[0], l[1], l[2]));

        document.getElementById('corpo-tabela-proventos-ato').innerHTML = '';
        if (d.proventosAto && d.proventosAto.length > 0) {
            d.proventosAto.forEach(p => adicionarLinhaProvento(p.descricao, p.valor));
        } else {
             adicionarLinhaProvento('Salário Base', '');
             adicionarLinhaProvento('Anuênio 25%', '');
             adicionarLinhaProvento('Indenização 20% Lei n.º 066/2017', '');
             adicionarLinhaProvento('Especialização L.033/07-A.26', '');
             adicionarLinhaProvento('Vantagem Pessoal Nominalmente Identificada - VPNI', '');
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
    }, 150);
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
}

function listarCTCsSalvas() {
    const l = document.getElementById("listaCTCsSalvas");
    if (!l) return;
    l.innerHTML = "";
    if (!AppState.usuarioAtual) {
        l.innerHTML = "<li>Faça login para ver suas CTCs.</li>";
        return;
    }
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const tC = JSON.parse(localStorage.getItem(ch) || "[]");
    tC.sort((a, b) => new Date(b.data) - new Date(a.data));
    if (tC.length === 0) {
        l.innerHTML = "<li>Nenhuma CTC salva.</li>";
        return;
    }
    tC.forEach(c => {
        const li = document.createElement("li");
        const dF = new Date(c.data || Date.now()).toLocaleString('pt-BR');
        const nS = c.dados.nomeServidor || 'Não informado';
        li.innerHTML = `<div class="item-info"><span>${c.nome}</span><small>${nS} - ${dF}</small></div><div class="item-actions"><button onclick="carregarCTC('${c.id}')" title="Carregar"><i class="ri-folder-open-line"></i></button><button class="danger" onclick="excluirCTC('${c.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        l.appendChild(li);
    });
}

function carregarCTC(id) {
    if (!AppState.usuarioAtual) return;
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const cs = JSON.parse(localStorage.getItem(ch) || "[]");
    const cE = cs.find(c => c.id === id);
    if (!cE) return ui.showToast("Erro: CTC não encontrada.", false);
    handleNavClick(null, 'geradorCTC');
    setTimeout(() => {
        const d = cE.dados;
        document.getElementById('ctc-nomeServidor').value = d.nomeServidor;
        document.getElementById('ctc-matricula').value = d.matricula;
        document.getElementById('ctc-cpf').value = d.cpf;
        document.getElementById('ctc-rg').value = d.rg;
        document.getElementById('ctc-dataNascimento').value = d.dataNascimento;
        document.getElementById('ctc-sexo').value = d.sexo;
        document.getElementById('ctc-cargo').value = d.cargo;
        document.getElementById('ctc-lotacao').value = d.lotacao;
        document.getElementById('ctc-dataAdmissao').value = d.dataAdmissao;
        document.getElementById('ctc-dataExoneracao').value = d.dataExoneracao;
        document.getElementById('ctc-processo').value = d.processo;
        const t = document.getElementById('corpo-tabela-periodos-ctc');
        t.innerHTML = '';
        if (d.periodos) d.periodos.forEach(p => adicionarLinhaPeriodoCTC(p.inicio, p.fim, p.deducoes, p.fonte));
        calcularTempoPeriodosCTC();
        ui.showToast(`CTC "${cE.nome}" carregada.`, true);
    }, 100);
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
}

function limparFormularioCTC() {
    document.querySelectorAll('#geradorCTC input, #geradorCTC select').forEach(i => i.value = '');
    document.getElementById('corpo-tabela-periodos-ctc').innerHTML = '';
    document.getElementById('ctc-cpf-status').textContent = '';
    document.getElementById('ctc-cpf').style.borderColor = 'var(--border-color)';
    calcularTempoTotalCTC();
}

function adicionarLinhaPeriodoCTC(i = '', f = '', d = '0', fo = '') {
    const t = document.getElementById('corpo-tabela-periodos-ctc');
    const l = document.createElement('tr');
    l.innerHTML = `<td><input type="date" class="ctc-inicio" onchange="calcularTempoPeriodosCTC()" value="${i}"></td><td><input type="date" class="ctc-fim" onchange="calcularTempoPeriodosCTC()" value="${f}"></td><td><input type="number" class="ctc-bruto" readonly></td><td><input type="number" class="ctc-deducoes" value="${d}" oninput="calcularTempoPeriodosCTC()"></td><td><input type="number" class="ctc-liquido" readonly></td><td><input type="text" class="ctc-fonte" value="${fo}" placeholder="Ex: ITAPREV"></td><td><button class="danger" style="margin:0;padding:5px;" onclick="removerLinhaPeriodoCTC(this)">Remover</button></td>`;
    t.appendChild(l);
}

function removerLinhaPeriodoCTC(b) {
    b.closest('tr').remove();
    calcularTempoTotalCTC();
}

function calcularTempoPeriodosCTC() {
    document.querySelectorAll("#corpo-tabela-periodos-ctc tr").forEach(l => {
        const iE = l.querySelector('.ctc-inicio');
        const fE = l.querySelector('.ctc-fim');
        const bE = l.querySelector('.ctc-bruto');
        const dE = l.querySelector('.ctc-deducoes');
        const lE = l.querySelector('.ctc-liquido');
        if (iE.value && fE.value) {
            const i = new Date(iE.value + 'T00:00:00Z');
            const f = new Date(fE.value + 'T00:00:00Z');
            if (f >= i) {
                const dT = Math.abs(f - i);
                const dD = Math.ceil(dT / 86400000) + 1;
                bE.value = dD;
                const d = parseInt(dE.value) || 0;
                lE.value = dD - d;
            } else {
                bE.value = 0;
                lE.value = 0;
            }
        } else {
            bE.value = '';
            lE.value = '';
        }
    });
    calcularTempoTotalCTC();
}

function calcularTempoTotalCTC() {
    let tD = 0;
    document.querySelectorAll("#corpo-tabela-periodos-ctc .ctc-liquido").forEach(i => tD += parseInt(i.value) || 0);
    const { anos, meses, dias } = diasParaAnosMesesDias(tD);
    document.getElementById('total-tempo-ctc').innerHTML = `Total: <b>${tD}</b> dias<br><small>(${anos}a, ${meses}m, ${dias}d)</small>`;
    return tD;
}

function diasParaAnosMesesDias(tD) {
    if (isNaN(tD) || tD < 0) return { anos: 0, meses: 0, dias: 0 };
    let d = Math.floor(tD);
    const a = Math.floor(d / 365.25);
    d %= 365.25;
    const m = Math.floor(d / 30.4375);
    d = Math.round(d % 30.4375);
    return { anos: a, meses: m, dias: d };
}

function exportarTudoZIP(b) {
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const z = new JSZip();
            const d = coletarDadosSimulacao();
            const nB = (d.passo1.nomeServidor || "simulacao").replace(/\s+/g, '_');
            z.file(`${nB}.json`, JSON.stringify(d, null, 2));
            let c = "MES_ANO;FATOR;SALARIO;ATUALIZADO\n";
            d.tabela.forEach(l => c += `${l[0]};${l[1]};${l[2]};${l[3]}\n`);
            z.file(`${nB}-salarios.csv`, c);
            z.file(`${nB}-relatorio.html`, getPrintableHTML());
            z.generateAsync({ type: "blob" }).then(ct => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(ct);
                a.download = `${nB}-pack.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                ui.showToast("Arquivo ZIP exportado!", true);
            });
        } catch (e) {
            ui.showToast("Erro ao exportar ZIP.", false);
            console.error(e);
        } finally {
            ui.toggleSpinner(b, false);
        }
    }, 50);
}

function calcularTempoEntreDatas() {
    const dataInicioStr = document.getElementById('calc-data-inicio').value;
    const dataFimStr = document.getElementById('calc-data-fim').value;
    const resultadoContainer = document.getElementById('resultado-calculo-tempo');
    if (!dataInicioStr || !dataFimStr) {
        resultadoContainer.innerHTML = `<p style="color: var(--danger-color); margin: auto;">Por favor, preencha ambas as datas.</p>`;
        return;
    }
    const dataInicio = new Date(dataInicioStr + 'T00:00:00Z');
    const dataFim = new Date(dataFimStr + 'T00:00:00Z');
    if (dataFim < dataInicio) {
        resultadoContainer.innerHTML = `<p style="color: var(--danger-color); margin: auto;">A data final deve ser maior ou igual à data inicial.</p>`;
        return;
    }
    const diffTime = dataFim.getTime() - dataInicio.getTime();
    const totalDias = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

Object.assign(window, {
    auth, ui, handleNavClick, atualizarDashboardView, irParaPasso, alternarCamposBeneficio,
    adicionarLinha, limparTabela, exportarExcel, importarExcel, atualizarSalarioLinha, excluirLinha,
    calcularBeneficio, adicionarLinhaProvento, calculateTotalProventos, excluirLinhaProvento,
    adicionarLinhaDependente, removerLinhaDependente, salvarSimulacaoHistorico, imprimirSimulacao,
    exportarTudoZIP, gerarAtoDeAposentadoria, gerarAtoDePensao, carregarDoHistorico, excluirDoHistorico,
    adicionarLinhaPeriodoCTC, calcularTempoPeriodosCTC, removerLinhaPeriodoCTC, salvarCTC,
    carregarCTC, excluirCTC, alternarTema
});
