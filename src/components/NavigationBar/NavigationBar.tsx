// src/components/NavigationBar/NavigationBar.tsx
import { createSignal } from 'solid-js';
import './NavigationBar.css';

const NavigationBar = () => {
  const [isDarkMode, setIsDarkMode] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [isDraggable, setIsDraggable] = createSignal(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode());
    document.body.classList.toggle('dark-mode', !isDarkMode());
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails());
  };

  const toggleDragMode = () => {
    setIsDraggable(!isDraggable());
  };

  return (
    <div class={`navigation-container ${isDarkMode() ? 'dark-mode' : ''}`}>
      <div class="navigation-bar">
        
        {/* Sección: Cargar Esquema */}
        <div class="nav-section">
          <button class="btn btn-primary btn-medium">
            <i class="bi bi-cloud-upload"></i>
            Cargar Esquema
          </button>
        </div>

        {/* Sección: Nueva Entidad */}
        <div class="nav-section">
          <button class="btn btn-success btn-medium">
            <i class="bi bi-plus-circle"></i>
            Nueva Entidad
          </button>
        </div>

        {/* Sección: Búsqueda */}
        <div class="nav-section search-section">
          <div class="search-box">
            <div class="search-container">
              <input
                type="text"
                class="search-input"
                placeholder="Buscar tablas por nombre..."
              />
              <button class="search-button" title="Buscar">
                <i class="bi bi-search"></i>
              </button>
              
              <div class="search-navigation">
                <button class="nav-arrow" title="Resultado anterior">
                  <i class="bi bi-chevron-up"></i>
                </button>
                <button class="nav-arrow" title="Resultado siguiente">
                  <i class="bi bi-chevron-down"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Controles del Mapa */}
        <div class="nav-section map-controls">
          <button 
            class={`icon-btn icon-btn-primary icon-btn-medium ${isDraggable() ? 'active' : ''}`}
            onClick={toggleDragMode}
            title={isDraggable() ? "Modo mover" : "Modo seleccionar"}
          >
            <i class={isDraggable() ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" title="Zoom +">
            <i class="bi bi-zoom-in"></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" title="Zoom -">
            <i class="bi bi-zoom-out"></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" title="Centrar vista">
            <i class="bi bi-fullscreen"></i>
          </button>
        </div>

        {/* Sección: Controles de Utilidad */}
        <div class="nav-section utility-controls">
          <button 
            class={`toggle-btn toggle-btn-primary toggle-btn-medium ${isDarkMode() ? 'active' : ''}`}
            onClick={toggleDarkMode}
            title={isDarkMode() ? "Modo claro" : "Modo oscuro"}
          >
            <i class={isDarkMode() ? "bi bi-sun-fill" : "bi bi-moon-fill"}></i>
          </button>
          
          <button 
            class={`toggle-btn toggle-btn-secondary toggle-btn-medium ${showDetails() ? 'active' : ''}`}
            onClick={toggleDetails}
            title={showDetails() ? "Ocultar detalles" : "Mostrar detalles"}
          >
            <i class={showDetails() ? "bi bi-eye-fill" : "bi bi-eye"}></i>
          </button>

          <button class="icon-btn icon-btn-primary icon-btn-medium" title="Exportar">
            <i class="bi bi-download"></i>
          </button>

          <button class="icon-btn icon-btn-primary icon-btn-medium" title="Ayuda">
            <i class="bi bi-question-circle"></i>
          </button>
        </div>

      </div>

      {/* Panel de Detalles */}
      {showDetails() && (
        <div class="details-panel">
          <h4><i class="bi bi-diagram-3"></i> Diagrama Entidad-Relación</h4>
          <p>Visualización de tablas y sus relaciones basada en el esquema cargado.</p>
          <div class="stats">
            <div class="stat">
              <i class="bi bi-table"></i>
              <span>0 Tablas</span>
            </div>
            <div class="stat">
              <i class="bi bi-link-45deg"></i>
              <span>0 Relaciones</span>
            </div>
            <div class="stat">
              <i class="bi bi-list-check"></i>
              <span>0 Campos</span>
            </div>
            <div class={`stat mode-stat ${isDraggable() ? 'tables' : 'select'}`}>
              <i class={isDraggable() ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
              <span>{isDraggable() ? "Modo Mover" : "Modo Seleccionar"}</span>
            </div>
          </div>
          
          <div class="quick-actions">
            <h5><i class="bi bi-lightning"></i> Acciones Rápidas</h5>
            <div class="action-buttons">
              <button class="btn btn-outline btn-small">
                <i class="bi bi-arrow-clockwise"></i> Actualizar
              </button>
              <button class="btn btn-outline btn-small">
                <i class="bi bi-trash"></i> Limpiar
              </button>
              <button class="btn btn-outline btn-small">
                <i class="bi bi-layers"></i> Organizar
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default NavigationBar;