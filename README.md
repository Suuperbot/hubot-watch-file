 hubot-watch-file
==================

## Install

```
npm install --save hubot-watch-file
```

## Prerequirement

Edit your external script of your hubot.

```
vi ./external-scripts.json
+  "hubot-watch-file",
```

Add environment varibale(s).

```
export HUBOT_WATCH_FILE_1="{room_id}={directory path}
export HUBOT_WATCH_FILE_2="{room_id}={directory path}
export HUBOT_WATCH_FILE_3="{room_id}={directory path}
...
bin/hubot
```

## Sample

```
export HUBOT_WATCH_FILE_1="1243=/Users/michael/Documents/"
bin/hubot
```
