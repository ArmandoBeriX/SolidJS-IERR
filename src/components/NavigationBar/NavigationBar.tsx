// src/components/NavigationBar/NavigationBar.tsx
import { createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import type { JSX } from 'solid-js';
import './NavigationBar.css';
import EntityForm from '../EntityForm/EntityForm';
import FieldForm from '../FieldForm/FieldForm';
import NavigationControls from './NavigationControls';
import DiagramDetailsPanel from './DiagramDetailsPanel';
import JointJSDiagram from './JointJSDiagram';
import * as joint from '@joint/core';

// Definición de tipos
interface RelationFilter {
  field: string;
  op: string;
  v: string[];
}

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
  relationQuery?: RelationFilter[];
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

// Interfaces para datos del archivo
interface RawTableField {
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
  relationQuery?: RelationFilter[];
  relationtableId?: number;
}

interface RawTableData {
  id: number;
  identifier: string;
  name: string;
  description: string;
  px?: number;
  py?: number;
  tableFields?: RawTableField[];
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
  currentIndex: -1;
  hasResults: boolean;
}

interface ModalContentProps {
  entity?: TableData;
  tableId?: number;
  field?: TableField;
  tablesData?: TableData[];
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete?: (entityId?: number, field?: TableField) => void;
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
  context?: {
    entity?: TableData;
    tableId?: number;
    field?: TableField;
  };
}

interface FieldConnection {
  id: string;
  source: { tableId: number; fieldId: number; tableIdentifier: string; fieldName: string };
  target: { tableId: number; fieldId: number; tableIdentifier: string; fieldName: string };
  type: string;
}

// Función para transformar datos del archivo
const transformTablesData = (jsonData: any[]): TableData[] => {
  if (!Array.isArray(jsonData)) {
    throw new Error('Los datos deben ser un array de tablas');
  }

  return jsonData.map((table: RawTableData) => {
    console.log('📦 Procesando tabla:', table.name, 'px:', table.px, 'py:', table.py);
    
    const transformedFields: TableField[] = (table.tableFields || []).map((field: RawTableField) => ({
      id: field.id,
      tableId: field.tableId,
      identifier: field.identifier,
      name: field.name,
      fieldFormat: field.fieldFormat,
      multiple: Boolean(field.multiple),
      isRequired: Boolean(field.isRequired),
      isFilter: Boolean(field.isFilter),
      isUnique: Boolean(field.isUnique),
      default: field.default,
      relationTableIdentifier: field.relationTableIdentifier,
      isEditable: field.isEditable !== undefined ? Boolean(field.isEditable) : true,
      isVisible: field.isVisible !== undefined ? Boolean(field.isVisible) : true,
      position: field.position,
      description: field.description,
      storeData: field.storeData || {},
      history: Boolean(field.history),
      relationQuery: field.relationQuery || []
    }));

    const transformedTable = {
      id: table.id,
      identifier: table.identifier,
      name: table.name,
      description: table.description,
      x: table.px || 0,
      y: table.py || 0,
      tableFields: transformedFields
    };

    console.log('✅ Tabla transformada:', transformedTable.name, 'x:', transformedTable.x, 'y:', transformedTable.y);
    return transformedTable;
  });
};

// Función para procesar contenido del archivo
const processFileContent = (content: string): TableData[] => {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]) as RawTableData[];
      return transformTablesData(jsonData);
    } else {
      const jsonData = JSON.parse(content) as RawTableData[];
      return transformTablesData(jsonData);
    }
  } catch (error) {
    console.error('Error procesando archivo:', error);
    throw new Error(`Formato de archivo no válido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

// Función para agregar campos por defecto
const addDefaultFieldsToTable = (table: TableData): TableData => {
  console.log(`🔄 Procesando tabla: ${table.name} (${table.identifier})`);
  
  const existingFields = table.tableFields || [];
  const isUsersTable = table.identifier === 'users';
  
  const existingFieldIdentifiers = existingFields.map(f => f.identifier);
  console.log(`📋 Campos existentes en ${table.name}:`, existingFieldIdentifiers);
  
  const defaultFields: TableField[] = [];
  
  if (!existingFieldIdentifiers.includes('id')) {
    defaultFields.push({
      id: table.id * 1000 + 1,
      tableId: table.id,
      identifier: 'id',
      name: 'ID',
      fieldFormat: 'string',
      multiple: false,
      isRequired: true,
      isFilter: true,
      isUnique: true,
      default: null,
      relationTableIdentifier: null,
      isEditable: false,
      isVisible: true,
      position: 0,
      description: 'Clave primaria de la tabla',
      storeData: {},
      history: false
    });
    console.log(`➕ Agregando campo ID a ${table.name}`);
  } else {
    console.log(`✅ Campo ID ya existe en ${table.name}`);
  }
  
  if (!isUsersTable && !existingFieldIdentifiers.includes('authorId')) {
    defaultFields.push({
      id: table.id * 1000 + 2,
      tableId: table.id,
      identifier: 'authorId',
      name: 'Autor',
      fieldFormat: 'relation',
      multiple: false,
      isRequired: true,
      isFilter: true,
      isUnique: false,
      default: null,
      relationTableIdentifier: 'users',
      isEditable: false,
      isVisible: true,
      position: 1,
      description: 'Usuario que creó el registro',
      storeData: {},
      history: false
    });
    console.log(`➕ Agregando campo authorId a ${table.name}`);
  } else if (isUsersTable) {
    console.log(`⏭️ Saltando campo authorId en tabla users`);
  } else {
    console.log(`✅ Campo authorId ya existe en ${table.name}`);
  }
  
  if (!existingFieldIdentifiers.includes('createdAt')) {
    const position = isUsersTable ? 1 : 2;
    defaultFields.push({
      id: table.id * 1000 + 3,
      tableId: table.id,
      identifier: 'createdAt',
      name: 'Creado',
      fieldFormat: 'datetime',
      multiple: false,
      isRequired: false,
      isFilter: true,
      isUnique: false,
      default: null,
      relationTableIdentifier: null,
      isEditable: false,
      isVisible: true,
      position: position,
      description: 'Fecha y hora de creación del registro',
      storeData: {},
      history: false
    });
    console.log(`➕ Agregando campo createdAt a ${table.name}`);
  } else {
    console.log(`✅ Campo createdAt ya existe en ${table.name}`);
  }
  
  if (!existingFieldIdentifiers.includes('updatedAt')) {
    const position = isUsersTable ? 2 : 3;
    defaultFields.push({
      id: table.id * 1000 + 4,
      tableId: table.id,
      identifier: 'updatedAt',
      name: 'Actualizado',
      fieldFormat: 'datetime',
      multiple: false,
      isRequired: false,
      isFilter: true,
      isUnique: false,
      default: null,
      relationTableIdentifier: null,
      isEditable: false,
      isVisible: true,
      position: position,
      description: 'Fecha y hora de última actualización',
      storeData: {},
      history: false
    });
    console.log(`➕ Agregando campo updatedAt a ${table.name}`);
  } else {
    console.log(`✅ Campo updatedAt ya existe en ${table.name}`);
  }
  
  if (defaultFields.length > 0) {
    console.log(`🔄 Combinando ${defaultFields.length} campos nuevos con ${existingFields.length} existentes en ${table.name}`);
    
    const combinedFields = [...defaultFields, ...existingFields];
    const reorderedFields = combinedFields.map((field, index) => ({
      ...field,
      position: index
    }));
    
    return {
      ...table,
      tableFields: reorderedFields
    };
  }
  
  console.log(`✅ Tabla ${table.name} ya tiene todos los campos por defecto`);
  return table;
};

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
    saveButtonText: 'Guardar',
    context: undefined
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal<boolean>(false);
  const [searchTerm, setSearchTerm] = createSignal<string>('');
  const [scale, setScale] = createSignal<number>(1);
  
  const [relationships, setRelationships] = createSignal<Relationship[]>([]);
  const [isConnecting, setIsConnecting] = createSignal<boolean>(false);
  const [connectionSource, setConnectionSource] = createSignal<{
    tableId: number;
    field: TableField;
    tableIdentifier: string;
    x: number;
    y: number;
  } | null>(null);
  const [fieldConnections, setFieldConnections] = createSignal<FieldConnection[]>([]);
  const [tempConnection, setTempConnection] = createSignal<{x: number, y: number} | null>(null);

  // Funciones para manejar modales
  const openEntityModal = (entity?: TableData) => {
    console.log('📝 Abriendo modal de entidad:', entity?.name);
    setModalConfig({
      isOpen: true,
      title: entity ? `Editar Entidad: ${entity.name}` : 'Crear Entidad',
      content: (
        <EntityForm
          entity={entity}
          onSave={(data) => handleSaveEntity(data, entity)}
          onCancel={closeModal}
          onDelete={entity ? (() => handleDeleteEntity(entity.id)) : undefined}
        />
      ),
      onSave: null,
      onClose: closeModal,
      showDeleteButton: false,
      onDelete: null,
      showSaveButton: false,
      saveButtonText: 'Guardar',
      context: { entity }
    });
  };

  const openFieldModal = (tableId: number, field?: TableField, tableName?: string) => {
    console.log('📝 Abriendo modal de campo:', field?.name, 'en tabla:', tableId);
    setModalConfig({
      isOpen: true,
      title: field ? `Editar Campo: ${field.name}` : `Crear Campo en ${tableName || 'tabla'}`,
      content: (
        <FieldForm
          tableId={tableId}
          field={field}
          tablesData={tablesData()}
          onSave={(data) => handleSaveField(tableId, data, field)}
          onCancel={closeModal}
          onDelete={field ? (() => handleDeleteField(tableId, field)) : undefined}
        />
      ),
      onSave: null,
      onClose: closeModal,
      showDeleteButton: false,
      onDelete: null,
      showSaveButton: false,
      saveButtonText: 'Guardar',
      context: { tableId, field }
    });
  };

  // Manejadores para entidades
  const handleSaveEntity = (data: any, existingEntity?: TableData) => {
    console.log('💾 Guardando entidad:', data, 'existente:', existingEntity);
    
    if (existingEntity) {
      setTablesData(prev => prev.map(table => 
        table.id === existingEntity.id 
          ? { 
              ...table, 
              name: data.name,
              identifier: data.identifier,
              description: data.description
            }
          : table
      ));
    } else {
      const newTable: TableData = {
        id: Date.now(),
        identifier: data.identifier,
        name: data.name,
        description: data.description,
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
    }
    
    closeModal();
  };

  const handleDeleteEntity = (entityId: number) => {
    console.log('🗑️ Eliminando entidad:', entityId);
    setTablesData(prev => prev.filter(table => table.id !== entityId));
    closeModal();
  };

  // Manejadores para campos
  const handleSaveField = (tableId: number, data: any, existingField?: TableField) => {
    console.log('💾 Guardando campo:', data, 'en tabla:', tableId, 'existente:', existingField);
    
    setTablesData(prev => prev.map(table => {
      if (table.id === tableId) {
        const fields = table.tableFields || [];
        
        if (existingField) {
          return {
            ...table,
            tableFields: fields.map(field => 
              field.id === existingField.id 
                ? { 
                    ...field,
                    ...data,
                    id: existingField.id,
                    tableId: tableId
                  }
                : field
            )
          };
        } else {
          const newField: TableField = {
            id: Date.now(),
            tableId: tableId,
            ...data,
            position: fields.length + 1
          };
          
          return {
            ...table,
            tableFields: [...fields, newField]
          };
        }
      }
      return table;
    }));
    
    closeModal();
  };

  const handleDeleteField = (tableId: number, field: TableField) => {
    console.log('🗑️ Eliminando campo:', field, 'de tabla:', tableId);
    
    setTablesData(prev => prev.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          tableFields: (table.tableFields || []).filter(f => f.id !== field.id)
        };
      }
      return table;
    }));
    
    closeModal();
  };

  // Manejar edición de entidad
  const handleEditEntity = (tableId: number, entity: TableData) => {
    console.log('🏢 Editando entidad:', tableId, entity);
    openEntityModal(entity);
  };

  // Manejar edición de campo
  const handleEditField = (tableId: number, field: TableField, tableName: string) => {
    console.log('✏️ Editando campo:', field, 'en tabla:', tableId);
    openFieldModal(tableId, field, tableName);
  };

  // Manejar agregar campo
  const handleAddField = (tableId: number, field: TableField | null, tableName: string) => {
    console.log('➕ Agregando campo a tabla:', tableId, tableName);
    openFieldModal(tableId, undefined, tableName);
  };

  const closeModal = (): void => {
    setModalConfig(prev => ({ 
      ...prev, 
      isOpen: false,
      context: undefined 
    }));
    setShowDeleteConfirm(false);
  };

  // Manejar inicio de conexión desde un campo
  const handleConnectionStart = (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => {
    console.log('🔗 Iniciando conexión desde:', tableIdentifier, field.name);
    setIsConnecting(true);
    setConnectionSource({
      tableId,
      field,
      tableIdentifier,
      x,
      y
    });
  };

  // Manejar fin de conexión en un campo
  const handleConnectionEnd = (tableId: number, field: TableField, tableIdentifier: string, x: number, y: number) => {
    if (!isConnecting() || !connectionSource()) return;

    const source = connectionSource()!;
    
    if (source.tableId === tableId && source.field.id === field.id) {
      console.log('❌ No se puede conectar un campo consigo mismo');
      resetConnection();
      return;
    }

    const isSourcePK = source.field.identifier === 'id' || (source.field.isUnique && source.field.fieldFormat === 'integer');
    if (!isSourcePK) {
      console.log('❌ Solo se pueden crear conexiones desde claves primarias');
      resetConnection();
      return;
    }

    console.log('🔗 Creando conexión entre:', 
      source.tableIdentifier, source.field.name, '->', 
      tableIdentifier, field.name
    );

    const newConnection: FieldConnection = {
      id: `conn-${source.tableId}-${source.field.id}-${tableId}-${field.id}`,
      source: {
        tableId: source.tableId,
        fieldId: source.field.id,
        tableIdentifier: source.tableIdentifier,
        fieldName: source.field.name
      },
      target: {
        tableId: tableId,
        fieldId: field.id,
        tableIdentifier: tableIdentifier,
        fieldName: field.name
      },
      type: 'one-to-many'
    };

    setFieldConnections(prev => [...prev, newConnection]);
    
    updateFieldAsRelation(tableId, field.id, source.tableIdentifier, source.field.name);
    
    resetConnection();
  };

  // Actualizar campo como relación
  const updateFieldAsRelation = (tableId: number, fieldId: number, relationTableIdentifier: string, relationFieldName: string) => {
    setTablesData(prev => prev.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          tableFields: table.tableFields?.map(field => {
            if (field.id === fieldId) {
              return {
                ...field,
                fieldFormat: 'relation',
                relationTableIdentifier: relationTableIdentifier,
                name: relationFieldName || field.name
              };
            }
            return field;
          }) || []
        };
      }
      return table;
    }));
  };

  // Resetear estado de conexión
  const resetConnection = () => {
    setIsConnecting(false);
    setConnectionSource(null);
    setTempConnection(null);
  };

  // Manejar movimiento del mouse durante conexión
  const handlePaperMouseMove = (e: MouseEvent) => {
    if (!isConnecting()) return;
    
    setTempConnection({ x: e.clientX, y: e.clientY });
  };

  // Cancelar conexión con Escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isConnecting()) {
      resetConnection();
    }
  };

  // Manejar clic en elementos del diagrama
  const handleElementClick = (cellView: joint.dia.CellView, evt: joint.dia.Event) => {
    evt.stopPropagation();
    evt.preventDefault();
    
    const element = cellView.model;
    const tableData = element.get('tableData') as TableData;
    
    if (!tableData) return;

    const target = (evt as any).target as SVGElement;
    const className = target.getAttribute('class') || '';
    const selector = (evt as any).selector;

    console.log('🎯 Click detectado:', { className, selector, tableData: tableData.name });

    // Click en el header
    if (selector === 'header' || className.includes('header')) {
      console.log('🏢 Click en header de:', tableData.name);
      handleEditEntity(tableData.id, tableData);
      return;
    }

    // Click en el botón agregar campo
    if (selector === 'addFieldButton' || selector === 'addFieldClickArea' || 
        className.includes('add-field')) {
      console.log('➕ Click en botón agregar campo de:', tableData.name);
      handleAddField(tableData.id, null, tableData.name);
      return;
    }

    // Click en nombre de campo (fieldText)
    if (selector && selector.startsWith('fieldText')) {
      const fieldIdMatch = selector.match(/fieldText(\d+)/);
      if (fieldIdMatch) {
        const fieldId = parseInt(fieldIdMatch[1]);
        const field = tableData.tableFields?.find(f => f.id === fieldId);
        
        if (field) {
          console.log('✏️ Click en campo:', field.name);
          handleEditField(tableData.id, field, tableData.name);
          return;
        }
      }
    }
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

    return rels;
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
        console.log('📂 Datos cargados desde localStorage:', dataWithCoords.length, 'tablas');
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  });

  // Funciones de zoom
  const handleZoomIn = (): void => {
    setScale(prev => Math.min(2, prev * 1.2));
  };

  const handleZoomOut = (): void => {
    setScale(prev => Math.max(0.3, prev / 1.2));
  };

  const handleCenterView = (): void => {
    setScale(1);
  };

  const handleResetZoom = (): void => {
    setScale(1);
  };

  // Resto de funciones existentes
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
    console.log('🔍 Buscando:', term);
  };

  const handleNextResult = (): void => {
    console.log('➡️ Siguiente resultado');
  };

  const handlePreviousResult = (): void => {
    console.log('⬅️ Resultado anterior');
  };

  // Función para crear nueva entidad
  const handleCreateEntity = (): void => {
    console.log('🆕 Creando nueva entidad');
    openEntityModal();
  };

  // Manejar carga de archivo
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

        console.log('📂 Procesando archivo:', file.name);
        
        const processedData = processFileContent(content);
        console.log('✅ Datos procesados:', processedData.length, 'tablas');
        
        const dataWithDefaultFields = processedData.map(table => 
          addDefaultFieldsToTable(table)
        );
        
        console.log('🎉 Campos por defecto agregados');
        
        const dataWithCoords = dataWithDefaultFields.map((table, index) => ({
          ...table,
          x: table.x || 100 + (index % 3) * 300,
          y: table.y || 100 + Math.floor(index / 3) * 200
        }));
        
        setTablesData(dataWithCoords);
        setRelationships(generateRelationships(dataWithCoords));
        setFieldConnections([]);
        
        localStorage.setItem('erDiagramData', JSON.stringify(dataWithCoords));
        
        console.log('💾 Datos guardados en localStorage:', dataWithCoords.length, 'tablas');
        
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

  const countRelations = (): number => {
    return relationships().length + fieldConnections().length;
  };

  const countFieldConnections = (): number => {
    return fieldConnections().length;
  };

  // Cleanup
  onCleanup(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeyDown);
    }
  });

  return (
    <div class={`navigation-container ${isDarkMode() ? 'dark-mode' : ''} ${isConnecting() ? 'connecting-mode' : ''}`}>
      <NavigationControls
        onFileUpload={handleFileUpload}
        onCreateEntity={handleCreateEntity}
        onSearch={handleSearch}
        onPreviousResult={handlePreviousResult}
        onNextResult={handleNextResult}
        onToggleDragMode={toggleDragMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterView={handleCenterView}
        onResetZoom={handleResetZoom}
        onToggleDarkMode={toggleDarkMode}
        onToggleDetails={toggleDetails}
        isDarkMode={isDarkMode()}
        isDraggable={isDraggable()}
        showDetails={showDetails()}
        searchTerm={searchTerm()}
        searchInfo={searchInfo()}
        isLoading={isLoading()}
      />

      <DiagramDetailsPanel
        showDetails={showDetails()}
        tablesCount={tablesData().length}
        relationsCount={countRelations()}
        fieldConnectionsCount={countFieldConnections()}
        isDraggable={isDraggable()}
        scale={scale()}
        isConnecting={isConnecting()}
        searchInfo={searchInfo()}
      />

      {/* IMPORTANTE: Evitar que el diagrama se desmonte */}
      <div style={{ 
        position: 'relative', 
        flex: 1, 
        'min-height': '500px'  // CORREGIDO: usar 'min-height' en lugar de minHeight
      }}>
        <JointJSDiagram
          tablesData={tablesData()}
          relationships={relationships()}
          fieldConnections={fieldConnections()}
          isDarkMode={isDarkMode()}
          isDraggable={isDraggable()}
          isConnecting={isConnecting()}
          connectionSource={connectionSource()}
          tempConnection={tempConnection()}
          scale={scale()}
          onElementClick={handleElementClick}
          onPaperMouseMove={handlePaperMouseMove}
          onKeyDown={handleKeyDown}
          onZoomChange={setScale}
        />
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
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationBar;