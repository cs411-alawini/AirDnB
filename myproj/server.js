var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
var connection = mysql.createConnection({
                host: '35.193.116.249',
                user: 'connectroot',
                password: 'connect123',
                database: 'airdnb-database'
});

connection.connect;
var app = express();

app.use(session({
  secret: 'airdnb-secret-key', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: !true } 
}));

// set up ejs view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '../public'));


app.get('/login', function(req, res) {
  if (req.session.username) {
      res.redirect('/index');
  } else {
      res.render('login', { title: 'Login' }); 
  }
});


app.post('/login', function(req, res) {
  const { username } = req.body;
  connection.query('SELECT * FROM User WHERE username = ?', [username], function(error, results) {
      if (error) {
          return res.status(500).send({ message: 'Error checking user data', error });
      }
      if (results.length > 0) {
          req.session.username = username;
          res.redirect('/index'); 
      } else {
          res.send('Username does not exist'); 
      }
  });
});

app.get('/index', function(req, res) {
  if (req.session.username) {
    res.render('index', { title: 'Home', user: req.session.username });
  } else {
    res.redirect('/login');
  }
});

app.get('/', function(req, res) {
  if (req.session.username) {
    res.redirect('/index');
  } else {
    res.redirect('/login');
  }
});

app.post('/register', function(req, res) {
  const { username, firstName, lastName, email, phoneNumber } = req.body;
    connection.query('SELECT username FROM User WHERE username = ?', [username], function(err, result) {
      if (err) {
          console.error('Error checking username:', err);
          return res.status(500).send('Error checking username');
      }
      if (result.length > 0) {
          return res.send('Username already exists');
      }
      connection.query('INSERT INTO User (username, FirstName, LastName, Email, PhoneNumber) VALUES (?, ?, ?, ?, ?)', [username, firstName, lastName, email, phoneNumber], function(err, result) {
        if (err) {
            console.error('Error adding new user:', err);
            return res.status(500).send('Error registering new user');
        }
        res.redirect('/login'); 
      });
  });
});


app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
      if (err) {
          return console.log(err);
      }
      res.redirect('/login');
  });
});


app.get('/api/restaurants', function(req, res) {
  var sql = 'SELECT * FROM Restaurants LIMIT 5;';

  connection.query(sql, function(err, results) {
    if (err) {
      console.error('Error fetching restuarant data:', err);
      res.status(500).send({ message: 'Error fetching restuarant data', error: err });
      return;
    }
    res.json(results);
  });
});

app.get('/airbnbsByBorough', function(req, res) {
  connection.query('CALL GetAirbnbsByBorough()', function (error, results, fields) {
    if (error) {
        console.error('Error fetching Airbnb data:', error);
        res.status(500).send({ message: 'Error fetching Airbnb data', error: error });
        return;
    }
    res.send(results[0]);
  });
});

app.get('/subwayStationsByBorough', function(req, res) {
  connection.query('CALL GetSubwayStationsByBorough()', function (error, results, fields) {
    if (error) {
        console.error('Error fetching subway station data:', error);
        res.status(500).send({ message: 'Error fetching subway station data', error: error });
        return;
    }
    res.send(results[0]);
  });
});

app.get('/restaurantsByBorough', function(req, res) {
  connection.query('CALL GetRestaurantsByBorough()', function (error, results, fields) {
    if (error) {
        console.error('Error fetching restaurant data:', error);
        res.status(500).send({ message: 'Error fetching restaurant data', error: error });
        return;
    }
    res.send(results[0]);
  });
});

function extractRoomId(url) {
  const regex = /rooms\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

app.use(bodyParser.urlencoded({ extended: true }));
app.post('/parse-url', function(req, res) {
  const url = req.body.url;
  const roomId = extractRoomId(url);

  if (roomId) {
      var sql = `
      SELECT
          R.RestaurantID,
          R.RestaurantName,
          R.Address,
          (
              6371 * acos(
                  cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
                  cos(radians(R.Latitude)) *
                  cos(radians(R.Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = ?))) +
                  sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
                  sin(radians(R.Latitude))
              )
          ) AS Distance
      FROM
          Restaurants R
      ORDER BY
          Distance ASC
      LIMIT 3;
      `;
      connection.query(sql, [roomId, roomId, roomId], function(error, results) {
          if (error) {
              console.error('SQL Error:', error);
          } else {
              res.render('results', { restaurants: results });
          }
      });
  } else {
      res.send('No Room ID could be extracted.');
  }
});


app.listen(80, function () {
    console.log('Node app is running on port 80');
});
