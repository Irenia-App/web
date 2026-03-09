const history = document.getElementById('conversation-history');
const chatForm = document.getElementById('chat-form');
const textInput = document.getElementById('text-input');
const voiceBtn = document.getElementById('voice-trigger');
const endConversationBtn = document.getElementById('end-conversation-btn');
const statusText = document.getElementById('status-text');

const conversationList = document.getElementById('conversation-list');
const newChatBtn = document.getElementById('new-chat-btn');
const chatSearch = document.getElementById('chat-search');
const clearChatsBtn = document.getElementById('clear-chats-btn');

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');

const settingsPanel = document.getElementById('settings-panel');
const settingsToggle = document.getElementById('settings-toggle');
const settingsClose = document.getElementById('settings-close');
const settingTextOnly = document.getElementById('setting-text-only');
const settingAutoListen = document.getElementById('setting-auto-listen');

const AGENT_ID = 'agent_0501kk824pheffhtf28ehae8ddqs';
const CHAT_STORAGE_KEY = 'irenia_chat_memory_v1';
const SETTINGS_STORAGE_KEY = 'irenia_chat_settings_v1';

const defaultSettings = {
    textOnly: false,
    autoListen: true
};

const state = {
    conversations: [],
    activeConversationId: null,
    searchQuery: ''
};

let settings = { ...defaultSettings };
let conversationSession = null;
let sessionConversationId = null;
let micMuted = true;
let userTypedCache = '';
let userTypedAt = 0;

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function formatDateLabel(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

function setStatus(text) {
    statusText.innerText = text;
}

function setOrbListening(active) {
    voiceBtn.classList.toggle('orb-listening', Boolean(active));
}

function setVoiceEnabled(enabled) {
    voiceBtn.classList.toggle('opacity-40', !enabled);
    voiceBtn.classList.toggle('cursor-not-allowed', !enabled);
    voiceBtn.classList.toggle('cursor-pointer', enabled);
}

function saveState() {
    try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
            conversations: state.conversations,
            activeConversationId: state.activeConversationId
        }));
    } catch (error) {
        console.error('No se pudo guardar el historial local:', error);
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('No se pudo guardar la configuracion:', error);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.conversations)) return;

        state.conversations = parsed.conversations;
        state.activeConversationId = parsed.activeConversationId;
    } catch (error) {
        console.error('No se pudo leer historial local:', error);
    }
}

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        settings = {
            ...defaultSettings,
            ...parsed
        };
    } catch (error) {
        console.error('No se pudo leer configuracion:', error);
    }
}

function closeSidebar() {
    if (!window.matchMedia('(max-width: 767px)').matches) {
        return;
    }
    sidebar.classList.add('-translate-x-full');
    sidebarBackdrop.classList.add('hidden');
}

function openSidebar() {
    if (!window.matchMedia('(max-width: 767px)').matches) {
        return;
    }
    sidebar.classList.remove('-translate-x-full');
    sidebarBackdrop.classList.remove('hidden');
}

function closeSettings() {
    settingsPanel.classList.add('translate-x-full');
}

function openSettings() {
    settingsPanel.classList.remove('translate-x-full');
}

function getActiveConversation() {
    return state.conversations.find((item) => item.id === state.activeConversationId) || null;
}

function updateConversationTitle(conversation, fallbackText) {
    if (!conversation) return;

    const alreadyNamed = conversation.title && conversation.title !== 'Nuevo chat';
    if (alreadyNamed) return;

    const base = (fallbackText || 'Nuevo chat').trim();
    conversation.title = base.length > 42 ? `${base.slice(0, 42)}...` : base;
}

function renderConversations() {
    const query = state.searchQuery.trim().toLowerCase();
    const filtered = state.conversations.filter((item) => {
        if (!query) return true;
        return item.title.toLowerCase().includes(query);
    });

    conversationList.innerHTML = '';

    if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'text-xs text-slate-500 px-2 py-4';
        empty.innerText = query ? 'No hay coincidencias.' : 'No hay chats guardados.';
        conversationList.appendChild(empty);
        return;
    }

    filtered.forEach((item) => {
        const row = document.createElement('div');
        row.className = `group rounded-xl px-2 py-2 border border-transparent hover:border-white/10 transition ${item.id === state.activeConversationId ? 'conversation-item-active' : 'bg-slate-900/40'}`;

        const contentBtn = document.createElement('button');
        contentBtn.className = 'w-full text-left';
        contentBtn.dataset.action = 'select';
        contentBtn.dataset.id = item.id;

        const title = document.createElement('p');
        title.className = 'text-sm text-slate-100 truncate';
        title.innerText = item.title || 'Nuevo chat';

        const meta = document.createElement('p');
        meta.className = 'text-[11px] text-slate-400 mt-1';
        meta.innerText = `${item.messages.length} mensajes · ${formatDateLabel(item.updatedAt)}`;

        const actions = document.createElement('div');
        actions.className = 'mt-2 flex justify-end';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-slate-500 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 transition';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.dataset.id = item.id;
        deleteBtn.innerText = 'Eliminar';

        contentBtn.appendChild(title);
        contentBtn.appendChild(meta);
        actions.appendChild(deleteBtn);
        row.appendChild(contentBtn);
        row.appendChild(actions);
        conversationList.appendChild(row);
    });
}

function renderMessages() {
    history.innerHTML = '';

    const active = getActiveConversation();
    if (!active || !active.messages.length) {
        const empty = document.createElement('p');
        empty.className = 'text-slate-500 text-sm text-center mt-10';
        empty.innerText = 'Inicia una conversacion para guardar memoria del chat.';
        history.appendChild(empty);
        return;
    }

    active.messages.forEach((message) => {
        const item = document.createElement('div');
        item.className = `p-4 rounded-2xl max-w-[85%] ${message.role === 'user' ? 'bg-blue-600 self-end text-white ml-auto' : 'bg-slate-800 self-start text-slate-200'}`;
        item.innerText = message.text;
        history.appendChild(item);
    });

    history.scrollTop = history.scrollHeight;
}

function appendMessage(role, text, persist = true) {
    const safeText = (text || '').trim();
    if (!safeText) return;

    const item = document.createElement('div');
    item.className = `p-4 rounded-2xl max-w-[85%] ${role === 'user' ? 'bg-blue-600 self-end text-white ml-auto' : 'bg-slate-800 self-start text-slate-200'}`;
    item.innerText = safeText;
    history.appendChild(item);
    history.scrollTop = history.scrollHeight;

    if (!persist) return;

    const active = getActiveConversation();
    if (!active) return;

    active.messages.push({
        id: uid(),
        role,
        text: safeText,
        createdAt: Date.now()
    });
    active.updatedAt = Date.now();

    if (role === 'user') {
        updateConversationTitle(active, safeText);
    }

    saveState();
    renderConversations();
}

function createConversation() {
    const conversation = {
        id: uid(),
        title: 'Nuevo chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    };

    state.conversations.unshift(conversation);
    state.activeConversationId = conversation.id;

    saveState();
    renderConversations();
    renderMessages();
}

function removeConversation(id) {
    state.conversations = state.conversations.filter((item) => item.id !== id);

    if (!state.conversations.length) {
        createConversation();
        return;
    }

    if (state.activeConversationId === id) {
        state.activeConversationId = state.conversations[0].id;
        renderMessages();
    }

    saveState();
    renderConversations();
}

function buildContextSummary(messages) {
    const recent = messages.slice(-20);
    if (!recent.length) return '';

    const transcript = recent.map((message) => {
        const speaker = message.role === 'user' ? 'Usuario' : 'Asistente';
        return `${speaker}: ${message.text}`;
    }).join('\n');

    return `Contexto de una conversacion previa. Usalo para continuidad sin responder a este mensaje:\n${transcript}`;
}

async function endCurrentSession() {
    if (!conversationSession || !conversationSession.isOpen()) return;

    try {
        await conversationSession.endSession();
    } catch (error) {
        console.error('Error cerrando sesion previa:', error);
    }

    conversationSession = null;
    sessionConversationId = null;
    micMuted = true;
}

function onModeChange(mode) {
    if (mode === 'speaking') {
        setStatus('Hablando...');
        setOrbListening(false);
        return;
    }

    if (settings.textOnly) {
        setStatus('Modo texto activo');
        setOrbListening(false);
        return;
    }

    if (!micMuted) {
        setStatus('Escuchando...');
        setOrbListening(true);
    } else {
        setStatus('Motor listo');
        setOrbListening(false);
    }
}

function onStatusChange(status) {
    if (status === 'connecting') {
        setStatus('Conectando...');
        return;
    }

    if (status === 'connected') {
        onModeChange('listening');
        return;
    }

    if (status === 'disconnecting') {
        setStatus('Desconectando...');
        return;
    }

    setStatus('Motor listo');
    setOrbListening(false);
}

async function ensureSession() {
    const active = getActiveConversation();
    if (!active) {
        createConversation();
    }

    const currentActive = getActiveConversation();
    if (!currentActive) return null;

    if (conversationSession && conversationSession.isOpen() && sessionConversationId === currentActive.id) {
        return conversationSession;
    }

    await endCurrentSession();

    if (!window.client || !window.client.Conversation) {
        throw new Error('SDK de ElevenLabs no cargado.');
    }

    conversationSession = await window.client.Conversation.startSession({
        agentId: AGENT_ID,
        textOnly: settings.textOnly,
        onConnect: () => {
            setStatus('Conectado');
        },
        onDisconnect: () => {
            micMuted = true;
            setStatus('Motor listo');
            setOrbListening(false);
        },
        onError: (message) => {
            setStatus('Error de conexion');
            console.error('ElevenLabs error:', message);
        },
        onStatusChange: ({ status }) => {
            onStatusChange(status);
        },
        onModeChange: ({ mode }) => {
            onModeChange(mode);
        },
        onMessage: ({ source, message }) => {
            const role = source === 'user' ? 'user' : 'assistant';

            if (role === 'user') {
                const sameMessage = message.trim() === userTypedCache;
                const recentLocalEcho = Date.now() - userTypedAt < 2500;
                if (sameMessage && recentLocalEcho) return;
            }

            appendMessage(role, message, true);
        }
    });

    sessionConversationId = currentActive.id;

    if (!settings.textOnly) {
        micMuted = !settings.autoListen;
        conversationSession.setMicMuted(micMuted);
    }

    const contextSummary = buildContextSummary(currentActive.messages);
    if (contextSummary) {
        conversationSession.sendContextualUpdate(contextSummary);
    }

    onModeChange('listening');
    return conversationSession;
}

async function selectConversation(id) {
    if (state.activeConversationId === id) {
        closeSidebar();
        return;
    }

    state.activeConversationId = id;
    saveState();
    renderConversations();
    renderMessages();
    closeSidebar();
    await endCurrentSession();
}

function syncSettingsUI() {
    settingTextOnly.checked = Boolean(settings.textOnly);
    settingAutoListen.checked = Boolean(settings.autoListen);
    setVoiceEnabled(!settings.textOnly);

    if (settings.textOnly) {
        setStatus('Modo texto activo');
        setOrbListening(false);
    }
}

function bootstrap() {
    loadSettings();
    loadState();

    if (!state.conversations.length) {
        createConversation();
    } else if (!state.activeConversationId || !getActiveConversation()) {
        state.activeConversationId = state.conversations[0].id;
        saveState();
    }

    syncSettingsUI();
    renderConversations();
    renderMessages();
}

conversationList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const actionEl = target.closest('[data-action][data-id]');
    if (!(actionEl instanceof HTMLElement)) return;

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;
    if (!action || !id) return;

    if (action === 'select') {
        await selectConversation(id);
        return;
    }

    if (action === 'delete') {
        const confirmed = window.confirm('Eliminar esta conversacion guardada?');
        if (!confirmed) return;

        await endCurrentSession();
        removeConversation(id);
        renderMessages();
    }
});

newChatBtn.addEventListener('click', async () => {
    await endCurrentSession();
    createConversation();
    closeSidebar();
});

chatSearch.addEventListener('input', () => {
    state.searchQuery = chatSearch.value || '';
    renderConversations();
});

clearChatsBtn.addEventListener('click', async () => {
    const confirmed = window.confirm('Borrar todo el historial local de chats?');
    if (!confirmed) return;

    await endCurrentSession();
    state.conversations = [];
    state.activeConversationId = null;
    saveState();
    createConversation();
});

sidebarToggle.addEventListener('click', () => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            openSidebar();
        } else {
            closeSidebar();
        }
        return;
    }

    sidebar.classList.toggle('desktop-collapsed');
});

sidebarBackdrop.addEventListener('click', () => {
    closeSidebar();
});

settingsToggle.addEventListener('click', () => {
    openSettings();
});

settingsClose.addEventListener('click', () => {
    closeSettings();
});

settingTextOnly.addEventListener('change', async () => {
    settings.textOnly = settingTextOnly.checked;
    saveSettings();
    syncSettingsUI();
    await endCurrentSession();
});

settingAutoListen.addEventListener('change', () => {
    settings.autoListen = settingAutoListen.checked;
    saveSettings();

    if (conversationSession && conversationSession.isOpen() && !settings.textOnly) {
        micMuted = !settings.autoListen;
        conversationSession.setMicMuted(micMuted);
        onModeChange('listening');
    }
});

chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const text = textInput.value.trim();
    if (!text) return;

    appendMessage('user', text, true);
    userTypedCache = text;
    userTypedAt = Date.now();
    textInput.value = '';

    try {
        const session = await ensureSession();
        if (!session) return;
        session.sendUserMessage(text);
    } catch (error) {
        console.error(error);
        appendMessage('assistant', 'No pude conectar con el agente. Revisa red o permisos de microfono.', true);
        setStatus('Error de conexion');
    }
});

textInput.addEventListener('input', () => {
    if (conversationSession && conversationSession.isOpen()) {
        conversationSession.sendUserActivity();
    }
});

voiceBtn.addEventListener('click', async () => {
    if (settings.textOnly) return;

    try {
        const session = await ensureSession();
        if (!session) return;

        micMuted = !micMuted;
        session.setMicMuted(micMuted);
        onModeChange('listening');
    } catch (error) {
        console.error(error);
        setStatus('Permiso de microfono requerido');
        setOrbListening(false);
    }
});

endConversationBtn.addEventListener('click', async () => {
    await endCurrentSession();
    setStatus(settings.textOnly ? 'Modo texto activo' : 'Conversacion finalizada');
    setOrbListening(false);
});

window.addEventListener('beforeunload', () => {
    if (conversationSession && conversationSession.isOpen()) {
        conversationSession.endSession().catch(() => {});
    }
});

bootstrap();
