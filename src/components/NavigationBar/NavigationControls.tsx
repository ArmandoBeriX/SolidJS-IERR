// src/components/NavigationBar/NavigationControls.tsx
import { createSignal } from 'solid-js';
import type { JSX } from 'solid-js';

interface NavigationControlsProps {
  onFileUpload: (event: Event) => void;
  onCreateEntity: () => void;
  onSearch: (term: string) => void;
  onPreviousResult: () => void;
  onNextResult: () => void;
  onToggleDragMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterView: () => void;
  onResetZoom: () => void;
  onToggleDarkMode: () => void;
  onToggleDetails: () => void;
  isDarkMode: boolean;
  isDraggable: boolean;
  showDetails: boolean;
  searchTerm: string;
  searchInfo: {
    hasResults: boolean;
    currentIndex: number;
    results: number;
  };
  isLoading: boolean;
}

const NavigationControls = (props: NavigationControlsProps) => {
  const [localSearchTerm, setLocalSearchTerm] = createSignal(props.searchTerm);

  const handleSearchInput = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    const value = target.value;
    setLocalSearchTerm(value);
    props.onSearch(value);
  };

  const handleFileInputChange = (e: Event) => {
    props.onFileUpload(e);
  };

  return (
    <div class="navigation-bar">
      <div class="nav-section">
        <label class="btn btn-primary" style={{ cursor: 'pointer' }}>
          <input 
            type="file" 
            accept=".json,.txt" 
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
            disabled={props.isLoading}
          />
          <i class="bi bi-upload"></i>
          {props.isLoading ? 'Cargando...' : 'Cargar Esquema'}
        </label>
      </div>

      <div class="nav-section">
        <button 
          class="btn btn-success"
          onClick={props.onCreateEntity}
          title="Crear nueva entidad/tabla vacía"
          type="button"
        >
          <i class="bi bi-plus-circle"></i>
          Nueva Tabla
        </button>
      </div>

      <div class="nav-section search-section">
        <div class="search-container">
          <input
            type="text"
            class="search-input"
            placeholder="Buscar tablas por nombre..."
            value={localSearchTerm()}
            onInput={handleSearchInput}
          />
          <div class="search-navigation">
            <button 
              class="nav-arrow" 
              onClick={props.onPreviousResult} 
              title="Resultado anterior"
              type="button"
            >
              <i class="bi bi-chevron-up"></i>
            </button>
            <button 
              class="nav-arrow" 
              onClick={props.onNextResult} 
              title="Siguiente resultado"
              type="button"
            >
              <i class="bi bi-chevron-down"></i>
            </button>
          </div>
        </div>
        {props.searchInfo.hasResults && (
          <div class="search-results-indicator">
            <span class="search-results-text">
              {props.searchInfo.currentIndex + 1} de {props.searchInfo.results}
            </span>
          </div>
        )}
      </div>

      <div class="nav-section map-controls">
        <button
          class={`control-button ${props.isDraggable ? 'active' : ''}`}
          onClick={props.onToggleDragMode}
          title={props.isDraggable ? "Modo mover (arrastrar tablas y canvas)" : "Modo seleccionar (solo navegación)"}
          type="button"
        >
          <i class={props.isDraggable ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
        </button>

        <button 
          class="control-button" 
          onClick={props.onZoomIn} 
          title="Zoom +"
          type="button"
        >
          <i class="bi bi-zoom-in"></i>
        </button>
        <button 
          class="control-button" 
          onClick={props.onZoomOut} 
          title="Zoom -"
          type="button"
        >
          <i class="bi bi-zoom-out"></i>
        </button>
        <button 
          class="control-button" 
          onClick={props.onCenterView} 
          title="Centrar vista"
          type="button"
        >
          <i class="bi bi-fullscreen"></i>
        </button>
        <button 
          class="control-button" 
          onClick={props.onResetZoom} 
          title="Resetear zoom"
          type="button"
        >
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
      </div>

      <div class="nav-section utility-controls">
        <button
          class={`control-button ${props.isDarkMode ? 'active' : ''}`}
          onClick={props.onToggleDarkMode}
          title={props.isDarkMode ? "Modo claro" : "Modo oscuro"}
          type="button"
        >
          <i class={props.isDarkMode ? "bi bi-sun" : "bi bi-moon"}></i>
        </button>
        
        <button
          class={`control-button ${props.showDetails ? 'active' : ''}`}
          onClick={props.onToggleDetails}
          title={props.showDetails ? "Ocultar detalles" : "Mostrar detalles"}
          type="button"
        >
          <i class={props.showDetails ? "bi bi-info-circle-fill" : "bi bi-info-circle"}></i>
        </button>
      </div>
    </div>
  );
};

export default NavigationControls;