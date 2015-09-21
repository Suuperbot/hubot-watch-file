// Description:
//   A hubot script that watch for file changes.
// Commands:
//   hubot 監視しているファイルを教えて  - Return watching directiries
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

    robot.logger.info("start watch-file: " + watchTargets.map(function(watchTarget) { return '[#' + watchTarget.room + '] ' + watchTarget.target }).join(', '));

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
                robot.logger.info('ready now: room = ' + watchTarget.room + ', target = ' + watchTarget.target);
                robot.send({room: watchTarget.room}, "Ready Watching: " + watchTarget.target)
            })
        	.on('add', function(path) {
                //console.log('file added:' + path)
                robot.send({room: watchTarget.room}, 'Add file: ' + path)
            })
        	//.on('addDir', function(path) { console.log("追加ディレクトリ-> " + path); })
        	.on('unlink', function(path) {
                robot.send({room: watchTarget.room}, 'Delete file: ' + path)
            })
        	//.on('unlinkDir', function(path) { console.log("削除されました-> " + path); })
        	.on('change', function(path) {
                robot.send({room: watchTarget.room}, 'Change file: ' + path)
            })
        	.on('error', function(error) {
                robot.send({room: watchTarget.room}, 'Error: ' + error)
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
