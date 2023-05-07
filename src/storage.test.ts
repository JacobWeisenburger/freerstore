import 'fake-indexeddb/auto'
import { dbStorage } from './dbStorage'

// import {
//     indexedDB,
//     IDBCursor,
//     IDBCursorWithValue,
//     IDBDatabase,
//     IDBFactory,
//     IDBIndex,
//     IDBKeyRange,
//     IDBObjectStore,
//     IDBOpenDBRequest,
//     IDBRequest,
//     IDBTransaction,
//     IDBVersionChangeEvent,
// } from 'npm:fake-indexeddb'

// Deno.test( 'dbStorage', () => {
//     indexedDB.open( 'test' )
// } )

describe( 'index.ts', () => {

    it( ``, async () => {
        const db = await dbStorage.getDB( 'test' )
        console.log( db )
        await dbStorage.addCollection( db, 'test', 'id' )
    } )


} )