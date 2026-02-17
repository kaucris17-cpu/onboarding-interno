/**
 * Provider simulado para futura integração com assistente externo.
 * Hoje: responde com base em regras simples.
 *
 * TODO(API): trocar por chamada real:
 *   const res = await fetch("/api/assistant", { method:"POST", body: JSON.stringify({prompt, context}) })
 *   return await res.json()
 */
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

export const AssistantProvider = {
  async sendMessage({ prompt, context }){
    await sleep(450);

    const p = (prompt || "").toLowerCase();
    if(p.includes("senha")) return { text: "Para reset de senha: abrir o login, clicar em Recuperar, gerar o token e redefinir. Em produção, isso será via e-mail e token expira." };
    if(p.includes("trilha") || p.includes("onboarding")) return { text: "A trilha obrigatória depende de unidade, setor e cargo. Concluir os itens obrigatórios libera a avaliação final automaticamente." };
    if(p.includes("cs") || p.includes("atendimento")) return { text: "No CS, prioridade costuma ser base de conhecimento, tom de voz e processos de tratativa. Recomenda-se completar os materiais obrigatórios antes de iniciar tickets complexos." };
    if(p.includes("cadastro")) return { text: "Em Cadastro, foco em padrões, validações, qualidade e prazos. Concluir os materiais obrigatórios antes de operar em volume reduz retrabalho." };

    const unit = context?.user?.unit ? ` (${context.user.unit})` : "";
    return { text: `Mensagem recebida${unit}. Este chat está pronto para integrar uma API externa e registrar histórico por usuário.` };
  }
};