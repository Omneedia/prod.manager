module.exports = function (express, app, Config) {

    var Docker = require('dockerode');
    var Hostile = require('hostile');

    function NGINX_CONFIG(task, cb) {
        var CONF = {
            ns: task,
            port: 80,
            hosts: []
        };
        var CMD = "";
        var tpl = __dirname + '/../../config/nginx.template';
        var sql = 'select distinct taskid,workers.port,url,hypervisors.`ip` from workers join tasks on tasks.id=workers.`taskid` join tasks_url on tasks_url.task_id=tasks.id join pool on pool.`PID`=workers.`hypervisor_pid` join hypervisors on hypervisors.uuid=pool.`uuid` where taskid="' + task + '"';
        var fs = require('fs');

        fs.unlink(__dirname + '/../../config/engines/nginx/production/' + task + '.task', function () {
            fs.readFile(tpl, function (e, r) {
                tpl = r.toString('utf-8');
                mysql_query(sql, function (e, r) {
                    if (r.length == 0) return cb();
                    for (var i = 0; i < r.length; i++) {
                        CONF.url = JSON.parse(r[i].url).join(' ');
                        CONF.hosts.push('server ' + r[i].ip + ':' + r[i].port + ';');
                    };
                    CMD = tpl;
                    CMD = CMD.replace(/{NS}/g, CONF.ns);
                    CMD = CMD.replace(/{PORT}/g, CONF.port);
                    CMD = CMD.replace(/{URI}/g, CONF.url);
                    CMD = CMD.replace(/{HOSTS}/g, CONF.hosts.join('\n\t'));
                    fs.writeFile(__dirname + '/../../config/engines/nginx/production/' + task + '.task', CMD, function (e) {
                        cb();
                    });
                });
            });
        });

    };

    app.get('/', function (req, res) {
        var fs = require('fs');

        if (req.get('host').indexOf('auth') > -1) return res.redirect('/login');
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'charset': 'utf-8'
        });
        fs.readFile(__dirname + '/../package.json', function (e, r) {
            r = JSON.parse(r.toString('utf-8'));
            res.end(JSON.stringify({
                omneedia: {
                    cluster: {
                        version: r.version
                    }
                }
            }, null, 4));
        });
        return;
    });

    app.get('/stats', function (req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'charset': 'utf-8'
        });
        var fs = require('fs');
        fs.readFile(__dirname + '/tpl/stats.tpl', function (e, r) {
            res.end(r.toString('utf-8'));
        });
    });

    app.get('/session.uri', function (req, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'charset': 'utf-8'
        });
        res.end('mongodb://' + req.get('host') + ':' + Config['session.port'] + '/');
    });

    app.get('/db.uri', function (req, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'charset': 'utf-8'
        });
        res.end('mysql://root@' + req.get('host') + ':' + Config['db.port'] + '/');
    });

    app.get('/stats/(*)', function (req, res) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'charset': 'utf-8'
        });
        var request = require('request');
        request('http://127.0.0.1:61208/api/2/all', function (e, r, b) {
            var b = b.toString('utf-8');
            if (req.params[0] == "json") b = JSON.stringify(JSON.parse(b), null, 4);
            return res.end(b);
        });
    });

    /*
    Login
    */
    app.post('/pid', function (req, res) {
        if (!req.body.pid) return res.status('403').end('NOT_AUTHORIZED');
        mysql_query('SELECT * FROM users join pids on pids.uid=users.userid where pids.pid_id="' + req.body.pid + '"', function (e, r) {
            console.log(e);
            console.log(r);
            if (e) return res.status('403').end('NOT_AUTHORIZED');
            if (r.length == 0) return res.status('403').end('NOT_AUTHORIZED');
            res.end(JSON.stringify(r[0]));
        });
    });

    app.use('/login', express.static(__dirname + '/../../var/auth'));

    app.post('/logout', function (req, res) {
        var headers = req.headers;

        if (!headers.payload) return res.status(400).end('bad request.');

        var code = new Buffer(headers.payload, 'base64').toString('ascii');
        var secret = code.substr(0, 9);
        var pid_id = code.substr(9, 9);
        var sql = "DELETE FROM pids where pid_id='" + pid_id + "' and secret='" + secret + "'";

        mysql_query(sql, function (e, r, f) {
            if (e) return res.status(503).end('service unavailable');
            res.end('{"response":"OK"}');
        });

    });

    app.post('/login', function (req, res) {
        var fs = require('fs');
        var path = require('path');
        var shortid = require('shortid');
        var result = {
            success: false
        };
        var secret = req.headers.secret;
        if (!secret) {
            return res.status(401).end('Unauthorized');
        };

        var l = req.body.l;
        var p = req.body.p;

        mysql_query("SELECT * FROM users WHERE login='" + l + "'", function (e, r, f) {
            var d = new Date();
            var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
            if (r.length > 0) {
                if (p == r[0].password) {
                    mysql_query("SELECT * from pids where secret='" + secret + "'", function (ee, rr) {
                        if (rr.length == 0) {
                            var newone = true;
                        } else {
                            var newone = false;
                        };
                        if (newone) {
                            var pid = require('shortid').generate();
                            var values = [
                                pid, secret, r[0].login, new Date().toMySQL(), r[0].userid, ip, r[0].is_admin
                            ];
                            mysql_query("INSERT INTO pids (pid_id,secret,login,last_access,uid,ip,is_admin) VALUES ('" + values.join("','") + "')", function (e, rx) {
                                if (e) return res.end(JSON.stringify(result));
                                result = {
                                    success: true,
                                    pid: pid,
                                    name: r[0].firstname + ' ' + r[0].lastname,
                                    mail: r[0].mail
                                };
                                res.end(JSON.stringify(result));
                            });
                        } else {
                            result = {
                                success: true,
                                pid: rr[0].pid_id,
                                name: r[0].firstname + ' ' + r[0].lastname,
                                mail: r[0].mail
                            };
                            res.end(JSON.stringify(result));
                        }
                    });
                } else res.end(JSON.stringify(result));
            } else res.end(JSON.stringify(result));
        });
    });

    /*
    Register Worker
    */

    app.post('/api/register_worker', function (req, res) {
        res.setHeader('Content-Type', 'application/json');

        var headers = [];
        headers.push('id');
        headers.push('hypervisor_pid');
        headers.push('app_id');
        headers.push('thread');
        headers.push('taskid');
        headers.push('port');

        var values = [];
        values.push('"' + req.body.id + '"');
        values.push('(select PID from pool where uuid="' + req.body.hid + '")');
        values.push('"' + req.body.appid + '"');
        values.push('"' + req.body.thread + '"');
        values.push('"' + req.body.task + '"');
        values.push('"' + req.body.port + '"');

        mysql_query("INSERT INTO workers (" + headers.join(',') + ") VALUES (" + values.join(',') + ")", function (e, r) {
            console.log(e);
            if (e) return res.end(JSON.stringify(e));
            mysql_query('SELECT config from config where id in (select config from tasks where id="' + req.body.task + '")', function (e, r) {
                if (e) return res.end(JSON.stringify(e));
                var response = {
                    config: r[0].config
                };
                NGINX_CONFIG(req.body.task, function () {
                    console.log('- reloading NGINX.');
                    var path = require('path');
                    var exec = require('child_process').execFile;
                    var dnginx = exec(__dirname + path.sep + '..' + path.sep + 'nginx' + path.sep + 'nginx', [
                        "-s", "reload"
                    ]);
                });
                return res.end(JSON.stringify(response));
            });
        });

    });

    app.post('/api/unregister_worker', function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        mysql_query("DELETE FROM workers WHERE id='" + req.body.id + "'", function (e, r) {
            console.log("- Worker id#" + req.body.id + ' unregistered.');
            if (e) return res.end(JSON.stringify(e));
            NGINX_CONFIG(req.body.task, function () {
                console.log('- reloading NGINX.')
                var exec = require('child_process').execFile;
                var path = require('path');
                var dnginx = exec(__dirname + path.sep + '..' + path.sep + 'nginx' + path.sep + 'nginx', [
                    "-s", "reload"
                ]);
            });
            return res.end(JSON.stringify(r));
        });

    });

    /*
    Register Hypervisor
    */
    app.post('/api/register_hypervisor', function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        var fs = require('fs');
        var result = {
            status: 'failed'
        };
        var values = [];
        values.push('"' + req.body.hid + '"');
        values.push("(select uid from pids where is_admin=1 and pid_id='" + req.body.pid + "')");
        values.push('"' + req.body.host + '"');
        values.push('"' + req.body.ip + '"');
        values.push('"' + req.body.label + '"');
        values.push('"' + req.body.ca + '"');
        values.push('"' + req.body.cert + '"');
        values.push('"' + req.body.key + '"');

        fs.readFile(__dirname + '/../../config/trustedhosts.json', function (e, r) {
            var TRUSTED_HOSTS = JSON.parse(r.toString('utf-8'));
            if (TRUSTED_HOSTS.indexOf(req.body.ip) == -1) TRUSTED_HOSTS.push(req.body.ip);
            fs.writeFile(__dirname + '/../../config/trustedhosts.json', JSON.stringify(TRUSTED_HOSTS, null, 4), function () {
                var PORTS = [
                    Config["db.port"],
                    Config['session.port'],
                    32636,
                    32638,
                    32640
                ];
                for (var j = 0; j < PORTS.length; j++) {
                    shelljs.exec('iptables -A INPUT -s ' + req.body.ip + ' -p tcp --destination-port ' + PORTS[j] + ' -m state --state NEW,ESTABLISHED -j ACCEPT', {
                        silent: false
                    });
                    shelljs.exec('iptables -A OUTPUT -d ' + req.body.ip + ' -p tcp --source-port ' + PORTS[j] + ' -m state --state ESTABLISHED -j ACCEPT', {
                        silent: false
                    });
                }
            });
        });

        mysql_query("INSERT INTO hypervisors (`uuid`,`uid`,`host`,`ip`,`label`,`ca`,`cert`,`key`) VALUES (" + values.join(',') + ")", function (e, r) {

            if (e) {
                var err = [];
                mysql_query("select * from hypervisors where label='" + req.body.label + "'", function (e, r) {
                    if (r.length > 0) err.push('Duplicate label');
                    mysql_query("select * from hypervisors where ip='" + req.body.ip + "'", function (e, r) {
                        if (r.length > 0) err.push('Duplicate IP');
                        mysql_query("select * from hypervisors where host='" + req.body.host + "'", function (e, r) {
                            if (r.length > 0) err.push('Duplicate host');
                            result.err = err;
                            console.log(err)
                            return res.end(JSON.stringify(result));
                        });
                    });
                });
                return;
            };
            if (r.affectedRows == 1) {
                Hostile.set(req.body.ip, req.body.host, function (errs) {
                    if (errs) {
                        var err = [];
                        err.push(errs);
                        result.err = err;
                        return res.end(JSON.stringify(result));
                    } else {
                        var shelljs = require('shelljs');
                        shelljs.exec('gluster peer probe ' + req.body.host);
                        result.status = 'success';
                        result.cluster = Config.url;
                        mysql_query("SELECT host,ip FROM hypervisors", function (e, r) {
                            console.log(__dirname + '/../../.ip');
                            fs.readFile(__dirname + '/../../.ip', function (e, ip) {
                                var ip = ip.toString('utf-8');
                                ip = ip.split('\n')[0];
                                r.push({
                                    host: Config['label'],
                                    ip: ip
                                });
                                result.peers = r;
                                res.end(JSON.stringify(result));
                            });
                        });
                    }
                });
            } else {
                var err = [];
                mysql_query("select * from hypervisors where label='" + req.body.label + "'", function (e, r) {
                    if (r.length > 0) err.push('Duplicate label');
                    mysql_query("select * from hypervisors where ip='" + req.body.ip + "'", function (e, r) {
                        if (r.length > 0) err.push('Duplicate IP');
                        mysql_query("select * from hypervisors where host='" + req.body.host + "'", function (e, r) {
                            if (r.length > 0) err.push('Duplicate host');
                            result.err = err;
                            return res.end(JSON.stringify(result));
                        });
                    });
                });
            }
        });
    });
}