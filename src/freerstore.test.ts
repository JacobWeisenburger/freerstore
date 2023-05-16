import 'fake-indexeddb/auto'
import './initLocalStorage/index.cjs'

import { z } from 'zod'
import { initializeApp } from 'firebase/app'
import { firestore } from './firestore'
import { freerstore } from '.'
import { Collection, CollectionEventName, collectionEventNames } from './freerstore'
import { range } from 'radash'
import axios from 'axios'
import { defer, wait } from './utils'

// https://github.com/jestjs/jest/issues/14138

// https://console.firebase.google.com/u/0/project/freerstore-tests/firestore/data/~2Ftest~2FICpPGmgAYFR3X7b5w6xJ
// https://console.firebase.google.com/u/0/project/royal-drive-dms-dev-987123654/firestore/data/~2Fcars~2F11111111111111111

const firestoreEmulatorPort = 9000
const projectId = 'freerstore-tests'
const firebaseApp = initializeApp( { projectId } )
const firestoreDB = firestore.getFirestore( firebaseApp )
firestore.connectFirestoreEmulator( firestoreDB, 'localhost', firestoreEmulatorPort )

async function clearDB () {
    // https://firebase.google.com/docs/emulator-suite/connect_firestore#clear_your_database_between_tests

    const url = `http://localhost:${ firestoreEmulatorPort }/emulator/v1/projects/${ projectId }/databases/(default)/documents`.replace( 'localhost', '127.0.0.1' )

    try {
        const response = await axios( url, { method: 'DELETE' } )
        if ( response.status !== 200 )
            throw new Error( 'Trouble clearing Emulator:\n' + ( await response.data ) )
    } catch ( error ) {
        console.error( { error } )
    }
}

beforeAll( async () => {
    await clearDB()
} )

describe( 'freerstore', () => {
    function testCollection (
        collection: Collection,
        docs: typeof collection._types.DocData, // TODO: low priority get better type for this
    ) {
        const processedDocs = new Map()
        const deferred = defer()

        const onSnapUnsub = collection.onSnapshot( results => {
            results.forEach( ( result, id ) => {
                expect( result.success ).toBe( true )
                if ( result.success ) {
                    expect( result.data ).toMatchObject( docs[ id ] )
                    processedDocs.set( id, true )
                }
            } )

            deferred.resolve()
        } )

        collection.setDocs( docs )

        test( `after onSnapshot`, async () => {
            await deferred.promise
            expect( processedDocs.size ).toBe( Object.keys( docs ).length )
            onSnapUnsub()
        } )
    }

    describe( 'defaults', () => {
        const collection = freerstore.getCollection( {
            firebaseApp,
            name: 'defaults',
            documentSchema: z.object( { foo: z.string() } ),
        } )
        testCollection(
            collection,
            {
                docId1: { foo: 'docId1' },
                docId2: { foo: 'docId2' },
                docId3: { foo: 'docId3' },
            }
        )
    } )

    describe( 'custom options', () => {
        const collection = freerstore.getCollection( {
            firebaseApp,
            name: 'custom options',
            documentSchema: z.object( { foo: z.string() } ),
            freerstoreSectionKey: 'metadata',
            modifiedAtKey: 'modified',
            modifiedAtType: 'date',
            serverWriteDelayMs: 3000,
        } )
        testCollection( collection, {
            docId4: { foo: 'docId4' },
            docId5: { foo: 'docId5' },
            docId6: { foo: 'docId6' },
        } )
    } )

    describe( 'events', () => {
        const eventHandlers = new Map( collectionEventNames.map( name => [ name, () => { } ] ) )

        const collection = freerstore.getCollection( {
            firebaseApp,
            name: 'events',
            documentSchema: z.object( { foo: z.string() } ),
        } )

        describe( 'sub', () => {
            eventHandlers.forEach( ( handler, eventName ) => {
                const jestHandler = jest.fn( handler )
                collection.on( eventName, jestHandler )

                test( eventName, async () => {
                    expect( jestHandler ).toHaveBeenCalled()
                    await wait( collection.props.serverWriteDelayMs + 200 )
                } )
            } )
        } )

        describe( 'unsub', () => {
            eventHandlers.forEach( ( handler, eventName ) => {
                const jestHandler = jest.fn( handler )
                const unsub = collection.on( eventName, jestHandler )
                unsub()

                test( eventName, async () => {
                    expect( jestHandler ).not.toHaveBeenCalled()
                    await wait( collection.props.serverWriteDelayMs + 200 )
                } )
            } )
        } )

        collection.setDoc( 'docId1', { foo: 'docId1' } )
        collection.setDoc( 'docId2', { foo: 'docId2' } )
        collection.setDoc( 'docId3', { foo: 'docId3' } )
    } )

    describe( 'batch grouping', () => {
        const collection = freerstore.getCollection( {
            firebaseApp,
            name: 'batch grouping',
            documentSchema: z.object( { foo: z.string() } ),
        } )

        const itemCount = 3000
        const pad = ( id: number ) => id.toString().padStart( itemCount.toString().length, '0' )
        for ( const i of range( itemCount ) ) {
            const id = pad( i )
            collection.setDoc( id, { foo: id } )
        }

        test( 'last item should exist in cache', async () => {
            const lastItemId = pad( itemCount )
            const [ id, result ] = await collection.getDocFromCache( lastItemId )
            expect( id ).toBe( lastItemId )
            expect( result.success ).toBe( true )
        } )

        test( 'last item should exist on server', async () => {
            await wait( collection.props.serverWriteDelayMs + 200 )
            const lastItemId = pad( itemCount )
            const [ id, result ] = await collection.getDocFromServer( lastItemId )
            expect( id ).toBe( lastItemId )
            expect( result.success ).toBe( true )
            await wait( collection.props.serverWriteDelayMs + 200 )
        } )
    } )

    test( 'only invalid data', async () => {
        const collection = freerstore.getCollection( {
            firebaseApp,
            name: 'only invalid data',
            documentSchema: z.object( { foo: z.string() } ),
        } )

        const badDataId = 'bad data'
        collection.setDoc( badDataId, { foo: 42 } as any )

        const [ id, result ] = await collection.getDocFromCache( badDataId )
        expect( id ).toBe( badDataId )
        expect( result.success ).toBe( false )
    } )

} )