const crypto = require('crypto');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const JWT_TOKEN_SECRET = 'JWT_TOKEN_SECRET';
const SESSION_KEY = 'Authorization';

// ---------------- Session class ----------------
class Session {
  #sessions = {}

  constructor() {
    try {
      this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
      this.#sessions = JSON.parse(this.#sessions.trim());
      console.log('Loaded sessions:', this.#sessions);
    } catch (e) {
      this.#sessions = {};
    }
  }

  #storeSessions() {
    fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions, null, 2), 'utf-8');
  }

  set(key, value = {}) {
    this.#sessions[key] = value;
    this.#storeSessions();
  }

  get(key) {
    return this.#sessions[key];
  }

  init(res) {
    const sessionId = crypto.randomUUID();
    this.set(sessionId, {});
    return sessionId;
  }

  destroy(req, res) {
    const sessionId = req.sessionId;
    delete this.#sessions[sessionId];
    this.#storeSessions();
  }
}

const sessions = new Session();

// ---------------- Middleware ----------------
app.use((req, res, next) => {
  let currentSession = {};
  let jwtSessionKey = req.get(SESSION_KEY);

  let sessionId;

  try {
    if (jwtSessionKey) {
      const jwtObject = decodeJWTGetToken(jwtSessionKey);
      sessionId = jwtObject.sessionId;
    }
  } catch (e) {
    console.error(`Invalid JWT: ${e.message}`);
  }

  if (sessionId) {
    currentSession = sessions.get(sessionId);
    if (!currentSession) {
      sessionId = sessions.init(res);
      currentSession = sessions.get(sessionId);
    }
  } else {
    sessionId = sessions.init(res);
    currentSession = sessions.get(sessionId);
  }

  req.session = currentSession;
  req.sessionId = sessionId;

  // Save session back after response finishes
  onFinished(res, () => {
    sessions.set(req.sessionId, req.session);
  });

  next();
});

// ---------------- Routes ----------------
app.get('/', (req, res) => {
  if (req.session.username) {
    return res.json({
      username: req.session.username,
      logout: 'http://localhost:3000/logout'
    });
  }
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/logout', (req, res) => {
  sessions.destroy(req, res);
  res.redirect('/');
});

const users = [
  { login: 'Login', password: 'Password', username: 'Username' },
  { login: 'Login1', password: 'Password1', username: 'Username1' }
];

app.post('/api/login', (req, res) => {
  const { login, password } = req.body;

  const user = users.find(u => u.login === login && u.password === password);

  if (user) {
    req.session.username = user.username;
    req.session.login = user.login;

    const signed = signValue(req.sessionId);

    return res.json({ token: signed });
  }

  res.status(401).send();
});

// ---------------- Helpers ----------------
function signValue(sessionId) {
  return jwt.sign({ sessionId }, JWT_TOKEN_SECRET, { expiresIn: '1h' });
}

function decodeJWTGetToken(token) {
  return jwt.verify(token, JWT_TOKEN_SECRET);
}

// ---------------- Start server ----------------
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
