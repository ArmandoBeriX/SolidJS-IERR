// src/components/NavigationBar/NavigationBar.tsx
import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import './NavigationBar.css';

// Definir el tipo para los estilos de Cytoscape
interface CytoscapeStylesheet {
  selector: string;
  style: {
    [key: string]: any;
  };
}

const NavigationBar = () => {
  const [isDarkMode, setIsDarkMode] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [isDraggable, setIsDraggable] = createSignal(true);
  
  // Referencias para Cytoscape
  let cyContainer: HTMLDivElement | undefined;
  let cy: Core | undefined;

  // Estados para el ejemplo
  const [nodeCount, setNodeCount] = createSignal(0);
  const [edgeCount, setEdgeCount] = createSignal(0);
  const [selectedCount, setSelectedCount] = createSignal(0);

  // Inicializar Cytoscape
  onMount(() => {
    if (!cyContainer) {
      console.error('cyContainer no está definido');
      return;
    }

    // Configurar estilos para modo ER - USANDO INTERFACE PERSONALIZADA
    const styles: CytoscapeStylesheet[] = [
      {
        selector: 'node',
        style: {
          'background-color': '#0d6efd',
          'label': 'data(label)',
          'width': 'mapData(size, 30, 80, 40, 60)',
          'height': 'mapData(size, 30, 80, 40, 60)',
          'font-size': '14px',
          'font-weight': 'bold',
          'color': '#ffffff',
          'text-valign': 'center',
          'text-halign': 'center',
          'border-width': 2,
          'border-color': '#0b5ed7',
          'border-opacity': 1
        }
      },
      {
        selector: 'node:selected',
        style: {
          'background-color': '#ffc107',
          'border-color': '#e0a800',
          'border-width': 3
        }
      },
      {
        selector: 'node.entity',
        style: {
          'shape': 'rectangle',
          'width': 120,
          'height': 80,
          'background-color': '#ffffff',
          'color': '#333333',
          'border-color': '#28a745',
          'border-width': 3,
          'text-wrap': 'wrap',
          'text-max-width': 100
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#6c757d',
          'target-arrow-color': '#6c757d',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '12px',
          'color': '#495057',
          'text-rotation': 'autorotate',
          'text-margin-y': -10
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#dc3545',
          'target-arrow-color': '#dc3545',
          'width': 4
        }
      },
      {
        selector: '.highlighted',
        style: {
          'background-color': '#ffc107',
          'line-color': '#ffc107',
          'target-arrow-color': '#ffc107',
          'border-color': '#e0a800'
        }
      }
    ];

    // Crear instancia de Cytoscape
    cy = cytoscape({
      container: cyContainer,
      elements: [],
      style: styles as any, // Usar 'as any' para evitar problemas de tipos
      layout: {
        name: 'cose',
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      },
      minZoom: 0.1,
      maxZoom: 3.0,
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
      selectionType: 'single',
      autolock: false,
      autoungrabify: false
    });

    // Configurar el color de fondo inicial
    if (cy) {
      cy.style()
        .selector('core')
        .style('background-color', isDarkMode() ? '#1e1e1e' : '#f8f9fa')
        .update();
    }

    // Event listeners
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      console.log('Nodo clickeado:', node.data());
    });

    cy.on('select', 'node, edge', () => {
      updateSelectionCount();
    });

    cy.on('unselect', 'node, edge', () => {
      updateSelectionCount();
    });

    cy.on('add remove', () => {
      updateElementCounts();
    });

    // Cargar datos de ejemplo
    loadSampleData();
  });

  // Cargar datos de ejemplo para ER
  const loadSampleData = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }

    const elements: ElementDefinition[] = [
      // Nodos (Entidades)
      { 
        data: { 
          id: 'usuario', 
          label: 'Usuario',
          type: 'entity',
          size: 60 
        },
        classes: 'entity'
      },
      { 
        data: { 
          id: 'perfil', 
          label: 'Perfil',
          type: 'entity',
          size: 50 
        },
        classes: 'entity'
      },
      { 
        data: { 
          id: 'rol', 
          label: 'Rol',
          type: 'entity',
          size: 45 
        },
        classes: 'entity'
      },
      { 
        data: { 
          id: 'permiso', 
          label: 'Permiso',
          type: 'entity',
          size: 40 
        },
        classes: 'entity'
      },
      { 
        data: { 
          id: 'configuracion', 
          label: 'Configuración',
          type: 'entity',
          size: 55 
        },
        classes: 'entity'
      },

      // Aristas (Relaciones)
      { 
        data: { 
          id: 'usuario-perfil', 
          source: 'usuario', 
          target: 'perfil',
          label: 'tiene' 
        } 
      },
      { 
        data: { 
          id: 'perfil-rol', 
          source: 'perfil', 
          target: 'rol',
          label: 'asigna' 
        } 
      },
      { 
        data: { 
          id: 'rol-permiso', 
          source: 'rol', 
          target: 'permiso',
          label: 'otorga' 
        } 
      },
      { 
        data: { 
          id: 'usuario-configuracion', 
          source: 'usuario', 
          target: 'configuracion',
          label: 'configura' 
        } 
      }
    ];

    cy.elements().remove();
    cy.add(elements);
    
    // Aplicar layout
    cy.layout({
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 50,
      randomize: true
    }).run();

    console.log('✅ Cytoscape cargado correctamente con datos de ejemplo ER');
  };

  // Actualizar contadores de elementos
  const updateElementCounts = () => {
    if (!cy) return;
    
    setNodeCount(cy.nodes().length);
    setEdgeCount(cy.edges().length);
  };

  // Actualizar contador de selección
  const updateSelectionCount = () => {
    if (!cy) return;
    
    setSelectedCount(cy.elements(':selected').length);
  };

  // Agregar entidad aleatoria
  const addRandomEntity = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }

    const entities = ['Cliente', 'Producto', 'Pedido', 'Factura', 'Categoría', 'Inventario'];
    const randomEntity = entities[Math.floor(Math.random() * entities.length)];
    const entityId = `${randomEntity.toLowerCase()}_${Date.now()}`;

    const newNode = {
      data: { 
        id: entityId, 
        label: randomEntity,
        type: 'entity',
        size: 45 + Math.random() * 25
      },
      classes: 'entity',
      position: {
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200
      }
    };

    cy.add(newNode);
    console.log('➕ Entidad agregada:', randomEntity);
  };

  // Organizar automáticamente
  const organizeDiagram = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }
    
    cy.layout({
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 50,
      randomize: false
    }).run();
    
    console.log('🔧 Diagrama organizado automáticamente');
  };

  // Limpiar diagrama
  const clearDiagram = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }

    cy.elements().remove();
    console.log('🗑️ Diagrama limpiado');
  };

  // Zoom in
  const handleZoomIn = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }
    cy.zoom(cy.zoom() * 1.2);
    console.log('🔍 Zoom in:', cy.zoom().toFixed(2));
  };

  // Zoom out
  const handleZoomOut = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }
    cy.zoom(cy.zoom() / 1.2);
    console.log('🔍 Zoom out:', cy.zoom().toFixed(2));
  };

  // Centrar vista
  const handleCenterView = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }
    cy.fit();
    console.log('🎯 Vista centrada');
  };

  // Reset zoom
  const handleResetZoom = () => {
    if (!cy) {
      console.error('cy no está inicializado');
      return;
    }
    cy.zoom(1);
    cy.center();
    console.log('🔄 Zoom reseteado');
  };

  // Toggle drag mode
  const toggleDragMode = () => {
    const newMode = !isDraggable();
    setIsDraggable(newMode);
    
    if (cy) {
      cy.autoungrabify(!newMode);
      cy.boxSelectionEnabled(newMode);
    }
    console.log('🖱️ Modo arrastrable:', newMode);
  };

  // Limpiar al desmontar
  onCleanup(() => {
    if (cy) {
      cy.destroy();
      console.log('🧹 Cytoscape limpiado correctamente');
    }
  });

  // Efecto para modo oscuro
  createEffect(() => {
    if (cy) {
      const backgroundColor = isDarkMode() ? '#1e1e1e' : '#f8f9fa';
      // Actualizar el color de fondo usando el estilo del core
      cy.style()
        .selector('core')
        .style('background-color', backgroundColor)
        .update();
    }
  });

  const toggleDarkMode = () => {
    const newMode = !isDarkMode();
    setIsDarkMode(newMode);
    document.body.classList.toggle('dark-mode', newMode);
    console.log('🌙 Modo oscuro:', newMode);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails());
    console.log('📊 Detalles:', !showDetails());
  };

  // Buscar elementos
  const handleSearch = (searchTerm: string) => {
    if (!cy) return;
    
    const term = searchTerm.trim();
    if (!term) {
      cy.elements().removeClass('highlighted');
      return;
    }

    const searchLower = term.toLowerCase();
    
    // Des-resaltar todos los elementos primero
    cy.elements().removeClass('highlighted');
    
    // Encontrar y resaltar elementos que coincidan
    const matchingElements = cy.elements().filter((ele) => {
      const label = ele.data('label') || '';
      return label.toLowerCase().includes(searchLower);
    });
    
    if (matchingElements.length > 0) {
      matchingElements.addClass('highlighted');
      cy.animate({
        center: { eles: matchingElements },
        zoom: cy.zoom() > 1 ? cy.zoom() : 1.5,
        duration: 1000
      });
      console.log(`🔍 Encontrados ${matchingElements.length} elementos`);
    }
  };

  return (
    <div class={`navigation-container ${isDarkMode() ? 'dark-mode' : ''}`}>
      <div class="navigation-bar">
        
        {/* Sección: Acciones Básicas */}
        <div class="nav-section">
          <button class="btn btn-primary btn-medium" onClick={loadSampleData}>
            <i class="bi bi-cloud-download"></i>
            Cargar Ejemplo ER
          </button>
        </div>

        {/* Sección: Manipular Entidades */}
        <div class="nav-section">
          <button class="btn btn-success btn-medium" onClick={addRandomEntity}>
            <i class="bi bi-plus-circle"></i>
            Nueva Entidad
          </button>
        </div>

        {/* Sección: Búsqueda */}
        <div class="nav-section search-section">
          <div class="search-box">
            <div class="search-container">
              <input
                type="text"
                class="search-input"
                placeholder="Buscar entidades..."
                onInput={(e) => handleSearch(e.currentTarget.value)}
              />
              <button class="search-button" title="Buscar">
                <i class="bi bi-search"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Sección: Controles del Diagrama */}
        <div class="nav-section map-controls">
          <button 
            class={`icon-btn icon-btn-primary icon-btn-medium ${isDraggable() ? 'active' : ''}`}
            onClick={toggleDragMode}
            title={isDraggable() ? "Modo mover" : "Modo seleccionar"}
          >
            <i class={isDraggable() ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" onClick={handleZoomIn} title="Zoom +">
            <i class="bi bi-zoom-in"></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" onClick={handleZoomOut} title="Zoom -">
            <i class="bi bi-zoom-out"></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" onClick={handleCenterView} title="Centrar vista">
            <i class="bi bi-fullscreen"></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" onClick={handleResetZoom} title="Reset zoom">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button class="icon-btn icon-btn-primary icon-btn-medium" onClick={organizeDiagram} title="Organizar automáticamente">
            <i class="bi bi-layers"></i>
          </button>
        </div>

        {/* Sección: Controles de Utilidad */}
        <div class="nav-section utility-controls">
          <button 
            class={`toggle-btn toggle-btn-primary toggle-btn-medium ${isDarkMode() ? 'active' : ''}`}
            onClick={toggleDarkMode}
            title={isDarkMode() ? "Modo claro" : "Modo oscuro"}
          >
            <i class={isDarkMode() ? "bi bi-sun-fill" : "bi bi-moon-fill"}></i>
          </button>
          
          <button 
            class={`toggle-btn toggle-btn-secondary toggle-btn-medium ${showDetails() ? 'active' : ''}`}
            onClick={toggleDetails}
            title={showDetails() ? "Ocultar detalles" : "Mostrar detalles"}
          >
            <i class={showDetails() ? "bi bi-eye-fill" : "bi bi-eye"}></i>
          </button>
        </div>

      </div>

      {/* Panel de Detalles */}
      {showDetails() && (
        <div class="details-panel">
          <h4><i class="bi bi-diagram-3"></i> Cytoscape.js - Diagrama Entidad-Relación</h4>
          <p>Visualización interactiva de entidades y relaciones usando Cytoscape.js. Haz clic en los nodos para seleccionarlos.</p>
          <div class="stats">
            <div class="stat">
              <i class="bi bi-circle"></i>
              <span>{nodeCount()} Entidades</span>
            </div>
            <div class="stat">
              <i class="bi bi-link-45deg"></i>
              <span>{edgeCount()} Relaciones</span>
            </div>
            <div class="stat">
              <i class="bi bi-cursor-fill"></i>
              <span>{selectedCount()} Seleccionados</span>
            </div>
            <div class={`stat mode-stat ${isDraggable() ? 'tables' : 'select'}`}>
              <i class={isDraggable() ? "bi bi-arrows-move" : "bi bi-cursor"}></i>
              <span>{isDraggable() ? "Modo Mover" : "Modo Seleccionar"}</span>
            </div>
          </div>
          
          <div class="quick-actions">
            <h5><i class="bi bi-lightning"></i> Acciones Rápidas</h5>
            <div class="action-buttons">
              <button class="btn btn-outline btn-small" onClick={loadSampleData}>
                <i class="bi bi-arrow-clockwise"></i> Recargar
              </button>
              <button class="btn btn-outline btn-small" onClick={clearDiagram}>
                <i class="bi bi-trash"></i> Limpiar
              </button>
              <button class="btn btn-outline btn-small" onClick={organizeDiagram}>
                <i class="bi bi-layers"></i> Organizar
              </button>
              <button class="btn btn-outline btn-small" onClick={addRandomEntity}>
                <i class="bi bi-plus"></i> Nueva Entidad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Diagrama Cytoscape */}
      <div 
        ref={cyContainer}
        class="flow-container"
        style={{
          'height': '600px',
          'background': isDarkMode() ? '#1e1e1e' : '#f8f9fa',
          'border': `1px solid ${isDarkMode() ? '#444' : '#ddd'}`,
        }}
      />
      
    </div>
  );
};

export default NavigationBar;