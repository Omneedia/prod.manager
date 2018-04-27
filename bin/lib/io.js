module.exports = function (socket) {
    var IO = this;
    var fs = require('fs');
    var shelljs = require('shelljs');
    //var Docker = require('dockerode');

    function Token(text) {
        var date = new Date().toMySQL().split(' ')[0];
        var d = require('crypto').createHash('md5').update(date).digest('hex');
        if (text == d) return true;
        else return false;
    };

    function io(socket) {
        if (socket.handshake.query.engine) {
            console.log('* Service [' + socket.handshake.query.engine.toUpperCase() + '] ' + socket.id + ' connected from ' + socket.handshake.headers["x-real-ip"]);
            var ip = socket.handshake.headers["x-real-ip"];
            console.log(global.TRUSTED_HOSTS);
            fs.readFile(__dirname + '/../../config/trustedhosts.json', function (e, r) {
                TRUSTED_HOSTS = JSON.parse(r.toString('utf-8'));
                if (TRUSTED_HOSTS.indexOf(ip) == -1) {
                    console.log('* Unauthorized - ' + socket.id + ' from ' + socket.handshake.headers["x-real-ip"]);
                    socket.disconnect('* Unauthorized');
                };
            });
        } else
            console.log('+ Client ' + socket.id + ' connected from ' + socket.handshake.headers["x-real-ip"]);

        // send config to builder
        if (socket.handshake.query.engine.toUpperCase() == "BUILDER") {
            mysql_query('SELECT * FROM config WHERE id="' + socket.handshake.query.registry + '"', function (e, r) {
                if (e) return socket.emit('#BUILDER#OFFLINE', {});
                if (r.length > 0) return socket.emit('#BUILDER#ONLINE', r[0]);
                socket.emit('#BUILDER#OFFLINE', {});
            });
        };

        // #OAINSTANCE
        socket.on('WORKER#ONLINE', function (data) {
            console.log(data);
        });

        // #OASERVICE
        socket.on('OAWORKER#ONLINE', function (data) {
            mysql_query('', function (e, r) {

            });
        });
        socket.on('OAPOOL#ONLINE', function (data) {
            mysql_query('DELETE FROM pool WHERE host="' + data.host + '"', function (e, r) {
                console.log("- Registering hypervisor to the pool");
                for (var el in data) {
                    console.log('  * ' + el + ' = ' + data[el]);
                };
                mysql_query('INSERT INTO pool VALUES("' + socket.id + '","' + data.uuid + '","' + data.host + '","' + data.service + '","' + data.pid + '","' + data.label + '","' + data.threads + '","' + data.os + '","' + data.release + '")', function (e, r) {
                    data.pid = socket.id;
                    mysql_query('SELECT * FROM hypervisors WHERE uuid="' + data.uuid + '"', function (e, r) {
                        if (r.length <= 0) return console.log('  ! Not registered.');
                        var r = r[0];
                        var cnf = {
                            cluster: global.config.label,
                            uri: global.config.url
                        };
                        IO.emit('OAPOOL#REGISTER', JSON.stringify(cnf));
                    });
                });
            });
        });

        function sendHeartbeat() {
            setTimeout(sendHeartbeat, 8000);
            IO.emit('ping', {
                beat: 1
            });
        };

        setTimeout(sendHeartbeat, 8000);

        socket.on('disconnect', function (s) {
            console.log('* Closing ' + socket.id + ' - ' + s);
            if (socket.handshake.query.engine) {
                mysql_query('DELETE FROM pool WHERE PID="' + socket.id + '"', function (e, r) {
                    if (r.affectedRows > 0) {
                        //IO.emit("OAPOOL#UNREGISTER", socket.id);
                        console.log("* Service " + socket.handshake.query.engine + socket.id + " unregistered.");
                    };
                });
            } else {
                /*mysql_query('UPDATE workers SET uid= "" WHERE uid="' + socket.id + '"', function(e, r) {

                });*/
            }

        });
    };

    if (socket.handshake.query.iokey) {
        if (Token(socket.handshake.query.iokey)) io(socket)
        else {
            console.log('* Unauthorized - ' + socket.id + ' from ' + socket.handshake.headers["x-real-ip"]);
            socket.disconnect('* Unauthorized');
        }
        return;
    };

    console.log('* Unauthorized - ' + socket.id + ' from ' + socket.handshake.headers["x-real-ip"]);
    socket.disconnect('* Unauthorized');
}