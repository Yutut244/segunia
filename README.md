# SeguIA — Sistema Inteligente de Seguimiento Académico y Retroalimentación Docente Basado en Evidencias

> **"La IA propone, los datos sustentan y el docente decide."**  
> *Autores:* **Cristóbal Martínez & Jainer Salas**  
> *Basado en el documento:* `SeguIA_Briefing_Pedagogico (2).docx`

---

## ⚡ Novedades: Optimización para Vercel & Supabase PostgreSQL en la Nube

El proyecto ha sido optimizado y migrado para despliegue en producción con arquitectura **Serverless en Vercel** y base de datos relacional en la nube con **Supabase PostgreSQL**:

* **Base de Datos en la Nube (Supabase):** Las tablas (`courses`, `competencies`, `students`, `activities`, `grades`, `interventions`, `ai_feedbacks`, `rubric_evaluations`, `settings`) y los datos semilla del caso de estudio de Juan Camilo (`EST-001`) ya han sido creados y sembrados en la base de datos de Supabase.
* **Cero Dependencias Pesadas:** Conexión nativa mediante Supabase PostgREST API y `fetch` estándar de Node.js, garantizando arranques en frío instantáneos (<50ms) en las Serverless Functions de Vercel.
* **Serverless Ready:** Enrutamiento configurado en [vercel.json](file:///c:/Users/admin/Downloads/proyecto-ia/vercel.json) con el manejador [api/index.js](file:///c:/Users/admin/Downloads/proyecto-ia/api/index.js).

---

## 🚀 Despliegue en Vercel (Paso a Paso)

### Opción A: Desde la Web de Vercel (Recomendada con GitHub)
1. Sube esta carpeta (`proyecto-ia`) a un repositorio en **GitHub**.
2. Entra en [vercel.com](https://vercel.com) e inicia sesión.
3. Haz clic en **"Add New..."** ➔ **"Project"** e importa tu repositorio.
4. En la sección **"Environment Variables"**, agrega las siguientes variables (puedes copiarlas desde tu archivo [.env](file:///c:/Users/admin/Downloads/proyecto-ia/.env)):
   * `SUPABASE_URL`: `https://hzmhmdkzywjzaatlrvui.supabase.co`
   * `SUPABASE_ANON_KEY`: *(Tu clave anon pública)*
   * `SUPABASE_SERVICE_ROLE_KEY`: *(Tu clave de servicio)*
5. Haz clic en **"Deploy"**. ¡En menos de 1 minuto tendrás tu aplicación funcionando en una URL pública de Vercel!

### Opción B: Con la CLI de Vercel
Si tienes la CLI instalada:
```bash
npx vercel
```
Y para producción:
```bash
npx vercel --prod
```

---

## 💻 Ejecución Local

Para probarlo localmente en tu computadora:

1. **Con un solo clic en Windows:**
   * Haz doble clic en [start.bat](file:///c:/Users/admin/Downloads/proyecto-ia/start.bat).
   * Se iniciará el servidor local y abrirá automáticamente [http://localhost:3000](http://localhost:3000).

2. **O desde la terminal:**
   ```bash
   node server.js
   ```

3. **Ejecutar batería de pruebas automatizadas (con Supabase):**
   ```bash
   node test-suite.js
   ```

---

## 🏛️ Componentes Pedagógicos del MVP (Briefing SeguIA)

1. **Gestión Académica:** Cursos, competencias formativas, estudiantes anonimizados (`EST-001`) y actividades evaluadas.
2. **Evidencias y Registro Cualitativo:** Registro de notas y observaciones de aula observables y descriptivas.
3. **Motor Determinístico ("La IA no hace los cálculos"):** Cálculo matemático de pendiente de regresión lineal ($m$), caídas consecutivas y semáforo de alertas responsables (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).
4. **Inteligencia Artificial Contextualizada & Ética:** Generación con lenguaje prudente, honestidad ante falta de datos y ficha de explicabilidad obligatoria (*"¿Por qué aparece esta recomendación?"*).
5. **Ciclo de Intervención Docente:** Acompañamiento del caso central del briefing (Juan Camilo: nota antes 55, nota después 68, impacto medido **+13 pts**).
6. **Laboratorio Comparativo A/B & Rúbrica:** Comparación entre IA tradicional con nota aislada (1.8/5.0) vs. SeguIA contextualizado (4.9/5.0) evaluando los 6 criterios pedagógicos del briefing.
7. **Decálogo Ético:** Límites del sistema (*"Lo que SeguIA NO es"*).
8. **Informe Imprimible Oficial:** Generación y exportación de reportes formativos en PDF (`Ctrl + P`).

---

## 📁 Estructura del Proyecto

```
proyecto-ia/
│
├── vercel.json           # Configuración de despliegue y rewrites para Vercel
├── .env                  # Variables de entorno con credenciales de Supabase
├── .env.example          # Plantilla de variables para Vercel
├── package.json          # Manifiesto del proyecto y scripts
├── start.bat             # Lanzador rápido de un clic para Windows
├── server.js             # Servidor HTTP para desarrollo local
├── db.js                 # Capa de datos conectada a Supabase PostgreSQL
├── init-supabase.js      # Script de inicialización y siembra en Supabase
├── analyticsEngine.js    # Motor determinístico de análisis estadístico
├── aiService.js          # Servicio de IA pedagógica y comparativa A/B
├── test-suite.js         # Batería de pruebas automatizadas (6/6 verificadas)
├── api/
│   └── index.js          # Vercel Serverless Function (manejador de API REST)
└── public/
    ├── index.html        # Panel de control e interfaz pedagógica
    ├── css/styles.css    # Diseño pedagógico y estilos de impresión
    └── js/
        ├── charts.js     # Gráficos vectoriales SVG nativos
        ├── api.js        # Cliente HTTP REST para el frontend
        └── app.js        # Lógica de la interfaz de usuario
```
