module.exports = function (TRUSTED_HOSTS, NET, cluster, Config) {

    var express = require('express');
    var app = express();
    var server = app.listen(0, Config['cluster.ip']);

    require('./db')(Config);
    app.enable('trust proxy');
    app.use(require('morgan')("dev"));
    app.use(require('cookie-parser')());

    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    app.use(require('body-parser').urlencoded({
        extended: true,
        limit: "5000mb"
    }));
    app.use(require('body-parser').json({
        limit: "5000mb"
    }));

    var io = require('socket.io')(server, {
        pingTimeout: 60000
    });

    var date = new Date();
    console.log("   * thread started @ " + date + " #" + process.pid);

    // IO Adapter
    var mongo = require('socket.io-adapter-mongo');
    io.adapter(mongo('mongodb://127.0.0.1:' + Config["session.port"] + '/io'));
    var IO = require('./io');
    global.config = Config;
    io.on('connection', IO);

    require('./api')(express, app, Config);

    process.on('message', function (message, connection) {
        if (message !== 'sticky-session:connection') {
            return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        server.emit('connection', connection);

        connection.resume();
    });
};