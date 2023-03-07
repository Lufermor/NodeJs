const db = require('./database');
const nanoid = require('./nanoid');

// Definir modelo de datos para los enlaces
const Link = {
  createLink(userId, originalUrl, callback) {
    const shortUrl = nanoid(7);
    db.query(
      `INSERT INTO links (id, userId, url_original, short_url) VALUES (?, ?, ?, ?)`,
      [nanoid(), userId, originalUrl, shortUrl],
      (err) => {
        if (err) {
          return callback(err);
        }
        return callback(null, shortUrl);
      }
    );
  },
  
  getLinksByUser(userId, callback) {
    db.query(`SELECT * FROM links WHERE userId = ?`, [userId], (err, results) => {
      if (err) {
        return callback(err);
      }
      return callback(null, results);
    });
  },
  
  getLinkByShortUrl(shortUrl, callback) {
    db.query(`SELECT * FROM links WHERE short_url = ?`, [shortUrl], (err, results) => {
      if (err) {
        return callback(err);
      }
      if (results.length === 0) {
        return callback(new Error('Link not found'));
      }
      return callback(null, results[0]);
    });
  },
  
  incrementLinkUsos(linkId, callback) {
    db.query(`UPDATE links SET usos = usos + 1 WHERE id = ?`, [linkId], (err) => {
      if (err) {
        return callback(err);
      }
      return callback(null);
    });
  }
};

module.exports = { Link };
