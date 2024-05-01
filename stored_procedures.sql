CREATE PROCEDURE GetNearbyData(
    IN listingID INT,
    IN numRestaurants INT,
    IN numStations INT,
    IN crimeDistance DECIMAL(10, 2),
    OUT restaurantData JSON,
    OUT subwayData JSON,
    OUT crimeData JSON
)
BEGIN
    DECLARE exit_handler CONDITION;
    DECLARE restaurant_rows CURSOR FOR
        SELECT
            JSON_OBJECT(
                'RestaurantID', R.RestaurantID,
                'RestaurantName', R.RestaurantName,
                'Address', R.Address,
                'Distance', (
                    6371 * acos(
                        cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = listingID))) *
                        cos(radians(R.Latitude)) *
                        cos(radians(R.Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = listingID))) +
                        sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = listingID))) *
                        sin(radians(R.Latitude))
                    )
                )
            ) AS restaurant_row
        FROM
            Restaurants R
        ORDER BY
            Distance ASC
        LIMIT numRestaurants;

    DECLARE subway_rows CURSOR FOR
        SELECT
            JSON_OBJECT(
                'StationName', S.StationName,
                'Distance', (
                    6371 * acos(
                        cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = listingID))) *
                        cos(radians(S.Latitude)) *
                        cos(radians(S.Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = listingID))) +
                        sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = listingID))) *
                        sin(radians(S.Latitude))
                    )
                )
            ) AS subway_row
        FROM
            SubwayStation S
        ORDER BY
            Distance ASC
        LIMIT numStations;

    DECLARE crime_count INT;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET exit_handler = TRUE;

    START TRANSACTION;

    SET restaurantData = (SELECT JSON_ARRAYAGG(restaurant_row) FROM (SELECT * FROM restaurant_rows) AS restaurant_rows);
    SET subwayData = (SELECT JSON_ARRAYAGG(subway_row) FROM (SELECT * FROM subway_rows) AS subway_rows);

    SELECT
        COUNT(*) INTO crime_count
    FROM
        CrimeData
    WHERE
        (
            6371 * acos(
                cos(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = listingID))) *
                cos(radians(Latitude)) *
                cos(radians(Longitude) - radians((SELECT Longitude FROM AirBnBListing WHERE ListingID = listingID))) +
                sin(radians((SELECT Latitude FROM AirBnBListing WHERE ListingID = listingID))) *
                sin(radians(Latitude))
            )
        ) <= crimeDistance;

    SET crimeData = JSON_OBJECT('NumberOfCrimes', crime_count);

    IF exit_handler THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction failed';
    ELSE
        COMMIT;
    END IF;