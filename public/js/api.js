// api.js - Cliente API para SeguIA
const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `Error HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.error || errJson.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  // Autenticación
  login(credentials) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // Cursos
  getCourses() {
    return this.request('/api/courses');
  },
  getCourse(courseId) {
    return this.request(`/api/courses/${courseId}`);
  },
  createCourse(courseData) {
    return this.request('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData)
    });
  },

  // Estudiantes y analítica del curso
  getCourseStudents(courseId) {
    return this.request(`/api/courses/${courseId}/students`);
  },
  getStudent(studentId) {
    return this.request(`/api/students/${studentId}`);
  },
  createStudent(studentData) {
    return this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    });
  },

  // Competencias y Actividades
  createCompetency(competencyData) {
    return this.request('/api/competencies', {
      method: 'POST',
      body: JSON.stringify(competencyData)
    });
  },
  createActivity(activityData) {
    return this.request('/api/activities', {
      method: 'POST',
      body: JSON.stringify(activityData)
    });
  },

  // Calificaciones
  saveGrade(gradeData) {
    return this.request('/api/grades', {
      method: 'POST',
      body: JSON.stringify(gradeData)
    });
  },

  // Inteligencia Artificial
  generateAIFeedback(studentId) {
    return this.request(`/api/ai/feedback/${studentId}`, {
      method: 'POST'
    });
  },
  runABComparison(studentId) {
    return this.request(`/api/ai/compare-ab/${studentId}`, {
      method: 'POST'
    });
  },

  // Intervenciones
  createIntervention(interventionData) {
    return this.request('/api/interventions', {
      method: 'POST',
      body: JSON.stringify(interventionData)
    });
  },
  updateIntervention(interventionId, updateData) {
    return this.request(`/api/interventions/${interventionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Rúbricas
  saveRubricEvaluation(rubricData) {
    return this.request('/api/rubrics', {
      method: 'POST',
      body: JSON.stringify(rubricData)
    });
  },

  // Configuraciones
  getSettings() {
    return this.request('/api/settings');
  },
  saveSettings(settingsData) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settingsData)
    });
  },

  // Reporte imprimible
  getStudentReport(studentId) {
    return this.request(`/api/reports/student/${studentId}`);
  }
};

window.API = API;
