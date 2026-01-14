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
  currentIndex: number;
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

// Función para agregar campos por defecto a una nueva entidad
const addDefaultFieldsToNewEntity = (table: TableData): TableData => {
  console.log(`🔄 Agregando campos por defecto a nueva entidad: ${table.name}`);
  
  const isUsersTable = table.identifier === 'users';
  const defaultFields: TableField[] = [];
  
  // Solo agregar campos por defecto si no tiene campos existentes
  const existingFields = table.tableFields || [];
  
  if (existingFields.length === 0) {
    // Campo ID - siempre presente
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
    
    // Campo authorId - solo si no es la tabla users
    if (!isUsersTable) {
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
    }
    
    // Campo createdAt
    const createdAtPosition = isUsersTable ? 1 : 2;
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
      position: createdAtPosition,
      description: 'Fecha y hora de creación del registro',
      storeData: {},
      history: false
    });
    
    // Campo updatedAt
    const updatedAtPosition = isUsersTable ? 2 : 3;
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
      position: updatedAtPosition,
      description: 'Fecha y hora de última actualización',
      storeData: {},
      history: false
    });
    
    console.log(`✅ ${defaultFields.length} campos por defecto agregados a nueva entidad: ${table.name}`);
    
    return {
      ...table,
      tableFields: defaultFields
    };
  }
  
  // Si ya tiene campos, no agregar nada
  console.log(`✅ Entidad ya tiene ${existingFields.length} campos, no se agregaron campos por defecto`);
  return table;
};

// Función para agregar campos por defecto a tablas existentes (al cargar archivo)
const addDefaultFieldsToExistingTable = (table: TableData): TableData => {
  console.log(`🔄 Verificando campos por defecto en tabla existente: ${table.name}`);
  
  const existingFields = table.tableFields || [];
  const isUsersTable = table.identifier === 'users';
  const existingFieldIdentifiers = existingFields.map((f: TableField) => f.identifier);
  
  const defaultFields: TableField[] = [];
  let fieldCounter = existingFields.length > 0 ? Math.max(...existingFields.map(f => f.id)) + 1 : table.id * 1000 + 1;
  
  if (!existingFieldIdentifiers.includes('id')) {
    defaultFields.push({
      id: fieldCounter++,
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
  }
  
  if (!isUsersTable && !existingFieldIdentifiers.includes('authorId')) {
    defaultFields.push({
      id: fieldCounter++,
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
      position: existingFields.length + defaultFields.length,
      description: 'Usuario que creó el registro',
      storeData: {},
      history: false
    });
    console.log(`➕ Agregando campo authorId a ${table.name}`);
  }
  
  if (!existingFieldIdentifiers.includes('createdAt')) {
    const position = isUsersTable ? (existingFields.length + defaultFields.length) : (existingFields.length + defaultFields.length);
    defaultFields.push({
      id: fieldCounter++,
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
  }
  
  if (!existingFieldIdentifiers.includes('updatedAt')) {
    const position = isUsersTable ? (existingFields.length + defaultFields.length) : (existingFields.length + defaultFields.length);
    defaultFields.push({
      id: fieldCounter++,
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
  }
  
  if (defaultFields.length > 0) {
    console.log(`🔄 Combinando ${defaultFields.length} campos nuevos con ${existingFields.length} existentes en ${table.name}`);
    
    const combinedFields = [...existingFields, ...defaultFields];
    const reorderedFields = combinedFields.map((field: TableField, index: number) => ({
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

// Función auxiliar para combinar campos de tabla
const combineTableFields = (existingFields: TableField[], newFields: TableField[]): TableField[] => {
  const combined: TableField[] = [...existingFields];
  
  newFields.forEach(newField => {
    // Verificar si el campo ya existe por ID o identificador
    const existingFieldIndex = combined.findIndex(f => 
      f.id === newField.id || f.identifier === newField.identifier
    );
    
    if (existingFieldIndex === -1) {
      // Agregar nuevo campo
      combined.push({
        ...newField,
        // Usar un nuevo ID si es necesario para evitar conflictos
        id: existingFields.length > 0 ? Math.max(...existingFields.map(f => f.id)) + 1 : newField.id
      });
    }
  });
  
  return combined;
};

// Función para verificar storeData en localStorage
const verifyStoreDataInLocalStorage = () => {
  const savedData = localStorage.getItem('erDiagramData');
  if (savedData) {
    const parsedData: TableData[] = JSON.parse(savedData);
    console.log('🔍 VERIFICACIÓN DE DATOS EN LOCALSTORAGE:');
    
    parsedData.forEach((table: TableData) => {
      if (table.tableFields && table.tableFields.length > 0) {
        console.log(`\n📊 Tabla: ${table.name} (${table.identifier})`);
        table.tableFields.forEach((field: TableField) => {
          console.log(`   📝 Campo: ${field.name} (${field.fieldFormat})`);
          console.log(`   💾 storeData:`, field.storeData);
        });
      }
    });
  }
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

  // Estado para controlar si estamos arrastrando
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStartTime, setDragStartTime] = createSignal(0);

  // Estado para controlar si JointJS está listo
  const [isJointReady, setIsJointReady] = createSignal(false);

  // Referencia al diagrama para poder actualizar interactividad
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = createSignal(Date.now());

  // Función para forzar actualización del diagrama
  const forceDiagramUpdate = () => {
    console.log('🔄 Forzando actualización completa del diagrama...');
    setLastUpdateTimestamp(Date.now());
    
    setTimeout(() => {
      updateRelationshipsFromTables();
    }, 10);
  };

  // Función para cargar datos desde localStorage
  const loadDataFromLocalStorage = (): TableData[] => {
    try {
      const savedData = localStorage.getItem('erDiagramData');
      if (savedData) {
        const parsedData: TableData[] = JSON.parse(savedData);
        console.log('📂 Datos cargados desde localStorage:', parsedData.length, 'tablas');
        
        // Asegurar que todas las tablas tengan posición válida
        return parsedData.map((table: TableData, index: number) => {
          // Verificar que las coordenadas sean números válidos
          const x = typeof table.x === 'number' && !isNaN(table.x) ? table.x : 100 + (index % 3) * 300;
          const y = typeof table.y === 'number' && !isNaN(table.y) ? table.y : 100 + Math.floor(index / 3) * 200;
          
          return {
            ...table,
            x: Math.round(x),
            y: Math.round(y),
            tableFields: table.tableFields || []
          };
        });
      }
    } catch (error) {
      console.error('❌ Error cargando datos desde localStorage:', error);
    }
    return [];
  };

  // Función para guardar datos en localStorage
  const saveDataToLocalStorage = (data: TableData[]) => {
    try {
      // Asegurar que todas las posiciones sean números
      const cleanedData = data.map(table => ({
        ...table,
        x: typeof table.x === 'number' && !isNaN(table.x) ? table.x : 0,
        y: typeof table.y === 'number' && !isNaN(table.y) ? table.y : 0
      }));
      
      localStorage.setItem('erDiagramData', JSON.stringify(cleanedData));
      console.log('💾 Datos guardados en localStorage:', cleanedData.length, 'tablas');
      
      // Verificar que storeData se guardó correctamente
      verifyStoreDataInLocalStorage();
    } catch (error) {
      console.error('❌ Error guardando datos en localStorage:', error);
    }
  };

  // Función mejorada para manejar el evento entityHeaderClick
  const handleEntityHeaderClickEvent = (event: CustomEvent) => {
    console.log('📢 Evento entityHeaderClick recibido:', event.detail);
    
    const { tableId, entity, tableName, timestamp, verified } = event.detail;
    
    // Verificar que el evento sea reciente
    if (timestamp && Date.now() - timestamp > 1000) {
      console.log('⚠️ Evento demasiado viejo, ignorando');
      return;
    }
    
    if (verified && tableId && entity && tableName) {
      console.log('✅ Datos verificados, buscando en estado actual...');
      
      // Buscar los datos ACTUALIZADOS
      const currentTablesData = tablesData();
      const table = currentTablesData.find(t => t.id === tableId);
      
      if (table) {
        console.log('✅ Tabla encontrada:', table.name);
        
        // Abrir modal de edición de entidad
        openEntityModal(table);
      } else {
        console.error('❌ Tabla no encontrada en datos actuales');
        // Intentar abrir el modal de todos modos
        openEntityModal(entity);
      }
    } else {
      console.error('❌ Datos incompletos o no verificados:', event.detail);
    }
  };

  // Función mejorada para manejar el evento fieldNameClick
  const handleFieldNameClickEvent = (event: CustomEvent) => {
    console.log('📢 Evento fieldNameClick recibido:', event.detail);
    
    const { tableId, field, tableName, timestamp, verified } = event.detail;
    
    // Verificar que el evento sea reciente
    if (timestamp && Date.now() - timestamp > 1000) {
      console.log('⚠️ Evento demasiado viejo, ignorando');
      return;
    }
    
    if (verified && tableId && field && tableName) {
      console.log('✅ Datos verificados, buscando en estado actual...');
      
      // Buscar los datos ACTUALIZADOS
      const currentTablesData = tablesData();
      const table = currentTablesData.find(t => t.id === tableId);
      
      if (table) {
        console.log('✅ Tabla encontrada:', table.name);
        
        // Buscar el campo por ID
        let actualField = table.tableFields?.find(f => f.id === field.id);
        
        // Si no se encuentra por ID, buscar por nombre/identificador
        if (!actualField) {
          console.log('⚠️ Campo no encontrado por ID, buscando alternativas...');
          actualField = table.tableFields?.find(f => 
            f.identifier === field.identifier || 
            f.name === field.name
          );
        }
        
        if (actualField) {
          console.log('✅ Campo encontrado:', {
            id: actualField.id,
            name: actualField.name,
            identifier: actualField.identifier
          });
          
          openFieldModalWithData(tableId, actualField, tableName);
        } else {
          console.error('❌ Campo no encontrado en datos actuales');
          openFieldModalWithData(tableId, field, tableName);
        }
      } else {
        console.error('❌ Tabla no encontrada en datos actuales');
        openFieldModalWithData(tableId, field, tableName);
      }
    } else {
      console.error('❌ Datos incompletos o no verificados:', event.detail);
    }
  };

  // Función para manejar el evento addFieldClick
  const handleAddFieldClickEvent = (event: CustomEvent) => {
    console.log('📢 Evento addFieldClick recibido:', event.detail);
    
    const { tableId, tableName, timestamp, verified } = event.detail;
    
    // Verificar que el evento sea reciente
    if (timestamp && Date.now() - timestamp > 1000) {
      console.log('⚠️ Evento demasiado viejo, ignorando');
      return;
    }
    
    if (verified && tableId && tableName) {
      console.log('✅ Datos verificados, buscando tabla en estado actual...');
      
      // Buscar los datos ACTUALIZADOS
      const currentTablesData = tablesData();
      const table = currentTablesData.find(t => t.id === tableId);
      
      if (table) {
        console.log('✅ Tabla encontrada:', table.name);
        console.log('➕ Abriendo formulario para agregar campo a:', table.name);
        
        // Abrir modal para agregar campo
        handleAddField(tableId, null, tableName);
      } else {
        console.error('❌ Tabla no encontrada en datos actuales');
        // Intentar abrir el modal de todos modos
        handleAddField(tableId, null, tableName);
      }
    } else {
      console.error('❌ Datos incompletos o no verificados:', event.detail);
    }
  };

  // Efecto para escuchar eventos de clic en header de entidad
  createEffect(() => {
    const handleEntityHeaderEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleEntityHeaderClickEvent(customEvent);
    };

    document.addEventListener('entityHeaderClick', handleEntityHeaderEvent);
    
    onCleanup(() => {
      document.removeEventListener('entityHeaderClick', handleEntityHeaderEvent);
    });
  });

  // Efecto para escuchar eventos de clic en nombres de campo
  createEffect(() => {
    const handleFieldEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleFieldNameClickEvent(customEvent);
    };

    document.addEventListener('fieldNameClick', handleFieldEvent);
    
    onCleanup(() => {
      document.removeEventListener('fieldNameClick', handleFieldEvent);
    });
  });

  // Efecto para escuchar eventos de clic en botón agregar campo
  createEffect(() => {
    const handleAddFieldEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleAddFieldClickEvent(customEvent);
    };

    // Escuchar el evento desde el contenedor del diagrama
    const paperContainer = document.querySelector('.joint-paper') as HTMLElement;
    if (paperContainer) {
      paperContainer.addEventListener('addFieldClick', handleAddFieldEvent);
    }
    
    // También escuchar en document como fallback
    document.addEventListener('addFieldClick', handleAddFieldEvent);
    
    onCleanup(() => {
      if (paperContainer) {
        paperContainer.removeEventListener('addFieldClick', handleAddFieldEvent);
      }
      document.removeEventListener('addFieldClick', handleAddFieldEvent);
    });
  });

  // Función para abrir modal de campo con datos verificados
  const openFieldModalWithData = (tableId: number, field: TableField, tableName: string) => {
    console.log('🎯 Abriendo modal de campo con datos verificados:', {
      tableId,
      tableName,
      field: {
        id: field.id,
        name: field.name,
        identifier: field.identifier
      }
    });

    // Verificar que el campo tenga todos los datos necesarios
    if (!field.id || !field.name || !field.identifier) {
      console.error('❌ Campo incompleto, no se puede abrir el formulario:', field);
      alert('Error: El campo no tiene todos los datos necesarios');
      return;
    }

    // Abrir el modal
    openFieldModal(tableId, field, tableName);
  };

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
    
    // Buscar la tabla actual para asegurarnos que existe
    const currentTables = tablesData();
    const table = currentTables.find(t => t.id === tableId);
    
    if (!table) {
      console.error('❌ Tabla no encontrada:', tableId);
      alert('Error: No se encontró la tabla');
      return;
    }
    
    const actualTableName = tableName || table.name;
    
    setModalConfig({
      isOpen: true,
      title: field ? `Editar Campo: ${field.name}` : `Crear Campo en ${actualTableName}`,
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
    
    const newId = existingEntity?.id || Date.now();
    
    setTablesData(prev => {
      let updatedTables: TableData[];
      
      if (existingEntity) {
        // Actualizar entidad existente - Mantener todos los campos existentes
        updatedTables = prev.map(table => {
          if (table.id === existingEntity.id) {
            return { 
              ...table, 
              name: data.name,
              identifier: data.identifier,
              description: data.description,
              x: table.x || 0,
              y: table.y || 0,
              tableFields: table.tableFields || [] // Mantener campos existentes
            };
          }
          return table;
        });
        console.log('✅ Entidad actualizada:', data.name);
      } else {
        // Crear nueva entidad con campos por defecto
        const newEntity: TableData = {
          id: newId,
          identifier: data.identifier,
          name: data.name,
          description: data.description || '',
          x: Math.floor(window.innerWidth / 2) - 200, // Centrar en el medio
          y: Math.floor(window.innerHeight / 2) - 150,
          tableFields: [] // Los campos por defecto se agregarán después
        };
        
        // Agregar campos por defecto
        const entityWithDefaultFields = addDefaultFieldsToNewEntity(newEntity);
        
        updatedTables = [...prev, entityWithDefaultFields];
        console.log('✅ Nueva entidad creada en el centro del diagrama:', data.name);
        console.log('📍 Posición:', entityWithDefaultFields.x, entityWithDefaultFields.y);
      }
      
      saveDataToLocalStorage(updatedTables);
      return updatedTables;
    });
    
    // Actualización completa después de guardar
    setTimeout(() => {
      updateRelationshipsFromTables();
      // Forzar actualización completa del diagrama
      forceDiagramUpdate();
    }, 50);
    
    closeModal();
  };

  const handleDeleteEntity = (entityId: number) => {
    console.log('🗑️ Eliminando entidad:', entityId);
    setTablesData(prev => {
      const newTables = prev.filter(table => table.id !== entityId);
      saveDataToLocalStorage(newTables);
      return newTables;
    });
    
    // Actualización completa después de eliminar
    setTimeout(() => {
      updateRelationshipsFromTables();
      forceDiagramUpdate();
    }, 50);
    
    closeModal();
  };

  // Manejadores para campos - VERSIÓN MEJORADA
  const handleSaveField = (tableId: number, data: any, existingField?: TableField) => {
    console.log('💾 Guardando campo:', data, 'en tabla:', tableId, 'existente:', existingField);
    console.log('📦 storeData a guardar:', JSON.stringify(data.storeData, null, 2));
    
    setTablesData(prev => {
      const newTables = prev.map(table => {
        if (table.id === tableId) {
          const fields = table.tableFields || [];
          
          if (existingField) {
            // Actualizar campo existente - Asegurar que storeData se guarde completo
            const updatedField = { 
              ...existingField,
              ...data,
              id: existingField.id,
              tableId: tableId,
              // Asegurar que storeData se mantiene completo
              storeData: {
                ...existingField.storeData, // Mantener datos existentes
                ...data.storeData // Sobrescribir con nuevos datos
              }
            };
            
            const updatedTable = {
              ...table,
              x: table.x || 0,
              y: table.y || 0,
              tableFields: fields.map(field => 
                field.id === existingField.id ? updatedField : field
              )
            };
            
            console.log('✅ Campo actualizado en tabla:', updatedTable.name);
            console.log('📋 storeData guardado:', updatedField.storeData);
            return updatedTable;
          } else {
            // Nuevo campo - Asegurar que storeData tenga todos los campos necesarios
            const newField: TableField = {
              id: Date.now(),
              tableId: tableId,
              ...data,
              position: fields.length,
              isEditable: true,
              isVisible: true,
              // Asegurar que storeData tenga la estructura completa
              storeData: {
                min: '',
                max: '',
                regex: '',
                formatted: false,
                selectorType: 0,
                currentId: 1,
                possibleValues: {},
                validExtensions: '',
                check_box: false,
                ...data.storeData // Sobrescribir con los datos del formulario
              },
              history: false,
              relationQuery: []
            };
            
            const updatedTable = {
              ...table,
              x: table.x || 0,
              y: table.y || 0,
              tableFields: [...fields, newField]
            };
            
            console.log('✅ Campo nuevo agregado a tabla:', updatedTable.name);
            console.log('📋 storeData del nuevo campo:', newField.storeData);
            return updatedTable;
          }
        }
        return table;
      });
      
      console.log('✅ Tablas actualizadas:', newTables.length);
      
      // Guardar en localStorage - IMPORTANTE: verificar que storeData se guarde
      saveDataToLocalStorage(newTables);
      
      return newTables;
    });
    
    // IMPORTANTE: Usar setTimeout para asegurar que la actualización se complete
    setTimeout(() => {
      updateRelationshipsFromTables();
      // Forzar actualización COMPLETA del diagrama
      forceDiagramUpdate();
      console.log('🔄 Actualización COMPLETA después de guardar campo - DRAGGABLE PRESERVADO');
    }, 100); // Aumentado ligeramente para asegurar que el estado se propague
    
    closeModal();
  };

  const handleDeleteField = (tableId: number, field: TableField) => {
    console.log('🗑️ Eliminando campo:', field, 'de tabla:', tableId);
    
    setTablesData(prev => {
      const newTables = prev.map(table => {
        if (table.id === tableId) {
          return {
            ...table,
            x: table.x || 0,
            y: table.y || 0,
            tableFields: (table.tableFields || []).filter(f => f.id !== field.id)
          };
        }
        return table;
      });
      
      saveDataToLocalStorage(newTables);
      return newTables;
    });
    
    // Actualización COMPLETA después de eliminar
    setTimeout(() => {
      updateRelationshipsFromTables();
      // Forzar actualización COMPLETA del diagrama
      forceDiagramUpdate();
      console.log('🔄 Actualización COMPLETA después de eliminar campo');
    }, 50);
    
    closeModal();
  };

  // Manejar edición de entidad
  const handleEditEntity = (tableId: number, entity: TableData) => {
    console.log('🏢 Editando entidad:', tableId, entity);
    openEntityModal(entity);
  };

  // Manejar agregar campo
  const handleAddField = (tableId: number, field: TableField | null, tableName: string) => {
    console.log('➕ Agregando campo a tabla:', tableId, tableName);
    
    // Buscar la tabla actual para asegurarnos que existe
    const currentTables = tablesData();
    const table = currentTables.find(t => t.id === tableId);
    
    if (!table) {
      console.error('❌ Tabla no encontrada:', tableId);
      alert('Error: No se encontró la tabla');
      return;
    }
    
    console.log('✅ Tabla encontrada:', {
      id: table.id,
      name: table.name,
      identifier: table.identifier
    });
    
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

  // Función para manejar clic en elementos del diagrama
  const handleElementClick = (cellView: joint.dia.CellView, evt: joint.dia.Event) => {
    evt.stopPropagation();
    evt.preventDefault();

    // Si estamos arrastrando, ignorar el clic
    if (isDragging()) {
      console.log('🔄 Ignorando clic porque estamos arrastrando');
      return;
    }

    const element = cellView.model;
    const tableData = element.get('tableData') as TableData;
    
    if (!tableData) return;

    const target = (evt as any).target as SVGElement;
    const className = target.getAttribute('class') || '';
    const selector = (evt as any).selector;

    console.log('🎯 NavigationBar - Click detectado:', { 
      className, 
      selector, 
      tableData: tableData.name 
    });

    // Click en el header
    if ((selector === 'header' || className.includes('header'))) {
      // Verificar que no sea un arrastre
      const clickDuration = Date.now() - dragStartTime();
      if (clickDuration < 200) {
        console.log('🏢 Click RÁPIDO en header de:', tableData.name);
        handleEditEntity(tableData.id, tableData);
      } else {
        console.log('🔄 Click LARGO en header - probable arrastre');
      }
      return;
    }

    // Click en el botón agregar campo
    if (selector === 'addFieldButton' || selector === 'addFieldClickArea' || 
        className.includes('add-field')) {
      console.log('➕ Click en botón agregar campo de:', tableData.name);
      handleAddField(tableData.id, null, tableData.name);
      return;
    }

    console.log('📍 Click en otro elemento del diagrama');
  };

  // Función para manejar cambio de posición de elementos
  const handleElementPositionChange = (tableId: number, x: number, y: number) => {
    console.log(`📍 Cambio de posición en NavigationBar: Tabla ${tableId} -> (${x}, ${y})`);
    
    // Redondear posiciones
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    // Actualizar estado local
    setTablesData(prev => {
      const updatedTables = prev.map(table => {
        if (table.id === tableId) {
          return {
            ...table,
            x: roundedX,
            y: roundedY
          };
        }
        return table;
      });
      
      console.log(`✅ Posición actualizada en estado: Tabla ${tableId} -> (${roundedX}, ${roundedY})`);
      return updatedTables;
    });
  };

  // Manejar inicio de conexión
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

  // Manejar fin de conexión
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
    setTablesData(prev => {
      const updatedTables = prev.map(table => {
        if (table.id === tableId) {
          return {
            ...table,
            x: table.x || 0,
            y: table.y || 0,
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
      });
      
      saveDataToLocalStorage(updatedTables);
      return updatedTables;
    });
    
    // Actualización completa después de actualizar relación
    setTimeout(() => {
      updateRelationshipsFromTables();
      forceDiagramUpdate();
      console.log('🔄 Actualización completa después de crear relación');
    }, 50);
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

  // Función handleKeyDown
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isConnecting()) {
      resetConnection();
    }
  };

  // Generar relaciones
  const generateRelationships = (tables: TableData[]): Relationship[] => {
    const rels: Relationship[] = [];
    
    console.log('🔍 Generando relaciones para', tables.length, 'tablas');
    
    tables.forEach((table: TableData) => {
      if (table.tableFields) {
        table.tableFields.forEach((field: TableField) => {
          if (field.relationTableIdentifier && field.fieldFormat === 'relation') {
            console.log(`📌 Campo de relación encontrado: ${field.name} en ${table.name} -> ${field.relationTableIdentifier}`);
            
            const relId = `${table.identifier}-${field.identifier}-${field.relationTableIdentifier}`;
            rels.push({
              id: relId,
              source: field.relationTableIdentifier,
              target: table.identifier,
              type: 'one-to-many',
              label: field.name
            });
            
            console.log(`✅ Relación agregada: ${field.relationTableIdentifier} -> ${table.identifier} (${field.name})`);
          }
        });
      }
    });

    console.log('📊 Relaciones generadas:', rels.length);
    return rels;
  };

  // Función para actualizar relaciones
  const updateRelationshipsFromTables = () => {
    const currentTables = tablesData();
    const generatedRels = generateRelationships(currentTables);
    setRelationships(generatedRels);
    console.log('🔗 Relaciones actualizadas:', generatedRels.length);
  };

  // Efecto para actualizar relaciones cuando cambian los datos
  createEffect(() => {
    const currentTables = tablesData();
    if (currentTables.length > 0) {
      updateRelationshipsFromTables();
    }
  });

  // Efecto para inicializar datos
  createEffect(() => {
    // Cargar modo oscuro
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      try {
        const darkMode = JSON.parse(savedDarkMode);
        setDarkMode(darkMode);
        document.body.classList.toggle('dark-mode', darkMode);
      } catch (error) {
        console.error('Error loading dark mode:', error);
      }
    }

    // Cargar datos desde localStorage
    const loadedData = loadDataFromLocalStorage();
    if (loadedData.length > 0) {
      setTablesData(loadedData);
      
      // Generar relaciones
      const generatedRels = generateRelationships(loadedData);
      setRelationships(generatedRels);
      
      console.log('✅ Datos cargados desde localStorage:', loadedData.length, 'tablas,', generatedRels.length, 'relaciones');
    } else {
      console.log('⚠️ No hay datos guardados en localStorage');
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

  // Resto de funciones
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
    const newDraggableState = !isDraggable();
    setIsDraggable(newDraggableState);
    console.log(`🎮 Modo arrastre: ${newDraggableState ? 'ACTIVADO' : 'DESACTIVADO'}`);
    
    // Solo actualizar el timestamp para una actualización completa
    forceDiagramUpdate();
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
    console.log('🆕 Creando nueva entidad - Abriendo formulario');
    
    // Solo abrir el modal vacío para que el usuario complete los datos
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
        
        // Procesar el contenido del archivo
        const processedData = processFileContent(content);
        console.log('✅ Datos procesados del archivo:', processedData.length, 'tablas');
        
        // Agregar campos por defecto a las tablas cargadas
        const dataWithDefaultFields = processedData.map((table: TableData) => {
          return addDefaultFieldsToExistingTable(table);
        });
        
        console.log('🎉 Campos por defecto agregados a tablas cargadas');
        
        // Obtener datos existentes actuales
        const existingData = tablesData();
        
        // ESTRATEGIA MEJORADA: Combinar datos manteniendo posiciones y estado
        const combinedData: TableData[] = [];
        const processedTableIds = new Set<number>();
        
        // Primero, agregar todas las tablas existentes manteniendo su estado
        existingData.forEach(existingTable => {
          // Verificar si esta tabla existe en los nuevos datos
          const matchingNewTable = dataWithDefaultFields.find(newTable => 
            newTable.id === existingTable.id || newTable.identifier === existingTable.identifier
          );
          
          if (matchingNewTable) {
            // Si existe en ambos, combinar manteniendo la posición existente
            const existingFields = existingTable.tableFields || [];
            const newFields = matchingNewTable.tableFields || [];
            
            const updatedTable = {
              ...matchingNewTable,
              // Mantener posición existente
              x: existingTable.x,
              y: existingTable.y,
              // Combinar campos
              tableFields: combineTableFields(existingFields, newFields)
            };
            
            combinedData.push(updatedTable);
            processedTableIds.add(matchingNewTable.id);
            console.log(`🔄 Combinando tabla existente: ${existingTable.name} (posición mantenida)`);
          } else {
            // Si solo existe en datos existentes, mantenerla tal cual
            combinedData.push(existingTable);
            console.log(`✅ Manteniendo tabla existente: ${existingTable.name}`);
          }
        });
        
        // Ahora agregar las tablas nuevas que no existían
        let newTableIndex = 0;
        dataWithDefaultFields.forEach(newTable => {
          if (!processedTableIds.has(newTable.id)) {
            // Calcular posición para nueva tabla
            const positionX = newTable.x !== undefined ? newTable.x : 100 + ((combinedData.length + newTableIndex) % 3) * 300;
            const positionY = newTable.y !== undefined ? newTable.y : 100 + Math.floor((combinedData.length + newTableIndex) / 3) * 200;
            
            const positionedTable = {
              ...newTable,
              x: positionX,
              y: positionY
            };
            
            combinedData.push(positionedTable);
            newTableIndex++;
            console.log(`➕ Agregando nueva tabla: ${newTable.name}`, {
              posición: { x: positionX, y: positionY }
            });
          }
        });
        
        console.log('📊 Datos combinados:', {
          existentes: existingData.length,
          nuevos: dataWithDefaultFields.length,
          total: combinedData.length,
          'nuevas realmente': newTableIndex
        });
        
        // Establecer los nuevos datos combinados
        setTablesData(combinedData);
        saveDataToLocalStorage(combinedData);
        
        // Generar relaciones
        const generatedRels = generateRelationships(combinedData);
        setRelationships(generatedRels);
        
        // Limpiar conexiones de campo
        setFieldConnections([]);
        
        // Actualización completa del diagrama
        forceDiagramUpdate();
        
        console.log('💾 Todos los datos cargados:', {
          tablas: combinedData.length,
          relaciones: generatedRels.length
        });
        
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

  // Función para notificar que JointJS está listo
  const handleJointReady = () => {
    console.log('🎯 JointJS notificado como listo');
    setIsJointReady(true);
  };

  // Cleanup
  onCleanup(() => {
    console.log('🧹 Limpiando NavigationBar');
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

      {/* ÁREA DEL DIAGRAMA */}
      <div class="joint-container">
        <JointJSDiagram
          refreshTrigger={lastUpdateTimestamp()}
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
          onJointReady={handleJointReady}
          onElementPositionChange={handleElementPositionChange}
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