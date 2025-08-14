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
const analytics = getAnalytics(app);
const _auth = getAuth(app);
const provider = new GoogleAuthProvider();

const EMAILS_AUTORIZADOS = ["samarabarroson@gmail.com", "samiaalvesbarroso@gmail.com", "josyy.ns1010@gmail.com", "domingosbarroson@gmail.com", "setordebeneficiositaprev@gmail.com"].map(e => e.toLowerCase());
const ADMIN_EMAILS = ["domingosbarroson@gmail.com"].map(e => e.toLowerCase());

// =================================================================================
//  CONFIGURAÇÕES GLOBAIS E CONSTANTES LEGAIS
// =================================================================================
// ATENÇÃO: Este valor deve ser atualizado anualmente conforme o novo salário mínimo nacional.
const SALARIO_MINIMO = 1518.00; 

const AppState = {
    usuarioAtual: null,
    salarioChart: null,
    simulacaoResultados: {},
    dashboardViewMode: 'meus_registros',
    currentStep: 1,
    configuracoes: { nomePrefeito: '', nomePresidente: '' }
};

const auth = {
    loginGoogle: async () => {
        try {
            await signInWithRedirect(_auth, provider);
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

        // Formata o dia da semana por extenso (ex: "terça-feira")
        const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(agora);
        // Formata a data como DD/MM (ex: "12/08")
        const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(agora);
        // Formata a hora como HH:MM (ex: "19:13")
        const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(agora);

        // Garante que a primeira letra do dia da semana seja maiúscula
        const diaSemanaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

        // Monta o HTML final com ícones e o novo formato
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

// =================================================================================
// FUNÇÕES DE GESTÃO DE CONFIGURAÇÕES
// =================================================================================

/**
 * Carrega as configurações do localStorage para a memória do App (AppState).
 * É seguro chamar esta função na inicialização.
 */
function carregarConfiguracoes() {
    const configsSalvas = localStorage.getItem('itaprevConfiguracoes');
    if (configsSalvas) {
        try {
            // Tenta carregar as configurações salvas
            AppState.configuracoes = JSON.parse(configsSalvas);
        } catch (e) {
            console.error("Erro ao ler as configurações do localStorage. Usando valores padrão.", e);
            // Se houver um erro (JSON corrompido), usa os valores padrão
            AppState.configuracoes = { nomePrefeito: '', nomePresidente: '' };
        }
    }
}

/**
 * Popula os campos do formulário na tela de Configurações com os dados da memória (AppState).
 * Deve ser chamada apenas quando a tela de configurações for exibida.
 */
function popularCamposConfiguracoes() {
    const nomePrefeitoInput = document.getElementById('config-nome-prefeito');
    const nomePresidenteInput = document.getElementById('config-nome-presidente');

    if (nomePrefeitoInput) {
        nomePrefeitoInput.value = AppState.configuracoes.nomePrefeito || '';
    }
    if (nomePresidenteInput) {
        nomePresidenteInput.value = AppState.configuracoes.nomePresidente || '';
    }
}

function salvarConfiguracoes(button) {
    ui.toggleSpinner(button, true);
    try {
        const nomePrefeito = document.getElementById('config-nome-prefeito').value;
        const nomePresidente = document.getElementById('config-nome-presidente').value;

        AppState.configuracoes = {
            nomePrefeito: nomePrefeito.toUpperCase(),
            nomePresidente: nomePresidente.toUpperCase()
        };

        localStorage.setItem('itaprevConfiguracoes', JSON.stringify(AppState.configuracoes));
        ui.showToast("Configurações salvas com sucesso!", true);

    } catch (err) {
        console.error("Erro ao salvar configurações:", err);
        ui.showToast("Ocorreu um erro ao salvar as configurações.", false);
    } finally {
        ui.toggleSpinner(button, false);
    }
}

// =================================================================================
// FUNÇÕES DE GERAÇÃO DE DOCUMENTOS
// =================================================================================

function gerarAtoDePensao(b) {
    ui.toggleSpinner(b, true);
    try {
        const d = {
            atoNumero: document.getElementById('atoNumero').value || '____',
            atoAno: new Date().getFullYear(),
            processo: document.getElementById('processoAdministrativo').value || '____',
            nomePensionista: document.getElementById('nomePensionista').value.toUpperCase() || '________________',
            relacaoPensionista: document.getElementById('relacaoPensionista').value.toLowerCase() || '________________',
            statusServidor: document.getElementById('tipoBeneficio').value === 'pensao_aposentado' ? 'inativo(a)' : 'ativo(a)',
            nomeServidor: document.getElementById('nomeServidor').value.toUpperCase() || '________________',
            cargoServidor: document.getElementById('cargoServidor').value.toUpperCase() || '________________',
            cpfServidor: document.getElementById('cpfServidor').value || '________________',
            matriculaServidor: document.getElementById('matriculaServidor').value || '________________',
            dataObito: formatarDataBR(document.getElementById('dataObito').value, false) || '__/__/____',
            valorBeneficio: AppState.simulacaoResultados.valorBeneficioFinal || 0,
            dataAtual: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
            nomeDiretor: AppState.configuracoes.nomePresidente || 'PRESIDENTE DO ITAPREV'
        };
        const vE = valorPorExtenso(d.valorBeneficio) + " reais",
            vF = formatarDinheiro(d.valorBeneficio),
            dV = d.dataObito,
            e = `<style>body{font-family:'Times New Roman',Times,serif;color:black;background-color:white;line-height:1.5;font-size:12pt;margin:0;padding:20mm;}.container{width:210mm;min-height:297mm;box-sizing:border-box;}.center{text-align:center;}.bold{font-weight:bold;}.uppercase{text-transform:uppercase;}.justify{text-align:justify;}.indent{text-indent:50px;}p,h3{margin:0;}.header p{margin-bottom:5px;}h3.title{margin-top:40px;border:none;font-weight:bold;}p.considerando{margin-top:50px;}h3.resolve{text-align:center;font-weight:bold;margin-top:40px;margin-bottom:30px;border:none;}p.artigo{margin-top:15px;}p.cumpra-se{text-align:center;margin-top:60px;}p.data-local{text-align:center;margin-top:40px;}.assinatura{text-align:center;margin-top:80px;}@media print{body{padding:0;}}</style>`,
            cH = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ato de Pensão Nº ${d.atoNumero}/${d.atoAno}</title>${e}</head><body><div class="container"><div class="center header"><p class="bold">PREFEITURA MUNICIPAL DE ITAPIPOCA</p><p class="bold">INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA – ITAPREV</p><h3 class="title">ATO DE PENSÃO Nº ${d.atoNumero}/${d.atoAno}</h3></div><p class="justify indent considerando">O DIRETOR PRESIDENTE DO INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA – ITAPREV, no uso de suas atribuições legais, conferidas pela Lei Orgânica do Município e pela Lei Municipal nº 047/2008, e</p><p class="justify indent">CONSIDERANDO o requerimento formulado pelo(a) interessado(a), que deu origem ao Processo Administrativo nº <span class="bold">${d.processo}</span>,</p><h3 class="resolve">RESOLVE:</h3><p class="justify indent artigo"><b>Art. 1º</b> - CONCEDER o benefício de <b>PENSÃO POR MORTE</b>, ao(à) pensionista <b class="uppercase">${d.nomePensionista}</b>, na qualidade de <b class="uppercase">${d.relacaoPensionista}</b> do(a) ex-servidor(a) ${d.statusServidor}, <b class="uppercase">${d.nomeServidor}</b>, ocupante do cargo de <b class="uppercase">${d.cargoServidor}</b>, CPF nº <b>${d.cpfServidor}</b>, Matrícula nº <b>${d.matriculaServidor}</b>, falecido(a) em <b>${d.dataObito}</b>.</p><p class="justify indent artigo"><b>Art. 2º</b> - O valor do benefício corresponderá à cota familiar de 50% (cinquenta por cento), acrescida de cotas de 10% (dez por cento) por dependente, até o máximo de 100% (cem por cento), aplicada sobre o valor dos proventos do servidor falecido, totalizando <b>${vF}</b> (<span class="bold uppercase">${vE}</span>).</p><p class="justify indent artigo"><b>Art. 3º</b> - A presente pensão tem como fundamento legal o Art. 23 da Emenda Constitucional nº 103/2019 e os Arts. 45 a 52 da Lei Municipal nº 047/2008.</p><p class="justify indent artigo"><b>Art. 4º</b> - Este ato entra em vigor na data de sua publicação, com efeitos financeiros a partir de <b>${dV}</b>, data do óbito do instituidor.</p><p class="cumpra-se">REGISTRE-SE, PUBLIQUE-SE E CUMPRA-SE.</p><p class="data-local">Itapipoca-CE, ${d.dataAtual}.</p><div class="assinatura"><p class="bold uppercase">${d.nomeDiretor}</p><p>Diretor Presidente do ITAPREV</p></div></div></body></html>`;
        const nA = window.open();
        nA.document.open();
        nA.document.write(cH);
        nA.document.close();
        ui.showToast("Documento gerado.", true);
    } catch (er) {
        ui.showToast("Erro ao gerar o documento.", false);
        console.error(er);
    } finally {
        ui.toggleSpinner(b, false);
    }
}

function gerarAtoDeAposentadoria(b) {
    ui.toggleSpinner(b, true);
    try {
        const s = document.getElementById('sexo').value,
            tP = calculateTotalProventos(),
            tB = document.getElementById('tipoBeneficio').value,
            aD = s === 'F' ? 'A' : 'O',
            sS = s === 'F' ? 'SERVIDORA' : 'SERVIDOR',
            aP = s === 'F' ? 'PÚBLICA' : 'PÚBLICO',
            pP = s === 'F' ? 'portadora' : 'portador',
            pPo = s === 'F' ? 'da' : 'do',
            nac = s === 'F' ? 'brasileira' : 'brasileiro',
            d = {
                atoNumero: document.getElementById('atoNumeroAposentadoria').value.padStart(3, '0') || '___',
                atoAno: new Date().getFullYear(),
                nomeServidor: document.getElementById('nomeServidor').value.toUpperCase() || '________________',
                nacionalidade: nac,
                rg: document.getElementById('rgServidor').value || '________________',
                cpf: document.getElementById('cpfServidor').value || '________________',
                matricula: document.getElementById('matriculaServidor').value || '________________',
                cargaHoraria: document.getElementById('cargaHorariaServidor').value || '________________',
                cargo: document.getElementById('cargoServidor').value.toUpperCase() || '________________',
                lotacao: document.getElementById('lotacaoServidor').value.toUpperCase() || '________________',
                admissao: formatarDataBR(document.getElementById('dataAdmissao').value, true) || '__/__/____',
                fundamentoLegal: document.getElementById('fundamentoLegalPersonalizado').value.replace(/\n/g, '<br>') || '________________',
                dataAtual: formatarDataPorExtenso(document.getElementById('dataCalculo').value) || formatarDataPorExtenso(new Date().toISOString().split('T')[0]),
            };
        let tA = '',
            pR = '';
        if (tB === 'voluntaria') {
            tA = 'ATO CONCESSIVO DE APOSENTADORIA VOLUNTÁRIA';
            pR = `APOSENTAR VOLUNTARIAMENTE ${aD} ${sS} ${aP} <b class="uppercase">${d.nomeServidor}</b>`;
        } else if (tB === 'incapacidade') {
            tA = 'ATO CONCESSIVO DE APOSENTADORIA POR INCAPACIDADE PERMANENTE';
            const iG = document.getElementById('incapacidadeGrave').value;
            const tPr = iG === 'sim' ? 'COM PROVENTOS INTEGRAIS' : 'COM PROVENTOS PROPORCIONAIS';
            pR = `APOSENTAR POR INCAPACIDADE PERMANENTE, ${tPr}, ${aD} ${sS} ${aP} <b class="uppercase">${d.nomeServidor}</b>`;
        } else if (tB === 'compulsoria') {
            tA = 'ATO CONCESSIVO DE APOSENTADORIA COMPULSÓRIA';
            pR = `APOSENTAR COMPULSORIAMENTE, COM PROVENTOS PROPORCIONAIS, ${aD} ${sS} ${aP} <b class="uppercase">${d.nomeServidor}</b>`;
        }
        
        const vF = formatarDinheiro(tP),
            tE = valorPorExtenso(tP);
        let pHTR = '';
        document.querySelectorAll("#corpo-tabela-proventos-ato tr").forEach(l => {
            const desc = l.querySelector('.provento-descricao').value || '',
                v = parseFloat(l.querySelector('.provento-valor').value) || 0;
            if (desc && v > 0) pHTR += `<tr><td>${desc}</td><td>${formatarDinheiro(v)}</td></tr>`;
        });
        const e = `<style>body{font-family:'Times New Roman',Times,serif;color:black;background-color:white;line-height:1.5;font-size:12pt;margin:0;padding:20mm;}.container{width:210mm;min-height:297mm;box-sizing:border-box;}.center{text-align:center;}.bold{font-weight:bold;}.uppercase{text-transform:uppercase;}.justify{text-align:justify;}.header{margin-bottom:25px;}h4.title{margin:0;font-weight:bold;}p{margin:1em 0;}.resolve-text{margin-top:25px;}.proventos-table{width:100%;border-collapse:collapse;margin:20px 0;border:1px solid black;}.proventos-table th,.proventos-table td{border:1px solid black;padding:5px;}.proventos-table th{background-color:#e0e0e0;text-align:center;}.proventos-table td:last-child{text-align:right;}.proventos-table tfoot td{font-weight:bold;}.signature-block{margin-top:80px;text-align:center;}.signature-block p{margin:0;line-height:1.2;}@media print{body{padding:0;}}</style>`,
            cH = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ato de Aposentadoria Nº ${d.atoNumero}/${d.atoAno}</title>${e}</head><body><div class="container"><div class="center header"><h4 class="title uppercase">${tA} N.º ${d.atoNumero}/${d.atoAno}.</h4></div><p class="justify">O PREFEITO MUNICIPAL DE ITAPIPOCA, no uso de suas atribuições legais, que lhe confere a Lei Orgânica do Município de Itapipoca e a Presidente do Instituto de Previdência do Município de Itapipoca – ITAPREV, no uso de suas atribuições conferidas,</p><h4 class="center uppercase">RESOLVEM:</h4><p class="justify resolve-text">${pR}, ${d.nacionalidade}, ${pP} do RG n.º ${d.rg}, inscrit${s==='F'?'a':'o'} no CPF sob o n.º ${d.cpf}, matrícula n.º ${d.matricula}, ${d.cargaHoraria}, ocupante do cargo de <b class="uppercase">${d.cargo}</b>, lotad${s==='F'?'a':'o'} na <b class="uppercase">${d.lotacao}</b>, com admissão no serviço público em ${d.admissao}, ${d.fundamentoLegal}, com início do benefício na data da publicação deste Ato de Aposentadoria, de acordo com o quadro discriminativo abaixo:</p><table class="proventos-table"><thead><tr><th>CÁLCULO DOS PROVENTOS</th><th>VALOR</th></tr></thead><tbody>${pHTR}</tbody><tfoot><tr><td>TOTAL DOS PROVENTOS</td><td>${vF}</td></tr></tfoot></table><p class="justify">Desse modo, os proventos ${pPo} ${sS.toLowerCase()} serão fixados em ${vF} (${tE}).</p><p class="center">Itapipoca – CE, ${d.dataAtual}.</p><div class="signature-block"><p class="uppercase bold">${AppState.configuracoes.nomePrefeito || 'NOME DO PREFEITO(A)'}</p><p>Prefeito Municipal</p></div><div class="signature-block"><p class="uppercase bold">${AppState.configuracoes.nomePresidente || 'NOME DO(A) PRESIDENTE'}</p><p>Presidente do ITAPREV</p></div></div></body></html>`;
        const nA = window.open();
        nA.document.open();
        nA.document.write(cH);
        nA.document.close();
        ui.showToast("Documento gerado.", true);
    } catch (er) {
        ui.showToast("Erro ao gerar o documento.", false);
        console.error(er);
    } finally {
        ui.toggleSpinner(b, false);
    }
}

function gerarDocumentoCTC(b) {
    ui.toggleSpinner(b, true);
    try {
        const dS = {
            nome: document.getElementById("ctc-nomeServidor").value || "________________",
            matricula: document.getElementById("ctc-matricula").value || "________________",
            cpf: document.getElementById("ctc-cpf").value || "________________",
            rg: document.getElementById("ctc-rg").value || "________________",
            dataNascimento: formatarDataBR(document.getElementById("ctc-dataNascimento").value, false) || '__/__/____',
            sexo: document.getElementById("ctc-sexo").options[document.getElementById("ctc-sexo").selectedIndex].text,
            cargo: document.getElementById("ctc-cargo").value || "________________",
            lotacao: document.getElementById("ctc-lotacao").value || "________________",
            dataAdmissao: formatarDataBR(document.getElementById("ctc-dataAdmissao").value, false) || '__/__/____',
            dataExoneracao: formatarDataBR(document.getElementById("ctc-dataExoneracao").value, false) || '__/__/____',
            processo: document.getElementById("ctc-processo").value || "________________",
        };
        let rH = "";
        Array.from(document.querySelectorAll("#corpo-tabela-periodos-ctc tr")).forEach(tr => {
            const dI = formatarDataBR(tr.children[0]?.querySelector("input")?.value, false) || "",
                dF = formatarDataBR(tr.children[1]?.querySelector("input")?.value, false) || "",
                br = tr.children[2]?.querySelector("input")?.value || "0",
                de = tr.children[3]?.querySelector("input")?.value || "0",
                li = tr.children[4]?.querySelector("input")?.value || "0",
                fo = tr.children[5]?.querySelector("input")?.value || "";
            rH += `<tr><td>${dI}</td><td>${dF}</td><td>${br}</td><td>${de}</td><td>${li}</td><td>${fo}</td></tr>`;
        });
        const tTT = document.getElementById("total-tempo-ctc").innerText.replace("Total: ", "").split("\n")[0];
        const nR = AppState.usuarioAtual.displayName.toUpperCase() || "________________";
        const e = `<style>body{font-family:Arial,sans-serif;margin:40px;color:#333;font-size:11pt;}.container{max-width:800px;margin:auto;}.header,.footer{text-align:center;}.header h3{margin:0;}.header p{margin:5px 0;}.section{margin-top:25px;}.section h4{margin-top:0;margin-bottom:10px;padding-bottom:3px;border-bottom:1px solid #999;}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 15px;}.info-grid span{font-weight:bold;}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:10pt;}th,td{border:1px solid #777;padding:6px;text-align:center;}th{background-color:#f0f0f0;}.footer p{margin:0;}.signature{margin-top:60px;}</style>`,
            cH = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Certidão de Tempo de Contribuição</title>${e}</head><body><div class="container"><div class="header"><h3>CERTIDÃO DE TEMPO DE CONTRIBUIÇÃO</h3><p>Processo Administrativo Nº: ${dS.processo}</p></div><div class="section"><h4>I - DADOS DO SERVIDOR</h4><div class="info-grid"><p><span>Nome:</span> ${dS.nome}</p><p><span>Matrícula:</span> ${dS.matricula}</p><p><span>CPF:</span> ${dS.cpf}</p><p><span>RG:</span> ${dS.rg}</p><p><span>Data Nasc:</span> ${dS.dataNascimento}</p><p><span>Sexo:</span> ${dS.sexo}</p><p><span>Cargo Efetivo:</span> ${dS.cargo}</p><p><span>Lotação:</span> ${dS.lotacao}</p><p><span>Admissão:</span> ${dS.dataAdmissao}</p><p><span>Exoneração:</span> ${dS.dataExoneracao}</p></div></div><div class="section"><h4>II - PERÍODOS DE CONTRIBUIÇÃO</h4><table><thead><tr><th>Início</th><th>Fim</th><th>Tempo Bruto (dias)</th><th>Deduções (dias)</th><th>Tempo Líquido (dias)</th><th>Fonte / Obs.</th></tr></thead><tbody>${rH}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">TEMPO LÍQUIDO TOTAL:</td><td style="font-weight:bold;">${tTT}</td><td></td></tr></tfoot></table></div><div class="section footer"><p>Certifico que as informações acima constam nos registros desta instituição.</p><div class="signature"><p>_________________________________________</p><p><b>${nR}</b></p></div></div></div></body></html>`;
        const nA = window.open();
        nA.document.open();
        nA.document.write(cH);
        nA.document.close();
        ui.showToast("CTC gerada.", true);
    } catch (er) {
        console.error("Erro CTC:", er);
        ui.showToast("Erro ao gerar a CTC.", false);
    } finally {
        ui.toggleSpinner(b, false);
    }
}

function calculateValorLiquido(pB) {
    if (pB <= 0) {
        document.getElementById('resultadoLiquido').innerHTML = '';
        return;
    }

    const tetoRGPS = 7786.02;
    const tipoBeneficio = document.getElementById('tipoBeneficio').value;
    let baseIsencaoContribuicao = SALARIO_MINIMO * 3;
    let descricaoContribuicao = `(14% sobre o que excede 3 salários mínimos - ${formatarDinheiro(baseIsencaoContribuicao)})`;

    if (tipoBeneficio === 'incapacidade') {
        baseIsencaoContribuicao = tetoRGPS;
        descricaoContribuicao = `(14% sobre o que excede o teto do RGPS - ${formatarDinheiro(baseIsencaoContribuicao)})`;
    }

    let contribuicaoRPPS = 0;
    if (pB > baseIsencaoContribuicao) {
        contribuicaoRPPS = (pB - baseIsencaoContribuicao) * 0.14;
    }

    const baseCalculoIR = pB - contribuicaoRPPS;
    let impostoRenda = 0;
    if (baseCalculoIR > 2259.20) {
        if (baseCalculoIR <= 2826.65) impostoRenda = baseCalculoIR * 0.075 - 169.44;
        else if (baseCalculoIR <= 3751.05) impostoRenda = baseCalculoIR * 0.15 - 381.44;
        else if (baseCalculoIR <= 4664.68) impostoRenda = baseCalculoIR * 0.225 - 662.77;
        else impostoRenda = baseCalculoIR * 0.275 - 896.00;
    }
    impostoRenda = Math.max(0, impostoRenda);

    const totalDescontos = contribuicaoRPPS + impostoRenda;
    const valorLiquido = pB - totalDescontos;

    const html = `<h3>Estimativa do Valor Líquido</h3>
                  <p>Simulação dos descontos legais sobre o valor bruto do benefício.</p>
                  <table>
                      <tr><td>(+) Provento Bruto</td><td>${formatarDinheiro(pB)}</td></tr>
                      <tr><td>(-) Contribuição RPPS (Inativos) ${descricaoContribuicao}</td><td>${formatarDinheiro(contribuicaoRPPS)}</td></tr>
                      <tr><td>(-) Imposto de Renda Retido na Fonte (IRRF)</td><td>${formatarDinheiro(impostoRenda)}</td></tr>
                      <tr style="font-weight:bold;"><td>(=) Valor Líquido Estimado</td><td>${formatarDinheiro(valorLiquido)}</td></tr>
                  </table>
                  <small>Nota: Valores de descontos são estimativas e podem variar. As faixas do IR e o valor do Salário Mínimo devem ser atualizados periodicamente.</small>`;
    document.getElementById('resultadoLiquido').innerHTML = html;
}


function projetarAposentadoria(mS) {
    const rPD = document.getElementById('resultadoProjecao'),
        dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00'),
        dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00'),
        s = document.getElementById('sexo').value,
        tED = parseInt(document.getElementById('tempoExterno').value) || 0,
        tSD = parseInt(document.getElementById('tempoEspecial').value) || 0,
        h = new Date(),
        dR = new Date('2019-11-13T00:00:00'),
        iA = (h - dN) / 31557600000,
        tSP = (h - dA) / 31557600000,
        tCT = tSP + tED / 365.25 + tSD / 365.25,
        tCR = (dR - dA) / 31557600000 + tED / 365.25 + tSD / 365.25;
    let p = {},
        rA = null;
    const vRG = mS * Math.min(1, 0.6 + Math.max(0, Math.floor(tCT) - 20) * 0.02);
    const tMP50 = s === 'M' ? 33 : 28;
    if (tCR >= tMP50) {
        const tN = s === 'M' ? 35 : 30,
            tF = Math.max(0, tN - tCR),
            ped = tF * 0.5;
        if (tCT >= tN + ped) {
            const fP = calcularFatorPrevidenciario(iA, tCT, s);
            p['Pedágio 50%'] = { data: 'Já cumpriu!', valor: mS * fP, obs: `Fator Prev: ${fP.toFixed(4)}`, legal: "Art. 17 EC 103/19" };
            if (!rA) rA = p['Pedágio 50%'].legal;
        } else {
            p['Pedágio 50%'] = { data: 'Não cumpriu', valor: 0, obs: 'Requer tempo + pedágio' };
        }
    }
    const iMP100 = s === 'M' ? 60 : 57,
        tNP100 = s === 'M' ? 35 : 30;
    if (iA >= iMP100 && tCT >= tNP100) {
        p['Pedágio 100%'] = { data: 'Já cumpriu!', valor: mS, obs: '100% da média', legal: "Art. 20 EC 103/19" };
        if (!rA) rA = p['Pedágio 100%'].legal;
    } else {
        const aPI = Math.max(0, iMP100 - iA),
            aPT = Math.max(0, tNP100 - tCT),
            aF = Math.max(aPI, aPT);
        if (aF < 40) {
            const dP = new Date();
            dP.setFullYear(dP.getFullYear() + Math.ceil(aF));
            p['Pedágio 100%'] = { data: `~ ${dP.toLocaleDateString('pt-BR')}`, valor: mS, obs: '100% da média' };
        }
    }
    const aA = h.getFullYear(),
        iMP = (s === 'M' ? 61 : 56) + Math.floor((aA - 2019) * 0.5),
        tMP = s === 'M' ? 35 : 30;
    if (iA >= iMP && tCT >= tMP) {
        p['Idade Progressiva'] = { data: 'Já cumpriu!', valor: vRG, obs: '60% + 2% por ano', legal: "Art. 4º EC 103/19 c/c Lei 047/08" };
        if (!rA) rA = p['Idade Progressiva'].legal;
    }
    let pA = iA + tCT,
        pN = (s === 'M' ? 96 : 86) + h.getFullYear() - 2019;
    if (pA >= pN) {
        p['Pontos'] = { data: 'Já cumpriu!', valor: vRG, obs: '60% + 2% por ano', legal: "Art. 4º EC 103/19 c/c Lei 047/08" };
        if (!rA) rA = p['Pontos'].legal;
    }
    const R_IM_M = 65,
        R_IM_F = 62;
    if (iA >= (s === 'M' ? R_IM_M : R_IM_F) && tCT >= 25) {
        p['Regra Permanente'] = { data: 'Já cumpriu!', valor: vRG, obs: '60% + 2% por ano', legal: "Art. 10 EC 103/19 c/c Lei 047/08" };
        if (!rA) rA = p['Regra Permanente'].legal;
    } else {
        const aPI = Math.max(0, (s === 'M' ? R_IM_M : R_IM_F) - iA);
        if (aPI < 40) {
            const dP = new Date();
            dP.setFullYear(dP.getFullYear() + Math.ceil(aPI));
            p['Regra Permanente'] = { data: `~ ${dP.toLocaleDateString('pt-BR')}`, valor: vRG, obs: 'Requer 25a contrib.' };
        }
    }
    AppState.simulacaoResultados.fundamentoLegal = rA;
    let html = `<h3>📅 Projeção de Elegibilidade</h3><p>Idade: ${iA.toFixed(1)}, Tempo Contrib.: ${tCT.toFixed(1)} anos</p><table><thead><tr><th>Regra</th><th>Data</th><th>Valor</th><th>Obs.</th></tr></thead><tbody>`;
    if (Object.keys(p).length > 0) {
        for (const r in p) html += `<tr><td>${r}</td><td>${p[r].data}</td><td>${p[r].valor>0?formatarDinheiro(p[r].valor):'-'}</td><td>${p[r].obs||''}</td></tr>`;
    } else html += `<tr><td colspan="4">Nenhuma regra cumprida.</td></tr>`;
    html += '</tbody></table><small>Nota: Projeções são estimativas.</small>';
    rPD.innerHTML = html;
}

function calcularFatorPrevidenciario(i, t, s) {
    const iI = Math.floor(i),
        eS = EXPECTATIVA_SOBREVIDA_IBGE[s][iI] || (s === 'M' ? 18.0 : 21.7),
        a = 0.31,
        f = t * a / eS * (1 + (i + t * a) / 100);
    return f < 0 ? 0 : f;
}

function verificarAbonoPermanencia() {
    const rAD = document.getElementById('resultadoAbono'),
        dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00'),
        dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00'),
        s = document.getElementById('sexo').value,
        h = new Date(),
        i = (h - dN) / 31557600000,
        tC = (h - dA) / 31557600000 + parseInt(document.getElementById('tempoExterno').value) / 365.25 + parseInt(document.getElementById('tempoEspecial').value) / 365.25,
        iM = s === 'M' ? 62 : 57,
        tM = s === 'M' ? 35 : 30;
    rAD.innerHTML = i >= iM && tC >= tM ? `<h3>✅ Abono de Permanência</h3><p>O servidor <b>cumpriu os requisitos</b> e, ao permanecer em atividade, tem direito ao Abono de Permanência.</p>` : '';
}

function desenharGrafico(s, m) {
    const ctx = document.getElementById("graficoSalarios").getContext("2d");
    if (AppState.salarioChart) AppState.salarioChart.destroy();
    const iDM = document.body.classList.contains('dark-mode'),
        bC = iDM ? '#90caf9' : '#0d47a1',
        gC = iDM ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        fC = iDM ? '#eee' : '#333';
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
            const ws = XLSX.utils.aoa_to_sheet(d),
                wb = XLSX.utils.book_new();
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
            const d = new Uint8Array(e.target.result),
                wb = XLSX.read(d, { type: "array" }),
                s = wb.Sheets[wb.SheetNames[0]],
                rows = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
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
                const fN = parseFloat(String(f).replace(",", ".")),
                    sN = parseFloat(String(s).replace(",", "."));
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
    const n = document.getElementById("nomeServidor").value || "Servidor",
        iV = document.getElementById('tipoBeneficio').value === 'voluntaria';
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
    const d = { id: crypto.randomUUID(), nome: n, dados: coletarDadosSimulacao(), data: new Date().toISOString() },
        c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`,
        h = JSON.parse(localStorage.getItem(c) || "[]");
    h.unshift(d);
    localStorage.setItem(c, JSON.stringify(h));
    ui.showToast("Simulação salva no histórico!", true);
    listarHistorico();
}

function coletarDadosSimulacao() {
    const d = { passo1: {}, tabela: [], proventosAto: [], dependentes: [], resultados: AppState.simulacaoResultados };
    document.querySelectorAll('#passo1 input,#passo1 select,#passo1 textarea').forEach(e => { if (e.id) d.passo1[e.id] = e.value; });
    document.querySelectorAll("#corpo-tabela tr").forEach(l => {
        const i = l.querySelectorAll("input");
        d.tabela.push([i[0].value, i[1].value, i[2].value]);
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
        const i = document.createElement("li"),
            dF = new Date(r.data || Date.now()).toLocaleString('pt-BR');
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
    handleNavClick(null, 'simulacao');
    setTimeout(() => {
        for (const k in d.passo1) {
            const e = document.getElementById(k);
            if (e) e.value = d.passo1[k];
        }
        if (d.tabela) d.tabela.forEach(l => adicionarLinha(...l));
        if (d.proventosAto) {
            document.getElementById('corpo-tabela-proventos-ato').innerHTML = '';
            d.proventosAto.forEach(p => adicionarLinhaProvento(p.descricao, p.valor));
            calculateTotalProventos();
        }
        if (d.dependentes) {
            document.getElementById('corpo-tabela-dependentes').innerHTML = '';
            d.dependentes.forEach(dep => adicionarLinhaDependente(dep.nome, dep.dataNasc, dep.parentesco, dep.invalido));
        }
        AppState.simulacaoResultados = d.resultados || {};
        alternarCamposBeneficio();
        ui.showToast(`Simulação "${rE.nome}" carregada.`, true);
        const t = document.getElementById('tipoBeneficio').value;
        if (t !== 'pensao_aposentado') irParaPasso(2);
        else irParaPasso(1);
        calcularBeneficio(true);
    }, 100);
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
        const li = document.createElement("li"),
            dF = new Date(c.data || Date.now()).toLocaleString('pt-BR'),
            nS = c.dados.nomeServidor || 'Não informado';
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
    handleNavClick(null, 'ctc');
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
    document.querySelectorAll('#geradorCTC input,#geradorCTC select').forEach(i => i.value = '');
    document.getElementById('corpo-tabela-periodos-ctc').innerHTML = '';
    document.getElementById('ctc-cpf-status').textContent = '';
    document.getElementById('ctc-cpf').style.borderColor = 'var(--border-color)';
    calcularTempoTotalCTC();
}

function adicionarLinhaPeriodoCTC(i = '', f = '', d = '0', fo = '') {
    const t = document.getElementById('corpo-tabela-periodos-ctc'),
        l = document.createElement('tr');
    l.innerHTML = `<td><input type="date" class="ctc-inicio" onchange="calcularTempoPeriodosCTC()" value="${i}"></td><td><input type="date" class="ctc-fim" onchange="calcularTempoPeriodosCTC()" value="${f}"></td><td><input type="number" class="ctc-bruto" readonly></td><td><input type="number" class="ctc-deducoes" value="${d}" oninput="calcularTempoPeriodosCTC()"></td><td><input type="number" class="ctc-liquido" readonly></td><td><input type="text" class="ctc-fonte" value="${fo}" placeholder="Ex: ITAPREV"></td><td><button class="danger" style="margin:0;padding:5px;" onclick="removerLinhaPeriodoCTC(this)">Remover</button></td>`;
    t.appendChild(l);
}

function removerLinhaPeriodoCTC(b) {
    b.closest('tr').remove();
    calcularTempoTotalCTC();
}

function calcularTempoPeriodosCTC() {
    document.querySelectorAll("#corpo-tabela-periodos-ctc tr").forEach(l => {
        const iE = l.querySelector('.ctc-inicio'),
            fE = l.querySelector('.ctc-fim'),
            bE = l.querySelector('.ctc-bruto'),
            dE = l.querySelector('.ctc-deducoes'),
            lE = l.querySelector('.ctc-liquido');
        if (iE.value && fE.value) {
            const i = new Date(iE.value + 'T00:00:00'),
                f = new Date(fE.value + 'T00:00:00');
            if (f >= i) {
                const dT = Math.abs(f - i),
                    dD = Math.ceil(dT / 86400000) + 1;
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
    const a = Math.floor(d / 365);
    d %= 365;
    const m = Math.floor(d / 30);
    d %= 30;
    return { anos: a, meses: m, dias: d };
}

function exportarTudoZIP(b) {
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const z = new JSZip(),
                d = coletarDadosSimulacao(),
                nB = (d.passo1.nomeServidor || "simulacao").replace(/\s+/g, '_');
            z.file(`${nB}.json`, JSON.stringify(d, null, 2));
            let c = "MES_ANO;FATOR;SALARIO\n";
            d.tabela.forEach(l => c += `${l[0]};${l[1]};${l[2]}\n`);
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

// =================================================================================
// FUNÇÕES DA CALCULADORA DE TEMPO
// =================================================================================
function calcularTempoEntreDatas() {
    const dataInicioStr = document.getElementById('calc-data-inicio').value;
    const dataFimStr = document.getElementById('calc-data-fim').value;
    const resultadoContainer = document.getElementById('resultado-calculo-tempo');

    if (!dataInicioStr || !dataFimStr) {
        resultadoContainer.innerHTML = `<p style="color: var(--danger-color); margin: auto;">Por favor, preencha ambas as datas.</p>`;
        ui.showToast("Por favor, preencha ambas as datas.", false);
        return;
    }

    const dataInicio = new Date(dataInicioStr + 'T00:00:00');
    const dataFim = new Date(dataFimStr + 'T00:00:00');

    if (dataFim < dataInicio) {
        resultadoContainer.innerHTML = `<p style="color: var(--danger-color); margin: auto;">A data final não pode ser anterior à data inicial.</p>`;
        ui.showToast("A data final não pode ser anterior à data inicial.", false);
        return;
    }

    const diffTime = Math.abs(dataFim - dataInicio);
    const totalDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
// Expondo funções para o escopo global (para uso no HTML onclick)
// =================================================================================
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





