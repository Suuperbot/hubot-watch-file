var fs = require('fs')
    path = require('path');

module.exports = function(robot, scripts) {
    var scriptsPath = path.resolve(__dirname, 'src');
    fs.exists(scriptsPath, function(exists) {
        if (!exists) return;
        fs.readdirSync(scriptsPath).forEach(function(script) {
            if (scripts && scripts.every(function(scr) { return scr !== '*' }) && scripts.some(function(scr) { return scr === script })) {
                robot.loadFile(scriptsPath, script)
            } else {
                robot.loadFile(scriptsPath, script);
            }
        });
    });
};
