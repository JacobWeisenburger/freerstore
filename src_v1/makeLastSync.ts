import { z } from 'zod'
import { firestore } from './firestore'
import { LocalDB } from './LocalDB'
import { ModifiedAtPropType } from './types'
import { logDeep } from './utils'

export type LastSyncProps<Type extends ModifiedAtPropType = 'isoString'> = {
    dbName: string
    storeName: string
    modifiedAtType?: Type
}

export function makeLastSync<Type extends ModifiedAtPropType = 'isoString'> ( {
    dbName,
    storeName,
    modifiedAtType,
}: LastSyncProps<Type> ) {
    const type = modifiedAtType ?? 'isoString' as Type

    const schema = {
        isoString: firestore.isoStringSchema,
        date: firestore.dateSchema,
    }[ type ]

    type Value = z.infer<typeof schema>

    const store = LocalDB.db( dbName ).syncStore( storeName, schema )

    const getValue = ( date: Date ): Value =>
        ( { date, isoString: date.toISOString() }[ type ] )

    const defaultLastSync = getValue( new Date( 0 ) )

    const storageKey = 'lastSync'

    const lastSync = {
        defaultLastSync,
        set ( date: Date = new Date() ) {
            store.set( storageKey, getValue( date ) )
        },
        get (): Value {
            const parsed = store.get( storageKey )
            return parsed.success ? parsed.data : defaultLastSync
        },
        remove () {
            store.remove( storageKey )
        },
    }

    return lastSync
}