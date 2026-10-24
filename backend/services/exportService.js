'use strict';
const PDFDocument = require('pdfkit');

function formatNoteContent(note) {
  if (note.type === 'checklist') {
    try {
      const items = typeof note.body === 'string' ? JSON.parse(note.body) : note.body;
      if (Array.isArray(items)) {
        return items.map((item) => `[${item.done ? 'x' : ' '}] ${item.text}`).join('\n');
      }
    } catch (e) {
      // fallback to plain body
    }
  }
  return note.body || '';
}

function exportAsText(note, tags = []) {
  const lines = [
    `TITLE: ${note.title}`,
    `DATE: ${note.created_at || new Date().toISOString()}`,
    tags.length > 0 ? `TAGS: ${tags.join(', ')}` : '',
    '',
    '--- CONTENT ---',
    formatNoteContent(note),
  ];
  return lines.filter((l) => l !== null).join('\n');
}

function exportAsMarkdown(note, tags = []) {
  const content = formatNoteContent(note);
  const tagList = tags.length > 0 ? tags.map((t) => `\`#${t}\``).join(' ') : '';

  return `# ${note.title}

${tagList ? `**Tags:** ${tagList}\n` : ''}**Created:** ${note.created_at || new Date().toISOString()}

---

${content}
`;
}

function exportAsPdf(note, tags = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Title
      doc.fontSize(22).font('Helvetica-Bold').text(note.title, { underline: false });
      doc.moveDown(0.5);

      // Metadata
      doc.fontSize(10).font('Helvetica').fillColor('#666666');
      doc.text(`Created: ${note.created_at || new Date().toISOString()}`);
      if (tags && tags.length > 0) {
        doc.text(`Tags: ${tags.join(', ')}`);
      }
      if (note.color && note.color !== 'default') {
        doc.text(`Color: ${note.color}`);
      }
      doc.moveDown(0.8);

      // Divider
      doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // Body
      doc.fontSize(12).font('Helvetica').fillColor('#222222');
      if (note.type === 'checklist') {
        try {
          const items = typeof note.body === 'string' ? JSON.parse(note.body) : note.body;
          if (Array.isArray(items)) {
            items.forEach((item) => {
              const mark = item.done ? '[x] ' : '[ ] ';
              doc.text(mark + item.text, { indent: 10 });
            });
          } else {
            doc.text(note.body || '');
          }
        } catch (e) {
          doc.text(note.body || '');
        }
      } else {
        doc.text(note.body || '', { lineGap: 4 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  exportAsText,
  exportAsMarkdown,
  exportAsPdf,
};
