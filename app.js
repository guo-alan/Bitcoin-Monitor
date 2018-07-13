var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const moment = require("moment");

//exchange apis
const binance = require("binance-api-node").default;
const Gdax = require("gdax");
const websocket = new Gdax.WebsocketClient(["BTC-USD"]);
const BFX = require("bitfinex-api-node");
const bfx = new BFX({
    apiKey: "...",
    apiSecret: "...",
    ws: {
        autoReconnect: true,
        seqAudit: true,
        packetWDDelay: 10 * 1000
    }
});
const APIKEY = "xxx";
const APISECRET = "xxx";
const client = binance({
    apiKey: APIKEY,
    apiSecret: APISECRET
});

app.get('/', function (req, res) {
    res.sendfile('index.html');
});

io.on('connection', function (socket) {
    fetchPrices();
    socket.on('disconnect', function () {

    });
});

fetchPrices = () => {
    gdaxPrice();
    bitfinexPrice();
    bitmexPrice();
}

bitfinexPrice = () => {
    const ws = bfx.ws();

    ws.on("error", err => console.log(err));
    ws.on("open", () => {
        ws.subscribeTrades("BTCUSD");
    });

    ws.onTrades({
            pair: "BTCUSD"
        },
        trades => {
            if (trades[trades.length - 1][2] >= 0) {
                io.sockets.emit('broadcast', {
                    description: '<font color="green">' + moment(trades[trades.length - 1][1]).format("HH:mm:ss") +
                        " Exchange: Bitfinex&nbsp;| Type: Buy&nbsp;&nbsp;| BTC-USD: $" +
                        trades[trades.length - 1][3].toFixed(2) +
                        " | Quantity: " +
                        trades[trades.length - 1][2].toFixed(3) +
                        " BTC" +
                        " | Value: $" +
                        (
                            trades[trades.length - 1][2] * trades[trades.length - 1][3]
                        ).toFixed(2) + '</font><br>'
                })

            } else {
                io.sockets.emit('broadcast', {
                    description: '<font color="red">' + moment(trades[trades.length - 1][1]).format("HH:mm:ss") +
                        " Exchange: Bitfinex&nbsp;| Type: Sell | BTC-USD: $" +
                        trades[trades.length - 1][3].toFixed(2) +
                        " | Quantity: " +
                        (trades[trades.length - 1][2] * -1).toFixed(3) +
                        " BTC" +
                        " | Value: $" +
                        (
                            trades[trades.length - 1][2] *
                            trades[trades.length - 1][3] *
                            -1
                        ).toFixed(2) + '</font><br>'
                })
            }

        }
    );

    ws.open();
}

gdaxPrice = () => {
    websocket.on("message", data => {
        if (
            data.side != null &&
            data.size != null &&
            data.price != null &&
            data.type == "match"
        ) {
            if (data.side == "buy") {
                io.sockets.emit('broadcast', {
                    description: '<font color="green">' + moment(
                            data.time.slice(
                                data.time.indexOf("T") + 1,
                                data.time.indexOf(".")
                            ),
                            "HH:mm:ss"
                        )
                        .subtract(
                            moment.duration({
                                hours: 5
                            })
                        )
                        .format("HH:mm:ss") +
                        " Exchange: GDAX&nbsp;&nbsp;&nbsp;| Type: Buy&nbsp;&nbsp;| BTC-USD: $" +
                        Number(data.price).toFixed(2) +
                        " | Quantity: " +
                        Number(data.size).toFixed(3) +
                        " BTC" +
                        " | Value: $" +
                        (Number(data.price) * Number(data.size)).toFixed(2) + '</font><br>'
                });
            } else {
                io.sockets.emit('broadcast', {
                    description: '<font color="red">' + moment(
                            data.time.slice(
                                data.time.indexOf("T") + 1,
                                data.time.indexOf(".")
                            ),
                            "HH:mm:ss"
                        )
                        .subtract(
                            moment.duration({
                                hours: 5
                            })
                        )
                        .format("HH:mm:ss") +
                        " Exchange: GDAX&nbsp;&nbsp;&nbsp;| Type: Sell | BTC-USD: $" +
                        Number(data.price).toFixed(2) +
                        " | Quantity: " +
                        Number(data.size).toFixed(3) +
                        " BTC" +
                        " | Value: $" +
                        (Number(data.price) * Number(data.size)).toFixed(2) + '</font><br>'
                });


            }

        }
    });
}

bitmexPrice = () => {
    const BitMEXClient = require("bitmex-realtime-api");
    const bitmexClient = new BitMEXClient({
        testnet: false
    });
    bitmexClient.on("error", console.error);
    bitmexClient.on("open", () => console.log(""));
    bitmexClient.on("close", () => console.log(""));
    bitmexClient.on("initialize", () => console.log(""));
    bitmexClient.addStream("XBTUSD", "trade", function (data, symbol, tableName) {
        if (data[data.length - 1] != null && data[data.length - 1] != undefined && data != null && data != undefined &&
            data[data.length - 1].size != undefined &&
            data[data.length - 1].size != null
        ) {

            if (data[data.length - 1].side == "Buy") {
                io.sockets.emit('broadcast', {
                    description: '<font color="green">' + moment(
                            data[data.length - 1].timestamp.slice(
                                data[data.length - 1].timestamp.indexOf("T") + 1,
                                data[data.length - 1].timestamp.indexOf(".")
                            ),
                            "HH:mm:ss"
                        )
                        .subtract(
                            moment.duration({
                                hours: 5
                            })
                        )
                        .format("HH:mm:ss") +
                        " Exchange: Bitmex&nbsp;&nbsp;| Type: Buy&nbsp;&nbsp;| BTC-USD: $" +
                        data[data.length - 1].price.toFixed(2) +
                        " | Quantity: " +
                        (
                            data[data.length - 1].size / data[data.length - 1].price
                        ).toFixed(3) +
                        " BTC" +
                        " | Value: $" +
                        data[data.length - 1].size.toFixed(2) + '</font><br>'
                });
            } else if (data[data.length - 1].side == "Sell") {
                io.sockets.emit('broadcast', {
                    description: '<font color="green">' + moment(
                            data[data.length - 1].timestamp.slice(
                                data[data.length - 1].timestamp.indexOf("T") + 1,
                                data[data.length - 1].timestamp.indexOf(".")
                            ),
                            "HH:mm:ss"
                        )
                        .subtract(
                            moment.duration({
                                hours: 5
                            })
                        )
                        .format("HH:mm:ss") +
                        " Exchange: Bitmex&nbsp;&nbsp;| Type: Sell &nbsp;| BTC-USD: $" +
                        data[data.length - 1].price.toFixed(2) +
                        " | Quantity: " +
                        (
                            data[data.length - 1].size / data[data.length - 1].price
                        ).toFixed(3) +
                        " BTC" +
                        " | Value: $" +
                        data[data.length - 1].size.toFixed(2) + '</font><br>'
                });


            }
        }
    });
}

http.listen(3000, function () {
    console.log('listening');
});