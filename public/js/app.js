// app.js - Lógica Principal de la Aplicación SeguIA
// Diseño Moderno, Responsivo, Autenticación y Cero Emojis

document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    user: null,
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

  const TAB_TITLES = {
    'tab-dashboard': 'Panel del Curso',
    'tab-student': 'Ficha Individual & IA',
    'tab-cycle': 'Ciclo de Intervención',
    'tab-ab': 'Laboratorio A/B & Rúbricas',
    'tab-settings': 'Configuración del Sistema',
    'tab-ethics': 'Principios Éticos'
  };

  // ==========================================
  // INICIALIZACIÓN Y CONTROL DE AUTENTICACIÓN
  // ==========================================
  async function init() {
    setupAuthListeners();
    checkAuthSession();
  }

  function checkAuthSession() {
    const sessionStr = localStorage.getItem('seguia_session');
    if (sessionStr) {
      try {
        state.user = JSON.parse(sessionStr);
        showAppView();
        return;
      } catch (e) {
        localStorage.removeItem('seguia_session');
      }
    }
    showLoginView();
  }

  function showLoginView() {
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('appView').style.display = 'none';
  }

  function showAppView() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('appView').style.display = 'block';

    if (state.user) {
      document.getElementById('userName').textContent = state.user.name || 'Docente Titular';
      document.getElementById('userRole').textContent = state.user.role || 'Docente';
      const initials = (state.user.name || 'Docente')
        .split(' ')
        .filter(n => n.length > 0 && !n.includes('.'))
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'DC';
      document.getElementById('userAvatar').textContent = initials;
    }

    setupAppEventListeners();
    loadSettings();
    loadCourses();
  }

  // ==========================================
  // EVENTOS DE AUTENTICACIÓN
  // ==========================================
  function setupAuthListeners() {
    const loginForm = document.getElementById('loginForm');
    const loginErrorAlert = document.getElementById('loginErrorAlert');
    const loginErrorText = document.getElementById('loginErrorText');

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const btn = document.getElementById('btnLoginSubmit');

      loginErrorAlert.style.display = 'none';
      btn.disabled = true;
      btn.textContent = 'Verificando...';

      try {
        const res = await API.login({ username, password });
        if (res.success && res.user) {
          state.user = res.user;
          localStorage.setItem('seguia_session', JSON.stringify(res.user));
          showAppView();
        } else {
          throw new Error(res.error || 'Credenciales inválidas.');
        }
      } catch (err) {
        loginErrorText.textContent = err.message || 'Error al iniciar sesión.';
        loginErrorAlert.style.display = 'flex';
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg> Iniciar Sesión`;
      }
    });

    // Botón Acceso Rápido Demo
    document.getElementById('btnQuickDemo')?.addEventListener('click', () => {
      document.getElementById('loginUsername').value = 'docente@seguia.edu';
      document.getElementById('loginPassword').value = 'seguia2026';
      loginForm.dispatchEvent(new Event('submit'));
    });

    // Botón Cerrar Sesión
    document.getElementById('btnLogout')?.addEventListener('click', () => {
      if (confirm('¿Deseas cerrar tu sesión docente en SeguIA?')) {
        localStorage.removeItem('seguia_session');
        state.user = null;
        showLoginView();
      }
    });
  }

  // ==========================================
  // CONFIGURACIÓN DE EVENT LISTENERS DE LA APP
  // ==========================================
  let appListenersInitialized = false;
  function setupAppEventListeners() {
    if (appListenersInitialized) return;
    appListenersInitialized = true;

    // Navegación Sidebar (sin scrollbars horizontales)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const targetTabId = item.getAttribute('data-tab');
        switchTab(targetTabId);
        closeMobileSidebar();
      });
    });

    // Control del Menú Móvil (Hamburger)
    const btnHamburger = document.getElementById('btnHamburger');
    const btnSidebarClose = document.getElementById('btnSidebarClose');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    btnHamburger?.addEventListener('click', () => {
      document.getElementById('appSidebar').classList.add('sidebar-open');
      sidebarBackdrop.classList.add('active');
    });

    btnSidebarClose?.addEventListener('click', closeMobileSidebar);
    sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

    // Selector de Curso Principal
    const courseSelect = document.getElementById('courseSelect');
    courseSelect.addEventListener('change', async (e) => {
      state.currentCourseId = Number(e.target.value);
      await loadCourseData(state.currentCourseId);
    });

    // Filtros de búsqueda en el dashboard
    document.getElementById('studentSearchInput')?.addEventListener('input', renderStudentsTable);
    document.getElementById('filterAlertSelect')?.addEventListener('change', renderStudentsTable);

    // Selector de Estudiante en Ficha Individual
    document.getElementById('studentSelectInTab')?.addEventListener('change', async (e) => {
      state.currentStudentId = Number(e.target.value);
      await loadStudentDetails(state.currentStudentId);
    });

    // Modales y Acciones
    setupModalButtons();

    // Botón Generar IA
    document.getElementById('btnGenerateAI')?.addEventListener('click', handleGenerateAIFeedback);

    // Botón Comparativa A/B
    document.getElementById('btnRunABTest')?.addEventListener('click', handleRunABTest);

    // Botón Guardar Rúbrica
    document.getElementById('btnSubmitRubric')?.addEventListener('click', handleSubmitRubric);

    // Botón Guardar Configuración
    document.getElementById('btnSaveSettings')?.addEventListener('click', handleSaveSettings);

    // Botón Imprimir Informe
    document.getElementById('btnPrintReport')?.addEventListener('click', handleOpenPrintReport);

    // Redibujar gráficos si cambia el tamaño de ventana
    window.addEventListener('resize', () => {
      if (state.currentStudentData && document.getElementById('tab-student').classList.contains('active')) {
        renderStudentCharts(state.currentStudentData);
      }
    });
  }

  function closeMobileSidebar() {
    document.getElementById('appSidebar')?.classList.remove('sidebar-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
  }

  function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.add('active');

    // Actualizar título en la barra superior
    const titleElement = document.getElementById('currentTabTitle');
    if (titleElement && TAB_TITLES[tabId]) {
      titleElement.textContent = TAB_TITLES[tabId];
    }

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
      
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      setVal('cfg_consecutive_drops', state.settings.consecutive_drops_threshold || 3);
      setVal('cfg_drop_delta', state.settings.drop_delta_threshold || 10);
      setVal('cfg_priority_slope', state.settings.priority_alert_slope || -1.5);
      setVal('cfg_competency_gap', state.settings.competency_gap_threshold || 12);
      setVal('cfg_gemini_api_key', state.settings.gemini_api_key || '');
      setVal('cfg_gemini_model', state.settings.gemini_model || 'gemini-3.8-flash');

      const anonCheck = document.getElementById('cfg_anonymize');
      if (anonCheck) anonCheck.checked = state.settings.anonymize_ai !== false;

      updatePrivacyBadge();
    } catch (err) {
      console.error('Error cargando configuraciones:', err);
    }
  }

  function updatePrivacyBadge() {
    const badge = document.getElementById('privacyIndicator');
    if (!badge) return;
    if (state.settings.anonymize_ai !== false) {
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> <span>Modo Anonimizado</span>`;
      badge.style.background = 'var(--accent-subtle)';
      badge.style.borderColor = '#99f6e4';
      badge.style.color = '#0f766e';
    } else {
      badge.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> <span>Nombres Visibles</span>`;
      badge.style.background = '#fef2f2';
      badge.style.borderColor = '#fca5a5';
      badge.style.color = '#991b1b';
    }
  }

  async function loadCourses() {
    try {
      const res = await API.getCourses();
      state.courses = res.courses || [];
      const select = document.getElementById('courseSelect');
      if (!select) return;
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
      const courseRes = await API.getCourse(courseId);
      state.currentCourse = courseRes.course;
      state.competencies = courseRes.competencies || [];
      state.activities = courseRes.activities || [];

      // Subtítulo en barra superior
      const subEl = document.getElementById('currentCourseSubtitle');
      if (subEl && state.currentCourse) {
        subEl.textContent = `${state.currentCourse.code} — ${state.currentCourse.teacher_name}`;
      }

      // Estudiantes y analítica calculada
      const studentsRes = await API.getCourseStudents(courseId);
      state.students = studentsRes.students || [];

      renderCourseOverview(studentsRes.courseOverview);
      renderStudentsTable();
      populateStudentSelects();
      populateActivityAndCompetencySelects();

      if (state.students.length > 0) {
        state.currentStudentId = state.students[0].id;
        await loadStudentDetails(state.currentStudentId);
      }
    } catch (err) {
      console.error('Error cargando datos del curso:', err);
    }
  }

  // ==========================================
  // RENDERIZADO: PANEL DEL CURSO (SIN EMOJIS)
  // ==========================================
  function renderCourseOverview(overview) {
    if (!overview) return;
    document.getElementById('courseAvgDisplay').textContent = `${overview.courseAverage}/100`;
    document.getElementById('courseDescDisplay').textContent = `${overview.evaluatedStudents} de ${overview.totalStudents} evaluados`;
    document.getElementById('priorityCountDisplay').textContent = overview.alertCounts?.priority || 0;
    document.getElementById('recommendedCountDisplay').textContent = overview.alertCounts?.recommended || 0;
    document.getElementById('regularCountDisplay').textContent = overview.alertCounts?.regular || 0;
  }

  function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('studentSearchInput')?.value || '').toLowerCase().trim();
    const alertFilter = document.getElementById('filterAlertSelect')?.value || 'all';

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

      // Badge de alerta profesional con indicador SVG de estado
      let alertBadgeHTML = '';
      if (s.alertLevel === 'priority') {
        alertBadgeHTML = `<span class="badge badge-priority"><span class="status-indicator status-priority"></span> Atención prioritaria</span>`;
      } else if (s.alertLevel === 'recommended') {
        alertBadgeHTML = `<span class="badge badge-recommended"><span class="status-indicator status-recommended"></span> Revisión recomendada</span>`;
      } else {
        alertBadgeHTML = `<span class="badge badge-regular"><span class="status-indicator status-regular"></span> Seguimiento regular</span>`;
      }

      // Tendencia con icono SVG
      let trendHTML = '<span>--</span>';
      if (s.trend) {
        if (s.trend.slope > 0.5) {
          trendHTML = `<span style="color:#10b981; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${Icons.render('trendUp')} +${s.trend.slope}</span>`;
        } else if (s.trend.slope < -0.8) {
          trendHTML = `<span style="color:#ef4444; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${Icons.render('trendDown')} ${s.trend.slope}</span>`;
        } else {
          trendHTML = `<span style="color:#64748b; font-weight:600; display:inline-flex; align-items:center; gap:4px;">${Icons.render('trendFlat')} ${s.trend.slope}</span>`;
        }
      }

      tr.innerHTML = `
        <td><strong style="color:var(--primary); font-size:0.85rem;">${s.student_code}</strong></td>
        <td><strong>${s.full_name}</strong></td>
        <td>${s.gradesCount} act.</td>
        <td><strong style="font-size:1.05rem;">${s.average > 0 ? `${s.average}/100` : '--'}</strong></td>
        <td>${trendHTML}</td>
        <td>${alertBadgeHTML}</td>
        <td>${s.interventionsCount > 0 ? `<span class="badge" style="background:#eff6ff; color:#1e40af;">${s.interventionsCount} reg.</span>` : '<span style="color:#94a3b8;">0</span>'}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-sm btn-outline btn-view-student" data-id="${s.id}">Ver Ficha</button>
          <button class="btn btn-sm btn-primary btn-grade-student" data-id="${s.id}">Calificar</button>
        </td>
      `;

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

      document.getElementById('shStudentName').textContent = student.full_name;
      document.getElementById('shStudentCodeBadge').textContent = student.student_code;
      document.getElementById('shStudentCourse').textContent = `${res.course.code} — ${res.course.name}`;
      document.getElementById('shStudentAvg').textContent = analytics.studentAverage ? `${analytics.studentAverage}/100` : '--';

      // Semáforo de alerta sin emojis
      const alertContainer = document.getElementById('shAlertContainer');
      let badgeClass = 'badge-regular';
      let dotClass = 'status-regular';
      if (analytics.alertLevel === 'priority') {
        badgeClass = 'badge-priority';
        dotClass = 'status-priority';
      } else if (analytics.alertLevel === 'recommended') {
        badgeClass = 'badge-recommended';
        dotClass = 'status-recommended';
      }

      alertContainer.innerHTML = `
        <span class="badge ${badgeClass}" style="font-size:0.9rem; padding:0.4rem 1rem;">
          <span class="status-indicator ${dotClass}"></span> ${analytics.alertBadge}
        </span>
      `;

      const headerCard = document.getElementById('studentHeaderCard');
      if (analytics.alertLevel === 'priority') headerCard.style.borderLeftColor = '#ef4444';
      else if (analytics.alertLevel === 'recommended') headerCard.style.borderLeftColor = '#f59e0b';
      else headerCard.style.borderLeftColor = '#10b981';

      renderStudentCharts(res);
      renderStudentGradesTable(res.grades);
      renderAIFeedbackOutput(res.feedbacks && res.feedbacks.length > 0 ? res.feedbacks[0] : null);

    } catch (err) {
      console.error('Error cargando ficha del estudiante:', err);
    }
  }

  function renderStudentCharts(studentData) {
    const grades = studentData.grades || [];
    const analytics = studentData.analytics || {};

    const trendBadge = document.getElementById('trendBadgeDetail');
    if (trendBadge && analytics.trend) {
      trendBadge.textContent = analytics.trend.label || '';
    }

    SeguIACharts.renderTrendChart('trendChartContainer', grades, analytics.trend, studentData.course?.passing_grade || 60);
    SeguIACharts.renderCompetenciesBarChart('competenciesChartContainer', analytics.competenciesSummary, analytics.studentAverage);
  }

  function renderStudentGradesTable(grades) {
    const tbody = document.getElementById('studentGradesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!grades || grades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#94a3b8;">Sin evaluaciones registradas aún para este estudiante.</td></tr>`;
      return;
    }

    grades.forEach(g => {
      const tr = document.createElement('tr');
      const isLow = g.score < 60;
      tr.innerHTML = `
        <td><small style="color:var(--text-muted); font-weight:700;">${g.activity_date}</small></td>
        <td><strong>${g.activity_title}</strong></td>
        <td><span class="badge" style="background:#f1f5f9; color:#334155;">${g.competency_name || 'General'}</span></td>
        <td>${g.evidence_type || 'Documento'}</td>
        <td><strong style="color:${isLow ? '#dc2626' : '#2563eb'}; font-size:1.05rem;">${g.score}/100</strong></td>
        <td style="color:#334155; font-size:0.85rem;">${g.observation ? `<em>"${g.observation}"</em>` : '<span style="color:#94a3b8;">Sin observación cualitativa</span>'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==========================================
  // COMPONENTE DE INTELIGENCIA ARTIFICIAL (SIN EMOJIS)
  // ==========================================
  async function handleGenerateAIFeedback() {
    if (!state.currentStudentId) return;

    const btn = document.getElementById('btnGenerateAI');
    const container = document.getElementById('aiOutputContainer');
    btn.disabled = true;
    btn.innerHTML = `${Icons.render('sparkles')} Analizando con IA...`;

    container.innerHTML = `
      <div style="text-align:center; padding:2.5rem;">
        <div style="font-size:1.1rem; font-weight:800; color:var(--primary); margin-bottom:0.4rem;">
          SeguIA está procesando los indicadores...
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted);">Auditando observaciones cualitativas y estructurando la síntesis pedagógica con lenguaje prudente.</p>
      </div>
    `;

    try {
      const res = await API.generateAIFeedback(state.currentStudentId);
      state.lastGeneratedFeedbackId = res.feedbackId;
      renderAIFeedbackOutput(res.feedback, res.feedbackId);
      await loadStudentDetails(state.currentStudentId);
    } catch (err) {
      console.error('Error generando retroalimentación:', err);
      container.innerHTML = `<div style="padding:1.25rem; background:#fee2e2; color:#991b1b; border-radius:8px; font-size:0.88rem;"><strong>Error:</strong> ${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${Icons.render('sparkles')} Generar Retroalimentación`;
    }
  }

  function renderAIFeedbackOutput(feedback, feedbackId = null) {
    const container = document.getElementById('aiOutputContainer');
    if (!feedback) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem; color:#64748b;">
          <p style="font-size:0.95rem; font-weight:700;">Presiona "Generar Retroalimentación" para formular el acompañamiento pedagógico.</p>
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
            ${Icons.render('sparkles')} Modelo: ${feedback.modelUsed || feedback.model_used || 'SeguIA Engine'}
          </span>
          <span style="font-size:0.78rem; color:var(--text-muted);">
            Fecha: ${feedback.generated_at ? new Date(feedback.generated_at).toLocaleString() : 'Reciente'}
          </span>
        </div>

        <div class="ai-section">
          <div class="ai-section-title">
            ${Icons.render('fileText')} Resumen de Progreso y Trayectoria
          </div>
          <div class="ai-section-content">${feedback.summary}</div>
        </div>

        <div class="ai-section">
          <div class="ai-section-title">
            ${Icons.render('search')} Interpretación Pedagógica (Lenguaje Prudente, No Diagnóstico)
          </div>
          <div class="ai-section-content">${feedback.pedagogicalInterpretation || feedback.pedagogical_interpretation}</div>
        </div>

        <div class="ai-section">
          <div class="ai-section-title">
            ${Icons.render('target')} Recomendación de Intervención Docente
          </div>
          <div class="ai-section-content" style="background:#eff6ff; padding:0.85rem; border-radius:8px; border-left:4px solid #3b82f6;">
            ${feedback.recommendation}
          </div>
        </div>

        <div class="explicability-card">
          <div class="explicability-title">
            ${Icons.render('shield')} Auditoría de Explicabilidad: ¿Por qué aparece esta recomendación?
          </div>
          <div>${feedback.explicability}</div>
        </div>

        <div style="margin-top:1.25rem; display:flex; justify-content:flex-end; gap:0.75rem; flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" id="btnGoToRubricFromAI">
            ${Icons.render('scale')} Evaluar con Rúbrica Pedagógica
          </button>
          <button class="btn btn-sm btn-accent" id="btnCreateInterventionFromAI">
            ${Icons.render('tool')} Convertir en Intervención Docente
          </button>
        </div>
      </div>
    `;

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
  // CICLO DE INTERVENCIÓN DOCENTE (SIN EMOJIS)
  // ==========================================
  async function renderInterventionsTable() {
    const tbody = document.getElementById('interventionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:1.5rem;">Cargando ciclo de intervenciones...</td></tr>';

    try {
      const res = await API.getCourseStudents(state.currentCourseId);
      const studentIds = res.students.map(s => s.id);
      const studentRes = await API.getStudent(state.currentStudentId || studentIds[0]);
      const interventions = studentRes.interventions || [];

      tbody.innerHTML = '';

      if (interventions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:#94a3b8;">No hay intervenciones registradas en el ciclo para este estudiante. Puedes crear una con el botón "Nueva Intervención".</td></tr>`;
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
            ${!isComplete ? `<button class="btn btn-sm btn-primary btn-eval-int" data-id="${int.id}">Evaluar Post</button>` : `<span style="color:#10b981; font-weight:700;">Cerrada</span>`}
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
  // LABORATORIO COMPARATIVO A/B (SIN EMOJIS)
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
        <div class="scenario-card scenario-a">
          <span class="scenario-badge">${ab.scenarioA.scenario}</span>
          <div style="font-size:0.82rem; color:#7f1d1d; background:#fef2f2; padding:0.6rem; border-radius:6px; margin-bottom:0.75rem;">
            <strong>Prompt básico:</strong> ${ab.scenarioA.promptGivenToAI}
          </div>
          <div style="font-size:0.88rem; line-height:1.5; color:#334155; margin-bottom:1rem; flex:1;">
            <em>"${ab.scenarioA.feedbackGenerated}"</em>
          </div>
          <div style="background:#fee2e2; border-left:3px solid #ef4444; padding:0.65rem; border-radius:4px; font-size:0.78rem; color:#991b1b;">
            ${ab.scenarioA.analysisPedagogico}
          </div>
          <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid #fee2e2; font-size:0.85rem; font-weight:700; color:#b91c1c;">
            Puntuación en Rúbrica: ${ab.scenarioA.rubricPreview.totalPromedio} / 5.0
          </div>
        </div>

        <div class="scenario-card scenario-b">
          <span class="scenario-badge">${ab.scenarioB.scenario}</span>
          <div style="font-size:0.82rem; color:#064e3b; background:#f0fdf4; padding:0.6rem; border-radius:6px; margin-bottom:0.75rem;">
            <strong>Prompt enriquecido:</strong> ${ab.scenarioB.promptGivenToAI}
          </div>
          <div style="font-size:0.88rem; line-height:1.5; color:#334155; margin-bottom:1rem; flex:1;">
            <p><strong>Síntesis:</strong> <em>"${ab.scenarioB.feedbackGenerated.summary}"</em></p>
            <p style="margin-top:0.35rem;"><strong>Interpretación:</strong> <em>"${ab.scenarioB.feedbackGenerated.pedagogicalInterpretation}"</em></p>
            <p style="margin-top:0.35rem;"><strong>Recomendación:</strong> <em>"${ab.scenarioB.feedbackGenerated.recommendation}"</em></p>
          </div>
          <div style="background:#dcfce7; border-left:3px solid #10b981; padding:0.65rem; border-radius:4px; font-size:0.78rem; color:#14532d;">
            ${ab.scenarioB.analysisPedagogico}
          </div>
          <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid #bbf7d0; font-size:0.85rem; font-weight:700; color:#15803d;">
            Puntuación en Rúbrica: ${ab.scenarioB.rubricPreview.totalPromedio} / 5.0
          </div>
        </div>
      `;

    } catch (err) {
      console.error('Error en prueba A/B:', err);
      alert('Error ejecutando la prueba A/B: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg> Ejecutar Comparativa A/B`;
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

      alert(`Rúbrica guardada exitosamente.\nPuntuación pedagógica global: ${res.overallScore} / 5.0`);
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
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1e3a8a; padding-bottom:1rem; margin-bottom:1.5rem;">
            <div>
              <h1 style="color:#1e3a8a; font-size:1.35rem; margin-bottom:0.25rem;">${rep.projectMeta.title}</h1>
              <div style="font-size:0.85rem; color:#64748b; font-style:italic;">"${rep.projectMeta.motto}"</div>
              <div style="font-size:0.8rem; color:#334155; margin-top:0.25rem;">Autores del Proyecto: <strong>${rep.projectMeta.authors}</strong></div>
            </div>
            <div style="text-align:right; font-size:0.85rem; color:#475569;">
              <strong>Fecha:</strong> ${rep.projectMeta.date}<br>
              <strong>Curso:</strong> ${rep.course.name} (${rep.course.code})<br>
              <strong>Docente:</strong> ${rep.course.teacher_name}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; margin-bottom:1.5rem;">
            <div>
              <div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700;">Estudiante Evaluado</div>
              <div style="font-size:1.15rem; font-weight:800; color:#1e293b;">${rep.student.full_name} (${rep.student.student_code})</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.75rem; color:#64748b; text-transform:uppercase; font-weight:700;">Promedio / Estado</div>
              <div style="font-size:1.15rem; font-weight:800; color:#1e293b;">${rep.analytics.studentAverage}/100 — <span style="font-size:0.88rem;">${rep.analytics.alertBadge}</span></div>
            </div>
          </div>

          <h3 style="color:#1e3a8a; font-size:1rem; margin-bottom:0.5rem;">1. Historial de Evidencias y Calificaciones</h3>
          <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem; font-size:0.82rem;">
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

          <h3 style="color:#1e3a8a; font-size:1rem; margin-bottom:0.5rem;">2. Síntesis y Acompañamiento Pedagógico de IA</h3>
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

          <h3 style="color:#1e3a8a; font-size:1rem; margin-bottom:0.5rem;">3. Registro de Intervención Pedagógica y Medición de Impacto</h3>
          ${rep.interventions.length > 0 ? `
            <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem; font-size:0.82rem;">
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

          <div style="display:flex; justify-content:space-between; margin-top:3rem; padding-top:1.5rem; border-top:1px dashed #cbd5e1; font-size:0.82rem; text-align:center;">
            <div>
              <div style="border-bottom:1px solid #334155; width:200px; margin-bottom:0.25rem;"></div>
              Firma del Docente Responsable
            </div>
            <div>
              <div style="border-bottom:1px solid #334155; width:200px; margin-bottom:0.25rem;"></div>
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
      anonymize_ai: document.getElementById('cfg_anonymize').checked,
      ai_provider: 'gemini'
    };

    try {
      await API.saveSettings(newSettings);
      state.settings = newSettings;
      updatePrivacyBadge();
      alert('Configuraciones y umbrales actualizados exitosamente.');
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

    // Abrir modal de nuevo curso
    document.getElementById('btnNewCourse')?.addEventListener('click', () => {
      openModal('modalNewCourse');
    });

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        closeModal(modalId);
      });
    });

    // Guardar Calificación
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
        alert('Calificación y evidencia registradas.');
        await loadCourseData(state.currentCourseId);
        if (state.currentStudentId === studentId) {
          await loadStudentDetails(studentId);
        }
      } catch (err) {
        alert('Error al guardar calificación: ' + err.message);
      }
    });

    // Guardar Intervención
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
        alert('Decisión pedagógica registrada exitosamente.');
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
        alert('Impacto de la intervención guardado.');
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
        alert('Estudiante registrado.');
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
        alert('Actividad creada.');
        await loadCourseData(state.currentCourseId);
      } catch (err) {
        alert('Error creando actividad: ' + err.message);
      }
    });

    // Crear Curso
    document.getElementById('btnSaveCourseSubmit')?.addEventListener('click', async () => {
      const code = document.getElementById('courseCodeInput').value.trim();
      const name = document.getElementById('courseNameInput').value.trim();
      const teacher = document.getElementById('courseTeacherInput').value.trim();
      const desc = document.getElementById('courseDescInput').value.trim();

      if (!code || !name) return alert('Código y nombre del curso son obligatorios.');

      try {
        const res = await API.createCourse({
          code,
          name,
          teacher_name: teacher || state.user?.name || 'Docente Responsable',
          description: desc
        });
        closeModal('modalNewCourse');
        alert('Curso creado exitosamente.');
        await loadCourses();
        if (res.courseId) {
          state.currentCourseId = res.courseId;
          document.getElementById('courseSelect').value = res.courseId;
          await loadCourseData(res.courseId);
        }
      } catch (err) {
        alert('Error creando curso: ' + err.message);
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

  init();
});
