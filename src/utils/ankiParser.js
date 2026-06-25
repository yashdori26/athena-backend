const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const sqlite3 = require('sqlite3').verbose();

exports.parseApkg = async (filePath) => {
  return new Promise((resolve, reject) => {
    const extractPath = path.join(__dirname, '../../uploads/temp_anki_' + Date.now());
    
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', () => {
        const dbPath = path.join(extractPath, 'collection.anki2');
        if (!fs.existsSync(dbPath)) {
          return reject(new Error('Invalid Anki package: collection.anki2 not found'));
        }

        const db = new sqlite3.Database(dbPath);
        const cards = [];

        db.all("SELECT flds FROM notes", [], (err, rows) => {
          if (err) {
            db.close();
            return reject(err);
          }

          rows.forEach((row) => {
            const fields = row.flds.split('\x1f');
            if (fields.length >= 2) {
              // Very basic strip HTML
              const front = fields[0].replace(/<[^>]+>/g, '').trim();
              const back = fields[1].replace(/<[^>]+>/g, '').trim();
              if (front && back) {
                cards.push({ front, back });
              }
            }
          });

          db.close();
          fs.rm(extractPath, { recursive: true, force: true }, () => {});
          
          resolve(cards);
        });
      })
      .on('error', (err) => reject(err));
  });
};
