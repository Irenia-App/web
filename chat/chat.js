const history = document.getElementById('conversation-history');
const chatForm = document.getElementById('chat-form');
const textInput = document.getElementById('text-input');
const voiceBtn = document.getElementById('voice-trigger');
const statusText = document.getElementById('status-text');

const AGENT_ID = 'agent_0501kk824pheffhtf28ehae8ddqs';

let conversation = null;
let micMuted = true;
let userTypedCache = '';
let userTypedAt = 0;

function addMessage(role, text) {
    const safeText = (text || '').trim();
    if (!safeText) return;

    const msg = document.createElement('div');
    msg.className = `p-4 rounded-2xl max-w-[80%] ${role === 'user' ? 'bg-blue-600 self-end text-white ml-auto' : 'bg-slate-800 self-start text-slate-200'}`;
    msg.innerText = safeText;
    history.appendChild(msg);
    history.scrollTop = history.scrollHeight;
}

function setStatus(text) {
    statusText.innerText = text;
}

function setOrbListening(active) {
    voiceBtn.classList.toggle('orb-listening', Boolean(active));
}

function onModeChange(mode) {
    if (mode === 'speaking') {
        setStatus('Hablando...');
        setOrbListening(false);
        return;
    }

    if (!micMuted) {
        setStatus('Escuchando...');
        setOrbListening(true);
    } else {
        setStatus('Motor Listo');
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

    setStatus('Motor Listo');
    setOrbListening(false);
}

async function ensureSession() {
    if (conversation && conversation.isOpen()) {
        return conversation;
    }

    if (!window.client || !window.client.Conversation) {
        throw new Error('SDK de ElevenLabs no cargado.');
    }

    conversation = await window.client.Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
            setStatus('Conectado');
        },
        onDisconnect: () => {
            micMuted = true;
            setStatus('Motor Listo');
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

            // Avoid duplicating text messages already rendered from local submit.
            if (role === 'user') {
                const sameMessage = message.trim() === userTypedCache;
                const recentLocalEcho = Date.now() - userTypedAt < 2500;
                if (sameMessage && recentLocalEcho) return;
            }

            addMessage(role, message);
        }
    });

    conversation.setMicMuted(micMuted);
    return conversation;
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const text = textInput.value.trim();
        if (!text) return;

        addMessage('user', text);
        userTypedCache = text;
        userTypedAt = Date.now();
        textInput.value = '';

        try {
            const session = await ensureSession();
            session.sendUserMessage(text);
        } catch (error) {
            console.error(error);
            addMessage('assistant', 'No pude conectar con el agente. Revisa permisos de microfono y red.');
            setStatus('Error de conexion');
        }
    });
}

if (textInput) {
    textInput.addEventListener('input', () => {
        if (conversation && conversation.isOpen()) {
            conversation.sendUserActivity();
        }
    });
}

if (voiceBtn) {
    voiceBtn.addEventListener('click', async () => {
        try {
            const session = await ensureSession();
            micMuted = !micMuted;
            session.setMicMuted(micMuted);
            onModeChange('listening');
        } catch (error) {
            console.error(error);
            setStatus('Permiso de microfono requerido');
            setOrbListening(false);
        }
    });
}
