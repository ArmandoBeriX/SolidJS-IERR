// src/components/NavigationBar/JointJSDiagram.tsx
import { createSignal, createEffect, onCleanup, onMount, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import * as joint from '@joint/core';

// Definición de tipos
interface TableField {
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
  relationQuery?: any[];
}

interface TableData {
  id: number;
  identifier: string;
  name: string;
  description: string;
  x?: number;
  y?: number;
  tableFields?: TableField[];
}

interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

interface FieldConnection {
  id: string;
  source: { tableId: number; fieldId: number; tableIdentifier: string; fieldName: string };
  target: { tableId: number; fieldId: number; tableIdentifier: string; fieldName: string };
  type: string;
}

interface JointJSDiagramProps {
  tablesData: TableData[];
  relationships: Relationship[];
  fieldConnections: FieldConnection[];
  isDarkMode: boolean;
  isDraggable: boolean;
  isConnecting: boolean;
  connectionSource: any;
  tempConnection: any;
  scale: number;
  onElementClick: (cellView: joint.dia.CellView, evt: joint.dia.Event) => void;
  onPaperMouseMove: (e: MouseEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onZoomChange: (scale: number) => void;
}

const JointJSDiagram = (props: JointJSDiagramProps) => {
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStartPos, setDragStartPos] = createSignal({ x: 0, y: 0 });
  const [paperStartPos, setPaperStartPos] = createSignal({ tx: 0, ty: 0 });
  const [dragStartTime, setDragStartTime] = createSignal(0);

  let graph: joint.dia.Graph | null = null;
  let paper: joint.dia.Paper | null = null;
  let paperContainer: HTMLDivElement | undefined;
  let initializationTimeout: number | null = null;

  // Función segura para obtener paper
  const getPaper = () => {
    if (!paper) {
      console.warn('⚠️ Paper no está inicializado');
      return null;
    }
    return paper;
  };

  // Función segura para obtener graph
  const getGraph = () => {
    if (!graph) {
      console.warn('⚠️ Graph no está inicializado');
      return null;
    }
    return graph;
  };

  // FUNCIÓN MEJORADA: Manejar clic en nombres de campo
  const handleFieldNameClick = (tableData: TableData, field: TableField, fieldName: string) => {
    console.log('🎯 CLICK EN NOMBRE DE CAMPO - DATOS COMPLETOS:', {
      tableId: tableData.id,
      tableName: tableData.name,
      tableIdentifier: tableData.identifier,
      fieldId: field.id,
      fieldName: field.name,
      fieldIdentifier: field.identifier,
      fieldFormat: field.fieldFormat,
      isRequired: field.isRequired,
      isUnique: field.isUnique,
      position: field.position,
      description: field.description
    });

    // Disparar evento con TODOS los datos del campo
    const customEvent = new CustomEvent('fieldNameClick', {
      detail: {
        tableId: tableData.id,
        field: field, // Enviar el objeto field COMPLETO
        tableName: tableData.name,
        tableIdentifier: tableData.identifier,
        fieldText: fieldName
      }
    });
    document.dispatchEvent(customEvent);
  };

  // FUNCIÓN COMPLETAMENTE REESCRITA: Manejar clic en elementos del diagrama
  const handleElementClick = (cellView: joint.dia.CellView, evt: joint.dia.Event) => {
    // Prevenir inmediatamente
    evt.stopPropagation();
    evt.preventDefault();
    
    const element = cellView.model;
    const tableData = element.get('tableData') as TableData;
    
    if (!tableData) {
      console.log('❌ No hay tableData en el elemento');
      return;
    }

    const target = evt.target as SVGElement;
    const selector = cellView.findAttribute('selector', target);
    const className = target.getAttribute('class') || '';
    const tagName = target.tagName.toLowerCase();

    console.log('🎯 Click detectado - INFORMACIÓN COMPLETA:', { 
      selector,
      className,
      tagName,
      tableData: tableData.name,
      elementType: element.attributes.type,
      target: target
    });

    // Obtener la posición del click
    const clickEvent = evt as unknown as MouseEvent;
    const clickX = clickEvent.clientX;
    const clickY = clickEvent.clientY;

    console.log('📍 Posición del click:', { clickX, clickY });

    // DETECCIÓN MEJORADA DE CAMPOS - ENFOCADA EN LOS SELECTORES ESPECÍFICOS
    let detectedField: TableField | null = null;
    let detectedFieldName = '';

    // INTENTO 1: Detectar por selector de área clickeable
    if (selector && selector.startsWith('fieldClickArea')) {
      const fieldIdMatch = selector.match(/fieldClickArea(\d+)/);
      if (fieldIdMatch) {
        const fieldId = parseInt(fieldIdMatch[1]);
        detectedField = tableData.tableFields?.find(f => f.id === fieldId) || null;
        
        if (detectedField) {
          detectedFieldName = detectedField.name;
          console.log('✅ CLICK EN ÁREA DE CAMPO DETECTADO:', {
            fieldName: detectedField.name,
            fieldId: detectedField.id,
            selector: selector
          });
        }
      }
    }

    // INTENTO 2: Detectar por selector de texto del campo
    if (!detectedField && selector && selector.startsWith('fieldText')) {
      const fieldIdMatch = selector.match(/fieldText(\d+)/);
      if (fieldIdMatch) {
        const fieldId = parseInt(fieldIdMatch[1]);
        detectedField = tableData.tableFields?.find(f => f.id === fieldId) || null;
        
        if (detectedField) {
          detectedFieldName = detectedField.name;
          console.log('✅ CLICK EN TEXTO DE CAMPO DETECTADO:', {
            fieldName: detectedField.name,
            fieldId: detectedField.id,
            selector: selector
          });
        }
      }
    }

    // INTENTO 3: Detectar por texto del elemento (cuando selector es null pero es texto)
    if (!detectedField && tagName === 'text' && target.textContent) {
      const fieldName = target.textContent.trim();
      console.log('🔍 Buscando campo por texto:', fieldName);
      
      // Buscar campo por nombre en los datos de la tabla
      detectedField = tableData.tableFields?.find(f => f.name === fieldName) || null;
      
      if (detectedField) {
        detectedFieldName = fieldName;
        console.log('✅ CAMPO ENCONTRADO POR TEXTO:', {
          fieldName: detectedField.name,
          fieldId: detectedField.id
        });
      }
    }

    // INTENTO 4: Detección por posición (método de respaldo)
    if (!detectedField) {
      console.log('🔍 Buscando campo por posición...');
      
      try {
        // Obtener bounding box del elemento completo - CORREGIDO
        const elementRect = (cellView.el as unknown as HTMLElement).getBoundingClientRect();
        
        // Calcular posición relativa dentro del elemento
        const relativeY = clickY - elementRect.top;
        
        console.log('📍 Cálculo de posición:', {
          clickY,
          elementTop: elementRect.top,
          relativeY,
          elementHeight: elementRect.height
        });

        // Dimensiones que deben coincidir con createEntityElement
        const headerHeight = 40;
        const descriptionHeight = tableData.description ? 40 : 0;
        const fieldHeight = 36;
        const descriptionOffset = headerHeight + descriptionHeight;

        // Calcular índice del campo
        const fieldIndex = Math.floor((relativeY - descriptionOffset) / fieldHeight);
        
        console.log('📊 Cálculo de campo:', {
          fieldIndex,
          totalFields: tableData.tableFields?.length || 0,
          descriptionOffset,
          fieldHeight
        });

        if (fieldIndex >= 0 && fieldIndex < (tableData.tableFields?.length || 0)) {
          detectedField = tableData.tableFields?.[fieldIndex] || null;
          if (detectedField) {
            detectedFieldName = detectedField.name;
            console.log('✅ CAMPO ENCONTRADO POR POSICIÓN:', {
              fieldName: detectedField.name,
              fieldIndex,
              fieldId: detectedField.id
            });
          }
        }
      } catch (error) {
        console.error('❌ Error en detección por posición:', error);
      }
    }

    // SI SE DETECTÓ UN CAMPO, DISPARAR EL EVENTO
    if (detectedField) {
      console.log('🎯 FINAL - Disparando evento para campo:', {
        tableId: tableData.id,
        tableName: tableData.name,
        fieldId: detectedField.id,
        fieldName: detectedField.name,
        fieldIdentifier: detectedField.identifier,
        fieldFormat: detectedField.fieldFormat
      });

      handleFieldNameClick(tableData, detectedField, detectedFieldName);
      return;
    }

    // Click en el header de la entidad
    if (selector === 'header') {
      console.log('🏢 Click en header de:', tableData.name);
      props.onElementClick(cellView, evt);
      return;
    }

    // Click en el botón agregar campo
    if (selector === 'addFieldButton' || selector === 'addFieldClickArea') {
      console.log('➕ Click en botón agregar campo de:', tableData.name);
      props.onElementClick(cellView, evt);
      return;
    }

    console.log('📍 Click en otro elemento - Selector:', selector);
  };

  // Definir una forma personalizada para las entidades ER
  const createEntityElement = (table: TableData) => {
    const fields = table.tableFields || [];
    const headerHeight = 40;
    const fieldHeight = 36;
    const descriptionHeight = table.description ? 40 : 0;
    const footerHeight = 30;
    const addButtonHeight = 50;
    
    const handleWidth = 8;
    
    // Calcular ancho basado en el contenido
    const maxFieldNameWidth = Math.max(
      ...fields.map(field => field.name.length * 7),
      150
    );
    const maxFormatWidth = Math.max(
      ...fields.map(field => (field.fieldFormat + (field.isRequired ? ' *' : '')).length * 6),
      80
    );
    
    const width = Math.max(320, maxFieldNameWidth + maxFormatWidth + 40 + (handleWidth * 2));
    const contentHeight = fields.length * fieldHeight;
    const height = headerHeight + descriptionHeight + contentHeight + addButtonHeight + footerHeight;

    // Definir la entidad ER personalizada
    const Entity = joint.dia.Element.define('er.Entity', {
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          strokeWidth: 2,
          stroke: '#0d6efd',
          fill: props.isDarkMode ? '#2d2d2d' : '#ffffff',
          rx: 8,
          ry: 8
        },
        header: {
          refWidth: '100%',
          height: headerHeight,
          stroke: 'none',
          fill: '#0d6efd',
          x: 0,
          y: 0,
          rx: 8,
          ry: 8,
          cursor: 'pointer'
        },
        headerText: {
          text: table.name,
          refX: '50%',
          refY: headerHeight / 2 - 8,
          textAnchor: 'middle',
          yAlignment: 'middle',
          fontSize: 16,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          fill: '#ffffff',
          cursor: 'pointer',
          pointerEvents: 'none'
        },
        identifierText: {
          text: table.identifier,
          refX: '50%',
          refY: headerHeight / 2 + 8,
          textAnchor: 'middle',
          yAlignment: 'middle',
          fontSize: 12,
          fontStyle: 'italic',
          fontFamily: 'Arial, sans-serif',
          fill: 'rgba(255, 255, 255, 0.9)',
          cursor: 'pointer',
          pointerEvents: 'none'
        }
      }
    }, {
      markup: [{
        tagName: 'rect',
        selector: 'body'
      }, {
        tagName: 'rect',
        selector: 'header'
      }, {
        tagName: 'text',
        selector: 'headerText'
      }, {
        tagName: 'text',
        selector: 'identifierText'
      }]
    });

    const entity = new Entity();
    entity.resize(width, height);
    entity.position(table.x || 0, table.y || 0);
    entity.set('tableId', table.identifier);
    entity.set('tableName', table.name);
    entity.set('tableData', table);

    // Agregar descripción si existe
    if (table.description) {
      entity.attr('description', {
        refWidth: '100%',
        height: descriptionHeight,
        fill: props.isDarkMode ? 'rgba(13, 110, 253, 0.1)' : 'rgba(13, 110, 253, 0.1)',
        stroke: 'none',
        x: 0,
        y: headerHeight
      });
      
      entity.attr('descriptionText', {
        text: table.description,
        refX: 10,
        refY: headerHeight + descriptionHeight / 2,
        textAnchor: 'start',
        yAlignment: 'middle',
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        fill: props.isDarkMode ? '#adb5bd' : '#495057'
      });

      const markup = entity.markup as any[];
      markup.push(
        { tagName: 'rect', selector: 'description' },
        { tagName: 'text', selector: 'descriptionText' }
      );
      entity.markup = markup;
    }

    const descriptionOffset = table.description ? descriptionHeight : 0;
    
    // Agregar campos
    fields.forEach((field, index) => {
      const yPos = headerHeight + descriptionOffset + (index * fieldHeight);
      
      const isPK = field.identifier === 'id' || (field.isUnique && field.fieldFormat === 'integer');
      const isRelation = field.fieldFormat === 'relation';
      
      const fieldBackgroundColor = isPK ? 
        'rgba(220, 53, 69, 0.1)' : 
        isRelation ? 
        'rgba(255, 193, 7, 0.15)' : 
        'transparent';
      
      const separatorColor = isPK ? '#dc3545' : isRelation ? '#ffc107' : '#e9ecef';
      const separatorWidth = isPK || isRelation ? 4 : 1;
      
      const fieldColor = isPK ? '#dc3545' : isRelation ? '#ffc107' : (props.isDarkMode ? '#f5f5f5' : '#333333');
      const fontWeight = isPK || isRelation ? 'bold' : 'normal';

      // Handles visuales para campos (PK y relaciones)
      if (isPK || isRelation) {
        if (isPK) {
          entity.attr(`leftHandle${field.id}`, {
            cx: handleWidth / 2,
            cy: yPos + fieldHeight / 2,
            r: 4,
            fill: '#dc3545',
            stroke: 'white',
            strokeWidth: 2
          });
        }
        
        if (isRelation) {
          entity.attr(`rightHandle${field.id}`, {
            cx: width - handleWidth / 2,
            cy: yPos + fieldHeight / 2,
            r: 4,
            fill: '#ffc107',
            stroke: 'white',
            strokeWidth: 2
          });
        }
      }

      // Fondo del campo
      entity.attr(`fieldBackground${field.id}`, {
        refWidth: '100%',
        height: fieldHeight,
        fill: fieldBackgroundColor,
        stroke: 'none',
        x: 0,
        y: yPos
      });

      // Separador
      entity.attr(`fieldSeparator${field.id}`, {
        x1: 0,
        y1: yPos + fieldHeight,
        x2: width,
        y2: yPos + fieldHeight,
        stroke: separatorColor,
        strokeWidth: separatorWidth
      });

      // Icono para PK o relación
      if (isPK || isRelation) {
        entity.attr(`fieldIcon${field.id}`, {
          text: isPK ? '🔑' : '🔗',
          refX: 10 + (isPK ? handleWidth : 0),
          refY: yPos + fieldHeight / 2,
          textAnchor: 'start',
          yAlignment: 'middle',
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
          fill: fieldColor
        });
      }

      const textOffset = (isPK ? handleWidth : 0) + (isPK || isRelation ? 30 : 10);
      
      // NOMBRE DEL CAMPO - CLICKEABLE con clase especial
      entity.attr(`fieldText${field.id}`, {
        text: field.name,
        refX: textOffset,
        refY: yPos + fieldHeight / 2,
        textAnchor: 'start',
        yAlignment: 'middle',
        fontSize: 13,
        fontWeight: fontWeight,
        fontFamily: 'Arial, sans-serif',
        fill: fieldColor,
        cursor: 'pointer',
        class: 'clickable-field-name'
      });

      // Área clickeable invisible para el nombre del campo
      entity.attr(`fieldClickArea${field.id}`, {
        refX: textOffset - 10,
        refY: yPos + 2,
        width: maxFieldNameWidth + 40,
        height: fieldHeight - 4,
        fill: 'transparent',
        stroke: 'none',
        cursor: 'pointer'
      });

      // Formato del campo
      const formatText = field.fieldFormat + (field.isRequired ? ' *' : '');
      const formatOffset = isRelation ? width - 10 - handleWidth : width - 10;
      
      entity.attr(`fieldFormat${field.id}`, {
        text: formatText,
        refX: formatOffset,
        refY: yPos + fieldHeight / 2,
        textAnchor: 'end',
        yAlignment: 'middle',
        fontSize: 11,
        fontWeight: fontWeight,
        fontFamily: 'Arial, sans-serif',
        fill: fieldColor
      });

      // Agregar elementos al markup
      const markup = entity.markup as any[];
      
      // Área clickeable (para capturar eventos)
      markup.push(
        { tagName: 'rect', selector: `fieldClickArea${field.id}`, className: 'field-click-area' }
      );
      
      // Elementos visuales
      markup.push(
        { tagName: 'rect', selector: `fieldBackground${field.id}` },
        { tagName: 'line', selector: `fieldSeparator${field.id}` }
      );
      
      if (isPK) {
        markup.push({ tagName: 'circle', selector: `leftHandle${field.id}` });
      }
      if (isRelation) {
        markup.push({ tagName: 'circle', selector: `rightHandle${field.id}` });
      }
      
      if (isPK || isRelation) {
        markup.push({ tagName: 'text', selector: `fieldIcon${field.id}` });
      }
      
      markup.push(
        { tagName: 'text', selector: `fieldText${field.id}` },
        { tagName: 'text', selector: `fieldFormat${field.id}` }
      );
      
      entity.markup = markup;
    });

    // BOTÓN AGREGAR CAMPO
    const addButtonY = headerHeight + descriptionOffset + (fields.length * fieldHeight);

    // Fondo de la sección del botón
    entity.attr('addFieldSection', {
      refWidth: '100%',
      height: addButtonHeight,
      fill: props.isDarkMode ? '#3d3d3d' : '#f8f9fa',
      stroke: 'none',
      x: 0,
      y: addButtonY
    });

    // Línea separadora superior
    entity.attr('addFieldSeparator', {
      x1: 0,
      y1: addButtonY,
      x2: width,
      y2: addButtonY,
      stroke: props.isDarkMode ? '#444' : '#e9ecef',
      strokeWidth: 1
    });

    // Rectángulo del botón
    entity.attr('addFieldButton', {
      refWidth: width - 32,
      height: 36,
      fill: 'transparent',
      stroke: props.isDarkMode ? '#6c757d' : '#6c757d',
      strokeWidth: 2,
      strokeDasharray: '4,2',
      rx: 6,
      ry: 6,
      x: 16,
      y: addButtonY + 7,
      cursor: 'pointer'
    });

    // Área clickeable
    entity.attr('addFieldClickArea', {
      refWidth: width - 32,
      height: 36,
      fill: 'transparent',
      stroke: 'none',
      x: 16,
      y: addButtonY + 7,
      cursor: 'pointer'
    });

    // Texto del botón
    entity.attr('addFieldButtonText', {
      text: 'Agregar Campo',
      refX: '50%',
      refY: addButtonY + 7 + 18,
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 13,
      fontWeight: '500',
      fontFamily: 'Arial, sans-serif',
      fill: props.isDarkMode ? '#adb5bd' : '#6c757d',
      cursor: 'pointer',
      pointerEvents: 'none'
    });

    // Icono del botón
    entity.attr('addFieldButtonIcon', {
      text: '+',
      refX: width / 2 - 40,
      refY: addButtonY + 7 + 18,
      textAnchor: 'middle',
      yAlignment: 'middle',
      fontSize: 16,
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      fill: props.isDarkMode ? '#adb5bd' : '#6c757d',
      cursor: 'pointer',
      pointerEvents: 'none'
    });

    // Footer
    const footerY = addButtonY + addButtonHeight;
    entity.attr('footer', {
      refWidth: '100%',
      height: footerHeight,
      fill: props.isDarkMode ? '#444' : '#e9ecef',
      stroke: 'none',
      x: 0,
      y: footerY
    });

    const relationCount = fields.filter(f => f.fieldFormat === 'relation').length;
    entity.attr('footerText', {
      text: `${fields.length} campos • ${relationCount} relaciones`,
      refX: 10,
      refY: footerY + footerHeight / 2,
      textAnchor: 'start',
      yAlignment: 'middle',
      fontSize: 11,
      fontFamily: 'Arial, sans-serif',
      fill: props.isDarkMode ? '#adb5bd' : '#6c757d'
    });

    // Agregar todos los elementos al markup
    const markup = entity.markup as any[];
    markup.push(
      { tagName: 'rect', selector: 'addFieldSection' },
      { tagName: 'line', selector: 'addFieldSeparator' },
      { tagName: 'rect', selector: 'addFieldButton' },
      { tagName: 'rect', selector: 'addFieldClickArea', className: 'add-field-click-area' },
      { tagName: 'text', selector: 'addFieldButtonText' },
      { tagName: 'text', selector: 'addFieldButtonIcon' },
      { tagName: 'rect', selector: 'footer' },
      { tagName: 'text', selector: 'footerText' }
    );
    
    entity.markup = markup;

    return entity;
  };

  // Función para manejar la rueda del ratón
  const handleWheel = (evt: WheelEvent) => {
    evt.preventDefault();
    
    const currentPaper = getPaper();
    if (!currentPaper || !paperContainer) return;

    const delta = -Math.sign(evt.deltaY);
    const currentScale = currentPaper.scale().sx;
    const zoomFactor = 0.2;
    const newScale = currentScale * (1 + delta * zoomFactor);
    const clampedScale = Math.max(0.3, Math.min(2, newScale));
    
    const rect = paperContainer.getBoundingClientRect();
    const mouseX = evt.clientX - rect.left;
    const mouseY = evt.clientY - rect.top;
    
    const currentTranslate = currentPaper.translate();
    const modelX = (mouseX - currentTranslate.tx) / currentScale;
    const modelY = (mouseY - currentTranslate.ty) / currentScale;
    
    const newTx = mouseX - modelX * clampedScale;
    const newTy = mouseY - modelY * clampedScale;
    
    currentPaper.scale(clampedScale, clampedScale);
    currentPaper.translate(newTx, newTy);
    
    props.onZoomChange(clampedScale);
  };

  // Manejar pointer down en elementos
  const handleElementPointerDown = (cellView: joint.dia.CellView, evt: joint.dia.Event) => {
    if (!props.isDraggable || props.isConnecting) return;
    
    const event = evt as unknown as MouseEvent;
    setIsDragging(true);
    setDragStartTime(Date.now());
    setDragStartPos({ x: event.clientX, y: event.clientY });
    const currentPaper = getPaper();
    if (currentPaper) {
      const translate = currentPaper.translate();
      setPaperStartPos({ tx: translate.tx, ty: translate.ty });
    }
    
    if (paperContainer) {
      paperContainer.style.cursor = 'grabbing';
    }
    
    document.addEventListener('mousemove', handlePaperDrag);
    document.addEventListener('mouseup', handleMouseUp);
    
    event.preventDefault();
  };

  // Manejar pointer down en área en blanco
  const handleBlankPointerDown = (evt: joint.dia.Event) => {
    if (!props.isDraggable || props.isConnecting) return;
    
    const event = evt as unknown as MouseEvent;
    setIsDragging(true);
    setDragStartTime(Date.now());
    setDragStartPos({ x: event.clientX, y: event.clientY });
    const currentPaper = getPaper();
    if (currentPaper) {
      const translate = currentPaper.translate();
      setPaperStartPos({ tx: translate.tx, ty: translate.ty });
    }
    
    if (paperContainer) {
      paperContainer.style.cursor = 'grabbing';
    }
    
    document.addEventListener('mousemove', handlePaperDrag);
    document.addEventListener('mouseup', handleMouseUp);
    
    event.preventDefault();
  };

  // Función para arrastre del paper
  const handlePaperDrag = (evt: MouseEvent) => {
    if (!isDragging() || !props.isDraggable || props.isConnecting) return;

    const deltaX = evt.clientX - dragStartPos().x;
    const deltaY = evt.clientY - dragStartPos().y;
    
    const newTx = paperStartPos().tx + deltaX;
    const newTy = paperStartPos().ty + deltaY;
    
    const currentPaper = getPaper();
    if (currentPaper) {
      currentPaper.translate(newTx, newTy);
    }
    evt.preventDefault();
  };

  // Función para mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
    if (paperContainer) {
      paperContainer.style.cursor = props.isDraggable ? 'grab' : 'default';
    }
    
    document.removeEventListener('mousemove', handlePaperDrag);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Inicializar JointJS
  const initializeJointJS = () => {
    if (!paperContainer) {
      console.log('❌ paperContainer no está disponible');
      return;
    }

    console.log('🚀 Inicializando JointJS...');
    
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }

    try {
      // Crear graph
      graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
      
      const backgroundColor = props.isDarkMode ? '#1a1a1a' : '#f5f5f5';
      
      // Crear paper con configuración MEJORADA para eventos
      paper = new joint.dia.Paper({
        el: paperContainer,
        model: graph,
        width: '100%',
        height: '100%',
        gridSize: 1,
        drawGrid: false,
        background: {
          color: backgroundColor
        },
        interactive: {
          elementMove: props.isDraggable,
          linkMove: false,
          addLinkFromMagnet: false,
          stopDelegation: false
        },
        async: true,
        sorting: joint.dia.Paper.sorting.APPROX,
        snapLabels: true,
        cellViewNamespace: joint.shapes,
        preventContextMenu: false,
        preventDefaultViewAction: false,
        clickThreshold: 2,
        highlightOn: {
          'blank:pointerdown': false,
          'element:pointerdown': false
        }
      });

      // Configurar eventos
      paper.on('element:pointerclick', (cellView, evt) => {
        console.log('🖱️ Evento element:pointerclick disparado');
        handleElementClick(cellView, evt);
      });

      paper.on('cell:pointerclick', (cellView, evt) => {
        console.log('🖱️ Evento cell:pointerclick disparado (fallback)');
        if (cellView.model.isElement()) {
          handleElementClick(cellView, evt);
        }
      });

      paper.on('element:pointerdown', handleElementPointerDown);
      paper.on('blank:pointerdown', handleBlankPointerDown);

      // Manejo de eventos de arrastre
      const handleMouseMove = (evt: MouseEvent) => {
        handlePaperDrag(evt);
        props.onPaperMouseMove(evt);
      };

      // Agregar event listener para la rueda del ratón
      paperContainer.addEventListener('wheel', handleWheel, { passive: false });

      // Manejo de eventos de teclado
      const handleKeyDown = (e: KeyboardEvent) => {
        props.onKeyDown(e);
      };

      document.addEventListener('keydown', handleKeyDown);

      if (paperContainer) {
        paperContainer.style.cursor = props.isDraggable ? 'grab' : 'default';
      }
      
      // Marcar como inicializado
      setIsInitialized(true);
      console.log('✅ JointJS inicializado correctamente');
      
      // Cargar datos después de un pequeño delay
      initializationTimeout = setTimeout(() => {
        loadDataToDiagram();
      }, 100);
      
    } catch (error) {
      console.error('❌ Error inicializando JointJS:', error);
    }
  };

  // Cargar datos al diagrama
  const loadDataToDiagram = () => {
    const currentGraph = getGraph();
    const currentPaper = getPaper();
    
    if (!currentGraph || !currentPaper) {
      console.log('❌ Graph o Paper no están inicializados');
      return;
    }

    console.log('🔄 Cargando datos al diagrama...');
    
    if (currentGraph.getCells().length > 0) {
      currentGraph.clear();
      console.log('🧹 Diagrama limpiado');
    }

    const tables = props.tablesData;
    const rels = props.relationships;
    const fieldConns = props.fieldConnections;

    console.log('📦 Datos a cargar:', {
      tablas: tables.length,
      relaciones: rels.length,
      conexionesCampo: fieldConns.length
    });

    if (tables.length === 0) {
      console.log('⚠️ No hay tablas para mostrar');
      return;
    }

    // Agregar entidades
    tables.forEach(table => {
      console.log(`➕ Creando entidad: ${table.name} en (${table.x}, ${table.y})`);
      try {
        const entityElement = createEntityElement(table);
        currentGraph.addCell(entityElement);
        console.log(`✅ Tabla agregada: ${table.name}`);
      } catch (error) {
        console.error(`❌ Error creando entidad ${table.name}:`, error);
      }
    });

    // Agregar relaciones tradicionales
    rels.forEach(rel => {
      const sourceElement = currentGraph.getElements().find(el => el.get('tableId') === rel.source);
      const targetElement = currentGraph.getElements().find(el => el.get('tableId') === rel.target);

      if (sourceElement && targetElement) {
        const link = new joint.shapes.standard.Link();
        link.source(sourceElement);
        link.target(targetElement);
        link.attr({
          line: {
            stroke: props.isDarkMode ? '#6c757d' : '#6c757d',
            strokeWidth: 1,
            strokeDasharray: '5,2',
            targetMarker: {
              'type': 'path',
              'd': 'M 10 -5 0 0 10 5 z',
              'fill': props.isDarkMode ? '#6c757d' : '#6c757d'
            }
          }
        });
        
        currentGraph.addCell(link);
        console.log(`🔗 Relación: ${rel.source} → ${rel.target}`);
      }
    });

    console.log('✅ Diagrama cargado. Elementos en graph:', currentGraph.getElements().length);
    
    // Forzar un render inmediato
    setTimeout(() => {
      const currentPaper = getPaper();
      const currentGraph = getGraph();
      
      if (currentPaper && currentGraph && currentGraph.getElements().length > 0) {
        console.log('🎯 Aplicando vista ajustada');
        try {
          const paperElement = currentPaper as any;
          
          if (paperElement.fitToContent) {
            paperElement.fitToContent({ 
              padding: 50, 
              minScale: 0.3, 
              maxScale: 1.5
            });
          } else if (paperElement.scaleContentToFit) {
            paperElement.scaleContentToFit({ 
              padding: 50, 
              minScale: 0.3, 
              maxScale: 1.5 
            });
          } else {
            const bbox = currentGraph.getBBox();
            if (bbox) {
              currentPaper.scale(0.8, 0.8);
              currentPaper.translate(-bbox.x * 0.8 + 50, -bbox.y * 0.8 + 50);
            }
          }
          
          console.log('✅ Vista ajustada correctamente');
          
        } catch (error) {
          console.log('❌ Error ajustando vista:', error);
        }
      }
    }, 150);
  };

  // Efectos
  onMount(() => {
    console.log('🚀 Montando JointJSDiagram');
  });

  createEffect(() => {
    if (isInitialized() && props.tablesData.length > 0) {
      console.log('📊 Datos actualizados, cargando en diagrama...');
      loadDataToDiagram();
    }
  });

  createEffect(() => {
    if (isInitialized()) {
      const currentPaper = getPaper();
      if (currentPaper) {
        currentPaper.options.interactive = {
          elementMove: props.isDraggable,
          linkMove: false,
          addLinkFromMagnet: false,
          stopDelegation: false
        };
        
        if (paperContainer) {
          paperContainer.style.cursor = props.isDraggable ? 'grab' : 'default';
        }
      }
    }
  });

  createEffect(() => {
    if (isInitialized()) {
      const currentPaper = getPaper();
      if (currentPaper) {
        currentPaper.scale(props.scale, props.scale);
      }
    }
  });

  // Cleanup
  onCleanup(() => {
    console.log('🧹 Limpiando JointJS Diagram');
    
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }
    
    if (paperContainer) {
      paperContainer.removeEventListener('wheel', handleWheel);
    }
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', props.onKeyDown);
      document.removeEventListener('mousemove', handlePaperDrag);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    if (paper) {
      try {
        paper.remove();
      } catch (error) {
        console.log('Error limpiando paper:', error);
      }
    }
    
    if (graph) {
      try {
        graph.clear();
      } catch (error) {
        console.log('Error limpiando graph:', error);
      }
    }
    
    setIsInitialized(false);
  });

  return (
    <div class="joint-container">
      <div 
        class="joint-paper" 
        ref={el => {
          paperContainer = el;
          if (el && !isInitialized()) {
            console.log('📝 Contenedor disponible, inicializando...');
            setTimeout(() => initializeJointJS(), 10);
          }
        }}
        style={{ 
          cursor: props.isConnecting ? 'crosshair' : (props.isDraggable ? (isDragging() ? 'grabbing' : 'grab') : 'default') 
        }}
      />
      
      <Show when={!isInitialized()}>
        <div class="diagram-loading">
          <i class="bi bi-hourglass-split"></i>
          <span>Inicializando diagrama...</span>
        </div>
      </Show>

      <Show when={isInitialized() && props.tablesData.length === 0}>
        <div class="empty-state">
          <i class="bi bi-diagram-3"></i>
          <h3>No hay datos para mostrar</h3>
          <p>Carga un archivo JSON con el esquema de la base de datos o crea una nueva entidad.</p>
        </div>
      </Show>

      <Show when={isInitialized()}>
        <div class="zoom-level-display">
          <i class="bi bi-zoom-in"></i> Zoom: {Math.round(props.scale * 100)}%
          <Show when={props.isDraggable && !props.isConnecting}>
            <span class="drag-hint">
              <i class="bi bi-arrows-move"></i> Arrastra para mover
            </span>
          </Show>
          <Show when={props.isConnecting}>
            <span class="connection-hint-text">
              <i class="bi bi-link-45deg"></i> Modo conexión - Arrastra desde campos ID
            </span>
          </Show>
        </div>
      </Show>

      {/* Indicador de conexión temporal */}
      <Show when={props.isConnecting && props.connectionSource && props.tempConnection}>
        <svg class="temp-connection" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100
        } as JSX.CSSProperties}>
          <line 
            x1={props.connectionSource!.x} 
            y1={props.connectionSource!.y} 
            x2={props.tempConnection!.x} 
            y2={props.tempConnection!.y}
            stroke="#0d6efd"
            stroke-width="2"
            stroke-dasharray="5,2"
          />
        </svg>
      </Show>
    </div>
  );
};

export default JointJSDiagram;