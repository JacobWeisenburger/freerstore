import { z } from 'zod'

export function wait ( ms: number ) {
    return new Promise( resolve => setTimeout( resolve, ms ) )
}

export function safeParseJSON ( data: string ) {
    try {
        return JSON.parse( data )
    } catch ( error ) {
        return data
    }
}

export function logDeep ( data: unknown ) {
    console.dir( data, { depth: Infinity } )
}

export function prune ( data: unknown ) {
    return JSON.parse( JSON.stringify( data ) )
}

type CoerceFrom = 'isoString'
type CoerceTo = 'isoString' | 'date'
export function deepClone (
    data: unknown,
    coercionMap?: Record<CoerceFrom, CoerceTo | undefined>
) {
    return JSON.parse(
        JSON.stringify( data ),
        ( key: string, value: unknown ) => {

            if ( coercionMap?.isoString == 'date' ) {
                /* handle ISO string to Date */
                const parsedDate = z.string().datetime().pipe( z.coerce.date() ).safeParse( value )
                if ( parsedDate.success ) return parsedDate.data
            }

            return value
        }
    )
}