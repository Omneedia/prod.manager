module.exports = function (TRUSTED_HOSTS, NET, cluster, Config) {
    var fs = require('fs');
    var numCPUs = require('os').cpus().length;
    var net = require('net');

    if (Config.threads != "*") {
        numCPUs = Config.threads * 1;
    };

    function init() {
        console.log('');
        console.log('Omneedia Manager started at ' + NET.getIPAddress() + ":" + Config['cluster.port'] + " (" + numCPUs + " threads)");

        console.log(' ');
        require('./secure')(Config, TRUSTED_HOSTS, function () {
            console.log('- Starting engines');
            require('./engines')(Config, function () {
                console.log('- Adding peers to hosts');
                var hostile = require('hostile');
                hostile.get(false, function (err, lines) {
                    console.log(lines);
                });
                process.on('exit', function () {
                    var shelljs = require('shelljs');
                    shelljs.exec('fuser -k ' + Config["session.port"] + '/tcp', {
                        silent: true
                    });
                    shelljs.exec('fuser -k ' + Config["db.port"] + '/tcp', {
                        silent: true
                    });
                    shelljs.exec('fuser -k 61208/tcp', {
                        silent: true
                    });
                    shelljs.exec(__dirname + '/../nginx/nginx -s quit', {
                        silent: true
                    });
                    console.log(' ');
                    console.log('* All engines stopped.');
                    console.log('* Manager stopped.');
                    console.log(' ');
                });
                process.on('SIGINT', process.exit); // catch ctrl-c
                process.on('SIGTERM', process.exit); // catch kill             
                var workers = [];

                var worker_index = function (ip, len) {
                    var s = '';
                    for (var i = 0, _len = ip.length; i < _len; i++) {
                        if (ip[i] !== '.') {
                            s += ip[i];
                        }
                    };
                    if (s.indexOf(':') > -1) s = s.substr(s.lastIndexOf(':') + 1, 255);
                    return Number(s) % len;
                };

                // Helper function for spawning worker at index 'i'.
                var spawn = function (i) {
                    workers[i] = cluster.fork();
                    workers[i].on('exit', function (worker, code, signal) {
                        console.log('! respawning thread', i);
                        spawn(i);
                    });
                };

                // Spawn workers.
                for (var i = 0; i < numCPUs; i++) {
                    spawn(i);
                };

                var server = net.createServer({
                    pauseOnConnect: true
                }, function (connection) {
                    var worker = workers[worker_index(connection.remoteAddress, numCPUs)];
                    worker.send('sticky-session:connection', connection);
                }).listen(Config['cluster.port']);

                console.log('- Manager online.');

            });

        });

    };

    init();

};