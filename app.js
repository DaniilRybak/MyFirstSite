const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');

const bcrypt = require('bcrypt'); // Для хеширования паролей
const crypto = require('crypto');

// Импорт модуля для управления сессиями
const session = require('express-session');


const secretKey = crypto.randomBytes(64).toString('hex');

// Настройка сессии
app.use(session({
  secret: secretKey,
  resave: false,
  saveUninitialized: false
}));


// Настройки подключения к базе данных
const dbConfig = {
  host: 'localhost',
  user: 'root',
  port: '3306',
  password: '1234',
  database: 'trash_bins'
};

// Создание подключения к базе данных
const connection = mysql.createConnection(dbConfig);

// Обработка ошибок подключения
connection.connect(error => {
  if (error) {
    console.error('Ошибка подключения к базе данных: ' + error.stack);
    return;
  }
  console.log('Подключение к базе данных успешно установлено');
});

app.use(express.static('public'));
app.use(express.json()); // Для парсинга JSON в теле запроса

// Главная страница с картой
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// API endpoint для получения данных о мусорных баках
app.get('/api/bins', (req, res) => {
  const query = 'SELECT * FROM bins';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Ошибка получения данных из базы данных: ' + error.stack);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    res.json(results);
  });
});

// API endpoint для обновления данных о мусорном баке
app.put('/api/bins/:id', (req, res) => {
  const binId = req.params.id;
  const { fullness, chargeLevel } = req.body;
  const query = `UPDATE bins SET fullness = ?, chargeLevel = ? WHERE id = ?`;
  connection.query(query, [fullness, chargeLevel, binId], (error, results) => {
    if (error) {
      console.error('Ошибка обновления данных в базе данных: ' + error.stack);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    res.json({ message: 'Данные успешно обновлены' });
  });
});

// вход
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Обработка запроса на вход
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Получение хешированного пароля из базы данных
  const query = 'SELECT password FROM users WHERE username = ?';
  connection.query(query, [username], async (error, results) => {
    if (error) {
      console.error('Ошибка получения данных из базы данных: ' + error.stack);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }

    if (results.length === 0) {
      res.status(402).json({ error: 'Неверный логин или пароль' });
      return;
    }

    if (password != results[0].password) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    // Создание сессии для залогиненного пользователя
    req.session.username = username;
    res.json({ message: 'Успешный вход' });
    console.log(username);
  });
});

// Проверка авторизации для доступа к специальным функциям
const isLoggedIn = (req, res, next) => {
  if (!req.session.username) {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }
  next();
};


// Защита специальных функций проверкой авторизации
app.get('/map', isLoggedIn, (req, res) => {
  
  res.sendFile(__dirname + '/map.html');
});

// Новый маршрут для проверки авторизации
app.get('/isLoggedIn', (req, res) => {
  if (req.session.username) {
    res.status(200).send(); // Отправляем пустой ответ, если пользователь авторизован
  } else {
    res.status(401).send(); // Отправляем ошибку 401, если пользователь не авторизован
  }
});


app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
