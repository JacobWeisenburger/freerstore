import 'fake-indexeddb/auto'
import './initLocalStorage/index.cjs'

import { z } from 'zod'
import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { freerstore } from '.'
import { logDeep, wait } from './utils'
import { Collection } from './freerstore.js'

// https://github.com/jestjs/jest/issues/14138

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2Ftest~2FICpPGmgAYFR3X7b5w6xJ
// https://console.firebase.google.com/u/0/project/royal-drive-dms-dev-987123654/firestore/data/~2Fcars~2F11111111111111111

describe( 'freerstore', () => {

    // const firebaseApp = initializeApp( { projectId: 'freerstore-tests' } )
    // const firestoreDB = getFirestore( firebaseApp )
    // connectFirestoreEmulator( firestoreDB, 'localhost', 9000 )

    // function testCollection (
    //     collection: Collection,
    //     docs: typeof collection._types.DocData, // TODO get better type for this
    // ) {
    //     it( `onSnapshot`, async () => {
    //         // console.log( 'collection.onSnapshot' )
    //         const unsub = collection.onSnapshot( results => {
    //             results.forEach( ( result, id ) => {
    //                 expect( result.success ).toBe( true )
    //                 if ( result.success )
    //                     expect( result.data ).toMatchObject( docs[ id ] )
    //             } )
    //         } )
    //         await wait( 4000 )
    //         unsub()
    //     } )

    //     it( `setDocs`, async () => {
    //         await wait( 500 )
    //         // console.log( 'collection.setDocs' )
    //         collection.setDocs( docs )
    //         await wait( 3500 )
    //     } )
    // }

    // describe( 'defaults', () => {
    //     testCollection(
    //         freerstore.getCollection( {
    //             firebaseApp,
    //             name: 'defaults',
    //             documentSchema: z.object( { foo: z.string() } ),
    //         } ),
    //         {
    //             docId1: { foo: 'docId1' },
    //             docId2: { foo: 'docId2' },
    //             docId3: { foo: 'docId3' },
    //         }
    //     )
    // } )

    // TODO
    // add events for:
    // - onCacheWriteStart
    // - onCacheWriteEnd
    // - onServerWriteStart
    // - onServerWriteEnd

    // TODO diagnose bug where data isn't being saved in
    // firestore for collection named: 'with custom options'
    describe( 'with custom options', () => {

        it( `blah`, async () => {
            await import( '../dev' )
            // const mod = await import( '../dev' )
            await wait( 4000 )
            // await wait( 4250 )
            // await wait( 4500 )
        } )

        // const collection = freerstore.getCollection( {
        //     firebaseApp,
        //     name: 'with custom options',
        //     documentSchema: z.object( { foo: z.string() } ),
        //     freerstoreSectionKey: 'metadata',
        //     modifiedAtKey: 'modified',
        //     modifiedAtType: 'date',
        //     serverWriteDelayMs: 3000,
        // } )
        // const docs = {
        //     docId4: { foo: 'docId4' },
        //     docId5: { foo: 'docId5' },
        //     docId6: { foo: 'docId6' },
        // }
        // // console.log( collection.props )
        // // testCollection( collection, docs )

        // // it( `onSnapshot`, async () => {
        // //     // console.log( 'collection.onSnapshot' )
        // //     const unsub = collection.onSnapshot( results => {
        // //         results.forEach( ( result, id ) => {
        // //             expect( result.success ).toBe( true )
        // //             if ( result.success )
        // //                 expect( result.data ).toMatchObject( docs[ id ] )
        // //         } )
        // //     } )
        // //     await wait( 4000 )
        // //     unsub()
        // // } )

        // it( `setDocs`, async () => {
        //     await wait( 500 )
        //     // console.log( 'collection.setDocs' )
        //     collection.setDocs( docs )
        //     await wait( 3500 )
        // } )
    } )

} )