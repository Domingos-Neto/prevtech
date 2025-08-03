// --- CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCkzX_5GuNjizbbgzWNgYx3hvEhj2Hr3pM",
    authDomain: "prevtech-ca050.firebaseapp.com",
    projectId: "prevtech-ca050",
    storageBucket: "prevtech-ca050.firebasestorage.app",
    messagingSenderId: "847747677288",
    appId: "1:847747677288:web:f1efa50e9e8b93e60bcfdd"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Lista de emails que podem acessar o sistema
const emailsAutorizados = [
    "domingosbarroson@gmail.com",
    "setordebeneficiositaprev@gmail.com"
].map(e => e.toLowerCase());


// --- VARIÁVEIS GLOBAIS DO SISTEMA ---
let db, usuarioAtual = "", usuarioAtualTipo = "comum", currentStep = 1, salarioChart, simulacaoResultados = {};
let dashboardViewMode = 'meus_registros';
const EXPECTATIVA_SOBREVIDA_IBGE = { M: { 55: 25.5, 56: 24.7, 57: 23.9, 58: 23.1, 59: 22.3, 60: 21.6, 61: 20.8, 62: 20.1, 63: 19.4, 64: 18.7, 65: 18.0 }, F: { 52: 30.1, 53: 29.2, 54: 28.4, 55: 27.5, 56: 26.7, 57: 25.8, 58: 25.0, 59: 24.1, 60: 23.3, 61: 22.5, 62: 21.7 } };


// --- FUNÇÕES UTILITÁRIAS ---
function showToast(text, isSuccess = false) { Toastify({ text, duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true, style: { background: isSuccess ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)", }}).showToast(); }
function toggleSpinner(button, show) { if (button) { button.disabled = show; button.classList.toggle('button-loading', show); } }
function formatarDinheiro(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataBR(v, plusDay = true) { if (!v) return ""; try { const date = new Date(v); if(plusDay) date.setDate(date.getDate() + 1); return date.toLocaleDateString('pt-BR'); } catch(e) { return v; } }
function formatarDataPorExtenso(data) {
    if (!data) return '';
    const [year, month, day] = data.split('-');
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1); 
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = date.toLocaleString('pt-BR', { month: 'long' });
    const ano = date.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
}
function atualizarDataHora() {
    const container = document.getElementById('datetime-container');
    if (container) {
        const agora = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dataFormatada = agora.toLocaleDateString('pt-BR', options);
        const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        container.innerHTML = `🗓️ ${dataFormatada} | ⏰ ${horaFormatada}`;
    }
}


// --- NAVEGAÇÃO E CONTROLE DE UI ---
function handleNavClick(event, targetView) {
    if (event) event.preventDefault();
    document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`#main-nav a[onclick*="'${targetView}'"]`).classList.add('active');
    
    switch(targetView) {
        case 'dashboard': voltarDashboard(); break;
        case 'simulacao': iniciarNovaSimulacao(); break;
        case 'ctc': iniciarGeracaoCTC(); break;
        case 'legislacao': mostrarLegislacao(); break;
        case 'cadastro': mostrarCadastro(); break;
        case 'processos': mostrarProcessos(); break;
        case 'financeiro': mostrarFinanceiro(); break;
        case 'relatorios': mostrarRelatorios(); break;
        case 'usuarios': mostrarGerenciamentoUsuarios(); break;
    }
}

function showView(viewId) {
    const views = ['dashboard', 'calculadora', 'geradorCTC', 'telaLegislacao', 'telaCadastro', 'telaProcessos', 'telaFinanceiro', 'telaRelatorios', 'telaUsuarios'];
    views.forEach(id => {
        const viewElement = document.getElementById(id);
        if (viewElement) viewElement.style.display = 'none';
    });
    const view = document.getElementById(viewId);
    if (view) view.style.display = 'block';
}

function iniciarNovaSimulacao() { showView('calculadora'); limparFormularioCompleto(); irParaPasso(1); }
function iniciarGeracaoCTC() { showView('geradorCTC'); limparFormularioCTC(); }
function mostrarLegislacao() { showView('telaLegislacao'); }
function mostrarCadastro() { showView('telaCadastro'); }
function mostrarProcessos() { showView('telaProcessos'); }
function mostrarFinanceiro() { showView('telaFinanceiro'); }
function mostrarRelatorios() { showView('telaRelatorios'); }
function mostrarGerenciamentoUsuarios() { showView('telaUsuarios'); listarUsuarios(); }
function voltarDashboard() { showView('dashboard'); listarHistorico(); listarCTCsSalvas(); }

function atualizarDashboardView() {
    const selector = document.getElementById('view-selector');
    dashboardViewMode = selector.value;
    listarHistorico();
    listarCTCsSalvas();
}


// --- AUTENTICAÇÃO E INICIALIZAÇÃO ---

// Função chamada quando a página carrega
document.addEventListener("DOMContentLoaded", () => {
    // Inicia o banco de dados local para usuários de user/senha
    initAuthDB();
    
    // Verifica se há um usuário do Google já logado
    auth.onAuthStateChanged(user => {
        if (user) {
            const email = (user.email || "").toLowerCase();
            if (emailsAutorizados.includes(email)) {
                // Se o usuário Google é válido, entra direto no sistema
                entrarNoSistema(user.displayName, 'comum', user.displayName, 'Usuário Google');
            } else {
                // Se o email não é autorizado, desloga do Google
                auth.signOut();
            }
        }
    });
});

function initAuthDB(){ 
    const req = indexedDB.open("UsuariosRPPS", 1); 
    req.onerror = () => console.error("Erro ao abrir IndexedDB"); 
    req.onsuccess = (e) => { db = e.target.result; }; 
    req.onupgradeneeded = (e) => { 
        db = e.target.result; 
        if (!db.objectStoreNames.contains("usuarios")){ 
            const store = db.createObjectStore("usuarios", { keyPath: "usuario" });
            store.add({ 
                usuario: "admin", 
                senha: "senha123", 
                status: "ativo",
                tipo: "admin",
                nomeCompleto: "Administrador do Sistema",
                cargoFuncao: "Administrador"
            });
        } 
    }; 
}

// MODIFICADO: Login com usuário e senha local
function login(button){
    const u = document.getElementById("usuario").value.trim();
    const s = document.getElementById("senha").value.trim();
    if(!u || !s) return showToast("Preencha todos os campos!");

    toggleSpinner(button, true); // Ativa o spinner

    // Adiciona um pequeno delay para o spinner ser visível
    setTimeout(() => {
        const tx = db.transaction("usuarios","readonly");
        const store = tx.objectStore("usuarios");
        const req = store.get(u);

        req.onsuccess = () => {
            const usuario = req.result;
            if(usuario && usuario.senha === s){
                if (usuario.status === 'ativo') {
                    entrarNoSistema(u, usuario.tipo, usuario.nomeCompleto, usuario.tipo === 'admin' ? 'Administrador' : 'Usuário Comum');
                } else {
                    showToast("Usuário está inativo. Contate o administrador.");
                    toggleSpinner(button, false); // Desativa o spinner em caso de falha
                }
            } else {
                showToast("Usuário ou senha incorretos.");
                toggleSpinner(button, false); // Desativa o spinner em caso de falha
            }
        };
        req.onerror = () => {
             showToast("Erro ao buscar usuário.");
             toggleSpinner(button, false); // Desativa o spinner em caso de erro
        }
    }, 500); // 0.5 segundos de delay
}

// NOVO: Login com Google
function loginComGoogle() {
    auth.signInWithPopup(provider)
      .then(result => {
        const user = result.user;
        const email = (user.email || "").toLowerCase();
        if (emailsAutorizados.includes(email)) {
          // Se o e-mail for autorizado, entra no sistema
          entrarNoSistema(user.displayName, 'comum', user.displayName, 'Usuário Google');
        } else {
          // Se não for, mostra alerta e desloga
          showToast("⚠️ Este e-mail não tem permissão para acessar o sistema.");
          auth.signOut();
        }
      })
      .catch(error => {
        console.error("Erro no login com Google:", error);
        showToast("Erro ao tentar login com Google: " + error.message);
      });
}

// Função central para entrar no sistema
function entrarNoSistema(userLogin, userType, userFullName, userRole) {
    usuarioAtual = userLogin;
    usuarioAtualTipo = userType || 'comum';

    document.getElementById("usuarioLogado").innerText = userLogin;
    document.getElementById("usuarioLogadoSidebar").innerText = userFullName || userLogin;
    document.getElementById("usuarioTipoSidebar").innerText = userRole;
    document.getElementById("user-avatar").innerText = (userFullName || userLogin).substring(0, 2).toUpperCase();

    document.getElementById("telaLogin").style.display = "none";
    document.querySelector(".app-container").style.display = "flex";
    document.getElementById("floating-buttons-container").style.display = "flex";
    initSistemaPosLogin();
}

// MODIFICADO: Logout com confirmação e desconexão do Google
function logout(){
    if (confirm("Você tem certeza que deseja sair?")) {
        auth.signOut().then(() => {
            // Limpa variáveis de sessão locais
            usuarioAtual = "";
            usuarioAtualTipo = "comum";
            dashboardViewMode = 'meus_registros';
            
            // Esconde o sistema e mostra a tela de login
            document.querySelector(".app-container").style.display = "none";
            document.getElementById("floating-buttons-container").style.display = "none";
            document.getElementById("telaLogin").style.display = "flex";
            
            // Limpa campos do formulário
            document.getElementById("usuario").value = "";
            document.getElementById("senha").value = "";
            document.getElementById("mensagem").innerText = "";
        });
    }
}

function initSistemaPosLogin(){ 
    setupAccordion(); 
    configurarValidadores();
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000 * 60); 
    
    const isAdmin = (usuarioAtualTipo === 'admin');
    document.getElementById('admin-section-title').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-nav-item').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-dashboard-controls').style.display = isAdmin ? 'flex' : 'none';


    if (localStorage.getItem("temaEscuro") === "sim") { 
        document.body.classList.add('dark-mode'); 
        document.querySelector("#toggleTheme i").className = 'ri-sun-line';
    } else { 
        document.body.classList.remove('dark-mode');
        document.querySelector("#toggleTheme i").className = 'ri-moon-line';
    } 
    
    handleNavClick(null, 'dashboard');
}


// --- GERENCIAMENTO DE USUÁRIOS (Sem alterações) ---
function cadastrarUsuario(event) {
  event.preventDefault();
  const usuario = document.getElementById('novoUsuarioNome').value.trim();
  const senha = document.getElementById('novoUsuarioSenha').value.trim();
  const nomeCompleto = document.getElementById('novoUsuarioNomeCompleto').value.trim();
  const cargoFuncao = document.getElementById('novoUsuarioCargo').value.trim();
  const tipo = document.getElementById('novoUsuarioTipo').value;

  if (!usuario || !senha || !nomeCompleto || !cargoFuncao) {
    showToast("Preencha todos os campos obrigatórios.");
    return;
  }

  const tx = db.transaction("usuarios", "readwrite");
  const store = tx.objectStore("usuarios");
  const request = store.add({ usuario, senha, tipo, status: "ativo", nomeCompleto, cargoFuncao });

  request.onsuccess = () => {
    showToast(`Usuário "${usuario}" cadastrado com sucesso!`, true);
    document.getElementById('form-novo-usuario').reset();
    listarUsuarios();
  };

  request.onerror = (e) => {
    if (e.target.error.name === 'ConstraintError') {
      showToast(`Erro: O usuário "${usuario}" já existe.`);
    } else {
      showToast("Erro ao cadastrar o usuário.");
    }
  };
}

function excluirUsuario(nomeUsuario) {
  if (nomeUsuario === 'admin') {
    showToast("O usuário 'admin' não pode ser excluído.");
    return;
  }
  if (!confirm(`Tem certeza que deseja excluir o usuário "${nomeUsuario}"? Esta ação não pode ser desfeita.`)) {
    return;
  }

  const tx = db.transaction("usuarios", "readwrite");
  const store = tx.objectStore("usuarios");
  const request = store.delete(nomeUsuario);

  request.onsuccess = () => {
    showToast(`Usuário "${nomeUsuario}" excluído com sucesso.`, true);
    listarUsuarios();
  };
  request.onerror = () => showToast("Erro ao excluir o usuário.");
}

function alternarStatusUsuario(nomeUsuario) {
    if (nomeUsuario === 'admin') {
        showToast("O status do usuário 'admin' não pode ser alterado.");
        return;
    }

    const tx = db.transaction("usuarios", "readwrite");
    const store = tx.objectStore("usuarios");
    const request = store.get(nomeUsuario);

    request.onsuccess = () => {
        const usuario = request.result;
        if (usuario) {
            usuario.status = usuario.status === 'ativo' ? 'inativo' : 'ativo';
            const updateRequest = store.put(usuario);
            updateRequest.onsuccess = () => {
                showToast(`Status do usuário "${nomeUsuario}" alterado.`, true);
                listarUsuarios();
            };
            updateRequest.onerror = () => showToast("Erro ao atualizar o status do usuário.");
        }
    };
    request.onerror = () => showToast("Erro ao encontrar o usuário.");
}

function listarUsuarios() {
  const tbody = document.getElementById('corpo-tabela-usuarios');
  if (!tbody) return;
  tbody.innerHTML = ''; 

  const tx = db.transaction("usuarios", "readonly");
  const store = tx.objectStore("usuarios");
  const req = store.openCursor();

  req.onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const u = cursor.value;
      
      if (u.usuario === 'admin') {
        u.status = 'ativo';
      }

      const isActive = u.status === 'ativo';
      const linha = document.createElement('tr');
      
      let acoesHtml = '';
      if (u.usuario !== 'admin') {
          acoesHtml = `
              <button class="secondary" onclick="alternarStatusUsuario('${u.usuario}')" title="${isActive ? 'Desativar Usuário' : 'Ativar Usuário'}">
                  ${isActive ? 'Desativar' : 'Ativar'}
              </button>
              <button class="danger" onclick="excluirUsuario('${u.usuario}')" title="Excluir Usuário">
                  <i class="ri-delete-bin-line"></i>
              </button>
          `;
      } else {
          acoesHtml = `<span style="font-size: 12px; color:var(--text-secondary-color);">Protegido</span>`;
      }

      linha.innerHTML = `
        <td>${u.usuario}</td>
        <td>${u.nomeCompleto || 'Não informado'}</td>
        <td>${u.cargoFuncao || 'Não informado'}</td>
        <td>${u.tipo === 'admin' ? 'Administrador' : 'Usuário Comum'}</td>
        <td style="font-weight: bold; color: ${isActive ? 'var(--success-color)' : 'var(--danger-color)'};">
            ${isActive ? 'Ativo' : 'Inativo'}
        </td>
        <td style="text-align: right;">${acoesHtml}</td>
      `;
      tbody.appendChild(linha);
      cursor.continue();
    }
  };
  req.onerror = () => showToast("Erro ao listar os usuários.");
}

function obterUsuarioAtual(callback) {
  if (!usuarioAtual) return callback(null);

  // Se o usuário logado for do Google, retorna um objeto simulado
  if (auth.currentUser && auth.currentUser.displayName === usuarioAtual) {
      callback({
          nomeCompleto: auth.currentUser.displayName,
          cargoFuncao: 'Usuário Google'
      });
      return;
  }
  
  // Senão, busca no banco de dados local
  const tx = db.transaction("usuarios", "readonly");
  const store = tx.objectStore("usuarios");
  const req = store.get(usuarioAtual);
  req.onsuccess = () => callback(req.result || null);
  req.onerror = () => callback(null);
}


// --- RESTANTE DO SEU CÓDIGO (LÓGICA DE UI, SIMULAÇÃO, GERAÇÃO DE DOCUMENTOS, ETC.) ---
// Esta parte do código permanece a mesma que você já tem.
// Cole todo o restante do seu script.js original aqui.
// (Omitido para não deixar a resposta excessivamente longa, mas é importante que você cole o resto aqui)

function irParaPasso(passo){ 
    if (passo > currentStep && currentStep === 1){
        if (!document.getElementById('dataAdmissao').value || !document.getElementById('dataNascimento').value){
            return showToast('Preencha a Data de Admissão e Nascimento para continuar.');
        }
    }
    const tipo = document.getElementById('tipoBeneficio').value;
    if(passo === 2 && tipo === 'pensao_aposentado') {
        calcularBeneficio(true, null);
        return; 
    }
    currentStep = passo;
    document.querySelectorAll('.wizard-step').forEach(step => step.style.display = 'none');
    document.getElementById('passo'+passo).style.display = 'block';
    window.scrollTo(0,0);
}
// ... e assim por diante ...
