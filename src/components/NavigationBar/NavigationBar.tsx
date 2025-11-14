// src/components/NavigationBar/NavigationBar.tsx
import { createSignal, createEffect, onMount } from 'solid-js';
import type { JSX } from 'solid-js';
import './NavigationBar.css';

// Importar JointJS desde @joint/core
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

interface SearchInfo {
  term: string;
  results: number;
  currentIndex: number;
  hasResults: boolean;
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  content: JSX.Element | null;
  onSave: (() => void) | null;
  onClose: (() => void) | null;
  showDeleteButton: boolean;
  onDelete: (() => void) | null;
  showSaveButton: boolean;
  saveButtonText: string;
}

const NavigationBar = () => {
  const [isDarkMode, setDarkMode] = createSignal<boolean>(false);
  const [showDetails, setShowDetails] = createSignal<boolean>(false);
  const [tablesData, setTablesData] = createSignal<TableData[]>([]);
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [isDraggable, setIsDraggable] = createSignal<boolean>(true);
  const [searchInfo, setSearchInfo] = createSignal<SearchInfo>({
    term: '',
    results: 0,
    currentIndex: -1,
    hasResults: false
  });
  const [modalConfig, setModalConfig] = createSignal<ModalConfig>({
    isOpen: false,
    title: '',
    content: null,
    onSave: null,
    onClose: null,
    showDeleteButton: false,
    onDelete: null,
    showSaveButton: true,
    saveButtonText: 'Guardar'
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal<boolean>(false);
  const [searchTerm, setSearchTerm] = createSignal<string>('');
  const [scale, setScale] = createSignal<number>(1);
  
  const [relationships, setRelationships] = createSignal<Relationship[]>([]);

  // Referencias para JointJS
  let graph: joint.dia.Graph;
  let paper: joint.dia.Paper;
  let paperContainer: HTMLDivElement | undefined;

  // Generar datos de ejemplo
  const generateExampleData = (): TableData[] => {
    return [
      {
        id: 1,
        identifier: 'users',
        name: 'Users',
        description: 'Tabla de usuarios del sistema',
        x: 100,
        y: 100,
        tableFields: [
          { 
            id: 1, 
            tableId: 1, 
            identifier: 'id', 
            name: 'ID', 
            fieldFormat: 'integer', 
            multiple: false, 
            isRequired: true, 
            isFilter: false, 
            isUnique: true, 
            default: null, 
            relationTableIdentifier: null, 
            isEditable: false, 
            isVisible: true, 
            position: 1, 
            description: 'Primary key', 
            storeData: {}, 
            history: false 
          },
          { 
            id: 2, 
            tableId: 1, 
            identifier: 'username', 
            name: 'Username', 
            fieldFormat: 'string', 
            multiple: false, 
            isRequired: true, 
            isFilter: false, 
            isUnique: true, 
            default: null, 
            relationTableIdentifier: null, 
            isEditable: true, 
            isVisible: true, 
            position: 2, 
            description: 'Nombre de usuario', 
            storeData: {}, 
            history: false 
          },
          { 
            id: 3, 
            tableId: 1, 
            identifier: 'email', 
            name: 'Email', 
            fieldFormat: 'string', 
            multiple: false, 
            isRequired: true, 
            isFilter: false, 
            isUnique: true, 
            default: null, 
            relationTableIdentifier: null, 
            isEditable: true, 
            isVisible: true, 
            position: 3, 
            description: 'Correo electrónico', 
            storeData: {}, 
            history: false 
          }
        ]
      },
      {
        id: 2,
        identifier: 'posts',
        name: 'Posts',
        description: 'Tabla de artículos del blog',
        x: 400,
        y: 100,
        tableFields: [
          { 
            id: 4, 
            tableId: 2, 
            identifier: 'id', 
            name: 'ID', 
            fieldFormat: 'integer', 
            multiple: false, 
            isRequired: true, 
            isFilter: false, 
            isUnique: true, 
            default: null, 
            relationTableIdentifier: null, 
            isEditable: false, 
            isVisible: true, 
            position: 1, 
            description: 'Primary key', 
            storeData: {}, 
            history: false 
          },
          { 
            id: 5, 
            tableId: 2, 
            identifier: 'title', 
            name: 'Title', 
            fieldFormat: 'string', 
            multiple: false, 
            isRequired: true, 
            isFilter: false, 
            isUnique: false, 
            default: null, 
            relationTableIdentifier: null, 
            isEditable: true, 
            isVisible: true, 
            position: 2, 
            description: 'Título del artículo', 
            storeData: {}, 
            history: false 
          },
          { 
            id: 6, 
            tableId: 2, 
            identifier: 'content', 
            name: 'Content', 
            fieldFormat: 'text', 
            multiple: false, 
            isRequired: false, 
            isFilter: false, 
            isUnique: false, 
            default: null, 
            relationTableIdentifier: null, 
            isEditable: true, 
            isVisible: true, 
            position: 3, 
            description: 'Contenido del artículo', 
            storeData: {}, 
            history: false 
          },
          { 
            id: 7, 
            tableId: 2, 
            identifier: 'user_id', 
            name: 'Author', 
            fieldFormat: 'relation', 
            multiple: false, 
            isRequired: true, 
            isFilter: false, 
            isUnique: false, 
            default: null, 
            relationTableIdentifier: 'users', 
            isEditable: true, 
            isVisible: true, 
            position: 4, 
            description: 'Foreign key to users', 
            storeData: {}, 
            history: false 
          }
        ]
      }
    ];
  };

  // Generar relaciones
  const generateRelationships = (tables: TableData[]): Relationship[] => {
    const rels: Relationship[] = [];
    
    tables.forEach(table => {
      if (table.tableFields) {
        table.tableFields.forEach(field => {
          if (field.relationTableIdentifier && field.fieldFormat === 'relation') {
            rels.push({
              id: `${table.identifier}-${field.relationTableIdentifier}`,
              source: field.relationTableIdentifier,
              target: table.identifier,
              type: 'one-to-many',
              label: field.name
            });
          }
        });
      }
    });

    // Relación de ejemplo entre users y posts
    if (rels.length === 0 && tables.length >= 2) {
      rels.push({
        id: 'users-posts',
        source: 'users',
        target: 'posts',
        type: 'one-to-many',
        label: 'author'
      });
    }

    return rels;
  };

  // Función para resaltar resultados de búsqueda
  const highlightSearchResults = (term: string) => {
    if (!graph) return;

    const elements = graph.getElements();
    const searchTerm = term.toLowerCase();

    elements.forEach(element => {
      const tableName = element.get('tableName')?.toLowerCase() || '';
      const tableId = element.get('tableId')?.toLowerCase() || '';
      
      const isMatch = tableName.includes(searchTerm) || tableId.includes(searchTerm);
      
      if (isMatch && searchTerm) {
        element.attr('body/stroke', '#ffc107');
        element.attr('body/strokeWidth', 3);
        element.attr('header/fill', '#ffc107');
        element.attr('body/filter', 'drop-shadow(0 4px 20px rgba(255, 193, 7, 0.4))');
      } else {
        element.attr('body/stroke', '#0d6efd');
        element.attr('body/strokeWidth', 2);
        element.attr('header/fill', '#0d6efd');
        element.attr('body/filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))');
      }
    });
  };

  // Definir una forma personalizada para las entidades ER (Réplica del diseño React Flow)
  const createEntityElement = (table: TableData) => {
    const fields = table.tableFields || [];
    const headerHeight = 40;
    const fieldHeight = 36;
    const padding = 10;
    const descriptionHeight = table.description ? 40 : 0;
    const footerHeight = 30;
    
    // Calcular dimensiones basadas en el contenido
    const maxFieldNameWidth = Math.max(
      ...fields.map(field => field.name.length * 7),
      150
    );
    const maxFormatWidth = Math.max(
      ...fields.map(field => (field.fieldFormat + (field.isRequired ? ' *' : '')).length * 6),
      80
    );
    
    const width = Math.max(320, maxFieldNameWidth + maxFormatWidth + 40);
    const contentHeight = fields.length * fieldHeight;
    const height = headerHeight + descriptionHeight + contentHeight + footerHeight;

    // Definir la forma personalizada para entidades ER
    const Entity = joint.dia.Element.define('er.Entity', {
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          strokeWidth: 2,
          stroke: '#0d6efd',
          fill: isDarkMode() ? '#2d2d2d' : '#ffffff',
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
          ry: 8
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
          fill: '#ffffff'
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
          fill: 'rgba(255, 255, 255, 0.9)'
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

    // Crear la instancia del elemento
    const entity = new Entity();
    entity.resize(width, height);
    entity.position(table.x || 0, table.y || 0);
    entity.set('tableId', table.identifier);
    entity.set('tableName', table.name);

    // Agregar descripción si existe
    if (table.description) {
      entity.attr('description', {
        refWidth: '100%',
        height: descriptionHeight,
        fill: isDarkMode() ? 'rgba(13, 110, 253, 0.1)' : 'rgba(13, 110, 253, 0.1)',
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
        fill: isDarkMode() ? '#adb5bd' : '#495057'
      });

      // Agregar al markup
      const markup = entity.markup as any[];
      markup.push(
        { tagName: 'rect', selector: 'description' },
        { tagName: 'text', selector: 'descriptionText' }
      );
      entity.markup = markup;
    }

    // Agregar campos
    const descriptionOffset = table.description ? descriptionHeight : 0;
    fields.forEach((field, index) => {
      const yPos = headerHeight + descriptionOffset + (index * fieldHeight);
      
      // Determinar estilos basados en el tipo de campo
      const isPK = field.isUnique && field.fieldFormat === 'integer';
      const isRelation = field.fieldFormat === 'relation';
      
      const fieldBackgroundColor = isPK ? 
        'rgba(220, 53, 69, 0.1)' : 
        isRelation ? 
        'rgba(255, 193, 7, 0.15)' : 
        'transparent';
      
      const separatorColor = isPK ? '#dc3545' : isRelation ? '#ffc107' : '#e9ecef';
      const separatorWidth = isPK || isRelation ? 4 : 1;
      
      const fieldColor = isPK ? '#dc3545' : isRelation ? '#ffc107' : (isDarkMode() ? '#f5f5f5' : '#333333');
      const fontWeight = isPK || isRelation ? 'bold' : 'normal';

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

      // Icono para campos especiales
      if (isPK || isRelation) {
        entity.attr(`fieldIcon${field.id}`, {
          text: isPK ? '🔑' : '🔗',
          refX: 10,
          refY: yPos + fieldHeight / 2,
          textAnchor: 'start',
          yAlignment: 'middle',
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
          fill: fieldColor
        });
      }

      // Nombre del campo
      entity.attr(`fieldText${field.id}`, {
        text: field.name,
        refX: (isPK || isRelation) ? 30 : 10,
        refY: yPos + fieldHeight / 2,
        textAnchor: 'start',
        yAlignment: 'middle',
        fontSize: 13,
        fontWeight: fontWeight,
        fontFamily: 'Arial, sans-serif',
        fill: fieldColor
      });

      // Formato del campo
      const formatText = field.fieldFormat + (field.isRequired ? ' *' : '');
      entity.attr(`fieldFormat${field.id}`, {
        text: formatText,
        refX: width - 10,
        refY: yPos + fieldHeight / 2,
        textAnchor: 'end',
        yAlignment: 'middle',
        fontSize: 11,
        fontWeight: fontWeight,
        fontFamily: 'Arial, sans-serif',
        fill: fieldColor
      });

      // Agregar al markup
      const markup = entity.markup as any[];
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

    // Agregar footer con estadísticas
    const footerY = headerHeight + descriptionOffset + (fields.length * fieldHeight);
    entity.attr('footer', {
      refWidth: '100%',
      height: footerHeight,
      fill: isDarkMode() ? '#444' : '#e9ecef',
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
      fill: isDarkMode() ? '#adb5bd' : '#6c757d'
    });

    // Agregar footer al markup
    const markup = entity.markup as any[];
    markup.push(
      { tagName: 'rect', selector: 'footer' },
      { tagName: 'text', selector: 'footerText' }
    );
    entity.markup = markup;

    return entity;
  };

  // Inicializar JointJS
  const initializeJointJS = () => {
    if (!paperContainer) return;

    // Crear graph y paper
    graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    const backgroundColor = isDarkMode() ? '#1a1a1a' : '#f5f5f5';
    
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
        elementMove: isDraggable(),
        linkMove: false
      },
      cellViewNamespace: joint.shapes
    });

    // Configurar zoom con la rueda del mouse
    paper.on('blank:mousewheel', (evt: joint.dia.Event, x: number, y: number, delta: number) => {
      evt.preventDefault();
      const currentScale = paper.scale().sx;
      const newScale = currentScale + delta * 0.001;
      const clampedScale = Math.max(0.3, Math.min(2, newScale));
      paper.scale(clampedScale, clampedScale);
      setScale(clampedScale);
    });

    // Cargar datos en el diagrama
    loadDataToDiagram();
  };

  // Cargar datos al diagrama de JointJS
  const loadDataToDiagram = () => {
    if (!graph) return;

    // Limpiar el diagrama existente
    graph.clear();

    const tables = tablesData();
    const rels = relationships();

    // Crear elementos para cada tabla
    tables.forEach(table => {
      const entityElement = createEntityElement(table);
      graph.addCell(entityElement);
    });

    // Crear conexiones para las relaciones
    rels.forEach(rel => {
      const sourceElement = graph.getElements().find(el => el.get('tableId') === rel.source);
      const targetElement = graph.getElements().find(el => el.get('tableId') === rel.target);

      if (sourceElement && targetElement) {
        const link = new joint.shapes.standard.Link();
        link.source(sourceElement);
        link.target(targetElement);
        link.attr({
          line: {
            stroke: isDarkMode() ? '#0d6efd' : '#007bff',
            strokeWidth: 2,
            targetMarker: {
              'type': 'path',
              'd': 'M 10 -5 0 0 10 5 z',
              'fill': isDarkMode() ? '#0d6efd' : '#007bff'
            }
          }
        });
        
        // Agregar label a la conexión
        link.appendLabel({
          attrs: {
            text: {
              text: rel.label,
              fill: isDarkMode() ? '#f5f5f5' : '#333333',
              'font-family': 'Arial, sans-serif',
              'font-size': 11,
              'font-weight': 'bold'
            },
            rect: {
              fill: isDarkMode() ? '#2d2d2d' : '#ffffff',
              stroke: isDarkMode() ? '#0d6efd' : '#007bff',
              strokeWidth: 1,
              rx: 3,
              ry: 3
            }
          }
        });

        graph.addCell(link);
      }
    });

    // Ajustar la vista para mostrar todos los elementos
    if (tables.length > 0) {
      paper.scaleContentToFit({ padding: 50 });
      const currentScale = paper.scale().sx;
      setScale(currentScale);
    }
  };

  // Función para recrear el paper con nuevo fondo
  const recreatePaperWithBackground = (color: string) => {
    if (!paper || !paperContainer) return;

    // Guardar el estado actual
    const currentScale = paper.scale().sx;
    const currentTranslate = paper.translate();
    
    // Destruir el paper existente
    paper.remove();
    
    // Crear nuevo paper con el color de fondo actualizado
    paper = new joint.dia.Paper({
      el: paperContainer,
      model: graph,
      width: '100%',
      height: '100%',
      gridSize: 1,
      drawGrid: false,
      background: {
        color: color
      },
      interactive: {
        elementMove: isDraggable(),
        linkMove: false
      },
      cellViewNamespace: joint.shapes
    });

    // Restaurar el estado
    paper.scale(currentScale, currentScale);
    paper.translate(currentTranslate.tx, currentTranslate.ty);

    // Reconfigurar eventos
    paper.on('blank:mousewheel', (evt: joint.dia.Event, x: number, y: number, delta: number) => {
      evt.preventDefault();
      const currentScale = paper.scale().sx;
      const newScale = currentScale + delta * 0.001;
      const clampedScale = Math.max(0.3, Math.min(2, newScale));
      paper.scale(clampedScale, clampedScale);
      setScale(clampedScale);
    });

    // Volver a cargar los datos
    loadDataToDiagram();
  };

  // Inicializar datos
  onMount(() => {
    const savedData = localStorage.getItem('erDiagramData');
    if (savedData) {
      try {
        const parsedData: TableData[] = JSON.parse(savedData);
        const dataWithCoords = parsedData.map((table, index) => ({
          ...table,
          x: table.x || 100 + (index % 3) * 300,
          y: table.y || 100 + Math.floor(index / 3) * 200
        }));
        setTablesData(dataWithCoords);
        setRelationships(generateRelationships(dataWithCoords));
      } catch (error) {
        console.error('Error loading saved data:', error);
        initializeExampleData();
      }
    } else {
      initializeExampleData();
    }

    // Inicializar JointJS después de un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      initializeJointJS();
    }, 100);
  });

  const initializeExampleData = () => {
    const exampleData = generateExampleData();
    setTablesData(exampleData);
    setRelationships(generateRelationships(exampleData));
  };

  // Efecto para aplicar modo oscuro al diagrama
  createEffect(() => {
    if (paper && graph) {
      // Recrear el paper con el nuevo color de fondo
      const backgroundColor = isDarkMode() ? '#1a1a1a' : '#f5f5f5';
      recreatePaperWithBackground(backgroundColor);
    }
  });

  // Efecto para recargar datos cuando cambian
  createEffect(() => {
    if (graph && paper) {
      loadDataToDiagram();
    }
  });

  // Efecto para cambiar la interactividad
  createEffect(() => {
    if (paper) {
      paper.options.interactive = {
        elementMove: isDraggable(),
        linkMove: false
      };
    }
  });

  // Efecto para aplicar búsqueda cuando cambia el término
  createEffect(() => {
    if (graph) {
      highlightSearchResults(searchTerm());
    }
  });

  // Funciones de zoom para JointJS
  const handleZoomIn = (): void => {
    if (!paper) return;
    const currentScale = paper.scale().sx;
    const newScale = Math.min(2, currentScale * 1.2);
    setScale(newScale);
    paper.scale(newScale, newScale);
  };

  const handleZoomOut = (): void => {
    if (!paper) return;
    const currentScale = paper.scale().sx;
    const newScale = Math.max(0.3, currentScale / 1.2);
    setScale(newScale);
    paper.scale(newScale, newScale);
  };

  const handleCenterView = (): void => {
    if (paper && graph && graph.getElements().length > 0) {
      paper.scaleContentToFit({ padding: 50 });
      const currentScale = paper.scale().sx;
      setScale(currentScale);
    }
  };

  const handleResetZoom = (): void => {
    setScale(1);
    if (paper) {
      paper.scale(1, 1);
    }
  };

  // Resto de funciones existentes...
  const toggleDarkMode = (): void => {
    const newDarkMode = !isDarkMode();
    setDarkMode(newDarkMode);
    document.body.classList.toggle('dark-mode', newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  const toggleDetails = (): void => {
    setShowDetails(!showDetails());
  };

  const toggleDragMode = (): void => {
    setIsDraggable(!isDraggable());
  };

  const handleSearch = (term: string): void => {
    setSearchTerm(term);
    highlightSearchResults(term);
    console.log('🔍 Buscando:', term);
  };

  const handleNextResult = (): void => {
    console.log('➡️ Siguiente resultado');
  };

  const handlePreviousResult = (): void => {
    console.log('⬅️ Resultado anterior');
  };

  const handleFileUpload = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const content = e.target?.result as string;
        if (!content) {
          throw new Error('No se pudo leer el contenido del archivo');
        }

        let jsonData: TableData[];
        
        if (file.name.endsWith('.json')) {
          jsonData = JSON.parse(content) as TableData[];
        } else if (file.name.endsWith('.txt')) {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonData = JSON.parse(jsonMatch[0]) as TableData[];
          } else {
            throw new Error('No se encontró un array JSON válido en el archivo');
          }
        } else {
          throw new Error('Formato de archivo no soportado');
        }

        if (Array.isArray(jsonData)) {
          const dataWithCoords = jsonData.map((table, index) => ({
            ...table,
            x: table.x || 100 + (index % 3) * 300,
            y: table.y || 100 + Math.floor(index / 3) * 200
          }));
          
          setTablesData(dataWithCoords);
          setRelationships(generateRelationships(dataWithCoords));
          localStorage.setItem('erDiagramData', JSON.stringify(dataWithCoords));
        } else {
          throw new Error('El archivo debe contener un array de tablas');
        }
      } catch (error) {
        console.error('❌ Error al procesar el archivo:', error);
        alert(`Error al cargar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
        target.value = '';
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      alert('Error al leer el archivo');
      target.value = '';
    };

    reader.readAsText(file);
  };

  const handleCreateEntity = (): void => {
    console.log('🆕 Creando nueva entidad');
    const newTable: TableData = {
      id: Date.now(),
      identifier: `table_${Date.now()}`,
      name: 'Nueva Tabla',
      description: 'Descripción de la nueva tabla',
      x: 200,
      y: 200,
      tableFields: [
        {
          id: Date.now() + 1,
          tableId: Date.now(),
          identifier: 'id',
          name: 'ID',
          fieldFormat: 'integer',
          multiple: false,
          isRequired: true,
          isFilter: false,
          isUnique: true,
          default: null,
          relationTableIdentifier: null,
          isEditable: false,
          isVisible: true,
          position: 1,
          description: 'Primary key',
          storeData: {},
          history: false
        }
      ]
    };
    
    setTablesData(prev => [...prev, newTable]);
    setRelationships(generateRelationships([...tablesData(), newTable]));
  };

  const closeModal = (): void => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
    setShowDeleteConfirm(false);
  };

  const countRelations = (): number => {
    return relationships().length;
  };

  const handleFileInputChange = (e: Event): void => {
    handleFileUpload(e);
  };

  const handleSearchInput = (e: Event): void => {
    const target = e.currentTarget as HTMLInputElement;
    handleSearch(target.value);
  };

  return (
    <div class={`navigation-container ${isDarkMode() ? 'dark-mode' : ''}`}>
      <div class="navigation-bar">
        
        <div class="nav-section">
          <label class="btn btn-primary" style={{ cursor: 'pointer' }}>
            <input 
              type="file" 
              accept=".json,.txt" 
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              disabled={isLoading()}
            />
            <i class="bi bi-upload"></i>
            {isLoading() ? 'Cargando...' : 'Cargar Esquema'}
          </label>
        </div>

        <div class="nav-section">
          <button 
            class="btn btn-success"
            onClick={handleCreateEntity}
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
              value={searchTerm()}
              onInput={handleSearchInput}
            />
            <div class="search-navigation">
              <button 
                class="nav-arrow" 
                onClick={handlePreviousResult} 
                title="Resultado anterior"
                type="button"
              >
                <i class="bi bi-chevron-up"></i>
              </button>
              <button 
                class="nav-arrow" 
                onClick={handleNextResult} 
                title="Siguiente resultado"
                type="button"
              >
                <i class="bi bi-chevron-down"></i>
              </button>
            </div>
          </div>
          {searchInfo().hasResults && (
            <div class="search-results-indicator">
              <span class="search-results-text">
                {searchInfo().currentIndex + 1} de {searchInfo().results}
              </span>
            </div>
          )}
        </div>

        <div class="nav-section map-controls">
          {/* Botón de modo arrastrar/seleccionar */}
          <button
            class={`control-button ${isDraggable() ? 'active' : ''}`}
            onClick={toggleDragMode}
            title={isDraggable() ? "Modo mover (arrastrar tablas)" : "Modo seleccionar (solo navegación)"}
            type="button"
          >
            <i class={isDraggable() ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
          </button>

          <button 
            class="control-button" 
            onClick={handleZoomIn} 
            title="Zoom +"
            type="button"
          >
            <i class="bi bi-zoom-in"></i>
          </button>
          <button 
            class="control-button" 
            onClick={handleZoomOut} 
            title="Zoom -"
            type="button"
          >
            <i class="bi bi-zoom-out"></i>
          </button>
          <button 
            class="control-button" 
            onClick={handleCenterView} 
            title="Centrar vista"
            type="button"
          >
            <i class="bi bi-fullscreen"></i>
          </button>
        </div>

        <div class="nav-section utility-controls">
          <button
            class={`control-button ${isDarkMode() ? 'active' : ''}`}
            onClick={toggleDarkMode}
            title={isDarkMode() ? "Modo claro" : "Modo oscuro"}
            type="button"
          >
            <i class={isDarkMode() ? "bi bi-sun" : "bi bi-moon"}></i>
          </button>
          
          <button
            class={`control-button ${showDetails() ? 'active' : ''}`}
            onClick={toggleDetails}
            title={showDetails() ? "Ocultar detalles" : "Mostrar detalles"}
            type="button"
          >
            <i class={showDetails() ? "bi bi-info-circle-fill" : "bi bi-info-circle"}></i>
          </button>
        </div>

      </div>

      {showDetails() && (
        <div class="details-panel">
          <h4><i class="bi bi-diagram-3"></i> Diagrama Entidad-Relación</h4>
          <p>Visualización interactiva de tablas y sus relaciones usando JointJS</p>
          <div class="stats">
            <div class="stat">
              <i class="bi bi-table"></i>
              <span>{tablesData().length} Tablas</span>
            </div>
            <div class="stat">
              <i class="bi bi-link-45deg"></i>
              <span>{countRelations()} Relaciones</span>
            </div>
            <div class={`stat mode-stat ${isDraggable() ? 'tables' : 'select'}`}>
              <i class={isDraggable() ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
              <span>{isDraggable() ? "Modo Mover" : "Modo Seleccionar"}</span>
            </div>
            <div class="stat">
              <i class="bi bi-zoom-in"></i>
              <span>Zoom: {Math.round(scale() * 100)}%</span>
            </div>
            {searchInfo().hasResults && (
              <div class="stat search-stat">
                <i class="bi bi-search"></i>
                <span>
                  {searchInfo().results} resultado{searchInfo().results !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área del diagrama con JointJS */}
      <div class="joint-container">
        <div 
          class="joint-paper" 
          ref={el => paperContainer = el}
        />
        
        {tablesData().length === 0 && (
          <div class="empty-state">
            <i class="bi bi-diagram-3"></i>
            <h3>No hay datos para mostrar</h3>
            <p>Carga un archivo JSON con el esquema de la base de datos o crea una nueva entidad.</p>
          </div>
        )}

        {/* Indicador de nivel de zoom */}
        <div class="zoom-level-display">
          Zoom: {Math.round(scale() * 100)}%
        </div>
      </div>

      {/* Modal */}
      {modalConfig().isOpen && (
        <div class="modal-backdrop" onClick={closeModal}>
          <div class="modal-container" onClick={(e: Event) => e.stopPropagation()}>
            <div class="modal-header">
              <h3 class="modal-title">{modalConfig().title}</h3>
              <button 
                class="modal-close-btn" 
                onClick={closeModal}
                type="button"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
            
            <div class="modal-content">
              {modalConfig().content}
            </div>

            <div class="modal-footer">
              {modalConfig().showDeleteButton && !showDeleteConfirm() && (
                <button 
                  class="btn btn-danger" 
                  onClick={modalConfig().onDelete || (() => {})}
                  style={{ "margin-right": 'auto' }}
                  type="button"
                >
                  <i class="bi bi-trash"></i>
                  {modalConfig().title.includes('Campo') ? 'Eliminar Campo' : 'Eliminar Entidad'}
                </button>
              )}

              {showDeleteConfirm() && (
                <div class="delete-confirmation" style={{ "margin-right": 'auto', display: 'flex', "align-items": 'center', gap: '8px' }}>
                  <span style={{ "font-size": '14px', color: '#dc3545' }}>
                    ¿Estás seguro?
                  </span>
                  <button 
                    class="btn btn-danger btn-sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                    }}
                    type="button"
                  >
                    <i class="bi bi-check-lg"></i>
                    Sí
                  </button>
                  <button 
                    class="btn btn-secondary btn-sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                  >
                    <i class="bi bi-x-lg"></i>
                    No
                  </button>
                </div>
              )}

              {modalConfig().showSaveButton && (
                <button 
                  class="btn btn-primary" 
                  onClick={modalConfig().onSave || (() => {})}
                  type="button"
                >
                  {modalConfig().saveButtonText || 'Guardar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default NavigationBar;