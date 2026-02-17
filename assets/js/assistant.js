import { DataStore } from "./apiAdapter.js";
import { AssistantProvider } from "./assistantProvider.js";

function safeId(prefix="m"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === "class") n.className = v;
    else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if(k === "text") n.textContent = v;
    else n.setAttribute(k, v);
  }
  for(const c of children) n.appendChild(c);
  return n;
}

function renderMessage(msg){
  const wrap = el("div", { class: `msg ${msg.role === "me" ? "me" : ""}` }, [
    el("div", { text: msg.text }),
    el("div", { class:"meta", text: new Date(msg.at).toLocaleString() })
  ]);
  return wrap;
}

export function renderAssistant(container, user){
  container.innerHTML = "";

  const chat = el("div", { class:"chat" });
  const log = el("div", { class:"chatlog" });
  const form = el("form", { class:"row", onsubmit: async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;

    input.value = "";
    const me = { id: safeId("me"), role:"me", text, at: new Date().toISOString() };
    DataStore.chat.push(user.id, me);
    log.appendChild(renderMessage(me));
    log.scrollTop = log.scrollHeight;

    sendBtn.disabled = true;
    sendBtn.textContent = "Enviando...";

    const reply = await AssistantProvider.sendMessage({ prompt: text, context: { user } });
    const bot = { id: safeId("bot"), role:"bot", text: reply.text, at: new Date().toISOString() };
    DataStore.chat.push(user.id, bot);
    log.appendChild(renderMessage(bot));
    log.scrollTop = log.scrollHeight;

    sendBtn.disabled = false;
    sendBtn.textContent = "Enviar";
  }});

  const input = el("input", { class:"input", placeholder:"Escrever mensagem..." });
  const sendBtn = el("button", { class:"btn primary", type:"submit", text:"Enviar" });

  form.appendChild(input);
  form.appendChild(sendBtn);

  const history = DataStore.chat.list(user.id);
  for(const m of history) log.appendChild(renderMessage(m));
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });

  chat.appendChild(log);
  chat.appendChild(form);

  container.appendChild(chat);
}