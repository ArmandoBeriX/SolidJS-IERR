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

// Función para agregar campos por defecto
const addDefaultFieldsToTable = (table: TableData): TableData => {
  console.log(`🔄 Procesando tabla: ${table.name} (${table.identifier})`);
  
  const existingFields = table.tableFields || [];
  const isUsersTable = table.identifier === 'users';
  
  const existingFieldIdentifiers = existingFields.map((f: TableField) => f.identifier);
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

  // Función para cargar datos desde localStorage - MEJORADA
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

  // Función para guardar datos en localStorage - MEJORADA
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
    } catch (error) {
      console.error('❌ Error guardando datos en localStorage:', error);
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

  // Efecto para escuchar eventos de clic en nombres de campo
  createEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      handleFieldNameClickEvent(customEvent);
    };

    document.addEventListener('fieldNameClick', handleEvent);
    
    onCleanup(() => {
      document.removeEventListener('fieldNameClick', handleEvent);
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
    
    setTablesData(prev => {
      const newTables = prev.map(table => 
        table.id === existingEntity?.id 
          ? { 
              ...table, 
              name: data.name,
              identifier: data.identifier,
              description: data.description,
              x: table.x || 0,
              y: table.y || 0
            }
          : table
      );
      
      console.log('✅ Entidad actualizada');
      saveDataToLocalStorage(newTables);
      return newTables;
    });
    
    closeModal();
  };

  const handleDeleteEntity = (entityId: number) => {
    console.log('🗑️ Eliminando entidad:', entityId);
    setTablesData(prev => {
      const newTables = prev.filter(table => table.id !== entityId);
      saveDataToLocalStorage(newTables);
      return newTables;
    });
    closeModal();
  };

  // Manejadores para campos
  const handleSaveField = (tableId: number, data: any, existingField?: TableField) => {
    console.log('💾 Guardando campo:', data, 'en tabla:', tableId, 'existente:', existingField);
    
    setTablesData(prev => {
      const newTables = prev.map(table => {
        if (table.id === tableId) {
          const fields = table.tableFields || [];
          
          if (existingField) {
            // Actualizar campo existente
            const updatedField = { 
              ...existingField,
              ...data,
              id: existingField.id,
              tableId: tableId
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
            return updatedTable;
          } else {
            // Nuevo campo
            const newField: TableField = {
              id: Date.now(),
              tableId: tableId,
              ...data,
              position: fields.length,
              isEditable: true,
              isVisible: true,
              storeData: {},
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
            return updatedTable;
          }
        }
        return table;
      });
      
      console.log('✅ Tablas actualizadas:', newTables.length);
      saveDataToLocalStorage(newTables);
      
      // Actualizar relaciones
      setTimeout(() => {
        updateRelationshipsFromTables();
      }, 0);
      
      return newTables;
    });
    
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

  // Función MEJORADA para manejar cambio de posición de elementos
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
    
    // NOTA: El guardado en localStorage ahora se hace automáticamente desde JointJSDiagram
    // con throttling para mejor rendimiento
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
    
    const newId = Date.now();
    
    const newEntity: TableData = {
      id: newId,
      identifier: `table_${newId}`,
      name: 'Nueva Tabla',
      description: 'Descripción de la nueva tabla',
      x: 100 + (tablesData().length % 3) * 300,
      y: 100 + Math.floor(tablesData().length / 3) * 200,
      tableFields: [
        {
          id: newId * 1000 + 1,
          tableId: newId,
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
        }
      ]
    };
    
    // Abrir modal para editar la nueva entidad
    openEntityModal(newEntity);
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
        
        // Agregar campos por defecto
        const dataWithDefaultFields = processedData.map((table: TableData) => 
          addDefaultFieldsToTable(table)
        );
        
        console.log('🎉 Campos por defecto agregados');
        
        // Cargar posiciones guardadas
        const savedData = loadDataFromLocalStorage();
        const dataWithCoords = dataWithDefaultFields.map((table: TableData, index: number) => {
          const savedTable = savedData.find(t => t.id === table.id);
          if (savedTable && savedTable.x !== undefined && savedTable.y !== undefined) {
            console.log(`📌 Usando posición guardada para tabla: ${table.name} (${savedTable.x}, ${savedTable.y})`);
            return {
              ...table,
              x: savedTable.x,
              y: savedTable.y
            };
          }
          return {
            ...table,
            x: 100 + (index % 3) * 300,
            y: 100 + Math.floor(index / 3) * 200
          };
        });
        
        // Establecer los nuevos datos
        setTablesData(dataWithCoords);
        saveDataToLocalStorage(dataWithCoords);
        
        // Generar relaciones
        const generatedRels = generateRelationships(dataWithCoords);
        setRelationships(generatedRels);
        
        // Limpiar conexiones de campo
        setFieldConnections([]);
        
        console.log('💾 Nuevos datos cargados:', {
          tablas: dataWithCoords.length,
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

      {/* ÁREA DEL DIAGRAMA */}
      <div class="joint-container">
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