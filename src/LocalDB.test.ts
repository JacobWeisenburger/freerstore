import 'fake-indexeddb/auto'
import './initLocalStorage/index.cjs'

import { LocalDB } from './LocalDB'
import { z } from 'zod'

describe( 'LocalDB', () => {
    const db = LocalDB.db( 'test-db' )
    const key = 'test-key'
    const input = { foo: 'foo', bar: 42 }
    const output = { ...input, baz: 'baz' }
    const schema = z.object( { foo: z.string(), bar: z.number() } )
        .transform( data => ( { ...data, baz: 'baz' } ) )

    it( `SyncStore`, () => {
        const syncStore = db.syncStore( 'syncStore', schema )
        syncStore.set( key, input )

        const parsed = syncStore.get( key )
        if ( parsed.success ) expect( parsed.data ).toEqual( output )

        syncStore.remove( key )
    } )

    it( `AsyncStore`, async () => {
        const asyncStore = db.asyncStore( 'asyncStore', schema )
        await asyncStore.set( key, input )

        const parsed = await asyncStore.get( key )
        if ( parsed.success ) expect( parsed.data ).toEqual( output )

        asyncStore.remove( key )
    } )

} )