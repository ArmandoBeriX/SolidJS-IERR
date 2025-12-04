// src/components/EntityRelationshipDiagram/FieldNode.tsx
import { createSignal, createEffect, onMount, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import './FieldNode.css';

// Definición de tipos para el campo
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

interface FieldNodeProps {
  field: TableField;
  index: number;
  totalFields: number;
  tableId: number;
  tableName: string;
  tableIdentifier: string;
  onEditField?: (tableId: number, field: TableField, tableName: string) => void;
  onFieldClick?: (tableId: number, field: TableField, tableName: string) => void;
  onConnectionStart?: (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => void;
  onConnectionEnd?: (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => void;
  isConnectable?: boolean;
  showHandles?: boolean;
  isConnecting?: boolean;
}

const FieldNode = (props: FieldNodeProps) => {
  const [isHovered, setIsHovered] = createSignal(false);
  const [isConnectionHovered, setIsConnectionHovered] = createSignal(false);
  const [isDraggingConnection, setIsDraggingConnection] = createSignal(false);

  let fieldRef: HTMLDivElement | undefined;

  // Determinar si es clave primaria
  const isPrimaryKey = () => {
    return props.field.identifier === 'id' || 
           (props.field.isUnique && props.field.fieldFormat === 'integer');
  };

  // Determinar si es relación
  const isRelation = () => {
    return props.field.fieldFormat === 'relation';
  };

  // NUEVO: Manejar clic en el nombre del campo para editar
  const handleFieldNameClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('✏️ Campo clickeado para editar:', props.field.name, 'en tabla:', props.tableId);
    
    if (props.onEditField) {
      props.onEditField(props.tableId, props.field, props.tableName);
    }
  };

  // Manejar clic en el campo completo
  const handleFieldClick = (e: MouseEvent) => {
    e.stopPropagation();
    console.log('📍 Campo clickeado:', props.field.name, 'en tabla:', props.tableId);
    
    if (props.onFieldClick) {
      props.onFieldClick(props.tableId, props.field, props.tableName);
    }
  };

  // Manejar inicio de conexión desde handle izquierdo (PK)
  const handleConnectionStart = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isPrimaryKey()) return;
    
    console.log('🔗 Iniciando conexión desde:', props.tableIdentifier, props.field.name);
    setIsDraggingConnection(true);
    
    // Obtener posición del campo
    const rect = fieldRef?.getBoundingClientRect();
    if (rect && props.onConnectionStart) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      props.onConnectionStart(props.tableId, props.field, props.tableIdentifier, centerX, centerY);
    }

    // Agregar event listeners para el arrastre de conexión
    document.addEventListener('mousemove', handleConnectionDrag);
    document.addEventListener('mouseup', handleConnectionEnd);
  };

  // Manejar arrastre de conexión
  const handleConnectionDrag = (e: MouseEvent) => {
    if (!isDraggingConnection()) return;
    
    // Aquí podrías mostrar una línea temporal durante el arrastre
    // Por ahora solo seguimos el movimiento
  };

  // Manejar fin de conexión (soltar en otro campo)
  const handleConnectionEnd = (e: MouseEvent) => {
    if (!isDraggingConnection()) return;
    
    setIsDraggingConnection(false);
    
    // Buscar el campo objetivo bajo el cursor
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const targetFieldNode = targetElement?.closest('.field-node');
    
    if (targetFieldNode && props.onConnectionEnd) {
      const rect = fieldRef?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        props.onConnectionEnd(props.tableId, props.field, props.tableIdentifier, centerX, centerY);
      }
    }

    // Remover event listeners
    document.removeEventListener('mousemove', handleConnectionDrag);
    document.removeEventListener('mouseup', handleConnectionEnd);
  };

  // Manejar hover en área de conexión
  const handleConnectionHover = (e: MouseEvent, isHover: boolean) => {
    e.stopPropagation();
    setIsConnectionHovered(isHover);
  };

  // Obtener clases CSS dinámicas
  const getFieldClasses = () => {
    const classes = ['field-node'];
    if (isPrimaryKey()) classes.push('primary-key');
    if (isRelation()) classes.push('relation');
    if (isHovered()) classes.push('hovered');
    if (isConnectionHovered()) classes.push('connection-hovered');
    if (props.isConnecting) classes.push('connecting');
    if (isDraggingConnection()) classes.push('dragging-connection');
    return classes.join(' ');
  };

  // Obtener estilos dinámicos
  const getFieldStyles = (): JSX.CSSProperties => {
    const baseStyles: JSX.CSSProperties = {
      'border-bottom': props.index < props.totalFields - 1 ? '1px solid #e9ecef' : 'none'
    };

    return baseStyles;
  };

  // Obtener icono del campo
  const getFieldIcon = () => {
    if (isPrimaryKey()) return <span class="field-icon pk-icon">🔑</span>;
    if (isRelation()) return <span class="field-icon relation-icon">🔗</span>;
    return null;
  };

  // Obtener tooltip/título
  const getFieldTitle = () => {
    const fieldType = isPrimaryKey() ? 'CLAVE PRIMARIA' : 
                     isRelation() ? 'RELACIÓN' : 'CAMPO';
    
    const details = [
      `Tipo: ${fieldType}`,
      `Nombre: ${props.field.name}`,
      `Formato: ${props.field.fieldFormat}`,
      props.field.isRequired ? 'REQUERIDO' : 'OPCIONAL',
      props.field.description ? `Desc: ${props.field.description}` : '',
      isPrimaryKey() ? 'Click y arrastra para conectar' : 'Click en el nombre para editar'
    ].filter(Boolean).join('\n');

    return details;
  };

  return (
    <div
      ref={fieldRef}
      class={getFieldClasses()}
      style={getFieldStyles()}
      onClick={handleFieldClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={getFieldTitle()}
    >
      {/* Handle de conexión izquierdo (para claves primarias) */}
      <Show when={props.showHandles && isPrimaryKey()}>
        <div 
          class="connection-handle left-handle"
          onMouseDown={handleConnectionStart}
          onMouseEnter={(e) => handleConnectionHover(e, true)}
          onMouseLeave={(e) => handleConnectionHover(e, false)}
          title="Click y arrastra para conectar con otra tabla"
        >
          <div class="handle-dot"></div>
          <div class="handle-line"></div>
        </div>
      </Show>

      {/* Contenido principal del campo */}
      <div class="field-content">
        {/* Icono del campo */}
        <Show when={getFieldIcon()}>
          {getFieldIcon()}
        </Show>

        {/* NOMBRE DEL CAMPO CLICKEABLE - CORREGIDO */}
        <div 
          class="field-name clickable"
          onClick={handleFieldNameClick}
          title="Click para editar este campo"
        >
          {props.field.name}
        </div>

        {/* Formato y requerido */}
        <span class="field-format">
          {props.field.fieldFormat}
          {props.field.isRequired && ' *'}
        </span>
      </div>

      {/* Handle de conexión derecho (para relaciones) */}
      <Show when={props.showHandles && isRelation()}>
        <div 
          class="connection-handle right-handle"
          onMouseEnter={(e) => handleConnectionHover(e, true)}
          onMouseLeave={(e) => handleConnectionHover(e, false)}
          title="Campo de relación (conectado desde otra tabla)"
        >
          <div class="handle-line"></div>
          <div class="handle-dot"></div>
        </div>
      </Show>

      {/* Indicador de arrastre (para futuro reordenamiento) */}
      <Show when={isHovered()}>
        <div class="drag-indicator" title="Arrastrar para reordenar">
          <i class="bi bi-grip-vertical"></i>
        </div>
      </Show>

      {/* Indicador de conexión activa */}
      <Show when={isDraggingConnection()}>
        <div class="connection-active-indicator">
          <i class="bi bi-arrow-right"></i>
        </div>
      </Show>
    </div>
  );
};

export default FieldNode;