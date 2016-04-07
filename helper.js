'use strict';

const debug = require('debug')('hello-helper');
const AWS = require('mock-aws-s3');

AWS.config.basePath = __dirname + '/buckets';

const s3 = AWS.S3({ params: { Bucket: 'example' } });

// Mark the request as timed out and return new error when the request time more than 500ms.
function surprise( time, name ) {
    if ( time >= 500 ) {
        return new Error(`w00t!!! ${name} request timed out`);
    }
}

// simulates sending sms
exports.sendSms = function SendSMS( data ) {
    return new Promise(( resolve, reject ) => {
        let time = randomTime();

        setTimeout(() => {
            debug(`sending out sms: ${JSON.stringify(data)}`);

            let error = surprise(time, 'sending-sms');

            if ( error ) {
                reject(error);
            } else {
                resolve({ status: 200, message: 'SMS Sent', data: data });
            }
        }, time);
    });
};

// simulates logging to s3
exports.logToS3 = function ( data ) {
    return new Promise(( resolve, reject ) => {
        let time = randomTime();

        setTimeout(() => {
            debug(`putting data to S3: ${JSON.stringify(data)}`);

            let options = {
                Key: `row/line-${new Date().valueOf()}.json`,
                Body: JSON.stringify(data),
            };

            s3.putObject(options, ( error ) => {
                if ( error ) {
                    reject(error);
                } else {
                    error = surprise(time, 'log-to-s3');

                    if ( error ) {
                        reject(error);
                    } else {
                        resolve({ data, logged: true, status: 200, message: 'Status logged' });
                    }
                }
            });
        }, time);
    });
};

// Generate random time to simulate request time.
function randomTime() {
    return Math.floor(Math.random() * 1000);
}
