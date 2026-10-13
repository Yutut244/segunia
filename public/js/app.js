// app.js - Lógica Principal de la Aplicación SeguIA
document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    courses: [],
    currentCourseId: null,
    currentCourse: null,
    students: [],
    currentStudentId: null,
    currentStudentData: null,
    competencies: [],
    activities: [],
    settings: {},
    lastGeneratedFeedbackId: null
  };

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================
  async function init() {
    setupEventListeners();
    await loadSettings();
    await loadCourses();
  }

  // ==========================================
  // CONFIGURACIÓN DE EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // Cambio de pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetTabId = tab.getAttribute('data-tab');
        switchTab(targetTabId);
      });
    });

    // Selector de Curso Principal
    const courseSelect = document.getElementById('courseSelect');
    courseSelect.addEventListener('change', async (e) => {
      state.currentCourseId = Number(e.target.value);
      await loadCourseData(state.currentCourseId);
    });

    // Filtros de búsqueda en el dashboard
    document.getElementById('studentSearchInput').addEventListener('input', renderStudentsTable);
    document.getElementById('filterAlertSelect').addEventListener('change', renderStudentsTable);

    // Selector de Estudiante en la pestaña Ficha Individual
    document.getElementById('studentSelectInTab').addEventListener('change', async (e) => {
      state.currentStudentId = Number(e.target.value);
      await loadStudentDetails(state.currentStudentId);
    });

    // Botones de Modales
    setupModalButtons();

    // Botón Generar IA en Ficha Individual
    document.getElementById('btnGenerateAI').addEventListener('click', handleGenerateAIFeedback);

    // Botón Comparativa A/B
    document.getElementById('btnRunABTest').addEventListener('click', handleRunABTest);

    // Botón Guardar Rúbrica
    document.getElementById('btnSubmitRubric').addEventListener('click', handleSubmitRubric);

    // Botón Guardar Configuración
    document.getElementById('btnSaveSettings').addEventListener('click', handleSaveSettings);

    // Botón Imprimir Informe
    document.getElementById('btnPrintReport').addEventListener('click', handleOpenPrintReport);

    // Redibujar gráficos si cambia el tamaño de ventana
    window.addEventListener('resize', () => {
      if (state.currentStudentData && document.getElementById('tab-student').classList.contains('active')) {
        renderStudentCharts(state.currentStudentData);
      }
    });
  }

  function switchTab(tabId) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.add('active');

    // Acciones al cambiar de pestaña
    if (tabId === 'tab-student' && state.currentStudentData) {
      setTimeout(() => renderStudentCharts(state.currentStudentData), 100);
    } else if (tabId === 'tab-cycle') {
      renderInterventionsTable();
    }
  }

  // ==========================================
  // CARGA DE DATOS PRINCIPALES
  // ==========================================
  async function loadSettings() {
    try {
      const res = await API.getSettings();
      state.settings = res.settings || {};
      
      // Llenar campos de configuración en UI
      document.getElementById('cfg_consecutive_drops').value = state.settings.consecutive_drops_threshold || 3;
      document.getElementById('cfg_drop_delta').value = state.settings.drop_delta_threshold || 10;
      document.getElementById('cfg_priority_slope').value = state.settings.priority_alert_slope || -1.5;
      document.getElementById('cfg_competency_gap').value = state.settings.competency_gap_threshold || 12;
      document.getElementById('cfg_gemini_api_key').value = state.settings.gemini_api_key || '';
      document.getElementById('cfg_gemini_model').value = state.settings.gemini_model || 'gemini-2.5-flash';
      document.getElementById('cfg_anonymize').checked = state.settings.anonymize_ai !== false;

      updatePrivacyBadge();
    } catch (err) {
      console.error('Error cargando configuraciones:', err);
    }
  }

  function updatePrivacyBadge() {
    const badge = document.getElementById('privacyIndicator');
    if (state.settings.anonymize_ai !== false) {
      badge.textContent = '🔒 Modo Anonimizado Activo';
      badge.style.display = 'inline-flex';
    } else {
      badge.textContent = '🔓 Nombres Visibles en IA';
      badge.style.background = 'rgba(239, 68, 68, 0.2)';
      badge.style.borderColor = '#ef4444';
      badge.style.color = '#fca5a5';
    }
  }

  async function loadCourses() {
    try {
      const res = await API.getCourses();
      state.courses = res.courses || [];
      const select = document.getElementById('courseSelect');
      select.innerHTML = '';

      state.courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.code} - ${c.name}`;
        select.appendChild(opt);
      });

      if (state.courses.length > 0) {
        state.currentCourseId = state.courses[0].id;
        await loadCourseData(state.currentCourseId);
      }
    } catch (err) {
      console.error('Error cargando cursos:', err);
      alert('Error al conectar con la base de datos de SeguIA.');
    }
  }

  async function loadCourseData(courseId) {
    try {
      // 1. Datos del curso, competencias y actividades
      const courseRes = await API.getCourse(courseId);
      state.currentCourse = courseRes.course;
      state.competencies = courseRes.competencies || [];
      state.activities = courseRes.activities || [];

      // 2. Estudiantes y analítica calculada
      const studentsRes = await API.getCourseStudents(courseId);
      state.students = studentsRes.students || [];

      // Renderizar métricas del curso
      renderCourseOverview(studentsRes.courseOverview);

      // Renderizar tabla del panel
      renderStudentsTable();

      // Actualizar selectores en modales y pestañas
      populateStudentSelects();
      populateActivityAndCompetencySelects();

      // Cargar primer estudiante por defecto
      if (state.students.length > 0) {
        state.currentStudentId = state.students[0].id;
        await loadStudentDetails(state.currentStudentId);
      }
    } catch (err) {
      console.error('Error cargando datos del curso:', err);
    }
  }

  // ==========================================
  // RENDERIZADO: PANEL DEL CURSO
  // ==========================================
  function renderCourseOverview(overview) {
    if (!overview) return;
    document.getElementById('courseAvgDisplay').textContent = `${overview.courseAverage}/100`;
    document.getElementById('courseDescDisplay').textContent = `${overview.evaluatedStudents} de ${overview.totalStudents} estudiantes evaluados`;
    document.getElementById('priorityCountDisplay').textContent = overview.alertCounts.priority || 0;
    document.getElementById('recommendedCountDisplay').textContent = overview.alertCounts.recommended || 0;
    document.getElementById('regularCountDisplay').textContent = overview.alertCounts.regular || 0;
  }

  function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    const searchTerm = document.getElementById('studentSearchInput').value.toLowerCase().trim();
    const alertFilter = document.getElementById('filterAlertSelect').value;

    const filtered = state.students.filter(s => {
      const matchSearch = s.full_name.toLowerCase().includes(searchTerm) || s.student_code.toLowerCase().includes(searchTerm);
      const matchAlert = (alertFilter === 'all') || (s.alertLevel === alertFilter);
      return matchSearch && matchAlert;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#94a3b8;">No se encontraron estudiantes con los filtros aplicados.</td></tr>`;
      return;
    }

    filtered.forEach(s => {
      const tr = document.createElement('tr');

      // Badge de alerta
      let alertBadgeHTML = '';
      if (s.alertLevel === 'priority') {
        alertBadgeHTML = `<span class="badge badge-priority">🔴 Atención prioritaria</span>`;
      } else if (s.alertLevel === 'recommended') {
        alertBadgeHTML = `<span class="badge badge-recommended">🟡 Revisión recomendada</span>`;
      } else {
        alertBadgeHTML = `<span class="badge badge-regular">🟢 Seguimiento regular</span>`;
      }

      // Tendencia
      let trendHTML = '<span>--</span>';
      if (s.trend) {
        if (s.trend.slope > 0.5) {
          trendHTML = `<span style="color:#10b981; font-weight:600;">↗ Ascenso (+${s.trend.slope})</span>`;
        } else if (s.trend.slope < -0.8) {
          trendHTML = `<span style="color:#ef4444; font-weight:600;">↘ Descenso (${s.trend.slope})</span>`;
        } else {
          trendHTML = `<span style="color:#64748b;">→ Estable (${s.trend.slope})</span>`;
        }
      }

      tr.innerHTML = `
        <td><strong style="color:var(--primary);">${s.student_code}</strong></td>
        <td><strong>${s.full_name}</strong></td>
        <td>${s.gradesCount} act.</td>
        <td><strong style="font-size:1.05rem;">${s.average > 0 ? `${s.average}/100` : '--'}</strong></td>
        <td>${trendHTML}</td>
        <td>${alertBadgeHTML}</td>
        <td>${s.interventionsCount > 0 ? `<span class="badge" style="background:#e0f2fe; color:#0369a1;">${s.interventionsCount} reg.</span>` : '<span style="color:#94a3b8;">0</span>'}</td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-outline btn-view-student" data-id="${s.id}">Ver Ficha</button>
          <button class="btn btn-sm btn-primary btn-grade-student" data-id="${s.id}">Calificar</button>
        </td>
      `;

      // Eventos de botones en la fila
      tr.querySelector('.btn-view-student').addEventListener('click', async () => {
        state.currentStudentId = s.id;
        document.getElementById('studentSelectInTab').value = s.id;
        await loadStudentDetails(s.id);
        switchTab('tab-student');
      });

      tr.querySelector('.btn-grade-student').addEventListener('click', () => {
        state.currentStudentId = s.id;
        document.getElementById('gradeStudentSelect').value = s.id;
        openModal('modalGrade');
      });

      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // RENDERIZADO: FICHA INDIVIDUAL DEL ESTUDIANTE
  // ==========================================
  async function loadStudentDetails(studentId) {
    try {
      const res = await API.getStudent(studentId);
      state.currentStudentData = res;

      const student = res.student;
      const analytics = res.analytics;

      // Encabezado
      document.getElementById('shStudentName').textContent = student.full_name;
      document.getElementById('shStudentCodeBadge').textContent = student.student_code;
      document.getElementById('shStudentCourse').textContent = `${res.course.code} — ${res.course.name}`;
      document.getElementById('shStudentAvg').textContent = analytics.studentAverage ? `${analytics.studentAverage}/100` : '--';

      // Semáforo de alerta
      const alertContainer = document.getElementById('shAlertContainer');
      let badgeClass = 'badge-regular';
      if (analytics.alertLevel === 'priority') badgeClass = 'badge-priority';
      else if (analytics.alertLevel === 'recommended') badgeClass = 'badge-recommended';

      alertContainer.innerHTML = `
        <span class="badge ${badgeClass}" style="font-size:0.95rem; padding:0.4rem 1rem;">
          ${analytics.alertBadge}
        </span>
      `;

      // Línea de color en la tarjeta
      const headerCard = document.getElementById('studentHeaderCard');
      if (analytics.alertLevel === 'priority') headerCard.style.borderLeftColor = '#ef4444';
      else if (analytics.alertLevel === 'recommended') headerCard.style.borderLeftColor = '#f59e0b';
      else headerCard.style.borderLeftColor = '#10b981';

      // Gráficos
      renderStudentCharts(res);

      // Historial de calificaciones
      renderStudentGradesTable(res.grades);

      // Renderizar última retroalimentación de IA existente
      renderAIFeedbackOutput(res.feedbacks && res.feedbacks.length > 0 ? res.feedbacks[0] : null);

    } catch (err) {
      console.error('Error cargando ficha del estudiante:', err);
    }
  }

  function renderStudentCharts(studentData) {
    const grades = studentData.grades || [];
    const analytics = studentData.analytics || {};

    // Detalle de tendencia
    const trendBadge = document.getElementById('trendBadgeDetail');
    if (analytics.trend) {
      trendBadge.textContent = analytics.trend.label || '';
    }

    // Gráfico de línea con regresión
    SeguIACharts.renderTrendChart('trendChartContainer', grades, analytics.trend, studentData.course?.passing_grade || 60);

    // Gráfico de barras de competencias
    SeguIACharts.renderCompetenciesBarChart('competenciesChartContainer', analytics.competenciesSummary, analytics.studentAverage);
  }

  function renderStudentGradesTable(grades) {
    const tbody = document.getElementById('studentGradesTableBody');
    tbody.innerHTML = '';

    if (!grades || grades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#94a3b8;">Sin evaluaciones registradas aún para este estudiante.</td></tr>`;
      return;
    }

    grades.forEach(g => {
      const tr = document.createElement('tr');
      const isLow = g.score < 60;
      tr.innerHTML = `
        <td><small style="color:var(--text-muted); font-weight:600;">${g.activity_date}</small></td>
        <td><strong>${g.activity_title}</strong></td>
        <td><span class="badge" style="background:#f1f5f9; color:#334155;">${g.competency_name || 'General'}</span></td>
        <td>${g.evidence_type || 'Documento'}</td>
        <td><strong style="color:${isLow ? '#dc2626' : '#2563eb'}; font-size:1.05rem;">${g.score}/100</strong></td>
        <td style="color:#334155; font-size:0.88rem;">${g.observation ? `<em>"${g.observation}"</em>` : '<span style="color:#94a3b8;">Sin observación cualitativa</span>'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // COMPONENTE DE INTELIGENCIA ARTIFICIAL
  // ==========================================
  async function handleGenerateAIFeedback() {
    if (!state.currentStudentId) return;

    const btn = document.getElementById('btnGenerateAI');
    const container = document.getElementById('aiOutputContainer');
    btn.disabled = true;
    btn.textContent = 'Analizando con IA...';

    container.innerHTML = `
      <div style="text-align:center; padding:2rem;">
        <div style="font-size:1.1rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">⚙️ SeguIA está procesando los indicadores...</div>
        <p style="font-size:0.85rem; color:var(--text-muted);">Calculando correlaciones, auditando observaciones cualitativas y redactando la síntesis prudente.</p>
      </div>
    `;

    try {
      const res = await API.generateAIFeedback(state.currentStudentId);
      state.lastGeneratedFeedbackId = res.feedbackId;
      renderAIFeedbackOutput(res.feedback, res.feedbackId);
      // Recargar ficha para refrescar historial
      await loadStudentDetails(state.currentStudentId);
    } catch (err) {
      console.error('Error generando retroalimentación con IA:', err);
      container.innerHTML = `<div style="padding:1.5rem; background:#fee2e2; color:#991b1b; border-radius:8px;"><strong>Error:</strong> ${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generar Retroalimentación';
    }
  }

  function renderAIFeedbackOutput(feedback, feedbackId = null) {
    const container = document.getElementById('aiOutputContainer');
    if (!feedback) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem; color:#64748b;">
          <p style="font-size:1rem; font-weight:600;">Presiona "Generar Retroalimentación" para formular el acompañamiento pedagógico.</p>
        </div>
      `;
      return;
    }

    if (feedbackId) state.lastGeneratedFeedbackId = feedbackId;
    else if (feedback.id) state.lastGeneratedFeedbackId = feedback.id;

    container.innerHTML = `
      <div class="ai-feedback-box">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
          <span class="ai-header-badge">
            🤖 Modelo: ${feedback.modelUsed || feedback.model_used || 'SeguIA Engine'}
          </span>
          <span style="font-size:0.8rem; color:var(--text-muted);">
            Fecha: ${feedback.generated_at ? new Date(feedback.generated_at).toLocaleString() : 'Reciente'}
          </span>
        </div>

        <!-- 1. Resumen de Progreso -->
        <div class="ai-section">
          <div class="ai-section-title">📊 Resumen de Progreso y Trayectoria</div>
          <div class="ai-section-content">${feedback.summary}</div>
        </div>

        <!-- 2. Interpretación Pedagógica -->
        <div class="ai-section">
          <div class="ai-section-title">🔍 Interpretación Pedagógica (Lenguaje Prudente, No Diagnóstico)</div>
          <div class="ai-section-content">${feedback.pedagogicalInterpretation || feedback.pedagogical_interpretation}</div>
        </div>

        <!-- 3. Recomendación de Intervención Docente -->
        <div class="ai-section">
          <div class="ai-section-title">🎯 Recomendación para la Acción y Decisión Docente</div>
          <div class="ai-section-content" style="background:#eff6ff; padding:0.85rem; border-radius:8px; border-left:4px solid #3b82f6;">
            ${feedback.recommendation}
          </div>
        </div>

        <!-- 4. Ficha de Explicabilidad Obligatoria -->
        <div class="explicability-card">
          <div class="explicability-title">
            🛡️ Auditoría de Explicabilidad: ¿Por qué aparece esta recomendación?
          </div>
          <div>${feedback.explicability}</div>
        </div>

        <!-- Acciones sobre la retroalimentación -->
        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.75rem; flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" id="btnGoToRubricFromAI">
            ⭐ Evaluar con Rúbrica Pedagógica
          </button>
          <button class="btn btn-sm btn-accent" id="btnCreateInterventionFromAI">
            🛠️ Convertir en Intervención Docente
          </button>
        </div>
      </div>
    `;

    // Eventos de los botones internos
    document.getElementById('btnGoToRubricFromAI')?.addEventListener('click', () => {
      switchTab('tab-ab');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    document.getElementById('btnCreateInterventionFromAI')?.addEventListener('click', () => {
      document.getElementById('intStudentSelect').value = state.currentStudentId;
      document.getElementById('intSituationInput').value = feedback.summary.slice(0, 100);
      document.getElementById('intAiSummaryInput').value = feedback.recommendation;
      openModal('modalIntervention');
    });
  }

  // ==========================================
  // CICLO DE INTERVENCIÓN DOCENTE
  // ==========================================
  async function renderInterventionsTable() {
    const tbody = document.getElementById('interventionsTableBody');
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:1.5rem;">Cargando ciclo de intervenciones...</td></tr>';

    try {
      // Obtener todas las intervenciones del curso a través de los estudiantes
      const res = await API.getCourseStudents(state.currentCourseId);
      const studentIds = res.students.map(s => s.id);

      // Traer detalle del estudiante actual o del primero
      const studentRes = await API.getStudent(state.currentStudentId || studentIds[0]);
      const interventions = studentRes.interventions || [];

      tbody.innerHTML = '';

      if (interventions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:#94a3b8;">No hay intervenciones registradas en el ciclo para este estudiante. Puedes crear una con el botón "+ Registrar Nueva Intervención".</td></tr>`;
        return;
      }

      interventions.forEach(int => {
        const tr = document.createElement('tr');
        
        let deltaHTML = '<span style="color:#94a3b8;">Pendiente eval.</span>';
        if (int.score_before !== null && int.score_after !== null) {
          const delta = int.score_after - int.score_before;
          if (delta > 0) {
            deltaHTML = `<strong style="color:#10b981;">+${delta} pts (Mejora)</strong>`;
          } else if (delta < 0) {
            deltaHTML = `<strong style="color:#ef4444;">${delta} pts</strong>`;
          } else {
            deltaHTML = `<strong style="color:#64748b;">0 pts (Sin cambio)</strong>`;
          }
        }

        const isComplete = int.score_after !== null;

        tr.innerHTML = `
          <td><strong>${studentRes.student.student_code}</strong></td>
          <td><small style="color:var(--text-muted);">${int.date_recorded}</small></td>
          <td><span style="font-size:0.85rem;">${int.situation_detected}</span></td>
          <td><strong>${int.teacher_decision}</strong></td>
          <td><span class="badge" style="background:#eff6ff; color:#1e40af;">${int.intervention_type}</span></td>
          <td><strong style="color:#dc2626;">${int.score_before !== null ? `${int.score_before}/100` : '--'}</strong></td>
          <td><strong style="color:#10b981;">${int.score_after !== null ? `${int.score_after}/100` : '--'}</strong></td>
          <td>${deltaHTML}</td>
          <td><span class="badge ${int.status === 'Superada con éxito' ? 'badge-regular' : 'badge-recommended'}">${int.status}</span></td>
          <td>
            ${!isComplete ? `<button class="btn btn-sm btn-primary btn-eval-int" data-id="${int.id}">🎯 Evaluar Post</button>` : `<span style="color:#10b981; font-weight:700;">✓ Cerrada</span>`}
          </td>
        `;

        tr.querySelector('.btn-eval-int')?.addEventListener('click', () => {
          document.getElementById('evalIntId').value = int.id;
          document.getElementById('evalIntDesc').textContent = `Intervención: "${int.teacher_decision}" (Nota antes: ${int.score_before}/100)`;
          openModal('modalEvaluateIntervention');
        });

        tbody.appendChild(tr);
      });

    } catch (err) {
      console.error('Error renderizando intervenciones:', err);
      tbody.innerHTML = `<tr><td colspan="10" style="color:red; text-align:center;">Error cargando intervenciones.</td></tr>`;
    }
  }

  // ==========================================
  // LABORATORIO COMPARATIVO A/B
  // ==========================================
  async function handleRunABTest() {
    const studentId = Number(document.getElementById('abStudentSelect').value) || state.currentStudentId;
    if (!studentId) return;

    const btn = document.getElementById('btnRunABTest');
    btn.disabled = true;
    btn.textContent = 'Comparando escenarios...';

    try {
      const res = await API.runABComparison(studentId);
      const ab = res.abComparison;

      const container = document.getElementById('abResultsContainer');
      container.innerHTML = `
        <!-- Escenario A -->
        <div class="scenario-card scenario-a">
          <span class="scenario-badge">${ab.scenarioA.scenario}</span>
          <div style="font-size:0.85rem; color:#7f1d1d; background:#fef2f2; padding:0.6rem; border-radius:6px; margin-bottom:0.75rem;">
            <strong>Prompt básico:</strong> ${ab.scenarioA.promptGivenToAI}
          </div>
          <div style="font-size:0.9rem; line-height:1.5; color:#334155; margin-bottom:1rem; flex:1;">
            <em>"${ab.scenarioA.feedbackGenerated}"</em>
          </div>
          <div style="background:#fee2e2; border-left:4px solid #ef4444; padding:0.65rem; border-radius:4px; font-size:0.8rem; color:#991b1b;">
            ${ab.scenarioA.analysisPedagogico}
          </div>
          <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid #fee2e2; font-size:0.85rem; font-weight:700; color:#b91c1c;">
            Calificación en Rúbrica: ⭐ ${ab.scenarioA.rubricPreview.totalPromedio} / 5.0
          </div>
        </div>

        <!-- Escenario B -->
        <div class="scenario-card scenario-b">
          <span class="scenario-badge">${ab.scenarioB.scenario}</span>
          <div style="font-size:0.85rem; color:#064e3b; background:#f0fdf4; padding:0.6rem; border-radius:6px; margin-bottom:0.75rem;">
            <strong>Prompt enriquecido:</strong> ${ab.scenarioB.promptGivenToAI}
          </div>
          <div style="font-size:0.9rem; line-height:1.5; color:#334155; margin-bottom:1rem; flex:1;">
            <p><strong>Síntesis:</strong> <em>"${ab.scenarioB.feedbackGenerated.summary}"</em></p>
            <p style="margin-top:0.35rem;"><strong>Interpretación:</strong> <em>"${ab.scenarioB.feedbackGenerated.pedagogicalInterpretation}"</em></p>
            <p style="margin-top:0.35rem;"><strong>Recomendación:</strong> <em>"${ab.scenarioB.feedbackGenerated.recommendation}"</em></p>
          </div>
          <div style="background:#dcfce7; border-left:4px solid #10b981; padding:0.65rem; border-radius:4px; font-size:0.8rem; color:#14532d;">
            ${ab.scenarioB.analysisPedagogico}
          </div>
          <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid #bbf7d0; font-size:0.85rem; font-weight:700; color:#15803d;">
            Calificación en Rúbrica: ⭐ ${ab.scenarioB.rubricPreview.totalPromedio} / 5.0
          </div>
        </div>
      `;

    } catch (err) {
      console.error('Error en prueba A/B:', err);
      alert('Error ejecutando la prueba A/B: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Ejecutar Comparativa A/B';
    }
  }

  // ==========================================
  // RÚBRICA DE EVALUACIÓN PEDAGÓGICA
  // ==========================================
  async function handleSubmitRubric() {
    const p = Number(document.getElementById('rubric_rel').value);
    const cl = Number(document.getElementById('rubric_cla').value);
    const co = Number(document.getElementById('rubric_coh').value);
    const u = Number(document.getElementById('rubric_uti').value);
    const s = Number(document.getElementById('rubric_sus').value);
    const l = Number(document.getElementById('rubric_len').value);
    const comments = document.getElementById('rubricComments').value;

    try {
      const res = await API.saveRubricEvaluation({
        feedback_id: state.lastGeneratedFeedbackId,
        student_id: state.currentStudentId,
        relevance_score: p,
        clarity_score: cl,
        coherence_score: co,
        pedagogical_utility_score: u,
        data_backing_score: s,
        appropriate_language_score: l,
        teacher_comments: comments
      });

      alert(`✅ Rúbrica guardada exitosamente.\nPuntuación pedagógica global: ${res.overallScore} / 5.0`);
    } catch (err) {
      alert('Error guardando la rúbrica: ' + err.message);
    }
  }

  // ==========================================
  // INFORME IMPRIMIBLE DEL ESTUDIANTE
  // ==========================================
  async function handleOpenPrintReport() {
    if (!state.currentStudentId) return;

    try {
      const res = await API.getStudentReport(state.currentStudentId);
      const rep = res.report;

      const container = document.getElementById('printableReportContainer');
      container.innerHTML = `
        <div style="padding:1rem; font-family:var(--font-sans);">
          <!-- Membrete -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1e3a8a; padding-bottom:1rem; margin-bottom:1.5rem;">
            <div>
              <h1 style="color:#1e3a8a; font-size:1.4rem; margin-bottom:0.25rem;">${rep.projectMeta.title}</h1>
              <div style="font-size:0.85rem; color:#64748b; font-style:italic;">"${rep.projectMeta.motto}"</div>
              <div style="font-size:0.8rem; color:#334155; margin-top:0.25rem;">Autores del Proyecto: <strong>${rep.projectMeta.authors}</strong></div>
            </div>
            <div style="text-align:right; font-size:0.85rem; color:#475569;">
              <strong>Fecha:</strong> ${rep.projectMeta.date}<br>
              <strong>Curso:</strong> ${rep.course.name} (${rep.course.code})<br>
              <strong>Docente:</strong> ${rep.course.teacher_name}
            </div>
          </div>

          <!-- Datos del Estudiante -->
          <div style="display:flex; justify-content:space-between; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; margin-bottom:1.5rem;">
            <div>
              <div style="font-size:0.8rem; color:#64748b; text-transform:uppercase;">Estudiante Evaluado</div>
              <div style="font-size:1.2rem; font-weight:800; color:#1e293b;">${rep.student.full_name} (${rep.student.student_code})</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.8rem; color:#64748b; text-transform:uppercase;">Promedio / Estado</div>
              <div style="font-size:1.2rem; font-weight:800; color:#1e293b;">${rep.analytics.studentAverage}/100 — <span style="font-size:0.9rem;">${rep.analytics.alertBadge}</span></div>
            </div>
          </div>

          <!-- Historial de Evaluaciones -->
          <h3 style="color:#1e3a8a; font-size:1.05rem; margin-bottom:0.5rem;">1. Historial de Evidencias y Calificaciones</h3>
          <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem; font-size:0.85rem;">
            <thead>
              <tr style="background:#f1f5f9; text-align:left;">
                <th style="padding:6px; border:1px solid #cbd5e1;">Fecha</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Actividad</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Competencia</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Nota</th>
                <th style="padding:6px; border:1px solid #cbd5e1;">Observación Cualitativa</th>
              </tr>
            </thead>
            <tbody>
              ${rep.grades.map(g => `
                <tr>
                  <td style="padding:6px; border:1px solid #cbd5e1;">${g.activity_date}</td>
                  <td style="padding:6px; border:1px solid #cbd5e1;">${g.activity_title}</td>
                  <td style="padding:6px; border:1px solid #cbd5e1;">${g.competency_name || 'General'}</td>
                  <td style="padding:6px; border:1px solid #cbd5e1; font-weight:700;">${g.score}/100</td>
                  <td style="padding:6px; border:1px solid #cbd5e1;">${g.observation || '--'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Retroalimentación Pedagógica -->
          <h3 style="color:#1e3a8a; font-size:1.05rem; margin-bottom:0.5rem;">2. Síntesis y Acompañamiento Pedagógico de IA</h3>
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:1rem; margin-bottom:1.5rem; font-size:0.88rem; line-height:1.6;">
            ${rep.lastFeedback ? `
              <p><strong>Resumen:</strong> ${rep.lastFeedback.summary}</p>
              <p style="margin-top:0.5rem;"><strong>Interpretación Formativa:</strong> ${rep.lastFeedback.pedagogical_interpretation}</p>
              <p style="margin-top:0.5rem;"><strong>Recomendación Docente:</strong> ${rep.lastFeedback.recommendation}</p>
              <div style="background:#fffbeb; border-left:3px solid #d97706; padding:0.5rem; margin-top:0.75rem; font-size:0.8rem; color:#92400e;">
                <strong>Auditoría de Explicabilidad:</strong><br>${rep.lastFeedback.explicability}
              </div>
            ` : '<p style="color:#94a3b8;">Sin retroalimentación generada aún.</p>'}
          </div>

          <!-- Intervención Realizada y Efecto -->
          <h3 style="color:#1e3a8a; font-size:1.05rem; margin-bottom:0.5rem;">3. Registro de Intervención Pedagógica y Medición de Impacto</h3>
          ${rep.interventions.length > 0 ? `
            <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem; font-size:0.85rem;">
              <thead>
                <tr style="background:#f1f5f9; text-align:left;">
                  <th style="padding:6px; border:1px solid #cbd5e1;">Estrategia Docente</th>
                  <th style="padding:6px; border:1px solid #cbd5e1;">Tipo</th>
                  <th style="padding:6px; border:1px solid #cbd5e1;">Nota Antes</th>
                  <th style="padding:6px; border:1px solid #cbd5e1;">Nota Después</th>
                  <th style="padding:6px; border:1px solid #cbd5e1;">Impacto</th>
                  <th style="padding:6px; border:1px solid #cbd5e1;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${rep.interventions.map(int => `
                  <tr>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${int.teacher_decision}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${int.intervention_type}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${int.score_before || '--'}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${int.score_after || '--'}</td>
                    <td style="padding:6px; border:1px solid #cbd5e1; font-weight:700; color:#10b981;">
                      ${int.score_after && int.score_before ? `+${int.score_after - int.score_before} pts` : 'Pendiente'}
                    </td>
                    <td style="padding:6px; border:1px solid #cbd5e1;">${int.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="font-size:0.85rem; color:#94a3b8;">Sin intervenciones registradas.</p>'}

          <!-- Firmas -->
          <div style="display:flex; justify-content:space-between; margin-top:3rem; padding-top:1.5rem; border-top:1px dashed #cbd5e1; font-size:0.85rem; text-align:center;">
            <div>
              <div style="border-bottom:1px solid #334155; width:220px; margin-bottom:0.25rem;"></div>
              Firma del Docente Responsable
            </div>
            <div>
              <div style="border-bottom:1px solid #334155; width:220px; margin-bottom:0.25rem;"></div>
              Coordinación Académica
            </div>
          </div>
        </div>
      `;

      openModal('modalPrintReport');
    } catch (err) {
      alert('Error generando el informe: ' + err.message);
    }
  }

  // ==========================================
  // CONFIGURACIONES Y MODALES
  // ==========================================
  async function handleSaveSettings() {
    const newSettings = {
      consecutive_drops_threshold: Number(document.getElementById('cfg_consecutive_drops').value),
      drop_delta_threshold: Number(document.getElementById('cfg_drop_delta').value),
      priority_alert_slope: Number(document.getElementById('cfg_priority_slope').value),
      competency_gap_threshold: Number(document.getElementById('cfg_competency_gap').value),
      gemini_api_key: document.getElementById('cfg_gemini_api_key').value.trim(),
      gemini_model: document.getElementById('cfg_gemini_model').value,
      anonymize_ai: document.getElementById('cfg_anonymize').checked
    };

    try {
      await API.saveSettings(newSettings);
      state.settings = newSettings;
      updatePrivacyBadge();
      alert('✅ Configuraciones y umbrales actualizados.');
      await loadCourseData(state.currentCourseId);
    } catch (err) {
      alert('Error guardando configuraciones: ' + err.message);
    }
  }

  function setupModalButtons() {
    // Abrir modal de calificar
    document.getElementById('btnRecordGrade')?.addEventListener('click', () => {
      document.getElementById('gradeStudentSelect').value = state.currentStudentId;
      openModal('modalGrade');
    });

    // Abrir modal de nueva intervención
    document.getElementById('btnNewInterventionForStudent')?.addEventListener('click', () => {
      document.getElementById('intStudentSelect').value = state.currentStudentId;
      openModal('modalIntervention');
    });

    document.getElementById('btnOpenNewInterventionModal')?.addEventListener('click', () => {
      document.getElementById('intStudentSelect').value = state.currentStudentId;
      openModal('modalIntervention');
    });

    // Abrir modal de nuevo estudiante
    document.getElementById('btnNewStudent')?.addEventListener('click', () => {
      openModal('modalNewStudent');
    });

    // Abrir modal de nueva actividad
    document.getElementById('btnNewActivity')?.addEventListener('click', () => {
      openModal('modalNewActivity');
    });

    // Cerrar modales con botón data-close
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        closeModal(modalId);
      });
    });

    // Enviar Calificación
    document.getElementById('btnSaveGradeSubmit')?.addEventListener('click', async () => {
      const studentId = Number(document.getElementById('gradeStudentSelect').value);
      const activityId = Number(document.getElementById('gradeActivitySelect').value);
      const score = Number(document.getElementById('gradeScoreInput').value);
      const evidenceType = document.getElementById('gradeEvidenceType').value;
      const observation = document.getElementById('gradeObservationInput').value.trim();

      if (isNaN(score) || score < 0 || score > 100) {
        return alert('Por favor ingresa una calificación válida entre 0 y 100.');
      }

      try {
        await API.saveGrade({
          student_id: studentId,
          activity_id: activityId,
          score,
          evidence_type: evidenceType,
          observation
        });
        closeModal('modalGrade');
        alert('✅ Calificación y evidencia registradas.');
        await loadCourseData(state.currentCourseId);
        if (state.currentStudentId === studentId) {
          await loadStudentDetails(studentId);
        }
      } catch (err) {
        alert('Error al guardar calificación: ' + err.message);
      }
    });

    // Enviar Intervención
    document.getElementById('btnSaveInterventionSubmit')?.addEventListener('click', async () => {
      const studentId = Number(document.getElementById('intStudentSelect').value);
      const situation = document.getElementById('intSituationInput').value.trim();
      const aiSummary = document.getElementById('intAiSummaryInput').value.trim();
      const decision = document.getElementById('intTeacherDecisionInput').value.trim();
      const intType = document.getElementById('intTypeSelect').value;
      const scoreBefore = Number(document.getElementById('intScoreBeforeInput').value) || null;

      if (!situation || !decision) {
        return alert('Por favor describe la situación detectada y la decisión pedagógica tomada.');
      }

      try {
        await API.createIntervention({
          student_id: studentId,
          course_id: state.currentCourseId,
          situation_detected: situation,
          ai_recommendation_summary: aiSummary,
          teacher_decision: decision,
          intervention_type: intType,
          score_before: scoreBefore
        });
        closeModal('modalIntervention');
        alert('✅ Decisión pedagógica registrada exitosamente en el ciclo.');
        await loadStudentDetails(studentId);
        switchTab('tab-cycle');
        renderInterventionsTable();
      } catch (err) {
        alert('Error registrando intervención: ' + err.message);
      }
    });

    // Evaluar Post-Intervención
    document.getElementById('btnSaveEvalInterventionSubmit')?.addEventListener('click', async () => {
      const intId = Number(document.getElementById('evalIntId').value);
      const scoreAfter = Number(document.getElementById('evalScoreAfterInput').value);
      const status = document.getElementById('evalStatusSelect').value;
      const notes = document.getElementById('evalNotesInput').value.trim();

      if (isNaN(scoreAfter) || scoreAfter < 0 || scoreAfter > 100) {
        return alert('Ingresa una calificación válida post-intervención.');
      }

      try {
        await API.updateIntervention(intId, {
          score_after: scoreAfter,
          status,
          notes
        });
        closeModal('modalEvaluateIntervention');
        alert('✅ Impacto de la intervención guardado. El ciclo de acompañamiento se ha medido exitosamente.');
        renderInterventionsTable();
      } catch (err) {
        alert('Error evaluando intervención: ' + err.message);
      }
    });

    // Crear Estudiante
    document.getElementById('btnSaveStudentSubmit')?.addEventListener('click', async () => {
      const code = document.getElementById('stuCodeInput').value.trim();
      const name = document.getElementById('stuNameInput').value.trim();
      const notes = document.getElementById('stuNotesInput').value.trim();

      if (!code || !name) return alert('Código y nombre son obligatorios.');

      try {
        await API.createStudent({
          course_id: state.currentCourseId,
          student_code: code,
          full_name: name,
          notes
        });
        closeModal('modalNewStudent');
        alert('✅ Estudiante registrado.');
        await loadCourseData(state.currentCourseId);
      } catch (err) {
        alert('Error creando estudiante: ' + err.message);
      }
    });

    // Crear Actividad
    document.getElementById('btnSaveActivitySubmit')?.addEventListener('click', async () => {
      const title = document.getElementById('actTitleInput').value.trim();
      const compId = Number(document.getElementById('actCompSelect').value);
      const type = document.getElementById('actTypeSelect').value;
      const date = document.getElementById('actDateInput').value;

      if (!title || !compId) return alert('Título y competencia son requeridos.');

      try {
        await API.createActivity({
          course_id: state.currentCourseId,
          competency_id: compId,
          title,
          activity_type: type,
          activity_date: date || new Date().toISOString().slice(0, 10)
        });
        closeModal('modalNewActivity');
        alert('✅ Actividad creada.');
        await loadCourseData(state.currentCourseId);
      } catch (err) {
        alert('Error creando actividad: ' + err.message);
      }
    });
  }

  function populateStudentSelects() {
    const ids = ['studentSelectInTab', 'gradeStudentSelect', 'intStudentSelect', 'abStudentSelect'];
    ids.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = '';
      state.students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.student_code} — ${s.full_name} (${s.average > 0 ? `${s.average} pts` : 'Sin notas'})`;
        select.appendChild(opt);
      });
      if (state.currentStudentId) select.value = state.currentStudentId;
    });
  }

  function populateActivityAndCompetencySelects() {
    // Actividades para calificar
    const actSelect = document.getElementById('gradeActivitySelect');
    if (actSelect) {
      actSelect.innerHTML = '';
      state.activities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.activity_date} | ${a.title} (${a.competency_name || 'General'})`;
        actSelect.appendChild(opt);
      });
    }

    // Competencias para crear actividad
    const compSelect = document.getElementById('actCompSelect');
    if (compSelect) {
      compSelect.innerHTML = '';
      state.competencies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.code}: ${c.name}`;
        compSelect.appendChild(opt);
      });
    }
  }

  function openModal(id) {
    document.getElementById(id)?.classList.add('active');
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
  }

  // Inicializar todo
  init();
});
