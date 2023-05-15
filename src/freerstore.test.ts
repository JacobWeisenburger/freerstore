import 'fake-indexeddb/auto'
import './initLocalStorage/index.cjs'

import { z } from 'zod'
import { initializeApp } from 'firebase/app'
import { firestore } from './firestore'
import { freerstore } from '.'
import { logDeep, wait } from './utils'
import { CollectionEventName, collectionEventNames } from './freerstore'
import { range } from 'radash'

// https://github.com/jestjs/jest/issues/14138

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2Ftest~2FICpPGmgAYFR3X7b5w6xJ
// https://console.firebase.google.com/u/0/project/royal-drive-dms-dev-987123654/firestore/data/~2Fcars~2F11111111111111111

const firestoreEmulatorPort = 9000
const projectId = 'freerstore-tests'
const firebaseApp = initializeApp( { projectId } )
const firestoreDB = firestore.getFirestore( firebaseApp )
firestore.connectFirestoreEmulator( firestoreDB, 'localhost', firestoreEmulatorPort )

async function clearDb () {
    // https://firebase.google.com/docs/emulator-suite/connect_firestore#clear_your_database_between_tests

    const url = `http://localhost:${ firestoreEmulatorPort }/emulator/v1/projects/${ projectId }/databases/(default)/documents`

    try {
        // const response = await fetch( 'https://google.com' )
        const response = await fetch( url )
        // const response = await fetch( url, { method: 'DELETE' } )

        console.log( response )

        if ( response.status !== 200 ) {
            throw new Error( 'Trouble clearing Emulator: ' + ( await response.text() ) )
        }
    } catch ( error ) {
        console.error( error )
    }
}

// beforeAll( async () => {
//     await clearDb()
// } )

describe( 'freerstore', () => {
    const defaultsCollection = freerstore.getCollection( {
        firebaseApp,
        name: 'defaults',
        documentSchema: z.object( { foo: z.string() } ),
    } )

    // function testCollection (
    //     collection: Collection,
    //     docs: typeof collection._types.DocData, // TODO get better type for this
    // ) {
    //     const processedDocs = new Map()

    //     it( `onSnapshot`, async () => {
    //         const unsub = collection.onSnapshot( results => {
    //             results.forEach( ( result, id ) => {
    //                 expect( result.success ).toBe( true )
    //                 if ( result.success ) {
    //                     expect( result.data ).toMatchObject( docs[ id ] )
    //                     processedDocs.set( id, true )
    //                 }
    //             } )
    //         } )
    //         await wait( 4000 )
    //         expect( processedDocs.size ).toBe( Object.keys( docs ).length )
    //         unsub()
    //     } )

    //     it( `setDocs`, async () => {
    //         await wait( 500 )
    //         collection.setDocs( docs )
    //         await wait( 3500 )
    //     } )
    // }

    // describe( 'defaults', () => {
    //     testCollection(
    //         defaultsCollection,
    //         {
    //             docId1: { foo: 'docId1' },
    //             docId2: { foo: 'docId2' },
    //             docId3: { foo: 'docId3' },
    //         }
    //     )
    // } )

    // describe( 'events', () => {
    //     const eventHandlers = new Map<CollectionEventName, jest.Mock>(
    //         collectionEventNames.map( eventName => [
    //             eventName,
    //             jest.fn(
    //                 // () => { console.log( eventName ) }
    //             )
    //         ] )
    //     )

    //     eventHandlers.forEach( ( handler, eventName ) => {
    //         defaultsCollection.on( eventName, handler )

    //         test( eventName, async () => {
    //             expect( handler ).toHaveBeenCalled()
    //             await wait( 2000 )
    //         } )
    //     } )

    //     defaultsCollection.setDoc( 'docId1', { foo: 'docId1' } )
    //     defaultsCollection.setDoc( 'docId2', { foo: 'docId2' } )
    //     defaultsCollection.setDoc( 'docId3', { foo: 'docId3' } )
    // } )

    describe( 'batch grouping', () => {
        // const itemCount = 999
        const itemCount = 1000
        const pad = ( id: number ) => id.toString().padStart( itemCount.toString().length, '0' )
        for ( const i of range( itemCount ) ) {
            const id = pad( i )
            defaultsCollection.setDoc( id, { foo: id } )
        }

        test( 'last item should exist in cache', async () => {
            await wait( 100 )
            const lastItemId = pad( itemCount )
            const [ id, result ] = await defaultsCollection.getDocFromCache( lastItemId )
            console.log( result )
            expect( id ).toBe( lastItemId )
            expect( result.success ).toBe( true )
        } )

        test( 'last item should exist on server', async () => {
            await wait( 3000 )
            const lastItemId = pad( itemCount )
            const [ id, result ] = await defaultsCollection.getDocFromServer( lastItemId )
            expect( id ).toBe( lastItemId )
            expect( result.success ).toBe( true )
            await wait( 2000 )
        } )
    } )

    test( 'pendingWriteItems.size == 0', async () => {
        const badDataId = 'bad data'
        defaultsCollection.setDoc( badDataId, { foo: 42 } as any )

        const [ id, result ] = await defaultsCollection.getDocFromCache( badDataId )
        expect( id ).toBe( badDataId )
        expect( result.success ).toBe( false )
    } )

    // describe( 'custom options', () => {

    //     const collection = freerstore.getCollection( {
    //         firebaseApp,
    //         name: 'custom options',
    //         documentSchema: z.object( { foo: z.string() } ),
    //         freerstoreSectionKey: 'metadata',
    //         modifiedAtKey: 'modified',
    //         modifiedAtType: 'date',
    //         serverWriteDelayMs: 3000,
    //     } )
    //     const docs = {
    //         docId4: { foo: 'docId4' },
    //         docId5: { foo: 'docId5' },
    //         docId6: { foo: 'docId6' },
    //     }
    //     testCollection( collection, docs )
    // } )

} )