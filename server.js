const express = require("express");
const http = require("http");
const { MongoClient } = require("mongodb");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded());
app.use(express.static('public'));  // Serves files from the 'public' directory

// MongoDB setup 
const username = process.env.MONGOUSER;
const password = process.env.MONGOPASSWORD;
const host = process.env.MONGOHOST;
const dbport = process.env.MONGOPORT;
const databaseName = process.env.MONGODBNAME;

const uri = `mongodb://${username}:${encodeURIComponent(password)}@${host}:${dbport}`;
const client = new MongoClient(uri);

let db;
let collection;

MongoClient.connect(uri)
    .then(client => {
        db = client.db(databaseName);  // Replace with your database name
        collection = db.collection("webhookData");  // Replace with your collection name
        console.log("Connected to MongoDB");
        startServer();  // Start the server after DB connection is established
    })
    .catch(error => console.error(error));

// Function to start the server
function startServer() {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}/`);
    });
}

// WebSocket setup
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// POST request handler for webhook
app.post("/webhook-1", (req, res) => {
    if (!db || !collection) {
        console.error('Database not connected');
        return res.status(500).send("Database not connected");
    }

    console.log(req.body);
    io.emit('webhookData', req.body); // Emitting data to clients

    // Example logic to handle the incoming data and insert it into MongoDB
    const message = req.body.priceDetails;
    const regex = /price \w+ = (\d+)/; // Regular expression to extract the price
    const match = regex.exec(message);

    if (match && match[1]) {
        const price = parseInt(match[1], 10);
        collection.insertOne({ ticker: "BTC", close: price, date: new Date() }, (err, result) => {
            if (err) {
                console.error('Error inserting into MongoDB', err);
                res.status(500).send("Error inserting data");
                return;
            }
            console.log("Data inserted into MongoDB", result);
            res.send("Webhook 1 successfully received and data stored.");
        });
    } else {
        res.status(400).send("Invalid data format");
    }
});
