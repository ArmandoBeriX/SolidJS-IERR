// src/components/EntityRelationshipDiagram/EntityNode.tsx
import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import './EntityNode.css';
import FieldNode from './FieldNode';

// Definición de tipos exportados
export interface TableField {
  id: number;
  tableId: number;
  identifier: string;
  name: string;
  fieldFormat: string;
  multiple: boolean;
  isRequired: boolean;
  isFilter: boolean;
  isUnique: boolean;
  default: any;
  relationTableIdentifier: string | null;
  isEditable: boolean;
  isVisible: boolean;
  position: number;
  description: string | null;
  storeData: Record<string, any>;
  history: boolean;
}

export interface TableData {
  id: number;
  identifier: string;
  name: string;
  description: string;
  x?: number;
  y?: number;
  tableFields?: TableField[];
}

interface EntityNodeProps {
  table: TableData;
  isHighlighted?: boolean;
  isSearchResult?: boolean;
  isSelected?: boolean;
  onEditField?: (tableId: number, field: TableField, tableName: string) => void;
  onAddField?: (tableId: number, field: TableField | null, tableName: string) => void;
  onEditEntity?: (tableId: number, entity: TableData) => void;
  onSelect?: (tableId: number) => void;
  onPositionChange?: (tableId: number, x: number, y: number) => void;
  onConnectionStart?: (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => void;
  onConnectionEnd?: (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => void;
  position?: { x: number; y: number };
  isDraggable?: boolean;
  showFieldHandles?: boolean;
  isConnecting?: boolean;
}

const EntityNode = (props: EntityNodeProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const [isExpanded, setIsExpanded] = createSignal(true);
  const [isDragging, setIsDragging] = createSignal(false);
  const [currentPosition, setCurrentPosition] = createSignal({ 
    x: props.position?.x || 0, 
    y: props.position?.y || 0 
  });

  let nodeRef: HTMLDivElement | undefined;
  let dragStartPosition = { x: 0, y: 0 };
  let initialPosition = { x: 0, y: 0 };

  // Actualizar posición cuando cambian las props
  createEffect(() => {
    if (props.position && !isDragging()) {
      setCurrentPosition(props.position);
    }
  });

  // Función para iniciar el arrastre
  const handleDragStart = (e: MouseEvent) => {
    if (!props.isDraggable) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(true);
    
    // Guardar posición inicial del mouse y del elemento
    const rect = nodeRef!.getBoundingClientRect();
    initialPosition = {
      x: rect.left,
      y: rect.top
    };
    
    dragStartPosition = {
      x: e.clientX,
      y: e.clientY
    };

    // Agregar event listeners globales
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Estilos durante el arrastre
    if (nodeRef) {
      nodeRef.style.zIndex = '1000';
      nodeRef.style.cursor = 'grabbing';
      nodeRef.style.transition = 'none';
    }
  };

  // Función para manejar el arrastre
  const handleDrag = (e: MouseEvent) => {
    if (!isDragging()) return;

    // Calcular nueva posición basada en el movimiento del mouse
    const deltaX = e.clientX - dragStartPosition.x;
    const deltaY = e.clientY - dragStartPosition.y;

    const newX = currentPosition().x + deltaX;
    const newY = currentPosition().y + deltaY;

    setCurrentPosition({ x: newX, y: newY });
    
    // Actualizar posición de inicio para el próximo movimiento
    dragStartPosition = {
      x: e.clientX,
      y: e.clientY
    };
    
    // Actualizar posición en tiempo real
    if (props.onPositionChange) {
      props.onPositionChange(props.table.id, newX, newY);
    }
  };

  // Función para finalizar el arrastre
  const handleDragEnd = () => {
    if (!isDragging()) return;

    setIsDragging(false);
    
    // Remover event listeners
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // Restaurar estilos
    if (nodeRef) {
      nodeRef.style.cursor = 'grab';
      nodeRef.style.zIndex = props.isSelected ? '10' : (props.isHighlighted ? '5' : '1');
      nodeRef.style.transition = 'all 0.3s ease';
    }

    // Guardar posición final
    if (props.onPositionChange) {
      props.onPositionChange(props.table.id, currentPosition().x, currentPosition().y);
    }
  };

  // Cleanup de event listeners
  onCleanup(() => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  });

  // Función para manejar clic en el header de la entidad
  const handleEntityClick = (e: MouseEvent) => {
    if (isDragging()) return;
    
    e.stopPropagation();
    console.log('🏢 Editando entidad:', props.table.id, props.table.name);
    
    if (props.onEditEntity) {
      props.onEditEntity(props.table.id, props.table);
    }
  };

  // NUEVO: Función para manejar clic en agregar campo
  const handleAddFieldClick = (e: MouseEvent) => {
    e.stopPropagation();
    console.log('➕ Agregando campo a tabla:', props.table.id, props.table.name);
    
    if (props.onAddField) {
      props.onAddField(props.table.id, null, props.table.name);
    }
  };

  // Función para manejar clic en un campo (pasada a FieldNode)
  const handleFieldClick = (tableId: number, field: TableField, tableName: string) => {
    console.log('✏️ Editando campo desde FieldNode:', field.name, 'en tabla:', tableId);
    
    if (props.onEditField) {
      props.onEditField(tableId, field, tableName);
    }
  };

  // Función para manejar inicio de conexión desde un campo
  const handleConnectionStart = (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => {
    console.log('🔗 Iniciando conexión desde:', tableIdentifier, field.name);
    
    if (props.onConnectionStart) {
      props.onConnectionStart(tableId, field, tableIdentifier, x, y);
    }
  };

  // Función para manejar fin de conexión en un campo
  const handleConnectionEnd = (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => {
    console.log('🔗 Finalizando conexión en:', tableIdentifier, field.name);
    
    if (props.onConnectionEnd) {
      props.onConnectionEnd(tableId, field, tableIdentifier, x, y);
    }
  };

  // Función para manejar selección de la entidad
  const handleSelect = (e: MouseEvent) => {
    if (isDragging()) return;
    
    e.stopPropagation();
    if (props.onSelect) {
      props.onSelect(props.table.id);
    }
  };

  // Contar relaciones
  const countRelations = () => {
    return props.table.tableFields?.filter(f => f.fieldFormat === 'relation').length || 0;
  };

  // Obtener estilos dinámicos para el nodo
  const getNodeStyles = (): JSX.CSSProperties => {
    const baseStyles: JSX.CSSProperties = {
      'background': 'var(--panel-bg)',
      'border': props.isSearchResult ? '3px solid #ffc107' : 
                props.isHighlighted ? '3px solid #0d6efd' : 
                props.isSelected ? '3px solid #28a745' : '2px solid #0d6efd',
      'border-radius': '8px',
      'box-shadow': isDragging() ? '0 8px 25px rgba(0,0,0,0.3)' : 
                    props.isSearchResult ? '0 4px 20px rgba(255, 193, 7, 0.4)' : 
                    props.isHighlighted ? '0 4px 20px rgba(13, 110, 253, 0.3)' : 
                    props.isSelected ? '0 4px 20px rgba(40, 167, 69, 0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
      'width': '320px',
      'font-family': 'Arial, sans-serif',
      'overflow': 'hidden',
      'transition': isDragging() ? 'none' : 'all 0.3s ease',
      'cursor': props.isDraggable ? (isDragging() ? 'grabbing' : 'grab') : 'pointer',
      'position': 'absolute',
      'left': `${currentPosition().x}px`,
      'top': `${currentPosition().y}px`,
      'z-index': isDragging() ? '1000' : (props.isSelected ? '10' : (props.isHighlighted ? '5' : '1')),
      'transform': isDragging() ? 'rotate(1deg) scale(1.02)' : 'none'
    };

    if (props.isSearchResult) {
      baseStyles.background = 'rgba(255, 193, 7, 0.05)';
    } else if (props.isHighlighted) {
      baseStyles.background = 'rgba(13, 110, 253, 0.1)';
    } else if (props.isSelected) {
      baseStyles.background = 'rgba(40, 167, 69, 0.1)';
    }

    return baseStyles;
  };

  // Clases CSS dinámicas
  const getNodeClasses = () => {
    const classes = ['entity-node'];
    if (isDragging()) classes.push('dragging');
    if (props.isSelected) classes.push('selected');
    if (props.isHighlighted) classes.push('highlighted');
    if (props.isSearchResult) classes.push('search-result');
    if (props.isConnecting) classes.push('connecting');
    return classes.join(' ');
  };

  return (
    <div 
      ref={nodeRef}
      class={getNodeClasses()}
      style={getNodeStyles()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelect}
    >
      {/* Header de la entidad - Área de arrastre */}
      <EntityHeader 
        table={props.table}
        isSearchResult={props.isSearchResult}
        onEntityClick={handleEntityClick}
        onDragStart={handleDragStart}
        isHovered={isHovered()}
        isDraggable={props.isDraggable}
        isDragging={isDragging()}
      />
      
      {/* Descripción de la entidad */}
      <Show when={props.table.description}>
        <EntityDescription 
          description={props.table.description!}
          isSearchResult={props.isSearchResult}
        />
      </Show>

      {/* Campos de la entidad - AHORA CON FieldNode */}
      <Show when={isExpanded()}>
        <EntityFields 
          fields={props.table.tableFields || []}
          tableId={props.table.id}
          tableName={props.table.name}
          tableIdentifier={props.table.identifier}
          onFieldClick={handleFieldClick}
          onConnectionStart={handleConnectionStart}
          onConnectionEnd={handleConnectionEnd}
          showHandles={props.showFieldHandles || false}
          isConnecting={props.isConnecting || false}
        />
      </Show>

      {/* NUEVO: Botón para agregar campo */}
      <AddFieldButton 
        onAddField={handleAddFieldClick}
        tableName={props.table.name}
        isHovered={isHovered()}
      />
      
      {/* Footer con estadísticas */}
      <EntityFooter 
        fields={props.table.tableFields || []}
        relationsCount={countRelations()}
      />

      {/* Indicador de arrastre */}
      <Show when={isDragging()}>
        <div class="drag-indicator">
          <i class="bi bi-arrows-move"></i>
          Arrastrando...
        </div>
      </Show>
    </div>
  );
};

// Componente para el Header de la entidad
const EntityHeader = (props: { 
  table: TableData; 
  isSearchResult?: boolean;
  onEntityClick: (e: MouseEvent) => void;
  onDragStart: (e: MouseEvent) => void;
  isHovered: boolean;
  isDraggable?: boolean;
  isDragging?: boolean;
}) => {
  const getHeaderStyles = (): JSX.CSSProperties => ({
    'background': props.isSearchResult ? '#ffc107' : 
                  props.isHovered ? '#0b5ed7' : '#0d6efd',
    'color': 'white',
    'padding': '12px 16px',
    'font-weight': 'bold',
    'font-size': '16px',
    'border-bottom': '2px solid #0b5ed7',
    'cursor': props.isDraggable ? (props.isDragging ? 'grabbing' : 'grab') : 'pointer',
    'transition': 'all 0.2s ease',
    'user-select': 'none'
  });

  return (
    <div 
      style={getHeaderStyles()}
      onClick={props.onEntityClick}
      onMouseDown={props.onDragStart}
      title={props.isDraggable ? "Arrastrar para mover - Click para editar" : "Click para editar la entidad"}
    >
      <div>{props.table.name}</div>
      <div style={{ 'font-size': '12px', 'opacity': 0.9, 'margin-top': '4px', 'font-style': 'italic' }}>
        {props.table.identifier}
      </div>
      <Show when={props.isSearchResult}>
        <div style={{ 
          'font-size': '10px', 
          'margin-top': '2px',
          'background': 'rgba(255,255,255,0.2)',
          'padding': '2px 6px',
          'border-radius': '3px',
          'display': 'inline-block'
        }}>
          🔍 Resultado de búsqueda
        </div>
      </Show>
    </div>
  );
};

// Componente para la Descripción de la entidad
const EntityDescription = (props: { 
  description: string; 
  isSearchResult?: boolean;
}) => {
  const styles: JSX.CSSProperties = {
    'padding': '8px 16px',
    'background': props.isSearchResult ? 'rgba(255, 193, 7, 0.1)' : 'rgba(13, 110, 253, 0.1)',
    'border-bottom': '1px solid #ddd',
    'font-size': '12px',
    'color': '#495057'
  };

  return (
    <div style={styles}>
      {props.description}
    </div>
  );
};

// Componente para los Campos de la entidad - MODIFICADO para usar FieldNode
const EntityFields = (props: { 
  fields: TableField[]; 
  tableId: number;
  tableName: string;
  tableIdentifier: string;
  onFieldClick: (tableId: number, field: TableField, tableName: string) => void;
  onConnectionStart: (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => void;
  onConnectionEnd: (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => void;
  showHandles: boolean;
  isConnecting: boolean;
}) => {
  return (
    <div class="entity-fields">
      {props.fields.map((field, index) => (
        <FieldNode
          field={field}
          index={index}
          totalFields={props.fields.length}
          tableId={props.tableId}
          tableName={props.tableName}
          tableIdentifier={props.tableIdentifier}
          onEditField={props.onFieldClick}
          onFieldClick={props.onFieldClick}
          onConnectionStart={props.onConnectionStart}
          onConnectionEnd={props.onConnectionEnd}
          showHandles={props.showHandles}
          isConnecting={props.isConnecting}
        />
      ))}
    </div>
  );
};

// NUEVO: Componente para el Botón de Agregar Campo
const AddFieldButton = (props: { 
  onAddField: (e: MouseEvent) => void;
  tableName: string;
  isHovered: boolean;
}) => {
  return (
    <div class="add-field-section">
      <button
        class="add-field-button"
        onClick={props.onAddField}
        title={`Agregar nuevo campo a ${props.tableName}`}
      >
        <i class="bi bi-plus-circle"></i>
        Agregar Campo
      </button>
    </div>
  );
};

// Componente para el Footer de la entidad
const EntityFooter = (props: { 
  fields: TableField[]; 
  relationsCount: number;
}) => {
  return (
    <div class="entity-footer">
      <span>{props.fields.length} campos</span>
      <span>{props.relationsCount} relaciones</span>
    </div>
  );
};

export default EntityNode;