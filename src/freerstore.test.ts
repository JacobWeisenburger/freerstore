import 'fake-indexeddb/auto'
import './initLocalStorage/index.cjs'

import { z } from 'zod'
import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { freerstore } from '.'
import { logDeep, wait } from './utils'

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2Ftest~2FICpPGmgAYFR3X7b5w6xJ
// https://console.firebase.google.com/u/0/project/royal-drive-dms-dev-987123654/firestore/data/~2Fcars~2F11111111111111111

describe( 'freerstore', () => {

    const firebaseApp = initializeApp( { projectId: 'freerstore-tests' } )
    const firestoreDB = getFirestore( firebaseApp )
    connectFirestoreEmulator( firestoreDB, 'localhost', 9000 )

    it.skip( `Freerstore Defaults`, async () => {
        const collection = await freerstore.getCollection( {
            firebaseApp,
            collectionName: 'test',
            documentSchema: z.object( { foo: z.string() } ),
        } )

        const unsub = collection.onSnapshot()
        // const unsub = collection.onSnapshot( logDeep )

        // collection.setDocs( {
        //     docId1: { foo: 'docId1' },
        //     docId2: { foo: 'docId2' },
        //     docId3: { foo: 'docId3' },
        // } )

        await wait( collection.serverWriteDelayMs + 1000 )
        unsub()
    } )

    it( `Freerstore Cars`, async () => {
        const collection = await freerstore.getCollection( {
            firebaseApp,
            collectionName: 'cars',
            documentSchema: z.object( { vin: z.string() } ).passthrough(),
            freerstoreSectionKey: 'metadata',
            modifiedAtKey: 'modified',
            modifiedAtType: 'date',
            serverWriteDelayMs: 2000,
        } )

        const unsub = collection.onSnapshot()
        // const unsub = collection.onSnapshot( logDeep )

        collection.setDocs( {
            '11111111111111111': { vin: '11111111111111111' },
            '12312312312323121': { vin: '12312312312323121' },
        } )

        await wait( collection.serverWriteDelayMs + 1000 )
        unsub()
    } )

} )