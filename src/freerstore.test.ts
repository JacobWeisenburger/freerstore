import 'fake-indexeddb/auto'
import './initLocalStorage/index.cjs'

import { z } from 'zod'
import { initializeApp } from 'firebase/app'
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore'
import { freerstore } from '.'

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2Ftest~2FICpPGmgAYFR3X7b5w6xJ
// https://console.firebase.google.com/u/0/project/royal-drive-dms-dev-987123654/firestore/data/~2Fcars~2F11111111111111111

// it.skip( ``, () => { } )

describe( 'freerstore', () => {

    const firebaseApp = initializeApp( { projectId: 'freerstore-tests' } )
    const firestoreDB = getFirestore( firebaseApp )
    connectFirestoreEmulator( firestoreDB, 'localhost', 9000 )

    // setDoc( doc( firestoreDB, 'test', 'docId1' ), { foo: 'docId1' } )
    // setDoc( doc( firestoreDB, 'test', 'docId2' ), { foo: 'docId2' } )
    // const docsSnap = await getDocs( collection( firestoreDB, 'test' ) )
    // console.log( docsSnap.docs.map( x => [ x.id, x.data() ] ) )

    it( `Freerstore Tests`, async () => {
        const collection = await freerstore.getCollection( {
            firebaseApp,
            collectionName: 'test',
            documentSchema: z.object( { foo: z.string() } ),
        } )

        collection.setDoc( 'docId1', { foo: 'docId1' } )
        collection.setDocs( {
            docId2: { foo: 'docId2' },
            docId3: { foo: 'docId3' },
        } )
    } )

    // it( `Royal Drive DMS Dev`, async () => {

    //     const firebaseConfig = {
    //         // apiKey: 'AIzaSyDL4T7Ct0VtsN3s69zwODsU0pd5gnPmgnE',
    //         // authDomain: 'royal-drive-dms-dev-987123654.firebaseapp.com',
    //         // databaseURL: 'https://royal-drive-dms-dev-987123654.firebaseio.com',
    //         projectId: 'royal-drive-dms-dev-987123654',
    //         // storageBucket: 'royal-drive-dms-dev-987123654.appspot.com',
    //         // messagingSenderId: '68222877311',
    //         // appId: '1:68222877311:web:a313c9aa73e4b75d9b894a'
    //     }

    //     const firebaseApp = initializeApp( firebaseConfig )
    //     const collection = freerstore.getCollection( {
    //         firebaseApp,
    //         collectionName: 'cars',
    //         documentSchema: z.object( { vin: z.string() } ).passthrough(),
    //         modifiedAtPropPath: 'metadata.modified',
    //         modifiedAtPropType: 'date',
    //         serverWriteDelayMs: 2000,
    //     } )

    // } )



} )