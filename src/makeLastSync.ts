import { z } from 'zod'
import { firestore } from './firestore/index.js'
import { storage } from './storage.js'

export type LastSyncProps = {
    storageKey: string
    schema?: z.Schema
}

export function makeLastSync ( {
    storageKey,
    schema = firestore.isoStringSchema,
}: LastSyncProps ) {
    const lastSync = {
        storageKey,
        get () {
            const persistedLastSync = storage.getItem( lastSync.storageKey )
            // console.log( lastSync.storageKey )
            // console.log( 'get', persistedLastSync )

            const parsedPersistedLastSync = schema.safeParse( persistedLastSync )
            // console.log( parsedPersistedLastSync )
            return parsedPersistedLastSync.success
                ? parsedPersistedLastSync.data
                : new Date( 0 ).toISOString()
        },
        set ( date: Date = new Date() ) {
            // console.log( 'set', date.toISOString() )
            storage.setItem( lastSync.storageKey, date.toISOString() )
        },
    }

    return lastSync
}