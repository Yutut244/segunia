// charts.js - Motor Gráfico Vectorial SVG Nativo para SeguIA
// No requiere librerías externas pesadas. Ultra ligero, nítido y preciso.

const SeguIACharts = {
  /**
   * Renderiza el gráfico cronológico de evolución con línea de regresión y umbral aprobatorio.
   */
  renderTrendChart(containerId, grades, regression = null, passingGrade = 60) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!grades || grades.length === 0) {
      container.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#94a3b8;font-size:0.9rem;">Sin calificaciones registradas para graficar</div>`;
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 260;
    const padding = { top: 30, right: 40, bottom: 45, left: 45 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minScore = 0;
    const maxScore = 100;

    const n = grades.length;
    const getX = (index) => padding.left + (n === 1 ? chartWidth / 2 : (index / (n - 1)) * chartWidth);
    const getY = (score) => padding.top + chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight;

    // Puntos de datos
    const points = grades.map((g, i) => ({
      x: getX(i),
      y: getY(Number(g.score)),
      score: Number(g.score),
      title: g.activity_title || `Actividad ${i + 1}`,
      date: g.activity_date || ''
    }));

    // Línea de notas
    let pathD = '';
    points.forEach((p, i) => {
      pathD += (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    });

    // Línea de regresión lineal si hay > 1 dato
    let regressionLineSVG = '';
    if (regression && n > 1) {
      const y1 = regression.slope * 1 + regression.intercept;
      const y2 = regression.slope * n + regression.intercept;
      const regX1 = padding.left;
      const regY1 = getY(Math.max(0, Math.min(100, y1)));
      const regX2 = padding.left + chartWidth;
      const regY2 = getY(Math.max(0, Math.min(100, y2)));

      const slopeColor = regression.slope >= 0 ? '#10b981' : '#ef4444';
      regressionLineSVG = `
        <line x1="${regX1}" y1="${regY1}" x2="${regX2}" y2="${regY2}" 
              stroke="${slopeColor}" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.8" />
        <text x="${regX2 - 10}" y="${regY2 - 8}" fill="${slopeColor}" font-size="11" font-weight="700" text-anchor="end">
          Tendencia (${regression.slope > 0 ? '+' : ''}${regression.slope} pts/act)
        </text>
      `;
    }

    // Línea de corte aprobatorio (ej. 60)
    const passingY = getY(passingGrade);
    const passingLineSVG = `
      <line x1="${padding.left}" y1="${passingY}" x2="${padding.left + chartWidth}" y2="${passingY}"
            stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />
      <text x="${padding.left + 5}" y="${passingY - 5}" fill="#b45309" font-size="10" font-weight="600">
        Umbral Aprobatorio (${passingGrade})
      </text>
    `;

    // Grilla horizontal
    let gridLines = '';
    [0, 25, 50, 75, 100].forEach(val => {
      const y = getY(val);
      gridLines += `
        <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
        <text x="${padding.left - 10}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${val}</text>
      `;
    });

    // Etiquetas del eje X
    let xLabels = '';
    points.forEach((p, i) => {
      const shortTitle = p.title.length > 12 ? p.title.slice(0, 10) + '..' : p.title;
      xLabels += `
        <text x="${p.x}" y="${padding.top + chartHeight + 20}" fill="#64748b" font-size="10" text-anchor="middle" font-weight="500">
          A${i + 1}
        </text>
        <title>Actividad ${i + 1}: ${p.title} (${p.score}/100)</title>
      `;
    });

    // Círculos y tooltips
    let dotsSVG = '';
    points.forEach((p) => {
      const dotColor = p.score >= passingGrade ? '#2563eb' : '#dc2626';
      dotsSVG += `
        <circle cx="${p.x}" cy="${p.y}" r="5.5" fill="${dotColor}" stroke="#ffffff" stroke-width="2.5" style="cursor:pointer;">
          <title>${p.title}\nCalificación: ${p.score}/100\nFecha: ${p.date}</title>
        </circle>
        <text x="${p.x}" y="${p.y - 10}" fill="#1e293b" font-size="11" font-weight="700" text-anchor="middle">
          ${p.score}
        </text>
      `;
    });

    container.innerHTML = `
      <svg class="seguia-chart" viewBox="0 0 ${width} ${height}">
        ${gridLines}
        ${passingLineSVG}
        ${regressionLineSVG}
        <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${dotsSVG}
        ${xLabels}
      </svg>
    `;
  },

  /**
   * Renderiza el gráfico de barras por competencias.
   */
  renderCompetenciesBarChart(containerId, competenciesSummary, studentAvg = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!competenciesSummary || competenciesSummary.length === 0) {
      container.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#94a3b8;font-size:0.9rem;">Sin competencias registradas</div>`;
      return;
    }

    const width = container.clientWidth || 600;
    const rowHeight = 55;
    const padding = { top: 20, right: 50, bottom: 30, left: 160 };
    const height = Math.max(200, competenciesSummary.length * rowHeight + padding.top + padding.bottom);
    const chartWidth = width - padding.left - padding.right;

    let barsSVG = '';

    competenciesSummary.forEach((c, i) => {
      const y = padding.top + i * rowHeight;
      const score = c.average !== null ? c.average : 0;
      const barW = (score / 100) * chartWidth;

      let barColor = '#3b82f6';
      if (score < 60) barColor = '#ef4444';
      else if (score < 75) barColor = '#f59e0b';
      else barColor = '#10b981';

      // Etiqueta de la competencia truncada si es larga
      const cleanName = c.name.length > 24 ? c.name.slice(0, 22) + '...' : c.name;

      barsSVG += `
        <!-- Fondo de la barra -->
        <rect x="${padding.left}" y="${y}" width="${chartWidth}" height="22" rx="6" fill="#f1f5f9" />
        <!-- Barra de valor -->
        <rect x="${padding.left}" y="${y}" width="${Math.max(4, barW)}" height="22" rx="6" fill="${barColor}">
          <title>${c.name}\nPromedio: ${score}/100\nActividades evaluadas: ${c.activitiesCount}\nBrecha vs promedio personal: ${c.gapWithStudentAvg > 0 ? '+' : ''}${c.gapWithStudentAvg} pts</title>
        </rect>
        <!-- Nombre de competencia -->
        <text x="${padding.left - 12}" y="${y + 15}" fill="#334155" font-size="11" font-weight="600" text-anchor="end">
          ${cleanName}
        </text>
        <!-- Valor numérico -->
        <text x="${padding.left + Math.max(4, barW) + 8}" y="${y + 15}" fill="#1e293b" font-size="11" font-weight="700">
          ${c.average !== null ? `${score}` : 'S/D'}
        </text>
      `;
    });

    container.innerHTML = `
      <svg class="seguia-chart" viewBox="0 0 ${width} ${height}">
        ${barsSVG}
      </svg>
    `;
  }
};

window.SeguIACharts = SeguIACharts;
