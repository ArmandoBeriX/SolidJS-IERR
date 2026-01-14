// src/components/NavigationBar/JointJSDiagram.tsx
import { createSignal, createEffect, onCleanup, onMount, Show, batch } from 'solid-js';
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
  onJointReady?: () => void;
  onElementPositionChange?: (tableId: number, x: number, y: number) => void;
  refreshTrigger?: number;
}

const JointJSDiagram = (props: JointJSDiagramProps) => {
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStartPos, setDragStartPos] = createSignal({ x: 0, y: 0 });
  const [paperStartPos, setPaperStartPos] = createSignal({ tx: 0, ty: 0 });
  const [dragStartTime, setDragStartTime] = createSignal(0);
  const [needsCompleteRefresh, setNeedsCompleteRefresh] = createSignal(false);
  
  // Cache para throttling de guardado
  const positionSaveCache = new Map<number, {x: number, y: number, timer: any}>();
  
  let graph: joint.dia.Graph | null = null;
  let paper: joint.dia.Paper | null = null;
  let paperContainer: HTMLDivElement | null = null;
  let initializationTimeout: number | null = null;
  let rafId: number | null = null;

  // Mapa para rastrear elementos por ID de tabla
  const elementMap = new Map<number, joint.dia.Element>();
  // Mapa para rastrear el hash de datos de cada tabla (para detectar cambios)
  const tableDataHash = new Map<number, string>();

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

  // Función segura para obtener paperContainer
  const getPaperContainer = () => {
    if (!paperContainer) {
      console.warn('⚠️ paperContainer no está disponible');
      return null;
    }
    return paperContainer;
  };

  // Función para generar un hash de los datos de una tabla
  const generateTableHash = (table: TableData): string => {
    return JSON.stringify({
      id: table.id,
      name: table.name,
      identifier: table.identifier,
      description: table.description,
      fieldsCount: table.tableFields?.length || 0,
      fields: table.tableFields?.map(f => ({
        id: f.id,
        name: f.name,
        fieldFormat: f.fieldFormat,
        isRequired: f.isRequired,
        isUnique: f.isUnique,
        relationTableIdentifier: f.relationTableIdentifier
      }))
    });
  };

  // Función optimizada para guardar posición con throttling
  const savePositionToLocalStorage = (tableId: number, x: number, y: number) => {
    const cached = positionSaveCache.get(tableId);
    const now = Date.now();
    
    // Si ya hay un timer pendiente para esta tabla, cancelarlo
    if (cached && cached.timer) {
      clearTimeout(cached.timer);
    }
    
    // Configurar nuevo timer con throttling de 500ms
    const timer = setTimeout(() => {
      try {
        const savedData = localStorage.getItem('erDiagramData');
        if (savedData) {
          const parsedData: TableData[] = JSON.parse(savedData);
          const updatedData = parsedData.map(table => {
            if (table.id === tableId) {
              return { ...table, x, y };
            }
            return table;
          });
          localStorage.setItem('erDiagramData', JSON.stringify(updatedData));
          console.log(`💾 Posición guardada: Tabla ${tableId} -> (${x}, ${y})`);
        }
        
        // Notificar al componente padre después de guardar
        if (props.onElementPositionChange) {
          props.onElementPositionChange(tableId, x, y);
        }
        
        // Limpiar cache
        positionSaveCache.delete(tableId);
      } catch (error) {
        console.error('❌ Error guardando posición en localStorage:', error);
      }
    }, 500); // Throttling de 500ms
    
    // Actualizar cache
    positionSaveCache.set(tableId, { x, y, timer });
  };

  // Función para guardar TODAS las posiciones inmediatamente
  const saveAllPositionsImmediately = () => {
    const currentGraph = getGraph();
    if (!currentGraph) return;
    
    const elements = currentGraph.getElements();
    console.log(`💾 Guardando todas las posiciones (${elements.length} elementos)...`);
    
    batch(() => {
      elements.forEach(element => {
        const tableData = element.get('tableData') as TableData;
        if (tableData) {
          const position = element.position();
          const cached = positionSaveCache.get(tableData.id);
          
          // Cancelar timer pendiente si existe
          if (cached && cached.timer) {
            clearTimeout(cached.timer);
            positionSaveCache.delete(tableData.id);
          }
          
          // Guardar inmediatamente
          try {
            const savedData = localStorage.getItem('erDiagramData');
            if (savedData) {
              const parsedData: TableData[] = JSON.parse(savedData);
              const updatedData = parsedData.map(table => {
                if (table.id === tableData.id) {
                  return { ...table, x: position.x, y: position.y };
                }
                return table;
              });
              localStorage.setItem('erDiagramData', JSON.stringify(updatedData));
              
              // Notificar al componente padre
              if (props.onElementPositionChange) {
                props.onElementPositionChange(tableData.id, position.x, position.y);
              }
            }
          } catch (error) {
            console.error('❌ Error guardando posición inmediata:', error);
          }
        }
      });
    });
    
    console.log('✅ Todas las posiciones guardadas');
  };

  // SISTEMA MEJORADO DE DETECCIÓN DE CLICKS - INCLUYE HEADER Y BOTÓN AGREGAR CAMPO
  const handleElementClick = (cellView: joint.dia.CellView, evt: joint.dia.Event) => {
    evt.stopPropagation();
    evt.preventDefault();
    
    const element = cellView.model;
    const tableData = element.get('tableData') as TableData;
    
    if (!tableData) {
      console.log('❌ No hay tableData en el elemento');
      return;
    }

    const target = evt.target as SVGElement;
    const targetParent = target.parentElement;
    
    // Obtener TODOS los posibles atributos de datos
    const dataFieldId = target.getAttribute('data-field-id') || 
                       targetParent?.getAttribute('data-field-id');
    const dataTableId = target.getAttribute('data-table-id') || 
                       targetParent?.getAttribute('data-table-id');
    const dataAction = target.getAttribute('data-action') ||
                       targetParent?.getAttribute('data-action');
    
    // NUEVO: Verificar si es clic en el HEADER de la entidad
    if (dataAction === 'edit-entity') {
      console.log('🏢 CLICK EN HEADER DE ENTIDAD:', {
        tableId: dataTableId || tableData.id.toString(),
        tableName: tableData.name,
        targetTag: target.tagName,
        targetClass: target.getAttribute('class')
      });
      
      // Disparar evento personalizado para que NavigationBar lo maneje
      const editEntityEvent = new CustomEvent('entityHeaderClick', {
        detail: {
          tableId: parseInt(dataTableId || tableData.id.toString()),
          entity: tableData,
          tableName: tableData.name,
          timestamp: Date.now(),
          verified: true
        },
        bubbles: true
      });
      
      // Disparar desde el paperContainer para que NavigationBar pueda capturarlo
      const container = getPaperContainer();
      if (container) {
        container.dispatchEvent(editEntityEvent);
      } else {
        document.dispatchEvent(editEntityEvent);
      }
      
      // También llamar directamente a la función props.onElementClick
      props.onElementClick(cellView, evt);
      return;
    }
    
    // NUEVO: Verificar si es el botón "Agregar Campo"
    if (dataAction === 'add-field') {
      console.log('➕ Botón agregar campo clickeado en:', {
        tableId: dataTableId,
        tableName: tableData.name
      });
      
      // Disparar evento personalizado para que NavigationBar lo maneje
      const addFieldEvent = new CustomEvent('addFieldClick', {
        detail: {
          tableId: parseInt(dataTableId || tableData.id.toString()),
          field: null,
          tableName: tableData.name,
          timestamp: Date.now(),
          verified: true
        },
        bubbles: true
      });
      
      // Disparar desde el paperContainer para que NavigationBar pueda capturarlo
      const container = getPaperContainer();
      if (container) {
        container.dispatchEvent(addFieldEvent);
      } else {
        document.dispatchEvent(addFieldEvent);
      }
      
      // También llamar directamente a la función props.onElementClick
      props.onElementClick(cellView, evt);
      return;
    }
    
    // Verificar si es un campo (tiene data-field-id)
    if (dataFieldId && dataTableId && tableData.tableFields) {
      const fieldId = parseInt(dataFieldId);
      const tableId = parseInt(dataTableId);
      
      // Buscar el campo específico
      const foundField = tableData.tableFields.find((f: TableField) => f.id === fieldId);
      
      if (foundField) {
        console.log('✅ CAMPO CLICKEADO:', {
          fieldName: foundField.name,
          fieldId: foundField.id,
          tableId: tableId,
          tableName: tableData.name
        });
        
        // Disparar evento inmediatamente
        const customEvent = new CustomEvent('fieldNameClick', {
          detail: {
            tableId: tableId,
            field: foundField,
            tableName: tableData.name,
            tableIdentifier: tableData.identifier,
            fieldText: foundField.name,
            timestamp: Date.now(),
            verified: true
          }
        });
        document.dispatchEvent(customEvent);
        return;
      }
    }
    
    // Si no es un campo, header o botón agregar, verificar si es clic general en el elemento
    const isGeneralClick = target.tagName === 'rect' || target.tagName === 'text';
    if (isGeneralClick) {
      console.log('📍 Click general en elemento:', {
        tagName: target.tagName,
        className: target.getAttribute('class'),
        tableName: tableData.name
      });
      props.onElementClick(cellView, evt);
      return;
    }
    
    console.log('📍 Click en elemento no manejado:', {
      tagName: target.tagName,
      className: target.getAttribute('class'),
      dataFieldId: dataFieldId,
      dataTableId: dataTableId,
      dataAction: dataAction
    });
  };

  // SISTEMA MEJORADO DE CREACIÓN DE ENTIDADES - CON HEADER CLICKEABLE Y BOTÓN AGREGAR CAMPO FUNCIONAL
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
      ...fields.map((field: TableField) => field.name.length * 7),
      150
    );
    const maxFormatWidth = Math.max(
      ...fields.map((field: TableField) => (field.fieldFormat + (field.isRequired ? ' *' : '')).length * 6),
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
          cursor: 'move'
        },
        // NUEVO: ÁREA CLICKEABLE DEL HEADER
        headerClickArea: {
          refWidth: '100%',
          height: headerHeight,
          fill: 'transparent',
          stroke: 'none',
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
        tagName: 'rect',
        selector: 'headerClickArea'
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
    
    // USAR LAS COORDENADAS GUARDADAS O LAS PROPORCIONADAS
    const savedX = table.x !== undefined ? Math.round(table.x) : 0;
    const savedY = table.y !== undefined ? Math.round(table.y) : 0;
    entity.position(savedX, savedY);
    
    entity.set('tableId', table.identifier);
    entity.set('tableName', table.name);
    entity.set('tableData', { ...table, x: savedX, y: savedY });
    entity.set('tableElementId', table.id);
    
    // CONFIGURAR DRAGGABLE - USAR EL VALOR ACTUAL DE props.isDraggable
    entity.set('draggable', props.isDraggable);

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
    
    // AGREGAR CAMPOS
    fields.forEach((field: TableField, index: number) => {
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

      // ÁREA CLICKEABLE DEL CAMPO
      entity.attr(`fieldArea${field.id}`, {
        refX: 0,
        refY: yPos,
        width: width,
        height: fieldHeight,
        fill: 'transparent',
        stroke: 'none',
        cursor: 'pointer'
      });

      // Fondo del campo
      entity.attr(`fieldBackground${field.id}`, {
        refWidth: '100%',
        height: fieldHeight,
        fill: fieldBackgroundColor,
        stroke: 'none',
        x: 0,
        y: yPos,
        pointerEvents: 'none'
      });

      // Separador
      entity.attr(`fieldSeparator${field.id}`, {
        x1: 0,
        y1: yPos + fieldHeight,
        x2: width,
        y2: yPos + fieldHeight,
        stroke: separatorColor,
        strokeWidth: separatorWidth,
        pointerEvents: 'none'
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
          fill: fieldColor,
          pointerEvents: 'none'
        });
      }

      const textOffset = (isPK ? handleWidth : 0) + (isPK || isRelation ? 30 : 10);
      
      // Texto del campo
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
        pointerEvents: 'none'
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
        fill: fieldColor,
        pointerEvents: 'none'
      });

      // Agregar elementos al markup
      const markup = entity.markup as any[];
      
      // ÁREA CLICKEABLE DEL CAMPO
      markup.push(
        { 
          tagName: 'rect', 
          selector: `fieldArea${field.id}`,
          attributes: {
            'data-field-id': field.id.toString(),
            'data-table-id': table.id.toString(),
            'data-action': 'edit-field'
          }
        }
      );
      
      // Elementos visuales del campo
      markup.push(
        { tagName: 'rect', selector: `fieldBackground${field.id}` },
        { tagName: 'line', selector: `fieldSeparator${field.id}` }
      );
      
      if (isPK || isRelation) {
        markup.push({ tagName: 'text', selector: `fieldIcon${field.id}` });
      }
      
      markup.push(
        { tagName: 'text', selector: `fieldText${field.id}` },
        { tagName: 'text', selector: `fieldFormat${field.id}` }
      );
      
      entity.markup = markup;
    });

    // BOTÓN AGREGAR CAMPO - MEJORADO CON ATRIBUTOS DE DATOS
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

    // ÁREA CLICKEABLE DEL BOTÓN AGREGAR CAMPO
    entity.attr('addFieldClickArea', {
      refWidth: width - 32,
      height: 36,
      fill: 'transparent',
      stroke: 'none',
      x: 16,
      y: addButtonY + 7,
      cursor: 'pointer'
    });

    // Rectángulo visual del botón
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
      cursor: 'pointer',
      pointerEvents: 'none'
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

    const relationCount = fields.filter((f: TableField) => f.fieldFormat === 'relation').length;
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

    // Agregar todos los elementos al markup - CRÍTICO: Agregar atributos data-* 
    const markup = entity.markup as any[];
    markup.push(
      { tagName: 'rect', selector: 'addFieldSection' },
      { tagName: 'line', selector: 'addFieldSeparator' },
      { 
        tagName: 'rect', 
        selector: 'addFieldClickArea',
        attributes: {
          'data-table-id': table.id.toString(),
          'data-action': 'add-field',
          'data-table-name': table.name
        }
      },
      { tagName: 'rect', selector: 'addFieldButton' },
      { tagName: 'text', selector: 'addFieldButtonText' },
      { tagName: 'text', selector: 'addFieldButtonIcon' },
      { tagName: 'rect', selector: 'footer' },
      { tagName: 'text', selector: 'footerText' }
    );
    
    // NUEVO: Agregar atributos data-* al área clickeable del header
    const headerClickAreaElement = markup.find(item => item.selector === 'headerClickArea');
    if (headerClickAreaElement) {
      headerClickAreaElement.attributes = {
        'data-table-id': table.id.toString(),
        'data-action': 'edit-entity',
        'data-table-name': table.name
      };
    }
    
    entity.markup = markup;

    return entity;
  };

  // Función para crear enlaces (relaciones)
  const createRelationshipLink = (rel: Relationship) => {
    const currentGraph = getGraph();
    if (!currentGraph) return null;

    // Buscar elementos fuente y destino
    const sourceElement = Array.from(elementMap.values()).find(
      el => el.get('tableId') === rel.source
    );
    const targetElement = Array.from(elementMap.values()).find(
      el => el.get('tableId') === rel.target
    );

    if (!sourceElement || !targetElement) {
      console.warn(`❌ No se encontraron elementos para la relación ${rel.source} -> ${rel.target}`);
      return null;
    }

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
    
    // Agregar etiqueta si existe
    if (rel.label) {
      link.label(0, {
        position: 0.5,
        attrs: {
          text: {
            text: rel.label,
            fontSize: 11,
            fill: props.isDarkMode ? '#adb5bd' : '#495057',
            fontFamily: 'Arial, sans-serif'
          },
          rect: {
            fill: props.isDarkMode ? '#2d2d2d' : '#ffffff',
            stroke: props.isDarkMode ? '#6c757d' : '#6c757d',
            strokeWidth: 1,
            rx: 3,
            ry: 3
          }
        }
      });
    }

    return link;
  };

  // NUEVA FUNCIÓN: Actualizar solo los atributos de un elemento existente
  const updateEntityAttributes = (element: joint.dia.Element, newTableData: TableData) => {
    console.log(`🔄 Actualizando atributos de entidad: ${newTableData.name}`);
    
    // 1. Mantener la posición actual
    const currentPosition = element.position();
    
    // 2. Actualizar los datos de la tabla en el elemento
    element.set('tableData', { 
      ...newTableData, 
      x: currentPosition.x, 
      y: currentPosition.y 
    });
    
    // 3. Actualizar los textos visibles
    element.attr('headerText/text', newTableData.name);
    element.attr('identifierText/text', newTableData.identifier);
    
    // 4. Actualizar descripción si existe
    const currentDescription = element.attr('descriptionText/text');
    if (newTableData.description) {
      if (currentDescription === undefined) {
        // Agregar descripción si no existe
        element.attr('description', {
          refWidth: '100%',
          height: 40,
          fill: props.isDarkMode ? 'rgba(13, 110, 253, 0.1)' : 'rgba(13, 110, 253, 0.1)',
          stroke: 'none',
          x: 0,
          y: 40
        });
        
        element.attr('descriptionText', {
          text: newTableData.description,
          refX: 10,
          refY: 60,
          textAnchor: 'start',
          yAlignment: 'middle',
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
          fill: props.isDarkMode ? '#adb5bd' : '#495057'
        });
        
        // Agregar al markup si no existe
        const markup = element.markup as any[];
        markup.push(
          { tagName: 'rect', selector: 'description' },
          { tagName: 'text', selector: 'descriptionText' }
        );
        element.markup = markup;
      } else {
        // Actualizar descripción existente
        element.attr('descriptionText/text', newTableData.description);
      }
    } else if (currentDescription !== undefined) {
      // Remover descripción si ya no existe
      element.removeAttr('description');
      element.removeAttr('descriptionText');
      
      // Remover del markup
      const markup = element.markup as any[];
      const filteredMarkup = markup.filter(item => 
        item.selector !== 'description' && item.selector !== 'descriptionText'
      );
      element.markup = filteredMarkup;
    }
    
    // 5. Actualizar campos individuales
    const fields = newTableData.tableFields || [];
    
    // Actualizar campos existentes
    fields.forEach((field: TableField, index: number) => {
      const isPK = field.identifier === 'id' || (field.isUnique && field.fieldFormat === 'integer');
      const isRelation = field.fieldFormat === 'relation';
      const fieldColor = isPK ? '#dc3545' : isRelation ? '#ffc107' : (props.isDarkMode ? '#f5f5f5' : '#333333');
      const fontWeight = isPK || isRelation ? 'bold' : 'normal';
      
      // Actualizar o crear atributos del campo
      element.attr(`fieldText${field.id}/text`, field.name);
      element.attr(`fieldFormat${field.id}/text`, field.fieldFormat + (field.isRequired ? ' *' : ''));
      element.attr(`fieldText${field.id}/fill`, fieldColor);
      element.attr(`fieldFormat${field.id}/fill`, fieldColor);
      element.attr(`fieldText${field.id}/fontWeight`, fontWeight);
      element.attr(`fieldFormat${field.id}/fontWeight`, fontWeight);
    });
    
    // 6. Actualizar footer
    const relationCount = fields.filter((f: TableField) => f.fieldFormat === 'relation').length;
    element.attr('footerText/text', `${fields.length} campos • ${relationCount} relaciones`);
    
    console.log(`✅ Atributos actualizados para ${newTableData.name}:`, {
      posición: currentPosition,
      draggable: element.get('draggable'),
      campos: fields.length
    });
    
    return element;
  };

  // Función optimizada para manejar la rueda del ratón
  const handleWheel = (evt: WheelEvent) => {
    evt.preventDefault();
    
    const currentPaper = getPaper();
    const container = getPaperContainer();
    if (!currentPaper || !container) return;

    // Cancelar RAF anterior
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    // Usar RAF para un zoom más suave
    rafId = requestAnimationFrame(() => {
      const delta = -Math.sign(evt.deltaY);
      const currentScale = currentPaper.scale().sx;
      const zoomFactor = 0.15; // Reducido para mayor suavidad
      const newScale = currentScale * (1 + delta * zoomFactor);
      const clampedScale = Math.max(0.3, Math.min(2, newScale));
      
      const rect = container.getBoundingClientRect();
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
      rafId = null;
    });
  };

  // Manejar pointer down en elementos - OPTIMIZADO
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
    
    const container = getPaperContainer();
    if (container) {
      container.style.cursor = 'grabbing';
    }
    
    event.preventDefault();
    event.stopPropagation();
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
    
    const container = getPaperContainer();
    if (container) {
      container.style.cursor = 'grabbing';
    }
    
    event.preventDefault();
    event.stopPropagation();
  };

  // Función optimizada para arrastre del paper
  const handlePaperDrag = (evt: MouseEvent) => {
    if (!isDragging() || !props.isDraggable || props.isConnecting) return;

    // Cancelar RAF anterior
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    // Usar RAF para un arrastre más suave
    rafId = requestAnimationFrame(() => {
      const deltaX = evt.clientX - dragStartPos().x;
      const deltaY = evt.clientY - dragStartPos().y;
      
      const newTx = paperStartPos().tx + deltaX;
      const newTy = paperStartPos().ty + deltaY;
      
      const currentPaper = getPaper();
      if (currentPaper) {
        currentPaper.translate(newTx, newTy);
      }
      
      rafId = null;
    });
    
    evt.preventDefault();
    evt.stopPropagation();
  };

  // Función para mouse up - OPTIMIZADA
  const handleMouseUp = () => {
    setIsDragging(false);
    
    // Cancelar RAF si existe
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    const container = getPaperContainer();
    if (container) {
      container.style.cursor = props.isDraggable ? 'grab' : 'default';
    }
    
    // Guardar todas las posiciones al soltar
    saveAllPositionsImmediately();
  };

  // Sincronizar relaciones
  const syncRelationships = (rels: Relationship[]) => {
    const currentGraph = getGraph();
    if (!currentGraph) return;

    // Limpiar relaciones existentes
    const existingLinks = currentGraph.getLinks();
    existingLinks.forEach(link => {
      link.remove();
    });

    console.log('🔗 Sincronizando relaciones:', rels.length);

    // Crear nuevas relaciones
    rels.forEach((rel: Relationship) => {
      const link = createRelationshipLink(rel);
      if (link) {
        currentGraph.addCell(link);
      }
    });
  };

  // Función para actualizar configuración de arrastre en elementos existentes
  const updateElementDraggability = () => {
    const currentPaper = getPaper();
    if (!currentPaper) return;
    
    // Actualizar configuración del paper
    currentPaper.options.interactive = {
      elementMove: props.isDraggable,
      linkMove: false,
      addLinkFromMagnet: false,
      stopDelegation: false
    };
    
    // Actualizar propiedad draggable en todos los elementos
    elementMap.forEach(element => {
      element.set('draggable', props.isDraggable);
    });
    
    console.log(`🔄 Modo arrastre actualizado: ${props.isDraggable ? 'ACTIVADO' : 'DESACTIVADO'}`);
  };

  // Inicializar JointJS - VERSIÓN MEJORADA
  const initializeJointJS = () => {
    const container = getPaperContainer();
    if (!container) {
      console.log('❌ paperContainer no disponible');
      return;
    }

    console.log('🚀 Inicializando JointJS...');
    
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }

    try {
      // Limpiar instancia anterior
      if (graph) {
        graph.clear();
      }
      
      if (paper) {
        paper.remove();
      }

      // Crear nuevo graph
      graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
      
      const backgroundColor = props.isDarkMode ? '#1a1a1a' : '#f5f5f5';
      
      // Crear nuevo paper CON CONFIGURACIÓN COMPLETA
      paper = new joint.dia.Paper({
        el: container,
        model: graph,
        width: '100%',
        height: '100%',
        gridSize: 1,
        drawGrid: false,
        background: {
          color: backgroundColor
        },
        // CONFIGURACIÓN COMPLETA DE INTERACTIVIDAD
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
        clickThreshold: 5,
        highlightOn: {
          'blank:pointerdown': false,
          'element:pointerdown': false
        }
      });

      // Configurar eventos - CRÍTICO: Detectar clics en el header de entidad
      paper.on('element:pointerclick', (cellView, evt) => {
        handleElementClick(cellView, evt);
      });

      // Escuchar cambios de posición con throttling
      paper.on('cell:pointerup', (cellView, evt) => {
        if (props.isDraggable && cellView.model.isElement()) {
          const element = cellView.model;
          const position = element.position();
          const tableData = element.get('tableData') as TableData;
          if (tableData) {
            savePositionToLocalStorage(tableData.id, position.x, position.y);
          }
        }
      });

      // Configurar eventos de arrastre
      paper.on('element:pointerdown', handleElementPointerDown);
      paper.on('blank:pointerdown', handleBlankPointerDown);

      // Escuchar eventos de movimiento
      paper.on('cell:mouseover', (cellView, evt) => {
        props.onPaperMouseMove(evt as unknown as MouseEvent);
      });

      paper.on('cell:mouseout', (cellView, evt) => {
        props.onPaperMouseMove(evt as unknown as MouseEvent);
      });

      // Agregar event listener para rueda del ratón
      container.addEventListener('wheel', handleWheel, { passive: false });

      // Manejo de eventos de teclado
      const handleKeyDown = (e: KeyboardEvent) => {
        props.onKeyDown(e);
      };

      document.addEventListener('keydown', handleKeyDown);

      // Cleanup para el event listener de teclado
      onCleanup(() => {
        document.removeEventListener('keydown', handleKeyDown);
      });

      if (container) {
        container.style.cursor = props.isDraggable ? 'grab' : 'default';
      }
      
      // Agregar event listeners para arrastre global
      container.addEventListener('mousemove', handlePaperDrag);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseUp);
      
      // Marcar como inicializado
      setIsInitialized(true);
      console.log('✅ JointJS inicializado correctamente');
      
      // Limpiar mapas de elementos y hashes
      elementMap.clear();
      tableDataHash.clear();
      
      // Notificar que JointJS está listo
      if (props.onJointReady) {
        setTimeout(() => {
          props.onJointReady!();
        }, 100);
      }
      
      // Cargar datos iniciales
      initializationTimeout = setTimeout(() => {
        loadInitialData();
      }, 150);
      
    } catch (error) {
      console.error('❌ Error inicializando JointJS:', error);
    }
  };

  // Cargar datos iniciales
  const loadInitialData = () => {
    const currentGraph = getGraph();
    const currentPaper = getPaper();
    
    if (!currentGraph || !currentPaper) {
      console.log('❌ Graph o Paper no inicializados');
      return;
    }

    console.log('🔄 Cargando datos iniciales...');
    
    const tables = props.tablesData;
    const rels = props.relationships;

    console.log('📦 Datos a cargar:', {
      tablas: tables.length,
      relaciones: rels.length
    });

    if (tables.length === 0) {
      console.log('⚠️ No hay tablas para mostrar');
      return;
    }

    // Limpiar graph
    currentGraph.clear();
    elementMap.clear();
    tableDataHash.clear();
    
    // Agregar entidades
    tables.forEach((table: TableData) => {
      console.log(`➕ Creando entidad: ${table.name} en (${table.x}, ${table.y})`);
      try {
        const entityElement = createEntityElement(table);
        currentGraph.addCell(entityElement);
        elementMap.set(table.id, entityElement);
        // Guardar hash inicial de los datos
        tableDataHash.set(table.id, generateTableHash(table));
      } catch (error) {
        console.error(`❌ Error creando entidad ${table.name}:`, error);
      }
    });

    // Sincronizar relaciones
    syncRelationships(rels);

    console.log('✅ Diagrama cargado:', {
      elementos: currentGraph.getElements().length,
      enlaces: currentGraph.getLinks().length
    });
  };

  // SOLUCIÓN SIMPLIFICADA: Función para actualizar entidades SIN RECREAR ELEMENTOS
  const updateEntities = (newTables: TableData[]) => {
    const currentGraph = getGraph();
    const currentPaper = getPaper();
    
    if (!currentGraph || !currentPaper) {
      console.log('❌ Graph o Paper no disponibles');
      return;
    }

    console.log('🔄 Actualizando entidades (sin recrear):', newTables.length);

    // Obtener IDs de tablas actuales y nuevas
    const currentTableIds = Array.from(elementMap.keys());
    const newTableIds = newTables.map(table => table.id);
    
    // Encontrar tablas para eliminar
    const tablesToRemove = currentTableIds.filter(id => !newTableIds.includes(id));
    
    if (tablesToRemove.length > 0) {
      console.log('🗑️ Eliminando tablas:', tablesToRemove);
      tablesToRemove.forEach(tableId => {
        const element = elementMap.get(tableId);
        if (element) {
          element.remove();
          elementMap.delete(tableId);
          tableDataHash.delete(tableId);
        }
      });
    }

    // Procesar cada tabla nueva
    newTables.forEach((newTable: TableData) => {
      const existingElement = elementMap.get(newTable.id);
      const newHash = generateTableHash(newTable);
      const oldHash = tableDataHash.get(newTable.id);
      
      if (existingElement) {
        // Si existe, verificar si hubo cambios significativos
        if (oldHash !== newHash) {
          console.log(`🔄 Cambios detectados en: ${newTable.name}`);
          console.log(`   Hash anterior: ${oldHash?.substring(0, 50)}...`);
          console.log(`   Hash nuevo: ${newHash?.substring(0, 50)}...`);
          
          // SOLUCIÓN CRÍTICA: Actualizar solo atributos, NO recrear el elemento
          updateEntityAttributes(existingElement, newTable);
          tableDataHash.set(newTable.id, newHash);
        } else {
          console.log(`✅ Sin cambios en: ${newTable.name}`);
          // Solo actualizar propiedades básicas
          const currentPosition = existingElement.position();
          existingElement.set('tableData', { 
            ...newTable, 
            x: currentPosition.x, 
            y: currentPosition.y 
          });
        }
      } else {
        // Solo crear NUEVAS entidades desde cero
        console.log(`➕ Creando NUEVA entidad: ${newTable.name}`);
        
        try {
          const entityElement = createEntityElement(newTable);
          
          currentGraph.addCell(entityElement);
          elementMap.set(newTable.id, entityElement);
          tableDataHash.set(newTable.id, newHash);
          
          console.log(`✅ Nueva entidad creada: ${newTable.name} (ID: ${newTable.id})`);
        } catch (error) {
          console.error(`❌ Error creando entidad ${newTable.name}:`, error);
        }
      }
    });

    console.log('✅ Entidades actualizadas:', {
      elementos: elementMap.size,
      tablasNuevas: newTables.length
    });
  };

  // Función para forzar actualización completa (refreshTrigger)
  const forceCompleteUpdate = () => {
    console.log('🔄 Forzando actualización COMPLETA del diagrama');
    
    const currentTables = props.tablesData;
    const currentRels = props.relationships;
    
    if (currentTables.length > 0) {
      // Actualizar entidades con recreación completa
      updateEntities(currentTables);
      
      // Sincronizar relaciones
      syncRelationships(currentRels);
      
      // Actualizar modo arrastre
      updateElementDraggability();
      
      console.log(`✅ Actualización forzada completada: ${currentTables.length} tablas`);
    }
  };

  // Efecto principal para actualizar diagrama cuando cambian los datos
  createEffect(() => {
    if (!isInitialized()) return;
    
    const newTables = props.tablesData;
    const newRels = props.relationships;
    
    console.log('📊 Actualizando diagrama con nuevos datos...', {
      nuevasTablas: newTables.length,
      nuevasRelaciones: newRels.length,
      elementosActuales: elementMap.size
    });

    // Actualizar entidades (SIN RECREAR ELEMENTOS)
    updateEntities(newTables);
    
    // Sincronizar relaciones
    syncRelationships(newRels);
    
    console.log('✅ Diagrama actualizado:', {
      elementos: elementMap.size,
      relaciones: newRels.length
    });
  });

  // Efecto específico para manejar refreshTrigger (actualización forzada)
  createEffect(() => {
    if (!isInitialized()) return;
    
    const refreshTrigger = props.refreshTrigger;
    if (refreshTrigger !== undefined) {
      console.log(`🔄 Refresh trigger detectado: ${refreshTrigger}`);
      forceCompleteUpdate();
    }
  });

  // Efecto para modo arrastre - VERSIÓN SIMPLIFICADA
  createEffect(() => {
    if (!isInitialized()) return;
    
    console.log(`🎮 ACTUALIZANDO MODO ARRASTRE: ${props.isDraggable ? 'ACTIVADO' : 'DESACTIVADO'}`);
    
    updateElementDraggability();
    
    const container = getPaperContainer();
    if (container) {
      if (props.isConnecting) {
        container.style.cursor = 'crosshair';
      } else if (props.isDraggable) {
        container.style.cursor = isDragging() ? 'grabbing' : 'grab';
      } else {
        container.style.cursor = 'default';
      }
    }
    
    console.log(`✅ Modo arrastre aplicado a ${elementMap.size} elementos`);
  });

  // Efecto para actualizar zoom
  createEffect(() => {
    if (isInitialized()) {
      const currentPaper = getPaper();
      if (currentPaper) {
        currentPaper.scale(props.scale, props.scale);
      }
    }
  });

  // Efecto para modo oscuro
  createEffect(() => {
    if (isInitialized() && paper) {
      const backgroundColor = props.isDarkMode ? '#1a1a1a' : '#f5f5f5';
      paper.drawBackground({
        color: backgroundColor
      });
      
      // Actualizar colores de los elementos existentes
      elementMap.forEach(element => {
        element.attr('body/fill', props.isDarkMode ? '#2d2d2d' : '#ffffff');
        element.attr('addFieldSection/fill', props.isDarkMode ? '#3d3d3d' : '#f8f9fa');
        element.attr('footer/fill', props.isDarkMode ? '#444' : '#e9ecef');
      });
    }
  });

  // Efecto para conexión temporal
  createEffect(() => {
    if (props.isConnecting) {
      const container = getPaperContainer();
      if (container) {
        container.style.cursor = 'crosshair';
      }
    }
  });

  // Cleanup optimizado
  onCleanup(() => {
    console.log('🧹 Limpiando JointJS Diagram');
    
    // Cancelar RAF
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }
    
    // Limpiar todos los timers del cache de posición
    positionSaveCache.forEach((cache) => {
      if (cache.timer) {
        clearTimeout(cache.timer);
      }
    });
    positionSaveCache.clear();
    
    const container = getPaperContainer();
    if (container) {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousemove', handlePaperDrag);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    }
    
    // Limpiar mapas
    elementMap.clear();
    tableDataHash.clear();
    
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

  // Inicializar cuando el contenedor esté disponible
  onMount(() => {
    if (paperContainer && !isInitialized()) {
      console.log('📝 Inicializando JointJS en onMount...');
      setTimeout(() => initializeJointJS(), 10);
    }
  });

  return (
    <div class="joint-container">
      <div 
        class="joint-paper" 
        ref={el => {
          paperContainer = el; // Asignar directamente
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
          <Show when={elementMap.size > 0}>
            <span class="element-count-hint">
              <i class="bi bi-layers"></i> {elementMap.size} entidades
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