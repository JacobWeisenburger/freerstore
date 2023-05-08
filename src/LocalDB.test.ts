import 'fake-indexeddb/auto'
import { LocalDB } from './LocalDB'
import { z } from 'zod'

describe( 'LocalDB', () => {

    it( `make a collection an add some data`, async () => {
        const collection = LocalDB.db( 'dbName' ).collection(
            'collectionName',
            z.object( {
                foo: z.string(),
                bar: z.number(),
            } ).transform( data => ( { ...data, baz: 'baz' } ) ),
        )

        const key = 'key'
        const input = { foo: 'foo', bar: 42 }
        const output = { ...input, baz: 'baz' }
        await collection.set( key, input )

        const parsed = await collection.get( key )
        if ( parsed.success ) expect( parsed.data ).toEqual( output )
    } )

} )