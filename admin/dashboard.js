document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const adminContent = document.getElementById('admin-content');
    const errorMsg = document.getElementById('login-error');
    
    // CONFIGURACIÓN DE SEGURIDAD
    const AUTH_USER = "irenia";
    const AUTH_PASS = "irenia2026";
    const MAX_ATTEMPTS = 5;
    let attempts = 0;

    // 1. CAPA DE PERSISTENCIA: Verificar si ya habías entrado
    if (sessionStorage.getItem('irenia_admin_auth') === 'true') {
        showDashboard();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 2. CAPA DE RATE LIMITING: Bloqueo tras fallos
        if (attempts >= MAX_ATTEMPTS) {
            showError("SISTEMA BLOQUEADO POR SEGURIDAD. DEMASIADOS INTENTOS.");
            loginForm.querySelector('button').disabled = true;
            return;
        }

        const user = document.getElementById('admin-user').value;
        const pass = document.getElementById('admin-pass').value;

        if (user === AUTH_USER && pass === AUTH_PASS) {
            // ÉXITO
            sessionStorage.setItem('irenia_admin_auth', 'true');
            logActivity("Acceso exitoso");
            showDashboard();
        } else {
            // ERROR
            attempts++;
            logActivity(`Intento fallido #${attempts} - User: ${user}`);
            showError(`Acceso Denegado (${attempts}/${MAX_ATTEMPTS})`);
            document.getElementById('admin-pass').value = "";
        }
    });

    function showDashboard() {
        loginScreen.classList.add('opacity-0');
        setTimeout(() => {
            loginScreen.classList.add('hidden');
            adminContent.classList.remove('hidden');
            // Animación de entrada suave
            adminContent.classList.add('animate-fade-in');
        }, 300);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 4000);
    }

    // 3. CAPA DE LOGS: (Simulada para consola)
    function logActivity(action) {
        const timestamp = new Date().toLocaleString();
        console.log(`[SECURITY LOG] [${timestamp}] : ${action}`);
        // Aquí podrías enviar este log a una base de datos en el futuro
    }
});
