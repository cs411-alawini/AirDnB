import mysql.connector

def getRest(name):
    try:
        cnx = mysql.connector.connect(
            user='connectroot', password='connect123', host='35.193.116.249', database='airdnb-database'
        )

        cursor = cnx.cursor()

        query = "SELECT * FROM Restaurants WHERE Restaurant Name = '" + name + "'"

        cursor.execute(query)

        desc = cursor.fetchall()

        if len(desc) == 0:
            return None

        cursor.close()
        cnx.close()

        return desc[0][1:]

    except mysql.connector.Error as err:
        print(err)

getRest("MADAME BONTE")