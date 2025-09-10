// Importamos los módulos necesarios de Electron
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

// Variable para almacenar la referencia de la ventana principal
let mainWindow;

// Variable para controlar si la ventana está visible
let isVisible = true;

// Variable para controlar el modo click-through
let isClickThrough = false;

/**
 * Función para crear la ventana principal de la aplicación
 * Esta ventana será circular, flotante y siempre encima
 */
function createWindow() {
  // Creamos la ventana con configuraciones específicas
  mainWindow = new BrowserWindow({
    width: 300,              // Ancho inicial de la ventana (aumentado para mejor visualización de sombras)
    height: 380,             // Alto inicial de la ventana (aumentado para la barra inferior y sombras)
    frame: false,            // Sin marco de ventana (sin barra de título)
    transparent: true,       // Fondo transparente para forma circular
    alwaysOnTop: true,       // Siempre encima de otras ventanas
    resizable: true,         // Permite redimensionar
    movable: true,           // Permite mover la ventana libremente
    minimizable: false,      // No se puede minimizar
    maximizable: false,      // No se puede maximizar
    closable: true,          // Se puede cerrar
    skipTaskbar: true,       // No aparece en la barra de tareas
    hasShadow: false,        // Sin sombra para mejor rendimiento
    thickFrame: false,       // Sin marco grueso
    webPreferences: {
      nodeIntegration: true,        // Permite usar Node.js en el renderer
      contextIsolation: false,      // Desactiva aislamiento de contexto
      enableRemoteModule: true      // Permite módulo remoto
    },
    // Posición inicial en la esquina superior derecha
    x: 50,
    y: 50
  });

  // Cargamos el archivo HTML principal
  mainWindow.loadFile('index.html');

  // Configuramos el comportamiento al cerrar la ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Evitamos que la ventana se cierre completamente al hacer clic en X
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      isVisible = false;
    }
  });

  // La forma circular se maneja con CSS en lugar de setShape
  // que no está disponible en todas las versiones de Electron
}

/**
 * Función para alternar la visibilidad de la ventana
 * Se ejecuta cuando se presiona el hotkey Ctrl+Alt+H
 */
function toggleWindow() {
  if (mainWindow) {
    if (isVisible) {
      mainWindow.hide();
      isVisible = false;
    } else {
      mainWindow.show();
      mainWindow.focus();
      isVisible = true;
    }
  }
}

/**
 * Función para alternar el modo click-through
 * Permite que el mouse pase a través de la ventana
 */
function toggleClickThrough() {
  if (mainWindow) {
    isClickThrough = !isClickThrough;
    mainWindow.setIgnoreMouseEvents(isClickThrough);
    
    // Enviamos el estado al renderer para actualizar la UI
    mainWindow.webContents.send('click-through-changed', isClickThrough);
  }
}

// Evento que se ejecuta cuando Electron ha terminado de inicializarse
app.whenReady().then(() => {
  createWindow();

  // Registramos los atajos de teclado globales
  // Ctrl+Alt+H para mostrar/ocultar la ventana
  globalShortcut.register('CommandOrControl+Alt+H', () => {
    toggleWindow();
  });

  // Ctrl+Alt+T para alternar modo click-through
  globalShortcut.register('CommandOrControl+Alt+T', () => {
    toggleClickThrough();
  });

  // En macOS, es común recrear la ventana cuando se hace clic en el icono del dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Evento que se ejecuta cuando todas las ventanas están cerradas
app.on('window-all-closed', () => {
  // En macOS, las aplicaciones permanecen activas hasta que el usuario las cierra explícitamente
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento que se ejecuta antes de cerrar la aplicación
app.on('before-quit', () => {
  app.isQuiting = true;
});

// Limpiamos los atajos globales cuando la aplicación se cierra
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Manejadores IPC para comunicación con el renderer process
ipcMain.on('resize-window', (event, width, height) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
  }
});

ipcMain.on('move-window', (event, x, y) => {
  if (mainWindow) {
    // Movemos la ventana a la nueva posición
    // Esto permite arrastrar la burbuja por todo el escritorio sin restricciones
    mainWindow.setPosition(x, y);
  }
});

ipcMain.on('toggle-click-through', () => {
  toggleClickThrough();
});