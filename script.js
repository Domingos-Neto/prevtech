// --- FIREBASE AUTH (Google Login) ---
const firebaseConfig = {
  apiKey: "AIzaSyCkzX_5GuNjizbbgzWNgYx3hvEhj2Hr3pM",
  authDomain: "prevtech-ca050.firebaseapp.com",
  projectId: "prevtech-ca050",
  storageBucket: "prevtech-ca050.firebasestorage.app",
  messagingSenderId: "847747677288",
  appId: "1:847747677288:web:f1efa50e9e8b93e60bcfdd"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// Emails com acesso permitido
const emailsAutorizados = [
  "domingosbarroson@gmail.com",
  "setordebeneficiositaprev@gmail.com"
];

function loginGoogle() {
  auth.signInWithPopup(provider)
    .then(result => showSystem(result.user))
    .catch(error => {
      console.error("Erro no login:", error);
      document.getElementById("login-error").textContent = "Erro ao fazer login: " + (error.message || "");
    });
}

function logout() {
  auth.signOut().then(() => {
    document.getElementById("main-system").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
  });
}

function showSystem(user) {
  const email = user.email || "";
  if (!emailsAutorizados.includes(email.toLowerCase())) {
    alert("⚠️ Este e-mail não tem permissão para acessar o sistema.");
    logout();
    return;
  }
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("main-system").style.display = "block";
  document.getElementById("user-info").innerHTML = `
    <strong>Usuário:</strong> ${user.displayName}<br>
    <strong>Email:</strong> ${user.email}`;
}

auth.onAuthStateChanged(user => {
  if (user) showSystem(user);
});

// --- SIMULAÇÃO BÁSICA ---
function calcularBeneficio() {
  const nome = document.getElementById("nome").value;
  const idade = parseInt(document.getElementById("idade").value);
  const tempo = parseInt(document.getElementById("tempoContribuicao").value);
  const media = parseFloat(document.getElementById("mediaSalarial").value);
  if (!nome || isNaN(idade) || isNaN(tempo) || isNaN(media)) {
    alert("Preencha todos os campos corretamente.");
    return;
  }
  let fator = tempo / 35;
  if (fator > 1) fator = 1;
  const beneficio = media * fator;

  document.getElementById("resultadoCorpo").innerHTML = `
    <tr>
      <td>${nome}</td>
      <td>${idade}</td>
      <td>${tempo} anos</td>
      <td>R$ ${media.toFixed(2)}</td>
      <td><strong>R$ ${beneficio.toFixed(2)}</strong></td>
    </tr>`;

  document.getElementById("resultadoTabela").style.display = "table";

  const user = auth.currentUser;
  if (user) {
    salvarSimulacao(user, { nome, idade, tempo, media, beneficio, data: new Date().toLocaleString() });
  }
}

function salvarSimulacao(user, dados) {
  const chave = "simulacoes_" + user.email;
  const simulacoes = JSON.parse(localStorage.getItem(chave)) || [];
  simulacoes.push(dados);
  localStorage.setItem(chave, JSON.stringify(simulacoes));
}

function mostrarSimulacoesSalvas() {
  const user = auth.currentUser;
  if (!user) return;
  const chave = "simulacoes_" + user.email;
  const simulacoes = JSON.parse(localStorage.getItem(chave)) || [];
  if (simulacoes.length === 0) {
    document.getElementById("simulacoesSalvas").innerHTML = "<p>Nenhuma simulação salva.</p>";
    return;
  }
  let html = "<h3>Simulações anteriores:</h3><ul>";
  simulacoes.forEach(sim => {
    html += `<li><strong>${sim.nome}</strong> (${sim.idade} anos, ${sim.tempo} anos de contribuição) – R$ ${sim.beneficio.toFixed(2)}<br><small>${sim.data}</small></li>`;
  });
  html += "</ul><button onclick='limparSimulacoes()'>🗑️ Limpar todas</button>";
  document.getElementById("simulacoesSalvas").innerHTML = html;
}

function limparSimulacoes() {
  const user = auth.currentUser;
  if (!user) return;
  const chave = "simulacoes_" + user.email;
  localStorage.removeItem(chave);
  mostrarSimulacoesSalvas();
}

async function gerarPDF() {
  const user = auth.currentUser;
  if (!user) return alert("Você precisa estar logado para gerar o PDF.");
  const nome = document.getElementById("nome").value;
  const idade = document.getElementById("idade").value;
  const tempo = document.getElementById("tempoContribuicao").value;
  const media = document.getElementById("mediaSalarial").value;
  const beneficio = (parseFloat(media) * (tempo / 35)).toFixed(2);
  const dataHora = new Date().toLocaleString();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("📄 Simulação de Benefício - Prevtech", 20, 20);
  doc.setFontSize(12);
  doc.text(`Data: ${dataHora}`, 20, 30);
  doc.text(`Usuário: ${user.displayName}`, 20, 40);
  doc.text(`E-mail: ${user.email}`, 20, 50);
  doc.line(20, 55, 190, 55);
  doc.text("📌 Dados da Simulação:", 20, 65);
  doc.text(`Nome: ${nome}`, 20, 75);
  doc.text(`Idade: ${idade} anos`, 20, 85);
  doc.text(`Tempo de Contribuição: ${tempo} anos`, 20, 95);
  doc.text(`Média Salarial: R$ ${parseFloat(media).toFixed(2)}`, 20, 105);
  doc.text(`💰 Benefício Estimado: R$ ${beneficio}`, 20, 115);
  doc.save(`Simulacao_Prevtech_${user.displayName}.pdf`);
}

// --- GOOGLE DRIVE OAUTH SECTION ---
// Substitua pelo seu OAuth 2.0 Client ID do Google Cloud Console
const CLIENT_ID = '300539499706-i91plbhours71tqasbiv9mcl2cjp8qv6.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // será preenchido em handleAuthClick
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  // Exemplo: habilitar botão de salvar no Drive se quiser
document.getElementById('btn-drive-save').disabled = !(gapiInited && gisInited);
}

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      console.error("Erro no token:", resp);
      return;
    }
    showToast("Login com Google Drive realizado com sucesso!", true);
    // Após login, pode listar arquivos, etc.
  };

  if (!gapi.client.getToken()) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function showToast(msg, success = false) {
  console.log(msg); // você pode trocar por Toastify ou UI própria
}
