module.exports = function (Config, cb) {

    var path = require('path');
    var fs = require('fs');
    var tcpPortUsed = require('tcp-port-used');

    function makedirs(dirs, i, cb) {
        if (!dirs[i]) return cb();
        fs.mkdir(dirs[i], function () {
            makedirs(dirs, i + 1, cb);
        });
    };
    var DIRS = [
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'logs',
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'logs' + path.sep + 'engines',
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'logs' + path.sep + 'engines' + path.sep + 'mysql',
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'logs' + path.sep + 'engines' + path.sep + 'mongodb',
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'logs' + path.sep + 'engines' + path.sep + 'nginx',
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'var' + path.sep + "data",
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx",
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx" + path.sep + "conf.d",
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx" + path.sep + "sites",
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx" + path.sep + "sandbox",
        __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx" + path.sep + "production"
    ];

    fs.readFile(__dirname + path.sep + 'nginx.tpl', function (e, b) {
        makedirs(DIRS, 0, function () {

            console.log('   - Starting MariaDB process...');

            var exec = require('child_process').execFile;
            var spawn = require('child_process').spawn;

            /*var dmysql = exec(__dirname + path.sep + '..' + path.sep + 'mysql' + path.sep + 'bin' + path.sep + 'mysqld', [
                "--defaults-file=" + __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "mysql" + path.sep + "my.cnf",
                "-b", __dirname + path.sep + ".." + path.sep + "mysql",
                "--datadir=" + __dirname + path.sep + ".." + path.sep + ".." + path.sep + "var" + path.sep + "db" + path.sep,
                "--user=root",
                "--port=" + Config["db.port"],
                "--daemonize"
            ]);
            -- this is MySQL
            */

            var dmysql = spawn(__dirname + path.sep + '..' + path.sep + 'mysql' + path.sep + 'bin' + path.sep + 'mysqld', [
                "--defaults-extra-file=" + __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "mysql" + path.sep + "my.cnf",
                "-b", __dirname + path.sep + ".." + path.sep + "mysql",
                "--datadir=" + __dirname + path.sep + ".." + path.sep + ".." + path.sep + "var" + path.sep + "db" + path.sep,
                "--user=root",
                "--port=" + Config["db.port"]
            ]);

            console.log('   - Starting MongoD process.');

            var dmongo = exec(__dirname + path.sep + '..' + path.sep + 'mongodb' + path.sep + 'bin' + path.sep + 'mongod', [
                "--port", Config['session.port'],
                "--verbose",
                "--logpath", __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'logs' + path.sep + "engines" + path.sep + "mongodb" + path.sep + "mongod.log",
                "--dbpath", __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'var' + path.sep + "data"
            ]);

            console.log('   - Starting Stats process.');

            var dmongo = exec('glances', [
                "-w"
            ]);

            console.log('   - Starting NginX process.');

            fs.writeFile(__dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx" + path.sep + "nginx.conf", b.toString('utf-8'), function () {
                var dnginx = exec(__dirname + path.sep + '..' + path.sep + 'nginx' + path.sep + 'nginx', [
                    "-c", __dirname + path.sep + '..' + path.sep + '..' + path.sep + 'config' + path.sep + "engines" + path.sep + "nginx" + path.sep + "nginx.conf",
                    "-p", __dirname + path.sep + '..' + path.sep + '..' + path.sep
                ]);

                tcpPortUsed.waitUntilUsed(Config["db.port"] * 1, 500, 4000).then(function () {
                    console.log('[ STARTED ] MySQL service');
                    tcpPortUsed.waitUntilUsed(Config["session.port"] * 1).then(function () {
                        console.log('[ STARTED ] MongoDB service');
                        tcpPortUsed.waitUntilUsed(61208).then(function () {
                            console.log('[ STARTED ] Stats service');
                            tcpPortUsed.waitUntilUsed(80).then(function () {
                                console.log('[ STARTED ] HTTP/S service');
                                cb();
                            });
                        });
                    });
                })
            })

        });

    });




}