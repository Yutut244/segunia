// test-suite.js - Pruebas automatizadas con Supabase PostgreSQL para SeguIA
const assert = require('node:assert');
const db = require('./db');
const {
  calculateLinearRegression,
  countConsecutiveDrops,
  analyzeStudentPerformance
} = require('./analyticsEngine');
const {
  generateHeuristicFeedback,
  generateABComparison
} = require('./aiService');

async function runTestSuite() {
  console.log('====================================================');
  console.log('   EJECUTANDO BATERÍA DE PRUEBAS DE SEGUIA (SUPABASE)');
  console.log('====================================================\n');

  // 1. Prueba de Regresión Lineal y Tendencias
  console.log('[1/6] Probando Motor Estadístico Determinístico...');
  {
    const scoresDescending = [80, 75, 70, 65, 60];
    const reg = calculateLinearRegression(scoresDescending);
    assert.strictEqual(reg.slope, -5, 'La pendiente debe ser exactamente -5');
    assert.strictEqual(reg.rSquared, 1, 'R2 debe ser 1 en una línea perfecta');

    const drops = countConsecutiveDrops(scoresDescending);
    assert.strictEqual(drops, 4, 'Debe contar 4 disminuciones consecutivas');

    const scoresRecovering = [60, 55, 50, 70];
    assert.strictEqual(countConsecutiveDrops(scoresRecovering), 0, 'La última subió, 0 caídas consecutivas al final');
    console.log('  ✓ Regresión lineal y conteo de caídas consecutivas verificados.');
  }

  // 2. Prueba de Principio Ético: Honestidad sobre falta de datos
  console.log('[2/6] Probando Principio Ético: Honestidad sobre Falta de Datos...');
  {
    const fewActivities = [{ score: 70, competency_id: 1 }];
    const result = analyzeStudentPerformance(fewActivities, [], { minActivitiesForTrend: 3 });

    assert.strictEqual(result.insufficientData, true, 'Debe activar bandera de datos insuficientes');
    assert(result.message.includes('No existen suficientes actividades registradas'), 'Debe advertir explícitamente sobre falta de datos');
    console.log('  ✓ Principio de honestidad ante falta de datos verificado.');
  }

  // 3. Prueba de Clasificación de Alertas Responsables (3 niveles)
  console.log('[3/6] Probando Clasificación de Alertas Responsables...');
  {
    const priorityGrades = [
      { score: 75, competency_id: 1 },
      { score: 62, competency_id: 1 },
      { score: 50, competency_id: 1 },
      { score: 45, competency_id: 1 }
    ];
    const priorityAnalysis = analyzeStudentPerformance(priorityGrades, [{ id: 1, name: 'Resolución' }], {});
    assert.strictEqual(priorityAnalysis.alertLevel, 'priority', 'Debe clasificar como Atención prioritaria');
    assert(priorityAnalysis.explicabilityFactors.length >= 2, 'Debe tener múltiples factores de explicabilidad');

    const regularGrades = [
      { score: 85, competency_id: 1 },
      { score: 88, competency_id: 1 },
      { score: 90, competency_id: 1 },
      { score: 92, competency_id: 1 }
    ];
    const regularAnalysis = analyzeStudentPerformance(regularGrades, [{ id: 1, name: 'Resolución' }], {});
    assert.strictEqual(regularAnalysis.alertLevel, 'regular', 'Debe clasificar como Seguimiento regular');
    console.log('  ✓ Clasificación responsable de alertas (Verde, Amarillo, Rojo) verificada.');
  }

  // 4. Prueba del Componente de IA y Explicabilidad
  console.log('[4/6] Probando IA Pedagógica & Explicabilidad Obligatoria...');
  {
    const mockStudent = { id: 1, student_code: 'EST-001', full_name: 'Juan Camilo Pérez' };
    const mockMetrics = {
      hasData: true,
      insufficientData: false,
      studentAverage: 70.5,
      courseAverage: 76.0,
      totalActivities: 5,
      consecutiveDrops: 3,
      alertLevel: 'recommended',
      alertBadge: '🟡 Revisión recomendada',
      trend: { slope: -3.2, direction: 'descendente', label: 'Tendencia descendente (-3.2 pts)' },
      criticalCompetencies: [{ name: 'Resolución de problemas', average: 58.0, gapWithStudentAvg: -12.5 }],
      explicabilityFactors: ['Disminución sostenida en 3 actividades consecutivas']
    };
    const mockObs = [
      { activity_title: 'Taller 2', competency_name: 'Resolución de problemas', score: 65, text: 'Dificultad al traducir enunciados a operaciones.' }
    ];

    const feedback = generateHeuristicFeedback({
      studentIdentifier: 'EST-001',
      metrics: mockMetrics,
      observations: mockObs
    });

    assert(feedback.summary.length > 20, 'Debe generar resumen de progreso');
    assert(feedback.pedagogicalInterpretation.length > 20, 'Debe generar interpretación pedagógica');
    assert(feedback.recommendation.length > 20, 'Debe generar recomendación orientada al docente');
    assert(feedback.explicability.includes('¿Por qué aparece esta recomendación?'), 'Debe incluir sección de explicabilidad obligatoria');
    assert(!feedback.pedagogicalInterpretation.includes('reprobará'), 'No debe usar palabras diagnósticas punitivas');
    console.log('  ✓ Retroalimentación contextualizada con explicabilidad auditada verificada.');
  }

  // 5. Prueba de Comparativa A/B (Escenario A vs. Escenario B)
  console.log('[5/6] Probando Laboratorio Comparativo A/B (Sección 6 del Briefing)...');
  {
    const mockStudent = { id: 1, student_code: 'EST-001', full_name: 'Juan Camilo Pérez' };
    const mockMetrics = {
      hasData: true,
      studentAverage: 65,
      scores: [78, 65, 55],
      consecutiveDrops: 2,
      trend: { slope: -11.5, label: 'Descenso marcado' },
      alertLevel: 'recommended',
      alertBadge: '🟡 Revisión recomendada',
      explicabilityFactors: ['Caída continua en dos evaluaciones']
    };

    const ab = await generateABComparison(mockStudent, mockMetrics, [
      { activity_title: 'Examen', competency_name: 'Problemas', score: 55, text: 'Bloqueo en el tercer ejercicio verbal' }
    ]);

    assert(ab.scenarioA, 'Debe contener Escenario A');
    assert(ab.scenarioB, 'Debe contener Escenario B');
    assert.strictEqual(ab.scenarioA.rubricPreview.totalPromedio < ab.scenarioB.rubricPreview.totalPromedio, true, 'El Escenario B debe superar pedagógicamente al Escenario A');
    console.log('  ✓ Laboratorio comparativo A/B y rúbrica contrastada verificados.');
  }

  // 6. Prueba de Persistencia en Supabase PostgreSQL
  console.log('[6/6] Probando Persistencia en Supabase PostgreSQL...');
  {
    const courses = await db.getCourses();
    assert(courses.length >= 2, 'Deben existir al menos 2 cursos en Supabase');

    const interventions = await db.getInterventions(1);
    assert(interventions.length > 0, 'Debe existir la intervención del caso ejemplo de Juan Camilo en Supabase');
    const intervention = interventions[0];
    assert.strictEqual(Number(intervention.score_before), 55, 'Score antes debe ser 55');
    assert.strictEqual(Number(intervention.score_after), 68, 'Score después debe ser 68');
    assert.strictEqual(Number(intervention.score_after) - Number(intervention.score_before), 13, 'El impacto medido debe ser +13 puntos');
    console.log('  ✓ Conexión en la nube con Supabase y medición de impacto (+13 pts) verificadas.');
  }

  console.log('\n====================================================');
  console.log('   ¡TODAS LAS PRUEBAS (6/6) PASARON EXITOSAMENTE!');
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('Error en batería de pruebas:', err);
  process.exit(1);
});
