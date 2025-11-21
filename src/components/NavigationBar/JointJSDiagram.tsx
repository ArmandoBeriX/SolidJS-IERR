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

  let graph: joint.dia.Graph | null = null;
  let paper: joint.dia.Paper | null = null;
  let paperContainer: HTMLDivElement | undefined;
  let initializationTimeout: number | null = null;

  // Función auxiliar para calcular posición Y del campo
  const calculateFieldYPosition = (fieldPosition: number, hasDescription: boolean = false) => {
    const headerHeight = 40;
    const fieldHeight = 36;
    const descriptionHeight = hasDescription ? 40 : 0;
    
    return headerHeight + descriptionHeight + ((fieldPosition - 1) * fieldHeight) + (fieldHeight / 2);
  };

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
      
      // NOMBRE DEL CAMPO - CLICKEABLE
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

  // Inicializar JointJS
  const initializeJointJS = () => {
    if (!paperContainer) {
      console.log('❌ paperContainer no está disponible');
      return;
    }

    console.log('🚀 Inicializando JointJS...');
    
    // Limpiar timeout anterior si existe
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
    }

    try {
      // Crear graph
      graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
      
      const backgroundColor = props.isDarkMode ? '#1a1a1a' : '#f5f5f5';
      
      // Crear paper
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
        preventDefaultViewAction: false
      });

      // Configurar eventos
      paper.on('element:pointerdown', props.onElementClick);
      paper.on('element:addFieldButton:pointerdown', props.onElementClick);
      paper.on('element:addFieldClickArea:pointerdown', props.onElementClick);
      paper.on('element:header:pointerdown', props.onElementClick);

      // Manejo de eventos de arrastre
      paper.on('blank:pointerdown', (evt: joint.dia.Event) => {
        if (!props.isDraggable || props.isConnecting) return;
        
        const event = evt as unknown as MouseEvent;
        setIsDragging(true);
        setDragStartPos({ x: event.clientX, y: event.clientY });
        const currentPaper = getPaper();
        if (currentPaper) {
          const translate = currentPaper.translate();
          setPaperStartPos({ tx: translate.tx, ty: translate.ty });
        }
        
        if (paperContainer) {
          paperContainer.style.cursor = 'grabbing';
        }
        event.preventDefault();
      });

      paper.on('cell:pointerup blank:pointerup', () => {
        setIsDragging(false);
        if (paperContainer) {
          paperContainer.style.cursor = props.isDraggable ? 'grab' : 'default';
        }
      });

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

      const handleMouseMove = (evt: MouseEvent) => {
        handlePaperDrag(evt);
        props.onPaperMouseMove(evt);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        if (paperContainer) {
          paperContainer.style.cursor = props.isDraggable ? 'grab' : 'default';
        }
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      paper.on('blank:pointerdown', () => {
        if (!props.isDraggable || props.isConnecting) return;
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });

      // Zoom con rueda del mouse
      paper.on('blank:mousewheel', (evt: joint.dia.Event, x: number, y: number, delta: number) => {
        evt.preventDefault();
        const currentPaper = getPaper();
        if (!currentPaper) return;

        const currentScale = currentPaper.scale().sx;
        const zoomFactor = 0.001;
        const newScale = currentScale + delta * zoomFactor;
        const clampedScale = Math.max(0.3, Math.min(2, newScale));
        
        const event = evt as unknown as WheelEvent;
        const clientX = event.clientX;
        const clientY = event.clientY;
        
        if (clientX !== undefined && clientY !== undefined) {
          try {
            const localPoint = currentPaper.clientToLocalPoint(clientX, clientY);
            currentPaper.translate(
              clientX - localPoint.x * clampedScale,
              clientY - localPoint.y * clampedScale
            );
          } catch (error) {
            console.log('Error in zoom calculation, using fallback');
          }
        }
        
        currentPaper.scale(clampedScale, clampedScale);
        props.onZoomChange(clampedScale);
      });

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
    
    // Limpiar solo si ya hay elementos
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
          // Intentar diferentes métodos de ajuste de vista
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
    // La inicialización se hará cuando el contenedor esté disponible
  });

  // Efecto para manejar cambios en los datos
  createEffect(() => {
    if (isInitialized() && props.tablesData.length > 0) {
      console.log('📊 Datos actualizados, cargando en diagrama...');
      loadDataToDiagram();
    }
  });

  // Efecto para cambios en isDraggable
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

  // Efecto para cambios en scale
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
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', props.onKeyDown);
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
          // Inicializar inmediatamente cuando el contenedor esté disponible
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
          pointerEvents: 'none', // CORREGIDO: camelCase
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