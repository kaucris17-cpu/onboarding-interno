import { requireAuthOrRedirect, renderShell } from "./ui.js";
import { Roles } from "./roles.js";
import { DataStore } from "./apiAdapter.js";
import { Auth } from "./auth.js";
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

function safeId(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function tabButton(label, key, state, onChange){
  return el("button", { class:`tab ${state.activeTab === key ? "active" : ""}`, type:"button", text:label, onclick: () => onChange(key) });
}

function guardAdmin(user){
  if(Roles.isSupervisor(user)) return true;
  window.location.href = "./dashboard.html";
  return false;
}

function renderUsers(host){
  host.innerHTML = "";

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Gestão de usuários" }),
    el("p", { text:"Criar, editar, desativar, definir perfil e resetar senha (simulado)." })
  ]);

  const box = el("div", { class:"grid", style:"margin-top:16px" });

  const listCard = el("div", { class:"card" }, [
    el("h3", { text:"Lista" }),
    el("p", { text:"Selecionar um usuário para editar." })
  ]);

  const editorCard = el("div", { class:"card" }, [
    el("h3", { text:"Editor" }),
    el("p", { text:"Criar novo ou editar existente." })
  ]);

  let selectedId = null;

  function renderList(){
    const users = DataStore.users.list().slice().sort((a,b) => (a.name||"").localeCompare(b.name||""));
    const table = el("table", { class:"table" });
    table.appendChild(el("thead", {}, [ el("tr", {}, [
      el("th", { text:"Ativo" }),
      el("th", { text:"Nome" }),
      el("th", { text:"E-mail" }),
      el("th", { text:"Role" }),
      el("th", { text:"Unidade/Setor/Cargo" })
    ]) ]));
    const tbody = el("tbody");

    for(const u of users){
      const badge = u.active === false ? el("span", { class:"badge no", text:"Não" }) : el("span", { class:"badge ok", text:"Sim" });
      const tr = el("tr", { onclick: () => { selectedId = u.id; renderEditor(); } }, [
        el("td", {}, [ badge ]),
        el("td", { text: u.name }),
        el("td", { text: u.email }),
        el("td", { text: u.role }),
        el("td", { text: `${u.unit||"-"}/${u.sector||"-"}/${u.jobTitle||"-"}` })
      ]);
      tr.style.cursor = "pointer";
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    listCard.querySelector("table")?.remove();
    listCard.appendChild(table);
  }

  function renderEditor(){
    const isNew = !selectedId;
    const user = isNew ? {
      id: safeId("u"),
      name: "",
      email: "",
      password: "123456",
      role: "user",
      active: true,
      unit: "",
      sector: "",
      jobTitle: ""
    } : DataStore.users.getById(selectedId);

    editorCard.innerHTML = "";
    editorCard.appendChild(el("h3", { text: isNew ? "Novo usuário" : "Editar usuário" }));

    const form = el("form", { class:"form", onsubmit: (e) => {
      e.preventDefault();
      const updated = {
        ...user,
        name: name.value.trim(),
        email: email.value.trim(),
        role: role.value,
        unit: unit.value,
        sector: sector.value,
        jobTitle: job.value.trim(),
        active: active.checked
      };
      DataStore.users.upsert(updated);
      selectedId = updated.id;
      renderList();
      renderEditor();
      editorCard.prepend(el("div", { class:"notice", text:"Salvo." }));
      setTimeout(() => editorCard.querySelector(".notice")?.remove(), 1800);
    }});

    const name = el("input", { class:"input", value:user.name, placeholder:"Nome" });
    const email = el("input", { class:"input", type:"email", value:user.email, placeholder:"E-mail" });

    const role = el("select", {}, APP.enums.roles.map(r => el("option", { value:r, text:r })));
    role.value = user.role;

    const unit = el("select", {}, [ el("option", { value:"", text:"(não definido)" }), ...APP.enums.units.map(u => el("option", { value:u, text:u })) ]);
    unit.value = user.unit || "";

    const sector = el("select", {}, [ el("option", { value:"", text:"(não definido)" }), ...APP.enums.sectors.map(s => el("option", { value:s, text:s })) ]);
    sector.value = user.sector || "";

    const job = el("input", { class:"input", value:user.jobTitle || "", placeholder:"Cargo (ex: Analista de CS)" });

    const active = el("input", { type:"checkbox" });
    active.checked = user.active !== false;

    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Nome" }), name ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"E-mail" }), email ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Role" }), role ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Unidade" }), unit ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Setor" }), sector ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Cargo" }), job ]));

    const activeRow = el("div", { class:"row" }, [
      el("div", { class:"field" }, [
        el("label", { text:"Ativo" }),
        el("div", { class:"row" }, [ active, el("div", { class:"small", text:"Marcar para permitir login." }) ])
      ])
    ]);
    form.appendChild(activeRow);

    const actions = el("div", { class:"row" });
    const save = el("button", { class:"btn primary", type:"submit", text:"Salvar" });
    const newBtn = el("button", { class:"btn", type:"button", text:"Novo", onclick: () => { selectedId = null; renderEditor(); } });

    const reset = el("button", { class:"btn", type:"button", text:"Reset senha", onclick: () => {
      const r = Auth.adminResetPassword(user.id);
      if(!r.ok) return;
      editorCard.prepend(el("div", { class:"notice", text:`Senha resetada para: ${r.newPassword}` }));
      setTimeout(() => editorCard.querySelector(".notice")?.remove(), 2400);
    }});

    actions.appendChild(save);
    actions.appendChild(newBtn);
    if(!isNew) actions.appendChild(reset);

    form.appendChild(actions);
    editorCard.appendChild(form);
  }

  const newBtn = el("button", { class:"btn primary", type:"button", text:"Criar usuário", onclick: () => { selectedId = null; renderEditor(); } });
  listCard.appendChild(el("div", { class:"row" }, [ newBtn ]));

  box.appendChild(listCard);
  box.appendChild(editorCard);

  host.appendChild(card);
  host.appendChild(box);

  renderList();
  renderEditor();
}

function renderContents(host){
  host.innerHTML = "";

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Gestão de conteúdos" }),
    el("p", { text:"CRUD completo e organização por trilhas (ordem) com segmentação por unidade, setor e cargos." })
  ]);

  const box = el("div", { class:"grid", style:"margin-top:16px" });

  const listCard = el("div", { class:"card" }, [
    el("h3", { text:"Lista" }),
    el("p", { text:"Selecionar para editar. Itens desativados não aparecem para usuários." })
  ]);

  const editorCard = el("div", { class:"card" }, [
    el("h3", { text:"Editor" }),
    el("p", { text:"Evitar hardcode: todo conteúdo nasce via cadastro." })
  ]);

  let selectedId = null;

  function renderList(){
    const all = DataStore.contents.list().slice().sort((a,b) => (a.orderInTrack||0) - (b.orderInTrack||0));
    const table = el("table", { class:"table" });
    table.appendChild(el("thead", {}, [ el("tr", {}, [
      el("th", { text:"Ativo" }),
      el("th", { text:"Ordem" }),
      el("th", { text:"Título" }),
      el("th", { text:"Tipo" }),
      el("th", { text:"Obrigatório" }),
      el("th", { text:"Unidade/Setor" })
    ]) ]));
    const tbody = el("tbody");
    for(const c of all){
      const badge = c.active === false ? el("span", { class:"badge no", text:"Não" }) : el("span", { class:"badge ok", text:"Sim" });
      const tr = el("tr", { onclick: () => { selectedId = c.id; renderEditor(); } }, [
        el("td", {}, [ badge ]),
        el("td", { text: String(c.orderInTrack ?? "") }),
        el("td", { text: c.title }),
        el("td", { text: c.type }),
        el("td", { text: c.mandatory ? "Sim" : "Não" }),
        el("td", { text: `${c.unit}/${c.sector}` })
      ]);
      tr.style.cursor = "pointer";
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    listCard.querySelector("table")?.remove();
    listCard.appendChild(table);
  }

  function renderEditor(){
    const isNew = !selectedId;
    const content = isNew ? {
      id: safeId("c"),
      title: "",
      description: "",
      type: "video",
      unit: "Geral",
      sector: "Geral",
      linkedRoles: [],
      mandatory: false,
      orderInTrack: 999,
      estimatedTime: "10 min",
      tags: [],
      updatedAt: new Date().toISOString().slice(0,10),
      owner: "",
      url: "",
      active: true
    } : DataStore.contents.getById(selectedId);

    editorCard.innerHTML = "";
    editorCard.appendChild(el("h3", { text: isNew ? "Novo conteúdo" : "Editar conteúdo" }));

    const form = el("form", { class:"form", onsubmit: (e) => {
      e.preventDefault();

      const updated = {
        ...content,
        title: title.value.trim(),
        description: desc.value.trim(),
        type: type.value,
        unit: unit.value,
        sector: sector.value,
        linkedRoles: cargos.value.split(",").map(s => s.trim()).filter(Boolean),
        mandatory: mandatory.checked,
        orderInTrack: Number(order.value || 0),
        estimatedTime: time.value.trim(),
        tags: tags.value.split(",").map(s => s.trim()).filter(Boolean),
        updatedAt: updatedAt.value || content.updatedAt,
        owner: owner.value.trim(),
        url: url.value.trim(),
        active: active.checked
      };

      DataStore.contents.upsert(updated);
      selectedId = updated.id;
      renderList();
      renderEditor();
      editorCard.prepend(el("div", { class:"notice", text:"Salvo." }));
      setTimeout(() => editorCard.querySelector(".notice")?.remove(), 1800);
    }});

    const title = el("input", { class:"input", value:content.title, placeholder:"Título" });
    const desc = el("textarea", {}, []);
    desc.value = content.description || "";

    const type = el("select", {}, APP.enums.contentTypes.map(t => el("option", { value:t, text:t })));
    type.value = content.type;

    const unit = el("select", {}, ["Geral", ...APP.enums.units].map(u => el("option", { value:u, text:u })));
    unit.value = content.unit;

    const sector = el("select", {}, ["Geral", ...APP.enums.sectors].map(s => el("option", { value:s, text:s })));
    sector.value = content.sector;

    const cargos = el("input", { class:"input", value:(content.linkedRoles || []).join(", "), placeholder:"Cargos vinculados (separar por vírgula)" });

    const mandatory = el("input", { type:"checkbox" });
    mandatory.checked = !!content.mandatory;

    const order = el("input", { class:"input", type:"number", value: String(content.orderInTrack ?? 0) });

    const time = el("input", { class:"input", value:content.estimatedTime || "", placeholder:"Tempo estimado (ex: 12 min)" });
    const tags = el("input", { class:"input", value:(content.tags || []).join(", "), placeholder:"Tags (separar por vírgula)" });

    const updatedAt = el("input", { class:"input", type:"date", value: (content.updatedAt || "").slice(0,10) });
    const owner = el("input", { class:"input", value: content.owner || "", placeholder:"Responsável" });
    const url = el("input", { class:"input", value: content.url || "", placeholder:"URL / Embed (para vídeo)" });

    const active = el("input", { type:"checkbox" });
    active.checked = content.active !== false;

    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Título" }), title ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Descrição" }), desc ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Tipo" }), type ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Unidade" }), unit ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Setor" }), sector ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Cargos vinculados" }), cargos ]));
    form.appendChild(el("div", { class:"row" }, [
      el("div", { class:"field" }, [ el("label", { text:"Obrigatório" }), mandatory ]),
      el("div", { class:"field" }, [ el("label", { text:"Ordem na trilha" }), order ])
    ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Tempo estimado" }), time ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Tags" }), tags ]));
    form.appendChild(el("div", { class:"row" }, [
      el("div", { class:"field" }, [ el("label", { text:"Data atualização" }), updatedAt ]),
      el("div", { class:"field" }, [ el("label", { text:"Responsável" }), owner ])
    ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"URL / Embed" }), url ]));

    const actions = el("div", { class:"row" });
    const save = el("button", { class:"btn primary", type:"submit", text:"Salvar" });
    const newBtn = el("button", { class:"btn", type:"button", text:"Novo", onclick: () => { selectedId = null; renderEditor(); } });
    const delBtn = el("button", { class:"btn danger", type:"button", text:"Excluir", onclick: () => {
      if(isNew) return;
      DataStore.contents.remove(content.id);
      selectedId = null;
      renderList();
      renderEditor();
    }});

    const activeWrap = el("div", { class:"field" }, [
      el("label", { text:"Ativo" }),
      el("div", { class:"row" }, [ active, el("div", { class:"small", text:"Desmarcar para ocultar." }) ])
    ]);

    form.appendChild(activeWrap);

    actions.appendChild(save);
    actions.appendChild(newBtn);
    if(!isNew) actions.appendChild(delBtn);

    form.appendChild(actions);
    editorCard.appendChild(form);
  }

  listCard.appendChild(el("div", { class:"row" }, [
    el("button", { class:"btn primary", type:"button", text:"Criar conteúdo", onclick: () => { selectedId = null; renderEditor(); } })
  ]));

  box.appendChild(listCard);
  box.appendChild(editorCard);

  host.appendChild(card);
  host.appendChild(box);

  renderList();
  renderEditor();
}

function renderEvaluationsAdmin(host){
  host.innerHTML = "";

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Avaliações" }),
    el("p", { text:"Criar questionário final por trilha e provas periódicas por cargo, com nota mínima e recorrência." })
  ]);

  const box = el("div", { class:"grid", style:"margin-top:16px" });

  const listCard = el("div", { class:"card" }, [
    el("h3", { text:"Lista" }),
    el("p", { text:"Editar questionários existentes. Questões ficam no JSON." })
  ]);

  const editorCard = el("div", { class:"card" }, [
    el("h3", { text:"Editor" }),
    el("p", { text:"Editor simples: metadados e questões em JSON para agilidade." })
  ]);

  let selectedId = null;

  function renderList(){
    const all = DataStore.quizzes.list().slice().sort((a,b) => (a.kind||"").localeCompare(b.kind||""));
    const table = el("table", { class:"table" });
    table.appendChild(el("thead", {}, [ el("tr", {}, [
      el("th", { text:"Ativo" }),
      el("th", { text:"Tipo" }),
      el("th", { text:"Título" }),
      el("th", { text:"Unidade/Setor" }),
      el("th", { text:"Cargos" }),
      el("th", { text:"Min" })
    ]) ]));
    const tbody = el("tbody");
    for(const q of all){
      const badge = q.active === false ? el("span", { class:"badge no", text:"Não" }) : el("span", { class:"badge ok", text:"Sim" });
      const tr = el("tr", { onclick: () => { selectedId = q.id; renderEditor(); } }, [
        el("td", {}, [ badge ]),
        el("td", { text: q.kind }),
        el("td", { text: q.title }),
        el("td", { text: `${q.unit || "Geral"}/${q.sector || "Geral"}` }),
        el("td", { text: (q.jobTitles || []).join(", ") || "-" }),
        el("td", { text: `${q.minScorePercent}%` })
      ]);
      tr.style.cursor = "pointer";
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    listCard.querySelector("table")?.remove();
    listCard.appendChild(table);
  }

  function renderEditor(){
    const isNew = !selectedId;
    const quiz = isNew ? {
      id: safeId("q"),
      kind: "final",
      title: "",
      description: "",
      unit: "Geral",
      sector: "Geral",
      jobTitles: [],
      minScorePercent: 70,
      recurrenceDays: 15,
      active: true,
      questions: [
        { id: "q1", prompt: "Pergunta 1", options: ["A","B","C","D"], correctIndex: 0 }
      ]
    } : DataStore.quizzes.getById(selectedId);

    editorCard.innerHTML = "";
    editorCard.appendChild(el("h3", { text: isNew ? "Nova avaliação" : "Editar avaliação" }));

    const form = el("form", { class:"form", onsubmit: (e) => {
      e.preventDefault();
      let parsed = null;
      try{
        parsed = JSON.parse(questions.value);
      }catch{
        editorCard.prepend(el("div", { class:"notice", text:"JSON de questões inválido." }));
        setTimeout(() => editorCard.querySelector(".notice")?.remove(), 2200);
        return;
      }

      const updated = {
        ...quiz,
        kind: kind.value,
        title: title.value.trim(),
        description: desc.value.trim(),
        unit: unit.value,
        sector: sector.value,
        jobTitles: jobs.value.split(",").map(s=>s.trim()).filter(Boolean),
        minScorePercent: Number(min.value || 0),
        recurrenceDays: Number(rec.value || 0),
        active: active.checked,
        questions: parsed
      };

      DataStore.quizzes.upsert(updated);
      selectedId = updated.id;
      renderList();
      renderEditor();
      editorCard.prepend(el("div", { class:"notice", text:"Salvo." }));
      setTimeout(() => editorCard.querySelector(".notice")?.remove(), 1800);
    }});

    const kind = el("select", {}, [
      el("option", { value:"final", text:"final" }),
      el("option", { value:"periodic", text:"periodic" })
    ]);
    kind.value = quiz.kind;

    const title = el("input", { class:"input", value:quiz.title, placeholder:"Título" });
    const desc = el("textarea", {});
    desc.value = quiz.description || "";

    const unit = el("select", {}, ["Geral", ...APP.enums.units].map(u => el("option", { value:u, text:u })));
    unit.value = quiz.unit || "Geral";

    const sector = el("select", {}, ["Geral", ...APP.enums.sectors].map(s => el("option", { value:s, text:s })));
    sector.value = quiz.sector || "Geral";

    const jobs = el("input", { class:"input", value:(quiz.jobTitles||[]).join(", "), placeholder:"Cargos (separar por vírgula)" });
    const min = el("input", { class:"input", type:"number", value:String(quiz.minScorePercent ?? 70) });
    const rec = el("input", { class:"input", type:"number", value:String(quiz.recurrenceDays ?? 15) });

    const active = el("input", { type:"checkbox" });
    active.checked = quiz.active !== false;

    const questions = el("textarea", { class:"input" });
    questions.value = JSON.stringify(quiz.questions || [], null, 2);

    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Tipo" }), kind ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Título" }), title ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Descrição" }), desc ]));
    form.appendChild(el("div", { class:"row" }, [
      el("div", { class:"field" }, [ el("label", { text:"Unidade" }), unit ]),
      el("div", { class:"field" }, [ el("label", { text:"Setor" }), sector ])
    ]));
    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Cargos" }), jobs ]));
    form.appendChild(el("div", { class:"row" }, [
      el("div", { class:"field" }, [ el("label", { text:"Nota mínima (%)" }), min ]),
      el("div", { class:"field" }, [ el("label", { text:"Recorrência (dias, só periódica)" }), rec ])
    ]));

    form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Questões (JSON)" }), questions ]));

    form.appendChild(el("div", { class:"field" }, [
      el("label", { text:"Ativo" }),
      el("div", { class:"row" }, [ active, el("div", { class:"small", text:"Desmarcar para esconder." }) ])
    ]));

    const actions = el("div", { class:"row" }, [
      el("button", { class:"btn primary", type:"submit", text:"Salvar" }),
      el("button", { class:"btn", type:"button", text:"Novo", onclick: () => { selectedId = null; renderEditor(); } })
    ]);

    if(!isNew){
      actions.appendChild(el("button", { class:"btn danger", type:"button", text:"Excluir", onclick: () => {
        DataStore.quizzes.remove(quiz.id);
        selectedId = null;
        renderList();
        renderEditor();
      }}));
    }

    form.appendChild(actions);
    editorCard.appendChild(form);
  }

  listCard.appendChild(el("div", { class:"row" }, [
    el("button", { class:"btn primary", type:"button", text:"Criar avaliação", onclick: () => { selectedId = null; renderEditor(); } })
  ]));

  box.appendChild(listCard);
  box.appendChild(editorCard);

  host.appendChild(card);
  host.appendChild(box);

  renderList();
  renderEditor();
}

function renderTracking(host){
  host.innerHTML = "";

  const card = el("div", { class:"card" }, [
    el("h2", { text:"Acompanhamento" }),
    el("p", { text:"Progresso por usuário, notas, tentativas e histórico consolidado." })
  ]);

  const progress = DataStore.progress.getAll();
  const users = DataStore.users.list();
  const contents = DataStore.contents.list();
  const quizzes = DataStore.quizzes.list();

  const table = el("table", { class:"table" });
  table.appendChild(el("thead", {}, [ el("tr", {}, [
    el("th", { text:"Usuário" }),
    el("th", { text:"Concluídos" }),
    el("th", { text:"Avaliações (tentativas)" }),
    el("th", { text:"Último evento" })
  ]) ]));

  const tbody = el("tbody");

  for(const u of users){
    const completions = progress.completions?.[u.id] || {};
    const doneCount = Object.keys(completions).length;

    const qa = progress.quizAttempts?.[u.id] || {};
    const attemptsCount = Object.values(qa).reduce((sum, arr) => sum + (arr?.length || 0), 0);

    let lastAt = null;
    for(const c of Object.values(completions)){
      if(c?.doneAt && (!lastAt || new Date(c.doneAt) > new Date(lastAt))) lastAt = c.doneAt;
    }
    for(const arr of Object.values(qa)){
      for(const a of (arr || [])){
        const t = a.finishedAt || a.startedAt;
        if(t && (!lastAt || new Date(t) > new Date(lastAt))) lastAt = t;
      }
    }

    tbody.appendChild(el("tr", {}, [
      el("td", { text:`${u.name} (${u.email})` }),
      el("td", { text:String(doneCount) }),
      el("td", { text:String(attemptsCount) }),
      el("td", { text: lastAt ? new Date(lastAt).toLocaleString() : "-" })
    ]));
  }

  table.appendChild(tbody);

  const details = el("div", { class:"card", style:"margin-top:16px" }, [
    el("h3", { text:"Detalhe por usuário" }),
    el("p", { text:"Selecionar um usuário para ver lista de concluídos e histórico de avaliações." })
  ]);

  const sel = el("select", {}, users.map(u => el("option", { value:u.id, text:`${u.name} • ${u.email}` })));
  const out = el("div", {});

  function renderUserDetail(){
    const userId = sel.value;
    const u = users.find(x => x.id === userId);
    if(!u) return;
    out.innerHTML = "";

    const comp = progress.completions?.[userId] || {};
    const rows = Object.entries(comp).map(([cid, meta]) => {
      const c = contents.find(x => x.id === cid);
      return { title: c?.title || cid, doneAt: meta.doneAt };
    }).sort((a,b) => new Date(b.doneAt) - new Date(a.doneAt));

    const qa = progress.quizAttempts?.[userId] || {};

    const compCard = el("div", { class:"card", style:"margin-top:12px;padding:14px;background:rgba(255,255,255,.02)" }, [
      el("h3", { text:"Concluídos" }),
      el("p", { text: rows.length ? "Lista ordenada por data." : "Sem conclusões." })
    ]);

    for(const r of rows.slice(0, 25)){
      compCard.appendChild(el("div", { class:"notice", style:"margin-top:10px" }, [
        el("div", { html:`<b>${r.title}</b>` }),
        el("div", { class:"small", text:new Date(r.doneAt).toLocaleString() })
      ]));
    }

    const quizCard = el("div", { class:"card", style:"margin-top:12px;padding:14px;background:rgba(255,255,255,.02)" }, [
      el("h3", { text:"Avaliações" }),
      el("p", { text:"Tentativas por avaliação." })
    ]);

    const quizIds = Object.keys(qa);
    if(!quizIds.length){
      quizCard.appendChild(el("div", { class:"notice", text:"Sem tentativas." }));
    } else {
      for(const qid of quizIds){
        const q = quizzes.find(x => x.id === qid);
        const arr = qa[qid] || [];
        const last = arr[arr.length - 1];
        quizCard.appendChild(el("div", { class:"notice", style:"margin-top:10px" }, [
          el("div", { html:`<b>${q?.title || qid}</b>` }),
          el("div", { class:"small", text:`Tentativas: ${arr.length} • Última: ${last?.percent ?? 0}% (${last?.status || "-"})` })
        ]));
      }
    }

    out.appendChild(compCard);
    out.appendChild(quizCard);
  }

  sel.addEventListener("change", renderUserDetail);

  details.appendChild(el("div", { class:"row" }, [ sel ]));
  details.appendChild(out);

  host.appendChild(card);
  host.appendChild(el("div", { class:"card", style:"margin-top:16px" }, [ table ]));
  host.appendChild(details);

  renderUserDetail();
}

export function bootAdmin(root){
  const user = requireAuthOrRedirect();
  if(!guardAdmin(user)) return;

  const shell = renderShell(root, {
    user,
    pageTitle: "Admin",
    showAdminLink: false
  });

  const main = shell.main;

  const state = { activeTab: "users" };
  const tabs = el("div", { class:"tabs" });
  const content = el("div", { id:"adminContent" });

  function setTab(key){
    state.activeTab = key;
    window.location.hash = `#${key}`;
    redraw();
  }

  function redraw(){
    tabs.innerHTML = "";
    tabs.appendChild(tabButton("Usuários", "users", state, setTab));
    tabs.appendChild(tabButton("Conteúdos", "contents", state, setTab));
    tabs.appendChild(tabButton("Avaliações", "quizzes", state, setTab));
    tabs.appendChild(tabButton("Acompanhamento", "tracking", state, setTab));

    content.innerHTML = "";
    if(state.activeTab === "users") renderUsers(content);
    if(state.activeTab === "contents") renderContents(content);
    if(state.activeTab === "quizzes") renderEvaluationsAdmin(content);
    if(state.activeTab === "tracking") renderTracking(content);
  }

  function syncFromHash(){
    const h = (window.location.hash || "").replace("#","").trim();
    const allowed = ["users","contents","quizzes","tracking"];
    state.activeTab = allowed.includes(h) ? h : "users";
    redraw();
  }

  window.addEventListener("hashchange", syncFromHash);

  main.appendChild(tabs);
  main.appendChild(content);
  syncFromHash();
}