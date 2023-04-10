import { z } from 'zod'
import { storage } from './storage.js'

export module firestoreStats {
    const schema = z.object( {
        reads: z.number().int().nonnegative(),
        writes: z.number().int().nonnegative(),
    } ).partial()

    function getStorageKey ( date: Date = new Date ): string {
        const [ plainDateString ] = date.toISOString().split( 'T' )
        return `firestoreStats.${ plainDateString }.json`
            .replaceAll( '/', '.' )
            .replaceAll( ' ', '_' )
    }

    export function get ( key: string = getStorageKey() ) {
        return schema.safeParse( storage.getItem( key ) ?? { reads: 0, writes: 0 } )
    }
    export function incrementReads () {
        const key = getStorageKey()
        const statsResult = get()
        if ( statsResult.success ) {
            const stats = statsResult.data
            storage.setItem( key, {
                ...stats,
                reads: ( stats.reads ?? 0 ) + 1,
            } )
        }
    }
    export function incrementWrites () {
        const key = getStorageKey()
        const statsResult = get()
        if ( statsResult.success ) {
            const stats = statsResult.data
            storage.setItem( key, {
                ...stats,
                writes: ( stats.writes ?? 0 ) + 1,
            } )
        }
    }
}