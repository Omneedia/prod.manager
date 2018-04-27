module.exports = function (Config, TRUSTED_HOSTS, cb) {

    var shelljs = require('shelljs');

    // Configure iptables
    console.log('- Securing network');

    var CMD = [];

    // Open all ports

    CMD.push('# omneedia secure iptable');
    CMD.push('*filter');
    CMD.push(':INPUT ACCEPT [9376:849561]');
    CMD.push(':FORWARD ACCEPT [0:0]');
    CMD.push(':OUTPUT ACCEPT [9650:48089375]');

    // List ports to open

    var PORTS = [
        Config["db.port"],
        Config['session.port'],
        32636,
        32638,
        32640
    ];

    /*
    INPUT
    */
    // Open port only to trusted hosts

    for (var i = 0; i < TRUSTED_HOSTS.length; i++) {
        //        console.log('	- [' + TRUSTED_HOSTS[i] + '] authorized')
        for (var j = 0; j < PORTS.length; j++) {
            CMD.push('-A INPUT -s ' + TRUSTED_HOSTS[i] + ' -p tcp --destination-port ' + PORTS[j] + ' -m state --state NEW,ESTABLISHED -j ACCEPT');
            CMD.push('-A OUTPUT -d ' + TRUSTED_HOSTS[i] + ' -p tcp --source-port ' + PORTS[j] + ' -m state --state ESTABLISHED -j ACCEPT');
        }
    };

    // Drop ports to world but trusted hosts

    for (var i = 0; i < PORTS.length; i++) {
        CMD.push('-A INPUT -p tcp --dport ' + PORTS[i] + ' -j DROP');
        CMD.push('-A OUTPUT -p tcp --source-port ' + PORTS[i] + ' -j DROP');
    }

    // Stats port
    CMD.push('-A INPUT -s 127.0.0.1 -p tcp --destination-port 61208 -m state --state NEW,ESTABLISHED -j ACCEPT');
    CMD.push('-A OUTPUT -d 127.0.0.1 -p tcp --source-port 61208 -m state --state ESTABLISHED -j ACCEPT');
    CMD.push('-A INPUT -p tcp --dport 61208 -j DROP');
    CMD.push('COMMIT');
    CMD.push('# omneedia secure iptable');

    require('fs').writeFile(__dirname + '/../../var/secure', CMD.join('\n'), function (e) {
        shelljs.exec('iptables-restore < "' + __dirname + '/../../var/secure' + '"', {
            silent: true
        });
        cb();
    })

}