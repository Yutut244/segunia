// init-supabase.js - Inicializador y Sembrador de Supabase PostgreSQL para SeguIA
const tls = require('node:tls');
const net = require('node:net');

const host = process.env.POSTGRES_HOST_POOLER || 'aws-0-us-east-1.pooler.supabase.com';
const port = 6543;
const user = process.env.POSTGRES_USER_POOLER || 'postgres.hzmhmdkzywjzaatlrvui';
const password = process.env.POSTGRES_PASSWORD || 'ZjshGVLOnfaAWaKm';
const database = 'postgres';

function executeQuery(sql) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port }, () => {
      const sslBuf = Buffer.alloc(8);
      sslBuf.writeInt32BE(8, 0);
      sslBuf.writeInt32BE(80877103, 4);
      socket.write(sslBuf);
    });

    socket.once('data', (data) => {
      if (data.toString('utf8') !== 'S') {
        return reject(new Error('SSL no soportado por el servidor'));
      }

      const tlsSocket = tls.connect({ socket, host, rejectUnauthorized: false }, () => {
        const params = ['user', user, 'database', database, 'client_encoding', 'UTF8', ''];
        const paramBufs = params.map(p => Buffer.from(p + '\0'));
        const body = Buffer.concat([Buffer.from([0, 3, 0, 0]), ...paramBufs]);
        const header = Buffer.alloc(4);
        header.writeInt32BE(4 + body.length, 0);
        tlsSocket.write(Buffer.concat([header, body]));
      });

      let authenticated = false;
      let buffer = Buffer.alloc(0);
      let rows = [];
      let fields = [];

      tlsSocket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 5) {
          const type = String.fromCharCode(buffer[0]);
          const len = buffer.readInt32BE(1);
          if (buffer.length < 1 + len) break;

          const msg = buffer.subarray(1, 1 + len);
          buffer = buffer.subarray(1 + len);

          if (type === 'R') {
            const authCode = msg.readInt32BE(4);
            if (authCode === 3) {
              const passBuf = Buffer.from(password + '\0', 'utf8');
              const pHeader = Buffer.alloc(5);
              pHeader[0] = 'p'.charCodeAt(0);
              pHeader.writeInt32BE(4 + passBuf.length, 1);
              tlsSocket.write(Buffer.concat([pHeader, passBuf]));
            } else if (authCode === 0) {
              authenticated = true;
            }
          } else if (type === 'Z') {
            if (authenticated && sql) {
              const qBuf = Buffer.from(sql + '\0', 'utf8');
              const qHeader = Buffer.alloc(5);
              qHeader[0] = 'Q'.charCodeAt(0);
              qHeader.writeInt32BE(4 + qBuf.length, 1);
              tlsSocket.write(Buffer.concat([qHeader, qBuf]));
              sql = null;
            } else {
              tlsSocket.end();
              resolve({ fields, rows });
            }
          } else if (type === 'T') {
            const numFields = msg.readInt16BE(4);
            let offset = 6;
            fields = [];
            for (let i = 0; i < numFields; i++) {
              const nullIdx = msg.indexOf(0, offset);
              fields.push(msg.toString('utf8', offset, nullIdx));
              offset = nullIdx + 1 + 18;
            }
          } else if (type === 'D') {
            const numCols = msg.readInt16BE(4);
            let offset = 6;
            const row = {};
            for (let i = 0; i < numCols; i++) {
              const colLen = msg.readInt32BE(offset);
              offset += 4;
              if (colLen === -1) {
                row[fields[i]] = null;
              } else {
                row[fields[i]] = msg.toString('utf8', offset, offset + colLen);
                offset += colLen;
              }
            }
            rows.push(row);
          } else if (type === 'E') {
            const errMsg = msg.toString('utf8');
            tlsSocket.end();
            return reject(new Error('PostgreSQL Error: ' + errMsg));
          }
        }
      });

      tlsSocket.on('error', reject);
    });

    socket.on('error', reject);
  });
}

async function setupSupabase() {
  console.log('--- Configurando esquema en Supabase PostgreSQL ---');

  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      teacher_name TEXT NOT NULL,
      grade_scale_min DOUBLE PRECISION DEFAULT 0,
      grade_scale_max DOUBLE PRECISION DEFAULT 100,
      passing_grade DOUBLE PRECISION DEFAULT 60,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS competencies (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      competency_id INTEGER NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      activity_type TEXT DEFAULT 'Taller',
      max_score DOUBLE PRECISION DEFAULT 100,
      weight DOUBLE PRECISION DEFAULT 1.0,
      activity_date TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grades (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      score DOUBLE PRECISION NOT NULL,
      observation TEXT,
      evidence_type TEXT DEFAULT 'Documento',
      evidence_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, activity_id)
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      situation_detected TEXT NOT NULL,
      ai_recommendation_summary TEXT,
      teacher_decision TEXT NOT NULL,
      intervention_type TEXT NOT NULL,
      score_before DOUBLE PRECISION,
      score_after DOUBLE PRECISION,
      status TEXT DEFAULT 'En curso',
      date_recorded TEXT NOT NULL,
      date_evaluated TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_feedbacks (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      model_used TEXT NOT NULL,
      summary TEXT NOT NULL,
      pedagogical_interpretation TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      explicability TEXT NOT NULL,
      raw_metrics TEXT NOT NULL,
      scenario_type TEXT DEFAULT 'B_FULL_CONTEXT'
    );

    CREATE TABLE IF NOT EXISTS rubric_evaluations (
      id SERIAL PRIMARY KEY,
      feedback_id INTEGER REFERENCES ai_feedbacks(id) ON DELETE SET NULL,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      relevance_score INTEGER NOT NULL,
      clarity_score INTEGER NOT NULL,
      coherence_score INTEGER NOT NULL,
      pedagogical_utility_score INTEGER NOT NULL,
      data_backing_score INTEGER NOT NULL,
      appropriate_language_score INTEGER NOT NULL,
      overall_score DOUBLE PRECISION NOT NULL,
      teacher_comments TEXT,
      evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Habilitar permisos para la API REST pública de PostgREST
    ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
    ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
    ALTER TABLE competencies DISABLE ROW LEVEL SECURITY;
    ALTER TABLE students DISABLE ROW LEVEL SECURITY;
    ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
    ALTER TABLE grades DISABLE ROW LEVEL SECURITY;
    ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE ai_feedbacks DISABLE ROW LEVEL SECURITY;
    ALTER TABLE rubric_evaluations DISABLE ROW LEVEL SECURITY;

    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  `;

  await executeQuery(schemaSQL);
  console.log('✓ Tablas creadas y permisos configurados.');

  // Comprobar si ya existen cursos
  const checkRes = await executeQuery('SELECT COUNT(*) as count FROM courses;');
  const courseCount = Number(checkRes.rows[0]?.count || 0);

  if (courseCount === 0) {
    console.log('Sembrando datos pedagógicos del Briefing SeguIA en Supabase...');

    const seedSQL = `
      INSERT INTO settings (key, value) VALUES
        ('consecutive_drops_threshold', '3'),
        ('drop_delta_threshold', '10'),
        ('priority_alert_slope', '-1.5'),
        ('anonymize_ai', 'true'),
        ('gemini_api_key', '""'),
        ('ai_provider', '"auto"'),
        ('gemini_model', '"gemini-2.5-flash"');

      INSERT INTO courses (id, code, name, description, teacher_name, grade_scale_min, grade_scale_max, passing_grade)
      VALUES
        (1, 'MAT-901', 'Matemáticas 9° - Álgebra y Pensamiento Cuantitativo', 'Curso centrado en resolución de problemas algebraicos, ecuaciones y modelado geométrico.', 'Prof. Cristóbal Martínez & Jainer Salas', 0, 100, 60),
        (2, 'LEN-101', 'Lengua Castellana y Argumentación 10°', 'Desarrollo de competencias de lectura crítica, producción de ensayos y argumentación retórica.', 'Prof. María Elena Restrepo', 0, 100, 60);

      SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses));

      INSERT INTO competencies (id, course_id, code, name, description) VALUES
        (1, 1, 'COMP-RES', 'Resolución de problemas en contextos cotidianos', 'Capacidad para formular y resolver situaciones problema utilizando operaciones y ecuaciones.'),
        (2, 1, 'COMP-MOD', 'Modelado y razonamiento algebraico', 'Traducción de enunciados a expresiones algebraicas y resolución de sistemas.'),
        (3, 1, 'COMP-COM', 'Comunicación y argumentación matemática', 'Explicación rigurosa de los procedimientos seguidos y justificación de resultados.'),
        (4, 2, 'COMP-LEC', 'Lectura crítica y comprensión inferencial', 'Interpretación y análisis de sesgos en textos ensayísticos.'),
        (5, 2, 'COMP-ESC', 'Producción textual y coherencia argumentativa', 'Estructuración de tesis, argumentos y contraargumentos.');

      SELECT setval('competencies_id_seq', (SELECT MAX(id) FROM competencies));

      INSERT INTO activities (id, course_id, competency_id, title, description, activity_type, max_score, weight, activity_date) VALUES
        (1, 1, 1, 'Taller 1: Fracciones y proporciones aplicadas', 'Problemas de aplicación práctica de fracciones en mezclas y compras.', 'Taller', 100, 1.0, '2026-08-10'),
        (2, 1, 2, 'Quiz 1: Lenguaje algebraico', 'Identificación de incógnitas y formulación básica.', 'Quiz', 100, 1.0, '2026-08-18'),
        (3, 1, 1, 'Taller 2: Ecuaciones lineales en problemas de velocidad', 'Resolución de problemas de móviles y tiempo.', 'Taller', 100, 1.0, '2026-08-27'),
        (4, 1, 1, 'Evaluación parcial: Problemas complejos de ecuaciones', 'Examen acumulativo de resolución de problemas.', 'Examen', 100, 1.5, '2026-09-08'),
        (5, 1, 3, 'Ensayo y sustentación: Justificación de métodos numéricos', 'Exposición oral y rúbrica de argumentación.', 'Proyecto', 100, 1.0, '2026-09-17'),
        (6, 1, 1, 'Taller Post-Intervención: Refuerzo práctico de problemas', 'Taller aplicado tras la estrategia de refuerzo docente.', 'Taller', 100, 1.0, '2026-09-28');

      SELECT setval('activities_id_seq', (SELECT MAX(id) FROM activities));

      INSERT INTO students (id, course_id, student_code, full_name, email, notes) VALUES
        (1, 1, 'EST-001', 'Juan Camilo Pérez', 'juan.perez@colegio.edu', 'Estudiante participativo; presenta bloqueos puntuales al traducir enunciados a ecuaciones.'),
        (2, 1, 'EST-002', 'María Fernanda Gómez', 'maria.gomez@colegio.edu', 'Desempeño constante y autónomo.'),
        (3, 1, 'EST-003', 'Carlos Andrés Morales', 'carlos.morales@colegio.edu', 'Ritmo de aprendizaje adecuado, requiere apoyo en abstracción algebraica.'),
        (4, 1, 'EST-004', 'Valentina Rivas', 'valentina.rivas@colegio.edu', 'Frecuentes inasistencias los días de evaluación.'),
        (5, 1, 'EST-005', 'Sebastián Castro', 'sebastian.castro@colegio.edu', 'Ingresó recientemente por traslado institucional.');

      SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));

      INSERT INTO grades (student_id, activity_id, score, observation, evidence_type, evidence_url) VALUES
        (1, 1, 78, 'Resolvió adecuadamente los ejercicios directos; dificultad en los dos últimos que requerían interpretar texto largo.', 'Guía resuelta', '#evidencia-taller1-est001'),
        (1, 2, 82, 'Demuestra buen manejo conceptual del vocabulario algebraico elemental.', 'Hoja de respuestas', '#evidencia-quiz1-est001'),
        (1, 3, 65, 'Omitió el planteamiento gráfico inicial; errores recurrentes en el despeje de unidades.', 'Taller en parejas', '#evidencia-taller2-est001'),
        (1, 4, 55, 'Dificultad evidente al estructurar pasos de resolución de problemas con enunciados compuestos. Quedó bloqueado en el ejercicio 3.', 'Examen escrito', '#evidencia-eval1-est001'),
        (1, 5, 75, 'Buena capacidad comunicativa oral; explica con claridad sus razonamientos aunque cometa deslices numéricos.', 'Rúbrica exposición', '#evidencia-expo1-est001'),
        (1, 6, 68, 'Mejora notable en la identificación de datos e incógnitas tras el taller de refuerzo. Superó el umbral crítico.', 'Taller de refuerzo', '#evidencia-tallerpost-est001'),
        (2, 1, 92, 'Procedimientos impecables y ordenados.', 'Guía resuelta', NULL),
        (2, 2, 95, 'Comprensión cabal de todos los conceptos.', 'Hoja de respuestas', NULL),
        (2, 3, 89, 'Resuelve con solvencia y propone métodos alternativos.', 'Taller', NULL),
        (2, 4, 94, 'Excelente rigor matemático.', 'Examen escrito', NULL),
        (2, 5, 90, 'Exposición clara y argumentada.', 'Rúbrica', NULL),
        (3, 1, 75, 'Cumple con los requisitos del taller.', 'Guía', NULL),
        (3, 2, 58, 'Dificultad en la simbolización algebraica de problemas verbales.', 'Quiz', NULL),
        (3, 3, 68, 'Dificultades en despeje.', 'Taller', NULL),
        (3, 4, 62, 'Rendimiento bajo en preguntas de modelado.', 'Examen', NULL),
        (4, 1, 72, 'Entrega parcial pero correcta.', 'Guía', NULL),
        (4, 2, 60, 'Errores conceptuales recurrentes.', 'Quiz', NULL),
        (4, 3, 50, 'No completó 4 de los 6 ejercicios solicitados.', 'Taller', NULL),
        (4, 4, 42, 'Disminución marcada en retención y aplicación de fórmulas.', 'Examen', NULL),
        (5, 1, 70, 'Primera actividad evaluada tras incorporarse al grupo.', 'Taller', NULL);

      INSERT INTO interventions (
        id, student_id, course_id, situation_detected, ai_recommendation_summary,
        teacher_decision, intervention_type, score_before, score_after, status,
        date_recorded, date_evaluated, notes
      ) VALUES (
        1, 1, 1,
        'Disminución progresiva en actividades de resolución de problemas (82 -> 65 -> 55 en examen).',
        'Considerar una actividad de refuerzo enfocada en descomposición de problemas paso a paso y modelado gráfico.',
        'Realizar taller adicional de refuerzo personalizado y trabajo en parejas guiado.',
        'Taller de refuerzo / Acompañamiento guiado',
        55.0, 68.0, 'Superada con éxito',
        '2026-09-10', '2026-09-28',
        'El estudiante incrementó +13 puntos en la siguiente evidencia (Actividad 6: 68/100). Se evidencia efectividad del acompañamiento.'
      );

      SELECT setval('interventions_id_seq', (SELECT MAX(id) FROM interventions));

      INSERT INTO ai_feedbacks (
        id, student_id, model_used, summary, pedagogical_interpretation,
        recommendation, explicability, raw_metrics, scenario_type
      ) VALUES (
        1, 1, 'SeguIA Heuristic Engine v1.0',
        'El estudiante EST-001 presenta un promedio acumulado de 70.5/100, con una trayectoria inicial favorable seguida de tres caídas consecutivas en la competencia de Resolución de problemas.',
        'Se observa que el estudiante comprende los conceptos formales (82 en Quiz 1 y 75 en Comunicación), pero experimenta dificultades específicas cuando los enunciados integran múltiples etapas analíticas. No se detectan dificultades generales de aprendizaje, sino un bloqueo puntual en la fase de traducción y planificación del problema.',
        'Se sugiere al docente considerar una sesión de refuerzo centrada en estrategias heurísticas (ej. diagramas de barras, formulación de subproblemas) antes de evaluaciones sumativas adicionales.',
        'Indicadores objetivos que sustentan esta sugerencia: 1) Tres actividades consecutivas con disminución (-17 pts entre Quiz 1 y Taller 2, -10 pts en Evaluación parcial). 2) La competencia "Resolución de problemas" promedia 66.0, situándose 8.5 puntos por debajo de sus otras dimensiones. 3) Observaciones docentes cualitativas que corroboran "bloqueo en enunciado compuesto".',
        '{"average":70.5,"trendSlope":-3.2,"consecutiveDrops":3,"criticalComp":"Resolución de problemas"}',
        'B_FULL_CONTEXT'
      );

      SELECT setval('ai_feedbacks_id_seq', (SELECT MAX(id) FROM ai_feedbacks));

      INSERT INTO rubric_evaluations (
        id, feedback_id, student_id, relevance_score, clarity_score, coherence_score,
        pedagogical_utility_score, data_backing_score, appropriate_language_score,
        overall_score, teacher_comments
      ) VALUES (
        1, 1, 1, 5, 5, 5, 4, 5, 5, 4.83,
        'La retroalimentación fue altamente precisa. Nos permitió identificar que el problema no era desinterés sino dificultad de traducción del enunciado, facilitando la intervención mediante el taller de refuerzo.'
      );

      SELECT setval('rubric_evaluations_id_seq', (SELECT MAX(id) FROM rubric_evaluations));
    `;

    await executeQuery(seedSQL);
    console.log('✓ Datos iniciales y caso de estudio sembrados exitosamente.');
  } else {
    console.log(`✓ La base de datos ya contiene ${courseCount} cursos.`);
  }

  // Notificar a PostgREST que recargue el esquema para reflejar las nuevas tablas inmediatamente
  await executeQuery("NOTIFY pgrst, 'reload schema';");
  console.log('✓ Schema cache de Supabase PostgREST recargado con éxito.');
}

if (require.main === module) {
  setupSupabase()
    .then(() => {
      console.log('=== Base de datos Supabase inicializada al 100% ===');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error inicializando Supabase:', err);
      process.exit(1);
    });
}

module.exports = { executeQuery };
