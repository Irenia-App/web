// apps/chat/auth.js

// Función para capturar parámetros de la URL
function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    const phoneInput = document.getElementById('phone');
    
    if (phoneParam && phoneInput) {
        phoneInput.value = phoneParam;
        // Opcional: hacerlo de solo lectura si viene de WhatsApp
        phoneInput.readOnly = true; 
        phoneInput.classList.add('opacity-50');
    }
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', checkURLParams)

async function sessionGuard() {
    // Evita errores si Supabase no ha cargado
    if (typeof _supabase === 'undefined') return;

    // Obtenemos la sesión actual
    const { data: { session } } = await _supabase.auth.getSession();
    
    // Normalizamos la ruta actual
    const path = window.location.pathname.toLowerCase();
    
    // Definimos qué se considera "Página Principal" y qué "Página de Acceso"
    // Esto incluye "/", "/index.html" y variantes del servidor
    const isMainPage = path === '/' || path.endsWith('/') || path.includes('index.html');
    const isAuthPage = path.includes('login.html') || path.includes('register.html');

    // CASO 1: Hay sesión activa pero el usuario está en Login o Registro
    if (session && isAuthPage) {
        console.log("Sesión detectada, redirigiendo al panel...");
        window.location.replace("index.html");
        return;
    }

    // CASO 2: NO hay sesión y el usuario intenta entrar a la aplicación (Raíz o Index)
    if (!session && isMainPage) {
        console.log("Sin sesión, redirigiendo a login...");
        window.location.replace("login.html");
        return;
    }
}

// Ejecutamos la guardia de sesión
sessionGuard();

// --- Lógica de Formularios ---

// Manejo de Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        submitBtn.disabled = true;
        submitBtn.innerText = "Verificando...";

        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            alert("Error de acceso: " + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "INGRESAR";
        } else {
            // Usamos replace para no ensuciar el historial con el formulario de login
            window.location.replace("index.html");
        }
    });
}

// Manejo de Registro
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const phone = document.getElementById('phone').value; // <--- Capturamos el valor del nuevo input

        submitBtn.disabled = true;
        submitBtn.innerText = "Registrando...";

        // Modificamos el signUp para incluir el teléfono en los metadatos
        const { error } = await _supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    phone: phone, // <--- Aquí se guarda el teléfono en Supabase Auth
                    full_name: "" // Puedes añadir más campos si los necesitas
                }
            }
        });
        
        if (error) {
            alert("Error en registro: " + error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Comenzar ahora";
        } else {
            alert("¡Registro exitoso! Por favor revisa tu correo para confirmar la cuenta.");
            window.location.replace("login.html");
        }
    });
}