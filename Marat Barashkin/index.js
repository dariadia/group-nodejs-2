// const lesson1 = require('./lesson_1/index');
const lesson2 = require('./lesson_2/index');
const showLogs = require('./lesson_2/showLog');
// lesson2.gameUserInterface();
// node index.js ./lesson_2/logs/gamelog.json посмотреть лог через ввод аргумента
!process.argv[2] ? lesson2.gameUserInterface() : showLogs(process.argv[2]);