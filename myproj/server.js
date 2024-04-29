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

// set up ejs view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '../public'));

/* GET home page, respond by rendering index.ejs */
app.get('/', function(req, res) {
  res.render('index', { title: 'Restaurant Found' });
});

app.get('/success', function(req, res) {
      res.send({'message': 'Restaurants searched successfully!'});
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

app.get('/api/boroughs/restaurants', function(req, res) {
  var sql = `
    SELECT
        b.Borough,
        COUNT(r.RestaurantID) AS NumberOfRestaurants
    FROM (
        SELECT 'Queens' AS Borough, 40.5417 AS MinLat, 40.8007 AS MaxLat, -73.9626 AS MinLong, -73.7004 AS MaxLong
        UNION ALL
        SELECT 'Bronx', 40.7855, 40.9176, -73.9332, -73.7654
        UNION ALL
        SELECT 'Staten Island', 40.4774, 40.6521, -74.2591, -74.0345
        UNION ALL
        SELECT 'Manhattan', 40.7002, 40.8767, -74.0182, -73.9106
        UNION ALL
        SELECT 'Brooklyn', 40.5707, 40.7395, -74.0567, -73.8334
    ) AS b
    LEFT JOIN
        Restaurants AS r ON (
            r.Latitude BETWEEN b.MinLat AND b.MaxLat
            AND r.Longitude BETWEEN b.MinLong AND b.MaxLong
        )
    GROUP BY
        b.Borough;
  `;

  connection.query(sql, function(err, results) {
    if (err) {
      console.error('Error fetching restaurant count by borough:', err);
      res.status(500).send({ message: 'Error fetching restaurant count by borough', error: err });
      return;
    }
    res.json(results);
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

app.listen(80, function () {
    console.log('Node app is running on port 80');
});