import { Auth } from "./auth.js";
import { DataStore } from "./apiAdapter.js";
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

function topbar({ title, subtitle, actions=[] }){
  return el("div", { class:"topbar container" }, [
    el("div", { class:"brand" }, [
      el("div", { class:"logo" }),
      el("div", {}, [
        el("h1", { text:title }),
        el("p", { text:subtitle || "" })
      ])
    ]),
    el("div", { class:"nav" }, actions)
  ]);
}

function toast(container, text, kind="info"){
  const b = el("div", { class:`notice`, text });
  if(kind === "error") b.style.borderColor = "rgba(255,107,107,.35)";
  if(kind === "ok") b.style.borderColor = "rgba(81,207,102,.35)";
  container.prepend(b);
  setTimeout(() => b.remove(), 3500);
}

function redirect(path){
  window.location.href = path;
}

function ensureProfile(user, host){
  if(user.unit && user.sector && user.jobTitle) return true;

  host.innerHTML = "";

  const card = el("div", { class:"card container" }, [
    el("h2", { text:"Completar perfil" }),
    el("p", { text:"Seleção necessária para segmentar trilha e biblioteca." })
  ]);

  const form = el("form", { class:"form", onsubmit: (e) => {
    e.preventDefault();
    const unit = unitSel.value;
    const sector = sectorSel.value;
    const jobTitle = jobSel.value;

    const updated = { ...user, unit, sector, jobTitle };
    DataStore.users.upsert(updated);
    toast(card, "Perfil atualizado.", "ok");
    setTimeout(() => window.location.reload(), 400);
  }});

  const unitSel = el("select", {}, APP.enums.units.map(u => el("option", { value:u, text:u })));
  const sectorSel = el("select", {}, APP.enums.sectors.map(s => el("option", { value:s, text:s })));
  const jobSel = el("input", { class:"input", placeholder:"Cargo (ex: Auxiliar de Cadastro)" });

  form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Unidade" }), unitSel ]));
  form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Setor" }), sectorSel ]));
  form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Cargo" }), jobSel ]));
  form.appendChild(el("button", { class:"btn primary", type:"submit", text:"Salvar" }));

  card.appendChild(form);
  host.appendChild(card);
  return false;
}

export function renderLogin(root){
  root.innerHTML = "";

  const wrap = el("div", { class:"container" });
  wrap.appendChild(topbar({
    title: "Onboarding Interno",
    subtitle: "Área de membros com trilhas, biblioteca e avaliações",
    actions: []
  }));

  const grid = el("div", { class:"grid container" });

  const left = el("div", { class:"card" }, [
    el("h2", { text:"Login" }),
    el("p", { text:"Acesso simulado no front-end. Persistência e progresso ficam no navegador." })
  ]);

  const form = el("form", { class:"form", onsubmit: (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const pass = passInput.value;
    const r = Auth.login(email, pass);
    if(!r.ok) return toast(left, r.error, "error");
    redirect("./dashboard.html");
  }});

  const emailInput = el("input", { class:"input", type:"email", placeholder:"E-mail" });
  const passInput = el("input", { class:"input", type:"password", placeholder:"Senha" });

  form.appendChild(el("div", { class:"field" }, [ el("label", { text:"E-mail" }), emailInput ]));
  form.appendChild(el("div", { class:"field" }, [ el("label", { text:"Senha" }), passInput ]));
  form.appendChild(el("button", { class:"btn primary", type:"submit", text:"Entrar" }));

  const forgotBtn = el("button", { class:"btn ghost", type:"button", text:"Recuperar senha", onclick: () => {
    right.innerHTML = "";
    renderReset(right);
  }});

  left.appendChild(form);
  left.appendChild(el("div", { class:"row" }, [
    forgotBtn,
    el("a", { href:"#", text:"Admin: admin@ecommercepuro.com.br / 123456", onclick:(e)=>{ e.preventDefault(); emailInput.value="admin@ecommercepuro.com.br"; passInput.value="123456"; } })
  ]));

  const right = el("div", { class:"card" }, [
    el("h2", { text:"Contas mock" }),
    el("p", { text:"Dados iniciais carregados de /data e copiados para localStorage na primeira execução." }),
    el("div", { class:"notice", html: `
      <div class="small"><b>Admin</b>: admin@ecommercepuro.com.br / 123456</div>
      <div class="small"><b>Polo</b>: auxiliar.cadastro@polo.com.br / 123456</div>
      <div class="small"><b>Ecommerce Puro</b>: analista.cs@ecommercepuro.com.br / 123456</div>
    `})
  ]);

  grid.appendChild(left);
  grid.appendChild(right);
  wrap.appendChild(grid);

  root.appendChild(wrap);
}

function renderReset(host){
  const card = el("div", {}, [
    el("h2", { text:"Recuperar / redefinir senha" }),
    el("p", { text:"Fluxo simulado: gerar token e redefinir no mesmo ambiente." })
  ]);

  const step1 = el("div", { class:"card", style:"padding:14px" }, [
    el("h3", { text:"1) Gerar token" })
  ]);
  const email1 = el("input", { class:"input", type:"email", placeholder:"E-mail" });
  const tokenOut = el("div", { class:"notice small", text:"Token aparecerá aqui após gerar." });
  const btn1 = el("button", { class:"btn primary", type:"button", text:"Gerar token", onclick: () => {
    const r = Auth.requestPasswordReset(email1.value.trim());
    if(!r.ok) return toast(host, r.error, "error");
    tokenOut.textContent = `Token: ${r.token}`;
    email2.value = email1.value.trim();
    token2.value = r.token;
    toast(host, "Token gerado.", "ok");
  }});
  step1.appendChild(el("div", { class:"field" }, [ el("label", { text:"E-mail" }), email1 ]));
  step1.appendChild(el("div", { class:"row" }, [ btn1 ]));
  step1.appendChild(tokenOut);

  const step2 = el("div", { class:"card", style:"padding:14px;margin-top:10px" }, [
    el("h3", { text:"2) Redefinir" })
  ]);
  const email2 = el("input", { class:"input", type:"email", placeholder:"E-mail" });
  const token2 = el("input", { class:"input", placeholder:"Token" });
  const pass2 = el("input", { class:"input", type:"password", placeholder:"Nova senha" });
  const btn2 = el("button", { class:"btn primary", type:"button", text:"Redefinir", onclick: () => {
    const r = Auth.resetPassword(email2.value.trim(), token2.value.trim(), pass2.value);
    if(!r.ok) return toast(host, r.error, "error");
    toast(host, "Senha redefinida.", "ok");
  }});

  step2.appendChild(el("div", { class:"field" }, [ el("label", { text:"E-mail" }), email2 ]));
  step2.appendChild(el("div", { class:"field" }, [ el("label", { text:"Token" }), token2 ]));
  step2.appendChild(el("div", { class:"field" }, [ el("label", { text:"Nova senha" }), pass2 ]));
  step2.appendChild(el("div", { class:"row" }, [ btn2 ]));

  host.appendChild(card);
  host.appendChild(step1);
  host.appendChild(step2);
}

export function renderShell(root, { user, pageTitle, subtitle, showAdminLink }){
  root.innerHTML = "";

  const actions = [];
  if(showAdminLink) actions.push(el("a", { class:"btn", href:"./admin.html", text:"Admin" }));
  actions.push(el("button", { class:"btn danger", text:"Sair", onclick: () => { Auth.logout(); redirect("./index.html"); } }));

  const header = topbar({
    title: pageTitle,
    subtitle: subtitle || `${user.name} • ${user.unit || "Sem unidade"} • ${user.sector || "Sem setor"} • ${user.jobTitle || "Sem cargo"}`,
    actions
  });

  const container = el("div", { class:"container" });
  container.appendChild(header);

  const main = el("div", { class:"container", id:"main" });

  root.appendChild(container);
  root.appendChild(main);

  return { main, toast: (t,k)=>toast(main,t,k), ensureProfile: () => ensureProfile(user, root) };
}

export function requireAuthOrRedirect(){
  const user = Auth.current();
  if(!user) redirect("./index.html");
  return user;
}