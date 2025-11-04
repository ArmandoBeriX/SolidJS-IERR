// src/routes/index.tsx
import { Title } from "@solidjs/meta";

export default function Home() {
  return (
    <main>
      <Title>Diagrama ER - SolidJS</Title>
      <div style={{ 
        "text-align": "center", 
        padding: "2rem",
        color: "#666"
      }}>
        <h2>Diagrama Entidad-Relación</h2>
        <p>La barra de navegación está funcionando correctamente.</p>
        <p>Usa los controles para interactuar con el diagrama.</p>
      </div>
    </main>
  );
}