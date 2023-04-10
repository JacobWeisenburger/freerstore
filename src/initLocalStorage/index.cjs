if ( typeof localStorage === 'undefined' || localStorage === null ) {
    const { LocalStorage } = require( 'node-localstorage' )
    global.localStorage = new LocalStorage( './tmp/node-localstorage' )
}