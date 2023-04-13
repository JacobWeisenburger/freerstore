import { formatDateTime } from './formatDateTime.js'
import { storage } from './storage.js'

export function makeLastSync ( storageKey: string ) {
    const lastSync = {
        storageKey,
        get () {
            const persistedLastSync = storage.getItem( lastSync.storageKey )
            return persistedLastSync
                ? persistedLastSync
                : new Date( 0 ).toISOString()
        },
        set ( date: Date = new Date() ) {
            console.log( 'lastSync.set:', formatDateTime( date ) )
            storage.setItem( lastSync.storageKey, date.toISOString() )
        },
    }

    return lastSync
}