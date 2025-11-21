// src/components/NavigationBar/DiagramDetailsPanel.tsx
import { Show } from 'solid-js';

interface DiagramDetailsPanelProps {
  showDetails: boolean;
  tablesCount: number;
  relationsCount: number;
  fieldConnectionsCount: number;
  isDraggable: boolean;
  scale: number;
  isConnecting: boolean;
  searchInfo: {
    hasResults: boolean;
    results: number;
  };
}

const DiagramDetailsPanel = (props: DiagramDetailsPanelProps) => {
  return (
    <Show when={props.showDetails}>
      <div class="details-panel">
        <h4><i class="bi bi-diagram-3"></i> Diagrama Entidad-Relación</h4>
        <p>Visualización interactiva de tablas y sus relaciones usando JointJS</p>
        <div class="stats">
          <div class="stat">
            <i class="bi bi-table"></i>
            <span>{props.tablesCount} Tablas</span>
          </div>
          <div class="stat">
            <i class="bi bi-link-45deg"></i>
            <span>{props.relationsCount} Relaciones</span>
          </div>
          <div class="stat">
            <i class="bi bi-arrows-angle-contract"></i>
            <span>{props.fieldConnectionsCount} Conexiones Campo-a-Campo</span>
          </div>
          <div class={`stat mode-stat ${props.isDraggable ? 'tables' : 'select'}`}>
            <i class={props.isDraggable ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
            <span>{props.isDraggable ? "Modo Mover" : "Modo Seleccionar"}</span>
          </div>
          <div class="stat">
            <i class="bi bi-zoom-in"></i>
            <span>Zoom: {Math.round(props.scale * 100)}%</span>
          </div>
          <Show when={props.isConnecting}>
            <div class="stat connecting-stat">
              <i class="bi bi-link-45deg"></i>
              <span>Modo Conexión Activo</span>
            </div>
          </Show>
          <Show when={props.searchInfo.hasResults}>
            <div class="stat search-stat">
              <i class="bi bi-search"></i>
              <span>
                {props.searchInfo.results} resultado{props.searchInfo.results !== 1 ? 's' : ''}
              </span>
            </div>
          </Show>
        </div>
        <Show when={props.isConnecting}>
          <div class="connection-hint">
            <i class="bi bi-info-circle"></i>
            <span>Arrastra desde un campo ID (🔴) a otro campo para crear una relación. Presiona ESC para cancelar.</span>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default DiagramDetailsPanel;