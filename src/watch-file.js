/*

HUBOT_WATCH_FILE_1 = 'roomid=path'

*/

var chokidar = require('chokidar')

module.exports = function(robot) {

    var watchTargets = [];
    for (envName in process.env) {
        if (/^HUBOT_WATCH_FILE_\d+$/.test(envName)) {
            var value = process.env[envName];
            var matched = value.match(/^([^=]+)=(.+)$/);
            watchTargets.push({
                room: matched[1],
                target: matched[2]
            });
        }
    }
    if (watchTargets.length <= 0) {
        console.error('[hubot-watch-file] No watching directiries. Please set process.env.HUBOT_WATCH_FILE_1, process.env.HUBOT_WATCH_FILE_2..');
        return;
    }

    var watcherOption = {
        ignoreInitial: true,    // 初回読み込み時にはaddイベントを発火させない
        ignored: /^\./,         // ドットファイルは除外
        persistent: true	   // true = 監視を継続する
    };

    var watchers = watchTargets.map(function(watchTarget) {
        //console.log('Register watching...', watchTarget);
        var watcher = chokidar.watch(watchTarget.target, watcherOption);
        watcher
            .on('ready', function() {
                //console.log('now on ready: ' + watchTarget.target)
                robot.send(watchTarget.room, "Watching: " + watchTarget.target)
            })
        	.on('add', function(path) {
                //console.log('file added:' + path)
                robot.send(watchTarget.room, 'Add file: ' + path)
            })
        	//.on('addDir', function(path) { console.log("追加ディレクトリ-> " + path); })
        	.on('unlink', function(path) {
                robot.send(watchTarget.room, 'Delete file: ' + path)
            })
        	//.on('unlinkDir', function(path) { console.log("削除されました-> " + path); })
        	.on('change', function(path) {
                robot.send(watchTarget.room, 'Change file: ' + path)
            })
        	.on('error', function(error) {
                robot.send(watchTarget.room, 'Error: ' + error)
            })
        return watcher;
    });

    robot.hear(/監視(?:している|する)?(?:ファイル|file)を?(?:教|おし)えて/i, function(msg) {
        var message = 'Now watching:\n';
        watchTargets.forEach(function(watchTarget) {
            message += '\t' + watchTarget.room + ' = ' + watchTarget.target + '\n';
        });
        if (/\n$/.test(message)) {
            message = message.replace(/\n$/, '');
        }
        msg.send(message);
    });

    return watchers;
};
