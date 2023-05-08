import './initLocalStorage/index.cjs'
import { makeLastSync } from './makeLastSync'

describe( 'makeLastSync', () => {
    const dbName = 'test-db'
    const date = new Date()

    it( `defaults`, () => {
        const storeName = 'test-store-defaults'
        const lastSync = makeLastSync( { dbName, storeName } )

        lastSync.set( date )
        expect( lastSync.get() ).toBe( date.toISOString() )

        lastSync.remove()
        expect( lastSync.get() ).toBe( lastSync.defaultLastSync )
    } )

    it( `modifiedAtPropType: 'isoString'`, () => {
        const storeName = 'test-store-isoString'
        const lastSync = makeLastSync( {
            dbName, storeName,
            modifiedAtPropType: 'isoString',
        } )

        lastSync.set( date )
        expect( lastSync.get() ).toBe( date.toISOString() )

        lastSync.remove()
        expect( lastSync.get() ).toBe( lastSync.defaultLastSync )
    } )

    it( `modifiedAtPropType: 'date'`, () => {
        const storeName = 'test-store-date'
        const lastSync = makeLastSync( {
            dbName, storeName,
            modifiedAtPropType: 'date',
        } )

        lastSync.set( date )
        expect( lastSync.get().toISOString() ).toBe( date.toISOString() )

        lastSync.remove()
        expect( lastSync.get() ).toBe( lastSync.defaultLastSync )
    } )

} )