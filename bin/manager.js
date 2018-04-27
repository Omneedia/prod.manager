/** 
Omneedia Manager
v 1.0.0 (reboot)
**/

var cluster = require('cluster');
var os = require('os');
var fs = require('fs');

var networkInterfaces = require('os').networkInterfaces();

var IP = [];
for (var e in networkInterfaces) IP.push(networkInterfaces[e][0].address);

function ERROR(message) {

    console.log(' ');
    console.log(' GURU-MEDITATION:' + message);
    console.log(' ');
    process.exit();

}

var CONFIG = __dirname + '/../config/';

require('./lib/utils/dates.js')();
require('./lib/utils/db')();
require('./lib/utils/fs')();
require('./lib/utils/crypto')();
var NET = require('./lib/utils/net');

CLUSTER_DEFAULT = {
    "cluster.ip": NET.getIPAddress(),
    "cluster.port": "9191",
    "session.port": "24333",
    "db.port": "3334",
    "threads": "*",
    "label": "manager.yourdomain.com",
    "url": "https://manager.yourdomain.com"
};

var startMaster = require("./lib/Master");
var startThreads = require('./lib/Threads');

function loadConfig(type, _default, cb) {
    fs.readFile(CONFIG + type + '.json', function (e, b) {
        if (e) {
            fs.writeFile(CONFIG + type + '.json', JSON.stringify(_default, null, 4));
            return cb(_default);
        };
        try {
            cb(JSON.parse(b.toString('utf-8')));
        } catch (e) {
            console.log('------');
            console.log(e);
            ERROR('[INIT] ' + type + ' configuration error');
        }
    });
};

var watch = require('node-watch');

var rules = [
    "127.0.0.1",
    NET.getIPAddress()
];

var line = "server_names_hash_bucket_size  512;\nserver_names_hash_max_size 512;\nclient_max_body_size 2000M;";

fs.writeFile(__dirname + '/../config/engines/nginx/conf.d/omneedia.conf', line, function () {
    loadConfig('trustedhosts', rules, function (TRUSTED_HOSTS) {
        global.TRUSTED_HOSTS = TRUSTED_HOSTS;
        watch(CONFIG + 'trustedhosts.json', function (evt, filename) {

            console.log('! updating securing rules...');
            //setTimeout(function () {
            loadConfig('trustedhosts', rules, function (TRUSTED_HOSTS) {
                global.TRUSTED_HOSTS = TRUSTED_HOSTS;
                require(__dirname + '/lib/secure')(global.config, TRUSTED_HOSTS, function () {
                    console.log('updated.');
                });
            });
            //}, 5000);

        });

        loadConfig('cluster', CLUSTER_DEFAULT, function (Config) {
            global.config = Config;
            if (cluster.isMaster) startMaster(TRUSTED_HOSTS, NET, cluster, Config);
            else startThreads(TRUSTED_HOSTS, NET, cluster, Config);
        });
    });
});