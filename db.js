// db.js - Capa de Base de Datos Optimizada para Supabase PostgreSQL & Vercel
const fs = require('node:fs');
const path = require('node:path');

// Cargar variables de entorno desde .env si existe localmente
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
} catch (e) {
  // Ignorar errores en entornos serverless donde process.env ya está inyectado
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hzmhmdkzywjzaatlrvui.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_ANON_KEY || 
                     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bWhtZGt6eXdqemFhdGxydnVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTkxNjY2OSwiZXhwIjoyMTA3NDkyNjY5fQ.ojCOHBHUudLKH9tXEAn5Pp1tIRY72uuaWa-JyiGfBsY';

/**
 * Cliente HTTP nativo para Supabase PostgREST (Cero dependencias externas, ultra rápido en Serverless)
 */
async function supabaseRequest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en Supabase (${response.status}): ${errorText}`);
  }

  // Si la respuesta no tiene contenido (ej. 204 No Content)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

const db = {
  // ==========================================
  // CONFIGURACIONES
  // ==========================================
  async getSettings() {
    const rows = await supabaseRequest('settings?select=*');
    const settings = {};
    (rows || []).forEach(r => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    });
    return settings;
  },

  async saveSettings(settingsObj) {
    for (const [key, val] of Object.entries(settingsObj)) {
      await supabaseRequest('settings?on_conflict=key', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          key,
          value: JSON.stringify(val)
        })
      });
    }
    return true;
  },

  // ==========================================
  // CURSOS
  // ==========================================
  async getCourses() {
    const courses = await supabaseRequest('courses?select=*,students(count),activities(count)&order=id.asc');
    return (courses || []).map(c => ({
      ...c,
      students_count: c.students?.[0]?.count || 0,
      activities_count: c.activities?.[0]?.count || 0
    }));
  },

  async getCourse(id) {
    const courses = await supabaseRequest(`courses?id=eq.${id}&limit=1`);
    return courses?.[0] || null;
  },

  async createCourse(data) {
    const res = await supabaseRequest('courses', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        code: data.code,
        name: data.name,
        description: data.description || '',
        teacher_name: data.teacher_name || 'Docente Responsable',
        grade_scale_min: data.grade_scale_min || 0,
        grade_scale_max: data.grade_scale_max || 100,
        passing_grade: data.passing_grade || 60
      })
    });
    return res?.[0]?.id;
  },

  // ==========================================
  // COMPETENCIAS Y ACTIVIDADES
  // ==========================================
  async getCompetencies(courseId) {
    return await supabaseRequest(`competencies?course_id=eq.${courseId}&order=id.asc`) || [];
  },

  async createCompetency(data) {
    const res = await supabaseRequest('competencies', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        course_id: data.course_id,
        code: data.code,
        name: data.name,
        description: data.description || ''
      })
    });
    return res?.[0]?.id;
  },

  async getActivities(courseId) {
    const activities = await supabaseRequest(`activities?course_id=eq.${courseId}&select=*,competencies(name,code)&order=activity_date.asc`) || [];
    return activities.map(a => ({
      ...a,
      competency_name: a.competencies?.name || '',
      competency_code: a.competencies?.code || ''
    }));
  },

  async createActivity(data) {
    const res = await supabaseRequest('activities', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        course_id: data.course_id,
        competency_id: data.competency_id,
        title: data.title,
        description: data.description || '',
        activity_type: data.activity_type || 'Taller',
        max_score: data.max_score || 100,
        weight: data.weight || 1.0,
        activity_date: data.activity_date || new Date().toISOString().slice(0, 10)
      })
    });
    return res?.[0]?.id;
  },

  // ==========================================
  // ESTUDIANTES
  // ==========================================
  async getStudents(courseId) {
    return await supabaseRequest(`students?course_id=eq.${courseId}&order=student_code.asc`) || [];
  },

  async getStudent(id) {
    const students = await supabaseRequest(`students?id=eq.${id}&limit=1`);
    return students?.[0] || null;
  },

  async createStudent(data) {
    const res = await supabaseRequest('students', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        course_id: data.course_id,
        student_code: data.student_code,
        full_name: data.full_name,
        email: data.email || '',
        notes: data.notes || ''
      })
    });
    return res?.[0]?.id;
  },

  // ==========================================
  // CALIFICACIONES
  // ==========================================
  async getStudentGrades(studentId) {
    const rows = await supabaseRequest(`grades?student_id=eq.${studentId}&select=*,activities(title,activity_date,activity_type,max_score,competency_id,competencies(name,code))&order=activities(activity_date).asc`) || [];
    return rows.map(r => ({
      id: r.id,
      student_id: r.student_id,
      activity_id: r.activity_id,
      score: Number(r.score),
      observation: r.observation,
      evidence_type: r.evidence_type,
      evidence_url: r.evidence_url,
      activity_title: r.activities?.title || '',
      activity_date: r.activities?.activity_date || '',
      activity_type: r.activities?.activity_type || 'Taller',
      max_score: r.activities?.max_score || 100,
      competency_id: r.activities?.competency_id,
      competency_name: r.activities?.competencies?.name || '',
      competency_code: r.activities?.competencies?.code || ''
    }));
  },

  async saveGrade(data) {
    await supabaseRequest('grades?on_conflict=student_id,activity_id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        student_id: data.student_id,
        activity_id: data.activity_id,
        score: Number(data.score),
        observation: data.observation || '',
        evidence_type: data.evidence_type || 'Documento',
        evidence_url: data.evidence_url || ''
      })
    });
    return true;
  },

  async getCourseAverage(courseId) {
    const activities = await supabaseRequest(`activities?course_id=eq.${courseId}&select=id`) || [];
    if (activities.length === 0) return null;

    const actIds = activities.map(a => a.id).join(',');
    const grades = await supabaseRequest(`grades?activity_id=in.(${actIds})&select=score`) || [];
    if (grades.length === 0) return null;

    const sum = grades.reduce((acc, g) => acc + Number(g.score), 0);
    return Number((sum / grades.length).toFixed(1));
  },

  // ==========================================
  // INTERVENCIONES
  // ==========================================
  async getInterventions(studentId) {
    return await supabaseRequest(`interventions?student_id=eq.${studentId}&order=date_recorded.desc`) || [];
  },

  async getCourseInterventions(courseId) {
    return await supabaseRequest(`interventions?course_id=eq.${courseId}&order=date_recorded.desc`) || [];
  },

  async countStudentInterventions(studentId) {
    const res = await supabaseRequest(`interventions?student_id=eq.${studentId}&select=id`);
    return (res || []).length;
  },

  async createIntervention(data) {
    const res = await supabaseRequest('interventions', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        student_id: data.student_id,
        course_id: data.course_id,
        situation_detected: data.situation_detected,
        ai_recommendation_summary: data.ai_recommendation_summary || '',
        teacher_decision: data.teacher_decision,
        intervention_type: data.intervention_type || 'Taller de refuerzo',
        score_before: data.score_before !== undefined && data.score_before !== null ? Number(data.score_before) : null,
        score_after: data.score_after !== undefined && data.score_after !== null ? Number(data.score_after) : null,
        status: data.status || 'En curso',
        date_recorded: data.date_recorded || new Date().toISOString().slice(0, 10),
        date_evaluated: data.date_evaluated || null,
        notes: data.notes || ''
      })
    });
    return res?.[0]?.id;
  },

  async updateIntervention(id, data) {
    await supabaseRequest(`interventions?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        score_after: data.score_after !== undefined && data.score_after !== null ? Number(data.score_after) : null,
        date_evaluated: data.date_evaluated || new Date().toISOString().slice(0, 10),
        status: data.status || 'Superada con éxito',
        notes: data.notes || ''
      })
    });
    return true;
  },

  // ==========================================
  // INTELIGENCIA ARTIFICIAL & RÚBRICAS
  // ==========================================
  async getFeedbacks(studentId) {
    const feedbacks = await supabaseRequest(`ai_feedbacks?student_id=eq.${studentId}&order=generated_at.desc`) || [];
    // Unir con rúbricas
    for (const f of feedbacks) {
      const rubrics = await supabaseRequest(`rubric_evaluations?feedback_id=eq.${f.id}&limit=1`);
      if (rubrics && rubrics[0]) {
        f.rubric = rubrics[0];
      }
    }
    return feedbacks;
  },

  async saveFeedback(data) {
    const res = await supabaseRequest('ai_feedbacks', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        student_id: data.student_id,
        model_used: data.model_used,
        summary: data.summary,
        pedagogical_interpretation: data.pedagogical_interpretation,
        recommendation: data.recommendation,
        explicability: data.explicability,
        raw_metrics: data.raw_metrics,
        scenario_type: data.scenario_type || 'B_FULL_CONTEXT'
      })
    });
    return res?.[0]?.id;
  },

  async saveRubricEvaluation(data) {
    const p = Number(data.relevance_score) || 5;
    const cl = Number(data.clarity_score) || 5;
    const co = Number(data.coherence_score) || 5;
    const u = Number(data.pedagogical_utility_score) || 5;
    const s = Number(data.data_backing_score) || 5;
    const l = Number(data.appropriate_language_score) || 5;
    const overall = Number(((p + cl + co + u + s + l) / 6).toFixed(2));

    const res = await supabaseRequest('rubric_evaluations', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        feedback_id: data.feedback_id || null,
        student_id: data.student_id,
        relevance_score: p,
        clarity_score: cl,
        coherence_score: co,
        pedagogical_utility_score: u,
        data_backing_score: s,
        appropriate_language_score: l,
        overall_score: overall,
        teacher_comments: data.teacher_comments || ''
      })
    });
    return {
      rubricId: res?.[0]?.id,
      overallScore: overall
    };
  }
};

module.exports = db;
