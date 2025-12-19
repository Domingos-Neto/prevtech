  // =================================================================================
// MÓDULO DE AUTENTICAção E CONFIGURAÇÃO (Firebase)
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ALERTA DE SEGURANÇA !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// SUAS CHAVES NUNCA DEVEM SER EXPOSTAS DIRETAMENTE NO CÓDIGO.
// 1. No Console do Google Cloud, restrinja o uso desta API Key para o domínio do seu site.
// 2. No Console do Firebase, ative o App Check para proteger contra abuso.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const firebaseConfig = {
    apiKey: "AIzaSyAbePFHJpsxwdaKMkgaKimEmlEHmJ209QY",
    authDomain: "prevtech-sistema.firebaseapp.com",
    projectId: "prevtech-sistema",
    storageBucket: "prevtech-sistema.appspot.com",
    messagingSenderId: "340278196378",
    appId: "1:340278196378:web:7b7dc882fb63781a40c723",
    measurementId: "G-TGXXLZWLLV"
  };

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Inicializa o Firestore
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
    dadosSimulacaoAtiva: null,
    salarioChart: null,
    tiposBeneficioChart: null,
    simulacaoResultados: {},
    dashboardViewMode: 'meus_registros',
    currentStep: 1,
    configuracoes: {
        nomePrefeito: '',
        nomePresidente: '',
        ctcOrgao: '',
        ctcCnpj: '',
        ctcEmissorNome: '',
        ctcEmissorCargo: '',
        ctcEmissorVinculoLabel: '',
        ctcEmissorVinculoValor: '',
        ctcPresidenteCargo: '',
        ctcPresidentePortaria: ''
    }
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
          console.log("onAuthStateChanged disparado! Usuário:", user);
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
        Toastify({ text, duration: 4000, close: true, gravity: "top", position: "right", stopOnFocus: true, style: { background: isSuccess ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)", }}).showToast();
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
        const views = ['dashboard', 'simulacao', 'geradorCTC', 'telaLegislacao', 'telaConfiguracoes', 'telaCadastro', 'telaProcessos', 'telaFinanceiro', 'telaRelatorios', 'telaUsuarios', 'geradorChecklists', 'geradorDocumentos'];
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

// =================================================================================
// INÍCIO: NOVO MÓDULO DE GESTÃO CADASTRAL
// =================================================================================
// SUBSTITUA O SEU OBJETO 'cadastro' INTEIRO POR ESTE:
const cadastro = {
    // A coleção no Firestore onde os servidores serão salvos.
    servidoresCollection: collection(db, 'servidores'),

    // Salva um servidor novo ou atualiza um existente
    salvarServidor: async (event) => {
        event.preventDefault();
        const id = document.getElementById('servidorId').value || crypto.randomUUID();
        
        const servidorData = {
            id: id,
            nomeServidor: document.getElementById('form-nomeServidor').value,
            matriculaServidor: document.getElementById('form-matriculaServidor').value,
            cpfServidor: document.getElementById('form-cpfServidor').value,
            // ... colete todos os outros campos do formulário da mesma forma
            rgServidor: document.getElementById('form-rgServidor').value,
            enderecoServidor: document.getElementById('form-enderecoServidor').value,
            telefoneServidor: document.getElementById('form-telefoneServidor').value,
            emailServidor: document.getElementById('form-emailServidor').value,
            cargoServidor: document.getElementById('form-cargoServidor').value,
            cargaHorariaServidor: document.getElementById('form-cargaHorariaServidor').value,
            lotacaoServidor: document.getElementById('form-lotacaoServidor').value,
            isMagisterio: document.getElementById('form-isMagisterio').value,
            dataAdmissao: document.getElementById('form-dataAdmissao').value,
            dataNascimento: document.getElementById('form-dataNascimento').value,
            sexo: document.getElementById('form-sexo').value,
        };

        try {
            // Cria uma referência para o documento usando o 'id'
            const servidorDocRef = doc(db, 'servidores', id);
            // Salva os dados. O setDoc cria o documento se não existir, ou sobrescreve se já existir.
            await setDoc(servidorDocRef, servidorData);
            
            cadastro.renderTabela(); // Atualiza a tabela na tela
            cadastro.fecharModal();
            ui.showToast(`Servidor salvo com sucesso no Firestore!`, true);
        } catch (error) {
            console.error("Erro ao salvar servidor no Firestore: ", error);
            ui.showToast("Erro ao salvar. Verifique o console.", false);
        }
    },

    // Renderiza a tabela de servidores a partir do Firestore
    renderTabela: async () => {
        const corpoTabela = document.getElementById('corpoTabelaServidores');
        const msgNenhum = document.getElementById('nenhumServidor');
        corpoTabela.innerHTML = ''; // Limpa a tabela

        try {
            const querySnapshot = await getDocs(cadastro.servidoresCollection);
            const servidores = [];
            querySnapshot.forEach((doc) => {
                servidores.push(doc.data());
            });

            if (servidores.length === 0) {
                msgNenhum.style.display = 'block';
                return;
            }
            msgNenhum.style.display = 'none';

            servidores.sort((a, b) => a.nomeServidor.localeCompare(b.nomeServidor)); // Ordena por nome

            servidores.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${s.nomeServidor || ''}</td>
                    <td>${s.matriculaServidor || ''}</td>
                    <td>${s.cpfServidor || ''}</td>
                    <td>${s.cargoServidor || ''}</td>
                    <td>
                        <button class="secondary btn-tabela" onclick="cadastro.editarServidor('${s.id}')" title="Editar"><i class="ri-pencil-line"></i></button>
                        <button class="danger btn-tabela" onclick="cadastro.deletarServidor('${s.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button>
                    </td>
                `;
                corpoTabela.appendChild(tr);
            });
        } catch (error) {
            console.error("Erro ao buscar servidores do Firestore: ", error);
            ui.showToast("Erro ao carregar dados. Verifique o console.", false);
        }
    },
    
    // Preenche o modal com dados de um servidor para edição
    editarServidor: async (id) => {
        try {
            const servidorDocRef = doc(db, 'servidores', id);
            const docSnap = await getDoc(servidorDocRef);

            if (docSnap.exists()) {
                const servidor = docSnap.data();
                cadastro.abrirModal();
                document.getElementById('modalTituloServidor').innerText = 'Editar Servidor';
                document.getElementById('servidorId').value = servidor.id;
                
                // Preenche o formulário
                for (const key in servidor) {
                    const el = document.getElementById(`form-${key}`);
                    if (el) el.value = servidor[key];
                }
            } else {
                ui.showToast("Servidor não encontrado no banco de dados.", false);
            }
        } catch (error) {
            console.error("Erro ao buscar servidor para edição: ", error);
        }
    },
    
    // Deleta um servidor do Firestore
    deletarServidor: async (id) => {
        if (!confirm('Tem certeza que deseja excluir este servidor do banco de dados? Esta ação não pode ser desfeita.')) return;
        
        try {
            await deleteDoc(doc(db, "servidores", id));
            cadastro.renderTabela();
            ui.showToast('Servidor excluído do Firestore.', true);
        } catch (error) {
            console.error("Erro ao deletar servidor: ", error);
            ui.showToast("Erro ao excluir. Verifique o console.", false);
        }
    },

    // Funções que não precisam de alteração (abrir/fechar modal, filtrar tabela)
    abrirModal: () => {
        document.getElementById('formServidor').reset();
        document.getElementById('servidorId').value = '';
        document.getElementById('modalTituloServidor').innerText = 'Adicionar Novo Servidor';
        document.getElementById('modalServidor').style.display = 'flex';
    },

    fecharModal: () => {
        document.getElementById('modalServidor').style.display = 'none';
    },

    filtrarServidores: () => {
        const filtro = document.getElementById('buscaServidor').value.toLowerCase();
        document.querySelectorAll('#corpoTabelaServidores tr').forEach(linha => {
            linha.style.display = linha.innerText.toLowerCase().includes(filtro) ? '' : 'none';
        });
    }
};
// =================================================================================
// FIM: NOVO MÓDULO DE GESTÃO CADASTRAL
// =================================================================================

const simulacao = {
  coletarDados: () => {
    return coletarDadosSimulacao(); // Chama a função global de coleta de dados
  },

  restaurarDados: (dados) => {
    handleNavClick(null, 'simulacao');
    
    setTimeout(() => {
        try {
            limparFormularioCompleto();

            // Restaura Passo 1
            if (dados.passo1) {
                for (const key in dados.passo1) {
                    const el = document.getElementById(key);
                    if (el) el.value = dados.passo1[key];
                }
            }
            // Nome da simulação para salvar
            document.getElementById('nomeSimulacao').value = dados.nome || 'Simulação Carregada';

            // Restaura Períodos Externos
            if (dados.periodosExternos) {
                dados.periodosExternos.forEach(p => adicionarPeriodoExterno(p.inicio, p.fim));
            }

            // Restaura Tabela de Salários
            if (dados.tabela) {
                dados.tabela.forEach(linha => adicionarLinha(linha[0], linha[1], linha[2]));
            }

            // Restaura Tabela de Dependentes
            if (dados.dependentes) {
                dados.dependentes.forEach(dep => adicionarLinhaDependente(dep.nome, dep.dataNasc, dep.parentesco, dep.invalido));
            }
            
            // Restaura Detalhamento de Proventos
            if (dados.proventosAto) {
                document.getElementById('corpo-tabela-proventos-ato').innerHTML = ''; // Limpa antes de adicionar
                dados.proventosAto.forEach(p => adicionarLinhaProvento(p.descricao, p.valor));
            }

            // IMPORTANTE: Passa o estado do checklist para o objeto global
            if (dados.resultados && dados.resultados.checklistState) {
                AppState.simulacaoResultados.checklistState = dados.resultados.checklistState;
            }

            // Ajusta a UI conforme o tipo de benefício
            alternarCamposBeneficio();
            
            // Recalcula e exibe o resultado
            const tipoBeneficio = document.getElementById('tipoBeneficio').value;
            if (tipoBeneficio !== 'pensao_aposentado') {
                irParaPasso(2); // Vai para o passo 2 se precisar da tabela de salários
            }
            calcularBeneficio(true); // Recalcula e vai para o passo 3 (resultados)
            
            ui.showToast(`Simulação "${dados.nome || 'Sem nome'}" carregada com sucesso!`, true);

        } catch (error) {
            console.error("Erro ao restaurar dados da simulação:", error);
            ui.showToast("Falha ao carregar dados da simulação. O arquivo pode estar corrompido.", false);
        }
    }, 150); // Pequeno delay para garantir que a UI mudou de tela
  },

  salvarLocal: () => {
    const nomeSimulacao = document.getElementById('nomeSimulacao').value.trim() || `Simulacao_${new Date().toISOString().slice(0,10)}`;
    const dados = simulacao.coletarDados();
    dados.nome = nomeSimulacao; // Garante que o nome está no objeto salvo
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomeSimulacao.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.showToast("Simulação salva no seu computador!", true);
  },

  carregarLocal: (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!AppState.usuarioAtual) {
        ui.showToast("Você precisa estar logado para carregar simulações.", false);
        return;
    }

    // --- Lógica para carregar um ÚNICO arquivo na tela (comportamento original) ---
    if (files.length === 1) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dados = JSON.parse(e.target.result);
                simulacao.restaurarDados(dados);
            } catch (error) {
                console.error("Erro ao ler o arquivo JSON:", error);
                ui.showToast("Erro ao carregar o arquivo. Verifique se é um JSON válido.", false);
            }
        };
        reader.onerror = () => {
             ui.showToast("Não foi possível ler o arquivo selecionado.", false);
        };
        reader.readAsText(files[0]);
        event.target.value = ''; // Limpa o input
        return;
    }

    // --- Lógica nova e mais robusta para MÚLTIPLOS arquivos ---
    const historicoKey = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const historico = JSON.parse(localStorage.getItem(historicoKey) || "[]");
    
    // Usamos Promise.all para aguardar que todos os arquivos sejam lidos
    const promises = Array.from(files).map(file => {
        // Criamos uma promessa para cada arquivo
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    // Resolve a promessa com os dados do arquivo se for um JSON válido
                    resolve(dados); 
                } catch (error) {
                    console.warn(`Arquivo "${file.name}" inválido, será ignorado.`, error);
                    // Resolve com null para sabermos que este arquivo falhou
                    resolve(null); 
                }
            };
            reader.onerror = () => {
                console.error(`Erro ao ler o arquivo "${file.name}".`);
                // Resolve com null em caso de erro de leitura
                resolve(null);
            };
            reader.readAsText(file);
        });
    });

    // Espera todas as promessas (leituras de arquivo) terminarem
    Promise.all(promises).then(resultados => {
        // Filtramos os resultados para remover os que falharam (retornaram null)
        const simucoesValidas = resultados.filter(dados => dados !== null);

        if (simucoesValidas.length === 0) {
            ui.showToast("Nenhum arquivo de simulação válido foi encontrado.", false);
            return;
        }

        // Adicionamos os resultados válidos ao histórico
        simucoesValidas.forEach(dados => {
            const novaEntradaHistorico = {
                id: crypto.randomUUID(),
                nome: dados.nome || 'Simulação Importada', // Usa o nome salvo no arquivo
                dados: dados,
                data: new Date().toISOString()
            };
            historico.unshift(novaEntradaHistorico);
        });

        // Salvamos e atualizamos a UI apenas uma vez, no final.
        localStorage.setItem(historicoKey, JSON.stringify(historico));
        listarHistorico();
        atualizarIndicadoresDashboard();
        ui.showToast(`${simucoesValidas.length} de ${files.length} simulações foram importadas para o histórico!`, true);
    });

    event.target.value = ''; // Limpa o input para permitir carregar os mesmos arquivos novamente
  },

  // INÍCIO: NOVAS FUNÇÕES DE INTEGRAÇÃO COM CADASTRO
  abrirModalBusca: () => {
    const servidores = cadastro.getServidores();
    const corpoTabela = document.getElementById('corpoTabelaBuscaServidor');
    corpoTabela.innerHTML = '';
    servidores.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.nomeServidor}</td>
            <td>${s.matriculaServidor}</td>
            <td><button class="primary btn-tabela" onclick="simulacao.selecionarServidor('${s.id}')">Selecionar</button></td>
        `;
        corpoTabela.appendChild(tr);
    });
    const modal = document.getElementById('modalBuscaServidor');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
  },

  fecharModalBusca: () => {
      const modal = document.getElementById('modalBuscaServidor');
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 300);
  },

  selecionarServidor: (id) => {
    const servidores = cadastro.getServidores();
    const servidor = servidores.find(s => s.id === id);
    if (!servidor) {
        ui.showToast("Servidor não encontrado.", false);
        return;
    }

    // Mapeia os dados do servidor para os campos do formulário da simulação
    const mapping = {
        nomeServidor: 'nomeServidor',
        matriculaServidor: 'matriculaServidor',
        cpfServidor: 'cpfServidor',
        rgServidor: 'rgServidor',
        enderecoServidor: 'enderecoServidor', // CAMPO ADICIONADO
        telefoneServidor: 'telefoneServidor',
        emailServidor: 'emailServidor',
        cargoServidor: 'cargoServidor',
        cargaHorariaServidor: 'cargaHorariaServidor',
        lotacaoServidor: 'lotacaoServidor',
        isMagisterio: 'isMagisterio',
        dataAdmissao: 'dataAdmissao',
        dataNascimento: 'dataNascimento',
        sexo: 'sexo'
    };

    for (const key in mapping) {
        const el = document.getElementById(mapping[key]);
        if (el) el.value = servidor[key] || '';
    }
    
    simulacao.fecharModalBusca();
    ui.showToast("Dados do servidor preenchidos!", true);
},

  filtrarBusca: () => {
      const filtro = document.getElementById('buscaServidorSimulacao').value.toLowerCase();
      const linhas = document.querySelectorAll('#corpoTabelaBuscaServidor tr');
      linhas.forEach(linha => {
          const textoLinha = linha.innerText.toLowerCase();
          linha.style.display = textoLinha.includes(filtro) ? '' : 'none';
      });
  }
  // FIM: NOVAS FUNÇÕES DE INTEGRAÇÃO
};

// =================================================================================
// FUNÇÕES DO NOVO GERADOR DE CHECKLIST INTEGRADAS
// =================================================================================

function drawHeader(pdf) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("ITAPREV", 105, 15, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("INSTITUTO DE PREVIDÊNCIA DOS", 105, 22, { align: "center" });
    pdf.text("SERVIDORES MUNICIPAIS DE ITAPIPOCA", 105, 28, { align: "center" });
    
    pdf.setLineWidth(0.5);
    pdf.line(15, 35, 195, 35);
}

function drawFooter(pdf, pageNumber, totalPages) {
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setLineWidth(0.5);
    pdf.line(15, pageHeight - 35, 195, pageHeight - 35);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA", 105, pageHeight - 30, { align: "center" });
    
    pdf.setFont("helvetica", "normal");
    pdf.text("Rua Caio Prado, 730, São Sebastião - Itapipoca - CE - Brasil", 105, pageHeight - 25, { align: "center" });
    pdf.text("CEP: 62508-200 - CNPJ: 10575544/0001-35", 105, pageHeight - 20, { align: "center" });
    pdf.text("Contato: (88) 3631-0204 | Email: rppsitaprev@gmail.com | Site: www.itaprev.com.br", 105, pageHeight - 15, { align: "center" });

    pdf.setFontSize(9);
    pdf.text(`Página ${pageNumber} de ${totalPages}`, 195, pageHeight - 10, { align: 'right' });
}

async function generatePdf(formId, baseFilename) {
    const { jsPDF } = window.jspdf;
    const formElement = document.getElementById(formId);
    const button = formElement.querySelector('button[onclick*="generatePdf"]');
    const originalButtonText = button.innerHTML;

    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gerando...';

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const footerMargin = 45;
        const headerMargin = 45;
        let y = headerMargin;

        const checkAndAddPage = (neededHeight) => {
            if (y + neededHeight > pageHeight - footerMargin) {
                pdf.addPage();
                y = headerMargin;
            }
        };

        // Título do Checklist
        const title = formElement.querySelector('.form-header h3').innerText;
        pdf.setFontSize(14).setFont('helvetica', 'bold');
        pdf.text(title, 105, y, { align: "center" });
        y += 12;

        // Dados do Servidor
        pdf.setFontSize(12).setFont('helvetica', 'bold');
        pdf.text("DADOS DO SERVIDOR", margin, y);
        y += 7;

        const serverInputs = formElement.querySelectorAll('.row input[type="text"]');
        serverInputs.forEach(input => {
            const label = formElement.querySelector(`label[for="${input.id}"]`).innerText;
            const value = input.value || 'Não informado';
            pdf.setFontSize(10).setFont('helvetica', 'normal');
            checkAndAddPage(5);
            pdf.text(`${label}: ${value}`, margin, y);
            y += 5;
        });
        y += 5;

        // Documentos
        const sections = formElement.querySelectorAll('.form-section-title');
        sections.forEach(sectionTitleElement => {
            if (!sectionTitleElement.innerText.toLowerCase().includes("dados do servidor") && !sectionTitleElement.innerText.toLowerCase().includes("observações")) {
                
                const sectionTitle = sectionTitleElement.innerText;
                checkAndAddPage(10);
                pdf.setFontSize(12).setFont('helvetica', 'bold');
                pdf.text(sectionTitle, margin, y);
                y += 8;

                const docSection = sectionTitleElement.nextElementSibling;
                if (docSection && docSection.classList.contains('doc-section')) {
                    const checks = docSection.querySelectorAll('.form-check');
                    checks.forEach(check => {
                        const input = check.querySelector('input');
                        const label = check.querySelector('label').innerText;
                        
                        pdf.setFontSize(10).setFont('helvetica', 'normal');
                        const textLines = pdf.splitTextToSize(label, pageWidth - margin * 2 - 10);
                        const requiredHeight = textLines.length * 6;
                        
                        checkAndAddPage(requiredHeight);

                        pdf.setLineWidth(0.3);
                        pdf.rect(margin, y - 4, 4, 4);
                        if(input.checked) {
                           pdf.setFont('zapfdingbats');
                           pdf.text('4', margin + 0.5, y);
                        }

                        pdf.setFont('helvetica', 'normal');
                        pdf.text(textLines, margin + 7, y);
                        y += requiredHeight;
                    });
                }
            }
        });
        
        // Observações
        const obsTitle = formElement.querySelector('.form-section-title:last-of-type');
        if (obsTitle && obsTitle.innerText.toLowerCase().includes("observações")) {
            y += 5;
            checkAndAddPage(10);
            pdf.setFontSize(12).setFont('helvetica', 'bold');
            pdf.text("OBSERVAÇÕES", margin, y);
            y += 7;

            const obsText = formElement.querySelector('textarea').value || "Nenhuma observação.";
            pdf.setFontSize(10).setFont('helvetica', 'normal');
            const obsLines = pdf.splitTextToSize(obsText, pageWidth - margin * 2);
            checkAndAddPage(obsLines.length * 6);
            pdf.text(obsLines, margin, y);
        }

        // Adicionar Cabeçalho e Rodapé
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            drawHeader(pdf);
            drawFooter(pdf, i, totalPages);
        }
        
        // Salvar PDF
        const serverNameInput = formElement.querySelector('input[id*="-nome"]');
        const serverName = serverNameInput ? serverNameInput.value.trim().replace(/ /g, '_') : 'Servidor';
        const filename = `${baseFilename}_${serverName || 'Servidor'}.pdf`;
        pdf.save(filename);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
        button.disabled = false;
        button.innerHTML = originalButtonText;
    }
}

// =================================================================================
// NOVA FUNÇÃO PARA CONECTAR SIMULAÇÃO E CHECKLIST (VERSÃO MODIFICADA)
// =================================================================================
function preencherChecklistComDadosDaSimulacao() {
    // 1. Coletar dados da simulação atual
    const dados = {
        nome: document.getElementById('nomeServidor').value,
        matricula: document.getElementById('matriculaServidor').value,
        cpf: document.getElementById('cpfServidor').value,
        nascimento: formatarDataBR(document.getElementById('dataNascimento').value),
        cargo: document.getElementById('cargoServidor').value,
        lotacao: document.getElementById('lotacaoServidor').value
    };

    // NOVO: Capturar o tipo de benefício da simulação atual
    const tipoBeneficio = document.getElementById('tipoBeneficio').value;

    // 2. Navegar para a nova tela de checklist
    handleNavClick(null, 'geradorChecklists');

    // 3. Aguardar um instante para a tela carregar e então preencher os campos e ativar a aba correta
    setTimeout(() => {
        // Itera sobre todos os formulários de checklist para preencher os dados
        const forms = document.querySelectorAll('.checklist-form');
        forms.forEach(form => {
            const nomeInput = form.querySelector('input[id*="-nome"]');
            if (nomeInput) nomeInput.value = dados.nome;
            
            const matriculaInput = form.querySelector('input[id*="-matricula"]');
            if (matriculaInput) matriculaInput.value = dados.matricula;
            
            const cpfInput = form.querySelector('input[id*="-cpf"]');
            if (cpfInput) cpfInput.value = dados.cpf;
            
            const nascimentoInput = form.querySelector('input[id*="-nascimento"]');
            if (nascimentoInput) nascimentoInput.value = dados.nascimento;

            const cargoInput = form.querySelector('input[id*="-cargo"]');
            if (cargoInput) cargoInput.value = dados.cargo;

            const lotacaoInput = form.querySelector('input[id*="-lotacao"]');
            if (lotacaoInput) lotacaoInput.value = dados.lotacao;
        });

        // NOVO: Lógica para ativar a aba correta do checklist
        try {
            const mapeamentoAbas = {
                'voluntaria': '#idade-tempo-pane',
                'idade': '#idade-pane', // Embora não esteja no select principal, o código o trata, então mapeamos.
                'incapacidade': '#incapacidade-pane',
                'compulsoria': '#compulsoria-pane',
                'pensao_ativo': '#pensao-pane',
                'pensao_aposentado': '#pensao-pane'
            };

            const targetId = mapeamentoAbas[tipoBeneficio] || '#idade-tempo-pane'; // Padrão para a primeira aba se não encontrar
            const triggerEl = document.querySelector(`button[data-bs-target="${targetId}"]`);

            if (triggerEl) {
                const tab = new bootstrap.Tab(triggerEl);
                tab.show();
            }
        } catch (e) {
            console.error("Erro ao tentar ativar a aba do checklist:", e);
        }
        
        ui.showToast("Dados do servidor preenchidos e checklist correto selecionado!", true); // NOVO: Mensagem atualizada
    }, 250); // um pequeno delay para garantir que a UI foi atualizada
}

const EXPECTATIVA_SOBREVIDA_IBGE = { M: { 55: 25.5, 56: 24.7, 57: 23.9, 58: 23.1, 59: 22.3, 60: 21.6, 61: 20.8, 62: 20.1, 63: 19.4, 64: 18.7, 65: 18.0 }, F: { 52: 30.1, 53: 29.2, 54: 28.4, 55: 27.5, 56: 26.7, 57: 25.8, 58: 25.0, 59: 24.1, 60: 23.3, 61: 22.5, 62: 21.7 } };

document.addEventListener("DOMContentLoaded", () => {
    auth.init();
});

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

    // Eventos para o modal da Calculadora de Tempo
    const modal = document.getElementById('time-calc-modal');
    document.getElementById('btnOpenTimeCalc').addEventListener('click', openTimeCalcModal);
    document.getElementById('btnCloseTimeCalc').addEventListener('click', closeTimeCalcModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeTimeCalcModal();
        }
    });

    // Eventos para os botões dentro do modal/calculadora
    const btnCalcTempo = document.getElementById('btn-calcular-tempo');
    if (btnCalcTempo) {
        btnCalcTempo.addEventListener('click', calcularTempoEntreDatas);
    }
    const btnLimparTempo = document.getElementById('btn-limpar-tempo');
    if (btnLimparTempo) {
        btnLimparTempo.addEventListener('click', limparCalculoTempo);
    }
    
    // Novo listener para importação de CTC
    document.getElementById('arquivoExcelCTC').addEventListener('change', importarCTCExcel);
    
    extratorFichas.init();
}
    
function openTimeCalcModal() {
    const modal = document.getElementById('time-calc-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeTimeCalcModal() {
    const modal = document.getElementById('time-calc-modal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}

// =================================================================================
// MÓDULO DE GESTÃO DE PROCESSOS (NOVO E INTEGRADO) - VERSÃO COM SALVAR/CARREGAR
// =================================================================================
const gestaoProcessos = {
    state: {},
    CHECKLIST_DEFINICOES: {
        aposentadoria: {
            '01_Oficio_de_Encaminhamento': ['Ofício de Encaminhamento ao TCE'],
            '02_Requerimento_do_Servidor': ['Requerimento formal do servidor'],
            '03_Documentos_Pessoais': ['Documento de identidade (RG)', 'Cadastro de Pessoa Física (CPF)', 'Comprovante de residência atualizado'],
            '04_Documentacao_Funcional': ['Documento de ingresso (Ato, Portaria, CTPS)', 'Portarias de nomeação/exoneração', 'Ficha funcional completa', 'Certidão de tempo de contribuição (ITAPREV)', 'Declaração de tempo de serviço', 'Comprovantes de afastamentos/licenças', 'Decisões judiciais (se houver)', 'CTC de outros regimes (se houver)', 'Diploma/Certificado (se aplicável)', 'Publicação da última progressão/promoção', 'Fichas financeiras (últimos 60 meses)'],
            '05_Calculo_dos_Proventos': ['Planilha detalhada do cálculo', 'Memória de cálculo'],
            '06_Outros_Documentos': ['Declaração de acumulação de cargos', 'Declaração de percepção de outros benefícios (RGPS/RPPS)', 'Declaração de ausência de PAD', 'Declaração de efetivo exercício (Professor)'],
            '07_Pareceres_Tecnicos_e_Juridicos': ['Parecer da unidade de gestão de pessoas'],
            '08_Ato_Administrativo': ['Ato de aposentadoria publicado'],
            '09_Legislacao': ['Leis e decretos que embasam o benefício']
        },
        pensao: {
            '01_Oficio_de_Encaminhamento': ['Ofício de Encaminhamento ao TCE'],
            '02_Requerimento_do_Dependente': ['Requerimento formal do dependente'],
            '03_Documentos_Instituidor': ['RG do Servidor', 'CPF do Servidor', 'Certidão de Óbito'],
            '04_Documentos_Dependente': ['RG do Dependente', 'CPF do Dependente', 'Comprovante de Residência', 'Certidão (Casamento/Nascimento)', 'Prova de dependência econômica (se aplicável)'],
            '05_Documentacao_Funcional': ['Documento de ingresso do servidor', 'Último contracheque do servidor'],
            '06_Ato_Administrativo': ['Ato de concessão de pensão publicado'],
            '07_Legislacao': ['Leis e decretos que embasam o benefício']
        }
    },

    iniciarNovoProcesso: (confirmado = false) => {
        if (!confirmado && Object.keys(gestaoProcessos.state).length > 0 && gestaoProcessos.state.grupos) {
            const totalArquivos = Object.values(gestaoProcessos.state.grupos).reduce((acc, grupo) => 
                acc + grupo.itens.reduce((itemAcc, item) => itemAcc + item.arquivos.length, 0), 0);
            
            if (totalArquivos > 0 && !confirm("Isso limpará o processo atual, que já contém arquivos. Deseja continuar?")) {
                document.getElementById('processo-tipo').value = gestaoProcessos.state.tipo;
                return;
            }
        }

        const tipo = document.getElementById('processo-tipo').value;
        gestaoProcessos.state = {
            tipo: tipo,
            servidor: document.getElementById('processo-nome-servidor').value,
            numero: document.getElementById('processo-numero').value,
            grupos: {}
        };

        const definicao = gestaoProcessos.CHECKLIST_DEFINICOES[tipo];
        for (const grupoId in definicao) {
            gestaoProcessos.state.grupos[grupoId] = {
                nome: grupoId.replace(/_/g, ' '),
                itens: definicao[grupoId].map(itemTexto => ({ texto: itemTexto, arquivos: [] })),
                tamanhoTotal: 0,
                limite: 10 * 1024 * 1024
            };
        }
        
        gestaoProcessos.renderChecklist();
        gestaoProcessos.renderResumo();
    },

    renderChecklist: () => {
        const container = document.getElementById('processo-checklist-container');
        container.innerHTML = '';
        const { tipo, grupos } = gestaoProcessos.state;

        if (!tipo) {
            container.innerHTML = '<p>Selecione um tipo de processo para começar.</p>';
            return;
        }

        for (const grupoId in grupos) {
            const grupo = grupos[grupoId];
            const grupoEl = document.createElement('div');
            grupoEl.className = 'processo-grupo';
            grupoEl.innerHTML = `<div class="processo-grupo-header">${grupo.nome}</div>`;

            grupo.itens.forEach((item, itemIndex) => {
                const completo = item.arquivos.length > 0;
                const itemEl = document.createElement('div');
                itemEl.className = `processo-checklist-item ${completo ? 'completo' : ''}`;
                
                let anexosHTML = '<ul class="processo-anexos-lista">';
                item.arquivos.forEach((arq, arqIndex) => {
                    anexosHTML += `
                        <li class="processo-anexo-item">
                            <span><i class="ri-file-pdf-2-line"></i> ${arq.file.name} (${(arq.file.size / 1024).toFixed(1)} KB)</span>
                            <button class="danger btn-tabela" onclick="gestaoProcessos.removerArquivo('${grupoId}', ${itemIndex}, ${arqIndex})"><i class="ri-close-line"></i></button>
                        </li>`;
                });
                anexosHTML += '</ul>';

                itemEl.innerHTML = `
                    <i class="ri-checkbox-${completo ? 'circle' : 'blank'}-line"></i>
                    <span>${item.texto}</span>
                    <button class="secondary btn-tabela" onclick="gestaoProcessos.abrirSelecaoArquivo('${grupoId}', ${itemIndex})">
                        <i class="ri-attachment-2"></i> Anexar
                    </button>
                `;
                grupoEl.appendChild(itemEl);
                if(completo) grupoEl.insertAdjacentHTML('beforeend', anexosHTML);
            });
            
            const percentualUso = (grupo.tamanhoTotal / grupo.limite) * 100;
            const limiteAtingido = percentualUso >= 100;
            const progressoEl = document.createElement('div');
            progressoEl.className = 'processo-grupo-progresso';
            progressoEl.innerHTML = `
                <small>Uso do grupo: ${(grupo.tamanhoTotal / (1024*1024)).toFixed(2)} MB de 10 MB</small>
                <div class="processo-progress-bar">
                    <div class="processo-progress-bar-fill ${limiteAtingido ? 'limite-atingido' : ''}" style="width: ${percentualUso}%;"></div>
                </div>
            `;
            grupoEl.appendChild(progressoEl);

            container.appendChild(grupoEl);
        }
    },

    renderResumo: () => {
        const container = document.getElementById('processo-resumo-container');
        const { grupos } = gestaoProcessos.state;
        let totalArquivos = 0;
        let tamanhoTotalProcesso = 0;

        let html = '<ul>';
        if (grupos) {
            for (const grupoId in grupos) {
                const grupo = grupos[grupoId];
                const numArquivos = grupo.itens.reduce((acc, item) => acc + item.arquivos.length, 0);
                totalArquivos += numArquivos;
                tamanhoTotalProcesso += grupo.tamanhoTotal;
                html += `<li><b>${grupo.nome}</b> <span>${numArquivos} arq. / ${(grupo.tamanhoTotal / (1024*1024)).toFixed(2)} MB</span></li>`;
            }
        }
        html += '</ul>';
        html += `<div id="processo-resumo-total"><span>TOTAL</span> <span>${totalArquivos} arq. / ${(tamanhoTotalProcesso / (1024*1024)).toFixed(2)} MB</span></div>`;
        container.innerHTML = html;
    },
    
    abrirSelecaoArquivo: (grupoId, itemIndex) => {
        const fileInput = document.getElementById('processo-file-input');
        fileInput.onchange = (event) => gestaoProcessos.handleAnexarArquivos(event, grupoId, itemIndex);
        fileInput.click();
    },

    handleAnexarArquivos: (event, grupoId, itemIndex) => {
        const files = event.target.files;
        if (!files.length) return;

        const grupo = gestaoProcessos.state.grupos[grupoId];
        let tamanhoAdicional = 0;
        for (const file of files) {
            tamanhoAdicional += file.size;
        }

        if (grupo.tamanhoTotal + tamanhoAdicional > grupo.limite) {
            ui.showToast(`Erro: Adicionar este(s) arquivo(s) ultrapassa o limite de 10MB do grupo.`, false);
            return;
        }

        for (const file of files) {
            if (file.type !== "application/pdf") {
                ui.showToast(`Apenas arquivos PDF são permitidos. '${file.name}' foi ignorado.`, false);
                continue;
            }
            grupo.itens[itemIndex].arquivos.push({ id: crypto.randomUUID(), file: file });
            grupo.tamanhoTotal += file.size;
        }

        gestaoProcessos.renderChecklist();
        gestaoProcessos.renderResumo();
        document.getElementById('processo-file-input').value = ''; 
    },

    removerArquivo: (grupoId, itemIndex, arqIndex) => {
        const grupo = gestaoProcessos.state.grupos[grupoId];
        const arquivoRemovido = grupo.itens[itemIndex].arquivos.splice(arqIndex, 1)[0];
        grupo.tamanhoTotal -= arquivoRemovido.file.size;
        
        gestaoProcessos.renderChecklist();
        gestaoProcessos.renderResumo();
    },

    gerarPacoteProcessoZIP: async (button) => {
        gestaoProcessos.state.servidor = document.getElementById('processo-nome-servidor').value.trim();
        gestaoProcessos.state.numero = document.getElementById('processo-numero').value.trim();

        const { servidor, numero, grupos } = gestaoProcessos.state;
        if (!servidor) {
            return ui.showToast("Preencha o nome do servidor/instituidor.", false);
        }

        ui.toggleSpinner(button, true);
        try {
            const zip = new JSZip();
            let hasFiles = false;

            for (const grupoId in grupos) {
                const grupo = grupos[grupoId];
                const pasta = zip.folder(grupoId);
                let contadorArquivo = 1;

                for (const item of grupo.itens) {
                    for (const anexo of item.arquivos) {
                        hasFiles = true;
                        const nomeItemSanitizado = item.texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
                        const nomeArquivo = `${String(contadorArquivo).padStart(2, '0')}_${nomeItemSanitizado}.pdf`;
                        pasta.file(nomeArquivo, anexo.file);
                        contadorArquivo++;
                    }
                }
            }

            if (!hasFiles) {
                throw new Error("Nenhum arquivo foi anexado ao processo.");
            }

            const nomeZip = `Processo_${(numero || 'SN').replace(/[^a-zA-Z0-9]/g, '-')}_${servidor.replace(/ /g, '_')}.zip`;
            const content = await zip.generateAsync({ type: "blob" });
            
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = nomeZip;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

            ui.showToast("Pacote ZIP gerado com sucesso!", true);

        } catch (error) {
            ui.showToast(error.message, false);
            console.error(error);
        } finally {
            ui.toggleSpinner(button, false);
        }
    },
    
    puxarDadosSimulacao: () => {
        const nomeSimulacao = document.getElementById('nomeServidor').value;
        if(nomeSimulacao) {
            document.getElementById('processo-nome-servidor').value = nomeSimulacao;
            ui.showToast("Nome do servidor preenchido.", true);
        } else {
            ui.showToast("Nenhum nome encontrado na simulação atual.", false);
        }
    },

    // FUNÇÕES ADICIONADAS PARA SALVAR E CARREGAR
    salvarProcessoLocal: async (button) => {
        gestaoProcessos.state.servidor = document.getElementById('processo-nome-servidor').value.trim();
        gestaoProcessos.state.numero = document.getElementById('processo-numero').value.trim();
        const { servidor, numero } = gestaoProcessos.state;

        if (!servidor) {
            return ui.showToast("Preencha o nome do servidor antes de salvar.", false);
        }
        ui.toggleSpinner(button, true);

        try {
            const stateToSave = JSON.parse(JSON.stringify(gestaoProcessos.state));
            const filePromises = [];

            for (const grupoId in gestaoProcessos.state.grupos) {
                for (const itemIndex in gestaoProcessos.state.grupos[grupoId].itens) {
                    for (const anexoIndex in gestaoProcessos.state.grupos[grupoId].itens[itemIndex].arquivos) {
                        const file = gestaoProcessos.state.grupos[grupoId].itens[itemIndex].arquivos[anexoIndex].file;
                        const promise = new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve({
                                grupoId, itemIndex, anexoIndex,
                                name: file.name, type: file.type, content: e.target.result
                            });
                            reader.readAsDataURL(file);
                        });
                        filePromises.push(promise);
                    }
                }
            }

            const fileContents = await Promise.all(filePromises);
            fileContents.forEach(fc => {
                stateToSave.grupos[fc.grupoId].itens[fc.itemIndex].arquivos[fc.anexoIndex] = { file: { name: fc.name, type: fc.type, content: fc.content } };
            });

            const blob = new Blob([JSON.stringify(stateToSave, null, 2)], { type: 'application/json' });
            const nomeArquivo = `PREVTECH_Processo_${(servidor || 'rascunho').replace(/ /g, '_')}.json`;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            ui.showToast("Processo salvo no seu computador!", true);

        } catch (error) {
            ui.showToast("Erro ao salvar o processo.", false);
            console.error(error);
        } finally {
            ui.toggleSpinner(button, false);
        }
    },

    carregarProcessoLocal: (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const loadedState = JSON.parse(e.target.result);
                
                // Função auxiliar para converter base64 para File
                const base64ToFile = (b64Data, filename, contentType) => {
                    const sliceSize = 512;
                    const byteCharacters = atob(b64Data.split(',')[1]);
                    const byteArrays = [];
                    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                        const slice = byteCharacters.slice(offset, offset + sliceSize);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        byteArrays.push(byteArray);
                    }
                    const blob = new Blob(byteArrays, {type: contentType});
                    return new File([blob], filename, { type: contentType });
                };

                // Restaura os arquivos
                for (const grupoId in loadedState.grupos) {
                    for (const item of loadedState.grupos[grupoId].itens) {
                        for (const anexo of item.arquivos) {
                            if (anexo.file && anexo.file.content) {
                                anexo.file = base64ToFile(anexo.file.content, anexo.file.name, anexo.file.type);
                            }
                        }
                    }
                }

                gestaoProcessos.state = loadedState;
                document.getElementById('processo-tipo').value = loadedState.tipo;
                document.getElementById('processo-nome-servidor').value = loadedState.servidor || '';
                document.getElementById('processo-numero').value = loadedState.numero || '';

                gestaoProcessos.renderChecklist();
                gestaoProcessos.renderResumo();
                ui.showToast("Processo carregado com sucesso!", true);

            } catch (error) {
                ui.showToast("Erro ao carregar o arquivo. Verifique se é um arquivo de processo válido.", false);
                console.error(error);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }
};

// =================================================================================
// INÍCIO: NOVO MÓDULO DE EXTRAÇÃO DE FICHAS FINANCEIRAS
// =================================================================================
const extratorFichas = {
    extractedData: [],
    pdfFile: null,

    init: () => {
    const fileInput = document.getElementById("extrator-file-input");
    const processBtn = document.getElementById("extrator-process-btn");
    const exportBtn = document.getElementById("extrator-export-btn");
    const uploadTrigger = document.getElementById("extrator-upload-trigger");
    const fileNameDisplay = document.getElementById("extrator-file-name");

    // Faz com que a área de upload clique no input de arquivo escondido
    uploadTrigger.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
        extratorFichas.pdfFile = e.target.files[0];
        processBtn.disabled = !extratorFichas.pdfFile;
        
        if (extratorFichas.pdfFile) {
            fileNameDisplay.textContent = `Arquivo selecionado: ${extratorFichas.pdfFile.name}`;
        } else {
            fileNameDisplay.textContent = "Nenhum arquivo selecionado.";
        }
    });

    processBtn.addEventListener("click", extratorFichas.processarPDF);
    exportBtn.addEventListener("click", extratorFichas.exportarExcel);
},

    abrirModal: () => {
        const modal = document.getElementById('extrator-modal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    },

    fecharModal: () => {
        const modal = document.getElementById('extrator-modal');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    },

    processarPDF: () => {
    const cpfParaBuscar = document.getElementById("extrator-cpf-input").value.replace(/[^\d]/g, '');
    if (!cpfParaBuscar) {
        return ui.showToast("Por favor, digite o CPF do servidor para a busca.", false);
    }
    if (!extratorFichas.pdfFile) {
        return ui.showToast("Por favor, selecione um arquivo PDF.", false);
    }

    const processBtn = document.getElementById("extrator-process-btn");
    ui.toggleSpinner(processBtn, true);

    const reader = new FileReader();
    reader.onload = async function () {
        const typedArray = new Uint8Array(this.result);
        try {
            const pdf = await pdfjsLib.getDocument(typedArray).promise;
            extratorFichas.extractedData = [];
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(' ') + '\n--- PAGE BREAK ---\n';
            }

            // CORREÇÃO: Regex de ano mais robusta para encontrar todos os anos,
            // tratando as variações de cabeçalho (Prefeitura, Instituto, etc.) e espaçamento.
            const yearRegex = /(?:Ano-Base:|Ano:)\s*(\d{4})|(?:PREFEITURA\s+MUNICIPAL\s+DE\s+ITAPIPOCA|INSTITUTO\s+MUNIC\.?\s+PREVIDENCIA\s+ITAPIPOCA|FICHA\s+FINANCEIRA\s+INDIVIDUAL)[\s\S]*?(\b20\d{2}\b)/g;
            
            let yearMatches = [...fullText.matchAll(yearRegex)];
            
            for (let i = 0; i < yearMatches.length; i++) {
                const currentMatch = yearMatches[i];
                const nextMatch = yearMatches[i + 1];

                const year = currentMatch[1] || currentMatch[2];
                if (!year) continue;

                const startIndex = currentMatch.index;
                const endIndex = nextMatch ? nextMatch.index : fullText.length;
                
                const chunk = fullText.substring(startIndex, endIndex);

                if (!chunk.replace(/[^\d]/g, '').includes(cpfParaBuscar)) {
                    continue;
                }
                
                let values = [];
                // Método Primário: Busca por "TOTAL DE PROVENTOS" ou "REMUNERAÇÃO TOTAL"
                const proventosMatch = chunk.match(/(?:TOTAL DE PROVENTOS|REMUNERAÇÃO\s+TOTAL)\s*(?:\(P\))?\s*([\d.,\s]+)/i);

                if (proventosMatch && proventosMatch[1]) {
                    const valuesString = proventosMatch[1];
                    values = valuesString.trim().replace(/\./g, '').replace(/,/g, '.').split(/\s+/).filter(v => !isNaN(parseFloat(v)) && v.trim() !== '');
                
                } else if (chunk.includes("RAIS - Relação Anual de Informações Sociais")) {
                    // Método Secundário (Fallback): Lógica para o formato RAIS
                    const employeeBlocks = chunk.split(/(?=Cod\.?\sPIS\/PASEP)/);
                    const employeeChunk = employeeBlocks.find(block => block.replace(/[^\d]/g, '').includes(cpfParaBuscar));

                    if (employeeChunk) {
                        const janIndex = employeeChunk.toUpperCase().indexOf("JANEIRO");
                        if (janIndex !== -1) {
                            const salaryBlock = employeeChunk.substring(janIndex);
                            const numberRegex = /(\b\d{1,3}(?:\.\d{3})*,\d{2}\b|\b\d+[,.]\d{2}\b)/g;
                            const salaryMatches = [...salaryBlock.matchAll(numberRegex)];
                            
                            if (salaryMatches.length >= 12) {
                                values = salaryMatches.slice(0, 12).map(match => match[0].replace(/\./g, '').replace(/,/g, '.'));
                            }
                        }
                    }
                }
                
                if (values.length > 0) {
                    extratorFichas.extractedData.push({ year, values: values.slice(0, 13) });
                }
            }
            
            // Lógica para remover anos duplicados e ordenar
            const uniqueYears = {};
            extratorFichas.extractedData = extratorFichas.extractedData.filter(item => {
                if (!uniqueYears[item.year]) {
                    uniqueYears[item.year] = true;
                    return true;
                }
                return false;
            });
            extratorFichas.extractedData.sort((a, b) => parseInt(a.year) - parseInt(b.year));

        } catch (error) {
            console.error("Erro ao processar o PDF:", error);
            ui.showToast("Erro ao processar PDF. Verifique o console.", false);
        } finally {
            extratorFichas.renderizarTabela();
            document.getElementById("extrator-export-btn").disabled = extratorFichas.extractedData.length === 0;
            ui.toggleSpinner(processBtn, false);
        }
    };
    reader.readAsArrayBuffer(extratorFichas.pdfFile);
},
  
    renderizarTabela: () => {
        const tableContainer = document.getElementById("extrator-table-container");
        if (extratorFichas.extractedData.length === 0) {
            tableContainer.innerHTML = "<p>Nenhum dado encontrado no PDF com o formato esperado (procure por 'TOTAL DE PROVENTOS').</p>";
            return;
        }

        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Total"];
        let html = "<table><thead><tr><th>Ano</th>";
        months.forEach(m => html += `<th>${m}</th>`);
        html += "</tr></thead><tbody>";

        extratorFichas.extractedData.forEach(row => {
            html += `<tr><td>${row.year}</td>`;
            row.values.forEach(val => html += `<td>${val}</td>`);
            html += "</tr>";
        });

        html += "</tbody></table>";
        tableContainer.innerHTML = html;
    },

    exportarExcel: () => {
    if (extratorFichas.extractedData.length === 0) return;
    const exportBtn = document.getElementById("extrator-export-btn");
    ui.toggleSpinner(exportBtn, true);
    
    // NOVO: Pega o CPF para nomear o arquivo
    const cpfParaBuscar = document.getElementById("extrator-cpf-input").value || "servidor";
    
    try {
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro", "Total"];
        const header = ["Ano", ...months];
        const data = extratorFichas.extractedData.map(row => [row.year, ...row.values]);

        const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Proventos");
        
        // NOVO: Nome do arquivo personalizado com o CPF
        XLSX.writeFile(workbook, `proventos_${cpfParaBuscar}.xlsx`);
        
        ui.showToast("Arquivo Excel gerado com sucesso!", true);
    } catch(e) {
        console.error("Erro ao exportar Excel:", e);
        ui.showToast("Falha ao gerar o arquivo Excel.", false);
    } finally {
        ui.toggleSpinner(exportBtn, false);
    }
}
};
// =================================================================================
// FIM: NOVO MÓDULO DE EXTRAÇÃO DE FICHAS FINANCEIRAS
// =================================================================================


// MODIFICAÇÃO: Preserva o estado do módulo de processo ao navegar
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
            preencherCTCComDadosDaSimulacao();
            break;
        case 'telaConfiguracoes':
            popularCamposConfiguracoes();
            break;
        case 'geradorDocumentos':
            document.getElementById('doc-nome-servidor').value = '';
            break;
        case 'telaCadastro':
            cadastro.renderTabela();
            break;
        case 'telaProcessos':
            // Só inicia um novo processo se não houver um em andamento
            if (!gestaoProcessos.state.tipo) {
                gestaoProcessos.iniciarNovoProcesso();
            }
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

    const totalSimulacoes = historico.length;
    const totalCtcs = ctcs.length;
    let totalDiasCtc = 0;
    ctcs.forEach(ctc => {
        if (ctc.dados && ctc.dados.periodos) {
            ctc.dados.periodos.forEach(periodo => {
                if (periodo.inicio && periodo.fim) {
                    const dataInicio = new Date(periodo.inicio + 'T00:00:00');
                    const dataFim = new Date(periodo.fim + 'T00:00:00');
                    if (dataFim >= dataInicio) {
                        const diffTime = Math.abs(dataFim - dataInicio);
                        const tempoBruto = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        const deducoes = parseInt(periodo.deducoes) || 0;
                        totalDiasCtc += (tempoBruto - deducoes);
                    }
                }
            });
        }
    });

    document.getElementById('kpi-total-dias-ctc').innerText = totalDiasCtc.toLocaleString('pt-BR');
       
    let somaValores = 0;
    historico.forEach(item => {
        const valor = item.dados?.resultados?.valorBeneficioFinal || 0;
        somaValores += parseFloat(valor);
    });
    const valorMedio = totalSimulacoes > 0 ? somaValores / totalSimulacoes : 0;

    document.getElementById('kpi-total-simulacoes').innerText = totalSimulacoes;
    document.getElementById('kpi-total-ctcs').innerText = totalCtcs;
    document.getElementById('kpi-valor-medio').innerText = formatarDinheiro(valorMedio);

    const contagemTipos = {};
    historico.forEach(item => {
        const tipo = item.dados?.resultados?.tipo || "Não definido";
        contagemTipos[tipo] = (contagemTipos[tipo] || 0) + 1;
    });

    const labelsGrafico = Object.keys(contagemTipos);
    const dadosGrafico = Object.values(contagemTipos);
    
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

function atualizarDashboardView() {
    AppState.dashboardViewMode = document.getElementById('view-selector').value;
    listarHistorico();
    listarCTCsSalvas();
}

function formatarDinheiro(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function formatarDataBR(dataString) {
    if (!dataString || !dataString.includes('-')) return "";
    try {
        const [year, month, day] = dataString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
        return dataString;
    }
}

function formatarDataPorExtenso(data) {
    if (!data) return '';
    
    let dateObj;
    if (typeof data === 'string' && data.includes('-')) {
        const [year, month, day] = data.split('-');
        dateObj = new Date(year, month - 1, day);
    } else {
        dateObj = new Date(data);
    }
    
    if (isNaN(dateObj.getTime())) {
        return '';
    }

    return dateObj.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    });
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
        inputElement.style.borderColor = 'var(--cor-erro)';
        statusElement.textContent = 'CPF Inválido';
        statusElement.style.color = 'var(--cor-erro)';
        return false;
    };
    if (cpf.length === 0) {
        inputElement.style.borderColor = 'var(--cor-borda)';
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
    inputElement.style.borderColor = 'var(--cor-sucesso)';
    statusElement.textContent = 'CPF Válido';
    statusElement.style.color = 'var(--cor-sucesso)';
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
    if (passo === 1 && tipo === 'pensao_aposentado') {
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
    const isAposentadoria = tipo === 'voluntaria' || tipo === 'incapacidade' || tipo === 'compulsoria' || tipo === 'idade';
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
    document.getElementById('resultado-planner').innerHTML = '';
    AppState.simulacaoResultados = {};
    if (AppState.salarioChart) AppState.salarioChart.destroy();
    
    document.getElementById("tempoExterno").value = "0";
    document.getElementById("tempoEspecial").value = "0";
    document.getElementById("tempoContribuicaoEfetivoDias").value = "0";
    
    document.getElementById('corpo-tabela-tempo-externo').innerHTML = '';
    atualizarTotalTempoExterno();

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
    linha.innerHTML = `<td>${tbody.rows.length + 1}</td><td><input type="text" placeholder="MM/AAAA" value="${mes}"/></td><td><input type="number" step="0.000001" class="fator" value="${fator}" oninput="atualizarSalarioLinha(this)"/></td><td><input type="number" step="0.01" class="salario" value="${salario}" oninput="atualizarSalarioLinha(this)"/></td><td><input type="number" class="atualizado" value="${vA}" readonly/></td><td><button class="danger btn-tabela" onclick="excluirLinha(this)">Excluir</button></td>`;
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
    l.innerHTML = `<td><input type="text" class="provento-descricao" placeholder="Descrição" value="${d}"/></td><td><input type="number" step="0.01" class="provento-valor" placeholder="0.00" value="${v}" oninput="calculateTotalProventos()"/></td><td><button class="danger btn-tabela" onclick="excluirLinhaProvento(this)">Excluir</button></td>`;
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

function adicionarLinhaDependente(n = '', d = '', p = '', inv = 'Nao', cpf = '', rg = '', endereco = '', telefone = '') {
    const t = document.getElementById('corpo-tabela-dependentes'),
        l = document.createElement('tr');
    l.innerHTML = `
        <td><input type="text" class="dependente-nome" value="${n}"></td>
        <td><input type="text" class="dependente-cpf" placeholder="000.000.000-00" value="${cpf}"></td>
        <td><input type="date" class="dependente-dataNasc" value="${d}"></td>
        <td><input type="text" class="dependente-endereco" placeholder="Rua, Nº, Bairro..." value="${endereco}"></td>
        <td><input type="text" class="dependente-telefone" placeholder="(00) 00000-0000" value="${telefone}"></td>
        <td><input type="text" class="dependente-rg" placeholder="Nº do RG" value="${rg}"></td>
        <td>
            <select class="dependente-parentesco">
                <option ${p==='Cônjuge'?'selected':''}>Cônjuge</option>
                <option ${p==='Companheiro(a)'?'selected':''}>Companheiro(a)</option>
                <option ${p==='Filho(a)'?'selected':''}>Filho(a)</option>
                <option ${p==='Filho(a) Inválido(a)'?'selected':''}>Filho(a) Inválido(a)</option>
                <option ${p==='Mãe'?'selected':''}>Mãe</option>
                <option ${p==='Pai'?'selected':''}>Pai</option>
            </select>
        </td>
        <td>
            <select class="dependente-invalido">
                <option value="Nao" ${inv==='Nao'?'selected':''}>Não</option>
                <option value="Sim" ${inv==='Sim'?'selected':''}>Sim</option>
            </select>
        </td>
        <td><button class="danger btn-tabela" onclick="removerLinhaDependente(this)" title="Remover Dependente"><i class="ri-delete-bin-line"></i></button></td>`;
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

function calcularMedia80Maiores(salarios) {
    if (!salarios || salarios.length === 0) {
        return 0;
    }
    const valoresOrdenados = salarios.map(s => s.value).sort((a, b) => b - a);
    const quantidade80p = Math.ceil(valoresOrdenados.length * 0.8);
    const maioresSalarios = valoresOrdenados.slice(0, quantidade80p);
    const somaMaioresSalarios = maioresSalarios.reduce((acc, val) => acc + val, 0);
    return somaMaioresSalarios / maioresSalarios.length;
}

function calcularBeneficio(n = true, b = null) {
    const t = document.getElementById('tipoBeneficio').value;
    if ((t !== 'pensao_ativo' && t !== 'pensao_aposentado') && (!document.getElementById('dataNascimento').value || !document.getElementById('dataAdmissao').value)) {
        return ui.showToast("Data de Nascimento e Admissão são obrigatórias.", false);
    }
    
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const rD = document.getElementById('resultado');
            let vB = 0, dC = '', m = 0, s = [];
            // Mantém o estado do checklist se já existir, senão limpa
            const checklistStateAtual = AppState.simulacaoResultados.checklistState;
            AppState.simulacaoResultados = {};
            AppState.simulacaoResultados.checklistState = checklistStateAtual;

            if (t !== 'pensao_aposentado') {
                const mR = calcularMediaSalarial();
                m = mR.media;
                s = mR.salarios;
                AppState.simulacaoResultados.salariosParaGrafico = s;
            }

            const isA = t === 'voluntaria' || t === 'incapacidade' || t === 'compulsoria' || t === 'idade';
            const isP = t === 'pensao_ativo' || t === 'pensao_aposentado';

            if (isA) {
                 const dataCalculo = document.getElementById('dataCalculo').value ? new Date(document.getElementById('dataCalculo').value + 'T00:00:00Z') : new Date();
                 const dataAdmissao = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00Z');
                 const tempoServicoPublico = (dataCalculo - dataAdmissao) / 31557600000;
                 const tempoExternoAnos = (parseInt(document.getElementById('tempoExterno').value) || 0) / 365.25;
                 const tempoEspecialAnos = (parseInt(document.getElementById('tempoEspecial').value) || 0) / 365.25;
                 const tempoContribTotalAnos = tempoServicoPublico + tempoExternoAnos + tempoEspecialAnos;

                if (t === 'voluntaria' || t === 'idade') {
                    vB = calculateTotalProventos();
                    dC = `O valor do benefício é composto pelo somatório dos proventos detalhados, que tem como base a média salarial. A elegibilidade e o valor final podem variar conforme a regra de transição aplicável.`;
                    projetarAposentadoria(m);
                    verificarAbonoPermanencia();

                } else if (t === 'incapacidade') {
                    const isGrave = document.getElementById('incapacidadeGrave').value === 'sim';
                    const dataInicioIncapacidadeInput = document.getElementById('dataInicioIncapacidade').value;
                    
                    if (!dataInicioIncapacidadeInput) {
                        ui.showToast("Por favor, informe a Data de Início da Incapacidade (DII).", false);
                        if (b) ui.toggleSpinner(b, false);
                        return;
                    }

                    const dataInicioIncapacidade = new Date(dataInicioIncapacidadeInput + 'T00:00:00Z');
                    const dataReforma = new Date('2019-11-13T00:00:00Z');

                    if (isGrave) {
                        vB = m;
                        dC = `Cálculo com base em 100% da média salarial, por se tratar de incapacidade decorrente de acidente de trabalho, doença profissional ou do trabalho.`;
                    } else {
                        if (dataInicioIncapacidade < dataReforma) {
                            const tempoEmDias = parseInt(document.getElementById('tempoContribuicaoEfetivoDias').value) || 0;

                            if (tempoEmDias === 0) {
                                ui.showToast("Para a regra antiga, informe o 'Tempo de Contribuição Efetivo (dias)'.", false);
                                if (b) ui.toggleSpinner(b, false);
                                return;
                            }

                            const media80 = calcularMedia80Maiores(s);
                            const tempoExigidoEmDias = 9125; // 25 anos
                            const fatorProporcional = tempoEmDias / tempoExigidoEmDias;
                            
                            vB = media80 * fatorProporcional;
                            
                            dC = `Cálculo pela REGRA ANTIGA (EC 41/2003) por direito adquirido (DII < 13/11/2019). <br><b>Média dos 80% maiores salários:</b> ${formatarDinheiro(media80)}. <br><b>Fator de Proporcionalidade:</b> (${tempoEmDias} / ${tempoExigidoEmDias} dias).`;
                        }
                        else {
                            const anosExcedentes = Math.max(0, Math.floor(tempoContribTotalAnos) - 20);
                            const percentual = Math.min(1, 0.60 + (anosExcedentes * 0.02));
                            vB = m * percentual;
                            dC = `Cálculo pela REGRA NOVA (EC 103/2019). O valor corresponde a ${ (percentual * 100).toFixed(0) }% da média salarial (60% + 2% por ano de contribuição que exceder 20 anos).`;
                        }
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

            document.getElementById('btnGerarAtoAposentadoria').style.display = isA ? 'inline-flex' : 'none';
            document.getElementById('btnGerarAtoPensao').style.display = isP ? 'inline-flex' : 'none';

            if (s.length > 0) desenharGrafico(s, m);

            if (n) {
                irParaPasso(3);
            }
        } finally {
            ui.toggleSpinner(b, false);
        }
    }, 50);
}

function carregarConfiguracoes() {
    const configsSalvas = localStorage.getItem('itaprevConfiguracoes');
    if (configsSalvas) {
        try {
            AppState.configuracoes = JSON.parse(configsSalvas);
        } catch (e) {
            console.error("Erro ao ler as configurações do localStorage. Usando valores padrão.", e);
        }
    }
}

function popularCamposConfiguracoes() {
    document.getElementById('config-nome-prefeito').value = AppState.configuracoes.nomePrefeito || '';
    document.getElementById('config-nome-presidente').value = AppState.configuracoes.nomePresidente || '';
    document.getElementById('config-ctc-orgao').value = AppState.configuracoes.ctcOrgao || '';
    document.getElementById('config-ctc-cnpj').value = AppState.configuracoes.ctcCnpj || '';
    document.getElementById('config-ctc-emissor-nome').value = AppState.configuracoes.ctcEmissorNome || '';
    document.getElementById('config-ctc-emissor-cargo').value = AppState.configuracoes.ctcEmissorCargo || '';
    document.getElementById('config-ctc-emissor-vinculo-label').value = AppState.configuracoes.ctcEmissorVinculoLabel || 'Matrícula';
    document.getElementById('config-ctc-emissor-vinculo-valor').value = AppState.configuracoes.ctcEmissorVinculoValor || '';
    document.getElementById('config-ctc-presidente-cargo').value = AppState.configuracoes.ctcPresidenteCargo || '';
    document.getElementById('config-ctc-presidente-portaria').value = AppState.configuracoes.ctcPresidentePortaria || '';
}

function salvarConfiguracoes(button) {
    ui.toggleSpinner(button, true);
    try {
        AppState.configuracoes = {
            nomePrefeito: document.getElementById('config-nome-prefeito').value.toUpperCase(),
            nomePresidente: document.getElementById('config-nome-presidente').value.toUpperCase(),
            ctcOrgao: document.getElementById('config-ctc-orgao').value,
            ctcCnpj: document.getElementById('config-ctc-cnpj').value,
            ctcEmissorNome: document.getElementById('config-ctc-emissor-nome').value,
            ctcEmissorCargo: document.getElementById('config-ctc-emissor-cargo').value,
            ctcEmissorVinculoLabel: document.getElementById('config-ctc-emissor-vinculo-label').value,
            ctcEmissorVinculoValor: document.getElementById('config-ctc-emissor-vinculo-valor').value,
            ctcPresidenteCargo: document.getElementById('config-ctc-presidente-cargo').value,
            ctcPresidentePortaria: document.getElementById('config-ctc-presidente-portaria').value
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

function gerarAtoDePensao(b) {
    ui.toggleSpinner(b, true);
    try {
        const tipoBeneficioPensao = document.getElementById('tipoBeneficio').value;
        const tabelaDependentes = document.getElementById('corpo-tabela-dependentes');
        const numeroDependentes = tabelaDependentes.rows.length;

        const dados = {
            atoNumero: document.getElementById('atoNumero').value.padStart(3, '0') || '___',
            atoAno: new Date().getFullYear(),
            nomePensionistaPrincipal: document.getElementById('nomePensionista').value.toUpperCase() || '________________',
            parentescoPrincipal: document.getElementById('relacaoPensionista').value || 'Dependente',
            nomeServidor: document.getElementById('nomeServidor').value.toUpperCase() || '________________',
            nacionalidadeServidor: 'brasileiro(a)',
            rgServidor: document.getElementById('rgServidor').value || '________________',
            cpfServidor: document.getElementById('cpfServidor').value || '________________',
            cargoServidor: document.getElementById('cargoServidor').value.toUpperCase() || '________________',
            atoAposentadoria: 'Ato concessivo de Aposentadoria Nº XXX/AAAA',
            dataObito: document.getElementById('dataObito').value,
            valorBaseCalculo: (tipoBeneficioPensao === 'pensao_aposentado') 
                ? parseFloat(document.getElementById('proventoAposentado').value) || 0 
                : AppState.simulacaoResultados.mediaSalarial || 0,
            nomePrefeito: AppState.configuracoes.nomePrefeito || 'FELIPE SOUZA PINHEIRO',
            nomePresidente: AppState.configuracoes.nomePresidente || 'EDIANIA DE CASTRO ALBUQUERQUE'
        };

        let descricaoInstituidor = tipoBeneficioPensao === 'pensao_ativo'
            ? `ex-servidor(a) público(a) municipal no cargo de <span class="uppercase bold">${dados.cargoServidor}</span>`
            : `aposentado(a) em conformidade com o ${dados.atoAposentadoria}`;
        
        const cotaPercentual = Math.min(1.0, 0.50 + (numeroDependentes * 0.10));
        const valorCalculadoPensao = dados.valorBaseCalculo * cotaPercentual;
        let complemento = (valorCalculadoPensao < SALARIO_MINIMO) ? SALARIO_MINIMO - valorCalculadoPensao : 0;
        const valorTotalFinal = valorCalculadoPensao + complemento;

        let tabelaRateioHTML = '';
        const valorRateado = numeroDependentes > 0 ? valorCalculadoPensao / numeroDependentes : 0;

        Array.from(tabelaDependentes.rows).forEach(linha => {
            const nome = linha.querySelector('.dependente-nome').value.toUpperCase();
            const parentesco = linha.querySelector('.dependente-parentesco').value;
            const isInvalid = linha.querySelector('.dependente-invalido').value === 'Sim';
            tabelaRateioHTML += `
                <tr>
                    <td>${nome}</td>
                    <td>${parentesco}</td>
                    <td>${isInvalid ? 'Enquanto durar a invalidez' : 'Temporária'}</td>
                    <td>${(cotaPercentual * 100).toFixed(0)}% (Rateio)</td>
                    <td style="text-align:right;">${formatarDinheiro(valorRateado)}</td>
                </tr>`;
        });
        
        if (complemento > 0) {
            tabelaRateioHTML += `<tr><td colspan="4">COMPLEMENTAÇÃO CONSTITUCIONAL</td><td style="text-align:right;">${formatarDinheiro(complemento)}</td></tr>`;
        }
        
        tabelaRateioHTML += `<tr class="total-row"><td colspan="4">TOTAL DA PENSÃO</td><td style="text-align:right;">${formatarDinheiro(valorTotalFinal)}</td></tr>`;

        const htmlConteudo = `
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ato de Pensão Nº ${dados.atoNumero}/${dados.atoAno}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; color: #000; margin: 0; }
                .container { width: 210mm; min-height: 297mm; margin: auto; padding: 3cm 2.5cm; box-sizing: border-box; display: flex; flex-direction: column; }
                .header p { font-weight: bold; margin: 2px 0; text-align: center; } .title { text-align: center; font-weight: bold; margin: 1.5cm 0; }
                .content-body { flex-grow: 1; text-align: justify; } .indent { text-indent: 50px; } .bold { font-weight: bold; } .uppercase { text-transform: uppercase; }
                .resolvem { text-align: center; font-weight: bold; margin: 2em 0; } table { width: 100%; border-collapse: collapse; margin-top: 1em; font-size: 11pt; }
                th, td { border: 1px solid #ccc; padding: 5px; text-align: left; } th { background-color: #f2f2f2; } .total-row td { font-weight: bold; }
                .signature-container { display: flex; justify-content: space-between; text-align: center; margin-top: 80px; }
                .signature-block { width: 48%; } .signature-line { margin: 60px 0 5px 0; border-bottom: 1px solid #000; }
                .signature-block p { margin: 0; line-height: 1.2; font-size: 11pt; } .data-local { text-align: left; margin-top: 40px; }
                 @media print { .container { border: none; box-shadow: none; margin: 0; } }
            </style></head><body>
            <div class="container">
                <div class="header"><p>ITAPREV</p><p>INSTITUTO DE PREVIDÊNCIA DOS</p><p>SERVIDORES MUNICIPAIS DE ITAPIPOCA</p></div>
                <p class="title">ATO DE CONCESSÃO DE PENSÃO POR MORTE № ${dados.atoNumero}/${dados.atoAno}.</p>
                <div class="content-body">
                    <p class="indent">O PREFEITO MUNICIPAL DE ITAPIPOCA e a Presidente do ITAPREV, no uso de suas atribuições legais,</p>
                    <p class="resolvem">RESOLVEM:</p>
                    <p class="indent">CONCEDER BENEFÍCIO DE PENSÃO POR MORTE AO(À) BENEFICIÁRIO(A) <span class="bold uppercase">${dados.nomePensionistaPrincipal}</span>, na qualidade de ${dados.parentescoPrincipal}, do(a) ex-servidor(a) (instituidor) <span class="bold uppercase">${dados.nomeServidor}</span>, ${dados.nacionalidadeServidor}, portador(a) do RG n.º ${dados.rgServidor} e CPF n.º ${dados.cpfServidor}, ${descricaoInstituidor}, com fundamento no art. 40 §7º da CF/88 (redação da EC n.º 103/19), e na legislação municipal, cujos efeitos financeiros se darão a partir do dia do óbito ${formatarDataBR(dados.dataObito)}.</p>
                    <p class="indent">A Pensão será paga no valor total de ${formatarDinheiro(valorTotalFinal)} (${valorPorExtenso(valorTotalFinal)}), conforme discriminado:</p>
                    <table><thead><tr><th>BENEFICIÁRIO(S)</th><th>PARENTESCO</th><th>NATUREZA</th><th>COTA</th><th style="text-align:right;">VALOR</th></tr></thead><tbody>${tabelaRateioHTML}</tbody></table>
                    <p>Ficam assegurados os limites de acumulação de benefícios previstos no artigo 24 da EC nº 103/2019.</p>
                    <p class="data-local">Paço da Prefeitura Municipal de Itapipoca, em ${formatarDataPorExtenso(new Date())}.</p>
                    <div class="signature-container">
                        <div class="signature-block"><p class="signature-line"></p><p class="bold uppercase">${dados.nomePrefeito}</p><p>Prefeito Municipal</p></div>
                        <div class="signature-block"><p class="signature-line"></p><p class="bold uppercase">${dados.nomePresidente}</p><p>Presidente do ITAPREV</p></div>
                    </div>
                </div></div></body></html>`;
        
        const newWindow = window.open();
        newWindow.document.open();
        newWindow.document.write(htmlConteudo);
        newWindow.document.close();
        ui.showToast("Ato de Pensão gerado com sucesso!", true);
    } catch (er) {
        ui.showToast("Erro ao gerar o documento.", false);
        console.error("Erro em gerarAtoDePensao:", er);
    } finally {
        ui.toggleSpinner(b, false);
    }
}

function gerarAtoDeAposentadoria(b) {
    ui.toggleSpinner(b, true);
    try {
        const s = document.getElementById('sexo').value,
            tP = calculateTotalProventos(),
            tB = document.getElementById('tipoBeneficio').value;
        
        let fundamentoLegalDinamico = '', tipoAtoTexto = '', tipoAtoResolucao = '';
        
        if (tB === 'incapacidade') {
            const proventos = document.getElementById('incapacidadeGrave').value === 'sim' ? 'COM PROVENTOS INTEGRAIS' : 'COM PROVENTOS PROPORCIONAIS';
            tipoAtoTexto = `ATO CONCESSIVO DE APOSENTADORIA POR INCAPACIDADE PERMANENTE N.º ${document.getElementById('atoNumeroAposentadoria').value.padStart(3, '0') || '___'}/${new Date().getFullYear()}.`;
            tipoAtoResolucao = `APOSENTAR POR INCAPACIDADE PERMANENTE, ${proventos}, O(A) SERVIDOR(A) PÚBLICO(A)`;
            fundamentoLegalDinamico = `com fundamento no art. 40, § 1º, inciso I da Constituição Federal (redação da EC 103/2019), c/c o art. 7º do Decreto Municipal Nº 113/2022`;
        } else if (tB === 'compulsoria') {
            tipoAtoTexto = `ATO CONCESSIVO DE APOSENTADORIA COMPULSÓRIA N.º ${document.getElementById('atoNumeroAposentadoria').value.padStart(3, '0') || '___'}/${new Date().getFullYear()}.`;
            tipoAtoResolucao = `APOSENTAR COMPULSORIAMENTE, COM PROVENTOS PROPORCIONAIS, O(A) SERVIDOR(A) PÚBLICO(A)`;
            fundamentoLegalDinamico = `com fundamento no art. 40, § 1º, inciso II da Constituição Federal (redação da EC 103/2019), c/c o art. 8º do Decreto Municipal Nº 113/2022`;
        } else {
            tipoAtoTexto = `ATO CONCESSIVO DE APOSENTADORIA VOLUNTÁRIA N.º ${document.getElementById('atoNumeroAposentadoria').value.padStart(3, '0') || '___'}/${new Date().getFullYear()}.`;
            tipoAtoResolucao = `APOSENTAR VOLUNTARIAMENTE O(A) SERVIDOR(A) PÚBLICO(A)`;
            fundamentoLegalDinamico = AppState.simulacaoResultados.fundamentoLegal 
                ? `com fundamento no ${AppState.simulacaoResultados.fundamentoLegal}, c/c a Lei Municipal Nº 035/2022 e Decreto Municipal Nº 113/2022`
                : document.getElementById('fundamentoLegalPersonalizado').value.replace(/\n/g, '<br>') || '________________';
        }
        
        const d = {
            atoNumero: document.getElementById('atoNumeroAposentadoria').value.padStart(3, '0') || '___',
            atoAno: new Date().getFullYear(),
            nomeServidor: document.getElementById('nomeServidor').value.toUpperCase() || '________________',
            nacionalidade: s === 'F' ? 'brasileira' : 'brasileiro',
            rg: document.getElementById('rgServidor').value || '________________',
            cpf: document.getElementById('cpfServidor').value || '________________',
            matricula: document.getElementById('matriculaServidor').value || '________________',
            cargaHoraria: document.getElementById('cargaHorariaServidor').value || '________________',
            cargo: document.getElementById('cargoServidor').value.toUpperCase() || '________________',
            lotacao: document.getElementById('lotacaoServidor').value.toUpperCase() || '________________',
            admissao: formatarDataBR(document.getElementById('dataAdmissao').value) || '__/__/____',
            fundamentoLegal: fundamentoLegalDinamico,
            dataAtual: formatarDataPorExtenso(document.getElementById('dataCalculo').value || new Date()),
        };
        
        const vF = formatarDinheiro(tP);
        const tE = valorPorExtenso(tP);
        let pHTR = '';
        document.querySelectorAll("#corpo-tabela-proventos-ato tr").forEach(l => {
            const desc = l.querySelector('.provento-descricao').value || '', v = parseFloat(l.querySelector('.provento-valor').value) || 0;
            if (desc && v > 0) pHTR += `<tr><td>${desc}</td><td style="text-align:right;">${formatarDinheiro(v)}</td></tr>`;
        });
        
        const cH = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ato de Aposentadoria Nº ${d.atoNumero}/${d.atoAno}</title>
            <style>
                body{font-family:'Times New Roman',Times,serif;color:black;line-height:1.5;font-size:12pt;margin:0;}
                .container{display:flex; flex-direction:column; width:210mm; min-height:297mm; box-sizing:border-box; background-image: url('https://i.postimg.cc/1tC5TV16/Papel-Timbrado-ITAPREV-1.png'); background-size: 100% 100%; -webkit-print-color-adjust: exact; padding: 4.5cm 2cm 3.5cm 2cm;}
                .content-body {flex-grow: 1;} .center{text-align:center;} .bold{font-weight:bold;} .uppercase{text-transform:uppercase;} .justify{text-align:justify;} p{margin:1em 0;}
                .header-ato{text-align:center; font-weight:bold; margin-bottom: 2cm;}
                .proventos-table{width:100%;border-collapse:collapse;margin:20px 0;border:1px solid black;} .proventos-table th,.proventos-table td{border:1px solid black;padding:5px;}
                .proventos-table th{background-color:#e0e0e0;text-align:center;} .proventos-table tfoot td{font-weight:bold; text-align:right;}
                .signature-container{display:flex; justify-content:space-around; margin-top:60px; text-align:center;} .signature-block p{margin:0;line-height:1.2;}
            </style></head><body><div class="container">
            <div class="content-body">
                <div class="header-ato"><p>${tipoAtoTexto}</p></div>
                <p class="justify">O PREFEITO MUNICIPAL DE ITAPIPOCA e a Presidente do ITAPREV, no uso de suas atribuições,</p>
                <h4 class="center uppercase" style="font-size:12pt; margin: 2em 0;">RESOLVEM:</h4>
                <p class="justify">${tipoAtoResolucao} <b class="uppercase">${d.nomeServidor}</b>, ${d.nacionalidade}, RG n.º ${d.rg}, CPF n.º ${d.cpf}, matrícula n.º ${d.matricula}, ${d.cargaHoraria}, ocupante do cargo de <b class="uppercase">${d.cargo}</b>, lotado(a) na <b class="uppercase">${d.lotacao}</b>, admitido(a) em ${d.admissao}, ${d.fundamentoLegal}, com início do benefício na data da publicação, de acordo com o quadro discriminativo:</p>
                <table class="proventos-table"><thead><tr><th>CÁLCULO DOS PROVENTOS</th><th>VALOR</th></tr></thead><tbody>${pHTR}</tbody><tfoot><tr><td>TOTAL DOS PROVENTOS</td><td>${vF}</td></tr></tfoot></table>
                <p class="justify">Os proventos do(a) servidor(a) serão fixados em ${vF} (${tE}).</p>
                <p class="center" style="margin-top: 2em;">Itapipoca- CE, ${d.dataAtual}.</p>
                <div class="signature-container">
                    <div class="signature-block"><p>_________________________________________</p><p>${AppState.configuracoes.nomePrefeito || 'NOME DO PREFEITO(A)'}</p><p>Prefeito Municipal</p></div>
                    <div class="signature-block"><p>_________________________________________</p><p>${AppState.configuracoes.nomePresidente || 'NOME DO(A) PRESIDENTE'}</p><p>Presidente do ITAPREV</p></div>
                </div>
            </div></div></body></html>`;
        
        const nA = window.open();
        nA.document.open(); nA.document.write(cH); nA.document.close();
        ui.showToast("Documento gerado.", true);
    } catch (er) {
        ui.showToast("Erro ao gerar o documento.", false); console.error(er);
    } finally {
        ui.toggleSpinner(b, false);
    }
}

async function gerarDocumentoCTC(button) {
    ui.toggleSpinner(button, true);

    try {
        const configs = AppState.configuracoes || {};
        const dadosServidor = {
            nome: document.getElementById("ctc-nomeServidor").value.toUpperCase() || "________________",
            numero: document.getElementById("ctc-numero").value || "___",
            rg: document.getElementById("ctc-rg").value.toUpperCase() || "________________",
            sexo: document.getElementById("ctc-sexo").value || "________________",
            filiacao: document.getElementById("ctc-filiacao").value || "________________",
            cargo: document.getElementById("ctc-cargo").value || "________________",
            lotacao: document.getElementById("ctc-lotacao").value || "________________",
            dataAdmissao: document.getElementById("ctc-dataAdmissao").value,
            cnpj: configs.ctcCnpj || "00.000.000/0000-00",
            cpf: document.getElementById("ctc-cpf").value || "________________",
            dataNascimento: document.getElementById("ctc-dataNascimento").value,
            pis_pasep: document.getElementById("ctc-pis_pasep").value || "________________",
            matricula: document.getElementById("ctc-matricula").value || "________________",
            dataRequerimento: document.getElementById("ctc-dataRequerimento").value,
        };

        const periodosInput = Array.from(document.querySelectorAll("#corpo-tabela-periodos-ctc tr")).map(tr => ({
            inicio: tr.querySelector('.ctc-inicio').value,
            fim: tr.querySelector('.ctc-fim').value,
            regime: tr.querySelector('.ctc-regime').value,
            faltas: parseInt(tr.querySelector('.ctc-faltas').value) || 0,
            licencas: parseInt(tr.querySelector('.ctc-licencas').value) || 0,
            outros: parseInt(tr.querySelector('.ctc-outros').value) || 0,
            fonte: tr.querySelector('.ctc-fonte').value,
        }));

        const periodosProcessados = { RGPS: [], RPPS: [] };
        let totalLiquidoRGPS = 0;
        let totalLiquidoRPPS = 0;
        const MS_POR_DIA = 1000 * 60 * 60 * 24;

        for (const periodo of periodosInput) {
            if (!periodo.inicio || !periodo.fim) continue;

            const dataInicioPeriodo = new Date(periodo.inicio + 'T00:00:00Z');
            const dataFimPeriodo = new Date(periodo.fim + 'T00:00:00Z');

            if (isNaN(dataInicioPeriodo.getTime()) || isNaN(dataFimPeriodo.getTime()) || dataInicioPeriodo > dataFimPeriodo) {
                console.warn("Período inválido ou data de início posterior à data fim, pulando:", periodo);
                continue;
            }
            const totalDeducoesNoPeriodo = periodo.faltas + periodo.licencas + periodo.outros;
            const anoInicio = dataInicioPeriodo.getUTCFullYear();
            const anoFim = dataFimPeriodo.getUTCFullYear();

            for (let ano = anoInicio; ano <= anoFim; ano++) {
                const inicioDoAno = new Date(Date.UTC(ano, 0, 1));
                const fimDoAno = new Date(Date.UTC(ano, 11, 31));

                const dataInicioEfetiva = dataInicioPeriodo > inicioDoAno ? dataInicioPeriodo : inicioDoAno;
                const dataFimEfetiva = dataFimPeriodo < fimDoAno ? dataFimPeriodo : fimDoAno;

                const tempoBruto = Math.round((dataFimEfetiva - dataInicioEfetiva) / MS_POR_DIA) + 1;
                
                const deducaoNesteAno = (ano === anoFim) ? totalDeducoesNoPeriodo : 0;
                const tempoLiquido = tempoBruto - deducaoNesteAno;

                if (tempoLiquido > 0) {
                    const dadosDoAno = {
                        ano: ano,
                        periodoStr: `${dataInicioEfetiva.toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${dataFimEfetiva.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`,
                        regime: periodo.regime,
                        tempoApurado: tempoBruto,
                        faltas: (ano === anoFim) ? periodo.faltas : 0,
                        licencas: (ano === anoFim) ? periodo.licencas : 0,
                        outros: (ano === anoFim) ? periodo.outros : 0,
                        tempoLiquido: tempoLiquido
                    };

                    periodosProcessados[periodo.regime].push(dadosDoAno);
                    if (periodo.regime === 'RGPS') {
                        totalLiquidoRGPS += tempoLiquido;
                    } else {
                        totalLiquidoRPPS += tempoLiquido;
                    }
                }
            }
        }
      
        const criarTabelaHTML = (titulo, dados, subtotal) => {
            if (dados.length === 0) return '';
            let rows = dados.map(d => `<tr><td>${d.ano}</td><td>${d.periodoStr.replace(/ a /g, ' à ')}</td><td>${d.regime}</td><td>${d.tempoApurado}</td><td>${d.faltas || '-'}</td><td>${d.licencas || '-'}</td><td>${d.outros || '-'}</td><td>${d.tempoLiquido}</td></tr>`).join('');
            return `<h4 class="table-title">${titulo}</h4><table><thead><tr><th>Ano</th><th>Período</th><th>Regime</th><th>T. Apurado</th><th>Faltas</th><th>Licenças</th><th>Outros</th><th>T. Líquido</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="7" class="subtotal-label">SUBTOTAL</td><td class="subtotal-value">${subtotal}</td></tr></tfoot></table>`;
        };

        const tabelaRGPS_HTML = criarTabelaHTML('REGIME GERAL DE PREVIDÊNCIA SOCIAL', periodosProcessados.RGPS, totalLiquidoRGPS);
        const tabelaRPPS_HTML = criarTabelaHTML('REGIME PRÓPRIO DE PREVIDÊNCIA SOCIAL', periodosProcessados.RPPS, totalLiquidoRPPS);
        
        let periodoCompletoRGPS = '', periodoCompletoRPPS = '';
        if (periodosProcessados.RGPS.length > 0) periodoCompletoRGPS = `<p>RGPS - ${periodosProcessados.RGPS[0].periodoStr.split(' a ')[0]} à ${periodosProcessados.RGPS.slice(-1)[0].periodoStr.split(' a ')[1]} - MUNICÍPIO DE ITAPIPOCA;</p>`;
        if (periodosProcessados.RPPS.length > 0) periodoCompletoRPPS = `<p>RPPS - ${periodosProcessados.RPPS[0].periodoStr.split(' a ')[0]} à ${periodosProcessados.RPPS.slice(-1)[0].periodoStr.split(' a ')[1]} - MUNICÍPIO DE ITAPIPOCA.</p>`;

        const totalGeralDias = totalLiquidoRGPS + totalLiquidoRPPS;
        const { anos, meses, dias } = diasParaAnosMesesDias(totalGeralDias);
        const totalExtenso = `${anos} anos, ${meses} meses e ${dias} dias`;
        const dataEmissao = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const htmlFinal = `
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>CTC - ${dadosServidor.nome}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; margin:0; }
                .container {display:flex; flex-direction:column; width: 210mm; min-height: 297mm; box-sizing: border-box; margin:auto; /* REMOVIDO: background-image e background-size */ padding: 4.5cm 2cm 3.5cm 2cm;}
                .content-body {flex-grow: 1;} .header { text-align: center; font-weight: bold; } .header h4 { margin: 1cm 0 1.5cm 0; font-size: 11pt; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 15px; margin: 15px 0; font-size: 9.5pt; }
                .info-grid p { margin: 0; } .info-grid span { font-weight: bold; } .periodo-summary p { margin: 2px 0; }
                .table-title { margin-top: 20px; font-weight: bold; text-align: center; font-size: 10pt;}
                table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 15px;}
                th, td { border: 1px solid #000; padding: 3px; text-align: center; } th { font-weight: bold; }
                .subtotal-label { text-align: right; font-weight: bold; } .subtotal-value { font-weight: bold; }
                .certifico { margin-top: 25px; text-align: justify; } .data-local { text-align: center; margin-top: 40px; }
                .assinaturas { margin-top: 70px; display: flex; justify-content: space-around; text-align: center; }
                .assinatura-block p { margin: 0; font-size: 9pt; }
            </style>
        </head><body><div class="container">
            <div class="content-body">
                <div class="header"><h4>CERTIDÃO DE TEMPO DE CONTRIBUIÇÃO N.º ${dadosServidor.numero}/${new Date().getFullYear()}</h4></div>
                <div class="info-grid">
                    <div><p><span>Órgão Expedidor:</span> ${configs.ctcOrgao || 'ITAPREV'}</p></div><div><p><span>CNPJ:</span> ${dadosServidor.cnpj}</p></div>
                    <div style="grid-column: 1 / -1;"><p><span>Nome do(a) Servidor(a):</span> ${dadosServidor.nome}</p></div>
                    <div><p><span>CPF:</span> ${dadosServidor.cpf}</p></div><div><p><span>RG/Órgão:</span> ${dadosServidor.rg}</p></div>
                    <div><p><span>Nascimento:</span> ${formatarDataBR(dadosServidor.dataNascimento)}</p></div><div><p><span>Sexo:</span> ${dadosServidor.sexo}</p></div>
                    <div><p><span>PIS/PASEP:</span> ${dadosServidor.pis_pasep}</p></div><div><p><span>Matrícula:</span> ${dadosServidor.matricula}</p></div>
                    <div style="grid-column: 1 / -1;"><p><span>Filiação:</span> ${dadosServidor.filiacao}</p></div>
                    <div><p><span>Cargo Efetivo:</span> ${dadosServidor.cargo}</p></div><div><p><span>Lotação:</span> ${dadosServidor.lotacao}</p></div>
                    <div><p><span>Admissão:</span> ${formatarDataBR(dadosServidor.dataAdmissao)}</p></div><div><p><span>Requerimento:</span> ${formatarDataBR(dadosServidor.dataRequerimento)}</p></div>
                </div>
                <div class="periodo-summary"><p><b>PERÍODOS DE CONTRIBUIÇÃO:</b></p>${periodoCompletoRGPS}${periodoCompletoRPPS}</div>
                ${tabelaRGPS_HTML}${tabelaRPPS_HTML}
                <div class="certifico">
                    <p>CERTIFICO que o(a) interessado(a) conta com <b>${totalGeralDias} dias</b> de efetivo exercício, correspondentes a <b>${totalExtenso}</b>.</p>
                    <p>CERTIFICO que a Lei nº 047/2008 assegura aposentadorias e pensão, com aproveitamento de tempo para outro Regime, na forma de contagem recíproca.</p>
                </div>
                <p class="data-local">Itapipoca-CE, ${dataEmissao}.</p>
                <div class="assinaturas">
                    <div class="assinatura-block"><p>_________________________________________</p><p><b>${configs.ctcEmissorNome || 'NOME DO EMISSOR'}</b></p><p>${configs.ctcEmissorCargo || 'CARGO'}</p><p>${configs.ctcEmissorVinculoLabel || 'Portaria'}: ${configs.ctcEmissorVinculoValor || 'Nº 000/0000'}</p></div>
                    <div class="assinatura-block"><p>_________________________________________</p><p><b>${configs.nomePresidente || 'NOME DO PRESIDENTE'}</b></p><p>${configs.ctcPresidenteCargo || 'PRESIDENTE'}</p><p>Portaria: ${configs.ctcPresidentePortaria || 'Nº 000/0000'}</p></div>
                </div>
            </div></div></body></html>`;

        const newWindow = window.open();
        newWindow.document.open(); newWindow.document.write(htmlFinal); newWindow.document.close();
        ui.showToast("Documento CTC gerado com sucesso!", true);
    } catch (error) {
        console.error("Erro ao gerar a CTC:", error);
        ui.showToast("Ocorreu um erro ao gerar o documento.", false);
    } finally {
        ui.toggleSpinner(button, false);
    }
}

function calculateValorLiquido(pB) {
    if (pB <= 0) { document.getElementById('resultadoLiquido').innerHTML = ''; return; }
    const tetoRGPS = 7786.02, tipoBeneficio = document.getElementById('tipoBeneficio').value;
    let baseIsencao = (tipoBeneficio === 'incapacidade') ? tetoRGPS : SALARIO_MINIMO * 3;
    let descContribuicao = tipoBeneficio === 'incapacidade' ? `(14% sobre o que excede o teto do RGPS)` : `(14% sobre o que excede 3 salários mínimos)`;
    let contribuicaoRPPS = pB > baseIsencao ? (pB - baseIsencao) * 0.14 : 0;
    const baseCalculoIR = pB - contribuicaoRPPS;
    let impostoRenda = 0;
    if (baseCalculoIR > 2259.20) {
        if (baseCalculoIR <= 2826.65) impostoRenda = baseCalculoIR * 0.075 - 169.44;
        else if (baseCalculoIR <= 3751.05) impostoRenda = baseCalculoIR * 0.15 - 381.44;
        else if (baseCalculoIR <= 4664.68) impostoRenda = baseCalculoIR * 0.225 - 662.77;
        else impostoRenda = baseCalculoIR * 0.275 - 896.00;
    }
    impostoRenda = Math.max(0, impostoRenda);
    const valorLiquido = pB - contribuicaoRPPS - impostoRenda;

    document.getElementById('resultadoLiquido').innerHTML = `<h3>Estimativa do Valor Líquido</h3>
        <table>
            <tr><td>(+) Provento Bruto</td><td>${formatarDinheiro(pB)}</td></tr>
            <tr><td>(-) Contribuição RPPS ${descContribuicao}</td><td>${formatarDinheiro(contribuicaoRPPS)}</td></tr>
            <tr><td>(-) IRRF</td><td>${formatarDinheiro(impostoRenda)}</td></tr>
            <tr style="font-weight:bold;"><td>(=) Valor Líquido Estimado</td><td>${formatarDinheiro(valorLiquido)}</td></tr>
        </table><small>Nota: Valores de descontos são estimativas.</small>`;
}

function projetarAposentadoria(mS) {
    const dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00Z'), dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00Z');
    const s = document.getElementById('sexo').value, tED = parseInt(document.getElementById('tempoExterno').value) || 0, tSD = parseInt(document.getElementById('tempoEspecial').value) || 0;
    const dataRef = document.getElementById('dataCalculo').value ? new Date(document.getElementById('dataCalculo').value + 'T00:00:00Z') : new Date();
    const iA = (dataRef - dN) / 31557600000;
    const tCT = (dataRef - dA) / 31557600000 + tED / 365.25 + tSD / 365.25;
    const dR = new Date('2019-11-13T00:00:00Z'), tCR = (dR - dA) / 31557600000 + tED / 365.25 + tSD / 365.25;
    
    let p = {}, rA = null, isMagisterio = document.getElementById('isMagisterio').value === 'sim';
    const redutorIdade = isMagisterio ? 5 : 0, redutorTempo = isMagisterio ? 5 : 0;
    const vRG = mS * Math.min(1, 0.6 + Math.max(0, Math.floor(tCT) - 20) * 0.02);

    if (tCR >= (s === 'M' ? 33 : 28) - redutorTempo) {
        const tN = (s === 'M' ? 35 : 30) - redutorTempo, ped = Math.max(0, tN - tCR) * 0.5;
        if (tCT >= tN + ped) { const fP = calcularFatorPrevidenciario(iA, tCT, s); p['Pedágio 50%'] = { data: 'Já cumpriu!', valor: mS * fP, obs: `Fator Prev: ${fP.toFixed(4)}`, legal: "Art. 17 EC 103/19" }; if (!rA) rA = p['Pedágio 50%'].legal; }
    }
    if (iA >= (s === 'M' ? 60 : 57) - redutorIdade && tCT >= (s === 'M' ? 35 : 30) - redutorTempo) { p['Pedágio 100%'] = { data: 'Já cumpriu!', valor: mS, obs: '100% da média', legal: "Art. 20 EC 103/19" }; if (!rA) rA = p['Pedágio 100%'].legal; }
    const aA = dataRef.getFullYear();
    if (iA >= ((s === 'M' ? 61 : 56) - redutorIdade) + Math.floor((aA - 2019) * 0.5) && tCT >= (s === 'M' ? 35 : 30) - redutorTempo) { p['Idade Progressiva'] = { data: 'Já cumpriu!', valor: vRG, obs: '60% + 2% por ano', legal: "Art. 4º EC 103/19" }; if (!rA) rA = p['Idade Progressiva'].legal; }
    if (iA + tCT >= ((s === 'M' ? 96 : 86) - (isMagisterio ? 10 : 0)) + (aA - 2019)) { p['Pontos'] = { data: 'Já cumpriu!', valor: vRG, obs: '60% + 2% por ano', legal: "Art. 4º EC 103/19" }; if (!rA) rA = p['Pontos'].legal; }
    if (iA >= (s === 'M' ? 65 : 62) - redutorIdade && tCT >= 25) { p['Regra Permanente'] = { data: 'Já cumpriu!', valor: vRG, obs: 'Requer 25a contrib.', legal: "Art. 10 EC 103/19" }; if (!rA) rA = p['Regra Permanente'].legal; }
    
    AppState.simulacaoResultados.fundamentoLegal = rA;
    let html = `<h3>📅 Projeção de Elegibilidade</h3><p>Idade: ${iA.toFixed(1)} anos, Tempo Contrib.: ${tCT.toFixed(1)} anos</p><table><thead><tr><th>Regra</th><th>Data</th><th>Valor</th><th>Obs.</th></tr></thead><tbody>`;
    if (Object.keys(p).length > 0) for (const r in p) html += `<tr><td>${r}</td><td>${p[r].data}</td><td>${p[r].valor > 0 ? formatarDinheiro(p[r].valor) : '-'}</td><td>${p[r].obs || ''}</td></tr>`;
    else html += `<tr><td colspan="4">Nenhuma regra cumprida na data de referência.</td></tr>`;
    document.getElementById('resultadoProjecao').innerHTML = html + '</tbody></table><small>Nota: Projeções são estimativas.</small>';
}

function calcularFatorPrevidenciario(i, t, s) {
    const eS = EXPECTATIVA_SOBREVIDA_IBGE[s][Math.floor(i)] || (s === 'M' ? 18.0 : 21.7), a = 0.31;
    const f = t * a / eS * (1 + (i + t * a) / 100);
    return f < 0 ? 0 : f;
}

function verificarAbonoPermanencia() {
    const isMagisterio = document.getElementById('isMagisterio').value === 'sim', redutor = isMagisterio ? 5 : 0;
    const dN = new Date(document.getElementById('dataNascimento').value + 'T00:00:00Z'), dA = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00Z');
    const s = document.getElementById('sexo').value, dataRef = new Date();
    const i = (dataRef - dN) / 31557600000;
    const tC = (dataRef - dA) / 31557600000 + (parseInt(document.getElementById('tempoExterno').value) || 0) / 365.25 + (parseInt(document.getElementById('tempoEspecial').value) || 0) / 365.25;
    const iM = (s === 'M' ? 62 : 57) - redutor, tM = (s === 'M' ? 35 : 30) - redutor;
    document.getElementById('resultadoAbono').innerHTML = i >= iM && tC >= tM ? `<h3>✅ Abono de Permanência</h3><p>O servidor cumpriu os requisitos e tem direito ao Abono de Permanência.</p>` : '';
}

function desenharGrafico(s, m) {
    const ctx = document.getElementById("graficoSalarios").getContext("2d");
    if (AppState.salarioChart) AppState.salarioChart.destroy();
    const iDM = document.body.classList.contains('dark-mode'), bC = iDM ? '#90caf9' : '#0d47a1', gC = iDM ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', fC = iDM ? '#eee' : '#333';
    AppState.salarioChart = new Chart(ctx, { type: "bar", data: { labels: s.map(i => i.label), datasets: [{ label: "Salário Atualizado (R$)", data: s.map(i => i.value.toFixed(2)), backgroundColor: bC }] },
        options: { responsive: true, plugins: { title: { display: true, text: 'Evolução dos Salários Atualizados', color: fC, font: { size: 16 } }, annotation: { annotations: { line1: { type: 'line', yMin: m, yMax: m, borderColor: 'red', borderWidth: 2, borderDash: [6, 6], label: { content: `Média: ${formatarDinheiro(m)}`, enabled: true, position: 'end' } } } } },
            scales: { y: { beginAtZero: true, ticks: { color: fC }, grid: { color: gC } }, x: { ticks: { color: fC }, grid: { color: gC } } } }
    });
}

function exportarExcel(b) {
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const d = [["Info Servidor"], ["Nome", document.getElementById("nomeServidor").value], ["Matrícula", document.getElementById("matriculaServidor").value], ["CPF", document.getElementById("cpfServidor").value], [],
                ["Resumo"], ["Tipo", AppState.simulacaoResultados.tipo], ["Média (R$)", AppState.simulacaoResultados.mediaSalarial], ["Valor Final (R$)", AppState.simulacaoResultados.valorBeneficioFinal], [],
                ['Salários de Contribuição'], ['Nº', 'MÊS/ANO', 'FATOR', 'SALÁRIO', 'ATUALIZADO']];
            document.querySelectorAll("#corpo-tabela tr").forEach((l, i) => d.push([i + 1, ...Array.from(l.querySelectorAll("input"), inp => inp.value)]));
            const ws = XLSX.utils.aoa_to_sheet(d), wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Simulação");
            XLSX.writeFile(wb, "simulacao-previdencia.xlsx");
            ui.showToast("Exportado para Excel!", true);
        } catch (e) { ui.showToast("Erro ao exportar.", false); console.error(e);
        } finally { ui.toggleSpinner(b, false); }
    }, 50);
}

function importarExcel() {
    const f = document.getElementById('arquivoExcel').files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            const d = new Uint8Array(e.target.result), wb = XLSX.read(d, { type: "array" }), s = wb.Sheets[wb.SheetNames[0]], rows = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
            limparTabela();
            let sI = rows.findIndex(r => r.some(c => /(mês\/ano|mes\/ano)/i.test(String(c)))) + 1;
            if (sI === 0) sI = 1;
            for (let i = sI; i < rows.length; i++) {
                let [mA, f, s] = rows[i]; if (!mA && !f && !s) continue;
                if (typeof mA === "number" && mA > 1) { const date = XLSX.SSF.parse_date_code(mA); if (date) mA = String(date.m).padStart(2, "0") + "/" + date.y; } else mA = String(mA);
                const fN = parseFloat(String(f).replace(",", ".")), sN = parseFloat(String(s).replace(",", "."));
                if (mA && !isNaN(fN) && !isNaN(sN)) adicionarLinha(mA, fN, sN);
            }
            ui.showToast("Planilha importada!", true);
        } catch (err) { ui.showToast("Erro ao processar Excel.", false); console.error(err);
        } finally { document.getElementById('arquivoExcel').value = ''; }
    };
    r.readAsArrayBuffer(f);
}

function getPrintableHTML() {
    const n = document.getElementById("nomeServidor").value || "Servidor", iV = document.getElementById('tipoBeneficio').value === 'voluntaria' || document.getElementById('tipoBeneficio').value === 'idade';
    return `<style>body{font-family:Arial,sans-serif;font-size:10px}h2,h3{color:#0d47a1;border-bottom:1px solid #ccc;padding-bottom:4px}table{border-collapse:collapse;width:100%;margin-top:10px;font-size:9px}th,td{border:1px solid #ccc;padding:5px}th{background-color:#f2f2f2}.header h1{color:#0d47a1}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 15px}.info-grid p{margin:0}</style><div class="header" style="text-align:center;"><h1>Relatório Previdenciário</h1><p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p></div><h2>Dados do Servidor</h2><div class="info-grid"><p><strong>Nome:</strong> ${n}</p><p><strong>Matrícula:</strong> ${document.getElementById("matriculaServidor").value}</p><p><strong>CPF:</strong> ${document.getElementById("cpfServidor").value}</p><p><strong>Cargo:</strong> ${document.getElementById("cargoServidor").value}</p><p><strong>Admissão:</strong> ${formatarDataBR(document.getElementById('dataAdmissao').value)}</p><p><strong>Nascimento:</strong> ${formatarDataBR(document.getElementById('dataNascimento').value)}</p></div>${document.getElementById("resultado").innerHTML}${document.getElementById("resultadoLiquido").innerHTML}${iV?document.getElementById("resultadoProjecao").innerHTML:''}${iV?document.getElementById("resultadoAbono").innerHTML:''}`;
}

function imprimirSimulacao() { document.getElementById("printableArea").innerHTML = getPrintableHTML(); window.print(); }

function salvarSimulacaoHistorico(nF) {
    let n = typeof nF === "string" ? nF : document.getElementById("nomeSimulacao").value.trim();
    if (!n) return ui.showToast("Digite um nome para a simulação.", false);
    if (!AppState.usuarioAtual) return ui.showToast("Você precisa estar logado.", false);
    const d = { id: crypto.randomUUID(), nome: n, dados: coletarDadosSimulacao(), data: new Date().toISOString() };
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`, h = JSON.parse(localStorage.getItem(c) || "[]");
    h.unshift(d); localStorage.setItem(c, JSON.stringify(h));
    ui.showToast("Simulação salva no histórico!", true); listarHistorico(); atualizarIndicadoresDashboard();
}

function coletarDadosSimulacao() {
    const dados = { passo1: {}, tabela: [], proventosAto: [], dependentes: [], resultados: AppState.simulacaoResultados, periodosExternos: [], nome: document.getElementById('nomeSimulacao').value.trim() };
    
    document.querySelectorAll('#passo1 input:not([type=hidden]),#passo1 select,#passo1 textarea').forEach(e => { if (e.id) dados.passo1[e.id] = e.value; });
    
    document.querySelectorAll("#corpo-tabela tr").forEach(l => dados.tabela.push(Array.from(l.querySelectorAll("input"), i => i.value).slice(0, 3)));
    document.querySelectorAll("#corpo-tabela-proventos-ato tr").forEach(l => dados.proventosAto.push({ descricao: l.querySelector(".provento-descricao").value, valor: l.querySelector(".provento-valor").value }));
    
    // ATUALIZADO PARA COLETAR O CPF DO DEPENDENTE
    document.querySelectorAll("#corpo-tabela-dependentes tr").forEach(l => dados.dependentes.push({ 
        nome: l.querySelector('.dependente-nome').value, 
        dataNasc: l.querySelector('.dependente-dataNasc').value, 
        parentesco: l.querySelector('.dependente-parentesco').value, 
        invalido: l.querySelector('.dependente-invalido').value,
        cpf: l.querySelector('.dependente-cpf').value,
        rg: l.querySelector('.dependente-rg').value,
        endereco: l.querySelector('.dependente-endereco').value,
        telefone: l.querySelector('.dependente-telefone').value
    }));

    document.querySelectorAll("#corpo-tabela-tempo-externo tr").forEach(row => dados.periodosExternos.push({ inicio: row.dataset.inicio, fim: row.dataset.fim }));

    const checklistContainer = document.getElementById('checklist-content');
    if (checklistContainer && checklistContainer.innerHTML !== '') {
        const checklistState = { secoes: {}, observacoesGerais: document.getElementById('checklist-observacoes').value };
        checklistContainer.querySelectorAll('.checklist-secao').forEach(secaoEl => {
            const secaoKey = secaoEl.dataset.secaoKey;
            checklistState.secoes[secaoKey] = { itens: [] };
            secaoEl.querySelectorAll('.checklist-item').forEach(itemEl => {
                checklistState.secoes[secaoKey].itens.push({
                    texto: itemEl.querySelector('label').innerText,
                    checked: itemEl.querySelector('input[type="checkbox"]').checked,
                    nota: itemEl.querySelector('textarea.checklist-item-note').value
                });
            });
        });
        dados.resultados.checklistState = checklistState;
    }

    return dados;
}

function listarHistorico() {
    const l = document.getElementById("listaHistorico"); if (!l) return; l.innerHTML = "";
    if (!AppState.usuarioAtual) { l.innerHTML = "<li>Faça login para ver seu histórico.</li>"; return; }
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`, tR = JSON.parse(localStorage.getItem(c) || "[]").sort((a,b) => new Date(b.data) - new Date(a.data));
    if (tR.length === 0) l.innerHTML = "<li>Nenhuma simulação encontrada.</li>";
    else tR.forEach(r => {
        const i = document.createElement("li"), dF = new Date(r.data || Date.now()).toLocaleString('pt-BR');
        i.innerHTML = `<div class="item-info"><span>${r.nome}</span><small>${dF}</small></div><div class="item-actions"><button onclick="carregarDoHistorico('${r.id}')" title="Carregar"><i class="ri-folder-open-line"></i></button><button class="danger btn-tabela" onclick="excluirDoHistorico('${r.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        l.appendChild(i);
    });
}

// ***** INÍCIO DA SEÇÃO CORRIGIDA *****
function carregarDoHistorico(id) {
    if (!AppState.usuarioAtual) return;
    const c = `historicoSimulacoes_${AppState.usuarioAtual.uid}`;
    const h = JSON.parse(localStorage.getItem(c) || "[]");
    const rE = h.find(r => r.id === id);
    if (!rE) {
        return ui.showToast("Erro: Simulação não encontrada.", false);
    }
    // A CHAMADA CORRETA É PARA A FUNÇÃO DO OBJETO 'simulacao'
    simulacao.restaurarDados(rE.dados);
}
// ***** FIM DA SEÇÃO CORRIGIDA *****

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
        atualizarIndicadoresDashboard();
    }
}

function salvarCTC() {
    const n = prompt("Nome para salvar esta CTC no histórico:"); 
    if (!n || !AppState.usuarioAtual) return;

    // Agora usa a função centralizada para coletar os dados
    const dadosCTC = coletarDadosCTC(); 
    
    const ctc = { 
        id: crypto.randomUUID(), 
        nome: n, 
        data: new Date().toISOString(), 
        dados: dadosCTC // Atribui os dados coletados
    };

    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const cs = JSON.parse(localStorage.getItem(ch) || "[]");
    cs.unshift(ctc); 
    localStorage.setItem(ch, JSON.stringify(cs));
    
    listarCTCsSalvas(); 
    ui.showToast("CTC salva no histórico!", true); 
    atualizarIndicadoresDashboard();
}

/**
 * Coleta todos os dados do formulário da CTC em um objeto.
 * @returns {object} Objeto com os dados da CTC.
 */
function coletarDadosCTC() {
    return {
        nomeServidor: document.getElementById('ctc-nomeServidor').value,
        numero: document.getElementById('ctc-numero').value,
        matricula: document.getElementById('ctc-matricula').value,
        cpf: document.getElementById('ctc-cpf').value,
        rg: document.getElementById('ctc-rg').value,
        dataNascimento: document.getElementById('ctc-dataNascimento').value,
        sexo: document.getElementById('ctc-sexo').value,
        pis_pasep: document.getElementById('ctc-pis_pasep').value,
        filiacao: document.getElementById('ctc-filiacao').value,
        cargo: document.getElementById('ctc-cargo').value,
        lotacao: document.getElementById('ctc-lotacao').value,
        dataAdmissao: document.getElementById('ctc-dataAdmissao').value,
        dataRequerimento: document.getElementById('ctc-dataRequerimento').value,
        periodos: Array.from(document.querySelectorAll("#corpo-tabela-periodos-ctc tr")).map(l => ({
            inicio: l.querySelector('.ctc-inicio').value,
            fim: l.querySelector('.ctc-fim').value,
            regime: l.querySelector('.ctc-regime').value,
            deducoes: l.querySelector('.ctc-deducoes').value,
            fonte: l.querySelector('.ctc-fonte').value
        }))
    };
}

/**
 * Salva os dados da CTC em um arquivo JSON no computador do usuário.
 */

/**
 * Restaura os dados de um objeto CTC para o formulário na tela.
 * @param {object} dados O objeto contendo os dados da CTC.
 * @param {string} nomeArquivo O nome do arquivo para exibir no toast.
 */
function restaurarDadosCTC(dados, nomeArquivo = 'CTC Carregada') {
    handleNavClick(null, 'geradorCTC'); // Muda para a tela de CTC
    setTimeout(() => { // Usa um pequeno atraso para garantir que a tela carregou
        try {
            // Preenche os campos de input normais
            Object.keys(dados).forEach(k => {
                const el = document.getElementById(`ctc-${k}`);
                if (el) el.value = dados[k] || '';
            });

            // Limpa e preenche a tabela de períodos
            const tabelaCorpo = document.getElementById('corpo-tabela-periodos-ctc');
            tabelaCorpo.innerHTML = '';
            if (dados.periodos) {
                dados.periodos.forEach(p => adicionarLinhaPeriodoCTC(p.inicio, p.fim, p.regime, p.deducoes, p.fonte));
            }
            
            calcularTempoTotalCTC(); // Recalcula o total de dias
            ui.showToast(`CTC "${nomeArquivo}" carregada com sucesso.`, true);

        } catch (error) {
            console.error("Erro ao restaurar dados da CTC:", error);
            ui.showToast("Falha ao carregar dados da CTC. O arquivo pode estar corrompido.", false);
        }
    }, 150);
}

/**
 * Lê um ou mais arquivos JSON de CTC do computador e os importa para o histórico local.
 * @param {Event} event O evento do input de arquivo.
 */
function carregarCTCLocal(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!AppState.usuarioAtual) {
        ui.showToast("Você precisa estar logado para carregar CTCs.", false);
        return;
    }

    // Chave do localStorage onde as CTCs são salvas
    const ctcsKey = `ctcs_salvas_${AppState.usuarioAtual.uid}`;
    const ctcsSalvas = JSON.parse(localStorage.getItem(ctcsKey) || "[]");

    // Usamos Promise.all para aguardar que todos os arquivos sejam lidos de forma assíncrona
    const promises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    // Garante que os dados lidos têm o formato esperado
                    if (dados && dados.nomeServidor) {
                        resolve(dados); // Resolve a promessa com os dados válidos
                    } else {
                        console.warn(`Arquivo "${file.name}" parece ser inválido e será ignorado.`);
                        resolve(null); // Arquivo não é uma CTC válida
                    }
                } catch (error) {
                    console.warn(`Arquivo "${file.name}" não é um JSON válido e será ignorado.`, error);
                    resolve(null); // Falha ao parsear o JSON
                }
            };
            reader.onerror = () => {
                console.error(`Erro ao ler o arquivo "${file.name}".`);
                resolve(null); // Erro de leitura
            };
            reader.readAsText(file);
        });
    });

    // Quando todas as leituras de arquivo terminarem...
    Promise.all(promises).then(resultados => {
        // Filtra para pegar apenas os arquivos que foram lidos com sucesso
        const ctcsValidas = resultados.filter(dados => dados !== null);

        if (ctcsValidas.length === 0) {
            ui.showToast("Nenhum arquivo de CTC válido foi encontrado para importar.", false);
            return;
        }

        // Adiciona cada CTC válida ao início da lista do histórico
        ctcsValidas.forEach(dados => {
            const nomeCTC = `CTC de ${dados.nomeServidor || 'Importada'}`;
            const novaEntradaCTC = {
                id: crypto.randomUUID(),
                nome: nomeCTC,
                dados: dados, // O objeto 'dados' aqui é o conteúdo do arquivo JSON
                data: new Date().toISOString()
            };
            ctcsSalvas.unshift(novaEntradaCTC);
        });

        // Salva a lista atualizada de volta no localStorage
        localStorage.setItem(ctcsKey, JSON.stringify(ctcsSalvas));
        
        // Atualiza a interface do usuário
        listarCTCsSalvas(); // Atualiza a lista de CTCs no painel
        atualizarIndicadoresDashboard(); // Atualiza os KPIs (contadores)
        
        ui.showToast(`${ctcsValidas.length} de ${files.length} CTCs foram importadas para o histórico!`, true);
    });

    // Limpa o input para permitir carregar os mesmos arquivos novamente
    event.target.value = '';
}

function salvarCTCLocal() {
    const nomeServidor = document.getElementById('ctc-nomeServidor').value.trim();
    if (!nomeServidor) {
        ui.showToast("Preencha o nome do servidor para salvar o arquivo.", false);
        return;
    }
    
    const nomeArquivo = `CTC_${nomeServidor.replace(/[^a-z0-9]/gi, '_')}`;
    const dados = coletarDadosCTC();

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomeArquivo}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.showToast("CTC salva no seu computador!", true);
}

function listarCTCsSalvas() {
    const l = document.getElementById("listaCTCsSalvas"); if (!l) return; l.innerHTML = "";
    if (!AppState.usuarioAtual) { l.innerHTML = "<li>Faça login para ver suas CTCs.</li>"; return; }
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`, tC = JSON.parse(localStorage.getItem(ch) || "[]").sort((a,b) => new Date(b.data) - new Date(a.data));
    if (tC.length === 0) l.innerHTML = "<li>Nenhuma CTC salva.</li>";
    else tC.forEach(c => {
        const li = document.createElement("li"), dF = new Date(c.data || Date.now()).toLocaleString('pt-BR'), nS = c.dados.nomeServidor || 'Não informado';
        li.innerHTML = `<div class="item-info"><span>${c.nome}</span><small>${nS} - ${dF}</small></div><div class="item-actions"><button onclick="carregarCTC('${c.id}')" title="Carregar"><i class="ri-folder-open-line"></i></button><button class="danger btn-tabela" onclick="excluirCTC('${c.id}')" title="Excluir"><i class="ri-delete-bin-line"></i></button></div>`;
        l.appendChild(li);
    });
}

function carregarCTC(id) {
    if (!AppState.usuarioAtual) return;
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`, cs = JSON.parse(localStorage.getItem(ch) || "[]");
    const cE = cs.find(c => c.id === id); if (!cE) return ui.showToast("Erro: CTC não encontrada.", false);
    handleNavClick(null, 'geradorCTC');
    setTimeout(() => {
        const d = cE.dados;
        Object.keys(d).forEach(k => { const el = document.getElementById(`ctc-${k}`); if (el) el.value = d[k] || ''; });
        const t = document.getElementById('corpo-tabela-periodos-ctc'); t.innerHTML = '';
        if (d.periodos) d.periodos.forEach(p => adicionarLinhaPeriodoCTC(p.inicio, p.fim, p.regime, p.deducoes, p.fonte));
        calcularTempoTotalCTC(); ui.showToast(`CTC "${cE.nome}" carregada.`, true);
    }, 100);
}

function excluirCTC(id) {
    if (!AppState.usuarioAtual) return;
    const ch = `ctcs_salvas_${AppState.usuarioAtual.uid}`, cs = JSON.parse(localStorage.getItem(ch) || "[]");
    const nDC = cs.find(c => c.id === id)?.nome || "CTC";
    if (!confirm(`Excluir CTC "${nDC}"?`)) return;
    localStorage.setItem(ch, JSON.stringify(cs.filter(c => c.id !== id)));
    listarCTCsSalvas(); ui.showToast("CTC excluída.", true); atualizarIndicadoresDashboard();
}

function limparFormularioCTC() {
    document.querySelectorAll('#geradorCTC input,#geradorCTC select').forEach(i => i.value = '');
    document.getElementById('corpo-tabela-periodos-ctc').innerHTML = '';
    document.getElementById('ctc-cpf-status').textContent = '';
    document.getElementById('ctc-cpf').style.borderColor = 'var(--cor-borda)';
    calcularTempoTotalCTC();
}

function adicionarLinhaPeriodoCTC(i = '', f = '', regime = 'RGPS', faltas = '0', licencas = '0', outros = '0', fo = '') {
    const t = document.getElementById('corpo-tabela-periodos-ctc'), l = document.createElement('tr');
    // ALTERADO: A estrutura da linha agora inclui os campos faltas, licencas e outros.
    l.innerHTML = `
        <td><input type="date" class="ctc-inicio" onchange="calcularTempoTotalCTC()" value="${i}"></td>
        <td><input type="date" class="ctc-fim" onchange="calcularTempoTotalCTC()" value="${f}"></td>
        <td>
            <select class="ctc-regime">
                <option value="RGPS" ${regime === 'RGPS' ? 'selected' : ''}>RGPS</option>
                <option value="RPPS" ${regime === 'RPPS' ? 'selected' : ''}>RPPS</option>
            </select>
        </td>
        <td><input type="number" class="ctc-faltas" value="${faltas}" oninput="calcularTempoTotalCTC()"></td>
        <td><input type="number" class="ctc-licencas" value="${licencas}" oninput="calcularTempoTotalCTC()"></td>
        <td><input type="number" class="ctc-outros" value="${outros}" oninput="calcularTempoTotalCTC()"></td>
        <td><input type="text" class="ctc-fonte" value="${fo}" placeholder="Ex: MUNICÍPIO DE ITAPIPOCA"></td>
        <td><button class="danger btn-tabela" onclick="removerLinhaPeriodoCTC(this)">Remover</button></td>`;
    t.appendChild(l); 
    
    const accordionContent = document.querySelector('#geradorCTC .accordion-content');
    if (accordionContent && accordionContent.style.maxHeight) {
        accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
    }
    
    calcularTempoTotalCTC();
}

function removerLinhaPeriodoCTC(b) { 
    b.closest('tr').remove(); 
    
    const accordionContent = document.querySelector('#geradorCTC .accordion-content');
    if (accordionContent && accordionContent.style.maxHeight) {
        accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
    }
    
    calcularTempoTotalCTC(); 
}

function calcularTempoTotalCTC() {
    let tD = 0;
    document.querySelectorAll("#corpo-tabela-periodos-ctc tr").forEach(linha => {
        const i = linha.querySelector('.ctc-inicio').value, 
              f = linha.querySelector('.ctc-fim').value;
        
        // NOVO: Captura os valores dos 3 novos campos
        const faltas = parseInt(linha.querySelector('.ctc-faltas').value) || 0;
        const licencas = parseInt(linha.querySelector('.ctc-licencas').value) || 0;
        const outros = parseInt(linha.querySelector('.ctc-outros').value) || 0;
        const totalDeducoes = faltas + licencas + outros;

        if (i && f) {
            const inicio = new Date(i + 'T00:00:00Z'), fim = new Date(f + 'T00:00:00Z');
            if (fim >= inicio) {
                // ALTERADO: Usa o totalDeducoes no cálculo
                tD += (Math.ceil(Math.abs(fim - inicio) / 86400000) + 1 - totalDeducoes);
            }
        }
    });
    const { anos, meses, dias } = diasParaAnosMesesDias(tD);
    document.getElementById('total-tempo-ctc').innerHTML = `Total: <b>${tD}</b> dias<br><small>(${anos}a, ${meses}m, ${dias}d)</small>`;
    return tD;
}

// CÓDIGO NOVO (CORRIGIDO)
function diasParaAnosMesesDias(totalDias) {
    if (isNaN(totalDias) || totalDias < 0) {
        return { anos: 0, meses: 0, dias: 0 };
    }
    
    // Usa uma lógica mais estável com números inteiros
    let diasRestantes = Math.floor(totalDias);
    
    const anos = Math.floor(diasRestantes / 365);
    diasRestantes = diasRestantes % 365;
    
    const meses = Math.floor(diasRestantes / 30);
    diasRestantes = diasRestantes % 30;
    
    return { anos: anos, meses: meses, dias: diasRestantes };
}

function exportarTudoZIP(b) {
    ui.toggleSpinner(b, true);
    setTimeout(() => {
        try {
            const z = new JSZip(), d = coletarDadosSimulacao(), nB = (d.passo1.nomeServidor || "simulacao").replace(/\s+/g, '_');
            z.file(`${nB}.json`, JSON.stringify(d, null, 2));
            let c = "MES_ANO;FATOR;SALARIO\n";
            d.tabela.forEach(l => c += `${l[0]};${l[1]};${l[2]}\n`);
            z.file(`${nB}-salarios.csv`, c);
            z.file(`${nB}-relatorio.html`, getPrintableHTML());
            z.generateAsync({ type: "blob" }).then(ct => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(ct); a.download = `${nB}-pack.zip`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                ui.showToast("Arquivo ZIP exportado!", true);
            });
        } catch (e) { ui.showToast("Erro ao exportar ZIP.", false); console.error(e); } finally { ui.toggleSpinner(b, false); }
    }, 50);
}

function calcularTempoEntreDatas() {
    const dataInicioStr = document.getElementById('calc-data-inicio').value, dataFimStr = document.getElementById('calc-data-fim').value;
    const resultadoContainer = document.getElementById('resultado-calculo-tempo');
    if (!dataInicioStr || !dataFimStr) { resultadoContainer.innerHTML = `<p style="color:var(--cor-erro)">Preencha ambas as datas.</p>`; return; }
    const dataInicio = new Date(dataInicioStr + 'T00:00:00Z'), dataFim = new Date(dataFimStr + 'T00:00:00Z');
    if (dataFim < dataInicio) { resultadoContainer.innerHTML = `<p style="color:var(--cor-erro)">A data final não pode ser anterior à inicial.</p>`; return; }
    const totalDias = Math.ceil(Math.abs(dataFim - dataInicio) / 86400000) + 1;
    const { anos, meses, dias } = diasParaAnosMesesDias(totalDias);
    resultadoContainer.innerHTML = `<p style="margin:0;font-weight:bold;">Resultado:</p><p style="margin:5px 0 0;">Período: ${anos}a, ${meses}m e ${dias}d.</p><p style="margin:5px 0 0;">Total em dias: ${totalDias.toLocaleString('pt-BR')} dias.</p>`;
}

function limparCalculoTempo() {
    document.getElementById('calc-data-inicio').value = '';
    document.getElementById('calc-data-fim').value = '';
    document.getElementById('resultado-calculo-tempo').innerHTML = '';
}

async function buscarEPreencherFatores(button) {
    ui.toggleSpinner(button, true);
    try {
        const dataCalculoStr = document.getElementById('dataCalculo').value;
        if (!dataCalculoStr) throw new Error("Preencha a 'Data do Cálculo' primeiro.");
        const linhasTabela = document.querySelectorAll("#corpo-tabela tr");
        if (linhasTabela.length === 0) throw new Error("Adicione salários na tabela antes de atualizar.");
        
        const dataCalculo = new Date(dataCalculoStr + 'T00:00:00Z');
        let dataComp = new Date(dataCalculo.getUTCFullYear(), dataCalculo.getUTCMonth(), 1);
        dataComp.setUTCMonth(dataComp.getUTCMonth() - 1);
        const dataFinalAPI = `${new Date(dataComp.getFullYear(), dataComp.getMonth() + 1, 0).getDate()}/${dataComp.getMonth() + 1}/${dataComp.getFullYear()}`;
        
        const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/07/1994&dataFinal=${dataFinalAPI}`);
        if (!response.ok) throw new Error(`API do BCB respondeu com erro.`);
        
        const dadosApi = await response.json();
        const indicesMap = new Map(dadosApi.map(item => { const [d,m,a] = item.data.split('/'); return [`${a}${m}`, parseFloat(item.valor)]; }));
        const chaveFinal = `${dataComp.getFullYear()}${String(dataComp.getMonth() + 1).padStart(2, '0')}`;
        const indiceFinal = indicesMap.get(chaveFinal);
        if (!indiceFinal) throw new Error(`Índice para ${dataFinalAPI} não encontrado.`);

        linhasTabela.forEach(linha => {
            const inputMesAno = linha.querySelector("input[placeholder='MM/AAAA']"), inputFator = linha.querySelector(".fator");
            if (inputMesAno && inputFator && inputMesAno.value) {
                const [mes, ano] = inputMesAno.value.split('/');
                if (mes && ano) {
                    const indiceSalario = indicesMap.get(`${ano}${mes.padStart(2,'0')}`);
                    if(indiceSalario) {
                        const fator = indiceFinal / indiceSalario;
                        inputFator.value = (isNaN(fator) || fator <= 0) ? 1.0 : fator.toFixed(7);
                        atualizarSalarioLinha(inputFator);
                    }
                }
            }
        });
        ui.showToast("Fatores de atualização preenchidos!", true);
    } catch (error) { ui.showToast(error.message, false); console.error(error);
    } finally { ui.toggleSpinner(button, false); }
}

function adicionarPeriodoExterno(inicio = '', fim = '') {
    const dataInicioInput = document.getElementById('te-data-inicio'), dataFimInput = document.getElementById('te-data-fim');
    const dataInicioStr = inicio || dataInicioInput.value, dataFimStr = fim || dataFimInput.value;
    if (!dataInicioStr || !dataFimStr) return ui.showToast("Preencha a data de início e fim.", false);
    const dataInicio = new Date(dataInicioStr + 'T00:00:00Z'), dataFim = new Date(dataFimStr + 'T00:00:00Z');
    if (dataFim < dataInicio) return ui.showToast("A data final não pode ser anterior à inicial.", false);
    const totalDias = Math.ceil(Math.abs(dataFim - dataInicio) / 86400000) + 1;
    const newRow = document.getElementById('corpo-tabela-tempo-externo').insertRow();
    newRow.dataset.inicio = dataInicioStr; newRow.dataset.fim = dataFimStr;
    newRow.innerHTML = `<td>${formatarDataBR(dataInicioStr)}</td><td>${formatarDataBR(dataFimStr)}</td><td class="dias-periodo">${totalDias}</td><td><button class="danger btn-tabela" onclick="removerPeriodoExterno(this)">Excluir</button></td>`;
    dataInicioInput.value = ''; dataFimInput.value = '';
    atualizarTotalTempoExterno();
}

function removerPeriodoExterno(button) { button.closest('tr').remove(); atualizarTotalTempoExterno(); }

function atualizarTotalTempoExterno() {
    let totalDias = 0;
    document.querySelectorAll('#corpo-tabela-tempo-externo tr .dias-periodo').forEach(cell => totalDias += parseInt(cell.textContent) || 0);
    document.getElementById('total-tempo-externo').textContent = `Total de Dias: ${totalDias}`;
    document.getElementById('tempoExterno').value = totalDias;
}

function planejarAposentadoria(button) {
    ui.toggleSpinner(button, true);
    const resultadoDiv = document.getElementById('resultado-planner');
    resultadoDiv.innerHTML = `<p style="text-align:center;">Calculando novo cenário...</p>`;
    setTimeout(() => {
        try {
            const dadosBase = coletarDadosSimulacao();
            const dataFuturaStr = document.getElementById('planner-data-futura').value;
            const aumentoSalarial = parseFloat(document.getElementById('planner-aumento-salarial').value) || 0;
            const tempoAdicional = parseInt(document.getElementById('planner-tempo-adicional').value) || 0;
            if (!dataFuturaStr && aumentoSalarial === 0 && tempoAdicional === 0) throw new Error("Preencha ao menos um campo do planejador.");
            
            let dataRefCenario = dataFuturaStr ? new Date(dataFuturaStr + 'T00:00:00Z') : (new Date(dadosBase.passo1.dataCalculo + 'T00:00:00Z') || new Date());
            const mediaSalarialCenario = dadosBase.tabela.length > 0 ? dadosBase.tabela.reduce((acc, l) => acc + ((parseFloat(l[2])||0) * (1+aumentoSalarial/100)), 0) / dadosBase.tabela.length : 0;
            
            const dN = new Date(dadosBase.passo1.dataNascimento + 'T00:00:00Z'), dA = new Date(dadosBase.passo1.dataAdmissao + 'T00:00:00Z');
            const s = dadosBase.passo1.sexo, isMagisterio = dadosBase.passo1.isMagisterio === 'sim';
            const tED = (parseInt(dadosBase.passo1.tempoExterno) || 0) + tempoAdicional, tSD = parseInt(dadosBase.passo1.tempoEspecial) || 0;
            const iACenario = (dataRefCenario - dN) / 31557600000;
            const tCTCenario = (dataRefCenario - dA) / 31557600000 + tED / 365.25 + tSD / 365.25;

            // Lógica de projeção simplificada para brevidade. A lógica completa do seu sistema seria usada aqui.
            const redutorIdade = isMagisterio ? 5 : 0, redutorTempo = isMagisterio ? 5 : 0;
            let p = {}, elegivel = false;
            if (iACenario >= (s === 'M' ? 65 : 62) - redutorIdade && tCTCenario >= 25) {
                const vRG = mediaSalarialCenario * Math.min(1, 0.6 + Math.max(0, Math.floor(tCTCenario) - 20) * 0.02);
                p['Regra Permanente'] = { valor: vRG };
                elegivel = true;
            }

            let html = `<p><strong>Resultado do Cenário para ${dataRefCenario.toLocaleDateString('pt-BR')}:</strong></p>`;
            if (elegivel) {
                const melhorRegra = Object.entries(p).sort((a, b) => b[1].valor - a[1].valor)[0];
                html += `<p>A regra mais vantajosa seria <strong>${melhorRegra[0]}</strong>, com benefício de <strong>${formatarDinheiro(melhorRegra[1].valor)}</strong>.</p>`;
            } else {
                html += '<p>O servidor ainda não estaria elegível para as regras principais de aposentadoria.</p>';
            }
            resultadoDiv.innerHTML = html + `<small>Nota: Esta é uma projeção hipotética.</small>`;
        } catch (error) { resultadoDiv.innerHTML = `<p style="color:var(--cor-erro)">${error.message}</p>`; ui.showToast(error.message, false);
        } finally { ui.toggleSpinner(button, false); }
    }, 50);
}


// =================================================================================
// INÍCIO: NOVAS FUNÇÕES DO GERADOR DE DOCUMENTOS
// =================================================================================

function preencherDocumentosComDadosSimulacao() {
    try {
        // Coleta todos os dados do formulário de simulação
        const dadosColetados = coletarDadosSimulacao();
        const nome = dadosColetados.passo1.nomeServidor;

        if (!nome) {
            ui.showToast("Nenhum nome encontrado. Preencha os dados na tela de 'Nova Simulação' primeiro.", false);
            return;
        }

        // Armazena os dados coletados no estado global da aplicação
        AppState.dadosSimulacaoAtiva = dadosColetados;

        // Atualiza o campo de nome na tela para feedback visual
        document.getElementById('doc-nome-servidor').value = nome;
        ui.showToast("Dados da simulação carregados com sucesso!", true);

    } catch (e) {
        console.error("Erro ao buscar dados da simulação:", e);
        AppState.dadosSimulacaoAtiva = null; // Limpa em caso de erro
        ui.showToast("Falha ao buscar dados. Verifique o console.", false);
    }
}

function gerarRequerimentoAposentadoria() {
    const dadosSimulacao = coletarDadosSimulacao();
    const dadosServidor = dadosSimulacao.passo1 || {};
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Requerimento de Aposentadoria</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; color: #333; }
        .container { width: 210mm; margin: auto; padding: 2cm; }
        .header { text-align: center; }
        .header h3, .header p { margin: 2px 0; }
        h2 { text-align: center; font-weight: bold; margin: 40px 0; }
        .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td { padding: 4px; }
        label { display: block; margin-top: 5px; }
        input[type="text"] { border: none; border-bottom: 1px dotted #888; width: 100%; padding: 4px; box-sizing: border-box; font-family: inherit; font-size: inherit; }
        .checkbox-group label { display: block; margin-bottom: 8px; font-weight: normal; }
        .signature-block { margin-top: 80px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 60px; margin-left: auto; margin-right: auto; width: 80%;}
        .signature-block p { margin: 5px 0 0 0; font-size: 11pt; }
        .legal-notice { font-size: 10pt; text-align: justify; margin-top: 20px; } /* 🔥 corrigido */
        @media print { input[type="text"] { border-bottom: 1px solid #000; } }
    </style></head><body>
    <div class="container">
        <div class="header">
            <h3>ITAPREV</h3>
            <p>INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA</p>
        </div>
        <h2>REQUERIMENTO DE APOSENTADORIA</h2>
        
        <p>Eu, ${dadosServidor.nomeServidor || '__________________________________'}, com fundamento no direito de petição assegurado pelo Art. 5º, XXXIV, 'a', da Constituição Federal, e com base nas disposições da Lei Municipal nº 035/2022 e do Decreto Municipal nº 113/2022, venho, respeitosamente, requerer a concessão do benefício de Aposentadoria, na modalidade abaixo assinalada:</p>

        <div class="section-title">Dados do(a) Servidor(a)</div>
        <table>
            <tr><td colspan="3"><label>Nome Completo:<input type="text" value="${dadosServidor.nomeServidor || ''}"></label></td>
                <td colspan="1"><label>Matrícula:<input type="text" value="${dadosServidor.matriculaServidor || ''}"></label></td></tr>
            <tr><td colspan="2"><label>RG:<input type="text" value="${dadosServidor.rgServidor || ''}"></label></td>
                <td colspan="1"><label>CPF:<input type="text" value="${dadosServidor.cpfServidor || ''}"></label></td>
                <td colspan="1"><label>Data de Nascimento:<input type="text" value="${formatarDataBR(dadosServidor.dataNascimento) || ''}"></label></td></tr>
            <tr><td colspan="4"><label>Endereço Residencial:<input type="text" value="${dadosServidor.enderecoServidor || ''}"></label></td></tr>
            <tr><td colspan="2"><label>Telefone:<input type="text" value="${dadosServidor.telefoneServidor || ''}"></label></td>
                <td colspan="2"><label>E-mail:<input type="text" value="${dadosServidor.emailServidor || ''}"></label></td></tr>
        </table>
        
        <div class="section-title">Dados Funcionais</div>
         <table>
            <tr><td colspan="2"><label>Cargo:<input type="text" value="${dadosServidor.cargoServidor || ''}"></label></td>
                <td colspan="2"><label>Admissão:<input type="text" value="${formatarDataBR(dadosServidor.dataAdmissao) || ''}"></label></td></tr>
            <tr><td colspan="4"><label>Lotação:<input type="text" value="${dadosServidor.lotacaoServidor || ''}"></label></td></tr>
        </table>

        <div class="section-title">Modalidade de Aposentadoria Requerida</div>
        <div class="checkbox-group">
            <label><input type="checkbox"> Aposentadoria por Incapacidade Permanente</label>
            <label><input type="checkbox"> Aposentadoria Compulsória</label>
            <label><input type="checkbox"> Aposentadoria por Idade</label>
            <label><input type="checkbox"> Aposentadoria por Idade e Tempo de Contribuição</label>
            <label><input type="checkbox"> Aposentadoria Especial de Professor</label>
        </div>
        
        <p class="legal-notice">Declaro, sob as penas da lei, que as informações aqui prestadas são verdadeiras e que estou ciente de que a apresentação de informações falsas pode acarretar em sanções administrativas, cíveis e criminais.</p>

        <p style="text-align:left; margin-top: 40px;">Itapipoca - CE, ${dataAtual}.</p>
        
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>${dadosServidor.nomeServidor || 'Nome do(a) Requerente'}</p>
            <p>Assinatura do(a) Servidor(a)</p>
        </div>
    </div></body></html>`;
    
    const newWindow = window.open();
    newWindow.document.open();
    newWindow.document.write(htmlConteudo);
    newWindow.document.close();
}

function gerarDeclaracaoNaoPercepcao() {
    const dadosSimulacao = coletarDadosSimulacao();
    const dadosServidor = dadosSimulacao.passo1 || {};
    const configs = AppState.configuracoes || {};

    const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Declaração de Não Percepção</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; color: #333; }
        .container { width: 210mm; margin: auto; padding: 2cm; text-align: justify; }
        .header { text-align: center; }
        .header h3, .header p { margin: 2px 0; }
        h2 { text-align: center; font-weight: bold; margin: 40px 0; }
        .signature-block { margin-top: 80px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 60px; width: 80%; margin-left: auto; margin-right: auto;}
        .signature-block p { margin: 5px 0 0 0; }
    </style></head><body>
    <div class="container">
        <div class="header">
            <h3>ITAPREV</h3>
            <p>INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA</p>
        </div>
        <h2>DECLARAÇÃO DE NÃO PERCEPÇÃO (ITAPREV)</h2>
        <p>
            O Instituto de Previdência dos Servidores Municipais de Itapipoca - ITAPREV, declara para os
            devidos fins de direito e sob as penas da lei, junto ao Tribunal de Contas do Estado do Ceará -
            TCE-CE, que o(a) Sr.(a) <b>${dadosServidor.nomeServidor || '________________'}</b>, 
            portador(a) do RG nº <b>${dadosServidor.rgServidor || '________________'}</b>,
            CPF nº <b>${dadosServidor.cpfServidor || '________________'}</b> e
            matrícula nº <b>${dadosServidor.matriculaServidor || '________________'}</b>, 
            não recebe benefício previdenciário pago por este Instituto de Previdência Social do
            Município de Itapipoca-CE, até a presente data.
        </p>
        <p style="text-align:left; margin-top: 40px;">Itapipoca-CE, ${dataAtual}.</p>
        <div class="signature-block">
            <div class="signature-line"></div>
            <p><b>${configs.nomePresidente || 'NOME DO PRESIDENTE'}</b></p>
            <p>Presidente do ITAPREV</p>
        </div>
    </div></body></html>`;

    const newWindow = window.open();
    newWindow.document.open();
    newWindow.document.write(htmlConteudo);
    newWindow.document.close();
}

// =================================================================================
// FIM: NOVAS FUNÇÕES DO GERADOR DE DOCUMENTOS
// =================================================================================


// =================================================================================
// SCRIPT PARA CARREGAMENTO EM LOTE (Exemplo, se necessário)
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ... código de carregamento em lote pode ser colocado aqui se expandido
});

// =================================================================================
// INÍCIO: NOVOS DOCUMENTOS ADICIONAIS (SOLICITAÇÃO 2)
// =================================================================================

function gerarReqPensaoMorte() {
    const dadosSimulacao = coletarDadosSimulacao();
    const dadosInstituidor = dadosSimulacao.passo1 || {};
    const dadosDependentes = dadosSimulacao.dependentes || [];
    const requerenteData = dadosDependentes.length > 0 ? dadosDependentes[0] : {};
    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getDate()} de ${dataAtual.toLocaleDateString('pt-BR', { month: 'long' })} de ${dataAtual.getFullYear()}`;

    let dependentesTabelaHTML = '';
    if (dadosDependentes.length > 0) {
        dependentesTabelaHTML = dadosDependentes.map(dep => `
            <tr>
                <td>${dep.nome || ''}</td>
                <td>${dep.parentesco || ''}</td>
                <td>${formatarDataBR(dep.dataNasc) || ''}</td>
                <td>${dep.cpf || ''}</td>
            </tr>
        `).join('');
    } else {
        dependentesTabelaHTML = `
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
        `;
    }

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Requerimento de Pensão por Morte</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; }
        .container { width: 210mm; margin: auto; padding: 1.5cm; }
        .header { text-align: center; }
        .header h3 { margin-bottom: 20px; }
        h2 { text-align: center; font-weight: bold; margin: 30px 0; }
        .section-title { font-size: 12pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px;}
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid-span-2 { grid-column: span 2; }
        label { display: block; margin-bottom: 5px; }
        input[type="text"] { width: 100%; border: none; border-bottom: 1px dotted #888; padding: 4px; font-size: 11pt; box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; }
        .signature-block { margin-top: 50px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 60px; width: 80%; margin-left: auto; margin-right: auto;}
        .signature-block p { margin: 5px 0 0 0; }
        @media print { input { border: none !important; } }
    </style></head><body>
    <div class="container">
        <div class="header"><h3>REQUERIMENTO DE PENSÃO POR MORTE</h3></div>
        
        <div class="section-title">Dados do Requerente</div>
        <div class="form-grid">
            <div class="grid-span-2"><label>Nome Completo:<input type="text" value="${requerenteData.nome || ''}"></label></div>
            <div class="grid-span-2" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <label>RG:<input type="text" value="${requerenteData.rg || ''}"></label>
                <label>CPF:<input type="text" value="${requerenteData.cpf || ''}"></label>
                <label>Data de Nascimento:<input type="text" value="${formatarDataBR(requerenteData.dataNasc) || ''}"></label>
            </div>
            <div class="grid-span-2"><label>Endereço Residencial Atualizado:<input type="text" value="${requerenteData.endereco || ''}"></label></div>
            <div><label>Telefone:<input type="text" value="${requerenteData.telefone || ''}"></label></div>
            <div><label>E-mail:<input type="text"></label></div>
        </div>

        <div class="section-title">Dados do Instituidor (Servidor Falecido)</div>
        <div class="form-grid">
            <div class="grid-span-2"><label>Nome Completo:<input type="text" value="${dadosInstituidor.nomeServidor || ''}"></label></div>
            <div><label>Matrícula:<input type="text" value="${dadosInstituidor.matriculaServidor || ''}"></label></div>
            <div><label>Cargo/Lotação:<input type="text" value="${dadosInstituidor.cargoServidor || ''}"></label></div>
            <div><label>CPF:<input type="text" value="${dadosInstituidor.cpfServidor || ''}"></label></div>
            <div><label>Data do Óbito:<input type="text" value="${formatarDataBR(dadosInstituidor.dataObito) || ''}"></label></div>
        </div>

        <div class="section-title">Dados do(s) Dependente(s) Beneficiário(s)</div>
        <table>
            <thead><tr><th>Nome Completo</th><th>Parentesco</th><th>Data de Nasc.</th><th>CPF</th></tr></thead>
            <tbody>
                ${dependentesTabelaHTML}
            </tbody>
        </table>

        <p style="margin-top: 30px;">Vem, respeitosamente, requerer a concessão do benefício de Pensão por Morte, nos termos do Art. 40, §7º da Constituição Federal (com redação dada pela EC nº 103/2019) e da legislação municipal aplicável, na condição de dependente(s) do(a) ex-servidor(a) acima identificado(a).</p>
        <p>Itapipoca - CE, ${dataFormatada}.</p>
        
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>Assinatura do(a) Requerente</p>
        </div>
    </div></body></html>`;
    
    const newWindow = window.open();
    newWindow.document.open(); newWindow.document.write(htmlConteudo); newWindow.document.close();
}

function gerarDeclaracaoNaoAcumulacao() {
    const dadosSimulacao = coletarDadosSimulacao();
    const dadosServidor = dadosSimulacao.passo1 || {};
    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getDate()} de ${dataAtual.toLocaleDateString('pt-BR', { month: 'long' })} de ${dataAtual.getFullYear()}`;

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Declaração de Não Acumulação de Cargos</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; }
        .container { width: 210mm; margin: auto; padding: 2cm; text-align: justify; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h3, .header p { margin: 2px 0; }
        h2 { text-align: center; font-weight: bold; }
        .signature-block { margin-top: 80px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 60px; width: 80%; margin-left: auto; margin-right: auto;}
        .signature-block p { margin: 5px 0 0 0; }
    </style></head><body>
    <div class="container">
        <div class="header">
            <h3>ITAPREV</h3>
            <p>INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA</p>
        </div>
        <h2>DECLARAÇÃO DE NÃO ACUMULAÇÃO DE CARGOS</h2>
        <p>
            Eu, <b>${dadosServidor.nomeServidor || '_________________________'}</b>, portador(a) do RG nº <b>${dadosServidor.rgServidor || '________________'}</b> e inscrito(a) no CPF sob o nº <b>${dadosServidor.cpfServidor || '________________'}</b>, matrícula nº <b>${dadosServidor.matriculaServidor || '________________'}</b>, residente e domiciliado(a) em <b>${dadosServidor.enderecoServidor || '________________________________________'}</b>, declaro, para os devidos fins de direito, que não exerço acumulativamente nenhum outro cargo ou função pública, em conformidade com o princípio constitucional previsto no Art. 37, XVI e XVII, da Constituição da República Federativa do Brasil e em observância às normas estabelecidas no Estatuto dos Servidores Públicos do Município de Itapipoca. E por ser a expressão da verdade, firmo a presente para que surta seus efeitos legais.
        </p>
        <p style="margin-top: 40px;">Itapipoca - CE, ${dataFormatada}.</p>
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>${dadosServidor.nomeServidor || 'Nome do Declarante'}</p>
        </div>
    </div></body></html>`;

    const newWindow = window.open();
    newWindow.document.open(); newWindow.document.write(htmlConteudo); newWindow.document.close();
}

function gerarDeclaracaoNaoPercepcaoIndividual() {
    const dadosSimulacao = coletarDadosSimulacao();
    const dadosServidor = dadosSimulacao.passo1 || {};
    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getDate()} de ${dataAtual.toLocaleDateString('pt-BR', { month: 'long' })} de ${dataAtual.getFullYear()}`;

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Declaração de Não Percepção Individual</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; }
        .container { width: 210mm; margin: auto; padding: 2cm; text-align: justify; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h3, .header p { margin: 2px 0; }
        h2 { text-align: center; font-weight: bold; }
        .signature-block { margin-top: 80px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 60px; width: 80%; margin-left: auto; margin-right: auto;}
        .signature-block p { margin: 5px 0 0 0; }
    </style></head><body>
    <div class="container">
        <div class="header">
            <h3>ITAPREV</h3>
            <p>INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA</p>
        </div>
        <h2>DECLARAÇÃO</h2>
        <p>
            Eu, <b>${dadosServidor.nomeServidor || '________________'}</b>, 
            portador(a) do RG nº <b>${dadosServidor.rgServidor || '________________'}</b>, 
            inscrito(a) no CPF sob o n° <b>${dadosServidor.cpfServidor || '________________'}</b>,
            residente e domiciliado(a) em <b>${dadosServidor.enderecoServidor || '________________________________________'}</b>, 
            declaro para os devidos fins de direito e sob as penas da lei, que não recebo benefício previdenciário de nenhum outro Regime de Previdência, até a presente data.
        </p>
        <p style="margin-top: 40px;">Itapipoca - CE, ${dataFormatada}.</p>
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>${dadosServidor.nomeServidor || 'Nome do Declarante'}</p>
        </div>
    </div></body></html>`;
    
    const newWindow = window.open();
    newWindow.document.open(); newWindow.document.write(htmlConteudo); newWindow.document.close();
}

function gerarAutoDeclaracaoRenda() {
    // 1. Verifica se os dados da simulação foram carregados
    if (!AppState.dadosSimulacaoAtiva) {
        ui.showToast("Por favor, clique em 'Puxar Dados da Simulação' primeiro.", false);
        return;
    }

    // 2. Pega os dados do instituidor E da lista de dependentes
    const dadosInstituidor = AppState.dadosSimulacaoAtiva.passo1 || {};
    const dependentes = AppState.dadosSimulacaoAtiva.dependentes || [];
    const primeiroDependente = dependentes.length > 0 ? dependentes[0] : {}; // Pega o primeiro da lista

    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getDate()} de ${dataAtual.toLocaleDateString('pt-BR', { month: 'long' })} de ${dataAtual.getFullYear()}`;

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Autodeclaração de Renda</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; }
        .container { width: 210mm; margin: auto; padding: 2cm; text-align: justify; }
        h2 { text-align: center; font-weight: bold; margin-bottom: 40px; }
        p { text-indent: 50px; }
        .options { margin: 30px 0; padding-left: 50px; text-indent: 0;}
        .options label { display: block; margin-bottom: 15px; }
        .signature-block { margin-top: 80px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 60px; width: 80%; margin-left: auto; margin-right: auto;}
        .signature-block p { margin: 5px 0 0 0; }
    </style></head><body>
    <div class="container">
        <h2>AUTODECLARAÇÃO DE RENDA</h2>
        <p>
            Eu, <b>${primeiroDependente.nome || '[Nome do Dependente]'}</b>,
            portador(a) do RG N° <b>${primeiroDependente.rg || '[RG do Dependente]'}</b> e
            CPF N° <b>${primeiroDependente.cpf || '[CPF do Dependente]'}</b>,
            na qualidade de dependente de <b>${dadosInstituidor.nomeServidor || '________________'}</b>,
            CPF N° <b>${dadosInstituidor.cpfServidor || '________________'}</b>,
            ex-servidor(a) segurado(a) do Instituto de Previdência dos Servidores Municipais de Itapipoca - ITAPREV, DECLARO, para fins de comprovação de dependência econômica:
        </p>
        <div class="options">
            <label><input type="checkbox"> <b>NÃO POSSUO</b> renda formal de qualquer natureza.</label>
            <label><input type="checkbox"> <b>POSSUO</b> renda formal no valor mensal de R$ ______________, oriunda de __________________.</label>
        </div>
        <p>
             Declaro que as informações acima são a expressão da verdade, estando ciente das sanções cíveis, administrativas e criminais previstas em lei para o caso de falsidade.
        </p>
        <p>
            Comprometo-me, ainda, a informar ao ITAPREV qualquer alteração na minha condição de renda.
        </p>
        <p style="text-align:left; margin-top: 40px; text-indent: 0;">Itapipoca - CE, ${dataFormatada}.</p>
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>Assinatura do Declarante</p>
        </div>
    </div></body></html>`;

    const newWindow = window.open();
    newWindow.document.open();
    newWindow.document.write(htmlConteudo);
    newWindow.document.close();
}

function gerarDeclaracaoConvivioMarital() {
    // Verifica se os dados foram previamente carregados
    if (!AppState.dadosSimulacaoAtiva) {
        ui.showToast("Por favor, clique em 'Puxar Dados da Simulação' primeiro.", false);
        return;
    }
    const dadosInstituidor = AppState.dadosSimulacaoAtiva.passo1 || {};
    // ADICIONADO: Busca os dados dos dependentes da simulação
    const dependentes = AppState.dadosSimulacaoAtiva.dependentes || [];
    const declaranteData = dependentes.length > 0 ? dependentes[0] : {}; // Pega o primeiro dependente como o declarante

    const dataAtual = new Date();
    const dataFormatada = `${dataAtual.getDate()} de ${dataAtual.toLocaleDateString('pt-BR', { month: 'long' })} de ${dataAtual.getFullYear()}`;

    const htmlConteudo = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Declaração de Convívio Marital</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; }
        .container { width: 210mm; margin: auto; padding: 2cm; text-align: justify; }
        h2 { text-align: center; font-weight: bold; margin-bottom: 40px; }
        p { text-indent: 50px; }
        .signature-block { margin-top: 60px; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-top: 40px; width: 80%; margin-left: auto; margin-right: auto;}
        .signature-block p { margin: 5px 0 0 0; }
        .witness-section { margin-top: 80px; }
        .witness-title { font-weight: bold; text-align: center; margin-bottom: 20px; text-indent: 0; }
        .placeholder { font-weight: bold; font-style: italic; color: #555; }
    </style></head><body>
    <div class="container">
        <h2>DECLARAÇÃO DE CONVÍVIO MARITAL (UNIÃO ESTÁVEL)</h2>
        <p>
            Eu, <b>${declaranteData.nome || '[Nome do(a) Declarante]'}</b>,
            portador(a) do RG de N° <b>${declaranteData.rg || '[RG do(a) Declarante]'}</b> e
            CPF n° <b>${declaranteData.cpf || '[CPF do(a) Declarante]'}</b>,
            residente e domiciliado(a) à <b>${declaranteData.endereco || '[Endereço Completo]'}</b>,
            declaro expressamente, for todos os fins de direito e sob as penas do Art. 299 do Código Penal (Falsidade Ideológica), que mantinha união estável, pública, contínua e duradoura, com o objetivo de constituição de família, nos termos do Art. 1.723 do Código Civil, com
            <b>${dadosInstituidor.nomeServidor || '________________'}</b>,
            portador(a) do CPF n° <b>${dadosInstituidor.cpfServidor || '________________'}</b>,
            quando do seu falecimento em <b>${formatarDataBR(dadosInstituidor.dataObito) || '[Data do Falecimento]'}</b>.
        </p>
        <p>
            Declaro, ainda, inteira responsabilidade pelas informações contidas neste instrumento, estando ciente de que a omissão ou a apresentação de informações falsas implicará nas medidas administrativas, cíveis e criminais cabíveis.
        </p>
        <p style="text-align:left; margin-top: 40px; text-indent: 0;">Itapipoca - CE, ${dataFormatada}.</p>
        <div class="signature-block">
            <div class="signature-line"></div>
            <p><b>${declaranteData.nome || 'Assinatura do(a) Requerente'}</b></p>
        </div>

        <div class="witness-section">
            <p class="witness-title">TESTEMUNHAS</p>
            <div class="signature-block">
                <div class="signature-line"></div>
                <p>Nome: _________________________________________</p>
                <p>CPF: _________________________________________</p>
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <p>Nome: _________________________________________</p>
                <p>CPF: _________________________________________</p>
            </div>
        </div>
    </div></body></html>`;

    const newWindow = window.open();
    newWindow.document.open(); newWindow.document.write(htmlConteudo); newWindow.document.close();
}

// INÍCIO: NOVAS FUNÇÕES PARA CTC
function preencherCTCComDadosDaSimulacao() {
    const nomeSimulacao = document.getElementById('nomeServidor').value;
    if (!nomeSimulacao) return; // Não preenche se não houver dados

    const mapeamento = {
        'nomeServidor': 'ctc-nomeServidor',
        'matriculaServidor': 'ctc-matricula',
        'cpfServidor': 'ctc-cpf',
        'rgServidor': 'ctc-rg',
        'sexo': 'ctc-sexo',
        'dataNascimento': 'ctc-dataNascimento',
        'cargoServidor': 'ctc-cargo',
        'lotacaoServidor': 'ctc-lotacao',
        'dataAdmissao': 'ctc-dataAdmissao',
        'dataRequerimento': 'ctc-dataRequerimento'
    };

    for (const [idSimulacao, idCtc] of Object.entries(mapeamento)) {
        const elSimulacao = document.getElementById(idSimulacao);
        const elCtc = document.getElementById(idCtc);
        if (elSimulacao && elCtc) {
            elCtc.value = elSimulacao.value;
        }
    }
    ui.showToast("Dados do servidor preenchidos a partir da simulação.", true);
}

function exportarCTCExcel(button) {
    ui.toggleSpinner(button, true);
    setTimeout(() => {
        try {
            const data = [['INICIO', 'FIM', 'REGIME', 'DEDUCOES', 'FONTE']];
            document.querySelectorAll("#corpo-tabela-periodos-ctc tr").forEach(row => {
                const rowData = [
                    row.querySelector('.ctc-inicio').value,
                    row.querySelector('.ctc-fim').value,
                    row.querySelector('.ctc-regime').value,
                    row.querySelector('.ctc-deducoes').value,
                    row.querySelector('.ctc-fonte').value
                ];
                data.push(rowData);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "PeriodosCTC");
            XLSX.writeFile(wb, "periodos-ctc.xlsx");
            ui.showToast("Períodos da CTC exportados para Excel!", true);
        } catch (e) {
            ui.showToast("Erro ao exportar períodos da CTC.", false);
            console.error(e);
        } finally {
            ui.toggleSpinner(button, false);
        }
    }, 50);
}

/**
 * Converte uma data (seja um objeto Date ou uma string) para o formato ISO (AAAA-MM-DD).
 * @param {Date|string} dataInput A data a ser convertida.
 * @returns {string|null} A data no formato AAAA-MM-DD ou nulo se a entrada for inválida.
 */
// CÓDIGO CORRIGIDO

/**
 * Coleta todos os dados salvos no localStorage (servidores, simulações, CTCs)
 * e exporta como um único arquivo Excel com múltiplas planilhas.
 * @param {HTMLButtonElement} button O botão que acionou a função.
 */
function exportarBaseDeDadosCompleta(button) {
    if (!AppState.usuarioAtual) {
        return ui.showToast("Você precisa estar logado para exportar os dados.", false);
    }
    
    // Simula um "spinner" se o elemento for um card
    const originalContent = button.innerHTML;
    button.innerHTML += ' <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    button.style.pointerEvents = 'none';

    setTimeout(() => {
        try {
            const uid = AppState.usuarioAtual.uid;

            // 1. Coletar dados do localStorage
            const servidores = JSON.parse(localStorage.getItem('servidores_db') || "[]");
            const simulacoes = JSON.parse(localStorage.getItem(`historicoSimulacoes_${uid}`) || "[]");
            const ctcs = JSON.parse(localStorage.getItem(`ctcs_salvas_${uid}`) || "[]");

            // 2. Criar um novo Workbook Excel
            const wb = XLSX.utils.book_new();

            // 3. Adicionar Planilha de Servidores
            if (servidores.length > 0) {
                const wsServidores = XLSX.utils.json_to_sheet(servidores);
                XLSX.utils.book_append_sheet(wb, wsServidores, "Servidores Cadastrados");
            }

            // 4. Adicionar Planilha de Simulações (simplificada)
            if (simulacoes.length > 0) {
                const dadosSimulacoes = simulacoes.map(s => ({
                    id: s.id,
                    nome_simulacao: s.nome,
                    data_salva: s.data,
                    nome_servidor: s.dados?.passo1?.nomeServidor,
                    cpf_servidor: s.dados?.passo1?.cpfServidor,
                    tipo_beneficio: s.dados?.resultados?.tipo,
                    valor_beneficio: s.dados?.resultados?.valorBeneficioFinal
                }));
                const wsSimulacoes = XLSX.utils.json_to_sheet(dadosSimulacoes);
                XLSX.utils.book_append_sheet(wb, wsSimulacoes, "Historico de Simulacoes");
            }

            // 5. Adicionar Planilha de CTCs (simplificada)
            if (ctcs.length > 0) {
                const dadosCtcs = ctcs.map(c => ({
                    id: c.id,
                    nome_ctc: c.nome,
                    data_salva: c.data,
                    nome_servidor: c.dados?.nomeServidor,
                    cpf_servidor: c.dados?.cpf,
                    total_periodos: c.dados?.periodos?.length || 0
                }));
                const wsCtcs = XLSX.utils.json_to_sheet(dadosCtcs);
                XLSX.utils.book_append_sheet(wb, wsCtcs, "Historico de CTCs");
            }

            // 6. Gerar e baixar o arquivo
            if (wb.SheetNames.length === 0) {
                 throw new Error("Nenhum dado encontrado para exportar.");
            }

            XLSX.writeFile(wb, `PREVTECH_Backup_Dados_${new Date().toISOString().slice(0,10)}.xlsx`);
            ui.showToast("Base de dados exportada com sucesso!", true);

        } catch (error) {
            console.error("Erro ao exportar base de dados:", error);
            ui.showToast(error.message || "Falha ao exportar os dados.", false);
        } finally {
            // Restaura o estado do botão
            button.innerHTML = originalContent;
            button.style.pointerEvents = 'auto';
        }
    }, 200);
}

// FIM DO CÓDIGO

function converterDataParaISO(dataInput) {
    // ... (outras partes da função)

    if (typeof dataInput === 'string') {
        // ...
        
        const partes = dataInput.split('/');
        if (partes.length === 3) {
            // ✅ CORREÇÃO: A ordem foi alterada para mes, dia, ano
            let [mes, dia, ano] = partes; 
            
            // ### INÍCIO DA NOVA LÓGICA ###
            // Se o ano tiver 1 ou 2 dígitos, converte para 4 dígitos.
            if (ano.length <= 2) {
                const anoNumerico = parseInt(ano, 10);
                // Se o ano for menor que 50 (ex: 01, 24, 49), assume-se que é do século 21 (20xx).
                // Se for 50 ou maior (ex: 98, 85, 70), assume-se que é do século 20 (19xx).
                ano = (anoNumerico < 50 ? '20' : '19') + String(anoNumerico).padStart(2, '0');
            }
            // ### FIM DA NOVA LÓGICA ###

            // Continua com a validação, agora com o ano já corrigido para 4 dígitos.
            if (dia && mes && ano && ano.length === 4) {
                return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            }
        }
    }
    
    return null;
}

function importarCTCExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false });

            document.getElementById('corpo-tabela-periodos-ctc').innerHTML = ''; // Limpa a tabela

            for (let i = 1; i < rows.length; i++) {
                if (rows[i].length === 0 || rows[i].every(cell => cell === "")) {
                    continue; // Pula linhas em branco
                }
                
                const [inicio, fim, regime, deducoes, fonte] = rows[i];
                
                const inicioISO = converterDataParaISO(inicio);
                const fimISO = converterDataParaISO(fim);

                if (inicioISO && fimISO) {
                    adicionarLinhaPeriodoCTC(inicioISO, fimISO, regime || 'RGPS', deducoes || '0', fonte || '');
                } else {
                    console.warn(`Linha ${i + 1} do Excel ignorada por conter datas inválidas:`, rows[i]);
                }
            }

            ui.showToast("Períodos da CTC importados com sucesso!", true);
            calcularTempoTotalCTC(); // Recalcula o total de dias automaticamente.

        } catch (err) {
            ui.showToast("Erro ao processar o arquivo Excel da CTC.", false);
            console.error(err);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// FIM: NOVAS FUNÇÕES PARA CTC

Object.assign(window, {
    auth, ui, handleNavClick, atualizarDashboardView, irParaPasso, alternarCamposBeneficio,
    adicionarLinha, limparTabela, exportarExcel, importarExcel, atualizarSalarioLinha, excluirLinha,
    calcularBeneficio, adicionarLinhaProvento,
    calculateTotalProventos, excluirLinhaProvento,
    adicionarLinhaDependente, removerLinhaDependente, salvarSimulacaoHistorico, imprimirSimulacao,
    exportarTudoZIP, gerarAtoDeAposentadoria, gerarAtoDePensao, carregarDoHistorico, excluirDoHistorico,
    adicionarLinhaPeriodoCTC, calcularTempoTotalCTC, removerLinhaPeriodoCTC, salvarCTC, gerarDocumentoCTC,
    carregarCTC, excluirCTC, alternarTema,
    salvarConfiguracoes, openTimeCalcModal, closeTimeCalcModal,
    calcularTempoEntreDatas, limparCalculoTempo,
    buscarEPreencherFatores,
    adicionarPeriodoExterno, removerPeriodoExterno,
    planejarAposentadoria,
    generatePdf,
    preencherChecklistComDadosDaSimulacao,
    preencherDocumentosComDadosSimulacao,
    gerarRequerimentoAposentadoria,
    gerarDeclaracaoNaoPercepcao,
    gerarReqPensaoMorte,
    gerarDeclaracaoNaoAcumulacao,
    gerarDeclaracaoNaoPercepcaoIndividual,
    gerarAutoDeclaracaoRenda,
    gerarDeclaracaoConvivioMarital,
    cadastro,
    // Novas funções da CTC expostas globalmente
    exportarCTCExcel, importarCTCExcel, 
    salvarCTCLocal, gestaoProcessos,
    extratorFichas, carregarCTCLocal,
    exportarBaseDeDadosCompleta
});

window.simulacao = simulacao;

/* --- CÓDIGO DA IA PREVTECH (VERSÃO GOOGLE GEMINI FREE ATUALIZADA) --- */

// 1. Sua Chave do Gemini
const GEMINI_API_KEY = "AIzaSyCMw6q9UdqCg2NwHgtK3H7IgP-wpvM3-x8";

// 2. Função Global para Abrir/Fechar Chat
window.toggleChat = function() {
    const chatWindow = document.getElementById('ia-chat-window');
    if (!chatWindow) return;
    
    chatWindow.classList.toggle('hidden');
    
    if (!chatWindow.classList.contains('hidden')) {
        setTimeout(() => {
            const input = document.getElementById('user-input');
            if(input) input.focus();
        }, 100);
    }
};

// 3. Detectar Tecla Enter
window.handleEnter = function(event) {
    if (event.key === 'Enter') {
        window.sendMessage();
    }
};

// 4. Envio de Mensagem para Gemini com Tratamento de Segurança
window.sendMessage = async function() {
    const inputField = document.getElementById('user-input');
    const chatBody = document.getElementById('chat-body');

    if (!inputField || !chatBody) return;

    const message = inputField.value.trim();
    if (message === "") return;

    appendMessage(message, 'user-message');
    inputField.value = ""; 
    chatBody.scrollTop = chatBody.scrollHeight;

    const loadingId = "loading-" + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.innerText = 'Buscando base legal...';
    loadingDiv.id = loadingId;
    chatBody.appendChild(loadingDiv);

    try {
        // Alterado para v1 (estável) e simplificada a estrutura
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Você é o assistente do sistema PREVTECH, especialista em RPPS brasileiro. Responda de forma técnica e clara sobre: ${message}` }]
                }]
            })
        });

        const data = await response.json();
        const loading = document.getElementById(loadingId);
        if(loading) loading.remove();

        if (data.error) {
            // Se o erro de "not found" persistir, tentaremos uma rota alternativa automática
            console.error("Erro retornado:", data.error);
            appendMessage(`Erro técnico: ${data.error.message}`, "bot-message");
            return;
        }

        if (data.candidates && data.candidates[0].content) {
            let textoOuput = data.candidates[0].content.parts[0].text;
            
            // Formatação básica de negrito e quebra de linha
            textoOuput = textoOuput.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            textoOuput = textoOuput.replace(/\n/g, '<br>');
            
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message bot-message';
            msgDiv.innerHTML = textoOuput;
            chatBody.appendChild(msgDiv);
        } else {
            appendMessage("IA temporariamente indisponível. Tente novamente em instantes.", "bot-message");
        }

    } catch (error) {
        console.error("Erro de conexão:", error);
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        appendMessage("Erro de rede. Verifique sua conexão.", "bot-message");
    }
    
    chatBody.scrollTop = chatBody.scrollHeight;
};

// Função para renderizar mensagens com HTML (para negrito e quebras de linha)
function renderBotMessage(html) {
    const chatBody = document.getElementById('chat-body');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = html;
    chatBody.appendChild(messageDiv);
}

// Função Auxiliar de Renderização Simples
function appendMessage(text, className) {
    const chatBody = document.getElementById('chat-body');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.innerText = text;
    chatBody.appendChild(messageDiv);
}

console.log("IA Gemini v1.5 Flash carregada no PREVTECH!");






























































