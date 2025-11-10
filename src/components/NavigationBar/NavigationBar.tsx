// src/components/NavigationBar/NavigationBar.tsx
import { createSignal, onMount, onCleanup } from 'solid-js';
import * as go from 'gojs';
import './NavigationBar.css';

const NavigationBar = () => {
  const [isDarkMode, setIsDarkMode] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  const [isDraggable, setIsDraggable] = createSignal(true);
  
  // Referencias para GoJS - usar let y asignar en el template
  let diagramDiv: HTMLDivElement | undefined;
  let myDiagram: go.Diagram | undefined;

  // Estados para el ejemplo
  const [nodeCount, setNodeCount] = createSignal(0);
  const [linkCount, setLinkCount] = createSignal(0);

  // Inicializar GoJS
  onMount(() => {
    // Verificar que diagramDiv existe antes de usarlo
    if (!diagramDiv) {
      console.error('diagramDiv no está definido');
      return;
    }

    const $ = go.GraphObject.make;
    
    // Crear el diagrama CORREGIDO
    myDiagram = $(go.Diagram, diagramDiv, {
      'undoManager.isEnabled': true,
      'allowDragOut': false,
      'allowDrop': true,
      'draggingTool.dragsLink': true,
      'linkingTool.isEnabled': true,  // ✅ CORREGIDO: 'isEnabled' en lugar de 'enabled'
      'layout': $(go.LayeredDigraphLayout, {
        direction: 90,
        layerSpacing: 100,
        columnSpacing: 50
      })
    });

    // Definir plantilla para nodos
    myDiagram.nodeTemplate = $(
      go.Node,
      'Auto',
      {
        locationSpot: go.Spot.Center,
        selectionAdorned: true
      },
      
      // Fondo del nodo
      $(go.Shape, 
        'RoundedRectangle', 
        { 
          fill: '#ffffff',
          stroke: '#0d6efd',
          strokeWidth: 2
        },
        new go.Binding('fill', 'color'),
        new go.Binding('stroke', 'isSelected', (sel) => sel ? '#ffc107' : '#0d6efd')
      ),
      
      // Contenido del nodo
      $(go.TextBlock,
        {
          margin: 12,
          font: 'bold 14px Arial, sans-serif',
          textAlign: 'center',
          stroke: '#333333'
        },
        new go.Binding('text', 'key')
      )
    );

    // Definir plantilla para conexiones
    myDiagram.linkTemplate = $(
      go.Link,
      {
        routing: go.Link.Orthogonal,
        corner: 5,
        selectionAdorned: true
      },
      $(go.Shape,
        { stroke: '#666666', strokeWidth: 2 }
      ),
      $(go.Shape,
        { toArrow: 'Standard', stroke: '#666666', fill: '#666666' }
      ),
      $(go.TextBlock,
        {
          segmentOffset: new go.Point(0, -10),
          font: '12px Arial',
          stroke: '#333333'
        },
        new go.Binding('text', 'text')
      )
    );

    // Cargar datos de ejemplo
    loadSampleData();
  });

  // Cargar datos de ejemplo
  const loadSampleData = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }

    const model = new go.GraphLinksModel();
    
    // Datos de nodos de ejemplo
    model.nodeDataArray = [
      { key: 'Usuario', color: '#e3f2fd', location: new go.Point(100, 100) },
      { key: 'Perfil', color: '#f3e5f5', location: new go.Point(300, 200) },
      { key: 'Configuración', color: '#e8f5e8', location: new go.Point(500, 100) },
      { key: 'Roles', color: '#fff3e0', location: new go.Point(200, 300) },
      { key: 'Permisos', color: '#fbe9e7', location: new go.Point(400, 300) }
    ];

    // Datos de conexiones de ejemplo
    model.linkDataArray = [
      { from: 'Usuario', to: 'Perfil', text: 'tiene' },
      { from: 'Perfil', to: 'Configuración', text: 'configura' },
      { from: 'Perfil', to: 'Roles', text: 'asigna' },
      { from: 'Roles', to: 'Permisos', text: 'otorga' }
    ];

    myDiagram.model = model;
    
    // Actualizar contadores
    setNodeCount(model.nodeDataArray.length);
    setLinkCount(model.linkDataArray.length);

    console.log('✅ GoJS cargado correctamente con', model.nodeDataArray.length, 'nodos y', model.linkDataArray.length, 'conexiones');
  };

  // Agregar nodo aleatorio
  const addRandomNode = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }

    const model = myDiagram.model as go.GraphLinksModel;
    const nodes = ['Cliente', 'Producto', 'Pedido', 'Factura', 'Categoría', 'Inventario'];
    const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e8', '#fff3e0', '#fbe9e7', '#e0f2f1'];
    
    const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newNode = {
      key: `${randomNode} ${nodeCount() + 1}`,
      color: randomColor,
      location: new go.Point(
        Math.random() * 400 + 100,
        Math.random() * 300 + 100
      )
    };

    model.addNodeData(newNode);
    setNodeCount(nodeCount() + 1);
    console.log('➕ Nodo agregado:', newNode.key);
  };

  // Organizar automáticamente
  const organizeDiagram = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }
    
    myDiagram.layoutDiagram(true);
    console.log('🔧 Diagrama organizado automáticamente');
  };

  // Limpiar diagrama
  const clearDiagram = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }

    const model = myDiagram.model as go.GraphLinksModel;
    model.clear();
    
    setNodeCount(0);
    setLinkCount(0);
    console.log('🗑️ Diagrama limpiado');
  };

  // Zoom in
  const handleZoomIn = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }
    myDiagram.scale += 0.1;
    console.log('🔍 Zoom in:', myDiagram.scale.toFixed(2));
  };

  // Zoom out
  const handleZoomOut = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }
    myDiagram.scale = Math.max(0.1, myDiagram.scale - 0.1);
    console.log('🔍 Zoom out:', myDiagram.scale.toFixed(2));
  };

  // Centrar vista
  const handleCenterView = () => {
    if (!myDiagram) {
      console.error('myDiagram no está inicializado');
      return;
    }
    myDiagram.zoomToFit();
    console.log('🎯 Vista centrada');
  };

  // Limpiar al desmontar
  onCleanup(() => {
    if (myDiagram) {
      myDiagram.div = null;
      console.log('🧹 Diagrama limpiado correctamente');
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

  const toggleDragMode = () => {
    const newMode = !isDraggable();
    setIsDraggable(newMode);
    
    if (myDiagram) {
      myDiagram.allowSelect = newMode;
      myDiagram.allowMove = newMode;
    }
    console.log('🖱️ Modo arrastrable:', newMode);
  };

  return (
    <div class={`navigation-container ${isDarkMode() ? 'dark-mode' : ''}`}>
      <div class="navigation-bar">
        
        {/* Sección: Acciones Básicas */}
        <div class="nav-section">
          <button class="btn btn-primary btn-medium" onClick={loadSampleData}>
            <i class="bi bi-cloud-download"></i>
            Cargar Ejemplo
          </button>
        </div>

        {/* Sección: Manipular Nodos */}
        <div class="nav-section">
          <button class="btn btn-success btn-medium" onClick={addRandomNode}>
            <i class="bi bi-plus-circle"></i>
            Agregar Nodo
          </button>
        </div>

        {/* Sección: Búsqueda */}
        <div class="nav-section search-section">
          <div class="search-box">
            <div class="search-container">
              <input
                type="text"
                class="search-input"
                placeholder="Buscar nodos..."
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
          <h4><i class="bi bi-diagram-3"></i> Diagrama GoJS - Demo Funcional</h4>
          <p>Ejemplo básico de GoJS funcionando con SolidJS. Puedes arrastrar nodos, hacer zoom y agregar nuevos elementos.</p>
          <div class="stats">
            <div class="stat">
              <i class="bi bi-circle"></i>
              <span>{nodeCount()} Nodos</span>
            </div>
            <div class="stat">
              <i class="bi bi-link-45deg"></i>
              <span>{linkCount()} Conexiones</span>
            </div>
            <div class="stat">
              <i class="bi bi-arrows-move"></i>
              <span>Arrastrable</span>
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
              <button class="btn btn-outline btn-small" onClick={addRandomNode}>
                <i class="bi bi-plus"></i> Nuevo Nodo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor del Diagrama GoJS */}
      <div 
        ref={diagramDiv}
        class="flow-container"
        style={{
          'height': '500px',
          'background': isDarkMode() ? '#1e1e1e' : '#f8f9fa',
          'border': `1px solid ${isDarkMode() ? '#444' : '#ddd'}`,
        }}
      />
      
    </div>
  );
};

export default NavigationBar;