'use strict';

const debug = require('debug')('hello');

const CSVGrid = require('./csvgrid');
const helper = require('./helper');

/* Get the ignore error from CLI arguments */
const ignoreError = (process.argv.indexOf('--ignore-error') > -1);

/* Create new CSVGrid instance as an addressBook */
let addressBook = new CSVGrid();

/* Import the sample to the addressBook */
addressBook
    .import('./sample.csv')
    .then(addressBook => {
        /* Insert full_name column to index 2, and fill the contacts full_name with a computed value */
        addressBook.insertColumn('full_name', 2, row => {
            /* Pick the first and second row index as a full name value */
            return `${row[ 0 ]} ${row[ 1 ]}`;
        });

        /* Iterate the formatted contancts to send them via SMS */
        addressBook.eachMaps(( contact, i, next ) => {
            debug(`Sending contact of ${contact.full_name}...`);

            /* Send the concat via SMS */
            helper
                .sendSms(contact)
                .then(response => {
                    /* Log the response message */
                    debug(`Sending SMS success with message: ${response.message}`);

                    /* Log to S3 with response */
                    logToS3(response);
                })
                .catch(error => {
                    /* Log the error */
                    debug(`${error.message} when sending contact of ${contact.full_name}`);

                    /* Log to S3 with custom error response */
                    logToS3({ status: 500, message: error.message, data: contact });
                });

            /* Log to S3 wrapper */
            function logToS3( data ) {
                debug(`Logging SMS response to AWS S3...`);

                /* Save the SMS response to S3 */
                helper
                    .logToS3(data)
                    .then(result => {
                        /* Log the S3 result message */
                        debug(`Logging to AWS S3 success with message: ${result.message}`);

                        /* Proceed the next contact */
                        next();
                    })
                    .catch(error => {
                        /* Log the error */
                        debug(`${error.message} when logging sms response of ${contact.full_name}`);

                        /* Proceed the next contanct if error is ignored */
                        if ( ignoreError ) {
                            next();
                        }
                    });
            }
        });
    })
    .catch(error => {
        debug(error.message);
    });
