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
  var sql = `
  SELECT
      b.Borough,
      COUNT(l.ListingID) AS NumberOfAirbnbListings
  FROM
      (
          SELECT 'Bronx' AS Borough, 40.8082 AS MinLat, 40.9093 AS MaxLat, -73.911 AS MinLong, -73.804 AS MaxLong
          UNION ALL
          SELECT 'Queens', 40.5915, 40.771, -73.956, -73.76286
          UNION ALL
          SELECT 'Staten Island', 40.5083, 40.6393, -74.2010, -74.0562
          UNION ALL
          SELECT 'Manhattan', 40.7059, 40.8164, -73.978, -73.928
          UNION ALL
          SELECT 'Brooklyn', 40.5876, 40.7277, -74.007, -73.8776
      ) AS b
  LEFT JOIN
      AirBnBListing AS l ON (
          l.Latitude BETWEEN b.MinLat AND b.MaxLat
          AND l.Longitude BETWEEN b.MinLong AND b.MaxLong
      )
  GROUP BY
      b.Borough;
  `;
  connection.query(sql, function (error, results, fields) {
      if (error) {
          console.error('Error fetching Airbnb data:', error);
          res.status(500).send({ message: 'Error fetching Airbnb data', error: error });
          return;
      }
      res.send(results);
  });
});

app.get('/subwayStationsByBorough', function(req, res) {
  var sql = `
  SELECT
      b.Borough,
      COUNT(s.StationName) AS NumberOfSubwayStations
  FROM
      (
          SELECT 'Bronx' AS Borough, 40.8082 AS MinLat, 40.9093 AS MaxLat, -73.911 AS MinLong, -73.804 AS MaxLong
          UNION ALL
          SELECT 'Queens', 40.5915, 40.771, -73.956, -73.76286
          UNION ALL
          SELECT 'Staten Island', 40.5083, 40.6393, -74.2010, -74.0562
          UNION ALL
          SELECT 'Manhattan', 40.7059, 40.8164, -73.978, -73.928
          UNION ALL
          SELECT 'Brooklyn', 40.5876, 40.7277, -74.007, -73.8776
      ) AS b
  LEFT JOIN
      SubwayStation AS s ON (
          s.Latitude BETWEEN b.MinLat AND b.MaxLat
          AND s.Longitude BETWEEN b.MinLong AND b.MaxLong
      )
  GROUP BY
      b.Borough;
  `;
  connection.query(sql, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
  });
});

app.get('/restaurantsByBorough', function(req, res) {
  var sql = `
  SELECT
      b.Borough,
      COUNT(r.RestaurantID) AS NumberOfRestaurants
  FROM
      (
          SELECT 'Bronx' AS Borough, 40.8082 AS MinLat, 40.9093 AS MaxLat, -73.911 AS MinLong, -73.804 AS MaxLong
          UNION ALL
          SELECT 'Queens', 40.5915, 40.771, -73.956, -73.76286
          UNION ALL
          SELECT 'Staten Island', 40.5083, 40.6393, -74.2010, -74.0562
          UNION ALL
          SELECT 'Manhattan', 40.7059, 40.8164, -73.978, -73.928
          UNION ALL
          SELECT 'Brooklyn', 40.5876, 40.7277, -74.007, -73.8776
      ) AS b
  LEFT JOIN
      Restaurants AS r ON (
          r.Latitude BETWEEN b.MinLat AND b.MaxLat
          AND r.Longitude BETWEEN b.MinLong AND b.MaxLong
      )
  GROUP BY
      b.Borough;
  `;
  connection.query(sql, function (error, results, fields) {
      if (error) throw error;
      res.send(results);
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
