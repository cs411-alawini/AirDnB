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
createUsernameChangeTrigger();

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
          req.session.firstName = results[0].FirstName; 
          req.session.lastName = results[0].LastName;
          req.session.phoneNumber = results[0].PhoneNumber;
          req.session.email = results[0].Email;
          res.redirect('/index'); 
      } else {
          res.send('Username does not exist'); 
      }
  });
});


app.get('/index', function(req, res) {
  if (req.session.username) {
    res.render('index', {
      title: 'Home',
      username: req.session.username,
      firstName: req.session.firstName,
      lastName: req.session.lastName,
      phoneNumber: req.session.phoneNumber,
      email: req.session.email
    });
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

app.post('/modify', function(req, res) {
  const { username, firstName, lastName, email, phoneNumber } = req.body;

  connection.query('SELECT username FROM User WHERE username = ?', [username], function(err, result) {
    if (err) {
        console.error('Error checking username:', err);
        return res.status(500).send('Error checking username');
    }
    if (result.length > 0) {
      connection.query('UPDATE User SET FirstName = ?, LastName = ?, Email = ?, PhoneNumber = ? WHERE username = ?',
      [firstName, lastName, email, phoneNumber, username], function(err, result) {
          if (err) {
              console.error('Error updating user:', err);
              return res.status(500).send('Error updating user: ' + err.message);
          }
          res.send(`${username}'s account updated successfully`);
      });
    } else {
        res.send('Username does not exist. Cannot update non-existent user.');
    }
  });
});

app.post('/delete', function(req, res) {
  const { username } = req.body;
  if (!username) {
      return res.status(400).send('Username is required for deletion');
  }
  connection.query('DELETE FROM User WHERE username = ?', [username], function(err, result) {
      if (err) {
          console.error('Error deleting user:', err);
          return res.status(500).send('Error deleting user');
      }
      if (result.affectedRows === 0) {
          return res.send('No user found with the given username');
      }
      res.send('User deleted successfully');
  });
});

function getClosestRestaurant(listingID, numRestaurants = 5) {  // Default is 5
  return new Promise((resolve, reject) => {
    const sql = `
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
      LIMIT ?;`; 
    connection.query(sql, [listingID, listingID, listingID, numRestaurants], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

function getClosestSubwayStation(listingID, numStations = 2) {  // Default is 2
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
          S.StationName,
          (
              6371 * acos(
                  cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
                  cos(radians(S.Latitude)) *
                  cos(radians(S.Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = ?))) +
                  sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
                  sin(radians(S.Latitude))
              )
          ) AS Distance
      FROM
          SubwayStation S
      ORDER BY
          Distance ASC
      LIMIT ?;`;  
    connection.query(sql, [listingID, listingID, listingID, numStations], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

function getCrimeDataNearby(listingID, distanceKM = 1) {  // Default is 1 km
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
          COUNT(*) as NumberOfCrimes
      FROM
          CrimeData
      WHERE
          (
              6371 * acos(
                  cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
                  cos(radians(Latitude)) *
                  cos(radians(Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = ?))) +
                  sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
                  sin(radians(Latitude))
              )
          ) <= ?;`;  
    connection.query(sql, [listingID, listingID, listingID, distanceKM], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}


function extractRoomId(url) {
  const regex = /rooms\/(\d+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// app.use(bodyParser.urlencoded({ extended: true }));
// app.post('/parse-url', function(req, res) {
//   const url = req.body.url;
//   const roomId = extractRoomId(url);

//   if (roomId) {
//       var sql = `
//       SELECT
//           R.RestaurantID,
//           R.RestaurantName,
//           R.Address,
//           (
//               6371 * acos(
//                   cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
//                   cos(radians(R.Latitude)) *
//                   cos(radians(R.Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = ?))) +
//                   sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = ?))) *
//                   sin(radians(R.Latitude))
//               )
//           ) AS Distance
//       FROM
//           Restaurants R
//       ORDER BY
//           Distance ASC
//       LIMIT 3;
//       `;
//       connection.query(sql, [roomId, roomId, roomId], function(error, results) {
//           if (error) {
//               console.error('SQL Error:', error);
//           } else {
//               res.render('results', { restaurants: results });
//           }
//       });
//   } else {
//       res.send('No Room ID could be extracted.');
//   }
// });

app.post('/results', async function(req, res) {
  const { url, numRestaurants, numStations, crimeDistance } = req.body;
  const roomId = extractRoomId(url);

  if (roomId) {
    try {
      const restaurantResults = await getClosestRestaurant(roomId, numRestaurants);
      const subwayResults = await getClosestSubwayStation(roomId, numStations);
      const crimeResults = await getCrimeDataNearby(roomId, crimeDistance);
      console.log("Room ID:", listingID);
      console.log("Number of Restaurants:", numRestaurants);
      console.log("Number of Stations:", numStations);
      console.log("Crime Data Distance:", distanceKM);
      res.render('results', { 
        roomId: roomId,
        restaurants: restaurantResults,
        subways: subwayResults,
        crimes: crimeResults
      });
    } catch (error) {
      res.status(500).send('Database error occurred');
    }
  } else {
    res.send('No Room ID could be extracted.');
  }
});


app.listen(80, function () {
    console.log('Node app is running on port 80');
});

function createUsernameChangeTrigger() {
  const checkTriggerSQL = `
      SELECT TRIGGER_NAME 
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'airdnb-database' 
      AND TRIGGER_NAME = 'PreventUsernameChange';
  `;

  connection.query(checkTriggerSQL, function(err, results) {
    if (err) {
        console.error('Error checking for existing trigger:', err);
        return;
    }
    if (results.length > 0) {
        console.log('Trigger already exists, no need to create.');
    } else {
        const createTriggerSQL = `
            CREATE TRIGGER PreventUsernameChange
            BEFORE UPDATE ON User
            FOR EACH ROW
            BEGIN
                IF OLD.username <> NEW.username THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot change username after creation';
                END IF;
            END;
        `;
        connection.query(createTriggerSQL, function(err, results) {
            if (err) {
                console.error('Error creating trigger:', err);
            } else {
                console.log('Trigger created successfully:', results);
            }
        });
    }
  });
}
