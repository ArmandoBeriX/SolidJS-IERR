// src/components/EntityForm/EntityForm.tsx
import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { JSX } from 'solid-js';
import './EntityForm.css';

// Definición de tipos
interface TableData {
  id: number;
  identifier: string;
  name: string;
  description: string;
  x?: number;
  y?: number;
  tableFields?: any[];
}

interface EntityFormProps {
  entity?: TableData | null;
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete?: (entityId: number) => void;
}

const EntityForm = (props: EntityFormProps) => {
  const [formData, setFormData] = createSignal({
    name: '',
    identifier: '',
    description: ''
  });

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);

  // Actualizar formulario cuando cambia la entidad
  createEffect(() => {
    console.log('EntityForm - entidad recibida:', props.entity);
    
    if (props.entity) {
      setFormData({
        name: props.entity.name || '',
        identifier: props.entity.identifier || '',
        description: props.entity.description || ''
      });
    } else {
      // Limpiar formulario para nueva entidad
      setFormData({
        name: '',
        identifier: '',
        description: ''
      });
    }
    setErrors({});
    setShowDeleteConfirm(false);
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const data = formData();
    
    if (!data.name.trim()) {
      newErrors.name = 'El nombre de la entidad es requerido';
    }
    
    if (!data.identifier.trim()) {
      newErrors.identifier = 'El identificador es requerido';
    } else {
      const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!identifierRegex.test(data.identifier)) {
        newErrors.identifier = 'El identificador debe comenzar con una letra o guión bajo y solo puede contener letras, números y guiones bajos';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const { name, value } = target;
    
    console.log(`📝 Cambio en campo ${name}:`, value);
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors()[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
    console.log('Enviando datos de entidad:', formData());
    
    if (!validateForm()) {
      console.log('Validación fallida');
      return;
    }
    
    props.onSave(formData());
  };

  const handleDelete = () => {
    if (!props.entity) return;
    
    console.log('Eliminando entidad:', props.entity);
    if (props.onDelete) {
      props.onDelete(props.entity.id);
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
    <form onSubmit={handleSubmit} class="entity-form">
      <div class="form-group">
        <label for="name">Nombre de la Entidad *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData().name}
          onInput={handleChange}
          required
          placeholder="Nombre de la entidad"
          class={errors().name ? 'error' : ''}
        />
        {errors().name && (
          <small style={{color: '#dc3545', 'font-size': '12px'}}>
            {errors().name}
          </small>
        )}
      </div>

      <div class="form-group">
        <label for="identifier">Identificador *</label>
        <input
          type="text"
          id="identifier"
          name="identifier"
          value={formData().identifier}
          onInput={handleChange}
          required
          placeholder="identificador_entidad"
          class={errors().identifier ? 'error' : ''}
        />
        {errors().identifier && (
          <small style={{color: '#dc3545', 'font-size': '12px'}}>
            {errors().identifier}
          </small>
        )}
        <small style={{'font-size': '11px', color: '#6c757d'}}>
          Nombre técnico de la entidad (solo letras, números y _)
        </small>
      </div>

      <div class="form-group">
        <label for="description">Descripción</label>
        <textarea
          id="description"
          name="description"
          value={formData().description}
          onInput={handleChange}
          rows="3"
          placeholder="Descripción de la entidad..."
        />
        <small style={{'font-size': '11px', color: '#6c757d'}}>
          Texto que aparece debajo del nombre de la entidad
        </small>
      </div>

      {/* Acciones del formulario */}
      <div class="form-actions">
        <div class="delete-section">
          {props.entity && !showDeleteConfirm() && (
            <button
              type="button"
              class="btn btn-danger"
              onClick={handleDeleteClick}
            >
              <i class="bi bi-trash"></i>
              Eliminar Entidad
            </button>
          )}
          
          {showDeleteConfirm() && (
            <div class="delete-confirmation">
              <p>¿Estás seguro de eliminar esta entidad?</p>
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
          )}
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
            {props.entity ? 'Actualizar' : 'Crear'} Entidad
          </button>
        </div>
      </div>
    </form>
  );
};

export default EntityForm;