var fs = require('fs-extra');
var path = require('path');
var watchFile = require('../src/watch-file');

function clearEnvironmentVariables() {
    for (envName in process.env) {
        if (/^HUBOT_WATCH_FILE_\d+$/.test(envName)) {
            delete process.env[envName];
        }
    }
}

describe('general', function() {
    beforeEach(clearEnvironmentVariables);
    beforeEach(function() {
        process.env.HUBOT_WATCH_FILE_1 = '12456=/usr/bin/';
        process.env.HUBOT_WATCH_FILE_3 = 'Ababa=/Users/home/test';
    });
    beforeEach(function() {
        this.robot = {
            logger: {
                info: sinon.spy(),
                error: sinon.spy()
            },
            respond: sinon.spy(),
            hear: sinon.spy(),
            send: sinon.spy()
        };
        watchFile(this.robot);
    });

    it('registers a hear listener', function() {
        assert.ok(this.robot.hear.calledOnce);

        var spyCall = this.robot.hear.getCall(0);
        assert.ok(spyCall.args.length === 2);

        var pattern = spyCall.args[0];
        [
            '監視しているファイルを教えて',
            '監視するファイルを教えて',
            '監視ファイルを教えて',
            '監視しているファイル教えて',
            '監視するファイル教えて',
            '監視ファイル教えて',
            '監視fileを教えて',
            '監視Fileを教えて',
            '監視FILEをおしえて'
        ].forEach(function(hearString) {
            assert.ok(pattern.test(hearString));
        });

        var spyMsg = { send: sinon.spy() };
        spyCall.args[1](spyMsg);
        assert.ok(spyMsg.send.calledOnce);
        var msgString = spyMsg.send.getCall(0).args[0];

        assert(msgString === 'Now watching:\n\t12456 = /usr/bin/\n\tAbaba = /Users/home/test');

    });
});

describe('watch any added files', function() {
    var temp1Path = path.join(__dirname, 'temp1');
    var temp2Path = path.join(__dirname, 'temp2');
    beforeEach(clearEnvironmentVariables);
    beforeEach(function() {
        process.env.HUBOT_WATCH_FILE_1 = '9282=' + temp1Path;
        process.env.HUBOT_WATCH_FILE_2 = '1317=' + temp2Path;
    });
    beforeEach(function() {
        if (fs.existsSync(temp1Path)) {
            fs.removeSync(temp1Path);
        }
        if (fs.existsSync(temp2Path)) {
            fs.removeSync(temp2Path);
        }
        fs.mkdirSync(temp1Path);
        fs.mkdirSync(temp2Path);
    });
    beforeEach(function() {
        this.robot = {
            logger: {
                info: sinon.spy(),
                error: sinon.spy()
            },
            respond: sinon.spy(),
            hear: sinon.spy(),
            send: sinon.spy()
        };
        this.watchers = watchFile(this.robot);
    });
    afterEach(function() {
        this.watchers.forEach(function(watcher) {
            watcher.close();
        });
        this.watchers = null;
    });

    function waitForMessage(robot, messagePattern, cb) {
        var timer = setInterval(function() {
            if (!robot.send.called) {
                return;
            }
            clearInterval(timer);
            cb();
        });
    }

    function testFile(readyFunc, waitMessageCount, checkResultFunc) {
        var robot = this.robot;
        waitForMessage(robot, /^Watching: /, function() {
            readyFunc();

            // 監視通知が届くまで待つ
            var messages = [];
            var timer = setInterval(function() {

                // 監視通知の確認
                for (var i = 0; i < robot.send.callCount; i++) {
                    var spyCall = robot.send.getCall(i);
                    //console.log('[' + i + '] = ' + spyCall.args);
                    var room = spyCall.args[0];
                    var message = spyCall.args[1];
                    if (/(?:Add|Delete|Change) file: /.test(message)) {
                        messages.push({
                            room: spyCall.args[0].room,
                            message: spyCall.args[1]
                        });
                    }
                }

                if (messages.length < waitMessageCount) {
                    return;
                }

                clearInterval(timer);

                checkResultFunc(messages.sort(function(a, b) {
                    if (a.room > b.room) return 1;
                    if (a.room < b.room) return -1;
                    if (a.message > b.message) return 1;
                    if (a.message < b.message) return -1;
                    return 0;
                }));
            }, 100);
        });
    }

    // ファイル追加の監視
    it('add a file', function(cb) {
        testFile.apply(this, [function() {
            // ダミーファイルの生成
            fs.outputFileSync(path.join(temp1Path, 'sample'), 'hello!');
        }, 1, function(messages) {
            assert(messages.length === 1);
            assert(messages[0].room === '9282');
            assert(messages[0].message === 'Add file: ' + path.join(temp1Path, 'sample'));
            cb();
        }]);
    });

    // 複数ファイル追加の監視
    it('add two files', function(cb) {
        testFile.apply(this, [function() {
            // ダミーファイルの生成
            fs.outputFileSync(path.join(temp1Path, 'sample'), 'hello!');
            fs.outputFileSync(path.join(temp2Path, 'example'), 'hello?');
        }, 2, function(messages) {
            assert(messages.length === 2);
            assert(messages[0].room === '1317');
            assert(messages[0].message === 'Add file: ' + path.join(temp2Path, 'example'));
            assert(messages[1].room === '9282');
            assert(messages[1].message === 'Add file: ' + path.join(temp1Path, 'sample'));
            cb();
        }]);
    });

    // ファイル更新の監視
    it('updates a file', function(cb) {
        var dummyFile1 = path.join(temp1Path, 'sample');
        fs.outputFileSync(dummyFile1, 'hello!');
        testFile.apply(this, [function() {
            // ダミーファイルの更新
            fs.outputFileSync(dummyFile1, 'hello!!!!!!');
        }, 1, function(messages) {
            assert(messages.length === 1);
            assert(messages[0].room === '9282');
            assert(messages[0].message === 'Change file: ' + path.join(temp1Path, 'sample'));
            cb();
        }]);
    });

    // 複数ファイル更新の監視
    it('updates two files', function(cb) {
        var dummyFile1 = path.join(temp1Path, 'sample');
        var dummyFile2 = path.join(temp2Path, 'example');
        fs.outputFileSync(dummyFile1, 'hello!');
        fs.outputFileSync(dummyFile2, 'hello!!!');
        testFile.apply(this, [function() {
            // ダミーファイルの更新
            fs.outputFileSync(dummyFile1, 'hello!!!!!!');
            fs.outputFileSync(dummyFile2, 'hohohohohoho');
        }, 2, function(messages) {
            assert(messages.length === 2);
            assert(messages[0].room === '1317');
            assert(messages[0].message === 'Change file: ' + dummyFile2);
            assert(messages[1].room === '9282');
            assert(messages[1].message === 'Change file: ' + dummyFile1);
            cb();
        }]);
    });

    // ファイル削除の監視
    it('deleted a file', function(cb) {
        var dummyFile1 = path.join(temp1Path, 'sample');
        fs.outputFileSync(dummyFile1, 'hello!');
        testFile.apply(this, [function() {
            // ダミーファイルの削除
            fs.removeSync(dummyFile1);
        }, 1, function(messages) {
            assert(messages.length === 1);
            assert(messages[0].room === '9282');
            assert(messages[0].message === 'Delete file: ' + path.join(temp1Path, 'sample'));
            cb();
        }]);
    });

    // 複数ファイル削除の監視
    it('deleted two files', function(cb) {
        var dummyFile1 = path.join(temp1Path, 'sample');
        var dummyFile2 = path.join(temp2Path, 'example');
        fs.outputFileSync(dummyFile1, 'hello!');
        fs.outputFileSync(dummyFile2, 'hello!!!');
        testFile.apply(this, [function() {
            // ダミーファイルの削除
            fs.removeSync(dummyFile1);
            fs.removeSync(dummyFile2);
        }, 2, function(messages) {
            assert(messages.length === 2);
            assert(messages[0].room === '1317');
            assert(messages[0].message === 'Delete file: ' + dummyFile2);
            assert(messages[1].room === '9282');
            assert(messages[1].message === 'Delete file: ' + dummyFile1);
            cb();
        }]);
    });

    // 組み合わせ
    it('used in combination with ADD and DELETE and UPDATE', function(cb) {
        var dummyFile1 = path.join(temp1Path, 'sample');
        var dummyFile2 = path.join(temp2Path, 'example');
        var dummyFile3 = path.join(temp1Path, 'sample-sample');
        fs.outputFileSync(dummyFile1, 'hello!');
        fs.outputFileSync(dummyFile2, 'hello!!!');
        testFile.apply(this, [function() {
            // ファイルの追加
            fs.outputFileSync(dummyFile3, 'hahahahahaha');
            // ファイルの削除
            fs.removeSync(dummyFile1);
            // ファイルの更新
            fs.outputFileSync(dummyFile2, 'hello, world.');
        }, 3, function(messages) {
            assert(messages.length === 3);
            assert(messages[0].room === '1317');
            assert(messages[0].message === 'Change file: ' + dummyFile2);
            assert(messages[1].room === '9282');
            assert(messages[1].message === 'Add file: ' + dummyFile3);
            assert(messages[2].room === '9282');
            assert(messages[2].message === 'Delete file: ' + dummyFile1);
            cb();
        }]);
    });
});
