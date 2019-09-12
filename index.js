var http = require('http');
const fs = require('fs');
const cache = {};
const FindPattern = require('./FindPattern.js');
const express = require('express');
const level = require('level');
const levelSubscribe = require('./LevelSubscribe');
const createLoggingWritable = require('./loggingWritable');

const app = express();
const port = 3000;

function invokeProxy() {
	const writable = fs.createWriteStream('xtest.json');

	const writableProxy = createLoggingWritable(writable);

	writableProxy.write('First chunk');
	writableProxy.write('Second chunk');
	writable.write('This is not logged');
	writableProxy.end();
}
// import FindPattern from './FindPattern.js';
function inconsistentRead(filename, callback) {
	if (cache[filename]) {
		//invoked synchronously
		//callback(cache[filename]);
		process.nextTick(() => callback(cache[filename]));
	} else {
		//asynchronous function
		fs.readFile(filename, 'utf8', (err, data) => {
			cache[filename] = data;
			callback(data);
		});
	}
}

function createFileReader(filename) {
	const listeners = [];
	inconsistentRead(filename, (value) => {
		listeners.forEach((listener) => listener(value));
	});
	return {
		onDataReady: (listener) => listeners.push(listener)
	};
}

function checkRegex() {
	const regex = '(^d)';
	// const findPattern = new FindPattern(regex);
	const findPatternObject = new FindPattern(/hello \w+/);
	findPatternObject.addFile('./xtest.json');
	findPatternObject
		.find()
		.on('found', (file, match) => console.log(`Matched "${match}" in file ${file}`))
		.on('fileread', (file) => console.log(`fileread  in file ${file}`))
		.on('error', (err) => console.log(`Error emitted ${err.message}`));
}
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
app.get('/proxy', (request, response) => {
	invokeProxy();
});
app.get('/decorator', (request, response) => {
	// Send the HTTP header
	// HTTP Status: 200 : OK
	// Content Type: text/plain

	// const reader1 = createFileReader('test.json');
	// reader1.onDataReady((data) => {
	// 	console.log('First call data: ' + data);
	// 	//...sometime later we try to read again from
	// 	//the same file
	// 	const reader2 = createFileReader('test.json');
	// 	reader2.onDataReady((data) => {
	// 		console.log('Second call data: ' + data);
	// 	});
	// });
	let db = level(__dirname + '/db', { valueEncoding: 'json' });
	db = levelSubscribe(db);
	db.subscribeEvent(
		{ doctype: 'company' },
		(k, val) => {
			//response.writeHead(200, { 'Content-Type': 'text/plain' });

			// Send the response body as "Hello World"
			console.log(val);
			//response.end(JSON.stringify(val));
			response.json(val);
		}
		//[3]
	);
	db.put('2', { doctype: 'company', name: 'xACME Co.' });
	db.put('1', { doctype: 'tweet', text: 'Hi', language: 'en' }); //[4]
	db.put('2', { doctype: 'company', name: 'ACME Co.' });
	db.put('2', { doctype: 'company', name: 'Acorp' });
});

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');
