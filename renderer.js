// Importamos el módulo ipcRenderer para comunicación con el proceso principal
const { ipcRenderer } = require('electron');

// Variables globales para el manejo de la aplicación
let videoStream = null;           // Stream de video de la cámara
let isCameraActive = false;       // Estado de la cámara
let isClickThrough = false;       // Estado del modo click-through
let isDragging = false;           // Estado de arrastre
let isResizing = false;           // Estado de redimensionamiento
let dragOffset = { x: 0, y: 0 };  // Offset para el arrastre

// Referencias a elementos del DOM
const video = document.getElementById('camera-video');
const toggleCameraBtn = document.getElementById('toggle-camera');
const toggleClickthroughBtn = document.getElementById('toggle-clickthrough');
const hideWindowBtn = document.getElementById('hide-window');
const statusText = document.getElementById('status-text');
const errorMessage = document.getElementById('error-message');
const bubbleContainer = document.getElementById('bubble-container');
const resizeHandle = document.getElementById('resize-handle');

/**
 * Función para inicializar la cámara
 * Solicita permisos y configura el stream de video
 */
async function initializeCamera() {
    try {
        updateStatus('Solicitando acceso a la cámara...');
        
        // Configuración de constraints para la cámara
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user' // Cámara frontal por defecto
            },
            audio: false // No necesitamos audio
        };
        
        // Solicitamos acceso a la cámara
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Asignamos el stream al elemento video
        video.srcObject = videoStream;
        
        // Esperamos a que el video esté listo
        video.onloadedmetadata = () => {
            video.play();
            isCameraActive = true;
            updateStatus('Cámara activa');
            updateCameraButton();
            hideError();
        };
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        handleCameraError(error);
    }
}

/**
 * Función para detener la cámara
 * Libera el stream y actualiza la UI
 */
function stopCamera() {
    if (videoStream) {
        // Detenemos todas las pistas del stream
        videoStream.getTracks().forEach(track => {
            track.stop();
        });
        videoStream = null;
    }
    
    // Limpiamos el elemento video
    video.srcObject = null;
    isCameraActive = false;
    updateStatus('Cámara desactivada');
    updateCameraButton();
}

/**
 * Función para alternar el estado de la cámara
 */
function toggleCamera() {
    if (isCameraActive) {
        stopCamera();
    } else {
        initializeCamera();
    }
}

/**
 * Función para alternar el modo click-through
 */
function toggleClickThrough() {
    isClickThrough = !isClickThrough;
    
    // Enviamos el comando al proceso principal
    ipcRenderer.send('toggle-click-through');
    
    updateClickThroughButton();
    updateStatus(isClickThrough ? 'Modo click-through activo' : 'Modo click-through desactivo');
}

/**
 * Función para ocultar la ventana
 */
function hideWindow() {
    // La ventana se ocultará automáticamente por el hotkey o el botón de cerrar
    window.close();
}

/**
 * Función para actualizar el texto de estado
 */
function updateStatus(message) {
    statusText.textContent = message;
}

/**
 * Función para actualizar el botón de cámara
 */
function updateCameraButton() {
    const icon = document.getElementById('camera-icon');
    if (isCameraActive) {
        toggleCameraBtn.classList.remove('camera-off');
        // icon.textContent = '📹';
        toggleCameraBtn.title = 'Desactivar cámara';
    } else {
        toggleCameraBtn.classList.add('camera-off');
        // icon.textContent = '📷';
        toggleCameraBtn.title = 'Activar cámara';
    }
}

/**
 * Función para actualizar el botón de click-through
 */
function updateClickThroughButton() {
    const icon = document.getElementById('clickthrough-icon');
    if (isClickThrough) {
        toggleClickthroughBtn.classList.add('active');
        // icon.textContent = '👻';
        document.body.classList.add('click-through');
    } else {
        toggleClickthroughBtn.classList.remove('active');
        // icon.textContent = '👆';
        document.body.classList.remove('click-through');
    }
}

/**
 * Función para manejar errores de cámara
 */
function handleCameraError(error) {
    let errorMsg = 'Error desconocido';
    
    switch (error.name) {
        case 'NotAllowedError':
            errorMsg = 'Permisos de cámara denegados';
            break;
        case 'NotFoundError':
            errorMsg = 'No se encontró cámara';
            break;
        case 'NotReadableError':
            errorMsg = 'Cámara en uso por otra aplicación';
            break;
        case 'OverconstrainedError':
            errorMsg = 'Configuración de cámara no soportada';
            break;
        default:
            errorMsg = `Error: ${error.message}`;
    }
    
    updateStatus(errorMsg);
    showError();
}

/**
 * Función para mostrar mensaje de error
 */
function showError() {
    errorMessage.style.display = 'flex';
    video.style.display = 'none';
}

/**
 * Función para ocultar mensaje de error
 */
function hideError() {
    errorMessage.style.display = 'none';
    video.style.display = 'block';
}

/**
 * Función para manejar el arrastre de la ventana
 * Permite mover la burbuja libremente por todo el escritorio
 */
function handleDrag(e) {
    if (isDragging) {
        // Calculamos la nueva posición basada en la posición del mouse
        const newX = e.screenX - dragOffset.x;
        const newY = e.screenY - dragOffset.y;
        
        // Enviamos la nueva posición al proceso principal para mover la ventana
        // Esto permite movimiento libre por todo el escritorio sin restricciones
        ipcRenderer.send('move-window', newX, newY);
    }
}

/**
 * Función para manejar el redimensionamiento
 */
function handleResize(e) {
    if (isResizing) {
        e.preventDefault();
        
        // Calculamos el nuevo tamaño basado en la posición del mouse
        const rect = bubbleContainer.getBoundingClientRect();
        const newSize = Math.max(100, Math.min(400, 
            Math.max(
                e.clientX - rect.left,
                e.clientY - rect.top
            )
        ));
        
        // Aplicamos el nuevo tamaño
        bubbleContainer.style.width = newSize + 'px';
        bubbleContainer.style.height = newSize + 'px';
        
        // Enviamos el nuevo tamaño al proceso principal
        ipcRenderer.send('resize-window', newSize, newSize);
    }
}

// Event Listeners para los botones
toggleCameraBtn.addEventListener('click', toggleCamera);
toggleClickthroughBtn.addEventListener('click', toggleClickThrough);
hideWindowBtn.addEventListener('click', hideWindow);

// Event Listeners para arrastre
bubbleContainer.addEventListener('mousedown', (e) => {
    if (e.target === resizeHandle) return; // No arrastrar si es el handle de resize
    
    // Evitamos arrastrar si se hace clic en los controles de la barra inferior
    if (e.target.closest('#bottom-controls-bar button')) return;
    
    isDragging = true;
    
    // Calculamos el offset relativo a la posición actual de la ventana
    const rect = bubbleContainer.getBoundingClientRect();
    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;
    
    // Agregamos clase visual para indicar que se está arrastrando
    bubbleContainer.style.cursor = 'grabbing';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        // Restauramos el cursor normal al terminar de arrastrar
        bubbleContainer.style.cursor = 'move';
    }
    
    isDragging = false;
    isResizing = false;
});

document.addEventListener('mousemove', (e) => {
    handleDrag(e);
    handleResize(e);
});

// Event Listeners para redimensionamiento
resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
});

// Event Listener para cambios en click-through desde el proceso principal
ipcRenderer.on('click-through-changed', (event, clickThroughState) => {
    isClickThrough = clickThroughState;
    updateClickThroughButton();
});

// Event Listeners para atajos de teclado locales
document.addEventListener('keydown', (e) => {
    // Ctrl+Alt+T para toggle click-through
    if (e.ctrlKey && e.altKey && e.key === 't') {
        e.preventDefault();
        toggleClickThrough();
    }
    
    // Espacio para toggle cámara
    if (e.code === 'Space') {
        e.preventDefault();
        toggleCamera();
    }
    
    // Escape para ocultar ventana
    if (e.key === 'Escape') {
        e.preventDefault();
        hideWindow();
    }
});

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    updateStatus('Iniciando aplicación...');
    updateCameraButton();
    updateClickThroughButton();
    setupDoubleClickToggle();
    
    // Inicializamos la cámara automáticamente
    setTimeout(() => {
        initializeCamera();
    }, 500);
});

// Funcionalidad de doble click para expandir/contraer la burbuja
function setupDoubleClickToggle() {
    const bubbleContainer = document.getElementById('bubble-container');
    
    bubbleContainer.addEventListener('dblclick', (e) => {
        e.preventDefault();
        bubbleContainer.classList.toggle('expanded');
    });
}

// Limpieza al cerrar la ventana
window.addEventListener('beforeunload', () => {
    if (videoStream) {
        stopCamera();
    }
});