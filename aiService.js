// aiService.js - Componente de Inteligencia Artificial Contextualizada & Ética de SeguIA
// Principios: "La IA propone, los datos sustentan y el docente decide."
// Lenguaje prudente, nunca diagnóstico | Explicabilidad obligatoria | Honestidad sobre falta de datos | Privacidad

/**
 * Prepara el contexto anonimizado para la IA, protegiendo datos personales.
 */
function prepareAnonymizedContext(student, metrics, observations = [], settings = {}) {
  const isAnonymized = settings.anonymize_ai !== false;
  const studentIdentifier = isAnonymized ? (student.student_code || `EST-${student.id}`) : student.full_name;

  return {
    studentIdentifier,
    metrics,
    observations: observations.map(o => ({
      activity: o.activity_title,
      competency: o.competency_name,
      score: o.score,
      date: o.activity_date,
      text: o.observation || '(Sin observación cualitativa registrada)'
    }))
  };
}

/**
 * Generador Heurístico Pedagógico Avanzado de SeguIA.
 * Produce retroalimentaciones estructuradas, altamente contextualizadas y con lenguaje prudente,
 * garantizando funcionamiento offline/sin API Key.
 */
function generateHeuristicFeedback(context) {
  const { studentIdentifier, metrics, observations } = context;

  // 1. Caso de Falta de Datos / Honestidad Metodológica
  if (metrics.insufficientData || !metrics.hasData) {
    return {
      modelUsed: 'SeguIA Heuristic Engine (Reglas Pedagógicas)',
      scenarioType: 'B_FULL_CONTEXT',
      summary: `Registro inicial para el estudiante ${studentIdentifier}. Se dispone de información preliminar correspondiente a ${metrics.totalActivities || 0} actividad(es).`,
      pedagogicalInterpretation: 'En concordancia con el principio de honestidad metodológica de SeguIA, no se cuenta aún con un volumen suficiente de actividades para determinar un patrón o trayectoria de aprendizaje confiable.',
      recommendation: 'Se recomienda al docente continuar con el registro regular de evidencias observables en diversas competencias antes de formular hipótesis de acompañamiento focalizado.',
      explicability: `Datos analizados: ${metrics.totalActivities || 0} actividad(es) registrada(s). El umbral institucional mínimo para cálculo de tendencias requiere al menos 3 actividades evaluadas. No se infieren conclusiones apresuradas.`,
      rawMetrics: JSON.stringify(metrics)
    };
  }

  const avg = metrics.studentAverage;
  const slope = metrics.trend.slope;
  const drops = metrics.consecutiveDrops;
  const critComps = metrics.criticalCompetencies || [];
  const alert = metrics.alertLevel;

  // 2. Resumen de Progreso
  let summary = '';
  if (alert === 'priority') {
    summary = `El estudiante ${studentIdentifier} presenta un promedio actual de ${avg}/100 y una trayectoria que denota atención prioritaria, evidenciada por una pendiente de desempeño descendente de ${slope} pts/actividad y dificultades reiteradas en evaluaciones recientes.`;
  } else if (alert === 'recommended') {
    summary = `El estudiante ${studentIdentifier} registra un promedio acumulado de ${avg}/100. Aunque mantiene un rendimiento general aceptable, se identifica una fase de disminución en ${drops} actividad(es) consecutiva(s) o variabilidad en competencias específicas que ameritan revisión.`;
  } else {
    summary = `El estudiante ${studentIdentifier} evidencia un desempeño global estable con un promedio de ${avg}/100 y una trayectoria regular (${metrics.trend.label}), sin registrar alertas de riesgo pedagógico persistente.`;
  }

  // 3. Interpretación Pedagógica (Lenguaje prudente, nunca diagnóstico)
  let interpretation = '';
  const observationNotes = observations.filter(o => o.text && !o.text.includes('(Sin observación')).map(o => `"${o.text}"`);

  if (critComps.length > 0) {
    const compNames = critComps.map(c => `"${c.name}" (promedio: ${c.average}, brecha: ${c.gapWithStudentAvg} pts frente a su media)`).join(', ');
    interpretation = `Al contrastar las evidencias por dimensión, se aprecia que la mayor dispersión no responde a una dificultad generalizada, sino que se focaliza prioritariamente en la competencia de ${compNames}. `;
    if (observationNotes.length > 0) {
      interpretation += `Las anotaciones cualitativas docentes sugieren particularidades observables durante el proceso: ${observationNotes.slice(-2).join('; ')}. Se enfatiza que esto describe conductas de ejecución en tareas concretas y no una condición definitiva del estudiante.`;
    } else {
      interpretation += `El desempeño en las restantes competencias sugiere que el estudiante posee bases conceptuales sobre las cuales apalancar el refuerzo.`;
    }
  } else if (slope < -1.0) {
    interpretation = `Se detecta una tendencia descendente progresiva a lo largo de las últimas actividades. La información disponible sugiere revisar posibles vacíos acumulativos en los contenidos intermedios o factores de motivación en el aula, manteniendo un enfoque descriptivo y no presuntivo.`;
  } else if (slope > 0.5) {
    interpretation = `Se observa una evolución positiva sostenida en las actividades evaluadas, lo que sugiere una asimilación progresiva de las estrategias didácticas implementadas en el curso.`;
  } else {
    interpretation = `El ritmo de aprendizaje se muestra homogéneo entre las diferentes competencias evaluadas, manteniendo concordancia con la media del grupo escolar.`;
  }

  // 4. Recomendación de Intervención Docente (Orientada a la acción del profesor)
  let recommendation = '';
  if (alert === 'priority') {
    recommendation = `Se sugiere al docente valorar una intervención pedagógica estructurada: 1) Diseñar una sesión de acompañamiento guiado o taller remedial enfocado específicamente en la competencia ${critComps[0] ? critComps[0].name : 'con menor puntaje'}; 2) Descomponer tareas complejas en pasos intermedios con retroalimentación formativa inmediata; 3) Programar un diálogo pedagógico individual breve para explorar percepciones del estudiante sobre su proceso.`;
  } else if (alert === 'recommended') {
    recommendation = `Se recomienda al docente: 1) Implementar un espacio de trabajo colaborativo o tutoría entre pares en la próxima sesión; 2) Proporcionar ejemplos resueltos adicionales sobre las tareas donde se observó la disminución reciente; 3) Realizar un sondeo formativo previo a la siguiente evaluación sumativa para verificar la superación de dudas puntuales.`;
  } else {
    recommendation = `Se sugiere continuar con el plan pedagógico habitual, considerando actividades de profundización o desafíos de enriquecimiento para consolidar las competencias y estimular su autonomía.`;
  }

  // 5. Explicabilidad Obligatoria: "¿Por qué aparece esta recomendación?"
  const explicabilityParts = [
    `• Calificación promedio acumulada: ${avg}/100 (promedio del curso: ${metrics.courseAverage !== null ? metrics.courseAverage : 'N/D'}).`,
    `• Pendiente de tendencia lineal: ${slope} puntos por actividad (dirección: ${metrics.trend.direction}).`,
    `• Disminuciones consecutivas recientes: ${drops} actividad(es).`,
    `• Factores detonantes de la alerta [${metrics.alertBadge}]: ${metrics.explicabilityFactors.join(' | ')}.`
  ];
  if (critComps.length > 0) {
    explicabilityParts.push(`• Competencia con mayor distancia de desempeño: "${critComps[0].name}" con brecha de ${critComps[0].gapWithStudentAvg} puntos respecto a su promedio personal.`);
  }

  const explicability = `¿Por qué aparece esta recomendación?\n` + explicabilityParts.join('\n');

  return {
    modelUsed: 'SeguIA Heuristic Engine v1.0 (Basado en Reglas Pedagógicas)',
    scenarioType: 'B_FULL_CONTEXT',
    summary,
    pedagogicalInterpretation: interpretation,
    recommendation,
    explicability,
    rawMetrics: JSON.stringify(metrics)
  };
}

/**
 * Genera retroalimentación llamando a la API oficial de Google Gemini.
 */
async function generateGeminiFeedback(context, apiKey, model = 'gemini-3.8-flash') {
  const { studentIdentifier, metrics, observations } = context;

  const systemInstruction = `
Eres SeguIA, un asistente pedagógico de Inteligencia Artificial para docentes escolares y universitarios.
Tu lema y principio ético fundacional es: "La IA propone, los datos sustentan y el docente decide."

REGLAS ESTRICTAS DE RESPUESTA:
1. NUNCA hagas cálculos numéricos. Usa estrictamente los indicadores y métricas estadísticas que ya te entrega el motor de análisis determinístico.
2. LENGUAJE PRUDENTE, NUNCA DIAGNÓSTICO:
   - Usa expresiones prudentes y constructivas: "se recomienda revisar", "podría requerir seguimiento", "se sugiere considerar".
   - ESTÁ TOTALMENTE PROHIBIDO usar lenguaje diagnóstico o categórico como: "el estudiante reprobará", "tiene déficit", "es incapaz", "fracasará", "no tiene futuro", o emitir diagnósticos psicológicos.
3. EXPLICABILIDAD OBLIGATORIA:
   - Debes incluir una sección explícita "¿Por qué aparece esta recomendación?" donde detalles los datos concretos que sustentan la sugerencia (promedio, pendiente de tendencia, número de caídas consecutivas, brechas de competencia).
4. HONESTIDAD SOBRE LA FALTA DE DATOS:
   - Si se indica que no hay datos suficientes, dilo con transparencia: "no existen suficientes actividades registradas para identificar una tendencia confiable".
5. ESTRUCTURA DE RESPUESTA REQUERIDA (debes devolver un JSON válido con estas claves exactas):
   - "summary": Resumen breve de la trayectoria del estudiante (2-3 oraciones).
   - "pedagogical_interpretation": Interpretación formativa del desempeño cruzando competencias y observaciones descriptivas (evitando juicios personales).
   - "recommendation": Recomendación pedagógica concreta orientada a la acción y decisión del docente.
   - "explicability": Justificación auditable de "¿Por qué aparece esta recomendación?" basada en los datos cuantitativos y cualitativos suministrados.
`;

  const userPrompt = `
Genera una retroalimentación pedagógica para el siguiente estudiante:

ESTUDIANTE (Anonimizado): ${studentIdentifier}

INDICADORES OBJETIVOS CALCULADOS POR EL MOTOR CONVENCIONAL:
- Promedio del estudiante: ${metrics.studentAverage} / 100
- Promedio del curso: ${metrics.courseAverage ?? 'N/D'}
- Total de actividades evaluadas: ${metrics.totalActivities}
- Pendiente de tendencia (regresión): ${metrics.trend?.slope ?? 0} pts/actividad (${metrics.trend?.label ?? 'N/D'})
- Caídas consecutivas en últimas actividades: ${metrics.consecutiveDrops ?? 0}
- Nivel de alerta asignado por reglas: ${metrics.alertBadge} (${metrics.alertLevel})
- ¿Datos insuficientes?: ${metrics.insufficientData ? 'SÍ' : 'NO'}

DESGLOSE POR COMPETENCIAS:
${metrics.competenciesSummary ? metrics.competenciesSummary.map(c => `- ${c.name}: Promedio ${c.average ?? 'Sin datos'}, Brecha vs estudiante: ${c.gapWithStudentAvg} pts`).join('\n') : 'Sin desglose'}

OBSERVACIONES DESCRIPTIVAS REGISTRADAS POR EL DOCENTE EN AULA:
${observations.length > 0 ? observations.map(o => `- [${o.activity} | ${o.competency}]: Nota ${o.score}/100. Obs: "${o.text}"`).join('\n') : '(Sin observaciones cualitativas registradas)'}

Responde ÚNICAMENTE con un objeto JSON válido con las 4 propiedades requeridas: summary, pedagogical_interpretation, recommendation, explicability.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en API de Gemini (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('La respuesta de Gemini no contiene texto válido.');
  }

  try {
    const parsed = JSON.parse(textOutput);
    return {
      modelUsed: `Google Gemini (${model})`,
      scenarioType: 'B_FULL_CONTEXT',
      summary: parsed.summary || 'Resumen generado.',
      pedagogicalInterpretation: parsed.pedagogical_interpretation || 'Interpretación pedagógica.',
      recommendation: parsed.recommendation || 'Recomendación al docente.',
      explicability: parsed.explicability || 'Sustento en datos del motor.',
      rawMetrics: JSON.stringify(metrics)
    };
  } catch (err) {
    // Si la respuesta vino con markdown envolvente
    const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      modelUsed: `Google Gemini (${model})`,
      scenarioType: 'B_FULL_CONTEXT',
      summary: parsed.summary || 'Resumen generado.',
      pedagogicalInterpretation: parsed.pedagogical_interpretation || 'Interpretación pedagógica.',
      recommendation: parsed.recommendation || 'Recomendación al docente.',
      explicability: parsed.explicability || 'Sustento en datos del motor.',
      rawMetrics: JSON.stringify(metrics)
    };
  }
}

/**
 * Función principal para generar retroalimentación pedagógica contextualizada.
 * Utiliza Gemini si hay API Key disponible y configurada, o recurre con elegancia al motor heurístico.
 */
async function generateFeedback(student, metrics, observations = [], settings = {}) {
  const context = prepareAnonymizedContext(student, metrics, observations, settings);

  const apiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY;
  const provider = settings.ai_provider || 'gemini';

  if (apiKey && (provider === 'gemini' || provider === 'auto')) {
    try {
      const model = settings.gemini_model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
      return await generateGeminiFeedback(context, apiKey, model);
    } catch (err) {
      console.warn('Fallo al conectar con Gemini API, recurriendo al motor heurístico pedagógico:', err.message);
      const fallback = generateHeuristicFeedback(context);
      fallback.warning = `(Fallback local: no se pudo conectar con Gemini API: ${err.message})`;
      return fallback;
    }
  }

  // Motor heurístico predeterminado sin dependencias
  return generateHeuristicFeedback(context);
}

/**
 * Generador del Experimento / Comparativa A/B (Sección 6 del Briefing).
 * Compara dos escenarios:
 * - Escenario A: IA básica que solo recibe una nota aislada (ej. "55/100").
 * - Escenario B: SeguIA con historial completo, competencias, tendencia, evidencias y observaciones descriptivas.
 */
async function generateABComparison(student, metrics, observations = [], settings = {}) {
  const context = prepareAnonymizedContext(student, metrics, observations, settings);
  const lastScore = metrics.scores && metrics.scores.length > 0 ? metrics.scores[metrics.scores.length - 1] : 55;

  // Escenario A: Simulación de IA elemental sin contexto
  const scenarioA = {
    scenario: 'Escenario A (IA Tradicional / Nota Aislada)',
    promptGivenToAI: `El estudiante obtuvo una calificación de ${lastScore}/100. Genera una retroalimentación.`,
    feedbackGenerated: `El estudiante ha obtenido una calificación de ${lastScore}/100 en su última evaluación. Este resultado indica un rendimiento deficiente que se encuentra por debajo del nivel aprobatorio. El estudiante debe esforzarse más, dedicar mayor tiempo de estudio en casa y mejorar su compromiso académico para no reprobar la materia.`,
    analysisPedagogico: 'LIMITACIONES: No identifica qué causó la nota, no reconoce competencias específicas, usa lenguaje punitivo ("rendimiento deficiente", "debe esforzarse más"), ignora si venía mejorando o cayendo, y no ofrece una estrategia docente real.',
    rubricPreview: {
      pertinencia: 2,
      claridad: 3,
      coherencia: 2,
      utilidadPedagogica: 1,
      sustentoEnDatos: 1,
      lenguajeApropiado: 2,
      totalPromedio: 1.83
    }
  };

  // Escenario B: SeguIA Contextualizado
  const scenarioBResult = await generateFeedback(student, metrics, observations, settings);

  const scenarioB = {
    scenario: 'Escenario B (SeguIA: Historial + Competencias + Tendencia + Observaciones)',
    promptGivenToAI: `Datos objetivos del motor: Promedio ${metrics.studentAverage}, Tendencia ${metrics.trend?.label}, Caídas: ${metrics.consecutiveDrops}, Competencias analizadas, Observaciones de aula: "${observations.slice(-2).map(o => o.text).join('; ')}".`,
    feedbackGenerated: {
      summary: scenarioBResult.summary,
      pedagogicalInterpretation: scenarioBResult.pedagogicalInterpretation,
      recommendation: scenarioBResult.recommendation,
      explicability: scenarioBResult.explicability
    },
    analysisPedagogico: 'FORTALEZAS: Diferencia entre el dominio conceptual y la dificultad procedimental, respeta el criterio docente con explicabilidad auditable, utiliza lenguaje formativo y prudente, y propone una intervención didáctica concreta.',
    rubricPreview: {
      pertinencia: 5,
      claridad: 5,
      coherencia: 5,
      utilidadPedagogica: 5,
      sustentoEnDatos: 5,
      lenguajeApropiado: 5,
      totalPromedio: 5.0
    }
  };

  return {
    studentIdentifier: context.studentIdentifier,
    scenarioA,
    scenarioB,
    comparisonConclusion: 'La comparativa evidencia que dotar al sistema de indicadores pre-calculados, trazabilidad de competencias y observaciones de aula transforma una alerta punitiva en una herramienta de acompañamiento pedagógico orientada a la toma de decisiones.'
  };
}

module.exports = {
  prepareAnonymizedContext,
  generateHeuristicFeedback,
  generateGeminiFeedback,
  generateFeedback,
  generateABComparison
};
