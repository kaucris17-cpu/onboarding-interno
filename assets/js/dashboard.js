import { requireAuthOrRedirect, renderShell } from "./ui.js";
import { Roles } from "./roles.js";
import { Content } from "./content.js";
import { Progress } from "./progress.js";
import { Quizzes } from "./quizzes.js";
import { DataStore } from "./apiAdapter.js";
import { renderAssistant } from "./assistant.js";
import { APP } from "./appConfig.js";

function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === "class") n.className = v;
    else if(k === "text") n.textContent = v;
    else if(k === "html") n.innerHTML = v;
    else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for(const c of children) n.appendChild(c);
  return n;
}

function tabButton(label, key, state, onChange){
  const b = el("button", { class:`tab ${state.activeTab === key ? "active" : ""}`, type:"button", text:label, onclick: () => onChange(key) });
  return b;
}

function renderKpis(host, user){
  const stats = Progress.getTrackStats(user);
  const pending = Quizzes.pendingEvaluations(user);

  const kpis = el("div", { class:"kpis" }, [
    el("div", { class:"kpi" }, [
      el("div", { class:"label", text:"Progresso da trilha" }),
      el("div", { class:"value", text:`${stats.percent}%` }),
      el("div", { class:"progressbar" }, [ el("div", { style:`width:${stats.percent}%` }) ])
    ]),
    el("div", { class:"kpi" }, [
      el("div", { class:"label", text:"Obrigatórios concluídos" }),
      el("div", { class:"value", text:`${stats.done}/${stats.total}` }),
      el("div", { class:"small", text: stats.total ? "Completar 100% libera avaliação final." : "Nenhum item obrigatório configurado para este perfil." })
    ]),
    el("div", { class:"kpi" }, [
      el("div", { class:"label", text:"Avaliações pendentes" }),
      el("div", { class:"value", text:`${pending.length}` }),
      el("div", { class:"small", text: pending.length ? "Abrir aba Avaliações." : "Nada pendente no momento." })
    ])
  ]);

  host.appendChild(kpis);
}

function renderDashboardHome(host, user){
  host.innerHTML = "";

  const stats = Progress.getTrackStats(user);
  const next = Progress.nextMandatory(user, 6);
  const pending = Quizzes.pendingEvaluations(user);

  const left = el("div", { class:"card" }, [
    el("h2", { text:"Resumo" }),
    el("p", { text:"Prioriza itens obrigatórios e libera avaliações automaticamente." })
  ]);
  renderKpis(left, user);

  const nextCard = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Próximos obrigatórios" }),
    el("p", { text: next.length ? "A sequência respeita a ordem configurada na trilha." : "Nenhum item pendente." })
  ]);

  const table = el("table", { class:"table" });
  table.appendChild(el("thead", {}, [ el("tr", {}, [
    el("th", { text:"Ordem" }),
    el("th", { text:"Título" }),
    el("th", { text:"Tipo" }),
    el("th", { text:"Tempo" }),
    el("th", { text:"Ação" })
  ]) ]));
  const tbody = el("tbody");
  for(const c of next){
    const btn = el("button", { class:"btn", type:"button", text:"Abrir", onclick: () => {
      window.location.hash = "#onboarding";
      window.dispatchEvent(new Event("hashchange"));
      window.__dashSelectContentId = c.id;
    }});
    tbody.appendChild(el("tr", {}, [
      el("td", { text: String(c.orderInTrack ?? "") }),
      el("td", { text: c.title }),
      el("td", { text: c.type }),
      el("td", { text: c.estimatedTime }),
      el("td", {}, [ btn ])
    ]));
  }
  table.appendChild(tbody);
  nextCard.appendChild(table);

  const right = el("div", { class:"card" }, [
    el("h2", { text:"Avisos e pendências" }),
    el("p", { text:"Centraliza recados e avaliações a fazer." })
  ]);

  const notices = el("div", { class:"notice" }, [
    el("div", { class:"small", html: `<b>Perfil</b>: ${user.unit || "Sem unidade"} • ${user.sector || "Sem setor"} • ${user.jobTitle || "Sem cargo"}` }),
    el("div", { class:"small", html: `<b>Trilha</b>: ${stats.total} item(ns) obrigatório(s).` })
  ]);
  right.appendChild(notices);

  const pendingBox = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Avaliações pendentes" }),
    el("p", { text: pending.length ? "Pendências calculadas por progresso e recorrência." : "Nenhuma pendência no momento." })
  ]);

  if(pending.length){
    const ul = el("div", {});
    for(const p of pending){
      ul.appendChild(el("div", { class:"notice", style:"margin-top:10px" }, [
        el("div", { html: `<b>${p.quiz.title}</b>` }),
        el("div", { class:"small", text: p.reason === "final_liberado" ? "Final liberado" : "Periódica vencida" })
      ]));
    }
    pendingBox.appendChild(ul);
  }

  right.appendChild(pendingBox);

  const grid = el("div", { class:"grid" }, [
    el("div", {}, [ left, nextCard ]),
    el("div", {}, [ right ])
  ]);

  host.appendChild(grid);
}

function renderOnboarding(host, user){
  host.innerHTML = "";

  const state = { filterType:"", tagQuery:"", selectedId: null, startedAt: null };

  const track = Content.listMandatoryTrackForUser(user);
  const stats = Progress.getTrackStats(user);

  const header = el("div", { class:"card" }, [
    el("h2", { text:"Onboarding" }),
    el("p", { text:"Lista ordenada dos materiais obrigatórios do cargo, com tracking e conclusão." })
  ]);

  const top = el("div", { class:"row" });

  const typeSel = el("select", {}, [
    el("option", { value:"", text:"Todos os tipos" }),
    ...APP.enums.contentTypes.map(t => el("option", { value:t, text:t }))
  ]);
  const tagInput = el("input", { class:"input", placeholder:"Filtrar por tags..." });

  top.appendChild(typeSel);
  top.appendChild(tagInput);

  header.appendChild(top);

  const kpi = el("div", { class:"notice", html: `<b>Progresso:</b> ${stats.done}/${stats.total} (${stats.percent}%)` });
  header.appendChild(kpi);

  const grid = el("div", { class:"grid" });

  const listCard = el("div", { class:"card" }, [
    el("h3", { text:"Materiais" }),
    el("p", { text:"Selecionar um item para visualizar detalhes e marcar como concluído." })
  ]);

  const detailCard = el("div", { class:"card" }, [
    el("h3", { text:"Detalhes" }),
    el("p", { text:"Selecionar um material para exibir conteúdo." })
  ]);

  function renderList(){
    const filtered = Content.search(track, { type: typeSel.value, tagQuery: tagInput.value.trim() });
    const table = el("table", { class:"table" });

    table.appendChild(el("thead", {}, [ el("tr", {}, [
      el("th", { text:"" }),
      el("th", { text:"Ordem" }),
      el("th", { text:"Título" }),
      el("th", { text:"Tipo" }),
      el("th", { text:"Tempo" })
    ]) ]));
    const tbody = el("tbody");

    for(const c of filtered){
      const done = DataStore.progress.isContentDone(user.id, c.id);
      const badge = done ? el("span", { class:"badge ok", text:"Concluído" }) : el("span", { class:"badge warn", text:"Pendente" });

      const tr = el("tr", { onclick: () => selectContent(c.id) }, [
        el("td", {}, [ badge ]),
        el("td", { text: String(c.orderInTrack ?? "") }),
        el("td", { text: c.title }),
        el("td", { text: c.type }),
        el("td", { text: c.estimatedTime })
      ]);
      tr.style.cursor = "pointer";
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    listCard.querySelector("table")?.remove();
    listCard.appendChild(table);
  }

  function selectContent(id){
    state.selectedId = id;
    state.startedAt = Date.now();
    const c = DataStore.contents.getById(id);
    if(!c) return;

    const done = DataStore.progress.isContentDone(user.id, c.id);
    detailCard.innerHTML = "";

    detailCard.appendChild(el("h3", { text: c.title }));
    detailCard.appendChild(el("p", { text: c.description || "" }));

    const meta = el("div", { class:"notice", html: `
      <div class="small"><b>Tipo:</b> ${c.type} • <b>Tempo:</b> ${c.estimatedTime} • <b>Obrigatório:</b> ${c.mandatory ? "Sim" : "Não"}</div>
      <div class="small"><b>Responsável:</b> ${c.owner} • <b>Atualização:</b> ${c.updatedAt}</div>
      <div class="small"><b>Tags:</b> ${(c.tags || []).join(", ") || "Sem tags"}</div>
    `});
    detailCard.appendChild(meta);

    const contentBox = el("div", { class:"card", style:"padding:14px;margin-top:12px;background:rgba(255,255,255,.02)" });

    if(c.type === "video" && c.url){
      contentBox.appendChild(el("div", { class:"small", text:"Vídeo embed (link deve ser embedável)." }));
      const iframe = el("iframe", {
        src: c.url,
        style:"width:100%;height:320px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:#000;",
        allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        allowfullscreen:"true"
      });
      contentBox.appendChild(iframe);
    } else if(c.url){
      contentBox.appendChild(el("a", { class:"btn", href:c.url, target:"_blank", text:"Abrir conteúdo" }));
      contentBox.appendChild(el("div", { class:"small", text:"Links, documentos e apresentações abrem em nova aba." }));
    } else {
      contentBox.appendChild(el("div", { class:"small", text:"Conteúdo sem URL configurada." }));
    }

    detailCard.appendChild(contentBox);

    const row = el("div", { class:"row", style:"margin-top:12px" });
    const doneBtn = el("button", {
      class:`btn ${done ? "" : "primary"}`,
      type:"button",
      text: done ? "Já concluído" : "Concluir",
      onclick: () => {
        if(done) return;
        const seconds = Math.max(0, Math.round((Date.now() - (state.startedAt || Date.now()))/1000));
        Progress.markDone(user.id, c.id, seconds);
        renderList();
        selectContent(id);

        const s = Progress.getTrackStats(user);
        toastHost.textContent = `Progresso atualizado: ${s.percent}%`;
      }
    });
    const toastHost = el("div", { class:"notice small", text:"" });

    row.appendChild(doneBtn);
    row.appendChild(toastHost);
    detailCard.appendChild(row);
  }

  typeSel.addEventListener("change", renderList);
  tagInput.addEventListener("input", () => {
    clearTimeout(state._t);
    state._t = setTimeout(renderList, 120);
  });

  listCard.appendChild(el("div", { class:"notice small", text:"Dica: usar filtros por tipo e tags para encontrar itens rapidamente." }));

  grid.appendChild(listCard);
  grid.appendChild(detailCard);

  host.appendChild(header);
  host.appendChild(grid);

  renderList();

  if(window.__dashSelectContentId){
    const id = window.__dashSelectContentId;
    window.__dashSelectContentId = null;
    selectContent(id);
  }
}

function renderLibrary(host, user){
  host.innerHTML = "";

  const state = { filterType:"", tagQuery:"" };
  const list = Content.listLibraryForUser(user);

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Biblioteca" }),
    el("p", { text:"Conteúdos extras conforme permissão e segmentação. Admin e Supervisor veem tudo." })
  ]);

  const controls = el("div", { class:"row" });
  const typeSel = el("select", {}, [
    el("option", { value:"", text:"Todos os tipos" }),
    ...APP.enums.contentTypes.map(t => el("option", { value:t, text:t }))
  ]);
  const tagInput = el("input", { class:"input", placeholder:"Filtrar por tags..." });
  controls.appendChild(typeSel);
  controls.appendChild(tagInput);
  card.appendChild(controls);

  const box = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Resultados" }),
    el("p", { text:"Abrir materiais em nova aba." })
  ]);

  function render(){
    const filtered = Content.search(list, { type: typeSel.value, tagQuery: tagInput.value.trim() });
    const table = el("table", { class:"table" });
    table.appendChild(el("thead", {}, [ el("tr", {}, [
      el("th", { text:"Título" }),
      el("th", { text:"Tipo" }),
      el("th", { text:"Unidade" }),
      el("th", { text:"Setor" }),
      el("th", { text:"Ação" })
    ]) ]));
    const tbody = el("tbody");
    for(const c of filtered){
      const btn = el("a", { class:"btn", href: c.url || "#", target:"_blank", text:"Abrir" });
      if(!c.url) btn.classList.add("ghost");
      tbody.appendChild(el("tr", {}, [
        el("td", { text: c.title }),
        el("td", { text: c.type }),
        el("td", { text: c.unit }),
        el("td", { text: c.sector }),
        el("td", {}, [ btn ])
      ]));
    }
    table.appendChild(tbody);

    box.querySelector("table")?.remove();
    box.appendChild(table);
  }

  typeSel.addEventListener("change", render);
  tagInput.addEventListener("input", () => {
    clearTimeout(state._t);
    state._t = setTimeout(render, 120);
  });

  host.appendChild(card);
  host.appendChild(box);
  render();
}

function renderUsefulLinks(host, user){
  host.innerHTML = "";
  const list = Content.listLibraryForUser(user).filter(c => c.type === "link" && c.active !== false);

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Links úteis" }),
    el("p", { text:"Links operacionais para rotina." })
  ]);

  const box = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Operacionais" }),
    el("p", { text: list.length ? "Abrir em nova aba." : "Nenhum link configurado para este perfil." })
  ]);

  for(const c of list){
    box.appendChild(el("div", { class:"notice", style:"margin-top:10px" }, [
      el("div", { html: `<b>${c.title}</b>` }),
      el("div", { class:"small", text: c.description || "" }),
      el("div", { style:"margin-top:8px" }, [
        el("a", { class:"btn", href: c.url || "#", target:"_blank", text:"Abrir" })
      ])
    ]));
  }

  host.appendChild(card);
  host.appendChild(box);
}

function renderInstitutional(host){
  host.innerHTML = "";

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Institucional" }),
    el("p", { text:"Conteúdo institucional base. Em produção, pode vir de CMS ou API." })
  ]);

  const box = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Missão, visão e valores" }),
    el("div", { class:"notice" , html: `
      <div class="small"><b>Missão:</b> Garantir padronização, velocidade e qualidade no onboarding.</div>
      <div class="small"><b>Visão:</b> Evoluir o treinamento para uma plataforma conectada, com métricas e automações.</div>
      <div class="small"><b>Valores:</b> Clareza, consistência, melhoria contínua, foco no cliente.</div>
    `})
  ]);

  const rules = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Regras internas" }),
    el("div", { class:"notice", html: `
      <div class="small">Conteúdos obrigatórios devem ser concluídos antes de executar atividades críticas.</div>
      <div class="small">Avaliações periódicas podem ser reabertas conforme recorrência configurada.</div>
      <div class="small">Admin mantém trilhas e permissões por unidade, setor e cargo.</div>
    `})
  ]);

  host.appendChild(card);
  host.appendChild(box);
  host.appendChild(rules);
}

function renderEvaluations(host, user){
  host.innerHTML = "";

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Avaliações" }),
    el("p", { text:"Final libera após 100% da trilha. Periódicas seguem recorrência." })
  ]);

  const stats = Progress.getTrackStats(user);
  const finalUnlocked = Quizzes.finalIsUnlocked(user);

  const status = el("div", { class:"notice", html: `
    <div class="small"><b>Progresso:</b> ${stats.percent}%</div>
    <div class="small"><b>Final:</b> ${finalUnlocked ? "Liberado" : "Bloqueado (precisa 100%)"}</div>
  `});
  card.appendChild(status);

  const finals = Quizzes.listFinalForUser(user);
  const periodic = Quizzes.listPeriodicForUser(user);

  const grid = el("div", { class:"grid", style:"margin-top:16px" });

  const left = el("div", { class:"card" }, [
    el("h3", { text:"Final" }),
    el("p", { text: finals.length ? "Selecionar para responder e registrar tentativa." : "Nenhuma avaliação final configurada." })
  ]);

  const right = el("div", { class:"card" }, [
    el("h3", { text:"Periódicas" }),
    el("p", { text: periodic.length ? "Disponíveis conforme recorrência." : "Nenhuma periódica configurada." })
  ]);

  function renderQuizList(target, quizzes, canStart){
    for(const q of quizzes){
      const atts = DataStore.progress.listQuizAttempts(user.id, q.id);
      const last = atts[atts.length - 1];

      const box = el("div", { class:"notice", style:"margin-top:10px" }, [
        el("div", { html: `<b>${q.title}</b>` }),
        el("div", { class:"small", text: q.description || "" }),
        el("div", { class:"small", text: last ? `Última: ${last.percent}% (${last.status})` : "Sem tentativas" })
      ]);

      const btn = el("button", {
        class:`btn ${canStart ? "primary" : ""}`,
        type:"button",
        text: canStart ? "Iniciar" : "Bloqueado",
        onclick: () => {
          if(!canStart) return;
          renderQuizRunner(host, user, q);
        }
      });

      if(q.kind === "periodic"){
        // habilitação por recorrência
        const due = (atts.length === 0) ? true : (Date.now() >= (new Date(last.finishedAt).getTime() + (Number(q.recurrenceDays||0) * 24*60*60*1000)));
        btn.textContent = due ? "Iniciar" : "Aguardar";
        btn.className = `btn ${due ? "primary" : ""}`;
        btn.onclick = () => { if(due) renderQuizRunner(host, user, q); };
      }

      box.appendChild(el("div", { style:"margin-top:10px" }, [ btn ]));
      target.appendChild(box);
    }
  }

  renderQuizList(left, finals, finalUnlocked);
  renderQuizList(right, periodic, true);

  grid.appendChild(left);
  grid.appendChild(right);

  host.appendChild(card);
  host.appendChild(grid);
}

function renderQuizRunner(host, user, quiz){
  host.innerHTML = "";

  const attempt = Quizzes.startAttempt();
  const answers = {};

  const card = el("div", { class:"card" }, [
    el("h2", { text: quiz.title }),
    el("p", { text: quiz.description || "" }),
    el("div", { class:"notice small", text:`Nota mínima: ${quiz.minScorePercent}%` })
  ]);

  const form = el("form", { class:"form", onsubmit: (e) => {
    e.preventDefault();
    const r = Quizzes.finishAttempt({ userId: user.id, quizId: quiz.id, answers, startedAt: attempt.startedAt });
    if(!r.ok) return;

    const a = r.attempt;
    const result = el("div", { class:"card", style:"margin-top:16px" }, [
      el("h3", { text:"Resultado" }),
      el("div", { class:`badge ${a.status === "Apto" ? "ok" : "no"}`, text: a.status }),
      el("div", { class:"notice", style:"margin-top:10px", html: `
        <div class="small"><b>Pontuação:</b> ${a.score}/${a.total} (${a.percent}%)</div>
        <div class="small"><b>Tempo:</b> ${a.secondsSpent}s</div>
        <div class="small"><b>Tentativas:</b> ${DataStore.progress.listQuizAttempts(user.id, quiz.id).length}</div>
      `})
    ]);

    const back = el("button", { class:"btn", type:"button", text:"Voltar às avaliações", onclick: () => {
      window.location.hash = "#avaliacoes";
      window.dispatchEvent(new Event("hashchange"));
    }});

    result.appendChild(el("div", { style:"margin-top:12px" }, [ back ]));

    host.appendChild(result);
    form.querySelector("button[type='submit']").disabled = true;
  }});

  for(const q of quiz.questions){
    const block = el("div", { class:"card", style:"padding:14px;background:rgba(255,255,255,.02)" }, [
      el("div", { html: `<b>${q.prompt}</b>` })
    ]);

    q.options.forEach((opt, idx) => {
      const id = `${quiz.id}_${q.id}_${idx}`;
      const radio = el("input", { type:"radio", name:q.id, id, onchange: () => { answers[q.id] = idx; }});
      const label = el("label", { for:id, class:"small", style:"cursor:pointer" , text: ` ${opt}` });
      const row = el("div", { class:"row", style:"align-items:center" }, [ radio, label ]);
      row.style.gap = "8px";
      block.appendChild(row);
    });

    form.appendChild(block);
  }

  form.appendChild(el("button", { class:"btn primary", type:"submit", text:"Finalizar" }));

  host.appendChild(card);
  host.appendChild(form);
}

function renderAssistantTab(host, user){
  host.innerHTML = "";
  const card = el("div", { class:"card" }, [
    el("h2", { text:"Assistente" }),
    el("p", { text:"Chat com histórico por usuário e arquitetura pronta para integração externa." })
  ]);
  const box = el("div", { class:"card", style:"margin-top:16px" });
  renderAssistant(box, user);
  host.appendChild(card);
  host.appendChild(box);
}

export function bootDashboard(root){
  const user = requireAuthOrRedirect();
  const shell = renderShell(root, {
    user,
    pageTitle: "Dashboard",
    showAdminLink: Roles.isSupervisor(user),
  });

  if(!shell.ensureProfile()) return;

  const state = { activeTab: "home" };
  const main = shell.main;

  const tabs = el("div", { class:"tabs" });
  const content = el("div", { id:"dashContent" });

  function setTab(key){
    state.activeTab = key;
    window.location.hash = `#${key}`;
    redraw();
  }

  function redraw(){
    tabs.innerHTML = "";
    tabs.appendChild(tabButton("Início", "home", state, setTab));
    tabs.appendChild(tabButton("Onboarding", "onboarding", state, setTab));
    tabs.appendChild(tabButton("Biblioteca", "biblioteca", state, setTab));
    tabs.appendChild(tabButton("Links úteis", "links", state, setTab));
    tabs.appendChild(tabButton("Institucional", "institucional", state, setTab));
    tabs.appendChild(tabButton("Avaliações", "avaliacoes", state, setTab));
    tabs.appendChild(tabButton("Assistente", "assistente", state, setTab));

    content.innerHTML = "";

    if(state.activeTab === "home") renderDashboardHome(content, user);
    if(state.activeTab === "onboarding") renderOnboarding(content, user);
    if(state.activeTab === "biblioteca") renderLibrary(content, user);
    if(state.activeTab === "links") renderUsefulLinks(content, user);
    if(state.activeTab === "institucional") renderInstitutional(content);
    if(state.activeTab === "avaliacoes") renderEvaluations(content, user);
    if(state.activeTab === "assistente") renderAssistantTab(content, user);
  }

  function syncFromHash(){
    const h = (window.location.hash || "").replace("#","").trim();
    const allowed = ["home","onboarding","biblioteca","links","institucional","avaliacoes","assistente"];
    state.activeTab = allowed.includes(h) ? h : "home";
    redraw();
  }

  window.addEventListener("hashchange", syncFromHash);

  main.appendChild(tabs);
  main.appendChild(content);

  syncFromHash();
}