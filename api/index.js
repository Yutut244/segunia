// api/index.js - Vercel Serverless Function & API Handler para SeguIA
const db = require('../db');
const { analyzeStudentPerformance, analyzeCourseOverview } = require('../analyticsEngine');
const { generateFeedback, generateABComparison } = require('../aiService');

// Utilidad para responder JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
  });
  res.end(JSON.stringify(data));
}

// Parsear cuerpo de la petición (compatible con Vercel y Node.js nativo)
function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON inválido en el cuerpo de la petición'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApiRequest(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // Manejo de preflight CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    });
    return res.end();
  }

  try {
    // ==========================================
    // 0. AUTENTICACIÓN DOCENTE
    // ==========================================
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const username = (body.username || body.email || '').trim().toLowerCase();
      const password = (body.password || '').trim();

      if (
        (username === 'docente@seguia.edu' && (password === 'seguia2026' || password === 'demo' || password === '123456')) ||
        (username === 'admin' && (password === 'admin123' || password === 'seguia2026')) ||
        (username && password && password.length >= 4)
      ) {
        const user = {
          id: 1,
          name: username === 'admin' ? 'Coordinación Académica' : 'Prof. Cristóbal Martínez & Jainer Salas',
          email: username.includes('@') ? username : `${username}@seguia.edu`,
          role: username === 'admin' ? 'Coordinador' : 'Docente Titular',
          token: 'seguia_tk_' + Date.now()
        };
        return sendJSON(res, 200, { success: true, user });
      }

      return sendJSON(res, 401, { error: 'Credenciales incorrectas. Verifique su usuario y contraseña.' });
    }

    // ==========================================
    // 1. CURSOS
    // ==========================================
    if (pathname === '/api/courses' && method === 'GET') {
      const courses = await db.getCourses();
      return sendJSON(res, 200, { success: true, courses });
    }

    if (pathname === '/api/courses' && method === 'POST') {
      const body = await parseBody(req);
      const courseId = await db.createCourse(body);
      return sendJSON(res, 201, { success: true, courseId });
    }

    const courseMatch = pathname.match(/^\/api\/courses\/(\d+)$/);
    if (courseMatch && method === 'GET') {
      const courseId = Number(courseMatch[1]);
      const course = await db.getCourse(courseId);
      if (!course) return sendJSON(res, 404, { error: 'Curso no encontrado' });

      const competencies = await db.getCompetencies(courseId);
      const activities = await db.getActivities(courseId);
      return sendJSON(res, 200, { success: true, course, competencies, activities });
    }

    // ==========================================
    // 2. COMPETENCIAS Y ACTIVIDADES
    // ==========================================
    if (pathname === '/api/competencies' && method === 'POST') {
      const body = await parseBody(req);
      const competencyId = await db.createCompetency(body);
      return sendJSON(res, 201, { success: true, competencyId });
    }

    if (pathname === '/api/activities' && method === 'POST') {
      const body = await parseBody(req);
      const activityId = await db.createActivity(body);
      return sendJSON(res, 201, { success: true, activityId });
    }

    // ==========================================
    // 3. ESTUDIANTES Y ANÁLISIS DE CURSO
    // ==========================================
    const courseStudentsMatch = pathname.match(/^\/api\/courses\/(\d+)\/students$/);
    if (courseStudentsMatch && method === 'GET') {
      const courseId = Number(courseStudentsMatch[1]);
      const settings = await db.getSettings();
      const students = await db.getStudents(courseId);
      const competencies = await db.getCompetencies(courseId);
      const courseAvg = await db.getCourseAverage(courseId);

      // Calcular indicadores para cada estudiante mediante analyticsEngine determinístico
      const studentsWithAnalytics = await Promise.all(students.map(async (s) => {
        const grades = await db.getStudentGrades(s.id);
        const analytics = analyzeStudentPerformance(grades, competencies, settings, courseAvg);
        const interventionsCount = await db.countStudentInterventions(s.id);

        return {
          ...s,
          hasData: analytics.hasData,
          insufficientData: analytics.insufficientData,
          studentAverage: analytics.studentAverage || (analytics.hasData ? analytics.average : 0),
          average: analytics.studentAverage || (analytics.hasData ? analytics.average : 0),
          alertLevel: analytics.alertLevel,
          alertBadge: analytics.alertBadge,
          trend: analytics.trend,
          consecutiveDrops: analytics.consecutiveDrops,
          gradesCount: grades.length,
          interventionsCount
        };
      }));

      const overview = analyzeCourseOverview(studentsWithAnalytics);
      return sendJSON(res, 200, {
        success: true,
        students: studentsWithAnalytics,
        courseOverview: overview
      });
    }

    if (pathname === '/api/students' && method === 'POST') {
      const body = await parseBody(req);
      const studentId = await db.createStudent(body);
      return sendJSON(res, 201, { success: true, studentId });
    }

    // Perfil completo del estudiante
    const studentMatch = pathname.match(/^\/api\/students\/(\d+)$/);
    if (studentMatch && method === 'GET') {
      const studentId = Number(studentMatch[1]);
      const student = await db.getStudent(studentId);
      if (!student) return sendJSON(res, 404, { error: 'Estudiante no encontrado' });

      const course = await db.getCourse(student.course_id);
      const competencies = await db.getCompetencies(student.course_id);
      const settings = await db.getSettings();
      const grades = await db.getStudentGrades(studentId);
      const courseAvg = await db.getCourseAverage(student.course_id);

      const analytics = analyzeStudentPerformance(grades, competencies, settings, courseAvg);
      const interventions = await db.getInterventions(studentId);
      const feedbacks = await db.getFeedbacks(studentId);

      return sendJSON(res, 200, {
        success: true,
        student,
        course,
        grades,
        analytics,
        interventions,
        feedbacks
      });
    }

    // ==========================================
    // 4. CALIFICACIONES Y EVIDENCIAS
    // ==========================================
    if (pathname === '/api/grades' && method === 'POST') {
      const body = await parseBody(req);
      await db.saveGrade(body);
      return sendJSON(res, 200, { success: true });
    }

    // ==========================================
    // 5. INTELIGENCIA ARTIFICIAL & RETROALIMENTACIÓN
    // ==========================================
    const aiFeedbackMatch = pathname.match(/^\/api\/ai\/feedback\/(\d+)$/);
    if (aiFeedbackMatch && method === 'POST') {
      const studentId = Number(aiFeedbackMatch[1]);
      const student = await db.getStudent(studentId);
      if (!student) return sendJSON(res, 404, { error: 'Estudiante no encontrado' });

      const competencies = await db.getCompetencies(student.course_id);
      const settings = await db.getSettings();
      const grades = await db.getStudentGrades(studentId);
      const courseAvg = await db.getCourseAverage(student.course_id);

      const analytics = analyzeStudentPerformance(grades, competencies, settings, courseAvg);

      const observations = grades.map(g => ({
        activity_title: g.activity_title,
        competency_name: g.competency_name,
        score: g.score,
        activity_date: g.activity_date,
        observation: g.observation
      }));

      const feedback = await generateFeedback(student, analytics, observations, settings);

      const feedbackId = await db.saveFeedback({
        student_id: studentId,
        model_used: feedback.modelUsed,
        summary: feedback.summary,
        pedagogical_interpretation: feedback.pedagogicalInterpretation,
        recommendation: feedback.recommendation,
        explicability: feedback.explicability,
        raw_metrics: feedback.rawMetrics,
        scenario_type: feedback.scenarioType || 'B_FULL_CONTEXT'
      });

      return sendJSON(res, 200, {
        success: true,
        feedbackId,
        feedback
      });
    }

    // Laboratorio Comparativo A/B
    const aiABMatch = pathname.match(/^\/api\/ai\/compare-ab\/(\d+)$/);
    if (aiABMatch && method === 'POST') {
      const studentId = Number(aiABMatch[1]);
      const student = await db.getStudent(studentId);
      if (!student) return sendJSON(res, 404, { error: 'Estudiante no encontrado' });

      const competencies = await db.getCompetencies(student.course_id);
      const settings = await db.getSettings();
      const grades = await db.getStudentGrades(studentId);

      const analytics = analyzeStudentPerformance(grades, competencies, settings);

      const observations = grades.map(g => ({
        activity_title: g.activity_title,
        competency_name: g.competency_name,
        score: g.score,
        activity_date: g.activity_date,
        observation: g.observation
      }));

      const abComparison = await generateABComparison(student, analytics, observations, settings);
      return sendJSON(res, 200, { success: true, abComparison });
    }

    // ==========================================
    // 6. INTERVENCIONES DOCENTES (CERRAR EL CICLO)
    // ==========================================
    if (pathname === '/api/interventions' && method === 'POST') {
      const body = await parseBody(req);
      const interventionId = await db.createIntervention(body);
      return sendJSON(res, 201, { success: true, interventionId });
    }

    const interventionUpdateMatch = pathname.match(/^\/api\/interventions\/(\d+)$/);
    if (interventionUpdateMatch && (method === 'PUT' || method === 'PATCH')) {
      const interventionId = Number(interventionUpdateMatch[1]);
      const body = await parseBody(req);
      await db.updateIntervention(interventionId, body);
      return sendJSON(res, 200, { success: true });
    }

    // ==========================================
    // 7. RÚBRICAS DE EVALUACIÓN
    // ==========================================
    if (pathname === '/api/rubrics' && method === 'POST') {
      const body = await parseBody(req);
      const result = await db.saveRubricEvaluation(body);
      return sendJSON(res, 201, {
        success: true,
        rubricId: result.rubricId,
        overallScore: result.overallScore
      });
    }

    // ==========================================
    // 8. CONFIGURACIONES
    // ==========================================
    if (pathname === '/api/settings' && method === 'GET') {
      const settings = await db.getSettings();
      if (settings.gemini_api_key && settings.gemini_api_key.length > 8) {
        settings.gemini_api_key_masked = settings.gemini_api_key.slice(0, 4) + '...' + settings.gemini_api_key.slice(-4);
      }
      return sendJSON(res, 200, { success: true, settings });
    }

    if (pathname === '/api/settings' && method === 'POST') {
      const body = await parseBody(req);
      await db.saveSettings(body);
      return sendJSON(res, 200, { success: true });
    }

    // ==========================================
    // 9. INFORME IMPRIMIBLE DEL ESTUDIANTE
    // ==========================================
    const reportMatch = pathname.match(/^\/api\/reports\/student\/(\d+)$/);
    if (reportMatch && method === 'GET') {
      const studentId = Number(reportMatch[1]);
      const student = await db.getStudent(studentId);
      if (!student) return sendJSON(res, 404, { error: 'Estudiante no encontrado' });

      const course = await db.getCourse(student.course_id);
      const competencies = await db.getCompetencies(student.course_id);
      const grades = await db.getStudentGrades(studentId);
      const interventions = await db.getInterventions(studentId);
      const feedbacks = await db.getFeedbacks(studentId);
      const settings = await db.getSettings();
      const analytics = analyzeStudentPerformance(grades, competencies, settings);

      const lastFeedback = feedbacks[0] || null;
      const lastRubric = lastFeedback?.rubric || null;

      return sendJSON(res, 200, {
        success: true,
        report: {
          projectMeta: {
            title: 'SeguIA - Sistema Inteligente de Seguimiento Académico y Retroalimentación Docente',
            authors: 'Cristóbal Martínez & Jainer Salas',
            motto: 'La IA propone, los datos sustentan y el docente decide.',
            date: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
          },
          course,
          student,
          grades,
          analytics,
          interventions,
          lastFeedback,
          lastRubric
        }
      });
    }

    return sendJSON(res, 404, { error: 'Ruta de API no encontrada' });

  } catch (error) {
    console.error('Error procesando API:', error);
    return sendJSON(res, 500, { error: 'Error interno del servidor', message: error.message });
  }
}

// Exportación para Vercel Serverless Function
module.exports = handleApiRequest;
