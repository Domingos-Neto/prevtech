// =================================================================================
// MÓDULO DE AUTENTICAção E CONFIGURAÇÃO (Firebase)
// =================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
const cadastro = {
    DB_KEY: 'servidores_db', // Chave para o localStorage

    // Carrega os servidores do localStorage
    getServidores: () => {
        return JSON.parse(localStorage.getItem(cadastro.DB_KEY) || '[]');
    },

    // Salva a lista de servidores no localStorage
    saveServidores: (servidores) => {
        localStorage.setItem(cadastro.DB_KEY, JSON.stringify(servidores));
    },

    // Renderiza a tabela de servidores na tela
    renderTabela: () => {
        const servidores = cadastro.getServidores();
        const corpoTabela = document.getElementById('corpoTabelaServidores');
        const msgNenhum = document.getElementById('nenhumServidor');
        corpoTabela.innerHTML = '';

        if (servidores.length === 0) {
            msgNenhum.style.display = 'block';
            return;
        }
        msgNenhum.style.display = 'none';

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
    },

    // Abre o modal para adicionar ou editar
    abrirModal: () => {
        document.getElementById('formServidor').reset();
        document.getElementById('servidorId').value = '';
        document.getElementById('modalTituloServidor').innerText = 'Adicionar Novo Servidor';
        const modal = document.getElementById('modalServidor');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    },

    // Fecha o modal
    fecharModal: () => {
        const modal = document.getElementById('modalServidor');
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    },

    // Salva um servidor novo ou atualiza um existente
    salvarServidor: (event) => {
        event.preventDefault();
        const id = document.getElementById('servidorId').value;
        const servidores = cadastro.getServidores();

        const servidorData = {
            id: id || crypto.randomUUID(),
            nomeServidor: document.getElementById('form-nomeServidor').value,
            matriculaServidor: document.getElementById('form-matriculaServidor').value,
            cpfServidor: document.getElementById('form-cpfServidor').value,
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

        if (id) { // Editando
            const index = servidores.findIndex(s => s.id === id);
            servidores[index] = servidorData;
        } else { // Adicionando
            servidores.unshift(servidorData);
        }

        cadastro.saveServidores(servidores);
        cadastro.renderTabela();
        cadastro.fecharModal();
        ui.showToast(`Servidor ${id ? 'atualizado' : 'salvo'} com sucesso!`, true);
    },

    // Preenche o modal com dados de um servidor para edição
    editarServidor: (id) => {
        const servidores = cadastro.getServidores();
        const servidor = servidores.find(s => s.id === id);
        if (!servidor) return;

        cadastro.abrirModal();
        document.getElementById('modalTituloServidor').innerText = 'Editar Servidor';
        document.getElementById('servidorId').value = servidor.id;
        
        // Preenche o formulário
        for (const key in servidor) {
            const el = document.getElementById(`form-${key}`);
            if (el) el.value = servidor[key];
        }
    },

    // Deleta um servidor
    deletarServidor: (id) => {
        if (!confirm('Tem certeza que deseja excluir este servidor? Esta ação não pode ser desfeita.')) return;
        let servidores = cadastro.getServidores();
        servidores = servidores.filter(s => s.id !== id);
        cadastro.saveServidores(servidores);
        cadastro.renderTabela();
        ui.showToast('Servidor excluído.', true);
    },

    // Filtra a tabela de servidores
    filtrarServidores: () => {
        const filtro = document.getElementById('buscaServidor').value.toLowerCase();
        const linhas = document.querySelectorAll('#corpoTabelaServidores tr');
        linhas.forEach(linha => {
            const textoLinha = linha.innerText.toLowerCase();
            linha.style.display = textoLinha.includes(filtro) ? '' : 'none';
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
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dados = JSON.parse(e.target.result);
        simulacao.restaurarDados(dados);
      } catch (error) {
        console.error("Erro ao ler o arquivo JSON:", error);
        ui.showToast("Erro ao carregar o arquivo. Verifique se é um JSON válido.", false);
      } finally {
          event.target.value = ''; // Limpa o input para permitir carregar o mesmo arquivo novamente
      }
    };
    reader.onerror = () => {
        ui.showToast("Não foi possível ler o arquivo selecionado.", false);
        event.target.value = '';
    };
    reader.readAsText(file);
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
        enderecoServidor: 'enderecoServidor',
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
    salvarCTCLocal, gestaoProcessos
});

window.simulacao = simulacao;
