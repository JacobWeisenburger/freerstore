import 'fake-indexeddb/auto'
import localforage from 'localforage'

it.skip( `localforage`, async () => {
    // it( `localforage`, async () => {
    const store = localforage.createInstance( {
        name: 'nameHere',
        driver: localforage.INDEXEDDB,
    } )

    const otherStore = localforage.createInstance( {
        name: 'otherName',
        driver: localforage.INDEXEDDB,
    } )

    await store.setItem( 'key', 'value' )
    await otherStore.setItem( 'key', 'value2' )

    expect( await store.getItem( 'key' ) ).toBe( 'value' )
    expect( await otherStore.getItem( 'key' ) ).toBe( 'value2' )
} )