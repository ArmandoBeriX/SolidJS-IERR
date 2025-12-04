// src/components/FieldForm/FieldForm.tsx
import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import './FieldForm.css';

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

interface FieldFormProps {
  tableId: number;
  field?: TableField | null;
  tablesData: TableData[];
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete?: (tableId: number, field: TableField) => void;
}

const FieldForm = (props: FieldFormProps) => {
  const isEditing = () => props.field !== null && props.field !== undefined;

  // Estado inicial vacío
  const [formData, setFormData] = createSignal({
    identifier: '',
    name: '',
    fieldFormat: 'string',
    multiple: false,
    isRequired: false,
    isFilter: false,
    isUnique: false,
    default: '',
    relationTableIdentifier: '',
    isEditable: true,
    isVisible: true,
    history: true,
    description: '',
    storeData: {
      min: '',
      max: '',
      regex: '',
      formatted: false,
      selectorType: 0,
      currentId: 1,
      possibleValues: {} as Record<string, string>,
      validExtensions: '',
      check_box: false
    },
    relationQuery: [] as RelationFilter[]
  });

  const [relationFilters, setRelationFilters] = createSignal<RelationFilter[]>([]);
  const [availableRelationFields, setAvailableRelationFields] = createSignal<any[]>([]);
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [newPossibleValue, setNewPossibleValue] = createSignal('');

  const availableTables = () => props.tablesData.filter(table => table.id !== props.tableId);

  // Tipos de campo que permiten múltiples valores
  const multipleAllowedTypes = ['relation', 'attachment', 'list'];
  
  // Operadores disponibles por tipo de campo
  const getOperatorsForFieldType = (fieldType: string) => {
    const baseOperators = [
      { value: '=', label: 'Igual a' },
      { value: '!=', label: 'Distinto de' }
    ];

    const comparisonOperators = [
      { value: '<', label: 'Menor que' },
      { value: '>', label: 'Mayor que' },
      { value: '<=', label: 'Hasta' },
      { value: '>=', label: 'Desde' },
      { value: '<=>', label: 'Entre' }
    ];

    const specialOperators = [
      { value: '*', label: 'Cualquiera' },
      { value: '!*', label: 'Ninguno' }
    ];

    switch (fieldType) {
      case 'bool':
        return baseOperators;
      
      case 'int':
      case 'float':
      case 'date':
      case 'time':
      case 'datetime':
        return [...baseOperators, ...comparisonOperators];
      
      case 'relation':
        return [...baseOperators, ...specialOperators];
      
      default: // string, text, list, attachment
        return [...baseOperators, ...specialOperators];
    }
  };

  // Cargar datos del campo - MEJORADO con más logging
  createEffect(() => {
    console.log('=== FieldForm - INICIALIZACIÓN ===');
    console.log('Campo recibido:', props.field);
    console.log('isEditing:', isEditing());
    console.log('tableId:', props.tableId);
    
    if (isEditing() && props.field) {
      console.log('🔄 Cargando datos del campo existente para edición');
      console.log('📋 Datos completos del campo:', JSON.stringify(props.field, null, 2));
      
      const fieldFormatValue = props.field.fieldFormat || 'string';
      const existingStoreData = props.field.storeData || {};
      
      console.log('📥 StoreData existente del campo:', existingStoreData);
      
      const possibleValues = existingStoreData.possibleValues || {};
      console.log('📥 PossibleValues encontrados:', possibleValues);
      
      const currentId = existingStoreData.currentId || 
        (Object.keys(possibleValues).length > 0 
          ? Math.max(...Object.keys(possibleValues).map(Number)) + 1 
          : 1);

      // Procesar min/max
      let minValue = '';
      let maxValue = '';
      
      if (existingStoreData.min !== undefined && existingStoreData.min !== null && existingStoreData.min !== '') {
        minValue = String(existingStoreData.min);
      }
      
      if (existingStoreData.max !== undefined && existingStoreData.max !== null && existingStoreData.max !== '') {
        maxValue = String(existingStoreData.max);
      }

      console.log('🔍 Propiedades generales del campo:');
      console.log('isRequired:', props.field.isRequired);
      console.log('isFilter:', props.field.isFilter);
      console.log('isUnique:', props.field.isUnique);

      const loadedData = {
        identifier: props.field.identifier || '',
        name: props.field.name || '',
        fieldFormat: fieldFormatValue,
        multiple: Boolean(props.field.multiple),
        isRequired: props.field.isRequired !== undefined ? Boolean(props.field.isRequired) : false,
        isFilter: props.field.isFilter !== undefined ? Boolean(props.field.isFilter) : false,
        isUnique: props.field.isUnique !== undefined ? Boolean(props.field.isUnique) : false,
        default: props.field.default !== null && props.field.default !== undefined ? String(props.field.default) : '',
        relationTableIdentifier: props.field.relationTableIdentifier || '',
        isEditable: props.field.isEditable !== undefined ? Boolean(props.field.isEditable) : true,
        isVisible: props.field.isVisible !== undefined ? Boolean(props.field.isVisible) : true,
        history: props.field.history !== undefined ? Boolean(props.field.history) : true,
        description: props.field.description || '',
        storeData: {
          min: minValue,
          max: maxValue,
          regex: existingStoreData.regex || '',
          formatted: Boolean(existingStoreData.formatted),
          selectorType: existingStoreData.selectorType !== undefined ? Number(existingStoreData.selectorType) : 0,
          currentId: currentId,
          possibleValues: possibleValues,
          validExtensions: existingStoreData.validExtensions || '',
          check_box: Boolean(existingStoreData.check_box)
        },
        relationQuery: props.field.relationQuery || []
      };

      console.log('✅ Datos cargados en formulario:', loadedData);
      
      setFormData(loadedData);
      setRelationFilters(props.field.relationQuery || []);
      
    } else {
      // Nuevo campo - inicializar con valores por defecto
      console.log('🆕 Inicializando formulario para NUEVO campo');
      setFormData({
        identifier: '',
        name: '',
        fieldFormat: 'string',
        multiple: false,
        isRequired: false,
        isFilter: false,
        isUnique: false,
        default: '',
        relationTableIdentifier: '',
        isEditable: true,
        isVisible: true,
        history: true,
        description: '',
        storeData: {
          min: '',
          max: '',
          regex: '',
          formatted: false,
          selectorType: 0,
          currentId: 1,
          possibleValues: {},
          validExtensions: '',
          check_box: false
        },
        relationQuery: []
      });
      setRelationFilters([]);
    }
    
    setErrors({});
    setShowDeleteConfirm(false);
    setNewPossibleValue('');
  });

  // Actualizar campos disponibles cuando cambia la tabla relacionada
  createEffect(() => {
    if (formData().fieldFormat === 'relation' && formData().relationTableIdentifier) {
      const relatedTable = props.tablesData.find(
        table => table.identifier === formData().relationTableIdentifier
      );
      if (relatedTable) {
        const fields = (relatedTable.tableFields || [])
          .filter((f: any) => f.fieldFormat !== 'relation')
          .map((f: any) => ({
            identifier: f.identifier,
            name: f.name,
            fieldFormat: f.fieldFormat
          }));
        setAvailableRelationFields(fields);
      }
    } else {
      setAvailableRelationFields([]);
    }
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const data = formData();
    
    if (!data.identifier.trim()) {
      newErrors.identifier = 'El identificador es requerido';
    } else {
      const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!identifierRegex.test(data.identifier)) {
        newErrors.identifier = 'El identificador debe comenzar con una letra o guión bajo y solo puede contener letras, números y guiones bajos';
      }
    }
    
    if (!data.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (data.fieldFormat === 'relation' && !data.relationTableIdentifier) {
      newErrors.relationTableIdentifier = 'Debe seleccionar una tabla relacionada para campos de tipo relación';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;
    
    console.log(`📝 Cambio en campo ${name}:`, type === 'checkbox' ? checked : value);
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors()[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Si cambia el tipo de campo, resetear algunos valores
    if (name === 'fieldFormat') {
      setFormData(prev => ({
        ...prev,
        relationTableIdentifier: '',
        multiple: multipleAllowedTypes.includes(value) ? prev.multiple : false
      }));
    }
  };

  const handleStoreDataChange = (key: string, value: any) => {
    console.log(`📝 Cambio en storeData.${key}:`, value);
    
    setFormData(prev => ({
      ...prev,
      storeData: {
        ...prev.storeData,
        [key]: value
      }
    }));
  };

  // Manejar possibleValues para list
  const addPossibleValue = () => {
    if (!newPossibleValue().trim()) return;
    
    const newId = formData().storeData.currentId;
    console.log(`➕ Agregando possibleValue: ${newPossibleValue()} con ID: ${newId}`);
    
    setFormData(prev => ({
      ...prev,
      storeData: {
        ...prev.storeData,
        currentId: newId + 1,
        possibleValues: {
          ...prev.storeData.possibleValues,
          [newId]: newPossibleValue().trim()
        }
      }
    }));
    setNewPossibleValue('');
  };

  const removePossibleValue = (id: string) => {
    console.log(`➖ Eliminando possibleValue con ID: ${id}`);
    
    setFormData(prev => {
      const newPossibleValues = { ...prev.storeData.possibleValues };
      delete newPossibleValues[id];
      return {
        ...prev,
        storeData: {
          ...prev.storeData,
          possibleValues: newPossibleValues
        }
      };
    });
  };

  const updatePossibleValue = (id: string, newValue: string) => {
    console.log(`✏️ Actualizando possibleValue ${id}: ${newValue}`);
    
    setFormData(prev => ({
      ...prev,
      storeData: {
        ...prev.storeData,
        possibleValues: {
          ...prev.storeData.possibleValues,
          [id]: newValue
        }
      }
    }));
  };

  // Funciones para filtros de relación - CORREGIDAS CON TIPOS
  const addRelationFilter = () => {
    const newFilter: RelationFilter = { field: '', op: '=', v: [''] };
    setRelationFilters(prev => [...prev, newFilter]);
  };

  const updateRelationFilter = (index: number, key: string, value: any) => {
    setRelationFilters(prev => 
      prev.map((filter, i) => 
        i === index ? { ...filter, [key]: value } : filter
      )
    );
  };

  const updateFilterValue = (index: number, valueIndex: number, newValue: string) => {
    setRelationFilters(prev => 
      prev.map((filter, i) => {
        if (i === index) {
          const newValues = [...filter.v];
          newValues[valueIndex] = newValue;
          return { ...filter, v: newValues };
        }
        return filter;
      })
    );
  };

  const addFilterValue = (index: number) => {
    setRelationFilters(prev => 
      prev.map((filter, i) => 
        i === index ? { ...filter, v: [...filter.v, ''] } : filter
      )
    );
  };

  const removeFilterValue = (index: number, valueIndex: number) => {
    setRelationFilters(prev => 
      prev.map((filter, i) => {
        if (i === index) {
          const newValues = filter.v.filter((_: string, vi: number) => vi !== valueIndex);
          return { ...filter, v: newValues.length > 0 ? newValues : [''] };
        }
        return filter;
      })
    );
  };

  const removeRelationFilter = (index: number) => {
    setRelationFilters(prev => prev.filter((_, i: number) => i !== index));
  };

  const getFilterFieldType = (fieldIdentifier: string) => {
    const field = availableRelationFields().find(f => f.identifier === fieldIdentifier);
    return field ? field.fieldFormat : 'string';
  };

  const renderFilterValueInput = (filter: RelationFilter, index: number, valueIndex: number) => {
    const fieldType = getFilterFieldType(filter.field);
    
    switch (fieldType) {
      case 'int':
      case 'float':
        return (
          <input
            type="number"
            value={filter.v[valueIndex] || ''}
            onInput={(e) => updateFilterValue(index, valueIndex, (e.target as HTMLInputElement).value)}
            placeholder="Valor numérico"
            step={fieldType === 'float' ? '0.1' : '1'}
          />
        );
      case 'bool':
        return (
          <select
            value={filter.v[valueIndex] || ''}
            onChange={(e) => updateFilterValue(index, valueIndex, (e.target as HTMLSelectElement).value)}
          >
            <option value="">Seleccionar...</option>
            <option value="true">Verdadero</option>
            <option value="false">Falso</option>
          </select>
        );
      case 'date':
        return (
          <input
            type="date"
            value={filter.v[valueIndex] || ''}
            onChange={(e) => updateFilterValue(index, valueIndex, (e.target as HTMLInputElement).value)}
          />
        );
      case 'time':
        return (
          <input
            type="time"
            value={filter.v[valueIndex] || ''}
            onChange={(e) => updateFilterValue(index, valueIndex, (e.target as HTMLInputElement).value)}
          />
        );
      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={filter.v[valueIndex] || ''}
            onChange={(e) => updateFilterValue(index, valueIndex, (e.target as HTMLInputElement).value)}
          />
        );
      default:
        return (
          <input
            type="text"
            value={filter.v[valueIndex] || ''}
            onInput={(e) => updateFilterValue(index, valueIndex, (e.target as HTMLInputElement).value)}
            placeholder="Valor"
          />
        );
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    console.log('=== ENVIANDO FORMULARIO ===');
    console.log('Datos completos del formulario:', formData());
    
    if (!validateForm()) {
      console.log('❌ Validación fallida');
      return;
    }
    
    // Preparar datos para enviar
    const submitData = {
      identifier: formData().identifier,
      name: formData().name,
      fieldFormat: formData().fieldFormat,
      multiple: Boolean(formData().multiple),
      isRequired: Boolean(formData().isRequired),
      isFilter: Boolean(formData().isFilter),
      isUnique: Boolean(formData().isUnique),
      default: formData().default || null,
      relationTableIdentifier: formData().fieldFormat === 'relation' ? formData().relationTableIdentifier : null,
      isEditable: Boolean(formData().isEditable),
      isVisible: Boolean(formData().isVisible),
      history: Boolean(formData().history),
      description: formData().description,
      storeData: {
        min: formData().storeData.min !== '' && formData().storeData.min !== null ? 
             Number(formData().storeData.min) : '',
        max: formData().storeData.max !== '' && formData().storeData.max !== null ? 
             Number(formData().storeData.max) : '',
        regex: formData().storeData.regex || '',
        formatted: Boolean(formData().storeData.formatted),
        selectorType: Number(formData().storeData.selectorType),
        currentId: Number(formData().storeData.currentId),
        possibleValues: formData().fieldFormat === 'list' ? formData().storeData.possibleValues : {},
        validExtensions: formData().storeData.validExtensions || '',
        check_box: Boolean(formData().storeData.check_box)
      },
      relationQuery: formData().fieldFormat === 'relation' ? relationFilters() : []
    };
    
    console.log('✅ Datos procesados para guardar:', submitData);
    
    // Llamar a la función onSave del padre
    props.onSave(submitData);
  };

  const handleDelete = () => {
    if (!props.field) return;
    
    console.log('🗑️ Solicitando eliminación de campo:', props.field);
    if (props.onDelete) {
      props.onDelete(props.tableId, props.field);
    }
    setShowDeleteConfirm(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Cleanup
  onCleanup(() => {
    setErrors({});
    setShowDeleteConfirm(false);
  });

  return (
    <form onSubmit={handleSubmit} class="field-form">
      {/* Campos básicos */}
      <div class="form-row">
        <div class="form-group">
          <label for="identifier" class="required-field">Identificador</label>
          <input
            type="text"
            id="identifier"
            name="identifier"
            value={formData().identifier}
            onInput={handleChange}
            required
            placeholder="nombre_campo"
            class={errors().identifier ? 'error' : ''}
          />
          {errors().identifier && <small class="error-message">{errors().identifier}</small>}
        </div>
        
        <div class="form-group">
          <label for="name" class="required-field">Nombre</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData().name}
            onInput={handleChange}
            required
            placeholder="Nombre del Campo"
            class={errors().name ? 'error' : ''}
          />
          {errors().name && <small class="error-message">{errors().name}</small>}
        </div>
      </div>

      <div class="form-group">
        <label for="fieldFormat" class="required-field">Tipo de Campo</label>
        <select
          id="fieldFormat"
          name="fieldFormat"
          value={formData().fieldFormat}
          onChange={handleChange}
          required
        >
          <option value="string">Texto (string)</option>
          <option value="text">Texto Largo (text)</option>
          <option value="int">Número Entero (int)</option>
          <option value="float">Número Decimal (float)</option>
          <option value="bool">Booleano (bool)</option>
          <option value="date">Fecha (date)</option>
          <option value="time">Hora (time)</option>
          <option value="datetime">Fecha y Hora (datetime)</option>
          <option value="relation">Relación (relation)</option>
          <option value="attachment">Archivo (attachment)</option>
          <option value="list">Lista (list)</option>
        </select>
      </div>

      {/* Múltiple solo para relation, attachment, list */}
      <Show when={multipleAllowedTypes.includes(formData().fieldFormat)}>
        <div class="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="multiple"
              checked={formData().multiple}
              onChange={handleChange}
            />
            Múltiples Valores
          </label>
          <small class="small-info">
            Permite seleccionar múltiples valores para este campo
          </small>
        </div>
      </Show>

      {/* Valores Posibles para list */}
      <Show when={formData().fieldFormat === 'list'}>
        <div class="conditional-section">
          <h4>Valores Posibles</h4>
          <div class="possible-values-container">
            <div class="add-possible-value">
              <input
                type="text"
                value={newPossibleValue()}
                onInput={(e) => setNewPossibleValue((e.target as HTMLInputElement).value)}
                placeholder="Nuevo valor de la lista"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPossibleValue();
                  }
                }}
              />
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onClick={addPossibleValue}
                disabled={!newPossibleValue().trim()}
              >
                <i class="bi bi-plus"></i> Agregar
              </button>
            </div>
            
            <div class="possible-values-list">
              <For each={Object.entries(formData().storeData.possibleValues)}>
                {([id, value]) => (
                  <div class="possible-value-item">
                    <input
                      type="text"
                      value={value}
                      onInput={(e) => updatePossibleValue(id, (e.target as HTMLInputElement).value)}
                      placeholder="Valor de la lista"
                    />
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      onClick={() => removePossibleValue(id)}
                      title="Eliminar valor"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                )}
              </For>
              
              <Show when={Object.keys(formData().storeData.possibleValues).length === 0}>
                <div class="empty-state">
                  <small>No hay valores definidos para la lista</small>
                </div>
              </Show>
            </div>
          </div>
          <small class="small-info">
            Define los valores disponibles para seleccionar en esta lista
          </small>
        </div>
      </Show>

      {/* Formatos Válidos para attachment */}
      <Show when={formData().fieldFormat === 'attachment'}>
        <div class="form-group">
          <label>Formatos Válidos</label>
          <input
            type="text"
            value={formData().storeData.validExtensions}
            onInput={(e) => handleStoreDataChange('validExtensions', (e.target as HTMLInputElement).value)}
            placeholder="jpeg, jpg, png..."
          />
          <small class="small-info">
            Múltiples valores (separados por coma). Ejemplo: jpeg, jpg, png
          </small>
        </div>
      </Show>

      {/* Min/Max para int, float, string, text */}
      <Show when={['int', 'float', 'string', 'text'].includes(formData().fieldFormat)}>
        <div class="conditional-section">
          <h4>Longitud y Validaciones</h4>
          <div class="form-row">
            <div class="form-group">
              <label>Longitud Mínima</label>
              <input
                type="number"
                value={formData().storeData.min}
                onInput={(e) => handleStoreDataChange('min', (e.target as HTMLInputElement).value)}
                placeholder="Mínimo"
                min="0"
              />
            </div>
            <div class="form-group">
              <label>Longitud Máxima</label>
              <input
                type="number"
                value={formData().storeData.max}
                onInput={(e) => handleStoreDataChange('max', (e.target as HTMLInputElement).value)}
                placeholder="Máximo"
                min="0"
              />
            </div>
          </div>
        </div>
      </Show>

      {/* Texto formateado para text */}
      <Show when={formData().fieldFormat === 'text'}>
        <div class="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData().storeData.formatted}
              onChange={(e) => handleStoreDataChange('formatted', (e.target as HTMLInputElement).checked)}
            />
            Texto Formateado
          </label>
          <small class="small-info">
            Permite formato avanzado (rich text) con editor WYSIWYG
          </small>
        </div>
      </Show>

      {/* Regex para int, float, string */}
      <Show when={['int', 'float', 'string'].includes(formData().fieldFormat)}>
        <div class="form-group">
          <label>Expresión Regular</label>
          <input
            type="text"
            value={formData().storeData.regex}
            onInput={(e) => handleStoreDataChange('regex', (e.target as HTMLInputElement).value)}
            placeholder="/^[a-zA-Z0-9]+$/"
          />
          <small class="small-info">
            Expresión regular para validar el formato del campo
          </small>
        </div>
      </Show>

      {/* Selector Type para relation y list */}
      <Show when={['relation', 'list'].includes(formData().fieldFormat)}>
        <div class="form-group">
          <label>Tipo de Selector</label>
          <select
            value={formData().storeData.selectorType}
            onChange={(e) => handleStoreDataChange('selectorType', parseInt((e.target as HTMLSelectElement).value))}
          >
            <option value={0}>Tradicional (dropdown)</option>
            <option value={1}>Casillas (checkboxes)</option>
          </select>
          <small class="small-info">
            Cómo se mostrarán las opciones en los formularios
          </small>
        </div>
      </Show>

      {/* Opciones para campos relation */}
      <Show when={formData().fieldFormat === 'relation'}>
        <div class="conditional-section">
          <h4>Opciones de Relación</h4>
          
          <div class="form-group">
            <label for="relationTableIdentifier" class="required-field">Tabla Relacionada</label>
            <select
              id="relationTableIdentifier"
              name="relationTableIdentifier"
              value={formData().relationTableIdentifier}
              onChange={handleChange}
              required
              class={errors().relationTableIdentifier ? 'error' : ''}
            >
              <option value="">Seleccionar tabla...</option>
              <For each={availableTables()}>
                {(table) => (
                  <option value={table.identifier}>
                    {table.name} ({table.identifier})
                  </option>
                )}
              </For>
            </select>
            <Show when={errors().relationTableIdentifier}>
              <small class="error-message">{errors().relationTableIdentifier}</small>
            </Show>
          </div>

          {/* Filtros de relación */}
          <div class="form-group">
            <label>Filtrado por</label>
            <div class="relation-filters">
              <For each={relationFilters()}>
                {(filter, index) => {
                  const fieldType = getFilterFieldType(filter.field);
                  const availableOperators = getOperatorsForFieldType(fieldType);
                  
                  return (
                    <div class="relation-filter-row">
                      <select
                        value={filter.field}
                        onChange={(e) => updateRelationFilter(index(), 'field', (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">Seleccionar campo...</option>
                        <For each={availableRelationFields()}>
                          {(field) => (
                            <option value={field.identifier}>
                              {field.name} ({field.identifier}) - {field.fieldFormat}
                            </option>
                          )}
                        </For>
                      </select>
                      
                      <select
                        value={filter.op}
                        onChange={(e) => updateRelationFilter(index(), 'op', (e.target as HTMLSelectElement).value)}
                      >
                        <For each={availableOperators}>
                          {(op) => (
                            <option value={op.value}>
                              {op.label}
                            </option>
                          )}
                        </For>
                      </select>
                      
                      <div class="filter-values">
                        <For each={filter.v}>
                          {(value, valueIndex) => (
                            <div class="filter-value-row">
                              {renderFilterValueInput(filter, index(), valueIndex())}
                              <Show when={filter.v.length > 1}>
                                <button
                                  type="button"
                                  class="btn btn-danger btn-sm"
                                  onClick={() => removeFilterValue(index(), valueIndex())}
                                  title="Eliminar valor"
                                >
                                  <i class="bi bi-dash"></i>
                                </button>
                              </Show>
                            </div>
                          )}
                        </For>
                        
                        <Show when={(filter.op === '<=>' || filter.op === '!=') && filter.v.length < 2}>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            onClick={() => addFilterValue(index())}
                            title="Agregar valor adicional"
                          >
                            <i class="bi bi-plus"></i> Valor
                          </button>
                        </Show>
                      </div>
                      
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        onClick={() => removeRelationFilter(index())}
                        title="Eliminar filtro"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  );
                }}
              </For>
              
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={addRelationFilter}
              >
                <i class="bi bi-plus"></i> Añadir Filtro
              </button>
            </div>
            <small class="small-info">
              Filtros aplicados a los registros de la tabla relacionada
            </small>
          </div>
        </div>
      </Show>

      {/* Propiedades generales del campo */}
      <div class="conditional-section">
        <h4>Propiedades Generales</h4>
        
        <div class="checkbox-row">
          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isRequired"
                checked={formData().isRequired}
                onChange={handleChange}
              />
              Requerido
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isFilter"
                checked={formData().isFilter}
                onChange={handleChange}
              />
              Filtrable
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isUnique"
                checked={formData().isUnique}
                onChange={handleChange}
              />
              Único
            </label>
          </div>
        </div>

        <div class="checkbox-row">
          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isEditable"
                checked={formData().isEditable}
                onChange={handleChange}
              />
              Editable
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isVisible"
                checked={formData().isVisible}
                onChange={handleChange}
              />
              Visible
            </label>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="history"
                checked={formData().history}
                onChange={handleChange}
              />
              History
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="default">Valor por Defecto</label>
        <input
          type="text"
          id="default"
          name="default"
          value={formData().default}
          onInput={handleChange}
          placeholder="Valor predeterminado"
        />
      </div>

      <div class="form-group">
        <label for="description">Descripción</label>
        <textarea
          id="description"
          name="description"
          value={formData().description}
          onInput={handleChange}
          rows="3"
          placeholder="Descripción del campo..."
        />
      </div>

      {/* Acciones del formulario */}
      <div class="form-actions">
        <div class="delete-section">
          <Show when={isEditing() && !showDeleteConfirm()}>
            <button
              type="button"
              class="btn btn-danger"
              onClick={handleDeleteClick}
            >
              <i class="bi bi-trash"></i>
              Eliminar Campo
            </button>
          </Show>
          
          <Show when={showDeleteConfirm()}>
            <div class="delete-confirmation">
              <p>¿Estás seguro de eliminar este campo?</p>
              <div class="delete-confirmation-buttons">
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  onClick={handleDelete}
                >
                  <i class="bi bi-check-lg"></i>
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  onClick={handleCancelDelete}
                >
                  <i class="bi bi-x-lg"></i>
                  Cancelar
                </button>
              </div>
            </div>
          </Show>
        </div>

        <div class="form-action-buttons">
          <button
            type="button"
            class="btn btn-secondary"
            onClick={props.onCancel}
          >
            <i class="bi bi-x"></i>
            Cancelar
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            <i class="bi bi-check"></i>
            {isEditing() ? 'Actualizar' : 'Crear'} Campo
          </button>
        </div>
      </div>
    </form>
  );
};

export default FieldForm;