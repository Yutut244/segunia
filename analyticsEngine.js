// analyticsEngine.js - Motor de Análisis Estadístico Determinístico de SeguIA
// Principio Pedagógico Fundacional: "La IA no hace los cálculos. El motor convencional
// calcula promedios, tendencias y variaciones objetivas. La IA recibe estos indicadores ya calculados."

/**
 * Calcula regresión lineal simple (pendiente m y coeficiente r) sobre una serie de valores cronológicos.
 * x: 1, 2, ..., n
 * y: scores
 */
function calculateLinearRegression(values) {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] || 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R cuadrado
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = values[i];
    const yPred = slope * x + intercept;
    ssTot += Math.pow(y - yMean, 2);
    ssRes += Math.pow(y - yPred, 2);
  }

  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return {
    slope: Number(slope.toFixed(3)),
    intercept: Number(intercept.toFixed(2)),
    rSquared: Number(rSquared.toFixed(3))
  };
}

/**
 * Cuenta cuántas disminuciones consecutivas existen en las actividades más recientes.
 */
function countConsecutiveDrops(values) {
  if (values.length < 2) return 0;
  let drops = 0;
  for (let i = values.length - 1; i > 0; i--) {
    if (values[i] < values[i - 1]) {
      drops++;
    } else {
      break;
    }
  }
  return drops;
}

/**
 * Analiza el historial académico completo de un estudiante dentro de un curso.
 * Retorna indicadores objetivos, auditoría de explicabilidad y nivel de alerta responsable.
 * 
 * @param {Array} gradesHistory Lista ordenada cronológicamente de calificaciones
 * @param {Array} competencies Lista de competencias del curso
 * @param {Object} thresholds Umbrales configurables
 * @param {Number} courseAverage Promedio general del grupo
 */
function analyzeStudentPerformance(gradesHistory, competencies = [], thresholds = {}, courseAverage = null) {
  const config = {
    minActivitiesForTrend: thresholds.minActivitiesForTrend || 3,
    consecutiveDropsThreshold: thresholds.consecutive_drops_threshold || 3,
    dropDeltaThreshold: thresholds.drop_delta_threshold || 10,
    prioritySlopeThreshold: thresholds.priority_alert_slope || -1.5,
    passingGrade: thresholds.passing_grade || 60,
    competencyGapThreshold: thresholds.competency_gap_threshold || 12
  };

  const totalActivities = gradesHistory.length;

  // Validación de Honestidad ante falta de datos
  if (totalActivities === 0) {
    return {
      hasData: false,
      insufficientData: true,
      message: 'No existen actividades registradas para este estudiante.',
      alertLevel: 'regular',
      alertBadge: 'Sin registros',
      average: 0,
      trend: { slope: 0, direction: 'indeterminada', label: 'Sin datos suficientes' },
      competenciesSummary: [],
      explicabilityFactors: ['No hay datos suficientes para formular interpretaciones objetivas.']
    };
  }

  const scores = gradesHistory.map(g => Number(g.score));
  const sumScores = scores.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sumScores / totalActivities).toFixed(1));

  // Menos del umbral mínimo de actividades para inferir tendencias (Honestidad sobre datos)
  if (totalActivities < config.minActivitiesForTrend) {
    return {
      hasData: true,
      insufficientData: true,
      message: `El estudiante cuenta con solo ${totalActivities} actividad(es) registrada(s). No existen suficientes actividades registradas para identificar una tendencia confiable.`,
      alertLevel: 'regular',
      alertBadge: 'Datos preliminares',
      average,
      totalActivities,
      consecutiveDrops: 0,
      trend: {
        slope: 0,
        direction: 'preliminar',
        label: 'Datos iniciales (insuficiente para proyectar tendencia)'
      },
      competenciesSummary: summarizeCompetencies(gradesHistory, competencies, average),
      explicabilityFactors: [
        `Registradas ${totalActivities} de un mínimo sugerido de ${config.minActivitiesForTrend} para análisis predictivo o de tendencia.`,
        'El sistema mantiene prudencia metodológica y no infiere patrones precipitados.'
      ]
    };
  }

  // Análisis de Tendencia y Progresión
  const regression = calculateLinearRegression(scores);
  const consecutiveDrops = countConsecutiveDrops(scores);
  
  // Comparación entre primer bloque y último bloque de actividades
  const midpoint = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, midpoint);
  const secondHalf = scores.slice(midpoint);
  const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
  const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
  const periodDelta = Number((secondHalfAvg - firstHalfAvg).toFixed(1));

  // Última variación directa
  const lastScore = scores[scores.length - 1];
  const previousScore = scores[scores.length - 2];
  const lastVariation = Number((lastScore - previousScore).toFixed(1));

  // Análisis por Competencias
  const compSummary = summarizeCompetencies(gradesHistory, competencies, average);

  // Identificar competencias críticas (por debajo de la media del estudiante)
  const criticalCompetencies = compSummary.filter(c => c.gapWithStudentAvg <= -config.competencyGapThreshold);

  // Identificar notas bajas repetidas
  const lowScoresCount = scores.filter(s => s < config.passingGrade).length;

  // Clasificación de Alertas Responsables (3 niveles según Section 8)
  const explicabilityReasons = [];
  let alertLevel = 'regular';
  let alertBadge = 'Seguimiento regular';

  // Condiciones de Atención Prioritaria
  const isSevereSlope = regression.slope <= config.prioritySlopeThreshold;
  const isMultipleLowScores = lowScoresCount >= 2;
  const isPersistentDrops = consecutiveDrops >= config.consecutiveDropsThreshold;
  const hasCriticalComp = criticalCompetencies.length > 0;

  // Si coinciden varios factores graves:
  const priorityFactorsCount = (isSevereSlope ? 1 : 0) + 
                               (isMultipleLowScores ? 1 : 0) + 
                               (isPersistentDrops ? 1 : 0) + 
                               (hasCriticalComp ? 1 : 0);

  if (priorityFactorsCount >= 2 || (isSevereSlope && isMultipleLowScores)) {
    alertLevel = 'priority';
    alertBadge = 'Atención prioritaria';
    if (isSevereSlope) {
      explicabilityReasons.push(`Pendiente descendente prolongada de desempeño (tasa: ${regression.slope} pts/actividad).`);
    }
    if (isMultipleLowScores) {
      explicabilityReasons.push(`${lowScoresCount} evaluaciones por debajo de la nota aprobatoria (${config.passingGrade} pts).`);
    }
    if (isPersistentDrops) {
      explicabilityReasons.push(`Caída continua en las últimas ${consecutiveDrops} actividades consecutivas.`);
    }
    if (hasCriticalComp) {
      criticalCompetencies.forEach(c => {
        explicabilityReasons.push(`Dificultad recurrente concentrada en la competencia "${c.name}" (promedio: ${c.average}, brecha de ${c.gapWithStudentAvg} pts vs su media).`);
      });
    }
  }
  // Condiciones de Revisión Recomendada
  else if (
    consecutiveDrops >= config.consecutiveDropsThreshold ||
    hasCriticalComp ||
    regression.slope < -0.8 ||
    (lastScore < config.passingGrade)
  ) {
    alertLevel = 'recommended';
    alertBadge = 'Revisión recomendada';
    if (consecutiveDrops >= config.consecutiveDropsThreshold) {
      explicabilityReasons.push(`Disminución sostenida en ${consecutiveDrops} actividades consecutivas.`);
    }
    if (hasCriticalComp) {
      criticalCompetencies.forEach(c => {
        explicabilityReasons.push(`Rendimiento en la competencia "${c.name}" (${c.average}) consistentemente bajo respecto al promedio del estudiante (${average}).`);
      });
    }
    if (regression.slope < -0.8 && !isSevereSlope) {
      explicabilityReasons.push(`Tendencia descendente moderada detectada (pendiente: ${regression.slope} pts/actividad).`);
    }
    if (lastScore < config.passingGrade) {
      explicabilityReasons.push(`Última actividad calificada (${lastScore} pts) por debajo del umbral mínimo institucional (${config.passingGrade} pts).`);
    }
  }
  // Seguimiento Regular
  else {
    alertLevel = 'regular';
    alertBadge = 'Seguimiento regular';
    explicabilityReasons.push(`Desempeño general estable o en ascenso (${average} pts promedio).`);
    if (regression.slope >= 0.5) {
      explicabilityReasons.push(`Tendencia ascendente favorable (+${regression.slope} pts/actividad).`);
    } else {
      explicabilityReasons.push('Sin fluctuaciones abruptas ni dificultades recurrentes en competencias.');
    }
  }

  // Dirección de tendencia en lenguaje descriptivo
  let trendDirection = 'estable';
  let trendLabel = 'Desempeño estable';
  if (regression.slope > 1.0) {
    trendDirection = 'ascendente';
    trendLabel = `En notable ascenso (+${regression.slope} pts/actividad)`;
  } else if (regression.slope > 0.3) {
    trendDirection = 'ligero_ascenso';
    trendLabel = `En ligera mejoría (+${regression.slope} pts/actividad)`;
  } else if (regression.slope < -1.5) {
    trendDirection = 'descendente_marcada';
    trendLabel = `Tendencia descendente pronunciada (${regression.slope} pts/actividad)`;
  } else if (regression.slope < -0.3) {
    trendDirection = 'descendente';
    trendLabel = `Tendencia descendente (${regression.slope} pts/actividad)`;
  }

  return {
    hasData: true,
    insufficientData: false,
    studentAverage: average,
    totalActivities,
    scores,
    courseAverage: courseAverage !== null ? Number(courseAverage.toFixed(1)) : null,
    diffFromCourseAvg: courseAverage !== null ? Number((average - courseAverage).toFixed(1)) : null,
    trend: {
      slope: regression.slope,
      intercept: regression.intercept,
      rSquared: regression.rSquared,
      direction: trendDirection,
      label: trendLabel,
      periodDelta,
      lastVariation
    },
    consecutiveDrops,
    lowScoresCount,
    alertLevel,
    alertBadge,
    criticalCompetencies,
    competenciesSummary: compSummary,
    explicabilityFactors: explicabilityReasons
  };
}

/**
 * Agrupa y promedia resultados por competencia para un estudiante.
 */
function summarizeCompetencies(gradesHistory, competencies = [], studentAvg = 0) {
  const map = new Map();

  // Inicializar todas las competencias disponibles
  competencies.forEach(comp => {
    map.set(comp.id, {
      id: comp.id,
      code: comp.code,
      name: comp.name,
      description: comp.description,
      scores: [],
      observations: []
    });
  });

  // Mapear notas
  gradesHistory.forEach(g => {
    const compId = g.competency_id;
    if (map.has(compId)) {
      map.get(compId).scores.push(Number(g.score));
      if (g.observation) {
        map.get(compId).observations.push(g.observation);
      }
    }
  });

  const summary = [];
  for (const item of map.values()) {
    const count = item.scores.length;
    const avg = count > 0 ? Number((item.scores.reduce((a, b) => a + b, 0) / count).toFixed(1)) : null;
    const gap = avg !== null ? Number((avg - studentAvg).toFixed(1)) : 0;

    summary.push({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      activitiesCount: count,
      average: avg,
      gapWithStudentAvg: gap,
      observations: item.observations
    });
  }

  return summary;
}

/**
 * Analiza métricas globales del curso (para el panel general de seguimiento).
 */
function analyzeCourseOverview(studentsStats) {
  if (!studentsStats || studentsStats.length === 0) {
    return {
      totalStudents: 0,
      courseAverage: 0,
      alertCounts: { priority: 0, recommended: 0, regular: 0 },
      topAlerts: []
    };
  }

  const validStats = studentsStats.filter(s => s.hasData && !s.insufficientData);
  const totalAvg = validStats.length > 0 
    ? Number((validStats.reduce((sum, s) => sum + s.studentAverage, 0) / validStats.length).toFixed(1))
    : 0;

  const alertCounts = {
    priority: studentsStats.filter(s => s.alertLevel === 'priority').length,
    recommended: studentsStats.filter(s => s.alertLevel === 'recommended').length,
    regular: studentsStats.filter(s => s.alertLevel === 'regular').length
  };

  return {
    totalStudents: studentsStats.length,
    evaluatedStudents: validStats.length,
    courseAverage: totalAvg,
    alertCounts,
    priorityPercentage: Number(((alertCounts.priority / studentsStats.length) * 100).toFixed(1)),
    recommendedPercentage: Number(((alertCounts.recommended / studentsStats.length) * 100).toFixed(1)),
    regularPercentage: Number(((alertCounts.regular / studentsStats.length) * 100).toFixed(1))
  };
}

module.exports = {
  calculateLinearRegression,
  countConsecutiveDrops,
  analyzeStudentPerformance,
  summarizeCompetencies,
  analyzeCourseOverview
};
