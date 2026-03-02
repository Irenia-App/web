// apps/chat/chat.js (VERSIÓN FINAL COMPLETA)
const agentId = 'agent_9601kcrjbe74f08bhzgewfa2fcxw';
let conversation = null;

const voiceBtn = document.getElementById('voice-trigger');
const sendBtn = document.getElementById('send-btn');
const textInput = document.getElementById('text-input');
const chatHistory = document.getElementById('conversation-history');
const statusLabel = document.getElementById('status-text');

// Helper para mostrar mensajes en pantalla
function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = role === 'user' ? "text-blue-400 font-medium" : "text-white italic";
    div.innerHTML = `<span class="opacity-50 text-[10px] uppercase block">${role === 'user' ? 'Tú' : 'Irenia'}</span> ${text}`;
    chatHistory.appendChild(div);
    const box = document.getElementById('transcript-box');
    box.scrollTop = box.scrollHeight;
}

async function handleVoice() {
    try {
        if (!conversation) {
            statusLabel.innerText = "Conectando...";
            
            // 1. Obtener datos del usuario logueado para personalización
            const { data: { user }, error: userError } = await _supabase.auth.getUser();
            
            // Si no hay usuario (sesión expirada), redirigir a login
            if (userError || !user) {
                window.location.replace("login.html");
                return;
            }

            const userName = user.user_metadata?.full_name || "Paciente";
            const userPhone = user.user_metadata?.phone || "No vinculado";

            // 2. Iniciar sesión con Eleven Labs
            conversation = await ElevenLabsClient.Conversation.startSession({
                agentId: agentId,
                // Inyectamos el contexto del usuario para que el Agente sepa con quién habla
                clientData: {
                    user_name: userName,
                    user_phone: userPhone
                },
                onConnect: () => { 
                    statusLabel.innerText = "Irenia escucha..."; 
                    voiceBtn.classList.add('orb-listening');
                    console.log(`Conectado como: ${userName}`);
                },
                onDisconnect: () => { 
                    statusLabel.innerText = "Motor Listo"; 
                    voiceBtn.classList.remove('orb-listening'); 
                    conversation = null; 
                },
                onMessage: (msg) => { 
                    addMessage(msg.role === 'user' ? 'user' : 'ai', msg.message); 
                },
                onError: (err) => {
                    console.error("Error de ElevenLabs:", err);
                    statusLabel.innerText = "Error de voz";
                }
            });
        } else { 
            await conversation.endSession(); 
        }
    } catch (err) { 
        console.error("Fallo crítico:", err);
        statusLabel.innerText = "Error de conexión"; 
    }
}

// Event Listeners
voiceBtn.addEventListener('click', handleVoice);

sendBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text && conversation) { 
        conversation.sendText(text); 
        textInput.value = ''; 
    } else if (text && !conversation) {
        alert("Primero activa a Irenia pulsando el micrófono.");
    }
});

document.getElementById('stop-btn').addEventListener('click', () => { 
    if (conversation) conversation.endSession(); 
});