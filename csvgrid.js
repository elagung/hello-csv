'use strict';

const fs = require('fs');
const debug = require('debug')('csvgrid');
const parse = require('csv-parse');

/* CSV Grid Class */
class CSVGrid {
    constructor() {
        /* Define column names list. */
        this.cols = [];

        /* Define row list */
        this.rows = [];
    }

    /**
     * Formatted Rows Getter
     * This getter will return an array contains formatted items.
     *
     * @returns {Array}
     */
    get maps() {
        /* Define array result */
        let maps = [];

        /* Iterate each rows to create new formatted row */
        this.rows.forEach(( row ) => {
            /* Define formatted row object */
            let rowObject = {};

            /* Iterate each column names to get the object key and value index */
            this.cols.forEach(( name, i ) => {
                /* Assign value to formatted row by getting the key index from current row */
                rowObject[ name ] = row[ i ] || '';
            });

            /* Push the formatted row to the result */
            maps.push(rowObject);
        });

        /* Return the result */
        return maps;
    }

    /**
     * CSV File Importer
     * This function will read the CSV file and parse the contents after read complete.
     *
     * @param filePath - Strinf CSV file path.
     * @returns {Promise}
     */
    import( filePath ) {
        /* Create new promise and return it to handle the imports. */
        return new Promise(( resolve, reject ) => {
            /* Read the file to get the CSV String. */
            fs.readFile(filePath, 'utf8', ( error, result ) => {
                debug(`Importing CSV from ${filePath}`);

                if ( error ) {
                    /* If error happen, reject the import. */
                    reject(error);
                } else {
                    /* Parse the CSV String if no error. */
                    this.parse(result).then(() => {
                        /* Resolve the imports by giving this class. */
                        resolve(this);
                    }).catch(( error ) => {
                        /* Reject the import if some error happen when parsing the CSV */
                        reject(error);
                    });
                }
            });
        });
    }

    /**
     * CSV String Parser
     * This function will parse the CSV String, creates column list, and add the items to the row list.
     *
     * @param csvString - String CSV contents to be parsed.
     * @return {CSVGrid}
     */
    parse( csvString ) {
        /* Create new promise to handle the parser */
        return new Promise(( resolve, reject ) => {
            /* Parse the CSV String use csv-parse */
            parse(csvString, ( err, lines ) => {
                if ( err ) {
                    /* If error, reject the parser */
                    reject(err);
                } else {
                    /* If no error, add the columns and the rows. */
                    this.cols = lines[ 0 ];
                    this.rows = lines.slice(1);

                    /* Resolve the parser by giving this class */
                    resolve(this);
                }
            });
        });
    }

    /**
     * Column Maker
     * This function will insert new column and fill the existing rows.
     *
     * @param colName - [required] String column name.
     * @param index - (optional) Number column position to insert in.
     * @param colValue - (optional) Value to fill the existing rows. Use function to create a computed value.
     * @returns {CSVGrid}
     */
    insertColumn( colName, index, colValue ) {
        /* Ignore if the colName is not a string */
        if ( 'string' !== typeof colName ) {
            return this;
        }

        /* Insert new column to the column list */
        if ( 'number' === typeof index && index < this.cols.length ) {
            /* Create new column list if the index is defined */
            let newCols = [];

            /* Iterate current columns to insert new column at specified index */
            this.cols.forEach(( name, i ) => {
                /* Insert the new column name if the current index is equal to the spcified index */
                if ( i === index ) {
                    newCols.push(colName);
                }

                /* Re-insert the existing name */
                newCols.push(name);
            });

            /* Replace the current columns with new columns */
            this.cols = newCols;
        } else {
            /* Simply push the new column name if no index specified */
            this.cols.push(colName);
        }

        /* Fill new column value to the existing rows */
        this.rows.forEach(( row, i ) => {
            /* Define computed value variable */
            let computedValue;

            /* Run the function to create computed value if the colValue is a function */
            /* When creating computed value, the given function will become this class instance and will get current row as an argument */
            if ( 'function' === typeof colValue ) {
                computedValue = colValue.call(this, row);
            }

            /* Insert the new column value to the current row */
            if ( 'number' === typeof index && index < row.length ) {
                /* Create new row if custom index specified */
                let newCols = [];

                /* Iterate the current row values to insert the new value at specified index */
                row.forEach(( value, j ) => {
                    /* If the current index is equal to the requested index, the insert the new value */
                    if ( j === index ) {
                        newCols.push(computedValue || colValue);
                    }

                    /* Insert the current value */
                    newCols.push(value);
                });

                /* Replace the current row with new row */
                this.rows[ i ] = newCols;
            } else {
                /* Simply push the new column value if no custom index specified */
                this.rows[ i ].push(colValue);
            }
        });

        return this;
    }

    /**
     * Row Maker
     * This function will add new row to the list.
     *
     * @param newRow - Array or Object row to insert.
     * @returns {CSVGrid}
     */
    insertRow( newRow ) {
        if ( Array.isArray(newRow) ) {
            /* Simply push the newRow to the list if the newRow is an array */
            this.rows.push(newRow);
        } else if ( 'object' === typeof newRow ) {
            /* Create array row if the newRow is an object */
            let arrayRow = [];

            /* Iterate each properties to add the value to the row */
            Object.keys(newRow).forEach(name => {
                /* Get the column index of current name */
                let colIndex = this.cols.indexOf(name);

                /* Insert the value to the row only if the name is a valid column name */
                if ( colIndex === -1 ) {
                    throw new Error(`Unknown field name: ${name}`);
                } else {
                    arrayRow[ colIndex ] = newRow[ name ];
                }
            });

            /* Push the array row to the list */
            this.rows.push(arrayRow);
        }

        return this;
    }

    /**
     * Item Iterator
     * This function will iterate the items (rows or maps), and wait until next() to proceed the next items.
     *
     * @param group - String items group (rows or maps).
     * @param callback
     */
    forEach( group, callback ) {
        /* Wrap this with self */
        let self = this;

        /* Get the items */
        let rows = this[ group ];

        /* Define the current index */
        let cursor = 0;

        /* Call the next() to proceed the iterator */
        next();

        /* Call the callback and give the item, index, and next() as arguments */
        function next() {
            /* Proceed only if the current index is less than rows length */
            if ( cursor < self.rows.length ) {
                callback.call(self, rows[ cursor ], cursor, next);

                /* Increase the current index to get the next items */
                cursor += 1;
            }
        }
    }

    /**
     * Formatted Rows Iterator
     *
     * @param callback
     * @returns {*}
     */
    eachMaps( callback ) {
        return this.forEach('maps', callback);
    }

    /**
     * Array Rows Iterator
     *
     * @param callback
     * @returns {*}
     */
    eachRows( callback ) {
        return this.forEach('rows', callback);
    }
}

/* Export the CSVGrid as module */
module.exports = CSVGrid;
